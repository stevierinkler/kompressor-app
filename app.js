/* Kompressor-Kontrolle – digitale Erfassung
   Alle Daten bleiben im Browser-Speicher dieses Geräts (localStorage). */

const APP_VERSION = "1.3.2";
const DAYS = ["Mo.", "Di.", "Mi.", "Do.", "Fr."];
const DAYS_LONG = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag"];
const app = document.getElementById("app");

/* ================= Datum & Kalenderwoche ================= */
function isoWeek(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const year = t.getUTCFullYear();
  const week = Math.ceil(((t - Date.UTC(year, 0, 1)) / 86400000 + 1) / 7);
  return { year, week };
}
function mondayOf(year, week) {
  const jan4 = new Date(year, 0, 4);
  const day = jan4.getDay() || 7;
  const mon = new Date(year, 0, 4 - day + 1);
  mon.setDate(mon.getDate() + (week - 1) * 7);
  return mon;
}
function dateOf(wk, dayIdx) {
  const d = mondayOf(wk.year, wk.week);
  d.setDate(d.getDate() + dayIdx);
  return d;
}
function fmt(d, withYear) {
  const dd = String(d.getDate()).padStart(2, "0"), mm = String(d.getMonth() + 1).padStart(2, "0");
  return withYear ? `${dd}.${mm}.${d.getFullYear()}` : `${dd}.${mm}.`;
}
function shiftWeek(wk, delta) {
  const d = mondayOf(wk.year, wk.week);
  d.setDate(d.getDate() + delta * 7);
  return isoWeek(d);
}
function sameWeek(a, b) { return a.year === b.year && a.week === b.week; }
function today() {
  const now = new Date();
  const dow = now.getDay(); // 0 = So
  return { date: now, wk: isoWeek(now), dayIdx: dow >= 1 && dow <= 5 ? dow - 1 : null, weekend: dow === 0 || dow === 6 };
}
// Liegt der Tag (noch) in der Zukunft?
function isFuture(wk, dayIdx) {
  const t = today();
  if (wk.year > t.wk.year || (wk.year === t.wk.year && wk.week > t.wk.week)) return true;
  if (!sameWeek(wk, t.wk)) return false;
  if (t.weekend) return false;
  return dayIdx > t.dayIdx;
}

/* ================= Speicher ================= */
const KEY_SETTINGS = "kk.settings";
const weekKey = wk => `kk.week.${wk.year}-W${String(wk.week).padStart(2, "0")}`;

function loadSettings() {
  const def = { name: "", theme: "auto" };
  try { return Object.assign(def, JSON.parse(localStorage.getItem(KEY_SETTINGS)) || {}); }
  catch { return def; }
}
function saveSettings(s) { localStorage.setItem(KEY_SETTINGS, JSON.stringify(s)); }

/* ================= Farbschema (nur Ansicht, PDF bleibt immer hell) ================= */
const darkQuery = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
function applyTheme() {
  const t = loadSettings().theme;
  const dark = t === "dark" || (t === "auto" && darkQuery && darkQuery.matches);
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", dark ? "#16223A" : "#1F3864");
}
if (darkQuery) {
  const onChange = () => { if (loadSettings().theme === "auto") applyTheme(); };
  if (darkQuery.addEventListener) darkQuery.addEventListener("change", onChange);
  else if (darkQuery.addListener) darkQuery.addListener(onChange);
}
applyTheme();

function loadWeek(wk) {
  let w = null;
  try { w = JSON.parse(localStorage.getItem(weekKey(wk))); } catch {}
  if (!w) w = { year: wk.year, week: wk.week, values: {}, notes: {}, sign: {} };
  w.values = w.values || {}; w.notes = w.notes || {}; w.sign = w.sign || {};
  return w;
}
function saveWeek(w) {
  try { localStorage.setItem(weekKey(w), JSON.stringify(w)); }
  catch (e) { toast("Speichern fehlgeschlagen – Speicher voll? Bitte Sicherung exportieren."); }
}
function allWeekKeys() {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k.startsWith("kk.week.")) keys.push(k);
  }
  return keys.sort();
}

/* ================= Vorlagen-Helfer ================= */
const tplOf = comp => TEMPLATES[comp.type];
const compById = id => COMPRESSORS.find(c => c.id === id);

