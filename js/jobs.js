(() => {
  var today = new Date();
  var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
  const EqualEmploymentOpportunityStatement='The Johns Hopkins University is committed to equal opportunity for its faculty, staff, and students. To that end, the university does not discriminate on the basis of sex, gender, marital status, pregnancy, race, color, ethnicity, national origin, age, disability, religion, sexual orientation, gender identity or expression, veteran status or other legally protected characteristic. The university is committed to providing qualified individuals access to all academic and employment programs, benefits and activities on the basis of demonstrated ability, performance and merit without regard to personal factors that are irrelevant to the program involved.';
  const jobList = [
    {
      open: 'May 20, 2022',
      title: 'Postdoctoral Researcher Opportunity',
      description: 'The Entropy for Energy Laboratory at Johns Hopkins University (PI Corey Oses) has openings for postdoctoral researchers in computational materials science. Projects will focus on the discovery of high-entropy materials for clean hydrogen production, waste-heat conversion, and electric grid technology. Postdocs will be expected to perform high-throughput <i>ab-initio</i> calculations and employ machine learning/artificial intelligence algorithms for the analysis of materials synthesizability, stability, and functional properties. Graduate Students near the completion of their PhD are welcome to apply.',
      quals: ['Doctorate in Materials Science, Physics, Chemistry, Computer Science or related fields.','Excellent communication skills in English, both written and verbal. The dissemination of research findings through peer-reviewed articles and presentations is mission critical.','Ability to lead research projects and collaborate with experimentalists.','Understanding of thermodynamics of materials, solid-state physics, inorganic chemistry, and metallurgy.','Strong programming skills in C++ and Python and proficiency with Unix systems.','Proven experience with VASP, Quantum ESPRESSO, LAMMPS, or other <i>ab-initio</i> codes.','Expertise in any of the following areas:high-entropymaterials, disorder, phonons, magnetism, catalysis, machine learning, database/API development, aflow.org repository.'],
      flyer: 'oses_ad_postdoc_202205',
      appURL: 'https://apply.interfolio.com/106748',
      appInstructions: 'Submit a single PDF file via Interfolio named “<i>LASTNAME</i>_<i>FIRSTNAME</i>_S4E_202205.pdf” containing: a cover letter, CV, and contact information for 3 references. The cover letter should address each point of the qualifications list explicitly (<i>i.e.</i>, A, B, C, …). If you require sponsorship for work authorization, be sure to include this information in your cover letter. OPTIONAL: DOIs for 3 recent and relevant publications can be included at the end of the packet. Questions can be sent to Prof. Oses (corey at jhu.edu); subject line must contain “S4E Post-Doc”.',
    },
  ];

  for (const job of jobList) {
    let qualsList=''; 
    for (qual of job.quals){
        qualsList += '<li style="padding-left:10px">' + qual + '</li>';
    }
    let stat='Open';
    let statType='job-stat-open';
    if (job.close){
      let closeClean=job.close.replace(',','');
      let closeSplit=closeClean.split(' ');
      let closeMonth='';
      if (closeSplit[0]=='January'){closeMonth=01};
      if (closeSplit[0]=='February'){closeMonth=02};
      if (closeSplit[0]=='March'){closeMonth=03};
      if (closeSplit[0]=='April'){closeMonth=04};
      if (closeSplit[0]=='May'){closeMonth=05};
      if (closeSplit[0]=='June'){closeMonth=06};
      if (closeSplit[0]=='July'){closeMonth=07};
      if (closeSplit[0]=='August'){closeMonth=08};
      if (closeSplit[0]=='September'){closeMonth=09};
      if (closeSplit[0]=='October'){closeMonth=10};
      if (closeSplit[0]=='November'){closeMonth=11};
      if (closeSplit[0]=='December'){closeMonth=12};
      let closeDate = new Date(closeSplit[2]+'-'+closeMonth+'-'+closeSplit[1]);
      if (closeDate < today) {
        stat='Closed';
        statType='job-stat-closed';
      };
    };
  
    const jobsHtml =
      '<div class="job">'
    +   '<span class="job-date"> Opens: ' + job.open + '<br/>' +  (job.close ? ('Closes: ' + job.close + '<br/>'):'') + 'Status: <span class="' + statType  + '">'  + stat + '</span> </span>'
    +   '<span class="job-title-and-flyer"><b>' + job.title + '</b> ' + (job.flyer?('<a href="media/jobs/' + job.flyer + '.pdf" download="' + job.flyer + '.pdf" target="blank">(PDF)</a>'):'') + '</span>'
    +   '<div class="job-description">' + job.description + '</div>'
    +   '<div class="job-quals-header"><br/><b>Qualifications</b></div>'
    +   '<div class="job-quals"><ol type="A">' + qualsList + '</ol></div>'
    +   '<div class="job-appInstructions-header"><b>Application Instructions</b></div>'
    +   '<div class="job-appInstructions">' + job.appInstructions  + '<br/><br/> Please submit your application at <a href=' + job.appURL + ' target="blank">' + job.appURL + '</a>.</div>'
    +   '<div class="job-url"></div>'
    +   '<div class="job-EqualEmploymentOpportunityStatement-header"><br/><b>Equal Employment Opportunity Statement</b></div>'
    +   '<div class="job-EqualEmploymentOpportunityStatement">' + EqualEmploymentOpportunityStatement + '</div>'
    + '</div>';
    document.getElementById('jobList').insertAdjacentHTML('beforeend', jobsHtml);
  };
})();
