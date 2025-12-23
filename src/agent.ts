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

// Build a preview of the prompt without making the API call
export function buildPromptPreview(
  query: string,
  _files: FileInfo[],
  context?: AnalysisContext
): string {
  let preview = '';

  if (context && context.highlightedFiles.length > 0) {
    preview += `Files:\n`;
    for (const file of context.highlightedFiles) {
      const content = context.fileContents[file];
      preview += `📎 ${file}${content ? ` (${content.length} chars)` : ''}\n`;
    }

    if (context.issues.length > 0) {
      preview += `\nIssues:\n`;
      for (const issue of context.issues) {
        preview += `• ${issue.ruleId}: ${issue.message}\n`;
      }
    }
  }

  preview += `\nQuery: ${query}`;
  return preview;
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

  const hasContext = context && context.highlightedFiles.length > 0;

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

  let systemPrompt = `You are analyzing a codebase to answer questions about it.

Be concise but helpful. Always use the respond tool to provide your final answer.`;

  // Enrich system prompt with context if provided
  // Limit context to avoid token overflow (30K input token rate limit)
  const MAX_CONTEXT_FILES = 5;
  const MAX_CHARS_PER_FILE = 2000;
  const MAX_ISSUES = 10;

  if (hasContext) {
    const limitedFiles = context.highlightedFiles.slice(0, MAX_CONTEXT_FILES);
    const moreFiles = context.highlightedFiles.length - MAX_CONTEXT_FILES;

    systemPrompt += `\n\n## Focus\n`;
    for (const file of limitedFiles) {
      systemPrompt += `- ${file}\n`;
    }
    if (moreFiles > 0) {
      systemPrompt += `(+${moreFiles} more)\n`;
    }

    if (context.issues.length > 0) {
      const limitedIssues = context.issues.slice(0, MAX_ISSUES);
      const moreIssues = context.issues.length - MAX_ISSUES;

      systemPrompt += `\n## Issues\n`;
      for (const issue of limitedIssues) {
        const issueFiles = issue.locations.map((l) => l.file).slice(0, 3).join(', ');
        systemPrompt += `- ${issue.ruleId}: ${issue.message} (${issueFiles})\n`;
      }
      if (moreIssues > 0) {
        systemPrompt += `(+${moreIssues} more)\n`;
      }
    }

    // Include file contents (still sent to API, just not shown in preview)
    const contentFiles = Object.entries(context.fileContents).slice(0, MAX_CONTEXT_FILES);
    if (contentFiles.length > 0) {
      systemPrompt += `\n## File Contents\n`;
      for (const [filePath, content] of contentFiles) {
        const truncated = content.length > MAX_CHARS_PER_FILE
          ? content.slice(0, MAX_CHARS_PER_FILE) + '\n...(truncated)'
          : content;
        systemPrompt += `\n### ${filePath}\n\`\`\`\n${truncated}\n\`\`\`\n`;
      }
    }
  }

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
