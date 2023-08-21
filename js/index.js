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

  const pics=[
    {
        date: 'September 9, 2022',
        title: 'Prof. Oses teaching CHULL',
        file: 'media/home/pic_team_20220909.png',
      },
      {
        date:'July 26, 2023',
        title:'The group @ Baltimore\'s Inner Harbor',
        file:'media/home/pic_team_harbor_20230726.png',
      },
      {
        date: 'July 31, 2023',
        title: 'The group @ MDSGC\'s 2023 Student Research Symposium',
        file: 'media/home/pic_team_mdsgc_20230731.png',
      },
      {
        date: 'August 1, 2023',
        title: 'The group @ Hopkins\' 2023 Summer Research Symposium',
        file: 'media/home/pic_team_hopkins_symposium_20230801.png',
      }
    ];

  for (let i = 0; i < 10; i++) {
    pic=pics[i];
    let fileName = '';
    const slideHtml =
      '<input type="radio" id="slideshow_home_' + (i + 1).toString() + '" name="slideshow_home_indicators"' + (i === 0 ? ' checked' : '') + '>'
      + '<label class="slideshow-indicator" for="slideshow_home_' + (i + 1).toString() + '">' + (i + 1).toString() + '</label>'
      + '<div class="slideshow-slide">'
      +   '<div class="slideshow-slide-text">' +pic.title+ '</div>'
      +   '<div class="slideshow-slide-img"><img src="' + pic.file + '" alt="' + pic.title  + '"></div>'
      + '</div>';
    document.getElementById('slideshow_home').insertAdjacentHTML('beforeend', slideHtml);
  }

  function automaticSlideShow_home() {
    // Checked: play
    if (document.getElementById('slideshow_home_play').checked) {
      const slides = document.querySelectorAll('#slideshow_home input[type=radio]');
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
    setTimeout(automaticSlideShow_home, 7000);
  }

  setTimeout(automaticSlideShow_home, 7000);
})();

