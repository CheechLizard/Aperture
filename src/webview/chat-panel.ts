export const CHAT_PANEL_SCRIPT = `
// AI Chat panel - shown when input is focused
const aiPanel = document.getElementById('ai-panel');
const queryInput = document.getElementById('query');
const chatMessages = document.getElementById('chat-messages');
let aiInputFocused = false;

function showAiPanel() {
  aiPanel.classList.add('visible');
}

function hideAiPanel() {
  // Only hide if no chat messages AND input not focused
  if (chatMessages.children.length === 0 && !aiInputFocused) {
    aiPanel.classList.remove('visible');
  }
}

function isAiInputFocused() {
  return aiInputFocused;
}

queryInput.addEventListener('focus', () => {
  aiInputFocused = true;
  showAiPanel();
});

queryInput.addEventListener('blur', () => {
  aiInputFocused = false;
});

// Close panel when clicking outside
document.addEventListener('mousedown', (e) => {
  const footer = document.querySelector('.footer');
  const panel = document.getElementById('ai-panel');
  // If clicking outside footer and panel, hide after a short delay to allow blur to fire
  if (!footer.contains(e.target) && !panel.contains(e.target)) {
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
