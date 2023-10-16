(() => {
  let newsId=1;
  for (const news of newsItems) {
    let imagesHtml = '';
    if (news.pictures && news.pictures.length) {
      for (const picture of news.pictures) {
        imagesHtml += '<img src="media/news/' + picture + '" alt="Image for news ' + news.newsTitle + '">';
      }
    }

    const newsHtml =
      '<div class="news-item" id="' + newsId + '">'
    +   '<span class="news-item-date">' + news.date + '</span>'
    +   '<span class="news-item-title">' + news.newsTitle + '</span>'
    +   '<span class="news-item-text">' + news.message + '</span>'
    +   '<span class="news-item-img">' + imagesHtml + '</span>'
    + '</div>';

    document.getElementById('news_items').insertAdjacentHTML('beforeend', newsHtml);
    newsId++;
  }
})();
