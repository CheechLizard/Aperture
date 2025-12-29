import { ParsedRule, RuleParseResult, RuleThreshold, RuleThresholds } from './types';
import {
  FUNCTION_LOC_WARNING,
  FUNCTION_LOC_ERROR,
  FILE_LOC_WARNING,
  MAX_NESTING_DEPTH,
  MAX_PARAMETER_COUNT,
  GENERIC_NAMES,
} from './rules/rule-constants';

// Maps regex patterns to detector rule IDs
const RULE_MATCHERS: Array<{
  pattern: RegExp;
  ruleId: string;
  extract?: (match: RegExpMatchArray, text: string) => Partial<ParsedRule>;
}> = [
  {
    pattern: /functions?\s+should\s+not\s+exceed\s+(\d+)\s+lines?/i,
    ruleId: 'long-function',
    extract: (match, text) => {
      // Check for dual format: "X lines (warning) or Y lines (error)"
      const dualThresholds = extractDualThresholds(text, 'lines');
      if (dualThresholds.length > 1) {
        return { thresholds: dualThresholds };
      }
      // Single threshold
      return { threshold: extractThreshold(match[1], 'lines', text) };
    },
  },
  {
    pattern: /files?\s+should\s+not\s+exceed\s+(\d+)\s+lines?/i,
    ruleId: 'long-file',
    extract: (match, text) => ({
      threshold: extractThreshold(match[1], 'lines', text),
    }),
  },
  {
    pattern: /nesting\s+(?:depth\s+)?(?:beyond|exceed(?:ing)?)\s+(\d+)\s+levels?/i,
    ruleId: 'deep-nesting',
    extract: (match, text) => ({
      threshold: extractThreshold(match[1], 'levels', text),
    }),
  },
  {
    pattern: /(?:more\s+than|exceed(?:ing)?)\s+(\d+)\s+parameters?/i,
    ruleId: 'too-many-parameters',
    extract: (match, text) => ({
      threshold: extractThreshold(match[1], 'parameters', text),
    }),
  },
  {
    pattern: /avoid\s+generic\s+names?[:\s]+(.+)/i,
    ruleId: 'generic-name',
    extract: (match) => ({
      blocklist: parseBlocklist(match[1]),
    }),
  },
  {
    pattern: /avoid\s+(?:generic\s+)?names?[:\s]*(data|result|temp)/i,
    ruleId: 'generic-name',
  },
  {
    pattern: /boolean.*(?:should\s+be|named\s+as)\s+questions?/i,
    ruleId: 'non-question-boolean',
    extract: (_, text) => ({
      pattern: extractBooleanPrefixes(text),
    }),
  },
  {
    pattern: /(?:is|has|can|should|will)\*/i,
    ruleId: 'non-question-boolean',
  },
  {
    pattern: /functions?\s+should\s+(?:start\s+with\s+)?(?:a\s+)?verb/i,
    ruleId: 'non-verb-function',
  },
  {
    pattern: /(?:empty|silent)\s+(?:catch|except|failure)/i,
    ruleId: 'silent-failure',
  },
  {
    pattern: /never\s+(?:use\s+)?empty\s+catch/i,
    ruleId: 'silent-failure',
  },
  {
    pattern: /(?:remove|delete|avoid)\s+commented[\s-]?out\s+code/i,
    ruleId: 'commented-code',
  },
  {
    pattern: /comments?\s+should\s+explain\s+why/i,
    ruleId: 'high-comment-density',
  },
  {
    pattern: /circular\s+dependenc/i,
    ruleId: 'circular-dependency',
  },
  {
    pattern: /orphan\s+files?|no\s+(?:imports?\s+or\s+)?dependents?/i,
    ruleId: 'orphan-file',
  },
];

// Detectors we have implementations for
const SUPPORTED_DETECTORS = new Set([
  'long-function',
  'long-file',
  'deep-nesting',
  'too-many-parameters',
  'generic-name',
  'non-question-boolean',
  'non-verb-function',
  'silent-failure',
  'commented-code',
  'high-comment-density',
  'circular-dependency',
  'hub-file',
  'orphan-file',
  'magic-number',
  'mixed-concerns',
]);

function extractThreshold(value: string, unit: string, text: string): RuleThreshold {
  const severity = /\(error\)/i.test(text) ? 'error' :
                   /\(warning\)/i.test(text) ? 'warning' : undefined;
  return { value: parseInt(value, 10), unit, severity };
}

