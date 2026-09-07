// Status is set at build time (see build.py); this only flips a posting that
// was open when the site was built to Closed once its closing date has passed.
// textContent, not innerText: innerText is empty inside a collapsed <details>.
(() => {
  const today = new Date();
  for (const jobClosed of document.querySelectorAll('.job-date-close')) {
    const closeDate = new Date(jobClosed.querySelector('.job-date-close-text').textContent);
    if (closeDate < today) {
      const jobStatus = jobClosed.parentNode.querySelector('.job-date-stat-text');
      jobStatus.classList.remove('open');
      jobStatus.classList.add('closed');
      jobStatus.textContent = 'Closed';
    }
  }
})();
