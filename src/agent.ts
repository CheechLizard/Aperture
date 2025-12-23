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
  files: FileInfo[],
  context?: AnalysisContext
): string {
  const MAX_CONTEXT_FILES = 5;
  const MAX_CHARS_PER_FILE = 2000;
  const MAX_ISSUES = 10;

  const fileList = files
    .map((f) => `${f.path} (${f.language}, ${f.loc} LOC)`)
    .join('\n');

  let systemPrompt = `You are analyzing a codebase to answer questions about it.
You have access to a file list and can read specific files to understand the code.

Files in this project:
${fileList}

When the user asks a question:
1. Identify which files are likely relevant based on names and paths
2. Use read_file to examine those files
3. Use respond to give your answer with the list of relevant files

Be concise but helpful. Always use the respond tool to provide your final answer.`;

  if (context && context.highlightedFiles.length > 0) {
    const limitedFiles = context.highlightedFiles.slice(0, MAX_CONTEXT_FILES);
    const moreFiles = context.highlightedFiles.length - MAX_CONTEXT_FILES;

    systemPrompt += `\n\n## Current Focus\nThe user is looking at these files:\n`;
    for (const file of limitedFiles) {
      systemPrompt += `- ${file}\n`;
    }
    if (moreFiles > 0) {
      systemPrompt += `(and ${moreFiles} more files)\n`;
    }

    if (context.issues.length > 0) {
      const limitedIssues = context.issues.slice(0, MAX_ISSUES);
      const moreIssues = context.issues.length - MAX_ISSUES;

      systemPrompt += `\n## Detected Issues\nThese issues were detected by static analysis:\n`;
      for (const issue of limitedIssues) {
        const issueFiles = issue.locations.map((l) => l.file).slice(0, 3).join(', ');
        systemPrompt += `- **${issue.ruleId}**: ${issue.message} (in ${issueFiles})\n`;
      }
      if (moreIssues > 0) {
        systemPrompt += `(and ${moreIssues} more issues)\n`;
      }
    }

    const contentFiles = Object.entries(context.fileContents).slice(0, MAX_CONTEXT_FILES);
    if (contentFiles.length > 0) {
      systemPrompt += `\n## File Contents\nHere are the contents of the highlighted files:\n`;
      for (const [filePath, content] of contentFiles) {
        const truncated = content.length > MAX_CHARS_PER_FILE
          ? content.slice(0, MAX_CHARS_PER_FILE) + '\n...(truncated)'
          : content;
        systemPrompt += `\n### ${filePath}\n\`\`\`\n${truncated}\n\`\`\`\n`;
      }
    }
  }

  return `=== SYSTEM PROMPT (${systemPrompt.length} chars) ===\n${systemPrompt}\n\n=== USER MESSAGE ===\n${query}`;
}

export async function analyzeQuery(
  query: string,
  files: FileInfo[],
  rootPath: string,
  context?: AnalysisContext
): Promise<AgentResponse> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return {
      message: 'No API key configured. Set aperture.anthropicApiKey in settings.',
      relevantFiles: [],
      systemPrompt: '(no API key)',
    };
  }

  const client = new Anthropic({ apiKey });

  const fileList = files
    .map((f) => `${f.path} (${f.language}, ${f.loc} LOC)`)
    .join('\n');

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
You have access to a file list and can read specific files to understand the code.

Files in this project:
${fileList}

When the user asks a question:
1. Identify which files are likely relevant based on names and paths
2. Use read_file to examine those files
3. Use respond to give your answer with the list of relevant files

Be concise but helpful. Always use the respond tool to provide your final answer.`;

  // Enrich system prompt with context if provided
  // Limit context to avoid token overflow (30K input token rate limit)
  const MAX_CONTEXT_FILES = 5;
  const MAX_CHARS_PER_FILE = 2000;
  const MAX_ISSUES = 10;

  if (context && context.highlightedFiles.length > 0) {
    const limitedFiles = context.highlightedFiles.slice(0, MAX_CONTEXT_FILES);
    const moreFiles = context.highlightedFiles.length - MAX_CONTEXT_FILES;

    systemPrompt += `\n\n## Current Focus\nThe user is looking at these files:\n`;
    for (const file of limitedFiles) {
      systemPrompt += `- ${file}\n`;
    }
    if (moreFiles > 0) {
      systemPrompt += `(and ${moreFiles} more files)\n`;
    }

    if (context.issues.length > 0) {
      const limitedIssues = context.issues.slice(0, MAX_ISSUES);
      const moreIssues = context.issues.length - MAX_ISSUES;

      systemPrompt += `\n## Detected Issues\nThese issues were detected by static analysis:\n`;
      for (const issue of limitedIssues) {
        const files = issue.locations.map((l) => l.file).slice(0, 3).join(', ');
        systemPrompt += `- **${issue.ruleId}**: ${issue.message} (in ${files})\n`;
      }
      if (moreIssues > 0) {
        systemPrompt += `(and ${moreIssues} more issues)\n`;
      }
    }

    // Only include contents for the limited set of files
    const contentFiles = Object.entries(context.fileContents).slice(0, MAX_CONTEXT_FILES);
    if (contentFiles.length > 0) {
      systemPrompt += `\n## File Contents\nHere are the contents of the highlighted files:\n`;
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

  let response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: systemPrompt,
    tools,
    messages,
  });
  totalInputTokens += response.usage.input_tokens;
  totalOutputTokens += response.usage.output_tokens;

  while (response.stop_reason === 'tool_use') {
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

    response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      tools,
      messages,
    });
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
