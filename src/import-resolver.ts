import * as path from 'path';
import { FileInfo, ImportInfo, ImportDetail } from './types';

export { ImportDetail } from './types';

export type LanguageType = 'lua' | 'py' | 'go' | 'rs' | 'js';

export function getLanguageType(filePath: string): LanguageType {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.lua') return 'lua';
  if (ext === '.py') return 'py';
  if (ext === '.go') return 'go';
  if (ext === '.rs') return 'rs';
  return 'js';
}

export function resolveImports(
  imports: ImportInfo[],
  fromPath: string,
  allFiles: FileInfo[]
): ImportDetail[] {
  const resolvedDetails: ImportDetail[] = [];
  const seenPaths = new Set<string>();
  const fileDir = path.dirname(fromPath);
  const langType = getLanguageType(fromPath);

  for (const importInfo of imports) {
    const resolvedPath = resolveImport(importInfo.modulePath, fileDir, allFiles, langType, fromPath);
    if (resolvedPath && resolvedPath !== fromPath && !seenPaths.has(resolvedPath)) {
      seenPaths.add(resolvedPath);
      resolvedDetails.push({
        targetPath: resolvedPath,
        line: importInfo.line,
        code: importInfo.code,
      });
    }
  }

  return resolvedDetails;
}

function resolveImport(
  importPath: string,
  fromDir: string,
  allFiles: FileInfo[],
  langType: LanguageType,
  selfPath: string
): string | null {
  if (langType === 'lua') {
    return resolveLuaImport(importPath, fromDir, allFiles, selfPath);
  }
  if (langType === 'py') {
    return resolvePythonImport(importPath, fromDir, allFiles);
  }
  if (langType === 'go') {
    return resolveGoImport(importPath, fromDir, allFiles);
  }
  if (langType === 'rs') {
    return resolveRustImport(importPath, fromDir, allFiles);
  }
  return resolveJsImport(importPath, fromDir, allFiles);
}

function resolveLuaImport(
  importPath: string,
  fromDir: string,
  allFiles: FileInfo[],
  selfPath: string
): string | null {
  const luaPath = importPath.replace(/\./g, '/');
  const luaExtensions = ['.lua', '/init.lua'];

  for (const ext of luaExtensions) {
    const tryPath = luaPath + ext;
    if (allFiles.some(f => f.path === tryPath)) return tryPath;
  }

  for (const ext of luaExtensions) {
    const tryPath = path.normalize(path.join(fromDir, luaPath)) + ext;
    if (allFiles.some(f => f.path === tryPath)) return tryPath;
  }

  const endPattern = '/' + luaPath + '.lua';
  const endMatch = allFiles.find(f =>
    (f.path.endsWith(endPattern) || f.path === luaPath + '.lua') && f.path !== selfPath
  );
  if (endMatch) return endMatch.path;

  const prefixes = ['game/', 'src/', 'lib/', 'scripts/'];
  for (const prefix of prefixes) {
    for (const ext of luaExtensions) {
      const tryPath = prefix + luaPath + ext;
      if (allFiles.some(f => f.path === tryPath)) return tryPath;
    }
  }

  const parts = fromDir.split('/');
  for (let i = 0; i < parts.length; i++) {
    const parentPath = parts.slice(0, i + 1).join('/');
    for (const ext of luaExtensions) {
      const tryPath = parentPath ? parentPath + '/' + luaPath + ext : luaPath + ext;
      if (allFiles.some(f => f.path === tryPath)) return tryPath;
    }
  }

  return null;
}

function resolvePythonImport(
  importPath: string,
  fromDir: string,
  allFiles: FileInfo[]
): string | null {
  let pyPath = importPath;
  let searchDir = '';

  if (pyPath.startsWith('..')) {
    searchDir = path.dirname(fromDir);
    pyPath = pyPath.slice(2);
  } else if (pyPath.startsWith('.')) {
    searchDir = fromDir;
    pyPath = pyPath.slice(1);
  }

  const modulePath = pyPath.replace(/\./g, '/');
  const pyExtensions = ['.py', '/__init__.py'];

  if (searchDir) {
    for (const ext of pyExtensions) {
      const tryPath = path.normalize(path.join(searchDir, modulePath)) + ext;
      if (allFiles.some(f => f.path === tryPath)) return tryPath;
    }
  }

  for (const ext of pyExtensions) {
    const tryPath = modulePath + ext;
    if (allFiles.some(f => f.path === tryPath)) return tryPath;
  }

  return null;
}

function resolveGoImport(
  importPath: string,
  fromDir: string,
  allFiles: FileInfo[]
): string | null {
  if (importPath.startsWith('./') || importPath.startsWith('../')) {
    const goPath = importPath.replace(/^\.\//, '');
    const tryPath = path.normalize(path.join(fromDir, goPath)) + '.go';
    if (allFiles.some(f => f.path === tryPath)) return tryPath;

    const dirPath = path.normalize(path.join(fromDir, goPath));
    const dirFile = allFiles.find(f => f.path.startsWith(dirPath + '/') && f.path.endsWith('.go'));
    if (dirFile) return dirFile.path;
  }

  const pkgPath = importPath.split('/').pop() + '.go';
  const matches = allFiles.filter(f => f.path.endsWith('/' + pkgPath) || f.path === pkgPath);
  if (matches.length === 1) return matches[0].path;

  return null;
}

function resolveRustImport(
  importPath: string,
  fromDir: string,
  allFiles: FileInfo[]
): string | null {
  if (importPath.startsWith('mod:')) {
    const modName = importPath.slice(4);
    const tryPaths = [
      path.normalize(path.join(fromDir, modName + '.rs')),
      path.normalize(path.join(fromDir, modName, 'mod.rs')),
    ];
    for (const tryPath of tryPaths) {
      if (allFiles.some(f => f.path === tryPath)) return tryPath;
    }
  } else if (importPath.startsWith('crate::')) {
    const rustPath = importPath.slice(7).replace(/::/g, '/');
    const tryPaths = [rustPath + '.rs', 'src/' + rustPath + '.rs', rustPath + '/mod.rs', 'src/' + rustPath + '/mod.rs'];
    for (const tryPath of tryPaths) {
      if (allFiles.some(f => f.path === tryPath)) return tryPath;
    }
  } else if (importPath.startsWith('super::')) {
    const rustPath = importPath.slice(7).replace(/::/g, '/');
    const parentDir = path.dirname(fromDir);
    const tryPath = path.normalize(path.join(parentDir, rustPath)) + '.rs';
    if (allFiles.some(f => f.path === tryPath)) return tryPath;
  } else if (importPath.startsWith('self::')) {
    const rustPath = importPath.slice(6).replace(/::/g, '/');
    const tryPath = path.normalize(path.join(fromDir, rustPath)) + '.rs';
    if (allFiles.some(f => f.path === tryPath)) return tryPath;
  }

  return null;
}

function resolveJsImport(
  importPath: string,
  fromDir: string,
  allFiles: FileInfo[]
): string | null {
  if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
    return null;
  }

  const resolved = path.normalize(path.join(fromDir, importPath));
  const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.js'];

  for (const ext of extensions) {
    const tryPath = resolved + ext;
    if (allFiles.some(f => f.path === tryPath)) return tryPath;
  }

  return null;
}
