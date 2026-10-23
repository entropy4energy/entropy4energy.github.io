"use strict";

const base = "/fusion-mirrors", $ = id => document.getElementById(id);

let catalog, current, generation = 0, probeGeneration = 0;

const VISIT = Array.from(crypto.getRandomValues(new Uint8Array(8)), (b => b.toString(16).padStart(2, "0"))).join("");

function record(event, fields = {}) {
    if (!/^(s4e\.ai|(www\.)?entropy4energy\.ai)$/.test(location.hostname)) return;
    try {
        const body = JSON.stringify({
            tool: "fusion-mirrors",
            event: event,
            visit: VISIT,
            page: location.pathname,
            ...fields
        });
        if (navigator.sendBeacon?.("/API/events", new Blob([ body ], {
            type: "text/plain;charset=UTF-8"
        }))) return;
        fetch("/API/events", {
            method: "POST",
            body: body,
            credentials: "include",
            keepalive: true,
            headers: {
                "Content-Type": "text/plain;charset=UTF-8"
            }
        }).catch((() => {}));
    } catch (e) {}
}

const labels = {
    PBE: "Standard PAW / PBE",
    GW: "GW-oriented PAW / PBE",
    both: "Both PAW datasets"
};

function status(message, error = false) {
    $("status").textContent = message;
    $("status").classList.toggle("error", error);
}

function node(tag, text, cls) {
    const n = document.createElement(tag);
    if (text !== undefined) n.textContent = text;
    if (cls) n.className = cls;
    return n;
}

async function json(url, options) {
    const r = await fetch(url, options), d = await r.json();
    if (!r.ok) throw new Error(d.error || "This query is unavailable.");
    return d;
}

function choices() {
    return {
        material: $("material").value,
        branch: $("branch").value,
        channel: $("channel").value,
        band: $("band").value
    };
}

function materials() {
    const q = $("search").value.trim().toLowerCase(), f = $("family").value, previous = $("material").value;
    const ms = catalog.materials.filter((m => (f === "all" || m.family === f) && m.id.toLowerCase().includes(q)));
    $("material").replaceChildren(...ms.map((m => {
        const o = node("option", m.id);
        o.value = m.id;
        return o;
    })));
    if (ms.some((m => m.id === previous))) $("material").value = previous; else if (!q && ms.some((m => m.id === "Rh"))) $("material").value = "Rh";
    branches();
    $("selection").querySelector("button").disabled = !ms.length;
    if (!ms.length) status("No materials match this selection.");
}

function branches() {
    const m = catalog.materials.find((m => m.id === $("material").value));
    for (const o of $("branch").options) o.disabled = !m || (o.value === "both" ? m.branches.length < 2 : !m.branches.includes(o.value));
    if ($("branch").selectedOptions[0]?.disabled && m) $("branch").value = m.branches.includes("PBE") ? "PBE" : m.branches[0];
}

function references(refs) {
    $("references").replaceChildren(...refs.map((ref => {
        const li = node("li"), a = node("a", ref.title);
        a.href = ref.url;
        a.target = "_blank";
        a.rel = "noopener";
        li.append(a);
        return li;
    })));
}

function provenance(data) {
    $("provenance").replaceChildren();
    for (const calc of data.calculations) {
        const box = node("div");
        box.append(node("h3", calc.branch));
        const dl = node("dl");
        const names = {
            formula: "Formula",
            source_structure_id: "Structure identifier",
            ENCUT_eV: "ENCUT (eV)",
            EDIFF_eV: "Electronic threshold (eV)",
            NBANDS_effective: "Bands (NBANDS)",
            CSHIFT_eV: "Broadening (eV)",
            method: "Method"
        };
        for (const [key, value] of Object.entries(calc.settings)) {
            if (value !== "" && value !== null) {
                dl.append(node("dt", names[key] || key), node("dd", String(value)));
            }
        }
        box.append(dl);
        $("provenance").append(box);
    }
    references(data.references);
}

