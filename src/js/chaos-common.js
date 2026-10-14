// Helpers shared by the CHAOS pages that read data from the CHAOS API gate
// (chaos-systems.js, chaos-materials.js): escaping, formulas, numbers,
// release dates, section markup, fetching with the visitor's sign-in, and
// the messages for a refused or failed request. Loaded before each page's
// own script; it defines window.CHAOS and touches nothing else.
(function () {
  "use strict";

  var SIGNIN = "https://chaos.s4e.ai/API/signin";
  var ACCESS = "https://chaos.s4e.ai/#access";
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function formula(label) {
    return esc(label).replace(/(\)|[A-Za-z])(\d+(?:\.\d+)?)/g, "$1<sub>$2</sub>");
  }
  // n significant digits, kept (masses: 0.5970 g beside 1.110 g)
  function fixed(x, n) {
    if (x == null || !isFinite(x)) return "–";
    if (x === 0) return "0";
    var a = Math.abs(x);
    var d = Math.max(0, (n || 3) - 1 - Math.floor(Math.log10(a)));
    return x.toFixed(Math.min(d, 6));
  }
  // n significant digits, trailing zeros dropped (0.2, not 0.200)
  function sig(x, n) {
    var s = fixed(x, n);
    return s.indexOf(".") < 0 ? s : s.replace(/\.?0+$/, "");
  }
  // release names are UTC times: 20261004T041612Z -> October 4, 2026
  function released(stamp) {
    var m = /^(\d{4})(\d{2})(\d{2})T/.exec(stamp || "");
    if (!m) return esc(stamp || "");
    return MONTHS[+m[2] - 1] + " " + +m[3] + ", " + m[1];
  }
  function ordinal(p) {
    if (p == null) return "–";
    var n = Math.round(p * 100);
    var s = n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] || "th";
    return n + s;
  }
  function unit(u) {
    if (!u) return "";
    if (u === "%") return "%";
    return " " + esc(u).replace("(eV/atom)⁻¹", "(eV/atom)<sup>−1</sup>").replace("Å³", "Å<sup>3</sup>").replace("k_B", "k<sub>B</sub>");
  }
  function list(words) {
    if (words.length < 2) return words.join("");
    return words.slice(0, -1).join(", ") + " and " + words[words.length - 1];
  }
  function params() { return new URLSearchParams(location.search); }
  function here() { return location.pathname + location.search; }

  function section(n, id, title, summary, body) {
    return '<section class="cs-sec" id="' + id + '" aria-labelledby="' + id + '-h"><h2 class="cs-sec-h" id="' + id + '-h">' +
      '<span class="cs-num">' + n + "</span>" + title + "</h2>" +
      (summary ? '<p class="cs-sec-sum">' + summary + "</p>" : "") + '<div class="cs-sec-body">' + body + "</div></section>";
  }

  // A status message in place of the page.
  function status(app, html, cls) {
    app.innerHTML = '<div class="cs-status ' + (cls || "") + '" role="status">' + html + "</div>";
  }

  // GET <api><path> with the visitor's sign-in; resolves with the parsed
  // JSON, rejects with an Error carrying status (0 for no answer) and body.
  function load(api, path) {
    return fetch(api + path, { credentials: "same-origin", headers: { Accept: "application/json" } }).then(
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

  // The message for a refused or failed request. opts: title (the page's
  // h1), lead (what the pages give, for the sign-in message), back (the
  // page's own list address and its link text, for the 404 message).
  function failed(app, err, opts) {
    var h = "<h1>" + opts.title + "</h1>";
    var next = encodeURIComponent(here());
    var b = err.body || {};
    if (err.status === 401) {
      status(app, h + "<p>" + opts.lead + "</p>" +
        '<p><a class="cs-button primary" href="' + SIGNIN + "?next=" + next + '">Sign in to CHAOS</a> ' +
        '<a class="cs-button" href="' + ACCESS + '">How to get access</a></p>', "signin");
    } else if (err.status === 403) {
      status(app, h + '<p>This account is not approved for CHAOS yet. <a href="' + ACCESS + '">How access works</a>.</p>', "signin");
    } else if (err.status === 404) {
      status(app, h + "<p>" + opts.missing + "</p>" + '<p><a href="' + opts.back[0] + '">' + opts.back[1] + "</a></p>", "error");
    } else if (err.status === 429) {
      status(app, h + "<p>" + esc(b.error || "Too many requests; try again shortly.") + "</p>", "error");
    } else if (err.status === 0) {
      status(app, h + "<p>" + esc(location.hostname) + " did not answer. Check your connection and reload the page.</p>", "error");
    } else {
      status(app, h + "<p>" + opts.unavailable + "</p>", "error");
    }
  }

  // Copy text to the clipboard from a button, with a short confirmation.
  function copyButton(button, text, label) {
    button.onclick = function () {
      var done = function () { button.textContent = "Copied"; setTimeout(function () { button.textContent = label; }, 1500); };
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, function () {});
    };
  }

  // Save text as a file from the browser.
  function download(name, text, type) {
    var blob = new Blob([text], { type: type || "text/plain" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  }

  // The hosts the CHAOS data pages run on.
  function onCHAOSHost() {
    var host = location.hostname;
    return host === "chaos.s4e.ai" || host === "localhost" || host === "127.0.0.1";
  }

  window.CHAOS = {
    esc: esc, formula: formula, fixed: fixed, sig: sig, released: released, ordinal: ordinal, unit: unit, list: list,
    params: params, here: here, section: section, status: status, load: load, failed: failed,
    copyButton: copyButton, download: download, onCHAOSHost: onCHAOSHost,
  };
})();
