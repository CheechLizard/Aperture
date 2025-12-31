"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// esbuild-shim.js
var importMetaUrl;
var init_esbuild_shim = __esm({
  "esbuild-shim.js"() {
    "use strict";
    importMetaUrl = typeof document === "undefined" ? require("url").pathToFileURL(__filename).toString() : document.currentScript && document.currentScript.src || new URL("main.js", document.baseURI).href;
  }
});

// src/prompt-builder.ts
var prompt_builder_exports = {};
__export(prompt_builder_exports, {
  buildPromptPreview: () => buildPromptPreview,
  buildSystemPrompt: () => buildSystemPrompt,
  calibrateRatio: () => calibrateRatio,
  countPromptTokens: () => countPromptTokens,
  estimatePromptTokens: () => estimatePromptTokens,
  getObservedRatio: () => getObservedRatio
});
function calibrateRatio(chars, tokens) {
  if (tokens <= 0) return;
  const newRatio = chars / tokens;
  sampleCount++;
  const weight = Math.min(0.3, 1 / sampleCount);
  observedRatio = observedRatio * (1 - weight) + newRatio * weight;
}
function getObservedRatio() {
  return observedRatio;
}
function buildSystemPrompt(context) {
  let systemPrompt = `You are analyzing a codebase to answer questions about it.

Be concise but helpful. Always use the respond tool to provide your final answer.`;
  const hasContext = context && context.highlightedFiles.length > 0;
  if (hasContext) {
    systemPrompt += `

## Focus
`;
    for (const file of context.highlightedFiles) {
      systemPrompt += `- ${file}
`;
    }
    if (context.issues.length > 0) {
      systemPrompt += `
## Issues
`;
      for (const issue of context.issues) {
        const issueFiles = issue.locations.map((l) => l.file).join(", ");
        systemPrompt += `- ${issue.ruleId}: ${issue.message} (${issueFiles})
`;
      }
    }
    const contentFiles = Object.entries(context.fileContents);
    if (contentFiles.length > 0) {
      systemPrompt += `
## File Contents
`;
      for (const [filePath, content] of contentFiles) {
        systemPrompt += `
### ${filePath}
\`\`\`
${content}
\`\`\`
`;
      }
    }
  }
  return systemPrompt;
}
function estimatePromptTokens(query, context) {
  const systemPrompt = buildSystemPrompt(context);
  const totalChars = systemPrompt.length + query.length;
  const estimatedTokens = Math.ceil(totalChars / observedRatio);
  return { tokens: estimatedTokens, limit: TOKEN_LIMIT };
}
async function countPromptTokens(query, context, client) {
  const systemPrompt = buildSystemPrompt(context);
  const result = await client.messages.countTokens({
    model: "claude-sonnet-4-20250514",
    system: systemPrompt,
    messages: [{ role: "user", content: query }]
  });
  return { tokens: result.input_tokens, limit: TOKEN_LIMIT };
}
function buildPromptPreview(query, _files, context) {
  const systemPrompt = buildSystemPrompt(context);
  return `[SYSTEM PROMPT]
${systemPrompt}

[USER MESSAGE]
${query}`;
}
var TOKEN_LIMIT, observedRatio, sampleCount;
var init_prompt_builder = __esm({
  "src/prompt-builder.ts"() {
    "use strict";
    init_esbuild_shim();
    TOKEN_LIMIT = 4e4;
    observedRatio = 2.5;
    sampleCount = 0;
  }
});

// src/extension.ts
var extension_exports = {};
__export(extension_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(extension_exports);
init_esbuild_shim();
var vscode7 = __toESM(require("vscode"));
var path14 = __toESM(require("path"));

// src/language-registry.ts
init_esbuild_shim();
var LanguageRegistry = class {
  constructor() {
    this.handlers = /* @__PURE__ */ new Map();
    this.extensionMap = /* @__PURE__ */ new Map();
  }
  register(handler) {
    for (const langId of handler.languageIds) {
      this.handlers.set(langId, handler);
    }
    for (const ext of handler.extensions) {
      this.extensionMap.set(ext.toLowerCase(), handler);
    }
  }
  getHandlerByExtension(ext) {
    return this.extensionMap.get(ext.toLowerCase()) || null;
  }
  getHandlerByLanguage(language) {
    return this.handlers.get(language) || null;
  }
  async initializeAll(wasmDir) {
    const uniqueHandlers = new Set(this.handlers.values());
    await Promise.all([...uniqueHandlers].map((h) => h.initialize(wasmDir)));
  }
  getSupportedLanguages() {
    return [...this.handlers.keys()];
  }
  isLanguageSupported(language) {
    return this.handlers.has(language);
  }
  isExtensionSupported(ext) {
    return this.extensionMap.has(ext.toLowerCase());
  }
};
var languageRegistry = new LanguageRegistry();

// src/ast-parser.ts
init_esbuild_shim();
var fs2 = __toESM(require("fs"));
var path = __toESM(require("path"));

// node_modules/web-tree-sitter/web-tree-sitter.js
init_esbuild_shim();
var __defProp2 = Object.defineProperty;
var __name = (target, value) => __defProp2(target, "name", { value, configurable: true });
var Edit = class {
  static {
    __name(this, "Edit");
  }
  /** The start position of the change. */
  startPosition;
  /** The end position of the change before the edit. */
  oldEndPosition;
  /** The end position of the change after the edit. */
  newEndPosition;
  /** The start index of the change. */
  startIndex;
  /** The end index of the change before the edit. */
  oldEndIndex;
  /** The end index of the change after the edit. */
  newEndIndex;
  constructor({
    startIndex,
    oldEndIndex,
    newEndIndex,
    startPosition,
    oldEndPosition,
    newEndPosition
  }) {
    this.startIndex = startIndex >>> 0;
    this.oldEndIndex = oldEndIndex >>> 0;
    this.newEndIndex = newEndIndex >>> 0;
    this.startPosition = startPosition;
    this.oldEndPosition = oldEndPosition;
    this.newEndPosition = newEndPosition;
  }
  /**
   * Edit a point and index to keep it in-sync with source code that has been edited.
   *
   * This function updates a single point's byte offset and row/column position
   * based on an edit operation. This is useful for editing points without
   * requiring a tree or node instance.
   */
  editPoint(point, index) {
    let newIndex = index;
    const newPoint = { ...point };
    if (index >= this.oldEndIndex) {
      newIndex = this.newEndIndex + (index - this.oldEndIndex);
      const originalRow = point.row;
      newPoint.row = this.newEndPosition.row + (point.row - this.oldEndPosition.row);
      newPoint.column = originalRow === this.oldEndPosition.row ? this.newEndPosition.column + (point.column - this.oldEndPosition.column) : point.column;
    } else if (index > this.startIndex) {
      newIndex = this.newEndIndex;
      newPoint.row = this.newEndPosition.row;
      newPoint.column = this.newEndPosition.column;
    }
    return { point: newPoint, index: newIndex };
  }
  /**
   * Edit a range to keep it in-sync with source code that has been edited.
   *
   * This function updates a range's start and end positions based on an edit
   * operation. This is useful for editing ranges without requiring a tree
   * or node instance.
   */
  editRange(range) {
    const newRange = {
      startIndex: range.startIndex,
      startPosition: { ...range.startPosition },
      endIndex: range.endIndex,
      endPosition: { ...range.endPosition }
    };
    if (range.endIndex >= this.oldEndIndex) {
      if (range.endIndex !== Number.MAX_SAFE_INTEGER) {
        newRange.endIndex = this.newEndIndex + (range.endIndex - this.oldEndIndex);
        newRange.endPosition = {
          row: this.newEndPosition.row + (range.endPosition.row - this.oldEndPosition.row),
          column: range.endPosition.row === this.oldEndPosition.row ? this.newEndPosition.column + (range.endPosition.column - this.oldEndPosition.column) : range.endPosition.column
        };
        if (newRange.endIndex < this.newEndIndex) {
          newRange.endIndex = Number.MAX_SAFE_INTEGER;
          newRange.endPosition = { row: Number.MAX_SAFE_INTEGER, column: Number.MAX_SAFE_INTEGER };
        }
      }
    } else if (range.endIndex > this.startIndex) {
      newRange.endIndex = this.startIndex;
      newRange.endPosition = { ...this.startPosition };
    }
    if (range.startIndex >= this.oldEndIndex) {
      newRange.startIndex = this.newEndIndex + (range.startIndex - this.oldEndIndex);
      newRange.startPosition = {
        row: this.newEndPosition.row + (range.startPosition.row - this.oldEndPosition.row),
        column: range.startPosition.row === this.oldEndPosition.row ? this.newEndPosition.column + (range.startPosition.column - this.oldEndPosition.column) : range.startPosition.column
      };
      if (newRange.startIndex < this.newEndIndex) {
        newRange.startIndex = Number.MAX_SAFE_INTEGER;
        newRange.startPosition = { row: Number.MAX_SAFE_INTEGER, column: Number.MAX_SAFE_INTEGER };
      }
    } else if (range.startIndex > this.startIndex) {
      newRange.startIndex = this.startIndex;
      newRange.startPosition = { ...this.startPosition };
    }
    return newRange;
  }
};
var SIZE_OF_SHORT = 2;
var SIZE_OF_INT = 4;
var SIZE_OF_CURSOR = 4 * SIZE_OF_INT;
var SIZE_OF_NODE = 5 * SIZE_OF_INT;
var SIZE_OF_POINT = 2 * SIZE_OF_INT;
var SIZE_OF_RANGE = 2 * SIZE_OF_INT + 2 * SIZE_OF_POINT;
var ZERO_POINT = { row: 0, column: 0 };
var INTERNAL = /* @__PURE__ */ Symbol("INTERNAL");
function assertInternal(x) {
  if (x !== INTERNAL) throw new Error("Illegal constructor");
}
__name(assertInternal, "assertInternal");
function isPoint(point) {
  return !!point && typeof point.row === "number" && typeof point.column === "number";
}
__name(isPoint, "isPoint");
function setModule(module2) {
  C = module2;
}
__name(setModule, "setModule");
var C;
var LookaheadIterator = class {
  static {
    __name(this, "LookaheadIterator");
  }
  /** @internal */
  [0] = 0;
  // Internal handle for Wasm
  /** @internal */
  language;
  /** @internal */
  constructor(internal, address, language) {
    assertInternal(internal);
    this[0] = address;
    this.language = language;
  }
  /** Get the current symbol of the lookahead iterator. */
  get currentTypeId() {
    return C._ts_lookahead_iterator_current_symbol(this[0]);
  }
  /** Get the current symbol name of the lookahead iterator. */
  get currentType() {
    return this.language.types[this.currentTypeId] || "ERROR";
  }
  /** Delete the lookahead iterator, freeing its resources. */
  delete() {
    C._ts_lookahead_iterator_delete(this[0]);
    this[0] = 0;
  }
  /**
   * Reset the lookahead iterator.
   *
   * This returns `true` if the language was set successfully and `false`
   * otherwise.
   */
  reset(language, stateId) {
    if (C._ts_lookahead_iterator_reset(this[0], language[0], stateId)) {
      this.language = language;
      return true;
    }
    return false;
  }
  /**
   * Reset the lookahead iterator to another state.
   *
   * This returns `true` if the iterator was reset to the given state and
   * `false` otherwise.
   */
  resetState(stateId) {
    return Boolean(C._ts_lookahead_iterator_reset_state(this[0], stateId));
  }
  /**
   * Returns an iterator that iterates over the symbols of the lookahead iterator.
   *
   * The iterator will yield the current symbol name as a string for each step
   * until there are no more symbols to iterate over.
   */
  [Symbol.iterator]() {
    return {
      next: /* @__PURE__ */ __name(() => {
        if (C._ts_lookahead_iterator_next(this[0])) {
          return { done: false, value: this.currentType };
        }
        return { done: true, value: "" };
      }, "next")
    };
  }
};
function getText(tree, startIndex, endIndex, startPosition) {
  const length = endIndex - startIndex;
  let result = tree.textCallback(startIndex, startPosition);
  if (result) {
    startIndex += result.length;
    while (startIndex < endIndex) {
      const string = tree.textCallback(startIndex, startPosition);
      if (string && string.length > 0) {
        startIndex += string.length;
        result += string;
      } else {
        break;
      }
    }
    if (startIndex > endIndex) {
      result = result.slice(0, length);
    }
  }
  return result ?? "";
}
__name(getText, "getText");
var Tree = class _Tree {
  static {
    __name(this, "Tree");
  }
  /** @internal */
  [0] = 0;
  // Internal handle for Wasm
  /** @internal */
  textCallback;
  /** The language that was used to parse the syntax tree. */
  language;
  /** @internal */
  constructor(internal, address, language, textCallback) {
    assertInternal(internal);
    this[0] = address;
    this.language = language;
    this.textCallback = textCallback;
  }
  /** Create a shallow copy of the syntax tree. This is very fast. */
  copy() {
    const address = C._ts_tree_copy(this[0]);
    return new _Tree(INTERNAL, address, this.language, this.textCallback);
  }
  /** Delete the syntax tree, freeing its resources. */
  delete() {
    C._ts_tree_delete(this[0]);
    this[0] = 0;
  }
  /** Get the root node of the syntax tree. */
  get rootNode() {
    C._ts_tree_root_node_wasm(this[0]);
    return unmarshalNode(this);
  }
  /**
   * Get the root node of the syntax tree, but with its position shifted
   * forward by the given offset.
   */
  rootNodeWithOffset(offsetBytes, offsetExtent) {
    const address = TRANSFER_BUFFER + SIZE_OF_NODE;
    C.setValue(address, offsetBytes, "i32");
    marshalPoint(address + SIZE_OF_INT, offsetExtent);
    C._ts_tree_root_node_with_offset_wasm(this[0]);
    return unmarshalNode(this);
  }
  /**
   * Edit the syntax tree to keep it in sync with source code that has been
   * edited.
   *
   * You must describe the edit both in terms of byte offsets and in terms of
   * row/column coordinates.
   */
  edit(edit) {
    marshalEdit(edit);
    C._ts_tree_edit_wasm(this[0]);
  }
  /** Create a new {@link TreeCursor} starting from the root of the tree. */
  walk() {
    return this.rootNode.walk();
  }
  /**
   * Compare this old edited syntax tree to a new syntax tree representing
   * the same document, returning a sequence of ranges whose syntactic
   * structure has changed.
   *
   * For this to work correctly, this syntax tree must have been edited such
   * that its ranges match up to the new tree. Generally, you'll want to
   * call this method right after calling one of the [`Parser::parse`]
   * functions. Call it on the old tree that was passed to parse, and
   * pass the new tree that was returned from `parse`.
   */
  getChangedRanges(other) {
    if (!(other instanceof _Tree)) {
      throw new TypeError("Argument must be a Tree");
    }
    C._ts_tree_get_changed_ranges_wasm(this[0], other[0]);
    const count = C.getValue(TRANSFER_BUFFER, "i32");
    const buffer = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
    const result = new Array(count);
    if (count > 0) {
      let address = buffer;
      for (let i2 = 0; i2 < count; i2++) {
        result[i2] = unmarshalRange(address);
        address += SIZE_OF_RANGE;
      }
      C._free(buffer);
    }
    return result;
  }
  /** Get the included ranges that were used to parse the syntax tree. */
  getIncludedRanges() {
    C._ts_tree_included_ranges_wasm(this[0]);
    const count = C.getValue(TRANSFER_BUFFER, "i32");
    const buffer = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
    const result = new Array(count);
    if (count > 0) {
      let address = buffer;
      for (let i2 = 0; i2 < count; i2++) {
        result[i2] = unmarshalRange(address);
        address += SIZE_OF_RANGE;
      }
      C._free(buffer);
    }
    return result;
  }
};
var TreeCursor = class _TreeCursor {
  static {
    __name(this, "TreeCursor");
  }
  /** @internal */
  // @ts-expect-error: never read
  [0] = 0;
  // Internal handle for Wasm
  /** @internal */
  // @ts-expect-error: never read
  [1] = 0;
  // Internal handle for Wasm
  /** @internal */
  // @ts-expect-error: never read
  [2] = 0;
  // Internal handle for Wasm
  /** @internal */
  // @ts-expect-error: never read
  [3] = 0;
  // Internal handle for Wasm
  /** @internal */
  tree;
  /** @internal */
  constructor(internal, tree) {
    assertInternal(internal);
    this.tree = tree;
    unmarshalTreeCursor(this);
  }
  /** Creates a deep copy of the tree cursor. This allocates new memory. */
  copy() {
    const copy = new _TreeCursor(INTERNAL, this.tree);
    C._ts_tree_cursor_copy_wasm(this.tree[0]);
    unmarshalTreeCursor(copy);
    return copy;
  }
  /** Delete the tree cursor, freeing its resources. */
  delete() {
    marshalTreeCursor(this);
    C._ts_tree_cursor_delete_wasm(this.tree[0]);
    this[0] = this[1] = this[2] = 0;
  }
  /** Get the tree cursor's current {@link Node}. */
  get currentNode() {
    marshalTreeCursor(this);
    C._ts_tree_cursor_current_node_wasm(this.tree[0]);
    return unmarshalNode(this.tree);
  }
  /**
   * Get the numerical field id of this tree cursor's current node.
   *
   * See also {@link TreeCursor#currentFieldName}.
   */
  get currentFieldId() {
    marshalTreeCursor(this);
    return C._ts_tree_cursor_current_field_id_wasm(this.tree[0]);
  }
  /** Get the field name of this tree cursor's current node. */
  get currentFieldName() {
    return this.tree.language.fields[this.currentFieldId];
  }
  /**
   * Get the depth of the cursor's current node relative to the original
   * node that the cursor was constructed with.
   */
  get currentDepth() {
    marshalTreeCursor(this);
    return C._ts_tree_cursor_current_depth_wasm(this.tree[0]);
  }
  /**
   * Get the index of the cursor's current node out of all of the
   * descendants of the original node that the cursor was constructed with.
   */
  get currentDescendantIndex() {
    marshalTreeCursor(this);
    return C._ts_tree_cursor_current_descendant_index_wasm(this.tree[0]);
  }
  /** Get the type of the cursor's current node. */
  get nodeType() {
    return this.tree.language.types[this.nodeTypeId] || "ERROR";
  }
  /** Get the type id of the cursor's current node. */
  get nodeTypeId() {
    marshalTreeCursor(this);
    return C._ts_tree_cursor_current_node_type_id_wasm(this.tree[0]);
  }
  /** Get the state id of the cursor's current node. */
  get nodeStateId() {
    marshalTreeCursor(this);
    return C._ts_tree_cursor_current_node_state_id_wasm(this.tree[0]);
  }
  /** Get the id of the cursor's current node. */
  get nodeId() {
    marshalTreeCursor(this);
    return C._ts_tree_cursor_current_node_id_wasm(this.tree[0]);
  }
  /**
   * Check if the cursor's current node is *named*.
   *
   * Named nodes correspond to named rules in the grammar, whereas
   * *anonymous* nodes correspond to string literals in the grammar.
   */
  get nodeIsNamed() {
    marshalTreeCursor(this);
    return C._ts_tree_cursor_current_node_is_named_wasm(this.tree[0]) === 1;
  }
  /**
   * Check if the cursor's current node is *missing*.
   *
   * Missing nodes are inserted by the parser in order to recover from
   * certain kinds of syntax errors.
   */
  get nodeIsMissing() {
    marshalTreeCursor(this);
    return C._ts_tree_cursor_current_node_is_missing_wasm(this.tree[0]) === 1;
  }
  /** Get the string content of the cursor's current node. */
  get nodeText() {
    marshalTreeCursor(this);
    const startIndex = C._ts_tree_cursor_start_index_wasm(this.tree[0]);
    const endIndex = C._ts_tree_cursor_end_index_wasm(this.tree[0]);
    C._ts_tree_cursor_start_position_wasm(this.tree[0]);
    const startPosition = unmarshalPoint(TRANSFER_BUFFER);
    return getText(this.tree, startIndex, endIndex, startPosition);
  }
  /** Get the start position of the cursor's current node. */
  get startPosition() {
    marshalTreeCursor(this);
    C._ts_tree_cursor_start_position_wasm(this.tree[0]);
    return unmarshalPoint(TRANSFER_BUFFER);
  }
  /** Get the end position of the cursor's current node. */
  get endPosition() {
    marshalTreeCursor(this);
    C._ts_tree_cursor_end_position_wasm(this.tree[0]);
    return unmarshalPoint(TRANSFER_BUFFER);
  }
  /** Get the start index of the cursor's current node. */
  get startIndex() {
    marshalTreeCursor(this);
    return C._ts_tree_cursor_start_index_wasm(this.tree[0]);
  }
  /** Get the end index of the cursor's current node. */
  get endIndex() {
    marshalTreeCursor(this);
    return C._ts_tree_cursor_end_index_wasm(this.tree[0]);
  }
  /**
   * Move this cursor to the first child of its current node.
   *
   * This returns `true` if the cursor successfully moved, and returns
   * `false` if there were no children.
   */
  gotoFirstChild() {
    marshalTreeCursor(this);
    const result = C._ts_tree_cursor_goto_first_child_wasm(this.tree[0]);
    unmarshalTreeCursor(this);
    return result === 1;
  }
  /**
   * Move this cursor to the last child of its current node.
   *
   * This returns `true` if the cursor successfully moved, and returns
   * `false` if there were no children.
   *
   * Note that this function may be slower than
   * {@link TreeCursor#gotoFirstChild} because it needs to
   * iterate through all the children to compute the child's position.
   */
  gotoLastChild() {
    marshalTreeCursor(this);
    const result = C._ts_tree_cursor_goto_last_child_wasm(this.tree[0]);
    unmarshalTreeCursor(this);
    return result === 1;
  }
  /**
   * Move this cursor to the parent of its current node.
   *
   * This returns `true` if the cursor successfully moved, and returns
   * `false` if there was no parent node (the cursor was already on the
   * root node).
   *
   * Note that the node the cursor was constructed with is considered the root
   * of the cursor, and the cursor cannot walk outside this node.
   */
  gotoParent() {
    marshalTreeCursor(this);
    const result = C._ts_tree_cursor_goto_parent_wasm(this.tree[0]);
    unmarshalTreeCursor(this);
    return result === 1;
  }
  /**
   * Move this cursor to the next sibling of its current node.
   *
   * This returns `true` if the cursor successfully moved, and returns
   * `false` if there was no next sibling node.
   *
   * Note that the node the cursor was constructed with is considered the root
   * of the cursor, and the cursor cannot walk outside this node.
   */
  gotoNextSibling() {
    marshalTreeCursor(this);
    const result = C._ts_tree_cursor_goto_next_sibling_wasm(this.tree[0]);
    unmarshalTreeCursor(this);
    return result === 1;
  }
  /**
   * Move this cursor to the previous sibling of its current node.
   *
   * This returns `true` if the cursor successfully moved, and returns
   * `false` if there was no previous sibling node.
   *
   * Note that this function may be slower than
   * {@link TreeCursor#gotoNextSibling} due to how node
   * positions are stored. In the worst case, this will need to iterate
   * through all the children up to the previous sibling node to recalculate
   * its position. Also note that the node the cursor was constructed with is
   * considered the root of the cursor, and the cursor cannot walk outside this node.
   */
  gotoPreviousSibling() {
    marshalTreeCursor(this);
    const result = C._ts_tree_cursor_goto_previous_sibling_wasm(this.tree[0]);
    unmarshalTreeCursor(this);
    return result === 1;
  }
  /**
   * Move the cursor to the node that is the nth descendant of
   * the original node that the cursor was constructed with, where
   * zero represents the original node itself.
   */
  gotoDescendant(goalDescendantIndex) {
    marshalTreeCursor(this);
    C._ts_tree_cursor_goto_descendant_wasm(this.tree[0], goalDescendantIndex);
    unmarshalTreeCursor(this);
  }
  /**
   * Move this cursor to the first child of its current node that contains or
   * starts after the given byte offset.
   *
   * This returns `true` if the cursor successfully moved to a child node, and returns
   * `false` if no such child was found.
   */
  gotoFirstChildForIndex(goalIndex) {
    marshalTreeCursor(this);
    C.setValue(TRANSFER_BUFFER + SIZE_OF_CURSOR, goalIndex, "i32");
    const result = C._ts_tree_cursor_goto_first_child_for_index_wasm(this.tree[0]);
    unmarshalTreeCursor(this);
    return result === 1;
  }
  /**
   * Move this cursor to the first child of its current node that contains or
   * starts after the given byte offset.
   *
   * This returns the index of the child node if one was found, and returns
   * `null` if no such child was found.
   */
  gotoFirstChildForPosition(goalPosition) {
    marshalTreeCursor(this);
    marshalPoint(TRANSFER_BUFFER + SIZE_OF_CURSOR, goalPosition);
    const result = C._ts_tree_cursor_goto_first_child_for_position_wasm(this.tree[0]);
    unmarshalTreeCursor(this);
    return result === 1;
  }
  /**
   * Re-initialize this tree cursor to start at the original node that the
   * cursor was constructed with.
   */
  reset(node) {
    marshalNode(node);
    marshalTreeCursor(this, TRANSFER_BUFFER + SIZE_OF_NODE);
    C._ts_tree_cursor_reset_wasm(this.tree[0]);
    unmarshalTreeCursor(this);
  }
  /**
   * Re-initialize a tree cursor to the same position as another cursor.
   *
   * Unlike {@link TreeCursor#reset}, this will not lose parent
   * information and allows reusing already created cursors.
   */
  resetTo(cursor) {
    marshalTreeCursor(this, TRANSFER_BUFFER);
    marshalTreeCursor(cursor, TRANSFER_BUFFER + SIZE_OF_CURSOR);
    C._ts_tree_cursor_reset_to_wasm(this.tree[0], cursor.tree[0]);
    unmarshalTreeCursor(this);
  }
};
var Node = class {
  static {
    __name(this, "Node");
  }
  /** @internal */
  // @ts-expect-error: never read
  [0] = 0;
  // Internal handle for Wasm
  /** @internal */
  _children;
  /** @internal */
  _namedChildren;
  /** @internal */
  constructor(internal, {
    id,
    tree,
    startIndex,
    startPosition,
    other
  }) {
    assertInternal(internal);
    this[0] = other;
    this.id = id;
    this.tree = tree;
    this.startIndex = startIndex;
    this.startPosition = startPosition;
  }
  /**
   * The numeric id for this node that is unique.
   *
   * Within a given syntax tree, no two nodes have the same id. However:
   *
   * * If a new tree is created based on an older tree, and a node from the old tree is reused in
   *   the process, then that node will have the same id in both trees.
   *
   * * A node not marked as having changes does not guarantee it was reused.
   *
   * * If a node is marked as having changed in the old tree, it will not be reused.
   */
  id;
  /** The byte index where this node starts. */
  startIndex;
  /** The position where this node starts. */
  startPosition;
  /** The tree that this node belongs to. */
  tree;
  /** Get this node's type as a numerical id. */
  get typeId() {
    marshalNode(this);
    return C._ts_node_symbol_wasm(this.tree[0]);
  }
  /**
   * Get the node's type as a numerical id as it appears in the grammar,
   * ignoring aliases.
   */
  get grammarId() {
    marshalNode(this);
    return C._ts_node_grammar_symbol_wasm(this.tree[0]);
  }
  /** Get this node's type as a string. */
  get type() {
    return this.tree.language.types[this.typeId] || "ERROR";
  }
  /**
   * Get this node's symbol name as it appears in the grammar, ignoring
   * aliases as a string.
   */
  get grammarType() {
    return this.tree.language.types[this.grammarId] || "ERROR";
  }
  /**
   * Check if this node is *named*.
   *
   * Named nodes correspond to named rules in the grammar, whereas
   * *anonymous* nodes correspond to string literals in the grammar.
   */
  get isNamed() {
    marshalNode(this);
    return C._ts_node_is_named_wasm(this.tree[0]) === 1;
  }
  /**
   * Check if this node is *extra*.
   *
   * Extra nodes represent things like comments, which are not required
   * by the grammar, but can appear anywhere.
   */
  get isExtra() {
    marshalNode(this);
    return C._ts_node_is_extra_wasm(this.tree[0]) === 1;
  }
  /**
   * Check if this node represents a syntax error.
   *
   * Syntax errors represent parts of the code that could not be incorporated
   * into a valid syntax tree.
   */
  get isError() {
    marshalNode(this);
    return C._ts_node_is_error_wasm(this.tree[0]) === 1;
  }
  /**
   * Check if this node is *missing*.
   *
   * Missing nodes are inserted by the parser in order to recover from
   * certain kinds of syntax errors.
   */
  get isMissing() {
    marshalNode(this);
    return C._ts_node_is_missing_wasm(this.tree[0]) === 1;
  }
  /** Check if this node has been edited. */
  get hasChanges() {
    marshalNode(this);
    return C._ts_node_has_changes_wasm(this.tree[0]) === 1;
  }
  /**
   * Check if this node represents a syntax error or contains any syntax
   * errors anywhere within it.
   */
  get hasError() {
    marshalNode(this);
    return C._ts_node_has_error_wasm(this.tree[0]) === 1;
  }
  /** Get the byte index where this node ends. */
  get endIndex() {
    marshalNode(this);
    return C._ts_node_end_index_wasm(this.tree[0]);
  }
  /** Get the position where this node ends. */
  get endPosition() {
    marshalNode(this);
    C._ts_node_end_point_wasm(this.tree[0]);
    return unmarshalPoint(TRANSFER_BUFFER);
  }
  /** Get the string content of this node. */
  get text() {
    return getText(this.tree, this.startIndex, this.endIndex, this.startPosition);
  }
  /** Get this node's parse state. */
  get parseState() {
    marshalNode(this);
    return C._ts_node_parse_state_wasm(this.tree[0]);
  }
  /** Get the parse state after this node. */
  get nextParseState() {
    marshalNode(this);
    return C._ts_node_next_parse_state_wasm(this.tree[0]);
  }
  /** Check if this node is equal to another node. */
  equals(other) {
    return this.tree === other.tree && this.id === other.id;
  }
  /**
   * Get the node's child at the given index, where zero represents the first child.
   *
   * This method is fairly fast, but its cost is technically log(n), so if
   * you might be iterating over a long list of children, you should use
   * {@link Node#children} instead.
   */
  child(index) {
    marshalNode(this);
    C._ts_node_child_wasm(this.tree[0], index);
    return unmarshalNode(this.tree);
  }
  /**
   * Get this node's *named* child at the given index.
   *
   * See also {@link Node#isNamed}.
   * This method is fairly fast, but its cost is technically log(n), so if
   * you might be iterating over a long list of children, you should use
   * {@link Node#namedChildren} instead.
   */
  namedChild(index) {
    marshalNode(this);
    C._ts_node_named_child_wasm(this.tree[0], index);
    return unmarshalNode(this.tree);
  }
  /**
   * Get this node's child with the given numerical field id.
   *
   * See also {@link Node#childForFieldName}. You can
   * convert a field name to an id using {@link Language#fieldIdForName}.
   */
  childForFieldId(fieldId) {
    marshalNode(this);
    C._ts_node_child_by_field_id_wasm(this.tree[0], fieldId);
    return unmarshalNode(this.tree);
  }
  /**
   * Get the first child with the given field name.
   *
   * If multiple children may have the same field name, access them using
   * {@link Node#childrenForFieldName}.
   */
  childForFieldName(fieldName) {
    const fieldId = this.tree.language.fields.indexOf(fieldName);
    if (fieldId !== -1) return this.childForFieldId(fieldId);
    return null;
  }
  /** Get the field name of this node's child at the given index. */
  fieldNameForChild(index) {
    marshalNode(this);
    const address = C._ts_node_field_name_for_child_wasm(this.tree[0], index);
    if (!address) return null;
    return C.AsciiToString(address);
  }
  /** Get the field name of this node's named child at the given index. */
  fieldNameForNamedChild(index) {
    marshalNode(this);
    const address = C._ts_node_field_name_for_named_child_wasm(this.tree[0], index);
    if (!address) return null;
    return C.AsciiToString(address);
  }
  /**
   * Get an array of this node's children with a given field name.
   *
   * See also {@link Node#children}.
   */
  childrenForFieldName(fieldName) {
    const fieldId = this.tree.language.fields.indexOf(fieldName);
    if (fieldId !== -1 && fieldId !== 0) return this.childrenForFieldId(fieldId);
    return [];
  }
  /**
    * Get an array of this node's children with a given field id.
    *
    * See also {@link Node#childrenForFieldName}.
    */
  childrenForFieldId(fieldId) {
    marshalNode(this);
    C._ts_node_children_by_field_id_wasm(this.tree[0], fieldId);
    const count = C.getValue(TRANSFER_BUFFER, "i32");
    const buffer = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
    const result = new Array(count);
    if (count > 0) {
      let address = buffer;
      for (let i2 = 0; i2 < count; i2++) {
        result[i2] = unmarshalNode(this.tree, address);
        address += SIZE_OF_NODE;
      }
      C._free(buffer);
    }
    return result;
  }
  /** Get the node's first child that contains or starts after the given byte offset. */
  firstChildForIndex(index) {
    marshalNode(this);
    const address = TRANSFER_BUFFER + SIZE_OF_NODE;
    C.setValue(address, index, "i32");
    C._ts_node_first_child_for_byte_wasm(this.tree[0]);
    return unmarshalNode(this.tree);
  }
  /** Get the node's first named child that contains or starts after the given byte offset. */
  firstNamedChildForIndex(index) {
    marshalNode(this);
    const address = TRANSFER_BUFFER + SIZE_OF_NODE;
    C.setValue(address, index, "i32");
    C._ts_node_first_named_child_for_byte_wasm(this.tree[0]);
    return unmarshalNode(this.tree);
  }
  /** Get this node's number of children. */
  get childCount() {
    marshalNode(this);
    return C._ts_node_child_count_wasm(this.tree[0]);
  }
  /**
   * Get this node's number of *named* children.
   *
   * See also {@link Node#isNamed}.
   */
  get namedChildCount() {
    marshalNode(this);
    return C._ts_node_named_child_count_wasm(this.tree[0]);
  }
  /** Get this node's first child. */
  get firstChild() {
    return this.child(0);
  }
  /**
   * Get this node's first named child.
   *
   * See also {@link Node#isNamed}.
   */
  get firstNamedChild() {
    return this.namedChild(0);
  }
  /** Get this node's last child. */
  get lastChild() {
    return this.child(this.childCount - 1);
  }
  /**
   * Get this node's last named child.
   *
   * See also {@link Node#isNamed}.
   */
  get lastNamedChild() {
    return this.namedChild(this.namedChildCount - 1);
  }
  /**
   * Iterate over this node's children.
   *
   * If you're walking the tree recursively, you may want to use the
   * {@link TreeCursor} APIs directly instead.
   */
  get children() {
    if (!this._children) {
      marshalNode(this);
      C._ts_node_children_wasm(this.tree[0]);
      const count = C.getValue(TRANSFER_BUFFER, "i32");
      const buffer = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
      this._children = new Array(count);
      if (count > 0) {
        let address = buffer;
        for (let i2 = 0; i2 < count; i2++) {
          this._children[i2] = unmarshalNode(this.tree, address);
          address += SIZE_OF_NODE;
        }
        C._free(buffer);
      }
    }
    return this._children;
  }
  /**
   * Iterate over this node's named children.
   *
   * See also {@link Node#children}.
   */
  get namedChildren() {
    if (!this._namedChildren) {
      marshalNode(this);
      C._ts_node_named_children_wasm(this.tree[0]);
      const count = C.getValue(TRANSFER_BUFFER, "i32");
      const buffer = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
      this._namedChildren = new Array(count);
      if (count > 0) {
        let address = buffer;
        for (let i2 = 0; i2 < count; i2++) {
          this._namedChildren[i2] = unmarshalNode(this.tree, address);
          address += SIZE_OF_NODE;
        }
        C._free(buffer);
      }
    }
    return this._namedChildren;
  }
  /**
   * Get the descendants of this node that are the given type, or in the given types array.
   *
   * The types array should contain node type strings, which can be retrieved from {@link Language#types}.
   *
   * Additionally, a `startPosition` and `endPosition` can be passed in to restrict the search to a byte range.
   */
  descendantsOfType(types, startPosition = ZERO_POINT, endPosition = ZERO_POINT) {
    if (!Array.isArray(types)) types = [types];
    const symbols = [];
    const typesBySymbol = this.tree.language.types;
    for (const node_type of types) {
      if (node_type == "ERROR") {
        symbols.push(65535);
      }
    }
    for (let i2 = 0, n = typesBySymbol.length; i2 < n; i2++) {
      if (types.includes(typesBySymbol[i2])) {
        symbols.push(i2);
      }
    }
    const symbolsAddress = C._malloc(SIZE_OF_INT * symbols.length);
    for (let i2 = 0, n = symbols.length; i2 < n; i2++) {
      C.setValue(symbolsAddress + i2 * SIZE_OF_INT, symbols[i2], "i32");
    }
    marshalNode(this);
    C._ts_node_descendants_of_type_wasm(
      this.tree[0],
      symbolsAddress,
      symbols.length,
      startPosition.row,
      startPosition.column,
      endPosition.row,
      endPosition.column
    );
    const descendantCount = C.getValue(TRANSFER_BUFFER, "i32");
    const descendantAddress = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
    const result = new Array(descendantCount);
    if (descendantCount > 0) {
      let address = descendantAddress;
      for (let i2 = 0; i2 < descendantCount; i2++) {
        result[i2] = unmarshalNode(this.tree, address);
        address += SIZE_OF_NODE;
      }
    }
    C._free(descendantAddress);
    C._free(symbolsAddress);
    return result;
  }
  /** Get this node's next sibling. */
  get nextSibling() {
    marshalNode(this);
    C._ts_node_next_sibling_wasm(this.tree[0]);
    return unmarshalNode(this.tree);
  }
  /** Get this node's previous sibling. */
  get previousSibling() {
    marshalNode(this);
    C._ts_node_prev_sibling_wasm(this.tree[0]);
    return unmarshalNode(this.tree);
  }
  /**
   * Get this node's next *named* sibling.
   *
   * See also {@link Node#isNamed}.
   */
  get nextNamedSibling() {
    marshalNode(this);
    C._ts_node_next_named_sibling_wasm(this.tree[0]);
    return unmarshalNode(this.tree);
  }
  /**
   * Get this node's previous *named* sibling.
   *
   * See also {@link Node#isNamed}.
   */
  get previousNamedSibling() {
    marshalNode(this);
    C._ts_node_prev_named_sibling_wasm(this.tree[0]);
    return unmarshalNode(this.tree);
  }
  /** Get the node's number of descendants, including one for the node itself. */
  get descendantCount() {
    marshalNode(this);
    return C._ts_node_descendant_count_wasm(this.tree[0]);
  }
  /**
   * Get this node's immediate parent.
   * Prefer {@link Node#childWithDescendant} for iterating over this node's ancestors.
   */
  get parent() {
    marshalNode(this);
    C._ts_node_parent_wasm(this.tree[0]);
    return unmarshalNode(this.tree);
  }
  /**
   * Get the node that contains `descendant`.
   *
   * Note that this can return `descendant` itself.
   */
  childWithDescendant(descendant) {
    marshalNode(this);
    marshalNode(descendant, 1);
    C._ts_node_child_with_descendant_wasm(this.tree[0]);
    return unmarshalNode(this.tree);
  }
  /** Get the smallest node within this node that spans the given byte range. */
  descendantForIndex(start2, end = start2) {
    if (typeof start2 !== "number" || typeof end !== "number") {
      throw new Error("Arguments must be numbers");
    }
    marshalNode(this);
    const address = TRANSFER_BUFFER + SIZE_OF_NODE;
    C.setValue(address, start2, "i32");
    C.setValue(address + SIZE_OF_INT, end, "i32");
    C._ts_node_descendant_for_index_wasm(this.tree[0]);
    return unmarshalNode(this.tree);
  }
  /** Get the smallest named node within this node that spans the given byte range. */
  namedDescendantForIndex(start2, end = start2) {
    if (typeof start2 !== "number" || typeof end !== "number") {
      throw new Error("Arguments must be numbers");
    }
    marshalNode(this);
    const address = TRANSFER_BUFFER + SIZE_OF_NODE;
    C.setValue(address, start2, "i32");
    C.setValue(address + SIZE_OF_INT, end, "i32");
    C._ts_node_named_descendant_for_index_wasm(this.tree[0]);
    return unmarshalNode(this.tree);
  }
  /** Get the smallest node within this node that spans the given point range. */
  descendantForPosition(start2, end = start2) {
    if (!isPoint(start2) || !isPoint(end)) {
      throw new Error("Arguments must be {row, column} objects");
    }
    marshalNode(this);
    const address = TRANSFER_BUFFER + SIZE_OF_NODE;
    marshalPoint(address, start2);
    marshalPoint(address + SIZE_OF_POINT, end);
    C._ts_node_descendant_for_position_wasm(this.tree[0]);
    return unmarshalNode(this.tree);
  }
  /** Get the smallest named node within this node that spans the given point range. */
  namedDescendantForPosition(start2, end = start2) {
    if (!isPoint(start2) || !isPoint(end)) {
      throw new Error("Arguments must be {row, column} objects");
    }
    marshalNode(this);
    const address = TRANSFER_BUFFER + SIZE_OF_NODE;
    marshalPoint(address, start2);
    marshalPoint(address + SIZE_OF_POINT, end);
    C._ts_node_named_descendant_for_position_wasm(this.tree[0]);
    return unmarshalNode(this.tree);
  }
  /**
   * Create a new {@link TreeCursor} starting from this node.
   *
   * Note that the given node is considered the root of the cursor,
   * and the cursor cannot walk outside this node.
   */
  walk() {
    marshalNode(this);
    C._ts_tree_cursor_new_wasm(this.tree[0]);
    return new TreeCursor(INTERNAL, this.tree);
  }
  /**
   * Edit this node to keep it in-sync with source code that has been edited.
   *
   * This function is only rarely needed. When you edit a syntax tree with
   * the {@link Tree#edit} method, all of the nodes that you retrieve from
   * the tree afterward will already reflect the edit. You only need to
   * use {@link Node#edit} when you have a specific {@link Node} instance that
   * you want to keep and continue to use after an edit.
   */
  edit(edit) {
    if (this.startIndex >= edit.oldEndIndex) {
      this.startIndex = edit.newEndIndex + (this.startIndex - edit.oldEndIndex);
      let subbedPointRow;
      let subbedPointColumn;
      if (this.startPosition.row > edit.oldEndPosition.row) {
        subbedPointRow = this.startPosition.row - edit.oldEndPosition.row;
        subbedPointColumn = this.startPosition.column;
      } else {
        subbedPointRow = 0;
        subbedPointColumn = this.startPosition.column;
        if (this.startPosition.column >= edit.oldEndPosition.column) {
          subbedPointColumn = this.startPosition.column - edit.oldEndPosition.column;
        }
      }
      if (subbedPointRow > 0) {
        this.startPosition.row += subbedPointRow;
        this.startPosition.column = subbedPointColumn;
      } else {
        this.startPosition.column += subbedPointColumn;
      }
    } else if (this.startIndex > edit.startIndex) {
      this.startIndex = edit.newEndIndex;
      this.startPosition.row = edit.newEndPosition.row;
      this.startPosition.column = edit.newEndPosition.column;
    }
  }
  /** Get the S-expression representation of this node. */
  toString() {
    marshalNode(this);
    const address = C._ts_node_to_string_wasm(this.tree[0]);
    const result = C.AsciiToString(address);
    C._free(address);
    return result;
  }
};
function unmarshalCaptures(query, tree, address, patternIndex, result) {
  for (let i2 = 0, n = result.length; i2 < n; i2++) {
    const captureIndex = C.getValue(address, "i32");
    address += SIZE_OF_INT;
    const node = unmarshalNode(tree, address);
    address += SIZE_OF_NODE;
    result[i2] = { patternIndex, name: query.captureNames[captureIndex], node };
  }
  return address;
}
__name(unmarshalCaptures, "unmarshalCaptures");
function marshalNode(node, index = 0) {
  let address = TRANSFER_BUFFER + index * SIZE_OF_NODE;
  C.setValue(address, node.id, "i32");
  address += SIZE_OF_INT;
  C.setValue(address, node.startIndex, "i32");
  address += SIZE_OF_INT;
  C.setValue(address, node.startPosition.row, "i32");
  address += SIZE_OF_INT;
  C.setValue(address, node.startPosition.column, "i32");
  address += SIZE_OF_INT;
  C.setValue(address, node[0], "i32");
}
__name(marshalNode, "marshalNode");
function unmarshalNode(tree, address = TRANSFER_BUFFER) {
  const id = C.getValue(address, "i32");
  address += SIZE_OF_INT;
  if (id === 0) return null;
  const index = C.getValue(address, "i32");
  address += SIZE_OF_INT;
  const row = C.getValue(address, "i32");
  address += SIZE_OF_INT;
  const column = C.getValue(address, "i32");
  address += SIZE_OF_INT;
  const other = C.getValue(address, "i32");
  const result = new Node(INTERNAL, {
    id,
    tree,
    startIndex: index,
    startPosition: { row, column },
    other
  });
  return result;
}
__name(unmarshalNode, "unmarshalNode");
function marshalTreeCursor(cursor, address = TRANSFER_BUFFER) {
  C.setValue(address + 0 * SIZE_OF_INT, cursor[0], "i32");
  C.setValue(address + 1 * SIZE_OF_INT, cursor[1], "i32");
  C.setValue(address + 2 * SIZE_OF_INT, cursor[2], "i32");
  C.setValue(address + 3 * SIZE_OF_INT, cursor[3], "i32");
}
__name(marshalTreeCursor, "marshalTreeCursor");
function unmarshalTreeCursor(cursor) {
  cursor[0] = C.getValue(TRANSFER_BUFFER + 0 * SIZE_OF_INT, "i32");
  cursor[1] = C.getValue(TRANSFER_BUFFER + 1 * SIZE_OF_INT, "i32");
  cursor[2] = C.getValue(TRANSFER_BUFFER + 2 * SIZE_OF_INT, "i32");
  cursor[3] = C.getValue(TRANSFER_BUFFER + 3 * SIZE_OF_INT, "i32");
}
__name(unmarshalTreeCursor, "unmarshalTreeCursor");
function marshalPoint(address, point) {
  C.setValue(address, point.row, "i32");
  C.setValue(address + SIZE_OF_INT, point.column, "i32");
}
__name(marshalPoint, "marshalPoint");
function unmarshalPoint(address) {
  const result = {
    row: C.getValue(address, "i32") >>> 0,
    column: C.getValue(address + SIZE_OF_INT, "i32") >>> 0
  };
  return result;
}
__name(unmarshalPoint, "unmarshalPoint");
function marshalRange(address, range) {
  marshalPoint(address, range.startPosition);
  address += SIZE_OF_POINT;
  marshalPoint(address, range.endPosition);
  address += SIZE_OF_POINT;
  C.setValue(address, range.startIndex, "i32");
  address += SIZE_OF_INT;
  C.setValue(address, range.endIndex, "i32");
  address += SIZE_OF_INT;
}
__name(marshalRange, "marshalRange");
function unmarshalRange(address) {
  const result = {};
  result.startPosition = unmarshalPoint(address);
  address += SIZE_OF_POINT;
  result.endPosition = unmarshalPoint(address);
  address += SIZE_OF_POINT;
  result.startIndex = C.getValue(address, "i32") >>> 0;
  address += SIZE_OF_INT;
  result.endIndex = C.getValue(address, "i32") >>> 0;
  return result;
}
__name(unmarshalRange, "unmarshalRange");
function marshalEdit(edit, address = TRANSFER_BUFFER) {
  marshalPoint(address, edit.startPosition);
  address += SIZE_OF_POINT;
  marshalPoint(address, edit.oldEndPosition);
  address += SIZE_OF_POINT;
  marshalPoint(address, edit.newEndPosition);
  address += SIZE_OF_POINT;
  C.setValue(address, edit.startIndex, "i32");
  address += SIZE_OF_INT;
  C.setValue(address, edit.oldEndIndex, "i32");
  address += SIZE_OF_INT;
  C.setValue(address, edit.newEndIndex, "i32");
  address += SIZE_OF_INT;
}
__name(marshalEdit, "marshalEdit");
function unmarshalLanguageMetadata(address) {
  const major_version = C.getValue(address, "i32");
  const minor_version = C.getValue(address += SIZE_OF_INT, "i32");
  const patch_version = C.getValue(address += SIZE_OF_INT, "i32");
  return { major_version, minor_version, patch_version };
}
__name(unmarshalLanguageMetadata, "unmarshalLanguageMetadata");
var LANGUAGE_FUNCTION_REGEX = /^tree_sitter_\w+$/;
var Language = class _Language {
  static {
    __name(this, "Language");
  }
  /** @internal */
  [0] = 0;
  // Internal handle for Wasm
  /**
   * A list of all node types in the language. The index of each type in this
   * array is its node type id.
   */
  types;
  /**
   * A list of all field names in the language. The index of each field name in
   * this array is its field id.
   */
  fields;
  /** @internal */
  constructor(internal, address) {
    assertInternal(internal);
    this[0] = address;
    this.types = new Array(C._ts_language_symbol_count(this[0]));
    for (let i2 = 0, n = this.types.length; i2 < n; i2++) {
      if (C._ts_language_symbol_type(this[0], i2) < 2) {
        this.types[i2] = C.UTF8ToString(C._ts_language_symbol_name(this[0], i2));
      }
    }
    this.fields = new Array(C._ts_language_field_count(this[0]) + 1);
    for (let i2 = 0, n = this.fields.length; i2 < n; i2++) {
      const fieldName = C._ts_language_field_name_for_id(this[0], i2);
      if (fieldName !== 0) {
        this.fields[i2] = C.UTF8ToString(fieldName);
      } else {
        this.fields[i2] = null;
      }
    }
  }
  /**
   * Gets the name of the language.
   */
  get name() {
    const ptr = C._ts_language_name(this[0]);
    if (ptr === 0) return null;
    return C.UTF8ToString(ptr);
  }
  /**
   * Gets the ABI version of the language.
   */
  get abiVersion() {
    return C._ts_language_abi_version(this[0]);
  }
  /**
  * Get the metadata for this language. This information is generated by the
  * CLI, and relies on the language author providing the correct metadata in
  * the language's `tree-sitter.json` file.
  */
  get metadata() {
    C._ts_language_metadata_wasm(this[0]);
    const length = C.getValue(TRANSFER_BUFFER, "i32");
    if (length === 0) return null;
    return unmarshalLanguageMetadata(TRANSFER_BUFFER + SIZE_OF_INT);
  }
  /**
   * Gets the number of fields in the language.
   */
  get fieldCount() {
    return this.fields.length - 1;
  }
  /**
   * Gets the number of states in the language.
   */
  get stateCount() {
    return C._ts_language_state_count(this[0]);
  }
  /**
   * Get the field id for a field name.
   */
  fieldIdForName(fieldName) {
    const result = this.fields.indexOf(fieldName);
    return result !== -1 ? result : null;
  }
  /**
   * Get the field name for a field id.
   */
  fieldNameForId(fieldId) {
    return this.fields[fieldId] ?? null;
  }
  /**
   * Get the node type id for a node type name.
   */
  idForNodeType(type, named) {
    const typeLength = C.lengthBytesUTF8(type);
    const typeAddress = C._malloc(typeLength + 1);
    C.stringToUTF8(type, typeAddress, typeLength + 1);
    const result = C._ts_language_symbol_for_name(this[0], typeAddress, typeLength, named ? 1 : 0);
    C._free(typeAddress);
    return result || null;
  }
  /**
   * Gets the number of node types in the language.
   */
  get nodeTypeCount() {
    return C._ts_language_symbol_count(this[0]);
  }
  /**
   * Get the node type name for a node type id.
   */
  nodeTypeForId(typeId) {
    const name2 = C._ts_language_symbol_name(this[0], typeId);
    return name2 ? C.UTF8ToString(name2) : null;
  }
  /**
   * Check if a node type is named.
   *
   * @see {@link https://tree-sitter.github.io/tree-sitter/using-parsers/2-basic-parsing.html#named-vs-anonymous-nodes}
   */
  nodeTypeIsNamed(typeId) {
    return C._ts_language_type_is_named_wasm(this[0], typeId) ? true : false;
  }
  /**
   * Check if a node type is visible.
   */
  nodeTypeIsVisible(typeId) {
    return C._ts_language_type_is_visible_wasm(this[0], typeId) ? true : false;
  }
  /**
   * Get the supertypes ids of this language.
   *
   * @see {@link https://tree-sitter.github.io/tree-sitter/using-parsers/6-static-node-types.html?highlight=supertype#supertype-nodes}
   */
  get supertypes() {
    C._ts_language_supertypes_wasm(this[0]);
    const count = C.getValue(TRANSFER_BUFFER, "i32");
    const buffer = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
    const result = new Array(count);
    if (count > 0) {
      let address = buffer;
      for (let i2 = 0; i2 < count; i2++) {
        result[i2] = C.getValue(address, "i16");
        address += SIZE_OF_SHORT;
      }
    }
    return result;
  }
  /**
   * Get the subtype ids for a given supertype node id.
   */
  subtypes(supertype) {
    C._ts_language_subtypes_wasm(this[0], supertype);
    const count = C.getValue(TRANSFER_BUFFER, "i32");
    const buffer = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
    const result = new Array(count);
    if (count > 0) {
      let address = buffer;
      for (let i2 = 0; i2 < count; i2++) {
        result[i2] = C.getValue(address, "i16");
        address += SIZE_OF_SHORT;
      }
    }
    return result;
  }
  /**
   * Get the next state id for a given state id and node type id.
   */
  nextState(stateId, typeId) {
    return C._ts_language_next_state(this[0], stateId, typeId);
  }
  /**
   * Create a new lookahead iterator for this language and parse state.
   *
   * This returns `null` if state is invalid for this language.
   *
   * Iterating {@link LookaheadIterator} will yield valid symbols in the given
   * parse state. Newly created lookahead iterators will return the `ERROR`
   * symbol from {@link LookaheadIterator#currentType}.
   *
   * Lookahead iterators can be useful for generating suggestions and improving
   * syntax error diagnostics. To get symbols valid in an `ERROR` node, use the
   * lookahead iterator on its first leaf node state. For `MISSING` nodes, a
   * lookahead iterator created on the previous non-extra leaf node may be
   * appropriate.
   */
  lookaheadIterator(stateId) {
    const address = C._ts_lookahead_iterator_new(this[0], stateId);
    if (address) return new LookaheadIterator(INTERNAL, address, this);
    return null;
  }
  /**
   * Load a language from a WebAssembly module.
   * The module can be provided as a path to a file or as a buffer.
   */
  static async load(input) {
    let binary2;
    if (input instanceof Uint8Array) {
      binary2 = input;
    } else if (globalThis.process?.versions.node) {
      const fs22 = await import("fs/promises");
      binary2 = await fs22.readFile(input);
    } else {
      const response = await fetch(input);
      if (!response.ok) {
        const body2 = await response.text();
        throw new Error(`Language.load failed with status ${response.status}.

${body2}`);
      }
      const retryResp = response.clone();
      try {
        binary2 = await WebAssembly.compileStreaming(response);
      } catch (reason) {
        console.error("wasm streaming compile failed:", reason);
        console.error("falling back to ArrayBuffer instantiation");
        binary2 = new Uint8Array(await retryResp.arrayBuffer());
      }
    }
    const mod = await C.loadWebAssemblyModule(binary2, { loadAsync: true });
    const symbolNames = Object.keys(mod);
    const functionName = symbolNames.find((key) => LANGUAGE_FUNCTION_REGEX.test(key) && !key.includes("external_scanner_"));
    if (!functionName) {
      console.log(`Couldn't find language function in Wasm file. Symbols:
${JSON.stringify(symbolNames, null, 2)}`);
      throw new Error("Language.load failed: no language function found in Wasm file");
    }
    const languageAddress = mod[functionName]();
    return new _Language(INTERNAL, languageAddress);
  }
};
async function Module2(moduleArg = {}) {
  var moduleRtn;
  var Module = moduleArg;
  var ENVIRONMENT_IS_WEB = typeof window == "object";
  var ENVIRONMENT_IS_WORKER = typeof WorkerGlobalScope != "undefined";
  var ENVIRONMENT_IS_NODE = typeof process == "object" && process.versions?.node && process.type != "renderer";
  if (ENVIRONMENT_IS_NODE) {
    const { createRequire } = await import("module");
    var require = createRequire(importMetaUrl);
  }
  Module.currentQueryProgressCallback = null;
  Module.currentProgressCallback = null;
  Module.currentLogCallback = null;
  Module.currentParseCallback = null;
  var arguments_ = [];
  var thisProgram = "./this.program";
  var quit_ = /* @__PURE__ */ __name((status, toThrow) => {
    throw toThrow;
  }, "quit_");
  var _scriptName = importMetaUrl;
  var scriptDirectory = "";
  function locateFile(path15) {
    if (Module["locateFile"]) {
      return Module["locateFile"](path15, scriptDirectory);
    }
    return scriptDirectory + path15;
  }
  __name(locateFile, "locateFile");
  var readAsync, readBinary;
  if (ENVIRONMENT_IS_NODE) {
    var fs = require("fs");
    if (_scriptName.startsWith("file:")) {
      scriptDirectory = require("path").dirname(require("url").fileURLToPath(_scriptName)) + "/";
    }
    readBinary = /* @__PURE__ */ __name((filename) => {
      filename = isFileURI(filename) ? new URL(filename) : filename;
      var ret = fs.readFileSync(filename);
      return ret;
    }, "readBinary");
    readAsync = /* @__PURE__ */ __name(async (filename, binary2 = true) => {
      filename = isFileURI(filename) ? new URL(filename) : filename;
      var ret = fs.readFileSync(filename, binary2 ? void 0 : "utf8");
      return ret;
    }, "readAsync");
    if (process.argv.length > 1) {
      thisProgram = process.argv[1].replace(/\\/g, "/");
    }
    arguments_ = process.argv.slice(2);
    quit_ = /* @__PURE__ */ __name((status, toThrow) => {
      process.exitCode = status;
      throw toThrow;
    }, "quit_");
  } else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
    try {
      scriptDirectory = new URL(".", _scriptName).href;
    } catch {
    }
    {
      if (ENVIRONMENT_IS_WORKER) {
        readBinary = /* @__PURE__ */ __name((url) => {
          var xhr = new XMLHttpRequest();
          xhr.open("GET", url, false);
          xhr.responseType = "arraybuffer";
          xhr.send(null);
          return new Uint8Array(
            /** @type{!ArrayBuffer} */
            xhr.response
          );
        }, "readBinary");
      }
      readAsync = /* @__PURE__ */ __name(async (url) => {
        if (isFileURI(url)) {
          return new Promise((resolve, reject) => {
            var xhr = new XMLHttpRequest();
            xhr.open("GET", url, true);
            xhr.responseType = "arraybuffer";
            xhr.onload = () => {
              if (xhr.status == 200 || xhr.status == 0 && xhr.response) {
                resolve(xhr.response);
                return;
              }
              reject(xhr.status);
            };
            xhr.onerror = reject;
            xhr.send(null);
          });
        }
        var response = await fetch(url, {
          credentials: "same-origin"
        });
        if (response.ok) {
          return response.arrayBuffer();
        }
        throw new Error(response.status + " : " + response.url);
      }, "readAsync");
    }
  } else {
  }
  var out = console.log.bind(console);
  var err = console.error.bind(console);
  var dynamicLibraries = [];
  var wasmBinary;
  var ABORT = false;
  var EXITSTATUS;
  var isFileURI = /* @__PURE__ */ __name((filename) => filename.startsWith("file://"), "isFileURI");
  var readyPromiseResolve, readyPromiseReject;
  var wasmMemory;
  var HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;
  var HEAP64, HEAPU64;
  var HEAP_DATA_VIEW;
  var runtimeInitialized = false;
  function updateMemoryViews() {
    var b = wasmMemory.buffer;
    Module["HEAP8"] = HEAP8 = new Int8Array(b);
    Module["HEAP16"] = HEAP16 = new Int16Array(b);
    Module["HEAPU8"] = HEAPU8 = new Uint8Array(b);
    Module["HEAPU16"] = HEAPU16 = new Uint16Array(b);
    Module["HEAP32"] = HEAP32 = new Int32Array(b);
    Module["HEAPU32"] = HEAPU32 = new Uint32Array(b);
    Module["HEAPF32"] = HEAPF32 = new Float32Array(b);
    Module["HEAPF64"] = HEAPF64 = new Float64Array(b);
    Module["HEAP64"] = HEAP64 = new BigInt64Array(b);
    Module["HEAPU64"] = HEAPU64 = new BigUint64Array(b);
    Module["HEAP_DATA_VIEW"] = HEAP_DATA_VIEW = new DataView(b);
    LE_HEAP_UPDATE();
  }
  __name(updateMemoryViews, "updateMemoryViews");
  function initMemory() {
    if (Module["wasmMemory"]) {
      wasmMemory = Module["wasmMemory"];
    } else {
      var INITIAL_MEMORY = Module["INITIAL_MEMORY"] || 33554432;
      wasmMemory = new WebAssembly.Memory({
        "initial": INITIAL_MEMORY / 65536,
        // In theory we should not need to emit the maximum if we want "unlimited"
        // or 4GB of memory, but VMs error on that atm, see
        // https://github.com/emscripten-core/emscripten/issues/14130
        // And in the pthreads case we definitely need to emit a maximum. So
        // always emit one.
        "maximum": 32768
      });
    }
    updateMemoryViews();
  }
  __name(initMemory, "initMemory");
  var __RELOC_FUNCS__ = [];
  function preRun() {
    if (Module["preRun"]) {
      if (typeof Module["preRun"] == "function") Module["preRun"] = [Module["preRun"]];
      while (Module["preRun"].length) {
        addOnPreRun(Module["preRun"].shift());
      }
    }
    callRuntimeCallbacks(onPreRuns);
  }
  __name(preRun, "preRun");
  function initRuntime() {
    runtimeInitialized = true;
    callRuntimeCallbacks(__RELOC_FUNCS__);
    wasmExports["__wasm_call_ctors"]();
    callRuntimeCallbacks(onPostCtors);
  }
  __name(initRuntime, "initRuntime");
  function preMain() {
  }
  __name(preMain, "preMain");
  function postRun() {
    if (Module["postRun"]) {
      if (typeof Module["postRun"] == "function") Module["postRun"] = [Module["postRun"]];
      while (Module["postRun"].length) {
        addOnPostRun(Module["postRun"].shift());
      }
    }
    callRuntimeCallbacks(onPostRuns);
  }
  __name(postRun, "postRun");
  function abort(what) {
    Module["onAbort"]?.(what);
    what = "Aborted(" + what + ")";
    err(what);
    ABORT = true;
    what += ". Build with -sASSERTIONS for more info.";
    var e = new WebAssembly.RuntimeError(what);
    readyPromiseReject?.(e);
    throw e;
  }
  __name(abort, "abort");
  var wasmBinaryFile;
  function findWasmBinary() {
    if (Module["locateFile"]) {
      return locateFile("web-tree-sitter.wasm");
    }
    return new URL("web-tree-sitter.wasm", importMetaUrl).href;
  }
  __name(findWasmBinary, "findWasmBinary");
  function getBinarySync(file) {
    if (file == wasmBinaryFile && wasmBinary) {
      return new Uint8Array(wasmBinary);
    }
    if (readBinary) {
      return readBinary(file);
    }
    throw "both async and sync fetching of the wasm failed";
  }
  __name(getBinarySync, "getBinarySync");
  async function getWasmBinary(binaryFile) {
    if (!wasmBinary) {
      try {
        var response = await readAsync(binaryFile);
        return new Uint8Array(response);
      } catch {
      }
    }
    return getBinarySync(binaryFile);
  }
  __name(getWasmBinary, "getWasmBinary");
  async function instantiateArrayBuffer(binaryFile, imports) {
    try {
      var binary2 = await getWasmBinary(binaryFile);
      var instance2 = await WebAssembly.instantiate(binary2, imports);
      return instance2;
    } catch (reason) {
      err(`failed to asynchronously prepare wasm: ${reason}`);
      abort(reason);
    }
  }
  __name(instantiateArrayBuffer, "instantiateArrayBuffer");
  async function instantiateAsync(binary2, binaryFile, imports) {
    if (!binary2 && !isFileURI(binaryFile) && !ENVIRONMENT_IS_NODE) {
      try {
        var response = fetch(binaryFile, {
          credentials: "same-origin"
        });
        var instantiationResult = await WebAssembly.instantiateStreaming(response, imports);
        return instantiationResult;
      } catch (reason) {
        err(`wasm streaming compile failed: ${reason}`);
        err("falling back to ArrayBuffer instantiation");
      }
    }
    return instantiateArrayBuffer(binaryFile, imports);
  }
  __name(instantiateAsync, "instantiateAsync");
  function getWasmImports() {
    return {
      "env": wasmImports,
      "wasi_snapshot_preview1": wasmImports,
      "GOT.mem": new Proxy(wasmImports, GOTHandler),
      "GOT.func": new Proxy(wasmImports, GOTHandler)
    };
  }
  __name(getWasmImports, "getWasmImports");
  async function createWasm() {
    function receiveInstance(instance2, module2) {
      wasmExports = instance2.exports;
      wasmExports = relocateExports(wasmExports, 1024);
      var metadata2 = getDylinkMetadata(module2);
      if (metadata2.neededDynlibs) {
        dynamicLibraries = metadata2.neededDynlibs.concat(dynamicLibraries);
      }
      mergeLibSymbols(wasmExports, "main");
      LDSO.init();
      loadDylibs();
      __RELOC_FUNCS__.push(wasmExports["__wasm_apply_data_relocs"]);
      assignWasmExports(wasmExports);
      return wasmExports;
    }
    __name(receiveInstance, "receiveInstance");
    function receiveInstantiationResult(result2) {
      return receiveInstance(result2["instance"], result2["module"]);
    }
    __name(receiveInstantiationResult, "receiveInstantiationResult");
    var info2 = getWasmImports();
    if (Module["instantiateWasm"]) {
      return new Promise((resolve, reject) => {
        Module["instantiateWasm"](info2, (mod, inst) => {
          resolve(receiveInstance(mod, inst));
        });
      });
    }
    wasmBinaryFile ??= findWasmBinary();
    var result = await instantiateAsync(wasmBinary, wasmBinaryFile, info2);
    var exports2 = receiveInstantiationResult(result);
    return exports2;
  }
  __name(createWasm, "createWasm");
  class ExitStatus {
    static {
      __name(this, "ExitStatus");
    }
    name = "ExitStatus";
    constructor(status) {
      this.message = `Program terminated with exit(${status})`;
      this.status = status;
    }
  }
  var GOT = {};
  var currentModuleWeakSymbols = /* @__PURE__ */ new Set([]);
  var GOTHandler = {
    get(obj, symName) {
      var rtn = GOT[symName];
      if (!rtn) {
        rtn = GOT[symName] = new WebAssembly.Global({
          "value": "i32",
          "mutable": true
        });
      }
      if (!currentModuleWeakSymbols.has(symName)) {
        rtn.required = true;
      }
      return rtn;
    }
  };
  var LE_ATOMICS_NATIVE_BYTE_ORDER = [];
  var LE_HEAP_LOAD_F32 = /* @__PURE__ */ __name((byteOffset) => HEAP_DATA_VIEW.getFloat32(byteOffset, true), "LE_HEAP_LOAD_F32");
  var LE_HEAP_LOAD_F64 = /* @__PURE__ */ __name((byteOffset) => HEAP_DATA_VIEW.getFloat64(byteOffset, true), "LE_HEAP_LOAD_F64");
  var LE_HEAP_LOAD_I16 = /* @__PURE__ */ __name((byteOffset) => HEAP_DATA_VIEW.getInt16(byteOffset, true), "LE_HEAP_LOAD_I16");
  var LE_HEAP_LOAD_I32 = /* @__PURE__ */ __name((byteOffset) => HEAP_DATA_VIEW.getInt32(byteOffset, true), "LE_HEAP_LOAD_I32");
  var LE_HEAP_LOAD_I64 = /* @__PURE__ */ __name((byteOffset) => HEAP_DATA_VIEW.getBigInt64(byteOffset, true), "LE_HEAP_LOAD_I64");
  var LE_HEAP_LOAD_U32 = /* @__PURE__ */ __name((byteOffset) => HEAP_DATA_VIEW.getUint32(byteOffset, true), "LE_HEAP_LOAD_U32");
  var LE_HEAP_STORE_F32 = /* @__PURE__ */ __name((byteOffset, value) => HEAP_DATA_VIEW.setFloat32(byteOffset, value, true), "LE_HEAP_STORE_F32");
  var LE_HEAP_STORE_F64 = /* @__PURE__ */ __name((byteOffset, value) => HEAP_DATA_VIEW.setFloat64(byteOffset, value, true), "LE_HEAP_STORE_F64");
  var LE_HEAP_STORE_I16 = /* @__PURE__ */ __name((byteOffset, value) => HEAP_DATA_VIEW.setInt16(byteOffset, value, true), "LE_HEAP_STORE_I16");
  var LE_HEAP_STORE_I32 = /* @__PURE__ */ __name((byteOffset, value) => HEAP_DATA_VIEW.setInt32(byteOffset, value, true), "LE_HEAP_STORE_I32");
  var LE_HEAP_STORE_I64 = /* @__PURE__ */ __name((byteOffset, value) => HEAP_DATA_VIEW.setBigInt64(byteOffset, value, true), "LE_HEAP_STORE_I64");
  var LE_HEAP_STORE_U32 = /* @__PURE__ */ __name((byteOffset, value) => HEAP_DATA_VIEW.setUint32(byteOffset, value, true), "LE_HEAP_STORE_U32");
  var callRuntimeCallbacks = /* @__PURE__ */ __name((callbacks) => {
    while (callbacks.length > 0) {
      callbacks.shift()(Module);
    }
  }, "callRuntimeCallbacks");
  var onPostRuns = [];
  var addOnPostRun = /* @__PURE__ */ __name((cb) => onPostRuns.push(cb), "addOnPostRun");
  var onPreRuns = [];
  var addOnPreRun = /* @__PURE__ */ __name((cb) => onPreRuns.push(cb), "addOnPreRun");
  var UTF8Decoder = typeof TextDecoder != "undefined" ? new TextDecoder() : void 0;
  var findStringEnd = /* @__PURE__ */ __name((heapOrArray, idx, maxBytesToRead, ignoreNul) => {
    var maxIdx = idx + maxBytesToRead;
    if (ignoreNul) return maxIdx;
    while (heapOrArray[idx] && !(idx >= maxIdx)) ++idx;
    return idx;
  }, "findStringEnd");
  var UTF8ArrayToString = /* @__PURE__ */ __name((heapOrArray, idx = 0, maxBytesToRead, ignoreNul) => {
    var endPtr = findStringEnd(heapOrArray, idx, maxBytesToRead, ignoreNul);
    if (endPtr - idx > 16 && heapOrArray.buffer && UTF8Decoder) {
      return UTF8Decoder.decode(heapOrArray.subarray(idx, endPtr));
    }
    var str = "";
    while (idx < endPtr) {
      var u0 = heapOrArray[idx++];
      if (!(u0 & 128)) {
        str += String.fromCharCode(u0);
        continue;
      }
      var u1 = heapOrArray[idx++] & 63;
      if ((u0 & 224) == 192) {
        str += String.fromCharCode((u0 & 31) << 6 | u1);
        continue;
      }
      var u2 = heapOrArray[idx++] & 63;
      if ((u0 & 240) == 224) {
        u0 = (u0 & 15) << 12 | u1 << 6 | u2;
      } else {
        u0 = (u0 & 7) << 18 | u1 << 12 | u2 << 6 | heapOrArray[idx++] & 63;
      }
      if (u0 < 65536) {
        str += String.fromCharCode(u0);
      } else {
        var ch = u0 - 65536;
        str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023);
      }
    }
    return str;
  }, "UTF8ArrayToString");
  var getDylinkMetadata = /* @__PURE__ */ __name((binary2) => {
    var offset = 0;
    var end = 0;
    function getU8() {
      return binary2[offset++];
    }
    __name(getU8, "getU8");
    function getLEB() {
      var ret = 0;
      var mul = 1;
      while (1) {
        var byte = binary2[offset++];
        ret += (byte & 127) * mul;
        mul *= 128;
        if (!(byte & 128)) break;
      }
      return ret;
    }
    __name(getLEB, "getLEB");
    function getString() {
      var len = getLEB();
      offset += len;
      return UTF8ArrayToString(binary2, offset - len, len);
    }
    __name(getString, "getString");
    function getStringList() {
      var count2 = getLEB();
      var rtn = [];
      while (count2--) rtn.push(getString());
      return rtn;
    }
    __name(getStringList, "getStringList");
    function failIf(condition, message) {
      if (condition) throw new Error(message);
    }
    __name(failIf, "failIf");
    if (binary2 instanceof WebAssembly.Module) {
      var dylinkSection = WebAssembly.Module.customSections(binary2, "dylink.0");
      failIf(dylinkSection.length === 0, "need dylink section");
      binary2 = new Uint8Array(dylinkSection[0]);
      end = binary2.length;
    } else {
      var int32View = new Uint32Array(new Uint8Array(binary2.subarray(0, 24)).buffer);
      var magicNumberFound = int32View[0] == 1836278016 || int32View[0] == 6386541;
      failIf(!magicNumberFound, "need to see wasm magic number");
      failIf(binary2[8] !== 0, "need the dylink section to be first");
      offset = 9;
      var section_size = getLEB();
      end = offset + section_size;
      var name2 = getString();
      failIf(name2 !== "dylink.0");
    }
    var customSection = {
      neededDynlibs: [],
      tlsExports: /* @__PURE__ */ new Set(),
      weakImports: /* @__PURE__ */ new Set(),
      runtimePaths: []
    };
    var WASM_DYLINK_MEM_INFO = 1;
    var WASM_DYLINK_NEEDED = 2;
    var WASM_DYLINK_EXPORT_INFO = 3;
    var WASM_DYLINK_IMPORT_INFO = 4;
    var WASM_DYLINK_RUNTIME_PATH = 5;
    var WASM_SYMBOL_TLS = 256;
    var WASM_SYMBOL_BINDING_MASK = 3;
    var WASM_SYMBOL_BINDING_WEAK = 1;
    while (offset < end) {
      var subsectionType = getU8();
      var subsectionSize = getLEB();
      if (subsectionType === WASM_DYLINK_MEM_INFO) {
        customSection.memorySize = getLEB();
        customSection.memoryAlign = getLEB();
        customSection.tableSize = getLEB();
        customSection.tableAlign = getLEB();
      } else if (subsectionType === WASM_DYLINK_NEEDED) {
        customSection.neededDynlibs = getStringList();
      } else if (subsectionType === WASM_DYLINK_EXPORT_INFO) {
        var count = getLEB();
        while (count--) {
          var symname = getString();
          var flags2 = getLEB();
          if (flags2 & WASM_SYMBOL_TLS) {
            customSection.tlsExports.add(symname);
          }
        }
      } else if (subsectionType === WASM_DYLINK_IMPORT_INFO) {
        var count = getLEB();
        while (count--) {
          var modname = getString();
          var symname = getString();
          var flags2 = getLEB();
          if ((flags2 & WASM_SYMBOL_BINDING_MASK) == WASM_SYMBOL_BINDING_WEAK) {
            customSection.weakImports.add(symname);
          }
        }
      } else if (subsectionType === WASM_DYLINK_RUNTIME_PATH) {
        customSection.runtimePaths = getStringList();
      } else {
        offset += subsectionSize;
      }
    }
    return customSection;
  }, "getDylinkMetadata");
  function getValue(ptr, type = "i8") {
    if (type.endsWith("*")) type = "*";
    switch (type) {
      case "i1":
        return HEAP8[ptr];
      case "i8":
        return HEAP8[ptr];
      case "i16":
        return LE_HEAP_LOAD_I16((ptr >> 1) * 2);
      case "i32":
        return LE_HEAP_LOAD_I32((ptr >> 2) * 4);
      case "i64":
        return LE_HEAP_LOAD_I64((ptr >> 3) * 8);
      case "float":
        return LE_HEAP_LOAD_F32((ptr >> 2) * 4);
      case "double":
        return LE_HEAP_LOAD_F64((ptr >> 3) * 8);
      case "*":
        return LE_HEAP_LOAD_U32((ptr >> 2) * 4);
      default:
        abort(`invalid type for getValue: ${type}`);
    }
  }
  __name(getValue, "getValue");
  var newDSO = /* @__PURE__ */ __name((name2, handle2, syms) => {
    var dso = {
      refcount: Infinity,
      name: name2,
      exports: syms,
      global: true
    };
    LDSO.loadedLibsByName[name2] = dso;
    if (handle2 != void 0) {
      LDSO.loadedLibsByHandle[handle2] = dso;
    }
    return dso;
  }, "newDSO");
  var LDSO = {
    loadedLibsByName: {},
    loadedLibsByHandle: {},
    init() {
      newDSO("__main__", 0, wasmImports);
    }
  };
  var ___heap_base = 78240;
  var alignMemory = /* @__PURE__ */ __name((size, alignment) => Math.ceil(size / alignment) * alignment, "alignMemory");
  var getMemory = /* @__PURE__ */ __name((size) => {
    if (runtimeInitialized) {
      return _calloc(size, 1);
    }
    var ret = ___heap_base;
    var end = ret + alignMemory(size, 16);
    ___heap_base = end;
    GOT["__heap_base"].value = end;
    return ret;
  }, "getMemory");
  var isInternalSym = /* @__PURE__ */ __name((symName) => ["__cpp_exception", "__c_longjmp", "__wasm_apply_data_relocs", "__dso_handle", "__tls_size", "__tls_align", "__set_stack_limits", "_emscripten_tls_init", "__wasm_init_tls", "__wasm_call_ctors", "__start_em_asm", "__stop_em_asm", "__start_em_js", "__stop_em_js"].includes(symName) || symName.startsWith("__em_js__"), "isInternalSym");
  var uleb128EncodeWithLen = /* @__PURE__ */ __name((arr) => {
    const n = arr.length;
    return [n % 128 | 128, n >> 7, ...arr];
  }, "uleb128EncodeWithLen");
  var wasmTypeCodes = {
    "i": 127,
    // i32
    "p": 127,
    // i32
    "j": 126,
    // i64
    "f": 125,
    // f32
    "d": 124,
    // f64
    "e": 111
  };
  var generateTypePack = /* @__PURE__ */ __name((types) => uleb128EncodeWithLen(Array.from(types, (type) => {
    var code = wasmTypeCodes[type];
    return code;
  })), "generateTypePack");
  var convertJsFunctionToWasm = /* @__PURE__ */ __name((func2, sig) => {
    var bytes = Uint8Array.of(
      0,
      97,
      115,
      109,
      // magic ("\0asm")
      1,
      0,
      0,
      0,
      // version: 1
      1,
      ...uleb128EncodeWithLen([
        1,
        // count: 1
        96,
        // param types
        ...generateTypePack(sig.slice(1)),
        // return types (for now only supporting [] if `void` and single [T] otherwise)
        ...generateTypePack(sig[0] === "v" ? "" : sig[0])
      ]),
      // The rest of the module is static
      2,
      7,
      // import section
      // (import "e" "f" (func 0 (type 0)))
      1,
      1,
      101,
      1,
      102,
      0,
      0,
      7,
      5,
      // export section
      // (export "f" (func 0 (type 0)))
      1,
      1,
      102,
      0,
      0
    );
    var module2 = new WebAssembly.Module(bytes);
    var instance2 = new WebAssembly.Instance(module2, {
      "e": {
        "f": func2
      }
    });
    var wrappedFunc = instance2.exports["f"];
    return wrappedFunc;
  }, "convertJsFunctionToWasm");
  var wasmTableMirror = [];
  var wasmTable = new WebAssembly.Table({
    "initial": 31,
    "element": "anyfunc"
  });
  var getWasmTableEntry = /* @__PURE__ */ __name((funcPtr) => {
    var func2 = wasmTableMirror[funcPtr];
    if (!func2) {
      wasmTableMirror[funcPtr] = func2 = wasmTable.get(funcPtr);
    }
    return func2;
  }, "getWasmTableEntry");
  var updateTableMap = /* @__PURE__ */ __name((offset, count) => {
    if (functionsInTableMap) {
      for (var i2 = offset; i2 < offset + count; i2++) {
        var item = getWasmTableEntry(i2);
        if (item) {
          functionsInTableMap.set(item, i2);
        }
      }
    }
  }, "updateTableMap");
  var functionsInTableMap;
  var getFunctionAddress = /* @__PURE__ */ __name((func2) => {
    if (!functionsInTableMap) {
      functionsInTableMap = /* @__PURE__ */ new WeakMap();
      updateTableMap(0, wasmTable.length);
    }
    return functionsInTableMap.get(func2) || 0;
  }, "getFunctionAddress");
  var freeTableIndexes = [];
  var getEmptyTableSlot = /* @__PURE__ */ __name(() => {
    if (freeTableIndexes.length) {
      return freeTableIndexes.pop();
    }
    return wasmTable["grow"](1);
  }, "getEmptyTableSlot");
  var setWasmTableEntry = /* @__PURE__ */ __name((idx, func2) => {
    wasmTable.set(idx, func2);
    wasmTableMirror[idx] = wasmTable.get(idx);
  }, "setWasmTableEntry");
  var addFunction = /* @__PURE__ */ __name((func2, sig) => {
    var rtn = getFunctionAddress(func2);
    if (rtn) {
      return rtn;
    }
    var ret = getEmptyTableSlot();
    try {
      setWasmTableEntry(ret, func2);
    } catch (err2) {
      if (!(err2 instanceof TypeError)) {
        throw err2;
      }
      var wrapped = convertJsFunctionToWasm(func2, sig);
      setWasmTableEntry(ret, wrapped);
    }
    functionsInTableMap.set(func2, ret);
    return ret;
  }, "addFunction");
  var updateGOT = /* @__PURE__ */ __name((exports2, replace) => {
    for (var symName in exports2) {
      if (isInternalSym(symName)) {
        continue;
      }
      var value = exports2[symName];
      GOT[symName] ||= new WebAssembly.Global({
        "value": "i32",
        "mutable": true
      });
      if (replace || GOT[symName].value == 0) {
        if (typeof value == "function") {
          GOT[symName].value = addFunction(value);
        } else if (typeof value == "number") {
          GOT[symName].value = value;
        } else {
          err(`unhandled export type for '${symName}': ${typeof value}`);
        }
      }
    }
  }, "updateGOT");
  var relocateExports = /* @__PURE__ */ __name((exports2, memoryBase2, replace) => {
    var relocated = {};
    for (var e in exports2) {
      var value = exports2[e];
      if (typeof value == "object") {
        value = value.value;
      }
      if (typeof value == "number") {
        value += memoryBase2;
      }
      relocated[e] = value;
    }
    updateGOT(relocated, replace);
    return relocated;
  }, "relocateExports");
  var isSymbolDefined = /* @__PURE__ */ __name((symName) => {
    var existing = wasmImports[symName];
    if (!existing || existing.stub) {
      return false;
    }
    return true;
  }, "isSymbolDefined");
  var dynCall = /* @__PURE__ */ __name((sig, ptr, args2 = [], promising = false) => {
    var func2 = getWasmTableEntry(ptr);
    var rtn = func2(...args2);
    function convert(rtn2) {
      return rtn2;
    }
    __name(convert, "convert");
    return convert(rtn);
  }, "dynCall");
  var stackSave = /* @__PURE__ */ __name(() => _emscripten_stack_get_current(), "stackSave");
  var stackRestore = /* @__PURE__ */ __name((val) => __emscripten_stack_restore(val), "stackRestore");
  var createInvokeFunction = /* @__PURE__ */ __name((sig) => (ptr, ...args2) => {
    var sp = stackSave();
    try {
      return dynCall(sig, ptr, args2);
    } catch (e) {
      stackRestore(sp);
      if (e !== e + 0) throw e;
      _setThrew(1, 0);
      if (sig[0] == "j") return 0n;
    }
  }, "createInvokeFunction");
  var resolveGlobalSymbol = /* @__PURE__ */ __name((symName, direct = false) => {
    var sym;
    if (isSymbolDefined(symName)) {
      sym = wasmImports[symName];
    } else if (symName.startsWith("invoke_")) {
      sym = wasmImports[symName] = createInvokeFunction(symName.split("_")[1]);
    }
    return {
      sym,
      name: symName
    };
  }, "resolveGlobalSymbol");
  var onPostCtors = [];
  var addOnPostCtor = /* @__PURE__ */ __name((cb) => onPostCtors.push(cb), "addOnPostCtor");
  var UTF8ToString = /* @__PURE__ */ __name((ptr, maxBytesToRead, ignoreNul) => ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead, ignoreNul) : "", "UTF8ToString");
  var loadWebAssemblyModule = /* @__PURE__ */ __name((binary, flags, libName, localScope, handle) => {
    var metadata = getDylinkMetadata(binary);
    function loadModule() {
      var memAlign = Math.pow(2, metadata.memoryAlign);
      var memoryBase = metadata.memorySize ? alignMemory(getMemory(metadata.memorySize + memAlign), memAlign) : 0;
      var tableBase = metadata.tableSize ? wasmTable.length : 0;
      if (handle) {
        HEAP8[handle + 8] = 1;
        LE_HEAP_STORE_U32((handle + 12 >> 2) * 4, memoryBase);
        LE_HEAP_STORE_I32((handle + 16 >> 2) * 4, metadata.memorySize);
        LE_HEAP_STORE_U32((handle + 20 >> 2) * 4, tableBase);
        LE_HEAP_STORE_I32((handle + 24 >> 2) * 4, metadata.tableSize);
      }
      if (metadata.tableSize) {
        wasmTable.grow(metadata.tableSize);
      }
      var moduleExports;
      function resolveSymbol(sym) {
        var resolved = resolveGlobalSymbol(sym).sym;
        if (!resolved && localScope) {
          resolved = localScope[sym];
        }
        if (!resolved) {
          resolved = moduleExports[sym];
        }
        return resolved;
      }
      __name(resolveSymbol, "resolveSymbol");
      var proxyHandler = {
        get(stubs, prop) {
          switch (prop) {
            case "__memory_base":
              return memoryBase;
            case "__table_base":
              return tableBase;
          }
          if (prop in wasmImports && !wasmImports[prop].stub) {
            var res = wasmImports[prop];
            return res;
          }
          if (!(prop in stubs)) {
            var resolved;
            stubs[prop] = (...args2) => {
              resolved ||= resolveSymbol(prop);
              return resolved(...args2);
            };
          }
          return stubs[prop];
        }
      };
      var proxy = new Proxy({}, proxyHandler);
      currentModuleWeakSymbols = metadata.weakImports;
      var info = {
        "GOT.mem": new Proxy({}, GOTHandler),
        "GOT.func": new Proxy({}, GOTHandler),
        "env": proxy,
        "wasi_snapshot_preview1": proxy
      };
      function postInstantiation(module, instance) {
        updateTableMap(tableBase, metadata.tableSize);
        moduleExports = relocateExports(instance.exports, memoryBase);
        if (!flags.allowUndefined) {
          reportUndefinedSymbols();
        }
        function addEmAsm(addr, body) {
          var args = [];
          var arity = 0;
          for (; arity < 16; arity++) {
            if (body.indexOf("$" + arity) != -1) {
              args.push("$" + arity);
            } else {
              break;
            }
          }
          args = args.join(",");
          var func = `(${args}) => { ${body} };`;
          ASM_CONSTS[start] = eval(func);
        }
        __name(addEmAsm, "addEmAsm");
        if ("__start_em_asm" in moduleExports) {
          var start = moduleExports["__start_em_asm"];
          var stop = moduleExports["__stop_em_asm"];
          while (start < stop) {
            var jsString = UTF8ToString(start);
            addEmAsm(start, jsString);
            start = HEAPU8.indexOf(0, start) + 1;
          }
        }
        function addEmJs(name, cSig, body) {
          var jsArgs = [];
          cSig = cSig.slice(1, -1);
          if (cSig != "void") {
            cSig = cSig.split(",");
            for (var i in cSig) {
              var jsArg = cSig[i].split(" ").pop();
              jsArgs.push(jsArg.replace("*", ""));
            }
          }
          var func = `(${jsArgs}) => ${body};`;
          moduleExports[name] = eval(func);
        }
        __name(addEmJs, "addEmJs");
        for (var name in moduleExports) {
          if (name.startsWith("__em_js__")) {
            var start = moduleExports[name];
            var jsString = UTF8ToString(start);
            var parts = jsString.split("<::>");
            addEmJs(name.replace("__em_js__", ""), parts[0], parts[1]);
            delete moduleExports[name];
          }
        }
        var applyRelocs = moduleExports["__wasm_apply_data_relocs"];
        if (applyRelocs) {
          if (runtimeInitialized) {
            applyRelocs();
          } else {
            __RELOC_FUNCS__.push(applyRelocs);
          }
        }
        var init = moduleExports["__wasm_call_ctors"];
        if (init) {
          if (runtimeInitialized) {
            init();
          } else {
            addOnPostCtor(init);
          }
        }
        return moduleExports;
      }
      __name(postInstantiation, "postInstantiation");
      if (flags.loadAsync) {
        return (async () => {
          var instance2;
          if (binary instanceof WebAssembly.Module) {
            instance2 = new WebAssembly.Instance(binary, info);
          } else {
            ({ module: binary, instance: instance2 } = await WebAssembly.instantiate(binary, info));
          }
          return postInstantiation(binary, instance2);
        })();
      }
      var module = binary instanceof WebAssembly.Module ? binary : new WebAssembly.Module(binary);
      var instance = new WebAssembly.Instance(module, info);
      return postInstantiation(module, instance);
    }
    __name(loadModule, "loadModule");
    flags = {
      ...flags,
      rpath: {
        parentLibPath: libName,
        paths: metadata.runtimePaths
      }
    };
    if (flags.loadAsync) {
      return metadata.neededDynlibs.reduce((chain, dynNeeded) => chain.then(() => loadDynamicLibrary(dynNeeded, flags, localScope)), Promise.resolve()).then(loadModule);
    }
    metadata.neededDynlibs.forEach((needed) => loadDynamicLibrary(needed, flags, localScope));
    return loadModule();
  }, "loadWebAssemblyModule");
  var mergeLibSymbols = /* @__PURE__ */ __name((exports2, libName2) => {
    for (var [sym, exp] of Object.entries(exports2)) {
      const setImport = /* @__PURE__ */ __name((target) => {
        if (!isSymbolDefined(target)) {
          wasmImports[target] = exp;
        }
      }, "setImport");
      setImport(sym);
      const main_alias = "__main_argc_argv";
      if (sym == "main") {
        setImport(main_alias);
      }
      if (sym == main_alias) {
        setImport("main");
      }
    }
  }, "mergeLibSymbols");
  var asyncLoad = /* @__PURE__ */ __name(async (url) => {
    var arrayBuffer = await readAsync(url);
    return new Uint8Array(arrayBuffer);
  }, "asyncLoad");
  function loadDynamicLibrary(libName2, flags2 = {
    global: true,
    nodelete: true
  }, localScope2, handle2) {
    var dso = LDSO.loadedLibsByName[libName2];
    if (dso) {
      if (!flags2.global) {
        if (localScope2) {
          Object.assign(localScope2, dso.exports);
        }
      } else if (!dso.global) {
        dso.global = true;
        mergeLibSymbols(dso.exports, libName2);
      }
      if (flags2.nodelete && dso.refcount !== Infinity) {
        dso.refcount = Infinity;
      }
      dso.refcount++;
      if (handle2) {
        LDSO.loadedLibsByHandle[handle2] = dso;
      }
      return flags2.loadAsync ? Promise.resolve(true) : true;
    }
    dso = newDSO(libName2, handle2, "loading");
    dso.refcount = flags2.nodelete ? Infinity : 1;
    dso.global = flags2.global;
    function loadLibData() {
      if (handle2) {
        var data = LE_HEAP_LOAD_U32((handle2 + 28 >> 2) * 4);
        var dataSize = LE_HEAP_LOAD_U32((handle2 + 32 >> 2) * 4);
        if (data && dataSize) {
          var libData = HEAP8.slice(data, data + dataSize);
          return flags2.loadAsync ? Promise.resolve(libData) : libData;
        }
      }
      var libFile = locateFile(libName2);
      if (flags2.loadAsync) {
        return asyncLoad(libFile);
      }
      if (!readBinary) {
        throw new Error(`${libFile}: file not found, and synchronous loading of external files is not available`);
      }
      return readBinary(libFile);
    }
    __name(loadLibData, "loadLibData");
    function getExports() {
      if (flags2.loadAsync) {
        return loadLibData().then((libData) => loadWebAssemblyModule(libData, flags2, libName2, localScope2, handle2));
      }
      return loadWebAssemblyModule(loadLibData(), flags2, libName2, localScope2, handle2);
    }
    __name(getExports, "getExports");
    function moduleLoaded(exports2) {
      if (dso.global) {
        mergeLibSymbols(exports2, libName2);
      } else if (localScope2) {
        Object.assign(localScope2, exports2);
      }
      dso.exports = exports2;
    }
    __name(moduleLoaded, "moduleLoaded");
    if (flags2.loadAsync) {
      return getExports().then((exports2) => {
        moduleLoaded(exports2);
        return true;
      });
    }
    moduleLoaded(getExports());
    return true;
  }
  __name(loadDynamicLibrary, "loadDynamicLibrary");
  var reportUndefinedSymbols = /* @__PURE__ */ __name(() => {
    for (var [symName, entry] of Object.entries(GOT)) {
      if (entry.value == 0) {
        var value = resolveGlobalSymbol(symName, true).sym;
        if (!value && !entry.required) {
          continue;
        }
        if (typeof value == "function") {
          entry.value = addFunction(value, value.sig);
        } else if (typeof value == "number") {
          entry.value = value;
        } else {
          throw new Error(`bad export type for '${symName}': ${typeof value}`);
        }
      }
    }
  }, "reportUndefinedSymbols");
  var runDependencies = 0;
  var dependenciesFulfilled = null;
  var removeRunDependency = /* @__PURE__ */ __name((id) => {
    runDependencies--;
    Module["monitorRunDependencies"]?.(runDependencies);
    if (runDependencies == 0) {
      if (dependenciesFulfilled) {
        var callback = dependenciesFulfilled;
        dependenciesFulfilled = null;
        callback();
      }
    }
  }, "removeRunDependency");
  var addRunDependency = /* @__PURE__ */ __name((id) => {
    runDependencies++;
    Module["monitorRunDependencies"]?.(runDependencies);
  }, "addRunDependency");
  var loadDylibs = /* @__PURE__ */ __name(async () => {
    if (!dynamicLibraries.length) {
      reportUndefinedSymbols();
      return;
    }
    addRunDependency("loadDylibs");
    for (var lib of dynamicLibraries) {
      await loadDynamicLibrary(lib, {
        loadAsync: true,
        global: true,
        nodelete: true,
        allowUndefined: true
      });
    }
    reportUndefinedSymbols();
    removeRunDependency("loadDylibs");
  }, "loadDylibs");
  var noExitRuntime = true;
  function setValue(ptr, value, type = "i8") {
    if (type.endsWith("*")) type = "*";
    switch (type) {
      case "i1":
        HEAP8[ptr] = value;
        break;
      case "i8":
        HEAP8[ptr] = value;
        break;
      case "i16":
        LE_HEAP_STORE_I16((ptr >> 1) * 2, value);
        break;
      case "i32":
        LE_HEAP_STORE_I32((ptr >> 2) * 4, value);
        break;
      case "i64":
        LE_HEAP_STORE_I64((ptr >> 3) * 8, BigInt(value));
        break;
      case "float":
        LE_HEAP_STORE_F32((ptr >> 2) * 4, value);
        break;
      case "double":
        LE_HEAP_STORE_F64((ptr >> 3) * 8, value);
        break;
      case "*":
        LE_HEAP_STORE_U32((ptr >> 2) * 4, value);
        break;
      default:
        abort(`invalid type for setValue: ${type}`);
    }
  }
  __name(setValue, "setValue");
  var ___memory_base = new WebAssembly.Global({
    "value": "i32",
    "mutable": false
  }, 1024);
  var ___stack_high = 78240;
  var ___stack_low = 12704;
  var ___stack_pointer = new WebAssembly.Global({
    "value": "i32",
    "mutable": true
  }, 78240);
  var ___table_base = new WebAssembly.Global({
    "value": "i32",
    "mutable": false
  }, 1);
  var __abort_js = /* @__PURE__ */ __name(() => abort(""), "__abort_js");
  __abort_js.sig = "v";
  var getHeapMax = /* @__PURE__ */ __name(() => (
    // Stay one Wasm page short of 4GB: while e.g. Chrome is able to allocate
    // full 4GB Wasm memories, the size will wrap back to 0 bytes in Wasm side
    // for any code that deals with heap sizes, which would require special
    // casing all heap size related code to treat 0 specially.
    2147483648
  ), "getHeapMax");
  var growMemory = /* @__PURE__ */ __name((size) => {
    var oldHeapSize = wasmMemory.buffer.byteLength;
    var pages = (size - oldHeapSize + 65535) / 65536 | 0;
    try {
      wasmMemory.grow(pages);
      updateMemoryViews();
      return 1;
    } catch (e) {
    }
  }, "growMemory");
  var _emscripten_resize_heap = /* @__PURE__ */ __name((requestedSize) => {
    var oldSize = HEAPU8.length;
    requestedSize >>>= 0;
    var maxHeapSize = getHeapMax();
    if (requestedSize > maxHeapSize) {
      return false;
    }
    for (var cutDown = 1; cutDown <= 4; cutDown *= 2) {
      var overGrownHeapSize = oldSize * (1 + 0.2 / cutDown);
      overGrownHeapSize = Math.min(overGrownHeapSize, requestedSize + 100663296);
      var newSize = Math.min(maxHeapSize, alignMemory(Math.max(requestedSize, overGrownHeapSize), 65536));
      var replacement = growMemory(newSize);
      if (replacement) {
        return true;
      }
    }
    return false;
  }, "_emscripten_resize_heap");
  _emscripten_resize_heap.sig = "ip";
  var _fd_close = /* @__PURE__ */ __name((fd) => 52, "_fd_close");
  _fd_close.sig = "ii";
  var INT53_MAX = 9007199254740992;
  var INT53_MIN = -9007199254740992;
  var bigintToI53Checked = /* @__PURE__ */ __name((num) => num < INT53_MIN || num > INT53_MAX ? NaN : Number(num), "bigintToI53Checked");
  function _fd_seek(fd, offset, whence, newOffset) {
    offset = bigintToI53Checked(offset);
    return 70;
  }
  __name(_fd_seek, "_fd_seek");
  _fd_seek.sig = "iijip";
  var printCharBuffers = [null, [], []];
  var printChar = /* @__PURE__ */ __name((stream, curr) => {
    var buffer = printCharBuffers[stream];
    if (curr === 0 || curr === 10) {
      (stream === 1 ? out : err)(UTF8ArrayToString(buffer));
      buffer.length = 0;
    } else {
      buffer.push(curr);
    }
  }, "printChar");
  var _fd_write = /* @__PURE__ */ __name((fd, iov, iovcnt, pnum) => {
    var num = 0;
    for (var i2 = 0; i2 < iovcnt; i2++) {
      var ptr = LE_HEAP_LOAD_U32((iov >> 2) * 4);
      var len = LE_HEAP_LOAD_U32((iov + 4 >> 2) * 4);
      iov += 8;
      for (var j = 0; j < len; j++) {
        printChar(fd, HEAPU8[ptr + j]);
      }
      num += len;
    }
    LE_HEAP_STORE_U32((pnum >> 2) * 4, num);
    return 0;
  }, "_fd_write");
  _fd_write.sig = "iippp";
  function _tree_sitter_log_callback(isLexMessage, messageAddress) {
    if (Module.currentLogCallback) {
      const message = UTF8ToString(messageAddress);
      Module.currentLogCallback(message, isLexMessage !== 0);
    }
  }
  __name(_tree_sitter_log_callback, "_tree_sitter_log_callback");
  function _tree_sitter_parse_callback(inputBufferAddress, index, row, column, lengthAddress) {
    const INPUT_BUFFER_SIZE = 10 * 1024;
    const string = Module.currentParseCallback(index, {
      row,
      column
    });
    if (typeof string === "string") {
      setValue(lengthAddress, string.length, "i32");
      stringToUTF16(string, inputBufferAddress, INPUT_BUFFER_SIZE);
    } else {
      setValue(lengthAddress, 0, "i32");
    }
  }
  __name(_tree_sitter_parse_callback, "_tree_sitter_parse_callback");
  function _tree_sitter_progress_callback(currentOffset, hasError) {
    if (Module.currentProgressCallback) {
      return Module.currentProgressCallback({
        currentOffset,
        hasError
      });
    }
    return false;
  }
  __name(_tree_sitter_progress_callback, "_tree_sitter_progress_callback");
  function _tree_sitter_query_progress_callback(currentOffset) {
    if (Module.currentQueryProgressCallback) {
      return Module.currentQueryProgressCallback({
        currentOffset
      });
    }
    return false;
  }
  __name(_tree_sitter_query_progress_callback, "_tree_sitter_query_progress_callback");
  var runtimeKeepaliveCounter = 0;
  var keepRuntimeAlive = /* @__PURE__ */ __name(() => noExitRuntime || runtimeKeepaliveCounter > 0, "keepRuntimeAlive");
  var _proc_exit = /* @__PURE__ */ __name((code) => {
    EXITSTATUS = code;
    if (!keepRuntimeAlive()) {
      Module["onExit"]?.(code);
      ABORT = true;
    }
    quit_(code, new ExitStatus(code));
  }, "_proc_exit");
  _proc_exit.sig = "vi";
  var exitJS = /* @__PURE__ */ __name((status, implicit) => {
    EXITSTATUS = status;
    _proc_exit(status);
  }, "exitJS");
  var handleException = /* @__PURE__ */ __name((e) => {
    if (e instanceof ExitStatus || e == "unwind") {
      return EXITSTATUS;
    }
    quit_(1, e);
  }, "handleException");
  var lengthBytesUTF8 = /* @__PURE__ */ __name((str) => {
    var len = 0;
    for (var i2 = 0; i2 < str.length; ++i2) {
      var c = str.charCodeAt(i2);
      if (c <= 127) {
        len++;
      } else if (c <= 2047) {
        len += 2;
      } else if (c >= 55296 && c <= 57343) {
        len += 4;
        ++i2;
      } else {
        len += 3;
      }
    }
    return len;
  }, "lengthBytesUTF8");
  var stringToUTF8Array = /* @__PURE__ */ __name((str, heap, outIdx, maxBytesToWrite) => {
    if (!(maxBytesToWrite > 0)) return 0;
    var startIdx = outIdx;
    var endIdx = outIdx + maxBytesToWrite - 1;
    for (var i2 = 0; i2 < str.length; ++i2) {
      var u = str.codePointAt(i2);
      if (u <= 127) {
        if (outIdx >= endIdx) break;
        heap[outIdx++] = u;
      } else if (u <= 2047) {
        if (outIdx + 1 >= endIdx) break;
        heap[outIdx++] = 192 | u >> 6;
        heap[outIdx++] = 128 | u & 63;
      } else if (u <= 65535) {
        if (outIdx + 2 >= endIdx) break;
        heap[outIdx++] = 224 | u >> 12;
        heap[outIdx++] = 128 | u >> 6 & 63;
        heap[outIdx++] = 128 | u & 63;
      } else {
        if (outIdx + 3 >= endIdx) break;
        heap[outIdx++] = 240 | u >> 18;
        heap[outIdx++] = 128 | u >> 12 & 63;
        heap[outIdx++] = 128 | u >> 6 & 63;
        heap[outIdx++] = 128 | u & 63;
        i2++;
      }
    }
    heap[outIdx] = 0;
    return outIdx - startIdx;
  }, "stringToUTF8Array");
  var stringToUTF8 = /* @__PURE__ */ __name((str, outPtr, maxBytesToWrite) => stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite), "stringToUTF8");
  var stackAlloc = /* @__PURE__ */ __name((sz) => __emscripten_stack_alloc(sz), "stackAlloc");
  var stringToUTF8OnStack = /* @__PURE__ */ __name((str) => {
    var size = lengthBytesUTF8(str) + 1;
    var ret = stackAlloc(size);
    stringToUTF8(str, ret, size);
    return ret;
  }, "stringToUTF8OnStack");
  var AsciiToString = /* @__PURE__ */ __name((ptr) => {
    var str = "";
    while (1) {
      var ch = HEAPU8[ptr++];
      if (!ch) return str;
      str += String.fromCharCode(ch);
    }
  }, "AsciiToString");
  var stringToUTF16 = /* @__PURE__ */ __name((str, outPtr, maxBytesToWrite) => {
    maxBytesToWrite ??= 2147483647;
    if (maxBytesToWrite < 2) return 0;
    maxBytesToWrite -= 2;
    var startPtr = outPtr;
    var numCharsToWrite = maxBytesToWrite < str.length * 2 ? maxBytesToWrite / 2 : str.length;
    for (var i2 = 0; i2 < numCharsToWrite; ++i2) {
      var codeUnit = str.charCodeAt(i2);
      LE_HEAP_STORE_I16((outPtr >> 1) * 2, codeUnit);
      outPtr += 2;
    }
    LE_HEAP_STORE_I16((outPtr >> 1) * 2, 0);
    return outPtr - startPtr;
  }, "stringToUTF16");
  LE_ATOMICS_NATIVE_BYTE_ORDER = new Int8Array(new Int16Array([1]).buffer)[0] === 1 ? [
    /* little endian */
    ((x) => x),
    ((x) => x),
    void 0,
    ((x) => x)
  ] : [
    /* big endian */
    ((x) => x),
    ((x) => ((x & 65280) << 8 | (x & 255) << 24) >> 16),
    void 0,
    ((x) => x >> 24 & 255 | x >> 8 & 65280 | (x & 65280) << 8 | (x & 255) << 24)
  ];
  function LE_HEAP_UPDATE() {
    HEAPU16.unsigned = ((x) => x & 65535);
    HEAPU32.unsigned = ((x) => x >>> 0);
  }
  __name(LE_HEAP_UPDATE, "LE_HEAP_UPDATE");
  {
    initMemory();
    if (Module["noExitRuntime"]) noExitRuntime = Module["noExitRuntime"];
    if (Module["print"]) out = Module["print"];
    if (Module["printErr"]) err = Module["printErr"];
    if (Module["dynamicLibraries"]) dynamicLibraries = Module["dynamicLibraries"];
    if (Module["wasmBinary"]) wasmBinary = Module["wasmBinary"];
    if (Module["arguments"]) arguments_ = Module["arguments"];
    if (Module["thisProgram"]) thisProgram = Module["thisProgram"];
    if (Module["preInit"]) {
      if (typeof Module["preInit"] == "function") Module["preInit"] = [Module["preInit"]];
      while (Module["preInit"].length > 0) {
        Module["preInit"].shift()();
      }
    }
  }
  Module["setValue"] = setValue;
  Module["getValue"] = getValue;
  Module["UTF8ToString"] = UTF8ToString;
  Module["stringToUTF8"] = stringToUTF8;
  Module["lengthBytesUTF8"] = lengthBytesUTF8;
  Module["AsciiToString"] = AsciiToString;
  Module["stringToUTF16"] = stringToUTF16;
  Module["loadWebAssemblyModule"] = loadWebAssemblyModule;
  Module["LE_HEAP_STORE_I64"] = LE_HEAP_STORE_I64;
  var ASM_CONSTS = {};
  var _malloc, _calloc, _realloc, _free, _ts_range_edit, _memcmp, _ts_language_symbol_count, _ts_language_state_count, _ts_language_abi_version, _ts_language_name, _ts_language_field_count, _ts_language_next_state, _ts_language_symbol_name, _ts_language_symbol_for_name, _strncmp, _ts_language_symbol_type, _ts_language_field_name_for_id, _ts_lookahead_iterator_new, _ts_lookahead_iterator_delete, _ts_lookahead_iterator_reset_state, _ts_lookahead_iterator_reset, _ts_lookahead_iterator_next, _ts_lookahead_iterator_current_symbol, _ts_point_edit, _ts_parser_delete, _ts_parser_reset, _ts_parser_set_language, _ts_parser_set_included_ranges, _ts_query_new, _ts_query_delete, _iswspace, _iswalnum, _ts_query_pattern_count, _ts_query_capture_count, _ts_query_string_count, _ts_query_capture_name_for_id, _ts_query_capture_quantifier_for_id, _ts_query_string_value_for_id, _ts_query_predicates_for_pattern, _ts_query_start_byte_for_pattern, _ts_query_end_byte_for_pattern, _ts_query_is_pattern_rooted, _ts_query_is_pattern_non_local, _ts_query_is_pattern_guaranteed_at_step, _ts_query_disable_capture, _ts_query_disable_pattern, _ts_tree_copy, _ts_tree_delete, _ts_init, _ts_parser_new_wasm, _ts_parser_enable_logger_wasm, _ts_parser_parse_wasm, _ts_parser_included_ranges_wasm, _ts_language_type_is_named_wasm, _ts_language_type_is_visible_wasm, _ts_language_metadata_wasm, _ts_language_supertypes_wasm, _ts_language_subtypes_wasm, _ts_tree_root_node_wasm, _ts_tree_root_node_with_offset_wasm, _ts_tree_edit_wasm, _ts_tree_included_ranges_wasm, _ts_tree_get_changed_ranges_wasm, _ts_tree_cursor_new_wasm, _ts_tree_cursor_copy_wasm, _ts_tree_cursor_delete_wasm, _ts_tree_cursor_reset_wasm, _ts_tree_cursor_reset_to_wasm, _ts_tree_cursor_goto_first_child_wasm, _ts_tree_cursor_goto_last_child_wasm, _ts_tree_cursor_goto_first_child_for_index_wasm, _ts_tree_cursor_goto_first_child_for_position_wasm, _ts_tree_cursor_goto_next_sibling_wasm, _ts_tree_cursor_goto_previous_sibling_wasm, _ts_tree_cursor_goto_descendant_wasm, _ts_tree_cursor_goto_parent_wasm, _ts_tree_cursor_current_node_type_id_wasm, _ts_tree_cursor_current_node_state_id_wasm, _ts_tree_cursor_current_node_is_named_wasm, _ts_tree_cursor_current_node_is_missing_wasm, _ts_tree_cursor_current_node_id_wasm, _ts_tree_cursor_start_position_wasm, _ts_tree_cursor_end_position_wasm, _ts_tree_cursor_start_index_wasm, _ts_tree_cursor_end_index_wasm, _ts_tree_cursor_current_field_id_wasm, _ts_tree_cursor_current_depth_wasm, _ts_tree_cursor_current_descendant_index_wasm, _ts_tree_cursor_current_node_wasm, _ts_node_symbol_wasm, _ts_node_field_name_for_child_wasm, _ts_node_field_name_for_named_child_wasm, _ts_node_children_by_field_id_wasm, _ts_node_first_child_for_byte_wasm, _ts_node_first_named_child_for_byte_wasm, _ts_node_grammar_symbol_wasm, _ts_node_child_count_wasm, _ts_node_named_child_count_wasm, _ts_node_child_wasm, _ts_node_named_child_wasm, _ts_node_child_by_field_id_wasm, _ts_node_next_sibling_wasm, _ts_node_prev_sibling_wasm, _ts_node_next_named_sibling_wasm, _ts_node_prev_named_sibling_wasm, _ts_node_descendant_count_wasm, _ts_node_parent_wasm, _ts_node_child_with_descendant_wasm, _ts_node_descendant_for_index_wasm, _ts_node_named_descendant_for_index_wasm, _ts_node_descendant_for_position_wasm, _ts_node_named_descendant_for_position_wasm, _ts_node_start_point_wasm, _ts_node_end_point_wasm, _ts_node_start_index_wasm, _ts_node_end_index_wasm, _ts_node_to_string_wasm, _ts_node_children_wasm, _ts_node_named_children_wasm, _ts_node_descendants_of_type_wasm, _ts_node_is_named_wasm, _ts_node_has_changes_wasm, _ts_node_has_error_wasm, _ts_node_is_error_wasm, _ts_node_is_missing_wasm, _ts_node_is_extra_wasm, _ts_node_parse_state_wasm, _ts_node_next_parse_state_wasm, _ts_query_matches_wasm, _ts_query_captures_wasm, _memset, _memcpy, _memmove, _iswalpha, _iswblank, _iswdigit, _iswlower, _iswupper, _iswxdigit, _memchr, _strlen, _strcmp, _strncat, _strncpy, _towlower, _towupper, _setThrew, __emscripten_stack_restore, __emscripten_stack_alloc, _emscripten_stack_get_current, ___wasm_apply_data_relocs;
  function assignWasmExports(wasmExports2) {
    Module["_malloc"] = _malloc = wasmExports2["malloc"];
    Module["_calloc"] = _calloc = wasmExports2["calloc"];
    Module["_realloc"] = _realloc = wasmExports2["realloc"];
    Module["_free"] = _free = wasmExports2["free"];
    Module["_ts_range_edit"] = _ts_range_edit = wasmExports2["ts_range_edit"];
    Module["_memcmp"] = _memcmp = wasmExports2["memcmp"];
    Module["_ts_language_symbol_count"] = _ts_language_symbol_count = wasmExports2["ts_language_symbol_count"];
    Module["_ts_language_state_count"] = _ts_language_state_count = wasmExports2["ts_language_state_count"];
    Module["_ts_language_abi_version"] = _ts_language_abi_version = wasmExports2["ts_language_abi_version"];
    Module["_ts_language_name"] = _ts_language_name = wasmExports2["ts_language_name"];
    Module["_ts_language_field_count"] = _ts_language_field_count = wasmExports2["ts_language_field_count"];
    Module["_ts_language_next_state"] = _ts_language_next_state = wasmExports2["ts_language_next_state"];
    Module["_ts_language_symbol_name"] = _ts_language_symbol_name = wasmExports2["ts_language_symbol_name"];
    Module["_ts_language_symbol_for_name"] = _ts_language_symbol_for_name = wasmExports2["ts_language_symbol_for_name"];
    Module["_strncmp"] = _strncmp = wasmExports2["strncmp"];
    Module["_ts_language_symbol_type"] = _ts_language_symbol_type = wasmExports2["ts_language_symbol_type"];
    Module["_ts_language_field_name_for_id"] = _ts_language_field_name_for_id = wasmExports2["ts_language_field_name_for_id"];
    Module["_ts_lookahead_iterator_new"] = _ts_lookahead_iterator_new = wasmExports2["ts_lookahead_iterator_new"];
    Module["_ts_lookahead_iterator_delete"] = _ts_lookahead_iterator_delete = wasmExports2["ts_lookahead_iterator_delete"];
    Module["_ts_lookahead_iterator_reset_state"] = _ts_lookahead_iterator_reset_state = wasmExports2["ts_lookahead_iterator_reset_state"];
    Module["_ts_lookahead_iterator_reset"] = _ts_lookahead_iterator_reset = wasmExports2["ts_lookahead_iterator_reset"];
    Module["_ts_lookahead_iterator_next"] = _ts_lookahead_iterator_next = wasmExports2["ts_lookahead_iterator_next"];
    Module["_ts_lookahead_iterator_current_symbol"] = _ts_lookahead_iterator_current_symbol = wasmExports2["ts_lookahead_iterator_current_symbol"];
    Module["_ts_point_edit"] = _ts_point_edit = wasmExports2["ts_point_edit"];
    Module["_ts_parser_delete"] = _ts_parser_delete = wasmExports2["ts_parser_delete"];
    Module["_ts_parser_reset"] = _ts_parser_reset = wasmExports2["ts_parser_reset"];
    Module["_ts_parser_set_language"] = _ts_parser_set_language = wasmExports2["ts_parser_set_language"];
    Module["_ts_parser_set_included_ranges"] = _ts_parser_set_included_ranges = wasmExports2["ts_parser_set_included_ranges"];
    Module["_ts_query_new"] = _ts_query_new = wasmExports2["ts_query_new"];
    Module["_ts_query_delete"] = _ts_query_delete = wasmExports2["ts_query_delete"];
    Module["_iswspace"] = _iswspace = wasmExports2["iswspace"];
    Module["_iswalnum"] = _iswalnum = wasmExports2["iswalnum"];
    Module["_ts_query_pattern_count"] = _ts_query_pattern_count = wasmExports2["ts_query_pattern_count"];
    Module["_ts_query_capture_count"] = _ts_query_capture_count = wasmExports2["ts_query_capture_count"];
    Module["_ts_query_string_count"] = _ts_query_string_count = wasmExports2["ts_query_string_count"];
    Module["_ts_query_capture_name_for_id"] = _ts_query_capture_name_for_id = wasmExports2["ts_query_capture_name_for_id"];
    Module["_ts_query_capture_quantifier_for_id"] = _ts_query_capture_quantifier_for_id = wasmExports2["ts_query_capture_quantifier_for_id"];
    Module["_ts_query_string_value_for_id"] = _ts_query_string_value_for_id = wasmExports2["ts_query_string_value_for_id"];
    Module["_ts_query_predicates_for_pattern"] = _ts_query_predicates_for_pattern = wasmExports2["ts_query_predicates_for_pattern"];
    Module["_ts_query_start_byte_for_pattern"] = _ts_query_start_byte_for_pattern = wasmExports2["ts_query_start_byte_for_pattern"];
    Module["_ts_query_end_byte_for_pattern"] = _ts_query_end_byte_for_pattern = wasmExports2["ts_query_end_byte_for_pattern"];
    Module["_ts_query_is_pattern_rooted"] = _ts_query_is_pattern_rooted = wasmExports2["ts_query_is_pattern_rooted"];
    Module["_ts_query_is_pattern_non_local"] = _ts_query_is_pattern_non_local = wasmExports2["ts_query_is_pattern_non_local"];
    Module["_ts_query_is_pattern_guaranteed_at_step"] = _ts_query_is_pattern_guaranteed_at_step = wasmExports2["ts_query_is_pattern_guaranteed_at_step"];
    Module["_ts_query_disable_capture"] = _ts_query_disable_capture = wasmExports2["ts_query_disable_capture"];
    Module["_ts_query_disable_pattern"] = _ts_query_disable_pattern = wasmExports2["ts_query_disable_pattern"];
    Module["_ts_tree_copy"] = _ts_tree_copy = wasmExports2["ts_tree_copy"];
    Module["_ts_tree_delete"] = _ts_tree_delete = wasmExports2["ts_tree_delete"];
    Module["_ts_init"] = _ts_init = wasmExports2["ts_init"];
    Module["_ts_parser_new_wasm"] = _ts_parser_new_wasm = wasmExports2["ts_parser_new_wasm"];
    Module["_ts_parser_enable_logger_wasm"] = _ts_parser_enable_logger_wasm = wasmExports2["ts_parser_enable_logger_wasm"];
    Module["_ts_parser_parse_wasm"] = _ts_parser_parse_wasm = wasmExports2["ts_parser_parse_wasm"];
    Module["_ts_parser_included_ranges_wasm"] = _ts_parser_included_ranges_wasm = wasmExports2["ts_parser_included_ranges_wasm"];
    Module["_ts_language_type_is_named_wasm"] = _ts_language_type_is_named_wasm = wasmExports2["ts_language_type_is_named_wasm"];
    Module["_ts_language_type_is_visible_wasm"] = _ts_language_type_is_visible_wasm = wasmExports2["ts_language_type_is_visible_wasm"];
    Module["_ts_language_metadata_wasm"] = _ts_language_metadata_wasm = wasmExports2["ts_language_metadata_wasm"];
    Module["_ts_language_supertypes_wasm"] = _ts_language_supertypes_wasm = wasmExports2["ts_language_supertypes_wasm"];
    Module["_ts_language_subtypes_wasm"] = _ts_language_subtypes_wasm = wasmExports2["ts_language_subtypes_wasm"];
    Module["_ts_tree_root_node_wasm"] = _ts_tree_root_node_wasm = wasmExports2["ts_tree_root_node_wasm"];
    Module["_ts_tree_root_node_with_offset_wasm"] = _ts_tree_root_node_with_offset_wasm = wasmExports2["ts_tree_root_node_with_offset_wasm"];
    Module["_ts_tree_edit_wasm"] = _ts_tree_edit_wasm = wasmExports2["ts_tree_edit_wasm"];
    Module["_ts_tree_included_ranges_wasm"] = _ts_tree_included_ranges_wasm = wasmExports2["ts_tree_included_ranges_wasm"];
    Module["_ts_tree_get_changed_ranges_wasm"] = _ts_tree_get_changed_ranges_wasm = wasmExports2["ts_tree_get_changed_ranges_wasm"];
    Module["_ts_tree_cursor_new_wasm"] = _ts_tree_cursor_new_wasm = wasmExports2["ts_tree_cursor_new_wasm"];
    Module["_ts_tree_cursor_copy_wasm"] = _ts_tree_cursor_copy_wasm = wasmExports2["ts_tree_cursor_copy_wasm"];
    Module["_ts_tree_cursor_delete_wasm"] = _ts_tree_cursor_delete_wasm = wasmExports2["ts_tree_cursor_delete_wasm"];
    Module["_ts_tree_cursor_reset_wasm"] = _ts_tree_cursor_reset_wasm = wasmExports2["ts_tree_cursor_reset_wasm"];
    Module["_ts_tree_cursor_reset_to_wasm"] = _ts_tree_cursor_reset_to_wasm = wasmExports2["ts_tree_cursor_reset_to_wasm"];
    Module["_ts_tree_cursor_goto_first_child_wasm"] = _ts_tree_cursor_goto_first_child_wasm = wasmExports2["ts_tree_cursor_goto_first_child_wasm"];
    Module["_ts_tree_cursor_goto_last_child_wasm"] = _ts_tree_cursor_goto_last_child_wasm = wasmExports2["ts_tree_cursor_goto_last_child_wasm"];
    Module["_ts_tree_cursor_goto_first_child_for_index_wasm"] = _ts_tree_cursor_goto_first_child_for_index_wasm = wasmExports2["ts_tree_cursor_goto_first_child_for_index_wasm"];
    Module["_ts_tree_cursor_goto_first_child_for_position_wasm"] = _ts_tree_cursor_goto_first_child_for_position_wasm = wasmExports2["ts_tree_cursor_goto_first_child_for_position_wasm"];
    Module["_ts_tree_cursor_goto_next_sibling_wasm"] = _ts_tree_cursor_goto_next_sibling_wasm = wasmExports2["ts_tree_cursor_goto_next_sibling_wasm"];
    Module["_ts_tree_cursor_goto_previous_sibling_wasm"] = _ts_tree_cursor_goto_previous_sibling_wasm = wasmExports2["ts_tree_cursor_goto_previous_sibling_wasm"];
    Module["_ts_tree_cursor_goto_descendant_wasm"] = _ts_tree_cursor_goto_descendant_wasm = wasmExports2["ts_tree_cursor_goto_descendant_wasm"];
    Module["_ts_tree_cursor_goto_parent_wasm"] = _ts_tree_cursor_goto_parent_wasm = wasmExports2["ts_tree_cursor_goto_parent_wasm"];
    Module["_ts_tree_cursor_current_node_type_id_wasm"] = _ts_tree_cursor_current_node_type_id_wasm = wasmExports2["ts_tree_cursor_current_node_type_id_wasm"];
    Module["_ts_tree_cursor_current_node_state_id_wasm"] = _ts_tree_cursor_current_node_state_id_wasm = wasmExports2["ts_tree_cursor_current_node_state_id_wasm"];
    Module["_ts_tree_cursor_current_node_is_named_wasm"] = _ts_tree_cursor_current_node_is_named_wasm = wasmExports2["ts_tree_cursor_current_node_is_named_wasm"];
    Module["_ts_tree_cursor_current_node_is_missing_wasm"] = _ts_tree_cursor_current_node_is_missing_wasm = wasmExports2["ts_tree_cursor_current_node_is_missing_wasm"];
    Module["_ts_tree_cursor_current_node_id_wasm"] = _ts_tree_cursor_current_node_id_wasm = wasmExports2["ts_tree_cursor_current_node_id_wasm"];
    Module["_ts_tree_cursor_start_position_wasm"] = _ts_tree_cursor_start_position_wasm = wasmExports2["ts_tree_cursor_start_position_wasm"];
    Module["_ts_tree_cursor_end_position_wasm"] = _ts_tree_cursor_end_position_wasm = wasmExports2["ts_tree_cursor_end_position_wasm"];
    Module["_ts_tree_cursor_start_index_wasm"] = _ts_tree_cursor_start_index_wasm = wasmExports2["ts_tree_cursor_start_index_wasm"];
    Module["_ts_tree_cursor_end_index_wasm"] = _ts_tree_cursor_end_index_wasm = wasmExports2["ts_tree_cursor_end_index_wasm"];
    Module["_ts_tree_cursor_current_field_id_wasm"] = _ts_tree_cursor_current_field_id_wasm = wasmExports2["ts_tree_cursor_current_field_id_wasm"];
    Module["_ts_tree_cursor_current_depth_wasm"] = _ts_tree_cursor_current_depth_wasm = wasmExports2["ts_tree_cursor_current_depth_wasm"];
    Module["_ts_tree_cursor_current_descendant_index_wasm"] = _ts_tree_cursor_current_descendant_index_wasm = wasmExports2["ts_tree_cursor_current_descendant_index_wasm"];
    Module["_ts_tree_cursor_current_node_wasm"] = _ts_tree_cursor_current_node_wasm = wasmExports2["ts_tree_cursor_current_node_wasm"];
    Module["_ts_node_symbol_wasm"] = _ts_node_symbol_wasm = wasmExports2["ts_node_symbol_wasm"];
    Module["_ts_node_field_name_for_child_wasm"] = _ts_node_field_name_for_child_wasm = wasmExports2["ts_node_field_name_for_child_wasm"];
    Module["_ts_node_field_name_for_named_child_wasm"] = _ts_node_field_name_for_named_child_wasm = wasmExports2["ts_node_field_name_for_named_child_wasm"];
    Module["_ts_node_children_by_field_id_wasm"] = _ts_node_children_by_field_id_wasm = wasmExports2["ts_node_children_by_field_id_wasm"];
    Module["_ts_node_first_child_for_byte_wasm"] = _ts_node_first_child_for_byte_wasm = wasmExports2["ts_node_first_child_for_byte_wasm"];
    Module["_ts_node_first_named_child_for_byte_wasm"] = _ts_node_first_named_child_for_byte_wasm = wasmExports2["ts_node_first_named_child_for_byte_wasm"];
    Module["_ts_node_grammar_symbol_wasm"] = _ts_node_grammar_symbol_wasm = wasmExports2["ts_node_grammar_symbol_wasm"];
    Module["_ts_node_child_count_wasm"] = _ts_node_child_count_wasm = wasmExports2["ts_node_child_count_wasm"];
    Module["_ts_node_named_child_count_wasm"] = _ts_node_named_child_count_wasm = wasmExports2["ts_node_named_child_count_wasm"];
    Module["_ts_node_child_wasm"] = _ts_node_child_wasm = wasmExports2["ts_node_child_wasm"];
    Module["_ts_node_named_child_wasm"] = _ts_node_named_child_wasm = wasmExports2["ts_node_named_child_wasm"];
    Module["_ts_node_child_by_field_id_wasm"] = _ts_node_child_by_field_id_wasm = wasmExports2["ts_node_child_by_field_id_wasm"];
    Module["_ts_node_next_sibling_wasm"] = _ts_node_next_sibling_wasm = wasmExports2["ts_node_next_sibling_wasm"];
    Module["_ts_node_prev_sibling_wasm"] = _ts_node_prev_sibling_wasm = wasmExports2["ts_node_prev_sibling_wasm"];
    Module["_ts_node_next_named_sibling_wasm"] = _ts_node_next_named_sibling_wasm = wasmExports2["ts_node_next_named_sibling_wasm"];
    Module["_ts_node_prev_named_sibling_wasm"] = _ts_node_prev_named_sibling_wasm = wasmExports2["ts_node_prev_named_sibling_wasm"];
    Module["_ts_node_descendant_count_wasm"] = _ts_node_descendant_count_wasm = wasmExports2["ts_node_descendant_count_wasm"];
    Module["_ts_node_parent_wasm"] = _ts_node_parent_wasm = wasmExports2["ts_node_parent_wasm"];
    Module["_ts_node_child_with_descendant_wasm"] = _ts_node_child_with_descendant_wasm = wasmExports2["ts_node_child_with_descendant_wasm"];
    Module["_ts_node_descendant_for_index_wasm"] = _ts_node_descendant_for_index_wasm = wasmExports2["ts_node_descendant_for_index_wasm"];
    Module["_ts_node_named_descendant_for_index_wasm"] = _ts_node_named_descendant_for_index_wasm = wasmExports2["ts_node_named_descendant_for_index_wasm"];
    Module["_ts_node_descendant_for_position_wasm"] = _ts_node_descendant_for_position_wasm = wasmExports2["ts_node_descendant_for_position_wasm"];
    Module["_ts_node_named_descendant_for_position_wasm"] = _ts_node_named_descendant_for_position_wasm = wasmExports2["ts_node_named_descendant_for_position_wasm"];
    Module["_ts_node_start_point_wasm"] = _ts_node_start_point_wasm = wasmExports2["ts_node_start_point_wasm"];
    Module["_ts_node_end_point_wasm"] = _ts_node_end_point_wasm = wasmExports2["ts_node_end_point_wasm"];
    Module["_ts_node_start_index_wasm"] = _ts_node_start_index_wasm = wasmExports2["ts_node_start_index_wasm"];
    Module["_ts_node_end_index_wasm"] = _ts_node_end_index_wasm = wasmExports2["ts_node_end_index_wasm"];
    Module["_ts_node_to_string_wasm"] = _ts_node_to_string_wasm = wasmExports2["ts_node_to_string_wasm"];
    Module["_ts_node_children_wasm"] = _ts_node_children_wasm = wasmExports2["ts_node_children_wasm"];
    Module["_ts_node_named_children_wasm"] = _ts_node_named_children_wasm = wasmExports2["ts_node_named_children_wasm"];
    Module["_ts_node_descendants_of_type_wasm"] = _ts_node_descendants_of_type_wasm = wasmExports2["ts_node_descendants_of_type_wasm"];
    Module["_ts_node_is_named_wasm"] = _ts_node_is_named_wasm = wasmExports2["ts_node_is_named_wasm"];
    Module["_ts_node_has_changes_wasm"] = _ts_node_has_changes_wasm = wasmExports2["ts_node_has_changes_wasm"];
    Module["_ts_node_has_error_wasm"] = _ts_node_has_error_wasm = wasmExports2["ts_node_has_error_wasm"];
    Module["_ts_node_is_error_wasm"] = _ts_node_is_error_wasm = wasmExports2["ts_node_is_error_wasm"];
    Module["_ts_node_is_missing_wasm"] = _ts_node_is_missing_wasm = wasmExports2["ts_node_is_missing_wasm"];
    Module["_ts_node_is_extra_wasm"] = _ts_node_is_extra_wasm = wasmExports2["ts_node_is_extra_wasm"];
    Module["_ts_node_parse_state_wasm"] = _ts_node_parse_state_wasm = wasmExports2["ts_node_parse_state_wasm"];
    Module["_ts_node_next_parse_state_wasm"] = _ts_node_next_parse_state_wasm = wasmExports2["ts_node_next_parse_state_wasm"];
    Module["_ts_query_matches_wasm"] = _ts_query_matches_wasm = wasmExports2["ts_query_matches_wasm"];
    Module["_ts_query_captures_wasm"] = _ts_query_captures_wasm = wasmExports2["ts_query_captures_wasm"];
    Module["_memset"] = _memset = wasmExports2["memset"];
    Module["_memcpy"] = _memcpy = wasmExports2["memcpy"];
    Module["_memmove"] = _memmove = wasmExports2["memmove"];
    Module["_iswalpha"] = _iswalpha = wasmExports2["iswalpha"];
    Module["_iswblank"] = _iswblank = wasmExports2["iswblank"];
    Module["_iswdigit"] = _iswdigit = wasmExports2["iswdigit"];
    Module["_iswlower"] = _iswlower = wasmExports2["iswlower"];
    Module["_iswupper"] = _iswupper = wasmExports2["iswupper"];
    Module["_iswxdigit"] = _iswxdigit = wasmExports2["iswxdigit"];
    Module["_memchr"] = _memchr = wasmExports2["memchr"];
    Module["_strlen"] = _strlen = wasmExports2["strlen"];
    Module["_strcmp"] = _strcmp = wasmExports2["strcmp"];
    Module["_strncat"] = _strncat = wasmExports2["strncat"];
    Module["_strncpy"] = _strncpy = wasmExports2["strncpy"];
    Module["_towlower"] = _towlower = wasmExports2["towlower"];
    Module["_towupper"] = _towupper = wasmExports2["towupper"];
    _setThrew = wasmExports2["setThrew"];
    __emscripten_stack_restore = wasmExports2["_emscripten_stack_restore"];
    __emscripten_stack_alloc = wasmExports2["_emscripten_stack_alloc"];
    _emscripten_stack_get_current = wasmExports2["emscripten_stack_get_current"];
    ___wasm_apply_data_relocs = wasmExports2["__wasm_apply_data_relocs"];
  }
  __name(assignWasmExports, "assignWasmExports");
  var wasmImports = {
    /** @export */
    __heap_base: ___heap_base,
    /** @export */
    __indirect_function_table: wasmTable,
    /** @export */
    __memory_base: ___memory_base,
    /** @export */
    __stack_high: ___stack_high,
    /** @export */
    __stack_low: ___stack_low,
    /** @export */
    __stack_pointer: ___stack_pointer,
    /** @export */
    __table_base: ___table_base,
    /** @export */
    _abort_js: __abort_js,
    /** @export */
    emscripten_resize_heap: _emscripten_resize_heap,
    /** @export */
    fd_close: _fd_close,
    /** @export */
    fd_seek: _fd_seek,
    /** @export */
    fd_write: _fd_write,
    /** @export */
    memory: wasmMemory,
    /** @export */
    tree_sitter_log_callback: _tree_sitter_log_callback,
    /** @export */
    tree_sitter_parse_callback: _tree_sitter_parse_callback,
    /** @export */
    tree_sitter_progress_callback: _tree_sitter_progress_callback,
    /** @export */
    tree_sitter_query_progress_callback: _tree_sitter_query_progress_callback
  };
  function callMain(args2 = []) {
    var entryFunction = resolveGlobalSymbol("main").sym;
    if (!entryFunction) return;
    args2.unshift(thisProgram);
    var argc = args2.length;
    var argv = stackAlloc((argc + 1) * 4);
    var argv_ptr = argv;
    args2.forEach((arg) => {
      LE_HEAP_STORE_U32((argv_ptr >> 2) * 4, stringToUTF8OnStack(arg));
      argv_ptr += 4;
    });
    LE_HEAP_STORE_U32((argv_ptr >> 2) * 4, 0);
    try {
      var ret = entryFunction(argc, argv);
      exitJS(
        ret,
        /* implicit = */
        true
      );
      return ret;
    } catch (e) {
      return handleException(e);
    }
  }
  __name(callMain, "callMain");
  function run(args2 = arguments_) {
    if (runDependencies > 0) {
      dependenciesFulfilled = run;
      return;
    }
    preRun();
    if (runDependencies > 0) {
      dependenciesFulfilled = run;
      return;
    }
    function doRun() {
      Module["calledRun"] = true;
      if (ABORT) return;
      initRuntime();
      preMain();
      readyPromiseResolve?.(Module);
      Module["onRuntimeInitialized"]?.();
      var noInitialRun = Module["noInitialRun"] || false;
      if (!noInitialRun) callMain(args2);
      postRun();
    }
    __name(doRun, "doRun");
    if (Module["setStatus"]) {
      Module["setStatus"]("Running...");
      setTimeout(() => {
        setTimeout(() => Module["setStatus"](""), 1);
        doRun();
      }, 1);
    } else {
      doRun();
    }
  }
  __name(run, "run");
  var wasmExports;
  wasmExports = await createWasm();
  run();
  if (runtimeInitialized) {
    moduleRtn = Module;
  } else {
    moduleRtn = new Promise((resolve, reject) => {
      readyPromiseResolve = resolve;
      readyPromiseReject = reject;
    });
  }
  return moduleRtn;
}
__name(Module2, "Module");
var web_tree_sitter_default = Module2;
var Module3 = null;
async function initializeBinding(moduleOptions) {
  return Module3 ??= await web_tree_sitter_default(moduleOptions);
}
__name(initializeBinding, "initializeBinding");
function checkModule() {
  return !!Module3;
}
__name(checkModule, "checkModule");
var TRANSFER_BUFFER;
var LANGUAGE_VERSION;
var MIN_COMPATIBLE_VERSION;
var Parser = class {
  static {
    __name(this, "Parser");
  }
  /** @internal */
  [0] = 0;
  // Internal handle for Wasm
  /** @internal */
  [1] = 0;
  // Internal handle for Wasm
  /** @internal */
  logCallback = null;
  /** The parser's current language. */
  language = null;
  /**
   * This must always be called before creating a Parser.
   *
   * You can optionally pass in options to configure the Wasm module, the most common
   * one being `locateFile` to help the module find the `.wasm` file.
   */
  static async init(moduleOptions) {
    setModule(await initializeBinding(moduleOptions));
    TRANSFER_BUFFER = C._ts_init();
    LANGUAGE_VERSION = C.getValue(TRANSFER_BUFFER, "i32");
    MIN_COMPATIBLE_VERSION = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
  }
  /**
   * Create a new parser.
   */
  constructor() {
    this.initialize();
  }
  /** @internal */
  initialize() {
    if (!checkModule()) {
      throw new Error("cannot construct a Parser before calling `init()`");
    }
    C._ts_parser_new_wasm();
    this[0] = C.getValue(TRANSFER_BUFFER, "i32");
    this[1] = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
  }
  /** Delete the parser, freeing its resources. */
  delete() {
    C._ts_parser_delete(this[0]);
    C._free(this[1]);
    this[0] = 0;
    this[1] = 0;
  }
  /**
   * Set the language that the parser should use for parsing.
   *
   * If the language was not successfully assigned, an error will be thrown.
   * This happens if the language was generated with an incompatible
   * version of the Tree-sitter CLI. Check the language's version using
   * {@link Language#version} and compare it to this library's
   * {@link LANGUAGE_VERSION} and {@link MIN_COMPATIBLE_VERSION} constants.
   */
  setLanguage(language) {
    let address;
    if (!language) {
      address = 0;
      this.language = null;
    } else if (language.constructor === Language) {
      address = language[0];
      const version = C._ts_language_abi_version(address);
      if (version < MIN_COMPATIBLE_VERSION || LANGUAGE_VERSION < version) {
        throw new Error(
          `Incompatible language version ${version}. Compatibility range ${MIN_COMPATIBLE_VERSION} through ${LANGUAGE_VERSION}.`
        );
      }
      this.language = language;
    } else {
      throw new Error("Argument must be a Language");
    }
    C._ts_parser_set_language(this[0], address);
    return this;
  }
  /**
   * Parse a slice of UTF8 text.
   *
   * @param {string | ParseCallback} callback - The UTF8-encoded text to parse or a callback function.
   *
   * @param {Tree | null} [oldTree] - A previous syntax tree parsed from the same document. If the text of the
   *   document has changed since `oldTree` was created, then you must edit `oldTree` to match
   *   the new text using {@link Tree#edit}.
   *
   * @param {ParseOptions} [options] - Options for parsing the text.
   *  This can be used to set the included ranges, or a progress callback.
   *
   * @returns {Tree | null} A {@link Tree} if parsing succeeded, or `null` if:
   *  - The parser has not yet had a language assigned with {@link Parser#setLanguage}.
   *  - The progress callback returned true.
   */
  parse(callback, oldTree, options) {
    if (typeof callback === "string") {
      C.currentParseCallback = (index) => callback.slice(index);
    } else if (typeof callback === "function") {
      C.currentParseCallback = callback;
    } else {
      throw new Error("Argument must be a string or a function");
    }
    if (options?.progressCallback) {
      C.currentProgressCallback = options.progressCallback;
    } else {
      C.currentProgressCallback = null;
    }
    if (this.logCallback) {
      C.currentLogCallback = this.logCallback;
      C._ts_parser_enable_logger_wasm(this[0], 1);
    } else {
      C.currentLogCallback = null;
      C._ts_parser_enable_logger_wasm(this[0], 0);
    }
    let rangeCount = 0;
    let rangeAddress = 0;
    if (options?.includedRanges) {
      rangeCount = options.includedRanges.length;
      rangeAddress = C._calloc(rangeCount, SIZE_OF_RANGE);
      let address = rangeAddress;
      for (let i2 = 0; i2 < rangeCount; i2++) {
        marshalRange(address, options.includedRanges[i2]);
        address += SIZE_OF_RANGE;
      }
    }
    const treeAddress = C._ts_parser_parse_wasm(
      this[0],
      this[1],
      oldTree ? oldTree[0] : 0,
      rangeAddress,
      rangeCount
    );
    if (!treeAddress) {
      C.currentParseCallback = null;
      C.currentLogCallback = null;
      C.currentProgressCallback = null;
      return null;
    }
    if (!this.language) {
      throw new Error("Parser must have a language to parse");
    }
    const result = new Tree(INTERNAL, treeAddress, this.language, C.currentParseCallback);
    C.currentParseCallback = null;
    C.currentLogCallback = null;
    C.currentProgressCallback = null;
    return result;
  }
  /**
   * Instruct the parser to start the next parse from the beginning.
   *
   * If the parser previously failed because of a callback, 
   * then by default, it will resume where it left off on the
   * next call to {@link Parser#parse} or other parsing functions.
   * If you don't want to resume, and instead intend to use this parser to
   * parse some other document, you must call `reset` first.
   */
  reset() {
    C._ts_parser_reset(this[0]);
  }
  /** Get the ranges of text that the parser will include when parsing. */
  getIncludedRanges() {
    C._ts_parser_included_ranges_wasm(this[0]);
    const count = C.getValue(TRANSFER_BUFFER, "i32");
    const buffer = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
    const result = new Array(count);
    if (count > 0) {
      let address = buffer;
      for (let i2 = 0; i2 < count; i2++) {
        result[i2] = unmarshalRange(address);
        address += SIZE_OF_RANGE;
      }
      C._free(buffer);
    }
    return result;
  }
  /** Set the logging callback that a parser should use during parsing. */
  setLogger(callback) {
    if (!callback) {
      this.logCallback = null;
    } else if (typeof callback !== "function") {
      throw new Error("Logger callback must be a function");
    } else {
      this.logCallback = callback;
    }
    return this;
  }
  /** Get the parser's current logger. */
  getLogger() {
    return this.logCallback;
  }
};
var PREDICATE_STEP_TYPE_CAPTURE = 1;
var PREDICATE_STEP_TYPE_STRING = 2;
var QUERY_WORD_REGEX = /[\w-]+/g;
var CaptureQuantifier = {
  Zero: 0,
  ZeroOrOne: 1,
  ZeroOrMore: 2,
  One: 3,
  OneOrMore: 4
};
var isCaptureStep = /* @__PURE__ */ __name((step) => step.type === "capture", "isCaptureStep");
var isStringStep = /* @__PURE__ */ __name((step) => step.type === "string", "isStringStep");
var QueryErrorKind = {
  Syntax: 1,
  NodeName: 2,
  FieldName: 3,
  CaptureName: 4,
  PatternStructure: 5
};
var QueryError = class _QueryError extends Error {
  constructor(kind, info2, index, length) {
    super(_QueryError.formatMessage(kind, info2));
    this.kind = kind;
    this.info = info2;
    this.index = index;
    this.length = length;
    this.name = "QueryError";
  }
  static {
    __name(this, "QueryError");
  }
  /** Formats an error message based on the error kind and info */
  static formatMessage(kind, info2) {
    switch (kind) {
      case QueryErrorKind.NodeName:
        return `Bad node name '${info2.word}'`;
      case QueryErrorKind.FieldName:
        return `Bad field name '${info2.word}'`;
      case QueryErrorKind.CaptureName:
        return `Bad capture name @${info2.word}`;
      case QueryErrorKind.PatternStructure:
        return `Bad pattern structure at offset ${info2.suffix}`;
      case QueryErrorKind.Syntax:
        return `Bad syntax at offset ${info2.suffix}`;
    }
  }
};
function parseAnyPredicate(steps, index, operator, textPredicates) {
  if (steps.length !== 3) {
    throw new Error(
      `Wrong number of arguments to \`#${operator}\` predicate. Expected 2, got ${steps.length - 1}`
    );
  }
  if (!isCaptureStep(steps[1])) {
    throw new Error(
      `First argument of \`#${operator}\` predicate must be a capture. Got "${steps[1].value}"`
    );
  }
  const isPositive = operator === "eq?" || operator === "any-eq?";
  const matchAll = !operator.startsWith("any-");
  if (isCaptureStep(steps[2])) {
    const captureName1 = steps[1].name;
    const captureName2 = steps[2].name;
    textPredicates[index].push((captures) => {
      const nodes1 = [];
      const nodes2 = [];
      for (const c of captures) {
        if (c.name === captureName1) nodes1.push(c.node);
        if (c.name === captureName2) nodes2.push(c.node);
      }
      const compare = /* @__PURE__ */ __name((n1, n2, positive) => {
        return positive ? n1.text === n2.text : n1.text !== n2.text;
      }, "compare");
      return matchAll ? nodes1.every((n1) => nodes2.some((n2) => compare(n1, n2, isPositive))) : nodes1.some((n1) => nodes2.some((n2) => compare(n1, n2, isPositive)));
    });
  } else {
    const captureName = steps[1].name;
    const stringValue = steps[2].value;
    const matches = /* @__PURE__ */ __name((n) => n.text === stringValue, "matches");
    const doesNotMatch = /* @__PURE__ */ __name((n) => n.text !== stringValue, "doesNotMatch");
    textPredicates[index].push((captures) => {
      const nodes = [];
      for (const c of captures) {
        if (c.name === captureName) nodes.push(c.node);
      }
      const test = isPositive ? matches : doesNotMatch;
      return matchAll ? nodes.every(test) : nodes.some(test);
    });
  }
}
__name(parseAnyPredicate, "parseAnyPredicate");
function parseMatchPredicate(steps, index, operator, textPredicates) {
  if (steps.length !== 3) {
    throw new Error(
      `Wrong number of arguments to \`#${operator}\` predicate. Expected 2, got ${steps.length - 1}.`
    );
  }
  if (steps[1].type !== "capture") {
    throw new Error(
      `First argument of \`#${operator}\` predicate must be a capture. Got "${steps[1].value}".`
    );
  }
  if (steps[2].type !== "string") {
    throw new Error(
      `Second argument of \`#${operator}\` predicate must be a string. Got @${steps[2].name}.`
    );
  }
  const isPositive = operator === "match?" || operator === "any-match?";
  const matchAll = !operator.startsWith("any-");
  const captureName = steps[1].name;
  const regex = new RegExp(steps[2].value);
  textPredicates[index].push((captures) => {
    const nodes = [];
    for (const c of captures) {
      if (c.name === captureName) nodes.push(c.node.text);
    }
    const test = /* @__PURE__ */ __name((text, positive) => {
      return positive ? regex.test(text) : !regex.test(text);
    }, "test");
    if (nodes.length === 0) return !isPositive;
    return matchAll ? nodes.every((text) => test(text, isPositive)) : nodes.some((text) => test(text, isPositive));
  });
}
__name(parseMatchPredicate, "parseMatchPredicate");
function parseAnyOfPredicate(steps, index, operator, textPredicates) {
  if (steps.length < 2) {
    throw new Error(
      `Wrong number of arguments to \`#${operator}\` predicate. Expected at least 1. Got ${steps.length - 1}.`
    );
  }
  if (steps[1].type !== "capture") {
    throw new Error(
      `First argument of \`#${operator}\` predicate must be a capture. Got "${steps[1].value}".`
    );
  }
  const isPositive = operator === "any-of?";
  const captureName = steps[1].name;
  const stringSteps = steps.slice(2);
  if (!stringSteps.every(isStringStep)) {
    throw new Error(
      `Arguments to \`#${operator}\` predicate must be strings.".`
    );
  }
  const values = stringSteps.map((s) => s.value);
  textPredicates[index].push((captures) => {
    const nodes = [];
    for (const c of captures) {
      if (c.name === captureName) nodes.push(c.node.text);
    }
    if (nodes.length === 0) return !isPositive;
    return nodes.every((text) => values.includes(text)) === isPositive;
  });
}
__name(parseAnyOfPredicate, "parseAnyOfPredicate");
function parseIsPredicate(steps, index, operator, assertedProperties, refutedProperties) {
  if (steps.length < 2 || steps.length > 3) {
    throw new Error(
      `Wrong number of arguments to \`#${operator}\` predicate. Expected 1 or 2. Got ${steps.length - 1}.`
    );
  }
  if (!steps.every(isStringStep)) {
    throw new Error(
      `Arguments to \`#${operator}\` predicate must be strings.".`
    );
  }
  const properties = operator === "is?" ? assertedProperties : refutedProperties;
  if (!properties[index]) properties[index] = {};
  properties[index][steps[1].value] = steps[2]?.value ?? null;
}
__name(parseIsPredicate, "parseIsPredicate");
function parseSetDirective(steps, index, setProperties) {
  if (steps.length < 2 || steps.length > 3) {
    throw new Error(`Wrong number of arguments to \`#set!\` predicate. Expected 1 or 2. Got ${steps.length - 1}.`);
  }
  if (!steps.every(isStringStep)) {
    throw new Error(`Arguments to \`#set!\` predicate must be strings.".`);
  }
  if (!setProperties[index]) setProperties[index] = {};
  setProperties[index][steps[1].value] = steps[2]?.value ?? null;
}
__name(parseSetDirective, "parseSetDirective");
function parsePattern(index, stepType, stepValueId, captureNames, stringValues, steps, textPredicates, predicates, setProperties, assertedProperties, refutedProperties) {
  if (stepType === PREDICATE_STEP_TYPE_CAPTURE) {
    const name2 = captureNames[stepValueId];
    steps.push({ type: "capture", name: name2 });
  } else if (stepType === PREDICATE_STEP_TYPE_STRING) {
    steps.push({ type: "string", value: stringValues[stepValueId] });
  } else if (steps.length > 0) {
    if (steps[0].type !== "string") {
      throw new Error("Predicates must begin with a literal value");
    }
    const operator = steps[0].value;
    switch (operator) {
      case "any-not-eq?":
      case "not-eq?":
      case "any-eq?":
      case "eq?":
        parseAnyPredicate(steps, index, operator, textPredicates);
        break;
      case "any-not-match?":
      case "not-match?":
      case "any-match?":
      case "match?":
        parseMatchPredicate(steps, index, operator, textPredicates);
        break;
      case "not-any-of?":
      case "any-of?":
        parseAnyOfPredicate(steps, index, operator, textPredicates);
        break;
      case "is?":
      case "is-not?":
        parseIsPredicate(steps, index, operator, assertedProperties, refutedProperties);
        break;
      case "set!":
        parseSetDirective(steps, index, setProperties);
        break;
      default:
        predicates[index].push({ operator, operands: steps.slice(1) });
    }
    steps.length = 0;
  }
}
__name(parsePattern, "parsePattern");
var Query = class {
  static {
    __name(this, "Query");
  }
  /** @internal */
  [0] = 0;
  // Internal handle for Wasm
  /** @internal */
  exceededMatchLimit;
  /** @internal */
  textPredicates;
  /** The names of the captures used in the query. */
  captureNames;
  /** The quantifiers of the captures used in the query. */
  captureQuantifiers;
  /**
   * The other user-defined predicates associated with the given index.
   *
   * This includes predicates with operators other than:
   * - `match?`
   * - `eq?` and `not-eq?`
   * - `any-of?` and `not-any-of?`
   * - `is?` and `is-not?`
   * - `set!`
   */
  predicates;
  /** The properties for predicates with the operator `set!`. */
  setProperties;
  /** The properties for predicates with the operator `is?`. */
  assertedProperties;
  /** The properties for predicates with the operator `is-not?`. */
  refutedProperties;
  /** The maximum number of in-progress matches for this cursor. */
  matchLimit;
  /**
   * Create a new query from a string containing one or more S-expression
   * patterns.
   *
   * The query is associated with a particular language, and can only be run
   * on syntax nodes parsed with that language. References to Queries can be
   * shared between multiple threads.
   *
   * @link {@see https://tree-sitter.github.io/tree-sitter/using-parsers/queries}
   */
  constructor(language, source) {
    const sourceLength = C.lengthBytesUTF8(source);
    const sourceAddress = C._malloc(sourceLength + 1);
    C.stringToUTF8(source, sourceAddress, sourceLength + 1);
    const address = C._ts_query_new(
      language[0],
      sourceAddress,
      sourceLength,
      TRANSFER_BUFFER,
      TRANSFER_BUFFER + SIZE_OF_INT
    );
    if (!address) {
      const errorId = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
      const errorByte = C.getValue(TRANSFER_BUFFER, "i32");
      const errorIndex = C.UTF8ToString(sourceAddress, errorByte).length;
      const suffix = source.slice(errorIndex, errorIndex + 100).split("\n")[0];
      const word = suffix.match(QUERY_WORD_REGEX)?.[0] ?? "";
      C._free(sourceAddress);
      switch (errorId) {
        case QueryErrorKind.Syntax:
          throw new QueryError(QueryErrorKind.Syntax, { suffix: `${errorIndex}: '${suffix}'...` }, errorIndex, 0);
        case QueryErrorKind.NodeName:
          throw new QueryError(errorId, { word }, errorIndex, word.length);
        case QueryErrorKind.FieldName:
          throw new QueryError(errorId, { word }, errorIndex, word.length);
        case QueryErrorKind.CaptureName:
          throw new QueryError(errorId, { word }, errorIndex, word.length);
        case QueryErrorKind.PatternStructure:
          throw new QueryError(errorId, { suffix: `${errorIndex}: '${suffix}'...` }, errorIndex, 0);
      }
    }
    const stringCount = C._ts_query_string_count(address);
    const captureCount = C._ts_query_capture_count(address);
    const patternCount = C._ts_query_pattern_count(address);
    const captureNames = new Array(captureCount);
    const captureQuantifiers = new Array(patternCount);
    const stringValues = new Array(stringCount);
    for (let i2 = 0; i2 < captureCount; i2++) {
      const nameAddress = C._ts_query_capture_name_for_id(
        address,
        i2,
        TRANSFER_BUFFER
      );
      const nameLength = C.getValue(TRANSFER_BUFFER, "i32");
      captureNames[i2] = C.UTF8ToString(nameAddress, nameLength);
    }
    for (let i2 = 0; i2 < patternCount; i2++) {
      const captureQuantifiersArray = new Array(captureCount);
      for (let j = 0; j < captureCount; j++) {
        const quantifier = C._ts_query_capture_quantifier_for_id(address, i2, j);
        captureQuantifiersArray[j] = quantifier;
      }
      captureQuantifiers[i2] = captureQuantifiersArray;
    }
    for (let i2 = 0; i2 < stringCount; i2++) {
      const valueAddress = C._ts_query_string_value_for_id(
        address,
        i2,
        TRANSFER_BUFFER
      );
      const nameLength = C.getValue(TRANSFER_BUFFER, "i32");
      stringValues[i2] = C.UTF8ToString(valueAddress, nameLength);
    }
    const setProperties = new Array(patternCount);
    const assertedProperties = new Array(patternCount);
    const refutedProperties = new Array(patternCount);
    const predicates = new Array(patternCount);
    const textPredicates = new Array(patternCount);
    for (let i2 = 0; i2 < patternCount; i2++) {
      const predicatesAddress = C._ts_query_predicates_for_pattern(address, i2, TRANSFER_BUFFER);
      const stepCount = C.getValue(TRANSFER_BUFFER, "i32");
      predicates[i2] = [];
      textPredicates[i2] = [];
      const steps = new Array();
      let stepAddress = predicatesAddress;
      for (let j = 0; j < stepCount; j++) {
        const stepType = C.getValue(stepAddress, "i32");
        stepAddress += SIZE_OF_INT;
        const stepValueId = C.getValue(stepAddress, "i32");
        stepAddress += SIZE_OF_INT;
        parsePattern(
          i2,
          stepType,
          stepValueId,
          captureNames,
          stringValues,
          steps,
          textPredicates,
          predicates,
          setProperties,
          assertedProperties,
          refutedProperties
        );
      }
      Object.freeze(textPredicates[i2]);
      Object.freeze(predicates[i2]);
      Object.freeze(setProperties[i2]);
      Object.freeze(assertedProperties[i2]);
      Object.freeze(refutedProperties[i2]);
    }
    C._free(sourceAddress);
    this[0] = address;
    this.captureNames = captureNames;
    this.captureQuantifiers = captureQuantifiers;
    this.textPredicates = textPredicates;
    this.predicates = predicates;
    this.setProperties = setProperties;
    this.assertedProperties = assertedProperties;
    this.refutedProperties = refutedProperties;
    this.exceededMatchLimit = false;
  }
  /** Delete the query, freeing its resources. */
  delete() {
    C._ts_query_delete(this[0]);
    this[0] = 0;
  }
  /**
   * Iterate over all of the matches in the order that they were found.
   *
   * Each match contains the index of the pattern that matched, and a list of
   * captures. Because multiple patterns can match the same set of nodes,
   * one match may contain captures that appear *before* some of the
   * captures from a previous match.
   *
   * @param {Node} node - The node to execute the query on.
   *
   * @param {QueryOptions} options - Options for query execution.
   */
  matches(node, options = {}) {
    const startPosition = options.startPosition ?? ZERO_POINT;
    const endPosition = options.endPosition ?? ZERO_POINT;
    const startIndex = options.startIndex ?? 0;
    const endIndex = options.endIndex ?? 0;
    const startContainingPosition = options.startContainingPosition ?? ZERO_POINT;
    const endContainingPosition = options.endContainingPosition ?? ZERO_POINT;
    const startContainingIndex = options.startContainingIndex ?? 0;
    const endContainingIndex = options.endContainingIndex ?? 0;
    const matchLimit = options.matchLimit ?? 4294967295;
    const maxStartDepth = options.maxStartDepth ?? 4294967295;
    const progressCallback = options.progressCallback;
    if (typeof matchLimit !== "number") {
      throw new Error("Arguments must be numbers");
    }
    this.matchLimit = matchLimit;
    if (endIndex !== 0 && startIndex > endIndex) {
      throw new Error("`startIndex` cannot be greater than `endIndex`");
    }
    if (endPosition !== ZERO_POINT && (startPosition.row > endPosition.row || startPosition.row === endPosition.row && startPosition.column > endPosition.column)) {
      throw new Error("`startPosition` cannot be greater than `endPosition`");
    }
    if (endContainingIndex !== 0 && startContainingIndex > endContainingIndex) {
      throw new Error("`startContainingIndex` cannot be greater than `endContainingIndex`");
    }
    if (endContainingPosition !== ZERO_POINT && (startContainingPosition.row > endContainingPosition.row || startContainingPosition.row === endContainingPosition.row && startContainingPosition.column > endContainingPosition.column)) {
      throw new Error("`startContainingPosition` cannot be greater than `endContainingPosition`");
    }
    if (progressCallback) {
      C.currentQueryProgressCallback = progressCallback;
    }
    marshalNode(node);
    C._ts_query_matches_wasm(
      this[0],
      node.tree[0],
      startPosition.row,
      startPosition.column,
      endPosition.row,
      endPosition.column,
      startIndex,
      endIndex,
      startContainingPosition.row,
      startContainingPosition.column,
      endContainingPosition.row,
      endContainingPosition.column,
      startContainingIndex,
      endContainingIndex,
      matchLimit,
      maxStartDepth
    );
    const rawCount = C.getValue(TRANSFER_BUFFER, "i32");
    const startAddress = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
    const didExceedMatchLimit = C.getValue(TRANSFER_BUFFER + 2 * SIZE_OF_INT, "i32");
    const result = new Array(rawCount);
    this.exceededMatchLimit = Boolean(didExceedMatchLimit);
    let filteredCount = 0;
    let address = startAddress;
    for (let i2 = 0; i2 < rawCount; i2++) {
      const patternIndex = C.getValue(address, "i32");
      address += SIZE_OF_INT;
      const captureCount = C.getValue(address, "i32");
      address += SIZE_OF_INT;
      const captures = new Array(captureCount);
      address = unmarshalCaptures(this, node.tree, address, patternIndex, captures);
      if (this.textPredicates[patternIndex].every((p) => p(captures))) {
        result[filteredCount] = { patternIndex, captures };
        const setProperties = this.setProperties[patternIndex];
        result[filteredCount].setProperties = setProperties;
        const assertedProperties = this.assertedProperties[patternIndex];
        result[filteredCount].assertedProperties = assertedProperties;
        const refutedProperties = this.refutedProperties[patternIndex];
        result[filteredCount].refutedProperties = refutedProperties;
        filteredCount++;
      }
    }
    result.length = filteredCount;
    C._free(startAddress);
    C.currentQueryProgressCallback = null;
    return result;
  }
  /**
   * Iterate over all of the individual captures in the order that they
   * appear.
   *
   * This is useful if you don't care about which pattern matched, and just
   * want a single, ordered sequence of captures.
   *
   * @param {Node} node - The node to execute the query on.
   *
   * @param {QueryOptions} options - Options for query execution.
   */
  captures(node, options = {}) {
    const startPosition = options.startPosition ?? ZERO_POINT;
    const endPosition = options.endPosition ?? ZERO_POINT;
    const startIndex = options.startIndex ?? 0;
    const endIndex = options.endIndex ?? 0;
    const startContainingPosition = options.startContainingPosition ?? ZERO_POINT;
    const endContainingPosition = options.endContainingPosition ?? ZERO_POINT;
    const startContainingIndex = options.startContainingIndex ?? 0;
    const endContainingIndex = options.endContainingIndex ?? 0;
    const matchLimit = options.matchLimit ?? 4294967295;
    const maxStartDepth = options.maxStartDepth ?? 4294967295;
    const progressCallback = options.progressCallback;
    if (typeof matchLimit !== "number") {
      throw new Error("Arguments must be numbers");
    }
    this.matchLimit = matchLimit;
    if (endIndex !== 0 && startIndex > endIndex) {
      throw new Error("`startIndex` cannot be greater than `endIndex`");
    }
    if (endPosition !== ZERO_POINT && (startPosition.row > endPosition.row || startPosition.row === endPosition.row && startPosition.column > endPosition.column)) {
      throw new Error("`startPosition` cannot be greater than `endPosition`");
    }
    if (endContainingIndex !== 0 && startContainingIndex > endContainingIndex) {
      throw new Error("`startContainingIndex` cannot be greater than `endContainingIndex`");
    }
    if (endContainingPosition !== ZERO_POINT && (startContainingPosition.row > endContainingPosition.row || startContainingPosition.row === endContainingPosition.row && startContainingPosition.column > endContainingPosition.column)) {
      throw new Error("`startContainingPosition` cannot be greater than `endContainingPosition`");
    }
    if (progressCallback) {
      C.currentQueryProgressCallback = progressCallback;
    }
    marshalNode(node);
    C._ts_query_captures_wasm(
      this[0],
      node.tree[0],
      startPosition.row,
      startPosition.column,
      endPosition.row,
      endPosition.column,
      startIndex,
      endIndex,
      startContainingPosition.row,
      startContainingPosition.column,
      endContainingPosition.row,
      endContainingPosition.column,
      startContainingIndex,
      endContainingIndex,
      matchLimit,
      maxStartDepth
    );
    const count = C.getValue(TRANSFER_BUFFER, "i32");
    const startAddress = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
    const didExceedMatchLimit = C.getValue(TRANSFER_BUFFER + 2 * SIZE_OF_INT, "i32");
    const result = new Array();
    this.exceededMatchLimit = Boolean(didExceedMatchLimit);
    const captures = new Array();
    let address = startAddress;
    for (let i2 = 0; i2 < count; i2++) {
      const patternIndex = C.getValue(address, "i32");
      address += SIZE_OF_INT;
      const captureCount = C.getValue(address, "i32");
      address += SIZE_OF_INT;
      const captureIndex = C.getValue(address, "i32");
      address += SIZE_OF_INT;
      captures.length = captureCount;
      address = unmarshalCaptures(this, node.tree, address, patternIndex, captures);
      if (this.textPredicates[patternIndex].every((p) => p(captures))) {
        const capture = captures[captureIndex];
        const setProperties = this.setProperties[patternIndex];
        capture.setProperties = setProperties;
        const assertedProperties = this.assertedProperties[patternIndex];
        capture.assertedProperties = assertedProperties;
        const refutedProperties = this.refutedProperties[patternIndex];
        capture.refutedProperties = refutedProperties;
        result.push(capture);
      }
    }
    C._free(startAddress);
    C.currentQueryProgressCallback = null;
    return result;
  }
  /** Get the predicates for a given pattern. */
  predicatesForPattern(patternIndex) {
    return this.predicates[patternIndex];
  }
  /**
   * Disable a certain capture within a query.
   *
   * This prevents the capture from being returned in matches, and also
   * avoids any resource usage associated with recording the capture.
   */
  disableCapture(captureName) {
    const captureNameLength = C.lengthBytesUTF8(captureName);
    const captureNameAddress = C._malloc(captureNameLength + 1);
    C.stringToUTF8(captureName, captureNameAddress, captureNameLength + 1);
    C._ts_query_disable_capture(this[0], captureNameAddress, captureNameLength);
    C._free(captureNameAddress);
  }
  /**
   * Disable a certain pattern within a query.
   *
   * This prevents the pattern from matching, and also avoids any resource
   * usage associated with the pattern. This throws an error if the pattern
   * index is out of bounds.
   */
  disablePattern(patternIndex) {
    if (patternIndex >= this.predicates.length) {
      throw new Error(
        `Pattern index is ${patternIndex} but the pattern count is ${this.predicates.length}`
      );
    }
    C._ts_query_disable_pattern(this[0], patternIndex);
  }
  /**
   * Check if, on its last execution, this cursor exceeded its maximum number
   * of in-progress matches.
   */
  didExceedMatchLimit() {
    return this.exceededMatchLimit;
  }
  /** Get the byte offset where the given pattern starts in the query's source. */
  startIndexForPattern(patternIndex) {
    if (patternIndex >= this.predicates.length) {
      throw new Error(
        `Pattern index is ${patternIndex} but the pattern count is ${this.predicates.length}`
      );
    }
    return C._ts_query_start_byte_for_pattern(this[0], patternIndex);
  }
  /** Get the byte offset where the given pattern ends in the query's source. */
  endIndexForPattern(patternIndex) {
    if (patternIndex >= this.predicates.length) {
      throw new Error(
        `Pattern index is ${patternIndex} but the pattern count is ${this.predicates.length}`
      );
    }
    return C._ts_query_end_byte_for_pattern(this[0], patternIndex);
  }
  /** Get the number of patterns in the query. */
  patternCount() {
    return C._ts_query_pattern_count(this[0]);
  }
  /** Get the index for a given capture name. */
  captureIndexForName(captureName) {
    return this.captureNames.indexOf(captureName);
  }
  /** Check if a given pattern within a query has a single root node. */
  isPatternRooted(patternIndex) {
    return C._ts_query_is_pattern_rooted(this[0], patternIndex) === 1;
  }
  /** Check if a given pattern within a query has a single root node. */
  isPatternNonLocal(patternIndex) {
    return C._ts_query_is_pattern_non_local(this[0], patternIndex) === 1;
  }
  /**
   * Check if a given step in a query is 'definite'.
   *
   * A query step is 'definite' if its parent pattern will be guaranteed to
   * match successfully once it reaches the step.
   */
  isPatternGuaranteedAtStep(byteIndex) {
    return C._ts_query_is_pattern_guaranteed_at_step(this[0], byteIndex) === 1;
  }
};

// src/ast-parser.ts
var treeSitterInitialized = false;
function parseAll(content, filePath, language) {
  const ext = path.extname(filePath).toLowerCase();
  const handler = languageRegistry.getHandlerByExtension(ext);
  if (!handler) {
    return {
      imports: [],
      functions: [],
      catchBlocks: [],
      comments: [],
      literals: [],
      status: "unsupported"
    };
  }
  if (!handler.isInitialized()) {
    return {
      imports: [],
      functions: [],
      catchBlocks: [],
      comments: [],
      literals: [],
      status: "error"
    };
  }
  try {
    return handler.extractAll(content, filePath);
  } catch (error) {
    console.error(`AST parse error for ${filePath}:`, error);
    return {
      imports: [],
      functions: [],
      catchBlocks: [],
      comments: [],
      literals: [],
      status: "error"
    };
  }
}
async function initializeParser(wasmDir) {
  if (!treeSitterInitialized) {
    const wasmPath = path.join(wasmDir, "web-tree-sitter.wasm");
    const wasmBinary2 = fs2.readFileSync(wasmPath);
    await Parser.init({
      wasmBinary: wasmBinary2
    });
    treeSitterInitialized = true;
  }
  await languageRegistry.initializeAll(wasmDir);
}

// src/language-handlers/typescript-handler.ts
init_esbuild_shim();
var path2 = __toESM(require("path"));

// src/language-handlers/base-handler.ts
init_esbuild_shim();
var BaseLanguageHandler = class {
  constructor() {
    this.initialized = false;
  }
  isInitialized() {
    return this.initialized;
  }
};

// src/language-handlers/typescript-extractors.ts
init_esbuild_shim();

// src/language-handlers/typescript/import-extractor.ts
init_esbuild_shim();
function extractImportsFromTree(root, lines) {
  const imports = [];
  walkForImports(root, imports, lines);
  return imports;
}
function walkForImports(node, imports, lines) {
  if (node.type === "import_statement") {
    const source = node.childForFieldName("source");
    if (source) {
      const modulePath = extractStringContent(source.text);
      if (modulePath) {
        imports.push({
          modulePath,
          line: node.startPosition.row + 1,
          code: lines[node.startPosition.row]?.trim() || ""
        });
      }
    }
  }
  if (node.type === "export_statement") {
    const source = node.childForFieldName("source");
    if (source) {
      const modulePath = extractStringContent(source.text);
      if (modulePath) {
        imports.push({
          modulePath,
          line: node.startPosition.row + 1,
          code: lines[node.startPosition.row]?.trim() || ""
        });
      }
    }
  }
  if (node.type === "call_expression") {
    const func2 = node.childForFieldName("function");
    if (func2?.text === "require" || func2?.type === "import") {
      const args2 = node.childForFieldName("arguments");
      if (args2 && args2.childCount > 0) {
        const firstArg = args2.child(1);
        if (firstArg && firstArg.type === "string") {
          const modulePath = extractStringContent(firstArg.text);
          if (modulePath) {
            imports.push({
              modulePath,
              line: node.startPosition.row + 1,
              code: lines[node.startPosition.row]?.trim() || ""
            });
          }
        }
      }
    }
  }
  for (let i2 = 0; i2 < node.childCount; i2++) {
    const child = node.child(i2);
    if (child) walkForImports(child, imports, lines);
  }
}
function extractStringContent(text) {
  if (text.startsWith("'") && text.endsWith("'")) return text.slice(1, -1);
  if (text.startsWith('"') && text.endsWith('"')) return text.slice(1, -1);
  if (text.startsWith("`") && text.endsWith("`")) return text.slice(1, -1);
  return null;
}

// src/language-handlers/typescript/function-extractor.ts
init_esbuild_shim();
var NESTING_NODE_TYPES = /* @__PURE__ */ new Set([
  "if_statement",
  "for_statement",
  "for_in_statement",
  "while_statement",
  "do_statement",
  "switch_statement",
  "try_statement"
]);
function extractFunctionsFromTree(root) {
  const functions = [];
  walkForFunctions(root, functions, 0);
  return functions;
}
function walkForFunctions(node, functions, currentDepth) {
  const funcInfo = tryExtractFunction(node);
  if (funcInfo) {
    funcInfo.maxNestingDepth = calculateMaxNesting(node, 0);
    functions.push(funcInfo);
  }
  const newDepth = NESTING_NODE_TYPES.has(node.type) ? currentDepth + 1 : currentDepth;
  for (let i2 = 0; i2 < node.childCount; i2++) {
    const child = node.child(i2);
    if (child) walkForFunctions(child, functions, newDepth);
  }
}
function tryExtractFunction(node) {
  if (node.type === "function_declaration") {
    const name2 = node.childForFieldName("name")?.text || "anonymous";
    const params = node.childForFieldName("parameters");
    return {
      name: name2,
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
      loc: node.endPosition.row - node.startPosition.row + 1,
      maxNestingDepth: 0,
      parameterCount: countParameters(params)
    };
  }
  if (node.type === "method_definition") {
    const name2 = node.childForFieldName("name")?.text || "anonymous";
    const params = node.childForFieldName("parameters");
    return {
      name: name2,
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
      loc: node.endPosition.row - node.startPosition.row + 1,
      maxNestingDepth: 0,
      parameterCount: countParameters(params)
    };
  }
  if (node.type === "arrow_function") {
    const parent = node.parent;
    let name2 = "anonymous";
    if (parent?.type === "variable_declarator") {
      name2 = parent.childForFieldName("name")?.text || "anonymous";
    } else if (parent?.type === "pair") {
      name2 = parent.childForFieldName("key")?.text || "anonymous";
    }
    const params = node.childForFieldName("parameters");
    return {
      name: name2,
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
      loc: node.endPosition.row - node.startPosition.row + 1,
      maxNestingDepth: 0,
      parameterCount: countParameters(params)
    };
  }
  return null;
}
function countParameters(paramsNode) {
  if (!paramsNode) return 0;
  let count = 0;
  for (let i2 = 0; i2 < paramsNode.childCount; i2++) {
    const child = paramsNode.child(i2);
    if (child && (child.type === "identifier" || child.type === "required_parameter" || child.type === "optional_parameter" || child.type === "rest_pattern")) {
      count++;
    }
  }
  return count;
}
function calculateMaxNesting(node, currentDepth) {
  let maxDepth = currentDepth;
  const newDepth = NESTING_NODE_TYPES.has(node.type) ? currentDepth + 1 : currentDepth;
  for (let i2 = 0; i2 < node.childCount; i2++) {
    const child = node.child(i2);
    if (child) {
      const childMax = calculateMaxNesting(child, newDepth);
      if (childMax > maxDepth) maxDepth = childMax;
    }
  }
  return maxDepth;
}

// src/language-handlers/typescript/annotation-extractors.ts
init_esbuild_shim();
function extractCatchBlocksFromTree(root) {
  const catches = [];
  walkForCatches(root, catches);
  return catches;
}
function walkForCatches(node, catches) {
  if (node.type === "catch_clause") {
    const body2 = node.childForFieldName("body");
    const isEmpty = !body2 || body2.childCount <= 2;
    catches.push({
      line: node.startPosition.row + 1,
      isEmpty
    });
  }
  for (let i2 = 0; i2 < node.childCount; i2++) {
    const child = node.child(i2);
    if (child) walkForCatches(child, catches);
  }
}
function extractCommentsFromTree(root) {
  const comments = [];
  walkForComments(root, comments);
  return comments;
}
function walkForComments(node, comments) {
  if (node.type === "comment") {
    const text = node.text;
    const isBlockComment = text.startsWith("/*");
    comments.push({
      line: node.startPosition.row + 1,
      text,
      isBlockComment
    });
  }
  for (let i2 = 0; i2 < node.childCount; i2++) {
    const child = node.child(i2);
    if (child) walkForComments(child, comments);
  }
}
function extractLiteralsFromTree(root) {
  const literals = [];
  walkForLiterals(root, literals);
  return literals;
}
function walkForLiterals(node, literals) {
  if (node.type === "number") {
    const value = parseFloat(node.text);
    if (!isNaN(value)) {
      literals.push({
        line: node.startPosition.row + 1,
        value,
        context: determineContext(node)
      });
    }
  }
  for (let i2 = 0; i2 < node.childCount; i2++) {
    const child = node.child(i2);
    if (child) walkForLiterals(child, literals);
  }
}
function determineContext(node) {
  const parent = node.parent;
  if (!parent) return "standalone";
  if (parent.type === "subscript_expression") {
    return "array-index";
  }
  if (parent.type === "binary_expression") {
    const op = parent.childForFieldName("operator")?.text;
    if (op && ["===", "!==", "==", "!=", "<", ">", "<=", ">="].includes(op)) {
      return "comparison";
    }
  }
  if (parent.type === "variable_declarator" || parent.type === "assignment_expression") {
    return "assignment";
  }
  return "other";
}

// src/language-handlers/typescript-handler.ts
var TypeScriptHandler = class extends BaseLanguageHandler {
  constructor() {
    super(...arguments);
    this.languageIds = ["TypeScript", "JavaScript"];
    this.extensions = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".mts", ".cts"];
    this.parser = null;
    this.tsLanguage = null;
    this.tsxLanguage = null;
  }
  async initialize(wasmDir) {
    if (this.initialized) return;
    this.parser = new Parser();
    this.tsLanguage = await Language.load(
      path2.join(wasmDir, "tree-sitter-typescript.wasm")
    );
    this.tsxLanguage = await Language.load(
      path2.join(wasmDir, "tree-sitter-tsx.wasm")
    );
    this.initialized = true;
  }
  parseContent(content, filePath) {
    if (!this.parser || !this.tsLanguage || !this.tsxLanguage) return null;
    const ext = path2.extname(filePath).toLowerCase();
    const isTsx = ext === ".tsx" || ext === ".jsx";
    this.parser.setLanguage(isTsx ? this.tsxLanguage : this.tsLanguage);
    return this.parser.parse(content);
  }
  extractImports(content, filePath) {
    const tree = this.parseContent(content, filePath);
    if (!tree) return [];
    const lines = content.split("\n");
    return extractImportsFromTree(tree.rootNode, lines);
  }
  extractFunctions(content, filePath) {
    const tree = this.parseContent(content, filePath);
    if (!tree) return [];
    return extractFunctionsFromTree(tree.rootNode);
  }
  extractCatchBlocks(content, filePath) {
    const tree = this.parseContent(content, filePath);
    if (!tree) return [];
    return extractCatchBlocksFromTree(tree.rootNode);
  }
  extractComments(content, filePath) {
    const tree = this.parseContent(content, filePath);
    if (!tree) return [];
    return extractCommentsFromTree(tree.rootNode);
  }
  extractLiterals(content, filePath) {
    const tree = this.parseContent(content, filePath);
    if (!tree) return [];
    return extractLiteralsFromTree(tree.rootNode);
  }
  extractAll(content, filePath) {
    const tree = this.parseContent(content, filePath);
    if (!tree) {
      return {
        imports: [],
        functions: [],
        catchBlocks: [],
        comments: [],
        literals: [],
        status: "error"
      };
    }
    const lines = content.split("\n");
    return {
      imports: extractImportsFromTree(tree.rootNode, lines),
      functions: extractFunctionsFromTree(tree.rootNode),
      catchBlocks: extractCatchBlocksFromTree(tree.rootNode),
      comments: extractCommentsFromTree(tree.rootNode),
      literals: extractLiteralsFromTree(tree.rootNode),
      status: "parsed"
    };
  }
};

// src/language-handlers/lua-handler.ts
init_esbuild_shim();
var path3 = __toESM(require("path"));
var NESTING_NODE_TYPES2 = /* @__PURE__ */ new Set([
  "if_statement",
  "for_statement",
  "for_in_statement",
  "while_statement",
  "repeat_statement"
]);
var LuaHandler = class extends BaseLanguageHandler {
  constructor() {
    super(...arguments);
    this.languageIds = ["Lua"];
    this.extensions = [".lua"];
    this.parser = null;
    this.luaLanguage = null;
  }
  async initialize(wasmDir) {
    if (this.initialized) return;
    this.parser = new Parser();
    const luaWasmPath = path3.join(wasmDir, "tree-sitter-lua.wasm");
    this.luaLanguage = await Language.load(luaWasmPath);
    this.initialized = true;
  }
  parseContent(content) {
    if (!this.parser || !this.luaLanguage) return null;
    this.parser.setLanguage(this.luaLanguage);
    return this.parser.parse(content);
  }
  extractImports(content, filePath) {
    const tree = this.parseContent(content);
    if (!tree) return [];
    const imports = [];
    const lines = content.split("\n");
    this.walkForImports(tree.rootNode, imports, lines);
    return imports;
  }
  walkForImports(node, imports, lines) {
    if (node.type === "function_call") {
      const nameNode = node.childForFieldName("name");
      if (nameNode && nameNode.text === "require") {
        const argsNode = node.childForFieldName("arguments");
        if (argsNode) {
          for (let i2 = 0; i2 < argsNode.childCount; i2++) {
            const child = argsNode.child(i2);
            if (child && child.type === "string") {
              const raw = child.text;
              const lineNum = node.startPosition.row + 1;
              let modulePath;
              if (raw.startsWith("[[") && raw.endsWith("]]")) {
                modulePath = raw.slice(2, -2);
              } else if (raw.length >= 2) {
                modulePath = raw.slice(1, -1);
              } else {
                continue;
              }
              imports.push({
                modulePath,
                line: lineNum,
                code: lines[lineNum - 1]?.trim() || ""
              });
            }
          }
        }
      }
    }
    for (let i2 = 0; i2 < node.childCount; i2++) {
      const child = node.child(i2);
      if (child) this.walkForImports(child, imports, lines);
    }
  }
  extractFunctions(content, filePath) {
    const tree = this.parseContent(content);
    if (!tree) return [];
    const functions = [];
    this.walkForFunctions(tree.rootNode, functions);
    return functions;
  }
  walkForFunctions(node, functions) {
    if (node.type === "function_declaration" || node.type === "function_definition") {
      const name2 = this.extractFunctionName(node);
      const params = node.childForFieldName("parameters");
      functions.push({
        name: name2,
        startLine: node.startPosition.row + 1,
        endLine: node.endPosition.row + 1,
        loc: node.endPosition.row - node.startPosition.row + 1,
        maxNestingDepth: this.calculateMaxNesting(node, 0),
        parameterCount: this.countParameters(params)
      });
    }
    for (let i2 = 0; i2 < node.childCount; i2++) {
      const child = node.child(i2);
      if (child) this.walkForFunctions(child, functions);
    }
  }
  extractFunctionName(node) {
    const nameNode = node.childForFieldName("name");
    if (nameNode) return nameNode.text;
    const parent = node.parent;
    if (parent?.type === "assignment_statement") {
      const varList = parent.childForFieldName("variables");
      if (varList && varList.childCount > 0) {
        return varList.child(0)?.text || "anonymous";
      }
    }
    return "anonymous";
  }
  countParameters(paramsNode) {
    if (!paramsNode) return 0;
    let count = 0;
    for (let i2 = 0; i2 < paramsNode.childCount; i2++) {
      const child = paramsNode.child(i2);
      if (child && child.type === "identifier") count++;
    }
    return count;
  }
  calculateMaxNesting(node, currentDepth) {
    let maxDepth = currentDepth;
    const newDepth = NESTING_NODE_TYPES2.has(node.type) ? currentDepth + 1 : currentDepth;
    for (let i2 = 0; i2 < node.childCount; i2++) {
      const child = node.child(i2);
      if (child) {
        const childMax = this.calculateMaxNesting(child, newDepth);
        if (childMax > maxDepth) maxDepth = childMax;
      }
    }
    return maxDepth;
  }
  extractCatchBlocks(content, filePath) {
    return [];
  }
  extractComments(content, filePath) {
    const tree = this.parseContent(content);
    if (!tree) return [];
    const comments = [];
    this.walkForComments(tree.rootNode, comments);
    return comments;
  }
  walkForComments(node, comments) {
    if (node.type === "comment") {
      const text = node.text;
      const isBlockComment = text.startsWith("--[[");
      comments.push({
        line: node.startPosition.row + 1,
        text,
        isBlockComment
      });
    }
    for (let i2 = 0; i2 < node.childCount; i2++) {
      const child = node.child(i2);
      if (child) this.walkForComments(child, comments);
    }
  }
  extractLiterals(content, filePath) {
    const tree = this.parseContent(content);
    if (!tree) return [];
    const literals = [];
    this.walkForLiterals(tree.rootNode, literals);
    return literals;
  }
  walkForLiterals(node, literals) {
    if (node.type === "number") {
      const value = parseFloat(node.text);
      if (!isNaN(value)) {
        literals.push({
          line: node.startPosition.row + 1,
          value,
          context: this.determineContext(node)
        });
      }
    }
    for (let i2 = 0; i2 < node.childCount; i2++) {
      const child = node.child(i2);
      if (child) this.walkForLiterals(child, literals);
    }
  }
  determineContext(node) {
    const parent = node.parent;
    if (!parent) return "standalone";
    if (parent.type === "bracket_index_expression") return "array-index";
    if (parent.type === "binary_expression") {
      const op = parent.child(1)?.text;
      if (op && ["==", "~=", "<", ">", "<=", ">="].includes(op)) {
        return "comparison";
      }
    }
    if (parent.type === "assignment_statement") return "assignment";
    return "other";
  }
  extractAll(content, filePath) {
    const tree = this.parseContent(content);
    if (!tree) {
      return {
        imports: [],
        functions: [],
        catchBlocks: [],
        comments: [],
        literals: [],
        status: "error"
      };
    }
    const lines = content.split("\n");
    const imports = [];
    const functions = [];
    const comments = [];
    const literals = [];
    this.walkForImports(tree.rootNode, imports, lines);
    this.walkForFunctions(tree.rootNode, functions);
    this.walkForComments(tree.rootNode, comments);
    this.walkForLiterals(tree.rootNode, literals);
    return {
      imports,
      functions,
      catchBlocks: [],
      // Lua uses pcall/xpcall
      comments,
      literals,
      status: "parsed"
    };
  }
};

// src/dashboard-panel.ts
init_esbuild_shim();
var vscode6 = __toESM(require("vscode"));
var fs5 = __toESM(require("fs"));
var path13 = __toESM(require("path"));

// node_modules/@anthropic-ai/sdk/index.mjs
init_esbuild_shim();

// node_modules/@anthropic-ai/sdk/client.mjs
init_esbuild_shim();

// node_modules/@anthropic-ai/sdk/internal/tslib.mjs
init_esbuild_shim();
function __classPrivateFieldSet(receiver, state, value, kind, f) {
  if (kind === "m")
    throw new TypeError("Private method is not writable");
  if (kind === "a" && !f)
    throw new TypeError("Private accessor was defined without a setter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
    throw new TypeError("Cannot write private member to an object whose class did not declare it");
  return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
}
function __classPrivateFieldGet(receiver, state, kind, f) {
  if (kind === "a" && !f)
    throw new TypeError("Private accessor was defined without a getter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
    throw new TypeError("Cannot read private member from an object whose class did not declare it");
  return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
}

// node_modules/@anthropic-ai/sdk/internal/utils/uuid.mjs
init_esbuild_shim();
var uuid4 = function() {
  const { crypto } = globalThis;
  if (crypto?.randomUUID) {
    uuid4 = crypto.randomUUID.bind(crypto);
    return crypto.randomUUID();
  }
  const u8 = new Uint8Array(1);
  const randomByte = crypto ? () => crypto.getRandomValues(u8)[0] : () => Math.random() * 255 & 255;
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (+c ^ randomByte() & 15 >> +c / 4).toString(16));
};

// node_modules/@anthropic-ai/sdk/internal/utils/values.mjs
init_esbuild_shim();

// node_modules/@anthropic-ai/sdk/core/error.mjs
init_esbuild_shim();

// node_modules/@anthropic-ai/sdk/internal/errors.mjs
init_esbuild_shim();
function isAbortError(err2) {
  return typeof err2 === "object" && err2 !== null && // Spec-compliant fetch implementations
  ("name" in err2 && err2.name === "AbortError" || // Expo fetch
  "message" in err2 && String(err2.message).includes("FetchRequestCanceledException"));
}
var castToError = (err2) => {
  if (err2 instanceof Error)
    return err2;
  if (typeof err2 === "object" && err2 !== null) {
    try {
      if (Object.prototype.toString.call(err2) === "[object Error]") {
        const error = new Error(err2.message, err2.cause ? { cause: err2.cause } : {});
        if (err2.stack)
          error.stack = err2.stack;
        if (err2.cause && !error.cause)
          error.cause = err2.cause;
        if (err2.name)
          error.name = err2.name;
        return error;
      }
    } catch {
    }
    try {
      return new Error(JSON.stringify(err2));
    } catch {
    }
  }
  return new Error(err2);
};

// node_modules/@anthropic-ai/sdk/core/error.mjs
var AnthropicError = class extends Error {
};
var APIError = class _APIError extends AnthropicError {
  constructor(status, error, message, headers) {
    super(`${_APIError.makeMessage(status, error, message)}`);
    this.status = status;
    this.headers = headers;
    this.requestID = headers?.get("request-id");
    this.error = error;
  }
  static makeMessage(status, error, message) {
    const msg = error?.message ? typeof error.message === "string" ? error.message : JSON.stringify(error.message) : error ? JSON.stringify(error) : message;
    if (status && msg) {
      return `${status} ${msg}`;
    }
    if (status) {
      return `${status} status code (no body)`;
    }
    if (msg) {
      return msg;
    }
    return "(no status code or body)";
  }
  static generate(status, errorResponse, message, headers) {
    if (!status || !headers) {
      return new APIConnectionError({ message, cause: castToError(errorResponse) });
    }
    const error = errorResponse;
    if (status === 400) {
      return new BadRequestError(status, error, message, headers);
    }
    if (status === 401) {
      return new AuthenticationError(status, error, message, headers);
    }
    if (status === 403) {
      return new PermissionDeniedError(status, error, message, headers);
    }
    if (status === 404) {
      return new NotFoundError(status, error, message, headers);
    }
    if (status === 409) {
      return new ConflictError(status, error, message, headers);
    }
    if (status === 422) {
      return new UnprocessableEntityError(status, error, message, headers);
    }
    if (status === 429) {
      return new RateLimitError(status, error, message, headers);
    }
    if (status >= 500) {
      return new InternalServerError(status, error, message, headers);
    }
    return new _APIError(status, error, message, headers);
  }
};
var APIUserAbortError = class extends APIError {
  constructor({ message } = {}) {
    super(void 0, void 0, message || "Request was aborted.", void 0);
  }
};
var APIConnectionError = class extends APIError {
  constructor({ message, cause }) {
    super(void 0, void 0, message || "Connection error.", void 0);
    if (cause)
      this.cause = cause;
  }
};
var APIConnectionTimeoutError = class extends APIConnectionError {
  constructor({ message } = {}) {
    super({ message: message ?? "Request timed out." });
  }
};
var BadRequestError = class extends APIError {
};
var AuthenticationError = class extends APIError {
};
var PermissionDeniedError = class extends APIError {
};
var NotFoundError = class extends APIError {
};
var ConflictError = class extends APIError {
};
var UnprocessableEntityError = class extends APIError {
};
var RateLimitError = class extends APIError {
};
var InternalServerError = class extends APIError {
};

// node_modules/@anthropic-ai/sdk/internal/utils/values.mjs
var startsWithSchemeRegexp = /^[a-z][a-z0-9+.-]*:/i;
var isAbsoluteURL = (url) => {
  return startsWithSchemeRegexp.test(url);
};
var isArray = (val) => (isArray = Array.isArray, isArray(val));
var isReadonlyArray = isArray;
function maybeObj(x) {
  if (typeof x !== "object") {
    return {};
  }
  return x ?? {};
}
function isEmptyObj(obj) {
  if (!obj)
    return true;
  for (const _k in obj)
    return false;
  return true;
}
function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}
var validatePositiveInteger = (name2, n) => {
  if (typeof n !== "number" || !Number.isInteger(n)) {
    throw new AnthropicError(`${name2} must be an integer`);
  }
  if (n < 0) {
    throw new AnthropicError(`${name2} must be a positive integer`);
  }
  return n;
};
var safeJSON = (text) => {
  try {
    return JSON.parse(text);
  } catch (err2) {
    return void 0;
  }
};

// node_modules/@anthropic-ai/sdk/internal/utils/sleep.mjs
init_esbuild_shim();
var sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// node_modules/@anthropic-ai/sdk/internal/detect-platform.mjs
init_esbuild_shim();

// node_modules/@anthropic-ai/sdk/version.mjs
init_esbuild_shim();
var VERSION = "0.71.2";

// node_modules/@anthropic-ai/sdk/internal/detect-platform.mjs
var isRunningInBrowser = () => {
  return (
    // @ts-ignore
    typeof window !== "undefined" && // @ts-ignore
    typeof window.document !== "undefined" && // @ts-ignore
    typeof navigator !== "undefined"
  );
};
function getDetectedPlatform() {
  if (typeof Deno !== "undefined" && Deno.build != null) {
    return "deno";
  }
  if (typeof EdgeRuntime !== "undefined") {
    return "edge";
  }
  if (Object.prototype.toString.call(typeof globalThis.process !== "undefined" ? globalThis.process : 0) === "[object process]") {
    return "node";
  }
  return "unknown";
}
var getPlatformProperties = () => {
  const detectedPlatform = getDetectedPlatform();
  if (detectedPlatform === "deno") {
    return {
      "X-Stainless-Lang": "js",
      "X-Stainless-Package-Version": VERSION,
      "X-Stainless-OS": normalizePlatform(Deno.build.os),
      "X-Stainless-Arch": normalizeArch(Deno.build.arch),
      "X-Stainless-Runtime": "deno",
      "X-Stainless-Runtime-Version": typeof Deno.version === "string" ? Deno.version : Deno.version?.deno ?? "unknown"
    };
  }
  if (typeof EdgeRuntime !== "undefined") {
    return {
      "X-Stainless-Lang": "js",
      "X-Stainless-Package-Version": VERSION,
      "X-Stainless-OS": "Unknown",
      "X-Stainless-Arch": `other:${EdgeRuntime}`,
      "X-Stainless-Runtime": "edge",
      "X-Stainless-Runtime-Version": globalThis.process.version
    };
  }
  if (detectedPlatform === "node") {
    return {
      "X-Stainless-Lang": "js",
      "X-Stainless-Package-Version": VERSION,
      "X-Stainless-OS": normalizePlatform(globalThis.process.platform ?? "unknown"),
      "X-Stainless-Arch": normalizeArch(globalThis.process.arch ?? "unknown"),
      "X-Stainless-Runtime": "node",
      "X-Stainless-Runtime-Version": globalThis.process.version ?? "unknown"
    };
  }
  const browserInfo = getBrowserInfo();
  if (browserInfo) {
    return {
      "X-Stainless-Lang": "js",
      "X-Stainless-Package-Version": VERSION,
      "X-Stainless-OS": "Unknown",
      "X-Stainless-Arch": "unknown",
      "X-Stainless-Runtime": `browser:${browserInfo.browser}`,
      "X-Stainless-Runtime-Version": browserInfo.version
    };
  }
  return {
    "X-Stainless-Lang": "js",
    "X-Stainless-Package-Version": VERSION,
    "X-Stainless-OS": "Unknown",
    "X-Stainless-Arch": "unknown",
    "X-Stainless-Runtime": "unknown",
    "X-Stainless-Runtime-Version": "unknown"
  };
};
function getBrowserInfo() {
  if (typeof navigator === "undefined" || !navigator) {
    return null;
  }
  const browserPatterns = [
    { key: "edge", pattern: /Edge(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/ },
    { key: "ie", pattern: /MSIE(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/ },
    { key: "ie", pattern: /Trident(?:.*rv\:(\d+)\.(\d+)(?:\.(\d+))?)?/ },
    { key: "chrome", pattern: /Chrome(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/ },
    { key: "firefox", pattern: /Firefox(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/ },
    { key: "safari", pattern: /(?:Version\W+(\d+)\.(\d+)(?:\.(\d+))?)?(?:\W+Mobile\S*)?\W+Safari/ }
  ];
  for (const { key, pattern } of browserPatterns) {
    const match = pattern.exec(navigator.userAgent);
    if (match) {
      const major = match[1] || 0;
      const minor = match[2] || 0;
      const patch = match[3] || 0;
      return { browser: key, version: `${major}.${minor}.${patch}` };
    }
  }
  return null;
}
var normalizeArch = (arch) => {
  if (arch === "x32")
    return "x32";
  if (arch === "x86_64" || arch === "x64")
    return "x64";
  if (arch === "arm")
    return "arm";
  if (arch === "aarch64" || arch === "arm64")
    return "arm64";
  if (arch)
    return `other:${arch}`;
  return "unknown";
};
var normalizePlatform = (platform) => {
  platform = platform.toLowerCase();
  if (platform.includes("ios"))
    return "iOS";
  if (platform === "android")
    return "Android";
  if (platform === "darwin")
    return "MacOS";
  if (platform === "win32")
    return "Windows";
  if (platform === "freebsd")
    return "FreeBSD";
  if (platform === "openbsd")
    return "OpenBSD";
  if (platform === "linux")
    return "Linux";
  if (platform)
    return `Other:${platform}`;
  return "Unknown";
};
var _platformHeaders;
var getPlatformHeaders = () => {
  return _platformHeaders ?? (_platformHeaders = getPlatformProperties());
};

// node_modules/@anthropic-ai/sdk/internal/shims.mjs
init_esbuild_shim();
function getDefaultFetch() {
  if (typeof fetch !== "undefined") {
    return fetch;
  }
  throw new Error("`fetch` is not defined as a global; Either pass `fetch` to the client, `new Anthropic({ fetch })` or polyfill the global, `globalThis.fetch = fetch`");
}
function makeReadableStream(...args2) {
  const ReadableStream = globalThis.ReadableStream;
  if (typeof ReadableStream === "undefined") {
    throw new Error("`ReadableStream` is not defined as a global; You will need to polyfill it, `globalThis.ReadableStream = ReadableStream`");
  }
  return new ReadableStream(...args2);
}
function ReadableStreamFrom(iterable) {
  let iter = Symbol.asyncIterator in iterable ? iterable[Symbol.asyncIterator]() : iterable[Symbol.iterator]();
  return makeReadableStream({
    start() {
    },
    async pull(controller) {
      const { done, value } = await iter.next();
      if (done) {
        controller.close();
      } else {
        controller.enqueue(value);
      }
    },
    async cancel() {
      await iter.return?.();
    }
  });
}
function ReadableStreamToAsyncIterable(stream) {
  if (stream[Symbol.asyncIterator])
    return stream;
  const reader = stream.getReader();
  return {
    async next() {
      try {
        const result = await reader.read();
        if (result?.done)
          reader.releaseLock();
        return result;
      } catch (e) {
        reader.releaseLock();
        throw e;
      }
    },
    async return() {
      const cancelPromise = reader.cancel();
      reader.releaseLock();
      await cancelPromise;
      return { done: true, value: void 0 };
    },
    [Symbol.asyncIterator]() {
      return this;
    }
  };
}
async function CancelReadableStream(stream) {
  if (stream === null || typeof stream !== "object")
    return;
  if (stream[Symbol.asyncIterator]) {
    await stream[Symbol.asyncIterator]().return?.();
    return;
  }
  const reader = stream.getReader();
  const cancelPromise = reader.cancel();
  reader.releaseLock();
  await cancelPromise;
}

// node_modules/@anthropic-ai/sdk/internal/request-options.mjs
init_esbuild_shim();
var FallbackEncoder = ({ headers, body: body2 }) => {
  return {
    bodyHeaders: {
      "content-type": "application/json"
    },
    body: JSON.stringify(body2)
  };
};

// node_modules/@anthropic-ai/sdk/core/pagination.mjs
init_esbuild_shim();

// node_modules/@anthropic-ai/sdk/internal/parse.mjs
init_esbuild_shim();

// node_modules/@anthropic-ai/sdk/core/streaming.mjs
init_esbuild_shim();

// node_modules/@anthropic-ai/sdk/internal/decoders/line.mjs
init_esbuild_shim();

// node_modules/@anthropic-ai/sdk/internal/utils/bytes.mjs
init_esbuild_shim();
function concatBytes(buffers) {
  let length = 0;
  for (const buffer of buffers) {
    length += buffer.length;
  }
  const output = new Uint8Array(length);
  let index = 0;
  for (const buffer of buffers) {
    output.set(buffer, index);
    index += buffer.length;
  }
  return output;
}
var encodeUTF8_;
function encodeUTF8(str) {
  let encoder;
  return (encodeUTF8_ ?? (encoder = new globalThis.TextEncoder(), encodeUTF8_ = encoder.encode.bind(encoder)))(str);
}
var decodeUTF8_;
function decodeUTF8(bytes) {
  let decoder;
  return (decodeUTF8_ ?? (decoder = new globalThis.TextDecoder(), decodeUTF8_ = decoder.decode.bind(decoder)))(bytes);
}

// node_modules/@anthropic-ai/sdk/internal/decoders/line.mjs
var _LineDecoder_buffer;
var _LineDecoder_carriageReturnIndex;
var LineDecoder = class {
  constructor() {
    _LineDecoder_buffer.set(this, void 0);
    _LineDecoder_carriageReturnIndex.set(this, void 0);
    __classPrivateFieldSet(this, _LineDecoder_buffer, new Uint8Array(), "f");
    __classPrivateFieldSet(this, _LineDecoder_carriageReturnIndex, null, "f");
  }
  decode(chunk) {
    if (chunk == null) {
      return [];
    }
    const binaryChunk = chunk instanceof ArrayBuffer ? new Uint8Array(chunk) : typeof chunk === "string" ? encodeUTF8(chunk) : chunk;
    __classPrivateFieldSet(this, _LineDecoder_buffer, concatBytes([__classPrivateFieldGet(this, _LineDecoder_buffer, "f"), binaryChunk]), "f");
    const lines = [];
    let patternIndex;
    while ((patternIndex = findNewlineIndex(__classPrivateFieldGet(this, _LineDecoder_buffer, "f"), __classPrivateFieldGet(this, _LineDecoder_carriageReturnIndex, "f"))) != null) {
      if (patternIndex.carriage && __classPrivateFieldGet(this, _LineDecoder_carriageReturnIndex, "f") == null) {
        __classPrivateFieldSet(this, _LineDecoder_carriageReturnIndex, patternIndex.index, "f");
        continue;
      }
      if (__classPrivateFieldGet(this, _LineDecoder_carriageReturnIndex, "f") != null && (patternIndex.index !== __classPrivateFieldGet(this, _LineDecoder_carriageReturnIndex, "f") + 1 || patternIndex.carriage)) {
        lines.push(decodeUTF8(__classPrivateFieldGet(this, _LineDecoder_buffer, "f").subarray(0, __classPrivateFieldGet(this, _LineDecoder_carriageReturnIndex, "f") - 1)));
        __classPrivateFieldSet(this, _LineDecoder_buffer, __classPrivateFieldGet(this, _LineDecoder_buffer, "f").subarray(__classPrivateFieldGet(this, _LineDecoder_carriageReturnIndex, "f")), "f");
        __classPrivateFieldSet(this, _LineDecoder_carriageReturnIndex, null, "f");
        continue;
      }
      const endIndex = __classPrivateFieldGet(this, _LineDecoder_carriageReturnIndex, "f") !== null ? patternIndex.preceding - 1 : patternIndex.preceding;
      const line = decodeUTF8(__classPrivateFieldGet(this, _LineDecoder_buffer, "f").subarray(0, endIndex));
      lines.push(line);
      __classPrivateFieldSet(this, _LineDecoder_buffer, __classPrivateFieldGet(this, _LineDecoder_buffer, "f").subarray(patternIndex.index), "f");
      __classPrivateFieldSet(this, _LineDecoder_carriageReturnIndex, null, "f");
    }
    return lines;
  }
  flush() {
    if (!__classPrivateFieldGet(this, _LineDecoder_buffer, "f").length) {
      return [];
    }
    return this.decode("\n");
  }
};
_LineDecoder_buffer = /* @__PURE__ */ new WeakMap(), _LineDecoder_carriageReturnIndex = /* @__PURE__ */ new WeakMap();
LineDecoder.NEWLINE_CHARS = /* @__PURE__ */ new Set(["\n", "\r"]);
LineDecoder.NEWLINE_REGEXP = /\r\n|[\n\r]/g;
function findNewlineIndex(buffer, startIndex) {
  const newline = 10;
  const carriage = 13;
  for (let i2 = startIndex ?? 0; i2 < buffer.length; i2++) {
    if (buffer[i2] === newline) {
      return { preceding: i2, index: i2 + 1, carriage: false };
    }
    if (buffer[i2] === carriage) {
      return { preceding: i2, index: i2 + 1, carriage: true };
    }
  }
  return null;
}
function findDoubleNewlineIndex(buffer) {
  const newline = 10;
  const carriage = 13;
  for (let i2 = 0; i2 < buffer.length - 1; i2++) {
    if (buffer[i2] === newline && buffer[i2 + 1] === newline) {
      return i2 + 2;
    }
    if (buffer[i2] === carriage && buffer[i2 + 1] === carriage) {
      return i2 + 2;
    }
    if (buffer[i2] === carriage && buffer[i2 + 1] === newline && i2 + 3 < buffer.length && buffer[i2 + 2] === carriage && buffer[i2 + 3] === newline) {
      return i2 + 4;
    }
  }
  return -1;
}

// node_modules/@anthropic-ai/sdk/internal/utils/log.mjs
init_esbuild_shim();
var levelNumbers = {
  off: 0,
  error: 200,
  warn: 300,
  info: 400,
  debug: 500
};
var parseLogLevel = (maybeLevel, sourceName, client) => {
  if (!maybeLevel) {
    return void 0;
  }
  if (hasOwn(levelNumbers, maybeLevel)) {
    return maybeLevel;
  }
  loggerFor(client).warn(`${sourceName} was set to ${JSON.stringify(maybeLevel)}, expected one of ${JSON.stringify(Object.keys(levelNumbers))}`);
  return void 0;
};
function noop() {
}
function makeLogFn(fnLevel, logger, logLevel) {
  if (!logger || levelNumbers[fnLevel] > levelNumbers[logLevel]) {
    return noop;
  } else {
    return logger[fnLevel].bind(logger);
  }
}
var noopLogger = {
  error: noop,
  warn: noop,
  info: noop,
  debug: noop
};
var cachedLoggers = /* @__PURE__ */ new WeakMap();
function loggerFor(client) {
  const logger = client.logger;
  const logLevel = client.logLevel ?? "off";
  if (!logger) {
    return noopLogger;
  }
  const cachedLogger = cachedLoggers.get(logger);
  if (cachedLogger && cachedLogger[0] === logLevel) {
    return cachedLogger[1];
  }
  const levelLogger = {
    error: makeLogFn("error", logger, logLevel),
    warn: makeLogFn("warn", logger, logLevel),
    info: makeLogFn("info", logger, logLevel),
    debug: makeLogFn("debug", logger, logLevel)
  };
  cachedLoggers.set(logger, [logLevel, levelLogger]);
  return levelLogger;
}
var formatRequestDetails = (details) => {
  if (details.options) {
    details.options = { ...details.options };
    delete details.options["headers"];
  }
  if (details.headers) {
    details.headers = Object.fromEntries((details.headers instanceof Headers ? [...details.headers] : Object.entries(details.headers)).map(([name2, value]) => [
      name2,
      name2.toLowerCase() === "x-api-key" || name2.toLowerCase() === "authorization" || name2.toLowerCase() === "cookie" || name2.toLowerCase() === "set-cookie" ? "***" : value
    ]));
  }
  if ("retryOfRequestLogID" in details) {
    if (details.retryOfRequestLogID) {
      details.retryOf = details.retryOfRequestLogID;
    }
    delete details.retryOfRequestLogID;
  }
  return details;
};

// node_modules/@anthropic-ai/sdk/core/streaming.mjs
var _Stream_client;
var Stream = class _Stream {
  constructor(iterator, controller, client) {
    this.iterator = iterator;
    _Stream_client.set(this, void 0);
    this.controller = controller;
    __classPrivateFieldSet(this, _Stream_client, client, "f");
  }
  static fromSSEResponse(response, controller, client) {
    let consumed = false;
    const logger = client ? loggerFor(client) : console;
    async function* iterator() {
      if (consumed) {
        throw new AnthropicError("Cannot iterate over a consumed stream, use `.tee()` to split the stream.");
      }
      consumed = true;
      let done = false;
      try {
        for await (const sse of _iterSSEMessages(response, controller)) {
          if (sse.event === "completion") {
            try {
              yield JSON.parse(sse.data);
            } catch (e) {
              logger.error(`Could not parse message into JSON:`, sse.data);
              logger.error(`From chunk:`, sse.raw);
              throw e;
            }
          }
          if (sse.event === "message_start" || sse.event === "message_delta" || sse.event === "message_stop" || sse.event === "content_block_start" || sse.event === "content_block_delta" || sse.event === "content_block_stop") {
            try {
              yield JSON.parse(sse.data);
            } catch (e) {
              logger.error(`Could not parse message into JSON:`, sse.data);
              logger.error(`From chunk:`, sse.raw);
              throw e;
            }
          }
          if (sse.event === "ping") {
            continue;
          }
          if (sse.event === "error") {
            throw new APIError(void 0, safeJSON(sse.data) ?? sse.data, void 0, response.headers);
          }
        }
        done = true;
      } catch (e) {
        if (isAbortError(e))
          return;
        throw e;
      } finally {
        if (!done)
          controller.abort();
      }
    }
    return new _Stream(iterator, controller, client);
  }
  /**
   * Generates a Stream from a newline-separated ReadableStream
   * where each item is a JSON value.
   */
  static fromReadableStream(readableStream, controller, client) {
    let consumed = false;
    async function* iterLines() {
      const lineDecoder = new LineDecoder();
      const iter = ReadableStreamToAsyncIterable(readableStream);
      for await (const chunk of iter) {
        for (const line of lineDecoder.decode(chunk)) {
          yield line;
        }
      }
      for (const line of lineDecoder.flush()) {
        yield line;
      }
    }
    async function* iterator() {
      if (consumed) {
        throw new AnthropicError("Cannot iterate over a consumed stream, use `.tee()` to split the stream.");
      }
      consumed = true;
      let done = false;
      try {
        for await (const line of iterLines()) {
          if (done)
            continue;
          if (line)
            yield JSON.parse(line);
        }
        done = true;
      } catch (e) {
        if (isAbortError(e))
          return;
        throw e;
      } finally {
        if (!done)
          controller.abort();
      }
    }
    return new _Stream(iterator, controller, client);
  }
  [(_Stream_client = /* @__PURE__ */ new WeakMap(), Symbol.asyncIterator)]() {
    return this.iterator();
  }
  /**
   * Splits the stream into two streams which can be
   * independently read from at different speeds.
   */
  tee() {
    const left = [];
    const right = [];
    const iterator = this.iterator();
    const teeIterator = (queue) => {
      return {
        next: () => {
          if (queue.length === 0) {
            const result = iterator.next();
            left.push(result);
            right.push(result);
          }
          return queue.shift();
        }
      };
    };
    return [
      new _Stream(() => teeIterator(left), this.controller, __classPrivateFieldGet(this, _Stream_client, "f")),
      new _Stream(() => teeIterator(right), this.controller, __classPrivateFieldGet(this, _Stream_client, "f"))
    ];
  }
  /**
   * Converts this stream to a newline-separated ReadableStream of
   * JSON stringified values in the stream
   * which can be turned back into a Stream with `Stream.fromReadableStream()`.
   */
  toReadableStream() {
    const self = this;
    let iter;
    return makeReadableStream({
      async start() {
        iter = self[Symbol.asyncIterator]();
      },
      async pull(ctrl) {
        try {
          const { value, done } = await iter.next();
          if (done)
            return ctrl.close();
          const bytes = encodeUTF8(JSON.stringify(value) + "\n");
          ctrl.enqueue(bytes);
        } catch (err2) {
          ctrl.error(err2);
        }
      },
      async cancel() {
        await iter.return?.();
      }
    });
  }
};
async function* _iterSSEMessages(response, controller) {
  if (!response.body) {
    controller.abort();
    if (typeof globalThis.navigator !== "undefined" && globalThis.navigator.product === "ReactNative") {
      throw new AnthropicError(`The default react-native fetch implementation does not support streaming. Please use expo/fetch: https://docs.expo.dev/versions/latest/sdk/expo/#expofetch-api`);
    }
    throw new AnthropicError(`Attempted to iterate over a response with no body`);
  }
  const sseDecoder = new SSEDecoder();
  const lineDecoder = new LineDecoder();
  const iter = ReadableStreamToAsyncIterable(response.body);
  for await (const sseChunk of iterSSEChunks(iter)) {
    for (const line of lineDecoder.decode(sseChunk)) {
      const sse = sseDecoder.decode(line);
      if (sse)
        yield sse;
    }
  }
  for (const line of lineDecoder.flush()) {
    const sse = sseDecoder.decode(line);
    if (sse)
      yield sse;
  }
}
async function* iterSSEChunks(iterator) {
  let data = new Uint8Array();
  for await (const chunk of iterator) {
    if (chunk == null) {
      continue;
    }
    const binaryChunk = chunk instanceof ArrayBuffer ? new Uint8Array(chunk) : typeof chunk === "string" ? encodeUTF8(chunk) : chunk;
    let newData = new Uint8Array(data.length + binaryChunk.length);
    newData.set(data);
    newData.set(binaryChunk, data.length);
    data = newData;
    let patternIndex;
    while ((patternIndex = findDoubleNewlineIndex(data)) !== -1) {
      yield data.slice(0, patternIndex);
      data = data.slice(patternIndex);
    }
  }
  if (data.length > 0) {
    yield data;
  }
}
var SSEDecoder = class {
  constructor() {
    this.event = null;
    this.data = [];
    this.chunks = [];
  }
  decode(line) {
    if (line.endsWith("\r")) {
      line = line.substring(0, line.length - 1);
    }
    if (!line) {
      if (!this.event && !this.data.length)
        return null;
      const sse = {
        event: this.event,
        data: this.data.join("\n"),
        raw: this.chunks
      };
      this.event = null;
      this.data = [];
      this.chunks = [];
      return sse;
    }
    this.chunks.push(line);
    if (line.startsWith(":")) {
      return null;
    }
    let [fieldname, _, value] = partition(line, ":");
    if (value.startsWith(" ")) {
      value = value.substring(1);
    }
    if (fieldname === "event") {
      this.event = value;
    } else if (fieldname === "data") {
      this.data.push(value);
    }
    return null;
  }
};
function partition(str, delimiter) {
  const index = str.indexOf(delimiter);
  if (index !== -1) {
    return [str.substring(0, index), delimiter, str.substring(index + delimiter.length)];
  }
  return [str, "", ""];
}

// node_modules/@anthropic-ai/sdk/internal/parse.mjs
async function defaultParseResponse(client, props) {
  const { response, requestLogID, retryOfRequestLogID, startTime } = props;
  const body2 = await (async () => {
    if (props.options.stream) {
      loggerFor(client).debug("response", response.status, response.url, response.headers, response.body);
      if (props.options.__streamClass) {
        return props.options.__streamClass.fromSSEResponse(response, props.controller);
      }
      return Stream.fromSSEResponse(response, props.controller);
    }
    if (response.status === 204) {
      return null;
    }
    if (props.options.__binaryResponse) {
      return response;
    }
    const contentType = response.headers.get("content-type");
    const mediaType = contentType?.split(";")[0]?.trim();
    const isJSON = mediaType?.includes("application/json") || mediaType?.endsWith("+json");
    if (isJSON) {
      const json = await response.json();
      return addRequestID(json, response);
    }
    const text = await response.text();
    return text;
  })();
  loggerFor(client).debug(`[${requestLogID}] response parsed`, formatRequestDetails({
    retryOfRequestLogID,
    url: response.url,
    status: response.status,
    body: body2,
    durationMs: Date.now() - startTime
  }));
  return body2;
}
function addRequestID(value, response) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }
  return Object.defineProperty(value, "_request_id", {
    value: response.headers.get("request-id"),
    enumerable: false
  });
}

// node_modules/@anthropic-ai/sdk/core/api-promise.mjs
init_esbuild_shim();
var _APIPromise_client;
var APIPromise = class _APIPromise extends Promise {
  constructor(client, responsePromise, parseResponse = defaultParseResponse) {
    super((resolve) => {
      resolve(null);
    });
    this.responsePromise = responsePromise;
    this.parseResponse = parseResponse;
    _APIPromise_client.set(this, void 0);
    __classPrivateFieldSet(this, _APIPromise_client, client, "f");
  }
  _thenUnwrap(transform) {
    return new _APIPromise(__classPrivateFieldGet(this, _APIPromise_client, "f"), this.responsePromise, async (client, props) => addRequestID(transform(await this.parseResponse(client, props), props), props.response));
  }
  /**
   * Gets the raw `Response` instance instead of parsing the response
   * data.
   *
   * If you want to parse the response body but still get the `Response`
   * instance, you can use {@link withResponse()}.
   *
   * 👋 Getting the wrong TypeScript type for `Response`?
   * Try setting `"moduleResolution": "NodeNext"` or add `"lib": ["DOM"]`
   * to your `tsconfig.json`.
   */
  asResponse() {
    return this.responsePromise.then((p) => p.response);
  }
  /**
   * Gets the parsed response data, the raw `Response` instance and the ID of the request,
   * returned via the `request-id` header which is useful for debugging requests and resporting
   * issues to Anthropic.
   *
   * If you just want to get the raw `Response` instance without parsing it,
   * you can use {@link asResponse()}.
   *
   * 👋 Getting the wrong TypeScript type for `Response`?
   * Try setting `"moduleResolution": "NodeNext"` or add `"lib": ["DOM"]`
   * to your `tsconfig.json`.
   */
  async withResponse() {
    const [data, response] = await Promise.all([this.parse(), this.asResponse()]);
    return { data, response, request_id: response.headers.get("request-id") };
  }
  parse() {
    if (!this.parsedPromise) {
      this.parsedPromise = this.responsePromise.then((data) => this.parseResponse(__classPrivateFieldGet(this, _APIPromise_client, "f"), data));
    }
    return this.parsedPromise;
  }
  then(onfulfilled, onrejected) {
    return this.parse().then(onfulfilled, onrejected);
  }
  catch(onrejected) {
    return this.parse().catch(onrejected);
  }
  finally(onfinally) {
    return this.parse().finally(onfinally);
  }
};
_APIPromise_client = /* @__PURE__ */ new WeakMap();

// node_modules/@anthropic-ai/sdk/core/pagination.mjs
var _AbstractPage_client;
var AbstractPage = class {
  constructor(client, response, body2, options) {
    _AbstractPage_client.set(this, void 0);
    __classPrivateFieldSet(this, _AbstractPage_client, client, "f");
    this.options = options;
    this.response = response;
    this.body = body2;
  }
  hasNextPage() {
    const items = this.getPaginatedItems();
    if (!items.length)
      return false;
    return this.nextPageRequestOptions() != null;
  }
  async getNextPage() {
    const nextOptions = this.nextPageRequestOptions();
    if (!nextOptions) {
      throw new AnthropicError("No next page expected; please check `.hasNextPage()` before calling `.getNextPage()`.");
    }
    return await __classPrivateFieldGet(this, _AbstractPage_client, "f").requestAPIList(this.constructor, nextOptions);
  }
  async *iterPages() {
    let page = this;
    yield page;
    while (page.hasNextPage()) {
      page = await page.getNextPage();
      yield page;
    }
  }
  async *[(_AbstractPage_client = /* @__PURE__ */ new WeakMap(), Symbol.asyncIterator)]() {
    for await (const page of this.iterPages()) {
      for (const item of page.getPaginatedItems()) {
        yield item;
      }
    }
  }
};
var PagePromise = class extends APIPromise {
  constructor(client, request, Page2) {
    super(client, request, async (client2, props) => new Page2(client2, props.response, await defaultParseResponse(client2, props), props.options));
  }
  /**
   * Allow auto-paginating iteration on an unawaited list call, eg:
   *
   *    for await (const item of client.items.list()) {
   *      console.log(item)
   *    }
   */
  async *[Symbol.asyncIterator]() {
    const page = await this;
    for await (const item of page) {
      yield item;
    }
  }
};
var Page = class extends AbstractPage {
  constructor(client, response, body2, options) {
    super(client, response, body2, options);
    this.data = body2.data || [];
    this.has_more = body2.has_more || false;
    this.first_id = body2.first_id || null;
    this.last_id = body2.last_id || null;
  }
  getPaginatedItems() {
    return this.data ?? [];
  }
  hasNextPage() {
    if (this.has_more === false) {
      return false;
    }
    return super.hasNextPage();
  }
  nextPageRequestOptions() {
    if (this.options.query?.["before_id"]) {
      const first_id = this.first_id;
      if (!first_id) {
        return null;
      }
      return {
        ...this.options,
        query: {
          ...maybeObj(this.options.query),
          before_id: first_id
        }
      };
    }
    const cursor = this.last_id;
    if (!cursor) {
      return null;
    }
    return {
      ...this.options,
      query: {
        ...maybeObj(this.options.query),
        after_id: cursor
      }
    };
  }
};
var PageCursor = class extends AbstractPage {
  constructor(client, response, body2, options) {
    super(client, response, body2, options);
    this.data = body2.data || [];
    this.has_more = body2.has_more || false;
    this.next_page = body2.next_page || null;
  }
  getPaginatedItems() {
    return this.data ?? [];
  }
  hasNextPage() {
    if (this.has_more === false) {
      return false;
    }
    return super.hasNextPage();
  }
  nextPageRequestOptions() {
    const cursor = this.next_page;
    if (!cursor) {
      return null;
    }
    return {
      ...this.options,
      query: {
        ...maybeObj(this.options.query),
        page: cursor
      }
    };
  }
};

// node_modules/@anthropic-ai/sdk/core/uploads.mjs
init_esbuild_shim();

// node_modules/@anthropic-ai/sdk/internal/to-file.mjs
init_esbuild_shim();

// node_modules/@anthropic-ai/sdk/internal/uploads.mjs
init_esbuild_shim();
var checkFileSupport = () => {
  if (typeof File === "undefined") {
    const { process: process2 } = globalThis;
    const isOldNode = typeof process2?.versions?.node === "string" && parseInt(process2.versions.node.split(".")) < 20;
    throw new Error("`File` is not defined as a global, which is required for file uploads." + (isOldNode ? " Update to Node 20 LTS or newer, or set `globalThis.File` to `import('node:buffer').File`." : ""));
  }
};
function makeFile(fileBits, fileName, options) {
  checkFileSupport();
  return new File(fileBits, fileName ?? "unknown_file", options);
}
function getName(value) {
  return (typeof value === "object" && value !== null && ("name" in value && value.name && String(value.name) || "url" in value && value.url && String(value.url) || "filename" in value && value.filename && String(value.filename) || "path" in value && value.path && String(value.path)) || "").split(/[\\/]/).pop() || void 0;
}
var isAsyncIterable = (value) => value != null && typeof value === "object" && typeof value[Symbol.asyncIterator] === "function";
var multipartFormRequestOptions = async (opts, fetch2) => {
  return { ...opts, body: await createForm(opts.body, fetch2) };
};
var supportsFormDataMap = /* @__PURE__ */ new WeakMap();
function supportsFormData(fetchObject) {
  const fetch2 = typeof fetchObject === "function" ? fetchObject : fetchObject.fetch;
  const cached = supportsFormDataMap.get(fetch2);
  if (cached)
    return cached;
  const promise = (async () => {
    try {
      const FetchResponse = "Response" in fetch2 ? fetch2.Response : (await fetch2("data:,")).constructor;
      const data = new FormData();
      if (data.toString() === await new FetchResponse(data).text()) {
        return false;
      }
      return true;
    } catch {
      return true;
    }
  })();
  supportsFormDataMap.set(fetch2, promise);
  return promise;
}
var createForm = async (body2, fetch2) => {
  if (!await supportsFormData(fetch2)) {
    throw new TypeError("The provided fetch function does not support file uploads with the current global FormData class.");
  }
  const form = new FormData();
  await Promise.all(Object.entries(body2 || {}).map(([key, value]) => addFormValue(form, key, value)));
  return form;
};
var isNamedBlob = (value) => value instanceof Blob && "name" in value;
var addFormValue = async (form, key, value) => {
  if (value === void 0)
    return;
  if (value == null) {
    throw new TypeError(`Received null for "${key}"; to pass null in FormData, you must use the string 'null'`);
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    form.append(key, String(value));
  } else if (value instanceof Response) {
    let options = {};
    const contentType = value.headers.get("Content-Type");
    if (contentType) {
      options = { type: contentType };
    }
    form.append(key, makeFile([await value.blob()], getName(value), options));
  } else if (isAsyncIterable(value)) {
    form.append(key, makeFile([await new Response(ReadableStreamFrom(value)).blob()], getName(value)));
  } else if (isNamedBlob(value)) {
    form.append(key, makeFile([value], getName(value), { type: value.type }));
  } else if (Array.isArray(value)) {
    await Promise.all(value.map((entry) => addFormValue(form, key + "[]", entry)));
  } else if (typeof value === "object") {
    await Promise.all(Object.entries(value).map(([name2, prop]) => addFormValue(form, `${key}[${name2}]`, prop)));
  } else {
    throw new TypeError(`Invalid value given to form, expected a string, number, boolean, object, Array, File or Blob but got ${value} instead`);
  }
};

// node_modules/@anthropic-ai/sdk/internal/to-file.mjs
var isBlobLike = (value) => value != null && typeof value === "object" && typeof value.size === "number" && typeof value.type === "string" && typeof value.text === "function" && typeof value.slice === "function" && typeof value.arrayBuffer === "function";
var isFileLike = (value) => value != null && typeof value === "object" && typeof value.name === "string" && typeof value.lastModified === "number" && isBlobLike(value);
var isResponseLike = (value) => value != null && typeof value === "object" && typeof value.url === "string" && typeof value.blob === "function";
async function toFile(value, name2, options) {
  checkFileSupport();
  value = await value;
  name2 || (name2 = getName(value));
  if (isFileLike(value)) {
    if (value instanceof File && name2 == null && options == null) {
      return value;
    }
    return makeFile([await value.arrayBuffer()], name2 ?? value.name, {
      type: value.type,
      lastModified: value.lastModified,
      ...options
    });
  }
  if (isResponseLike(value)) {
    const blob = await value.blob();
    name2 || (name2 = new URL(value.url).pathname.split(/[\\/]/).pop());
    return makeFile(await getBytes(blob), name2, options);
  }
  const parts2 = await getBytes(value);
  if (!options?.type) {
    const type = parts2.find((part) => typeof part === "object" && "type" in part && part.type);
    if (typeof type === "string") {
      options = { ...options, type };
    }
  }
  return makeFile(parts2, name2, options);
}
async function getBytes(value) {
  let parts2 = [];
  if (typeof value === "string" || ArrayBuffer.isView(value) || // includes Uint8Array, Buffer, etc.
  value instanceof ArrayBuffer) {
    parts2.push(value);
  } else if (isBlobLike(value)) {
    parts2.push(value instanceof Blob ? value : await value.arrayBuffer());
  } else if (isAsyncIterable(value)) {
    for await (const chunk of value) {
      parts2.push(...await getBytes(chunk));
    }
  } else {
    const constructor = value?.constructor?.name;
    throw new Error(`Unexpected data type: ${typeof value}${constructor ? `; constructor: ${constructor}` : ""}${propsForError(value)}`);
  }
  return parts2;
}
function propsForError(value) {
  if (typeof value !== "object" || value === null)
    return "";
  const props = Object.getOwnPropertyNames(value);
  return `; props: [${props.map((p) => `"${p}"`).join(", ")}]`;
}

// node_modules/@anthropic-ai/sdk/resources/index.mjs
init_esbuild_shim();

// node_modules/@anthropic-ai/sdk/resources/shared.mjs
init_esbuild_shim();

// node_modules/@anthropic-ai/sdk/resources/beta/beta.mjs
init_esbuild_shim();

// node_modules/@anthropic-ai/sdk/core/resource.mjs
init_esbuild_shim();
var APIResource = class {
  constructor(client) {
    this._client = client;
  }
};

// node_modules/@anthropic-ai/sdk/resources/beta/files.mjs
init_esbuild_shim();

// node_modules/@anthropic-ai/sdk/internal/headers.mjs
init_esbuild_shim();
var brand_privateNullableHeaders = /* @__PURE__ */ Symbol.for("brand.privateNullableHeaders");
function* iterateHeaders(headers) {
  if (!headers)
    return;
  if (brand_privateNullableHeaders in headers) {
    const { values, nulls } = headers;
    yield* values.entries();
    for (const name2 of nulls) {
      yield [name2, null];
    }
    return;
  }
  let shouldClear = false;
  let iter;
  if (headers instanceof Headers) {
    iter = headers.entries();
  } else if (isReadonlyArray(headers)) {
    iter = headers;
  } else {
    shouldClear = true;
    iter = Object.entries(headers ?? {});
  }
  for (let row of iter) {
    const name2 = row[0];
    if (typeof name2 !== "string")
      throw new TypeError("expected header name to be a string");
    const values = isReadonlyArray(row[1]) ? row[1] : [row[1]];
    let didClear = false;
    for (const value of values) {
      if (value === void 0)
        continue;
      if (shouldClear && !didClear) {
        didClear = true;
        yield [name2, null];
      }
      yield [name2, value];
    }
  }
}
var buildHeaders = (newHeaders) => {
  const targetHeaders = new Headers();
  const nullHeaders = /* @__PURE__ */ new Set();
  for (const headers of newHeaders) {
    const seenHeaders = /* @__PURE__ */ new Set();
    for (const [name2, value] of iterateHeaders(headers)) {
      const lowerName = name2.toLowerCase();
      if (!seenHeaders.has(lowerName)) {
        targetHeaders.delete(name2);
        seenHeaders.add(lowerName);
      }
      if (value === null) {
        targetHeaders.delete(name2);
        nullHeaders.add(lowerName);
      } else {
        targetHeaders.append(name2, value);
        nullHeaders.delete(lowerName);
      }
    }
  }
  return { [brand_privateNullableHeaders]: true, values: targetHeaders, nulls: nullHeaders };
};

// node_modules/@anthropic-ai/sdk/internal/utils/path.mjs
init_esbuild_shim();
function encodeURIPath(str) {
  return str.replace(/[^A-Za-z0-9\-._~!$&'()*+,;=:@]+/g, encodeURIComponent);
}
var EMPTY = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.create(null));
var createPathTagFunction = (pathEncoder = encodeURIPath) => function path15(statics, ...params) {
  if (statics.length === 1)
    return statics[0];
  let postPath = false;
  const invalidSegments = [];
  const path16 = statics.reduce((previousValue, currentValue, index) => {
    if (/[?#]/.test(currentValue)) {
      postPath = true;
    }
    const value = params[index];
    let encoded = (postPath ? encodeURIComponent : pathEncoder)("" + value);
    if (index !== params.length && (value == null || typeof value === "object" && // handle values from other realms
    value.toString === Object.getPrototypeOf(Object.getPrototypeOf(value.hasOwnProperty ?? EMPTY) ?? EMPTY)?.toString)) {
      encoded = value + "";
      invalidSegments.push({
        start: previousValue.length + currentValue.length,
        length: encoded.length,
        error: `Value of type ${Object.prototype.toString.call(value).slice(8, -1)} is not a valid path parameter`
      });
    }
    return previousValue + currentValue + (index === params.length ? "" : encoded);
  }, "");
  const pathOnly = path16.split(/[?#]/, 1)[0];
  const invalidSegmentPattern = /(?<=^|\/)(?:\.|%2e){1,2}(?=\/|$)/gi;
  let match;
  while ((match = invalidSegmentPattern.exec(pathOnly)) !== null) {
    invalidSegments.push({
      start: match.index,
      length: match[0].length,
      error: `Value "${match[0]}" can't be safely passed as a path parameter`
    });
  }
  invalidSegments.sort((a, b) => a.start - b.start);
  if (invalidSegments.length > 0) {
    let lastEnd = 0;
    const underline = invalidSegments.reduce((acc, segment) => {
      const spaces = " ".repeat(segment.start - lastEnd);
      const arrows = "^".repeat(segment.length);
      lastEnd = segment.start + segment.length;
      return acc + spaces + arrows;
    }, "");
    throw new AnthropicError(`Path parameters result in path with invalid segments:
${invalidSegments.map((e) => e.error).join("\n")}
${path16}
${underline}`);
  }
  return path16;
};
var path4 = /* @__PURE__ */ createPathTagFunction(encodeURIPath);

// node_modules/@anthropic-ai/sdk/resources/beta/files.mjs
var Files = class extends APIResource {
  /**
   * List Files
   *
   * @example
   * ```ts
   * // Automatically fetches more pages as needed.
   * for await (const fileMetadata of client.beta.files.list()) {
   *   // ...
   * }
   * ```
   */
  list(params = {}, options) {
    const { betas, ...query } = params ?? {};
    return this._client.getAPIList("/v1/files", Page, {
      query,
      ...options,
      headers: buildHeaders([
        { "anthropic-beta": [...betas ?? [], "files-api-2025-04-14"].toString() },
        options?.headers
      ])
    });
  }
  /**
   * Delete File
   *
   * @example
   * ```ts
   * const deletedFile = await client.beta.files.delete(
   *   'file_id',
   * );
   * ```
   */
  delete(fileID, params = {}, options) {
    const { betas } = params ?? {};
    return this._client.delete(path4`/v1/files/${fileID}`, {
      ...options,
      headers: buildHeaders([
        { "anthropic-beta": [...betas ?? [], "files-api-2025-04-14"].toString() },
        options?.headers
      ])
    });
  }
  /**
   * Download File
   *
   * @example
   * ```ts
   * const response = await client.beta.files.download(
   *   'file_id',
   * );
   *
   * const content = await response.blob();
   * console.log(content);
   * ```
   */
  download(fileID, params = {}, options) {
    const { betas } = params ?? {};
    return this._client.get(path4`/v1/files/${fileID}/content`, {
      ...options,
      headers: buildHeaders([
        {
          "anthropic-beta": [...betas ?? [], "files-api-2025-04-14"].toString(),
          Accept: "application/binary"
        },
        options?.headers
      ]),
      __binaryResponse: true
    });
  }
  /**
   * Get File Metadata
   *
   * @example
   * ```ts
   * const fileMetadata =
   *   await client.beta.files.retrieveMetadata('file_id');
   * ```
   */
  retrieveMetadata(fileID, params = {}, options) {
    const { betas } = params ?? {};
    return this._client.get(path4`/v1/files/${fileID}`, {
      ...options,
      headers: buildHeaders([
        { "anthropic-beta": [...betas ?? [], "files-api-2025-04-14"].toString() },
        options?.headers
      ])
    });
  }
  /**
   * Upload File
   *
   * @example
   * ```ts
   * const fileMetadata = await client.beta.files.upload({
   *   file: fs.createReadStream('path/to/file'),
   * });
   * ```
   */
  upload(params, options) {
    const { betas, ...body2 } = params;
    return this._client.post("/v1/files", multipartFormRequestOptions({
      body: body2,
      ...options,
      headers: buildHeaders([
        { "anthropic-beta": [...betas ?? [], "files-api-2025-04-14"].toString() },
        options?.headers
      ])
    }, this._client));
  }
};

// node_modules/@anthropic-ai/sdk/resources/beta/models.mjs
init_esbuild_shim();
var Models = class extends APIResource {
  /**
   * Get a specific model.
   *
   * The Models API response can be used to determine information about a specific
   * model or resolve a model alias to a model ID.
   *
   * @example
   * ```ts
   * const betaModelInfo = await client.beta.models.retrieve(
   *   'model_id',
   * );
   * ```
   */
  retrieve(modelID, params = {}, options) {
    const { betas } = params ?? {};
    return this._client.get(path4`/v1/models/${modelID}?beta=true`, {
      ...options,
      headers: buildHeaders([
        { ...betas?.toString() != null ? { "anthropic-beta": betas?.toString() } : void 0 },
        options?.headers
      ])
    });
  }
  /**
   * List available models.
   *
   * The Models API response can be used to determine which models are available for
   * use in the API. More recently released models are listed first.
   *
   * @example
   * ```ts
   * // Automatically fetches more pages as needed.
   * for await (const betaModelInfo of client.beta.models.list()) {
   *   // ...
   * }
   * ```
   */
  list(params = {}, options) {
    const { betas, ...query } = params ?? {};
    return this._client.getAPIList("/v1/models?beta=true", Page, {
      query,
      ...options,
      headers: buildHeaders([
        { ...betas?.toString() != null ? { "anthropic-beta": betas?.toString() } : void 0 },
        options?.headers
      ])
    });
  }
};

// node_modules/@anthropic-ai/sdk/resources/beta/messages/messages.mjs
init_esbuild_shim();

// node_modules/@anthropic-ai/sdk/internal/constants.mjs
init_esbuild_shim();
var MODEL_NONSTREAMING_TOKENS = {
  "claude-opus-4-20250514": 8192,
  "claude-opus-4-0": 8192,
  "claude-4-opus-20250514": 8192,
  "anthropic.claude-opus-4-20250514-v1:0": 8192,
  "claude-opus-4@20250514": 8192,
  "claude-opus-4-1-20250805": 8192,
  "anthropic.claude-opus-4-1-20250805-v1:0": 8192,
  "claude-opus-4-1@20250805": 8192
};

// node_modules/@anthropic-ai/sdk/lib/beta-parser.mjs
init_esbuild_shim();
function maybeParseBetaMessage(message, params, opts) {
  if (!params || !("parse" in (params.output_format ?? {}))) {
    return {
      ...message,
      content: message.content.map((block) => {
        if (block.type === "text") {
          const parsedBlock = Object.defineProperty({ ...block }, "parsed_output", {
            value: null,
            enumerable: false
          });
          return Object.defineProperty(parsedBlock, "parsed", {
            get() {
              opts.logger.warn("The `parsed` property on `text` blocks is deprecated, please use `parsed_output` instead.");
              return null;
            },
            enumerable: false
          });
        }
        return block;
      }),
      parsed_output: null
    };
  }
  return parseBetaMessage(message, params, opts);
}
function parseBetaMessage(message, params, opts) {
  let firstParsedOutput = null;
  const content = message.content.map((block) => {
    if (block.type === "text") {
      const parsedOutput = parseBetaOutputFormat(params, block.text);
      if (firstParsedOutput === null) {
        firstParsedOutput = parsedOutput;
      }
      const parsedBlock = Object.defineProperty({ ...block }, "parsed_output", {
        value: parsedOutput,
        enumerable: false
      });
      return Object.defineProperty(parsedBlock, "parsed", {
        get() {
          opts.logger.warn("The `parsed` property on `text` blocks is deprecated, please use `parsed_output` instead.");
          return parsedOutput;
        },
        enumerable: false
      });
    }
    return block;
  });
  return {
    ...message,
    content,
    parsed_output: firstParsedOutput
  };
}
function parseBetaOutputFormat(params, content) {
  if (params.output_format?.type !== "json_schema") {
    return null;
  }
  try {
    if ("parse" in params.output_format) {
      return params.output_format.parse(content);
    }
    return JSON.parse(content);
  } catch (error) {
    throw new AnthropicError(`Failed to parse structured output: ${error}`);
  }
}

// node_modules/@anthropic-ai/sdk/lib/BetaMessageStream.mjs
init_esbuild_shim();

// node_modules/@anthropic-ai/sdk/_vendor/partial-json-parser/parser.mjs
init_esbuild_shim();
var tokenize = (input) => {
  let current = 0;
  let tokens = [];
  while (current < input.length) {
    let char = input[current];
    if (char === "\\") {
      current++;
      continue;
    }
    if (char === "{") {
      tokens.push({
        type: "brace",
        value: "{"
      });
      current++;
      continue;
    }
    if (char === "}") {
      tokens.push({
        type: "brace",
        value: "}"
      });
      current++;
      continue;
    }
    if (char === "[") {
      tokens.push({
        type: "paren",
        value: "["
      });
      current++;
      continue;
    }
    if (char === "]") {
      tokens.push({
        type: "paren",
        value: "]"
      });
      current++;
      continue;
    }
    if (char === ":") {
      tokens.push({
        type: "separator",
        value: ":"
      });
      current++;
      continue;
    }
    if (char === ",") {
      tokens.push({
        type: "delimiter",
        value: ","
      });
      current++;
      continue;
    }
    if (char === '"') {
      let value = "";
      let danglingQuote = false;
      char = input[++current];
      while (char !== '"') {
        if (current === input.length) {
          danglingQuote = true;
          break;
        }
        if (char === "\\") {
          current++;
          if (current === input.length) {
            danglingQuote = true;
            break;
          }
          value += char + input[current];
          char = input[++current];
        } else {
          value += char;
          char = input[++current];
        }
      }
      char = input[++current];
      if (!danglingQuote) {
        tokens.push({
          type: "string",
          value
        });
      }
      continue;
    }
    let WHITESPACE = /\s/;
    if (char && WHITESPACE.test(char)) {
      current++;
      continue;
    }
    let NUMBERS = /[0-9]/;
    if (char && NUMBERS.test(char) || char === "-" || char === ".") {
      let value = "";
      if (char === "-") {
        value += char;
        char = input[++current];
      }
      while (char && NUMBERS.test(char) || char === ".") {
        value += char;
        char = input[++current];
      }
      tokens.push({
        type: "number",
        value
      });
      continue;
    }
    let LETTERS = /[a-z]/i;
    if (char && LETTERS.test(char)) {
      let value = "";
      while (char && LETTERS.test(char)) {
        if (current === input.length) {
          break;
        }
        value += char;
        char = input[++current];
      }
      if (value == "true" || value == "false" || value === "null") {
        tokens.push({
          type: "name",
          value
        });
      } else {
        current++;
        continue;
      }
      continue;
    }
    current++;
  }
  return tokens;
};
var strip = (tokens) => {
  if (tokens.length === 0) {
    return tokens;
  }
  let lastToken = tokens[tokens.length - 1];
  switch (lastToken.type) {
    case "separator":
      tokens = tokens.slice(0, tokens.length - 1);
      return strip(tokens);
      break;
    case "number":
      let lastCharacterOfLastToken = lastToken.value[lastToken.value.length - 1];
      if (lastCharacterOfLastToken === "." || lastCharacterOfLastToken === "-") {
        tokens = tokens.slice(0, tokens.length - 1);
        return strip(tokens);
      }
    case "string":
      let tokenBeforeTheLastToken = tokens[tokens.length - 2];
      if (tokenBeforeTheLastToken?.type === "delimiter") {
        tokens = tokens.slice(0, tokens.length - 1);
        return strip(tokens);
      } else if (tokenBeforeTheLastToken?.type === "brace" && tokenBeforeTheLastToken.value === "{") {
        tokens = tokens.slice(0, tokens.length - 1);
        return strip(tokens);
      }
      break;
    case "delimiter":
      tokens = tokens.slice(0, tokens.length - 1);
      return strip(tokens);
      break;
  }
  return tokens;
};
var unstrip = (tokens) => {
  let tail = [];
  tokens.map((token) => {
    if (token.type === "brace") {
      if (token.value === "{") {
        tail.push("}");
      } else {
        tail.splice(tail.lastIndexOf("}"), 1);
      }
    }
    if (token.type === "paren") {
      if (token.value === "[") {
        tail.push("]");
      } else {
        tail.splice(tail.lastIndexOf("]"), 1);
      }
    }
  });
  if (tail.length > 0) {
    tail.reverse().map((item) => {
      if (item === "}") {
        tokens.push({
          type: "brace",
          value: "}"
        });
      } else if (item === "]") {
        tokens.push({
          type: "paren",
          value: "]"
        });
      }
    });
  }
  return tokens;
};
var generate = (tokens) => {
  let output = "";
  tokens.map((token) => {
    switch (token.type) {
      case "string":
        output += '"' + token.value + '"';
        break;
      default:
        output += token.value;
        break;
    }
  });
  return output;
};
var partialParse = (input) => JSON.parse(generate(unstrip(strip(tokenize(input)))));

// node_modules/@anthropic-ai/sdk/error.mjs
init_esbuild_shim();

// node_modules/@anthropic-ai/sdk/streaming.mjs
init_esbuild_shim();

// node_modules/@anthropic-ai/sdk/lib/BetaMessageStream.mjs
var _BetaMessageStream_instances;
var _BetaMessageStream_currentMessageSnapshot;
var _BetaMessageStream_params;
var _BetaMessageStream_connectedPromise;
var _BetaMessageStream_resolveConnectedPromise;
var _BetaMessageStream_rejectConnectedPromise;
var _BetaMessageStream_endPromise;
var _BetaMessageStream_resolveEndPromise;
var _BetaMessageStream_rejectEndPromise;
var _BetaMessageStream_listeners;
var _BetaMessageStream_ended;
var _BetaMessageStream_errored;
var _BetaMessageStream_aborted;
var _BetaMessageStream_catchingPromiseCreated;
var _BetaMessageStream_response;
var _BetaMessageStream_request_id;
var _BetaMessageStream_logger;
var _BetaMessageStream_getFinalMessage;
var _BetaMessageStream_getFinalText;
var _BetaMessageStream_handleError;
var _BetaMessageStream_beginRequest;
var _BetaMessageStream_addStreamEvent;
var _BetaMessageStream_endRequest;
var _BetaMessageStream_accumulateMessage;
var JSON_BUF_PROPERTY = "__json_buf";
function tracksToolInput(content) {
  return content.type === "tool_use" || content.type === "server_tool_use" || content.type === "mcp_tool_use";
}
var BetaMessageStream = class _BetaMessageStream {
  constructor(params, opts) {
    _BetaMessageStream_instances.add(this);
    this.messages = [];
    this.receivedMessages = [];
    _BetaMessageStream_currentMessageSnapshot.set(this, void 0);
    _BetaMessageStream_params.set(this, null);
    this.controller = new AbortController();
    _BetaMessageStream_connectedPromise.set(this, void 0);
    _BetaMessageStream_resolveConnectedPromise.set(this, () => {
    });
    _BetaMessageStream_rejectConnectedPromise.set(this, () => {
    });
    _BetaMessageStream_endPromise.set(this, void 0);
    _BetaMessageStream_resolveEndPromise.set(this, () => {
    });
    _BetaMessageStream_rejectEndPromise.set(this, () => {
    });
    _BetaMessageStream_listeners.set(this, {});
    _BetaMessageStream_ended.set(this, false);
    _BetaMessageStream_errored.set(this, false);
    _BetaMessageStream_aborted.set(this, false);
    _BetaMessageStream_catchingPromiseCreated.set(this, false);
    _BetaMessageStream_response.set(this, void 0);
    _BetaMessageStream_request_id.set(this, void 0);
    _BetaMessageStream_logger.set(this, void 0);
    _BetaMessageStream_handleError.set(this, (error) => {
      __classPrivateFieldSet(this, _BetaMessageStream_errored, true, "f");
      if (isAbortError(error)) {
        error = new APIUserAbortError();
      }
      if (error instanceof APIUserAbortError) {
        __classPrivateFieldSet(this, _BetaMessageStream_aborted, true, "f");
        return this._emit("abort", error);
      }
      if (error instanceof AnthropicError) {
        return this._emit("error", error);
      }
      if (error instanceof Error) {
        const anthropicError = new AnthropicError(error.message);
        anthropicError.cause = error;
        return this._emit("error", anthropicError);
      }
      return this._emit("error", new AnthropicError(String(error)));
    });
    __classPrivateFieldSet(this, _BetaMessageStream_connectedPromise, new Promise((resolve, reject) => {
      __classPrivateFieldSet(this, _BetaMessageStream_resolveConnectedPromise, resolve, "f");
      __classPrivateFieldSet(this, _BetaMessageStream_rejectConnectedPromise, reject, "f");
    }), "f");
    __classPrivateFieldSet(this, _BetaMessageStream_endPromise, new Promise((resolve, reject) => {
      __classPrivateFieldSet(this, _BetaMessageStream_resolveEndPromise, resolve, "f");
      __classPrivateFieldSet(this, _BetaMessageStream_rejectEndPromise, reject, "f");
    }), "f");
    __classPrivateFieldGet(this, _BetaMessageStream_connectedPromise, "f").catch(() => {
    });
    __classPrivateFieldGet(this, _BetaMessageStream_endPromise, "f").catch(() => {
    });
    __classPrivateFieldSet(this, _BetaMessageStream_params, params, "f");
    __classPrivateFieldSet(this, _BetaMessageStream_logger, opts?.logger ?? console, "f");
  }
  get response() {
    return __classPrivateFieldGet(this, _BetaMessageStream_response, "f");
  }
  get request_id() {
    return __classPrivateFieldGet(this, _BetaMessageStream_request_id, "f");
  }
  /**
   * Returns the `MessageStream` data, the raw `Response` instance and the ID of the request,
   * returned vie the `request-id` header which is useful for debugging requests and resporting
   * issues to Anthropic.
   *
   * This is the same as the `APIPromise.withResponse()` method.
   *
   * This method will raise an error if you created the stream using `MessageStream.fromReadableStream`
   * as no `Response` is available.
   */
  async withResponse() {
    __classPrivateFieldSet(this, _BetaMessageStream_catchingPromiseCreated, true, "f");
    const response = await __classPrivateFieldGet(this, _BetaMessageStream_connectedPromise, "f");
    if (!response) {
      throw new Error("Could not resolve a `Response` object");
    }
    return {
      data: this,
      response,
      request_id: response.headers.get("request-id")
    };
  }
  /**
   * Intended for use on the frontend, consuming a stream produced with
   * `.toReadableStream()` on the backend.
   *
   * Note that messages sent to the model do not appear in `.on('message')`
   * in this context.
   */
  static fromReadableStream(stream) {
    const runner = new _BetaMessageStream(null);
    runner._run(() => runner._fromReadableStream(stream));
    return runner;
  }
  static createMessage(messages, params, options, { logger } = {}) {
    const runner = new _BetaMessageStream(params, { logger });
    for (const message of params.messages) {
      runner._addMessageParam(message);
    }
    __classPrivateFieldSet(runner, _BetaMessageStream_params, { ...params, stream: true }, "f");
    runner._run(() => runner._createMessage(messages, { ...params, stream: true }, { ...options, headers: { ...options?.headers, "X-Stainless-Helper-Method": "stream" } }));
    return runner;
  }
  _run(executor) {
    executor().then(() => {
      this._emitFinal();
      this._emit("end");
    }, __classPrivateFieldGet(this, _BetaMessageStream_handleError, "f"));
  }
  _addMessageParam(message) {
    this.messages.push(message);
  }
  _addMessage(message, emit = true) {
    this.receivedMessages.push(message);
    if (emit) {
      this._emit("message", message);
    }
  }
  async _createMessage(messages, params, options) {
    const signal = options?.signal;
    let abortHandler;
    if (signal) {
      if (signal.aborted)
        this.controller.abort();
      abortHandler = this.controller.abort.bind(this.controller);
      signal.addEventListener("abort", abortHandler);
    }
    try {
      __classPrivateFieldGet(this, _BetaMessageStream_instances, "m", _BetaMessageStream_beginRequest).call(this);
      const { response, data: stream } = await messages.create({ ...params, stream: true }, { ...options, signal: this.controller.signal }).withResponse();
      this._connected(response);
      for await (const event of stream) {
        __classPrivateFieldGet(this, _BetaMessageStream_instances, "m", _BetaMessageStream_addStreamEvent).call(this, event);
      }
      if (stream.controller.signal?.aborted) {
        throw new APIUserAbortError();
      }
      __classPrivateFieldGet(this, _BetaMessageStream_instances, "m", _BetaMessageStream_endRequest).call(this);
    } finally {
      if (signal && abortHandler) {
        signal.removeEventListener("abort", abortHandler);
      }
    }
  }
  _connected(response) {
    if (this.ended)
      return;
    __classPrivateFieldSet(this, _BetaMessageStream_response, response, "f");
    __classPrivateFieldSet(this, _BetaMessageStream_request_id, response?.headers.get("request-id"), "f");
    __classPrivateFieldGet(this, _BetaMessageStream_resolveConnectedPromise, "f").call(this, response);
    this._emit("connect");
  }
  get ended() {
    return __classPrivateFieldGet(this, _BetaMessageStream_ended, "f");
  }
  get errored() {
    return __classPrivateFieldGet(this, _BetaMessageStream_errored, "f");
  }
  get aborted() {
    return __classPrivateFieldGet(this, _BetaMessageStream_aborted, "f");
  }
  abort() {
    this.controller.abort();
  }
  /**
   * Adds the listener function to the end of the listeners array for the event.
   * No checks are made to see if the listener has already been added. Multiple calls passing
   * the same combination of event and listener will result in the listener being added, and
   * called, multiple times.
   * @returns this MessageStream, so that calls can be chained
   */
  on(event, listener) {
    const listeners = __classPrivateFieldGet(this, _BetaMessageStream_listeners, "f")[event] || (__classPrivateFieldGet(this, _BetaMessageStream_listeners, "f")[event] = []);
    listeners.push({ listener });
    return this;
  }
  /**
   * Removes the specified listener from the listener array for the event.
   * off() will remove, at most, one instance of a listener from the listener array. If any single
   * listener has been added multiple times to the listener array for the specified event, then
   * off() must be called multiple times to remove each instance.
   * @returns this MessageStream, so that calls can be chained
   */
  off(event, listener) {
    const listeners = __classPrivateFieldGet(this, _BetaMessageStream_listeners, "f")[event];
    if (!listeners)
      return this;
    const index = listeners.findIndex((l) => l.listener === listener);
    if (index >= 0)
      listeners.splice(index, 1);
    return this;
  }
  /**
   * Adds a one-time listener function for the event. The next time the event is triggered,
   * this listener is removed and then invoked.
   * @returns this MessageStream, so that calls can be chained
   */
  once(event, listener) {
    const listeners = __classPrivateFieldGet(this, _BetaMessageStream_listeners, "f")[event] || (__classPrivateFieldGet(this, _BetaMessageStream_listeners, "f")[event] = []);
    listeners.push({ listener, once: true });
    return this;
  }
  /**
   * This is similar to `.once()`, but returns a Promise that resolves the next time
   * the event is triggered, instead of calling a listener callback.
   * @returns a Promise that resolves the next time given event is triggered,
   * or rejects if an error is emitted.  (If you request the 'error' event,
   * returns a promise that resolves with the error).
   *
   * Example:
   *
   *   const message = await stream.emitted('message') // rejects if the stream errors
   */
  emitted(event) {
    return new Promise((resolve, reject) => {
      __classPrivateFieldSet(this, _BetaMessageStream_catchingPromiseCreated, true, "f");
      if (event !== "error")
        this.once("error", reject);
      this.once(event, resolve);
    });
  }
  async done() {
    __classPrivateFieldSet(this, _BetaMessageStream_catchingPromiseCreated, true, "f");
    await __classPrivateFieldGet(this, _BetaMessageStream_endPromise, "f");
  }
  get currentMessage() {
    return __classPrivateFieldGet(this, _BetaMessageStream_currentMessageSnapshot, "f");
  }
  /**
   * @returns a promise that resolves with the the final assistant Message response,
   * or rejects if an error occurred or the stream ended prematurely without producing a Message.
   * If structured outputs were used, this will be a ParsedMessage with a `parsed` field.
   */
  async finalMessage() {
    await this.done();
    return __classPrivateFieldGet(this, _BetaMessageStream_instances, "m", _BetaMessageStream_getFinalMessage).call(this);
  }
  /**
   * @returns a promise that resolves with the the final assistant Message's text response, concatenated
   * together if there are more than one text blocks.
   * Rejects if an error occurred or the stream ended prematurely without producing a Message.
   */
  async finalText() {
    await this.done();
    return __classPrivateFieldGet(this, _BetaMessageStream_instances, "m", _BetaMessageStream_getFinalText).call(this);
  }
  _emit(event, ...args2) {
    if (__classPrivateFieldGet(this, _BetaMessageStream_ended, "f"))
      return;
    if (event === "end") {
      __classPrivateFieldSet(this, _BetaMessageStream_ended, true, "f");
      __classPrivateFieldGet(this, _BetaMessageStream_resolveEndPromise, "f").call(this);
    }
    const listeners = __classPrivateFieldGet(this, _BetaMessageStream_listeners, "f")[event];
    if (listeners) {
      __classPrivateFieldGet(this, _BetaMessageStream_listeners, "f")[event] = listeners.filter((l) => !l.once);
      listeners.forEach(({ listener }) => listener(...args2));
    }
    if (event === "abort") {
      const error = args2[0];
      if (!__classPrivateFieldGet(this, _BetaMessageStream_catchingPromiseCreated, "f") && !listeners?.length) {
        Promise.reject(error);
      }
      __classPrivateFieldGet(this, _BetaMessageStream_rejectConnectedPromise, "f").call(this, error);
      __classPrivateFieldGet(this, _BetaMessageStream_rejectEndPromise, "f").call(this, error);
      this._emit("end");
      return;
    }
    if (event === "error") {
      const error = args2[0];
      if (!__classPrivateFieldGet(this, _BetaMessageStream_catchingPromiseCreated, "f") && !listeners?.length) {
        Promise.reject(error);
      }
      __classPrivateFieldGet(this, _BetaMessageStream_rejectConnectedPromise, "f").call(this, error);
      __classPrivateFieldGet(this, _BetaMessageStream_rejectEndPromise, "f").call(this, error);
      this._emit("end");
    }
  }
  _emitFinal() {
    const finalMessage = this.receivedMessages.at(-1);
    if (finalMessage) {
      this._emit("finalMessage", __classPrivateFieldGet(this, _BetaMessageStream_instances, "m", _BetaMessageStream_getFinalMessage).call(this));
    }
  }
  async _fromReadableStream(readableStream, options) {
    const signal = options?.signal;
    let abortHandler;
    if (signal) {
      if (signal.aborted)
        this.controller.abort();
      abortHandler = this.controller.abort.bind(this.controller);
      signal.addEventListener("abort", abortHandler);
    }
    try {
      __classPrivateFieldGet(this, _BetaMessageStream_instances, "m", _BetaMessageStream_beginRequest).call(this);
      this._connected(null);
      const stream = Stream.fromReadableStream(readableStream, this.controller);
      for await (const event of stream) {
        __classPrivateFieldGet(this, _BetaMessageStream_instances, "m", _BetaMessageStream_addStreamEvent).call(this, event);
      }
      if (stream.controller.signal?.aborted) {
        throw new APIUserAbortError();
      }
      __classPrivateFieldGet(this, _BetaMessageStream_instances, "m", _BetaMessageStream_endRequest).call(this);
    } finally {
      if (signal && abortHandler) {
        signal.removeEventListener("abort", abortHandler);
      }
    }
  }
  [(_BetaMessageStream_currentMessageSnapshot = /* @__PURE__ */ new WeakMap(), _BetaMessageStream_params = /* @__PURE__ */ new WeakMap(), _BetaMessageStream_connectedPromise = /* @__PURE__ */ new WeakMap(), _BetaMessageStream_resolveConnectedPromise = /* @__PURE__ */ new WeakMap(), _BetaMessageStream_rejectConnectedPromise = /* @__PURE__ */ new WeakMap(), _BetaMessageStream_endPromise = /* @__PURE__ */ new WeakMap(), _BetaMessageStream_resolveEndPromise = /* @__PURE__ */ new WeakMap(), _BetaMessageStream_rejectEndPromise = /* @__PURE__ */ new WeakMap(), _BetaMessageStream_listeners = /* @__PURE__ */ new WeakMap(), _BetaMessageStream_ended = /* @__PURE__ */ new WeakMap(), _BetaMessageStream_errored = /* @__PURE__ */ new WeakMap(), _BetaMessageStream_aborted = /* @__PURE__ */ new WeakMap(), _BetaMessageStream_catchingPromiseCreated = /* @__PURE__ */ new WeakMap(), _BetaMessageStream_response = /* @__PURE__ */ new WeakMap(), _BetaMessageStream_request_id = /* @__PURE__ */ new WeakMap(), _BetaMessageStream_logger = /* @__PURE__ */ new WeakMap(), _BetaMessageStream_handleError = /* @__PURE__ */ new WeakMap(), _BetaMessageStream_instances = /* @__PURE__ */ new WeakSet(), _BetaMessageStream_getFinalMessage = function _BetaMessageStream_getFinalMessage2() {
    if (this.receivedMessages.length === 0) {
      throw new AnthropicError("stream ended without producing a Message with role=assistant");
    }
    return this.receivedMessages.at(-1);
  }, _BetaMessageStream_getFinalText = function _BetaMessageStream_getFinalText2() {
    if (this.receivedMessages.length === 0) {
      throw new AnthropicError("stream ended without producing a Message with role=assistant");
    }
    const textBlocks = this.receivedMessages.at(-1).content.filter((block) => block.type === "text").map((block) => block.text);
    if (textBlocks.length === 0) {
      throw new AnthropicError("stream ended without producing a content block with type=text");
    }
    return textBlocks.join(" ");
  }, _BetaMessageStream_beginRequest = function _BetaMessageStream_beginRequest2() {
    if (this.ended)
      return;
    __classPrivateFieldSet(this, _BetaMessageStream_currentMessageSnapshot, void 0, "f");
  }, _BetaMessageStream_addStreamEvent = function _BetaMessageStream_addStreamEvent2(event) {
    if (this.ended)
      return;
    const messageSnapshot = __classPrivateFieldGet(this, _BetaMessageStream_instances, "m", _BetaMessageStream_accumulateMessage).call(this, event);
    this._emit("streamEvent", event, messageSnapshot);
    switch (event.type) {
      case "content_block_delta": {
        const content = messageSnapshot.content.at(-1);
        switch (event.delta.type) {
          case "text_delta": {
            if (content.type === "text") {
              this._emit("text", event.delta.text, content.text || "");
            }
            break;
          }
          case "citations_delta": {
            if (content.type === "text") {
              this._emit("citation", event.delta.citation, content.citations ?? []);
            }
            break;
          }
          case "input_json_delta": {
            if (tracksToolInput(content) && content.input) {
              this._emit("inputJson", event.delta.partial_json, content.input);
            }
            break;
          }
          case "thinking_delta": {
            if (content.type === "thinking") {
              this._emit("thinking", event.delta.thinking, content.thinking);
            }
            break;
          }
          case "signature_delta": {
            if (content.type === "thinking") {
              this._emit("signature", content.signature);
            }
            break;
          }
          default:
            checkNever(event.delta);
        }
        break;
      }
      case "message_stop": {
        this._addMessageParam(messageSnapshot);
        this._addMessage(maybeParseBetaMessage(messageSnapshot, __classPrivateFieldGet(this, _BetaMessageStream_params, "f"), { logger: __classPrivateFieldGet(this, _BetaMessageStream_logger, "f") }), true);
        break;
      }
      case "content_block_stop": {
        this._emit("contentBlock", messageSnapshot.content.at(-1));
        break;
      }
      case "message_start": {
        __classPrivateFieldSet(this, _BetaMessageStream_currentMessageSnapshot, messageSnapshot, "f");
        break;
      }
      case "content_block_start":
      case "message_delta":
        break;
    }
  }, _BetaMessageStream_endRequest = function _BetaMessageStream_endRequest2() {
    if (this.ended) {
      throw new AnthropicError(`stream has ended, this shouldn't happen`);
    }
    const snapshot = __classPrivateFieldGet(this, _BetaMessageStream_currentMessageSnapshot, "f");
    if (!snapshot) {
      throw new AnthropicError(`request ended without sending any chunks`);
    }
    __classPrivateFieldSet(this, _BetaMessageStream_currentMessageSnapshot, void 0, "f");
    return maybeParseBetaMessage(snapshot, __classPrivateFieldGet(this, _BetaMessageStream_params, "f"), { logger: __classPrivateFieldGet(this, _BetaMessageStream_logger, "f") });
  }, _BetaMessageStream_accumulateMessage = function _BetaMessageStream_accumulateMessage2(event) {
    let snapshot = __classPrivateFieldGet(this, _BetaMessageStream_currentMessageSnapshot, "f");
    if (event.type === "message_start") {
      if (snapshot) {
        throw new AnthropicError(`Unexpected event order, got ${event.type} before receiving "message_stop"`);
      }
      return event.message;
    }
    if (!snapshot) {
      throw new AnthropicError(`Unexpected event order, got ${event.type} before "message_start"`);
    }
    switch (event.type) {
      case "message_stop":
        return snapshot;
      case "message_delta":
        snapshot.container = event.delta.container;
        snapshot.stop_reason = event.delta.stop_reason;
        snapshot.stop_sequence = event.delta.stop_sequence;
        snapshot.usage.output_tokens = event.usage.output_tokens;
        snapshot.context_management = event.context_management;
        if (event.usage.input_tokens != null) {
          snapshot.usage.input_tokens = event.usage.input_tokens;
        }
        if (event.usage.cache_creation_input_tokens != null) {
          snapshot.usage.cache_creation_input_tokens = event.usage.cache_creation_input_tokens;
        }
        if (event.usage.cache_read_input_tokens != null) {
          snapshot.usage.cache_read_input_tokens = event.usage.cache_read_input_tokens;
        }
        if (event.usage.server_tool_use != null) {
          snapshot.usage.server_tool_use = event.usage.server_tool_use;
        }
        return snapshot;
      case "content_block_start":
        snapshot.content.push(event.content_block);
        return snapshot;
      case "content_block_delta": {
        const snapshotContent = snapshot.content.at(event.index);
        switch (event.delta.type) {
          case "text_delta": {
            if (snapshotContent?.type === "text") {
              snapshot.content[event.index] = {
                ...snapshotContent,
                text: (snapshotContent.text || "") + event.delta.text
              };
            }
            break;
          }
          case "citations_delta": {
            if (snapshotContent?.type === "text") {
              snapshot.content[event.index] = {
                ...snapshotContent,
                citations: [...snapshotContent.citations ?? [], event.delta.citation]
              };
            }
            break;
          }
          case "input_json_delta": {
            if (snapshotContent && tracksToolInput(snapshotContent)) {
              let jsonBuf = snapshotContent[JSON_BUF_PROPERTY] || "";
              jsonBuf += event.delta.partial_json;
              const newContent = { ...snapshotContent };
              Object.defineProperty(newContent, JSON_BUF_PROPERTY, {
                value: jsonBuf,
                enumerable: false,
                writable: true
              });
              if (jsonBuf) {
                try {
                  newContent.input = partialParse(jsonBuf);
                } catch (err2) {
                  const error = new AnthropicError(`Unable to parse tool parameter JSON from model. Please retry your request or adjust your prompt. Error: ${err2}. JSON: ${jsonBuf}`);
                  __classPrivateFieldGet(this, _BetaMessageStream_handleError, "f").call(this, error);
                }
              }
              snapshot.content[event.index] = newContent;
            }
            break;
          }
          case "thinking_delta": {
            if (snapshotContent?.type === "thinking") {
              snapshot.content[event.index] = {
                ...snapshotContent,
                thinking: snapshotContent.thinking + event.delta.thinking
              };
            }
            break;
          }
          case "signature_delta": {
            if (snapshotContent?.type === "thinking") {
              snapshot.content[event.index] = {
                ...snapshotContent,
                signature: event.delta.signature
              };
            }
            break;
          }
          default:
            checkNever(event.delta);
        }
        return snapshot;
      }
      case "content_block_stop":
        return snapshot;
    }
  }, Symbol.asyncIterator)]() {
    const pushQueue = [];
    const readQueue = [];
    let done = false;
    this.on("streamEvent", (event) => {
      const reader = readQueue.shift();
      if (reader) {
        reader.resolve(event);
      } else {
        pushQueue.push(event);
      }
    });
    this.on("end", () => {
      done = true;
      for (const reader of readQueue) {
        reader.resolve(void 0);
      }
      readQueue.length = 0;
    });
    this.on("abort", (err2) => {
      done = true;
      for (const reader of readQueue) {
        reader.reject(err2);
      }
      readQueue.length = 0;
    });
    this.on("error", (err2) => {
      done = true;
      for (const reader of readQueue) {
        reader.reject(err2);
      }
      readQueue.length = 0;
    });
    return {
      next: async () => {
        if (!pushQueue.length) {
          if (done) {
            return { value: void 0, done: true };
          }
          return new Promise((resolve, reject) => readQueue.push({ resolve, reject })).then((chunk2) => chunk2 ? { value: chunk2, done: false } : { value: void 0, done: true });
        }
        const chunk = pushQueue.shift();
        return { value: chunk, done: false };
      },
      return: async () => {
        this.abort();
        return { value: void 0, done: true };
      }
    };
  }
  toReadableStream() {
    const stream = new Stream(this[Symbol.asyncIterator].bind(this), this.controller);
    return stream.toReadableStream();
  }
};
function checkNever(x) {
}

// node_modules/@anthropic-ai/sdk/lib/tools/BetaToolRunner.mjs
init_esbuild_shim();

// node_modules/@anthropic-ai/sdk/lib/tools/CompactionControl.mjs
init_esbuild_shim();
var DEFAULT_TOKEN_THRESHOLD = 1e5;
var DEFAULT_SUMMARY_PROMPT = `You have been working on the task described above but have not yet completed it. Write a continuation summary that will allow you (or another instance of yourself) to resume work efficiently in a future context window where the conversation history will be replaced with this summary. Your summary should be structured, concise, and actionable. Include:
1. Task Overview
The user's core request and success criteria
Any clarifications or constraints they specified
2. Current State
What has been completed so far
Files created, modified, or analyzed (with paths if relevant)
Key outputs or artifacts produced
3. Important Discoveries
Technical constraints or requirements uncovered
Decisions made and their rationale
Errors encountered and how they were resolved
What approaches were tried that didn't work (and why)
4. Next Steps
Specific actions needed to complete the task
Any blockers or open questions to resolve
Priority order if multiple steps remain
5. Context to Preserve
User preferences or style requirements
Domain-specific details that aren't obvious
Any promises made to the user
Be concise but complete\u2014err on the side of including information that would prevent duplicate work or repeated mistakes. Write in a way that enables immediate resumption of the task.
Wrap your summary in <summary></summary> tags.`;

// node_modules/@anthropic-ai/sdk/lib/tools/BetaToolRunner.mjs
var _BetaToolRunner_instances;
var _BetaToolRunner_consumed;
var _BetaToolRunner_mutated;
var _BetaToolRunner_state;
var _BetaToolRunner_options;
var _BetaToolRunner_message;
var _BetaToolRunner_toolResponse;
var _BetaToolRunner_completion;
var _BetaToolRunner_iterationCount;
var _BetaToolRunner_checkAndCompact;
var _BetaToolRunner_generateToolResponse;
function promiseWithResolvers() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
var BetaToolRunner = class {
  constructor(client, params, options) {
    _BetaToolRunner_instances.add(this);
    this.client = client;
    _BetaToolRunner_consumed.set(this, false);
    _BetaToolRunner_mutated.set(this, false);
    _BetaToolRunner_state.set(this, void 0);
    _BetaToolRunner_options.set(this, void 0);
    _BetaToolRunner_message.set(this, void 0);
    _BetaToolRunner_toolResponse.set(this, void 0);
    _BetaToolRunner_completion.set(this, void 0);
    _BetaToolRunner_iterationCount.set(this, 0);
    __classPrivateFieldSet(this, _BetaToolRunner_state, {
      params: {
        // You can't clone the entire params since there are functions as handlers.
        // You also don't really need to clone params.messages, but it probably will prevent a foot gun
        // somewhere.
        ...params,
        messages: structuredClone(params.messages)
      }
    }, "f");
    __classPrivateFieldSet(this, _BetaToolRunner_options, {
      ...options,
      headers: buildHeaders([{ "x-stainless-helper": "BetaToolRunner" }, options?.headers])
    }, "f");
    __classPrivateFieldSet(this, _BetaToolRunner_completion, promiseWithResolvers(), "f");
  }
  async *[(_BetaToolRunner_consumed = /* @__PURE__ */ new WeakMap(), _BetaToolRunner_mutated = /* @__PURE__ */ new WeakMap(), _BetaToolRunner_state = /* @__PURE__ */ new WeakMap(), _BetaToolRunner_options = /* @__PURE__ */ new WeakMap(), _BetaToolRunner_message = /* @__PURE__ */ new WeakMap(), _BetaToolRunner_toolResponse = /* @__PURE__ */ new WeakMap(), _BetaToolRunner_completion = /* @__PURE__ */ new WeakMap(), _BetaToolRunner_iterationCount = /* @__PURE__ */ new WeakMap(), _BetaToolRunner_instances = /* @__PURE__ */ new WeakSet(), _BetaToolRunner_checkAndCompact = async function _BetaToolRunner_checkAndCompact2() {
    const compactionControl = __classPrivateFieldGet(this, _BetaToolRunner_state, "f").params.compactionControl;
    if (!compactionControl || !compactionControl.enabled) {
      return false;
    }
    let tokensUsed = 0;
    if (__classPrivateFieldGet(this, _BetaToolRunner_message, "f") !== void 0) {
      try {
        const message = await __classPrivateFieldGet(this, _BetaToolRunner_message, "f");
        const totalInputTokens = message.usage.input_tokens + (message.usage.cache_creation_input_tokens ?? 0) + (message.usage.cache_read_input_tokens ?? 0);
        tokensUsed = totalInputTokens + message.usage.output_tokens;
      } catch {
        return false;
      }
    }
    const threshold = compactionControl.contextTokenThreshold ?? DEFAULT_TOKEN_THRESHOLD;
    if (tokensUsed < threshold) {
      return false;
    }
    const model = compactionControl.model ?? __classPrivateFieldGet(this, _BetaToolRunner_state, "f").params.model;
    const summaryPrompt = compactionControl.summaryPrompt ?? DEFAULT_SUMMARY_PROMPT;
    const messages = __classPrivateFieldGet(this, _BetaToolRunner_state, "f").params.messages;
    if (messages[messages.length - 1].role === "assistant") {
      const lastMessage = messages[messages.length - 1];
      if (Array.isArray(lastMessage.content)) {
        const nonToolBlocks = lastMessage.content.filter((block) => block.type !== "tool_use");
        if (nonToolBlocks.length === 0) {
          messages.pop();
        } else {
          lastMessage.content = nonToolBlocks;
        }
      }
    }
    const response = await this.client.beta.messages.create({
      model,
      messages: [
        ...messages,
        {
          role: "user",
          content: [
            {
              type: "text",
              text: summaryPrompt
            }
          ]
        }
      ],
      max_tokens: __classPrivateFieldGet(this, _BetaToolRunner_state, "f").params.max_tokens
    }, {
      headers: { "x-stainless-helper": "compaction" }
    });
    if (response.content[0]?.type !== "text") {
      throw new AnthropicError("Expected text response for compaction");
    }
    __classPrivateFieldGet(this, _BetaToolRunner_state, "f").params.messages = [
      {
        role: "user",
        content: response.content
      }
    ];
    return true;
  }, Symbol.asyncIterator)]() {
    var _a2;
    if (__classPrivateFieldGet(this, _BetaToolRunner_consumed, "f")) {
      throw new AnthropicError("Cannot iterate over a consumed stream");
    }
    __classPrivateFieldSet(this, _BetaToolRunner_consumed, true, "f");
    __classPrivateFieldSet(this, _BetaToolRunner_mutated, true, "f");
    __classPrivateFieldSet(this, _BetaToolRunner_toolResponse, void 0, "f");
    try {
      while (true) {
        let stream;
        try {
          if (__classPrivateFieldGet(this, _BetaToolRunner_state, "f").params.max_iterations && __classPrivateFieldGet(this, _BetaToolRunner_iterationCount, "f") >= __classPrivateFieldGet(this, _BetaToolRunner_state, "f").params.max_iterations) {
            break;
          }
          __classPrivateFieldSet(this, _BetaToolRunner_mutated, false, "f");
          __classPrivateFieldSet(this, _BetaToolRunner_toolResponse, void 0, "f");
          __classPrivateFieldSet(this, _BetaToolRunner_iterationCount, (_a2 = __classPrivateFieldGet(this, _BetaToolRunner_iterationCount, "f"), _a2++, _a2), "f");
          __classPrivateFieldSet(this, _BetaToolRunner_message, void 0, "f");
          const { max_iterations, compactionControl, ...params } = __classPrivateFieldGet(this, _BetaToolRunner_state, "f").params;
          if (params.stream) {
            stream = this.client.beta.messages.stream({ ...params }, __classPrivateFieldGet(this, _BetaToolRunner_options, "f"));
            __classPrivateFieldSet(this, _BetaToolRunner_message, stream.finalMessage(), "f");
            __classPrivateFieldGet(this, _BetaToolRunner_message, "f").catch(() => {
            });
            yield stream;
          } else {
            __classPrivateFieldSet(this, _BetaToolRunner_message, this.client.beta.messages.create({ ...params, stream: false }, __classPrivateFieldGet(this, _BetaToolRunner_options, "f")), "f");
            yield __classPrivateFieldGet(this, _BetaToolRunner_message, "f");
          }
          const isCompacted = await __classPrivateFieldGet(this, _BetaToolRunner_instances, "m", _BetaToolRunner_checkAndCompact).call(this);
          if (!isCompacted) {
            if (!__classPrivateFieldGet(this, _BetaToolRunner_mutated, "f")) {
              const { role, content } = await __classPrivateFieldGet(this, _BetaToolRunner_message, "f");
              __classPrivateFieldGet(this, _BetaToolRunner_state, "f").params.messages.push({ role, content });
            }
            const toolMessage = await __classPrivateFieldGet(this, _BetaToolRunner_instances, "m", _BetaToolRunner_generateToolResponse).call(this, __classPrivateFieldGet(this, _BetaToolRunner_state, "f").params.messages.at(-1));
            if (toolMessage) {
              __classPrivateFieldGet(this, _BetaToolRunner_state, "f").params.messages.push(toolMessage);
            } else if (!__classPrivateFieldGet(this, _BetaToolRunner_mutated, "f")) {
              break;
            }
          }
        } finally {
          if (stream) {
            stream.abort();
          }
        }
      }
      if (!__classPrivateFieldGet(this, _BetaToolRunner_message, "f")) {
        throw new AnthropicError("ToolRunner concluded without a message from the server");
      }
      __classPrivateFieldGet(this, _BetaToolRunner_completion, "f").resolve(await __classPrivateFieldGet(this, _BetaToolRunner_message, "f"));
    } catch (error) {
      __classPrivateFieldSet(this, _BetaToolRunner_consumed, false, "f");
      __classPrivateFieldGet(this, _BetaToolRunner_completion, "f").promise.catch(() => {
      });
      __classPrivateFieldGet(this, _BetaToolRunner_completion, "f").reject(error);
      __classPrivateFieldSet(this, _BetaToolRunner_completion, promiseWithResolvers(), "f");
      throw error;
    }
  }
  setMessagesParams(paramsOrMutator) {
    if (typeof paramsOrMutator === "function") {
      __classPrivateFieldGet(this, _BetaToolRunner_state, "f").params = paramsOrMutator(__classPrivateFieldGet(this, _BetaToolRunner_state, "f").params);
    } else {
      __classPrivateFieldGet(this, _BetaToolRunner_state, "f").params = paramsOrMutator;
    }
    __classPrivateFieldSet(this, _BetaToolRunner_mutated, true, "f");
    __classPrivateFieldSet(this, _BetaToolRunner_toolResponse, void 0, "f");
  }
  /**
   * Get the tool response for the last message from the assistant.
   * Avoids redundant tool executions by caching results.
   *
   * @returns A promise that resolves to a BetaMessageParam containing tool results, or null if no tools need to be executed
   *
   * @example
   * const toolResponse = await runner.generateToolResponse();
   * if (toolResponse) {
   *   console.log('Tool results:', toolResponse.content);
   * }
   */
  async generateToolResponse() {
    const message = await __classPrivateFieldGet(this, _BetaToolRunner_message, "f") ?? this.params.messages.at(-1);
    if (!message) {
      return null;
    }
    return __classPrivateFieldGet(this, _BetaToolRunner_instances, "m", _BetaToolRunner_generateToolResponse).call(this, message);
  }
  /**
   * Wait for the async iterator to complete. This works even if the async iterator hasn't yet started, and
   * will wait for an instance to start and go to completion.
   *
   * @returns A promise that resolves to the final BetaMessage when the iterator completes
   *
   * @example
   * // Start consuming the iterator
   * for await (const message of runner) {
   *   console.log('Message:', message.content);
   * }
   *
   * // Meanwhile, wait for completion from another part of the code
   * const finalMessage = await runner.done();
   * console.log('Final response:', finalMessage.content);
   */
  done() {
    return __classPrivateFieldGet(this, _BetaToolRunner_completion, "f").promise;
  }
  /**
   * Returns a promise indicating that the stream is done. Unlike .done(), this will eagerly read the stream:
   * * If the iterator has not been consumed, consume the entire iterator and return the final message from the
   * assistant.
   * * If the iterator has been consumed, waits for it to complete and returns the final message.
   *
   * @returns A promise that resolves to the final BetaMessage from the conversation
   * @throws {AnthropicError} If no messages were processed during the conversation
   *
   * @example
   * const finalMessage = await runner.runUntilDone();
   * console.log('Final response:', finalMessage.content);
   */
  async runUntilDone() {
    if (!__classPrivateFieldGet(this, _BetaToolRunner_consumed, "f")) {
      for await (const _ of this) {
      }
    }
    return this.done();
  }
  /**
   * Get the current parameters being used by the ToolRunner.
   *
   * @returns A readonly view of the current ToolRunnerParams
   *
   * @example
   * const currentParams = runner.params;
   * console.log('Current model:', currentParams.model);
   * console.log('Message count:', currentParams.messages.length);
   */
  get params() {
    return __classPrivateFieldGet(this, _BetaToolRunner_state, "f").params;
  }
  /**
   * Add one or more messages to the conversation history.
   *
   * @param messages - One or more BetaMessageParam objects to add to the conversation
   *
   * @example
   * runner.pushMessages(
   *   { role: 'user', content: 'Also, what about the weather in NYC?' }
   * );
   *
   * @example
   * // Adding multiple messages
   * runner.pushMessages(
   *   { role: 'user', content: 'What about NYC?' },
   *   { role: 'user', content: 'And Boston?' }
   * );
   */
  pushMessages(...messages) {
    this.setMessagesParams((params) => ({
      ...params,
      messages: [...params.messages, ...messages]
    }));
  }
  /**
   * Makes the ToolRunner directly awaitable, equivalent to calling .runUntilDone()
   * This allows using `await runner` instead of `await runner.runUntilDone()`
   */
  then(onfulfilled, onrejected) {
    return this.runUntilDone().then(onfulfilled, onrejected);
  }
};
_BetaToolRunner_generateToolResponse = async function _BetaToolRunner_generateToolResponse2(lastMessage) {
  if (__classPrivateFieldGet(this, _BetaToolRunner_toolResponse, "f") !== void 0) {
    return __classPrivateFieldGet(this, _BetaToolRunner_toolResponse, "f");
  }
  __classPrivateFieldSet(this, _BetaToolRunner_toolResponse, generateToolResponse(__classPrivateFieldGet(this, _BetaToolRunner_state, "f").params, lastMessage), "f");
  return __classPrivateFieldGet(this, _BetaToolRunner_toolResponse, "f");
};
async function generateToolResponse(params, lastMessage = params.messages.at(-1)) {
  if (!lastMessage || lastMessage.role !== "assistant" || !lastMessage.content || typeof lastMessage.content === "string") {
    return null;
  }
  const toolUseBlocks = lastMessage.content.filter((content) => content.type === "tool_use");
  if (toolUseBlocks.length === 0) {
    return null;
  }
  const toolResults = await Promise.all(toolUseBlocks.map(async (toolUse) => {
    const tool = params.tools.find((t) => ("name" in t ? t.name : t.mcp_server_name) === toolUse.name);
    if (!tool || !("run" in tool)) {
      return {
        type: "tool_result",
        tool_use_id: toolUse.id,
        content: `Error: Tool '${toolUse.name}' not found`,
        is_error: true
      };
    }
    try {
      let input = toolUse.input;
      if ("parse" in tool && tool.parse) {
        input = tool.parse(input);
      }
      const result = await tool.run(input);
      return {
        type: "tool_result",
        tool_use_id: toolUse.id,
        content: result
      };
    } catch (error) {
      return {
        type: "tool_result",
        tool_use_id: toolUse.id,
        content: `Error: ${error instanceof Error ? error.message : String(error)}`,
        is_error: true
      };
    }
  }));
  return {
    role: "user",
    content: toolResults
  };
}

// node_modules/@anthropic-ai/sdk/resources/beta/messages/batches.mjs
init_esbuild_shim();

// node_modules/@anthropic-ai/sdk/internal/decoders/jsonl.mjs
init_esbuild_shim();
var JSONLDecoder = class _JSONLDecoder {
  constructor(iterator, controller) {
    this.iterator = iterator;
    this.controller = controller;
  }
  async *decoder() {
    const lineDecoder = new LineDecoder();
    for await (const chunk of this.iterator) {
      for (const line of lineDecoder.decode(chunk)) {
        yield JSON.parse(line);
      }
    }
    for (const line of lineDecoder.flush()) {
      yield JSON.parse(line);
    }
  }
  [Symbol.asyncIterator]() {
    return this.decoder();
  }
  static fromResponse(response, controller) {
    if (!response.body) {
      controller.abort();
      if (typeof globalThis.navigator !== "undefined" && globalThis.navigator.product === "ReactNative") {
        throw new AnthropicError(`The default react-native fetch implementation does not support streaming. Please use expo/fetch: https://docs.expo.dev/versions/latest/sdk/expo/#expofetch-api`);
      }
      throw new AnthropicError(`Attempted to iterate over a response with no body`);
    }
    return new _JSONLDecoder(ReadableStreamToAsyncIterable(response.body), controller);
  }
};

// node_modules/@anthropic-ai/sdk/resources/beta/messages/batches.mjs
var Batches = class extends APIResource {
  /**
   * Send a batch of Message creation requests.
   *
   * The Message Batches API can be used to process multiple Messages API requests at
   * once. Once a Message Batch is created, it begins processing immediately. Batches
   * can take up to 24 hours to complete.
   *
   * Learn more about the Message Batches API in our
   * [user guide](https://docs.claude.com/en/docs/build-with-claude/batch-processing)
   *
   * @example
   * ```ts
   * const betaMessageBatch =
   *   await client.beta.messages.batches.create({
   *     requests: [
   *       {
   *         custom_id: 'my-custom-id-1',
   *         params: {
   *           max_tokens: 1024,
   *           messages: [
   *             { content: 'Hello, world', role: 'user' },
   *           ],
   *           model: 'claude-sonnet-4-5-20250929',
   *         },
   *       },
   *     ],
   *   });
   * ```
   */
  create(params, options) {
    const { betas, ...body2 } = params;
    return this._client.post("/v1/messages/batches?beta=true", {
      body: body2,
      ...options,
      headers: buildHeaders([
        { "anthropic-beta": [...betas ?? [], "message-batches-2024-09-24"].toString() },
        options?.headers
      ])
    });
  }
  /**
   * This endpoint is idempotent and can be used to poll for Message Batch
   * completion. To access the results of a Message Batch, make a request to the
   * `results_url` field in the response.
   *
   * Learn more about the Message Batches API in our
   * [user guide](https://docs.claude.com/en/docs/build-with-claude/batch-processing)
   *
   * @example
   * ```ts
   * const betaMessageBatch =
   *   await client.beta.messages.batches.retrieve(
   *     'message_batch_id',
   *   );
   * ```
   */
  retrieve(messageBatchID, params = {}, options) {
    const { betas } = params ?? {};
    return this._client.get(path4`/v1/messages/batches/${messageBatchID}?beta=true`, {
      ...options,
      headers: buildHeaders([
        { "anthropic-beta": [...betas ?? [], "message-batches-2024-09-24"].toString() },
        options?.headers
      ])
    });
  }
  /**
   * List all Message Batches within a Workspace. Most recently created batches are
   * returned first.
   *
   * Learn more about the Message Batches API in our
   * [user guide](https://docs.claude.com/en/docs/build-with-claude/batch-processing)
   *
   * @example
   * ```ts
   * // Automatically fetches more pages as needed.
   * for await (const betaMessageBatch of client.beta.messages.batches.list()) {
   *   // ...
   * }
   * ```
   */
  list(params = {}, options) {
    const { betas, ...query } = params ?? {};
    return this._client.getAPIList("/v1/messages/batches?beta=true", Page, {
      query,
      ...options,
      headers: buildHeaders([
        { "anthropic-beta": [...betas ?? [], "message-batches-2024-09-24"].toString() },
        options?.headers
      ])
    });
  }
  /**
   * Delete a Message Batch.
   *
   * Message Batches can only be deleted once they've finished processing. If you'd
   * like to delete an in-progress batch, you must first cancel it.
   *
   * Learn more about the Message Batches API in our
   * [user guide](https://docs.claude.com/en/docs/build-with-claude/batch-processing)
   *
   * @example
   * ```ts
   * const betaDeletedMessageBatch =
   *   await client.beta.messages.batches.delete(
   *     'message_batch_id',
   *   );
   * ```
   */
  delete(messageBatchID, params = {}, options) {
    const { betas } = params ?? {};
    return this._client.delete(path4`/v1/messages/batches/${messageBatchID}?beta=true`, {
      ...options,
      headers: buildHeaders([
        { "anthropic-beta": [...betas ?? [], "message-batches-2024-09-24"].toString() },
        options?.headers
      ])
    });
  }
  /**
   * Batches may be canceled any time before processing ends. Once cancellation is
   * initiated, the batch enters a `canceling` state, at which time the system may
   * complete any in-progress, non-interruptible requests before finalizing
   * cancellation.
   *
   * The number of canceled requests is specified in `request_counts`. To determine
   * which requests were canceled, check the individual results within the batch.
   * Note that cancellation may not result in any canceled requests if they were
   * non-interruptible.
   *
   * Learn more about the Message Batches API in our
   * [user guide](https://docs.claude.com/en/docs/build-with-claude/batch-processing)
   *
   * @example
   * ```ts
   * const betaMessageBatch =
   *   await client.beta.messages.batches.cancel(
   *     'message_batch_id',
   *   );
   * ```
   */
  cancel(messageBatchID, params = {}, options) {
    const { betas } = params ?? {};
    return this._client.post(path4`/v1/messages/batches/${messageBatchID}/cancel?beta=true`, {
      ...options,
      headers: buildHeaders([
        { "anthropic-beta": [...betas ?? [], "message-batches-2024-09-24"].toString() },
        options?.headers
      ])
    });
  }
  /**
   * Streams the results of a Message Batch as a `.jsonl` file.
   *
   * Each line in the file is a JSON object containing the result of a single request
   * in the Message Batch. Results are not guaranteed to be in the same order as
   * requests. Use the `custom_id` field to match results to requests.
   *
   * Learn more about the Message Batches API in our
   * [user guide](https://docs.claude.com/en/docs/build-with-claude/batch-processing)
   *
   * @example
   * ```ts
   * const betaMessageBatchIndividualResponse =
   *   await client.beta.messages.batches.results(
   *     'message_batch_id',
   *   );
   * ```
   */
  async results(messageBatchID, params = {}, options) {
    const batch = await this.retrieve(messageBatchID);
    if (!batch.results_url) {
      throw new AnthropicError(`No batch \`results_url\`; Has it finished processing? ${batch.processing_status} - ${batch.id}`);
    }
    const { betas } = params ?? {};
    return this._client.get(batch.results_url, {
      ...options,
      headers: buildHeaders([
        {
          "anthropic-beta": [...betas ?? [], "message-batches-2024-09-24"].toString(),
          Accept: "application/binary"
        },
        options?.headers
      ]),
      stream: true,
      __binaryResponse: true
    })._thenUnwrap((_, props) => JSONLDecoder.fromResponse(props.response, props.controller));
  }
};

// node_modules/@anthropic-ai/sdk/resources/beta/messages/messages.mjs
var DEPRECATED_MODELS = {
  "claude-1.3": "November 6th, 2024",
  "claude-1.3-100k": "November 6th, 2024",
  "claude-instant-1.1": "November 6th, 2024",
  "claude-instant-1.1-100k": "November 6th, 2024",
  "claude-instant-1.2": "November 6th, 2024",
  "claude-3-sonnet-20240229": "July 21st, 2025",
  "claude-3-opus-20240229": "January 5th, 2026",
  "claude-2.1": "July 21st, 2025",
  "claude-2.0": "July 21st, 2025",
  "claude-3-7-sonnet-latest": "February 19th, 2026",
  "claude-3-7-sonnet-20250219": "February 19th, 2026"
};
var Messages = class extends APIResource {
  constructor() {
    super(...arguments);
    this.batches = new Batches(this._client);
  }
  create(params, options) {
    const { betas, ...body2 } = params;
    if (body2.model in DEPRECATED_MODELS) {
      console.warn(`The model '${body2.model}' is deprecated and will reach end-of-life on ${DEPRECATED_MODELS[body2.model]}
Please migrate to a newer model. Visit https://docs.anthropic.com/en/docs/resources/model-deprecations for more information.`);
    }
    let timeout = this._client._options.timeout;
    if (!body2.stream && timeout == null) {
      const maxNonstreamingTokens = MODEL_NONSTREAMING_TOKENS[body2.model] ?? void 0;
      timeout = this._client.calculateNonstreamingTimeout(body2.max_tokens, maxNonstreamingTokens);
    }
    return this._client.post("/v1/messages?beta=true", {
      body: body2,
      timeout: timeout ?? 6e5,
      ...options,
      headers: buildHeaders([
        { ...betas?.toString() != null ? { "anthropic-beta": betas?.toString() } : void 0 },
        options?.headers
      ]),
      stream: params.stream ?? false
    });
  }
  /**
   * Send a structured list of input messages with text and/or image content, along with an expected `output_format` and
   * the response will be automatically parsed and available in the `parsed_output` property of the message.
   *
   * @example
   * ```ts
   * const message = await client.beta.messages.parse({
   *   model: 'claude-3-5-sonnet-20241022',
   *   max_tokens: 1024,
   *   messages: [{ role: 'user', content: 'What is 2+2?' }],
   *   output_format: zodOutputFormat(z.object({ answer: z.number() }), 'math'),
   * });
   *
   * console.log(message.parsed_output?.answer); // 4
   * ```
   */
  parse(params, options) {
    options = {
      ...options,
      headers: buildHeaders([
        { "anthropic-beta": [...params.betas ?? [], "structured-outputs-2025-11-13"].toString() },
        options?.headers
      ])
    };
    return this.create(params, options).then((message) => parseBetaMessage(message, params, { logger: this._client.logger ?? console }));
  }
  /**
   * Create a Message stream
   */
  stream(body2, options) {
    return BetaMessageStream.createMessage(this, body2, options);
  }
  /**
   * Count the number of tokens in a Message.
   *
   * The Token Count API can be used to count the number of tokens in a Message,
   * including tools, images, and documents, without creating it.
   *
   * Learn more about token counting in our
   * [user guide](https://docs.claude.com/en/docs/build-with-claude/token-counting)
   *
   * @example
   * ```ts
   * const betaMessageTokensCount =
   *   await client.beta.messages.countTokens({
   *     messages: [{ content: 'string', role: 'user' }],
   *     model: 'claude-opus-4-5-20251101',
   *   });
   * ```
   */
  countTokens(params, options) {
    const { betas, ...body2 } = params;
    return this._client.post("/v1/messages/count_tokens?beta=true", {
      body: body2,
      ...options,
      headers: buildHeaders([
        { "anthropic-beta": [...betas ?? [], "token-counting-2024-11-01"].toString() },
        options?.headers
      ])
    });
  }
  toolRunner(body2, options) {
    return new BetaToolRunner(this._client, body2, options);
  }
};
Messages.Batches = Batches;
Messages.BetaToolRunner = BetaToolRunner;

// node_modules/@anthropic-ai/sdk/resources/beta/skills/skills.mjs
init_esbuild_shim();

// node_modules/@anthropic-ai/sdk/resources/beta/skills/versions.mjs
init_esbuild_shim();
var Versions = class extends APIResource {
  /**
   * Create Skill Version
   *
   * @example
   * ```ts
   * const version = await client.beta.skills.versions.create(
   *   'skill_id',
   * );
   * ```
   */
  create(skillID, params = {}, options) {
    const { betas, ...body2 } = params ?? {};
    return this._client.post(path4`/v1/skills/${skillID}/versions?beta=true`, multipartFormRequestOptions({
      body: body2,
      ...options,
      headers: buildHeaders([
        { "anthropic-beta": [...betas ?? [], "skills-2025-10-02"].toString() },
        options?.headers
      ])
    }, this._client));
  }
  /**
   * Get Skill Version
   *
   * @example
   * ```ts
   * const version = await client.beta.skills.versions.retrieve(
   *   'version',
   *   { skill_id: 'skill_id' },
   * );
   * ```
   */
  retrieve(version, params, options) {
    const { skill_id, betas } = params;
    return this._client.get(path4`/v1/skills/${skill_id}/versions/${version}?beta=true`, {
      ...options,
      headers: buildHeaders([
        { "anthropic-beta": [...betas ?? [], "skills-2025-10-02"].toString() },
        options?.headers
      ])
    });
  }
  /**
   * List Skill Versions
   *
   * @example
   * ```ts
   * // Automatically fetches more pages as needed.
   * for await (const versionListResponse of client.beta.skills.versions.list(
   *   'skill_id',
   * )) {
   *   // ...
   * }
   * ```
   */
  list(skillID, params = {}, options) {
    const { betas, ...query } = params ?? {};
    return this._client.getAPIList(path4`/v1/skills/${skillID}/versions?beta=true`, PageCursor, {
      query,
      ...options,
      headers: buildHeaders([
        { "anthropic-beta": [...betas ?? [], "skills-2025-10-02"].toString() },
        options?.headers
      ])
    });
  }
  /**
   * Delete Skill Version
   *
   * @example
   * ```ts
   * const version = await client.beta.skills.versions.delete(
   *   'version',
   *   { skill_id: 'skill_id' },
   * );
   * ```
   */
  delete(version, params, options) {
    const { skill_id, betas } = params;
    return this._client.delete(path4`/v1/skills/${skill_id}/versions/${version}?beta=true`, {
      ...options,
      headers: buildHeaders([
        { "anthropic-beta": [...betas ?? [], "skills-2025-10-02"].toString() },
        options?.headers
      ])
    });
  }
};

// node_modules/@anthropic-ai/sdk/resources/beta/skills/skills.mjs
var Skills = class extends APIResource {
  constructor() {
    super(...arguments);
    this.versions = new Versions(this._client);
  }
  /**
   * Create Skill
   *
   * @example
   * ```ts
   * const skill = await client.beta.skills.create();
   * ```
   */
  create(params = {}, options) {
    const { betas, ...body2 } = params ?? {};
    return this._client.post("/v1/skills?beta=true", multipartFormRequestOptions({
      body: body2,
      ...options,
      headers: buildHeaders([
        { "anthropic-beta": [...betas ?? [], "skills-2025-10-02"].toString() },
        options?.headers
      ])
    }, this._client));
  }
  /**
   * Get Skill
   *
   * @example
   * ```ts
   * const skill = await client.beta.skills.retrieve('skill_id');
   * ```
   */
  retrieve(skillID, params = {}, options) {
    const { betas } = params ?? {};
    return this._client.get(path4`/v1/skills/${skillID}?beta=true`, {
      ...options,
      headers: buildHeaders([
        { "anthropic-beta": [...betas ?? [], "skills-2025-10-02"].toString() },
        options?.headers
      ])
    });
  }
  /**
   * List Skills
   *
   * @example
   * ```ts
   * // Automatically fetches more pages as needed.
   * for await (const skillListResponse of client.beta.skills.list()) {
   *   // ...
   * }
   * ```
   */
  list(params = {}, options) {
    const { betas, ...query } = params ?? {};
    return this._client.getAPIList("/v1/skills?beta=true", PageCursor, {
      query,
      ...options,
      headers: buildHeaders([
        { "anthropic-beta": [...betas ?? [], "skills-2025-10-02"].toString() },
        options?.headers
      ])
    });
  }
  /**
   * Delete Skill
   *
   * @example
   * ```ts
   * const skill = await client.beta.skills.delete('skill_id');
   * ```
   */
  delete(skillID, params = {}, options) {
    const { betas } = params ?? {};
    return this._client.delete(path4`/v1/skills/${skillID}?beta=true`, {
      ...options,
      headers: buildHeaders([
        { "anthropic-beta": [...betas ?? [], "skills-2025-10-02"].toString() },
        options?.headers
      ])
    });
  }
};
Skills.Versions = Versions;

// node_modules/@anthropic-ai/sdk/resources/beta/beta.mjs
var Beta = class extends APIResource {
  constructor() {
    super(...arguments);
    this.models = new Models(this._client);
    this.messages = new Messages(this._client);
    this.files = new Files(this._client);
    this.skills = new Skills(this._client);
  }
};
Beta.Models = Models;
Beta.Messages = Messages;
Beta.Files = Files;
Beta.Skills = Skills;

// node_modules/@anthropic-ai/sdk/resources/completions.mjs
init_esbuild_shim();
var Completions = class extends APIResource {
  create(params, options) {
    const { betas, ...body2 } = params;
    return this._client.post("/v1/complete", {
      body: body2,
      timeout: this._client._options.timeout ?? 6e5,
      ...options,
      headers: buildHeaders([
        { ...betas?.toString() != null ? { "anthropic-beta": betas?.toString() } : void 0 },
        options?.headers
      ]),
      stream: params.stream ?? false
    });
  }
};

// node_modules/@anthropic-ai/sdk/resources/messages/messages.mjs
init_esbuild_shim();

// node_modules/@anthropic-ai/sdk/lib/MessageStream.mjs
init_esbuild_shim();
var _MessageStream_instances;
var _MessageStream_currentMessageSnapshot;
var _MessageStream_connectedPromise;
var _MessageStream_resolveConnectedPromise;
var _MessageStream_rejectConnectedPromise;
var _MessageStream_endPromise;
var _MessageStream_resolveEndPromise;
var _MessageStream_rejectEndPromise;
var _MessageStream_listeners;
var _MessageStream_ended;
var _MessageStream_errored;
var _MessageStream_aborted;
var _MessageStream_catchingPromiseCreated;
var _MessageStream_response;
var _MessageStream_request_id;
var _MessageStream_getFinalMessage;
var _MessageStream_getFinalText;
var _MessageStream_handleError;
var _MessageStream_beginRequest;
var _MessageStream_addStreamEvent;
var _MessageStream_endRequest;
var _MessageStream_accumulateMessage;
var JSON_BUF_PROPERTY2 = "__json_buf";
function tracksToolInput2(content) {
  return content.type === "tool_use" || content.type === "server_tool_use";
}
var MessageStream = class _MessageStream {
  constructor() {
    _MessageStream_instances.add(this);
    this.messages = [];
    this.receivedMessages = [];
    _MessageStream_currentMessageSnapshot.set(this, void 0);
    this.controller = new AbortController();
    _MessageStream_connectedPromise.set(this, void 0);
    _MessageStream_resolveConnectedPromise.set(this, () => {
    });
    _MessageStream_rejectConnectedPromise.set(this, () => {
    });
    _MessageStream_endPromise.set(this, void 0);
    _MessageStream_resolveEndPromise.set(this, () => {
    });
    _MessageStream_rejectEndPromise.set(this, () => {
    });
    _MessageStream_listeners.set(this, {});
    _MessageStream_ended.set(this, false);
    _MessageStream_errored.set(this, false);
    _MessageStream_aborted.set(this, false);
    _MessageStream_catchingPromiseCreated.set(this, false);
    _MessageStream_response.set(this, void 0);
    _MessageStream_request_id.set(this, void 0);
    _MessageStream_handleError.set(this, (error) => {
      __classPrivateFieldSet(this, _MessageStream_errored, true, "f");
      if (isAbortError(error)) {
        error = new APIUserAbortError();
      }
      if (error instanceof APIUserAbortError) {
        __classPrivateFieldSet(this, _MessageStream_aborted, true, "f");
        return this._emit("abort", error);
      }
      if (error instanceof AnthropicError) {
        return this._emit("error", error);
      }
      if (error instanceof Error) {
        const anthropicError = new AnthropicError(error.message);
        anthropicError.cause = error;
        return this._emit("error", anthropicError);
      }
      return this._emit("error", new AnthropicError(String(error)));
    });
    __classPrivateFieldSet(this, _MessageStream_connectedPromise, new Promise((resolve, reject) => {
      __classPrivateFieldSet(this, _MessageStream_resolveConnectedPromise, resolve, "f");
      __classPrivateFieldSet(this, _MessageStream_rejectConnectedPromise, reject, "f");
    }), "f");
    __classPrivateFieldSet(this, _MessageStream_endPromise, new Promise((resolve, reject) => {
      __classPrivateFieldSet(this, _MessageStream_resolveEndPromise, resolve, "f");
      __classPrivateFieldSet(this, _MessageStream_rejectEndPromise, reject, "f");
    }), "f");
    __classPrivateFieldGet(this, _MessageStream_connectedPromise, "f").catch(() => {
    });
    __classPrivateFieldGet(this, _MessageStream_endPromise, "f").catch(() => {
    });
  }
  get response() {
    return __classPrivateFieldGet(this, _MessageStream_response, "f");
  }
  get request_id() {
    return __classPrivateFieldGet(this, _MessageStream_request_id, "f");
  }
  /**
   * Returns the `MessageStream` data, the raw `Response` instance and the ID of the request,
   * returned vie the `request-id` header which is useful for debugging requests and resporting
   * issues to Anthropic.
   *
   * This is the same as the `APIPromise.withResponse()` method.
   *
   * This method will raise an error if you created the stream using `MessageStream.fromReadableStream`
   * as no `Response` is available.
   */
  async withResponse() {
    __classPrivateFieldSet(this, _MessageStream_catchingPromiseCreated, true, "f");
    const response = await __classPrivateFieldGet(this, _MessageStream_connectedPromise, "f");
    if (!response) {
      throw new Error("Could not resolve a `Response` object");
    }
    return {
      data: this,
      response,
      request_id: response.headers.get("request-id")
    };
  }
  /**
   * Intended for use on the frontend, consuming a stream produced with
   * `.toReadableStream()` on the backend.
   *
   * Note that messages sent to the model do not appear in `.on('message')`
   * in this context.
   */
  static fromReadableStream(stream) {
    const runner = new _MessageStream();
    runner._run(() => runner._fromReadableStream(stream));
    return runner;
  }
  static createMessage(messages, params, options) {
    const runner = new _MessageStream();
    for (const message of params.messages) {
      runner._addMessageParam(message);
    }
    runner._run(() => runner._createMessage(messages, { ...params, stream: true }, { ...options, headers: { ...options?.headers, "X-Stainless-Helper-Method": "stream" } }));
    return runner;
  }
  _run(executor) {
    executor().then(() => {
      this._emitFinal();
      this._emit("end");
    }, __classPrivateFieldGet(this, _MessageStream_handleError, "f"));
  }
  _addMessageParam(message) {
    this.messages.push(message);
  }
  _addMessage(message, emit = true) {
    this.receivedMessages.push(message);
    if (emit) {
      this._emit("message", message);
    }
  }
  async _createMessage(messages, params, options) {
    const signal = options?.signal;
    let abortHandler;
    if (signal) {
      if (signal.aborted)
        this.controller.abort();
      abortHandler = this.controller.abort.bind(this.controller);
      signal.addEventListener("abort", abortHandler);
    }
    try {
      __classPrivateFieldGet(this, _MessageStream_instances, "m", _MessageStream_beginRequest).call(this);
      const { response, data: stream } = await messages.create({ ...params, stream: true }, { ...options, signal: this.controller.signal }).withResponse();
      this._connected(response);
      for await (const event of stream) {
        __classPrivateFieldGet(this, _MessageStream_instances, "m", _MessageStream_addStreamEvent).call(this, event);
      }
      if (stream.controller.signal?.aborted) {
        throw new APIUserAbortError();
      }
      __classPrivateFieldGet(this, _MessageStream_instances, "m", _MessageStream_endRequest).call(this);
    } finally {
      if (signal && abortHandler) {
        signal.removeEventListener("abort", abortHandler);
      }
    }
  }
  _connected(response) {
    if (this.ended)
      return;
    __classPrivateFieldSet(this, _MessageStream_response, response, "f");
    __classPrivateFieldSet(this, _MessageStream_request_id, response?.headers.get("request-id"), "f");
    __classPrivateFieldGet(this, _MessageStream_resolveConnectedPromise, "f").call(this, response);
    this._emit("connect");
  }
  get ended() {
    return __classPrivateFieldGet(this, _MessageStream_ended, "f");
  }
  get errored() {
    return __classPrivateFieldGet(this, _MessageStream_errored, "f");
  }
  get aborted() {
    return __classPrivateFieldGet(this, _MessageStream_aborted, "f");
  }
  abort() {
    this.controller.abort();
  }
  /**
   * Adds the listener function to the end of the listeners array for the event.
   * No checks are made to see if the listener has already been added. Multiple calls passing
   * the same combination of event and listener will result in the listener being added, and
   * called, multiple times.
   * @returns this MessageStream, so that calls can be chained
   */
  on(event, listener) {
    const listeners = __classPrivateFieldGet(this, _MessageStream_listeners, "f")[event] || (__classPrivateFieldGet(this, _MessageStream_listeners, "f")[event] = []);
    listeners.push({ listener });
    return this;
  }
  /**
   * Removes the specified listener from the listener array for the event.
   * off() will remove, at most, one instance of a listener from the listener array. If any single
   * listener has been added multiple times to the listener array for the specified event, then
   * off() must be called multiple times to remove each instance.
   * @returns this MessageStream, so that calls can be chained
   */
  off(event, listener) {
    const listeners = __classPrivateFieldGet(this, _MessageStream_listeners, "f")[event];
    if (!listeners)
      return this;
    const index = listeners.findIndex((l) => l.listener === listener);
    if (index >= 0)
      listeners.splice(index, 1);
    return this;
  }
  /**
   * Adds a one-time listener function for the event. The next time the event is triggered,
   * this listener is removed and then invoked.
   * @returns this MessageStream, so that calls can be chained
   */
  once(event, listener) {
    const listeners = __classPrivateFieldGet(this, _MessageStream_listeners, "f")[event] || (__classPrivateFieldGet(this, _MessageStream_listeners, "f")[event] = []);
    listeners.push({ listener, once: true });
    return this;
  }
  /**
   * This is similar to `.once()`, but returns a Promise that resolves the next time
   * the event is triggered, instead of calling a listener callback.
   * @returns a Promise that resolves the next time given event is triggered,
   * or rejects if an error is emitted.  (If you request the 'error' event,
   * returns a promise that resolves with the error).
   *
   * Example:
   *
   *   const message = await stream.emitted('message') // rejects if the stream errors
   */
  emitted(event) {
    return new Promise((resolve, reject) => {
      __classPrivateFieldSet(this, _MessageStream_catchingPromiseCreated, true, "f");
      if (event !== "error")
        this.once("error", reject);
      this.once(event, resolve);
    });
  }
  async done() {
    __classPrivateFieldSet(this, _MessageStream_catchingPromiseCreated, true, "f");
    await __classPrivateFieldGet(this, _MessageStream_endPromise, "f");
  }
  get currentMessage() {
    return __classPrivateFieldGet(this, _MessageStream_currentMessageSnapshot, "f");
  }
  /**
   * @returns a promise that resolves with the the final assistant Message response,
   * or rejects if an error occurred or the stream ended prematurely without producing a Message.
   */
  async finalMessage() {
    await this.done();
    return __classPrivateFieldGet(this, _MessageStream_instances, "m", _MessageStream_getFinalMessage).call(this);
  }
  /**
   * @returns a promise that resolves with the the final assistant Message's text response, concatenated
   * together if there are more than one text blocks.
   * Rejects if an error occurred or the stream ended prematurely without producing a Message.
   */
  async finalText() {
    await this.done();
    return __classPrivateFieldGet(this, _MessageStream_instances, "m", _MessageStream_getFinalText).call(this);
  }
  _emit(event, ...args2) {
    if (__classPrivateFieldGet(this, _MessageStream_ended, "f"))
      return;
    if (event === "end") {
      __classPrivateFieldSet(this, _MessageStream_ended, true, "f");
      __classPrivateFieldGet(this, _MessageStream_resolveEndPromise, "f").call(this);
    }
    const listeners = __classPrivateFieldGet(this, _MessageStream_listeners, "f")[event];
    if (listeners) {
      __classPrivateFieldGet(this, _MessageStream_listeners, "f")[event] = listeners.filter((l) => !l.once);
      listeners.forEach(({ listener }) => listener(...args2));
    }
    if (event === "abort") {
      const error = args2[0];
      if (!__classPrivateFieldGet(this, _MessageStream_catchingPromiseCreated, "f") && !listeners?.length) {
        Promise.reject(error);
      }
      __classPrivateFieldGet(this, _MessageStream_rejectConnectedPromise, "f").call(this, error);
      __classPrivateFieldGet(this, _MessageStream_rejectEndPromise, "f").call(this, error);
      this._emit("end");
      return;
    }
    if (event === "error") {
      const error = args2[0];
      if (!__classPrivateFieldGet(this, _MessageStream_catchingPromiseCreated, "f") && !listeners?.length) {
        Promise.reject(error);
      }
      __classPrivateFieldGet(this, _MessageStream_rejectConnectedPromise, "f").call(this, error);
      __classPrivateFieldGet(this, _MessageStream_rejectEndPromise, "f").call(this, error);
      this._emit("end");
    }
  }
  _emitFinal() {
    const finalMessage = this.receivedMessages.at(-1);
    if (finalMessage) {
      this._emit("finalMessage", __classPrivateFieldGet(this, _MessageStream_instances, "m", _MessageStream_getFinalMessage).call(this));
    }
  }
  async _fromReadableStream(readableStream, options) {
    const signal = options?.signal;
    let abortHandler;
    if (signal) {
      if (signal.aborted)
        this.controller.abort();
      abortHandler = this.controller.abort.bind(this.controller);
      signal.addEventListener("abort", abortHandler);
    }
    try {
      __classPrivateFieldGet(this, _MessageStream_instances, "m", _MessageStream_beginRequest).call(this);
      this._connected(null);
      const stream = Stream.fromReadableStream(readableStream, this.controller);
      for await (const event of stream) {
        __classPrivateFieldGet(this, _MessageStream_instances, "m", _MessageStream_addStreamEvent).call(this, event);
      }
      if (stream.controller.signal?.aborted) {
        throw new APIUserAbortError();
      }
      __classPrivateFieldGet(this, _MessageStream_instances, "m", _MessageStream_endRequest).call(this);
    } finally {
      if (signal && abortHandler) {
        signal.removeEventListener("abort", abortHandler);
      }
    }
  }
  [(_MessageStream_currentMessageSnapshot = /* @__PURE__ */ new WeakMap(), _MessageStream_connectedPromise = /* @__PURE__ */ new WeakMap(), _MessageStream_resolveConnectedPromise = /* @__PURE__ */ new WeakMap(), _MessageStream_rejectConnectedPromise = /* @__PURE__ */ new WeakMap(), _MessageStream_endPromise = /* @__PURE__ */ new WeakMap(), _MessageStream_resolveEndPromise = /* @__PURE__ */ new WeakMap(), _MessageStream_rejectEndPromise = /* @__PURE__ */ new WeakMap(), _MessageStream_listeners = /* @__PURE__ */ new WeakMap(), _MessageStream_ended = /* @__PURE__ */ new WeakMap(), _MessageStream_errored = /* @__PURE__ */ new WeakMap(), _MessageStream_aborted = /* @__PURE__ */ new WeakMap(), _MessageStream_catchingPromiseCreated = /* @__PURE__ */ new WeakMap(), _MessageStream_response = /* @__PURE__ */ new WeakMap(), _MessageStream_request_id = /* @__PURE__ */ new WeakMap(), _MessageStream_handleError = /* @__PURE__ */ new WeakMap(), _MessageStream_instances = /* @__PURE__ */ new WeakSet(), _MessageStream_getFinalMessage = function _MessageStream_getFinalMessage2() {
    if (this.receivedMessages.length === 0) {
      throw new AnthropicError("stream ended without producing a Message with role=assistant");
    }
    return this.receivedMessages.at(-1);
  }, _MessageStream_getFinalText = function _MessageStream_getFinalText2() {
    if (this.receivedMessages.length === 0) {
      throw new AnthropicError("stream ended without producing a Message with role=assistant");
    }
    const textBlocks = this.receivedMessages.at(-1).content.filter((block) => block.type === "text").map((block) => block.text);
    if (textBlocks.length === 0) {
      throw new AnthropicError("stream ended without producing a content block with type=text");
    }
    return textBlocks.join(" ");
  }, _MessageStream_beginRequest = function _MessageStream_beginRequest2() {
    if (this.ended)
      return;
    __classPrivateFieldSet(this, _MessageStream_currentMessageSnapshot, void 0, "f");
  }, _MessageStream_addStreamEvent = function _MessageStream_addStreamEvent2(event) {
    if (this.ended)
      return;
    const messageSnapshot = __classPrivateFieldGet(this, _MessageStream_instances, "m", _MessageStream_accumulateMessage).call(this, event);
    this._emit("streamEvent", event, messageSnapshot);
    switch (event.type) {
      case "content_block_delta": {
        const content = messageSnapshot.content.at(-1);
        switch (event.delta.type) {
          case "text_delta": {
            if (content.type === "text") {
              this._emit("text", event.delta.text, content.text || "");
            }
            break;
          }
          case "citations_delta": {
            if (content.type === "text") {
              this._emit("citation", event.delta.citation, content.citations ?? []);
            }
            break;
          }
          case "input_json_delta": {
            if (tracksToolInput2(content) && content.input) {
              this._emit("inputJson", event.delta.partial_json, content.input);
            }
            break;
          }
          case "thinking_delta": {
            if (content.type === "thinking") {
              this._emit("thinking", event.delta.thinking, content.thinking);
            }
            break;
          }
          case "signature_delta": {
            if (content.type === "thinking") {
              this._emit("signature", content.signature);
            }
            break;
          }
          default:
            checkNever2(event.delta);
        }
        break;
      }
      case "message_stop": {
        this._addMessageParam(messageSnapshot);
        this._addMessage(messageSnapshot, true);
        break;
      }
      case "content_block_stop": {
        this._emit("contentBlock", messageSnapshot.content.at(-1));
        break;
      }
      case "message_start": {
        __classPrivateFieldSet(this, _MessageStream_currentMessageSnapshot, messageSnapshot, "f");
        break;
      }
      case "content_block_start":
      case "message_delta":
        break;
    }
  }, _MessageStream_endRequest = function _MessageStream_endRequest2() {
    if (this.ended) {
      throw new AnthropicError(`stream has ended, this shouldn't happen`);
    }
    const snapshot = __classPrivateFieldGet(this, _MessageStream_currentMessageSnapshot, "f");
    if (!snapshot) {
      throw new AnthropicError(`request ended without sending any chunks`);
    }
    __classPrivateFieldSet(this, _MessageStream_currentMessageSnapshot, void 0, "f");
    return snapshot;
  }, _MessageStream_accumulateMessage = function _MessageStream_accumulateMessage2(event) {
    let snapshot = __classPrivateFieldGet(this, _MessageStream_currentMessageSnapshot, "f");
    if (event.type === "message_start") {
      if (snapshot) {
        throw new AnthropicError(`Unexpected event order, got ${event.type} before receiving "message_stop"`);
      }
      return event.message;
    }
    if (!snapshot) {
      throw new AnthropicError(`Unexpected event order, got ${event.type} before "message_start"`);
    }
    switch (event.type) {
      case "message_stop":
        return snapshot;
      case "message_delta":
        snapshot.stop_reason = event.delta.stop_reason;
        snapshot.stop_sequence = event.delta.stop_sequence;
        snapshot.usage.output_tokens = event.usage.output_tokens;
        if (event.usage.input_tokens != null) {
          snapshot.usage.input_tokens = event.usage.input_tokens;
        }
        if (event.usage.cache_creation_input_tokens != null) {
          snapshot.usage.cache_creation_input_tokens = event.usage.cache_creation_input_tokens;
        }
        if (event.usage.cache_read_input_tokens != null) {
          snapshot.usage.cache_read_input_tokens = event.usage.cache_read_input_tokens;
        }
        if (event.usage.server_tool_use != null) {
          snapshot.usage.server_tool_use = event.usage.server_tool_use;
        }
        return snapshot;
      case "content_block_start":
        snapshot.content.push({ ...event.content_block });
        return snapshot;
      case "content_block_delta": {
        const snapshotContent = snapshot.content.at(event.index);
        switch (event.delta.type) {
          case "text_delta": {
            if (snapshotContent?.type === "text") {
              snapshot.content[event.index] = {
                ...snapshotContent,
                text: (snapshotContent.text || "") + event.delta.text
              };
            }
            break;
          }
          case "citations_delta": {
            if (snapshotContent?.type === "text") {
              snapshot.content[event.index] = {
                ...snapshotContent,
                citations: [...snapshotContent.citations ?? [], event.delta.citation]
              };
            }
            break;
          }
          case "input_json_delta": {
            if (snapshotContent && tracksToolInput2(snapshotContent)) {
              let jsonBuf = snapshotContent[JSON_BUF_PROPERTY2] || "";
              jsonBuf += event.delta.partial_json;
              const newContent = { ...snapshotContent };
              Object.defineProperty(newContent, JSON_BUF_PROPERTY2, {
                value: jsonBuf,
                enumerable: false,
                writable: true
              });
              if (jsonBuf) {
                newContent.input = partialParse(jsonBuf);
              }
              snapshot.content[event.index] = newContent;
            }
            break;
          }
          case "thinking_delta": {
            if (snapshotContent?.type === "thinking") {
              snapshot.content[event.index] = {
                ...snapshotContent,
                thinking: snapshotContent.thinking + event.delta.thinking
              };
            }
            break;
          }
          case "signature_delta": {
            if (snapshotContent?.type === "thinking") {
              snapshot.content[event.index] = {
                ...snapshotContent,
                signature: event.delta.signature
              };
            }
            break;
          }
          default:
            checkNever2(event.delta);
        }
        return snapshot;
      }
      case "content_block_stop":
        return snapshot;
    }
  }, Symbol.asyncIterator)]() {
    const pushQueue = [];
    const readQueue = [];
    let done = false;
    this.on("streamEvent", (event) => {
      const reader = readQueue.shift();
      if (reader) {
        reader.resolve(event);
      } else {
        pushQueue.push(event);
      }
    });
    this.on("end", () => {
      done = true;
      for (const reader of readQueue) {
        reader.resolve(void 0);
      }
      readQueue.length = 0;
    });
    this.on("abort", (err2) => {
      done = true;
      for (const reader of readQueue) {
        reader.reject(err2);
      }
      readQueue.length = 0;
    });
    this.on("error", (err2) => {
      done = true;
      for (const reader of readQueue) {
        reader.reject(err2);
      }
      readQueue.length = 0;
    });
    return {
      next: async () => {
        if (!pushQueue.length) {
          if (done) {
            return { value: void 0, done: true };
          }
          return new Promise((resolve, reject) => readQueue.push({ resolve, reject })).then((chunk2) => chunk2 ? { value: chunk2, done: false } : { value: void 0, done: true });
        }
        const chunk = pushQueue.shift();
        return { value: chunk, done: false };
      },
      return: async () => {
        this.abort();
        return { value: void 0, done: true };
      }
    };
  }
  toReadableStream() {
    const stream = new Stream(this[Symbol.asyncIterator].bind(this), this.controller);
    return stream.toReadableStream();
  }
};
function checkNever2(x) {
}

// node_modules/@anthropic-ai/sdk/resources/messages/batches.mjs
init_esbuild_shim();
var Batches2 = class extends APIResource {
  /**
   * Send a batch of Message creation requests.
   *
   * The Message Batches API can be used to process multiple Messages API requests at
   * once. Once a Message Batch is created, it begins processing immediately. Batches
   * can take up to 24 hours to complete.
   *
   * Learn more about the Message Batches API in our
   * [user guide](https://docs.claude.com/en/docs/build-with-claude/batch-processing)
   *
   * @example
   * ```ts
   * const messageBatch = await client.messages.batches.create({
   *   requests: [
   *     {
   *       custom_id: 'my-custom-id-1',
   *       params: {
   *         max_tokens: 1024,
   *         messages: [
   *           { content: 'Hello, world', role: 'user' },
   *         ],
   *         model: 'claude-sonnet-4-5-20250929',
   *       },
   *     },
   *   ],
   * });
   * ```
   */
  create(body2, options) {
    return this._client.post("/v1/messages/batches", { body: body2, ...options });
  }
  /**
   * This endpoint is idempotent and can be used to poll for Message Batch
   * completion. To access the results of a Message Batch, make a request to the
   * `results_url` field in the response.
   *
   * Learn more about the Message Batches API in our
   * [user guide](https://docs.claude.com/en/docs/build-with-claude/batch-processing)
   *
   * @example
   * ```ts
   * const messageBatch = await client.messages.batches.retrieve(
   *   'message_batch_id',
   * );
   * ```
   */
  retrieve(messageBatchID, options) {
    return this._client.get(path4`/v1/messages/batches/${messageBatchID}`, options);
  }
  /**
   * List all Message Batches within a Workspace. Most recently created batches are
   * returned first.
   *
   * Learn more about the Message Batches API in our
   * [user guide](https://docs.claude.com/en/docs/build-with-claude/batch-processing)
   *
   * @example
   * ```ts
   * // Automatically fetches more pages as needed.
   * for await (const messageBatch of client.messages.batches.list()) {
   *   // ...
   * }
   * ```
   */
  list(query = {}, options) {
    return this._client.getAPIList("/v1/messages/batches", Page, { query, ...options });
  }
  /**
   * Delete a Message Batch.
   *
   * Message Batches can only be deleted once they've finished processing. If you'd
   * like to delete an in-progress batch, you must first cancel it.
   *
   * Learn more about the Message Batches API in our
   * [user guide](https://docs.claude.com/en/docs/build-with-claude/batch-processing)
   *
   * @example
   * ```ts
   * const deletedMessageBatch =
   *   await client.messages.batches.delete('message_batch_id');
   * ```
   */
  delete(messageBatchID, options) {
    return this._client.delete(path4`/v1/messages/batches/${messageBatchID}`, options);
  }
  /**
   * Batches may be canceled any time before processing ends. Once cancellation is
   * initiated, the batch enters a `canceling` state, at which time the system may
   * complete any in-progress, non-interruptible requests before finalizing
   * cancellation.
   *
   * The number of canceled requests is specified in `request_counts`. To determine
   * which requests were canceled, check the individual results within the batch.
   * Note that cancellation may not result in any canceled requests if they were
   * non-interruptible.
   *
   * Learn more about the Message Batches API in our
   * [user guide](https://docs.claude.com/en/docs/build-with-claude/batch-processing)
   *
   * @example
   * ```ts
   * const messageBatch = await client.messages.batches.cancel(
   *   'message_batch_id',
   * );
   * ```
   */
  cancel(messageBatchID, options) {
    return this._client.post(path4`/v1/messages/batches/${messageBatchID}/cancel`, options);
  }
  /**
   * Streams the results of a Message Batch as a `.jsonl` file.
   *
   * Each line in the file is a JSON object containing the result of a single request
   * in the Message Batch. Results are not guaranteed to be in the same order as
   * requests. Use the `custom_id` field to match results to requests.
   *
   * Learn more about the Message Batches API in our
   * [user guide](https://docs.claude.com/en/docs/build-with-claude/batch-processing)
   *
   * @example
   * ```ts
   * const messageBatchIndividualResponse =
   *   await client.messages.batches.results('message_batch_id');
   * ```
   */
  async results(messageBatchID, options) {
    const batch = await this.retrieve(messageBatchID);
    if (!batch.results_url) {
      throw new AnthropicError(`No batch \`results_url\`; Has it finished processing? ${batch.processing_status} - ${batch.id}`);
    }
    return this._client.get(batch.results_url, {
      ...options,
      headers: buildHeaders([{ Accept: "application/binary" }, options?.headers]),
      stream: true,
      __binaryResponse: true
    })._thenUnwrap((_, props) => JSONLDecoder.fromResponse(props.response, props.controller));
  }
};

// node_modules/@anthropic-ai/sdk/resources/messages/messages.mjs
var Messages2 = class extends APIResource {
  constructor() {
    super(...arguments);
    this.batches = new Batches2(this._client);
  }
  create(body2, options) {
    if (body2.model in DEPRECATED_MODELS2) {
      console.warn(`The model '${body2.model}' is deprecated and will reach end-of-life on ${DEPRECATED_MODELS2[body2.model]}
Please migrate to a newer model. Visit https://docs.anthropic.com/en/docs/resources/model-deprecations for more information.`);
    }
    let timeout = this._client._options.timeout;
    if (!body2.stream && timeout == null) {
      const maxNonstreamingTokens = MODEL_NONSTREAMING_TOKENS[body2.model] ?? void 0;
      timeout = this._client.calculateNonstreamingTimeout(body2.max_tokens, maxNonstreamingTokens);
    }
    return this._client.post("/v1/messages", {
      body: body2,
      timeout: timeout ?? 6e5,
      ...options,
      stream: body2.stream ?? false
    });
  }
  /**
   * Create a Message stream
   */
  stream(body2, options) {
    return MessageStream.createMessage(this, body2, options);
  }
  /**
   * Count the number of tokens in a Message.
   *
   * The Token Count API can be used to count the number of tokens in a Message,
   * including tools, images, and documents, without creating it.
   *
   * Learn more about token counting in our
   * [user guide](https://docs.claude.com/en/docs/build-with-claude/token-counting)
   *
   * @example
   * ```ts
   * const messageTokensCount =
   *   await client.messages.countTokens({
   *     messages: [{ content: 'string', role: 'user' }],
   *     model: 'claude-opus-4-5-20251101',
   *   });
   * ```
   */
  countTokens(body2, options) {
    return this._client.post("/v1/messages/count_tokens", { body: body2, ...options });
  }
};
var DEPRECATED_MODELS2 = {
  "claude-1.3": "November 6th, 2024",
  "claude-1.3-100k": "November 6th, 2024",
  "claude-instant-1.1": "November 6th, 2024",
  "claude-instant-1.1-100k": "November 6th, 2024",
  "claude-instant-1.2": "November 6th, 2024",
  "claude-3-sonnet-20240229": "July 21st, 2025",
  "claude-3-opus-20240229": "January 5th, 2026",
  "claude-2.1": "July 21st, 2025",
  "claude-2.0": "July 21st, 2025",
  "claude-3-7-sonnet-latest": "February 19th, 2026",
  "claude-3-7-sonnet-20250219": "February 19th, 2026"
};
Messages2.Batches = Batches2;

// node_modules/@anthropic-ai/sdk/resources/models.mjs
init_esbuild_shim();
var Models2 = class extends APIResource {
  /**
   * Get a specific model.
   *
   * The Models API response can be used to determine information about a specific
   * model or resolve a model alias to a model ID.
   */
  retrieve(modelID, params = {}, options) {
    const { betas } = params ?? {};
    return this._client.get(path4`/v1/models/${modelID}`, {
      ...options,
      headers: buildHeaders([
        { ...betas?.toString() != null ? { "anthropic-beta": betas?.toString() } : void 0 },
        options?.headers
      ])
    });
  }
  /**
   * List available models.
   *
   * The Models API response can be used to determine which models are available for
   * use in the API. More recently released models are listed first.
   */
  list(params = {}, options) {
    const { betas, ...query } = params ?? {};
    return this._client.getAPIList("/v1/models", Page, {
      query,
      ...options,
      headers: buildHeaders([
        { ...betas?.toString() != null ? { "anthropic-beta": betas?.toString() } : void 0 },
        options?.headers
      ])
    });
  }
};

// node_modules/@anthropic-ai/sdk/internal/utils/env.mjs
init_esbuild_shim();
var readEnv = (env) => {
  if (typeof globalThis.process !== "undefined") {
    return globalThis.process.env?.[env]?.trim() ?? void 0;
  }
  if (typeof globalThis.Deno !== "undefined") {
    return globalThis.Deno.env?.get?.(env)?.trim();
  }
  return void 0;
};

// node_modules/@anthropic-ai/sdk/client.mjs
var _BaseAnthropic_instances;
var _a;
var _BaseAnthropic_encoder;
var _BaseAnthropic_baseURLOverridden;
var HUMAN_PROMPT = "\\n\\nHuman:";
var AI_PROMPT = "\\n\\nAssistant:";
var BaseAnthropic = class {
  /**
   * API Client for interfacing with the Anthropic API.
   *
   * @param {string | null | undefined} [opts.apiKey=process.env['ANTHROPIC_API_KEY'] ?? null]
   * @param {string | null | undefined} [opts.authToken=process.env['ANTHROPIC_AUTH_TOKEN'] ?? null]
   * @param {string} [opts.baseURL=process.env['ANTHROPIC_BASE_URL'] ?? https://api.anthropic.com] - Override the default base URL for the API.
   * @param {number} [opts.timeout=10 minutes] - The maximum amount of time (in milliseconds) the client will wait for a response before timing out.
   * @param {MergedRequestInit} [opts.fetchOptions] - Additional `RequestInit` options to be passed to `fetch` calls.
   * @param {Fetch} [opts.fetch] - Specify a custom `fetch` function implementation.
   * @param {number} [opts.maxRetries=2] - The maximum number of times the client will retry a request.
   * @param {HeadersLike} opts.defaultHeaders - Default headers to include with every request to the API.
   * @param {Record<string, string | undefined>} opts.defaultQuery - Default query parameters to include with every request to the API.
   * @param {boolean} [opts.dangerouslyAllowBrowser=false] - By default, client-side use of this library is not allowed, as it risks exposing your secret API credentials to attackers.
   */
  constructor({ baseURL = readEnv("ANTHROPIC_BASE_URL"), apiKey = readEnv("ANTHROPIC_API_KEY") ?? null, authToken = readEnv("ANTHROPIC_AUTH_TOKEN") ?? null, ...opts } = {}) {
    _BaseAnthropic_instances.add(this);
    _BaseAnthropic_encoder.set(this, void 0);
    const options = {
      apiKey,
      authToken,
      ...opts,
      baseURL: baseURL || `https://api.anthropic.com`
    };
    if (!options.dangerouslyAllowBrowser && isRunningInBrowser()) {
      throw new AnthropicError("It looks like you're running in a browser-like environment.\n\nThis is disabled by default, as it risks exposing your secret API credentials to attackers.\nIf you understand the risks and have appropriate mitigations in place,\nyou can set the `dangerouslyAllowBrowser` option to `true`, e.g.,\n\nnew Anthropic({ apiKey, dangerouslyAllowBrowser: true });\n");
    }
    this.baseURL = options.baseURL;
    this.timeout = options.timeout ?? _a.DEFAULT_TIMEOUT;
    this.logger = options.logger ?? console;
    const defaultLogLevel = "warn";
    this.logLevel = defaultLogLevel;
    this.logLevel = parseLogLevel(options.logLevel, "ClientOptions.logLevel", this) ?? parseLogLevel(readEnv("ANTHROPIC_LOG"), "process.env['ANTHROPIC_LOG']", this) ?? defaultLogLevel;
    this.fetchOptions = options.fetchOptions;
    this.maxRetries = options.maxRetries ?? 2;
    this.fetch = options.fetch ?? getDefaultFetch();
    __classPrivateFieldSet(this, _BaseAnthropic_encoder, FallbackEncoder, "f");
    this._options = options;
    this.apiKey = typeof apiKey === "string" ? apiKey : null;
    this.authToken = authToken;
  }
  /**
   * Create a new client instance re-using the same options given to the current client with optional overriding.
   */
  withOptions(options) {
    const client = new this.constructor({
      ...this._options,
      baseURL: this.baseURL,
      maxRetries: this.maxRetries,
      timeout: this.timeout,
      logger: this.logger,
      logLevel: this.logLevel,
      fetch: this.fetch,
      fetchOptions: this.fetchOptions,
      apiKey: this.apiKey,
      authToken: this.authToken,
      ...options
    });
    return client;
  }
  defaultQuery() {
    return this._options.defaultQuery;
  }
  validateHeaders({ values, nulls }) {
    if (values.get("x-api-key") || values.get("authorization")) {
      return;
    }
    if (this.apiKey && values.get("x-api-key")) {
      return;
    }
    if (nulls.has("x-api-key")) {
      return;
    }
    if (this.authToken && values.get("authorization")) {
      return;
    }
    if (nulls.has("authorization")) {
      return;
    }
    throw new Error('Could not resolve authentication method. Expected either apiKey or authToken to be set. Or for one of the "X-Api-Key" or "Authorization" headers to be explicitly omitted');
  }
  async authHeaders(opts) {
    return buildHeaders([await this.apiKeyAuth(opts), await this.bearerAuth(opts)]);
  }
  async apiKeyAuth(opts) {
    if (this.apiKey == null) {
      return void 0;
    }
    return buildHeaders([{ "X-Api-Key": this.apiKey }]);
  }
  async bearerAuth(opts) {
    if (this.authToken == null) {
      return void 0;
    }
    return buildHeaders([{ Authorization: `Bearer ${this.authToken}` }]);
  }
  /**
   * Basic re-implementation of `qs.stringify` for primitive types.
   */
  stringifyQuery(query) {
    return Object.entries(query).filter(([_, value]) => typeof value !== "undefined").map(([key, value]) => {
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
      }
      if (value === null) {
        return `${encodeURIComponent(key)}=`;
      }
      throw new AnthropicError(`Cannot stringify type ${typeof value}; Expected string, number, boolean, or null. If you need to pass nested query parameters, you can manually encode them, e.g. { query: { 'foo[key1]': value1, 'foo[key2]': value2 } }, and please open a GitHub issue requesting better support for your use case.`);
    }).join("&");
  }
  getUserAgent() {
    return `${this.constructor.name}/JS ${VERSION}`;
  }
  defaultIdempotencyKey() {
    return `stainless-node-retry-${uuid4()}`;
  }
  makeStatusError(status, error, message, headers) {
    return APIError.generate(status, error, message, headers);
  }
  buildURL(path15, query, defaultBaseURL) {
    const baseURL = !__classPrivateFieldGet(this, _BaseAnthropic_instances, "m", _BaseAnthropic_baseURLOverridden).call(this) && defaultBaseURL || this.baseURL;
    const url = isAbsoluteURL(path15) ? new URL(path15) : new URL(baseURL + (baseURL.endsWith("/") && path15.startsWith("/") ? path15.slice(1) : path15));
    const defaultQuery = this.defaultQuery();
    if (!isEmptyObj(defaultQuery)) {
      query = { ...defaultQuery, ...query };
    }
    if (typeof query === "object" && query && !Array.isArray(query)) {
      url.search = this.stringifyQuery(query);
    }
    return url.toString();
  }
  _calculateNonstreamingTimeout(maxTokens) {
    const defaultTimeout = 10 * 60;
    const expectedTimeout = 60 * 60 * maxTokens / 128e3;
    if (expectedTimeout > defaultTimeout) {
      throw new AnthropicError("Streaming is required for operations that may take longer than 10 minutes. See https://github.com/anthropics/anthropic-sdk-typescript#streaming-responses for more details");
    }
    return defaultTimeout * 1e3;
  }
  /**
   * Used as a callback for mutating the given `FinalRequestOptions` object.
   */
  async prepareOptions(options) {
  }
  /**
   * Used as a callback for mutating the given `RequestInit` object.
   *
   * This is useful for cases where you want to add certain headers based off of
   * the request properties, e.g. `method` or `url`.
   */
  async prepareRequest(request, { url, options }) {
  }
  get(path15, opts) {
    return this.methodRequest("get", path15, opts);
  }
  post(path15, opts) {
    return this.methodRequest("post", path15, opts);
  }
  patch(path15, opts) {
    return this.methodRequest("patch", path15, opts);
  }
  put(path15, opts) {
    return this.methodRequest("put", path15, opts);
  }
  delete(path15, opts) {
    return this.methodRequest("delete", path15, opts);
  }
  methodRequest(method, path15, opts) {
    return this.request(Promise.resolve(opts).then((opts2) => {
      return { method, path: path15, ...opts2 };
    }));
  }
  request(options, remainingRetries = null) {
    return new APIPromise(this, this.makeRequest(options, remainingRetries, void 0));
  }
  async makeRequest(optionsInput, retriesRemaining, retryOfRequestLogID) {
    const options = await optionsInput;
    const maxRetries = options.maxRetries ?? this.maxRetries;
    if (retriesRemaining == null) {
      retriesRemaining = maxRetries;
    }
    await this.prepareOptions(options);
    const { req, url, timeout } = await this.buildRequest(options, {
      retryCount: maxRetries - retriesRemaining
    });
    await this.prepareRequest(req, { url, options });
    const requestLogID = "log_" + (Math.random() * (1 << 24) | 0).toString(16).padStart(6, "0");
    const retryLogStr = retryOfRequestLogID === void 0 ? "" : `, retryOf: ${retryOfRequestLogID}`;
    const startTime = Date.now();
    loggerFor(this).debug(`[${requestLogID}] sending request`, formatRequestDetails({
      retryOfRequestLogID,
      method: options.method,
      url,
      options,
      headers: req.headers
    }));
    if (options.signal?.aborted) {
      throw new APIUserAbortError();
    }
    const controller = new AbortController();
    const response = await this.fetchWithTimeout(url, req, timeout, controller).catch(castToError);
    const headersTime = Date.now();
    if (response instanceof globalThis.Error) {
      const retryMessage = `retrying, ${retriesRemaining} attempts remaining`;
      if (options.signal?.aborted) {
        throw new APIUserAbortError();
      }
      const isTimeout = isAbortError(response) || /timed? ?out/i.test(String(response) + ("cause" in response ? String(response.cause) : ""));
      if (retriesRemaining) {
        loggerFor(this).info(`[${requestLogID}] connection ${isTimeout ? "timed out" : "failed"} - ${retryMessage}`);
        loggerFor(this).debug(`[${requestLogID}] connection ${isTimeout ? "timed out" : "failed"} (${retryMessage})`, formatRequestDetails({
          retryOfRequestLogID,
          url,
          durationMs: headersTime - startTime,
          message: response.message
        }));
        return this.retryRequest(options, retriesRemaining, retryOfRequestLogID ?? requestLogID);
      }
      loggerFor(this).info(`[${requestLogID}] connection ${isTimeout ? "timed out" : "failed"} - error; no more retries left`);
      loggerFor(this).debug(`[${requestLogID}] connection ${isTimeout ? "timed out" : "failed"} (error; no more retries left)`, formatRequestDetails({
        retryOfRequestLogID,
        url,
        durationMs: headersTime - startTime,
        message: response.message
      }));
      if (isTimeout) {
        throw new APIConnectionTimeoutError();
      }
      throw new APIConnectionError({ cause: response });
    }
    const specialHeaders = [...response.headers.entries()].filter(([name2]) => name2 === "request-id").map(([name2, value]) => ", " + name2 + ": " + JSON.stringify(value)).join("");
    const responseInfo = `[${requestLogID}${retryLogStr}${specialHeaders}] ${req.method} ${url} ${response.ok ? "succeeded" : "failed"} with status ${response.status} in ${headersTime - startTime}ms`;
    if (!response.ok) {
      const shouldRetry = await this.shouldRetry(response);
      if (retriesRemaining && shouldRetry) {
        const retryMessage2 = `retrying, ${retriesRemaining} attempts remaining`;
        await CancelReadableStream(response.body);
        loggerFor(this).info(`${responseInfo} - ${retryMessage2}`);
        loggerFor(this).debug(`[${requestLogID}] response error (${retryMessage2})`, formatRequestDetails({
          retryOfRequestLogID,
          url: response.url,
          status: response.status,
          headers: response.headers,
          durationMs: headersTime - startTime
        }));
        return this.retryRequest(options, retriesRemaining, retryOfRequestLogID ?? requestLogID, response.headers);
      }
      const retryMessage = shouldRetry ? `error; no more retries left` : `error; not retryable`;
      loggerFor(this).info(`${responseInfo} - ${retryMessage}`);
      const errText = await response.text().catch((err3) => castToError(err3).message);
      const errJSON = safeJSON(errText);
      const errMessage = errJSON ? void 0 : errText;
      loggerFor(this).debug(`[${requestLogID}] response error (${retryMessage})`, formatRequestDetails({
        retryOfRequestLogID,
        url: response.url,
        status: response.status,
        headers: response.headers,
        message: errMessage,
        durationMs: Date.now() - startTime
      }));
      const err2 = this.makeStatusError(response.status, errJSON, errMessage, response.headers);
      throw err2;
    }
    loggerFor(this).info(responseInfo);
    loggerFor(this).debug(`[${requestLogID}] response start`, formatRequestDetails({
      retryOfRequestLogID,
      url: response.url,
      status: response.status,
      headers: response.headers,
      durationMs: headersTime - startTime
    }));
    return { response, options, controller, requestLogID, retryOfRequestLogID, startTime };
  }
  getAPIList(path15, Page2, opts) {
    return this.requestAPIList(Page2, { method: "get", path: path15, ...opts });
  }
  requestAPIList(Page2, options) {
    const request = this.makeRequest(options, null, void 0);
    return new PagePromise(this, request, Page2);
  }
  async fetchWithTimeout(url, init2, ms, controller) {
    const { signal, method, ...options } = init2 || {};
    if (signal)
      signal.addEventListener("abort", () => controller.abort());
    const timeout = setTimeout(() => controller.abort(), ms);
    const isReadableBody = globalThis.ReadableStream && options.body instanceof globalThis.ReadableStream || typeof options.body === "object" && options.body !== null && Symbol.asyncIterator in options.body;
    const fetchOptions = {
      signal: controller.signal,
      ...isReadableBody ? { duplex: "half" } : {},
      method: "GET",
      ...options
    };
    if (method) {
      fetchOptions.method = method.toUpperCase();
    }
    try {
      return await this.fetch.call(void 0, url, fetchOptions);
    } finally {
      clearTimeout(timeout);
    }
  }
  async shouldRetry(response) {
    const shouldRetryHeader = response.headers.get("x-should-retry");
    if (shouldRetryHeader === "true")
      return true;
    if (shouldRetryHeader === "false")
      return false;
    if (response.status === 408)
      return true;
    if (response.status === 409)
      return true;
    if (response.status === 429)
      return true;
    if (response.status >= 500)
      return true;
    return false;
  }
  async retryRequest(options, retriesRemaining, requestLogID, responseHeaders) {
    let timeoutMillis;
    const retryAfterMillisHeader = responseHeaders?.get("retry-after-ms");
    if (retryAfterMillisHeader) {
      const timeoutMs = parseFloat(retryAfterMillisHeader);
      if (!Number.isNaN(timeoutMs)) {
        timeoutMillis = timeoutMs;
      }
    }
    const retryAfterHeader = responseHeaders?.get("retry-after");
    if (retryAfterHeader && !timeoutMillis) {
      const timeoutSeconds = parseFloat(retryAfterHeader);
      if (!Number.isNaN(timeoutSeconds)) {
        timeoutMillis = timeoutSeconds * 1e3;
      } else {
        timeoutMillis = Date.parse(retryAfterHeader) - Date.now();
      }
    }
    if (!(timeoutMillis && 0 <= timeoutMillis && timeoutMillis < 60 * 1e3)) {
      const maxRetries = options.maxRetries ?? this.maxRetries;
      timeoutMillis = this.calculateDefaultRetryTimeoutMillis(retriesRemaining, maxRetries);
    }
    await sleep(timeoutMillis);
    return this.makeRequest(options, retriesRemaining - 1, requestLogID);
  }
  calculateDefaultRetryTimeoutMillis(retriesRemaining, maxRetries) {
    const initialRetryDelay = 0.5;
    const maxRetryDelay = 8;
    const numRetries = maxRetries - retriesRemaining;
    const sleepSeconds = Math.min(initialRetryDelay * Math.pow(2, numRetries), maxRetryDelay);
    const jitter = 1 - Math.random() * 0.25;
    return sleepSeconds * jitter * 1e3;
  }
  calculateNonstreamingTimeout(maxTokens, maxNonstreamingTokens) {
    const maxTime = 60 * 60 * 1e3;
    const defaultTime = 60 * 10 * 1e3;
    const expectedTime = maxTime * maxTokens / 128e3;
    if (expectedTime > defaultTime || maxNonstreamingTokens != null && maxTokens > maxNonstreamingTokens) {
      throw new AnthropicError("Streaming is required for operations that may take longer than 10 minutes. See https://github.com/anthropics/anthropic-sdk-typescript#long-requests for more details");
    }
    return defaultTime;
  }
  async buildRequest(inputOptions, { retryCount = 0 } = {}) {
    const options = { ...inputOptions };
    const { method, path: path15, query, defaultBaseURL } = options;
    const url = this.buildURL(path15, query, defaultBaseURL);
    if ("timeout" in options)
      validatePositiveInteger("timeout", options.timeout);
    options.timeout = options.timeout ?? this.timeout;
    const { bodyHeaders, body: body2 } = this.buildBody({ options });
    const reqHeaders = await this.buildHeaders({ options: inputOptions, method, bodyHeaders, retryCount });
    const req = {
      method,
      headers: reqHeaders,
      ...options.signal && { signal: options.signal },
      ...globalThis.ReadableStream && body2 instanceof globalThis.ReadableStream && { duplex: "half" },
      ...body2 && { body: body2 },
      ...this.fetchOptions ?? {},
      ...options.fetchOptions ?? {}
    };
    return { req, url, timeout: options.timeout };
  }
  async buildHeaders({ options, method, bodyHeaders, retryCount }) {
    let idempotencyHeaders = {};
    if (this.idempotencyHeader && method !== "get") {
      if (!options.idempotencyKey)
        options.idempotencyKey = this.defaultIdempotencyKey();
      idempotencyHeaders[this.idempotencyHeader] = options.idempotencyKey;
    }
    const headers = buildHeaders([
      idempotencyHeaders,
      {
        Accept: "application/json",
        "User-Agent": this.getUserAgent(),
        "X-Stainless-Retry-Count": String(retryCount),
        ...options.timeout ? { "X-Stainless-Timeout": String(Math.trunc(options.timeout / 1e3)) } : {},
        ...getPlatformHeaders(),
        ...this._options.dangerouslyAllowBrowser ? { "anthropic-dangerous-direct-browser-access": "true" } : void 0,
        "anthropic-version": "2023-06-01"
      },
      await this.authHeaders(options),
      this._options.defaultHeaders,
      bodyHeaders,
      options.headers
    ]);
    this.validateHeaders(headers);
    return headers.values;
  }
  buildBody({ options: { body: body2, headers: rawHeaders } }) {
    if (!body2) {
      return { bodyHeaders: void 0, body: void 0 };
    }
    const headers = buildHeaders([rawHeaders]);
    if (
      // Pass raw type verbatim
      ArrayBuffer.isView(body2) || body2 instanceof ArrayBuffer || body2 instanceof DataView || typeof body2 === "string" && // Preserve legacy string encoding behavior for now
      headers.values.has("content-type") || // `Blob` is superset of `File`
      globalThis.Blob && body2 instanceof globalThis.Blob || // `FormData` -> `multipart/form-data`
      body2 instanceof FormData || // `URLSearchParams` -> `application/x-www-form-urlencoded`
      body2 instanceof URLSearchParams || // Send chunked stream (each chunk has own `length`)
      globalThis.ReadableStream && body2 instanceof globalThis.ReadableStream
    ) {
      return { bodyHeaders: void 0, body: body2 };
    } else if (typeof body2 === "object" && (Symbol.asyncIterator in body2 || Symbol.iterator in body2 && "next" in body2 && typeof body2.next === "function")) {
      return { bodyHeaders: void 0, body: ReadableStreamFrom(body2) };
    } else {
      return __classPrivateFieldGet(this, _BaseAnthropic_encoder, "f").call(this, { body: body2, headers });
    }
  }
};
_a = BaseAnthropic, _BaseAnthropic_encoder = /* @__PURE__ */ new WeakMap(), _BaseAnthropic_instances = /* @__PURE__ */ new WeakSet(), _BaseAnthropic_baseURLOverridden = function _BaseAnthropic_baseURLOverridden2() {
  return this.baseURL !== "https://api.anthropic.com";
};
BaseAnthropic.Anthropic = _a;
BaseAnthropic.HUMAN_PROMPT = HUMAN_PROMPT;
BaseAnthropic.AI_PROMPT = AI_PROMPT;
BaseAnthropic.DEFAULT_TIMEOUT = 6e5;
BaseAnthropic.AnthropicError = AnthropicError;
BaseAnthropic.APIError = APIError;
BaseAnthropic.APIConnectionError = APIConnectionError;
BaseAnthropic.APIConnectionTimeoutError = APIConnectionTimeoutError;
BaseAnthropic.APIUserAbortError = APIUserAbortError;
BaseAnthropic.NotFoundError = NotFoundError;
BaseAnthropic.ConflictError = ConflictError;
BaseAnthropic.RateLimitError = RateLimitError;
BaseAnthropic.BadRequestError = BadRequestError;
BaseAnthropic.AuthenticationError = AuthenticationError;
BaseAnthropic.InternalServerError = InternalServerError;
BaseAnthropic.PermissionDeniedError = PermissionDeniedError;
BaseAnthropic.UnprocessableEntityError = UnprocessableEntityError;
BaseAnthropic.toFile = toFile;
var Anthropic = class extends BaseAnthropic {
  constructor() {
    super(...arguments);
    this.completions = new Completions(this);
    this.messages = new Messages2(this);
    this.models = new Models2(this);
    this.beta = new Beta(this);
  }
};
Anthropic.Completions = Completions;
Anthropic.Messages = Messages2;
Anthropic.Models = Models2;
Anthropic.Beta = Beta;

// src/scanner.ts
init_esbuild_shim();
var vscode2 = __toESM(require("vscode"));

// src/language-map.ts
init_esbuild_shim();
var path5 = __toESM(require("path"));
var LANGUAGE_MAP = {
  // TypeScript
  ".ts": "TypeScript",
  ".tsx": "TypeScript",
  ".mts": "TypeScript",
  ".cts": "TypeScript",
  // JavaScript
  ".js": "JavaScript",
  ".jsx": "JavaScript",
  ".mjs": "JavaScript",
  ".cjs": "JavaScript",
  // Web
  ".html": "HTML",
  ".htm": "HTML",
  ".css": "CSS",
  ".scss": "SCSS",
  ".sass": "Sass",
  ".less": "Less",
  // Data
  ".json": "JSON",
  ".yaml": "YAML",
  ".yml": "YAML",
  ".xml": "XML",
  ".toml": "TOML",
  // Lua
  ".lua": "Lua",
  // Python
  ".py": "Python",
  ".pyw": "Python",
  // Shell
  ".sh": "Shell",
  ".bash": "Shell",
  ".zsh": "Shell",
  // Documentation
  ".md": "Markdown",
  ".txt": "Text",
  // Config
  ".env": "Environment",
  ".gitignore": "Git"
};
var DEFAULT_LANGUAGE = "Other";
function getLanguage(filePath) {
  const ext = path5.extname(filePath).toLowerCase();
  const basename2 = path5.basename(filePath);
  if (LANGUAGE_MAP[basename2]) {
    return LANGUAGE_MAP[basename2];
  }
  return LANGUAGE_MAP[ext] || DEFAULT_LANGUAGE;
}

// src/rules-parser.ts
init_esbuild_shim();
var vscode = __toESM(require("vscode"));
var path6 = __toESM(require("path"));
async function parseClaudeMd(rootPath) {
  const claudeMdPath = path6.join(rootPath, "CLAUDE.md");
  const uri = vscode.Uri.file(claudeMdPath);
  try {
    const content = await vscode.workspace.fs.readFile(uri);
    const text = Buffer.from(content).toString("utf8");
    return extractRules(text);
  } catch {
    return [];
  }
}
function extractRules(text) {
  const rules = [];
  const lines = text.split("\n");
  let inCodeStandards = false;
  let inFileRules = false;
  let inNaming = false;
  let inComments = false;
  for (const line of lines) {
    if (line.startsWith("### Code Standards")) {
      inCodeStandards = true;
      inFileRules = false;
      inNaming = false;
      inComments = false;
      continue;
    }
    if (line.startsWith("### File Rules")) {
      inCodeStandards = false;
      inFileRules = true;
      inNaming = false;
      inComments = false;
      continue;
    }
    if (line.startsWith("### Naming")) {
      inCodeStandards = false;
      inFileRules = false;
      inNaming = true;
      inComments = false;
      continue;
    }
    if (line.startsWith("### Comments")) {
      inCodeStandards = false;
      inFileRules = false;
      inNaming = false;
      inComments = true;
      continue;
    }
    if (line.startsWith("## ") || line.startsWith("### ")) {
      inCodeStandards = false;
      inFileRules = false;
      inNaming = false;
      inComments = false;
      continue;
    }
    if (inCodeStandards) {
      const match = line.match(/^\d+\.\s+\*\*(.+?)\*\*\s*(.*)$/);
      if (match) {
        const title = match[1].replace(/\.$/, "");
        const description = match[2] || "";
        rules.push({
          id: `code-${rules.length + 1}`,
          title,
          description
        });
      }
    }
    if (inFileRules) {
      const match = line.match(/^-\s+(.+)$/);
      if (match) {
        rules.push({
          id: `file-${rules.length + 1}`,
          title: match[1].split(".")[0],
          description: match[1]
        });
      }
    }
    if (inComments) {
      const match = line.match(/^-\s+(.+)$/);
      if (match) {
        rules.push({
          id: `comment-${rules.length + 1}`,
          title: match[1].split(".")[0],
          description: match[1]
        });
      }
    }
  }
  return rules;
}

// src/file-issue-detector.ts
init_esbuild_shim();

// src/rules/structural-rules.ts
init_esbuild_shim();

// src/rules/rule-constants.ts
init_esbuild_shim();
var FUNCTION_LOC_WARNING = 20;
var FUNCTION_LOC_ERROR = 50;
var FILE_LOC_WARNING = 200;
var MAX_NESTING_DEPTH = 4;
var MAX_PARAMETER_COUNT = 5;
var HIGH_COMMENT_DENSITY_THRESHOLD = 0.4;
var GENERIC_NAMES = [
  "data",
  "result",
  "temp",
  "item",
  "value",
  "obj",
  "ret",
  "res",
  "tmp",
  "info",
  "stuff",
  "thing",
  "val",
  "x",
  "y",
  "z"
];
var VERB_PREFIXES = [
  "get",
  "set",
  "is",
  "has",
  "can",
  "should",
  "will",
  "do",
  "make",
  "create",
  "build",
  "find",
  "fetch",
  "load",
  "save",
  "update",
  "delete",
  "remove",
  "add",
  "insert",
  "append",
  "render",
  "parse",
  "validate",
  "check",
  "handle",
  "process",
  "convert",
  "format",
  "extract",
  "calculate",
  "compute",
  "init",
  "setup",
  "reset",
  "clear",
  "show",
  "hide",
  "enable",
  "disable",
  "start",
  "stop",
  "run",
  "execute",
  "apply",
  "register",
  "unregister",
  "subscribe",
  "unsubscribe",
  "emit",
  "dispatch",
  "trigger",
  "on"
];
var BOOLEAN_PREFIXES = [
  "is",
  "has",
  "can",
  "should",
  "will",
  "was",
  "are",
  "does",
  "did",
  "needs",
  "allows",
  "includes",
  "contains",
  "matches",
  "exists"
];
var SETTER_PREFIXES = ["set"];
var ACTION_VERB_PREFIXES = [
  "build",
  "create",
  "make",
  "render",
  "load",
  "save",
  "update",
  "delete",
  "remove",
  "add",
  "get",
  "fetch",
  "find",
  "parse",
  "process",
  "handle",
  "init",
  "setup",
  "reset",
  "clear",
  "show",
  "hide",
  "enable",
  "disable",
  "start",
  "stop",
  "run",
  "execute",
  "apply",
  "convert",
  "format",
  "extract",
  "calculate",
  "compute"
];
var ALLOWED_MAGIC_NUMBERS = [
  -1,
  0,
  1,
  2,
  10,
  100,
  1e3,
  // Common percentages
  0.5,
  0.25,
  0.75,
  // Common array/string operations
  16,
  32,
  64,
  128,
  256,
  512,
  1024
];
var CODE_COMMENT_PATTERNS = [
  /^\s*(if|for|while|return|const|let|var|function|class|import|export)\s*[\(\{]/,
  /^\s*\w+\s*[=!<>]+\s*\w+/,
  /^\s*\w+\(\s*\w*\s*\)/,
  /^\s*\/\/\s*TODO:/i,
  /^\s*[a-zA-Z_]\w*\s*=\s*.+;?\s*$/
];
var DATA_KEYWORDS = [
  "interface",
  "type",
  "schema",
  "model",
  "entity",
  "dto",
  "struct"
];
var LOGIC_KEYWORDS = [
  "calculate",
  "process",
  "validate",
  "compute",
  "transform",
  "analyze",
  "evaluate",
  "execute"
];
var RENDER_KEYWORDS = [
  "render",
  "html",
  "jsx",
  "tsx",
  "component",
  "view",
  "template",
  "dom",
  "element",
  "svg"
];

// src/uri.ts
init_esbuild_shim();

// src/uri-builders.ts
init_esbuild_shim();
var URI_SCHEME = "file://";
function normalizePath(path15) {
  return path15.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+$/, "");
}
function createFileUri(path15) {
  return `${URI_SCHEME}/${normalizePath(path15)}`;
}
function createSymbolUri(path15, symbolName) {
  return `${URI_SCHEME}/${normalizePath(path15)}#${symbolName}`;
}
function createUriFromPathAndLine(path15, symbolName, line) {
  if (symbolName) {
    return createSymbolUri(path15, symbolName);
  }
  if (line !== void 0) {
    return `${URI_SCHEME}/${normalizePath(path15)}#L${line}`;
  }
  return createFileUri(path15);
}

// src/uri.ts
var URI_SCHEME2 = "file://";
function parseUri(uri) {
  if (!uri.startsWith(URI_SCHEME2)) {
    throw new Error(`Invalid URI scheme: ${uri}`);
  }
  const withoutScheme = uri.slice(URI_SCHEME2.length);
  const hashIndex = withoutScheme.indexOf("#");
  if (hashIndex === -1) {
    return {
      scheme: "file",
      path: withoutScheme.startsWith("/") ? withoutScheme.slice(1) : withoutScheme,
      fragment: null
    };
  }
  return {
    scheme: "file",
    path: withoutScheme.slice(0, hashIndex).replace(/^\//, ""),
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
  const parts2 = fragment.split(".");
  const leafName = parts2[parts2.length - 1];
  const lineMatch = leafName.match(/^(\w+):(\d+)$/);
  const leafLine = lineMatch ? parseInt(lineMatch[2], 10) : null;
  return {
    symbolPath: parts2,
    leafName,
    leafLine
  };
}
function getLineFromUri(uri) {
  const fragment = getFragment(uri);
  if (!fragment) return null;
  const lineMatch = fragment.match(/^L(\d+)$/);
  if (lineMatch) return parseInt(lineMatch[1], 10);
  const parsed = parseFragment(fragment);
  return parsed.leafLine;
}

// src/rules/structural-rules.ts
function detectLongFunctions(file, thresholds) {
  const warnLimit = thresholds?.functionLocWarning ?? FUNCTION_LOC_WARNING;
  const errorLimit = thresholds?.functionLocError ?? FUNCTION_LOC_ERROR;
  const issues = [];
  for (const func2 of file.functions) {
    if (func2.loc > errorLimit) {
      issues.push({
        ruleId: "long-function",
        severity: "high",
        category: "structural",
        message: `Function '${func2.name}' has ${func2.loc} lines (exceeds ${errorLimit} line limit)`,
        locations: [{ uri: func2.uri, file: file.path, line: func2.startLine, endLine: func2.endLine }],
        symbol: func2.name
      });
    } else if (func2.loc > warnLimit) {
      issues.push({
        ruleId: "long-function",
        severity: "medium",
        category: "structural",
        message: `Function '${func2.name}' has ${func2.loc} lines (exceeds ${warnLimit} line recommendation)`,
        locations: [{ uri: func2.uri, file: file.path, line: func2.startLine, endLine: func2.endLine }],
        symbol: func2.name
      });
    }
  }
  return issues;
}
function detectLongFile(file, thresholds) {
  const limit = thresholds?.fileLocWarning ?? FILE_LOC_WARNING;
  if (file.loc > limit) {
    return {
      ruleId: "long-file",
      severity: "medium",
      category: "structural",
      message: `File has ${file.loc} lines (exceeds ${limit} line recommendation)`,
      locations: [{ uri: file.uri, file: file.path }]
    };
  }
  return null;
}
function detectDeepNesting(file, thresholds) {
  const limit = thresholds?.maxNestingDepth ?? MAX_NESTING_DEPTH;
  const issues = [];
  for (const func2 of file.functions) {
    if (func2.maxNestingDepth > limit) {
      issues.push({
        ruleId: "deep-nesting",
        severity: "medium",
        category: "structural",
        message: `Function '${func2.name}' has nesting depth ${func2.maxNestingDepth} (exceeds ${limit})`,
        locations: [{ uri: func2.uri, file: file.path, line: func2.startLine }],
        symbol: func2.name
      });
    }
  }
  return issues;
}
function detectSilentFailures(file, catchBlocks) {
  const issues = [];
  for (const catchBlock of catchBlocks) {
    if (catchBlock.isEmpty) {
      issues.push({
        ruleId: "silent-failure",
        severity: "high",
        category: "structural",
        message: `Empty catch block - errors are silently ignored`,
        locations: [{ uri: createUriFromPathAndLine(file.path, void 0, catchBlock.line), file: file.path, line: catchBlock.line }]
      });
    }
  }
  return issues;
}
function detectTooManyParameters(file, thresholds) {
  const limit = thresholds?.maxParameterCount ?? MAX_PARAMETER_COUNT;
  const issues = [];
  for (const func2 of file.functions) {
    if (func2.parameterCount > limit) {
      issues.push({
        ruleId: "too-many-parameters",
        severity: "medium",
        category: "structural",
        message: `Function '${func2.name}' has ${func2.parameterCount} parameters (exceeds ${limit})`,
        locations: [{ uri: func2.uri, file: file.path, line: func2.startLine }],
        symbol: func2.name
      });
    }
  }
  return issues;
}

// src/rules/naming-rules.ts
init_esbuild_shim();
function detectGenericNames(file, customBlocklist) {
  const blocklist = customBlocklist ?? GENERIC_NAMES;
  const issues = [];
  for (const func2 of file.functions) {
    const nameLower = func2.name.toLowerCase();
    if (blocklist.includes(nameLower)) {
      issues.push({
        ruleId: "generic-name",
        severity: "medium",
        category: "naming",
        message: `Function '${func2.name}' uses a generic name - consider more descriptive naming`,
        locations: [{ uri: func2.uri, file: file.path, line: func2.startLine }],
        symbol: func2.name
      });
    }
  }
  return issues;
}
function detectNonVerbFunctions(file) {
  const issues = [];
  for (const func2 of file.functions) {
    if (func2.name === "anonymous") continue;
    const nameLower = func2.name.toLowerCase();
    const startsWithVerb = VERB_PREFIXES.some(
      (prefix) => nameLower.startsWith(prefix) || nameLower === prefix
    );
    if (!startsWithVerb) {
      if (/^[A-Z]/.test(func2.name)) continue;
      if (nameLower.startsWith("on") || nameLower.startsWith("handle")) continue;
      issues.push({
        ruleId: "non-verb-function",
        severity: "low",
        category: "naming",
        message: `Function '${func2.name}' should start with a verb (e.g., get${capitalize(func2.name)})`,
        locations: [{ uri: func2.uri, file: file.path, line: func2.startLine }],
        symbol: func2.name
      });
    }
  }
  return issues;
}
function detectNonQuestionBooleans(file) {
  const issues = [];
  const booleanPatterns = [
    "valid",
    "active",
    "enabled",
    "disabled",
    "visible",
    "hidden",
    "loading",
    "loaded",
    "empty",
    "ready",
    "open",
    "closed",
    "selected",
    "checked",
    "connected",
    "authenticated"
  ];
  for (const func2 of file.functions) {
    const methodName = func2.name.includes(".") ? func2.name.split(".").pop() || func2.name : func2.name.includes(":") ? func2.name.split(":").pop() || func2.name : func2.name;
    const nameLower = methodName.toLowerCase();
    const matchesPattern = booleanPatterns.some(
      (pattern) => nameLower === pattern || nameLower.endsWith(pattern)
    );
    if (matchesPattern) {
      const startsWithBooleanPrefix = BOOLEAN_PREFIXES.some(
        (prefix) => nameLower.startsWith(prefix)
      );
      const startsWithSetterPrefix = SETTER_PREFIXES.some(
        (prefix) => nameLower.startsWith(prefix)
      );
      const startsWithActionVerb = ACTION_VERB_PREFIXES.some(
        (prefix) => nameLower.startsWith(prefix)
      );
      if (!startsWithBooleanPrefix && !startsWithSetterPrefix && !startsWithActionVerb) {
        issues.push({
          ruleId: "non-question-boolean",
          severity: "low",
          category: "naming",
          message: `'${func2.name}' appears to be boolean - consider naming like 'is${capitalize(methodName)}'`,
          locations: [{ uri: func2.uri, file: file.path, line: func2.startLine }],
          symbol: func2.name
        });
      }
    }
  }
  return issues;
}
function detectMagicNumbers(file, literals) {
  const issues = [];
  for (const literal of literals) {
    if (ALLOWED_MAGIC_NUMBERS.includes(literal.value)) continue;
    if (literal.context === "array-index") continue;
    if (isCommonUiValue(literal.value)) continue;
    issues.push({
      ruleId: "magic-number",
      severity: "low",
      category: "naming",
      message: `Magic number ${literal.value} - consider using a named constant`,
      locations: [{ uri: createUriFromPathAndLine(file.path, void 0, literal.line), file: file.path, line: literal.line }]
    });
  }
  return issues;
}
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
function isCommonUiValue(value) {
  const commonValues = [
    // Pixels
    4,
    8,
    12,
    16,
    20,
    24,
    28,
    32,
    40,
    48,
    56,
    64,
    72,
    80,
    96,
    // Percentages (as decimals)
    0.1,
    0.2,
    0.3,
    0.4,
    0.5,
    0.6,
    0.7,
    0.8,
    0.9,
    // Animation durations (ms)
    100,
    150,
    200,
    250,
    300,
    400,
    500,
    // Z-index
    999,
    1e3,
    9999
  ];
  return commonValues.includes(value);
}

// src/rules/comment-rules.ts
init_esbuild_shim();
function detectCommentedCode(file, comments) {
  const issues = [];
  for (const comment of comments) {
    if (comment.isBlockComment) continue;
    let text = comment.text.trim();
    if (text.startsWith("//")) text = text.slice(2).trim();
    if (text.startsWith("--")) text = text.slice(2).trim();
    if (looksLikeCode(text)) {
      issues.push({
        ruleId: "commented-code",
        severity: "low",
        category: "comment",
        message: `Possible commented-out code - consider removing`,
        locations: [{ uri: createUriFromPathAndLine(file.path, void 0, comment.line), file: file.path, line: comment.line }]
      });
    }
  }
  return issues;
}
function looksLikeCode(text) {
  if (text.length < 5) return false;
  if (text.startsWith("TODO")) return false;
  if (text.startsWith("FIXME")) return false;
  if (text.startsWith("NOTE")) return false;
  if (text.startsWith("HACK")) return false;
  if (text.startsWith("XXX")) return false;
  if (text.startsWith("eslint")) return false;
  if (text.startsWith("@")) return false;
  if (text.startsWith("#")) return false;
  for (const pattern of CODE_COMMENT_PATTERNS) {
    if (pattern.test(text)) return true;
  }
  if (/^\s*[a-zA-Z_]\w*\s*\(/.test(text)) return true;
  if (/^\s*[a-zA-Z_]\w*\s*=\s*.+;\s*$/.test(text)) return true;
  if (/^\s*(const|let|var|local)\s+\w+/.test(text)) return true;
  return false;
}
function detectHighCommentDensity(file, comments) {
  if (file.loc === 0) return null;
  let commentLineCount = 0;
  for (const comment of comments) {
    if (comment.isBlockComment) {
      const lines = comment.text.split("\n").length;
      commentLineCount += lines;
    } else {
      commentLineCount += 1;
    }
  }
  const ratio = commentLineCount / file.loc;
  if (ratio > HIGH_COMMENT_DENSITY_THRESHOLD) {
    const percentage = Math.round(ratio * 100);
    return {
      ruleId: "high-comment-density",
      severity: "low",
      category: "comment",
      message: `High comment density (${percentage}%) - may indicate unclear code or stale comments`,
      locations: [{ uri: file.uri, file: file.path }]
    };
  }
  return null;
}

// src/rules/architecture-rules.ts
init_esbuild_shim();
var MIN_KEYWORD_MATCHES = 3;
function detectMixedConcerns(file, content) {
  const contentLower = content.toLowerCase();
  const dataMatches = countKeywordMatches(contentLower, DATA_KEYWORDS);
  const logicMatches = countKeywordMatches(contentLower, LOGIC_KEYWORDS);
  const renderMatches = countKeywordMatches(contentLower, RENDER_KEYWORDS);
  const hasData = dataMatches >= MIN_KEYWORD_MATCHES;
  const hasLogic = logicMatches >= MIN_KEYWORD_MATCHES;
  const hasRender = renderMatches >= MIN_KEYWORD_MATCHES;
  const concernCount = [hasData, hasLogic, hasRender].filter(Boolean).length;
  if (concernCount >= 2) {
    const concerns = [];
    if (hasData) concerns.push("data definitions");
    if (hasLogic) concerns.push("business logic");
    if (hasRender) concerns.push("rendering");
    return {
      ruleId: "mixed-concerns",
      severity: "medium",
      category: "architecture",
      message: `File may have mixed concerns: ${concerns.join(" + ")}`,
      locations: [{ uri: file.uri, file: file.path }]
    };
  }
  return null;
}
function countKeywordMatches(content, keywords) {
  let count = 0;
  for (const keyword of keywords) {
    const regex = new RegExp(`\\b${keyword}\\b`, "gi");
    const matches = content.match(regex);
    if (matches) count += matches.length;
  }
  return count;
}

// src/file-issue-detector.ts
function detectCodeIssues(file, astResult, content, thresholds) {
  const issues = [];
  issues.push(...detectLongFunctions(file, thresholds));
  const longFile = detectLongFile(file, thresholds);
  if (longFile) issues.push(longFile);
  issues.push(...detectDeepNesting(file, thresholds));
  issues.push(...detectSilentFailures(file, astResult.catchBlocks));
  issues.push(...detectTooManyParameters(file, thresholds));
  issues.push(...detectGenericNames(file, thresholds?.genericNames));
  issues.push(...detectNonVerbFunctions(file));
  issues.push(...detectNonQuestionBooleans(file));
  issues.push(...detectMagicNumbers(file, astResult.literals));
  issues.push(...detectCommentedCode(file, astResult.comments));
  const highDensity = detectHighCommentDensity(file, astResult.comments);
  if (highDensity) issues.push(highDensity);
  const mixedConcerns = detectMixedConcerns(file, content);
  if (mixedConcerns) issues.push(mixedConcerns);
  return issues;
}

// src/scanner.ts
async function scanWorkspace(detectIssues = true, thresholds) {
  const workspaceFolder = vscode2.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    throw new Error("No workspace folder open");
  }
  const root = workspaceFolder.uri.fsPath;
  const [files, rules] = await Promise.all([
    scanFiles(workspaceFolder.uri, detectIssues, thresholds),
    parseClaudeMd(root)
  ]);
  const languages = aggregateLanguages(files);
  const languageSupport = computeLanguageSupport(files);
  const totalLoc = files.reduce((sum, f) => sum + f.loc, 0);
  const unsupportedFiles = files.filter((f) => f.parseStatus === "unsupported").length;
  return {
    root,
    scannedAt: (/* @__PURE__ */ new Date()).toISOString(),
    files,
    languages,
    languageSupport,
    rules,
    totals: {
      files: files.length,
      loc: totalLoc,
      unsupportedFiles
    }
  };
}
async function scanFiles(workspaceUri, detectIssues, thresholds) {
  const excludePattern = "**/node_modules/**";
  const uris = await vscode2.workspace.findFiles("**/*", excludePattern);
  const files = [];
  for (const uri of uris) {
    const fileInfo = await scanFile(uri, workspaceUri, detectIssues, thresholds);
    if (fileInfo) {
      files.push(fileInfo);
    }
  }
  return files.sort((a, b) => b.loc - a.loc);
}
async function scanFile(uri, workspaceUri, detectIssuesFlag, thresholds) {
  try {
    const stat = await vscode2.workspace.fs.stat(uri);
    if (stat.type !== vscode2.FileType.File) {
      return null;
    }
    const content = await vscode2.workspace.fs.readFile(uri);
    const text = Buffer.from(content).toString("utf8");
    const loc = countNonBlankLines(text);
    const relativePath = vscode2.workspace.asRelativePath(uri, false);
    const language = getLanguage(uri.fsPath);
    const astResult = parseAll(text, relativePath, language);
    const functionsWithUri = astResult.functions.map((fn) => ({
      ...fn,
      uri: createSymbolUri(relativePath, fn.name)
    }));
    const fileInfo = {
      path: relativePath,
      uri: createFileUri(relativePath),
      language,
      loc,
      functions: functionsWithUri,
      imports: astResult.imports,
      parseStatus: astResult.status
    };
    if (detectIssuesFlag) {
      const issues = detectCodeIssues(fileInfo, astResult, text, thresholds);
      if (issues.length > 0) {
        fileInfo.issues = issues;
      }
    }
    return fileInfo;
  } catch {
    return null;
  }
}
function countNonBlankLines(text) {
  const lines = text.split("\n");
  return lines.filter((line) => line.trim().length > 0).length;
}
function aggregateLanguages(files) {
  const languageMap = /* @__PURE__ */ new Map();
  for (const file of files) {
    const existing = languageMap.get(file.language) || { fileCount: 0, loc: 0 };
    languageMap.set(file.language, {
      fileCount: existing.fileCount + 1,
      loc: existing.loc + file.loc
    });
  }
  const summaries = [];
  for (const [language, data] of languageMap) {
    summaries.push({
      language,
      fileCount: data.fileCount,
      loc: data.loc
    });
  }
  return summaries.sort((a, b) => b.loc - a.loc);
}
function computeLanguageSupport(files) {
  const langMap = /* @__PURE__ */ new Map();
  for (const file of files) {
    const existing = langMap.get(file.language) || { count: 0, supported: true };
    langMap.set(file.language, {
      count: existing.count + 1,
      supported: existing.supported && file.parseStatus !== "unsupported"
    });
  }
  return [...langMap.entries()].map(([language, data]) => ({
    language,
    fileCount: data.count,
    isSupported: data.supported
  }));
}

// src/agent.ts
init_esbuild_shim();
var vscode3 = __toESM(require("vscode"));
var fs3 = __toESM(require("fs"));
var path7 = __toESM(require("path"));
init_prompt_builder();
init_prompt_builder();
async function analyzeQuery(query, files, rootPath, context, signal) {
  const apiKey = getApiKey();
  if (!apiKey) {
    return {
      message: "No API key configured. Set aperture.anthropicApiKey in settings.",
      relevantFiles: [],
      systemPrompt: "(no API key)"
    };
  }
  if (signal?.aborted) {
    return { message: "Cancelled", relevantFiles: [], systemPrompt: "(cancelled)" };
  }
  const client = new Anthropic({ apiKey });
  const tools = [
    {
      name: "read_file",
      description: "Read the contents of a file to analyze it",
      input_schema: {
        type: "object",
        properties: {
          path: { type: "string", description: "Relative path to the file" }
        },
        required: ["path"]
      }
    },
    {
      name: "respond",
      description: "Provide the final response with relevant files",
      input_schema: {
        type: "object",
        properties: {
          message: { type: "string", description: "Explanation for the user" },
          relevantFiles: {
            type: "array",
            items: { type: "string" },
            description: "List of relevant file paths"
          }
        },
        required: ["message", "relevantFiles"]
      }
    }
  ];
  const systemPrompt = buildSystemPrompt(context);
  const messages = [
    { role: "user", content: query }
  ];
  const CONTEXT_LIMIT = 2e5;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let response = await client.messages.create(
    {
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: systemPrompt,
      tools,
      messages
    },
    { signal }
  );
  totalInputTokens += response.usage.input_tokens;
  totalOutputTokens += response.usage.output_tokens;
  while (response.stop_reason === "tool_use") {
    if (signal?.aborted) {
      return { message: "Cancelled", relevantFiles: [], systemPrompt: "(cancelled)" };
    }
    const toolUseBlocks = response.content.filter(
      (block) => block.type === "tool_use"
    );
    const toolResults = [];
    for (const toolUse of toolUseBlocks) {
      if (toolUse.name === "read_file") {
        const input = toolUse.input;
        const filePath = path7.join(rootPath, input.path);
        try {
          const content = fs3.readFileSync(filePath, "utf8");
          toolResults.push({
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: content.slice(0, 1e4)
          });
        } catch {
          toolResults.push({
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: "Error: File not found or unreadable"
          });
        }
      } else if (toolUse.name === "respond") {
        const input = toolUse.input;
        return {
          ...input,
          systemPrompt,
          usage: {
            inputTokens: totalInputTokens,
            outputTokens: totalOutputTokens,
            totalTokens: totalInputTokens + totalOutputTokens,
            contextLimit: CONTEXT_LIMIT
          }
        };
      }
    }
    messages.push({ role: "assistant", content: response.content });
    messages.push({ role: "user", content: toolResults });
    response = await client.messages.create(
      {
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: systemPrompt,
        tools,
        messages
      },
      { signal }
    );
    totalInputTokens += response.usage.input_tokens;
    totalOutputTokens += response.usage.output_tokens;
  }
  const usage = {
    inputTokens: totalInputTokens,
    outputTokens: totalOutputTokens,
    totalTokens: totalInputTokens + totalOutputTokens,
    contextLimit: CONTEXT_LIMIT
  };
  const textBlock = response.content.find(
    (block) => block.type === "text"
  );
  return {
    message: textBlock?.text || "No response generated",
    relevantFiles: [],
    systemPrompt,
    usage
  };
}
function getApiKey() {
  const config = vscode3.workspace.getConfiguration("aperture");
  const configKey = config.get("anthropicApiKey");
  if (configKey) {
    return configKey;
  }
  return process.env.ANTHROPIC_API_KEY;
}

// src/dependency-analyzer.ts
init_esbuild_shim();
var path10 = __toESM(require("path"));

// src/import-resolver.ts
init_esbuild_shim();
var path8 = __toESM(require("path"));

// src/types.ts
init_esbuild_shim();

// src/import-resolver.ts
function getLanguageType(filePath) {
  const ext = path8.extname(filePath).toLowerCase();
  if (ext === ".lua") return "lua";
  if (ext === ".py") return "py";
  if (ext === ".go") return "go";
  if (ext === ".rs") return "rs";
  return "js";
}
function resolveImports(imports, fromPath, allFiles) {
  const resolvedDetails = [];
  const seenPaths = /* @__PURE__ */ new Set();
  const fileDir = path8.dirname(fromPath);
  const langType = getLanguageType(fromPath);
  for (const importInfo of imports) {
    const resolvedPath = resolveImport(importInfo.modulePath, fileDir, allFiles, langType, fromPath);
    if (resolvedPath && resolvedPath !== fromPath && !seenPaths.has(resolvedPath)) {
      seenPaths.add(resolvedPath);
      resolvedDetails.push({
        targetPath: resolvedPath,
        line: importInfo.line,
        code: importInfo.code
      });
    }
  }
  return resolvedDetails;
}
function resolveImport(importPath, fromDir, allFiles, langType, selfPath) {
  if (langType === "lua") {
    return resolveLuaImport(importPath, fromDir, allFiles, selfPath);
  }
  if (langType === "py") {
    return resolvePythonImport(importPath, fromDir, allFiles);
  }
  if (langType === "go") {
    return resolveGoImport(importPath, fromDir, allFiles);
  }
  if (langType === "rs") {
    return resolveRustImport(importPath, fromDir, allFiles);
  }
  return resolveJsImport(importPath, fromDir, allFiles);
}
function resolveLuaImport(importPath, fromDir, allFiles, selfPath) {
  const luaPath = importPath.replace(/\./g, "/");
  const luaExtensions = [".lua", "/init.lua"];
  for (const ext of luaExtensions) {
    const tryPath = luaPath + ext;
    if (allFiles.some((f) => f.path === tryPath)) return tryPath;
  }
  for (const ext of luaExtensions) {
    const tryPath = path8.normalize(path8.join(fromDir, luaPath)) + ext;
    if (allFiles.some((f) => f.path === tryPath)) return tryPath;
  }
  const endPattern = "/" + luaPath + ".lua";
  const endMatch = allFiles.find(
    (f) => (f.path.endsWith(endPattern) || f.path === luaPath + ".lua") && f.path !== selfPath
  );
  if (endMatch) return endMatch.path;
  const prefixes = ["game/", "src/", "lib/", "scripts/"];
  for (const prefix of prefixes) {
    for (const ext of luaExtensions) {
      const tryPath = prefix + luaPath + ext;
      if (allFiles.some((f) => f.path === tryPath)) return tryPath;
    }
  }
  const parts2 = fromDir.split("/");
  for (let i2 = 0; i2 < parts2.length; i2++) {
    const parentPath = parts2.slice(0, i2 + 1).join("/");
    for (const ext of luaExtensions) {
      const tryPath = parentPath ? parentPath + "/" + luaPath + ext : luaPath + ext;
      if (allFiles.some((f) => f.path === tryPath)) return tryPath;
    }
  }
  return null;
}
function resolvePythonImport(importPath, fromDir, allFiles) {
  let pyPath = importPath;
  let searchDir = "";
  if (pyPath.startsWith("..")) {
    searchDir = path8.dirname(fromDir);
    pyPath = pyPath.slice(2);
  } else if (pyPath.startsWith(".")) {
    searchDir = fromDir;
    pyPath = pyPath.slice(1);
  }
  const modulePath = pyPath.replace(/\./g, "/");
  const pyExtensions = [".py", "/__init__.py"];
  if (searchDir) {
    for (const ext of pyExtensions) {
      const tryPath = path8.normalize(path8.join(searchDir, modulePath)) + ext;
      if (allFiles.some((f) => f.path === tryPath)) return tryPath;
    }
  }
  for (const ext of pyExtensions) {
    const tryPath = modulePath + ext;
    if (allFiles.some((f) => f.path === tryPath)) return tryPath;
  }
  return null;
}
function resolveGoImport(importPath, fromDir, allFiles) {
  if (importPath.startsWith("./") || importPath.startsWith("../")) {
    const goPath = importPath.replace(/^\.\//, "");
    const tryPath = path8.normalize(path8.join(fromDir, goPath)) + ".go";
    if (allFiles.some((f) => f.path === tryPath)) return tryPath;
    const dirPath = path8.normalize(path8.join(fromDir, goPath));
    const dirFile = allFiles.find((f) => f.path.startsWith(dirPath + "/") && f.path.endsWith(".go"));
    if (dirFile) return dirFile.path;
  }
  const pkgPath = importPath.split("/").pop() + ".go";
  const matches = allFiles.filter((f) => f.path.endsWith("/" + pkgPath) || f.path === pkgPath);
  if (matches.length === 1) return matches[0].path;
  return null;
}
function resolveRustImport(importPath, fromDir, allFiles) {
  if (importPath.startsWith("mod:")) {
    const modName = importPath.slice(4);
    const tryPaths = [
      path8.normalize(path8.join(fromDir, modName + ".rs")),
      path8.normalize(path8.join(fromDir, modName, "mod.rs"))
    ];
    for (const tryPath of tryPaths) {
      if (allFiles.some((f) => f.path === tryPath)) return tryPath;
    }
  } else if (importPath.startsWith("crate::")) {
    const rustPath = importPath.slice(7).replace(/::/g, "/");
    const tryPaths = [rustPath + ".rs", "src/" + rustPath + ".rs", rustPath + "/mod.rs", "src/" + rustPath + "/mod.rs"];
    for (const tryPath of tryPaths) {
      if (allFiles.some((f) => f.path === tryPath)) return tryPath;
    }
  } else if (importPath.startsWith("super::")) {
    const rustPath = importPath.slice(7).replace(/::/g, "/");
    const parentDir = path8.dirname(fromDir);
    const tryPath = path8.normalize(path8.join(parentDir, rustPath)) + ".rs";
    if (allFiles.some((f) => f.path === tryPath)) return tryPath;
  } else if (importPath.startsWith("self::")) {
    const rustPath = importPath.slice(6).replace(/::/g, "/");
    const tryPath = path8.normalize(path8.join(fromDir, rustPath)) + ".rs";
    if (allFiles.some((f) => f.path === tryPath)) return tryPath;
  }
  return null;
}
function resolveJsImport(importPath, fromDir, allFiles) {
  if (!importPath.startsWith(".") && !importPath.startsWith("/")) {
    return null;
  }
  const resolved = path8.normalize(path8.join(fromDir, importPath));
  const extensions = ["", ".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.js"];
  for (const ext of extensions) {
    const tryPath = resolved + ext;
    if (allFiles.some((f) => f.path === tryPath)) return tryPath;
  }
  return null;
}

// src/anti-pattern-detector.ts
init_esbuild_shim();
var path9 = __toESM(require("path"));
var CODE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".lua", ".py", ".go", ".rs"];
function isCodeFile(filePath) {
  const ext = path9.extname(filePath).toLowerCase();
  return CODE_EXTENSIONS.includes(ext);
}
function detectArchitectureIssues(nodes, edges, codeFileCount) {
  const issues = [];
  const cycles = findCycles(nodes);
  for (const cycle of cycles) {
    issues.push({
      ruleId: "circular-dependency",
      category: "architecture",
      severity: "high",
      message: `Circular dependency: ${cycle.join(" \u2192 ")} \u2192 ${cycle[0]}`,
      locations: cycle.map((file) => ({ file }))
    });
  }
  const nexusImportThreshold = Math.max(3, Math.floor(codeFileCount * 0.05));
  const nexusImportedByThreshold = Math.max(3, Math.floor(codeFileCount * 0.05));
  for (const [filePath, node] of nodes) {
    if (node.imports.length >= nexusImportThreshold && node.importedBy.length >= nexusImportedByThreshold) {
      const importsPct = Math.round(node.imports.length / codeFileCount * 100);
      const dependentsPct = Math.round(node.importedBy.length / codeFileCount * 100);
      issues.push({
        ruleId: "hub-file",
        category: "architecture",
        severity: "medium",
        message: `Coupling bottleneck: imports ${node.imports.length} files (${importsPct}%), ${node.importedBy.length} files (${dependentsPct}%) depend on it`,
        locations: [{ file: filePath }]
      });
    }
  }
  for (const [filePath, node] of nodes) {
    if (isCodeFile(filePath) && node.imports.length === 0 && node.importedBy.length === 0) {
      issues.push({
        ruleId: "orphan-file",
        category: "architecture",
        severity: "low",
        message: "No imports or dependents",
        locations: [{ file: filePath }]
      });
    }
  }
  return issues;
}
function findCycles(nodes) {
  const cycles = [];
  const visited = /* @__PURE__ */ new Set();
  const recursionStack = /* @__PURE__ */ new Set();
  function dfs(node, nodePath) {
    if (recursionStack.has(node)) {
      const cycleStart = nodePath.indexOf(node);
      if (cycleStart !== -1) {
        const cycle = nodePath.slice(cycleStart);
        const cycleKey = [...cycle].sort().join("|");
        if (!cycles.some((c) => [...c].sort().join("|") === cycleKey)) {
          cycles.push(cycle);
        }
      }
      return;
    }
    if (visited.has(node)) return;
    visited.add(node);
    recursionStack.add(node);
    nodePath.push(node);
    const nodeData = nodes.get(node);
    if (nodeData) {
      for (const imp of nodeData.imports) {
        dfs(imp, [...nodePath]);
      }
    }
    recursionStack.delete(node);
  }
  for (const node of nodes.keys()) {
    if (!visited.has(node)) {
      dfs(node, []);
    }
  }
  return cycles;
}

// src/dependency-analyzer.ts
var debugInfo = [];
var CODE_EXTENSIONS2 = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".lua", ".py", ".go", ".rs"];
function isCodeFile2(filePath) {
  const ext = path10.extname(filePath).toLowerCase();
  return CODE_EXTENSIONS2.includes(ext);
}
function analyzeDependencies(files, rootPath) {
  const nodes = /* @__PURE__ */ new Map();
  const edges = [];
  debugInfo = [];
  debugInfo.push(`Root: ${rootPath}`);
  debugInfo.push(`Parser: AST (pre-parsed)`);
  debugInfo.push(`Total files: ${files.length}`);
  const codeFiles = files.filter((f) => isCodeFile2(f.path));
  debugInfo.push(`Code files: ${codeFiles.length}`);
  const totalRawImports = codeFiles.reduce((sum, f) => sum + f.imports.length, 0);
  debugInfo.push(`Raw imports from AST: ${totalRawImports}`);
  const parsed = files.filter((f) => f.parseStatus === "parsed").length;
  const unsupported = files.filter((f) => f.parseStatus === "unsupported").length;
  const errors = files.filter((f) => f.parseStatus === "error").length;
  debugInfo.push(`Parse status: ${parsed} parsed, ${unsupported} unsupported, ${errors} errors`);
  for (const file of files) {
    nodes.set(file.path, {
      path: file.path,
      imports: [],
      importedBy: [],
      importDetails: []
    });
  }
  for (const file of codeFiles) {
    if (file.imports.length === 0) continue;
    const resolvedDetails = resolveImports(file.imports, file.path, files);
    if (resolvedDetails.length > 0) {
      debugInfo.push(`${file.path}: ${file.imports.length} raw -> ${resolvedDetails.length} resolved`);
    }
    const node = nodes.get(file.path);
    node.imports = resolvedDetails.map((r) => r.targetPath);
    node.importDetails = resolvedDetails;
    for (const detail of resolvedDetails) {
      edges.push({
        from: file.path,
        to: detail.targetPath,
        line: detail.line,
        code: detail.code
      });
      const targetNode = nodes.get(detail.targetPath);
      if (targetNode) {
        targetNode.importedBy.push(file.path);
      }
    }
  }
  debugInfo.push(`Total edges: ${edges.length}`);
  const issues = detectArchitectureIssues(nodes, edges, codeFiles.length);
  return { nodes, edges, issues };
}

// src/anti-pattern-rules.ts
init_esbuild_shim();
var vscode4 = __toESM(require("vscode"));
var path11 = __toESM(require("path"));
var fs4 = __toESM(require("fs"));
var ANTI_PATTERN_RULES = {
  // Architecture rules (existing)
  circular: "**Avoid circular dependencies.** Files should not form import cycles.",
  nexus: "**Avoid nexus/coupling bottlenecks.** Files should not both import many files and be imported by many files.",
  orphan: "**Avoid orphan files.** Code files should have imports or dependents.",
  // Structural rules
  "long-function": "**Keep functions short.** Functions should be ~20 lines, never exceed 50.",
  "long-file": "**Keep files short.** Files should stay under 200 lines.",
  "deep-nesting": "**Avoid deep nesting.** Nesting depth should not exceed 4 levels.",
  "silent-failure": "**No silent failures.** Catch blocks should never be empty.",
  "too-many-parameters": "**Limit function parameters.** Functions should not have more than 5 parameters.",
  // Naming rules
  "generic-name": "**Use descriptive names.** Avoid generic names like data, result, temp, item, value.",
  "non-verb-function": "**Functions should be verbs.** Function names should start with a verb.",
  "non-question-boolean": "**Booleans should be questions.** Boolean names should start with is, has, can, should, etc.",
  "magic-number": "**No magic numbers.** Numeric literals should be named constants.",
  // Comment rules
  "commented-code": "**Delete commented-out code.** Never commit commented-out code.",
  "high-comment-density": "**Comments indicate unclear code.** High comment density suggests code needs refactoring.",
  // Architecture rules (new)
  "mixed-concerns": "**Separate concerns.** Files should not mix data, logic, and rendering."
};
var APERTURE_RULES_MARKER = "<!-- Aperture Anti-Pattern Rules -->";
async function addAntiPatternRule(rootPath, patternType) {
  const claudeMdPath = path11.join(rootPath, "CLAUDE.md");
  const rule = ANTI_PATTERN_RULES[patternType];
  if (!rule) return;
  try {
    let content = "";
    if (fs4.existsSync(claudeMdPath)) {
      content = fs4.readFileSync(claudeMdPath, "utf-8");
    }
    if (content.includes(rule)) return;
    const ruleEntry = `- ${rule}`;
    if (content.includes(APERTURE_RULES_MARKER)) {
      const markerIndex = content.indexOf(APERTURE_RULES_MARKER);
      const insertIndex = markerIndex + APERTURE_RULES_MARKER.length;
      content = content.slice(0, insertIndex) + "\n" + ruleEntry + content.slice(insertIndex);
    } else {
      const section = `

${APERTURE_RULES_MARKER}
## Anti-Pattern Rules

${ruleEntry}`;
      content = content.trimEnd() + section + "\n";
    }
    fs4.writeFileSync(claudeMdPath, content);
    vscode4.window.showInformationMessage(`Added "${patternType}" rule to CLAUDE.md`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    vscode4.window.showErrorMessage(`Failed to update CLAUDE.md: ${msg}`);
  }
}
async function removeAntiPatternRule(rootPath, patternType) {
  const claudeMdPath = path11.join(rootPath, "CLAUDE.md");
  const rule = ANTI_PATTERN_RULES[patternType];
  if (!rule) return;
  try {
    if (!fs4.existsSync(claudeMdPath)) return;
    let content = fs4.readFileSync(claudeMdPath, "utf-8");
    const ruleEntry = `- ${rule}`;
    if (!content.includes(ruleEntry)) return;
    content = content.replace(ruleEntry + "\n", "").replace(ruleEntry, "");
    const hasOtherRules = Object.values(ANTI_PATTERN_RULES).some((r) => r !== rule && content.includes(r));
    if (!hasOtherRules && content.includes(APERTURE_RULES_MARKER)) {
      const sectionRegex = new RegExp(`\\n*${APERTURE_RULES_MARKER}\\n## Anti-Pattern Rules\\n*`, "g");
      content = content.replace(sectionRegex, "");
    }
    fs4.writeFileSync(claudeMdPath, content.trimEnd() + "\n");
    vscode4.window.showInformationMessage(`Removed "${patternType}" rule from CLAUDE.md`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    vscode4.window.showErrorMessage(`Failed to update CLAUDE.md: ${msg}`);
  }
}

// src/dashboard-html.ts
init_esbuild_shim();

// src/coding-standards-parser.ts
init_esbuild_shim();
var RULE_MATCHERS = [
  {
    pattern: /functions?\s+should\s+not\s+exceed\s+(\d+)\s+lines?/i,
    ruleId: "long-function",
    extract: (match, text) => {
      const dualThresholds = extractDualThresholds(text, "lines");
      if (dualThresholds.length > 1) {
        return { thresholds: dualThresholds };
      }
      return { threshold: extractThreshold(match[1], "lines", text) };
    }
  },
  {
    pattern: /files?\s+should\s+not\s+exceed\s+(\d+)\s+lines?/i,
    ruleId: "long-file",
    extract: (match, text) => ({
      threshold: extractThreshold(match[1], "lines", text)
    })
  },
  {
    pattern: /nesting\s+(?:depth\s+)?(?:beyond|exceed(?:ing)?)\s+(\d+)\s+levels?/i,
    ruleId: "deep-nesting",
    extract: (match, text) => ({
      threshold: extractThreshold(match[1], "levels", text)
    })
  },
  {
    pattern: /(?:more\s+than|exceed(?:ing)?)\s+(\d+)\s+parameters?/i,
    ruleId: "too-many-parameters",
    extract: (match, text) => ({
      threshold: extractThreshold(match[1], "parameters", text)
    })
  },
  {
    pattern: /avoid\s+generic\s+names?[:\s]+(.+)/i,
    ruleId: "generic-name",
    extract: (match) => ({
      blocklist: parseBlocklist(match[1])
    })
  },
  {
    pattern: /avoid\s+(?:generic\s+)?names?[:\s]*(data|result|temp)/i,
    ruleId: "generic-name"
  },
  {
    pattern: /boolean.*(?:should\s+be|named\s+as)\s+questions?/i,
    ruleId: "non-question-boolean",
    extract: (_, text) => ({
      pattern: extractBooleanPrefixes(text)
    })
  },
  {
    pattern: /(?:is|has|can|should|will)\*/i,
    ruleId: "non-question-boolean"
  },
  {
    pattern: /functions?\s+should\s+(?:start\s+with\s+)?(?:a\s+)?verb/i,
    ruleId: "non-verb-function"
  },
  {
    pattern: /(?:empty|silent)\s+(?:catch|except|failure)/i,
    ruleId: "silent-failure"
  },
  {
    pattern: /never\s+(?:use\s+)?empty\s+catch/i,
    ruleId: "silent-failure"
  },
  {
    pattern: /(?:remove|delete|avoid)\s+commented[\s-]?out\s+code/i,
    ruleId: "commented-code"
  },
  {
    pattern: /comments?\s+should\s+explain\s+why/i,
    ruleId: "high-comment-density"
  },
  {
    pattern: /circular\s+dependenc/i,
    ruleId: "circular-dependency"
  },
  {
    pattern: /orphan(?:ed)?\s*files?|(?:no\s+)?orphans?|no\s+(?:imports?\s+or\s+)?dependents?|incoming\s+dependenc/i,
    ruleId: "orphan-file"
  }
];
var SUPPORTED_DETECTORS = /* @__PURE__ */ new Set([
  "long-function",
  "long-file",
  "deep-nesting",
  "too-many-parameters",
  "generic-name",
  "non-question-boolean",
  "non-verb-function",
  "silent-failure",
  "commented-code",
  "high-comment-density",
  "circular-dependency",
  "hub-file",
  "orphan-file",
  "magic-number",
  "mixed-concerns"
]);
function extractThreshold(value, unit, text) {
  const severity = /\(error\)/i.test(text) ? "error" : /\(warning\)/i.test(text) ? "warning" : void 0;
  return { value: parseInt(value, 10), unit, severity };
}
function extractDualThresholds(text, unit) {
  const thresholds = [];
  const pattern = /(\d+)\s*lines?\s*\((warning|error)\)/gi;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    thresholds.push({
      value: parseInt(match[1], 10),
      unit,
      severity: match[2].toLowerCase()
    });
  }
  return thresholds;
}
function parseBlocklist(text) {
  return text.split(/[,;]/).map((s) => s.trim().toLowerCase()).filter((s) => s.length > 0 && !s.includes(" "));
}
function extractBooleanPrefixes(text) {
  const match = text.match(/(is|has|can|should|will)\*/gi);
  return match ? match.join(", ") : "is*, has*, can*, should*, will*";
}
function extractBulletPoints(content) {
  const lines = content.split("\n");
  const bullets = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      bullets.push(trimmed.slice(2).trim());
    }
  }
  return bullets;
}
function parseRule(rawText, index) {
  const id = `rule-${index}`;
  for (const matcher of RULE_MATCHERS) {
    const match = rawText.match(matcher.pattern);
    if (match) {
      const extras = matcher.extract ? matcher.extract(match, rawText) : {};
      const isSupported = SUPPORTED_DETECTORS.has(matcher.ruleId);
      return {
        id,
        rawText,
        status: isSupported ? "active" : "unsupported",
        ruleId: matcher.ruleId,
        ...extras
      };
    }
  }
  return {
    id,
    rawText,
    status: "new"
  };
}
function parseCodingStandards(content) {
  const bullets = extractBulletPoints(content);
  const rules = bullets.map((text, i2) => parseRule(text, i2));
  return {
    rules,
    activeCount: rules.filter((r) => r.status === "active").length,
    newCount: rules.filter((r) => r.status === "new").length,
    unsupportedCount: rules.filter((r) => r.status === "unsupported").length
  };
}
function getEmptyParseResult() {
  return {
    rules: [],
    activeCount: 0,
    newCount: 0,
    unsupportedCount: 0
  };
}
function extractThresholds(rules) {
  const thresholds = {
    functionLocWarning: FUNCTION_LOC_WARNING,
    functionLocError: FUNCTION_LOC_ERROR,
    fileLocWarning: FILE_LOC_WARNING,
    maxNestingDepth: MAX_NESTING_DEPTH,
    maxParameterCount: MAX_PARAMETER_COUNT,
    genericNames: [...GENERIC_NAMES]
  };
  for (const rule of rules) {
    if (!rule.ruleId) continue;
    if (rule.thresholds && rule.thresholds.length > 0) {
      for (const t of rule.thresholds) {
        if (rule.ruleId === "long-function") {
          if (t.severity === "error") {
            thresholds.functionLocError = t.value;
          } else if (t.severity === "warning") {
            thresholds.functionLocWarning = t.value;
          }
        }
      }
      continue;
    }
    if (!rule.threshold) continue;
    switch (rule.ruleId) {
      case "long-function":
        if (rule.threshold.severity === "error") {
          thresholds.functionLocError = rule.threshold.value;
        } else {
          thresholds.functionLocWarning = rule.threshold.value;
        }
        break;
      case "long-file":
        thresholds.fileLocWarning = rule.threshold.value;
        break;
      case "deep-nesting":
        thresholds.maxNestingDepth = rule.threshold.value;
        break;
      case "too-many-parameters":
        thresholds.maxParameterCount = rule.threshold.value;
        break;
    }
    if (rule.ruleId === "generic-name" && rule.blocklist) {
      thresholds.genericNames = rule.blocklist;
    }
  }
  return thresholds;
}

// src/webview/styles.ts
init_esbuild_shim();
var DASHBOARD_STYLES = `
    *, *::before, *::after { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; height: 100%; overflow: hidden; }
    body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); background: var(--vscode-editor-background); display: flex; flex-direction: column; }
    /* App Header */
    .app-header { display: flex; align-items: center; justify-content: space-between; margin: 0; padding: 8px 20px; gap: 12px; border-bottom: 1px solid var(--vscode-widget-border); height: 40px; }
    .back-header { display: flex; align-items: center; gap: 8px; min-width: 200px; }
    .back-header.hidden { visibility: hidden; }
    .header-warning { display: flex; align-items: center; gap: 6px; font-size: 0.75em; color: var(--vscode-editorWarning-foreground, #cca700); }
    .header-warning-icon { font-size: 1em; }
    .header-lang { padding: 2px 6px; background: rgba(204, 167, 0, 0.2); border-radius: 3px; font-size: 0.9em; }
    .ai-input-wrapper { display: flex; align-items: center; gap: 8px; background: transparent; border: none; border-radius: 6px; padding: 5px 5px 5px 0; }
    @keyframes inputGlow { 0%, 100% { border-color: rgba(100, 149, 237, 0.8); box-shadow: 0 0 12px rgba(100, 149, 237, 0.4); } 33% { border-color: rgba(147, 112, 219, 0.8); box-shadow: 0 0 12px rgba(147, 112, 219, 0.4); } 66% { border-color: rgba(64, 224, 208, 0.8); box-shadow: 0 0 12px rgba(64, 224, 208, 0.4); } }
    .ai-input-wrapper textarea { flex: 1; padding: 5px 14px; margin: 0; background: transparent; border: none; color: var(--vscode-input-foreground); font-size: 14px; line-height: 1.4; outline: none; resize: none; font-family: inherit; min-height: 28px; max-height: 120px; overflow-y: auto; }
    .ai-input-actions { display: flex; align-items: center; gap: 8px; }
    /* Chat footer with usage indicator */
    .chat-footer { display: none; padding-top: 8px; border-top: 1px solid rgba(255, 255, 255, 0.1); margin-top: 8px; }
    .chat-footer.visible { display: block; }
    .chat-usage { display: flex; align-items: center; gap: 8px; }
    .context-bar { flex: 1; height: 6px; border-radius: 3px; overflow: hidden; animation: barGlow 3s ease-in-out infinite; }
    @keyframes barGlow { 0%, 100% { background: rgba(100, 149, 237, 0.4); } 33% { background: rgba(147, 112, 219, 0.4); } 66% { background: rgba(64, 224, 208, 0.4); } }
    .context-bar-fill { height: 100%; background: rgba(255, 255, 255, 0.9); border-radius: 3px; transition: width 0.3s ease; }
    .context-pct { font-size: 0.75em; color: var(--vscode-descriptionForeground); white-space: nowrap; }
    .ai-send-btn { width: 28px; height: 28px; margin: 0; padding: 0; border-radius: 6px; border: none; background: rgba(255, 255, 255, 0.15); color: var(--vscode-descriptionForeground); cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: background 0.2s, color 0.2s; }
    .ai-send-btn:hover { background: rgba(255, 255, 255, 0.25); }
    .ai-send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .ai-send-btn.ready { background: var(--vscode-button-background); color: var(--vscode-button-foreground); animation: sendGlow 3s ease-in-out infinite; }
    @keyframes sendGlow { 0%, 100% { background: rgba(100, 149, 237, 0.9); } 33% { background: rgba(147, 112, 219, 0.9); } 66% { background: rgba(64, 224, 208, 0.9); } }
    .ai-send-btn svg { width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
    /* Context Files Chips - shown in footer context row */
    .context-files { display: flex; flex-wrap: nowrap; gap: 6px; overflow: hidden; flex: 1; min-height: 0; }
    .footer-context-row { display: none; align-items: center; gap: 8px; }
    .footer-context-row.visible { display: flex; }
    .footer-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
    .context-chip { display: inline-flex; align-items: center; gap: 4px; padding: 3px 6px 3px 8px; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 4px; font-size: 0.75em; color: var(--vscode-foreground); flex-shrink: 0; }
    .context-chip-name { max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .context-chip-remove { display: flex; align-items: center; justify-content: center; width: 16px; height: 16px; padding: 0; margin: 0 -2px 0 0; border: none; background: transparent; color: var(--vscode-descriptionForeground); cursor: pointer; border-radius: 3px; font-size: 14px; line-height: 1; }
    .context-chip-remove:hover { background: rgba(255, 255, 255, 0.15); color: var(--vscode-foreground); }
    .context-chip.more { padding: 3px 8px; background: transparent; border: 1px dashed rgba(255, 255, 255, 0.2); color: var(--vscode-descriptionForeground); cursor: pointer; }
    /* AI Chat Panel - opens upward from footer, positioned via JS */
    .ai-panel { position: fixed; left: 50%; transform: translateX(-50%); width: 520px; background: rgba(30, 30, 30, 0.95); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; box-shadow: 0 -4px 12px rgba(0,0,0,0.3); padding: 12px; display: none; z-index: 50; max-height: 50vh; overflow: hidden; flex-direction: column; }
    .ai-panel.visible { display: flex; }
    /* Chat Messages Area */
    .chat-messages { flex: 1; min-height: 0; max-height: calc(60vh - 120px); overflow-y: auto; display: flex; flex-direction: column; gap: 8px; margin-bottom: 10px; }
    .chat-messages:empty { display: none; }
    .user-message { align-self: flex-end; max-width: 85%; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border-radius: 12px 12px 0 12px; padding: 10px 14px; font-size: 14px; line-height: 1.4; }
    .user-message.debug { align-self: stretch; max-width: 100%; background: rgba(30, 30, 50, 0.9); border: 1px solid rgba(100, 100, 200, 0.5); color: #eee; font-family: monospace; flex-shrink: 0; }
    .user-message-text { margin-bottom: 6px; }
    .user-message-files { display: flex; flex-wrap: wrap; gap: 4px; font-size: 0.85em; opacity: 0.85; }
    .user-message-file { display: inline-flex; align-items: center; gap: 3px; }
    .user-message-file::before { content: '\u{1F4CE}'; font-size: 0.9em; }
    .ai-message { align-self: flex-start; max-width: 90%; background: rgba(255, 255, 255, 0.08); border-radius: 12px 12px 12px 0; padding: 10px 14px; font-size: 14px; line-height: 1.5; white-space: pre-wrap; overflow-wrap: break-word; word-break: break-word; }
    .ai-message.thinking { display: flex; align-items: center; gap: 10px; }
    .ai-message .thinking-spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.2); border-top-color: var(--vscode-textLink-foreground); border-radius: 50%; animation: spin 0.8s linear infinite; flex-shrink: 0; }
    .ai-message .thinking-abort { margin-left: auto; background: transparent; border: none; color: var(--vscode-descriptionForeground); cursor: pointer; font-size: 16px; padding: 2px 6px; border-radius: 3px; line-height: 1; }
    .ai-message .thinking-abort:hover { background: rgba(255, 255, 255, 0.15); color: var(--vscode-foreground); }
    .ai-message.error { background: rgba(200, 80, 80, 0.15); border: 1px solid rgba(200, 80, 80, 0.3); color: var(--vscode-errorForeground, #f88); }
    .ai-usage { font-size: 11px; color: var(--vscode-descriptionForeground); margin-top: 8px; opacity: 0.7; }
    .prompt-estimate { font-size: 9px; color: rgba(150, 150, 200, 0.8); margin-top: 6px; text-align: right; }
    /* Chat Actions */
    .chat-actions { margin-top: auto; }
    .chat-actions .action-btns + .chat-actions { padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.1); }
    .chat-actions .action-btns { display: flex; gap: 8px; }
    .chat-actions .action-btn { padding: 6px 12px; font-size: 0.85em; background: rgba(255, 255, 255, 0.1); color: var(--vscode-foreground); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 4px; cursor: pointer; }
    .chat-actions .action-btn:hover { background: rgba(255, 255, 255, 0.2); }
    /* Prompt Loading Spinner */
    .prompt-loading { display: flex; align-items: center; gap: 8px; padding: 4px 0; }
    .prompt-loading .thinking-spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.2); border-top-color: var(--vscode-textLink-foreground); border-radius: 50%; animation: spin 0.8s linear infinite; }
    .footer { position: relative; height: 90px; border-top: 1px solid var(--vscode-widget-border); font-size: 0.8em; color: var(--vscode-descriptionForeground); display: flex; align-items: flex-end; justify-content: space-between; padding: 0 12px 8px; overflow: visible; }
    .footer-stats { font-size: 0.85em; color: var(--vscode-descriptionForeground); white-space: nowrap; }
    .footer-parsers { display: flex; align-items: center; gap: 6px; font-size: 0.85em; color: var(--vscode-descriptionForeground); }
    .footer-parsers-icon { color: var(--vscode-editorWarning-foreground, #cca700); }
    .footer-lang { background: rgba(204, 167, 0, 0.15); padding: 2px 6px; border-radius: 3px; font-size: 0.9em; }
    .footer-input-container { position: absolute; bottom: 8px; left: 50%; transform: translateX(-50%); width: 520px; background: rgba(30, 30, 30, 0.85); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-radius: 12px; padding: 8px; border: 2px solid transparent; animation: inputGlow 3s ease-in-out infinite; overflow: visible; }
    .footer .ai-input-wrapper { width: 100%; align-items: flex-end; }
    .footer .ai-input-wrapper textarea { width: 100%; }
    .input-divider { display: none; border: none; border-top: 1px solid rgba(255, 255, 255, 0.1); margin: 6px 0; }
    .input-divider.visible { display: block; }
    .footer-stat { display: inline-flex; gap: 4px; align-items: baseline; }
    .footer-stat strong { color: var(--vscode-textLink-foreground); font-size: 1.1em; }
    .footer-warning { display: flex; align-items: center; gap: 8px; padding: 6px 10px; background: rgba(204, 167, 0, 0.15); border: 1px solid rgba(204, 167, 0, 0.4); border-radius: 4px; }
    .footer-warning-icon { color: var(--vscode-editorWarning-foreground, #cca700); font-size: 1em; }
    .footer-warning-text { color: var(--vscode-editorWarning-foreground, #cca700); margin-right: 4px; }
    .footer-lang { padding: 2px 6px; background: rgba(204, 167, 0, 0.25); border-radius: 3px; color: var(--vscode-editorWarning-foreground, #cca700); font-size: 0.9em; }
    .node { stroke: var(--vscode-editor-background); stroke-width: 1px; cursor: pointer; transition: opacity 0.2s; }
    .node:hover { stroke: var(--vscode-focusBorder); stroke-width: 2px; }
    .node.highlighted { }
    .tooltip { position: absolute; background: var(--vscode-editorWidget-background); border: 1px solid var(--vscode-widget-border); padding: 8px; font-size: 12px; pointer-events: none; z-index: 100; }
    .thinking { display: flex; align-items: center; gap: 10px; padding: 12px; }
    .thinking-spinner { width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.2); border-top-color: var(--vscode-textLink-foreground); border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .rules { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; }
    .rule-btn { padding: 8px 16px; font-size: 0.9em; background: rgba(255, 255, 255, 0.1); color: var(--vscode-foreground); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 6px; cursor: pointer; transition: background 0.15s; }
    .rule-btn:hover { background: rgba(255, 255, 255, 0.2); }
    .rule-btn .file-count { opacity: 0.6; font-size: 0.9em; }
    .dir-header { fill: rgba(30,30,30,0.95); pointer-events: none; }
    .dir-label { font-size: 11px; font-weight: bold; fill: #fff; pointer-events: none; text-transform: uppercase; letter-spacing: 0.5px; }
    .dir-label-sub { font-size: 9px; fill: #aaa; pointer-events: none; text-transform: uppercase; }
    /* Collapsed folder nodes - render as clickable leaves */
    .folder-node { fill: #2d2d2d; stroke: var(--vscode-editor-background); stroke-width: 1px; cursor: pointer; transition: opacity 0.2s; }
    .folder-node:hover { stroke: var(--vscode-focusBorder); stroke-width: 2px; }
    .folder-node.other { fill: #222; stroke: var(--vscode-editor-background); }
    .folder-node.other:hover { stroke: var(--vscode-focusBorder); }
    .other-divider { stroke: var(--vscode-editor-background); stroke-width: 1; }
    .folder-label { font-size: 9px; fill: #fff; pointer-events: none; }
    .folder-count { font-size: 8px; fill: #888; pointer-events: none; }
    .legend { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 4px; }
    .legend-item { display: flex; align-items: center; gap: 5px; font-size: 0.8em; color: var(--vscode-foreground); }
    .legend-swatch { width: 12px; height: 12px; }
    /* Breadcrumb navigation */
    .back-header.hidden { display: none; }
    .back-header { display: flex; align-items: center; gap: 4px; }
    .back-btn { background: none; border: none; color: var(--vscode-textLink-foreground); cursor: pointer; font-size: 1em; padding: 4px 8px; border-radius: 3px; margin-right: 8px; }
    .back-btn:hover { background: var(--vscode-list-hoverBackground); }
    .breadcrumb-separator { color: var(--vscode-descriptionForeground); font-size: 0.85em; margin: 0 2px; }
    .breadcrumb-segment { background: none; border: none; color: var(--vscode-textLink-foreground); cursor: pointer; font-size: 0.85em; padding: 2px 4px; border-radius: 3px; }
    .breadcrumb-segment:hover { background: var(--vscode-list-hoverBackground); text-decoration: underline; }
    .breadcrumb-current { font-size: 0.85em; color: var(--vscode-foreground); font-weight: 600; padding: 2px 4px; }
    .breadcrumb-ellipsis { color: var(--vscode-descriptionForeground); font-size: 0.85em; padding: 0 4px; }
    .analyze-btn { padding: 6px 12px; background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); border: none; border-radius: 4px; cursor: pointer; font-size: 0.85em; }
    .analyze-btn:hover { background: var(--vscode-button-secondaryHoverBackground); }
    .analyze-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .progress-text { font-size: 0.85em; color: var(--vscode-descriptionForeground); }
    .pattern-panel { margin-top: 20px; border-top: 1px solid var(--vscode-widget-border); padding-top: 15px; display: none; }
    .pattern-panel h3 { margin: 0 0 12px 0; font-size: 1.1em; }
    .pattern-category { margin-bottom: 16px; }
    .pattern-category h4 { margin: 0 0 8px 0; font-size: 0.9em; color: var(--vscode-descriptionForeground); text-transform: uppercase; letter-spacing: 0.5px; }
    .pattern-item { margin-bottom: 4px; }
    .pattern-header { display: flex; align-items: center; gap: 8px; padding: 6px 8px; background: var(--vscode-editor-inactiveSelectionBackground); border-radius: 4px; cursor: pointer; }
    .pattern-header:hover { background: var(--vscode-list-hoverBackground); }
    .pattern-swatch { width: 12px; height: 12px; border-radius: 2px; flex-shrink: 0; }
    .pattern-name { font-weight: 500; flex: 1; }
    .pattern-count { color: var(--vscode-descriptionForeground); font-size: 0.85em; }
    .pattern-arrow { color: var(--vscode-descriptionForeground); transition: transform 0.2s; }
    .pattern-arrow.expanded { transform: rotate(90deg); }
    .pattern-files { padding-left: 20px; display: none; }
    .pattern-files.expanded { display: block; }
    .file-entry { padding: 4px 8px; font-size: 0.85em; cursor: pointer; border-radius: 3px; display: flex; gap: 8px; }
    .file-entry:hover { background: var(--vscode-list-hoverBackground); }
    .file-path { color: var(--vscode-textLink-foreground); }
    .file-reason { color: var(--vscode-descriptionForeground); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .main-split { display: flex; gap: 16px; flex: 1; min-height: 0; padding: 0 20px 0 20px; }
    .main-content { flex: 3; display: flex; flex-direction: column; position: relative; }
    .main-sidebar { flex: 1; min-width: 250px; max-width: 320px; overflow-y: auto; border-left: 1px solid var(--vscode-panel-border, #444); padding-left: 12px; }
    .diagram-area { flex: 1; position: relative; min-height: 0; overflow: hidden; display: flex; flex-direction: column; margin: 0; padding: 0; }
    .dep-container { display: none; width: 100%; flex: 1; min-height: 0; }
    .dep-chord { display: flex; align-items: center; justify-content: center; height: 100%; }
    .dep-chord svg { display: block; }
    .dep-controls { display: none; position: absolute; bottom: 20px; left: 20px; background: var(--vscode-editor-background); padding: 8px; border-radius: 6px; border: 1px solid var(--vscode-widget-border); z-index: 10; }
    .dep-controls.visible { display: block; }
    .dep-control-row { display: flex; align-items: center; gap: 12px; padding: 8px 10px; background: var(--vscode-editor-inactiveSelectionBackground); border-radius: 4px; margin-bottom: 6px; }
    .dep-control-row label { font-size: 0.85em; white-space: nowrap; }
    .dep-control-row input[type="range"] { flex: 1; min-width: 80px; }
    .dep-control-row .slider-value { font-size: 0.85em; min-width: 24px; text-align: right; color: var(--vscode-textLink-foreground); font-weight: bold; }
    .chord-group { cursor: pointer; }
    .chord-group:hover .chord-arc { opacity: 0.8; }
    .chord-arc { stroke: var(--vscode-editor-background); stroke-width: 1px; transition: opacity 0.2s; }
    .chord-arc.highlighted { }
    .chord-ribbon { fill-opacity: 0.6; transition: opacity 0.2s; }
    .chord-ribbon.highlighted { fill-opacity: 0.9; }
    .chord-ribbon:hover { fill-opacity: 0.9; }
    .chord-label { font-size: 10px; fill: var(--vscode-foreground); }
        .anti-patterns { margin: 0; }
    /* Issue category sections */
    .issue-category { margin-bottom: 12px; }
    .issue-category-header { display: flex; align-items: center; gap: 8px; padding: 8px 12px; cursor: pointer; font-size: 0.8em; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--vscode-descriptionForeground); }
    .issue-category-header:hover { color: var(--vscode-foreground); }
    .issue-category-chevron { transition: transform 0.2s; }
    .issue-category-chevron.expanded { transform: rotate(90deg); }
    .issue-category-items { display: none; }
    .issue-category-items.expanded { display: block; }
    .arch-placeholder { padding: 8px 12px; font-size: 0.8em; color: var(--vscode-descriptionForeground); font-style: italic; }
    .pattern-group { margin-bottom: 8px; }
    .pattern-header { padding: 10px 12px; border-radius: 4px; font-size: 0.85em; cursor: pointer; display: flex; align-items: center; gap: 8px; background: var(--vscode-editor-inactiveSelectionBackground); border-left: 3px solid transparent; }
    .pattern-header:hover { background: var(--vscode-list-hoverBackground); }
    .pattern-header.high { border-left-color: #e74c3c; }
    .pattern-header.medium { border-left-color: #f39c12; }
    .pattern-header.low { border-left-color: #7f8c8d; }
    .pattern-chevron { display: flex; align-items: center; justify-content: center; width: 16px; height: 16px; cursor: pointer; }
    .pattern-chevron svg { width: 12px; height: 12px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; transition: transform 0.2s; }
    .pattern-chevron.expanded svg { transform: rotate(90deg); }
    .pattern-title { font-weight: 600; }
    .pattern-count { font-size: 0.8em; color: #fff; background: #555; padding: 2px 6px; border-radius: 10px; margin-left: 6px; }
    .pattern-spacer { flex: 1; }
    .pattern-items { display: none; padding-left: 16px; margin-top: 4px; }
    .pattern-items.expanded { display: block; }
    .pattern-item { padding: 8px 10px; margin-bottom: 4px; border-radius: 3px; font-size: 0.8em; cursor: pointer; background: var(--vscode-editor-inactiveSelectionBackground); border-left: 3px solid transparent; }
    .pattern-item:hover { background: var(--vscode-list-hoverBackground); }
    .pattern-item.high { border-left-color: #e74c3c; }
    .pattern-item.medium { border-left-color: #f39c12; }
    .pattern-item.low { border-left-color: #7f8c8d; }
    .pattern-item-file { color: var(--vscode-foreground); font-weight: 500; margin-bottom: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .pattern-item-desc { font-size: 0.9em; color: var(--vscode-descriptionForeground); line-height: 1.3; }
    .pattern-item-row { display: flex; align-items: center; gap: 8px; }
    .pattern-item-content { flex: 1; }
    .pattern-ignore-btn { background: var(--vscode-descriptionForeground); border: none; cursor: pointer; width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; opacity: 0.5; padding: 0; }
    .pattern-ignore-btn:hover { opacity: 1; background: var(--vscode-errorForeground); }
    .pattern-ignore-btn svg { width: 10px; height: 10px; fill: none; stroke: #000; stroke-width: 2; stroke-linecap: round; }
    .pattern-rules-toggle { background: none; border: 1px solid var(--vscode-descriptionForeground); color: var(--vscode-descriptionForeground); cursor: pointer; padding: 4px 8px; font-size: 0.8em; border-radius: 3px; }
    .pattern-rules-toggle:hover { border-color: var(--vscode-focusBorder); color: var(--vscode-foreground); }
    .pattern-rules-toggle.active { background: var(--vscode-button-background); border-color: var(--vscode-button-background); color: var(--vscode-button-foreground); }
    .ignored-section { margin-top: 12px; border-top: 1px solid var(--vscode-widget-border); padding-top: 8px; }
    .ignored-header { display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 6px 0; color: var(--vscode-descriptionForeground); font-size: 0.8em; }
    .ignored-header:hover { color: var(--vscode-foreground); }
    .ignored-items { display: none; padding-left: 8px; }
    .ignored-items.expanded { display: block; }
    .ignored-item { display: flex; align-items: center; justify-content: space-between; padding: 4px 8px; margin-bottom: 4px; border-radius: 3px; font-size: 0.75em; background: var(--vscode-editor-inactiveSelectionBackground); color: var(--vscode-descriptionForeground); }
    .ignored-item-restore { background: none; border: none; color: var(--vscode-textLink-foreground); cursor: pointer; padding: 0; font-size: 1em; }
    .ignored-item-restore:hover { text-decoration: underline; }
    .dep-stats { display: none; }

    /* Issue highlighting - JS animation at 60fps for color cycling + alpha pulsing on fills */
    .node.issue-high, .node.issue-medium, .node.issue-low,
    .chord-arc.issue-high, .chord-arc.issue-medium, .chord-arc.issue-low,
    .chord-ribbon.issue-high, .chord-ribbon.issue-medium, .chord-ribbon.issue-low {
      /* No CSS transition - direct JS animation handles fill color and opacity */
    }

    /* Function Distribution Chart */
    .functions-container { display: none; width: 100%; flex: 1; min-height: 0; flex-direction: column; margin: 0; padding: 0; }
    .functions-container.visible { display: flex; }
    #functions-chart { width: 100%; flex: 1; min-height: 0; margin: 0; padding: 0; }
    .functions-empty { padding: 16px; text-align: center; color: var(--vscode-descriptionForeground); }

    /* Zoom Header - positioned absolutely to left */
    .zoom-header { position: absolute; left: 0; display: flex; align-items: center; gap: 8px; padding: 6px 10px; background: var(--vscode-editor-inactiveSelectionBackground); border-radius: 4px; }
    .zoom-back { background: none; border: none; color: var(--vscode-textLink-foreground); cursor: pointer; font-size: 1.1em; padding: 4px 8px; border-radius: 3px; }
    .zoom-back:hover { background: var(--vscode-list-hoverBackground); }
    .zoom-path { font-weight: 600; font-size: 0.9em; }
    /* SVG file header for L2 */
    .file-header { fill: rgba(30,30,30,0.95); pointer-events: none; }
    .file-header-label { font-size: 11px; font-weight: bold; fill: #fff; pointer-events: none; text-transform: uppercase; letter-spacing: 0.5px; }
    /* Partition layout for file internals */
    .partition-header { fill: rgba(30,30,30,0.95); pointer-events: none; }
    .partition-header-label { font-size: 11px; font-weight: bold; fill: #fff; pointer-events: none; text-transform: uppercase; letter-spacing: 0.5px; }
    .partition-node { stroke: var(--vscode-editor-background); stroke-width: 1px; cursor: pointer; transition: opacity 0.2s; }
    .partition-node:hover { stroke: var(--vscode-focusBorder); stroke-width: 2px; }
    .partition-label { pointer-events: none; }
    /* Code preview for leaf nodes */
    .code-preview-container { display: flex; flex-direction: column; height: 100%; padding: 16px; background: var(--vscode-editor-background); }
    .code-preview-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
    .code-preview-name { font-weight: 600; font-size: 1.1em; }
    .code-preview-loc { color: var(--vscode-descriptionForeground); font-size: 0.85em; }
    .code-preview-loading { display: flex; align-items: center; gap: 10px; padding: 20px; color: var(--vscode-descriptionForeground); }
    .code-preview-error { color: var(--vscode-errorForeground); }
    .code-preview-code { flex: 1; overflow: auto; background: rgba(0,0,0,0.2); border: 1px solid var(--vscode-widget-border); border-radius: 4px; padding: 12px; margin: 0; font-family: var(--vscode-editor-font-family); font-size: var(--vscode-editor-font-size, 13px); line-height: 1.5; }
    .code-line { display: block; }
    .code-line-number { display: inline-block; width: 40px; color: var(--vscode-editorLineNumber-foreground); text-align: right; padding-right: 12px; user-select: none; }
    .code-line-content { white-space: pre; }
    .code-preview-actions { display: flex; gap: 8px; margin-top: 12px; }
    .code-action-btn { padding: 8px 16px; background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); border: none; border-radius: 4px; cursor: pointer; font-size: 0.9em; }
    .code-action-btn:hover { background: var(--vscode-button-secondaryHoverBackground); }
    .code-action-prompt { background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
    .code-action-prompt:hover { background: var(--vscode-button-hoverBackground); }

    /* Files flyout */
    .files-flyout { position: fixed; z-index: 1000; background: var(--vscode-editor-background); border: 1px solid var(--vscode-widget-border); border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.3); min-width: 200px; max-width: 320px; max-height: 300px; display: flex; flex-direction: column; }
    .files-flyout-header { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; border-bottom: 1px solid var(--vscode-widget-border); font-size: 0.85em; font-weight: 600; }
    .files-flyout-close { background: none; border: none; color: var(--vscode-descriptionForeground); cursor: pointer; font-size: 16px; padding: 2px 6px; border-radius: 3px; }
    .files-flyout-close:hover { background: rgba(255,255,255,0.1); color: var(--vscode-foreground); }
    .files-flyout-list { overflow-y: auto; flex: 1; padding: 4px 0; }
    .files-flyout-item { display: flex; justify-content: space-between; align-items: center; padding: 4px 12px; font-size: 0.85em; cursor: default; }
    .files-flyout-item:hover { background: var(--vscode-list-hoverBackground); }
    .files-flyout-item span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .files-flyout-remove { background: none; border: none; color: var(--vscode-descriptionForeground); cursor: pointer; font-size: 14px; padding: 2px 4px; border-radius: 3px; opacity: 0; }
    .files-flyout-item:hover .files-flyout-remove { opacity: 1; }
    .files-flyout-remove:hover { background: rgba(255,255,255,0.1); color: var(--vscode-errorForeground); }

    /* Rule Status Header */
    .rule-status-missing { color: var(--vscode-descriptionForeground); }
    .rule-status-unsupported { color: var(--vscode-editorWarning-foreground, #cca700); }
    .rule-status-btn { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); border: none; border-radius: 3px; padding: 4px 10px; font-size: 0.85em; cursor: pointer; flex-shrink: 0; }
    .rule-status-btn:hover { background: var(--vscode-button-secondaryHoverBackground); }
    /* Rules warning - footer context */
    .rules-warning-container { margin-bottom: 6px; }
    .rules-warning-container:empty { display: none; }
    .rules-warning { display: flex; align-items: center; gap: 8px; width: 100%; padding: 8px 12px; border-radius: 4px; font-size: 0.9em; cursor: pointer; background: rgba(204, 167, 0, 0.1); border: none; border-left: 3px solid var(--vscode-editorWarning-foreground, #cca700); color: var(--vscode-foreground); text-align: left; }
    .rules-warning:hover { background: rgba(204, 167, 0, 0.2); }
    .rules-warning-icon { color: var(--vscode-editorWarning-foreground, #cca700); font-size: 1.1em; }
    .rules-create-btn { display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 8px 12px; border-radius: 4px; font-size: 0.9em; cursor: pointer; background: var(--vscode-editor-inactiveSelectionBackground); border: none; color: var(--vscode-foreground); text-align: left; }
    .rules-create-btn:hover { background: var(--vscode-list-hoverBackground); }
    .rules-create-text { color: var(--vscode-descriptionForeground); }
    .rules-create-action { color: var(--vscode-textLink-foreground, #3794ff); font-weight: 500; }
    .header-edit-btn { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); border: none; border-radius: 4px; padding: 4px 12px; font-size: 0.85em; cursor: pointer; }
    .header-edit-btn:hover { background: var(--vscode-button-secondaryHoverBackground); }
    .footer-rules-unsupported { color: var(--vscode-editorWarning-foreground, #cca700); }

    /* Unrecognized Rules Modal */
    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal-content { background: var(--vscode-editor-background); border: 1px solid var(--vscode-widget-border); border-radius: 8px; width: 90%; max-width: 500px; max-height: 70vh; display: flex; flex-direction: column; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4); }
    .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid var(--vscode-widget-border); }
    .modal-header h3 { margin: 0; font-size: 1em; }
    .modal-close { background: none; border: none; color: var(--vscode-descriptionForeground); cursor: pointer; font-size: 20px; padding: 4px 8px; border-radius: 3px; line-height: 1; }
    .modal-close:hover { background: rgba(255, 255, 255, 0.1); color: var(--vscode-foreground); }
    .modal-body { flex: 1; overflow-y: auto; padding: 16px; }
    .modal-desc { margin: 0 0 16px 0; font-size: 0.85em; color: var(--vscode-descriptionForeground); }
    .new-rule-item { padding: 10px 12px; margin-bottom: 8px; background: var(--vscode-editor-inactiveSelectionBackground); border-radius: 4px; border-left: 3px solid var(--vscode-editorWarning-foreground, #cca700); }
    .new-rule-text { font-size: 0.9em; line-height: 1.4; }
`;

// src/webview/tooltip.ts
init_esbuild_shim();
var TOOLTIP_SCRIPT = `
const tooltipEl = document.querySelector('.tooltip');

function showTooltip(html, e) {
  tooltipEl.innerHTML = html;
  tooltipEl.style.display = 'block';
  positionTooltip(e);
}

function positionTooltip(e) {
  tooltipEl.style.left = (e.pageX + 10) + 'px';
  tooltipEl.style.top = (e.pageY + 10) + 'px';
}

function hideTooltip() {
  tooltipEl.style.display = 'none';
}

function buildFileTooltip(opts) {
  const { path, language, loc, imports, importedBy, showImportsList, nodeData, fileCount, isFolder } = opts;
  const pathParts = path.split('/');
  const fileName = pathParts.pop();
  const dirPath = pathParts.join('/');

  let html = '';
  if (dirPath) {
    html += '<div style="font-size:10px;color:var(--vscode-descriptionForeground);">' + dirPath + '</div>';
  }
  html += '<div style="font-size:16px;font-weight:bold;margin:4px 0 8px 0;">' + fileName + (isFolder ? '/' : '') + '</div>';

  if (isFolder && fileCount) {
    html += '<div style="font-size:11px;color:var(--vscode-descriptionForeground);">' + fileCount + ' files</div>';
  } else if (language && loc !== undefined) {
    html += '<div style="font-size:11px;color:var(--vscode-descriptionForeground);">' + language + ' \xB7 ' + loc.toLocaleString() + ' lines</div>';
  }

  if (imports !== undefined || importedBy !== undefined) {
    const stats = [];
    if (imports !== undefined) stats.push(imports + ' imports out');
    if (importedBy !== undefined) stats.push(importedBy + ' imports in');
    html += '<div style="font-size:11px;color:var(--vscode-descriptionForeground);">' + stats.join(' \xB7 ') + '</div>';
  }

  if (showImportsList && nodeData && nodeData.imports && nodeData.imports.length > 0) {
    html += '<div style="margin-top:10px;border-top:1px solid var(--vscode-widget-border);padding-top:8px;">';
    html += '<strong style="font-size:11px;">Imports:</strong></div>';
    for (const imp of nodeData.imports.slice(0, 5)) {
      html += '<div style="font-size:10px;color:var(--vscode-textLink-foreground);margin-top:3px;">' + imp.split('/').pop() + '</div>';
    }
    if (nodeData.imports.length > 5) {
      html += '<div style="font-size:10px;color:var(--vscode-descriptionForeground);margin-top:3px;">...and ' + (nodeData.imports.length - 5) + ' more</div>';
    }
  }

  if (!isFolder) {
    html += '<div style="font-size:10px;color:var(--vscode-descriptionForeground);margin-top:8px;">Click to open file</div>';
  }
  return html;
}

function buildEdgeTooltip(opts) {
  const { fromName, toName, code, line } = opts;
  let html = '<strong>' + fromName + '</strong> \u2192 <strong>' + toName + '</strong>';
  if (code) {
    html += '<br><code style="font-size:11px;background:rgba(0,0,0,0.3);padding:2px 4px;border-radius:2px;display:block;margin-top:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:300px;">' + escapeHtml(code) + '</code>';
    html += '<div style="font-size:10px;color:var(--vscode-descriptionForeground);margin-top:4px;">Line ' + line + ' \xB7 Click to open</div>';
  }
  return html;
}
`;

// src/webview/treemap-nav.ts
init_esbuild_shim();
var TREEMAP_NAV_SCRIPT = `
// Navigation module - manages view and zoom state only
const nav = {
  _state: {
    view: 'files',        // 'files' | 'functions' | 'deps'
    zoomedUri: null,      // null (L1) or file URI (L2)
    prevZoomedUri: null,  // For animation direction
    prevView: null        // For view transition detection
  },

  // Navigate to a target - handles view/zoom state and triggers render
  // target: { view?, uri? }
  goTo(target) {
    // Save previous state for animation detection
    this._state.prevView = this._state.view;
    this._state.prevZoomedUri = this._state.zoomedUri;

    // Update state
    if (target.view !== undefined) {
      this._state.view = target.view;
    }
    if (target.uri !== undefined) {
      this._state.zoomedUri = target.uri;
    }

    // Sync to legacy globals for compatibility with renderers
    this._syncToGlobals();

    // Update DOM visibility
    this._updateDOM();

    // Trigger appropriate render
    this._render();
  },

  // Go back one level - uses getParentUri for proper hierarchy traversal
  back() {
    if (this._state.zoomedUri) {
      const parentUri = getParentUri(this._state.zoomedUri);
      this.goTo({ uri: parentUri });
    }
  },

  // Get current state (read-only copy)
  getState() {
    const zoomedPath = this._state.zoomedUri ? getFilePath(this._state.zoomedUri) : null;
    return {
      view: this._state.view,
      zoomedUri: this._state.zoomedUri,
      zoomedFile: zoomedPath  // Legacy compatibility
    };
  },

  // Check if a path is a file (exists in files array) or folder
  _isFilePath(path) {
    if (!path) return false;
    return files.some(f => f.path === path);
  },

  // Sync internal state to legacy globals (for renderer compatibility)
  _syncToGlobals() {
    currentView = this._state.view;
    const uri = this._state.zoomedUri;
    const prevUri = this._state.prevZoomedUri;

    const prevFolder = zoomedFolder;  // Track previous folder for animation reset

    if (!uri) {
      zoomedFile = null;
      zoomedFolder = null;
    } else {
      // Strip #partial fragment if present (used for partial view animation)
      const baseUri = uri.replace(/#partial$/, '');
      const path = getFilePath(baseUri);
      if (this._isFilePath(path)) {
        zoomedFile = path;
        zoomedFolder = null;
      } else {
        zoomedFile = null;
        zoomedFolder = path;
      }
    }

    // Handle previous state for animations
    if (!prevUri) {
      prevZoomedFile = null;
      prevZoomedFolder = null;
    } else {
      const prevPath = getFilePath(prevUri);
      if (this._isFilePath(prevPath)) {
        prevZoomedFile = prevPath;
        prevZoomedFolder = null;
      } else {
        prevZoomedFile = null;
        prevZoomedFolder = prevPath;
      }
    }

    // Reset zoom transforms when folder changes (layout will be completely different)
    if (zoomedFolder !== prevFolder) {
      zoom.reset();
    }
  },

  // Update DOM container visibility based on current view
  _updateDOM() {
    const view = this._state.view;

    // Unified treemap container for both files and functions views
    document.getElementById('functions-container').classList.toggle('visible', view === 'files' || view === 'functions');

    // Dependencies chord diagram
    document.getElementById('dep-container').style.display = view === 'deps' ? 'block' : 'none';
    document.getElementById('dep-controls').classList.toggle('visible', view === 'deps');

    // Legend (hidden for deps)
    document.getElementById('legend').style.display = view !== 'deps' ? 'flex' : 'none';

    // Breadcrumb (always shown in files or functions view)
    const backHeader = document.getElementById('back-header');
    if (view === 'files' || view === 'functions') {
      renderBreadcrumb(backHeader, this._state.zoomedUri);
    } else if (backHeader) {
      backHeader.classList.add('hidden');
      backHeader.innerHTML = '';
    }
  },

  // Trigger the appropriate renderer for current view
  _render() {
    if (this._state.view === 'files' || this._state.view === 'functions') {
      renderDistributionChart();
    } else if (this._state.view === 'deps') {
      if (!depGraph) {
        vscode.postMessage({ command: 'getDependencies' });
      } else {
        renderDepGraph();
        renderIssues();
      }
    }

    // Apply persistent issue styling and current selection highlights
    applyPersistentIssueHighlights();
    selection._applyHighlights();

    // Update UI
    renderDynamicPrompts();
    updateStatus();
  }
};
`;

// src/webview/issue-highlights.ts
init_esbuild_shim();
var ISSUE_HIGHLIGHTS_SCRIPT = `
function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildIssueFileMap() {
  issueFileMap.clear();
  const activeIssues = issues.filter(i => !isIssueIgnored(i));
  const severityRank = { high: 0, medium: 1, low: 2 };

  for (const issue of activeIssues) {
    for (const loc of issue.locations) {
      const existing = issueFileMap.get(loc.file);
      if (!existing || severityRank[issue.severity] < severityRank[existing]) {
        issueFileMap.set(loc.file, issue.severity);
      }
    }
  }
}

function applyPersistentIssueHighlights() {
  // Apply persistent issue severity styling to all nodes
  document.querySelectorAll('.node').forEach(node => {
    const path = node.getAttribute('data-path');
    node.classList.remove('issue-high', 'issue-medium', 'issue-low');
    if (issueFileMap.has(path)) {
      node.classList.add('issue-' + issueFileMap.get(path));
    }
  });

  // Apply to chord arcs
  document.querySelectorAll('.chord-arc').forEach(arc => {
    const path = arc.getAttribute('data-path');
    arc.classList.remove('issue-high', 'issue-medium', 'issue-low');
    if (path && issueFileMap.has(path)) {
      arc.classList.add('issue-' + issueFileMap.get(path));
    }
  });

  // Apply to chord ribbons
  document.querySelectorAll('.chord-ribbon').forEach(ribbon => {
    const fromPath = ribbon.getAttribute('data-from');
    const toPath = ribbon.getAttribute('data-to');
    ribbon.classList.remove('issue-high', 'issue-medium', 'issue-low');
    const severityRank = { high: 0, medium: 1, low: 2 };
    const fromSev = fromPath ? issueFileMap.get(fromPath) : null;
    const toSev = toPath ? issueFileMap.get(toPath) : null;
    let severity = null;
    if (fromSev && toSev) {
      severity = severityRank[fromSev] < severityRank[toSev] ? fromSev : toSev;
    } else {
      severity = fromSev || toSev;
    }
    if (severity) {
      ribbon.classList.add('issue-' + severity);
    }
  });
}

function renderStats() {
  // Stats shown in footer via renderFooterStats()
}
`;

// src/webview/chord-diagram.ts
init_esbuild_shim();
var CHORD_SCRIPT = `
function renderDepGraph() {
  if (!depGraph) return;

  const container = document.getElementById('dep-chord');
  container.innerHTML = '';

  // Filter to code files, optionally including orphans
  const showOrphans = document.getElementById('show-orphans').checked;
  const codeNodes = depGraph.nodes.filter(n =>
    /\\.(ts|tsx|js|jsx|lua|py|go|rs)$/.test(n.path) &&
    (showOrphans || n.imports.length > 0 || n.importedBy.length > 0)
  );

  renderStats(codeNodes.length, depGraph.edges.length);

  if (codeNodes.length === 0) {
    const debugLines = (depGraph.debug || []).map(d => '<br>\u2022 ' + d).join('');
    container.innerHTML = '<p style="padding:20px;color:var(--vscode-descriptionForeground);font-size:12px;">No dependencies found.<br><br><strong>Debug:</strong>' + debugLines + '</p>';
    return;
  }

  // Calculate max depth and update slider
  const maxDepth = Math.max(...codeNodes.map(n => n.path.split('/').length));
  const depthSlider = document.getElementById('depth-slider');
  depthSlider.max = maxDepth;
  if (parseInt(depthSlider.value) > maxDepth) depthSlider.value = maxDepth;
  const depthLevel = parseInt(depthSlider.value) || maxDepth;
  document.getElementById('depth-value').textContent = depthLevel;

  function getGroupKey(path, depth) {
    const parts = path.split('/');
    if (depth >= parts.length) return path; // Individual file
    return parts.slice(0, depth).join('/');
  }

  // Build groups by folder depth
  const groups = new Map();
  for (const node of codeNodes) {
    const key = getGroupKey(node.path, depthLevel);
    if (!groups.has(key)) {
      const isFile = depthLevel >= node.path.split('/').length;
      groups.set(key, {
        name: key.split('/').pop() + (isFile ? '' : '/'),
        fullPath: key,
        files: [],
        imports: 0,
        importedBy: 0,
        isFolder: !isFile
      });
    }
    const g = groups.get(key);
    g.files.push(node);
    g.imports += node.imports.length;
    g.importedBy += node.importedBy.length;
  }

  // Sort groups based on sort mode
  const sortMode = document.getElementById('sort-mode').value;
  topGroups = [...groups.values()].sort((a, b) =>
    sortMode === 'used' ? b.importedBy - a.importedBy : b.imports - a.imports
  );

  // Build index mapping file paths to their group index
  const groupIndex = new Map();
  topGroups.forEach((g, i) => {
    for (const f of g.files) {
      groupIndex.set(f.path, i);
    }
  });

  // Build adjacency matrix
  const n = topGroups.length;
  const matrix = Array(n).fill(null).map(() => Array(n).fill(0));
  for (const edge of depGraph.edges) {
    const fromIdx = groupIndex.get(edge.from);
    const toIdx = groupIndex.get(edge.to);
    if (fromIdx !== undefined && toIdx !== undefined) { matrix[fromIdx][toIdx]++; }
  }
  // Only set diagonal for groups with connections (not orphans)
  for (let i = 0; i < n; i++) {
    const hasConnections = topGroups[i].imports > 0 || topGroups[i].importedBy > 0;
    if (hasConnections) { matrix[i][i] = Math.max(matrix[i][i], 2); }
  }

  const availableHeight = window.innerHeight - 200;
  const availableWidth = container.clientWidth;
  const size = Math.min(availableWidth, availableHeight, 800);
  const outerRadius = size / 2 - 60;
  const innerRadius = outerRadius - 24;

  const svg = d3.select('#dep-chord').append('svg')
    .attr('width', size).attr('height', size)
    .append('g').attr('transform', 'translate(' + size/2 + ',' + size/2 + ')');

  const chord = d3.chord().padAngle(0.04).sortSubgroups(d3.descending);
  const chords = chord(matrix);
  const arc = d3.arc().innerRadius(innerRadius).outerRadius(outerRadius);
  const ribbon = d3.ribbon().radius(innerRadius - 4);
  const color = d3.scaleOrdinal().domain(topGroups.map((_, i) => i)).range(d3.schemeTableau10);

  const group = svg.append('g').selectAll('g').data(chords.groups).join('g').attr('class', 'chord-group');
  const nodeLookup = new Map();
  for (const node of depGraph.nodes) { nodeLookup.set(node.path, node); }

  group.append('path')
    .attr('class', 'chord-arc')
    .attr('data-path', d => topGroups[d.index].fullPath)
    .attr('data-uri', d => createFileUri(topGroups[d.index].fullPath))
    .attr('d', arc).attr('fill', d => color(d.index)).style('cursor', 'pointer')
    .on('mouseover', (e, d) => {
      const g = topGroups[d.index];
      const node = nodeLookup.get(g.fullPath);
      const html = buildFileTooltip({
        path: g.fullPath,
        imports: g.imports,
        importedBy: g.importedBy,
        showImportsList: !g.isFolder,
        nodeData: node,
        fileCount: g.files.length,
        isFolder: g.isFolder
      });
      showTooltip(html, e);
    })
    .on('mousemove', e => positionTooltip(e))
    .on('mouseout', () => hideTooltip())
    .on('click', (e, d) => { vscode.postMessage({ command: 'openFile', uri: createFileUri(topGroups[d.index].fullPath) }); });

  group.append('text').attr('class', 'chord-label')
    .each(d => { d.angle = (d.startAngle + d.endAngle) / 2; })
    .attr('dy', '0.35em')
    .attr('transform', d => 'rotate(' + (d.angle * 180 / Math.PI - 90) + ')translate(' + (outerRadius + 6) + ')' + (d.angle > Math.PI ? 'rotate(180)' : ''))
    .attr('text-anchor', d => d.angle > Math.PI ? 'end' : null)
    .text(d => { const name = topGroups[d.index].name; return name.length > 15 ? name.slice(0, 12) + '...' : name; });

  const edgeLookup = new Map();
  for (const edge of depGraph.edges) { edgeLookup.set(edge.from + '|' + edge.to, edge); }

  svg.append('g').selectAll('path').data(chords).join('path')
    .attr('class', 'chord-ribbon')
    .attr('data-from', d => topGroups[d.source.index].fullPath)
    .attr('data-to', d => topGroups[d.target.index].fullPath)
    .attr('data-source-uri', d => createFileUri(topGroups[d.source.index].fullPath))
    .attr('data-target-uri', d => createFileUri(topGroups[d.target.index].fullPath))
    .attr('d', ribbon).attr('fill', d => color(d.source.index)).attr('fill-opacity', 0.6).style('cursor', 'pointer')
    .on('mouseover', (e, d) => {
      const fromPath = topGroups[d.source.index].fullPath;
      const edge = edgeLookup.get(fromPath + '|' + topGroups[d.target.index].fullPath);
      const html = buildEdgeTooltip({
        fromName: topGroups[d.source.index].name,
        toName: topGroups[d.target.index].name,
        code: edge ? edge.code : null,
        line: edge ? edge.line : null
      });
      showTooltip(html, e);
    })
    .on('mousemove', e => positionTooltip(e))
    .on('mouseout', () => hideTooltip())
    .on('click', (e, d) => {
      const fromPath = topGroups[d.source.index].fullPath;
      const edge = edgeLookup.get(fromPath + '|' + topGroups[d.target.index].fullPath);
      const uri = edge && edge.line ? createUriFromPathAndLine(fromPath, null, edge.line) : createFileUri(fromPath);
      vscode.postMessage({ command: 'openFile', uri: uri });
    });

  applyPersistentIssueHighlights();
}
`;

// src/webview/highlighting/highlight-core.ts
init_esbuild_shim();
var HIGHLIGHT_CORE_SCRIPT = `
// Core node highlighting functions for treemap and chord diagram

function updateStatusButton() {
  updateStatus();
}

// Pure DOM operation - highlights nodes matching the given URIs or file paths
// lineMap is optional: { filePath: [line1, line2, ...] } for function-level highlighting
function highlightNodes(urisOrPaths, lineMap) {
  // Clear previous highlights and reset inline styles from animation
  document.querySelectorAll('.node.highlighted, .chord-arc.highlighted, .chord-ribbon.highlighted').forEach(el => {
    el.classList.remove('highlighted');
    el.style.removeProperty('fill');
    el.style.removeProperty('fill-opacity');
  });

  if (urisOrPaths.length === 0) return;

  // Build a set of paths for matching (extract from URIs if needed)
  const pathSet = new Set();
  for (const item of urisOrPaths) {
    if (item.startsWith('file://')) {
      pathSet.add(getFilePath(item));
    } else {
      pathSet.add(item);
    }
  }

  lineMap = lineMap || {};

  // Highlight matching nodes (check both data-uri and data-path for compatibility)
  document.querySelectorAll('.node').forEach(node => {
    const uri = node.getAttribute('data-uri');
    const path = node.getAttribute('data-path');
    const collapsedPaths = node.getAttribute('data-collapsed-paths');
    const nodeLine = node.getAttribute('data-line');
    const nodeEndLine = node.getAttribute('data-end-line');

    // For partition-node (function) elements, check line ranges
    if (nodeLine && nodeEndLine && path) {
      const lines = lineMap[path];
      if (lines && lines.length > 0) {
        // Only highlight if an issue line falls within this function's range
        const startLine = parseInt(nodeLine);
        const endLine = parseInt(nodeEndLine);
        const matches = lines.some(l => l >= startLine && l <= endLine);
        if (matches) {
          node.classList.add('highlighted');
        }
        return; // Don't fall through to file-level matching
      }
      // If no line info for this file, don't highlight function nodes
      // (file-level highlighting happens on file nodes, not function nodes)
      return;
    }

    if (uri && urisOrPaths.includes(uri)) {
      node.classList.add('highlighted');
    } else if (path && pathSet.has(path)) {
      node.classList.add('highlighted');
    } else if (collapsedPaths) {
      // "N small items" node - highlight if any collapsed path matches
      const paths = collapsedPaths.split(',');
      for (const p of paths) {
        if (pathSet.has(p)) {
          node.classList.add('highlighted');
          break;
        }
        // Also check if collapsed path is a folder containing highlighted files
        const folderPrefix = p.endsWith('/') ? p : p + '/';
        for (const filePath of pathSet) {
          if (filePath.startsWith(folderPrefix)) {
            node.classList.add('highlighted');
            break;
          }
        }
        if (node.classList.contains('highlighted')) break;
      }
    } else if (path) {
      // Highlight folders that contain highlighted files
      const folderPrefix = path.endsWith('/') ? path : path + '/';
      for (const filePath of pathSet) {
        if (filePath.startsWith(folderPrefix)) {
          node.classList.add('highlighted');
          break;
        }
      }
    }
  });

  // Highlight chord arcs (still using data-path for now)
  document.querySelectorAll('.chord-arc').forEach(arc => {
    const path = arc.getAttribute('data-path');
    if (path && pathSet.has(path)) {
      arc.classList.add('highlighted');
    }
  });

  // Highlight ribbons where source or target matches
  document.querySelectorAll('.chord-ribbon').forEach(ribbon => {
    const from = ribbon.getAttribute('data-from');
    const to = ribbon.getAttribute('data-to');
    if ((from && pathSet.has(from)) || (to && pathSet.has(to))) {
      ribbon.classList.add('highlighted');
    }
  });
}

// Handle AI response highlights (separate from user selection)
function updateHighlights(relevantFiles) {
  // AI responses temporarily override the visual highlight
  // but don't change the selection state
  highlightNodes(relevantFiles);
}
`;

// src/webview/highlighting/prompt-utils.ts
init_esbuild_shim();
var PROMPT_UTILS_SCRIPT = `
// Dynamic prompt generation and rendering for AI analysis

// Track pending prompt token counts
let pendingPrompts = [];
let promptIdCounter = 0;

// Generate context variants for graceful degradation
function getContextVariants(fullContext) {
  const variants = [];

  // 1. Full context (best case)
  variants.push({
    label: null,
    context: fullContext
  });

  // 2. High severity files only - skip if no high severity issues
  const highSevFiles = getHighSeverityFiles(fullContext.files);
  const highSevIssues = fullContext.issues.filter(i =>
    i.severity === 'high' && i.locations.some(l => highSevFiles.includes(l.file))
  );
  if (highSevIssues.length > 0 && highSevFiles.length < fullContext.files.length) {
    variants.push({
      label: ' (high severity only)',
      context: { ...fullContext, files: highSevFiles, issues: highSevIssues }
    });
  }

  // 3. First 5 files
  if (fullContext.files.length > 5) {
    const first5 = fullContext.files.slice(0, 5);
    const first5Issues = fullContext.issues.filter(i =>
      i.locations.some(l => first5.includes(l.file))
    );
    variants.push({
      label: ' (5 files)',
      context: { ...fullContext, files: first5, issues: first5Issues }
    });
  }

  // 4. First 1 file
  if (fullContext.files.length > 1) {
    const first1 = fullContext.files.slice(0, 1);
    const first1Issues = fullContext.issues.filter(i =>
      i.locations.some(l => first1.includes(l.file))
    );
    variants.push({
      label: ' (1 file)',
      context: { ...fullContext, files: first1, issues: first1Issues }
    });
  }

  return variants;
}

function renderDynamicPrompts() {
  const container = document.getElementById('rules');
  const state = selection.getState();
  const navState = nav.getState();
  const { ruleId, focusFiles } = state;
  const zoomedFile = navState.zoomedFile;

  const prompts = [];
  const activeIssues = issues.filter(i => !isIssueIgnored(i));

  if (ruleId && zoomedFile) {
    // Scenario 1: Rule selected + zoomed into file
    const fileName = zoomedFile.split('/').pop();

    prompts.push({
      label: 'Analyze ' + formatRuleId(ruleId) + ' in ' + fileName,
      prompt: 'Analyze the ' + formatRuleId(ruleId).toLowerCase() + ' issues in ' + fileName
    });

    // Other issues in same file
    const otherInFile = activeIssues.filter(i =>
      i.ruleId !== ruleId &&
      i.locations.some(l => l.file === zoomedFile)
    );
    if (otherInFile.length > 0) {
      prompts.push({
        label: 'All issues in ' + fileName,
        prompt: 'Analyze all issues in ' + fileName
      });
    }

    // Same issue in other files
    const sameIssueOtherFiles = activeIssues.filter(i =>
      i.ruleId === ruleId &&
      !i.locations.some(l => l.file === zoomedFile)
    );
    if (sameIssueOtherFiles.length > 0) {
      prompts.push({
        label: 'Selected ' + formatRuleId(ruleId) + ' issues',
        prompt: 'Analyze all ' + formatRuleId(ruleId).toLowerCase() + ' issues in the codebase'
      });
    }

  } else if (ruleId) {
    // Scenario 2: Rule selected, not zoomed
    const ruleIssues = activeIssues.filter(i => i.ruleId === ruleId);
    const highSeverity = ruleIssues.filter(i => i.severity === 'high');

    prompts.push({
      label: 'Analyze ' + ruleIssues.length + ' ' + formatRuleId(ruleId) + ' issues',
      prompt: 'Analyze the ' + formatRuleId(ruleId).toLowerCase() + ' issues and suggest fixes'
    });

    if (highSeverity.length > 0 && highSeverity.length < ruleIssues.length) {
      prompts.push({
        label: 'Focus on ' + highSeverity.length + ' high severity',
        prompt: 'Analyze the ' + formatRuleId(ruleId).toLowerCase() + ' issues and suggest fixes',
        action: 'filter-high-severity'
      });
    }

  } else if (focusFiles.length > 0) {
    // Scenario 3: Files selected via status button but no specific rule
    // No prompts shown - too broad, user should select a specific issue type
  } else {
    // Scenario 4: Nothing selected (initial state)
    // No prompts shown - user should select issues or files first
  }

  // Add "Fix rules" prompt if there are unrecognized rules
  if (ruleResult && ruleResult.newCount > 0) {
    prompts.push({
      label: 'Fix ' + ruleResult.newCount + ' unrecognized rule' + (ruleResult.newCount !== 1 ? 's' : ''),
      prompt: '__FIX_RULES__',  // Special marker handled below
      noContext: true  // Don't need file context for this
    });
  }

  // No prompts to show
  if (prompts.length === 0) {
    const hasIssues = activeIssues.length > 0;
    container.innerHTML = '<span style="color:var(--vscode-descriptionForeground);font-size:0.85em;">' +
      (hasIssues ? 'Select an issue type to analyze' : 'No issues detected') + '</span>';
    return;
  }

  // Separate prompts that need context costing from those that don't
  const contextPrompts = prompts.filter(p => !p.noContext);
  const noContextPrompts = prompts.filter(p => p.noContext);

  // If only no-context prompts, render them immediately
  if (contextPrompts.length === 0) {
    renderNoContextPrompts(noContextPrompts);
    return;
  }

  // Show spinner while costing prompts
  container.innerHTML = '<div class="prompt-loading"><div class="thinking-spinner"></div><span style="font-size:0.8em;opacity:0.7;">Costing prompts...</span></div>';

  // Get preview context (based on current selection) for prompt costing
  const fullContext = selection.getPreviewContext();
  const variants = getContextVariants(fullContext);

  // Assign IDs and create pending prompts for ALL variants of each prompt
  pendingPrompts = [];
  // Store no-context prompts to append after costing
  pendingPrompts.noContextPrompts = noContextPrompts;

  for (const p of contextPrompts) {
    const baseId = 'prompt-' + (++promptIdCounter);
    for (let i = 0; i < variants.length; i++) {
      pendingPrompts.push({
        ...p,
        baseId: baseId,
        variantIndex: i,
        variantLabel: variants[i].label,
        variantContext: variants[i].context,
        id: baseId + '-v' + i,
        tokens: null,
        tooExpensive: false
      });
    }
  }

  // Request token counts for all variants
  for (const p of pendingPrompts) {
    vscode.postMessage({
      command: 'countTokens',
      text: p.prompt,
      context: p.variantContext,
      promptId: p.id
    });
  }
}

// Render prompts that don't need context (like "Fix rules")
function renderNoContextPrompts(prompts) {
  const container = document.getElementById('rules');
  container.innerHTML = prompts.map(p => {
    if (p.prompt === '__FIX_RULES__') {
      return '<button class="rule-btn" data-action="fix-rules">' + p.label + '</button>';
    }
    return '<button class="rule-btn" data-prompt="' + p.prompt.replace(/"/g, '&quot;') + '">' + p.label + '</button>';
  }).join('');

  container.querySelectorAll('.rule-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.getAttribute('data-action') === 'fix-rules') {
        // Clear attached files for fix-rules action
        selection.attachContext([], []);
        promptFixRules();
      } else {
        // Clear attached files for prompts without context
        selection.attachContext([], []);
        const prompt = btn.getAttribute('data-prompt');
        const input = document.getElementById('query');
        input.value = prompt;
        // Resize input to fit content
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 120) + 'px';
        // Update send button state and reposition panel
        document.getElementById('send').classList.add('ready');
        syncAnimations();
        positionAiPanel();
        input.focus();
      }
    });
  });
}

// Called when a token count response comes back
function handleTokenCount(promptId, tokens, limit) {
  const prompt = pendingPrompts.find(p => p.id === promptId);
  if (!prompt) return;

  prompt.tokens = tokens;
  prompt.tooExpensive = tokens > limit;

  // Check if all prompts have been costed
  const allCosted = pendingPrompts.every(p => p.tokens !== null);
  if (allCosted) {
    renderCostdPrompts();
  }
}

// Render prompts after costing - pick best affordable variant for each
function renderCostdPrompts() {
  const container = document.getElementById('rules');

  // Group by base prompt ID
  const byPrompt = {};
  for (const p of pendingPrompts) {
    if (!byPrompt[p.baseId]) byPrompt[p.baseId] = [];
    byPrompt[p.baseId].push(p);
  }

  // For each prompt, find first affordable variant (ordered best\u2192worst)
  const affordablePrompts = [];
  const usedHighSeverityVariant = new Set(); // Track which rules used high severity degradation

  for (const variants of Object.values(byPrompt)) {
    variants.sort((a, b) => a.variantIndex - b.variantIndex);
    const affordable = variants.find(v => !v.tooExpensive);
    if (affordable) {
      // Build display label based on variant
      let displayLabel = affordable.label;
      // Get original issue count from full variant (variantIndex=0)
      const fullVariant = variants.find(v => v.variantIndex === 0);
      const totalIssues = fullVariant ? fullVariant.variantContext.issues.length : affordable.variantContext.issues.length;

      if (affordable.variantLabel) {
        // If degraded to high severity, update the issue count in label
        if (affordable.variantLabel.includes('high severity')) {
          const highSevIssueCount = affordable.variantContext.issues.length;
          // Replace the count in the label with high severity count
          // "Analyze 175 Long Function issues" \u2192 "Analyze 14 high severity Long Function issues"
          displayLabel = displayLabel.replace(/\\d+/, highSevIssueCount + ' high severity');
          usedHighSeverityVariant.add(affordable.baseId);
        } else if (affordable.variantLabel.includes('file')) {
          // For file-limited variants (5 files, 1 file), show "Analyze the first X files"
          const fileCount = affordable.variantContext.files.length;
          displayLabel = 'Analyze the first ' + fileCount + ' file' + (fileCount === 1 ? '' : 's');
        }
      }
      // Track total issues for "(X of Y)" chip display

      // Skip "Focus on high severity" buttons if we already degraded another prompt to high severity
      if (affordable.action === 'filter-high-severity') {
        continue; // Degradation handles this, don't show duplicate
      }

      affordablePrompts.push({
        ...affordable,
        displayLabel: displayLabel,
        totalIssues: totalIssues,
        isFileLimited: affordable.variantLabel && affordable.variantLabel.includes('file')
      });
    }
  }

  // Get no-context prompts that were stored
  const noContextPrompts = pendingPrompts.noContextPrompts || [];

  if (affordablePrompts.length === 0 && noContextPrompts.length === 0) {
    container.innerHTML = '<span style="color:var(--vscode-descriptionForeground);font-size:0.85em;">Context too large for prompts</span>';
    return;
  }

  // Build HTML for context prompts
  let html = affordablePrompts.map(p => {
    const fileCount = p.variantContext.files.length;
    // For file-limited variants, show "(X of Y)" where X=files, Y=total issues
    const fileLabel = p.isFileLimited
      ? fileCount + ' of ' + p.totalIssues
      : (fileCount === 1 ? '1 file' : fileCount + ' files');
    return '<button class="rule-btn" data-prompt="' + p.prompt.replace(/"/g, '&quot;') + '"' +
      ' data-prompt-id="' + p.id + '"' +
      ' data-variant-files="' + encodeURIComponent(JSON.stringify(p.variantContext.files)) + '"' +
      ' data-variant-issues="' + encodeURIComponent(JSON.stringify(p.variantContext.issues)) + '"' +
      '>' + p.displayLabel + ' <span class="file-count">(' + fileLabel + ')</span></button>';
  }).join('');

  // Append no-context prompts (like "Fix rules")
  html += noContextPrompts.map(p => {
    if (p.prompt === '__FIX_RULES__') {
      return '<button class="rule-btn" data-action="fix-rules">' + p.label + '</button>';
    }
    return '<button class="rule-btn" data-prompt="' + p.prompt.replace(/"/g, '&quot;') + '">' + p.label + '</button>';
  }).join('');

  container.innerHTML = html;

  container.querySelectorAll('.rule-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      // Handle special actions
      if (btn.getAttribute('data-action') === 'fix-rules') {
        // Clear attached files for fix-rules action
        selection.attachContext([], []);
        promptFixRules();
        return;
      }

      // Attach context files and issues (commits them for sending)
      const variantFilesData = btn.getAttribute('data-variant-files');
      const variantIssuesData = btn.getAttribute('data-variant-issues');
      if (variantFilesData) {
        const variantFiles = JSON.parse(decodeURIComponent(variantFilesData));
        const variantIssues = variantIssuesData ? JSON.parse(decodeURIComponent(variantIssuesData)) : [];
        selection.attachContext(variantFiles, variantIssues);
      } else {
        // Clear attached files if no variant data
        selection.attachContext([], []);
      }

      const prompt = btn.getAttribute('data-prompt');
      const input = document.getElementById('query');
      input.value = prompt;
      // Resize input to fit content
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
      // Update send button state and reposition panel
      document.getElementById('send').classList.add('ready');
      syncAnimations();
      positionAiPanel();
      input.focus();
    });
  });
}
`;

// src/webview/issue-config.ts
init_esbuild_shim();
var ISSUE_CONFIG_SCRIPT = `
// Issue view mapping - determines which view to show for each rule
const ISSUE_VIEW_MAP = {
  // Functions treemap
  'long-function': 'functions',
  'deep-nesting': 'functions',
  'too-many-parameters': 'functions',
  'silent-failure': 'functions',
  'generic-name': 'functions',
  'non-verb-function': 'functions',
  'non-question-boolean': 'functions',
  'magic-number': 'functions',
  'commented-code': 'functions',
  // Files treemap
  'long-file': 'files',
  'orphan-file': 'files',
  'mixed-concerns': 'files',
  'high-comment-density': 'files',
  // Chord diagram
  'circular-dependency': 'chord',
  'hub-file': 'chord',
};

// File-level rule IDs (shown on Files treemap)
const FILE_RULES = new Set(['long-file', 'mixed-concerns', 'orphan-file', 'high-comment-density']);

// Architecture rule IDs (graph-level, shown on Chord diagram)
const ARCHITECTURE_RULES = new Set(['circular-dependency', 'hub-file']);
`;

// src/webview/anti-pattern-panel.ts
init_esbuild_shim();
var ANTI_PATTERN_PANEL_SCRIPT = `
// Anti-pattern panel - displays code issues grouped by rule
const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 };

function formatRuleId(ruleId) {
  return ruleId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function getExpandedState() {
  const state = { groups: new Set(), ignored: false, categories: new Set() };
  document.querySelectorAll('.pattern-group').forEach(group => {
    if (group.querySelector('.pattern-items.expanded')) {
      state.groups.add(group.getAttribute('data-type'));
    }
  });
  document.querySelectorAll('.issue-category').forEach(cat => {
    if (cat.querySelector('.issue-category-items.expanded')) {
      state.categories.add(cat.getAttribute('data-category'));
    }
  });
  const ignoredItems = document.querySelector('.ignored-items');
  if (ignoredItems && ignoredItems.classList.contains('expanded')) {
    state.ignored = true;
  }
  return state;
}

function restoreExpandedState(state) {
  document.querySelectorAll('.pattern-group').forEach(group => {
    const type = group.getAttribute('data-type');
    if (state.groups.has(type)) {
      group.querySelector('.pattern-chevron').classList.add('expanded');
      group.querySelector('.pattern-items').classList.add('expanded');
    }
  });
  document.querySelectorAll('.issue-category').forEach(cat => {
    const category = cat.getAttribute('data-category');
    if (state.categories.has(category)) {
      cat.querySelector('.issue-category-chevron').classList.add('expanded');
      cat.querySelector('.issue-category-items').classList.add('expanded');
    }
  });
  if (state.ignored) {
    const ignoredHeader = document.querySelector('.ignored-header');
    if (ignoredHeader) {
      ignoredHeader.querySelector('.pattern-chevron').classList.add('expanded');
      ignoredHeader.nextElementSibling.classList.add('expanded');
    }
  }
}

function switchToView(ruleId) {
  const view = ISSUE_VIEW_MAP[ruleId] || 'files';
  const viewMap = { functions: 'functions', chord: 'deps', files: 'files' };
  nav.goTo({ view: viewMap[view] || 'files', uri: null });
}

function groupIssuesByRule(activeIssues) {
  const groups = new Map();
  for (const issue of activeIssues) {
    if (!groups.has(issue.ruleId)) {
      groups.set(issue.ruleId, { ruleId: issue.ruleId, items: [] });
    }
    groups.get(issue.ruleId).items.push(issue);
  }

  for (const group of groups.values()) {
    group.items.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
    group.severity = group.items.length > 0 ? group.items[0].severity : 'low';
  }

  return [...groups.values()].sort((a, b) =>
    SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
    b.items.length - a.items.length ||
    a.ruleId.localeCompare(b.ruleId)
  );
}

function categorizeGroups(sortedGroups) {
  return {
    code: sortedGroups.filter(g => !FILE_RULES.has(g.ruleId) && !ARCHITECTURE_RULES.has(g.ruleId)),
    file: sortedGroups.filter(g => FILE_RULES.has(g.ruleId)),
    arch: sortedGroups.filter(g => ARCHITECTURE_RULES.has(g.ruleId))
  };
}

function renderItemHtml(item) {
  const filesData = item.locations.map(loc => loc.file).join(',');
  const firstLoc = item.locations[0];
  const fileName = firstLoc.file.split('/').pop();
  const lineInfo = firstLoc.line ? ':' + firstLoc.line : '';

  return '<div class="pattern-item ' + item.severity + '" data-files="' + filesData + '" data-line="' + (firstLoc.line || '') + '" data-rule-id="' + item.ruleId + '" data-message="' + item.message.replace(/"/g, '&quot;') + '">' +
    '<div class="pattern-item-row"><div class="pattern-item-content">' +
    '<div class="pattern-item-file">' + fileName + lineInfo + '</div>' +
    '<div class="pattern-item-desc">' + item.message + '</div></div>' +
    '<button class="pattern-ignore-btn" title="Ignore this item"><svg viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8"/></svg></button></div></div>';
}

function renderGroupHtml(group, gIdx) {
  const allFiles = group.items.flatMap(item => item.locations.map(loc => loc.file));
  const itemsHtml = group.items.map(renderItemHtml).join('');

  return '<div class="pattern-group" data-group="' + gIdx + '" data-type="' + group.ruleId + '">' +
    '<div class="pattern-header ' + group.severity + '" data-files="' + allFiles.join(',') + '" data-type="' + group.ruleId + '">' +
    '<span class="pattern-chevron"><svg viewBox="0 0 16 16"><path d="M6 4l4 4-4 4"/></svg></span>' +
    '<span class="pattern-title">' + formatRuleId(group.ruleId) + '</span>' +
    '<span class="pattern-count">' + group.items.length + '</span>' +
    '</div>' +
    '<div class="pattern-items">' + itemsHtml + '</div></div>';
}

function renderCategoryHtml(category, label, groups) {
  if (groups.length === 0) return '';
  const count = groups.reduce((sum, g) => sum + g.items.length, 0);
  const groupsHtml = groups.map((g, i) => renderGroupHtml(g, i)).join('');
  return '<div class="issue-category" data-category="' + category + '">' +
    '<div class="issue-category-header"><span class="issue-category-chevron expanded">\u25B6</span>' + label + ' (' + count + ')</div>' +
    '<div class="issue-category-items expanded">' + groupsHtml + '</div></div>';
}

function renderIgnoredHtml() {
  if (ignoredIssues.length === 0) return '';
  const itemsHtml = ignoredIssues.map((item, idx) => {
    const firstLoc = item.locations[0];
    const fileName = firstLoc.file.split('/').pop();
    const lineInfo = firstLoc.line ? ':' + firstLoc.line : '';
    return '<div class="ignored-item" data-idx="' + idx + '"><span>' + formatRuleId(item.ruleId) + ': ' + fileName + lineInfo + '</span>' +
      '<button class="ignored-item-restore" title="Restore this item">restore</button></div>';
  }).join('');
  return '<div class="ignored-section"><div class="ignored-header"><span class="pattern-chevron"><svg viewBox="0 0 16 16"><path d="M6 4l4 4-4 4"/></svg></span>' +
    '<span>Ignored items (' + ignoredIssues.length + ')</span></div><div class="ignored-items">' + itemsHtml + '</div></div>';
}

function renderIssues() {
  const list = document.getElementById('anti-pattern-list');
  const activeIssues = issues.filter(issue => !isIssueIgnored(issue));

  if (activeIssues.length === 0 && ignoredIssues.length === 0) {
    // If no coding-standards.md, show nothing (Create button is in status bar)
    // If file exists but no issues, show "No issues detected"
    list.innerHTML = codingStandardsExists
      ? '<div style="color:var(--vscode-descriptionForeground);font-size:0.85em;padding:8px;">No issues detected</div>'
      : '';
    return;
  }

  buildIssueFileMap();

  const sortedGroups = groupIssuesByRule(activeIssues);
  const categories = categorizeGroups(sortedGroups);

  list.innerHTML =
    renderCategoryHtml('code', 'Code Issues', categories.code) +
    renderCategoryHtml('file', 'File Issues', categories.file) +
    renderCategoryHtml('architecture', 'Architecture Issues', categories.arch) +
    renderIgnoredHtml();

  setupCategoryHandlers(list);
  setupChevronHandlers(list);
  setupHeaderHandlers(list);
  setupItemHandlers(list);
  setupIgnoreHandlers(list);
  setupIgnoredSectionHandlers(list);
  setupRestoreHandlers(list);
}
`;

// src/webview/panels/anti-pattern-handlers.ts
init_esbuild_shim();
var ANTI_PATTERN_HANDLERS_SCRIPT = `
// Event handlers for anti-pattern panel interactions

function setupCategoryHandlers(list) {
  list.querySelectorAll('.issue-category-header').forEach(header => {
    header.addEventListener('click', () => {
      header.querySelector('.issue-category-chevron').classList.toggle('expanded');
      header.nextElementSibling.classList.toggle('expanded');
    });
  });
}

function setupChevronHandlers(list) {
  list.querySelectorAll('.pattern-header .pattern-chevron').forEach(chevron => {
    const group = chevron.closest('.pattern-group');
    const items = group.querySelector('.pattern-items');
    chevron.addEventListener('click', (e) => {
      e.stopPropagation();
      chevron.classList.toggle('expanded');
      items.classList.toggle('expanded');
    });
  });
}

function setupHeaderHandlers(list) {
  list.querySelectorAll('.pattern-header').forEach(header => {
    const ruleId = header.getAttribute('data-type');
    header.addEventListener('click', (e) => {
      if (e.target.closest('.pattern-chevron')) return;
      if (e.target.classList.contains('pattern-rules-toggle')) return;
      if (selectedElement) {
        selectedElement.style.background = '';
      }
      selectedElement = header;
      // Select this rule - computes affected files and highlights them
      selection.selectRule(ruleId);
      switchToView(ruleId);
    });
  });
}

function setupRulesToggleHandlers(list) {
  list.querySelectorAll('.pattern-rules-toggle').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const header = btn.closest('.pattern-header');
      const ruleId = header.getAttribute('data-type');
      const isActive = btn.classList.contains('active');
      if (isActive) {
        activeRules.delete(ruleId);
        btn.classList.remove('active');
        btn.textContent = '+ rule';
        btn.title = 'Add to CLAUDE.md rules';
        vscode.postMessage({ command: 'removeRule', patternType: ruleId });
      } else {
        activeRules.add(ruleId);
        btn.classList.add('active');
        btn.textContent = '- rule';
        btn.title = 'Remove from CLAUDE.md rules';
        vscode.postMessage({ command: 'addRule', patternType: ruleId });
      }
    });
  });
}

function setupItemHandlers(list) {
  list.querySelectorAll('.pattern-item').forEach(item => {
    const files = item.getAttribute('data-files').split(',').filter(f => f);
    const line = item.getAttribute('data-line');
    const ruleId = item.getAttribute('data-rule-id');
    item.addEventListener('click', (e) => {
      if (e.target.closest('.pattern-ignore-btn')) return;
      e.stopPropagation();
      // Clear previous selection styling
      if (selectedElement) {
        selectedElement.style.background = '';
      }
      selectedElement = item;
      selection.selectRule(ruleId);
      // Build lineMap for function-level highlighting
      const lineMap = {};
      if (line && files.length > 0) {
        lineMap[files[0]] = [parseInt(line)];
      }
      selection.setFocus(files, lineMap);
      switchToView(ruleId);
    });
  });
}

function captureGroupPositions() {
  const positions = new Map();
  document.querySelectorAll('.pattern-group').forEach(group => {
    const type = group.getAttribute('data-type');
    const rect = group.getBoundingClientRect();
    positions.set(type, { top: rect.top, left: rect.left });
  });
  return positions;
}

function applyFlipAnimation(oldPositions) {
  const groups = document.querySelectorAll('.pattern-group');
  groups.forEach(group => {
    const type = group.getAttribute('data-type');
    const oldPos = oldPositions.get(type);
    if (!oldPos) {
      group.style.opacity = '0';
      group.style.transform = 'translateY(-10px)';
      requestAnimationFrame(() => {
        group.style.transition = 'opacity 0.2s, transform 0.2s';
        group.style.opacity = '1';
        group.style.transform = '';
      });
      return;
    }
    const newRect = group.getBoundingClientRect();
    const deltaY = oldPos.top - newRect.top;
    if (Math.abs(deltaY) > 1) {
      group.style.transform = 'translateY(' + deltaY + 'px)';
      requestAnimationFrame(() => {
        group.style.transition = 'transform 0.25s ease-out';
        group.style.transform = '';
      });
    }
  });
  setTimeout(() => {
    groups.forEach(group => {
      group.style.transition = '';
    });
  }, 300);
}

function refreshAfterChange(selectedType) {
  const expandedState = getExpandedState();
  const oldPositions = captureGroupPositions();
  renderIssues();
  applyFlipAnimation(oldPositions);
  restoreExpandedState(expandedState);
  buildIssueFileMap();
  applyPersistentIssueHighlights();
  updateStatusButton();
  renderFooterStats();

  if (selectedType) {
    const newHeader = document.querySelector('.pattern-header[data-type="' + selectedType + '"]');
    if (newHeader) selectedElement = newHeader;
  }

  // Reapply current selection highlights
  selection._applyHighlights();
}

function setupIgnoreHandlers(list) {
  list.querySelectorAll('.pattern-ignore-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const item = btn.closest('.pattern-item');
      const ruleId = item.getAttribute('data-rule-id');
      const message = item.getAttribute('data-message');
      const filesStr = item.getAttribute('data-files');
      const line = item.getAttribute('data-line');

      const issueToIgnore = issues.find(i =>
        i.ruleId === ruleId && i.message === message &&
        i.locations.map(l => l.file).join(',') === filesStr &&
        (i.locations[0]?.line?.toString() || '') === line
      );
      if (issueToIgnore && !isIssueIgnored(issueToIgnore)) ignoredIssues.push(issueToIgnore);

      const selectedType = selectedElement && selectedElement.classList.contains('pattern-header')
        ? selectedElement.getAttribute('data-type') : null;
      refreshAfterChange(selectedType);
    });
  });
}

function setupIgnoredSectionHandlers(list) {
  const ignoredHeader = list.querySelector('.ignored-header');
  if (ignoredHeader) {
    ignoredHeader.addEventListener('click', () => {
      ignoredHeader.querySelector('.pattern-chevron').classList.toggle('expanded');
      ignoredHeader.nextElementSibling.classList.toggle('expanded');
    });
  }
}

function setupRestoreHandlers(list) {
  list.querySelectorAll('.ignored-item-restore').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const item = btn.closest('.ignored-item');
      const idx = parseInt(item.getAttribute('data-idx'));
      const restoredRuleId = ignoredIssues[idx].ruleId;

      const selectedType = selectedElement && selectedElement.classList.contains('pattern-header')
        ? selectedElement.getAttribute('data-type') : null;

      ignoredIssues.splice(idx, 1);

      const expandedState = getExpandedState();
      renderIssues();
      restoreExpandedState(expandedState);
      buildIssueFileMap();
      applyPersistentIssueHighlights();
      updateStatusButton();
      renderFooterStats();

      if (selectedType && selectedType !== restoredRuleId) {
        const newHeader = document.querySelector('.pattern-header[data-type="' + selectedType + '"]');
        if (newHeader) selectedElement = newHeader;
      }

      // If the restored rule was selected, reselect it to update affected files
      if (selectedType === restoredRuleId) {
        selection.selectRule(restoredRuleId);
        const newHeader = document.querySelector('.pattern-header[data-type="' + restoredRuleId + '"]');
        if (newHeader) {
          selectedElement = newHeader;
        }
      } else {
        // Reapply current selection highlights
        selection._applyHighlights();
      }
    });
  });
}
`;

// src/webview/file-issues-panel.ts
init_esbuild_shim();
var FILE_ISSUES_PANEL_SCRIPT = `
// Unified ignored issues array
let ignoredIssues = [];

function isIssueIgnored(issue) {
  return ignoredIssues.some(ignored =>
    ignored.ruleId === issue.ruleId &&
    ignored.message === issue.message &&
    JSON.stringify(ignored.locations) === JSON.stringify(issue.locations)
  );
}

function getActiveIssueCount() {
  return issues.filter(i => !isIssueIgnored(i)).length;
}
`;

// src/webview/chat-panel.ts
init_esbuild_shim();
var CHAT_PANEL_SCRIPT = `
// AI Chat panel - shown when input is focused
const aiPanel = document.getElementById('ai-panel');
const queryInput = document.getElementById('query');
const chatMessages = document.getElementById('chat-messages');
let aiInputFocused = false;

function showAiPanel() {
  repositionPanel();
  aiPanel.classList.add('visible');
}

function hideAiPanel() {
  // Hide panel (soft dismiss) - conversation is preserved
  if (!aiInputFocused) {
    aiPanel.classList.remove('visible');
  }
}

function isAiInputFocused() {
  return aiInputFocused;
}

// Auto-resize textarea and reposition panel
function autoResizeInput() {
  queryInput.style.height = 'auto';
  queryInput.style.height = Math.min(queryInput.scrollHeight, 120) + 'px';
  repositionPanel();
}

function repositionPanel() {
  const inputContainer = document.querySelector('.footer-input-container');
  if (inputContainer && aiPanel) {
    const rect = inputContainer.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    // Position panel above the input container (4px gap)
    aiPanel.style.bottom = (viewportHeight - rect.top + 4) + 'px';
  }
}

queryInput.addEventListener('focus', () => {
  aiInputFocused = true;
  showAiPanel();
});

queryInput.addEventListener('blur', () => {
  aiInputFocused = false;
});

queryInput.addEventListener('input', autoResizeInput);

// Close panel when clicking outside chat components
document.addEventListener('mousedown', (e) => {
  const inputContainer = document.querySelector('.footer-input-container');
  const panel = document.getElementById('ai-panel');
  // If clicking outside input container and panel, soft dismiss (hide but preserve conversation)
  if (!inputContainer.contains(e.target) && !panel.contains(e.target)) {
    setTimeout(() => hideAiPanel(), 10);
  }
});

// Close with Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && aiPanel.classList.contains('visible')) {
    queryInput.blur();
    setTimeout(() => hideAiPanel(), 10);
  }
});
`;

// src/webview/event-handlers.ts
init_esbuild_shim();
var EVENT_HANDLERS_SCRIPT = `
// UI event handlers and initialization

// Helper: get issues for a list of files
function getIssuesForFiles(filePaths) {
  return issues.filter(i =>
    i.locations.some(loc => filePaths.includes(loc.file))
  );
}

// Helper: get unique rule types from highlighted files
function getActiveRuleTypes(filePaths) {
  const issuesForFiles = getIssuesForFiles(filePaths);
  return new Set(issuesForFiles.map(i => i.ruleId));
}

function showView(view) {
  // Map view names to nav view names
  const viewMap = { treemap: 'files', files: 'files', chord: 'deps', deps: 'deps', functions: 'functions' };
  const navView = viewMap[view] || 'files';
  nav.goTo({ view: navView });
}

document.getElementById('depth-slider').addEventListener('input', (e) => {
  document.getElementById('depth-value').textContent = e.target.value;
  if (depGraph) {
    renderDepGraph();
  }
});

document.getElementById('sort-mode').addEventListener('change', () => {
  if (depGraph) {
    renderDepGraph();
  }
});

document.getElementById('show-orphans').addEventListener('change', () => {
  if (depGraph) {
    renderDepGraph();
  }
});

// Initialize with files treemap view (default state)
colorMode = 'none';

// Sync color cycling animations to same phase by restarting them
function syncAnimations() {
  const delay = -(Date.now() % 3000) + 'ms';
  document.querySelectorAll('.footer-input-container, .ai-send-btn.ready, .context-bar').forEach(el => {
    // Stop animation, force reflow, restart with synced delay
    el.style.animation = 'none';
    el.offsetHeight; // Force reflow
    el.style.animation = ''; // Clear inline style to restore CSS animation
    el.style.animationDelay = delay;
  });
}
syncAnimations();

// Initialize navigation to files view
nav.goTo({ view: 'files', file: null });
renderDynamicPrompts();
renderIssues();
renderFooterStats();
updateStatus();

// Trigger dependency analysis to detect architecture issues
vscode.postMessage({ command: 'getDependencies' });

// Collect all files with issues
function getAllIssueFiles() {
  const fileSet = new Set();
  const activeIssues = issues.filter(i => !isIssueIgnored(i));
  for (const issue of activeIssues) {
    for (const loc of issue.locations) {
      fileSet.add(loc.file);
    }
  }
  return [...fileSet];
}

function updateStatus() {
  const warningContainer = document.getElementById('rules-warning-container');
  const headerEdit = document.getElementById('header-edit-btn');

  // Render warning for unrecognized rules
  if (warningContainer) {
    if (!codingStandardsExists) {
      warningContainer.innerHTML = '<button class="rules-create-btn" onclick="createCodingStandards()">' +
        '<span class="rules-create-text">No coding-standards.md</span>' +
        '<span class="rules-create-action">Create</span>' +
        '</button>';
    } else if (ruleResult.newCount > 0) {
      warningContainer.innerHTML = '<button class="rules-warning" onclick="promptFixRules()">' +
        '<span class="rules-warning-icon">&#9888;</span>' +
        '<span>' + ruleResult.newCount + ' unrecognized rule' + (ruleResult.newCount !== 1 ? 's' : '') + '</span>' +
        '</button>';
    } else {
      warningContainer.innerHTML = '';
    }
  }

  // Show/hide Edit button in header
  if (headerEdit) {
    headerEdit.style.display = codingStandardsExists ? 'block' : 'none';
  }
}

function editCodingStandards() {
  vscode.postMessage({ command: 'editCodingStandards' });
}

function createCodingStandards() {
  vscode.postMessage({ command: 'createCodingStandards' });
}

function promptFixRules() {
  const newRules = ruleResult.rules.filter(r => r.status === 'new');
  if (newRules.length === 0) return;

  // Build prompt with the unrecognized rules
  const rulesList = newRules.map(r => '- ' + r.rawText).join('\\n');
  const prompt = 'Help me fix these unrecognized rules in coding-standards.md:\\n\\n' + rulesList +
    '\\n\\nFor each rule, tell me if it\\'s a typo, something you could help implement, too complex for automation, or should be removed.';

  // Populate input and focus
  const input = document.getElementById('query');
  input.value = prompt;

  // Auto-resize textarea to fit content
  input.style.height = 'auto';
  input.style.height = Math.min(input.scrollHeight, 120) + 'px';

  // Mark send button as ready
  document.getElementById('send').classList.add('ready');
  syncAnimations();

  input.focus();

  // Show AI panel (positions before making visible to prevent flash)
  showAiPanel();
}

function renderFooterStats() {
  const container = document.getElementById('footer-stats');
  if (!container) return;

  const totalFiles = files.length;
  const totalFunctions = files.reduce((sum, f) => sum + (f.functions ? f.functions.length : 0), 0);
  const totalLoc = files.reduce((sum, f) => sum + (f.loc || 0), 0);

  let html = totalFiles.toLocaleString() + ' files \xB7 ' + totalFunctions.toLocaleString() + ' functions \xB7 ' + totalLoc.toLocaleString() + ' LOC';

  // Add rules count if coding-standards exists
  if (codingStandardsExists && ruleResult.activeCount > 0) {
    html += ' \xB7 ' + ruleResult.activeCount + ' rules';
    if (ruleResult.unsupportedCount > 0) {
      html += ' <span class="footer-rules-unsupported">(' + ruleResult.unsupportedCount + ' unsupported)</span>';
    }
  }

  // Show chars/token ratio if calibrated
  if (window.charsPerToken) {
    html += ' \xB7 ' + window.charsPerToken.toFixed(2) + ' chars/tok';
  }

  container.innerHTML = html;
}
`;

// src/webview/interactions/message-handlers.ts
init_esbuild_shim();
var MESSAGE_HANDLERS_SCRIPT = `
// Message handlers for AI interaction and extension communication

document.getElementById('send').addEventListener('click', () => {
  const input = document.getElementById('query');
  const text = input.value.trim();
  if (!text) return;
  document.getElementById('send').disabled = true;
  document.getElementById('send').classList.remove('ready');
  input.value = '';
  input.style.height = 'auto';  // Reset to single line

  // Get context from selection state
  const context = selection.getAIContext();
  const chatMessages = document.getElementById('chat-messages');
  const panel = document.getElementById('ai-panel');

  // Show panel (positions before making visible to prevent flash)
  showAiPanel();

  // Render thinking bubble (prompt preview will be inserted before this)
  const thinkingMsg = document.createElement('div');
  thinkingMsg.className = 'ai-message thinking';
  thinkingMsg.id = 'thinking-bubble';
  thinkingMsg.innerHTML = '<div class="thinking-spinner"></div><span>Analyzing...</span><button class="thinking-abort" title="Cancel">\xD7</button>';
  chatMessages.appendChild(thinkingMsg);

  // Handle abort click
  thinkingMsg.querySelector('.thinking-abort').addEventListener('click', () => {
    // Send abort message to extension
    vscode.postMessage({ command: 'abortQuery' });
    // Remove thinking bubble and prompt preview
    const promptPreview = chatMessages.querySelector('.user-message.debug');
    if (promptPreview) promptPreview.remove();
    thinkingMsg.remove();
    document.getElementById('send').disabled = false;
    document.getElementById('rules').style.display = '';
  });

  // Scroll to bottom
  chatMessages.scrollTop = chatMessages.scrollHeight;

  // Hide prompts, will show action buttons after response
  document.getElementById('rules').style.display = 'none';

  vscode.postMessage({ command: 'query', text, context });
});

document.getElementById('query').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    document.getElementById('send').click();
  }
});

// Position AI panel above the input container (synchronous for initial positioning)
function positionAiPanel() {
  const panel = document.getElementById('ai-panel');
  const container = document.querySelector('.footer-input-container');
  if (!panel || !container) return;

  const containerRect = container.getBoundingClientRect();
  // Account for container's 8px padding, position 4px above content
  panel.style.bottom = (window.innerHeight - containerRect.top - 4) + 'px';
}

// Show AI panel - position first, then make visible
function showAiPanel() {
  const panel = document.getElementById('ai-panel');
  if (!panel) return;

  // Position before showing to prevent flash
  positionAiPanel();
  panel.classList.add('visible');
}

// Auto-resize textarea, reposition AI panel, and update send button state
document.getElementById('query').addEventListener('input', (e) => {
  const textarea = e.target;
  textarea.style.height = 'auto';
  textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  positionAiPanel();

  // Toggle send button ready state based on content
  const sendBtn = document.getElementById('send');
  if (textarea.value.trim()) {
    sendBtn.classList.add('ready');
    syncAnimations();
  } else {
    sendBtn.classList.remove('ready');
  }
});

// Reposition panel on window resize and focus
window.addEventListener('resize', positionAiPanel);
window.addEventListener('focus', positionAiPanel);

window.addEventListener('message', event => {
  const msg = event.data;
  if (msg.type === 'thinking') {
    // Thinking is now handled inline in send handler
  } else if (msg.type === 'promptPreview') {
    // Show the actual prompt being sent to the API
    const chatMessages = document.getElementById('chat-messages');
    const thinkingBubble = document.getElementById('thinking-bubble');

    // Estimate tokens using calibrated ratio
    const promptChars = msg.prompt.length;
    const ratio = window.charsPerToken || 2.5;
    const estimatedTokens = Math.ceil(promptChars / ratio);

    const promptMsg = document.createElement('div');
    promptMsg.className = 'user-message debug';
    promptMsg.innerHTML = '<pre style="margin:0;font-size:0.7em;white-space:pre-wrap;word-break:break-all;color:#ccc;">' +
      msg.prompt.replace(/</g, '&lt;').replace(/>/g, '&gt;') +
      '</pre>' +
      '<div class="prompt-estimate">~' + estimatedTokens.toLocaleString() + ' tokens (' + promptChars.toLocaleString() + ' chars)</div>';

    // Insert before thinking bubble
    if (thinkingBubble) {
      chatMessages.insertBefore(promptMsg, thinkingBubble);
    } else {
      chatMessages.appendChild(promptMsg);
    }
    chatMessages.scrollTop = chatMessages.scrollHeight;
  } else if (msg.type === 'response') {
    document.getElementById('send').disabled = false;
    const chatMessages = document.getElementById('chat-messages');

    // Remove thinking bubble
    const thinkingBubble = document.getElementById('thinking-bubble');
    if (thinkingBubble) thinkingBubble.remove();

    // Add AI response bubble
    const aiMsg = document.createElement('div');
    aiMsg.className = 'ai-message';

    // Check if response is an error
    const isError = msg.message && (msg.message.startsWith('Error:') || msg.error);
    if (isError) {
      aiMsg.classList.add('error');
      // Extract friendly message from error
      if (msg.message.includes('rate_limit')) {
        aiMsg.textContent = 'Rate limit reached. Please wait a moment and try again.';
      } else if (msg.message.includes('authentication') || msg.message.includes('401')) {
        aiMsg.textContent = 'API key issue. Check your configuration.';
      } else {
        aiMsg.textContent = 'Something went wrong. Please try again.';
      }
    } else {
      aiMsg.textContent = msg.message;
    }

    // Add token usage display
    if (msg.usage) {
      const usageEl = document.createElement('div');
      usageEl.className = 'ai-usage';
      usageEl.textContent = msg.usage.inputTokens.toLocaleString() + ' in \\u00b7 ' +
                            msg.usage.outputTokens.toLocaleString() + ' out';
      aiMsg.appendChild(usageEl);
    }

    chatMessages.appendChild(aiMsg);

    // Scroll to show top of AI message so user can read from beginning
    aiMsg.scrollIntoView({ block: 'start', behavior: 'smooth' });

    // Show action buttons instead of prompts
    const chatActions = document.getElementById('chat-actions');
    chatActions.innerHTML = '<div class="action-btns">' +
      '<button class="action-btn" id="copy-response">Copy response</button>' +
      '<button class="action-btn" id="clear-chat">Clear</button>' +
      '</div>';

    document.getElementById('copy-response').addEventListener('click', () => {
      navigator.clipboard.writeText(msg.message);
    });

    document.getElementById('clear-chat').addEventListener('click', () => {
      chatMessages.innerHTML = '';
      chatActions.innerHTML = '<div id="rules" class="rules"></div>';
      renderDynamicPrompts();
      selection.clear();
    });

    updateHighlights(msg.relevantFiles || []);

    // Update context bar with actual usage (only show when >0%)
    if (msg.usage) {
      const pct = Math.min(100, Math.round((msg.usage.totalTokens / msg.usage.contextLimit) * 100));
      const barFill = document.getElementById('context-bar-fill');
      const pctLabel = document.getElementById('context-pct');
      const chatFooter = document.querySelector('.chat-footer');
      if (pct > 0) {
        if (barFill) {
          barFill.style.width = pct + '%';
          barFill.parentElement.title = msg.usage.totalTokens.toLocaleString() + ' / ' + msg.usage.contextLimit.toLocaleString() + ' tokens';
        }
        if (pctLabel) {
          pctLabel.textContent = pct + '% used';
        }
        if (chatFooter) {
          chatFooter.classList.add('visible');
          syncAnimations();
        }
      } else {
        if (chatFooter) {
          chatFooter.classList.remove('visible');
        }
      }
    }
  } else if (msg.type === 'dependencyGraph') {
    depGraph = msg.graph;
    // Merge architecture issues from graph into issues array (only circular-dependency and hub-file)
    if (msg.graph.issues && msg.graph.issues.length > 0) {
      for (const issue of msg.graph.issues) {
        // Only add circular-dependency and hub-file from dependency graph
        // (orphan-file is already detected by scanner)
        if (issue.ruleId !== 'circular-dependency' && issue.ruleId !== 'hub-file') continue;

        const exists = issues.some(i =>
          i.ruleId === issue.ruleId &&
          i.message === issue.message &&
          JSON.stringify(i.locations) === JSON.stringify(issue.locations)
        );
        if (!exists) {
          issues.push(issue);
        }
      }
    }
    // Only render dep graph if on deps view
    if (currentView === 'deps') {
      renderDepGraph();
      applyPersistentIssueHighlights();
      selection._applyHighlights();
    }
    // Always re-render issues to show architecture issues in sidebar
    renderIssues();
    updateStatus();
  } else if (msg.type === 'dependencyError') {
    console.error('Dependency analysis error:', msg.message);
  } else if (msg.type === 'tokenCount') {
    // Handle token count response for prompt costing
    handleTokenCount(msg.promptId, msg.tokens, msg.limit);
    // Update chars/token ratio for footer display
    if (msg.charsPerToken) {
      window.charsPerToken = msg.charsPerToken;
      renderFooterStats();
    }
  } else if (msg.type === 'rulesUpdated') {
    // Handle rule changes from file watcher
    ruleResult = msg.ruleResult;
    codingStandardsExists = msg.fileExists;
    updateStatus();
  } else if (msg.type === 'dataUpdated') {
    // Handle full data update (after creating coding-standards.md or refresh)
    files = msg.files;
    issues = msg.issues;
    ruleResult = msg.ruleResult;
    codingStandardsExists = msg.fileExists;

    // Rebuild issueFileMap from new issues
    issueFileMap.clear();
    for (const issue of issues) {
      for (const loc of issue.locations) {
        const existing = issueFileMap.get(loc.file);
        if (!existing || severityRank[issue.severity] < severityRank[existing]) {
          issueFileMap.set(loc.file, issue.severity);
        }
      }
    }

    renderIssues();
    updateStatus();
    // Re-render current view with new data
    if (currentView === 'files') {
      renderTreemap();
    } else if (currentView === 'functions') {
      renderFunctionTreemap();
    }
  }
});
`;

// src/webview/layout/treemap-core.ts
init_esbuild_shim();
var TREEMAP_CORE_SCRIPT = `
// Core treemap constants, state management, and hierarchy building
// Uses d3.treemap() for efficient space usage at folder level
// Supports adaptive depth - collapses folders when children would be too small

const TREEMAP_LABEL_MIN_WIDTH = 40;
const TREEMAP_LABEL_MIN_HEIGHT = 16;
const MIN_NODE_SIZE = 30;  // Minimum px for a clickable node
const MIN_EXPAND_SIZE = 100;  // Folders larger than this should always expand
const DEBUG_SHOW_PARTITIONS = false;  // Show BSP partition debug visualization

// Helper to check if a node is too small to show a useful label
function tooSmallForLabel(node) {
  const w = node.x1 - node.x0;
  const h = node.y1 - node.y0;
  return w < TREEMAP_LABEL_MIN_WIDTH || h < TREEMAP_LABEL_MIN_HEIGHT;
}

// State for viewing a subset of items (when expanding collapsed "other" nodes)
let zoomedOtherInfo = null;  // { folderPath, paths, count, total }

function setZoomedOther(info) {
  zoomedOtherInfo = info;
}

function getZoomedOther() {
  return zoomedOtherInfo;
}

function buildFileHierarchy(fileData, zoomedFolderPath) {
  // Build full hierarchy with folder URIs
  const root = { name: 'root', path: '', uri: createFolderUri(''), children: [] };
  for (const file of fileData) {
    const parts = file.path.split('/');
    let current = root;
    let currentPath = '';
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      currentPath = currentPath ? currentPath + '/' + part : part;
      let child = current.children.find(c => c.name === part && c.children);
      if (!child) {
        child = { name: part, path: currentPath, uri: createFolderUri(currentPath), children: [] };
        current.children.push(child);
      }
      current = child;
    }
    current.children.push(file);
  }

  // If zoomed into a folder, return that subtree
  if (zoomedFolderPath) {
    const subtree = findNodeByPath(root, zoomedFolderPath);
    if (subtree) {
      // If viewing partial (collapsed items), filter children to only those paths
      if (zoomedOtherInfo && zoomedOtherInfo.folderPath === zoomedFolderPath) {
        const allowedPaths = new Set(zoomedOtherInfo.paths);
        subtree.children = subtree.children.filter(c => allowedPaths.has(c.path));
      }
      return subtree;
    }
  }

  // Handle root-level partial view (when folderPath is '')
  if (zoomedOtherInfo && zoomedOtherInfo.folderPath === '') {
    const allowedPaths = new Set(zoomedOtherInfo.paths);
    root.children = root.children.filter(c => allowedPaths.has(c.path));
  }

  return root;
}

function findNodeByPath(node, targetPath) {
  if (node.path === targetPath) return node;
  if (!node.children) return null;
  for (const child of node.children) {
    const found = findNodeByPath(child, targetPath);
    if (found) return found;
  }
  return null;
}

function countDescendantFiles(node) {
  if (!node.children) return 1;  // It's a file
  return node.children.reduce((sum, c) => sum + countDescendantFiles(c), 0);
}
`;

// src/webview/layout/treemap-aggregation.ts
init_esbuild_shim();
var TREEMAP_AGGREGATION_SCRIPT = `
// BSP-based aggregation algorithm for collapsing small treemap nodes
// Aggregates small sibling nodes into "X small items" collapsed groups

function aggregateSmallNodes(hierarchyNode) {
  if (!hierarchyNode.children) return;

  // Recurse into children first (depth-first, reverse order = smallest first)
  const children = hierarchyNode.children;
  for (let i = children.length - 1; i >= 0; i--) {
    aggregateSmallNodes(children[i]);
  }

  const EPS = 2;

  // Helper: compute bounding box of nodes
  const computeBbox = (nodes) => ({
    x0: Math.min(...nodes.map(c => c.x0)),
    y0: Math.min(...nodes.map(c => c.y0)),
    x1: Math.max(...nodes.map(c => c.x1)),
    y1: Math.max(...nodes.map(c => c.y1))
  });

  // Helper: create a collapsed node from items
  const createCollapsedNode = (items) => {
    const bbox = computeBbox(items);
    let otherCount = 0;
    const collapsedPaths = [];
    for (const node of items) {
      otherCount += countDescendantFiles(node.data);
      collapsedPaths.push(node.data.path);
    }
    return {
      data: {
        name: otherCount + ' more...',
        path: hierarchyNode.data.path + '/_other_' + Math.random().toString(36).slice(2, 6),
        uri: hierarchyNode.data.uri,
        _isOther: true,
        _otherCount: otherCount,
        _collapsedPaths: collapsedPaths,
        _totalSiblings: children.length,
        _collapsed: true
      },
      x0: bbox.x0, y0: bbox.y0, x1: bbox.x1, y1: bbox.y1,
      depth: hierarchyNode.depth + 1,
      parent: hierarchyNode,
      children: null,
      _isCollapsedGroup: true,
      _collapsedItems: items
    };
  };

  // Find a split line that separates items into two groups
  const findSplit = (items) => {
    if (items.length <= 1) return null;

    const allSameY = items.every(n =>
      Math.abs(n.y0 - items[0].y0) < EPS && Math.abs(n.y1 - items[0].y1) < EPS);
    const allSameX = items.every(n =>
      Math.abs(n.x0 - items[0].x0) < EPS && Math.abs(n.x1 - items[0].x1) < EPS);

    if (allSameY || allSameX) return null;

    const xEdges = new Set();
    const yEdges = new Set();
    items.forEach(n => {
      xEdges.add(n.x0); xEdges.add(n.x1);
      yEdges.add(n.y0); yEdges.add(n.y1);
    });

    for (const x of xEdges) {
      const left = items.filter(n => n.x1 <= x + EPS);
      const right = items.filter(n => n.x0 >= x - EPS);
      if (left.length > 0 && right.length > 0 && left.length + right.length === items.length) {
        return { first: left, last: right };
      }
    }

    for (const y of yEdges) {
      const top = items.filter(n => n.y1 <= y + EPS);
      const bottom = items.filter(n => n.y0 >= y - EPS);
      if (top.length > 0 && bottom.length > 0 && top.length + bottom.length === items.length) {
        return { first: top, last: bottom };
      }
    }

    return null;
  };

  // Build BSP tree node from items
  const buildBspNode = (items) => {
    if (items.length === 0) return null;
    const split = findSplit(items);
    if (!split) {
      // Leaf node - items are siblings
      return { isLeaf: true, items: items };
    }
    return {
      isLeaf: false,
      first: buildBspNode(split.first),
      last: buildBspNode(split.last)
    };
  };

  // Process BSP tree node, collapsing small items
  // Modifies the tree in place, returns the resulting items array for this subtree
  const processBspNode = (node) => {
    if (!node) return [];

    if (node.isLeaf) {
      // Leaf: items are siblings, can be collapsed together
      const items = node.items;
      const smalls = items.filter(n => tooSmallForLabel(n));

      if (smalls.length === 0) {
        return items; // Nothing to collapse
      }

      // Sort by value (large first) so smallest are at end
      const sorted = [...items].sort((a, b) => (b.data.value || 0) - (a.data.value || 0));

      let toCollapse = [];
      let toKeep = [];

      for (const item of sorted) {
        if (tooSmallForLabel(item)) {
          toCollapse.push(item);
        } else {
          toKeep.push(item);
        }
      }

      // Grow collapsed region until labelable
      let bbox = computeBbox(toCollapse);
      while (tooSmallForLabel(bbox) && toKeep.length > 0) {
        toCollapse.push(toKeep.pop());
        bbox = computeBbox(toCollapse);
      }

      // Always create collapsed node if there are smalls
      if (toCollapse.length > 0) {
        return [...toKeep, createCollapsedNode(toCollapse)];
      }

      return items;
    }

    // Internal node: process children first
    const firstItems = processBspNode(node.first);
    const lastItems = processBspNode(node.last);

    // Find collapsed groups that need growth (not labelable)
    const firstCollapsed = firstItems.find(n => n._isCollapsedGroup);
    const lastCollapsed = lastItems.find(n => n._isCollapsedGroup);
    const needsGrowth = (firstCollapsed && tooSmallForLabel(firstCollapsed)) ||
                        (lastCollapsed && tooSmallForLabel(lastCollapsed));

    if (needsGrowth) {
      // Collect all original items from both sides
      const allItems = [];
      for (const item of [...firstItems, ...lastItems]) {
        if (item._isCollapsedGroup) {
          allItems.push(...item._collapsedItems);
        } else {
          allItems.push(item);
        }
      }
      return [createCollapsedNode(allItems)];
    }

    // Check if both sides are fully collapsed (single collapsed node each)
    const firstIsCollapsed = firstItems.length === 1 && firstItems[0]._isCollapsedGroup;
    const lastIsCollapsed = lastItems.length === 1 && lastItems[0]._isCollapsedGroup;

    if (firstIsCollapsed && lastIsCollapsed) {
      // Both siblings are collapsed - merge them
      const allOriginalItems = [
        ...firstItems[0]._collapsedItems,
        ...lastItems[0]._collapsedItems
      ];
      const bbox = computeBbox(allOriginalItems);

      if (!tooSmallForLabel(bbox)) {
        // Merge into single collapsed node
        return [createCollapsedNode(allOriginalItems)];
      }
      // Can't merge - keep separate (will try at parent level)
    }

    // Return combined items from both branches
    return [...firstItems, ...lastItems];
  };

  // DEBUG: Collect all leaf partitions for visualization
  const collectLeafPartitions = (items) => {
    if (items.length === 0) return [];
    const split = findSplit(items);
    if (!split) return [items];
    return [...collectLeafPartitions(split.first), ...collectLeafPartitions(split.last)];
  };

  // Build BSP tree and process it
  const bspRoot = buildBspNode([...children]);
  const resultItems = processBspNode(bspRoot);

  // Store debug partitions
  hierarchyNode._debugPartitions = collectLeafPartitions([...children]);

  // If ALL children collapsed into a single "other" group,
  // show this as a collapsed folder instead (e.g. "camera/" not "4 small items")
  if (resultItems.length === 1 &&
      resultItems[0]._isCollapsedGroup &&
      resultItems[0]._collapsedItems.length === children.length) {
    hierarchyNode.data._collapsed = true;
    hierarchyNode.data._childCount = countDescendantFiles(hierarchyNode.data);
    hierarchyNode.children = null;
    return;
  }

  // Update children with processed items
  hierarchyNode.children = resultItems;
}


function relayoutModifiedNodes(hierarchy, width, height) {
  // Find nodes that need re-layout (bottom-up order so children are processed first)
  const nodesToRelayout = hierarchy.descendants()
    .filter(d => d.data._needsRelayout)
    .sort((a, b) => b.depth - a.depth);  // Process deepest first

  nodesToRelayout.forEach(node => {
    // Rebuild hierarchy for this subtree from modified data
    const subHierarchy = d3.hierarchy(node.data)
      .sum(d => d.value || 0)
      .sort((a, b) => b.value - a.value);

    // Run treemap layout on this subtree
    // Use same padding as original, accounting for actual depth in hierarchy
    const nodeWidth = node.x1 - node.x0;
    const nodeHeight = node.y1 - node.y0;
    d3.treemap()
      .size([nodeWidth, nodeHeight])
      .paddingTop(d => {
        // Map sub-hierarchy depth to actual depth in original hierarchy
        const actualDepth = d.depth + node.depth;
        return actualDepth === 1 ? 16 : 2;
      })
      .paddingRight(2).paddingBottom(2).paddingLeft(2).paddingInner(1)
      (subHierarchy);

    // Update the original hierarchy node's children with new positions
    node.children = subHierarchy.children;
    if (node.children) {
      // Offset positions and fix depths for ALL descendants (not just direct children)
      subHierarchy.descendants().forEach(c => {
        if (c.depth === 0) return;  // Skip sub-root (represents node itself)
        c.x0 += node.x0;
        c.x1 += node.x0;
        c.y0 += node.y0;
        c.y1 += node.y0;
        c.depth += node.depth;  // Map sub-depth to actual depth
      });
      // Fix parent pointers for direct children to point to original node
      node.children.forEach(c => {
        c.parent = node;
      });
    }

    delete node.data._needsRelayout;
  });
}
`;

// src/webview/layout/treemap-render.ts
init_esbuild_shim();
var TREEMAP_RENDER_SCRIPT = `
// Main treemap rendering - layout and file/folder rectangles
// Animation is handled by the orchestrator via zoom.animateLayers()

// Helper to save clicked element bounds for zoom-in animation
function saveClickedBounds(e) {
  const rect = e.target.getBoundingClientRect();
  const container = document.getElementById('functions-chart');
  const containerRect = container.getBoundingClientRect();
  const bounds = {
    x: rect.left - containerRect.left,
    y: rect.top - containerRect.top,
    w: rect.width,
    h: rect.height
  };
  zoom.setClickedBounds(bounds);
  return bounds;
}

// Render treemap layout - LAYOUT ONLY, no animation
// Animation is handled by the orchestrator via zoom.animateLayers()
function renderTreemapLayout(container, fileData, width, height, t, targetLayer) {
  // Build hierarchy, optionally filtered to a zoomed folder
  const root = buildFileHierarchy(fileData, zoomedFolder);
  const hierarchy = d3.hierarchy(root).sum(d => d.value || 0).sort((a, b) => b.value - a.value);

  // Add extra top padding when viewing partial items (for the header)
  const partialViewPadding = zoomedOtherInfo ? 16 : 0;

  d3.treemap()
    .size([width, height])
    .paddingTop(d => {
      if (d.depth === 0) return partialViewPadding + 2;  // Root: add partial header space
      if (d.depth === 1) return 16;  // Depth-1 folders get header space
      return 2;
    })
    .paddingRight(2).paddingBottom(2).paddingLeft(2).paddingInner(1)
    (hierarchy);

  // Apply adaptive aggregation - small children become "X small items" node
  // Uses bounding box of small nodes, no relayout needed
  aggregateSmallNodes(hierarchy);

  const leaves = hierarchy.leaves();
  const clickedLeaf = zoomedFile ? leaves.find(l => l.data.path === zoomedFile) : null;

  // Ensure SVG exists
  let svg = d3.select(container).select('svg');
  if (svg.empty()) {
    container.innerHTML = '';
    svg = d3.select(container).append('svg');
  }
  svg.attr('width', width).attr('height', height);

  // Use provided layer or get/create default
  let fileLayer = targetLayer;
  if (!fileLayer) {
    fileLayer = svg.select('g.file-layer');
    if (fileLayer.empty()) {
      fileLayer = svg.append('g').attr('class', 'file-layer');
    }
  }

  // Render elements at final positions
  renderFileRects(fileLayer, leaves, width, height, t);
  renderFileLabels(fileLayer, leaves, width, height, t);
  renderFolderLeafLabels(fileLayer, leaves);
  renderFolderHeaders(fileLayer, hierarchy, width, height, t);
  renderPartialViewHeader(fileLayer, width);

  if (DEBUG_SHOW_PARTITIONS) {
    renderDebugPartitions(fileLayer, hierarchy);
  }

  return { svg, fileLayer, leaves, clickedLeaf, hierarchy };
}

function renderFileRects(layer, leaves, width, height, t) {
  // Separate files and collapsed folders for different styling
  const fileLeaves = leaves.filter(d => !d.data._collapsed);
  const folderLeaves = leaves.filter(d => d.data._collapsed);

  // Render file nodes at final positions
  layer.selectAll('rect.file-node').data(fileLeaves, d => d.data.uri)
    .join(
      enter => enter.append('rect')
        .attr('class', 'file-node node')
        .attr('data-uri', d => d.data.uri)
        .attr('data-path', d => d.data.path)
        .attr('fill', d => d.data.color)
        .attr('x', d => d.x0)
        .attr('y', d => d.y0)
        .attr('width', d => Math.max(0, d.x1 - d.x0))
        .attr('height', d => Math.max(0, d.y1 - d.y0)),
      update => update,
      exit => exit.remove()
    )
    .on('mouseover', (e, d) => {
      if (zoomedFile) return;
      let html = '<div><strong>' + d.data.name + '</strong></div>';
      if (d.data.hasFunctions) {
        const fnCount = d.data.functions.length;
        html += '<div>' + fnCount + ' function' + (fnCount !== 1 ? 's' : '') + ' \\u00b7 ' + d.data.value + ' LOC</div>';
        html += '<div style="color:var(--vscode-descriptionForeground)">Click to view functions</div>';
      } else {
        html += '<div>' + d.data.value + ' LOC</div>';
        html += '<div style="color:var(--vscode-descriptionForeground)">Click to open file</div>';
      }
      showTooltip(html, e);
    })
    .on('mousemove', e => positionTooltip(e))
    .on('mouseout', () => hideTooltip())
    .on('click', (e, d) => {
      if (zoomedFile) return;
      saveClickedBounds(e);
      // Clear partial view when navigating
      setZoomedOther(null);
      // Direct zoom: file with functions fills the view, otherwise open in editor
      if (d.data.hasFunctions) {
        zoomTo(d.data.uri);
      } else {
        vscode.postMessage({ command: 'openFile', uri: d.data.uri });
      }
    })
    .attr('x', d => d.x0)
    .attr('y', d => d.y0)
    .attr('width', d => Math.max(0, d.x1 - d.x0))
    .attr('height', d => Math.max(0, d.y1 - d.y0));

  // Render collapsed folder nodes at final positions (use path as key since "other" nodes share parent URI)
  layer.selectAll('rect.folder-node').data(folderLeaves, d => d.data.path)
    .join(
      enter => enter.append('rect')
        .attr('class', d => 'folder-node node' + (d.data._isOther ? ' other' : ''))
        .attr('data-uri', d => d.data.uri)
        .attr('data-path', d => d.data.path)
        .attr('data-collapsed-paths', d => d.data._collapsedPaths ? d.data._collapsedPaths.join(',') : null)
        .attr('x', d => d.x0)
        .attr('y', d => d.y0)
        .attr('width', d => Math.max(0, d.x1 - d.x0))
        .attr('height', d => Math.max(0, d.y1 - d.y0)),
      update => update.attr('class', d => 'folder-node node' + (d.data._isOther ? ' other' : '')),
      exit => exit.remove()
    )
    .on('mouseover', (e, d) => {
      if (zoomedFile) return;
      let html;
      if (d.data._isOther) {
        // "X small items" node
        html = '<div><strong>' + d.data.name + '</strong></div>' +
          '<div style="color:var(--vscode-descriptionForeground)">Click to expand folder</div>';
      } else {
        // Regular collapsed folder
        const count = d.data._childCount;
        html = '<div><strong>' + d.data.name + '/</strong></div>' +
          '<div>' + count + ' item' + (count !== 1 ? 's' : '') + '</div>' +
          '<div style="color:var(--vscode-descriptionForeground)">Click to expand</div>';
      }
      showTooltip(html, e);
    })
    .on('mousemove', e => positionTooltip(e))
    .on('mouseout', () => hideTooltip())
    .on('click', (e, d) => {
      if (zoomedFile) return;
      const bounds = saveClickedBounds(e);
      if (d.data._isOther) {
        // Save entry bounds for zoom-out animation when leaving partial view
        zoom.setPartialEntryBounds(bounds);
        // Expand collapsed items: zoom to parent folder showing only these items
        const parentPath = d.data.path.replace(/\\/_other_[a-z0-9]+$/, '');
        setZoomedOther({
          folderPath: parentPath,
          paths: d.data._collapsedPaths,
          count: d.data._otherCount,
          total: d.data._totalSiblings
        });
        // Add #partial fragment so nav sees this as a different URI and animates
        nav.goTo({ uri: d.data.uri + '#partial' });
      } else {
        // Regular collapsed folder - clear partial view and zoom
        setZoomedOther(null);
        nav.goTo({ uri: d.data.uri });
      }
    })
    .attr('x', d => d.x0)
    .attr('y', d => d.y0)
    .attr('width', d => Math.max(0, d.x1 - d.x0))
    .attr('height', d => Math.max(0, d.y1 - d.y0));

  // Render partition lines from actual BSP edges in collapsed "other" nodes
  const otherLeaves = folderLeaves.filter(d => d.data._isOther && d._collapsedItems);
  const dividerData = [];
  otherLeaves.forEach(d => {
    const items = d._collapsedItems;
    if (!items || items.length < 2) return;
    // Collect unique internal edges (where two items meet)
    const edges = new Set();
    for (const item of items) {
      // Check each edge of this item against all other items
      for (const other of items) {
        if (item === other) continue;
        // Vertical edge: item's right meets other's left
        if (Math.abs(item.x1 - other.x0) < 2) {
          const y0 = Math.max(item.y0, other.y0);
          const y1 = Math.min(item.y1, other.y1);
          if (y1 > y0) edges.add(item.x1 + '|' + y0 + '|' + item.x1 + '|' + y1);
        }
        // Horizontal edge: item's bottom meets other's top
        if (Math.abs(item.y1 - other.y0) < 2) {
          const x0 = Math.max(item.x0, other.x0);
          const x1 = Math.min(item.x1, other.x1);
          if (x1 > x0) edges.add(x0 + '|' + item.y1 + '|' + x1 + '|' + item.y1);
        }
      }
    }
    // Convert edges to line data
    let idx = 0;
    edges.forEach(edge => {
      const [x1, y1, x2, y2] = edge.split('|').map(Number);
      dividerData.push({ key: d.data.path + '-div-' + (idx++), x1, y1, x2, y2 });
    });
  });

  layer.selectAll('line.other-divider').data(dividerData, d => d.key)
    .join(
      enter => enter.append('line')
        .attr('class', 'other-divider')
        .attr('x1', d => d.x1).attr('y1', d => d.y1)
        .attr('x2', d => d.x2).attr('y2', d => d.y2),
      update => update
        .attr('x1', d => d.x1).attr('y1', d => d.y1)
        .attr('x2', d => d.x2).attr('y2', d => d.y2),
      exit => exit.remove()
    );

  // Folder leaf labels rendered separately in renderFolderLeafLabels
}
`;

// src/webview/layout/treemap-labels.ts
init_esbuild_shim();
var TREEMAP_LABELS_SCRIPT = `
// Treemap label and header rendering
// File labels, folder headers, partial view header, and debug visualization

function renderFolderLeafLabels(layer, leaves) {
  // Render labels for collapsed folder leaf nodes
  const folderLeaves = leaves.filter(d => d.data._collapsed);
  const folderLabelsData = folderLeaves.filter(d => {
    const w = d.x1 - d.x0;
    const h = d.y1 - d.y0;
    return w >= TREEMAP_LABEL_MIN_WIDTH && h >= TREEMAP_LABEL_MIN_HEIGHT;
  });

  layer.selectAll('text.folder-label').data(zoomedFile ? [] : folderLabelsData, d => d.data.path)
    .join(
      enter => enter.append('text')
        .attr('class', 'folder-label')
        .attr('pointer-events', 'none')
        .attr('x', d => d.x0 + 4)
        .attr('y', d => d.y0 + 12),
      update => update,
      exit => exit.remove()
    )
    .text(d => {
      // "Other" nodes already have descriptive name, folders get trailing "/"
      const label = d.data._isOther ? d.data.name : d.data.name + '/';
      return truncateLabel(label, (d.x1 - d.x0) - 8, 5);
    })
    .attr('x', d => d.x0 + 4)
    .attr('y', d => d.y0 + 12);

  // Render folder item counts (only for regular folders, not "other" nodes)
  const folderCountData = folderLabelsData.filter(d => !d.data._isOther);
  layer.selectAll('text.folder-count').data(zoomedFile ? [] : folderCountData, d => d.data.path)
    .join(
      enter => enter.append('text')
        .attr('class', 'folder-count')
        .attr('pointer-events', 'none')
        .attr('x', d => d.x0 + 4)
        .attr('y', d => d.y0 + 22),
      update => update,
      exit => exit.remove()
    )
    .text(d => d.data._childCount + ' items')
    .attr('x', d => d.x0 + 4)
    .attr('y', d => d.y0 + 22);
}

function renderFileLabels(layer, leaves, width, height, t) {
  // Only label files (not collapsed folders - they have their own labels)
  const labelsData = leaves.filter(d => {
    if (d.data._collapsed) return false;  // Skip collapsed folders
    const w = d.x1 - d.x0;
    const h = d.y1 - d.y0;
    return w >= TREEMAP_LABEL_MIN_WIDTH && h >= TREEMAP_LABEL_MIN_HEIGHT;
  });

  layer.selectAll('text.file-label').data(zoomedFile ? [] : labelsData, d => d.data.uri)
    .join(
      enter => enter.append('text')
        .attr('class', 'file-label')
        .attr('fill', '#fff')
        .attr('font-size', '9px')
        .attr('pointer-events', 'none')
        .attr('x', d => d.x0 + 4)
        .attr('y', d => d.y0 + 12)
        .text(d => truncateLabel(d.data.name, (d.x1 - d.x0) - 8, 5)),
      update => update,
      exit => exit.remove()
    )
    .attr('x', d => d.x0 + 4)
    .attr('y', d => d.y0 + 12);
}

function renderFolderHeaders(layer, hierarchy, width, height, t) {
  const depth1 = zoomedFile ? [] : hierarchy.descendants().filter(d => d.depth === 1 && d.children && (d.x1 - d.x0) > 30);

  layer.selectAll('rect.dir-header').data(depth1, d => d.data?.path || '')
    .join(
      enter => enter.append('rect')
        .attr('class', 'dir-header')
        .attr('x', d => d.x0)
        .attr('y', d => d.y0)
        .attr('width', d => d.x1 - d.x0)
        .attr('height', 16),
      update => update,
      exit => exit.remove()
    )
    .style('cursor', 'pointer')
    .style('pointer-events', 'auto')
    .on('mouseover', (e, d) => {
      const html = '<div><strong>' + d.data.name + '/</strong></div>' +
        '<div style="color:var(--vscode-descriptionForeground)">Click to zoom into folder</div>';
      showTooltip(html, e);
    })
    .on('mousemove', e => positionTooltip(e))
    .on('mouseout', () => hideTooltip())
    .on('click', (e, d) => {
      e.stopPropagation();
      if (!d.data.uri) return;
      // Clear partial view when navigating to a folder
      setZoomedOther(null);
      // Use the full folder bounds (not just header) for smoother animation
      zoom.setClickedBounds({
        x: d.x0,
        y: d.y0,
        w: d.x1 - d.x0,
        h: d.y1 - d.y0
      });
      nav.goTo({ uri: d.data.uri });
    })
    .attr('x', d => d.x0)
    .attr('y', d => d.y0)
    .attr('width', d => d.x1 - d.x0)
    .attr('height', 16);

  layer.selectAll('text.dir-label').data(depth1, d => d.data?.path || '')
    .join(
      enter => enter.append('text')
        .attr('class', 'dir-label')
        .attr('x', d => d.x0 + 4)
        .attr('y', d => d.y0 + 12),
      update => update,
      exit => exit.remove()
    )
    .style('pointer-events', 'none')
    .text(d => truncateLabel(d.data.name, (d.x1 - d.x0) - 8, 7))
    .attr('x', d => d.x0 + 4)
    .attr('y', d => d.y0 + 12);
}

function renderPartialViewHeader(layer, width) {
  // Show header when viewing a partial set of items (expanded "other" node)
  const otherInfo = zoomedOtherInfo;
  const headerData = otherInfo ? [otherInfo] : [];

  layer.selectAll('rect.partial-header').data(headerData)
    .join(
      enter => enter.append('rect')
        .attr('class', 'partial-header dir-header')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', width)
        .attr('height', 16),
      update => update.attr('width', width),
      exit => exit.remove()
    );

  layer.selectAll('text.partial-label').data(headerData)
    .join(
      enter => enter.append('text')
        .attr('class', 'partial-label dir-label')
        .attr('x', 4)
        .attr('y', 12),
      update => update,
      exit => exit.remove()
    )
    .style('pointer-events', 'none')
    .text(d => d.count + ' of ' + d.total + ' items');
}

// DEBUG: Visualize BSP partitions
// - Solid red: Partition with small items (2+ items -> will collapse)
// - Dashed red: Single small item partition (MISS - won't collapse)
// - Blue: Partition with no small items
function renderDebugPartitions(layer, hierarchy) {
  // Clear existing debug elements
  layer.selectAll('.debug-partition').remove();

  const nodesWithPartitions = hierarchy.descendants().filter(d => d._debugPartitions);

  nodesWithPartitions.forEach(node => {
    const partitions = node._debugPartitions;
    partitions.forEach((partition, i) => {
      const x0 = Math.min(...partition.map(n => n.x0));
      const y0 = Math.min(...partition.map(n => n.y0));
      const x1 = Math.max(...partition.map(n => n.x1));
      const y1 = Math.max(...partition.map(n => n.y1));

      const hasSmall = partition.some(n => tooSmallForLabel(n));
      const isSingle = partition.length === 1;

      layer.append('rect')
        .attr('class', 'debug-partition')
        .attr('x', x0 + 1)
        .attr('y', y0 + 1)
        .attr('width', x1 - x0 - 2)
        .attr('height', y1 - y0 - 2)
        .attr('fill', 'none')
        .attr('stroke', hasSmall ? '#ff3333' : '#3333ff')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', isSingle ? '4,4' : 'none')
        .attr('pointer-events', 'none');
    });
  });
}
`;

// src/webview/partition-layout.ts
init_esbuild_shim();
var PARTITION_LAYOUT_SCRIPT = `
// Partition layout for file internals (functions/blocks)
// Uses horizontal stacking with height proportional to LOC
// Preserves document order (sorted by startLine)

const PARTITION_HEADER_HEIGHT = 24;
const PARTITION_PADDING = 2;
const PARTITION_MIN_HEIGHT = 20;
const PARTITION_LABEL_MIN_HEIGHT = 18;

function buildPartitionData(file, width, height) {
  if (!file || !file.functions || file.functions.length === 0) {
    return [];
  }

  // Sort by startLine to preserve document order
  const sortedFunctions = file.functions
    .slice()
    .sort((a, b) => a.startLine - b.startLine);

  // Calculate total LOC for proportional heights
  const totalLoc = sortedFunctions.reduce((sum, fn) => sum + fn.loc, 0);
  const availableHeight = height - PARTITION_HEADER_HEIGHT - (PARTITION_PADDING * 2);

  // Build partition nodes with calculated positions
  let currentY = PARTITION_HEADER_HEIGHT + PARTITION_PADDING;
  const nodes = sortedFunctions.map(fn => {
    const proportion = fn.loc / totalLoc;
    const nodeHeight = Math.max(PARTITION_MIN_HEIGHT, proportion * availableHeight);

    const node = {
      name: fn.name,
      value: fn.loc,
      line: fn.startLine,
      endLine: fn.endLine,
      depth: fn.maxNestingDepth,
      params: fn.parameterCount,
      filePath: file.path,
      uri: fn.uri,
      x0: PARTITION_PADDING,
      y0: currentY,
      x1: width - PARTITION_PADDING,
      y1: currentY + nodeHeight
    };

    currentY += nodeHeight + PARTITION_PADDING;
    return node;
  });

  return nodes;
}

// Render partition layout - LAYOUT ONLY, no animation
// Animation is handled by the orchestrator via zoom.animateLayers()
function renderPartitionLayout(container, file, width, height, t, targetLayer) {
  let svg = d3.select(container).select('svg');
  if (svg.empty()) {
    container.innerHTML = '';
    svg = d3.select(container).append('svg');
  }
  svg.attr('width', width).attr('height', height);

  // Use provided layer or get/create default
  let partitionLayer = targetLayer;
  if (!partitionLayer) {
    partitionLayer = svg.select('g.partition-layer');
    if (partitionLayer.empty()) {
      partitionLayer = svg.append('g').attr('class', 'partition-layer');
    }
  }

  const nodes = buildPartitionData(file, width, height);

  // Render header at final positions
  renderPartitionHeader(partitionLayer, file, width);

  // Render function rectangles at final positions
  renderPartitionRects(partitionLayer, nodes, width, height);

  // Render labels at final positions
  renderPartitionLabels(partitionLayer, nodes, width, height);

  return { svg, partitionLayer, nodes };
}

function renderPartitionHeader(layer, file, width) {
  const headerData = file ? [{ path: file.path, name: file.path.split('/').pop() }] : [];

  layer.selectAll('rect.partition-header').data(headerData, d => d.path)
    .join(
      enter => enter.append('rect')
        .attr('class', 'partition-header')
        .attr('x', 0).attr('y', 0)
        .attr('width', width).attr('height', PARTITION_HEADER_HEIGHT),
      update => update,
      exit => exit.remove()
    )
    .attr('width', width);

  layer.selectAll('text.partition-header-label').data(headerData, d => d.path)
    .join(
      enter => enter.append('text')
        .attr('class', 'partition-header-label')
        .attr('x', 8).attr('y', 16),
      update => update,
      exit => exit.remove()
    )
    .text(d => truncateLabel(d.name, width - 16, 7));
}

function renderPartitionRects(layer, nodes, width, height) {
  layer.selectAll('rect.partition-node').data(nodes, d => d.uri)
    .join(
      enter => enter.append('rect')
        .attr('class', 'partition-node node')
        .attr('data-uri', d => d.uri)
        .attr('data-path', d => d.filePath)
        .attr('data-line', d => d.line)
        .attr('data-end-line', d => d.endLine)
        .attr('fill', FUNC_NEUTRAL_COLOR)
        .attr('x', d => d.x0)
        .attr('y', d => d.y0)
        .attr('width', d => Math.max(0, d.x1 - d.x0))
        .attr('height', d => Math.max(0, d.y1 - d.y0)),
      update => update,
      exit => exit.remove()
    )
    .on('mouseover', (e, d) => {
      const html = '<div><strong>' + d.name + '</strong></div>' +
        '<div>Lines ' + d.line + '-' + d.endLine + ' \\u00b7 ' + d.value + ' LOC</div>' +
        (d.depth ? '<div>Nesting depth: ' + d.depth + '</div>' : '') +
        '<div style="color:var(--vscode-descriptionForeground)">Click to open in editor</div>';
      showTooltip(html, e);
    })
    .on('mousemove', e => positionTooltip(e))
    .on('mouseout', () => hideTooltip())
    .on('click', (e, d) => {
      vscode.postMessage({ command: 'openFile', uri: d.uri, line: d.line });
    })
    .attr('x', d => d.x0)
    .attr('y', d => d.y0)
    .attr('width', d => Math.max(0, d.x1 - d.x0))
    .attr('height', d => Math.max(0, d.y1 - d.y0));
}

function renderPartitionLabels(layer, nodes, width, height) {
  const labelsData = nodes.filter(d => (d.y1 - d.y0) >= PARTITION_LABEL_MIN_HEIGHT);

  layer.selectAll('text.partition-label').data(labelsData, d => d.uri)
    .join(
      enter => enter.append('text')
        .attr('class', 'partition-label')
        .attr('fill', '#fff')
        .attr('font-size', '11px')
        .attr('pointer-events', 'none')
        .attr('x', d => d.x0 + 8)
        .attr('y', d => d.y0 + ((d.y1 - d.y0) / 2) + 4),
      update => update,
      exit => exit.remove()
    )
    .text(d => {
      const locText = ' (' + d.value + ')';
      const maxWidth = (d.x1 - d.x0) - 16;
      const availableForName = maxWidth - (locText.length * 6);
      const name = truncateLabel(d.name, availableForName, 6);
      return name + locText;
    })
    .attr('x', d => d.x0 + 8)
    .attr('y', d => d.y0 + ((d.y1 - d.y0) / 2) + 4);
}

function clearPartitionLayer(container) {
  const svg = d3.select(container).select('svg');
  if (!svg.empty()) {
    const partitionLayer = svg.select('g.partition-layer');
    partitionLayer.selectAll('*').remove();
  }
}
`;

// src/webview/distribution-chart.ts
init_esbuild_shim();
var DISTRIBUTION_CHART_SCRIPT = `
const FUNC_NEUTRAL_COLOR = '#3a3a3a';
const FILE_NO_FUNCTIONS_COLOR = '#2a2a2a';

function getDynamicFunctionColor(func) {
  return FUNC_NEUTRAL_COLOR;
}

function getDynamicFileColor(fileData) {
  return fileData.hasFunctions ? FUNC_NEUTRAL_COLOR : FILE_NO_FUNCTIONS_COLOR;
}

function zoomTo(uri) {
  nav.goTo({ uri: uri });
}

function truncateLabel(name, maxWidth, charWidth) {
  const maxChars = Math.floor(maxWidth / charWidth);
  return name.length > maxChars ? name.slice(0, maxChars - 1) + '\\u2026' : name;
}

function buildFileData() {
  return files.map(f => {
    const hasFunctions = f.functions && f.functions.length > 0;
    const fileData = {
      name: f.path.split('/').pop(),
      path: f.path,
      uri: f.uri,
      value: hasFunctions ? f.functions.reduce((sum, fn) => sum + fn.loc, 0) : f.loc,
      functions: f.functions || [],
      hasFunctions: hasFunctions
    };
    fileData.color = getDynamicFileColor(fileData);
    return fileData;
  });
}

// Helper to find bounds of a URI in a hierarchy (skips root - we want descendants only)
function findBoundsInHierarchy(hierarchy, targetUri) {
  if (!hierarchy || !targetUri) return null;
  const targetPath = getFilePath(targetUri);
  // Skip depth 0 (root) - zooming to root bounds is meaningless
  const node = hierarchy.descendants().find(d => d.depth > 0 && d.data.path === targetPath);
  if (node) {
    return {
      x: node.x0,
      y: node.y0,
      w: node.x1 - node.x0,
      h: node.y1 - node.y0
    };
  }
  return null;
}

// Main orchestrator - handles all zoom transitions uniformly
function renderDistributionChart() {
  const container = document.getElementById('functions-chart');
  if (!container) return;

  const width = container.clientWidth || 600;
  const height = container.clientHeight || 400;
  const t = zoom.transition('main');

  const fileData = buildFileData();
  if (fileData.length === 0) {
    container.innerHTML = '<div class="functions-empty">No functions found.</div>';
    renderFilesLegend([]);
    return;
  }

  // Detect transition type
  const clickedBounds = zoom.consumeClickedBounds();
  const isZoomingIn = !!clickedBounds;
  // Only consume partial exit bounds when NOT zooming in (to avoid consuming on entry)
  const partialExitBounds = !isZoomingIn ? zoom.consumePartialEntryBounds() : null;
  const isZoomingOut = !isZoomingIn && (prevZoomedFolder || prevZoomedFile || partialExitBounds);

  // Determine what to render: files/folders (treemap) or functions (partition)
  const showingFunctions = !!zoomedFile;
  const wasShowingFunctions = !!prevZoomedFile;

  // Ensure SVG exists
  let svg = d3.select(container).select('svg');
  if (svg.empty()) {
    container.innerHTML = '';
    svg = d3.select(container).append('svg');
  }
  svg.attr('width', width).attr('height', height);

  if (isZoomingIn) {
    // ZOOM IN: create new layer, render into it, animate old \u2192 new
    if (showingFunctions && !wasShowingFunctions) {
      // File \u2192 Functions: new partition layer expands from file
      const oldLayer = svg.select('g.file-layer');
      zoom.prepareAnimation(svg, oldLayer, 'g.partition-layer');

      const newLayer = svg.append('g').attr('class', 'partition-layer');

      const file = files.find(f => f.path === zoomedFile);
      if (file) {
        renderPartitionLayout(container, file, width, height, t, newLayer);
        renderFunctionLegend(file.functions ? file.functions.length : 0);
      }

      zoom.animateLayers(oldLayer, newLayer, clickedBounds, width, height, t, 'in');

    } else {
      // Folder \u2192 Folder (or Folder \u2192 File preview): new file layer expands
      const oldLayer = svg.select('g.file-layer');
      zoom.prepareAnimation(svg, oldLayer, 'g.file-layer-old');

      // For zoom-in, new layer goes on TOP (append) - it expands from clicked element
      const newLayer = svg.append('g').attr('class', 'file-layer');

      renderTreemapLayout(container, fileData, width, height, t, newLayer);

      zoom.animateLayers(oldLayer, newLayer, clickedBounds, width, height, t, 'in');

      // Mark old layer to avoid selection conflicts
      oldLayer.attr('class', 'file-layer-old');
    }

  } else if (isZoomingOut) {
    // ZOOM OUT: use previous URI to find bounds in new layout
    const prevPath = prevZoomedFile || prevZoomedFolder;
    const sourceUri = prevPath ? createFileUri(prevPath) : null;

    if (wasShowingFunctions && !showingFunctions) {
      // Functions \u2192 File: partition shrinks to file, file layer appears
      const oldLayer = svg.select('g.partition-layer');
      zoom.prepareAnimation(svg, oldLayer, 'g.file-layer, g.file-layer-old');

      const newLayer = svg.insert('g', ':first-child').attr('class', 'file-layer');

      const result = renderTreemapLayout(container, fileData, width, height, t, newLayer);
      renderFilesLegend(fileData);

      // Look up the source file in the new layout, fallback to center
      const bounds = findBoundsInHierarchy(result.hierarchy, sourceUri) || {
        x: width * 0.25, y: height * 0.25, w: width * 0.5, h: height * 0.5
      };

      if (!zoom.animateLayers(oldLayer, newLayer, bounds, width, height, t, 'out')) {
        // Animation failed (empty layer) - just fade in new layer
        newLayer.style('opacity', 0).transition(t).style('opacity', 1);
      }

    } else {
      // Folder \u2192 Parent Folder (or partial \u2192 full): file layer shrinks to folder
      const oldLayer = svg.select('g.file-layer');
      zoom.prepareAnimation(svg, oldLayer, 'g.file-layer-old');

      const newLayer = svg.insert('g', ':first-child').attr('class', 'file-layer');

      const result = renderTreemapLayout(container, fileData, width, height, t, newLayer);
      renderFilesLegend(fileData);

      // For partial view exit, use saved entry bounds, otherwise look up in hierarchy
      const bounds = partialExitBounds || findBoundsInHierarchy(result.hierarchy, sourceUri);

      if (!zoom.animateLayers(oldLayer, newLayer, bounds, width, height, t, 'out')) {
        // Animation failed - crossfade
        oldLayer.transition(t).style('opacity', 0).remove();
        newLayer.style('opacity', 0).transition(t).style('opacity', 1);
      }

      // Mark old layer to avoid selection conflicts
      oldLayer.attr('class', 'file-layer-old');
    }

  } else {
    // No animation - initial render or resize
    if (showingFunctions) {
      // Clear any stale file layer content, render partition
      let partitionLayer = svg.select('g.partition-layer');
      if (partitionLayer.empty()) {
        partitionLayer = svg.append('g').attr('class', 'partition-layer');
      }

      const file = files.find(f => f.path === zoomedFile);
      if (file) {
        renderPartitionLayout(container, file, width, height, t, partitionLayer);
        renderFunctionLegend(file.functions ? file.functions.length : 0);
      }
    } else {
      // Render treemap
      let fileLayer = svg.select('g.file-layer');
      if (fileLayer.empty()) {
        fileLayer = svg.append('g').attr('class', 'file-layer');
      }

      // Clear any stale partition layer
      clearPartitionLayer(container);

      renderTreemapLayout(container, fileData, width, height, t, fileLayer);
      renderFilesLegend(fileData);
    }
  }
}

function renderFilesLegend(fileData) {
  const legend = document.getElementById('legend');
  if (legend) legend.style.display = 'none';
}

function renderFunctionLegend(count) {
  const legend = document.getElementById('legend');
  if (!legend || currentView !== 'functions') return;

  legend.style.display = 'flex';
  legend.innerHTML = '<div class="legend-item" style="margin-left:auto;"><strong>' + count + '</strong> functions</div>';
}

// Re-render on window resize
window.addEventListener('resize', () => {
  if (currentView === 'files' || currentView === 'functions') {
    renderDistributionChart();
    selection._applyHighlights();
  } else if (currentView === 'deps' && depGraph) {
    renderDepGraph();
    selection._applyHighlights();
  }
});
`;

// src/webview/color-animation.ts
init_esbuild_shim();
var COLOR_ANIMATION_SCRIPT = `
// Color cycle synced with CSS animations (3s cycle: cornflower \u2192 purple \u2192 turquoise)
const CYCLE_COLORS = [
  [100, 149, 237],  // Cornflower blue at 0%
  [147, 112, 219],  // Purple at 33%
  [64, 224, 208]    // Turquoise at 66%
];

function interpolateColor(t) {
  // t is 0-1 representing position in 3s cycle
  // 0-0.33: blue\u2192purple, 0.33-0.66: purple\u2192turquoise, 0.66-1: turquoise\u2192blue
  const segment = t * 3;
  const idx = Math.floor(segment) % 3;
  const nextIdx = (idx + 1) % 3;
  const localT = segment - Math.floor(segment);

  const c1 = CYCLE_COLORS[idx];
  const c2 = CYCLE_COLORS[nextIdx];
  const r = Math.round(c1[0] + (c2[0] - c1[0]) * localT);
  const g = Math.round(c1[1] + (c2[1] - c1[1]) * localT);
  const b = Math.round(c1[2] + (c2[2] - c1[2]) * localT);
  return [r, g, b];
}

function cycleIssueColors() {
  // Sync with CSS animations using same timing base
  const t = (Date.now() % 3000) / 3000;
  const [r, g, b] = interpolateColor(t);
  const color = '#' + r.toString(16).padStart(2, '0') + g.toString(16).padStart(2, '0') + b.toString(16).padStart(2, '0');

  const pulsePhase = t * 2 * Math.PI;
  const alpha = 0.7 + 0.05 * Math.sin(pulsePhase);
  const ribbonAlpha = 0.3 + 0.2 * Math.sin(pulsePhase);

  document.querySelectorAll('.node.highlighted').forEach(node => {
    node.style.setProperty('fill', color, 'important');
    node.style.setProperty('fill-opacity', alpha.toString(), 'important');
  });

  document.querySelectorAll('.chord-arc.highlighted').forEach(arc => {
    arc.style.setProperty('fill', color, 'important');
    arc.style.setProperty('fill-opacity', alpha.toString(), 'important');
  });

  document.querySelectorAll('.chord-ribbon.highlighted').forEach(ribbon => {
    ribbon.style.setProperty('fill', color, 'important');
    ribbon.style.setProperty('fill-opacity', ribbonAlpha.toString(), 'important');
  });

  if (selectedElement && selectedElement.isConnected) {
    // Visible selection background with pulsing alpha
    const bgAlpha = 0.5 + 0.1 * Math.sin(pulsePhase);
    selectedElement.style.background = 'rgba(' + r + ',' + g + ',' + b + ',' + bgAlpha.toFixed(2) + ')';
  }
}

setInterval(cycleIssueColors, 16);
`;

// src/webview/flyout-renderer.ts
init_esbuild_shim();
var FLYOUT_RENDERER_SCRIPT = `
// Show flyout with all files
function showFilesFlyout(files, anchorEl) {
  // Remove existing flyout
  const existing = document.getElementById('files-flyout');
  if (existing) existing.remove();

  const flyout = document.createElement('div');
  flyout.id = 'files-flyout';
  flyout.className = 'files-flyout';

  const header = document.createElement('div');
  header.className = 'files-flyout-header';
  header.innerHTML = '<span>' + files.length + ' files in context</span><button class="files-flyout-close">\xD7</button>';
  flyout.appendChild(header);

  const list = document.createElement('div');
  list.className = 'files-flyout-list';
  list.innerHTML = files.map(filePath => {
    const fileName = filePath.split('/').pop();
    return '<div class="files-flyout-item" data-path="' + filePath + '" title="' + filePath + '">' +
      '<span>' + fileName + '</span>' +
      '<button class="files-flyout-remove">\xD7</button>' +
      '</div>';
  }).join('');
  flyout.appendChild(list);

  // Position flyout above the button
  const rect = anchorEl.getBoundingClientRect();
  flyout.style.bottom = (window.innerHeight - rect.top + 8) + 'px';
  flyout.style.left = rect.left + 'px';

  document.body.appendChild(flyout);

  // Close button handler
  flyout.querySelector('.files-flyout-close').addEventListener('click', () => flyout.remove());

  // Remove file handlers
  flyout.querySelectorAll('.files-flyout-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const item = btn.closest('.files-flyout-item');
      const filePath = item.getAttribute('data-path');
      selection.removeFile(filePath);
      item.remove();
      // Update header count
      const remaining = flyout.querySelectorAll('.files-flyout-item').length;
      if (remaining === 0) {
        flyout.remove();
      } else {
        flyout.querySelector('.files-flyout-header span').textContent = remaining + ' files in context';
      }
    });
  });

  // Click outside to close
  const closeOnOutsideClick = (e) => {
    if (!flyout.contains(e.target) && e.target !== anchorEl) {
      flyout.remove();
      document.removeEventListener('mousedown', closeOnOutsideClick);
    }
  };
  setTimeout(() => document.addEventListener('mousedown', closeOnOutsideClick), 10);
}
`;

// src/webview/selection-state.ts
init_esbuild_shim();
var SELECTION_STATE_SCRIPT = `
// Get files that have high severity issues
function getHighSeverityFiles(filePaths) {
  const highSevFiles = new Set();
  for (const issue of issues) {
    if (issue.severity === 'high' && !isIssueIgnored(issue)) {
      for (const loc of issue.locations) {
        if (filePaths.includes(loc.file)) {
          highSevFiles.add(loc.file);
        }
      }
    }
  }
  return [...highSevFiles];
}

// Selection state module - manages issue selection and focus for AI context
const selection = {
  _state: {
    ruleId: null,         // Selected issue type (e.g., 'silent-failure')
    highlightFiles: [],   // Files to highlight visually (what user is browsing)
    highlightLines: {},   // Map of file path -> line number for function-level highlighting
    attachedFiles: [],    // Files attached to context (ready to send)
    attachedIssues: []    // Issues attached to context
  },

  // Select an issue type - highlights affected files but does NOT attach to context
  selectRule(ruleId) {
    this._state.ruleId = ruleId;
    this._state.highlightFiles = this.getAffectedFiles();
    this._state.highlightLines = this.getAffectedLines();
    this._applyHighlights();
  },

  // Get lines affected by current rule (for function-level highlighting)
  getAffectedLines() {
    if (!this._state.ruleId) return {};
    const lineMap = {};
    for (const issue of issues) {
      if (issue.ruleId === this._state.ruleId && !isIssueIgnored(issue)) {
        for (const loc of issue.locations) {
          if (loc.line) {
            if (!lineMap[loc.file]) lineMap[loc.file] = [];
            lineMap[loc.file].push(loc.line);
          }
        }
      }
    }
    return lineMap;
  },

  // Get files affected by current rule (derived, not stored)
  getAffectedFiles() {
    if (!this._state.ruleId) return [];
    const fileSet = new Set();
    for (const issue of issues) {
      if (issue.ruleId === this._state.ruleId && !isIssueIgnored(issue)) {
        for (const loc of issue.locations) {
          fileSet.add(loc.file);
        }
      }
    }
    return [...fileSet];
  },

  // Set highlight focus to specific files (visual only, does NOT attach to context)
  // lineMap is optional: { filePath: [line1, line2, ...] }
  setFocus(files, lineMap) {
    this._state.highlightFiles = files;
    this._state.highlightLines = lineMap || {};
    this._applyHighlights();
  },

  // Attach files to context (called when prompt button clicked - commits to sending)
  attachContext(files, contextIssues) {
    this._state.attachedFiles = files;
    this._state.attachedIssues = contextIssues || [];
    this._state.highlightFiles = files;
    this._renderContextFiles();
  },

  // Select all issues (status button behavior) - highlights only
  selectAllIssues() {
    this._state.ruleId = null;
    this._state.highlightFiles = getAllIssueFiles();
    this._applyHighlights();
  },

  // Clear selection and attached context
  clear() {
    this._state.ruleId = null;
    this._state.highlightFiles = [];
    this._state.highlightLines = {};
    this._state.attachedFiles = [];
    this._state.attachedIssues = [];
    this._applyHighlights();
  },

  // Get current state (read-only)
  getState() {
    return {
      ruleId: this._state.ruleId,
      focusFiles: [...this._state.highlightFiles],
      attachedFiles: [...this._state.attachedFiles]
    };
  },

  // Get context for AI chat - uses ATTACHED files (not highlight files)
  getAIContext() {
    // If files are attached, use those; otherwise return empty
    if (this._state.attachedFiles.length === 0) {
      return { ruleId: null, files: [], issues: [] };
    }

    return {
      ruleId: this._state.ruleId,
      files: this._state.attachedFiles,
      issues: this._state.attachedIssues
    };
  },

  // Get preview context for prompt costing (based on current selection, not attached)
  getPreviewContext() {
    const focusedIssues = this._state.ruleId
      ? issues.filter(i =>
          i.ruleId === this._state.ruleId &&
          !isIssueIgnored(i) &&
          i.locations.some(l => this._state.highlightFiles.includes(l.file))
        )
      : issues.filter(i =>
          !isIssueIgnored(i) &&
          i.locations.some(l => this._state.highlightFiles.includes(l.file))
        );

    return {
      ruleId: this._state.ruleId,
      files: this._state.highlightFiles,
      issues: focusedIssues
    };
  },

  // Remove a file from attached context (called when user clicks X on chip)
  removeFile(filePath) {
    this._state.attachedFiles = this._state.attachedFiles.filter(f => f !== filePath);
    this._state.attachedIssues = this._state.attachedIssues.filter(i =>
      i.locations.some(l => this._state.attachedFiles.includes(l.file))
    );
    this._state.highlightFiles = this._state.highlightFiles.filter(f => f !== filePath);
    this._renderContextFiles();
    highlightNodes(this._state.highlightFiles);
  },

  // Apply highlights to DOM nodes
  _applyHighlights() {
    highlightNodes(this._state.highlightFiles, this._state.highlightLines);
    this._renderContextFiles();
    renderDynamicPrompts();
  },

  // Render context files as chips in footer - shows ATTACHED files (ready to send)
  _renderContextFiles() {
    const container = document.getElementById('context-files');
    const divider = document.getElementById('input-divider');
    const contextRow = document.getElementById('footer-context-row');
    if (!container) return;

    const files = this._state.attachedFiles;
    if (files.length === 0) {
      container.innerHTML = '';
      // Hide divider and context row when no files
      if (divider) divider.classList.remove('visible');
      if (contextRow) contextRow.classList.remove('visible');
      return;
    }

    // Show divider and context row when files exist
    if (divider) divider.classList.add('visible');
    if (contextRow) contextRow.classList.add('visible');

    // Show first 3 files, then +N more button (but ALL files are sent to API)
    const maxVisible = 3;
    const visibleFiles = files.slice(0, maxVisible);
    const hiddenCount = files.length - maxVisible;

    let html = visibleFiles.map(filePath => {
      const fileName = filePath.split('/').pop();
      return '<div class="context-chip" data-path="' + filePath + '">' +
        '<span class="context-chip-name" title="' + filePath + '">' + fileName + '</span>' +
        '<button class="context-chip-remove" title="Remove from context">\xD7</button>' +
        '</div>';
    }).join('');

    if (hiddenCount > 0) {
      html += '<button class="context-chip more" id="show-all-files-btn">+' + hiddenCount + ' more</button>';
    }

    container.innerHTML = html;

    // Add click handlers for remove buttons
    container.querySelectorAll('.context-chip-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const chip = btn.closest('.context-chip');
        const filePath = chip.getAttribute('data-path');
        selection.removeFile(filePath);
      });
    });

    // Add click handler for +N more button
    const moreBtn = document.getElementById('show-all-files-btn');
    if (moreBtn) {
      moreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._showFilesFlyout(files, moreBtn);
      });
    }
  },

  // Show flyout with all files (delegates to global function)
  _showFilesFlyout(files, anchorEl) {
    showFilesFlyout(files, anchorEl);
  }
};
`;

// src/webview/uri.ts
init_esbuild_shim();
var URI_SCRIPT = `
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

// src/webview/breadcrumb.ts
init_esbuild_shim();
var BREADCRUMB_SCRIPT = `
// Breadcrumb navigation for treemap
// Shows clickable path segments: ProjectName / src / components / Header.tsx

const MAX_BREADCRUMB_SEGMENTS = 6;

// Extract project name from root path
function getProjectName() {
  if (!rootPath) return 'Project';
  const parts = rootPath.replace(/\\\\/g, '/').split('/').filter(Boolean);
  return parts[parts.length - 1] || 'Project';
}

function buildBreadcrumbSegments(uri) {
  const segments = [];

  // Always add project root as first segment
  segments.push({
    name: getProjectName(),
    uri: null,  // null URI means go to root
    isRoot: true
  });

  if (!uri) return segments;

  const parsed = parseUri(uri);

  // Add path segments (folders and file)
  const pathParts = parsed.path.split('/').filter(Boolean);
  let currentPath = '';
  for (const part of pathParts) {
    currentPath = currentPath ? currentPath + '/' + part : part;
    const isFile = currentPath === parsed.path && !parsed.fragment;
    segments.push({
      name: part,
      uri: isFile ? createFileUri(currentPath) : createFolderUri(currentPath),
      isFile: isFile
    });
  }

  // Add symbol segments if we have a fragment
  if (parsed.fragment) {
    const symbolParts = parsed.fragment.split('.');
    let currentFragment = '';
    for (const part of symbolParts) {
      currentFragment = currentFragment ? currentFragment + '.' + part : part;
      // Clean up block notation for display (e.g., "if:10" -> "if")
      const displayName = part.replace(/:(\\d+)$/, '');
      segments.push({
        name: displayName,
        uri: createFileUri(parsed.path) + '#' + currentFragment,
        isSymbol: true
      });
    }
  }

  return segments;
}

function truncateBreadcrumb(segments) {
  if (segments.length <= MAX_BREADCRUMB_SEGMENTS) {
    return segments;
  }

  // Keep first 2 and last 3, add ellipsis in middle
  const start = segments.slice(0, 2);
  const end = segments.slice(-3);
  return [...start, { name: '...', uri: null, isEllipsis: true }, ...end];
}

function renderBreadcrumb(container, zoomedUri) {
  if (!container) return;

  const segments = buildBreadcrumbSegments(zoomedUri);
  const displaySegments = truncateBreadcrumb(segments);

  // Always show breadcrumb (at minimum shows project root)
  container.classList.remove('hidden');

  // Check if viewing a partial set of items (expanded "other" node)
  const otherInfo = typeof getZoomedOther === 'function' ? getZoomedOther() : null;

  // Build HTML - no back button, just path segments
  let html = '';

  displaySegments.forEach((seg, i) => {
    if (i > 0) {
      html += '<span class="breadcrumb-separator">/</span>';
    }

    if (seg.isEllipsis) {
      html += '<span class="breadcrumb-ellipsis">...</span>';
    } else if (i === displaySegments.length - 1) {
      // Current location
      // When viewing partial folder contents, make it clickable to show all items
      if (otherInfo && !seg.isSymbol) {
        const uriAttr = seg.uri === null ? 'null' : seg.uri;
        html += '<button class="breadcrumb-segment breadcrumb-partial" data-uri="' + uriAttr + '">' + seg.name + '</button>';
      } else {
        html += '<span class="breadcrumb-current">' + seg.name + '</span>';
      }
    } else {
      // Clickable segment - use 'null' string for root
      const uriAttr = seg.uri === null ? 'null' : seg.uri;
      html += '<button class="breadcrumb-segment" data-uri="' + uriAttr + '">' + seg.name + '</button>';
    }
  });

  container.innerHTML = html;

  // Add event listeners for clickable segments
  container.querySelectorAll('.breadcrumb-segment').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const uriStr = e.target.dataset.uri;
      // Handle root navigation (null URI)
      const uri = uriStr === 'null' ? null : uriStr;

      // Clear partial view when navigating via breadcrumb
      if (typeof setZoomedOther === 'function') setZoomedOther(null);
      nav.goTo({ uri: uri });
    });
  });
}

// Keyboard navigation
document.addEventListener('keydown', (e) => {
  // Only handle when treemap is active
  if (currentView !== 'files' && currentView !== 'functions') return;

  // Don't intercept if typing in input
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

  if (e.key === 'Escape' || e.key === 'Backspace') {
    e.preventDefault();
    // Clear partial view when navigating back
    if (typeof setZoomedOther === 'function') setZoomedOther(null);
    nav.back();
  } else if (e.key === 'Home') {
    e.preventDefault();
    // Clear partial view when going home
    if (typeof setZoomedOther === 'function') setZoomedOther(null);
    nav.goTo({ uri: null });
  }
});
`;

// src/webview/code-preview.ts
init_esbuild_shim();
var CODE_PREVIEW_SCRIPT = `
// Code preview component for leaf nodes
// Shows source code with line numbers and action buttons

const CODE_PREVIEW_MAX_LINES = 50;

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function renderCodeWithLineNumbers(code, startLine) {
  const lines = code.split('\\n');
  return lines.map((line, i) => {
    const lineNum = startLine + i;
    const escapedLine = escapeHtml(line) || ' ';  // Preserve empty lines
    return '<span class="code-line"><span class="code-line-number">' + lineNum + '</span><span class="code-line-content">' + escapedLine + '</span></span>';
  }).join('\\n');
}

function showCodePreview(container, node) {
  // Request code from extension host
  vscode.postMessage({
    command: 'getCodePreview',
    uri: node.uri,
    startLine: node.line,
    endLine: node.endLine
  });

  // Show loading state in container
  const previewHtml = '<div class="code-preview-container">' +
    '<div class="code-preview-header">' +
    '<span class="code-preview-name">' + node.name + '</span>' +
    '<span class="code-preview-loc">Lines ' + node.line + '-' + node.endLine + '</span>' +
    '</div>' +
    '<div class="code-preview-loading">' +
    '<div class="thinking-spinner"></div>' +
    '<span>Loading code...</span>' +
    '</div>' +
    '<div class="code-preview-actions">' +
    '<button class="code-action-btn code-action-prompt" data-uri="' + node.uri + '">Add to Prompt</button>' +
    '<button class="code-action-btn code-action-open" data-uri="' + node.uri + '">Open in Editor</button>' +
    '</div>' +
    '</div>';

  // Store current preview node for when code arrives
  window._currentPreviewNode = node;

  return previewHtml;
}

function handleCodePreviewResponse(data) {
  const container = document.getElementById('functions-chart');
  if (!container) return;

  const previewLoading = container.querySelector('.code-preview-loading');
  if (!previewLoading) return;

  if (data.error) {
    previewLoading.innerHTML = '<span class="code-preview-error">' + data.error + '</span>';
    return;
  }

  const codeHtml = renderCodeWithLineNumbers(data.code, data.startLine);
  previewLoading.outerHTML = '<pre class="code-preview-code">' + codeHtml + '</pre>';

  // Add event listeners for action buttons
  const promptBtn = container.querySelector('.code-action-prompt');
  const openBtn = container.querySelector('.code-action-open');

  if (promptBtn) {
    promptBtn.addEventListener('click', (e) => {
      const uri = e.target.dataset.uri;
      // Add to selection for prompt context
      selection.add(uri);
      vscode.postMessage({
        command: 'showMessage',
        message: 'Added to prompt context'
      });
    });
  }

  if (openBtn) {
    openBtn.addEventListener('click', (e) => {
      const uri = e.target.dataset.uri;
      vscode.postMessage({ command: 'openFile', uri: uri });
    });
  }
}

// Listen for code preview response from extension host
window.addEventListener('message', (event) => {
  const message = event.data;
  if (message.type === 'codePreview') {
    handleCodePreviewResponse(message);
  }
});
`;

// src/webview/zoom.ts
init_esbuild_shim();
var ZOOM_SCRIPT = `
// Reusable zoom transition module
// Handles transform calculation and animation state for all zoom operations

const ZOOM_DURATION = 500;
const ZOOM_EASE = d3.easeCubicOut;

const zoom = {
  _prev: { x: 0, y: 0, kx: 1, ky: 1 },
  _curr: { x: 0, y: 0, kx: 1, ky: 1 },
  _clickedBounds: null,  // Bounds of clicked element for zoom-in animation

  // Calculate zoom transform for a target node
  calculateTransform(targetNode, width, height) {
    if (targetNode) {
      return {
        x: targetNode.x0,
        y: targetNode.y0,
        kx: width / (targetNode.x1 - targetNode.x0),
        ky: height / (targetNode.y1 - targetNode.y0)
      };
    }
    return { x: 0, y: 0, kx: 1, ky: 1 };
  },

  // Update zoom state and return prev/curr for animation
  update(targetNode, width, height) {
    this._prev = { ...this._curr };
    this._curr = this.calculateTransform(targetNode, width, height);
    return { prev: this._prev, curr: this._curr };
  },

  // Get a D3 transition configured for zoom animations
  transition(name) {
    return d3.transition(name || 'zoom')
      .duration(ZOOM_DURATION)
      .ease(ZOOM_EASE);
  },

  // Calculate bounds for exit animations (where element was in prev transform)
  exitBounds(node, transform) {
    if (!node) return { x: 0, y: 0, w: 0, h: 0 };
    return {
      x: (node.x0 - transform.x) * transform.kx,
      y: (node.y0 - transform.y) * transform.ky,
      w: (node.x1 - node.x0) * transform.kx,
      h: (node.y1 - node.y0) * transform.ky
    };
  },

  // Reset zoom state (for view changes)
  reset() {
    this._prev = { x: 0, y: 0, kx: 1, ky: 1 };
    this._curr = { x: 0, y: 0, kx: 1, ky: 1 };
  },

  // Set clicked bounds for zoom-in animation (call before navigation)
  setClickedBounds(bounds) {
    this._clickedBounds = bounds;
  },

  // Get and clear clicked bounds for zoom-in animation
  consumeClickedBounds() {
    const bounds = this._clickedBounds;
    this._clickedBounds = null;
    return bounds;
  },

  // Track entry bounds for partial view (used for zoom-out animation)
  _partialEntryBounds: null,
  setPartialEntryBounds(bounds) {
    this._partialEntryBounds = bounds;
  },
  consumePartialEntryBounds() {
    const bounds = this._partialEntryBounds;
    this._partialEntryBounds = null;
    return bounds;
  },

  // Prepare SVG for animation by interrupting existing transitions and removing stale layers
  // Returns true if ready to animate, false if oldLayer is empty
  prepareAnimation(svg, oldLayer, staleSelector) {
    // Interrupt and remove stale layers
    if (staleSelector) {
      svg.selectAll(staleSelector).interrupt().remove();
    }
    // Interrupt old layer if it exists
    if (oldLayer && !oldLayer.empty()) {
      oldLayer.interrupt();
      return true;
    }
    return false;
  },

  // Generalized two-layer crossfade animation
  // Works for any transition: folder\u2192folder, file\u2192function, etc.
  // direction: 'in' (zoom into clicked element) or 'out' (zoom back to parent)
  animateLayers(oldLayer, newLayer, bounds, width, height, t, direction) {
    if (!bounds || !oldLayer || !newLayer || oldLayer.empty() || newLayer.empty()) return false;

    // Use non-uniform scaling so both dimensions animate (avoids no-zoom when one dimension matches)
    const scaleX = width / bounds.w;
    const scaleY = height / bounds.h;
    const invScaleX = bounds.w / width;
    const invScaleY = bounds.h / height;

    // Hide text on old layer
    oldLayer.selectAll('text').style('opacity', 0);
    oldLayer.attr('pointer-events', 'none');

    // Counter-scale text on new layer to maintain constant size during animation
    // Text counter-scale must be INVERSE of layer scale (not linear interpolation)
    // Layer interpolates: startLayerScale \u2192 1, so text needs: 1/layerScale at each frame
    const startLayerScaleX = direction === 'in' ? invScaleX : scaleX;
    const startLayerScaleY = direction === 'in' ? invScaleY : scaleY;

    // Set initial counter-scale
    const initCounterX = 1 / startLayerScaleX;
    const initCounterY = 1 / startLayerScaleY;
    newLayer.selectAll('text').each(function() {
      const text = d3.select(this);
      const x = parseFloat(text.attr('x')) || 0;
      const y = parseFloat(text.attr('y')) || 0;
      text.attr('transform', 'translate(' + x + ',' + y + ') scale(' + initCounterX + ',' + initCounterY + ') translate(' + (-x) + ',' + (-y) + ')');
    });

    // Animate counter-scale as inverse of layer scale
    newLayer.selectAll('text')
      .transition(t)
      .attrTween('transform', function() {
        const text = d3.select(this);
        const x = parseFloat(text.attr('x')) || 0;
        const y = parseFloat(text.attr('y')) || 0;
        return function(progress) {
          // Layer scale at this progress: lerp(startLayerScale, 1, progress)
          const layerSx = startLayerScaleX + (1 - startLayerScaleX) * progress;
          const layerSy = startLayerScaleY + (1 - startLayerScaleY) * progress;
          // Counter-scale is inverse of layer scale
          const sx = 1 / layerSx;
          const sy = 1 / layerSy;
          if (Math.abs(sx - 1) < 0.001 && Math.abs(sy - 1) < 0.001) return '';
          return 'translate(' + x + ',' + y + ') scale(' + sx + ',' + sy + ') translate(' + (-x) + ',' + (-y) + ')';
        };
      });

    if (direction === 'in') {
      // ZOOM IN: Old scales up toward bounds, new expands from bounds

      // Old layer: scale up so bounds fills screen
      oldLayer
        .transition(t)
        .attr('transform', 'translate(' + (-bounds.x * scaleX) + ',' + (-bounds.y * scaleY) + ') scale(' + scaleX + ',' + scaleY + ')')
        .style('opacity', 0)
        .remove();

      // New layer: start small at bounds position, expand to fill
      newLayer
        .attr('transform', 'translate(' + bounds.x + ',' + bounds.y + ') scale(' + invScaleX + ',' + invScaleY + ')')
        .style('opacity', 0)
        .transition(t)
        .attr('transform', 'translate(0,0) scale(1)')
        .style('opacity', 1);

    } else {
      // ZOOM OUT: Old shrinks to bounds, new scales down from enlarged state
      // Use top-left alignment: old view showed content at (0,0), so bounds should start there

      // Old layer: shrink so content at (0,0) ends up at bounds position
      oldLayer
        .transition(t)
        .attr('transform', 'translate(' + bounds.x + ',' + bounds.y + ') scale(' + invScaleX + ',' + invScaleY + ')')
        .style('opacity', 0)
        .remove();

      // New layer: start with bounds filling screen, animate to identity
      newLayer
        .attr('transform', 'translate(' + (-bounds.x * scaleX) + ',' + (-bounds.y * scaleY) + ') scale(' + scaleX + ',' + scaleY + ')')
        .transition(t)
        .attr('transform', 'translate(0,0) scale(1)');
    }
    return true;
  },

  // Getters for current state
  get prev() { return this._prev; },
  get curr() { return this._curr; },
  get clickedBounds() { return this._clickedBounds; },
  get duration() { return ZOOM_DURATION; }
};
`;

// src/dashboard-html.ts
function getLoadingContent() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Aperture Dashboard</title>
  <style>body { font-family: var(--vscode-font-family); padding: 20px; color: var(--vscode-foreground); background: var(--vscode-editor-background); }</style>
</head>
<body><h1>Aperture Dashboard</h1><p>Scanning workspace...</p></body>
</html>`;
}
function getErrorContent(message) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Aperture Dashboard</title>
  <style>body { font-family: var(--vscode-font-family); padding: 20px; color: var(--vscode-foreground); background: var(--vscode-editor-background); } .error { color: var(--vscode-errorForeground); }</style>
</head>
<body><h1>Aperture Dashboard</h1><p class="error">Error: ${message}</p></body>
</html>`;
}
function getDashboardContent(data, architectureIssues, ruleResult = null, codingStandardsExists2 = false) {
  const filesJson = JSON.stringify(data.files);
  const rootPath = JSON.stringify(data.root);
  const rulesJson = JSON.stringify(data.rules);
  const unsupportedCount = data.totals.unsupportedFiles;
  const codeIssues = data.files.flatMap((f) => f.issues || []);
  const allIssues = [...architectureIssues, ...codeIssues];
  const issuesJson = JSON.stringify(allIssues);
  const effectiveRuleResult = ruleResult || getEmptyParseResult();
  const ruleResultJson = JSON.stringify(effectiveRuleResult);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Aperture Dashboard</title>
  <script src="https://d3js.org/d3.v7.min.js"></script>
  <style>${DASHBOARD_STYLES}</style>
</head>
<body><header class="app-header">
    <div id="back-header" class="back-header hidden"></div>
    <button id="header-edit-btn" class="header-edit-btn" onclick="editCodingStandards()" style="display:none;">Edit Rules</button>
  </header>
  <div class="main-split">
    <div class="main-content">
      <div class="diagram-area">
        <div id="dep-container" class="dep-container">
          <div id="dep-chord" class="dep-chord"></div>
        </div>
        <div id="functions-container" class="functions-container">
          <div id="functions-chart"></div>
        </div>
        <div id="legend" class="legend"></div>
        <div id="dep-controls" class="dep-controls">
          <div class="dep-control-row">
            <label>Sort:</label>
            <select id="sort-mode" style="flex:1;padding:4px;background:var(--vscode-input-background);color:var(--vscode-input-foreground);border:1px solid var(--vscode-input-border);border-radius:3px;">
              <option value="used">Most Used</option>
              <option value="deps">Most Dependencies</option>
            </select>
          </div>
          <div class="dep-control-row">
            <label>Depth:</label>
            <input type="range" id="depth-slider" min="1" max="10" value="10">
            <span id="depth-value" class="slider-value">10</span>
          </div>
          <div class="dep-control-row">
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;"><input type="checkbox" id="show-orphans"> Show orphans</label>
          </div>
        </div>
      </div>
    </div>
    <div class="main-sidebar">
      <div id="dep-stats" class="dep-stats"></div>
      <div id="anti-patterns" class="anti-patterns">
        <div id="anti-pattern-list"></div>
      </div>
    </div>
  </div>
  <div class="tooltip" style="display:none;"></div>
  <div class="footer">
    <div id="footer-stats" class="footer-stats"></div>
    <div class="footer-input-container">
      <div id="ai-panel" class="ai-panel">
        <div id="chat-messages" class="chat-messages"></div>
        <div id="chat-actions" class="chat-actions">
          <div id="rules" class="rules"></div>
        </div>
        <div class="chat-footer">
          <div class="chat-usage">
            <div class="context-bar"><div id="context-bar-fill" class="context-bar-fill" style="width: 0%"></div></div>
            <span id="context-pct" class="context-pct"></span>
          </div>
        </div>
      </div>
      <div id="rules-warning-container" class="rules-warning-container"></div>
      <div class="ai-input-wrapper">
        <textarea id="query" placeholder="Ask about this codebase..." rows="1"></textarea>
        <button id="send" class="ai-send-btn"><svg viewBox="0 0 24 24"><path d="M12 19V5M5 12l7-7 7 7"/></svg></button>
      </div>
      <hr id="input-divider" class="input-divider">
      <div id="footer-context-row" class="footer-context-row">
        <div id="context-files" class="context-files"></div>
      </div>
    </div>
    ${unsupportedCount > 0 ? `<div id="footer-parsers" class="footer-parsers"><span class="footer-parsers-icon">\u26A0</span><span>Missing parsers:</span>${data.languageSupport.filter((l) => !l.isSupported).map((l) => '<span class="footer-lang">' + l.language + "</span>").join("")}</div>` : ""}
  </div>

<script>
const vscode = acquireVsCodeApi();
let files = ${filesJson};
const rootPath = ${rootPath};
const rules = ${rulesJson};
let issues = ${issuesJson};
let ruleResult = ${ruleResultJson};
let codingStandardsExists = ${codingStandardsExists2};

let currentView = 'treemap';
let depGraph = null;
let simulation = null;
let topGroups = [];
let selectedElement = null;
// ignoredIssues is defined in FILE_ISSUES_PANEL_SCRIPT
let activeRules = new Set();  // Set of pattern types added as rules

// Navigation state - managed by nav module but exposed as globals for renderer compatibility
let zoomedFile = null;
let zoomedFolder = null;
let prevZoomedFile = null;
let prevZoomedFolder = null;

// Build issue file map from all issues
const issueFileMap = new Map();
const severityRank = { high: 0, medium: 1, low: 2 };
for (const issue of issues) {
  for (const loc of issue.locations) {
    const existing = issueFileMap.get(loc.file);
    if (!existing || severityRank[issue.severity] < severityRank[existing]) {
      issueFileMap.set(loc.file, issue.severity);
    }
  }
}

${URI_SCRIPT}

${ZOOM_SCRIPT}

${BREADCRUMB_SCRIPT}

${TOOLTIP_SCRIPT}

${TREEMAP_NAV_SCRIPT}

${ISSUE_HIGHLIGHTS_SCRIPT}

${CHORD_SCRIPT}

${HIGHLIGHT_CORE_SCRIPT}

${PROMPT_UTILS_SCRIPT}

${FLYOUT_RENDERER_SCRIPT}

${SELECTION_STATE_SCRIPT}

${ISSUE_CONFIG_SCRIPT}

${ANTI_PATTERN_HANDLERS_SCRIPT}

${ANTI_PATTERN_PANEL_SCRIPT}

${FILE_ISSUES_PANEL_SCRIPT}

${CHAT_PANEL_SCRIPT}

${TREEMAP_CORE_SCRIPT}

${TREEMAP_AGGREGATION_SCRIPT}

${TREEMAP_RENDER_SCRIPT}

${TREEMAP_LABELS_SCRIPT}

${PARTITION_LAYOUT_SCRIPT}

${DISTRIBUTION_CHART_SCRIPT}

${CODE_PREVIEW_SCRIPT}

${COLOR_ANIMATION_SCRIPT}

${MESSAGE_HANDLERS_SCRIPT}

${EVENT_HANDLERS_SCRIPT}
</script>
</body>
</html>`;
}

// src/coding-standards-watcher.ts
init_esbuild_shim();
var vscode5 = __toESM(require("vscode"));
var path12 = __toESM(require("path"));
var CODING_STANDARDS_FILENAME = "coding-standards.md";
var watcher = null;
var currentCallback = null;
var bundledDefaultsPath = "";
function setBundledDefaultsPath(extPath) {
  bundledDefaultsPath = path12.join(extPath, "dist", "defaults", "coding-standards.md");
}
async function loadCodingStandards(workspaceRoot) {
  const filePath = vscode5.Uri.joinPath(vscode5.Uri.file(workspaceRoot), CODING_STANDARDS_FILENAME);
  try {
    const content = await vscode5.workspace.fs.readFile(filePath);
    const text = new TextDecoder().decode(content);
    return {
      result: parseCodingStandards(text),
      fileExists: true
    };
  } catch {
    return {
      result: getEmptyParseResult(),
      fileExists: false
    };
  }
}
function startWatching(workspaceRoot, onChange) {
  stopWatching();
  currentCallback = onChange;
  const pattern = new vscode5.RelativePattern(workspaceRoot, CODING_STANDARDS_FILENAME);
  watcher = vscode5.workspace.createFileSystemWatcher(pattern);
  const handleChange = async () => {
    const { result, fileExists } = await loadCodingStandards(workspaceRoot);
    currentCallback?.(result, fileExists);
  };
  watcher.onDidChange(handleChange);
  watcher.onDidCreate(handleChange);
  watcher.onDidDelete(handleChange);
}
function stopWatching() {
  watcher?.dispose();
  watcher = null;
  currentCallback = null;
}
function getCodingStandardsPath(workspaceRoot) {
  return vscode5.Uri.joinPath(vscode5.Uri.file(workspaceRoot), CODING_STANDARDS_FILENAME).fsPath;
}

// src/dashboard-panel.ts
var currentData = null;
var currentPanel = null;
var parserInitPromise = null;
var currentQueryController = null;
var currentRuleResult = null;
var codingStandardsExists = false;
function setParserInitPromise(promise) {
  parserInitPromise = promise;
}
async function openDashboard(context) {
  const panel = vscode6.window.createWebviewPanel(
    "apertureDashboard",
    "Aperture Dashboard",
    vscode6.ViewColumn.One,
    { enableScripts: true, retainContextWhenHidden: true }
  );
  currentPanel = panel;
  panel.webview.onDidReceiveMessage(
    async (message) => {
      if (message.command === "openFile") {
        try {
          let filePath;
          let line = null;
          if (message.uri) {
            const relativePath = getFilePath(message.uri);
            filePath = path13.join(currentData?.root || "", relativePath);
            line = getLineFromUri(message.uri) || message.line || null;
          } else {
            filePath = message.path;
            line = message.line || null;
          }
          const uri = vscode6.Uri.file(filePath);
          const options = {};
          if (line && line > 0) {
            const lineIndex = Math.max(0, line - 1);
            options.selection = new vscode6.Range(lineIndex, 0, lineIndex, 0);
          }
          await vscode6.commands.executeCommand("vscode.open", uri, options);
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Unknown error";
          vscode6.window.showErrorMessage(`Failed to open file: ${message.uri || message.path} - ${msg}`);
        }
      } else if (message.command === "abortQuery") {
        if (currentQueryController) {
          currentQueryController.abort();
          currentQueryController = null;
        }
      } else if (message.command === "query" && currentData) {
        if (currentQueryController) {
          currentQueryController.abort();
        }
        currentQueryController = new AbortController();
        const signal = currentQueryController.signal;
        try {
          const fileContents = {};
          if (message.context?.files) {
            for (const filePath of message.context.files) {
              const fullPath = path13.join(currentData.root, filePath);
              try {
                fileContents[filePath] = fs5.readFileSync(fullPath, "utf8");
              } catch {
              }
            }
          }
          const context2 = message.context ? {
            highlightedFiles: message.context.files || [],
            issues: message.context.issues || [],
            fileContents
          } : void 0;
          const promptPreview = buildPromptPreview(message.text, currentData.files, context2);
          panel.webview.postMessage({ type: "promptPreview", prompt: promptPreview });
          const response = await analyzeQuery(message.text, currentData.files, currentData.root, context2, signal);
          if (!signal.aborted) {
            panel.webview.postMessage({ type: "response", ...response });
          }
        } catch (error) {
          if (signal.aborted) {
            return;
          }
          const msg = error instanceof Error ? error.message : "Unknown error";
          panel.webview.postMessage({ type: "response", message: `Error: ${msg}`, relevantFiles: [] });
        } finally {
          currentQueryController = null;
        }
      } else if (message.command === "getDependencies" && currentData) {
        try {
          const graph = analyzeDependencies(currentData.files, currentData.root);
          const serializedGraph = {
            nodes: Array.from(graph.nodes.entries()).map(([path15, node]) => ({
              path: path15,
              imports: node.imports,
              importedBy: node.importedBy,
              importDetails: node.importDetails
            })),
            edges: graph.edges,
            issues: graph.issues,
            debug: debugInfo
          };
          panel.webview.postMessage({ type: "dependencyGraph", graph: serializedGraph });
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Unknown error";
          panel.webview.postMessage({ type: "dependencyError", message: msg });
        }
      } else if (message.command === "addRule") {
        await addAntiPatternRule(currentData?.root || "", message.patternType);
      } else if (message.command === "removeRule") {
        await removeAntiPatternRule(currentData?.root || "", message.patternType);
      } else if (message.command === "editCodingStandards" && currentData) {
        const filePath = getCodingStandardsPath(currentData.root);
        const uri = vscode6.Uri.file(filePath);
        await vscode6.commands.executeCommand("vscode.open", uri);
      } else if (message.command === "createCodingStandards" && currentData) {
        await createDefaultCodingStandards(currentData.root);
        const { result, fileExists } = await loadCodingStandards(currentData.root);
        currentRuleResult = result;
        codingStandardsExists = fileExists;
        const newThresholds = extractThresholds(result.rules);
        currentData = await scanWorkspace(true, newThresholds);
        const graph = analyzeDependencies(currentData.files, currentData.root);
        const allIssues = [
          ...currentData.files.flatMap((f) => f.issues || []),
          ...graph.issues
        ];
        panel.webview.postMessage({
          type: "dataUpdated",
          files: currentData.files,
          issues: allIssues,
          ruleResult: currentRuleResult,
          fileExists: codingStandardsExists
        });
      } else if (message.command === "getCodePreview" && currentData) {
        try {
          const relativePath = getFilePath(message.uri);
          const filePath = path13.join(currentData.root, relativePath);
          const startLine = message.startLine || 1;
          const endLine = message.endLine || startLine + 50;
          const content = fs5.readFileSync(filePath, "utf8");
          const lines = content.split("\n").slice(startLine - 1, endLine);
          panel.webview.postMessage({
            type: "codePreview",
            uri: message.uri,
            code: lines.join("\n"),
            startLine
          });
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Could not read file";
          panel.webview.postMessage({
            type: "codePreview",
            uri: message.uri,
            error: msg
          });
        }
      } else if (message.command === "countTokens" && currentData) {
        const fileContents = {};
        if (message.context?.files) {
          for (const filePath of message.context.files) {
            const fullPath = path13.join(currentData.root, filePath);
            try {
              fileContents[filePath] = fs5.readFileSync(fullPath, "utf8");
            } catch {
            }
          }
        }
        const context2 = message.context ? {
          highlightedFiles: message.context.files || [],
          issues: message.context.issues || [],
          fileContents
        } : void 0;
        const apiKey = getApiKey2();
        let result;
        if (apiKey) {
          try {
            const client = new Anthropic({ apiKey });
            result = await countPromptTokens(message.text, context2, client);
            const systemPrompt = buildSystemPrompt(context2);
            const totalChars = systemPrompt.length + message.text.length;
            calibrateRatio(totalChars, result.tokens);
          } catch {
            result = estimatePromptTokens(message.text, context2);
          }
        } else {
          result = estimatePromptTokens(message.text, context2);
        }
        const { getObservedRatio: getObservedRatio2 } = await Promise.resolve().then(() => (init_prompt_builder(), prompt_builder_exports));
        panel.webview.postMessage({
          type: "tokenCount",
          promptId: message.promptId,
          tokens: result.tokens,
          limit: result.limit,
          charsPerToken: getObservedRatio2()
        });
      } else if (message.command === "refresh" && currentData) {
        const { result, fileExists } = await loadCodingStandards(currentData.root);
        currentRuleResult = result;
        codingStandardsExists = fileExists;
        const refreshThresholds = extractThresholds(result.rules);
        currentData = await scanWorkspace(fileExists, refreshThresholds);
        const graph = analyzeDependencies(currentData.files, currentData.root);
        const allIssues = fileExists ? [...currentData.files.flatMap((f) => f.issues || []), ...graph.issues] : [];
        panel.webview.postMessage({
          type: "dataUpdated",
          files: currentData.files,
          issues: allIssues,
          ruleResult: result,
          fileExists
        });
      }
    },
    void 0,
    context.subscriptions
  );
  panel.webview.html = getLoadingContent();
  const startupApiKey = getApiKey2();
  if (startupApiKey) {
    const client = new Anthropic({ apiKey: startupApiKey });
    const calibrationText = "function example() { return 42; }";
    const calibrationSystem = "You are a code analyzer.";
    client.messages.countTokens({
      model: "claude-sonnet-4-20250514",
      system: calibrationSystem,
      messages: [{ role: "user", content: calibrationText }]
    }).then((result) => {
      const chars = calibrationText.length + calibrationSystem.length;
      calibrateRatio(chars, result.input_tokens);
    }).catch(() => {
    });
  }
  panel.onDidDispose(() => {
    stopWatching();
    currentPanel = null;
  });
  try {
    if (parserInitPromise) {
      await parserInitPromise;
    }
    const workspaceFolder = vscode6.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      throw new Error("No workspace folder open");
    }
    const ruleData = await loadCodingStandards(workspaceFolder.uri.fsPath);
    currentRuleResult = ruleData.result;
    codingStandardsExists = ruleData.fileExists;
    const thresholds = extractThresholds(currentRuleResult.rules);
    currentData = await scanWorkspace(codingStandardsExists, thresholds);
    startWatching(currentData.root, async (result, fileExists) => {
      try {
        console.log("coding-standards.md changed, re-scanning...");
        currentRuleResult = result;
        codingStandardsExists = fileExists;
        const updatedThresholds = extractThresholds(result.rules);
        currentData = await scanWorkspace(fileExists, updatedThresholds);
        const graph2 = analyzeDependencies(currentData.files, currentData.root);
        const allIssues = fileExists ? [...currentData.files.flatMap((f) => f.issues || []), ...graph2.issues] : [];
        panel.webview.postMessage({
          type: "dataUpdated",
          files: currentData.files,
          issues: allIssues,
          ruleResult: result,
          fileExists
        });
        console.log("Re-scan complete, UI updated");
      } catch (err2) {
        console.error("Error during re-scan:", err2);
      }
    });
    const graph = analyzeDependencies(currentData.files, currentData.root);
    const depIssues = codingStandardsExists ? graph.issues : [];
    panel.webview.html = getDashboardContent(currentData, depIssues, currentRuleResult, codingStandardsExists);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    panel.webview.html = getErrorContent(message);
  }
}
var extensionPath = "";
function setExtensionPath(extPath) {
  extensionPath = extPath;
}
async function createDefaultCodingStandards(workspaceRoot) {
  const bundledDefaultsPath2 = path13.join(extensionPath, "dist", "defaults", "coding-standards.md");
  let defaultContent;
  try {
    defaultContent = fs5.readFileSync(bundledDefaultsPath2, "utf8");
  } catch {
    defaultContent = `# Coding Standards

## Functions
- Functions should not exceed 20 lines (warning) or 50 lines (error)
- Functions should start with a verb (get, set, handle, process, etc.)
- Avoid deep nesting beyond 4 levels

## Naming
- Avoid generic names: data, result, temp, item, value, obj, ret, res, tmp, info, stuff
- Boolean variables should be named as questions: is*, has*, can*, should*, will*

## Files
- Files should not exceed 200 lines
- Each file should have at least one incoming dependency (no orphans)
- Avoid circular dependencies

## Error Handling
- Never use empty catch/except blocks (silent failures)

## Comments
- Remove commented-out code
- Comments should explain why, not what
`;
  }
  const filePath = getCodingStandardsPath(workspaceRoot);
  await vscode6.workspace.fs.writeFile(
    vscode6.Uri.file(filePath),
    new TextEncoder().encode(defaultContent)
  );
}
function getApiKey2() {
  const config = vscode6.workspace.getConfiguration("aperture");
  const configKey = config.get("anthropicApiKey");
  if (configKey) {
    return configKey;
  }
  return process.env.ANTHROPIC_API_KEY;
}

// src/extension.ts
function activate(context) {
  console.log("Aperture extension is now active");
  setExtensionPath(context.extensionPath);
  setBundledDefaultsPath(context.extensionPath);
  languageRegistry.register(new TypeScriptHandler());
  languageRegistry.register(new LuaHandler());
  const wasmDir = path14.join(context.extensionPath, "dist");
  const parserPromise = initializeParser(wasmDir).catch((err2) => {
    console.error("AST parser initialization failed:", err2);
  });
  setParserInitPromise(parserPromise);
  const disposable = vscode7.commands.registerCommand("aperture.openDashboard", async () => {
    await openDashboard(context);
  });
  context.subscriptions.push(disposable);
}
function deactivate() {
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
