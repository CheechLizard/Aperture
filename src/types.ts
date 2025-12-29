export interface ProjectData {
  root: string;
  scannedAt: string;
  files: FileInfo[];
  languages: LanguageSummary[];
  languageSupport: LanguageSupport[];
  rules: Rule[];
  totals: {
    files: number;
    loc: number;
    unsupportedFiles: number;
  };
  patternAnalysis?: PatternAnalysis;
}

export interface Rule {
  id: string;
  title: string;
  description: string;
}

export type ParseStatus = 'parsed' | 'unsupported' | 'error';

export interface FileInfo {
  path: string;
  uri: string;
  language: string;
  loc: number;
  functions: FunctionInfo[];
  imports: ImportInfo[];
  parseStatus: ParseStatus;
  issues?: Issue[];
}

export interface FunctionInfo {
  name: string;
  uri?: string;  // Added by scanner after AST extraction
  startLine: number;
  endLine: number;
  loc: number;
  maxNestingDepth: number;
  parameterCount: number;
}

export type Severity = 'high' | 'medium' | 'low';
export type IssueCategory = 'structural' | 'naming' | 'architecture' | 'comment';

export interface IssueLocation {
  uri?: string;  // Optional for backward compatibility with architecture issues
  file: string;
  line?: number;
  endLine?: number;
}

export interface Issue {
  ruleId: string;
  category: IssueCategory;
  severity: Severity;
  message: string;
  locations: IssueLocation[];
  symbol?: string;
}

export interface CatchBlockInfo {
  line: number;
  isEmpty: boolean;
}

export interface CommentInfo {
  line: number;
  text: string;
  isBlockComment: boolean;
}

export interface LiteralInfo {
  line: number;
  value: number;
  context: 'standalone' | 'comparison' | 'assignment' | 'array-index' | 'other';
}

export interface LanguageSummary {
  language: string;
  fileCount: number;
  loc: number;
}

export interface LanguageSupport {
  language: string;
  fileCount: number;
  isSupported: boolean;
}

export interface PatternInfo {
  name: string;
  description: string;
  category: 'architectural' | 'design';
  color: string;
  relatedPatterns?: string[];
}

export interface PatternUsage {
  patternName: string;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

export interface FilePatternClassification {
  path: string;
  patterns: PatternUsage[];
}

export interface PatternAnalysis {
  analyzedAt: string;
  framework: string;
  patterns: PatternInfo[];
  classifications: FilePatternClassification[];
}

export interface ImportInfo {
  modulePath: string;
  line: number;
  code: string;
}

export interface ImportDetail {
  targetPath: string;
  line: number;
  code: string;
}

export interface DependencyNode {
  path: string;
  imports: string[];
  importedBy: string[];
  importDetails: ImportDetail[];
}

export interface DependencyEdge {
  from: string;
  to: string;
  line: number;
  code: string;
}

export interface ASTExtractionResult {
  imports: ImportInfo[];
  functions: FunctionInfo[];
  catchBlocks: CatchBlockInfo[];
  comments: CommentInfo[];
  literals: LiteralInfo[];
  status: ParseStatus;
}

// Rule Management Types
export type RuleStatus = 'active' | 'new' | 'unsupported';

export interface RuleThreshold {
  value: number;
  unit: string;
  severity?: 'warning' | 'error';
}

export interface ParsedRule {
  id: string;
  rawText: string;
  status: RuleStatus;
  ruleId?: string;
  threshold?: RuleThreshold;
  thresholds?: RuleThreshold[];  // For rules with multiple thresholds (warning + error)
  blocklist?: string[];
  pattern?: string;
}

export interface RuleParseResult {
  rules: ParsedRule[];
  activeCount: number;
  newCount: number;
  unsupportedCount: number;
}

// Extracted thresholds for detectors
export interface RuleThresholds {
  functionLocWarning: number;
  functionLocError: number;
  fileLocWarning: number;
  maxNestingDepth: number;
  maxParameterCount: number;
  genericNames?: string[];
}

