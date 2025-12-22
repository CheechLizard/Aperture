import { FileInfo, ASTExtractionResult, FileIssue } from './types';
import {
  detectLongFunctions,
  detectLongFile,
  detectDeepNesting,
  detectSilentFailures,
  detectTooManyParameters,
} from './rules/structural-rules';
import {
  detectGenericNames,
  detectNonVerbFunctions,
  detectNonQuestionBooleans,
  detectMagicNumbers,
} from './rules/naming-rules';
import { detectCommentedCode, detectHighCommentDensity } from './rules/comment-rules';
import { detectMixedConcerns } from './rules/architecture-rules';

export function detectFileIssues(
  file: FileInfo,
  astResult: ASTExtractionResult,
  content: string
): FileIssue[] {
  const issues: FileIssue[] = [];

  // Structural rules
  issues.push(...detectLongFunctions(file));
  const longFile = detectLongFile(file);
  if (longFile) issues.push(longFile);
  issues.push(...detectDeepNesting(file));
  issues.push(...detectSilentFailures(file, astResult.catchBlocks));
  issues.push(...detectTooManyParameters(file));

  // Naming rules
  issues.push(...detectGenericNames(file));
  issues.push(...detectNonVerbFunctions(file));
  issues.push(...detectNonQuestionBooleans(file));
  issues.push(...detectMagicNumbers(file, astResult.literals));

  // Comment rules
  issues.push(...detectCommentedCode(file, astResult.comments));
  const highDensity = detectHighCommentDensity(file, astResult.comments);
  if (highDensity) issues.push(highDensity);

  // Architecture rules
  const mixedConcerns = detectMixedConcerns(file, content);
  if (mixedConcerns) issues.push(mixedConcerns);

  return issues;
}

export function aggregateIssuesByCategory(
  files: FileInfo[]
): Map<string, FileIssue[]> {
  const byCategory = new Map<string, FileIssue[]>();

  for (const file of files) {
    if (!file.issues) continue;

    for (const issue of file.issues) {
      const existing = byCategory.get(issue.category) || [];
      existing.push(issue);
      byCategory.set(issue.category, existing);
    }
  }

  return byCategory;
}

export function countIssuesBySeverity(
  files: FileInfo[]
): { error: number; warning: number; info: number } {
  const counts = { error: 0, warning: 0, info: 0 };

  for (const file of files) {
    if (!file.issues) continue;

    for (const issue of file.issues) {
      counts[issue.severity]++;
    }
  }

  return counts;
}
