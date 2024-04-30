(() => {
  const workshopList = document.getElementById('workshop_list');
  if (!workshopList) {
    console.error('Element with ID "workshop_list" not found.');
    return;
  }

  const workshops = [
    {
      title: 'Data-Driven Materials Modeling Workshop',
      date: 'May 29-31, 2024',
      description: 'Join us for the first Data-Driven Materials Modeling Workshop, happening Wednesday, May 29, through Friday, May 31. This three-day workshop will have a distinct theme for each day with expert speaker seminars in the mornings followed by hands-on workshop sessions in the afternoons. The morning session targets researchers—both experimental and computational—looking to integrate data-driven approaches into their projects and includes a keynote from a leading expert on the topic, followed by a talk highlighting developments within Hopkins. The hands-on session targets students looking to learn implementation details led by graduate students and postdocs.',
      link: 'https://jhu.campusgroups.com/MATS/rsvp_boot?id=1951635',
      image: 'media/workshops/0529_workshop.png'
    }
    // Add more workshops if needed
  ];

  workshops.forEach(workshop => {
    let imagesHtml = '';
    if (workshop.image) {
      imagesHtml += `<img src="${workshop.image}" alt="Image of ${workshop.title}" style="width:100%; height:auto;">`;
    }

    const workshopItemHtml = `
      <div class="workshop-item">
        <h2>${workshop.title}</h2>
        <p><strong>Date:</strong> ${workshop.date}</p>
        <p>${workshop.description}</p>
        <a href="${workshop.link}" class="register-now">Register Now</a>
        ${imagesHtml}
      </div>
    `;
    workshopList.insertAdjacentHTML('beforeend', workshopItemHtml);
  });
})();

