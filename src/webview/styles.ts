export const DASHBOARD_STYLES = `
    body { font-family: var(--vscode-font-family); padding: 12px 20px; color: var(--vscode-foreground); background: var(--vscode-editor-background); margin: 0; }
    .footer { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-top: 1px solid var(--vscode-widget-border); margin-top: 12px; font-size: 0.8em; color: var(--vscode-descriptionForeground); }
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
    .chat-panel { position: fixed; bottom: 60px; right: 20px; width: 400px; max-width: calc(100vw - 40px); background: var(--vscode-editorWidget-background); border: 1px solid var(--vscode-widget-border); border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 50; }
    .chat-panel.collapsed .chat-body { display: none; }
    .chat-panel.collapsed { width: auto; }
    .chat-header { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: var(--vscode-titleBar-activeBackground); border-radius: 8px 8px 0 0; cursor: move; user-select: none; }
    .chat-panel.collapsed .chat-header { border-radius: 8px; }
    .chat-title { font-weight: 600; font-size: 0.9em; }
    .chat-collapse-btn { background: none; border: none; color: var(--vscode-foreground); cursor: pointer; font-size: 1.2em; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 4px; }
    .chat-collapse-btn:hover { background: var(--vscode-toolbar-hoverBackground); }
    .chat-body { padding: 12px; max-height: 300px; overflow-y: auto; }
    .chat-input { display: flex; gap: 10px; margin-bottom: 10px; }
    .chat-input input { flex: 1; padding: 8px; background: var(--vscode-input-background); border: 1px solid var(--vscode-input-border); color: var(--vscode-input-foreground); }
    .chat-input button { padding: 8px 16px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; cursor: pointer; }
    .chat-input button:hover { background: var(--vscode-button-hoverBackground); }
    .chat-input button:disabled { opacity: 0.5; cursor: not-allowed; }
    .response { padding: 10px; background: var(--vscode-editor-inactiveSelectionBackground); border-radius: 4px; white-space: pre-wrap; }
    .thinking { display: inline-block; } .thinking::after { content: ''; animation: dots 1.5s infinite; } @keyframes dots { 0%, 20% { content: '.'; } 40% { content: '..'; } 60%, 100% { content: '...'; } }
    .clear-btn { margin-left: 10px; padding: 4px 8px; font-size: 0.8em; background: transparent; border: 1px solid var(--vscode-widget-border); color: var(--vscode-foreground); cursor: pointer; }
    .rules { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
    .rule-btn { padding: 4px 10px; font-size: 0.75em; background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); border: none; border-radius: 3px; cursor: pointer; }
    .rule-btn:hover { background: var(--vscode-button-secondaryHoverBackground); }
    .dir-header { fill: rgba(30,30,30,0.95); pointer-events: none; }
    .dir-label { font-size: 11px; font-weight: bold; fill: #fff; pointer-events: none; text-transform: uppercase; letter-spacing: 0.5px; }
    .dir-label-sub { font-size: 9px; fill: #aaa; pointer-events: none; text-transform: uppercase; }
    .legend { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 10px; }
    .legend-item { display: flex; align-items: center; gap: 5px; font-size: 0.8em; color: var(--vscode-foreground); }
    .legend-swatch { width: 12px; height: 12px; }
    /* Back header in visualization area - always reserve space to prevent layout shift */
    .back-header { display: flex; align-items: center; gap: 8px; padding: 8px 0; margin-bottom: 8px; min-height: 32px; }
    .back-header.hidden { visibility: hidden; }
    .back-btn { background: none; border: none; color: var(--vscode-textLink-foreground); cursor: pointer; font-size: 1.1em; padding: 4px 8px; border-radius: 3px; display: flex; align-items: center; gap: 6px; }
    .back-btn:hover { background: var(--vscode-list-hoverBackground); }
    .back-path { font-weight: 600; font-size: 0.9em; color: var(--vscode-foreground); }
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
    .main-split { display: flex; gap: 16px; height: calc(100vh - 100px); }
    .main-content { flex: 3; display: flex; flex-direction: column; position: relative; }
    .main-sidebar { flex: 1; min-width: 250px; max-width: 320px; overflow-y: auto; border-left: 1px solid var(--vscode-panel-border, #444); }
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
