import Anthropic from '@anthropic-ai/sdk';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { FileInfo } from './types';

export interface AgentResponse {
  message: string;
  relevantFiles: string[];
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    contextLimit: number;
  };
}

export async function analyzeQuery(
  query: string,
  files: FileInfo[],
  rootPath: string
): Promise<AgentResponse> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return {
      message: 'No API key configured. Set aperture.anthropicApiKey in settings.',
      relevantFiles: [],
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

  const systemPrompt = `You are analyzing a codebase to answer questions about it.
You have access to a file list and can read specific files to understand the code.

Files in this project:
${fileList}

When the user asks a question:
1. Identify which files are likely relevant based on names and paths
2. Use read_file to examine those files
3. Use respond to give your answer with the list of relevant files

Be concise but helpful. Always use the respond tool to provide your final answer.`;

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
