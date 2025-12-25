import { FileInfo, CatchBlockInfo, Issue, Severity } from '../types';
import {
  FUNCTION_LOC_WARNING,
  FUNCTION_LOC_ERROR,
  FILE_LOC_WARNING,
  MAX_NESTING_DEPTH,
  MAX_PARAMETER_COUNT,
} from './rule-constants';
import { createUriFromPathAndLine } from '../uri';

export function detectLongFunctions(file: FileInfo): Issue[] {
  const issues: Issue[] = [];

  for (const func of file.functions) {
    if (func.loc > FUNCTION_LOC_ERROR) {
      issues.push({
        ruleId: 'long-function',
        severity: 'high',
        category: 'structural',
        message: `Function '${func.name}' has ${func.loc} lines (exceeds ${FUNCTION_LOC_ERROR} line limit)`,
        locations: [{ uri: func.uri, file: file.path, line: func.startLine, endLine: func.endLine }],
        symbol: func.name,
      });
    } else if (func.loc > FUNCTION_LOC_WARNING) {
      issues.push({
        ruleId: 'long-function',
        severity: 'medium',
        category: 'structural',
        message: `Function '${func.name}' has ${func.loc} lines (exceeds ${FUNCTION_LOC_WARNING} line recommendation)`,
        locations: [{ uri: func.uri, file: file.path, line: func.startLine, endLine: func.endLine }],
        symbol: func.name,
      });
    }
  }

  return issues;
}

export function detectLongFile(file: FileInfo): Issue | null {
  if (file.loc > FILE_LOC_WARNING) {
    return {
      ruleId: 'long-file',
      severity: 'medium',
      category: 'structural',
      message: `File has ${file.loc} lines (exceeds ${FILE_LOC_WARNING} line recommendation)`,
      locations: [{ uri: file.uri, file: file.path }],
    };
  }
  return null;
}

export function detectDeepNesting(file: FileInfo): Issue[] {
  const issues: Issue[] = [];

  for (const func of file.functions) {
    if (func.maxNestingDepth > MAX_NESTING_DEPTH) {
      issues.push({
        ruleId: 'deep-nesting',
        severity: 'medium',
        category: 'structural',
        message: `Function '${func.name}' has nesting depth ${func.maxNestingDepth} (exceeds ${MAX_NESTING_DEPTH})`,
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

export function detectTooManyParameters(file: FileInfo): Issue[] {
  const issues: Issue[] = [];

  for (const func of file.functions) {
    if (func.parameterCount > MAX_PARAMETER_COUNT) {
      issues.push({
        ruleId: 'too-many-parameters',
        severity: 'medium',
        category: 'structural',
        message: `Function '${func.name}' has ${func.parameterCount} parameters (exceeds ${MAX_PARAMETER_COUNT})`,
        locations: [{ uri: func.uri, file: file.path, line: func.startLine }],
        symbol: func.name,
      });
    }
  }

  return issues;
}
