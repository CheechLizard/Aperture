import { FileInfo, LiteralInfo, Issue } from '../types';
import {
  GENERIC_NAMES,
  VERB_PREFIXES,
  BOOLEAN_PREFIXES,
  SETTER_PREFIXES,
  ACTION_VERB_PREFIXES,
  ALLOWED_MAGIC_NUMBERS,
} from './rule-constants';
import { createUriFromPathAndLine } from '../uri';

export function detectGenericNames(file: FileInfo): Issue[] {
  const issues: Issue[] = [];

  for (const func of file.functions) {
    const nameLower = func.name.toLowerCase();
    if (GENERIC_NAMES.includes(nameLower)) {
      issues.push({
        ruleId: 'generic-name',
        severity: 'medium',
        category: 'naming',
        message: `Function '${func.name}' uses a generic name - consider more descriptive naming`,
        locations: [{ uri: func.uri, file: file.path, line: func.startLine }],
        symbol: func.name,
      });
    }
  }

  return issues;
}

export function detectNonVerbFunctions(file: FileInfo): Issue[] {
  const issues: Issue[] = [];

  for (const func of file.functions) {
    if (func.name === 'anonymous') continue;

    const nameLower = func.name.toLowerCase();
    const startsWithVerb = VERB_PREFIXES.some(
      (prefix) => nameLower.startsWith(prefix) || nameLower === prefix
    );

    if (!startsWithVerb) {
      // Skip constructor-like names (PascalCase typically indicates class/type)
      if (/^[A-Z]/.test(func.name)) continue;

      // Skip event handlers (onX, handleX)
      if (nameLower.startsWith('on') || nameLower.startsWith('handle')) continue;

      issues.push({
        ruleId: 'non-verb-function',
        severity: 'low',
        category: 'naming',
        message: `Function '${func.name}' should start with a verb (e.g., get${capitalize(func.name)})`,
        locations: [{ uri: func.uri, file: file.path, line: func.startLine }],
        symbol: func.name,
      });
    }
  }

  return issues;
}

export function detectNonQuestionBooleans(file: FileInfo): Issue[] {
  const issues: Issue[] = [];

  // Check function names that suggest boolean return but don't use boolean prefix
  const booleanPatterns = [
    'valid',
    'active',
    'enabled',
    'disabled',
    'visible',
    'hidden',
    'loading',
    'loaded',
    'empty',
    'ready',
    'open',
    'closed',
    'selected',
    'checked',
    'connected',
    'authenticated',
  ];

  for (const func of file.functions) {
    // Handle Class.method or Class:method names - extract just the method part
    const methodName = func.name.includes('.')
      ? func.name.split('.').pop() || func.name
      : func.name.includes(':')
        ? func.name.split(':').pop() || func.name
        : func.name;
    const nameLower = methodName.toLowerCase();

    // Check if name suggests boolean but doesn't use proper prefix
    const matchesPattern = booleanPatterns.some(
      (pattern) => nameLower === pattern || nameLower.endsWith(pattern)
    );

    if (matchesPattern) {
      const startsWithBooleanPrefix = BOOLEAN_PREFIXES.some((prefix) =>
        nameLower.startsWith(prefix)
      );

      const startsWithSetterPrefix = SETTER_PREFIXES.some((prefix) =>
        nameLower.startsWith(prefix)
      );

      const startsWithActionVerb = ACTION_VERB_PREFIXES.some((prefix) =>
        nameLower.startsWith(prefix)
      );

      if (!startsWithBooleanPrefix && !startsWithSetterPrefix && !startsWithActionVerb) {
        issues.push({
          ruleId: 'non-question-boolean',
          severity: 'low',
          category: 'naming',
          message: `'${func.name}' appears to be boolean - consider naming like 'is${capitalize(methodName)}'`,
          locations: [{ uri: func.uri, file: file.path, line: func.startLine }],
          symbol: func.name,
        });
      }
    }
  }

  return issues;
}

export function detectMagicNumbers(
  file: FileInfo,
  literals: LiteralInfo[]
): Issue[] {
  const issues: Issue[] = [];

  for (const literal of literals) {
    // Skip allowed numbers
    if (ALLOWED_MAGIC_NUMBERS.includes(literal.value)) continue;

    // Skip array indices and obvious contexts
    if (literal.context === 'array-index') continue;

    // Skip common pixel/size values in likely UI code
    if (isCommonUiValue(literal.value)) continue;

    issues.push({
      ruleId: 'magic-number',
      severity: 'low',
      category: 'naming',
      message: `Magic number ${literal.value} - consider using a named constant`,
      locations: [{ uri: createUriFromPathAndLine(file.path, undefined, literal.line), file: file.path, line: literal.line }],
    });
  }

  return issues;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function isCommonUiValue(value: number): boolean {
  // Common CSS/UI values that are usually acceptable
  const commonValues = [
    // Pixels
    4, 8, 12, 16, 20, 24, 28, 32, 40, 48, 56, 64, 72, 80, 96,
    // Percentages (as decimals)
    0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9,
    // Animation durations (ms)
    100, 150, 200, 250, 300, 400, 500,
    // Z-index
    999, 1000, 9999,
  ];
  return commonValues.includes(value);
}
