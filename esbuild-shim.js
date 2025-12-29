// Shim for import.meta.url when bundling with esbuild in CommonJS mode
// This is needed for web-tree-sitter which uses import.meta.url internally
export const importMetaUrl = typeof document === 'undefined'
  ? require('url').pathToFileURL(__filename).toString()
  : (document.currentScript && document.currentScript.src || new URL('main.js', document.baseURI).href);
