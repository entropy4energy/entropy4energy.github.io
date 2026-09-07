// Citation counts from OpenAlex, filled in after the page loads and shown
// only when a count comes back. Nothing is displayed while the request is
// in flight or if it fails, so the page never depends on the service.
(() => {
  const rows = [...document.querySelectorAll('.publication[data-doi]')];
  if (!rows.length || !window.fetch) return;
  const byDoi = new Map(rows.map((row) => [row.dataset.doi.toLowerCase(), row]));
  const dois = [...byDoi.keys()];
  // OpenAlex sometimes holds two records for one DOI (a preprint duplicate);
  // keep the larger count.
  const best = new Map();
  const show = (doi, count) => {
    const row = byDoi.get(doi);
    if (!row || !(count > 0) || (best.get(doi) || 0) >= count) return;
    best.set(doi, count);
    const el = row.querySelector('.publication-cites');
    if (!el) return;
    el.textContent = count === 1 ? '1 citation' : `${count.toLocaleString()} citations`;
    el.title = 'Citation count from OpenAlex';
    el.hidden = false;
  };
  const batch = 40;
  for (let i = 0; i < dois.length; i += batch) {
    const chunk = dois.slice(i, i + batch);
    const url = 'https://api.openalex.org/works?per-page=' + chunk.length
      + '&select=doi,cited_by_count&filter=doi:' + chunk.map(encodeURIComponent).join('|');
    fetch(url).then((r) => (r.ok ? r.json() : null)).then((data) => {
      if (!data || !data.results) return;
      for (const work of data.results) {
        if (!work.doi) continue;
        show(work.doi.replace(/^https?:\/\/doi\.org\//i, '').toLowerCase(), work.cited_by_count);
      }
    }).catch(() => {});
  }
})();
