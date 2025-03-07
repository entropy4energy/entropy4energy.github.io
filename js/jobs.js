(() => {
  var today = new Date();
  var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
  const EqualEmploymentOpportunityStatement='The Johns Hopkins University is committed to equal opportunity for its faculty, staff, and students. To that end, the university does not discriminate on the basis of sex, gender, marital status, pregnancy, race, color, ethnicity, national origin, age, disability, religion, sexual orientation, gender identity or expression, veteran status or other legally protected characteristic. The university is committed to providing qualified individuals access to all academic and employment programs, benefits and activities on the basis of demonstrated ability, performance and merit without regard to personal factors that are irrelevant to the program involved.';
  const jobList = [
    {
      open: 'Jan. 15, 2025',
      title: 'Postdoctoral Researcher Opportunity in Reactor Design',
      description: 'The <i>S4E</i> Labor has openings for postdoctoral researchers. The postdoc will be co-advised by <a href=https://halllab.seas.upenn.edu target="blank">Prof. A. Shoji Hall at the University of Pennsylvania</a>. We invite applications for a postdoctoral researcher position focused on the design and construction of reactors with next generation catalysts for thermochemical processes. Candidates will collaborate with other experimental, theoretical, and machine learning groups to efficiently optimize reactor designs. This position offers a unique opportunity to work at the forefront of renewable energy research and catalysts, developing innovative solutions with high commercial impact for sustainable fuel production. Graduate students near the completion of their Ph.D. are welcome to apply.',
      quals: ['Doctorate in chemical engineering, materials science, physics, chemistry, or related fields.', 'Ability to move to and work at Johns Hopkins University, USA.','Track-record of first-author publications and presentations. A minimum of three peer-reviewed, first-author publications must be accessible by the <i>S4E</i> team.','Experience in reactor engineering or chemical kinetics, and solid-state materials.','Ability to lead research projects and collaborate with other experimentalists/computationalists.'],
      flyer: 'oses_ad_postdoc_reactor_202501',
      appInstructions: 'Submit a single PDF file via <a href=http://apply.interfolio.com/161934 target="blank">Interfolio</a> named "<i>Lastname</i>_<i>Firstname</i>_S4E_202501.pdf" containing a cover letter, CV, and contact information for 3 references. The cover letter should address each point of the qualifications list explicitly (<i>i.e.</i>, A, B, C, ...). Provide ample examples and details where possible. Applications without explicit responses will not be reviewed. OPTIONAL: DOIs for 3 recent and relevant publications can be included at the end of the packet. Questions can be sent to the <i>S4E</i> team (entropy4energy AT jhu.edu); subject line must contain "S4E Post-Doc".',
    },
    {
      open: 'Jan. 1, 2025',
      title: 'Postdoctoral Researcher Opportunity in Materials Informatics',
      description: 'The <i>S4E</i> Lab has openings for postdoctoral researchers in the data-driven discovery of energy materials. Projects focus on innovating clean hydrogen production, waste-heat conversion, nuclear power, and energy storage. Graduate students near the completion of their Ph.D. are welcome to apply.',
      quals: ['Doctorate in materials science, physics, chemistry, computer science or other related fields.', 'Ability to move to and work at Johns Hopkins University, USA.','Proven track-record of first-author publications and presentations. A minimum of three peer-reviewed, first-author publications must be accessible by the <i>S4E</i> team.','Proven experience with VASP, Quantum ESPRESSO, LAMMPS, or other <i>ab-initio</i> codes.','Strong programming skills in C++ and Python and proficiency with Unix systems.','Ability to lead research projects and collaborate with experimentalists.','Fundamental understanding of thermodynamics of materials, solid-state physics, inorganic chemistry, and metallurgy at the level of theory/implementation.','Expertise in any of the following areas: high-entropy materials, disorder, phonons, magnetism, catalysis, machine learning/artificial intelligence, database/API development, aflow.org repositories.'],
      flyer: 'oses_ad_postdoc_comp_202501',
      appInstructions: 'Submit a single PDF file via <a href=https://apply.interfolio.com/161248 target="blank">Interfolio</a> named "<i>Lastname</i>_<i>Firstname</i>_S4E_202501.pdf" containing a cover letter, CV, and contact information for 3 references. The cover letter should address each point of the qualifications list explicitly (<i>i.e.</i>, A, B, C, ...). Provide ample examples and details where possible. Applications without explicit responses will not be reviewed. OPTIONAL: DOIs for 3 recent and relevant publications can be included at the end of the packet. Questions can be sent to the <i>S4E</i> team (entropy4energy AT jhu.edu); subject line must contain "S4E Post-Doc".',
    },
    {
      open: 'May 31, 2023',
      title: 'Opening for Master\'s and PhD Research in Energy Materials',
      description: 'Interested in performing materials science research that combines experiments with computation? The <i>S4E</i> Lab is looking for new students interested in the synthesis, characterization, and computational modeling of high-entropy materials for energy materials. This project involves hands-on training on how to synthesize and experimentally characterize disordered materials. Candidates will also learn how to run high-throughput <i>ab-initio</i> calculations and develop machine learning/artificial intelligence algorithms that analyze materials synthesizability, stability, and functional properties.',
      appInstructions: 'If you are interested in joining the <i>S4E</i> team, please follow these instructions: <li><b>For JHU students.</b> Schedule a meeting by emailing the <i>S4E</i> team (entropy4energy AT jhu.edu) with your CV.</li><li><b>For external candidates.</b> <a href=https://engineering.jhu.edu/admissions target="_blank">Submit an application</a> to the Department of Materials Science &amp; Engineering. Note Prof. Oses as a faculty advisor of interest and discuss your interest in the <i>S4E</i> Lab in your Statement of Research. Applications are assessed <a href=https://engineering.jhu.edu/admissions/graduate-admissions/full-time-programs/how-to-apply/application-deadlines target="_blank">twice a year</a>, in October and December. Questions should be addressed to Mrs. Lauren Rodgers (lmodica1 AT jhu.edu).</li>',
    },
     {
      open: 'Dec. 20, 2024',
      close: 'Feb. 3, 2025',
      title: '2025 Undergraduate Summer Researcher (National Science Foundation, REU summer program)',
      description: 'The <i>S4E</i> Lab has openings for undergraduate researchers in the data-driven discovery of energy materials. <li><b>Program.</b> Research on Sustainable Energy Technology and Systems (ROSETAS) is a 10-week National Science Foundation Research Experience for Undergraduates (REU) summer program in sustainable energy that is hosted by ROSEI, which serves as the nexus for sustainable energy-related research and educational programs at Johns Hopkins University.</li><li><b>Stipend and housing.</b> Accepted students will be awarded a $7,000 stipend and given housing on campus for the summer.</li><li><b>Eligibility.</b> Candidates must be U.S. Citizens or U.S. Permanent Residents, have completed at least one year of undergraduate studies, and not yet have a bachelor&#8217;s degree.</li><li><b>Important dates.</b> The program will take place 27 May 2025 through 1 August 2025. Applications are due on 3 February 2025 by 11:59 ET.</li><li><b>Instructions.</b> Note Prof. Oses as a faculty advisor of interest and discuss your interest in the S4E Lab in your Statement of Research. For questions regarding the Entropy for Energy Laboratory, email the <i>S4E</i> team (entropy4energy AT jhu.edu).</li><li><b>Application link.</b> Please see the attached <a href="media/jobs/rosetas_flyer_2025.pdf" download="rosetas_flyer_2025.pdf" target="blank">flyer</a> or visit this <a href=https://etap.nsf.gov/award/7317/opportunity/9804 target="blank">link</a> to apply.</li>',
      flyer: 'rosetas_flyer_2025',
    },
    {
      open: 'Nov. 18, 2024',
      close: 'Jan. 6, 2025',
      title: 'Data Science and AI Institute Postdoctoral Fellowship Program',
      description: 'The <i>S4E</i> Lab has openings for postdoctoral researchers in the data-driven discovery of energy materials. Projects focus on innovating clean hydrogen production, waste-heat conversion, nuclear power, and energy storage. Graduate students near the completion of their Ph.D. are welcome to apply. <li><b>DSAI program.</b> The postdoctoral fellows will join the growing Data Science and AI Institute research community. Fellows will form a cohort of outstanding scholars who will contribute to the research, education, policy, and outreach goals of the institute. This program supports Johns Hopkins historic commitment to build the nation&#8217;s foremost destination for emerging applications, opportunities, and challenges presented by data science, machine learning, and AI. The Data Science and AI Institute expansion includes a state-of-the-art facility on the Homewood campus and an expansion of our computing resource capacity to the scale required for an initiative of this dimension. More information can be found <a href=https://ai.jhu.edu/careers/postdoctoral-fellowship-program target="blank">here</a>.</li><li><b>Program benefits.</b> Competitive salary, academic travel stipend, Access to Data Science and AI Institute compute resources, Participation in center-supported educational initiatives and projects.</li>',
      quals: ['Doctorate in materials science, physics, chemistry, computer science or other related fields.', 'Ability to move to and work at Johns Hopkins University, USA.','Proven track-record of first-author publications and presentations. A minimum of three peer-reviewed, first-author publications must be accessible by the <i>S4E</i> team.','Proven experience with VASP, Quantum ESPRESSO, LAMMPS, or other <i>ab-initio</i> codes.','Strong programming skills in C++ and Python and proficiency with Unix systems.','Ability to lead research projects and collaborate with experimentalists.','Fundamental understanding of thermodynamics of materials, solid-state physics, inorganic chemistry, and metallurgy at the level of theory/implementation.','Expertise in any of the following areas: high-entropy materials, disorder, phonons, magnetism, catalysis, machine learning/artificial intelligence, database/API development, aflow.org repositories.'],
      appInstructions: 'Apply via <a href=https://apply.interfolio.com/158121 target="blank">Interfolio</a>. Questions can be sent to the <i>S4E</i> team (entropy4energy AT jhu.edu); subject line must contain "S4E Post-Doc".',
    },
    {
      open: 'Jun. 7, 2024',
      close: 'Oct. 23, 2024',
      title: 'Postdoctoral Researcher Opportunity',
      description: 'The <i>S4E</i> Lab has openings for postdoctoral researchers in the data-driven discovery of energy materials. Projects focus on innovating clean hydrogen production, waste-heat conversion, nuclear power, and energy storage. Graduate students near the completion of their Ph.D. are welcome to apply.',
      quals: ['Doctorate in materials science, physics, chemistry, computer science or other related fields.', 'Ability to move to and work at Johns Hopkins University, USA.','Proven track-record of first-author publications and presentations. A minimum of three peer-reviewed, first-author publications must be accessible by the <i>S4E</i> team.','Proven experience with VASP, Quantum ESPRESSO, LAMMPS, or other <i>ab-initio</i> codes.','Strong programming skills in C++ and Python and proficiency with Unix systems.','Ability to lead research projects and collaborate with experimentalists.','Fundamental understanding of thermodynamics of materials, solid-state physics, inorganic chemistry, and metallurgy at the level of theory/implementation.','Expertise in any of the following areas: high-entropy materials, disorder, phonons, magnetism, catalysis, machine learning/artificial intelligence, database/API development, aflow.org repositories.'],
      flyer: 'oses_ad_postdoc_202406',
      appInstructions: 'Prepare a single PDF file named "<i>Lastname</i>_<i>Firstname</i>_S4E_202406.pdf" containing a cover letter, CV, and contact information for 3 references. Send your submission to the <i>S4E</i> team (entropy4energy AT jhu.edu); subject line must contain "S4E Post-Doc: Application Submission". The cover letter should address each point of the qualifications list explicitly (<i>i.e.</i> A,B,C, ...). OPTIONAL: DOIs for 3 recent and relevant publications can be included at the end of the packet. Questions can be sent to the <i>S4E</i> team (entropy4energy AT jhu.edu).',
      appInstructions: 'Submit a single PDF file via <a href=http://apply.interfolio.com/147929 target="blank">Interfolio</a> named "<i>Lastname</i>_<i>Firstname</i>_S4E_202406.pdf" containing a cover letter, CV, and contact information for 3 references. The cover letter should address each point of the qualifications list explicitly (<i>i.e.</i>, A, B, C, ...). Provide ample examples and details where possible. Applications without explicit responses will not be reviewed. OPTIONAL: DOIs for 3 recent and relevant publications can be included at the end of the packet. Questions can be sent to the <i>S4E</i> team (entropy4energy AT jhu.edu); subject line must contain "S4E Post-Doc".',
    },
    {
      open: 'Aug. 1, 2023',
      close: 'Oct. 23, 2023',
      title: 'Postdoctoral Researcher Opportunity',
      description: 'The <i>S4E</i> Lab has openings for postdoctoral researchers in the data-driven discovery of energy materials. Projects focus on innovating clean hydrogen production, waste-heat conversion, nuclear power, and energy storage. Graduate students near the completion of their Ph.D. are welcome to apply.',
      quals: ['Doctorate in materials science, physics, chemistry, computer science or other related fields.', 'Excellent communication skills in English, both written and verbal. The dissemination of research findings through peer-reviewed articles and presentations is mission critical.','Ability to lead research projects and collaborate with experimentalists.','Understanding of thermodynamics of materials, solid-state physics, inorganic chemistry, and metallurgy.','Strong programming skills in C++ and Python and proficiency with Unix systems.','Proven experience with VASP, Quantum ESPRESSO, LAMMPS, or other <i>ab-initio</i> codes.','Expertise in any of the following areas: high-entropy materials, disorder, phonons, magnetism, catalysis, machine learning/artificial intelligence, database/API development, aflow.org repositories.'],
      flyer: 'oses_ad_postdoc_202308',
      appInstructions: 'Prepare a single PDF file named "<i>LASTNAME</i>_<i>FIRSTNAME</i>_S4E_202308.pdf" containing a cover letter, CV, and contact information for 3 references. Send your submission to the <i>S4E</i> team (entropy4energy AT jhu.edu); subject line must contain "S4E Post-Doc: Application Submission". The cover letter should address each point of the qualifications list explicitly (<i>i.e.</i> A,B,C, ...). OPTIONAL: DOIs for 3 recent and relevant publications can be included at the end of the packet. Questions can be sent to the <i>S4E</i> team (entropy4energy AT jhu.edu).',
      appInstructions: 'Submit a single PDF file via <a href=http://apply.interfolio.com/129854 target="blank">Interfolio</a> named "<i>LASTNAME</i>_<i>FIRSTNAME</i>_S4E_202308.pdf" containing a cover letter, CV, and contact information for 3 references. The cover letter should address each point of the qualifications list explicitly (<i>i.e.</i>, A, B, C, ...). OPTIONAL: DOIs for 3 recent and relevant publications can be included at the end of the packet. Questions can be sent to the <i>S4E</i> team (entropy4energy AT jhu.edu); subject line must contain "S4E Post-Doc".',
    },
    {
      open: 'May 20, 2022',
      close: 'Aug. 1, 2023',
      title: 'Postdoctoral Researcher Opportunity',
      description: 'The <i>S4E</i> Lab has openings for postdoctoral researchers in computational materials science. Projects will focus on the discovery of high-entropy materials for clean hydrogen production, waste-heat conversion, and electric grid technology. Postdocs will be expected to perform high-throughput <i>ab-initio</i> calculations and employ machine learning/artificial intelligence algorithms for the analysis of materials synthesizability, stability, and functional properties. Graduate Students near the completion of their PhD are welcome to apply.',
      quals: ['Doctorate in Materials Science, Physics, Chemistry, Computer Science or related fields.','Excellent communication skills in English, both written and verbal. The dissemination of research findings through peer-reviewed articles and presentations is mission critical.','Ability to lead research projects and collaborate with experimentalists.','Understanding of thermodynamics of materials, solid-state physics, inorganic chemistry, and metallurgy.','Strong programming skills in C++ and Python and proficiency with Unix systems.','Proven experience with VASP, Quantum ESPRESSO, LAMMPS, or other <i>ab-initio</i> codes.','Expertise in any of the following areas: high-entropy materials, disorder, phonons, magnetism, catalysis, machine learning, database/API development, aflow.org repository.'],
      flyer: 'oses_ad_postdoc_202205',
      appInstructions: 'Prepare a single PDF file via email named “<i>LASTNAME</i>_<i>FIRSTNAME</i>_S4E_202306.pdf” containing: a cover letter, CV, and contact information for 3 references. Send your submission to the <i>S4E</i> team (entropy4energy AT jhu.edu); subject line must contain “S4E Post-Doc: Application Submission".',
    },
    {
      open: 'Nov. 1, 2022',
      close: 'Feb. 1, 2023',
      title: '2023 Undergraduate Summer Researcher (Amgen Scholars Program)',
      description: 'The <i>S4E</i> Lab welcomes undergraduate researchers in computational materials science through the <a href=https://krieger.jhu.edu/ursca/visitor-programs/amgen-scholars-program target="blank">2023 Amgen Scholars Program</a>. Projects will focus on the discovery of high-entropy materials for clean hydrogen production, waste-heat conversion, and electric grid technology. Researchers will perform high-throughput <i>ab-initio</i> calculations and employ machine learning/artificial intelligence algorithms for the analysis of materials synthesizability, stability, and functional properties. The <a href=https://krieger.jhu.edu/ursca/visitor-programs/amgen-scholars-program target="blank">Amgen Scholars Program</a> pays for the student&#8217;s travel and housing fees and provides a $600/week stipend. Eligible candidates must be U.S. citizens or U.S. permanent residents enrolled in an accredited four-year college or university in the United States, Puerto Rico or other U.S. territories. Candidates must be sophomores (with four quarters or three semesters of college experience), juniors, or non-graduating seniors (who are returning in the fall to continue undergraduate studies) with a cumulative grade point average of 3.2 or above. The program will take place 29 May 2023 through 4 August 2023. Applications are due on 1 February 2023 by 11:59PM EST. Please see the attached <a href="media/jobs/amgen_flyer_2023.pdf" download="amgen_flyer_2023.pdf" target="blank">flyer</a>  or visit this <a href=https://krieger.jhu.edu/ursca/visitor-programs/amgen-scholars-program target="blank">link</a> to apply. For questions regarding the Entropy for Energy Laboratory, email the <i>S4E</i> team (entropy4energy AT jhu.edu). Please submit your application at <a href=https://krieger.jhu.edu/ursca/visitor-programs/amgen-scholars-program target="blank">https://krieger.jhu.edu/ursca/visitor-programs/amgen-scholars-program</a>.',
      flyer: 'amgen_flyer_2023',
    }
  ];

  for (const job of jobList) {
    let qualsList=''; 
    if (job.quals){
      for (qual of job.quals){
        qualsList += '<li>' + qual + '</li>';
      }
    }
    let stat='Open';
    let statType='job-stat-open';
    if (job.close){
      let closeClean=job.close.replace(',','');
      let closeSplit=closeClean.split(' ');
      let closeMonth='';
      if (closeSplit[0]=='Jan.'){closeMonth=01};
      if (closeSplit[0]=='Feb.'){closeMonth=02};
      if (closeSplit[0]=='Mar.'){closeMonth=03};
      if (closeSplit[0]=='Apr.'){closeMonth=04};
      if (closeSplit[0]=='May'){closeMonth=05};
      if (closeSplit[0]=='Jun.'){closeMonth=06};
      if (closeSplit[0]=='Jul.'){closeMonth=07};
      if (closeSplit[0]=='Aug.'){closeMonth=08};
      if (closeSplit[0]=='Sep.'){closeMonth=09};
      if (closeSplit[0]=='Oct.'){closeMonth=10};
      if (closeSplit[0]=='Nov.'){closeMonth=11};
      if (closeSplit[0]=='Dec.'){closeMonth=12};
      let closeDate = new Date(closeSplit[2]+'-'+closeMonth+'-'+closeSplit[1]);
      if (closeDate < today) {
        stat='Closed';
        statType='job-stat-closed';
      }
    };
  
    const jobsHtml =
      '<div class="job">'
    +   '<span class="job-date"> Opens: ' + job.open + '<br/>' +  (job.close ? ('Closes: ' + job.close + '<br/>'):'') + 'Status: <span class="' + statType  + '">'  + stat + '</span> </span>'
    +   '<span class="job-title-and-flyer"><b>' + job.title + '</b> ' + (job.flyer?('<a href="media/jobs/' + job.flyer + '.pdf" download="' + job.flyer + '.pdf" target="blank">(PDF)</a>'):'') + '</span>'
    +   '<div class="job-description">' + job.description + '</div>'
    +   (job.quals?('<div class="job-quals-header"><br/><b>Qualifications</b></div>'): '<br>')
    +   (job.quals?('<div class="job-quals-text"><ol type="A">' + qualsList + '</ol></div>'):'')
    +   (job.appInstructions?('<div class="job-appInstructions-header"><b>Application Instructions</b></div>'):'')
    +   (job.appInstructions?('<div class="job-appInstructions-text">' + job.appInstructions+'</div>') :'')
    + '</div>';
    document.getElementById('jobList').insertAdjacentHTML('beforeend', jobsHtml);
  }
  const EqualEmploymentHTML =
      '<div class="equal-employment-opportunity-statement">'
    +   '<b>Equal Employment Opportunity Statement</b>'
    +   '<br/> '+EqualEmploymentOpportunityStatement
    +   '</div>';
  document.getElementById('EqualEmploymentOpportunityStatement').insertAdjacentHTML('beforeend',EqualEmploymentHTML)
})();
