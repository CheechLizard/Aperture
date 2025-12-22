import { FileInfo, FunctionInfo, CatchBlockInfo, FileIssue } from '../types';
import {
  FUNCTION_LOC_WARNING,
  FUNCTION_LOC_ERROR,
  FILE_LOC_WARNING,
  MAX_NESTING_DEPTH,
  MAX_PARAMETER_COUNT,
} from './rule-constants';

export function detectLongFunctions(file: FileInfo): FileIssue[] {
  const issues: FileIssue[] = [];

  for (const func of file.functions) {
    if (func.loc > FUNCTION_LOC_ERROR) {
      issues.push({
        ruleId: 'long-function',
        severity: 'error',
        category: 'structural',
        message: `Function '${func.name}' has ${func.loc} lines (exceeds ${FUNCTION_LOC_ERROR} line limit)`,
        file: file.path,
        line: func.startLine,
        endLine: func.endLine,
        symbol: func.name,
      });
    } else if (func.loc > FUNCTION_LOC_WARNING) {
      issues.push({
        ruleId: 'long-function',
        severity: 'warning',
        category: 'structural',
        message: `Function '${func.name}' has ${func.loc} lines (exceeds ${FUNCTION_LOC_WARNING} line recommendation)`,
        file: file.path,
        line: func.startLine,
        endLine: func.endLine,
        symbol: func.name,
      });
    }
  }

  return issues;
}

export function detectLongFile(file: FileInfo): FileIssue | null {
  if (file.loc > FILE_LOC_WARNING) {
    return {
      ruleId: 'long-file',
      severity: 'warning',
      category: 'structural',
      message: `File has ${file.loc} lines (exceeds ${FILE_LOC_WARNING} line recommendation)`,
      file: file.path,
    };
  }
  return null;
}

export function detectDeepNesting(file: FileInfo): FileIssue[] {
  const issues: FileIssue[] = [];

  for (const func of file.functions) {
    if (func.maxNestingDepth > MAX_NESTING_DEPTH) {
      issues.push({
        ruleId: 'deep-nesting',
        severity: 'warning',
        category: 'structural',
        message: `Function '${func.name}' has nesting depth ${func.maxNestingDepth} (exceeds ${MAX_NESTING_DEPTH})`,
        file: file.path,
        line: func.startLine,
        symbol: func.name,
      });
    }
  }

  return issues;
}

export function detectSilentFailures(
  file: FileInfo,
  catchBlocks: CatchBlockInfo[]
): FileIssue[] {
  const issues: FileIssue[] = [];

  for (const catchBlock of catchBlocks) {
    if (catchBlock.isEmpty) {
      issues.push({
        ruleId: 'silent-failure',
        severity: 'error',
        category: 'structural',
        message: `Empty catch block - errors are silently ignored`,
        file: file.path,
        line: catchBlock.line,
      });
    }
  }

  return issues;
}

export function detectTooManyParameters(file: FileInfo): FileIssue[] {
  const issues: FileIssue[] = [];

  for (const func of file.functions) {
    if (func.parameterCount > MAX_PARAMETER_COUNT) {
      issues.push({
        ruleId: 'too-many-parameters',
        severity: 'warning',
        category: 'structural',
        message: `Function '${func.name}' has ${func.parameterCount} parameters (exceeds ${MAX_PARAMETER_COUNT})`,
        file: file.path,
        line: func.startLine,
        symbol: func.name,
      });
    }
  }

  return issues;
}
