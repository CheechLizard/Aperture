import { FileInfo, CommentInfo, Issue } from '../types';
import { CODE_COMMENT_PATTERNS, HIGH_COMMENT_DENSITY_THRESHOLD } from './rule-constants';

export function detectCommentedCode(
  file: FileInfo,
  comments: CommentInfo[]
): Issue[] {
  const issues: Issue[] = [];

  for (const comment of comments) {
    // Skip block comments for this check - harder to detect code in them
    if (comment.isBlockComment) continue;

    // Remove the comment markers
    let text = comment.text.trim();
    if (text.startsWith('//')) text = text.slice(2).trim();
    if (text.startsWith('--')) text = text.slice(2).trim();

    // Check if it looks like code
    if (looksLikeCode(text)) {
      issues.push({
        ruleId: 'commented-code',
        severity: 'low',
        category: 'comment',
        message: `Possible commented-out code - consider removing`,
        locations: [{ file: file.path, line: comment.line }],
      });
    }
  }

  return issues;
}

function looksLikeCode(text: string): boolean {
  // Skip empty or very short comments
  if (text.length < 5) return false;

  // Skip common non-code comment patterns
  if (text.startsWith('TODO')) return false;
  if (text.startsWith('FIXME')) return false;
  if (text.startsWith('NOTE')) return false;
  if (text.startsWith('HACK')) return false;
  if (text.startsWith('XXX')) return false;
  if (text.startsWith('eslint')) return false;
  if (text.startsWith('@')) return false; // JSDoc annotations
  if (text.startsWith('#')) return false; // Region markers

  // Check against code patterns
  for (const pattern of CODE_COMMENT_PATTERNS) {
    if (pattern.test(text)) return true;
  }

  // Additional heuristics
  // Looks like a function call: word(
  if (/^\s*[a-zA-Z_]\w*\s*\(/.test(text)) return true;

  // Looks like an assignment with semicolon
  if (/^\s*[a-zA-Z_]\w*\s*=\s*.+;\s*$/.test(text)) return true;

  // Looks like a variable declaration
  if (/^\s*(const|let|var|local)\s+\w+/.test(text)) return true;

  return false;
}

export function detectHighCommentDensity(
  file: FileInfo,
  comments: CommentInfo[]
): Issue | null {
  if (file.loc === 0) return null;

  // Count comment lines (approximate - block comments count as 1 each)
  let commentLineCount = 0;
  for (const comment of comments) {
    if (comment.isBlockComment) {
      // Estimate block comment lines from text
      const lines = comment.text.split('\n').length;
      commentLineCount += lines;
    } else {
      commentLineCount += 1;
    }
  }

  const ratio = commentLineCount / file.loc;

  if (ratio > HIGH_COMMENT_DENSITY_THRESHOLD) {
    const percentage = Math.round(ratio * 100);
    return {
      ruleId: 'high-comment-density',
      severity: 'low',
      category: 'comment',
      message: `High comment density (${percentage}%) - may indicate unclear code or stale comments`,
      locations: [{ file: file.path }],
    };
  }

  return null;
}
