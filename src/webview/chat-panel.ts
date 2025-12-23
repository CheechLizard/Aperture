export const CHAT_PANEL_SCRIPT = `
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
