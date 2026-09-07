// The Cite panel: switch between BibTeX, RIS, CSL-JSON and EndNote, and copy the one
// on screen. Every record is plain <pre> text in the page, so without this script the
// panel still shows BibTeX and can be selected by hand.
(() => {
  for (const panel of document.querySelectorAll('.publication-cite-body')) {
    const tabs = [...panel.querySelectorAll('.publication-cite-tab')];
    const texts = [...panel.querySelectorAll('.publication-cite-text')];
    if (!tabs.length || !texts.length) continue;

    const show = (fmt) => {
      for (const t of tabs) t.classList.toggle('is-on', t.dataset.fmt === fmt);
      for (const p of texts) p.hidden = p.dataset.fmt !== fmt;
    };
    for (const tab of tabs) {
      tab.addEventListener('click', () => show(tab.dataset.fmt));
    }

    if (!navigator.clipboard) continue;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'publication-copy';
    button.textContent = 'Copy';
    button.addEventListener('click', () => {
      const shown = texts.find((p) => !p.hidden);
      if (!shown) return;
      navigator.clipboard.writeText(shown.textContent).then(() => {
        button.textContent = 'Copied';
        setTimeout(() => { button.textContent = 'Copy'; }, 1500);
      }).catch(() => {});
    });
    panel.querySelector('.publication-cite-tabs').appendChild(button);
  }
})();
