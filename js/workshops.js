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
      image: 'media/workshops/0529_workshop.png',
      videos: [
        { id: 'kZj3zQkBAKg', description: 'Introduction of AFLOW by Prof. Corey Oses' },
        { id: 'OLMPDG9rpPc', description: 'AFLOW-DFT presentation by Dr. Guotao Qiu. Hands-on materials: <a href="https://colab.research.google.com/drive/1gqEJ_c2mi5r9VisNdzj7e6H2N_OiVYbr?usp=sharing" class="colab-link" target="_blank" rel="noopener noreferrer">01_AFLOW_DFT</a>' },
        { id: 'Cd4Asw8rRWA', description: 'AFLOW-Prototype presentation by Xiao Xu. Hands-on materials: <a href="https://colab.research.google.com/drive/1NHxjKDCxRKZv-21llKWZVl8VtzxaoZVC?usp=sharing" class="colab-link" target="_blank" rel="noopener noreferrer">02_AFLOW_PROTOTYPE</a>' },
        { id: 'jBQUSNsFBX0', description: 'AFLOW-CHULL presentation by Tianhao Li. Hands-on materials: <a href="https://colab.research.google.com/drive/1DCuvWdY3v-47sgD1GSVWo9pa52g_MD8I?usp=sharing" class="colab-link" target="_blank" rel="noopener noreferrer">03_AFLOW_CHULL</a>' },
        { id: 'TmJxxTfQ_wk', description: 'AFLOW-POCC presentation by Dr. Yuxiang Liu. Hands-on materials: <a href="https://colab.research.google.com/drive/11G7IwQAso4MnovbeP5plmFk_WZEZj5q0?usp=sharing" class="colab-link" target="_blank" rel="noopener noreferrer">04_AFLOW_POCC</a>' },
        { id: 'sgM3dx3FOi0', description: 'AFLOW-ML presentation by Xiao Xu. Hands-on materials: <a href="https://colab.research.google.com/drive/1Zz021nGh6ltnpDD1zt6aSrpfXCwy5XJT?usp=sharing" class="colab-link" target="_blank" rel="noopener noreferrer">05_AFLOW_ML</a>' },
        { id: 'Gi21PB98kUY', description: 'A welcome and a brief introduction about the Data-Driven Materials Modeling Workshop, followed by the AIMNet2 presentation by Prof. Olexander Isayev.' },
      ]
    }
    // Add more workshops if needed
  ];

  workshops.forEach(workshop => {
    let imagesHtml = '';
    if (workshop.image) {
      imagesHtml += `<img src="${workshop.image}" alt="Image of ${workshop.title}" style="width:100%; height:auto;">`;
    }

    // Construct video elements
    let video1 = `
      <div class="video-container">
        <p>${workshop.videos[0].description}</p>
        <iframe width="560" height="315" src="https://www.youtube.com/embed/${workshop.videos[0].id}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
      </div>
    `;
    let video2 = `
      <div class="video-container">
        <p>${workshop.videos[1].description}</p>
        <iframe width="560" height="315" src="https://www.youtube.com/embed/${workshop.videos[1].id}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
      </div>
    `;
    let video3 = `
      <div class="video-container">
        <p>${workshop.videos[2].description}</p>
        <iframe width="560" height="315" src="https://www.youtube.com/embed/${workshop.videos[2].id}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
      </div>
    `;
    let video4 = `
      <div class="video-container">
        <p>${workshop.videos[3].description}</p>
        <iframe width="560" height="315" src="https://www.youtube.com/embed/${workshop.videos[3].id}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
      </div>
    `;
    let video5 = `
      <div class="video-container">
        <p>${workshop.videos[4].description}</p>
        <iframe width="560" height="315" src="https://www.youtube.com/embed/${workshop.videos[4].id}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
      </div>
    `;
    let video6 = `
      <div class="video-container">
        <p>${workshop.videos[5].description}</p>
        <iframe width="560" height="315" src="https://www.youtube.com/embed/${workshop.videos[5].id}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
      </div>
    `;
    let video7 = `
      <div class="video-container">
        <p>${workshop.videos[6].description}</p>
        <iframe width="560" height="315" src="https://www.youtube.com/embed/${workshop.videos[6].id}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
      </div>
    `;

    const workshopItemHtml = `
      <div class="workshop-item">
        <h2>${workshop.title}</h2>
        <p><strong>Date:</strong> ${workshop.date}</p>
        <p>${workshop.description}</p>
        <p><b>Day 1 High-Throughput Thermodynamic Modeling</b></p>
        ${video7}
        ${video1}
        <p>Workshops led by Dr. Guotao Qiu, Dr. Yuxiang Liu, Tianhao Li and Xiao Xu on high-throughput density functional theory calculations with aflow++, thermodynamic analysis, structural prototypes, and modeling disordered materials started from 13:00 - 17:00, May 29.</p>
        ${video2}
        ${video3}
        ${video4}
        ${video5}
        ${video6}
        <p><b>Day 2 Quantum Chemistry and Catalysis</b></p>
        <p>Hands-on materials</p><a href="https://s4e.ai/workshops/2024_ai_materials/DAY_2/" class="colab-link" target="_blank" rel="noopener noreferrer">Jupyter Notebook</a>
        <p><b>Day 3 Monte Carlo and Molecular Dynamics</b></p>
        <p>Hands-on materials</p><a href="https://colab.research.google.com/drive/1CqBCY-3PAEkbkLucOE3upzmPx82CYit7?usp=sharing" class="colab-link" target="_blank" rel="noopener noreferrer">Jupyter Notebook</a>

        ${imagesHtml}
      </div>
    `;
    workshopList.insertAdjacentHTML('beforeend', workshopItemHtml);
  });
})();