// sichtbare Messpunkte für einen Tag (Freitags-Felder nur am Freitag)
function visibleItems(comp, dayIdx) {
  const out = [];
  for (const s of tplOf(comp).sections)
    for (const it of s.items)
      if (!it.fridayOnly || dayIdx === 4) out.push(it);
  return out;
}
function getVals(w, dayIdx, compId) { return (w.values[dayIdx] || {})[compId] || {}; }
function setVal(w, dayIdx, compId, id, v) {
  w.values[dayIdx] = w.values[dayIdx] || {};
  w.values[dayIdx][compId] = w.values[dayIdx][compId] || {};
  if (v === "" || v == null) delete w.values[dayIdx][compId][id];
  else w.values[dayIdx][compId][id] = v;
  saveWeek(w);
}
function missingItems(w, dayIdx, comp) {
  const v = getVals(w, dayIdx, comp.id);
  return visibleItems(comp, dayIdx).filter(it => v[it.id] == null || v[it.id] === "");
}
function compStatus(w, dayIdx, comp) {
  const total = visibleItems(comp, dayIdx).length;
  const miss = missingItems(w, dayIdx, comp).length;
  if (miss === 0) return "done";
  if (miss === total) return "open";
  return "partial";
}
function dayStarted(w, dayIdx) { return COMPRESSORS.some(c => compStatus(w, dayIdx, c) !== "open"); }
function dayComplete(w, dayIdx) { return COMPRESSORS.every(c => compStatus(w, dayIdx, c) === "done"); }
// Ein Tag gilt nur mit Name UND Unterschrift als unterzeichnet
function daySigned(w, dayIdx) { const s = w.sign[dayIdx]; return !!(s && s.name && s.img); }

/* ================= UI-Helfer ================= */
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ICON = {
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68 1.65 1.65 0 0 0 10 3.17V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
};
function topbar(title, sub, left, right) {
  return `<header class="topbar">${left || ""}<h1>${esc(title)}${sub ? `<small>${esc(sub)}</small>` : ""}</h1>${right || ""}</header>`;
}
function toast(msg) {
  const t = document.createElement("div");
  t.className = "toast"; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}
function dialog({ title, text, html, buttons }) {
  return new Promise(resolve => {
    const ov = document.createElement("div");
    ov.className = "overlay";
    ov.innerHTML = `<div class="dialog" role="dialog"><h3>${esc(title)}</h3>${text ? `<p>${esc(text)}</p>` : ""}${html || ""}
      <div class="btns">${buttons.map((b, i) => `<button class="btn ${b.cls || "btn-secondary"}" data-i="${i}">${esc(b.label)}</button>`).join("")}</div></div>`;
    ov.addEventListener("click", e => {
      const b = e.target.closest("button[data-i]");
      if (b) { ov.remove(); resolve(buttons[+b.dataset.i].value); }
      else if (e.target === ov) { ov.remove(); resolve(null); }
    });
    document.body.appendChild(ov);
  });
}

/* ================= Navigation ================= */
let state = { view: "home", wk: today().wk, dayIdx: 0, compId: COMPRESSORS[0].id };
function go(view, patch = {}) {
  Object.assign(state, patch, { view });
  history.pushState({ ...state }, "");
  render();
}
window.addEventListener("popstate", e => { if (e.state) { state = e.state; render(); } });

function render() {
  window.scrollTo(0, 0);
  ({ home: viewHome, capture: viewCapture, sign: viewSign, week: viewWeek, settings: viewSettings }[state.view] || viewHome)();
}

/* ================= Startseite ================= */
function viewHome() {
  const t = today();
  const w = loadWeek(t.wk);
  let main = "";

  if (t.weekend) {
    main = `<div class="weekend">Wochenende – keine Erfassung</div>
      <div class="hint">Werte von Freitag fehlen noch? Über die Wochenübersicht kannst du nachtragen.</div>`;
  } else {
    const d = t.dayIdx;
    let btn;
    if (!dayStarted(w, d)) btn = `<button class="btn btn-primary" id="start">Erfassung starten</button>`;
    else if (!dayComplete(w, d) || !daySigned(w, d)) btn = `<button class="btn btn-primary" id="cont">Weitermachen</button>`;
    else btn = `<button class="btn btn-done" id="done">Heute erledigt ✓</button>`;
    const doneCount = COMPRESSORS.filter(c => compStatus(w, d, c) === "done").length;
    main = btn + `<div class="hint">${doneCount} von ${COMPRESSORS.length} Kompressoren erfasst${daySigned(w, d) ? " · unterzeichnet" : ""}</div>`;
  }

  app.innerHTML = topbar("Kompressor-Kontrolle", null, "",
      `<button class="iconbtn" id="settings" aria-label="Einstellungen">${ICON.gear}</button>`) + `
    <main>
      <div class="card today">
        <div class="kw">KW ${t.wk.week} · ${t.wk.year}</div>
        <div class="date">${t.date.toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })}</div>
        ${main}
      </div>
      <div class="card">
        <h2>Diese Woche</h2>
        ${statusGrid(w, t.wk)}
      </div>
      <button class="btn btn-secondary" id="week">Wochenübersicht &amp; Nachtragen</button>
      <button class="btn btn-primary" id="pdf">PDF erstellen</button>
    </main>`;

  const d = t.dayIdx;
  on("#start", () => go("capture", { wk: t.wk, dayIdx: d, compId: COMPRESSORS[0].id }));
  on("#cont", () => {
    const next = COMPRESSORS.find(c => compStatus(w, d, c) === "open") || COMPRESSORS.find(c => compStatus(w, d, c) !== "done");
    if (next) go("capture", { wk: t.wk, dayIdx: d, compId: next.id });
    else go("sign", { wk: t.wk, dayIdx: d });
  });
  on("#done", () => go("week", { wk: t.wk }));
  on("#settings", () => go("settings"));
  on("#week", () => go("week", { wk: t.wk }));
  on("#pdf", () => startPdf(t.wk));
  bindGrid(t.wk);
}

