export const FILE_ISSUES_PANEL_SCRIPT = `
// Unified ignored issues array
let ignoredIssues = [];

function isIssueIgnored(issue) {
  return ignoredIssues.some(ignored =>
    ignored.ruleId === issue.ruleId &&
    ignored.message === issue.message &&
    JSON.stringify(ignored.locations) === JSON.stringify(issue.locations)
  );
}

function getActiveIssueCount() {
  return issues.filter(i => !isIssueIgnored(i)).length;
}
`;
