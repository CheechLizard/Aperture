import * as path from 'path';

const LANGUAGE_MAP: Record<string, string> = {
  // TypeScript
  '.ts': 'TypeScript',
  '.tsx': 'TypeScript',
  '.mts': 'TypeScript',
  '.cts': 'TypeScript',

  // JavaScript
  '.js': 'JavaScript',
  '.jsx': 'JavaScript',
  '.mjs': 'JavaScript',
  '.cjs': 'JavaScript',

  // Web
  '.html': 'HTML',
  '.htm': 'HTML',
  '.css': 'CSS',
  '.scss': 'SCSS',
  '.sass': 'Sass',
  '.less': 'Less',

  // Data
  '.json': 'JSON',
  '.yaml': 'YAML',
  '.yml': 'YAML',
  '.xml': 'XML',
  '.toml': 'TOML',

  // Lua
  '.lua': 'Lua',

  // Python
  '.py': 'Python',
  '.pyw': 'Python',

  // Shell
  '.sh': 'Shell',
  '.bash': 'Shell',
  '.zsh': 'Shell',

  // Documentation
  '.md': 'Markdown',
  '.txt': 'Text',

  // Config
  '.env': 'Environment',
  '.gitignore': 'Git',
};

const DEFAULT_LANGUAGE = 'Other';

export function getLanguage(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const basename = path.basename(filePath);

  // Check exact filename matches first
  if (LANGUAGE_MAP[basename]) {
    return LANGUAGE_MAP[basename];
  }

  return LANGUAGE_MAP[ext] || DEFAULT_LANGUAGE;
}
