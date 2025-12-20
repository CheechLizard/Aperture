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
  functions: FunctionInfo[]; // TODO: Populate via AST in future
  imports: ImportInfo[];
  parseStatus: ParseStatus;
}

export interface FunctionInfo {
  name: string;
  startLine: number;
  endLine: number;
  loc: number;
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

export interface AntiPattern {
  type: 'circular' | 'nexus' | 'orphan' | 'hub';
  severity: 'high' | 'medium' | 'low';
  description: string;
  files: string[];
}
