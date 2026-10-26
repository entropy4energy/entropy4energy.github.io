// CHAOS system pages (https://chaos.s4e.ai/chaos-systems): the list of disordered
// systems, and one page per system with ?id=. Everything shown comes from
// the system profiles that the CHAOS API gate serves to signed-in accounts
// at /API/chaos/profiles/; this page holds no data of its own.
//
// The verdict, the thresholds and every sentence are written here, from the
// numbers in the profile, so the wording can change without a new release
// of the profiles.
(function () {
  "use strict";

  var API = "/API/chaos/profiles/";
  var QUERY_BASE = "https://chaos.s4e.ai/API/?";
  var AGENT = "https://chaos.s4e.ai/chaos/agent/";
  var FORMAT = 1;
  var app = document.getElementById("cs-app");
  if (!app) return;

  // ------------------------------------------------------------ helpers
  // shared with the material pages (chaos-common.js)
  var C = window.CHAOS;
  var esc = C.esc, formula = C.formula, sig = C.sig, fixed = C.fixed, released = C.released, ordinal = C.ordinal,
    unit = C.unit, list = C.list, params = C.params, section = C.section;
  function link(id) { return "chaos-systems?id=" + encodeURIComponent(id); }

  var VERDICTS = {
    priority: { chip: "Synthesis priority", cls: "priority" },
    formability: { chip: "High formability", cls: "formability" },
    compatibility: { chip: "High compatibility", cls: "compatibility" },
    lower: { chip: "Lower priority", cls: "lower" },
    unranked: { chip: "Not ranked", cls: "unranked" },
  };

  function status(html, cls) { C.status(app, html, cls); }
  function load(path) { return C.load(API, path); }
  function failed(err) {
    C.failed(app, err, {
      title: "CHAOS systems",
      lead: "The system pages are for registered CHAOS users. Each gives a disordered system's " +
        "synthesis ranking, precursors, competing phases and descriptors.",
      missing: "There is no system with this address in the current release.",
      back: ["chaos-systems", "All systems"],
      unavailable: "The system pages are not available right now. Try again later.",
    });
  }

  // ------------------------------------------------------------ the map
  // Formability percentile against compatibility score; the corner above
  // both thresholds is the priority region.
  function map(points, mark, opts) {
    opts = opts || {};
    var W = 420, H = 340, L = 44, R = 12, T = 14, B = 40;
    var x = function (s) { return L + s * (W - L - R); };
    var y = function (p) { return T + (1 - p) * (H - T - B); };
    var t = 0.75;
    var out = '<svg class="cs-map" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc(opts.label || "") + '">';
    out += '<rect class="cs-map-zone" x="' + x(t) + '" y="' + y(1) + '" width="' + (x(1) - x(t)) + '" height="' + (y(t) - y(1)) + '"/>';
    out += '<rect class="cs-map-frame" x="' + L + '" y="' + T + '" width="' + (W - L - R) + '" height="' + (H - T - B) + '"/>';
    out += '<line class="cs-map-t" x1="' + x(t) + '" x2="' + x(t) + '" y1="' + y(0) + '" y2="' + y(1) + '"/>';
    out += '<line class="cs-map-t" x1="' + x(0) + '" x2="' + x(1) + '" y1="' + y(t) + '" y2="' + y(t) + '"/>';
    [0, 0.25, 0.5, 0.75, 1].forEach(function (v) {
      out += '<text class="cs-map-tick" x="' + x(v) + '" y="' + (H - B + 14) + '" text-anchor="middle">' + v + "</text>";
      out += '<text class="cs-map-tick" x="' + (L - 6) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + v + "</text>";
    });
    out += '<text class="cs-map-axis" x="' + (L + (W - L - R) / 2) + '" y="' + (H - 6) + '" text-anchor="middle">compatibility score</text>';
    out += '<text class="cs-map-axis" transform="translate(12 ' + (T + (H - T - B) / 2) + ') rotate(-90)" text-anchor="middle">formability percentile</text>';
    out += '<text class="cs-map-zone-label" x="' + (x(1) - 4) + '" y="' + (y(1) + 12) + '" text-anchor="end">priority</text>';
    points.forEach(function (pt) {
      if (pt.p == null || pt.s == null) return;
      var c = '<circle class="cs-map-dot' + (pt.hit ? " hit" : "") + '" cx="' + x(pt.s).toFixed(1) + '" cy="' + y(pt.p).toFixed(1) + '" r="' + (pt.hit ? 3.6 : 2.6) + '">' +
        (pt.label ? "<title>" + esc(pt.label) + "</title>" : "") + "</circle>";
      out += pt.id ? '<a href="' + link(pt.id) + '">' + c + "</a>" : c;
    });
    if (mark && mark.p != null && mark.s != null) {
      out += '<circle class="cs-map-me" cx="' + x(mark.s).toFixed(1) + '" cy="' + y(mark.p).toFixed(1) + '" r="7"><title>' + esc(mark.label) + "</title></circle>";
    }
    return out + "</svg>";
  }

  // ------------------------------------------------------------ the list
  // Cohort tabs, an element search and the table of names. The list file is
  // not counted by the gate, so it carries names, families, lattices and
  // elements only; a system's ranking and values are on its own page. The
  // state is kept in the address (q, cohort), so a filtered list can be
  // bookmarked or sent; cohort=all is every system.
  function listView(index) {
    var systems = index.systems || [];
    var cohorts = index.cohorts || [];
    var first = cohorts[0] ? cohorts[0].key : "";
    var all = {};
    systems.forEach(function (s) { (s.elements || []).forEach(function (e) { all[e] = true; }); });
    var q = params();
    var c0 = q.get("cohort");
    var state = {
      q: q.get("q") || "",
      cohort: c0 === "all" ? "" : c0 && cohorts.some(function (c) { return c.key === c0; }) ? c0 : first,
      shown: 100,
    };
    var tabs = cohorts.map(function (c) {
      return '<button type="button" class="cs-tab" data-cohort="' + esc(c.key) + '">' + esc(c.name) +
        ' <span class="cs-tab-n">' + c.n.toLocaleString("en-US") + "</span></button>";
    }).join("") + '<button type="button" class="cs-tab" data-cohort="">all systems <span class="cs-tab-n">' + systems.length.toLocaleString("en-US") + "</span></button>";
    app.innerHTML =
      "<h1>CHAOS systems</h1>" +
      '<p class="cs-lead">Disordered systems in CHAOS, grouped in cohorts: the systems of the same family on the same ' +
      "parent lattice, with small groups pooled across lattices. " +
      "Each page gives the system's synthesis ranking within its cohort, precursors, competing phases and the quantities behind the ranking.</p>" +
      '<div class="cs-tabs" role="group" aria-label="Cohort">' + tabs + "</div>" +
      '<div class="cs-controls">' +
      '<div class="cs-field cs-grow"><label for="cs-q">Elements or name</label><input id="cs-q" type="search" placeholder="Co Mg Ni" autocomplete="off">' +
      '<span class="cs-hint">Systems with all the listed elements</span></div></div>' +
      '<p class="cs-count" id="cs-count" role="status"></p>' +
      '<div class="cs-scroll"><table class="cs-table cs-list" id="cs-table" tabindex="-1"></table></div>' +
      '<p class="cs-actions" id="cs-more"></p>' +
      '<p class="cs-note">From the CHAOS database on ' + released(index.release) + ".</p>";
    document.title = "CHAOS systems | Entropy for Energy Laboratory | Johns Hopkins";
    var $ = function (id) { return document.getElementById(id); };
    $("cs-q").value = state.q;

    function matchesText(s) {
      var words = state.q.split(/[^A-Za-z]+/).filter(Boolean);
      for (var i = 0; i < words.length; i++) {
        var w = words[i];
        var sym = w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
        if (w.length <= 2 && all[sym]) {
          if ((s.elements || []).indexOf(sym) < 0) return false;
        } else if ((s.label + " " + s.lattice + " " + s.family).toLowerCase().indexOf(w.toLowerCase()) < 0) {
          return false;
        }
      }
      return true;
    }
    function inCohort(s) { return !state.cohort || s.cohort === state.cohort; }

    function render() {
      var rows = systems.filter(function (s) { return inCohort(s) && matchesText(s); });
      rows.sort(function (a, b) { return a.label < b.label ? -1 : a.label > b.label ? 1 : 0; });
      Array.prototype.forEach.call(app.querySelectorAll(".cs-tab"), function (b) {
        var on = b.getAttribute("data-cohort") === state.cohort;
        b.classList.toggle("on", on);
        b.setAttribute("aria-pressed", on ? "true" : "false");
      });
      $("cs-count").textContent = rows.length.toLocaleString("en-US") + (rows.length === 1 ? " system" : " systems");
      // all systems, or a cohort pooled across lattices (key "<family>|*")
      var showLattice = !state.cohort || /\|\*$/.test(state.cohort);
      var head = "<thead><tr><th>System</th><th>Family</th>" + (showLattice ? "<th>Lattice</th>" : "") +
        "<th class=num>Elements</th></tr></thead>";
      var body = rows.slice(0, state.shown).map(function (s) {
        return "<tr><td><a href=\"" + link(s.id) + "\">" + formula(s.label) + "</a></td><td>" + esc(s.family) + "</td>" +
          (showLattice ? "<td>" + esc(s.lattice) + "</td>" : "") +
          "<td class=num>" + esc(s.n_el != null ? s.n_el : (s.elements || []).length) + "</td></tr>";
      }).join("");
      $("cs-table").innerHTML = head + "<tbody>" + body + "</tbody>";
      $("cs-more").innerHTML = rows.length > state.shown
        ? '<button type="button" class="cs-button" id="cs-show">Show all ' + rows.length.toLocaleString("en-US") + "</button>" : "";
      if (rows.length > state.shown) {
        $("cs-show").onclick = function () { state.shown = Infinity; render(); $("cs-table").focus(); };
      }
      var u = new URLSearchParams();
      if (state.q) u.set("q", state.q);
      if (state.cohort !== first) u.set("cohort", state.cohort || "all");
      history.replaceState(null, "", location.pathname + (u.toString() ? "?" + u.toString() : ""));
    }
    $("cs-q").oninput = function () { state.q = this.value; state.shown = 100; render(); };
    Array.prototype.forEach.call(app.querySelectorAll(".cs-tab"), function (b) {
      b.onclick = function () { state.cohort = b.getAttribute("data-cohort"); state.shown = 100; render(); };
    });
    render();
  }

  // ------------------------------------------------------------ one system
  var HELP = {
    formability: "inverse of the enthalpy spread of the supercells",
    distortion: "how far the relaxed supercells move from the ideal lattice",
    displacement: "root-mean-square displacement of the atoms in relaxation",
    size_mismatch: "spread of covalent radii on the mixed site",
    en_mismatch: "spread of electronegativities on the mixed site",
    geometric: "configurational entropy over the size mismatch squared",
    vec: "valence electrons per atom",
  };
  var SECTIONS = [
    ["ranking", "Ranking"], ["synthesis", "Synthesis"], ["competing", "Competing phases"], ["ensemble", "Ensemble"],
    ["neighbors", "Neighbors"], ["properties", "Properties"], ["data", "Data"],
  ];

  function structureText(s) {
    if (!s) return "–";
    var name = s.structure || (s.pearson ? s.pearson : "");
    var sg = s.sg ? (s.sg_symbol ? s.sg_symbol + " (" + s.sg + ")" : "space group " + s.sg) : "";
    return esc(name) + (sg ? ' <span class="cs-dim">' + esc(sg) + "</span>" : "");
  }

  function systemView(p) {
    if (p.format !== FORMAT) {
      status("<h1>CHAOS systems</h1><p>This page and the data release do not match; reload the page.</p>", "error");
      return;
    }
    var d = p.descriptors;
    var v = VERDICTS[p.verdict] || VERDICTS.unranked;
    var pf = d.formability.p;
    var S = p.scores.compatibility;
    var site = p.sites.filter(function (s) { return s.main; })[0] || p.sites[0];
    var nMain = site.elements.length;
    var anionFamily = p.family !== "alloy";
    var lat = p.lattice || {};
    var latName = lat.name || (lat.pearson ? "Pearson " + lat.pearson : "its parent lattice");
    var cohortN = esc(p.cohort.n);
    var cohortName = p.cohort.name;
    var spread = d.spread.value;
    var sc = p.n_supercells;
    var name = formula(p.label);

    // ---- identity, summary and the section links
    var kick = [p.family, lat.name, nMain + (anionFamily ? " cations" : " elements") + " on the mixed site"];
    if (p.equimolar) kick.push("equimolar");
    var sub = [];
    if (lat.sg) sub.push((lat.sg_symbol ? esc(lat.sg_symbol) + " " : "") + "(" + esc(lat.sg) + ")");
    if (lat.pearson) sub.push("Pearson " + esc(lat.pearson));
    if (sc) sub.push(sc + " ordered supercells");
    var distP = d.distortion.p;
    var distWord = distP == null ? "–" : distP < 1 / 3 ? "low" : distP < 2 / 3 ? "medium" : "high";
    var html =
      '<div class="cs-identity"><p class="cs-crumbs"><a href="chaos-systems">CHAOS systems</a> / ' +
      '<a href="chaos-systems?cohort=' + encodeURIComponent(p.cohort.key) + '">' + esc(cohortName) + "</a></p>" +
      '<p class="cs-kicker">' + esc(kick.filter(Boolean).join(" · ")) + "</p>" +
      '<h1 class="cs-title">' + name + "</h1>" +
      '<p class="cs-sub">' + sub.join(" · ") + '</p><p class="cs-chaos-id">' + esc(p.chaos_id || p.auid) + "</p></div>" +
      '<div class="cs-bar"><span class="cs-chip ' + v.cls + '">' + v.chip + "</span>" +
      '<span class="cs-bar-item">Formability <b>' + ordinal(pf) + " percentile</b></span>" +
      '<span class="cs-bar-item">Compatibility <b>' + (S == null ? "–" : S.toFixed(2)) + "</b></span>" +
      '<span class="cs-bar-item">Distortion <b>' + distWord + "</b></span></div>" +
      '<nav class="cs-jump" aria-label="Sections">' + SECTIONS.map(function (s) {
        return '<a href="#' + s[0] + '">' + s[1] + "</a>";
      }).join("") + "</nav>";

    // ---- 1 ranking
    var facts;
    if (p.verdict === "unranked") {
      facts = "Not ranked: a value needed for the ranking is missing.";
    } else {
      facts = "Among the " + cohortN + " " + esc(cohortName) + " in CHAOS, " + name + " ranks in the " + ordinal(pf) +
        " percentile for formability";
      facts += S == null ? " and has no compatibility score." : " and the " + ordinal(p.scores.p_compatibility) +
        " percentile for compatibility (score " + S.toFixed(2) + ").";
    }
    if (sc && spread) {
      facts += " Its " + sc + " ordered supercells have a degeneracy-weighted enthalpy spread (standard deviation) of " +
        sig(spread * 1000, 3) + " meV/atom; formability is the inverse of this spread.";
    }
    var rule = "A synthesis priority has formability in the top quartile of its cohort and a compatibility score of at least 0.75.";
    var caveat = anionFamily
      ? "Formability ranks candidates by how closely the configurations of the ensemble lie in enthalpy. " +
        "Among the ranked candidates, the synthesis conditions, such as oxygen partial pressure, precursors and cooling rate, decide which phase forms."
      : "Formability ranks candidates by how closely the configurations of the ensemble lie in enthalpy. " +
        "Among the ranked candidates, the processing route and cooling rate decide which phase forms.";
    var nb = p.neighbors.list;
    var better = nb.filter(function (n) { return n.d_p != null && n.d_p > 0; });
    var nbLine;
    if (!nb.length) {
      nbLine = "No one-swap neighbor of this composition is in CHAOS.";
    } else if (!better.length) {
      nbLine = "None of the " + nb.length + " one-swap neighbors in CHAOS has higher formability.";
    } else {
      var best = better[0];
      nbLine = better.length + " of the " + nb.length + ' <a href="#neighbors">one-swap neighbors</a> in CHAOS have higher formability; the highest is ' +
        '<a href="' + link(best.id) + '">' + formula(best.label) + "</a> (" + ordinal(best.p_formability) + " percentile).";
    }
    var pts = p.cohort.points.map(function (q) { return { p: q[0], s: q[1] }; });
    var rows = [["formability", d.formability]];
    ["distortion", "displacement", "size_mismatch", "en_mismatch", "geometric", "vec"].forEach(function (k) { rows.push([k, d[k]]); });
    var ev = '<div class="cs-scroll"><table class="cs-table cs-evidence"><thead><tr><th>Descriptor</th><th>Cohort percentile</th>' +
      "<th class=num>Value</th><th class=num>Contribution</th></tr></thead><tbody>";
    rows.forEach(function (r, i) {
      var k = r[0], x = r[1];
      var helps = x.p == null ? null : x.better === "lower" ? 1 - x.p : x.p;
      if (i === 1) ev += '<tr class="cs-group"><td colspan=4>Distortion part of the compatibility score: ' + (p.scores.distortion == null ? "–" : p.scores.distortion.toFixed(2)) + "</td></tr>";
      if (i === 3) ev += '<tr class="cs-group"><td colspan=4>Chemistry part: ' + (p.scores.chemistry == null ? "–" : p.scores.chemistry.toFixed(2)) + "</td></tr>";
      ev += "<tr><td><b>" + esc(x.title) + '</b><br><span class="cs-dim">' + HELP[k] + "</span></td><td>" +
        (x.p == null ? '<span class="cs-dim">no value</span>' : '<span class="cs-strip"><span style="left:' + (x.p * 100).toFixed(1) + '%"></span></span><span class="cs-dim">' +
          ordinal(x.p) + "; " + esc(x.better) + " is better</span>") +
        "</td><td class=num>" + sig(x.value, 3) + unit(x.unit) + "</td><td class=num><b class=\"cs-big\">" + (i === 0 || helps == null ? '<span class="cs-dim">–</span>' : helps.toFixed(2)) + "</b></td></tr>";
    });
    ev += "</tbody></table></div>";
    ev += '<p class="cs-dim">The compatibility score (S<sub>CHAOS</sub> in the manuscript) is the mean of the distortion part and the chemistry part. Each part averages the ' +
      "contributions of its descriptors: the cohort percentile when higher is better, one minus the percentile when lower is better. " +
      "Percentiles are within the " + cohortN + " " + esc(cohortName) + ".</p>";
    if (p.scores.missing && p.scores.missing.length) {
      ev += '<p class="cs-warn">Scored without ' + list(p.scores.missing.map(function (k) { return esc(d[k].title.toLowerCase()); })) + ": no value in CHAOS.</p>";
    }
    var ranking =
      '<div class="cs-decide"><div><p>' + facts + "</p><p>" + rule + "</p>" +
      '<p class="cs-caveat">' + caveat + "</p><p>" + nbLine + "</p></div>" +
      '<figure class="cs-decide-map">' + map(pts, { p: pf, s: S, label: p.label }, { label: "This system among its cohort" }) +
      "<figcaption>" + cohortN + " " + esc(cohortName) + " in CHAOS. The selected system is circled. Dashed lines mark the thresholds " +
      "(formability percentile 0.75, compatibility score 0.75); the shaded upper-right region is the synthesis-priority region.</figcaption></figure></div>" +
      '<h3 class="cs-h3">Descriptors</h3>' + ev;

    // ---- 2 synthesis
    var wo = p.weigh_out;
    var make = '<div class="cs-make"><div>';
    make += '<p><label class="cs-inline" for="cs-batch">Target batch <input id="cs-batch" type="number" min="0.01" step="any" value="5"> g</label> ' +
      '<span class="cs-dim">' + formula(wo.product.formula) + ", " + sig(wo.product.mass, 4) + " g/mol</span></p>";
    if (wo.rows) {
      make += '<div class="cs-scroll"><table class="cs-table"><thead><tr><th>' + (anionFamily ? "Precursor" : "Element") +
        "</th><th class=num>mol per mol of product</th><th class=num>Mass</th></tr></thead><tbody>";
      wo.rows.forEach(function (r) {
        make += "<tr><td>" + formula(r.formula) + '</td><td class=num>' + sig(r.mol, 3) +
          '</td><td class=num><span class="cs-mass" data-mol="' + esc(r.mol) + '" data-mm="' + esc(r.molar_mass) + '"></span></td></tr>';
      });
      make += "</tbody></table></div>";
      make += anionFamily
        ? '<p class="cs-dim">The precursors are the binary compounds at the product\'s stoichiometry, one for each mixed-site element. ' +
          "Masses assume complete conversion to the target composition. Other precursors can be weighed to the element amounts below; " +
          "this matches the stoichiometry only.</p>"
        : '<p class="cs-dim">Pure elements at the target composition. Masses are for the batch above.</p>';
    } else {
      make += "<p>No simple precursor set is computed for this structure. The element amounts for the batch are below.</p>";
    }
    make += '<details class="cs-sub-details"' + (wo.rows ? "" : " open") + '><summary>Element amounts</summary><div class="cs-scroll"><table class="cs-table"><thead><tr><th>Element</th><th class=num>mol per mol of product</th><th class=num>Mass</th></tr></thead><tbody>';
    wo.elements.forEach(function (e) {
      make += "<tr><td>" + esc(e.el) + "</td><td class=num>" + sig(e.mol, 3) + '</td><td class=num><span class="cs-mass" data-mol="' + esc(e.mol) +
        '" data-mm="' + esc(e.mass / (e.mol || 1)) + '"></span></td></tr>';
    });
    make += "</tbody></table></div></details></div>";
    var target = [["Lattice", esc(latName) + (lat.pearson && lat.name ? ' <span class="cs-dim">' + esc(lat.pearson) + "</span>" : "")]];
    if (lat.sg) target.push(["Space group", (lat.sg_symbol ? esc(lat.sg_symbol) + " " : "") + "(" + esc(lat.sg) + ")"]);
    target.push(["Mixed site", site.elements.map(function (e) { return esc(e.el) + " " + sig(e.x, 3); }).join(", ")]);
    var prop = {};
    p.properties.forEach(function (x) { prop[x.field || x.title] = x; });
    if (prop.S_config_atom) target.push(["Configurational entropy", sig(prop.S_config_atom.value, 3) + unit(prop.S_config_atom.unit)]);
    if (d.vec.value != null) target.push(["Valence electron concentration", sig(d.vec.value, 3) + unit(d.vec.unit)]);
    if (sc) target.push(["Ordered supercells", String(sc)]);
    make += '<div class="cs-card"><p class="cs-card-title">Target</p><dl class="cs-dl">' + target.map(function (t) {
      return "<dt>" + t[0] + "</dt><dd>" + t[1] + "</dd>";
    }).join("") + "</dl></div></div>";

    // ---- 3 competing phases
    var members = p.end_members || [];
    var off = members.filter(function (m) { return m.takes_lattice === false && m.lowest && m.same_lattice && m.above != null; });
    var on = members.filter(function (m) { return m.takes_lattice === true; });
    var none = members.filter(function (m) { return !m.lowest; });
    var latWord = lat.name || latName;
    var watch = "";
    if (!members.length) {
      watch += "<p>End members are not computed for systems with more than one mixed site.</p>";
    } else {
      var says = [];
      if (off.length) {
        says.push(list(off.map(function (m) { return formula(m.formula); })) + (off.length === 1 ? " has a lower-energy structure" : " have lower-energy structures") +
          " in CHAOS than " + (off.length === 1 ? "its " : "their ") + esc(latWord) + (off.length === 1 ? " form." : " forms."));
      }
      if (on.length) {
        says.push(list(on.map(function (m) { return formula(m.formula); })) + (on.length === 1 ? " is" : " are") + " lowest in " + esc(latWord) + ".");
      }
      if (none.length) {
        says.push("No compound of " + list(none.map(function (m) { return esc(m.el); })) + " at the product's stoichiometry is in CHAOS.");
      }
      if (says.length) watch += "<p" + (off.length ? ' class="cs-flag"' : "") + ">" + says.join(" ") + "</p>";
      watch += '<div class="cs-scroll"><table class="cs-table"><thead><tr><th>Element</th><th>End member</th><th>Lowest in CHAOS</th>' +
        "<th class=num>ΔH<sub>f</sub> (eV/atom)</th><th class=num>" + esc(latWord.charAt(0).toUpperCase() + latWord.slice(1)) + " above ground state</th></tr></thead><tbody>";
      members.forEach(function (m) {
        var same = m.same_lattice
          ? (m.takes_lattice ? "0 (ground state)" : m.above == null ? "–" : "+" + sig(m.above * 1000, 3) + " meV/atom")
          : m.lowest ? '<span class="cs-dim">not computed</span>' : "";
        watch += "<tr><td>" + esc(m.el) + "</td><td>" + formula(m.formula || "") + "</td><td>" + (m.lowest ? structureText(m.lowest) : '<span class="cs-dim">not in CHAOS</span>') +
          "</td><td class=num>" + (m.lowest ? sig(m.lowest.hf, 3) : "") + "</td><td class=num>" + same + "</td></tr>";
      });
      watch += '</tbody></table></div><p class="cs-dim">ΔH<sub>f</sub> is the DFT formation enthalpy per atom of the lowest-energy structure. ' +
        "“" + esc(latWord.charAt(0).toUpperCase() + latWord.slice(1)) + " above ground state” is the energy of the end member on the " + esc(latWord) +
        " lattice relative to the lowest-energy structure in CHAOS at the same composition.</p>";
    }
    var two = p.two_cation;
    if (two && two.compositions) {
      watch += '<h3 class="cs-h3">' + (anionFamily ? "Two-cation compounds" : "Binary compounds") + "</h3><p>CHAOS also contains " + esc(two.compositions) +
        " compositions formed from pairs of the mixed-site elements. The lowest in formation enthalpy per atom:</p>" +
        '<div class="cs-scroll"><table class="cs-table cs-narrow"><thead><tr><th>Compound</th><th>Structure</th><th class=num>ΔH<sub>f</sub> (eV/atom)</th></tr></thead><tbody>' +
        two.lowest.map(function (c) {
          return "<tr><td>" + formula(c.formula) + "</td><td>" + esc(c.structure || c.pearson || "") + "</td><td class=num>" + sig(c.hf, 3) + "</td></tr>";
        }).join("") + "</tbody></table></div>";
    }

    // ---- 4 ensemble
    var ens = "<p>Each supercell is relaxed with DFT and weighted by its degeneracy." +
      (spread ? " Formability, the inverse of the enthalpy spread, is " + sig(d.formability.value, 3) + " (eV/atom)<sup>−1</sup>." : "") + "</p>";
    var ensSum = sc ? sc + " ordered supercells" + (spread ? " · degeneracy-weighted spread " + sig(spread * 1000, 3) + " meV/atom" : "") : "";

    // ---- 5 neighbors
    var nbHtml;
    if (!nb.length) {
      nbHtml = "<p>No composition one swap away is in CHAOS.</p>";
    } else {
      var ins = [];
      nb.forEach(function (n) { if (ins.indexOf(n.in) < 0) ins.push(n.in); });
      ins.sort();
      var outs = site.elements.map(function (e) { return e.el; });
      var cell = {};
      nb.forEach(function (n) { cell[n.out + ">" + n.in] = n; });
      nbHtml = '<div class="cs-scroll"><table class="cs-matrix"><thead><tr><th scope="col">out ↓ in →</th>' +
        ins.map(function (e) { return '<th scope="col">' + esc(e) + "</th>"; }).join("") + "</tr></thead><tbody>";
      outs.forEach(function (o) {
        nbHtml += '<tr><th scope="row">' + esc(o) + "</th>";
        ins.forEach(function (i) {
          var n = cell[o + ">" + i];
          if (!n) { nbHtml += '<td class="empty"></td>'; return; }
          var dp = n.d_p == null ? null : Math.round(n.d_p * 100);
          var cls = dp == null ? "" : dp > 0 ? "up" : dp < 0 ? "down" : "same";
          var strength = dp == null ? 0 : Math.min(1, Math.abs(dp) / 50);
          nbHtml += '<td class="' + cls + '" style="--a:' + strength.toFixed(2) + '"><a href="' + link(n.id) + '" title="' + esc(n.label) + '">' +
            (dp == null ? "–" : (dp > 0 ? "+" : "") + dp) + "</a></td>";
        });
        nbHtml += "</tr>";
      });
      nbHtml += "</tbody></table></div><p class=\"cs-dim\">Change in formability percentile when the row's element is replaced by the column's. " +
        nb.length + " of the " + esc(p.neighbors.possible) + " such swaps with elements found on this lattice in CHAOS are computed. Each cell links to that system.</p>";
    }
    var nbSum = nb.length + " one-swap neighbor" + (nb.length === 1 ? "" : "s") + " · " + better.length + " with higher formability";

    // ---- 6 properties
    var props = p.properties.map(function (x) {
      return '<div class="cs-prop"><span class="cs-dim">' + esc(x.title) + '</span><b>' + sig(x.value, 4) + "</b>" + unit(x.unit) + "</div>";
    }).join("");
    var propsHtml = props ? '<div class="cs-props">' + props + "</div>" : "<p>No further values for this system.</p>";
    var propsSum = p.properties.length + " calculated value" + (p.properties.length === 1 ? "" : "s");

    // ---- 7 data
    var q = p.query;
    var others = (p.query_matches || 1) - 1;
    var dataHtml =
      (others ? "<p>This system and the " + others + " other" + (others === 1 ? " system" : " systems") +
        " with the same elements on this lattice, every field, as an API query:</p>"
        : "<p>This system, every field, as an API query:</p>") +
      '<pre class="cs-code" id="cs-query">' + esc(q) + "</pre>" +
      '<p class="cs-actions"><button type="button" class="cs-button" id="cs-copy">Copy the query</button>' +
      '<a class="cs-button" href="' + QUERY_BASE + esc(q) + '">Run it</a>' +
      '<a class="cs-button" href="' + API + encodeURIComponent(p.id) + '">This page\'s data (JSON)</a>' +
      '<a class="cs-button" href="' + AGENT + '">CHAOS-Agent</a></p>' +
      '<dl class="cs-dl"><dt>CHAOS identifier</dt><dd>' + esc(p.chaos_id || p.auid) + "</dd><dt>Computed on</dt><dd>" + released(p.release) + "</dd>" +
      "<dt>Cite</dt><dd>CHAOS, Entropy for Energy Laboratory, Johns Hopkins University, https://chaos.s4e.ai, release " + released(p.release) + ".</dd></dl>" +
      '<p class="cs-dim">Fields and units: <a href="https://chaos.s4e.ai/API/?schema">schema</a> and ' +
      '<a href="https://chaos.s4e.ai/API/?help">API help</a>.</p>';

    html += section(1, "ranking", "Ranking", "", ranking);
    html += section(2, "synthesis", "Synthesis", "", make);
    html += section(3, "competing", "Competing phases", "", watch);
    html += section(4, "ensemble", "Ensemble", esc(ensSum), ens);
    html += section(5, "neighbors", "Neighbors", esc(nbSum), nbHtml);
    html += section(6, "properties", "Properties", esc(propsSum), propsHtml);
    html += section(7, "data", "Data", "Query · provenance · citation", dataHtml);
    html += '<p class="cs-note">Ranks and scores are computed from the current CHAOS database using covalent radii and Pearson ' +
      "electronegativities. The manuscript used the Ghosh radius and electronegativity scales, so the values reported here can differ " +
      "from those in the paper.</p>";
    app.innerHTML = html;
    document.title = p.label + " | CHAOS systems | Entropy for Energy Laboratory | Johns Hopkins";

    // batch masses
    var batch = document.getElementById("cs-batch");
    function masses() {
      var g = parseFloat(batch.value);
      var molProduct = g > 0 ? g / wo.product.mass : NaN;
      Array.prototype.forEach.call(app.querySelectorAll(".cs-mass"), function (elm) {
        var m = parseFloat(elm.getAttribute("data-mol")) * parseFloat(elm.getAttribute("data-mm")) * molProduct;
        elm.textContent = isFinite(m) ? fixed(m, 4) + " g" : "–";
      });
    }
    batch.oninput = masses;
    masses();
    // The section links mark the section being read: the last one whose top
    // has passed below the sticky links, or the last section once the page
    // is scrolled to the end. A clicked link is marked at once.
    var jump = app.querySelector(".cs-jump");
    var links = jump ? jump.querySelectorAll("a") : [];
    function mark(id) {
      Array.prototype.forEach.call(links, function (a) {
        var on = a.getAttribute("href") === "#" + id;
        a.classList.toggle("on", on);
        if (on) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
      });
    }
    function current() {
      var line = (jump ? jump.getBoundingClientRect().bottom : 0) + 24;
      var id = null;
      SECTIONS.forEach(function (s) {
        var el = document.getElementById(s[0]);
        if (el && el.getBoundingClientRect().top <= line) id = s[0];
      });
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) id = SECTIONS[SECTIONS.length - 1][0];
      mark(id);
    }
    var ticking = false, hold = 0;
    window.addEventListener("scroll", function () {
      if (ticking || Date.now() < hold) return;
      ticking = true;
      requestAnimationFrame(function () { ticking = false; current(); });
    }, { passive: true });
    Array.prototype.forEach.call(links, function (a) {
      a.addEventListener("click", function () { hold = Date.now() + 400; mark(a.getAttribute("href").slice(1)); });
    });
    // addresses from the first version of these pages (#decide, #make, ...)
    var OLD = { decide: "ranking", evidence: "ranking", make: "synthesis", watch: "competing" };
    var h = location.hash.slice(1);
    if (OLD[h]) { h = OLD[h]; history.replaceState(null, "", "#" + h); }
    var target = h && document.getElementById(h);
    if (target) target.scrollIntoView();
    current();
    C.copyButton(document.getElementById("cs-copy"), q, "Copy the query");
  }

  // ------------------------------------------------------------ start
  if (!C.onCHAOSHost()) {
    status('<h1>CHAOS systems</h1><p>The system pages are on chaos.s4e.ai: <a href="https://chaos.s4e.ai/chaos-systems">chaos.s4e.ai/chaos-systems</a>.</p>');
    return;
  }
  var id = params().get("id");
  status("<p>Loading…</p>");
  if (id) {
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) {
      failed({ status: 404, body: {} });
      return;
    }
    load(encodeURIComponent(id)).then(systemView, failed);
  } else {
    load("").then(listView, failed);
  }
})();
