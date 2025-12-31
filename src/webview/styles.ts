export const DASHBOARD_STYLES = `
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
    .user-message-file::before { content: '📎'; font-size: 0.9em; }
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
    .functions-container { display: none; position: relative; width: 100%; flex: 1; min-height: 0; flex-direction: column; margin: 0; padding: 0; isolation: isolate; }
    .functions-container.visible { display: flex; }
    #functions-chart { width: 100%; flex: 1; min-height: 0; margin: 0; padding: 0; overflow-y: auto; overscroll-behavior: contain; }
    .functions-empty { padding: 16px; text-align: center; color: var(--vscode-descriptionForeground); }
    /* Scroll edge indicators for off-screen highlighted items */
    .scroll-indicator { position: absolute; left: 50%; z-index: 1; display: flex; align-items: center; gap: 4px; padding: 2px 10px; background: rgba(255, 255, 255, 0.9); color: #000; font-size: 10px; font-weight: 600; cursor: pointer; white-space: nowrap; border-radius: 10px; opacity: 0; pointer-events: none; transition: opacity 0.3s ease, transform 0.3s ease; }
    .scroll-indicator.visible { opacity: 1; pointer-events: auto; }
    .scroll-indicator.top { top: 4px; transform: translateX(-50%) translateY(-10px); }
    .scroll-indicator.top.visible { transform: translateX(-50%) translateY(0); }
    .scroll-indicator.bottom { bottom: 4px; transform: translateX(-50%) translateY(10px); }
    .scroll-indicator.bottom.visible { transform: translateX(-50%) translateY(0); }
    .scroll-indicator:hover { background: #fff; }
    .scroll-indicator svg { width: 10px; height: 10px; fill: none; stroke: currentColor; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; }

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
    .partition-node { stroke: var(--vscode-editor-background); stroke-width: 1px; cursor: pointer; }
    .partition-node:hover { stroke: var(--vscode-focusBorder); stroke-width: 2px; }
    .partition-label { cursor: pointer; }
    .partition-leader { pointer-events: none; }
    .partition-nesting { stroke: var(--vscode-editor-background); stroke-width: 1px; cursor: pointer; }
    .partition-nesting:hover { stroke: var(--vscode-focusBorder); stroke-width: 2px; }
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