// Extract multiple thresholds from format: "X lines (warning) or Y lines (error)"
function extractDualThresholds(text: string, unit: string): RuleThreshold[] {
  const thresholds: RuleThreshold[] = [];

  // Match patterns like "2100 lines (warning)" or "5000 lines (error)"
  const pattern = /(\d+)\s*lines?\s*\((warning|error)\)/gi;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    thresholds.push({
      value: parseInt(match[1], 10),
      unit,
      severity: match[2].toLowerCase() as 'warning' | 'error',
    });
  }

  return thresholds;
}

function parseBlocklist(text: string): string[] {
  return text
    .split(/[,;]/)
    .map(s => s.trim().toLowerCase())
    .filter(s => s.length > 0 && !s.includes(' '));
}

function extractBooleanPrefixes(text: string): string {
  const match = text.match(/(is|has|can|should|will)\*/gi);
  return match ? match.join(', ') : 'is*, has*, can*, should*, will*';
}

function extractBulletPoints(content: string): string[] {
  const lines = content.split('\n');
  const bullets: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      bullets.push(trimmed.slice(2).trim());
    }
  }

  return bullets;
}

function parseRule(rawText: string, index: number): ParsedRule {
  const id = `rule-${index}`;

  for (const matcher of RULE_MATCHERS) {
    const match = rawText.match(matcher.pattern);
    if (match) {
      const extras = matcher.extract ? matcher.extract(match, rawText) : {};
      const isSupported = SUPPORTED_DETECTORS.has(matcher.ruleId);

      return {
        id,
        rawText,
        status: isSupported ? 'active' : 'unsupported',
        ruleId: matcher.ruleId,
        ...extras,
      };
    }
  }

  return {
    id,
    rawText,
    status: 'new',
  };
}

export function parseCodingStandards(content: string): RuleParseResult {
  const bullets = extractBulletPoints(content);
  const rules = bullets.map((text, i) => parseRule(text, i));

  return {
    rules,
    activeCount: rules.filter(r => r.status === 'active').length,
    newCount: rules.filter(r => r.status === 'new').length,
    unsupportedCount: rules.filter(r => r.status === 'unsupported').length,
  };
}

export function getEmptyParseResult(): RuleParseResult {
  return {
    rules: [],
    activeCount: 0,
    newCount: 0,
    unsupportedCount: 0,
  };
}

export function extractThresholds(rules: ParsedRule[]): RuleThresholds {
  // Start with defaults from constants
  const thresholds: RuleThresholds = {
    functionLocWarning: FUNCTION_LOC_WARNING,
    functionLocError: FUNCTION_LOC_ERROR,
    fileLocWarning: FILE_LOC_WARNING,
    maxNestingDepth: MAX_NESTING_DEPTH,
    maxParameterCount: MAX_PARAMETER_COUNT,
    genericNames: [...GENERIC_NAMES],
  };

  for (const rule of rules) {
    if (!rule.ruleId) continue;

    // Handle rules with multiple thresholds (e.g., warning + error)
    if (rule.thresholds && rule.thresholds.length > 0) {
      for (const t of rule.thresholds) {
        if (rule.ruleId === 'long-function') {
          if (t.severity === 'error') {
            thresholds.functionLocError = t.value;
          } else if (t.severity === 'warning') {
            thresholds.functionLocWarning = t.value;
          }
        }
      }
      continue;
    }

    // Handle single threshold
    if (!rule.threshold) continue;

    switch (rule.ruleId) {
      case 'long-function':
        if (rule.threshold.severity === 'error') {
          thresholds.functionLocError = rule.threshold.value;
        } else {
          thresholds.functionLocWarning = rule.threshold.value;
        }
        break;
      case 'long-file':
        thresholds.fileLocWarning = rule.threshold.value;
        break;
      case 'deep-nesting':
        thresholds.maxNestingDepth = rule.threshold.value;
        break;
      case 'too-many-parameters':
        thresholds.maxParameterCount = rule.threshold.value;
        break;
    }

    if (rule.ruleId === 'generic-name' && rule.blocklist) {
      thresholds.genericNames = rule.blocklist;
    }
  }

  return thresholds;
}

export function getDefaultThresholds(): RuleThresholds {
  return {
    functionLocWarning: FUNCTION_LOC_WARNING,
    functionLocError: FUNCTION_LOC_ERROR,
    fileLocWarning: FILE_LOC_WARNING,
    maxNestingDepth: MAX_NESTING_DEPTH,
    maxParameterCount: MAX_PARAMETER_COUNT,
    genericNames: [...GENERIC_NAMES],
  };
}
