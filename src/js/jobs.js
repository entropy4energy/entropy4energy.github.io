(() => {
  const today = new Date();
  for (const nscrpt of document.querySelectorAll('.noscript')) {
    nscrpt.classList.remove('noscript');
  }
  for (const jobClosed of document.querySelectorAll('.job-date-close')) {
    const closeDate = new Date(jobClosed.querySelector('.job-date-close-text').innerText);
    if (closeDate < today) {
      const jobStatus = jobClosed.nextElementSibling.querySelector('.job-date-stat-text');
      jobStatus.classList.remove('open');
      jobStatus.classList.add('closed');
      jobStatus.innerText = 'Closed';
    }
  }
})();
