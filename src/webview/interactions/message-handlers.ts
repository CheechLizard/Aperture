export const MESSAGE_HANDLERS_SCRIPT = `
// Message handlers for AI interaction and extension communication

document.getElementById('send').addEventListener('click', () => {
  const input = document.getElementById('query');
  const text = input.value.trim();
  if (!text) return;
  document.getElementById('send').disabled = true;
  input.value = '';

  // Get context from selection state
  const context = selection.getAIContext();
  const chatMessages = document.getElementById('chat-messages');
  const panel = document.getElementById('ai-panel');

  // Show panel
  panel.classList.add('visible');

  // Render thinking bubble (prompt preview will be inserted before this)
  const thinkingMsg = document.createElement('div');
  thinkingMsg.className = 'ai-message thinking';
  thinkingMsg.id = 'thinking-bubble';
  thinkingMsg.innerHTML = '<div class="thinking-spinner"></div><span>Analyzing...</span><button class="thinking-abort" title="Cancel">×</button>';
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

window.addEventListener('message', event => {
  const msg = event.data;
  if (msg.type === 'thinking') {
    // Thinking is now handled inline in send handler
  } else if (msg.type === 'promptPreview') {
    // Show the actual prompt being sent to the API
    const chatMessages = document.getElementById('chat-messages');
    const thinkingBubble = document.getElementById('thinking-bubble');

    const promptMsg = document.createElement('div');
    promptMsg.className = 'user-message debug';
    promptMsg.innerHTML = '<pre style="margin:0;font-size:0.7em;white-space:pre-wrap;word-break:break-all;color:#ccc;">' +
      msg.prompt.replace(/</g, '&lt;').replace(/>/g, '&gt;') +
      '</pre>';

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
    chatMessages.appendChild(aiMsg);

    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;

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

    // Update context pie chart with actual usage
    if (msg.usage) {
      const pct = Math.min(100, Math.round((msg.usage.totalTokens / msg.usage.contextLimit) * 100));
      const pie = document.getElementById('context-pie');
      if (pie) {
        pie.style.background = 'conic-gradient(#bbb 0% ' + pct + '%, #555 ' + pct + '% 100%)';
        pie.title = msg.usage.totalTokens.toLocaleString() + ' / ' + msg.usage.contextLimit.toLocaleString() + ' tokens (' + pct + '%)';
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
    document.getElementById('status').textContent = 'Error: ' + msg.message;
  } else if (msg.type === 'tokenCount') {
    // Handle token count response for prompt costing
    handleTokenCount(msg.promptId, msg.tokens, msg.limit);
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
