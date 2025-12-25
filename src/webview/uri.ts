/**
 * URI utilities for webview injection
 * Same API as src/uri.ts but as a script string
 */

export const URI_SCRIPT = `
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

const URI_SCHEME = 'file://';

// ============================================================================
// Construction
// ============================================================================

function createFolderUri(path) {
  return URI_SCHEME + '/' + normalizePath(path);
}

function createFileUri(path) {
  return URI_SCHEME + '/' + normalizePath(path);
}

function createSymbolUri(path, symbolName) {
  return URI_SCHEME + '/' + normalizePath(path) + '#' + symbolName;
}

function createNestedSymbolUri(path, parentSymbol, childSymbol) {
  return URI_SCHEME + '/' + normalizePath(path) + '#' + parentSymbol + '.' + childSymbol;
}

function createBlockUri(path, parentFragment, blockType, line) {
  const fragment = parentFragment ? parentFragment + '.' + blockType + ':' + line : blockType + ':' + line;
  return URI_SCHEME + '/' + normalizePath(path) + '#' + fragment;
}

function createUriFromPathAndLine(path, symbolName, line) {
  if (symbolName) {
    return createSymbolUri(path, symbolName);
  }
  if (line !== undefined) {
    return URI_SCHEME + '/' + normalizePath(path) + '#L' + line;
  }
  return createFileUri(path);
}

// ============================================================================
// Parsing
// ============================================================================

function parseUri(uri) {
  if (!uri.startsWith(URI_SCHEME)) {
    throw new Error('Invalid URI scheme: ' + uri);
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
    path: withoutScheme.slice(0, hashIndex).replace(/^\\//, ''),
    fragment: withoutScheme.slice(hashIndex + 1) || null
  };
}

function getFilePath(uri) {
  return parseUri(uri).path;
}

function getFragment(uri) {
  return parseUri(uri).fragment;
}

function parseFragment(fragment) {
  const parts = fragment.split('.');
  const leafName = parts[parts.length - 1];

  const lineMatch = leafName.match(/^(\\w+):(\\d+)$/);
  const leafLine = lineMatch ? parseInt(lineMatch[2], 10) : null;

  return {
    symbolPath: parts,
    leafName: leafName,
    leafLine: leafLine
  };
}

function getLineFromUri(uri) {
  const fragment = getFragment(uri);
  if (!fragment) return null;

  const lineMatch = fragment.match(/^L(\\d+)$/);
  if (lineMatch) return parseInt(lineMatch[1], 10);

  const parsed = parseFragment(fragment);
  return parsed.leafLine;
}

// ============================================================================
// Comparison
// ============================================================================

function uriEquals(a, b) {
  return normalizeUri(a) === normalizeUri(b);
}

function uriStartsWith(uri, prefix) {
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

function isDescendantOf(uri, ancestorUri) {
  if (uriEquals(uri, ancestorUri)) return false;
  return uriStartsWith(uri, ancestorUri);
}

function getParentUri(uri) {
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

function normalizePath(path) {
  return path
    .replace(/\\\\/g, '/')
    .replace(/^\\/+/, '')
    .replace(/\\/+$/, '');
}

function normalizeUri(uri) {
  const parsed = parseUri(uri);
  const base = URI_SCHEME + '/' + parsed.path;
  return parsed.fragment ? base + '#' + parsed.fragment : base;
}

function isValidUri(uri) {
  try {
    parseUri(uri);
    return true;
  } catch (e) {
    return false;
  }
}

function getDisplayName(uri) {
  const parsed = parseUri(uri);

  if (parsed.fragment) {
    const parts = parsed.fragment.split('.');
    const last = parts[parts.length - 1];
    return last.replace(/:(\\d+)$/, '');
  }

  const pathParts = parsed.path.split('/');
  return pathParts[pathParts.length - 1] || parsed.path;
}
`;
