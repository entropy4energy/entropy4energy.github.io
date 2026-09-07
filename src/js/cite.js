// Adds a "Copy" button to each BibTeX record on the Publications page.
// The records are plain <pre> text and work without this script.
(() => {
  if (!navigator.clipboard) return;
  for (const pre of document.querySelectorAll('.publication-bibtex')) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'publication-copy';
    button.textContent = 'Copy';
    button.addEventListener('click', () => {
      navigator.clipboard.writeText(pre.textContent).then(() => {
        button.textContent = 'Copied';
        setTimeout(() => { button.textContent = 'Copy'; }, 1500);
      }).catch(() => {});
    });
    pre.parentNode.insertBefore(button, pre);
  }
})();
