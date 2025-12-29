/**
 * Flyout renderer for displaying file lists in webview
 */

export const FLYOUT_RENDERER_SCRIPT = `
// Show flyout with all files
function showFilesFlyout(files, anchorEl) {
  // Remove existing flyout
  const existing = document.getElementById('files-flyout');
  if (existing) existing.remove();

  const flyout = document.createElement('div');
  flyout.id = 'files-flyout';
  flyout.className = 'files-flyout';

  const header = document.createElement('div');
  header.className = 'files-flyout-header';
  header.innerHTML = '<span>' + files.length + ' files in context</span><button class="files-flyout-close">×</button>';
  flyout.appendChild(header);

  const list = document.createElement('div');
  list.className = 'files-flyout-list';
  list.innerHTML = files.map(filePath => {
    const fileName = filePath.split('/').pop();
    return '<div class="files-flyout-item" data-path="' + filePath + '" title="' + filePath + '">' +
      '<span>' + fileName + '</span>' +
      '<button class="files-flyout-remove">×</button>' +
      '</div>';
  }).join('');
  flyout.appendChild(list);

  // Position flyout above the button
  const rect = anchorEl.getBoundingClientRect();
  flyout.style.bottom = (window.innerHeight - rect.top + 8) + 'px';
  flyout.style.left = rect.left + 'px';

  document.body.appendChild(flyout);

  // Close button handler
  flyout.querySelector('.files-flyout-close').addEventListener('click', () => flyout.remove());

  // Remove file handlers
  flyout.querySelectorAll('.files-flyout-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const item = btn.closest('.files-flyout-item');
      const filePath = item.getAttribute('data-path');
      selection.removeFile(filePath);
      item.remove();
      // Update header count
      const remaining = flyout.querySelectorAll('.files-flyout-item').length;
      if (remaining === 0) {
        flyout.remove();
      } else {
        flyout.querySelector('.files-flyout-header span').textContent = remaining + ' files in context';
      }
    });
  });

  // Click outside to close
  const closeOnOutsideClick = (e) => {
    if (!flyout.contains(e.target) && e.target !== anchorEl) {
      flyout.remove();
      document.removeEventListener('mousedown', closeOnOutsideClick);
    }
  };
  setTimeout(() => document.addEventListener('mousedown', closeOnOutsideClick), 10);
}
`;
