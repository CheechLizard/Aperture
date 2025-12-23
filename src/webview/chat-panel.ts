export const CHAT_PANEL_SCRIPT = `
// AI Chat panel - shown when input is focused
const aiPanel = document.getElementById('ai-panel');
const queryInput = document.getElementById('query');
const chatMessages = document.getElementById('chat-messages');

function showAiPanel() {
  aiPanel.classList.add('visible');
}

function hideAiPanel() {
  // Only hide if no chat messages
  if (chatMessages.children.length === 0) {
    aiPanel.classList.remove('visible');
  }
}

queryInput.addEventListener('focus', showAiPanel);

// Close panel when clicking outside
document.addEventListener('click', (e) => {
  const footer = document.querySelector('.footer');
  const panel = document.getElementById('ai-panel');
  if (!footer.contains(e.target) && !panel.contains(e.target)) {
    hideAiPanel();
  }
});

// Close with Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && aiPanel.classList.contains('visible')) {
    queryInput.blur();
    hideAiPanel();
  }
});
`;
