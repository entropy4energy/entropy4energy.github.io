(() => {
  const peopleGroups = [
    {
      groupTitle: '',
      positions: ['Assistant Professor', 'Professor'],
    },
    {
      groupTitle: 'Postdocs',
      positions: ['Postdoctoral Associate'],
    },
    {
      groupTitle: 'Graduate Students',
      positions: ['Graduate Student'],
    },
    {
      groupTitle: 'Undergraduate Students',
      positions: ['Undergraduate Student'],
    },
    {
      groupTitle: 'Alumni',
      positions: ['Alumni'],
    },
    {
      groupTitle: 'Affiliates',
      positions: ['Web Developer'],
    },
  ];

  const peopleData = {
    'corey_oses': {
      contact: 'corey at jhu.edu',
      nameFull: 'Corey Oses',
      socials: {
        'gscholar': 'Za7m4CMAAAAJ',
        'orcid': '0000-0002-3790-1377',
      },
      titles: [
        'Assistant Professor',
      ],
    },
    'guotao_qiu': {
      contact: 'gqiu5 at jhu.edu',
      nameFull: 'Guotao Qiu',
      titles: [
        'Postdoctoral Associate',
      ],
    },
    'yuxiang_liu': {
      contact: 'yliu597 at jhu.edu',
      nameFull: 'Yuxiang Liu',
      titles: [
        'Postdoctoral Associate',
      ],
    },
    'keith_clark': {
      contact: 'kclark96 at jhu.edu',
      nameFull: 'Keith Clark',
      titles: [
        'Alumni',
      ],
    },
    'tianhao_li': {
      contact: 'tli114 at jhu.edu',
      nameFull: 'Tianhao Li',
      titles: [
        'Graduate Student',
      ],
    },
    'xiao_xu': {
      contact: 'xxu115 at jhu.edu',
      nameFull: 'Xiao Xu',
      titles: [
        'Graduate Student',
      ],
    },
    'xuanhao_lin': {
      contact: 'xlin44 at jhu.edu',
      nameFull: 'Xuanhao Lin',
      titles: [
        'Graduate Student',
      ],
    },
    'will_shiber': {
      contact: 'wshiber1 at jhu.edu',
      nameFull: 'Will Shiber',
      titles: [
        'Undergraduate Student',
      ],
    },
    'katie_cariaga': {
      contact: 'kcariag1 at jhu.edu',
      nameFull: 'Katie Cariaga',
      titles: [
        'Undergraduate Student',
      ],
    },
    'veric_tan': {
      contact: 'vtan5 at jhu.edu',
      nameFull: 'Veric Tan',
      titles: [
        'Undergraduate Student',
      ],
    },
    'dakota_braaten': {
      contact: 'dbraate1 at jhu.edu',
      nameFull: 'Dakota Braaten',
      titles: [
        'Undergraduate Student',
      ],
    },
    'julia_gelfond': {
      contact: 'jgelfon1 at jhu.edu',
      nameFull: 'Julia Gelfond',
      titles: [
        'Undergraduate Student',
      ],
    },
    'akshaya_ajith': {
      contact: 'aajith1 at jhu.edu',
      nameFull: 'Akshaya Ajith',
      titles: [
        'Undergraduate Student',
      ],
    },
    }; 

  function buildPerson(person, personId) {
    function buildSocials(socials) {
      const socialData = [
        {
          linkBase: 'https://scholar.google.com/citations?user=',
          socialIcon: '<i class="ai ai-google-scholar-square ai-2x ai-inverse"></i>',
          socialKey: 'gscholar',
        },
        {
          linkBase: 'https://orcid.org/',
          socialIcon: '<i class="ai ai-orcid-square ai-2x ai-inverse"></i>',
          socialKey: 'orcid',
        },
      ];
      let socialHtml = '';
      for (const social of socialData) {
        const key = social.socialKey;
        if (socials[key]) {
          socialHtml += '<a href="' + social.linkBase + socials[key] + '" target="_blank">' + social.socialIcon + '</a>';
        }
      }
      return socialHtml;
    }
    return (
      '<div class="member' + (person.alumnus ? ' alumnus' : '') + '">'
      + '<div class="member-img">'
      + '<img src="media/team/' + personId + '.jpg" alt="Portrait of ' + person.fullName + '">'
      + '</div>'
      + '<div class="member-data">'
      + '<div class="member-data-name">' + person.nameFull + '</div>'
      + '<div class="member-data-line">' + person.titles.join('<br>') + '</div>'
      + ((person.contact) ? ('<div class="member-data-line">' + (person.alumnus ? ('Now: ' + person.alumnus) : person.contact) + '</div>') : '')
      + ((!person.alumnus && person.socials) ? ('<div class="member-data-line">' + buildSocials(person.socials) + '</div>') : '')
      + '</div>'
      + '</div>'
    );
  }

  for (const grp of peopleGroups) {
    let current = '';
    let alumni = '';
    for (const personId in peopleData) {
      const person = peopleData[personId];
      if (person.titles.some(p => grp.positions.includes(p))) {
        if (person.alumnus) {
          alumni += buildPerson(person, personId);
        } else {
          current += buildPerson(person, personId);
        }
      }
    }
    if (current) {
      if (grp.groupTitle) {
        current = '<h2>' + grp.groupTitle + '</h2>' + current;
      }
      document.getElementById('current_members').insertAdjacentHTML('beforeend', current);
    }
    if (alumni) {
      document.getElementById('alumni').insertAdjacentHTML('beforeend', alumni);
    }
  }
})();
