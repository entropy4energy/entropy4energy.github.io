(() => {
  for (let i = 0; i < 10; i++) {
    const pub = publicationsJournal[i];
    let pubUrl = '';
    let fileName = '';
    if (pub.doi) {
      pubUrl = 'https://doi.org/'+pub.doi;
    } else if (pub.arxiv) {
      pubUrl = 'https://arxiv.org/abs/'+pub.arxiv;
    } 
    const slideHtml =
      '<input type="radio" id="slideshow_main_' + (i + 1).toString() + '" name="slideshow_main_indicators"' + (i === 0 ? ' checked' : '') + '>'
      + '<label class="slideshow-indicator" for="slideshow_main_' + (i + 1).toString() + '">' + (i + 1).toString() + '</label>'
      + '<div class="slideshow-slide">'
      +   '<div class="slideshow-slide-text">' +pub.titlePublication+ '</div>'
      +   '<a class="slideshow-slide-img" href="' + pubUrl + '" target="_blank">'
      +     '<img src="media/publications/' + pub.filename + '.png" alt="' + pub.titlePublication  + '">'
      +   '</a>'
      + '</div>';
    document.getElementById('slideshow_main').insertAdjacentHTML('beforeend', slideHtml);
  }

  function automaticSlideShow() {
    // Checked: play
    if (document.getElementById('slideshow_main_play').checked) {
      const slides = document.querySelectorAll('#slideshow_main input[type=radio]');
      for (let i = 0; i < slides.length; i++) {
        if (slides[i].checked) {
          if (i === slides.length - 1) {
            slides[0].checked = true;
          } else {
            slides[i + 1].checked = true;
          }
          break;
        }
      }
    }
    setTimeout(automaticSlideShow, 7000);
  }

  setTimeout(automaticSlideShow, 7000);
})();

