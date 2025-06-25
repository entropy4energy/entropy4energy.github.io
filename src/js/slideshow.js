(() => {
  function automaticSlideShow(id) {
    // Checked: play
    if (document.getElementById(`${id}_play`).checked) {
      const slides = document.querySelectorAll(`#${id} input[type=radio]`);
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
    setTimeout(automaticSlideShow, 7000, id);
  }

  for (const nscrpt of document.querySelectorAll('.noscript')) {
    nscrpt.classList.remove('noscript');
  }

  for (const slideshow of document.querySelectorAll('.slideshow')) {
    const id = slideshow.id;
    for (const inp of document.querySelectorAll(`input[name="${id}_indicators"]`)) {
      const slide = inp.nextElementSibling
      slide.addEventListener('click', () => {
        document.getElementById(`${id}_play`).checked = false;
      });
    }
    setTimeout(automaticSlideShow, 7000, id);
  }
})();
