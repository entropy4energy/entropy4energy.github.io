(() => {
  let newsId=1;
  for (const news of newsItems) {
    const newsHtml =
      '<div class="news-item" id="' + newsId + '">'
    +   '<span class="news-item-date">' + news.date + '</span>'
    +   '<span class="news-item-title">' + news.newsTitle + '</span>'
    +   '<span class="news-item-text">' + news.message + '</span>'
    +   '<span class="news-item-img">' + (news.picture?('<a href="media/news/' + news.picture + '" target="blank"><img src="media/news/' + news.picture + '" alt="Image for news ' + news.newsTitle + '"></a>'):'') + '</span>'
    + '</div>';
    document.getElementById('news_items').insertAdjacentHTML('beforeend', newsHtml);
    newsId++;
  }
})();
