"use strict";

const base = "/fusion-mirrors", $ = id => document.getElementById(id);

let catalog, current, generation = 0, probeGeneration = 0;
let guideWavelength = null, pinnedWavelength = null;

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

const materialNames = {
    Ag: "Silver", Al: "Aluminum", Au: "Gold", Bi: "Bismuth", Co: "Cobalt",
    Cr: "Chromium", Cu: "Copper", Fe: "Iron", Ge: "Germanium", Hf: "Hafnium",
    In: "Indium", Ir: "Iridium", Lu: "Lutetium", Mg: "Magnesium", Mo: "Molybdenum",
    Nb: "Niobium", Ni: "Nickel", Os: "Osmium", P: "Phosphorus", Pb: "Lead",
    Pd: "Palladium", Pt: "Platinum", Re: "Rhenium", Rh: "Rhodium", Ru: "Ruthenium",
    Si: "Silicon", Ta: "Tantalum", Ti: "Titanium", V: "Vanadium", W: "Tungsten",
    Zn: "Zinc", Zr: "Zirconium", SiO2: "Silica", Al2O3: "Alumina",
    HfO2: "Hafnia", ZrO2: "Zirconia", TiO2: "Titania", MgO: "Magnesia",
    C_graphene: "Graphene"
};

function formulaLabel(id) {
    const formula = {C_graphene: "C", CaMg_CO3_2: "CaMg(CO3)2"}[id] || String(id);
    return formula.replace(/[0-9]/g, digit => "₀₁₂₃₄₅₆₇₈₉"[Number(digit)]);
}

function materialLabel(id) {
    const formula = formulaLabel(id);
    return materialNames[id] ? `${materialNames[id]} (${formula})` : formula;
}

function settingValue(key, value) {
    const span = node("span");
    const scientific = String(value).match(/^([+-]?[0-9]+(?:\.[0-9]+)?)e([+-]?[0-9]+)$/i);
    if (key === "formula") span.textContent = formulaLabel(value);
    else if (scientific) {
        const exponent = String(Number(scientific[2])).replace("-", "−");
        span.append(scientific[1] + " × 10", node("sup", exponent));
    } else span.textContent = String(value);
    return span;
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
        band: $("band").value,
        quantity: $("quantity").value,
        compare: [$("compare-1").value, $("compare-2").value].filter(Boolean).join(",")
    };
}

function materials() {
    const q = $("search").value.trim().toLowerCase().replace(/[₀-₉]/g, d => String("₀₁₂₃₄₅₆₇₈₉".indexOf(d))), f = $("family").value, previous = $("material").value;
    const ms = catalog.materials.filter((m => (f === "all" || m.family === f) && (m.id + " " + (materialNames[m.id] || "")).toLowerCase().includes(q)));
    $("material").replaceChildren(...ms.map((m => {
        const o = node("option", materialLabel(m.id));
        o.value = m.id;
        return o;
    })));
    if (ms.some((m => m.id === previous))) $("material").value = previous; else if (!q && ms.some((m => m.id === "Rh"))) $("material").value = "Rh";
    comparisonMaterials();
    branches();
    $("selection").querySelector("button[type=submit]").disabled = !ms.length;
    if (!ms.length) status("No materials match this selection.");
}

function comparisonMaterials() {
    const ids = ["compare-1", "compare-2"], used = new Set([$("material").value]);
    for (const id of ids) {
        const previous = $(id).value;
        $(id).replaceChildren(node("option", "None"), ...catalog.materials.map(m => {
            const o = node("option", materialLabel(m.id));
            o.value = m.id;
            o.disabled = used.has(m.id);
            return o;
        }));
        $(id).options[0].value = "";
        if (previous && !used.has(previous) && catalog.materials.some(m => m.id === previous)) $(id).value = previous;
        if ($(id).value) used.add($(id).value);
    }
}

