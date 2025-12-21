export const CHAT_PANEL_SCRIPT = `
// Chat panel collapse/expand
const chatPanel = document.getElementById('chat-panel');
const chatCollapseBtn = document.getElementById('chat-collapse');
const chatHeader = document.getElementById('chat-header');

chatCollapseBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  const isCollapsed = chatPanel.classList.toggle('collapsed');
  chatCollapseBtn.textContent = isCollapsed ? '+' : '−';
});

// Chat panel drag functionality
let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;

chatHeader.addEventListener('mousedown', (e) => {
  if (e.target === chatCollapseBtn) return;
  isDragging = true;
  const rect = chatPanel.getBoundingClientRect();
  dragOffsetX = e.clientX - rect.left;
  dragOffsetY = e.clientY - rect.top;
  chatPanel.style.transition = 'none';
});

document.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  const x = e.clientX - dragOffsetX;
  const y = e.clientY - dragOffsetY;
  const maxX = window.innerWidth - chatPanel.offsetWidth;
  const maxY = window.innerHeight - chatPanel.offsetHeight;
  chatPanel.style.left = Math.max(0, Math.min(x, maxX)) + 'px';
  chatPanel.style.top = Math.max(0, Math.min(y, maxY)) + 'px';
  chatPanel.style.right = 'auto';
  chatPanel.style.bottom = 'auto';
});

document.addEventListener('mouseup', () => {
  if (isDragging) {
    isDragging = false;
    chatPanel.style.transition = '';
  }
});
`;
