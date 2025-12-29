import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { RuleParseResult } from './types';
import { parseCodingStandards, getEmptyParseResult } from './coding-standards-parser';

const CODING_STANDARDS_FILENAME = 'coding-standards.md';

export type RulesChangeCallback = (result: RuleParseResult, fileExists: boolean) => void | Promise<void>;

let watcher: vscode.FileSystemWatcher | null = null;
let currentCallback: RulesChangeCallback | null = null;
let bundledDefaultsPath: string = '';

export function setBundledDefaultsPath(extPath: string): void {
  bundledDefaultsPath = path.join(extPath, 'dist', 'defaults', 'coding-standards.md');
}

function loadBundledDefaults(): RuleParseResult {
  try {
    const content = fs.readFileSync(bundledDefaultsPath, 'utf8');
    return parseCodingStandards(content);
  } catch {
    return getEmptyParseResult();
  }
}

export async function loadCodingStandards(workspaceRoot: string): Promise<{
  result: RuleParseResult;
  fileExists: boolean;
}> {
  const filePath = vscode.Uri.joinPath(vscode.Uri.file(workspaceRoot), CODING_STANDARDS_FILENAME);

  try {
    const content = await vscode.workspace.fs.readFile(filePath);
    const text = new TextDecoder().decode(content);
    return {
      result: parseCodingStandards(text),
      fileExists: true,
    };
  } catch {
    // No project file - return empty (bundled defaults only used as template)
    return {
      result: getEmptyParseResult(),
      fileExists: false,
    };
  }
}

export function startWatching(workspaceRoot: string, onChange: RulesChangeCallback): void {
  stopWatching();

  currentCallback = onChange;
  const pattern = new vscode.RelativePattern(workspaceRoot, CODING_STANDARDS_FILENAME);
  watcher = vscode.workspace.createFileSystemWatcher(pattern);

  const handleChange = async () => {
    const { result, fileExists } = await loadCodingStandards(workspaceRoot);
    currentCallback?.(result, fileExists);
  };

  watcher.onDidChange(handleChange);
  watcher.onDidCreate(handleChange);
  watcher.onDidDelete(handleChange);
}

export function stopWatching(): void {
  watcher?.dispose();
  watcher = null;
  currentCallback = null;
}

export function getCodingStandardsPath(workspaceRoot: string): string {
  return vscode.Uri.joinPath(vscode.Uri.file(workspaceRoot), CODING_STANDARDS_FILENAME).fsPath;
}