function statusGrid(w, wk) {
  const t = today();
  let h = `<table class="grid"><tr><th></th>${DAYS.map((d, i) => `<th>${d}<small>${fmt(dateOf(wk, i))}</small></th>`).join("")}</tr>`;
  for (const c of COMPRESSORS) {
    h += `<tr><th class="rowhead">${c.id}</th>`;
    for (let i = 0; i < 5; i++) {
      const fut = isFuture(wk, i);
      const st = fut ? "future" : compStatus(w, i, c);
      const isToday = sameWeek(wk, t.wk) && t.dayIdx === i;
      const sym = { done: "✓", partial: "…", open: "", future: "" }[st];
      h += `<td><button class="cell st-${st}${isToday ? " st-today" : ""}" data-d="${i}" data-c="${c.id}" ${fut ? "disabled" : ""} aria-label="${c.id} ${DAYS_LONG[i]}">${sym}</button></td>`;
    }
    h += "</tr>";
  }
  h += `<tr><th class="rowhead small">Unterz.</th>`;
  for (let i = 0; i < 5; i++) {
    const fut = isFuture(wk, i);
    const st = fut ? "future" : daySigned(w, i) ? "done" : "open";
    h += `<td><button class="cell st-${st}" data-sign="${i}" ${fut ? "disabled" : ""} aria-label="Unterzeichnung ${DAYS_LONG[i]}">${st === "done" ? "✓" : ""}</button></td>`;
  }
  h += `</tr></table><div class="legend"><span class="l-done">komplett</span><span class="l-partial">unvollständig</span><span class="l-open">offen</span></div>`;
  return h;
}
function bindGrid(wk) {
  app.querySelectorAll(".grid [data-c]").forEach(b => b.addEventListener("click", () =>
    go("capture", { wk, dayIdx: +b.dataset.d, compId: b.dataset.c })));
  app.querySelectorAll(".grid [data-sign]").forEach(b => b.addEventListener("click", () =>
    go("sign", { wk, dayIdx: +b.dataset.sign })));
}
function on(sel, fn) { const el = app.querySelector(sel); if (el) el.addEventListener("click", fn); }

