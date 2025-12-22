export const FILE_ISSUES_PANEL_SCRIPT = `
let ignoredFileIssues = [];  // Array of {ruleId, file, line, message} for ignored items

function isFileIssueIgnored(issue) {
  return ignoredFileIssues.some(i =>
    i.ruleId === issue.ruleId && i.file === issue.file && i.line === issue.line
  );
}

function getFileIssueCount() {
  const allIssues = typeof fileIssues !== 'undefined' ? fileIssues : [];
  return allIssues.filter(i => !isFileIssueIgnored(i)).length;
}

// Rendering is now handled by renderAntiPatterns() which merges file issues
function renderFileIssues() {
  // No-op - file issues are now rendered inline with anti-patterns
}
`;
