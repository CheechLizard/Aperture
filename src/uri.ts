/**
 * URI-based node addressing system
 *
 * Format: file:///{path}#{fragment}
 *
 * Examples:
 *   file:///src/app.ts                           - File
 *   file:///src/app.ts#processData               - Named function
 *   file:///src/app.ts#UserService.fetchUser     - Class method
 *   file:///src/app.ts#processData.if:10.for:11  - Nested block
 */

// Re-export builders for backward compatibility
export {
  createFolderUri,
  createFileUri,
  createSymbolUri,
  createNestedSymbolUri,
  createBlockUri,
  createUriFromPathAndLine,
} from './uri-builders';

import { createFileUri, createFolderUri } from './uri-builders';

const URI_SCHEME = 'file://';

export interface ParsedUri {
  scheme: 'file';
  path: string;           // Relative path from workspace root
  fragment: string | null; // Symbol path within file
}

export interface SymbolFragment {
  symbolPath: string[];   // ['processData', 'if:10', 'for:11']
  leafName: string;       // Last segment: 'for:11' or 'processData'
  leafLine: number | null; // Line number if block (e.g., 11 from 'for:11')
}

// ============================================================================
// Parsing
// ============================================================================

/** Parse a URI into its components */
export function parseUri(uri: string): ParsedUri {
  if (!uri.startsWith(URI_SCHEME)) {
    throw new Error(`Invalid URI scheme: ${uri}`);
  }

  const withoutScheme = uri.slice(URI_SCHEME.length);
  const hashIndex = withoutScheme.indexOf('#');

  if (hashIndex === -1) {
    return {
      scheme: 'file',
      path: withoutScheme.startsWith('/') ? withoutScheme.slice(1) : withoutScheme,
      fragment: null
    };
  }

  return {
    scheme: 'file',
    path: withoutScheme.slice(0, hashIndex).replace(/^\//, ''),
    fragment: withoutScheme.slice(hashIndex + 1) || null
  };
}

/** Extract just the file path from a URI */
export function getFilePath(uri: string): string {
  return parseUri(uri).path;
}

/** Extract the fragment (symbol path) from a URI */
export function getFragment(uri: string): string | null {
  return parseUri(uri).fragment;
}

/** Parse a fragment into its symbol path components */
export function parseFragment(fragment: string): SymbolFragment {
  const parts = fragment.split('.');
  const leafName = parts[parts.length - 1];

  // Check if leaf is a block with line number (e.g., 'for:11')
  const lineMatch = leafName.match(/^(\w+):(\d+)$/);
  const leafLine = lineMatch ? parseInt(lineMatch[2], 10) : null;

  return {
    symbolPath: parts,
    leafName,
    leafLine
  };
}

/** Get line number from URI if present in fragment */
export function getLineFromUri(uri: string): number | null {
  const fragment = getFragment(uri);
  if (!fragment) return null;

  // Check for L{line} format (anonymous location)
  const lineMatch = fragment.match(/^L(\d+)$/);
  if (lineMatch) return parseInt(lineMatch[1], 10);

  // Check for block format (e.g., 'processData.for:11')
  const parsed = parseFragment(fragment);
  return parsed.leafLine;
}

// ============================================================================
// Comparison
// ============================================================================

/** Check if two URIs are equal (normalized comparison) */
export function uriEquals(a: string, b: string): boolean {
  return normalizeUri(a) === normalizeUri(b);
}

/** Check if a URI starts with a prefix (for hierarchy matching) */
export function uriStartsWith(uri: string, prefix: string): boolean {
  const normalizedUri = normalizeUri(uri);
  const normalizedPrefix = normalizeUri(prefix);

  const parsedUri = parseUri(normalizedUri);
  const parsedPrefix = parseUri(normalizedPrefix);

  if (!parsedUri.path.startsWith(parsedPrefix.path)) {
    return false;
  }

  if (!parsedPrefix.fragment) {
    return true;
  }

  if (!parsedUri.fragment) {
    return false;
  }

  return parsedUri.fragment.startsWith(parsedPrefix.fragment);
}

/** Check if URI is a descendant of another (child/grandchild) */
export function isDescendantOf(uri: string, ancestorUri: string): boolean {
  if (uriEquals(uri, ancestorUri)) return false;
  return uriStartsWith(uri, ancestorUri);
}

/** Get parent URI (go up one level) */
export function getParentUri(uri: string): string | null {
  const parsed = parseUri(uri);

  if (parsed.fragment) {
    const parts = parsed.fragment.split('.');
    if (parts.length > 1) {
      return createFileUri(parsed.path) + '#' + parts.slice(0, -1).join('.');
    }
    return createFileUri(parsed.path);
  }

  const pathParts = parsed.path.split('/');
  if (pathParts.length <= 1) {
    return null;
  }
  return createFolderUri(pathParts.slice(0, -1).join('/'));
}

// ============================================================================
// Utilities
// ============================================================================

/** Normalize a URI for comparison */
function normalizeUri(uri: string): string {
  const parsed = parseUri(uri);
  const base = `${URI_SCHEME}/${parsed.path}`;
  return parsed.fragment ? `${base}#${parsed.fragment}` : base;
}

/** Check if a string is a valid Aperture URI */
export function isValidUri(uri: string): boolean {
  try {
    parseUri(uri);
    return true;
  } catch {
    return false;
  }
}

/** Get display name from URI (last path segment or symbol name) */
export function getDisplayName(uri: string): string {
  const parsed = parseUri(uri);

  if (parsed.fragment) {
    const parts = parsed.fragment.split('.');
    const last = parts[parts.length - 1];
    return last.replace(/:(\d+)$/, '');
  }

  const pathParts = parsed.path.split('/');
  return pathParts[pathParts.length - 1] || parsed.path;
}
