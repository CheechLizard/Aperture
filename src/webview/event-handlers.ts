export const EVENT_HANDLERS_SCRIPT = `
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

  // Render user message bubble
  const userMsg = document.createElement('div');
  userMsg.className = 'user-message';
  let userHtml = '<div class="user-message-text">' + text.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</div>';
  if (context.files && context.files.length > 0) {
    const fileNames = context.files.slice(0, 3).map(f => f.split('/').pop());
    const moreCount = context.files.length - 3;
    userHtml += '<div class="user-message-files">';
    userHtml += fileNames.map(f => '<span class="user-message-file">' + f + '</span>').join('');
    if (moreCount > 0) userHtml += '<span class="user-message-file">+' + moreCount + ' more</span>';
    userHtml += '</div>';
  }
  userMsg.innerHTML = userHtml;
  chatMessages.appendChild(userMsg);

  // Render thinking bubble
  const thinkingMsg = document.createElement('div');
  thinkingMsg.className = 'ai-message thinking';
  thinkingMsg.id = 'thinking-bubble';
  thinkingMsg.innerHTML = '<div class="thinking-spinner"></div><span>Analyzing...</span>';
  chatMessages.appendChild(thinkingMsg);

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

window.addEventListener('message', event => {
  const msg = event.data;
  if (msg.type === 'thinking') {
    // Thinking is now handled inline in send handler
  } else if (msg.type === 'response') {
    document.getElementById('send').disabled = false;
    const chatMessages = document.getElementById('chat-messages');

    // Remove thinking bubble
    const thinkingBubble = document.getElementById('thinking-bubble');
    if (thinkingBubble) thinkingBubble.remove();

    // Add AI response bubble
    const aiMsg = document.createElement('div');
    aiMsg.className = 'ai-message';
    aiMsg.textContent = msg.message;
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
  }
});

// Initialize with files treemap view (default state)
colorMode = 'none';

// Initialize navigation to files view
nav.goTo({ view: 'files', file: null });
renderDynamicPrompts();
renderIssues();
renderFooterStats();

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

// Status button click - highlight all files with any issue, reset to default view
document.getElementById('status').addEventListener('click', () => {
  if (selectedElement) {
    selectedElement.style.borderLeftColor = '';
    selectedElement.style.background = '';
  }
  const statusBtn = document.getElementById('status');
  selectedElement = statusBtn;

  // Reset to default state - select all issues
  colorMode = 'none';
  selection.selectAllIssues();

  // Navigate to files view
  nav.goTo({ view: 'files', file: null });
});

function updateStatus() {
  const statusBtn = document.getElementById('status');
  const issueFiles = getAllIssueFiles();
  const totalFiles = files.length;
  const totalFunctions = files.reduce((sum, f) => sum + (f.functions ? f.functions.length : 0), 0);
  const totalLoc = files.reduce((sum, f) => sum + (f.loc || 0), 0);

  let statsHtml = '<span class="status-stats">' + totalFiles.toLocaleString() + ' files · ' + totalFunctions.toLocaleString() + ' functions · ' + totalLoc.toLocaleString() + ' LOC</span>';

  if (issueFiles.length > 0) {
    statusBtn.innerHTML = statsHtml + ' · <strong>' + issueFiles.length + ' with issues</strong>';
  } else {
    statusBtn.innerHTML = statsHtml + ' · <span style="opacity:0.7">No issues</span>';
  }
}
`;
