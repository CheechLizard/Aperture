export const CHAT_PANEL_SCRIPT = `
// AI Dropdown panel - shown when input is focused
const aiDropdown = document.getElementById('ai-dropdown');
const queryInput = document.getElementById('query');
const responseEl = document.getElementById('response');
const clearBtn = document.getElementById('clear');

function showAiDropdown() {
  aiDropdown.classList.add('visible');
}

function hideAiDropdown() {
  // Only hide if no response is showing
  if (!responseEl.classList.contains('visible')) {
    aiDropdown.classList.remove('visible');
  }
}

queryInput.addEventListener('focus', showAiDropdown);

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
  const headerCenter = document.querySelector('.header-center');
  if (!headerCenter.contains(e.target)) {
    hideAiDropdown();
  }
});

// Close with Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && aiDropdown.classList.contains('visible')) {
    queryInput.blur();
    hideAiDropdown();
  }
});

clearBtn.addEventListener('click', () => {
  responseEl.classList.remove('visible');
  responseEl.textContent = '';
  clearBtn.classList.remove('visible');
  updateHighlights([]);
  hideAiDropdown();
});
`;
