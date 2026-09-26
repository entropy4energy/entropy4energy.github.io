/* Synthesizability Game (Data and Tools).
 * Players choose elements for the A and B sites of a high-entropy ceramic
 * and check its 0-100 score, looking for a composition that can be made.
 * Element tables are packed strings in atomic-number order: one letter per
 * element for the group color and circle size, four base-36 digits per
 * element for each site. Nothing is stored or sent anywhere. */
(function () {
  'use strict';

  var app = document.getElementById('sg-app');
  if (!app) { return; }

  var ELEMENTS = 'H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn'.split(' ');
  var GROUPS = 'ngaemnnnngaepmnnngaettttttttttpmmnngaettttttttttppmmngaellllllllllllllltttttttttppppmg';
  var SIZES = '45c742nml6gb866tsbmgccbcbbabcca89vveojeecdcdbeifdbczzhqlgggfffffeeeeeeedccceedegedguwj';
  var SITE_A = '0000000015vg0g8800000000000000000000000019sd1c2v0koc000000000000000000001ckz15me0l0c0gbh0kyx0bkf0jgd1emk188f14tr114b0h5i0kf500000000000000000000195y10s30a500k5a0fr608yl09000gy00ezd0lh709da0h4n08od129t00000000000000001bq61bet08xh0ig207ct0gb908ju0hoo085z0h3v0aye0fsb0g5d08rk0jzx0d6b0bww0f0o0bj50dqq0a1c0cxs0jy90em40jo70g1r0l3i07900for0do500000000';
  var SITE_B = '0000000000000000000000000000000000000000000017xi18eq1ciy0000000000000000000000000dp41fd0135x0kpm1eh50hy30ohd0bal0iwp0nbm0l510z790000000000000000000000000lr31agv1alz1e5i0ugu0k7r0oku00000eim0i300lh60xvw1att10nu000000000000000000000vtq000000000000000000000000000000000000000000000vmt00000vgy0qgk1la312mo0mnm0p8j0eyy00000000000000000000000000000000';

  var LAYOUT = [
    'H . . . . . . . . . . . . . . . . He',
    'Li Be . . . . . . . . . . B C N O F Ne',
    'Na Mg . . . . . . . . . . Al Si P S Cl Ar',
    'K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr',
    'Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe',
    'Cs Ba La Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn',
    '_',
    '. . . Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu .'
  ];
  var LATTICE = {
    start: ['lattice-start.webp', 'Cartoon unit cell of a ceramic with one element on each cation site', 'The crystal before mixing.'],
    yes: ['lattice-synthesizable.webp', 'Cartoon unit cell with multicolored mixed atoms on one site and smiling faces on the other', 'A mixture that forms.'],
    no: ['lattice-not-synthesizable.webp', 'Cartoon unit cell with blurred red atoms on one site and frowning faces on the other', 'A mixture that does not form.']
  };
  var MEDIA = 'media/tools/synthesizability-game/';
  var THRESHOLD = 50;

  var index = {};
  ELEMENTS.forEach(function (sym, i) { index[sym] = i; });

  function unpack(packed, i) {
    return parseInt(packed.substr(4 * i, 4), 36) / 1e6;
  }

  function spread(n) {
    if (n <= 0) { return 0; }
    if (n <= 5) { return 1; }
    return 1 / (1 + 0.22 * (n - 5));
  }

  function siteSum(list, packed) {
    var total = 0;
    list.forEach(function (sym) { total += unpack(packed, index[sym]); });
    return total * spread(list.length);
  }

  function score(a, b) {
    var x = siteSum(a, SITE_A) + siteSum(b, SITE_B);
    if (x <= 0) { return 0; }
    return Math.min(100, 110 * (1 - Math.exp(-2.4 * Math.min(1, x))));
  }

  var state = { a: [], b: [], target: 'a', locked: false, tries: 0, found: 0 };

  var table = document.getElementById('sg-table');
  var scoreEl = document.getElementById('sg-score');
  var verdictEl = document.getElementById('sg-verdict');
  var tallyEl = document.getElementById('sg-tally');
  var predictEl = document.getElementById('sg-predict');
  var latticeImg = document.getElementById('sg-lattice-img');
  var latticeCap = document.getElementById('sg-lattice-caption');
  var result = app.querySelector('.sg-result');
  var after = app.querySelector('.sg-after');
  var fill = app.querySelector('.sg-meter-fill');
  var checkButton = app.querySelector('[data-action="check"]');
  var targetButtons = app.querySelectorAll('.sg-target-btn');
  var siteBoxes = app.querySelectorAll('.sg-site');
  var cells = {};

  function siteOf(sym) {
    if (state.a.indexOf(sym) >= 0) { return 'a'; }
    if (state.b.indexOf(sym) >= 0) { return 'b'; }
    return '';
  }

  function remove(sym) {
    var site = siteOf(sym);
    if (site) { state[site].splice(state[site].indexOf(sym), 1); }
  }

  function add(sym, site) {
    if (state.locked) { return; }
    var current = siteOf(sym);
    if (current === site) { return; }
    if (current) { remove(sym); }
    state[site].push(sym);
    render();
  }

  function setTarget(site) {
    state.target = site;
    Array.prototype.forEach.call(targetButtons, function (btn) {
      btn.setAttribute('aria-pressed', btn.getAttribute('data-site') === site ? 'true' : 'false');
    });
    Array.prototype.forEach.call(siteBoxes, function (box) {
      box.classList.toggle('is-active', box.getAttribute('data-site') === site);
    });
  }

  function setLattice(key) {
    var info = LATTICE[key];
    latticeImg.src = MEDIA + info[0];
    latticeImg.alt = info[1];
    latticeCap.textContent = info[2];
  }

  function circle(sym) {
    // Diameter as a fraction of the largest ion, so circles scale with the cell.
    var d = 0.18 + parseInt(SIZES.charAt(index[sym]), 36) / 35 * 0.82;
    var dot = document.createElement('span');
    dot.className = 'sg-el-dot';
    dot.style.setProperty('--sg-d', d.toFixed(3));
    return dot;
  }

  function buildTable() {
    LAYOUT.forEach(function (line) {
      if (line === '_') {
        var gap = document.createElement('div');
        gap.className = 'sg-gap';
        table.appendChild(gap);
        return;
      }
      line.split(' ').forEach(function (sym) {
        if (sym === '.') {
          var blank = document.createElement('span');
          blank.className = 'sg-blank';
          table.appendChild(blank);
          return;
        }
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'sg-el sg-cat-' + GROUPS.charAt(index[sym]);
        btn.setAttribute('data-symbol', sym);
        btn.setAttribute('draggable', 'true');
        btn.appendChild(circle(sym));
        var label = document.createElement('span');
        label.className = 'sg-el-sym';
        label.textContent = sym;
        btn.appendChild(label);
        var badge = document.createElement('span');
        badge.className = 'sg-el-badge';
        btn.appendChild(badge);
        btn.addEventListener('click', function () {
          if (state.locked) { return; }
          // On the selected site: take it off. Elsewhere or unplaced: put it on
          // the selected site, moving it from the other site if needed.
          if (siteOf(sym) === state.target) { remove(sym); render(); } else { add(sym, state.target); }
        });
        btn.addEventListener('dragstart', function (e) {
          if (state.locked) { e.preventDefault(); return; }
          e.dataTransfer.setData('text/plain', sym);
          e.dataTransfer.effectAllowed = 'move';
        });
        cells[sym] = btn;
        table.appendChild(btn);
      });
    });
  }

  function renderChips(site) {
    var box = app.querySelector('.sg-site[data-site="' + site + '"]');
    var list = box.querySelector('.sg-chips');
    list.textContent = '';
    state[site].forEach(function (sym) {
      var li = document.createElement('li');
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'sg-chip sg-cat-' + GROUPS.charAt(index[sym]);
      chip.disabled = state.locked;
      chip.setAttribute('aria-label', 'Remove ' + sym + ' from the ' + site.toUpperCase() + ' site');
      chip.appendChild(circle(sym));
      var label = document.createElement('span');
      label.textContent = sym;
      chip.appendChild(label);
      var x = document.createElement('span');
      x.className = 'sg-chip-x';
      x.setAttribute('aria-hidden', 'true');
      x.textContent = '×';
      chip.appendChild(x);
      chip.setAttribute('draggable', state.locked ? 'false' : 'true');
      chip.addEventListener('click', function () {
        if (state.locked) { return; }
        remove(sym);
        render();
      });
      chip.addEventListener('dragstart', function (e) {
        if (state.locked) { e.preventDefault(); return; }
        e.dataTransfer.setData('text/plain', sym);
        e.dataTransfer.effectAllowed = 'move';
      });
      li.appendChild(chip);
      list.appendChild(li);
    });
    box.classList.toggle('is-empty', state[site].length === 0);
    box.querySelector('[data-clear]').disabled = state.locked || state[site].length === 0;
  }

  function render() {
    renderChips('a');
    renderChips('b');
    Object.keys(cells).forEach(function (sym) {
      var site = siteOf(sym);
      var cell = cells[sym];
      cell.classList.toggle('is-placed', !!site);
      cell.querySelector('.sg-el-badge').textContent = site ? site.toUpperCase() : '';
      cell.setAttribute('aria-label', site ? sym + ', on the ' + site.toUpperCase() + ' site' : sym);
      cell.disabled = state.locked;
    });
    var empty = state.a.length + state.b.length === 0;
    checkButton.disabled = state.locked || empty;
    Array.prototype.forEach.call(targetButtons, function (btn) {
      btn.disabled = state.locked;
    });
    app.classList.toggle('is-locked', state.locked);
  }

  function reveal() {
    var value = score(state.a, state.b);
    var made = value >= THRESHOLD;
    state.locked = true;
    state.tries += 1;
    if (made) { state.found += 1; }
    scoreEl.textContent = String(Math.floor(value));
    fill.style.width = value.toFixed(1) + '%';
    result.classList.add('is-revealed');
    result.classList.toggle('is-yes', made);
    result.classList.toggle('is-no', !made);
    verdictEl.textContent = made ? 'Synthesizable.' :
      'Not synthesizable. Change the elements and try again.';
    predictEl.textContent = made ? 'This composition is predicted to form.' :
      'This composition is not predicted to form.';
    predictEl.hidden = false;
    tallyEl.hidden = false;
    tallyEl.textContent = 'Synthesizable compositions found: ' + state.found + ' in ' + state.tries +
      (state.tries === 1 ? ' try' : ' tries');
    after.hidden = false;
    setLattice(made ? 'yes' : 'no');
    render();
    if (result.getBoundingClientRect().bottom > window.innerHeight) {
      result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  function unlock(clear) {
    state.locked = false;
    if (clear) { state.a = []; state.b = []; setTarget('a'); }
    scoreEl.textContent = '??';
    fill.style.width = '0';
    result.classList.remove('is-revealed', 'is-yes', 'is-no');
    verdictEl.textContent = 'Press Check to see the score.';
    predictEl.hidden = true;
    after.hidden = true;
    setLattice('start');
    render();
  }

  Array.prototype.forEach.call(targetButtons, function (btn) {
    btn.addEventListener('click', function () { setTarget(btn.getAttribute('data-site')); });
  });

  Array.prototype.forEach.call(siteBoxes, function (box) {
    var site = box.getAttribute('data-site');
    box.addEventListener('click', function (e) {
      if (!state.locked && !e.target.closest('button')) { setTarget(site); }
    });
    box.addEventListener('dragover', function (e) {
      if (state.locked) { return; }
      e.preventDefault();
      box.classList.add('is-over');
    });
    box.addEventListener('dragleave', function (e) {
      if (!box.contains(e.relatedTarget)) { box.classList.remove('is-over'); }
    });
    box.addEventListener('drop', function (e) {
      e.preventDefault();
      box.classList.remove('is-over');
      var sym = e.dataTransfer.getData('text/plain');
      if (sym && index.hasOwnProperty(sym)) { add(sym, site); }
    });
    box.querySelector('[data-clear]').addEventListener('click', function () {
      if (state.locked) { return; }
      state[site] = [];
      render();
    });
  });

  checkButton.addEventListener('click', reveal);

  after.querySelector('[data-action="new"]').addEventListener('click', function () { unlock(true); });
  after.querySelector('[data-action="edit"]').addEventListener('click', function () { unlock(false); });

  // Fetch the two result pictures once someone starts playing.
  table.addEventListener('click', function preload() {
    [LATTICE.yes[0], LATTICE.no[0]].forEach(function (name) { new Image().src = MEDIA + name; });
    table.removeEventListener('click', preload);
  });

  buildTable();
  render();
}());
