/**
 * URI construction functions for the Aperture URI addressing system
 *
 * Format: file:///{path}#{fragment}
 */

const URI_SCHEME = 'file://';

/** Normalize a file path (remove leading/trailing slashes, normalize separators) */
function normalizePath(path: string): string {
  return path
    .replace(/\\/g, '/')      // Normalize Windows paths
    .replace(/^\/+/, '')       // Remove leading slashes
    .replace(/\/+$/, '');      // Remove trailing slashes
}

/** Create URI for a folder */
export function createFolderUri(path: string): string {
  return `${URI_SCHEME}/${normalizePath(path)}`;
}

/** Create URI for a file */
export function createFileUri(path: string): string {
  return `${URI_SCHEME}/${normalizePath(path)}`;
}

/** Create URI for a named symbol (function, class, method) */
export function createSymbolUri(path: string, symbolName: string, line?: number): string {
  // Include line number for uniqueness (multiple functions can have same name, e.g. "anonymous")
  const fragment = line !== undefined ? `${symbolName}:${line}` : symbolName;
  return `${URI_SCHEME}/${normalizePath(path)}#${fragment}`;
}

/** Create URI for a nested symbol (e.g., class method) */
export function createNestedSymbolUri(path: string, parentSymbol: string, childSymbol: string): string {
  return `${URI_SCHEME}/${normalizePath(path)}#${parentSymbol}.${childSymbol}`;
}

/** Create URI for an unnamed block (if, for, try, etc.) */
export function createBlockUri(path: string, parentFragment: string, blockType: string, line: number): string {
  const fragment = parentFragment ? `${parentFragment}.${blockType}:${line}` : `${blockType}:${line}`;
  return `${URI_SCHEME}/${normalizePath(path)}#${fragment}`;
}

/** Create URI from file path and optional line number (for backwards compat) */
export function createUriFromPathAndLine(path: string, symbolName?: string, line?: number): string {
  if (symbolName) {
    return createSymbolUri(path, symbolName);
  }
  if (line !== undefined) {
    // Anonymous location - use line as identifier
    return `${URI_SCHEME}/${normalizePath(path)}#L${line}`;
  }
  return createFileUri(path);
}
