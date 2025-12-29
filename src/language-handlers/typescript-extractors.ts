// Re-export all extractors from split modules for backward compatibility
export {
  extractImportsFromTree,
  extractStringContent,
} from './typescript/import-extractor';

export { extractFunctionsFromTree } from './typescript/function-extractor';

export {
  extractCatchBlocksFromTree,
  extractCommentsFromTree,
  extractLiteralsFromTree,
} from './typescript/annotation-extractors';
