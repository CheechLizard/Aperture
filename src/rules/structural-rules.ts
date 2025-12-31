import { FileInfo, CatchBlockInfo, Issue, Severity, RuleThresholds } from '../types';
import {
  FUNCTION_LOC_WARNING,
  FUNCTION_LOC_ERROR,
  FILE_LOC_WARNING,
  MAX_NESTING_DEPTH,
  MAX_PARAMETER_COUNT,
} from './rule-constants';
import { createUriFromPathAndLine } from '../uri';

export function detectLongFunctions(file: FileInfo, thresholds?: RuleThresholds): Issue[] {
  const warnLimit = thresholds?.functionLocWarning ?? FUNCTION_LOC_WARNING;
  const errorLimit = thresholds?.functionLocError ?? FUNCTION_LOC_ERROR;
  const issues: Issue[] = [];

  for (const func of file.functions) {
    // Skip containers (classes, modules, object literals) - they're structural, not functions
    if (func.isContainer) continue;

    if (func.loc > errorLimit) {
      issues.push({
        ruleId: 'long-function',
        severity: 'high',
        category: 'structural',
        message: `Function '${func.name}' has ${func.loc} lines (exceeds ${errorLimit} line limit)`,
        locations: [{ uri: func.uri, file: file.path, line: func.startLine, endLine: func.endLine }],
        symbol: func.name,
      });
    } else if (func.loc > warnLimit) {
      issues.push({
        ruleId: 'long-function',
        severity: 'medium',
        category: 'structural',
        message: `Function '${func.name}' has ${func.loc} lines (exceeds ${warnLimit} line recommendation)`,
        locations: [{ uri: func.uri, file: file.path, line: func.startLine, endLine: func.endLine }],
        symbol: func.name,
      });
    }
  }

  return issues;
}

export function detectLongFile(file: FileInfo, thresholds?: RuleThresholds): Issue | null {
  const limit = thresholds?.fileLocWarning ?? FILE_LOC_WARNING;
  if (file.loc > limit) {
    return {
      ruleId: 'long-file',
      severity: 'medium',
      category: 'structural',
      message: `File has ${file.loc} lines (exceeds ${limit} line recommendation)`,
      locations: [{ uri: file.uri, file: file.path }],
    };
  }
  return null;
}

export function detectDeepNesting(file: FileInfo, thresholds?: RuleThresholds): Issue[] {
  const limit = thresholds?.maxNestingDepth ?? MAX_NESTING_DEPTH;
  const issues: Issue[] = [];

  for (const func of file.functions) {
    // Skip containers - nesting metrics apply to their child functions
    if (func.isContainer) continue;

    if (func.maxNestingDepth > limit) {
      issues.push({
        ruleId: 'deep-nesting',
        severity: 'medium',
        category: 'structural',
        message: `Function '${func.name}' has nesting depth ${func.maxNestingDepth} (exceeds ${limit})`,
        locations: [{ uri: func.uri, file: file.path, line: func.startLine }],
        symbol: func.name,
      });
    }
  }

  return issues;
}

export function detectSilentFailures(
  file: FileInfo,
  catchBlocks: CatchBlockInfo[]
): Issue[] {
  const issues: Issue[] = [];

  for (const catchBlock of catchBlocks) {
    if (catchBlock.isEmpty) {
      issues.push({
        ruleId: 'silent-failure',
        severity: 'high',
        category: 'structural',
        message: `Empty catch block - errors are silently ignored`,
        locations: [{ uri: createUriFromPathAndLine(file.path, undefined, catchBlock.line), file: file.path, line: catchBlock.line }],
      });
    }
  }

  return issues;
}

export function detectTooManyParameters(file: FileInfo, thresholds?: RuleThresholds): Issue[] {
  const limit = thresholds?.maxParameterCount ?? MAX_PARAMETER_COUNT;
  const issues: Issue[] = [];

  for (const func of file.functions) {
    // Skip containers - they don't have parameters
    if (func.isContainer) continue;

    if (func.parameterCount > limit) {
      issues.push({
        ruleId: 'too-many-parameters',
        severity: 'medium',
        category: 'structural',
        message: `Function '${func.name}' has ${func.parameterCount} parameters (exceeds ${limit})`,
        locations: [{ uri: func.uri, file: file.path, line: func.startLine }],
        symbol: func.name,
      });
    }
  }

  return issues;
}
