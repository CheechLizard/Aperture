export const ISSUE_CONFIG_SCRIPT = `
// Issue view mapping - determines which view to show for each rule
const ISSUE_VIEW_MAP = {
  // Functions treemap
  'long-function': 'functions',
  'deep-nesting': 'functions',
  'too-many-parameters': 'functions',
  'silent-failure': 'functions',
  'generic-name': 'functions',
  'non-verb-function': 'functions',
  'non-question-boolean': 'functions',
  'magic-number': 'functions',
  'commented-code': 'functions',
  // Files treemap
  'long-file': 'files',
  'orphan-file': 'files',
  'mixed-concerns': 'files',
  'high-comment-density': 'files',
  // Chord diagram
  'circular-dependency': 'chord',
  'hub-file': 'chord',
};

// File-level rule IDs (shown on Files treemap)
const FILE_RULES = new Set(['long-file', 'mixed-concerns', 'orphan-file', 'high-comment-density']);

// Architecture rule IDs (graph-level, shown on Chord diagram)
const ARCHITECTURE_RULES = new Set(['circular-dependency', 'hub-file']);
`;
