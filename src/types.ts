export interface ProjectData {
  root: string;
  scannedAt: string;
  files: FileInfo[];
  languages: LanguageSummary[];
  totals: {
    files: number;
    loc: number;
  };
}

export interface FileInfo {
  path: string;
  language: string;
  loc: number;
  functions: FunctionInfo[];
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
