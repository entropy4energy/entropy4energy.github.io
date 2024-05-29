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
        <a href="${workshop.link}" class="register-now" target="_blank" rel="noopener noreferrer">Register Now</a>
        <a href="https://engineering.jhu.edu/materials/event/data-driven-materials-modeling-workshop" class="register-now" target="_blank" rel="noopener noreferrer">Updated Schedule</a>
        <p>Workshop led by Dr. Guotao Qiu, Dr. Yuxiang Liu, Tianhao Li and Xiao Xu on high-throughput density functional theory calculations with aflow++, thermodynamic analysis, structural prototypes, and modeling disordered materials will start from 13:00 - 17:00, May 29.</p>
        <p>The Google Colab links for each section are here:</p>
        <a href="https://colab.research.google.com/drive/1gqEJ_c2mi5r9VisNdzj7e6H2N_OiVYbr?usp=sharing" class="colab-link" target="_blank" rel="noopener noreferrer">01_AFLOW_DFT</a>
        <a href="https://colab.research.google.com/drive/1NHxjKDCxRKZv-21llKWZVl8VtzxaoZVC?usp=sharing" class="colab-link" target="_blank" rel="noopener noreferrer">02_AFLOW_PROTOTYPE</a>
        <a href="https://colab.research.google.com/drive/1DCuvWdY3v-47sgD1GSVWo9pa52g_MD8I?usp=sharing" class="colab-link" target="_blank" rel="noopener noreferrer">03_AFLOW_CHULL</a>
        <a href="https://colab.research.google.com/drive/11G7IwQAso4MnovbeP5plmFk_WZEZj5q0?usp=sharing" class="colab-link" target="_blank" rel="noopener noreferrer">04_AFLOW_POCC</a>
        <a href="https://colab.research.google.com/drive/1Zz021nGh6ltnpDD1zt6aSrpfXCwy5XJT?usp=sharing" class="colab-link" target="_blank" rel="noopener noreferrer">05_AFLOW_ML</a>
        ${imagesHtml}
      </div>
    `;
    workshopList.insertAdjacentHTML('beforeend', workshopItemHtml);
  });
})();