/* ================= Erfassung ================= */
function viewCapture() {
  const { wk, dayIdx } = state;
  const comp = compById(state.compId);
  const tpl = tplOf(comp);
  const w = loadWeek(wk);
  const vals = getVals(w, dayIdx, comp.id);
  const idx = COMPRESSORS.indexOf(comp);
  const next = COMPRESSORS[idx + 1];
  const dayLabel = `${DAYS[dayIdx]} ${fmt(dateOf(wk, dayIdx))} · KW ${wk.week}`;

  let nr = 0, body = "";
  for (const s of tpl.sections) {
    const items = s.items.filter(it => !it.fridayOnly || dayIdx === 4);
    if (!items.length) { if (s.numbered !== false) nr += 0; continue; }
    body += `<div class="section"><div class="section-title">${esc(s.title)}</div><div class="section-body">`;
    for (const it of items) {
      const n = s.numbered === false || it.type === "check" ? "" : ++nr;
      const v = vals[it.id];
      const ref = tpl.showLimits && it.limit ? `<br><span class="ref">Max/Min ${esc(it.limit)} ${esc(it.unit)}</span>` : "";
      if (it.type === "check") {
        body += `<div class="field" data-id="${it.id}"><span class="nr"></span><span class="lbl">${esc(it.label)}</span>
          <div class="checks"><button data-v="ok" class="${v === "ok" ? "on-ok" : ""}" aria-label="in Ordnung">✓</button><button data-v="nok" class="${v === "nok" ? "on-nok" : ""}" aria-label="Mangel">✗</button></div></div>`;
      } else {
        body += `<div class="field" data-id="${it.id}"><span class="nr">${n}</span><span class="lbl">${esc(it.label)}${ref}</span>
          <div class="inwrap"><input type="text" inputmode="decimal" enterkeyhint="next" autocomplete="off" value="${esc(v ?? "")}" aria-label="${esc(it.label)}"><span class="unit">${esc(it.unit)}</span></div></div>`;
      }
    }
    body += `</div></div>`;
  }
  if (tpl.hasNotes) {
    const note = (w.notes[dayIdx] || {})[comp.id] || "";
    body += `<div class="section"><div class="section-title">BEMERKUNG (optional)</div><div class="section-body" style="padding:12px">
      <textarea class="notes" id="notes" placeholder="Freier Text, erscheint in der PDF">${esc(note)}</textarea></div></div>`;
  }

  const chips = COMPRESSORS.map(c =>
    `<button class="chip st-${compStatus(w, dayIdx, c)}${c.id === comp.id ? " active" : ""}" data-c="${c.id}"><span class="dot"></span>${c.id}</button>`).join("");

  app.innerHTML = topbar(`${comp.id} · ${comp.type === "HD" ? "Hochdruck" : "Niederdruck"}`, dayLabel,
      `<button class="iconbtn" id="home" aria-label="Zur Startseite">${ICON.back}</button>`,
      `<button class="iconbtn" id="weekbtn" aria-label="Wochenübersicht">${ICON.grid}</button>`) +
    `<nav class="chips">${chips}</nav>
    <main>${body}</main>
    <div class="bottombar"><div class="inner">
      <button class="btn btn-primary" id="next">${next ? `Weiter zu ${next.id} →` : "Weiter zur Unterzeichnung →"}</button>
    </div></div>`;

  // Eingaben speichern
  const inputs = [...app.querySelectorAll(".field input")];
  inputs.forEach((inp, i) => {
    const id = inp.closest(".field").dataset.id;
    inp.addEventListener("input", () => {
      let v = inp.value.replace(/[^0-9,.\-]/g, "");
      if (v !== inp.value) inp.value = v;
      setVal(w, dayIdx, comp.id, id, v.trim());
      inp.closest(".field").classList.remove("missing");
      refreshChips(w, dayIdx);
    });
    inp.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (inputs[i + 1]) inputs[i + 1].focus();
        else inp.blur();
      }
    });
  });
  app.querySelectorAll(".checks").forEach(box => {
    const id = box.closest(".field").dataset.id;
    box.addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      const cur = getVals(w, dayIdx, comp.id)[id];
      const nv = cur === b.dataset.v ? "" : b.dataset.v;
      setVal(w, dayIdx, comp.id, id, nv);
      box.querySelectorAll("button").forEach(x => x.className = "");
      if (nv) b.className = nv === "ok" ? "on-ok" : "on-nok";
      box.closest(".field").classList.remove("missing");
      refreshChips(w, dayIdx);
    });
  });
  const notes = app.querySelector("#notes");
  if (notes) notes.addEventListener("input", () => {
    w.notes[dayIdx] = w.notes[dayIdx] || {};
    if (notes.value.trim()) w.notes[dayIdx][comp.id] = notes.value; else delete w.notes[dayIdx][comp.id];
    saveWeek(w);
  });

  const leave = async target => {
    const miss = missingItems(loadWeek(wk), dayIdx, comp);
    if (miss.length) {
      const res = await dialog({
        title: `${comp.id}: ${miss.length} ${miss.length === 1 ? "Wert fehlt" : "Werte fehlen"}`,
        html: `<ul>${miss.slice(0, 8).map(m => `<li>${esc(m.label)}</li>`).join("")}${miss.length > 8 ? `<li>… und ${miss.length - 8} weitere</li>` : ""}</ul>`,
        buttons: [{ label: "Zurück und ergänzen", cls: "btn-primary", value: "back" }, { label: "Trotzdem weiter", cls: "btn-ghost", value: "go" }],
      });
      if (res !== "go") { markMissing(miss); return; }
    }
    target();
  };
  app.querySelectorAll(".chip").forEach(ch => ch.addEventListener("click", () => {
    if (ch.dataset.c === comp.id) return;
    leave(() => { state.compId = ch.dataset.c; history.replaceState({ ...state }, ""); render(); });
  }));
  on("#next", () => leave(() => next ? (state.compId = next.id, history.replaceState({ ...state }, ""), render()) : go("sign", { wk, dayIdx })));
  on("#home", () => go("home"));
  on("#weekbtn", () => go("week", { wk }));
}
function refreshChips(w, dayIdx) {
  app.querySelectorAll(".chip").forEach(ch => {
    const st = compStatus(w, dayIdx, compById(ch.dataset.c));
    ch.className = `chip st-${st}${ch.classList.contains("active") ? " active" : ""}`;
  });
}
function markMissing(miss) {
  let first = null;
  for (const m of miss) {
    const f = app.querySelector(`.field[data-id="${m.id}"]`);
    if (f) { f.classList.add("missing", "flash"); first = first || f; setTimeout(() => f.classList.remove("flash"), 2100); }
  }
  if (first) {
    first.scrollIntoView({ behavior: "smooth", block: "center" });
    const inp = first.querySelector("input"); if (inp) setTimeout(() => inp.focus(), 350);
  }
}

