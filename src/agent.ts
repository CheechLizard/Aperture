import Anthropic from '@anthropic-ai/sdk';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { FileInfo, Issue } from './types';

export interface AnalysisContext {
  highlightedFiles: string[];
  issues: Issue[];
  fileContents: Record<string, string>;
}

export interface AgentResponse {
  message: string;
  relevantFiles: string[];
  systemPrompt?: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    contextLimit: number;
  };
}

// Build the system prompt for Claude - used by both analyzeQuery and countTokens
function buildSystemPrompt(context?: AnalysisContext): string {
  let systemPrompt = `You are analyzing a codebase to answer questions about it.

Be concise but helpful. Always use the respond tool to provide your final answer.`;

  const hasContext = context && context.highlightedFiles.length > 0;

  if (hasContext) {
    systemPrompt += `\n\n## Focus\n`;
    for (const file of context.highlightedFiles) {
      systemPrompt += `- ${file}\n`;
    }

    if (context.issues.length > 0) {
      systemPrompt += `\n## Issues\n`;
      for (const issue of context.issues) {
        const issueFiles = issue.locations.map((l) => l.file).join(', ');
        systemPrompt += `- ${issue.ruleId}: ${issue.message} (${issueFiles})\n`;
      }
    }

    const contentFiles = Object.entries(context.fileContents);
    if (contentFiles.length > 0) {
      systemPrompt += `\n## File Contents\n`;
      for (const [filePath, content] of contentFiles) {
        systemPrompt += `\n### ${filePath}\n\`\`\`\n${content}\n\`\`\`\n`;
      }
    }
  }

  return systemPrompt;
}

// Estimate tokens for a prompt - uses character count heuristic (~4 chars per token)
// This avoids an API call and is fast enough for real-time cost estimation
export function estimatePromptTokens(
  query: string,
  context?: AnalysisContext
): { tokens: number; limit: number } {
  const systemPrompt = buildSystemPrompt(context);
  const totalChars = systemPrompt.length + query.length;
  // Rough estimate: ~4 characters per token for English text
  const estimatedTokens = Math.ceil(totalChars / 4);

  return { tokens: estimatedTokens, limit: 30000 }; // rate limit constraint
}

// Build a preview showing exactly what will be sent to Claude - no lies
export function buildPromptPreview(
  query: string,
  _files: FileInfo[],
  context?: AnalysisContext
): string {
  const systemPrompt = buildSystemPrompt(context);
  return `[SYSTEM PROMPT]\n${systemPrompt}\n\n[USER MESSAGE]\n${query}`;
}

export async function analyzeQuery(
  query: string,
  files: FileInfo[],
  rootPath: string,
  context?: AnalysisContext,
  signal?: AbortSignal
): Promise<AgentResponse> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return {
      message: 'No API key configured. Set aperture.anthropicApiKey in settings.',
      relevantFiles: [],
      systemPrompt: '(no API key)',
    };
  }

  // Check if already aborted
  if (signal?.aborted) {
    return { message: 'Cancelled', relevantFiles: [], systemPrompt: '(cancelled)' };
  }

  const client = new Anthropic({ apiKey });

  const tools: Anthropic.Tool[] = [
    {
      name: 'read_file',
      description: 'Read the contents of a file to analyze it',
      input_schema: {
        type: 'object' as const,
        properties: {
          path: { type: 'string', description: 'Relative path to the file' },
        },
        required: ['path'],
      },
    },
    {
      name: 'respond',
      description: 'Provide the final response with relevant files',
      input_schema: {
        type: 'object' as const,
        properties: {
          message: { type: 'string', description: 'Explanation for the user' },
          relevantFiles: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of relevant file paths',
          },
        },
        required: ['message', 'relevantFiles'],
      },
    },
  ];

  const systemPrompt = buildSystemPrompt(context);

  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: query },
  ];

  const CONTEXT_LIMIT = 200000; // Claude Sonnet context window
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  let response = await client.messages.create(
    {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      tools,
      messages,
    },
    { signal }
  );
  totalInputTokens += response.usage.input_tokens;
  totalOutputTokens += response.usage.output_tokens;

  while (response.stop_reason === 'tool_use') {
    // Check if aborted between iterations
    if (signal?.aborted) {
      return { message: 'Cancelled', relevantFiles: [], systemPrompt: '(cancelled)' };
    }
    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
    );

    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const toolUse of toolUseBlocks) {
      if (toolUse.name === 'read_file') {
        const input = toolUse.input as { path: string };
        const filePath = path.join(rootPath, input.path);
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: content.slice(0, 10000),
          });
        } catch {
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: 'Error: File not found or unreadable',
          });
        }
      } else if (toolUse.name === 'respond') {
        const input = toolUse.input as { message: string; relevantFiles: string[] };
        return {
          ...input,
          systemPrompt,
          usage: {
            inputTokens: totalInputTokens,
            outputTokens: totalOutputTokens,
            totalTokens: totalInputTokens + totalOutputTokens,
            contextLimit: CONTEXT_LIMIT,
          },
        };
      }
    }

    messages.push({ role: 'assistant', content: response.content });
    messages.push({ role: 'user', content: toolResults });

    response = await client.messages.create(
      {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: systemPrompt,
        tools,
        messages,
      },
      { signal }
    );
    totalInputTokens += response.usage.input_tokens;
    totalOutputTokens += response.usage.output_tokens;
  }

  const usage = {
    inputTokens: totalInputTokens,
    outputTokens: totalOutputTokens,
    totalTokens: totalInputTokens + totalOutputTokens,
    contextLimit: CONTEXT_LIMIT,
  };

  const textBlock = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === 'text'
  );

  return {
    message: textBlock?.text || 'No response generated',
    relevantFiles: [],
    systemPrompt,
    usage,
  };
}

function getApiKey(): string | undefined {
  const config = vscode.workspace.getConfiguration('aperture');
  const configKey = config.get<string>('anthropicApiKey');
  if (configKey) {
    return configKey;
  }
  return process.env.ANTHROPIC_API_KEY;
}