async function view() {
    if (!$("material").value) return;
    const token = ++generation;
    ++probeGeneration;
    current = choices();
    $("probe-result").replaceChildren(node("p", "Look up one wavelength in the selected band.", "hint"));
    $("spectra").hidden = true;
    status("Preparing the selected spectra…");
    const params = new URLSearchParams(current), image = $("spectra");
    try {
        const data = await json(base + "/api/provenance?" + params);
        if (token !== generation) return;
        provenance(data);
        $("material-title").textContent = data.material + " · " + data.family;
        image.onload = () => {
            if (token !== generation) return;
            image.hidden = false;
            status(data.material + " · " + labels[current.branch] + " · " + current.channel + " response");
            document.body.dataset.ready = "true";
            record("view", {
                ...current,
                sampling: "screening",
                component: "mode1",
                polarization: "unpolarized"
            });
        };
        image.onerror = () => {
            if (token === generation) status("The plot is unavailable or the daily plot limit has been reached.", true);
        };
        image.src = base + "/api/plot?" + params;
        history.replaceState(null, "", base + "?" + params);
    } catch (e) {
        status(e.message, true);
    }
}

async function probe() {
    if (!current) return;
    const token = ++probeGeneration, wavelength = $("wavelength").value, selection = {
        ...current,
        wavelength: wavelength
    };
    $("probe-result").replaceChildren(node("p", "Reading the stored sample…", "hint"));
    try {
        const data = await json(base + "/api/probe", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(selection)
        });
        if (token !== probeGeneration || Object.keys(current).some((k => current[k] !== selection[k]))) return;
        record("probe", {
            ...current,
            wavelength: Number(wavelength)
        });
        $("probe-result").replaceChildren(...data.values.map((v => {
            const div = node("div", undefined, "readout");
            div.append(node("h3", v.branch));
            const values = node("div", undefined, "values");
            for (const [key, label] of [ [ "n", "n" ], [ "k", "k" ], [ "R", "R (%)" ] ]) {
                const cell = node("div");
                cell.append(node("span", label), node("strong", v[key] === null ? "Unavailable" : String(v[key])));
                values.append(cell);
            }
            div.append(values, node("p", v.sample_nm === null ? "No supported sample at this wavelength." : `Requested ${v.requested_nm} nm · stored sample ${v.sample_nm} nm · offset ${v.offset_nm} nm`));
            return div;
        })));
    } catch (e) {
        $("probe-result").replaceChildren(node("p", e.message, "hint"));
    }
}

$("selection").addEventListener("submit", (e => {
    e.preventDefault();
    view();
}));

$("material").addEventListener("change", branches);

$("family").addEventListener("change", materials);

$("search").addEventListener("input", materials);

$("probe").addEventListener("submit", (e => {
    e.preventDefault();
    probe();
}));

for (const b of document.querySelectorAll("[data-wavelength]")) b.addEventListener("click", (() => {
    $("wavelength").value = b.dataset.wavelength;
    probe();
}));

$("copy-view").addEventListener("click", (async () => {
    try {
        await navigator.clipboard.writeText(location.href);
        status("View link copied.");
    } catch (e) {
        status("Copy the view link from the address bar.");
    }
}));

$("copy-citation").addEventListener("click", (async () => {
    try {
        await navigator.clipboard.writeText(catalog.references.map((r => r.title + ". " + r.url)).join("\n"));
        $("copy-status").textContent = "Copied";
    } catch (e) {
        $("copy-status").textContent = "Select a reference link to copy it.";
    }
}));

(async () => {
    try {
        catalog = await json(base + "/api/materials");
        record("open");
        for (const [id, label] of Object.entries(catalog.families)) {
            const o = node("option", label);
            o.value = id;
            $("family").append(o);
        }
        materials();
        const qs = new URLSearchParams(location.search);
        for (const key of [ "material", "branch", "channel", "band" ]) {
            const value = qs.get(key);
            if (value && Array.from($(key).options).some((o => o.value === value))) $(key).value = value;
        }
        branches();
        if (location.hostname === "127.0.0.1" || location.hostname === "localhost") $("preview-note").hidden = false;
        await view();
    } catch (e) {
        status("The material catalog is unavailable. " + e.message, true);
    }
})();