/* ================= Unterzeichnung ================= */
function viewSign() {
  const { wk, dayIdx } = state;
  const w = loadWeek(wk);
  const s = loadSettings();
  const ex = w.sign[dayIdx] || {};
  const incomplete = COMPRESSORS.filter(c => compStatus(w, dayIdx, c) !== "done");

  app.innerHTML = topbar("Unterzeichnung", `${DAYS_LONG[dayIdx]}, ${fmt(dateOf(wk, dayIdx), true)} · KW ${wk.week}`,
      `<button class="iconbtn" id="back" aria-label="Zurück">${ICON.back}</button>`) + `
    <main>
      ${incomplete.length ? `<div class="card" style="background:var(--warn-bg);color:var(--warn)"><strong>Noch unvollständig:</strong> ${incomplete.map(c => c.id).join(", ")}</div>` : `<div class="card" style="background:var(--ok-bg);color:var(--ok)"><strong>Alle 7 Kompressoren komplett erfasst.</strong></div>`}
      <div class="card">
        <p class="muted" style="margin-top:0">Gilt für alle Kompressoren an diesem Tag.</p>
        <label class="f" for="name">Ausgefüllt durch</label>
        <input class="txt" id="name" value="${esc(ex.name || s.name || (Object.values(w.sign).find(x => x && x.name) || {}).name || "")}" placeholder="Vor- und Nachname" autocomplete="name">
        <label class="f" for="signdate">Datum</label>
        <input class="txt" id="signdate" value="${fmt(new Date(), true)}" readonly tabindex="-1" aria-readonly="true">
        <p class="muted small" style="margin:6px 0 0">Wird automatisch eingetragen.</p>
        <label class="f">Unterschrift</label>
        <div class="sigwrap"><canvas id="pad"></canvas><div class="baseline"></div><div class="ph">hier mit dem Finger unterschreiben</div></div>
        <button class="btn btn-ghost mt" id="clear">Unterschrift löschen</button>
      </div>
    </main>
    <div class="bottombar"><div class="inner"><button class="btn btn-primary" id="save">Tag abschließen ✓</button></div></div>`;

  // Hat der Tag schon eine Unterschrift, bleibt sie; sonst die gespeicherte aus den Einstellungen
  const pad = setupPad(app.querySelector("#pad"), ex.img || s.sig || null);
  pad.resize();
  on("#clear", () => pad.clear());
  on("#back", () => history.back());
  on("#save", async () => {
    const name = app.querySelector("#name").value.trim();
    if (!name) { toast("Bitte Namen eintragen"); app.querySelector("#name").focus(); return; }
    if (pad.isEmpty()) { toast("Bitte unterschreiben"); return; }
    if (incomplete.length) {
      const r = await dialog({ title: "Tag trotz Lücken abschließen?", text: `Unvollständig: ${incomplete.map(c => c.id).join(", ")}. Du kannst später über die Wochenübersicht nachtragen.`,
        buttons: [{ label: "Trotzdem abschließen", cls: "btn-primary", value: "ok" }, { label: "Abbrechen", cls: "btn-ghost", value: null }] });
      if (r !== "ok") return;
    }
    w.sign[dayIdx] = { name, date: new Date().toISOString(), img: pad.toDataURL() };
    saveWeek(w);
    if (!s.name) { s.name = name; saveSettings(s); }
    toast("Unterzeichnet ✓");
    go("home");
  });
}

