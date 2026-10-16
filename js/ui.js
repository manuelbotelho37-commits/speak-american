// Petits outils d'interface (sans framework)
import { speak, stopSpeaking } from "./speech.js";
import { get } from "./store.js";
import { VOCAB, VOCAB_BY_ID } from "./content.js";
import { PROGRAM } from "./program.js";

export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === "html") el.innerHTML = v;
    else if (v === true) el.setAttribute(k, "");
    else el.setAttribute(k, v);
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export const btn = (label, onClick, cls = "btn", extra = {}) => h("button", { class: cls, type: "button", onClick, ...extra }, label);

export function toast(msg, ms = 3200) {
  const t = h("div", { class: "toast", role: "status" }, msg);
  document.body.append(t);
  requestAnimationFrame(() => t.classList.add("show"));
  setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 400); }, ms);
}

export function modal(title, body, actions = []) {
  const onKey = (e) => { if (e.key === "Escape") close(); };
  const close = () => { stopSpeaking(); wrap.remove(); document.removeEventListener("keydown", onKey); };
  document.addEventListener("keydown", onKey);
  const wrap = h("div", { class: "modal-wrap", onClick: (e) => { if (e.target === wrap) close(); } },
    h("div", { class: "modal", role: "dialog", "aria-modal": "true", "aria-label": title },
      h("div", { class: "modal-head" }, h("h2", {}, title), btn("✕", close, "icon-btn", { "aria-label": "Fermer" })),
      h("div", { class: "modal-body" }, body),
      actions.length ? h("div", { class: "modal-actions" }, actions.map(a => btn(a.label, () => { if (a.onClick?.() !== false) close(); }, a.cls || "btn"))) : null));
  document.body.append(wrap);
  return { close, el: wrap };
}

export function confirmBox(title, text, okLabel = "Confirmer", danger = false) {
  return new Promise(res => {
    modal(title, h("p", {}, text), [
      { label: "Annuler", cls: "btn ghost", onClick: () => res(false) },
      { label: okLabel, cls: danger ? "btn danger" : "btn primary", onClick: () => res(true) },
    ]);
  });
}

// Boutons d'écoute réutilisables
export function listenBtns(text, charId = "alex", { slow = true, small = false } = {}) {
  const cls = small ? "btn sm" : "btn";
  return h("span", { class: "listen-btns" },
    btn("🔊 Écouter", () => speak(text, { charId }), cls, { "aria-label": `Écouter : ${text}` }),
    slow ? btn("🐢 Lentement", () => speak(text, { charId, rate: 0.65 }), cls + " ghost", { "aria-label": "Écouter lentement" }) : null);
}
export const speakIcon = (text, charId = "alex") => btn("🔊", (e) => { e.stopPropagation(); speak(text, { charId }); }, "icon-btn", { "aria-label": `Écouter ${text}`, title: "Écouter" });

export const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
export const pct = (a, b) => (b ? Math.round((100 * a) / b) : 0);
export const fmtMin = (sec) => { const m = Math.round(sec / 60); return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}`; };
export const personalize = (s) => String(s || "").replaceAll("{name}", get().profile.name || "Manu");

// ---------- Accès aux mots (intégrés + générés par l'IA) ----------
export function itemById(id) {
  if (VOCAB_BY_ID[id]) return VOCAB_BY_ID[id];
  const m = /^g(\d+)_(\d+)$/.exec(id);
  if (m) { const it = get().generated[m[1]]?.[Number(m[2]) - 1]; if (it) return { ...it, id, day: Number(m[1]), generated: true }; }
  return null;
}
export function itemsForDay(day) {
  const built = VOCAB.filter(v => v.day === day);
  if (built.length) return built;
  const gen = get().generated[day];
  return gen ? gen.map((it, i) => ({ ...it, id: `g${day}_${i + 1}`, day, generated: true })) : [];
}
export function allItemsUpTo(day) {
  const out = [];
  for (let d = 1; d <= day; d++) out.push(...itemsForDay(d));
  return out;
}
export function knownItems() {
  const st = get();
  return Object.keys(st.cards).filter(id => st.cards[id].skills?.discovered).map(itemById).filter(Boolean);
}
export const needsContent = (day) => !PROGRAM[day - 1].review && itemsForDay(day).length === 0;
