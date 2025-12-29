import { FileInfo, ASTExtractionResult, Issue, RuleThresholds } from './types';
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

export function detectCodeIssues(
  file: FileInfo,
  astResult: ASTExtractionResult,
  content: string,
  thresholds?: RuleThresholds
): Issue[] {
  const issues: Issue[] = [];

  // Structural rules (pass thresholds)
  issues.push(...detectLongFunctions(file, thresholds));
  const longFile = detectLongFile(file, thresholds);
  if (longFile) issues.push(longFile);
  issues.push(...detectDeepNesting(file, thresholds));
  issues.push(...detectSilentFailures(file, astResult.catchBlocks));
  issues.push(...detectTooManyParameters(file, thresholds));

  // Naming rules
  issues.push(...detectGenericNames(file, thresholds?.genericNames));
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
): Map<string, Issue[]> {
  const byCategory = new Map<string, Issue[]>();

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
): { high: number; medium: number; low: number } {
  const counts = { high: 0, medium: 0, low: 0 };

  for (const file of files) {
    if (!file.issues) continue;

    for (const issue of file.issues) {
      counts[issue.severity]++;
    }
  }

  return counts;
}