function branches() {
    const mids = [$("material").value, $("compare-1").value, $("compare-2").value].filter(Boolean);
    const selected = mids.map(mid => catalog.materials.find(m => m.id === mid));
    for (const o of $("branch").options) {
        o.disabled = !selected.length || selected.some(m => !m) || (o.value === "both" ? mids.length > 1 || selected[0].branches.length < 2 : selected.some(m => !m.branches.includes(o.value)));
    }
    if ($("branch").selectedOptions[0]?.disabled) {
        const available = Array.from($("branch").options).find(o => !o.disabled);
        if (available) $("branch").value = available.value;
    }
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
        box.append(node("h3", materialLabel(calc.material || data.material) + " · " + calc.branch));
        const dl = node("dl");
        const names = {
            formula: "Formula",
            ENCUT_eV: "Plane-wave cutoff (eV)",
            EDIFF_eV: "Electronic convergence (eV)",
            NBANDS_effective: "Number of electronic bands",
            CSHIFT_eV: "Optical broadening (eV)",
            method: "Optical calculation"
        };
        for (const [key, value] of Object.entries(calc.settings)) {
            if (Object.hasOwn(names, key) && value !== "" && value !== null) {
                const dd = node("dd");
                dd.append(settingValue(key, value));
                dl.append(node("dt", names[key] || key), dd);
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
    const ranges = {all: [200, 1200], uv: [200, 400], visible: [400, 700], nir: [700, 1200]};
    const [lo, hi] = ranges[current.band];
    $("wavelength").min = lo;
    $("wavelength").max = hi;
    if (Number($("wavelength").value) < lo || Number($("wavelength").value) > hi) $("wavelength").value = lo;
    for (const b of document.querySelectorAll("[data-wavelength]")) b.disabled = Number(b.dataset.wavelength) < lo || Number(b.dataset.wavelength) > hi;
    $("probe-result").replaceChildren(node("p", "Values use the nearest stored 1 nm sample. The readout reports its wavelength and offset; no interpolation or extrapolation is used.", "hint"));
    $("plot-readout").replaceChildren();
    $("spectra").hidden = true;
    $("plot-stage").tabIndex = -1;
    guideWavelength = pinnedWavelength = null;
    $("plot-guide").setAttribute("hidden", "");
    $("cursor-readout").textContent = "Move over a plot to choose a wavelength.";
    $("plot-stage").setAttribute("aria-valuemin", lo);
    $("plot-stage").setAttribute("aria-valuemax", hi);
    $("plot-stage").setAttribute("aria-valuenow", $("wavelength").value);
    $("plot-stage").setAttribute("aria-valuetext", `${$("wavelength").value} nanometers`);
    status("Preparing the selected spectra…");
    const params = new URLSearchParams(current), image = $("spectra");
    try {
        const data = await json(base + "/api/provenance?" + params);
        if (token !== generation) return;
        provenance(data);
        $("material-title").textContent = (data.materials || [data.material]).map(materialLabel).join(" / ") + (current.quantity === "R" ? " · Calculated reflectivity" : " · Optical spectra");
        image.alt = current.quantity === "R" ? "Calculated reflectivity spectrum" : "Calculated reflectivity, refractive index, and extinction coefficient spectra";
        image.onload = () => {
            if (token !== generation) return;
            image.hidden = false;
            $("plot-stage").tabIndex = 0;
            status((data.materials || [data.material]).map(materialLabel).join(" / ") + " · " + labels[current.branch] + " · " + current.channel + " response");
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
        const link = new URLSearchParams(params);
        link.set("at", $("wavelength").value);
        history.replaceState(null, "", base + "?" + link);
    } catch (e) {
        if (token === generation) status(e.message, true);
    }
}

async function probe() {
    if (!current) return;
    const numeric = Number($("wavelength").value);
    if (Number.isFinite(numeric) && numeric >= Number($("wavelength").min) && numeric <= Number($("wavelength").max)) {
        pinnedWavelength = numeric;
        showGuide(numeric, true);
    }
    const token = ++probeGeneration, wavelength = $("wavelength").value, selection = {
        ...current,
        wavelength: wavelength
    };
    const link = new URL(location.href);
    link.searchParams.set("at", wavelength);
    history.replaceState(null, "", link);
    $("probe-result").replaceChildren(node("p", "Reading the stored sample…", "hint"));
    $("plot-readout").replaceChildren(node("p", "Reading the stored sample…", "hint"));
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
            div.append(node("h3", materialLabel(v.material || data.material) + " · " + v.branch));
            const values = node("div", undefined, "values");
            for (const key of [ "n", "k", "R" ]) {
                const cell = node("div"), label = node("span");
                label.append(node("var", key));
                if (key === "R") label.append(" (%)");
                cell.append(label, node("strong", v[key] === null ? "Unavailable" : String(v[key])));
                values.append(cell);
            }
            div.append(values, node("p", v.sample_nm === null ? "No supported sample at this wavelength." : `Requested ${v.requested_nm} nm · stored sample ${v.sample_nm} nm · offset ${v.offset_nm} nm`));
            return div;
        })));
        $("plot-readout").replaceChildren(...Array.from($("probe-result").children, element => element.cloneNode(true)));
    } catch (e) {
        if (token !== probeGeneration) return;
        $("plot-readout").replaceChildren(node("p", e.message, "hint"));
        $("probe-result").replaceChildren(node("p", e.message, "hint"));
    }
}

function showGuide(wavelength, pinned = false) {
    if (!current || $("spectra").hidden) return;
    guideWavelength = wavelength;
    const layout = catalog.plot_layouts[current.quantity], svg = $("plot-guide");
    const [lo, hi] = catalog.bands[current.band];
    svg.setAttribute("viewBox", `0 0 ${layout.width} ${layout.height}`);
    svg.replaceChildren(...layout.panels.map(panel => {
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        const x = panel.left + (wavelength - lo) / (hi - lo) * (panel.right - panel.left);
        for (const [key, value] of Object.entries({x1:x, x2:x, y1:panel.top, y2:panel.bottom})) line.setAttribute(key, value);
        return line;
    }));
    svg.removeAttribute("hidden");
    $("plot-stage").setAttribute("aria-valuenow", wavelength);
    $("plot-stage").setAttribute("aria-valuetext", `${wavelength} nanometers`);
    $("cursor-readout").textContent = `${wavelength} nm · ${pinned ? "Selected wavelength" : "Click for values"}`;
}

