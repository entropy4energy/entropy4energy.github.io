// CHAOS system pages (https://s4e.ai/chaos-systems): the list of disordered
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
  var LOGIN = "/loop/accounts/login/";
  var PROFILE = "/loop/accounts/profile/";
  var QUERY_BASE = "https://s4e.ai/API/chaos/?";
  var AGENT = "https://s4e.ai/chaos/agent/";
  var CONTACT = "corey.oses@jhu.edu";
  var FORMAT = 1;
  var app = document.getElementById("cs-app");
  if (!app) return;

  // ------------------------------------------------------------ helpers
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function formula(label) {
    return esc(label).replace(/(\)|[A-Za-z])(\d+(?:\.\d+)?)/g, "$1<sub>$2</sub>");
  }
  // n significant digits, trailing zeros dropped (0.2, not 0.200)
  function sig(x, n) {
    var s = fixed(x, n);
    return s.indexOf(".") < 0 ? s : s.replace(/\.?0+$/, "");
  }
  // n significant digits, kept (masses: 0.5970 g beside 1.110 g)
  function fixed(x, n) {
    if (x == null || !isFinite(x)) return "–";
    if (x === 0) return "0";
    var a = Math.abs(x);
    var d = Math.max(0, (n || 3) - 1 - Math.floor(Math.log10(a)));
    return x.toFixed(Math.min(d, 6));
  }
  // release names are UTC times: 20261004T041612Z -> October 4, 2026
  function released(stamp) {
    var m = /^(\d{4})(\d{2})(\d{2})T/.exec(stamp || "");
    if (!m) return esc(stamp || "");
    var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    return months[+m[2] - 1] + " " + +m[3] + ", " + m[1];
  }
  function ordinal(p) {
    if (p == null) return "–";
    var n = Math.round(p * 100);
    var s = n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] || "th";
    return n + s;
  }
  function pct(p) { return p == null ? "–" : String(Math.round(p * 100)); }
  function unit(u) {
    if (!u) return "";
    if (u === "%") return "%";
    return " " + esc(u).replace("(eV/atom)⁻¹", "(eV/atom)<sup>−1</sup>").replace("Å³", "Å<sup>3</sup>").replace("k_B", "k<sub>B</sub>");
  }
  function list(words) {
    if (words.length < 2) return words.join("");
    return words.slice(0, -1).join(", ") + " and " + words[words.length - 1];
  }
  function link(id) { return "chaos-systems?id=" + encodeURIComponent(id); }
  function params() { return new URLSearchParams(location.search); }

  var VERDICTS = {
    priority: { chip: "Synthesis priority", cls: "priority" },
    formability: { chip: "High formability", cls: "formability" },
    compatibility: { chip: "High compatibility", cls: "compatibility" },
    lower: { chip: "Lower priority", cls: "lower" },
    unranked: { chip: "Not ranked", cls: "unranked" },
  };

  function status(html, cls) {
    app.innerHTML = '<div class="cs-status ' + (cls || "") + '" role="status">' + html + "</div>";
  }

  function here() { return location.pathname + location.search; }

  // ------------------------------------------------------------ fetching
  function load(path) {
    return fetch(API + path, { credentials: "same-origin", headers: { Accept: "application/json" } }).then(
      function (r) {
        return r.text().then(function (text) {
          var body = null;
          try { body = JSON.parse(text); } catch (e) { body = null; }
          if (r.ok && body) return body;
          var err = new Error("status " + r.status);
          err.status = r.status;
          err.body = body || {};
          throw err;
        });
      },
      function () {
        var err = new Error("network");
        err.status = 0;
        err.body = {};
        throw err;
      }
    );
  }

  function failed(err) {
    var next = encodeURIComponent(here());
    var b = err.body || {};
    if (err.status === 401) {
      status('<h1>CHAOS systems</h1><p>The system pages are for signed-in CHAOS accounts. Each one shows whether to try making a ' +
        "composition, what to weigh out, what might form instead, and the descriptors behind the call.</p>" +
        '<p><a class="cs-button primary" href="' + LOGIN + "?next=" + next + '">Sign in</a> ' +
        '<a class="cs-button" href="chaos#access">How to get an account</a></p>', "signin");
    } else if (err.status === 403 && b.profile) {
      status('<h1>CHAOS systems</h1><p>Complete your profile first: every account gives its institution, role and research area once.</p>' +
        '<p><a class="cs-button primary" href="' + PROFILE + "?next=" + next + '">Complete your profile</a></p>', "signin");
    } else if (err.status === 403) {
      status('<h1>CHAOS systems</h1><p>This account is not approved for CHAOS yet. ' +
        '<a href="chaos#access">How access works</a>.</p>', "signin");
    } else if (err.status === 404) {
      status('<h1>CHAOS systems</h1><p>There is no system with this address in the current release.</p>' +
        '<p><a href="chaos-systems">All systems</a></p>', "error");
    } else if (err.status === 429) {
      status("<h1>CHAOS systems</h1><p>" + esc(b.error || "Too many requests; try again shortly.") + "</p>", "error");
    } else if (err.status === 0) {
      status("<h1>CHAOS systems</h1><p>s4e.ai did not answer. Check your connection and reload the page.</p>", "error");
    } else {
      status("<h1>CHAOS systems</h1><p>The system pages are not available right now. Try again later.</p>", "error");
    }
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
  function listView(index) {
    var systems = index.systems || [];
    var cohorts = index.cohorts || [];
    var all = {};
    systems.forEach(function (s) { (s.elements || []).forEach(function (e) { all[e] = true; }); });
    var q = params();
    var state = {
      q: q.get("q") || "",
      cohort: q.get("cohort") || (cohorts[0] ? cohorts[0].key : ""),
      v: q.get("v") || "",
      sort: q.get("sort") || "pf",
      shown: 100,
    };
    var cohortOpts = cohorts.map(function (c) {
      return '<option value="' + esc(c.key) + '">' + esc(c.name) + " (" + c.n + ")</option>";
    }).join("") + '<option value="">All systems (' + systems.length + ")</option>";
    var vOpts = '<option value="">Any verdict</option>' + Object.keys(VERDICTS).map(function (k) {
      return '<option value="' + k + '">' + VERDICTS[k].chip + "</option>";
    }).join("");
    app.innerHTML =
      '<h1>CHAOS systems</h1>' +
      '<p class="cs-lead">One page for each disordered system in CHAOS: whether to try making it, what to weigh out, ' +
      "what might form instead, and the descriptors behind the call. Each system is ranked within its cohort, the " +
      "systems of the same family on the same parent lattice.</p>" +
      '<div class="cs-controls">' +
      '<div class="cs-field cs-grow"><label for="cs-q">Elements or name</label><input id="cs-q" type="search" placeholder="Co Cu Mg" autocomplete="off"></div>' +
      '<div class="cs-field"><label for="cs-cohort">Cohort</label><select id="cs-cohort">' + cohortOpts + "</select></div>" +
      '<div class="cs-field"><label for="cs-v">Verdict</label><select id="cs-v">' + vOpts + "</select></div>" +
      '<div class="cs-field"><label for="cs-sort">Order</label><select id="cs-sort">' +
      '<option value="pf">Formability, highest first</option><option value="s">Compatibility, highest first</option>' +
      '<option value="label">Name</option></select></div></div>' +
      '<div class="cs-browse"><figure class="cs-browse-map" id="cs-map"></figure><div class="cs-browse-list"><p class="cs-count" id="cs-count" role="status"></p>' +
      '<div class="cs-scroll"><table class="cs-table" id="cs-table"></table></div><p id="cs-more"></p></div></div>' +
      '<p class="cs-note">Computed from the CHAOS database on ' + released(index.release) + ". Ranks are within each cohort. " +
      'How the verdict is made: open any system and see “What drives the verdict”.</p>';
    document.title = "CHAOS systems | Entropy for Energy Laboratory | Johns Hopkins";
    var $ = function (id) { return document.getElementById(id); };
    $("cs-q").value = state.q;
    $("cs-cohort").value = state.cohort;
    $("cs-v").value = state.v;
    $("cs-sort").value = state.sort;

    function matches(s) {
      if (state.cohort && s.cohort !== state.cohort) return false;
      if (state.v && s.v !== state.v) return false;
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

    function render() {
      var rows = systems.filter(matches);
      var key = state.sort;
      rows.sort(function (a, b) {
        if (key === "label") return a.label < b.label ? -1 : a.label > b.label ? 1 : 0;
        var x = key === "s" ? a.s : a.pf, y = key === "s" ? b.s : b.pf;
        return (y == null ? -1 : y) - (x == null ? -1 : x);
      });
      var inCohort = systems.filter(function (s) { return !state.cohort || s.cohort === state.cohort; });
      var hit = {};
      rows.forEach(function (s) { hit[s.id] = true; });
      var filtered = rows.length !== inCohort.length;
      var cname = state.cohort ? (cohorts.filter(function (c) { return c.key === state.cohort; })[0] || {}).name : "all systems";
      $("cs-map").innerHTML = map(inCohort.map(function (s) {
        return { p: s.pf, s: s.s, id: s.id, label: s.label, hit: filtered && hit[s.id] };
      }), null, { label: "Formability percentile against compatibility score, " + cname }) +
        "<figcaption>" + esc(cname.charAt(0).toUpperCase() + cname.slice(1)) + (filtered ? "; the systems that match are darker" : "") +
        ". Select a point to open its page.</figcaption>";
      $("cs-count").textContent = rows.length + (rows.length === 1 ? " system" : " systems");
      var head = "<thead><tr><th>System</th><th>Lattice</th><th class=num>Formability</th><th class=num>Percentile</th><th class=num>Compatibility</th><th>Verdict</th></tr></thead>";
      var body = rows.slice(0, state.shown).map(function (s) {
        var v = VERDICTS[s.v] || VERDICTS.unranked;
        return "<tr><td><a href=\"" + link(s.id) + "\">" + formula(s.label) + "</a></td><td>" + esc(s.lattice) +
          "</td><td class=num>" + sig(s.f, 3) + "</td><td class=num>" + ordinal(s.pf) + "</td><td class=num>" +
          (s.s == null ? "–" : s.s.toFixed(2)) + '</td><td><span class="cs-chip ' + v.cls + '">' + v.chip + "</span></td></tr>";
      }).join("");
      $("cs-table").innerHTML = head + "<tbody>" + body + "</tbody>";
      $("cs-more").innerHTML = rows.length > state.shown
        ? '<button type="button" class="cs-button" id="cs-show">Show all ' + rows.length + "</button>" : "";
      if (rows.length > state.shown) $("cs-show").onclick = function () { state.shown = Infinity; render(); };
      var u = new URLSearchParams();
      if (state.q) u.set("q", state.q);
      if (state.cohort !== (cohorts[0] ? cohorts[0].key : "")) u.set("cohort", state.cohort);
      if (state.v) u.set("v", state.v);
      if (state.sort !== "pf") u.set("sort", state.sort);
      history.replaceState(null, "", location.pathname + (u.toString() ? "?" + u.toString() : ""));
    }
    $("cs-q").oninput = function () { state.q = this.value; state.shown = 100; render(); };
    $("cs-cohort").onchange = function () { state.cohort = this.value; state.shown = 100; render(); };
    $("cs-v").onchange = function () { state.v = this.value; render(); };
    $("cs-sort").onchange = function () { state.sort = this.value; render(); };
    render();
  }

  // ------------------------------------------------------------ one system
  var HELP = {
    formability: "inverse of the energy spread of the supercells",
    distortion: "how far the relaxed supercells move from the ideal lattice",
    displacement: "root-mean-square displacement of the atoms in relaxation",
    size_mismatch: "spread of covalent radii on the mixed site",
    en_mismatch: "spread of electronegativities on the mixed site",
    geometric: "configurational entropy over the size mismatch squared",
    vec: "valence electrons per atom",
  };

  function section(n, id, kicker, title, summary, body, open) {
    return '<details class="cs-sec" id="' + id + '"' + (open ? " open" : "") + "><summary>" +
      '<span class="cs-num">' + n + '</span><span class="cs-sec-head"><span class="cs-kicker">' + kicker +
      '</span><span class="cs-sec-title">' + title + "</span>" +
      (summary ? '<span class="cs-sec-sum">' + summary + "</span>" : "") + "</span></summary>" +
      '<div class="cs-sec-body">' + body + "</div></details>";
  }

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
    var cohortN = p.cohort.n;
    var cohortName = p.cohort.name;
    var spread = d.spread.value;
    var sc = p.n_supercells;

    // ---- identity and bar
    var kick = [p.family, lat.name, nMain + (anionFamily ? " cations" : " elements") + " on the mixed site"];
    if (p.equimolar) kick.push("equimolar");
    var sub = [];
    if (lat.sg) sub.push((lat.sg_symbol ? esc(lat.sg_symbol) + " " : "") + "(" + lat.sg + ")");
    if (lat.pearson) sub.push("Pearson " + esc(lat.pearson));
    if (sc) sub.push(sc + " ordered supercells");
    var distP = d.distortion.p;
    var distWord = distP == null ? "–" : distP < 1 / 3 ? "low" : distP < 2 / 3 ? "medium" : "high";
    var html =
      '<div class="cs-identity"><p class="cs-crumbs"><a href="chaos-systems">CHAOS systems</a> / ' +
      '<a href="chaos-systems?cohort=' + encodeURIComponent(p.cohort.key) + '">' + esc(cohortName) + "</a></p>" +
      '<p class="cs-kicker">' + esc(kick.filter(Boolean).join(" · ")) + "</p>" +
      '<h1 class="cs-title">' + formula(p.label) + "</h1>" +
      '<p class="cs-sub">' + sub.join(" · ") + '</p><p class="cs-auid">' + esc(p.auid) + "</p></div>" +
      '<div class="cs-bar"><span class="cs-chip ' + v.cls + '">' + v.chip + "</span>" +
      '<span class="cs-bar-item">Formability <b>' + ordinal(pf) + "</b></span>" +
      '<span class="cs-bar-item">Compatibility <b>' + (S == null ? "–" : S.toFixed(2)) + "</b></span>" +
      '<span class="cs-bar-item">Distortion <b>' + distWord + "</b></span>" +
      '<nav class="cs-jump" aria-label="Sections"><a href="#decide">Decide</a><a href="#make">Make</a><a href="#watch">Watch out</a>' +
      '<a href="#evidence">Evidence</a><a href="#neighbors">Neighbors</a><a href="#data">Data</a></nav></div>';

    // ---- 1 decide
    var headline = {
      priority: "A synthesis priority: formability in the top quarter of its cohort and a compatibility score of at least 0.75.",
      formability: "Formability in the top quarter of its cohort; the compatibility score is below 0.75.",
      compatibility: "A compatibility score of at least 0.75; the formability is below the top quarter of its cohort.",
      lower: "Formability below the top quarter of its cohort, and a compatibility score below 0.75.",
      unranked: "Not ranked: a value needed for the ranking is missing.",
    }[p.verdict] || "";
    var facts = "Among the " + cohortN + " " + esc(cohortName) + " in CHAOS, this composition is in the <b>" + ordinal(pf) +
      " percentile</b> for formability";
    facts += S == null ? "." : ", and its compatibility score is <b>" + S.toFixed(2) + "</b> (the " + ordinal(p.scores.p_compatibility) + " percentile).";
    if (sc && spread) {
      facts += " The enthalpies of its " + sc + " supercells have a standard deviation of " + sig(spread * 1000, 3) +
        " meV/atom, weighted by degeneracy; formability is the inverse of that spread.";
    }
    var caveat = anionFamily
      ? "Formability ranks what to try first; it does not predict the phase that forms. Oxygen partial pressure, precursor reactivity, " +
        "cation valence, defect equilibria and kinetic trapping are not in this number, and magnetic and vibrational entropy are not treated."
      : "Formability ranks what to try first; it does not predict the phase that forms. Processing route, cooling rate and kinetic " +
        "trapping are not in this number, and magnetic and vibrational entropy are not treated.";
    var nb = p.neighbors.list;
    var better = nb.filter(function (n) { return n.d_p != null && n.d_p > 0; });
    var teaser;
    if (!nb.length) {
      teaser = "No one-swap neighbor of this composition is in CHAOS.";
    } else if (!better.length) {
      teaser = "None of its " + nb.length + " one-swap neighbors in CHAOS ranks higher in formability.";
    } else {
      var best = better[0];
      teaser = better.length + " of its " + nb.length + " one-swap neighbors in CHAOS rank higher in formability. The best is " +
        '<a href="' + link(best.id) + '">' + formula(best.label) + "</a>, at the " + ordinal(best.p_formability) + " percentile.";
    }
    var lead = p.verdict === "priority" || !better.length
      ? '<a class="cs-button primary" href="#make" data-open="make">What to weigh out</a><a class="cs-button" href="#neighbors" data-open="neighbors">Neighbors</a>'
      : '<a class="cs-button primary" href="#neighbors" data-open="neighbors">Better neighbors</a><a class="cs-button" href="#make" data-open="make">What to weigh out</a>';
    var pts = p.cohort.points.map(function (q) { return { p: q[0], s: q[1] }; });
    var decide =
      '<div class="cs-decide"><div><p class="cs-headline">' + headline + "</p><p>" + facts + "</p>" +
      '<p class="cs-caveat">' + caveat + "</p>" +
      '<p class="cs-teaser">' + teaser + "</p><p class=\"cs-actions\">" + lead + "</p></div>" +
      '<figure class="cs-decide-map">' + map(pts, { p: pf, s: S, label: p.label }, { label: "This system among its cohort" }) +
      "<figcaption>The " + cohortN + " " + esc(cohortName) + " in CHAOS; the ring is this system. Dashed lines are the thresholds " +
      "(formability percentile 0.75, compatibility score 0.75); the shaded corner, above both, is the priority region.</figcaption></figure></div>";

    // ---- 2 make
    var wo = p.weigh_out;
    var em = {};
    (p.end_members || []).forEach(function (m) { em[m.el] = m; });
    var make = '<div class="cs-make"><div>';
    make += '<p><label class="cs-inline" for="cs-batch">Batch of product <input id="cs-batch" type="number" min="0.01" step="any" value="5"> g</label> ' +
      '<span class="cs-dim">Product ' + formula(wo.product.formula) + ", " + sig(wo.product.mass, 4) + " g/mol</span></p>";
    if (wo.rows) {
      make += '<div class="cs-scroll"><table class="cs-table"><thead><tr><th>' + (anionFamily ? "Precursor" : "Element") +
        "</th><th>Lowest structure in CHAOS</th><th class=num>mol per mol</th><th class=num>Mass</th></tr></thead><tbody>";
      wo.rows.forEach(function (r) {
        var m = em[r.el];
        make += "<tr><td>" + formula(r.formula) + "</td><td>" + (m && m.lowest ? structureText(m.lowest) : '<span class="cs-dim">not in CHAOS</span>') +
          '</td><td class=num>' + sig(r.mol, 3) + '</td><td class=num><span class="cs-mass" data-mol="' + r.mol + '" data-mm="' + r.molar_mass + '"></span></td></tr>';
      });
      make += "</tbody></table></div>";
      make += anionFamily
        ? '<p class="cs-dim">Each precursor is an end member: one element alone on the mixed site, at the product\'s stoichiometry. ' +
          "Masses are for a complete reaction. Carbonates, nitrates or oxides of another valence can stand in; weigh them to the element amounts below.</p>"
        : '<p class="cs-dim">Pure elements, weighed to the composition. Masses are for the batch above.</p>';
    } else {
      make += "<p>No set of simple precursors is computed for this structure; weigh your precursors to the element amounts below.</p>";
    }
    make += '<details class="cs-sub-details"' + (wo.rows ? "" : " open") + '><summary>Element amounts</summary><div class="cs-scroll"><table class="cs-table"><thead><tr><th>Element</th><th class=num>mol per mol</th><th class=num>Mass</th></tr></thead><tbody>';
    wo.elements.forEach(function (e) {
      make += "<tr><td>" + esc(e.el) + "</td><td class=num>" + sig(e.mol, 3) + '</td><td class=num><span class="cs-mass" data-mol="' + e.mol +
        '" data-mm="' + (e.mass / (e.mol || 1)) + '"></span></td></tr>';
    });
    make += "</tbody></table></div></details></div>";
    var target = [["Lattice", esc(latName) + (lat.pearson && lat.name ? ' <span class="cs-dim">' + esc(lat.pearson) + "</span>" : "")]];
    if (lat.sg) target.push(["Space group", (lat.sg_symbol ? esc(lat.sg_symbol) + " " : "") + "(" + lat.sg + ")"]);
    target.push(["Mixed site", site.elements.map(function (e) { return esc(e.el) + " " + sig(e.x, 3); }).join(", ")]);
    var prop = {};
    p.properties.forEach(function (x) { prop[x.field || x.title] = x; });
    if (prop.S_config_atom) target.push(["Configurational entropy", sig(prop.S_config_atom.value, 3) + unit(prop.S_config_atom.unit)]);
    if (d.vec.value != null) target.push(["Valence electron concentration", sig(d.vec.value, 3) + unit(d.vec.unit)]);
    if (sc) target.push(["Represented by", sc + " ordered supercells"]);
    make += '<div class="cs-card"><p class="cs-card-title">The target</p><dl class="cs-dl">' + target.map(function (t) {
      return "<dt>" + t[0] + "</dt><dd>" + t[1] + "</dd>";
    }).join("") + "</dl></div></div>";

    // ---- 3 watch out
    var members = p.end_members || [];
    var off = members.filter(function (m) { return m.takes_lattice === false && m.lowest; });
    var none = members.filter(function (m) { return !m.lowest; });
    var watch = "";
    if (!members.length) {
      watch += "<p>End members are not computed for systems with more than one mixed site.</p>";
    } else if (off.length) {
      var names = off.map(function (m) { return esc(m.el); });
      var what = off.map(function (m) { return formula(m.formula) + " (" + esc(m.lowest.structure || m.lowest.pearson || "another structure") + ")"; });
      watch += '<div class="cs-warn"><b>' + list(names) + ".</b> " +
        (off.length === 1 ? "Its compound at the product's stoichiometry, " + what[0] + ", is lowest in CHAOS in another structure than " + esc(latName) +
          ", so " + names[0] + " is the first element likely to leave the solid solution."
          : "Their compounds at the product's stoichiometry, " + list(what) + ", are lowest in CHAOS in other structures than " + esc(latName) +
          ", so these are the first elements likely to leave the solid solution.") + "</div>";
    } else if (!none.length) {
      watch += '<p class="cs-ok">Every end member is lowest in CHAOS on the ' + esc(latName) + " lattice.</p>";
    }
    if (none.length) {
      watch += "<p>No compound of " + list(none.map(function (m) { return esc(m.el); })) + " at the product's stoichiometry is in CHAOS.</p>";
    }
    if (members.length) {
      watch += '<div class="cs-scroll"><table class="cs-table"><thead><tr><th>Element</th><th>End member</th><th>Lowest in CHAOS</th>' +
        "<th class=num>ΔH<sub>f</sub></th><th>On the " + esc(latName) + " lattice</th></tr></thead><tbody>";
      members.forEach(function (m) {
        var same = m.same_lattice
          ? (m.takes_lattice ? "lowest" : "+" + sig(m.above * 1000, 3) + " meV/atom")
          : m.lowest ? '<span class="cs-dim">not computed</span>' : "";
        watch += "<tr><td>" + esc(m.el) + "</td><td>" + formula(m.formula || "") + "</td><td>" + (m.lowest ? structureText(m.lowest) : '<span class="cs-dim">not in CHAOS</span>') +
          "</td><td class=num>" + (m.lowest ? sig(m.lowest.hf, 3) : "") + "</td><td>" + same + "</td></tr>";
      });
      watch += '</tbody></table></div><p class="cs-dim">ΔH<sub>f</sub>: formation enthalpy per atom, DFT. “On the lattice”: how far the end member on the product\'s lattice lies above the lowest structure of the same composition.</p>';
    }
    var two = p.two_cation;
    if (two && two.compositions) {
      watch += "<p>CHAOS holds " + two.compositions + " compositions with two elements of the mixed site" +
        ". Lowest in formation enthalpy per atom:</p><ul class=\"cs-two\">" + two.lowest.map(function (c) {
          return "<li>" + formula(c.formula) + " <span class=\"cs-dim\">" + esc(c.structure || c.pearson || "") + "</span> " + sig(c.hf, 3) + " eV/atom</li>";
        }).join("") + "</ul>";
    }

    // ---- 4 evidence
    var rows = [["formability", d.formability]];
    ["distortion", "displacement", "size_mismatch", "en_mismatch", "geometric", "vec"].forEach(function (k) { rows.push([k, d[k]]); });
    var ev = '<div class="cs-scroll"><table class="cs-table cs-evidence"><thead><tr><th>Descriptor</th><th>Where it falls in the cohort</th><th class=num>Value</th><th class=num>How much it helps</th></tr></thead><tbody>';
    rows.forEach(function (r, i) {
      var k = r[0], x = r[1];
      var helps = x.p == null ? null : x.better === "lower" ? 1 - x.p : x.p;
      if (i === 1) ev += '<tr class="cs-group"><td colspan=4>Distortion part of the compatibility score: ' + (p.scores.distortion == null ? "–" : p.scores.distortion.toFixed(2)) + "</td></tr>";
      if (i === 3) ev += '<tr class="cs-group"><td colspan=4>Chemistry part: ' + (p.scores.chemistry == null ? "–" : p.scores.chemistry.toFixed(2)) + "</td></tr>";
      ev += "<tr><td><b>" + esc(x.title) + '</b><br><span class="cs-dim">' + HELP[k] + "</span></td><td>" +
        (x.p == null ? '<span class="cs-dim">no value</span>' : '<span class="cs-strip"><span style="left:' + (x.p * 100).toFixed(1) + '%"></span></span><span class="cs-dim">' +
          ordinal(x.p) + " percentile; " + x.better + " is better</span>") +
        "</td><td class=num>" + sig(x.value, 3) + unit(x.unit) + "</td><td class=num><b class=\"cs-big\">" + pct(helps) + "</b></td></tr>";
    });
    ev += "</tbody></table></div>";
    ev += "<p>The compatibility score is half the distortion part and half the chemistry part. Each part is the mean of its descriptors' " +
      "“how much it helps”: the percentile when higher is better, one minus the percentile when lower is better. Percentiles are within the " +
      cohortN + " " + esc(cohortName) + ".</p>";
    if (p.scores.missing && p.scores.missing.length) {
      ev += '<p class="cs-warn">Scored without ' + list(p.scores.missing.map(function (k) { return esc(d[k].title.toLowerCase()); })) + ": no value in CHAOS.</p>";
    }
    var evSum = "formability " + ordinal(pf) + " percentile · compatibility " + (S == null ? "–" : S.toFixed(2));

    // ---- 5 ensemble
    var ens = "<p>" + (sc ? "This system is represented by " + sc + " ordered supercells" : "The supercells of this system") +
      ", each relaxed with DFT and weighted by its degeneracy." +
      (spread ? " The weighted standard deviation of their enthalpies is " + sig(spread * 1000, 3) + " meV/atom; formability is its inverse, " +
        sig(d.formability.value, 3) + " (eV/atom)<sup>−1</sup>." : "") + "</p>" +
      '<p class="cs-dim">The structures and energies of the individual supercells are shared on request: ' +
      '<a href="mailto:' + CONTACT + '">' + CONTACT + "</a>.</p>";

    // ---- 6 neighbors
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
      nbHtml += "</tbody></table></div><p class=\"cs-dim\">Change in formability percentile when the row's element is swapped for the column's. " +
        nb.length + " of the " + p.neighbors.possible + " swaps with elements found on this lattice in CHAOS are computed. Select a cell to open that system.</p>";
    }
    var nbSum = nb.length ? better.length + " of " + nb.length + " rank higher" : "none in CHAOS";

    // ---- 7 properties
    var props = p.properties.map(function (x) {
      return '<div class="cs-prop"><span class="cs-dim">' + esc(x.title) + '</span><b>' + sig(x.value, 4) + "</b>" + unit(x.unit) + "</div>";
    }).join("");
    var propsHtml = props ? '<div class="cs-props">' + props + "</div>" : "<p>No further values for this system.</p>";

    // ---- 8 data
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
      '<a class="cs-button primary" href="' + AGENT + '">Ask CHAOS-Agent</a></p>' +
      '<dl class="cs-dl"><dt>AUID</dt><dd>' + esc(p.auid) + "</dd><dt>Computed on</dt><dd>" + released(p.release) + "</dd>" +
      "<dt>Cite</dt><dd>CHAOS, Entropy for Energy Laboratory, Johns Hopkins University, https://s4e.ai/chaos.</dd></dl>" +
      '<p class="cs-dim">The fields and their units: <a href="https://s4e.ai/API/chaos/?schema">schema</a> and ' +
      '<a href="https://s4e.ai/API/chaos/?help">API help</a>.</p>';

    html += section(1, "decide", "Decide", "Should you try to make this?", "", decide, true);
    html += section(2, "make", "Make", "What to weigh out", "", make, true);
    html += section(3, "watch", "Watch out", "What might form instead", "", watch, true);
    html += section(4, "evidence", "Evidence", "What drives the verdict", esc(evSum), ev, false);
    html += section(5, "ensemble", "Ensemble", "The supercells behind the formability", sc ? sc + " supercells" + (spread ? ", spread " + sig(spread * 1000, 3) + " meV/atom" : "") : "", ens, false);
    html += section(6, "neighbors", "Neighbors", "One swap away", esc(nbSum), nbHtml, false);
    html += section(7, "properties", "Properties", "Other values of this system", p.properties.length + " values", propsHtml, false);
    html += section(8, "data", "Data", "Query, provenance, citation", "", dataHtml, false);
    html += '<p class="cs-note">Ranks and scores are computed within the cohort from the current database, which uses covalent radii and ' +
      "Pearson electronegativities; the manuscript's ranking used other scales, so values can differ from the paper.</p>";
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
    // open a collapsed section when its link is used
    function openFor(hash) {
      var target = hash && document.getElementById(hash.replace(/^#/, ""));
      if (target && target.tagName === "DETAILS") target.open = true;
    }
    Array.prototype.forEach.call(app.querySelectorAll('a[href^="#"]'), function (a) {
      a.addEventListener("click", function () { openFor(a.getAttribute("href")); });
    });
    openFor(location.hash);
    var copy = document.getElementById("cs-copy");
    copy.onclick = function () {
      var done = function () { copy.textContent = "Copied"; setTimeout(function () { copy.textContent = "Copy the query"; }, 1500); };
      if (navigator.clipboard) navigator.clipboard.writeText(q).then(done, function () {});
    };
  }

  // ------------------------------------------------------------ start
  var host = location.hostname;
  if (host !== "s4e.ai" && host !== "localhost" && host !== "127.0.0.1") {
    status('<h1>CHAOS systems</h1><p>The system pages are on s4e.ai: <a href="https://s4e.ai/chaos-systems">s4e.ai/chaos-systems</a>.</p>');
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
