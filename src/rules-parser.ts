import * as vscode from 'vscode';
import * as path from 'path';
import { Rule } from './types';

export async function parseClaudeMd(rootPath: string): Promise<Rule[]> {
  const claudeMdPath = path.join(rootPath, 'CLAUDE.md');
  const uri = vscode.Uri.file(claudeMdPath);

  try {
    const content = await vscode.workspace.fs.readFile(uri);
    const text = Buffer.from(content).toString('utf8');
    return extractRules(text);
  } catch {
    return [];
  }
}

function extractRules(text: string): Rule[] {
  const rules: Rule[] = [];
  const lines = text.split('\n');

  let inCodeStandards = false;
  let inFileRules = false;
  let inNaming = false;
  let inComments = false;

  for (const line of lines) {
    // Track sections
    if (line.startsWith('### Code Standards')) {
      inCodeStandards = true;
      inFileRules = false;
      inNaming = false;
      inComments = false;
      continue;
    }
    if (line.startsWith('### File Rules')) {
      inCodeStandards = false;
      inFileRules = true;
      inNaming = false;
      inComments = false;
      continue;
    }
    if (line.startsWith('### Naming')) {
      inCodeStandards = false;
      inFileRules = false;
      inNaming = true;
      inComments = false;
      continue;
    }
    if (line.startsWith('### Comments')) {
      inCodeStandards = false;
      inFileRules = false;
      inNaming = false;
      inComments = true;
      continue;
    }
    if (line.startsWith('## ') || line.startsWith('### ')) {
      inCodeStandards = false;
      inFileRules = false;
      inNaming = false;
      inComments = false;
      continue;
    }

    // Extract numbered rules from Code Standards
    if (inCodeStandards) {
      const match = line.match(/^\d+\.\s+\*\*(.+?)\*\*\s*(.*)$/);
      if (match) {
        const title = match[1].replace(/\.$/, '');
        const description = match[2] || '';
        rules.push({
          id: `code-${rules.length + 1}`,
          title,
          description,
        });
      }
    }

    // Extract bullet rules from File Rules
    if (inFileRules) {
      const match = line.match(/^-\s+(.+)$/);
      if (match) {
        rules.push({
          id: `file-${rules.length + 1}`,
          title: match[1].split('.')[0],
          description: match[1],
        });
      }
    }

    // Extract bullet rules from Comments
    if (inComments) {
      const match = line.match(/^-\s+(.+)$/);
      if (match) {
        rules.push({
          id: `comment-${rules.length + 1}`,
          title: match[1].split('.')[0],
          description: match[1],
        });
      }
    }
  }

  return rules;
}
