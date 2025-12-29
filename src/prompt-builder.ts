/**
 * Prompt building utilities for Claude API interactions
 */

import { FileInfo, Issue } from './types';

export interface AnalysisContext {
  highlightedFiles: string[];
  issues: Issue[];
  fileContents: Record<string, string>;
}

/** Build the system prompt for Claude */
export function buildSystemPrompt(context?: AnalysisContext): string {
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

/** Estimate tokens for a prompt - uses character count heuristic (~4 chars per token) */
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

/** Build a preview showing exactly what will be sent to Claude */
export function buildPromptPreview(
  query: string,
  _files: FileInfo[],
  context?: AnalysisContext
): string {
  const systemPrompt = buildSystemPrompt(context);
  return `[SYSTEM PROMPT]\n${systemPrompt}\n\n[USER MESSAGE]\n${query}`;
}