function pointerWavelength(event) {
    if (!current || $("spectra").hidden) return null;
    const rect = $("spectra").getBoundingClientRect(), layout = catalog.plot_layouts[current.quantity];
    const x = (event.clientX - rect.left) / rect.width * layout.width;
    const y = (event.clientY - rect.top) / rect.height * layout.height;
    const panel = layout.panels.find(p => x >= p.left && x <= p.right && y >= p.top && y <= p.bottom);
    if (!panel) return null;
    const [lo, hi] = catalog.bands[current.band];
    return Math.round(lo + (x - panel.left) / (panel.right - panel.left) * (hi - lo));
}

$("plot-stage").addEventListener("pointermove", event => {
    const wavelength = pointerWavelength(event);
    if (wavelength !== null) showGuide(wavelength);
    else if (pinnedWavelength !== null) showGuide(pinnedWavelength, true);
    else $("plot-guide").setAttribute("hidden", "");
});
$("plot-stage").addEventListener("pointerleave", () => {
    if (pinnedWavelength !== null) showGuide(pinnedWavelength, true);
    else {
        $("plot-guide").setAttribute("hidden", "");
        $("cursor-readout").textContent = "Move over a plot to choose a wavelength.";
    }
});
$("plot-stage").addEventListener("click", event => {
    const wavelength = pointerWavelength(event);
    if (wavelength === null) return;
    $("wavelength").value = wavelength;
    probe();
});
$("plot-stage").addEventListener("keydown", event => {
    if (!current || $("spectra").hidden) return;
    const [lo, hi] = catalog.bands[current.band];
    let wavelength = guideWavelength ?? Number($("wavelength").value);
    const step = event.shiftKey ? 10 : 1;
    if (["ArrowLeft", "ArrowDown"].includes(event.key)) wavelength -= step;
    else if (["ArrowRight", "ArrowUp"].includes(event.key)) wavelength += step;
    else if (event.key === "Home") wavelength = lo;
    else if (event.key === "End") wavelength = hi;
    else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault(); $("wavelength").value = Math.max(lo, Math.min(hi, wavelength)); probe(); return;
    } else return;
    event.preventDefault();
    showGuide(Math.max(lo, Math.min(hi, wavelength)));
});

$("selection").addEventListener("submit", (e => {
    e.preventDefault();
    view();
}));

$("material").addEventListener("change", () => { comparisonMaterials(); branches(); view(); });
for (const id of ["compare-1", "compare-2"]) $(id).addEventListener("change", () => { comparisonMaterials(); branches(); view(); });
$("clear-comparison").addEventListener("click", () => {
    $("compare-1").value = $("compare-2").value = "";
    comparisonMaterials(); branches(); view();
});
$("compare-examples").addEventListener("click", () => {
    $("search").value = ""; $("family").value = "all"; materials();
    $("material").value = "Rh";
    $("compare-1").value = "Mo"; $("compare-2").value = "W";
    comparisonMaterials(); branches(); view();
});
for (const id of ["branch", "channel", "band", "quantity"]) $(id).addEventListener("change", view);

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

for (const b of document.querySelectorAll("[data-material]")) b.addEventListener("click", () => {
    $("search").value = "";
    $("family").value = "all";
    materials();
    $("material").value = b.dataset.material;
    comparisonMaterials();
    branches();
    view();
});

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
        for (const key of [ "material", "branch", "channel", "band", "quantity" ]) {
            const value = qs.get(key);
            if (value && Array.from($(key).options).some((o => o.value === value))) $(key).value = value;
        }
        const compared = (qs.get("compare") || "").split(",");
        for (const [i, id] of ["compare-1", "compare-2"].entries()) {
            if (catalog.materials.some(m => m.id === compared[i])) $(id).value = compared[i];
        }
        comparisonMaterials();
        branches();
        const selectedWavelength = Number(qs.get("at"));
        if (qs.has("at") && Number.isFinite(selectedWavelength)) $("wavelength").value = selectedWavelength;
        $("compare-examples").disabled = !["Rh", "Mo", "W"].every(id => catalog.materials.some(m => m.id === id));
        if (location.hostname === "127.0.0.1" || location.hostname === "localhost") $("preview-note").hidden = false;
        for (const b of document.querySelectorAll("[data-material]")) b.disabled = !catalog.materials.some(m => m.id === b.dataset.material);
        await view();
    } catch (e) {
        status("The material catalog is unavailable. " + e.message, true);
    }
})();