// Unterschriftsfeld. "initial" ist eine bereits vorhandene Unterschrift (gespeicherte oder die des Tages).
// Sie wird angezeigt; sobald man neu zu zeichnen beginnt, wird sie zuerst entfernt –
// so liegen nie zwei Unterschriften übereinander.
function setupPad(canvas, initial) {
  const ctx = canvas.getContext("2d");
  let drawing = false, empty = !initial, last = null;
  let snapshot = initial || null;
  let replaceOnDraw = !!initial;
  function wipe() { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.restore(); }
  function resize() {
    const r = canvas.getBoundingClientRect();
    if (!r.width) return;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = r.width * ratio; canvas.height = r.height * ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.lineWidth = 3.2; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#0B2A6B";
    if (snapshot) {
      const src = snapshot, img = new Image();
      img.onload = () => {
        if (snapshot !== src) return; // inzwischen gelöscht oder neu gezeichnet
        // Seitenverhältnis beibehalten, mittig einpassen
        const sc = Math.min(r.width / img.width, r.height / img.height);
        const w = img.width * sc, h = img.height * sc;
        ctx.drawImage(img, (r.width - w) / 2, (r.height - h) / 2, w, h);
        empty = false;
      };
      img.src = src;
    }
  }
  const pos = e => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  canvas.addEventListener("pointerdown", e => {
    if (replaceOnDraw) { wipe(); snapshot = null; replaceOnDraw = false; }
    drawing = true; last = pos(e); canvas.setPointerCapture(e.pointerId);
    ctx.beginPath(); ctx.arc(last.x, last.y, 1.2, 0, Math.PI * 2); ctx.fillStyle = "#0B2A6B"; ctx.fill(); empty = false;
  });
  canvas.addEventListener("pointermove", e => {
    if (!drawing) return;
    const p = pos(e);
    ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke();
    last = p; empty = false;
  });
  const end = () => { if (drawing) { drawing = false; snapshot = canvas.toDataURL("image/png"); } };
  canvas.addEventListener("pointerup", end); canvas.addEventListener("pointercancel", end);
  return {
    resize,
    clear() { wipe(); empty = true; snapshot = null; replaceOnDraw = false; },
    isEmpty: () => empty,
    // Vorausgefüllte Unterschrift unverändert übernehmen, neu gezeichnete verkleinert speichern
    toDataURL() {
      if (replaceOnDraw && initial) return initial;
      const W = 400, H = Math.round(W * canvas.height / canvas.width);
      const off = document.createElement("canvas");
      off.width = W; off.height = H;
      off.getContext("2d").drawImage(canvas, 0, 0, W, H);
      return off.toDataURL("image/png");
    },
  };
}

/* ================= Wochenübersicht ================= */
function viewWeek() {
  const wk = state.wk;
  const w = loadWeek(wk);
  const t = today();
  const mon = dateOf(wk, 0), fri = dateOf(wk, 4);
  app.innerHTML = topbar("Wochenübersicht", "Tippe auf ein Feld zum Ansehen oder Nachtragen",
      `<button class="iconbtn" id="home" aria-label="Zur Startseite">${ICON.back}</button>`) + `
    <main>
      <div class="card">
        <div class="weeknav">
          <button id="prev" aria-label="Vorherige Woche">‹</button>
          <div class="center"><strong>KW ${wk.week} · ${wk.year}</strong><div class="muted small">${fmt(mon)} – ${fmt(fri, true)}</div></div>
          <button id="nxt" aria-label="Nächste Woche" ${sameWeek(wk, t.wk) ? "disabled style='opacity:.35'" : ""}>›</button>
        </div>
        ${statusGrid(w, wk)}
      </div>
      <button class="btn btn-primary" id="pdf">PDF für KW ${wk.week} erstellen</button>
      ${!sameWeek(wk, t.wk) ? `<button class="btn btn-ghost" id="cur">Zur aktuellen Woche</button>` : ""}
    </main>`;
  on("#home", () => go("home"));
  on("#prev", () => { state.wk = shiftWeek(wk, -1); history.replaceState({ ...state }, ""); render(); });
  on("#nxt", () => { if (!sameWeek(wk, t.wk)) { state.wk = shiftWeek(wk, 1); history.replaceState({ ...state }, ""); render(); } });
  on("#cur", () => { state.wk = t.wk; history.replaceState({ ...state }, ""); render(); });
  on("#pdf", () => startPdf(wk));
  bindGrid(wk);
}

