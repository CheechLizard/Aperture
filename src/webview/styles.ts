export const DASHBOARD_STYLES = `
    *, *::before, *::after { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); background: var(--vscode-editor-background); }
    /* App Header */
    .app-header { display: flex; align-items: center; justify-content: center; margin: 0; padding: 12px 20px; gap: 12px; border-bottom: 1px solid var(--vscode-widget-border); position: relative; }
    .back-header { position: absolute; left: 20px; display: flex; align-items: center; gap: 8px; }
    .header-center { position: relative; }
    .ai-input-wrapper { display: flex; align-items: center; background: var(--vscode-input-background); border: 1px solid var(--vscode-input-border); border-radius: 6px; padding: 5px 5px 5px 0; }
    .ai-input-wrapper:focus-within { border-color: var(--vscode-focusBorder); }
    .ai-input-wrapper input { width: 520px; padding: 5px 14px; margin: 0; background: transparent; border: none; color: var(--vscode-input-foreground); font-size: 14px; line-height: 1; outline: none; }
    .ai-input-actions { display: flex; align-items: center; gap: 8px; }
    .context-pie { width: 24px; height: 24px; border-radius: 50%; background: conic-gradient(#bbb 0% 0%, #555 0% 100%); flex-shrink: 0; }
    .ai-send-btn { width: 28px; height: 28px; margin: 0; padding: 0; border-radius: 5px; border: none; background: var(--vscode-button-background); color: var(--vscode-button-foreground); cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .ai-send-btn:hover { background: var(--vscode-button-hoverBackground); }
    .ai-send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    /* Context Files Chips */
    .context-files { display: flex; flex-wrap: nowrap; gap: 6px; margin-bottom: 10px; overflow: hidden; }
    .context-files:empty { display: none; }
    .context-chip { display: inline-flex; align-items: center; gap: 4px; padding: 3px 6px 3px 8px; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 4px; font-size: 0.75em; color: var(--vscode-foreground); flex-shrink: 0; }
    .context-chip-name { max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .context-chip-remove { display: flex; align-items: center; justify-content: center; width: 14px; height: 14px; padding: 0; margin: 0; border: none; background: transparent; color: var(--vscode-descriptionForeground); cursor: pointer; border-radius: 3px; font-size: 12px; line-height: 1; }
    .context-chip-remove:hover { background: rgba(255, 255, 255, 0.15); color: var(--vscode-foreground); }
    .context-chip-more { padding: 3px 8px; background: transparent; border: 1px dashed rgba(255, 255, 255, 0.2); color: var(--vscode-descriptionForeground); }
    /* AI Dropdown Panel */
    .ai-dropdown { position: absolute; top: 100%; left: 0; right: 0; margin-top: 4px; background: rgba(30, 30, 30, 0.85); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: none; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); padding: 12px; display: none; z-index: 50; max-height: 300px; overflow-y: auto; }
    .ai-dropdown.visible { display: block; }
    .ai-response { padding: 12px; background: rgba(255, 255, 255, 0.05); border-radius: 4px; white-space: pre-wrap; display: none; font-size: 0.9em; line-height: 1.5; }
    .ai-response.visible { display: block; }
    .ai-dropdown .clear-btn { display: none; margin-top: 8px; padding: 4px 10px; font-size: 0.8em; background: transparent; border: 1px solid var(--vscode-widget-border); color: var(--vscode-foreground); border-radius: 4px; cursor: pointer; }
    .ai-dropdown .clear-btn.visible { display: inline-block; }
    .footer { display: flex; justify-content: space-between; align-items: center; padding: 10px 20px; border-top: 1px solid var(--vscode-widget-border); font-size: 0.8em; color: var(--vscode-descriptionForeground); }
    .footer-stats { display: flex; gap: 16px; align-items: center; }
    .footer-stat { display: inline-flex; gap: 4px; align-items: baseline; }
    .footer-stat strong { color: var(--vscode-textLink-foreground); font-size: 1.1em; }
    .footer-warning { display: flex; align-items: center; gap: 8px; padding: 6px 10px; background: rgba(204, 167, 0, 0.15); border: 1px solid rgba(204, 167, 0, 0.4); border-radius: 4px; }
    .footer-warning-icon { color: var(--vscode-editorWarning-foreground, #cca700); font-size: 1em; }
    .footer-warning-text { color: var(--vscode-editorWarning-foreground, #cca700); margin-right: 4px; }
    .footer-lang { padding: 2px 6px; background: rgba(204, 167, 0, 0.25); border-radius: 3px; color: var(--vscode-editorWarning-foreground, #cca700); font-size: 0.9em; }
    #treemap { width: 100%; flex: 1; min-height: 0; }
    .node { stroke: var(--vscode-editor-background); stroke-width: 1px; cursor: pointer; transition: opacity 0.2s; }
    .node:hover { stroke: var(--vscode-focusBorder); stroke-width: 2px; }
    .node.highlighted { }
    .tooltip { position: absolute; background: var(--vscode-editorWidget-background); border: 1px solid var(--vscode-widget-border); padding: 8px; font-size: 12px; pointer-events: none; z-index: 100; }
    .thinking { display: flex; align-items: center; gap: 10px; padding: 12px; }
    .thinking-spinner { width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.2); border-top-color: var(--vscode-textLink-foreground); border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .rules { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
    .rule-btn { padding: 6px 14px; font-size: 0.85em; background: rgba(255, 255, 255, 0.1); color: var(--vscode-foreground); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 4px; cursor: pointer; transition: background 0.15s; }
    .rule-btn:hover { background: rgba(255, 255, 255, 0.2); }
    .dir-header { fill: rgba(30,30,30,0.95); pointer-events: none; }
    .dir-label { font-size: 11px; font-weight: bold; fill: #fff; pointer-events: none; text-transform: uppercase; letter-spacing: 0.5px; }
    .dir-label-sub { font-size: 9px; fill: #aaa; pointer-events: none; text-transform: uppercase; }
    .legend { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 10px; }
    .legend-item { display: flex; align-items: center; gap: 5px; font-size: 0.8em; color: var(--vscode-foreground); }
    .legend-swatch { width: 12px; height: 12px; }
    /* Back header in app header */
    .back-header.hidden { display: none; }
    .back-btn { background: none; border: none; color: var(--vscode-textLink-foreground); cursor: pointer; font-size: 0.9em; padding: 4px 8px; border-radius: 3px; display: flex; align-items: center; gap: 6px; }
    .back-btn:hover { background: var(--vscode-list-hoverBackground); }
    .back-path { font-size: 0.85em; color: var(--vscode-descriptionForeground); }
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
    .main-split { display: flex; gap: 16px; height: calc(100vh - 140px); padding: 0 20px 12px 20px; }
    .main-content { flex: 3; display: flex; flex-direction: column; position: relative; }
    .main-sidebar { flex: 1; min-width: 250px; max-width: 320px; overflow-y: auto; border-left: 1px solid var(--vscode-panel-border, #444); padding-left: 12px; }
    .diagram-area { flex: 1; position: relative; min-height: 0; overflow: hidden; display: flex; flex-direction: column; }
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
    .status-btn { display: block; width: 100%; padding: 10px 12px; margin-bottom: 8px; border-radius: 4px; font-size: 0.85em; font-weight: 600; cursor: pointer; background: rgba(150, 150, 150, 0.15); border: none; border-left: 3px solid #888; color: var(--vscode-foreground); text-align: left; }
    .status-btn:hover { opacity: 0.9; }
    .status-btn:empty { display: none; }
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
    .pattern-item-desc { color: var(--vscode-foreground); line-height: 1.3; margin-bottom: 4px; }
    .pattern-item-file { font-size: 0.9em; color: var(--vscode-textLink-foreground); }
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
    .functions-container { display: none; width: 100%; flex: 1; min-height: 0; flex-direction: column; }
    .functions-container.visible { display: flex; }
    #functions-chart { width: 100%; flex: 1; min-height: 0; }
    .functions-empty { padding: 16px; text-align: center; color: var(--vscode-descriptionForeground); }

    /* Zoom Header - positioned absolutely to left */
    .zoom-header { position: absolute; left: 0; display: flex; align-items: center; gap: 8px; padding: 6px 10px; background: var(--vscode-editor-inactiveSelectionBackground); border-radius: 4px; }
    .zoom-back { background: none; border: none; color: var(--vscode-textLink-foreground); cursor: pointer; font-size: 1.1em; padding: 4px 8px; border-radius: 3px; }
    .zoom-back:hover { background: var(--vscode-list-hoverBackground); }
    .zoom-path { font-weight: 600; font-size: 0.9em; }
    /* SVG file header for L2 */
    .file-header { fill: rgba(30,30,30,0.95); pointer-events: none; }
    .file-header-label { font-size: 11px; font-weight: bold; fill: #fff; pointer-events: none; text-transform: uppercase; letter-spacing: 0.5px; }
`;
