document.querySelector('header').innerHTML = '<div class="hero">Entropy for Energy Laboratory</div>';

(() => {
  const navHtml =
    '<nav>'
  +   '<input id="menu_toggle" type="checkbox">'
  +   '<label for="menu_toggle" class="menu">'
  +     '<span class="menu-icon">'
  +       '<span class="menu-icon-bar"></span>'
  +       '<span class="menu-icon-bar"></span>'
  +       '<span class="menu-icon-bar"></span>'
  +     '</span>'
  +     '<span class="menu-text">Menu</span>'
  +   '</label>'
  +   '<ul>'
  +     '<li><a id="nav_home" href=".">Home</a></li>'
  +     '<li><a id="nav_publications" href="publications.html">Publications</li>'
  +     '<li><a id="nav_team" href="team.html">Team</a></li>'
  +     '<li><a id="nav_news" href="news.html">News</a></li>'
  +     '<li><a id="nav_jobs" href="jobs.html">Jobs</a></li>'
  +     '<li><a id="nav_workshops" href="workshops.html">Workshops</a></li>'
  +   '</ul>'
  + '</nav>';
  document.querySelector('header').insertAdjacentHTML('afterend', navHtml);
})()

document.getElementById('nav_' + document.getElementsByTagName('body')[0].id).classList.add('active');

document.querySelector('footer').innerHTML =
  '<img src="media/footer/jhu.png" alt="Johns Hopkins University logo">'
  + '<div class="contact">'
  + '<div class="contact-line"><b>Entropy for Energy Laboratory</b></div>'
  + '<div class="contact-line">Department of Materials Science and Engineering</div>'
  + '<div class="contact-line">Johns Hopkins University</div>'
  + '<div class="contact-line">Baltimore, Maryland</div>'
  + '</div>'
  + '<a href="https://spacestudies.jhu.edu" target="_blank"><img src="media/footer/pic_space_at_hopkins_logo.png" alt="space@Hopkins logo" class="footer-sponsor"></a>'
  + '<a href="https://www.idies.jhu.edu" target="_blank"><img src="media/footer/idies.png" alt="IDIES logo" class="footer-sponsor"></a>'
  + '<a href="https://md.spacegrant.org/" target="_blank"><img src="media/footer/mdsgc.png" alt="MDSGC logo" class="footer-sponsor"></a>';

(() => {
  document.querySelector('.main-content-wrapper').insertAdjacentHTML('beforeend', '<div class="sidebar"><div class="sidebar-content"><h2>Latest News</h2></div></div>');
  const newsMax = 5;
  const sidebar = document.querySelector('.sidebar-content');
  for (let i = 0; i < newsMax && i < newsItems.length; i++) {
    let newsId=i;
    const news = newsItems[i];
    const newsItem =
        '<div class="sidebar-news-item">'
      +   '<div class="sidebar-news-item-title"><a href="news.html#' + newsId + '">' + news.newsTitle + '</a></div>'
      +   '<div class="sidebar-news-item-date">' + news.date + '</div>'
      + '</div>';
    sidebar.insertAdjacentHTML('beforeend', newsItem);
  }
})()
