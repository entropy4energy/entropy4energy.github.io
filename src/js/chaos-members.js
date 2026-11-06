// chaos-members.js: the signed-in side of the CHAOS pages. The pages as built
// show the public face only. This script asks the gate whether the visitor's
// sign-in opens the data; on a yes it adds the member tabs and, on the CHAOS
// overview, the search, the tool cards and the links from the counts. On any
// other answer it does nothing, and the data stay with the gate either way.
(function () {
  "use strict";

  var PAGES = [
    ["chaos-systems", "Systems", "Ranking, synthesis quantities, competing phases and descriptors for each disordered system."],
    ["chaos-materials", "Materials", "The structures of each composition, their formation enthalpies and the disordered systems they belong to."]
  ];
  var AGENT = "/chaos/agent/";

  function tab(href, label) {
    var li = document.createElement("li");
    var a = document.createElement("a");
    a.href = href;
    a.textContent = label;
    if (location.pathname.replace(/\/$/, "").slice(-href.length) === href) {
      a.className = "active";
      a.setAttribute("aria-current", "page");
    }
    li.appendChild(a);
    return li;
  }

  function tabs() {
    var ul = document.querySelector('.product-nav[data-product="chaos"] ul');
    var api = ul && ul.querySelector('a[data-k="api"]');
    if (!api) return;
    var li = api.parentNode;
    PAGES.forEach(function (p) { ul.insertBefore(tab(p[0], p[1]), li); });
    ul.appendChild(tab(AGENT, "CHAOS-Agent"));
  }

  function card(href, title, text) {
    var a = document.createElement("a");
    a.className = "access-card";
    a.href = href;
    var t = document.createElement("div");
    t.className = "access-card-title";
    t.textContent = title;
    var d = document.createElement("div");
    d.className = "access-card-text";
    d.textContent = text;
    a.appendChild(t);
    a.appendChild(d);
    return a;
  }

  function search() {
    var f = document.createElement("form");
    f.className = "chaos-find";
    f.action = "chaos-systems";
    f.method = "get";
    f.setAttribute("role", "search");
    f.innerHTML = '<label for="chaos-find-q">Find a disordered system</label><div class="chaos-find-row">' +
      '<input id="chaos-find-q" name="q" type="search" placeholder="Elements, for example Co Mg Ni" autocomplete="off">' +
      '<input type="hidden" name="cohort" value="all"><button type="submit">Search</button></div>';
    return f;
  }

  // a count or an element becomes a link to its systems
  function link(el) {
    var a = document.createElement("a");
    Array.prototype.forEach.call(el.attributes, function (x) {
      if (x.name !== "data-q") a.setAttribute(x.name, x.value);
    });
    a.href = "chaos-systems?q=" + encodeURIComponent(el.getAttribute("data-q")).replace(/%20/g, "+") + "&cohort=all";
    while (el.firstChild) a.appendChild(el.firstChild);
    el.parentNode.replaceChild(a, el);
  }

  function overview() {
    var cta = document.getElementById("chaos-cta");
    if (!cta) return;
    cta.innerHTML = '<span class="chaos-signed">Signed in</span> <a class="workshop-chip" href="/API/signout">Sign out</a>';
    var box = document.createElement("section");
    box.className = "chaos-tools";
    box.setAttribute("aria-label", "CHAOS tools");
    box.appendChild(search());
    var cards = document.createElement("div");
    cards.className = "access-cards";
    PAGES.forEach(function (p) { cards.appendChild(card(p[0], p[1], p[2])); });
    cards.appendChild(card("/API/?help", "API", "Query entries and descriptors over HTTP. Documentation, fields and examples."));
    cards.appendChild(card(AGENT, "CHAOS-Agent", "Query the database in natural language."));
    box.appendChild(cards);
    var hero = document.querySelector(".chaos-hero");
    hero.parentNode.insertBefore(box, hero.nextSibling);
    var pitch = document.getElementById("access");
    if (pitch) pitch.hidden = true;
    Array.prototype.forEach.call(document.querySelectorAll("[data-q]"), link);
  }

  if (!window.fetch) return;
  fetch("/API/chaos/profiles/meta.json", { credentials: "same-origin", headers: { Accept: "application/json" } })
    .then(function (r) {
      if (!r.ok) return;
      tabs();
      overview();
      document.documentElement.setAttribute("data-chaos-member", "1");
    })
    .catch(function () {});
})();
