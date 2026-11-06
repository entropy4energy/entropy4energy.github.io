// CHAOS material pages: a search over the ordered structures in CHAOS, one
// view per composition (?f=CoO, every structure at that stoichiometry) and
// one view per structure (?id=<16 hex digits of the CHAOS identifier). The
// data are the files the CHAOS API gate serves to signed-in accounts under
// /API/chaos/profiles/materials/; this page holds no data of its own, and
// every sentence is written here from the numbers.
(function () {
  "use strict";

  var C = window.CHAOS;
  var esc = C.esc, formula = C.formula, sig = C.sig, released = C.released, list = C.list, params = C.params, section = C.section;
  var API = "/API/chaos/profiles/";
  var QUERY_BASE = "https://chaos.s4e.ai/API/?";
  var XRD = "https://s4e.ai/xrd/";
  var FORMAT = 1;
  // This page's own name, and the names of the system pages and the hull app
  // on the same host: chaos-materials, chaos-systems and chaos-hull on
  // chaos.s4e.ai, or materials, systems and hull if the pages drop the prefix.
  var PAGE = location.pathname.replace(/^.*\//, "").replace(/\.html$/, "") || "chaos-materials";
  var SYSTEMS = PAGE === "materials" ? "systems" : "chaos-systems";
  var HULL = PAGE === "materials" ? "hull" : "chaos-hull";
  var LAMBDA = 1.5406; // Cu Kα1, Å
  var app = document.getElementById("cs-app");
  if (!app) return;

  function status(html, cls) { C.status(app, html, cls); }
  function load(path) { return C.load(API, "materials/" + path); }
  function failed(err) {
    C.failed(app, err, {
      title: "CHAOS materials",
      lead: "The material pages are for registered CHAOS users. Each gives the structures of a composition, " +
        "their formation enthalpies, calculated powder patterns and the disordered systems they belong to.",
      missing: "There is no material with this address in the current release.",
      back: [PAGE, "Search materials"],
      unavailable: "The material pages are not available right now. Try again later.",
    });
  }

  // ------------------------------------------------------------ formulas
  // Counts from CoO, Co1O1, OCo, SrTiO3, Ca(OH)2; null when the text is not
  // a formula.
  function parseFormula(text) {
    var t = String(text || "").replace(/\s/g, ""), i = 0;
    function group() {
      var out = {};
      while (i < t.length && t[i] !== ")") {
        var part, m;
        if (t[i] === "(") {
          i++;
          part = group();
          if (part === null || t[i] !== ")") return null;
          i++;
        } else if ((m = /^[A-Z][a-z]?/.exec(t.slice(i)))) {
          part = {};
          part[m[0]] = 1;
          i += m[0].length;
        } else {
          return null;
        }
        var n = /^\d+/.exec(t.slice(i));
        var k = n ? parseInt(n[0], 10) : 1;
        if (n) i += n[0].length;
        if (!k) return null;
        Object.keys(part).forEach(function (e) { out[e] = (out[e] || 0) + part[e] * k; });
      }
      return out;
    }
    var out = group();
    if (out === null || i !== t.length || !Object.keys(out).length) return null;
    return out;
  }
  function gcd(a, b) { return b ? gcd(b, a % b) : a; }
  // The file key: alphabetical elements, reduced counts, 1 left out (HfO3Sr).
  function keyOf(counts) {
    var els = Object.keys(counts).sort();
    var g = els.reduce(function (acc, e) { return gcd(acc, counts[e]); }, 0) || 1;
    return els.map(function (e) { var n = counts[e] / g; return e + (n === 1 ? "" : n); }).join("");
  }
  function matLink(f) { return PAGE + "?f=" + encodeURIComponent(f); }
  function structLink(id) { return PAGE + "?id=" + encodeURIComponent(id); }
  function sysLink(id) { return SYSTEMS + "?id=" + encodeURIComponent(id); }
  function meV(x) { return x == null ? "–" : (x > 0 ? "+" : "") + sig(x, 3); }
  // The relaxed structure: its name where it has one (rocksalt, wurtzite), else its Pearson symbol.
  function structName(s) {
    return s.structure ? C.structure(s.structure) : s.pearson ? C.pearson(s.pearson) : "–";
  }
  // The prototype a calculation started from (an AFLOW-style label, shown as code).
  function protoText(s) {
    return s.prototype ? '<span class="cm-proto">' + esc(s.prototype) + "</span>" : "–";
  }
  var sgSymbol = C.spaceGroup;
  // The relaxed space group: symbol and number, both of the relaxed structure.
  function sgText(s) {
    if (!s.sg) return "–";
    return (s.sg_symbol ? sgSymbol(s.sg_symbol) + " " : "") + "(" + esc(s.sg) + ")";
  }

  // ------------------------------------------------------------ search
  function searchView() {
    app.innerHTML =
      "<h1>CHAOS materials</h1>" +
      '<p class="cs-lead">Ordered structures in CHAOS, each relaxed with <u>d</u>ensity <u>f</u>unctional <u>t</u>heory (DFT). ' +
      "Search by formula or by elements.</p>" +
      '<form class="cs-controls" id="cm-form" role="search"><div class="cs-field cs-grow"><label for="cm-q">Formula or elements</label>' +
      '<input id="cm-q" type="search" placeholder="CoO or Co Mg O" autocomplete="off">' +
      '<span class="cs-hint">A formula opens its page; elements list the compositions that contain all of them</span></div>' +
      '<div class="cs-field"><button type="submit" class="cs-button primary">Search</button></div></form>' +
      '<p class="cs-count" id="cm-count" role="status"></p><div class="cs-scroll"><table class="cs-table" id="cm-results"></table></div>';
    document.title = "CHAOS materials | Entropy for Energy Laboratory | Johns Hopkins";
    var q = document.getElementById("cm-q");
    q.value = params().get("q") || "";
    document.getElementById("cm-form").onsubmit = function (e) { e.preventDefault(); run(q.value); };
    if (q.value) run(q.value);
  }

  function run(text) {
    var count = document.getElementById("cm-count");
    var table = document.getElementById("cm-results");
    var words = String(text).split(/[\s,;\-]+/).filter(Boolean);
    var els = words.map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(); });
    // one word is an element when written as one (Co, co, O), and a formula
    // otherwise (CoO, CO, BN)
    var isElements = words.length > 1 || (words.length === 1 && /^([A-Z][a-z]?|[a-z]{1,2})$/.test(words[0]));
    history.replaceState(null, "", PAGE + (text ? "?q=" + encodeURIComponent(text) : ""));
    if (!words.length) { count.textContent = ""; table.innerHTML = ""; return; }
    if (!isElements) {
      var counts = parseFormula(words[0]);
      if (!counts) { count.textContent = "Not a formula or a list of element symbols."; table.innerHTML = ""; return; }
      location.href = matLink(words[0]);
      return;
    }
    if (els.some(function (e) { return !/^[A-Z][a-z]?$/.test(e); })) {
      count.textContent = "Not a formula or a list of element symbols.";
      table.innerHTML = "";
      return;
    }
    count.textContent = "Searching…";
    load("index/" + encodeURIComponent(els[0])).then(function (idx) {
      var rows = (idx.compositions || []).filter(function (r) {
        var c = parseFormula(r[0]) || {};
        return els.every(function (e) { return c[e]; });
      });
      rows.sort(function (a, b) { return (a[1].length - b[1].length) || (a[1] < b[1] ? -1 : 1); });
      count.textContent = rows.length.toLocaleString("en-US") + (rows.length === 1 ? " composition" : " compositions") +
        " with " + list(els);
      // the element lists carry names and counts only; values are on the (counted) composition pages
      table.innerHTML = "<thead><tr><th>Composition</th><th class=num>Structures</th></tr></thead><tbody>" +
        rows.slice(0, 500).map(function (r) {
          return '<tr><td><a href="' + matLink(r[1]) + '">' + formula(r[1]) + "</a></td><td class=num>" + esc(r[2]) + "</td></tr>";
        }).join("") + "</tbody>";
    }, function (err) {
      if (err.status === 404) { count.textContent = "0 compositions with " + list(els); table.innerHTML = ""; return; }
      failed(err);
    });
  }

  // ------------------------------------------------------------ shared blocks
  function systemsBlock(systems, label) {
    var em = (systems && systems.end_member) || [];
    var two = (systems && systems.two_cation) || [];
    if (!em.length && !two.length) return { html: "", n: 0 };
    var says = [];
    if (em.length) says.push(formula(label) + " is an end member of " + em.length + " disordered system" + (em.length === 1 ? "" : "s"));
    if (two.length) says.push((em.length ? "a two-cation compound of " : formula(label) + " is a two-cation compound of ") + two.length +
      (em.length ? " more" : " disordered system" + (two.length === 1 ? "" : "s")));
    function ul(items) {
      return '<ul class="cm-systems">' + items.map(function (s) {
        return '<li><a href="' + sysLink(s.id) + '">' + formula(s.label) + "</a></li>";
      }).join("") + "</ul>";
    }
    var html = "<p>" + says.join(" and ") + " in CHAOS.</p>";
    if (em.length) html += '<h3 class="cs-h3">End member of</h3>' + ul(em);
    if (two.length) html += '<h3 class="cs-h3">Two-cation compound of</h3>' + ul(two);
    return { html: html, n: em.length + two.length };
  }

  function stabilityText(h, label) {
    if (!h) return "";
    var out = "<p>Distance to the hull: <b>" + (h.distance_meV === 0 ? "0" : meV(h.distance_meV)) + " meV/atom</b>.";
    if (h.decomposition && h.decomposition.length) {
      out += " At 0 K, " + formula(label) + " is above the lowest-energy combination " +
        list(h.decomposition.map(function (d) {
          var f = formula(d[0]);
          return sig(d[1], 3) + " " + (d[2] ? '<a href="' + structLink(d[2]) + '">' + f + "</a>" : f);
        })) + ".";
    } else if (h.distance_meV === 0) {
      out += " " + formula(label) + " is on the hull.";
    }
    out += "</p>";
    if (h.system) out += '<p><a class="cs-button" href="' + HULL + "?sys=" + encodeURIComponent(h.system) + '">Phase stability of ' + esc(h.system) + "</a></p>";
    return out;
  }

  function dataBlock(q, json, rel, idLine, intro) {
    return "<p>" + intro + "</p>" +
      '<pre class="cs-code" id="cs-query">' + esc(q) + "</pre>" +
      '<p class="cs-actions"><button type="button" class="cs-button" id="cs-copy">Copy the query</button>' +
      '<a class="cs-button" href="' + QUERY_BASE + esc(q) + '">Run it</a>' +
      '<a class="cs-button" href="' + API + "materials/" + esc(json) + '">This page\'s data (JSON)</a></p>' +
      '<dl class="cs-dl">' + idLine + "<dt>Computed on</dt><dd>" + released(rel) + "</dd>" +
      "<dt>Cite</dt><dd>CHAOS, Entropy for Energy Laboratory, Johns Hopkins University, https://chaos.s4e.ai, release " + released(rel) + ".</dd></dl>" +
      '<p class="cs-dim">Fields and units: <a href="https://chaos.s4e.ai/API/?schema">schema</a> and ' +
      '<a href="https://chaos.s4e.ai/API/?help">API help</a>.</p>';
  }

  function note() {
    return '<p class="cs-note">Formation enthalpies use the <u>P</u>erdew–<u>B</u>urke–<u>E</u>rnzerhof (PBE) generalized gradient ' +
      "approximation for every phase. The hull is the lowest-energy combination of ordered phases at each composition.</p>";
  }

  // ------------------------------------------------------------ one composition
  function compositionView(c) {
    if (c.format !== FORMAT) { status("<h1>CHAOS materials</h1><p>This page and the data release do not match; reload the page.</p>", "error"); return; }
    history.replaceState(null, "", matLink(c.label) + location.hash);
    var rows = c.structures || [];
    var low = rows.filter(function (r) { return r.id === c.lowest; })[0];
    var name = formula(c.label);
    var anyHull = rows.some(function (r) { return r.hull_meV != null; });
    var anyGap = rows.some(function (r) { return r.gap != null; });
    var anyGroup = rows.some(function (r) { return (r.n || 1) > 1; });
    var nCalc = rows.reduce(function (a, r) { return a + (r.n || 1); }, 0);
    var sub = [esc(rows.length) + (rows.length === 1 ? " structure" : " structures") +
      (nCalc > rows.length ? " from " + esc(nCalc) + " calculations" : ""), "chemical system " + esc(c.system)];
    var html = '<div class="cs-identity"><p class="cs-crumbs"><a href="' + PAGE + '">CHAOS materials</a> / ' + esc(c.system) + "</p>" +
      '<h1 class="cs-title">' + name + "</h1><p class=\"cs-sub\">" + sub.join(" · ") + "</p></div>";
    if (low) {
      html += '<div class="cs-bar"><span class="cs-bar-item">Lowest <b>' + structName(low) + "</b> " + sgText(low) + "</span>" +
        '<span class="cs-bar-item">Δ<i>H</i><sub>f</sub> <b>' + sig(low.hf, 3) + " eV/atom</b></span>" +
        (low.hull_meV != null ? '<span class="cs-bar-item">Distance to the hull <b>' + meV(low.hull_meV) + " meV/atom</b></span>" : "") +
        (low.gap != null ? '<span class="cs-bar-item">Band gap <b>' + sig(low.gap, 3) + " eV</b></span>" : "") + "</div>";
    }

    var t = '<p>The relaxed structures of ' + name + " in CHAOS, ordered by formation enthalpy. The energy above the lowest structure compares polymorphs at the same composition." +
      (anyGroup ? " Calculations that relaxed to the same space group and Pearson symbol, within 2 meV/atom, share a row." : "") + "</p>" +
      '<div class="cs-scroll"><table class="cs-table" id="cm-structures"><thead><tr><th>Relaxed structure</th><th>Space group</th>' +
      "<th class='num cs-sm-hide'>Atoms in the cell</th>" + (anyGroup ? "<th class=num>Calculations</th>" : "") +
      "<th class=num>Δ<i>H</i><sub>f</sub> (eV/atom)</th><th class=num>Above the lowest structure (meV/atom)</th>" +
      (anyHull ? "<th class=num>Distance to the hull (meV/atom)</th>" : "") +
      (anyGap ? "<th class='num cs-sm-hide'>Band gap (eV)</th>" : "") + "<th class=cs-sm-hide>Starting prototype</th></tr></thead><tbody>";
    rows.forEach(function (r) {
      t += "<tr" + (r.id === c.lowest ? ' class="cm-lowest"' : "") + '><td><a href="' + structLink(r.id) + '">' + structName(r) + "</a></td><td>" + sgText(r) +
        "</td><td class='num cs-sm-hide'>" + esc(r.natoms) + "</td>" + (anyGroup ? "<td class=num>" + esc(r.n || 1) + "</td>" : "") +
        "<td class=num>" + sig(r.hf, 3) + "</td><td class=num>" + (r.above_lowest_meV === 0 ? "0" : meV(r.above_lowest_meV)) + "</td>" +
        (anyHull ? "<td class=num>" + meV(r.hull_meV) + "</td>" : "") +
        (anyGap ? "<td class='num cs-sm-hide'>" + (r.gap == null ? "–" : sig(r.gap, 3)) + "</td>" : "") +
        "<td class=cs-sm-hide>" + protoText(r) + "</td></tr>";
    });
    t += "</tbody></table></div>" +
      "<p class=cs-dim>Atoms in the cell: the cell of the calculation. The Pearson symbol counts the atoms of the conventional cell, which can differ.</p>";
    var stab = c.stability ? stabilityText(c.stability, c.label) :
      low ? "<p>The lowest structure of " + name + " is " + structName(low) + ", " + sig(low.hf, 3) + " eV/atom.</p>" : "";
    var sys = systemsBlock(c.systems, c.label);
    var rel = (c.same_system || []).length
      ? "<p>Other compositions of " + esc(c.elements.join(", ")) + " in CHAOS:</p>" + '<div class="cs-scroll"><table class="cs-table cs-narrow"><thead><tr><th>Composition</th>' +
        "<th class=num>Structures</th><th class=num>Lowest Δ<i>H</i><sub>f</sub> (eV/atom)</th></tr></thead><tbody>" +
        c.same_system.map(function (x) {
          return '<tr><td><a href="' + matLink(x.label) + '">' + formula(x.label) + "</a></td><td class=num>" + esc(x.n) + "</td><td class=num>" + sig(x.hf, 3) + "</td></tr>";
        }).join("") + "</tbody></table></div>"
      : "<p>" + name + " is the only composition of " + esc(c.elements.join(", ")) + " in CHAOS.</p>";
    var data = dataBlock(c.query, "c/" + c.key, c.release, "",
      "Every structure of the " + esc(c.system) + " chemical system, every field, as an API query:");
    var secs = [
      ["structures", "Structures", esc(rows.length + (rows.length === 1 ? " structure" : " structures")), t],
      ["stability", "Stability", "", stab],
      ["systems", "Disordered systems", esc(sys.n + (sys.n === 1 ? " system" : " systems")), sys.html],
      ["related", "Same chemical system", "", rel],
      ["data", "Data", "Query · citation", data],
    ].filter(function (x) { return x[3]; });
    html += '<nav class="cs-jump" aria-label="Sections">' + secs.map(function (x) { return '<a href="#' + x[0] + '">' + x[1] + "</a>"; }).join("") + "</nav>";
    secs.forEach(function (x, i) { html += section(i + 1, x[0], x[1], x[2], x[3]); });
    html += note();
    app.innerHTML = html;
    document.title = c.label + " | CHAOS materials | Entropy for Energy Laboratory | Johns Hopkins";
    C.copyButton(document.getElementById("cs-copy"), c.query, "Copy the query");
  }

  // ------------------------------------------------------------ geometry
  // Lattice vectors (rows) from a, b, c, α, β, γ in Å and degrees.
  function vectors(L) {
    var d = Math.PI / 180, a = L[0], b = L[1], c = L[2];
    var ca = Math.cos(L[3] * d), cb = Math.cos(L[4] * d), cg = Math.cos(L[5] * d), sg = Math.sin(L[5] * d);
    var cx = c * cb, cy = c * (ca - cb * cg) / sg, cz = Math.sqrt(Math.max(c * c - cx * cx - cy * cy, 0));
    return [[a, 0, 0], [b * cg, b * sg, 0], [cx, cy, cz]];
  }
  function cart(V, f) {
    return [0, 1, 2].map(function (k) { return f[0] * V[0][k] + f[1] * V[1][k] + f[2] * V[2][k]; });
  }
  // A colour per element, stable across pages.
  var PALETTE = ["#1f6fb5", "#c4472d", "#2b8a57", "#8a5a1f", "#7048a3", "#b0306f", "#3b7f8c", "#6c6f1e"];
  function color(el, els) {
    if (el === "O") return "#d1342c";
    var i = els.filter(function (e) { return e !== "O"; }).indexOf(el);
    return PALETTE[(i < 0 ? 0 : i) % PALETTE.length];
  }

  // ------------------------------------------------------------ the 3D viewer
  // The cell in 3D with 3Dmol.js (BSD-3-Clause, js/vendor/, loaded on structure pages only), from
  // the page's own data: balls and sticks, bonds from covalent radii, element colours of the Jmol
  // scheme, atoms to scale, the cell box with a, b and c, the atoms on the cell's faces repeated, a
  // 2×2×2 supercell, an orthographic or a perspective view, element and site on hover. Without
  // WebGL, or when the library does not load, the SVG picture below stands in.
  var lib3d = null;
  function load3d() {
    if (!lib3d) lib3d = new Promise(function (ok, no) {
      if (window.$3Dmol) { ok(window.$3Dmol); return; }
      var me = document.querySelector('script[src*="chaos-materials.js"]');
      var v = me && /[?&]v=([^&]+)/.exec(me.getAttribute("src"));
      var tag = document.createElement("script");
      tag.src = "js/vendor/3Dmol-min.js" + (v ? "?v=" + v[1] : "");
      tag.onload = function () { if (window.$3Dmol) ok(window.$3Dmol); else no(new Error("no viewer")); };
      tag.onerror = function () { no(new Error("the viewer did not load")); };
      document.head.appendChild(tag);
    });
    return lib3d;
  }
  function webgl() {
    try {
      var c = document.createElement("canvas");
      return !!(window.WebGLRenderingContext && (c.getContext("webgl") || c.getContext("experimental-webgl")));
    } catch (e) { return false; }
  }
  // The atoms of n×n×n cells, with those on the outer faces repeated; each keeps its site number.
  function cellAtoms(s, n) {
    var V = vectors(s.lattice), out = [];
    s.sites.forEach(function (site, i) {
      var f = site.xyz.map(function (x) { var y = ((x % 1) + 1) % 1; return y > 1 - 1e-3 ? 0 : y; });
      var r = f.map(function (x) { var k, list = []; for (k = 0; k < n; k++) list.push(k); if (x < 1e-3) list.push(n); return list; });
      r[0].forEach(function (i0) { r[1].forEach(function (i1) { r[2].forEach(function (i2) {
        out.push({ el: site.el, site: i + 1, p: cart(V, [f[0] + i0, f[1] + i1, f[2] + i2]) });
      }); }); });
    });
    return out;
  }
  function viewer3d(host, s) {
    host.innerHTML = '<div class="cm-3d" role="img" aria-label="Unit cell of ' + esc(s.label) + ', turned by dragging; hover over an atom for its site"></div>' +
      '<p class="cs-actions cm-3d-controls"><button type="button" class="cs-button" id="cm-3d-super" aria-pressed="false">2×2×2 cells</button>' +
      '<button type="button" class="cs-button" id="cm-3d-proj" aria-pressed="false">Perspective</button>' +
      '<button type="button" class="cs-button" id="cm-3d-reset">Reset view</button></p><p class="cm-legend"></p>';
    var box = host.querySelector(".cm-3d");
    return load3d().then(function ($3Dmol) {
      var v = $3Dmol.createViewer(box, { backgroundColor: "white", antialias: true });
      var V = vectors(s.lattice), n = 1, persp = false, shown = [];
      var jmol = $3Dmol.elementColors && $3Dmol.elementColors.Jmol || {};
      var hex = function (el) { var c = jmol[el]; return c == null ? "#888888" : "#" + ("000000" + c.toString(16)).slice(-6); };
      function draw() {
        v.removeAllModels(); v.removeAllShapes(); v.removeAllLabels();
        shown = cellAtoms(s, n);
        var xyz = shown.length + "\n" + s.label + "\n" + shown.map(function (a) {
          return a.el + " " + a.p.map(function (x) { return x.toFixed(5); }).join(" ");
        }).join("\n") + "\n";
        var m = v.addModel(xyz, "xyz");
        m.setStyle({}, { sphere: { scale: 0.28, colorscheme: "Jmol" }, stick: { radius: 0.12, colorscheme: "Jmol" } });
        m.setHoverable({}, true, function (atom, viewer) {
          if (atom.label) return;
          var a = shown[atom.index] || {};
          atom.label = viewer.addLabel(atom.elem + ", site " + a.site, { position: atom, inFront: true, fontSize: 13,
            fontColor: "white", backgroundColor: "#222222", backgroundOpacity: 0.85 });
        }, function (atom, viewer) { if (atom.label) { viewer.removeLabel(atom.label); delete atom.label; } });
        // the cell box of the n×n×n block, and the three axes with their letters
        var corner = function (i, j, k) { var p = cart(V, [i * n, j * n, k * n]); return { x: p[0], y: p[1], z: p[2] }; };
        [[0,0,0,1,0,0],[0,0,0,0,1,0],[0,0,0,0,0,1],[1,0,0,1,1,0],[1,0,0,1,0,1],[0,1,0,1,1,0],[0,1,0,0,1,1],
         [0,0,1,1,0,1],[0,0,1,0,1,1],[1,1,0,1,1,1],[1,0,1,1,1,1],[0,1,1,1,1,1]].forEach(function (e) {
          v.addCylinder({ start: corner(e[0], e[1], e[2]), end: corner(e[3], e[4], e[5]), radius: 0.025, color: "#555555", fromCap: 1, toCap: 1 });
        });
        [["\uD835\uDC4E", [1, 0, 0], "#c0392b"], ["\uD835\uDC4F", [0, 1, 0], "#27ae60"], ["\uD835\uDC50", [0, 0, 1], "#2c6fbb"]].forEach(function (ax) {
          var e = cart(V, ax[1]), t = cart(V, ax[1].map(function (x) { return x * 1.12; }));
          v.addArrow({ start: { x: 0, y: 0, z: 0 }, end: { x: e[0] * 0.35, y: e[1] * 0.35, z: e[2] * 0.35 }, radius: 0.06, color: ax[2] });
          v.addLabel(ax[0], { position: { x: t[0], y: t[1], z: t[2] }, fontSize: 14, fontColor: ax[2], backgroundOpacity: 0, inFront: true });
        });
        v.setProjection(persp ? "perspective" : "orthographic");
        v.zoomTo(); v.zoom(1.25); v.render();
        host.setAttribute("data-atoms", String(shown.length));
      }
      draw();
      var sup = document.getElementById("cm-3d-super"), proj = document.getElementById("cm-3d-proj");
      sup.onclick = function () {
        n = n === 1 ? 2 : 1;
        sup.textContent = n === 1 ? "2×2×2 cells" : "One cell";
        sup.setAttribute("aria-pressed", n === 2 ? "true" : "false");
        draw();
      };
      proj.onclick = function () {
        persp = !persp;
        proj.textContent = persp ? "Orthographic" : "Perspective";
        proj.setAttribute("aria-pressed", persp ? "true" : "false");
        v.setProjection(persp ? "perspective" : "orthographic"); v.render();
        host.setAttribute("data-projection", persp ? "perspective" : "orthographic");
      };
      document.getElementById("cm-3d-reset").onclick = function () { v.zoomTo(); v.zoom(1.25); v.render(); };
      host.setAttribute("data-projection", "orthographic");
      var els = [];
      s.sites.forEach(function (x) { if (els.indexOf(x.el) < 0) els.push(x.el); });
      host.querySelector(".cm-legend").innerHTML = els.map(function (e) {
        return '<span><i style="background:' + hex(e) + '"></i>' + esc(e) + "</span>";
      }).join("");
      host.setAttribute("data-viewer", "3d");
      window.addEventListener("resize", function () { v.resize(); v.render(); });
    });
  }

  // The cell as an SVG ball model, turned by dragging or the arrow keys.
  function viewer(host, s) {
    var V = vectors(s.lattice);
    var els = s.elements;
    var pts = [];
    s.sites.forEach(function (site) {
      // the site and its images on the cell faces, so the cell looks whole
      var f = site.xyz, shifts = [[0, 0, 0]];
      [0, 1, 2].forEach(function (k) {
        if (Math.abs(f[k]) < 1e-3) shifts.slice().forEach(function (sh) { var t = sh.slice(); t[k] += 1; shifts.push(t); });
      });
      shifts.forEach(function (sh) { pts.push({ el: site.el, p: cart(V, [f[0] + sh[0], f[1] + sh[1], f[2] + sh[2]]) }); });
    });
    var corners = [];
    for (var i = 0; i < 8; i++) corners.push(cart(V, [i & 1, (i >> 1) & 1, (i >> 2) & 1]));
    var edges = [[0, 1], [0, 2], [0, 4], [1, 3], [1, 5], [2, 3], [2, 6], [3, 7], [4, 5], [4, 6], [5, 7], [6, 7]];
    var center = cart(V, [0.5, 0.5, 0.5]);
    var size = Math.max.apply(null, corners.map(function (c) { return Math.hypot(c[0] - center[0], c[1] - center[1], c[2] - center[2]); }));
    var yaw = 0.6, pitch = 0.35, W = 320, H = 300;
    function project(p) {
      var x = p[0] - center[0], y = p[1] - center[1], z = p[2] - center[2];
      var x1 = x * Math.cos(yaw) + z * Math.sin(yaw), z1 = -x * Math.sin(yaw) + z * Math.cos(yaw);
      var y1 = y * Math.cos(pitch) - z1 * Math.sin(pitch), z2 = y * Math.sin(pitch) + z1 * Math.cos(pitch);
      var k = 0.42 * W / size;
      return [W / 2 + k * x1, H / 2 - k * y1, z2, k];
    }
    function draw() {
      var out = '<svg class="cm-view" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Unit cell of ' + esc(s.label) + ', turned by dragging or the arrow keys">';
      edges.forEach(function (e) {
        var a = project(corners[e[0]]), b = project(corners[e[1]]);
        out += '<line class="cm-cell" x1="' + a[0].toFixed(1) + '" y1="' + a[1].toFixed(1) + '" x2="' + b[0].toFixed(1) + '" y2="' + b[1].toFixed(1) + '"/>';
      });
      pts.map(function (q) { return { el: q.el, xy: project(q.p) }; }).sort(function (a, b) { return a.xy[2] - b.xy[2]; }).forEach(function (q) {
        var r = (q.el === "O" ? 0.55 : 0.8) * q.xy[3] * 0.5;
        out += '<circle cx="' + q.xy[0].toFixed(1) + '" cy="' + q.xy[1].toFixed(1) + '" r="' + Math.max(r, 3).toFixed(1) + '" fill="' + color(q.el, els) +
          '" class="cm-atom"><title>' + esc(q.el) + "</title></circle>";
      });
      host.querySelector(".cm-view-svg").innerHTML = out + "</svg>";
    }
    host.innerHTML = '<div class="cm-view-svg"></div><p class="cm-legend">' + els.map(function (e) {
      return '<span><i style="background:' + color(e, els) + '"></i>' + esc(e) + "</span>";
    }).join("") + '</p><p class="cs-dim">Drag to turn the cell; the arrow keys turn it too when the picture has focus.</p>';
    var box = host.querySelector(".cm-view-svg");
    box.tabIndex = 0;
    var drag = null;
    box.addEventListener("pointerdown", function (e) { drag = [e.clientX, e.clientY, yaw, pitch]; box.setPointerCapture(e.pointerId); });
    box.addEventListener("pointermove", function (e) {
      if (!drag) return;
      yaw = drag[2] + (e.clientX - drag[0]) * 0.01;
      pitch = Math.max(-1.5, Math.min(1.5, drag[3] + (e.clientY - drag[1]) * 0.01));
      draw();
    });
    box.addEventListener("pointerup", function () { drag = null; });
    box.addEventListener("keydown", function (e) {
      var step = { ArrowLeft: [-0.15, 0], ArrowRight: [0.15, 0], ArrowUp: [0, -0.15], ArrowDown: [0, 0.15] }[e.key];
      if (!step) return;
      e.preventDefault();
      yaw += step[0];
      pitch = Math.max(-1.5, Math.min(1.5, pitch + step[1]));
      draw();
    });
    draw();
  }

  // ------------------------------------------------------------ files
  function cif(s) {
    var L = s.lattice;
    var lines = ["# CHAOS " + s.chaos_id + ", release " + (s.release || ""), "data_" + s.label,
      "_symmetry_space_group_name_H-M   'P 1'", "_symmetry_Int_Tables_number   1",
      "_cell_length_a   " + L[0], "_cell_length_b   " + L[1], "_cell_length_c   " + L[2],
      "_cell_angle_alpha   " + L[3], "_cell_angle_beta   " + L[4], "_cell_angle_gamma   " + L[5],
      "loop_", "_symmetry_equiv_pos_as_xyz", "  'x, y, z'",
      "loop_", "_atom_site_label", "_atom_site_type_symbol", "_atom_site_fract_x", "_atom_site_fract_y", "_atom_site_fract_z", "_atom_site_occupancy"];
    var n = {};
    s.sites.forEach(function (site) {
      n[site.el] = (n[site.el] || 0) + 1;
      lines.push("  " + site.el + n[site.el] + " " + site.el + " " + site.xyz.join(" ") + " 1");
    });
    return lines.join("\n") + "\n";
  }
  function patternCsv(s) {
    return "two_theta_deg,d_angstrom,relative_intensity,hkl\n" + s.pattern.map(function (p) { return p.join(","); }).join("\n") + "\n";
  }

  // ------------------------------------------------------------ the pattern
  // Sticks, or a sum of Gaussian peaks of the chosen width (full width at
  // half maximum, degrees 2θ).
  // Drawn at the width of its box, so labels keep their size on a phone.
  function patternSvg(peaks, fwhm, width) {
    var W = Math.max(300, Math.min(720, Math.round(width || 560))), H = 220, L = 40, R = 10, T = 10, B = 34, lo = 10, hi = 90;
    var x = function (t) { return L + (t - lo) / (hi - lo) * (W - L - R); };
    var y = function (i) { return T + (1 - i / 100) * (H - T - B); };
    var out = '<svg class="cm-pattern" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Calculated powder pattern">';
    out += '<line class="cm-axis" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(0) + '" y2="' + y(0) + '"/>';
    for (var t = 10; t <= 90; t += W < 420 ? 20 : 10) {
      out += '<text class="cs-map-tick" x="' + x(t) + '" y="' + (H - B + 14) + '" text-anchor="middle">' + t + "</text>";
    }
    out += '<text class="cs-map-axis" x="' + (L + (W - L - R) / 2) + '" y="' + (H - 4) + '" text-anchor="middle">2<tspan font-style="italic">θ</tspan> (degrees)</text>';
    out += '<text class="cs-map-axis" transform="translate(12 ' + (T + (H - T - B) / 2) + ') rotate(-90)" text-anchor="middle">intensity</text>';
    if (fwhm > 0) {
      var sigma = fwhm / 2.3548, pts = [], top = 0, vals = [];
      for (var k = 0; k <= 800; k++) {
        var tt = lo + (hi - lo) * k / 800, v = 0;
        peaks.forEach(function (p) { v += p[2] * Math.exp(-0.5 * Math.pow((tt - p[0]) / sigma, 2)); });
        vals.push([tt, v]);
        top = Math.max(top, v);
      }
      vals.forEach(function (q) { pts.push(x(q[0]).toFixed(1) + "," + y(top ? 100 * q[1] / top : 0).toFixed(1)); });
      out += '<polyline class="cm-curve" points="' + pts.join(" ") + '"/>';
    } else {
      peaks.forEach(function (p) {
        out += '<line class="cm-stick" x1="' + x(p[0]).toFixed(1) + '" x2="' + x(p[0]).toFixed(1) + '" y1="' + y(0) + '" y2="' + y(p[2]).toFixed(1) +
          '"><title>' + sig(p[0], 4) + "°, " + esc(p[3]) + "</title></line>";
      });
    }
    return out + "</svg>";
  }

  // ------------------------------------------------------------ one structure
  function structureView(s) {
    if (s.format !== FORMAT) { status("<h1>CHAOS materials</h1><p>This page and the data release do not match; reload the page.</p>", "error"); return; }
    var name = formula(s.label);
    var comp = s.composition || {};
    var lowest = comp.lowest === s.id;
    var L = s.lattice || [];
    var sub = [];
    if (s.sg) sub.push("space group " + sgText(s));
    if (s.pearson) sub.push("Pearson symbol " + C.pearson(s.pearson));
    var html = '<div class="cs-identity"><p class="cs-crumbs"><a href="' + PAGE + '">CHAOS materials</a> / <a href="' + matLink(s.label) + '">' + name + "</a></p>" +
      '<p class="cs-kicker">' + (s.structure ? C.structure(s.structure) : "ordered structure") + "</p>" +
      '<h1 class="cs-title">' + name + "</h1><p class=\"cs-sub\">" + sub.join(" · ") + '</p><p class="cs-chaos-id">' + esc(s.chaos_id) + "</p></div>";
    html += '<div class="cs-bar">' + (s.hf != null ? '<span class="cs-bar-item">Δ<i>H</i><sub>f</sub> <b>' + sig(s.hf, 3) + " eV/atom</b></span>" : "") +
      (s.above_lowest_meV != null ? '<span class="cs-bar-item">Above the lowest structure <b>' + (s.above_lowest_meV === 0 ? "0" : meV(s.above_lowest_meV)) + " meV/atom</b></span>" : "") +
      (s.hull ? '<span class="cs-bar-item">Distance to the hull <b>' + meV(s.hull.distance_meV) + " meV/atom</b></span>" : "") +
      (s.gap != null ? '<span class="cs-bar-item">Band gap <b>' + sig(s.gap, 3) + " eV</b></span>" :
        s.gap_type ? '<span class="cs-bar-item">Band gap <b>' + esc(s.gap_type) + "</b></span>" : "") + "</div>";

    // 1 structure
    var hasQ = s.sites.some(function (x) { return x.q != null; });
    var hasM = s.sites.some(function (x) { return x.m != null; });
    var cell = L.length === 6;
    var K = s.conventional;
    var abc = function (a, b, c, al, be, ga) {
      return "<i>a</i> = " + sig(a, 4) + " Å, <i>b</i> = " + sig(b, 4) + " Å, <i>c</i> = " + sig(c, 4) + " Å<br>" +
        "<i>α</i> = " + sig(al, 4) + "°, <i>β</i> = " + sig(be, 4) + "°, <i>γ</i> = " + sig(ga, 4) + "°";
    };
    var st = '<div class="cm-structure">' + (cell ? '<figure class="cm-view-box" id="cm-viewer"></figure>' : "") + "<div>" +
      '<dl class="cs-dl">' +
      (K && K.system ? "<dt>Crystal system</dt><dd>" + esc(K.system) + "</dd>" : "") +
      (s.sg ? "<dt>Space group</dt><dd>" + sgText(s) + "</dd>" : "") +
      (s.pearson ? "<dt>Pearson symbol</dt><dd>" + C.pearson(s.pearson) + "</dd>" : "") +
      (K ? "<dt>Conventional cell</dt><dd>" + abc(K.a, K.b, K.c, K.alpha, K.beta, K.gamma) + "</dd>" : "") +
      (L.length ? "<dt>Cell of the calculation</dt><dd>" + abc(L[0], L[1], L[2], L[3], L[4], L[5]) + "<br>" + esc(s.natoms) +
        " atoms. The picture, the sites and the CIF use this cell.</dd>" : "") +
      (s.volume_atom != null ? "<dt>Volume per atom</dt><dd>" + sig(s.volume_atom, 4) + " Å<sup>3</sup></dd>" : "") +
      (s.density != null ? "<dt>Density</dt><dd>" + sig(s.density, 4) + " g/cm<sup>3</sup></dd>" : "") +
      (s.prototype ? "<dt>Starting prototype</dt><dd><span class=\"cm-proto\">" + esc(s.prototype) + "</span></dd>" : "") +
      (s.wyckoff ? "<dt>Wyckoff positions</dt><dd>" + C.wyckoff(s.wyckoff) + "</dd>" : "") + "</dl>";
    if (s.pairs && s.pairs.length) {
      st += '<h3 class="cs-h3">Nearest-neighbor distances</h3><div class="cs-scroll"><table class="cs-table cs-narrow"><thead><tr><th>Pair</th><th class=num>Distance (Å)</th></tr></thead><tbody>' +
        s.pairs.map(function (p) { return "<tr><td>" + esc(p[0]) + "–" + esc(p[1]) + "</td><td class=num>" + sig(p[2], 4) + "</td></tr>"; }).join("") + "</tbody></table></div>";
    }
    st += "</div></div>";
    st += '<h3 class="cs-h3">Sites</h3><div class="cs-scroll"><table class="cs-table" id="cm-sites"><thead><tr><th>Site</th><th class=num><i>x</i></th><th class=num><i>y</i></th><th class=num><i>z</i></th>' +
      (hasQ ? "<th class=num>Bader charge (<i>e</i>)</th><th class='num cs-sm-hide'>Atomic volume (Å<sup>3</sup>)</th>" : "") +
      (hasM ? "<th class=num>Moment (<i>μ</i><sub>B</sub>)</th>" : "") + "</tr></thead><tbody>";
    var count = {};
    s.sites.forEach(function (x) {
      count[x.el] = (count[x.el] || 0) + 1;
      st += "<tr><td>" + esc(x.el) + count[x.el] + "</td>" + x.xyz.map(function (v) { return "<td class=num>" + v.toFixed(4).replace("-", "−") + "</td>"; }).join("") +
        (hasQ ? "<td class=num>" + (x.q == null ? "–" : x.q.toFixed(2).replace("-", "−")) + "</td><td class='num cs-sm-hide'>" + (x.v == null ? "–" : x.v.toFixed(2)) + "</td>" : "") +
        (hasM ? "<td class=num>" + (x.m == null ? "–" : x.m.toFixed(2).replace("-", "−")) + "</td>" : "") + "</tr>";
    });
    st += "</tbody></table></div>";
    if (hasQ) {
      var mean = {};
      s.sites.forEach(function (x) { if (x.q != null) { mean[x.el] = mean[x.el] || [0, 0]; mean[x.el][0] += x.q; mean[x.el][1]++; } });
      st += '<p class="cs-dim">Mean Bader charge per element: ' + Object.keys(mean).map(function (e) {
        return esc(e) + " " + (mean[e][0] / mean[e][1] >= 0 ? "+" : "") + (mean[e][0] / mean[e][1]).toFixed(2).replace("-", "−") + " <i>e</i>";
      }).join(", ") + ".</p>";
    }
    if (cell) st += '<p class="cs-actions"><button type="button" class="cs-button" id="cm-cif">Download CIF</button></p>';

    // 2 stability
    var stab = "";
    if (s.hf != null) {
      stab = "<p>Formation enthalpy <b>" + sig(s.hf, 4) + " eV/atom</b>." +
        (lowest ? " This is the lowest structure of " + name + " in CHAOS." :
          comp.lowest && s.above_lowest_meV != null ? " This structure lies " + meV(s.above_lowest_meV) + ' meV/atom above the <a href="' +
            structLink(comp.lowest) + '">lowest structure of ' + name + "</a>." : "") + "</p>";
    }
    stab += stabilityText(s.hull, s.label);

    // 3 pattern
    var pat;
    if (s.pattern && s.pattern.length) {
      pat = '<div class="cm-pattern-box" id="cm-pattern"></div>' +
        '<p><label class="cs-inline" for="cm-width">Peak width <input id="cm-width" type="range" min="0" max="1" step="0.05" value="0"> ' +
        '<span id="cm-width-v">sticks</span></label></p>' +
        '<p class="cs-dim">Calculated powder pattern for Cu Kα<sub>1</sub> radiation (' + LAMBDA + " Å) from the relaxed structure, " +
        "the " + s.pattern.length + " strongest reflections between 10° and 90° 2θ. Peak width is set here for display.</p>" +
        '<div class="cs-scroll"><table class="cs-table cs-narrow" id="cm-peaks"><thead><tr><th class=num>2<i>θ</i> (°)</th><th class=num><i>d</i> (Å)</th><th class=num>Intensity</th><th><i>hkl</i></th></tr></thead><tbody>' +
        s.pattern.slice().sort(function (a, b) { return b[2] - a[2]; }).slice(0, 10).map(function (p) {
          return "<tr><td class=num>" + p[0].toFixed(2) + "</td><td class=num>" + sig(p[1], 4) + "</td><td class=num>" + p[2].toFixed(1) + "</td><td>" + esc(p[3]) + "</td></tr>";
        }).join("") + "</tbody></table></div>" +
        '<p class="cs-actions"><button type="button" class="cs-button" id="cm-csv">Pattern (CSV)</button>' +
        '<a class="cs-button" href="' + XRD + '">Compare with a measured scan in XRD Phase ID</a></p>';
    } else {
      pat = null;
    }

    // 4 electronic and magnetic
    var gapType = s.gap_type ? ' <span class="cs-dim">' + esc(s.gap_type) + "</span>" : "";
    // only the values this structure has: the section is left out without any
    var elRows = (s.gap != null ? "<dt>Band gap</dt><dd>" + sig(s.gap, 3) + " eV" + gapType + "</dd>" :
        s.gap_type ? "<dt>Band gap</dt><dd>" + esc(s.gap_type) + "</dd>" : "") +
      (s.spin_cell != null ? "<dt>Magnetic moment per cell</dt><dd>" + sig(s.spin_cell, 3) + " <i>μ</i><sub>B</sub></dd>" : "") +
      (s.spin_atom != null ? "<dt>Magnetic moment per atom</dt><dd>" + sig(s.spin_atom, 3) + " <i>μ</i><sub>B</sub></dd>" : "");
    var el = elRows || hasM ? (elRows ? '<dl class="cs-dl">' + elRows + "</dl>" : "") +
      (hasM ? '<p class="cs-dim">Moments per site are in the sites table.</p>' : "") : "";

    // 5 systems, 6 others, 7 data
    var sys = systemsBlock(s.systems, s.label);
    var others = comp.others || [];
    var oth = others.length
      ? '<div class="cs-scroll"><table class="cs-table cs-narrow"><thead><tr><th>Relaxed structure</th><th>Space group</th><th class=num>Above the lowest (meV/atom)</th></tr></thead><tbody>' +
        others.map(function (r) {
          return '<tr><td><a href="' + structLink(r.id) + '">' + structName(r) + "</a></td><td>" + sgText(r) + "</td><td class=num>" +
            (r.above_lowest_meV === 0 ? "0" : meV(r.above_lowest_meV)) + "</td></tr>";
        }).join("") + "</tbody></table></div>" + '<p><a href="' + matLink(s.label) + '">All structures of ' + name + "</a></p>"
      : "<p>This is the only structure of " + name + " in CHAOS.</p>";
    if (comp.same_structure) {
      oth = "<p>" + esc(comp.same_structure) + (comp.same_structure === 1 ? " other calculation" : " other calculations") +
        " of " + name + " relaxed to this structure within 2 meV/atom.</p>" + oth;
    }
    var set = s.settings || {};
    var data = dataBlock(s.query, "s/" + s.id.slice(0, 2) + "/" + s.id, s.release, "<dt>CHAOS identifier</dt><dd>" + esc(s.chaos_id) + "</dd>",
      "This structure, every field, as an API query:") +
      '<dl class="cs-dl">' + (set.functional ? "<dt>Functional</dt><dd>" + esc(set.functional.replace(/^PAW_/, "")) + "</dd>" : "") +
      (set.cutoff_eV ? "<dt>Plane-wave cutoff</dt><dd>" + sig(set.cutoff_eV, 4) + " eV</dd>" : "") +
      (set.kpoints ? "<dt><i>k</i>-points</dt><dd>" + esc(set.kpoints) + "</dd>" : "") + "</dl>";

    var secs = [
      ["structure", "Structure", esc(s.natoms + " atoms in the cell"), st],
      ["stability", "Stability", "", stab],
      ["pattern", "Powder pattern", "Cu Kα<sub>1</sub>", pat],
      ["electronic", "Electronic and magnetic", "", el],
      ["systems", "Disordered systems", esc(sys.n + (sys.n === 1 ? " system" : " systems")), sys.html],
      ["others", "Other structures", others.length ? esc(others.length + " more at this composition") : "", oth],
      ["data", "Data", "Query · settings · citation", data],
    ].filter(function (x) { return x[3]; });
    html += '<nav class="cs-jump" aria-label="Sections">' + secs.map(function (x) { return '<a href="#' + x[0] + '">' + x[1] + "</a>"; }).join("") + "</nav>";
    secs.forEach(function (x, i) { html += section(i + 1, x[0], x[1], x[2], x[3]); });
    html += note();
    app.innerHTML = html;
    document.title = s.label + " " + (s.structure || s.pearson || "") + " | CHAOS materials | Entropy for Energy Laboratory | Johns Hopkins";

    var stem = s.label + "_" + s.id;
    if (cell) {
      var vhost = document.getElementById("cm-viewer");
      var flat = function () { viewer(vhost, s); vhost.setAttribute("data-viewer", "svg"); };
      if (webgl()) viewer3d(vhost, s).catch(flat); else flat();
      document.getElementById("cm-cif").onclick = function () { C.download(stem + ".cif", cif(s), "chemical/x-cif"); };
    }
    if (s.pattern && s.pattern.length) {
      var box = document.getElementById("cm-pattern"), w = document.getElementById("cm-width"), wv = document.getElementById("cm-width-v");
      var redraw = function () {
        var f = parseFloat(w.value);
        box.innerHTML = patternSvg(s.pattern, f, box.clientWidth);
        wv.textContent = f > 0 ? f.toFixed(2) + "° 2θ" : "sticks";
      };
      w.oninput = redraw;
      redraw();
      document.getElementById("cm-csv").onclick = function () { C.download(stem + "_pattern.csv", patternCsv(s), "text/csv"); };
    }
    C.copyButton(document.getElementById("cs-copy"), s.query, "Copy the query");
  }

  // ------------------------------------------------------------ start
  if (!C.onCHAOSHost()) {
    status('<h1>CHAOS materials</h1><p>The material pages are on <a href="https://chaos.s4e.ai/">chaos.s4e.ai</a>.</p>');
    return;
  }
  var q = params();
  var id = q.get("id"), f = q.get("f");
  if (id) {
    if (!/^[0-9a-f]{16}$/.test(id)) { failed({ status: 404, body: {} }); return; }
    status("<p>Loading…</p>");
    load("s/" + id.slice(0, 2) + "/" + id).then(structureView, failed);
  } else if (f) {
    var counts = parseFormula(f);
    if (!counts || Object.keys(counts).length > 10) { failed({ status: 404, body: {} }); return; }
    status("<p>Loading…</p>");
    load("c/" + encodeURIComponent(keyOf(counts))).then(compositionView, failed);
  } else {
    searchView();
  }
})();
