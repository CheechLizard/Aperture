// Structural thresholds
export const FUNCTION_LOC_WARNING = 20;
export const FUNCTION_LOC_ERROR = 50;
export const FILE_LOC_WARNING = 200;
export const MAX_NESTING_DEPTH = 4;
export const MAX_PARAMETER_COUNT = 5;

// Comment density thresholds
export const HIGH_COMMENT_DENSITY_THRESHOLD = 0.4; // 40% comments is suspicious

// Naming blocklists
export const GENERIC_NAMES = [
  'data',
  'result',
  'temp',
  'item',
  'value',
  'obj',
  'ret',
  'res',
  'tmp',
  'info',
  'stuff',
  'thing',
  'val',
  'x',
  'y',
  'z',
];

export const VERB_PREFIXES = [
  'get',
  'set',
  'is',
  'has',
  'can',
  'should',
  'will',
  'do',
  'make',
  'create',
  'build',
  'find',
  'fetch',
  'load',
  'save',
  'update',
  'delete',
  'remove',
  'add',
  'insert',
  'append',
  'render',
  'parse',
  'validate',
  'check',
  'handle',
  'process',
  'convert',
  'format',
  'extract',
  'calculate',
  'compute',
  'init',
  'setup',
  'reset',
  'clear',
  'show',
  'hide',
  'enable',
  'disable',
  'start',
  'stop',
  'run',
  'execute',
  'apply',
  'register',
  'unregister',
  'subscribe',
  'unsubscribe',
  'emit',
  'dispatch',
  'trigger',
  'on',
];

export const BOOLEAN_PREFIXES = [
  'is',
  'has',
  'can',
  'should',
  'will',
  'was',
  'are',
  'does',
  'did',
  'needs',
  'allows',
  'includes',
  'contains',
  'matches',
  'exists',
];

// Magic numbers - values that don't need to be named constants
export const ALLOWED_MAGIC_NUMBERS = [
  -1, 0, 1, 2, 10, 100, 1000,
  // Common percentages
  0.5, 0.25, 0.75,
  // Common array/string operations
  16, 32, 64, 128, 256, 512, 1024,
];

// Patterns that indicate commented-out code
export const CODE_COMMENT_PATTERNS = [
  /^\s*(if|for|while|return|const|let|var|function|class|import|export)\s*[\(\{]/,
  /^\s*\w+\s*[=!<>]+\s*\w+/,
  /^\s*\w+\(\s*\w*\s*\)/,
  /^\s*\/\/\s*TODO:/i,
  /^\s*[a-zA-Z_]\w*\s*=\s*.+;?\s*$/,
];

// Mixed concerns - keywords indicating different responsibilities
export const DATA_KEYWORDS = [
  'interface',
  'type',
  'schema',
  'model',
  'entity',
  'dto',
  'struct',
];

export const LOGIC_KEYWORDS = [
  'calculate',
  'process',
  'validate',
  'compute',
  'transform',
  'analyze',
  'evaluate',
  'execute',
];

export const RENDER_KEYWORDS = [
  'render',
  'html',
  'jsx',
  'tsx',
  'component',
  'view',
  'template',
  'dom',
  'element',
  'svg',
];
