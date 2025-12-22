import { FileInfo, FileIssue } from '../types';
import { DATA_KEYWORDS, LOGIC_KEYWORDS, RENDER_KEYWORDS } from './rule-constants';

const MIN_KEYWORD_MATCHES = 3;

export function detectMixedConcerns(
  file: FileInfo,
  content: string
): FileIssue | null {
  const contentLower = content.toLowerCase();

  // Count keyword matches in each category
  const dataMatches = countKeywordMatches(contentLower, DATA_KEYWORDS);
  const logicMatches = countKeywordMatches(contentLower, LOGIC_KEYWORDS);
  const renderMatches = countKeywordMatches(contentLower, RENDER_KEYWORDS);

  // Check if file has significant presence in multiple categories
  const hasData = dataMatches >= MIN_KEYWORD_MATCHES;
  const hasLogic = logicMatches >= MIN_KEYWORD_MATCHES;
  const hasRender = renderMatches >= MIN_KEYWORD_MATCHES;

  const concernCount = [hasData, hasLogic, hasRender].filter(Boolean).length;

  if (concernCount >= 2) {
    const concerns: string[] = [];
    if (hasData) concerns.push('data definitions');
    if (hasLogic) concerns.push('business logic');
    if (hasRender) concerns.push('rendering');

    return {
      ruleId: 'mixed-concerns',
      severity: 'warning',
      category: 'architecture',
      message: `File may have mixed concerns: ${concerns.join(' + ')}`,
      file: file.path,
    };
  }

  return null;
}

function countKeywordMatches(content: string, keywords: string[]): number {
  let count = 0;
  for (const keyword of keywords) {
    // Use word boundary matching to avoid partial matches
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    const matches = content.match(regex);
    if (matches) count += matches.length;
  }
  return count;
}