/* ================= Einstellungen & Sicherung ================= */
function viewSettings() {
  const s = loadSettings();
  const weeks = allWeekKeys();
  app.innerHTML = topbar("Einstellungen", null, `<button class="iconbtn" id="home" aria-label="Zurück">${ICON.back}</button>`) + `
    <main>
      <div class="card">
        <h2>Darstellung</h2>
        <div class="seg" id="theme"><button data-t="auto" class="${s.theme === "auto" ? "on" : ""}">Automatisch</button><button data-t="light" class="${s.theme === "light" ? "on" : ""}">Hell</button><button data-t="dark" class="${s.theme === "dark" ? "on" : ""}">Dunkel</button></div>
        <p class="muted small">„Automatisch“ folgt der Einstellung deines Handys. Die PDF bleibt immer hell.</p>
      </div>
      <div class="card">
        <h2 class="h2help">Unterzeichnung<button class="helpbtn" id="sighelp" aria-label="Hilfe zur gespeicherten Unterschrift">?</button></h2>
        <label class="f" for="name">Dein Name (wird vorausgefüllt)</label>
        <input class="txt" id="name" value="${esc(s.name)}" placeholder="Vor- und Nachname">
        <label class="f">Gespeicherte Unterschrift</label>
        <div class="sigwrap"><canvas id="pad"></canvas><div class="baseline"></div><div class="ph">hier mit dem Finger unterschreiben</div></div>
        <p class="muted small" id="sigstate" style="margin:6px 0 0">${s.sig ? "Gespeichert – wird bei der Unterzeichnung automatisch eingesetzt." : "Noch keine Unterschrift gespeichert."}</p>
        <div class="row mt"><button class="btn btn-secondary" id="sigsave">Speichern</button><button class="btn btn-ghost" id="sigdel">Löschen</button></div>
      </div>
      <div class="card">
        <h2>Datensicherung</h2>
        <p class="muted" style="margin-top:0">Alle Werte liegen nur auf diesem Handy (${weeks.length} ${weeks.length === 1 ? "Woche" : "Wochen"} gespeichert). Wenn Browserdaten gelöscht werden, sind sie weg – exportiere deshalb ab und zu eine Sicherung.</p>
        <button class="btn btn-secondary" id="export">Sicherung exportieren</button>
        <button class="btn btn-ghost" id="import">Sicherung importieren</button>
        <input type="file" id="file" accept="application/json,.json" hidden>
      </div>
      <p class="muted center small">Kompressor-Kontrolle v${APP_VERSION} · Daten werden nicht übertragen</p>
    </main>`;
  app.querySelector("#name").addEventListener("input", e => { s.name = e.target.value.trim(); saveSettings(s); });
  const sigPad = setupPad(app.querySelector("#pad"), s.sig || null);
  sigPad.resize();
  const sigState = app.querySelector("#sigstate");
  on("#sigsave", () => {
    if (sigPad.isEmpty()) { toast("Bitte zuerst unterschreiben"); return; }
    s.sig = sigPad.toDataURL(); saveSettings(s);
    sigState.textContent = "Gespeichert – wird bei der Unterzeichnung automatisch eingesetzt.";
    toast("Unterschrift gespeichert ✓");
  });
  on("#sighelp", () => dialog({
    title: "Gespeicherte Unterschrift",
    html: `<p>Einmal unterschreiben und „Speichern“ tippen. Bei der Unterzeichnung ist sie vorausgefüllt.</p>
      <p>Neu zeichnen ersetzt sie für diesen Tag. Bereits unterzeichnete Tage bleiben unverändert.<br>„Löschen“ entfernt die gespeicherte Unterschrift.</p>`,
    buttons: [{ label: "Verstanden", cls: "btn-primary", value: null }],
  }));
  on("#sigdel", () => {
    sigPad.clear(); delete s.sig; saveSettings(s);
    sigState.textContent = "Noch keine Unterschrift gespeichert.";
    toast("Gespeicherte Unterschrift gelöscht");
  });
  app.querySelectorAll("#theme button").forEach(b => b.addEventListener("click", () => {
    s.theme = b.dataset.t; saveSettings(s); applyTheme();
    app.querySelectorAll("#theme button").forEach(x => x.classList.toggle("on", x === b));
  }));
  on("#home", () => go("home"));
  on("#export", () => {
    const data = { app: "kompressor-kontrolle", version: APP_VERSION, exported: new Date().toISOString(), settings: s, weeks: {} };
    for (const k of allWeekKeys()) data.weeks[k] = JSON.parse(localStorage.getItem(k));
    const blob = new Blob([JSON.stringify(data, null, 1)], { type: "application/json" });
    download(blob, `Kompressor-Sicherung_${new Date().toISOString().slice(0, 10)}.json`);
  });
  const file = app.querySelector("#file");
  on("#import", () => file.click());
  file.addEventListener("change", async () => {
    const f = file.files[0]; if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (data.app !== "kompressor-kontrolle" || !data.weeks) throw new Error("format");
      const n = Object.keys(data.weeks).length;
      const r = await dialog({ title: "Sicherung importieren?", text: `${n} ${n === 1 ? "Woche" : "Wochen"} gefunden. Vorhandene Wochen mit gleicher KW werden überschrieben.`,
        buttons: [{ label: "Importieren", cls: "btn-primary", value: "ok" }, { label: "Abbrechen", cls: "btn-ghost", value: null }] });
      if (r !== "ok") return;
      for (const [k, v] of Object.entries(data.weeks)) if (k.startsWith("kk.week.")) localStorage.setItem(k, JSON.stringify(v));
      toast("Sicherung importiert ✓"); render();
    } catch { toast("Datei ist keine gültige Sicherung"); }
  });
}

