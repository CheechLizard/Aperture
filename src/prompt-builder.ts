/**
 * Prompt building utilities for Claude API interactions
 */

import Anthropic from '@anthropic-ai/sdk';
import { FileInfo, Issue } from './types';

// Token limit to avoid rate limits (80K tokens/min on most tiers)
// Set to 40K to allow larger context while staying well under limits
const TOKEN_LIMIT = 40000;

// Self-calibrating chars/token ratio
let observedRatio = 2.5;  // Start with default estimate
let sampleCount = 0;

/** Calibrate the chars/token ratio using actual API results */
export function calibrateRatio(chars: number, tokens: number): void {
  if (tokens <= 0) return;
  const newRatio = chars / tokens;
  // Weighted moving average - newer samples have more weight
  sampleCount++;
  const weight = Math.min(0.3, 1 / sampleCount);  // Cap at 30% influence per sample
  observedRatio = observedRatio * (1 - weight) + newRatio * weight;
}

/** Get the current observed ratio (for debugging) */
export function getObservedRatio(): number {
  return observedRatio;
}

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

/** Estimate tokens for a prompt - uses self-calibrating ratio */
export function estimatePromptTokens(
  query: string,
  context?: AnalysisContext
): { tokens: number; limit: number } {
  const systemPrompt = buildSystemPrompt(context);
  const totalChars = systemPrompt.length + query.length;
  const estimatedTokens = Math.ceil(totalChars / observedRatio);
  return { tokens: estimatedTokens, limit: TOKEN_LIMIT };
}

/** Count tokens using Anthropic's official API (exact count) */
export async function countPromptTokens(
  query: string,
  context: AnalysisContext | undefined,
  client: Anthropic
): Promise<{ tokens: number; limit: number }> {
  const systemPrompt = buildSystemPrompt(context);

  const result = await client.messages.countTokens({
    model: 'claude-sonnet-4-20250514',
    system: systemPrompt,
    messages: [{ role: 'user', content: query }],
  });

  return { tokens: result.input_tokens, limit: TOKEN_LIMIT };
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
