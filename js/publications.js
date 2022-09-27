(() => {
  function buildPublication(pub) {
    let authors = '';
    if (pub.equalContributions) {
      for (let i = 0; i < pub.equalContributions && i < pub.authors.length; i++) {
        pub.authors[i] += '<sup>*</sup>';
      }
    }
    if (pub.authors.length === 1) {
      authors = pub.authors[0];
    } else if (pub.authors.length === 2) {
      authors = pub.authors[0] + ' and ' + pub.authors[1];
    } else {
      authors = pub.authors.slice(0, pub.authors.length - 1).join(', ') + ', and ' + pub.authors[pub.authors.length - 1];
    }
    let status = '';
    if (!pub.journal && !pub.titleBook) {
      status = 'submitted';
    } else if (!pub.doi && !pub.url) {
      status = 'in press';
    }
    let pubUrl = '';
    if (pub.doi) {
      pubUrl = '<a href="https://doi.org/' + pub.doi + '" target="_blank">DOI:' + pub.doi + '</a>';
    } else if (pub.arxiv) {
      pubUrl = '<a href="https://arxiv.org/abs/' + pub.arxiv + '" target="_blank">ArXiV</a>';
    }
    return (
      '<div class="publication">'
      + '<div class="publication-img">'
      + (pub.filename ? (' <a href="media/publications/' + pub.filename + '.pdf" target="_blank"><img src="media/publications/' + pub.filename + '.png" alt="Graphical abstract for ' + pub.titlePublication + '"></a>') : '')
      + '</div>'
      + '<div class="publication-number">' + pub.pubNumber + '.</div>'
      + '<div class="publication-data">'
      + '<span class="publication-authors">' + authors + '</span>'
      + ' <span class="publication-title">' + pub.titlePublication + '</span>'
      + (pub.titleBook ? (' in <span class="publication-book">' + pub.titleBook + '</span>') : '')
      + (pub.journal ? (', <span class="publication-journal">' + pub.journal + '</span>') : '')
      + (pub.volume ? (' <span class="publication-volume">' + pub.volume + '</span>') : '')
      + (pub.issue ? ('(<span class="publication-issue">' + pub.issue + '</span>)') : '') + ', '
      + (pub.pages ? ('<span class="publication-pages">' + pub.pages + '</span>') : '')
      + (status ? (' <span class="publication-status">' + status + '</span>') : '')
      + ' (<span class="publication-year">' + pub.year + '</span>)'
      + (pubUrl ? (' <span class="publication-url">' + pubUrl + '</span>') : '')
      + (pub.filename ? (' (<a href="media/publications/' + pub.filename + '.pdf" target="_blank">PDF</a>)') : '')
      + '</div>'
      + '</div>'
    );
  }

  for (let i = 0; i < publicationsJournal.length; i++) {
    const pub = publicationsJournal[i];
    pub.pubNumber = publicationsJournal.length - i;
    let tmpHtml = '';
    if (i === 0 || pub.year !== publicationsJournal[i - 1].year) {
      tmpHtml += '<h2 id="publications_' + pub.year + '">' + pub.year + '</h2>';
    }
    tmpHtml += buildPublication(pub);
    document.getElementById('publications_articles').insertAdjacentHTML('beforeend', tmpHtml);
  }

  for (let i = 0; i < publicationsBook.length; i++) {
    const pub = publicationsBook[i];
    pub.pubNumber = publicationsBook.length - i;
    let tmpHtml = '';
    if (i === 0 || pub.year !== publicationsBook[i - 1].year) {
      tmpHtml += '<h2>' + pub.year + '</h2>';
    }
    tmpHtml += buildPublication(pub);
    document.getElementById('publications_books').insertAdjacentHTML('beforeend', tmpHtml);
  }
})();