function download(blob, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

/* ================= PDF: Lückenprüfung ================= */
async function startPdf(wk) {
  const w = loadWeek(wk);
  const gaps = [];
  for (let d = 0; d < 5; d++) {
    if (isFuture(wk, d)) continue;
    for (const c of COMPRESSORS) {
      const m = missingItems(w, d, c).length;
      if (m) gaps.push({ d, c: c.id, text: `${c.id} – ${DAYS_LONG[d]}: ${m === visibleItems(c, d).length ? "nicht erfasst" : `${m} ${m === 1 ? "Wert fehlt" : "Werte fehlen"}`}` });
    }
    if (!daySigned(w, d)) gaps.push({ d, sign: true, text: `${DAYS_LONG[d]}: nicht unterzeichnet` });
  }
  if (gaps.length) {
    const r = await dialog({
      title: `KW ${wk.week}: ${gaps.length} ${gaps.length === 1 ? "Lücke" : "Lücken"}`,
      html: `<ul class="gaps">${gaps.slice(0, 12).map(g => `<li>${esc(g.text)}</li>`).join("")}${gaps.length > 12 ? `<li>… und ${gaps.length - 12} weitere</li>` : ""}</ul>`,
      buttons: [{ label: "Erste Lücke nachtragen", cls: "btn-primary", value: "fix" }, { label: "PDF trotzdem erstellen", cls: "btn-ghost", value: "go" }],
    });
    if (r === "fix") {
      const g = gaps[0];
      if (g.sign) go("sign", { wk, dayIdx: g.d }); else go("capture", { wk, dayIdx: g.d, compId: g.c });
      return;
    }
    if (r !== "go") return;
  }
  try {
    const blob = buildPdf(w, wk);
    const name = `Kompressoren_KW${String(wk.week).padStart(2, "0")}_${wk.year}.pdf`;
    const file = new File([blob], name, { type: "application/pdf" });
    const canShare = navigator.canShare && navigator.canShare({ files: [file] });
    const r = await dialog({ title: "PDF ist fertig", text: name,
      buttons: [{ label: "Herunterladen / speichern", cls: "btn-primary", value: "dl" }, ...(canShare ? [{ label: "Teilen …", cls: "btn-secondary", value: "share" }] : []), { label: "Schließen", cls: "btn-ghost", value: null }] });
    if (r === "dl") download(blob, name);
    if (r === "share") navigator.share({ files: [file], title: name }).catch(() => {});
  } catch (e) {
    console.error(e);
    toast("PDF konnte nicht erstellt werden");
  }
}

/* ================= Start ================= */
if ("scrollRestoration" in history) history.scrollRestoration = "manual";
history.replaceState({ ...state }, "");
render();
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
let swReg = null;
if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
  // Beim Öffnen nach einer neuen Version suchen (ohne Browser-Zwischenspeicher)
  navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).then(r => { swReg = r; r.update().catch(() => {}); }).catch(() => {});
  // Neue Version ist fertig geladen: auf Übersichtsseiten direkt neu laden,
  // während einer Eingabe nicht stören – dann ist sie beim nächsten Öffnen aktiv.
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController || reloaded) return;
    if (["home", "week", "settings"].includes(state.view)) { reloaded = true; location.reload(); }
    else toast("Update geladen – aktiv beim nächsten Öffnen");
  });
}
// Bei Rückkehr in die App (z. B. am nächsten Tag) Startseite aktualisieren und nach Updates schauen
document.addEventListener("visibilitychange", () => {
  if (document.hidden) return;
  if (state.view === "home") render();
  if (swReg) swReg.update().catch(() => {});
});
