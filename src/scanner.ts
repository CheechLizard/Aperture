import * as vscode from 'vscode';
import { ProjectData, FileInfo, LanguageSummary, LanguageSupport } from './types';
import { getLanguage } from './language-map';
import { parseClaudeMd } from './rules-parser';
import { parseAll } from './ast-parser';
import { detectCodeIssues } from './file-issue-detector';

export async function scanWorkspace(): Promise<ProjectData> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    throw new Error('No workspace folder open');
  }

  const root = workspaceFolder.uri.fsPath;
  const [files, rules] = await Promise.all([
    scanFiles(workspaceFolder.uri),
    parseClaudeMd(root),
  ]);
  const languages = aggregateLanguages(files);
  const languageSupport = computeLanguageSupport(files);
  const totalLoc = files.reduce((sum, f) => sum + f.loc, 0);
  const unsupportedFiles = files.filter(f => f.parseStatus === 'unsupported').length;

  return {
    root,
    scannedAt: new Date().toISOString(),
    files,
    languages,
    languageSupport,
    rules,
    totals: {
      files: files.length,
      loc: totalLoc,
      unsupportedFiles,
    },
  };
}

async function scanFiles(workspaceUri: vscode.Uri): Promise<FileInfo[]> {
  const excludePattern = '**/node_modules/**';
  const uris = await vscode.workspace.findFiles('**/*', excludePattern);

  const files: FileInfo[] = [];

  for (const uri of uris) {
    const fileInfo = await scanFile(uri, workspaceUri);
    if (fileInfo) {
      files.push(fileInfo);
    }
  }

  return files.sort((a, b) => b.loc - a.loc);
}

async function scanFile(
  uri: vscode.Uri,
  workspaceUri: vscode.Uri
): Promise<FileInfo | null> {
  try {
    const stat = await vscode.workspace.fs.stat(uri);
    if (stat.type !== vscode.FileType.File) {
      return null;
    }

    const content = await vscode.workspace.fs.readFile(uri);
    const text = Buffer.from(content).toString('utf8');
    const loc = countNonBlankLines(text);

    const relativePath = vscode.workspace.asRelativePath(uri, false);
    const language = getLanguage(uri.fsPath);

    // Full AST extraction
    const astResult = parseAll(text, relativePath, language);

    // Create file info with functions populated
    const fileInfo: FileInfo = {
      path: relativePath,
      language,
      loc,
      functions: astResult.functions,
      imports: astResult.imports,
      parseStatus: astResult.status,
    };

    // Detect issues for this file
    const issues = detectCodeIssues(fileInfo, astResult, text);
    if (issues.length > 0) {
      fileInfo.issues = issues;
    }

    return fileInfo;
  } catch {
    return null;
  }
}

function countNonBlankLines(text: string): number {
  const lines = text.split('\n');
  return lines.filter((line) => line.trim().length > 0).length;
}

function aggregateLanguages(files: FileInfo[]): LanguageSummary[] {
  const languageMap = new Map<string, { fileCount: number; loc: number }>();

  for (const file of files) {
    const existing = languageMap.get(file.language) || { fileCount: 0, loc: 0 };
    languageMap.set(file.language, {
      fileCount: existing.fileCount + 1,
      loc: existing.loc + file.loc,
    });
  }

  const summaries: LanguageSummary[] = [];
  for (const [language, data] of languageMap) {
    summaries.push({
      language,
      fileCount: data.fileCount,
      loc: data.loc,
    });
  }

  return summaries.sort((a, b) => b.loc - a.loc);
}

function computeLanguageSupport(files: FileInfo[]): LanguageSupport[] {
  const langMap = new Map<string, { count: number; supported: boolean }>();

  for (const file of files) {
    const existing = langMap.get(file.language) || { count: 0, supported: true };
    langMap.set(file.language, {
      count: existing.count + 1,
      supported: existing.supported && file.parseStatus !== 'unsupported',
    });
  }

  return [...langMap.entries()].map(([language, data]) => ({
    language,
    fileCount: data.count,
    isSupported: data.supported,
  }));
}
