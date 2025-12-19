import * as vscode from 'vscode';
import { ProjectData, FileInfo, LanguageSummary } from './types';
import { getLanguage } from './language-map';

export async function scanWorkspace(): Promise<ProjectData> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    throw new Error('No workspace folder open');
  }

  const root = workspaceFolder.uri.fsPath;
  const files = await scanFiles(workspaceFolder.uri);
  const languages = aggregateLanguages(files);
  const totalLoc = files.reduce((sum, f) => sum + f.loc, 0);

  return {
    root,
    scannedAt: new Date().toISOString(),
    files,
    languages,
    totals: {
      files: files.length,
      loc: totalLoc,
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

    return {
      path: relativePath,
      language,
      loc,
      functions: [], // Deferred to v0.2
    };
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
