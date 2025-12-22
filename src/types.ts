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
  language: string;
  loc: number;
  functions: FunctionInfo[];
  imports: ImportInfo[];
  parseStatus: ParseStatus;
  issues?: FileIssue[];
}

export interface FunctionInfo {
  name: string;
  startLine: number;
  endLine: number;
  loc: number;
  maxNestingDepth: number;
  parameterCount: number;
}

export type IssueSeverity = 'error' | 'warning' | 'info';
export type IssueCategory = 'structural' | 'naming' | 'architecture' | 'comment';

export interface FileIssue {
  ruleId: string;
  severity: IssueSeverity;
  category: IssueCategory;
  message: string;
  file: string;
  line?: number;
  endLine?: number;
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

export interface AntiPattern {
  type: 'circular' | 'nexus' | 'orphan';
  severity: 'high' | 'medium' | 'low';
  description: string;
  files: string[];
}
