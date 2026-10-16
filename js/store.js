// Sauvegarde locale (localStorage) — versionnée, jamais effacée par une mise à jour.
import { newCard, review, isDue, isMastered } from "./srs.js";

const KEY = "speak-american:v1";
const BACKUP_KEY = "speak-american:backup";
export const SCHEMA = 1;

const today = () => new Date().toLocaleDateString("sv-SE"); // AAAA-MM-JJ local
export const todayKey = today;

function defaults() {
  return {
    schema: SCHEMA,
    createdAt: Date.now(),
    profile: { name: "", placementDone: false, placement: null, level: null, consentFacts: false, facts: [] },
    settings: {
      duration: 30, theme: "dark", rate: 0.95, voiceURI: "", charVoices: {},
      aiUrl: "/api/alex", accessCode: "", immersion: "debutant", handsFree: true, silenceMs: 2200,
      showIPA: false, newPerSession: 5, fontScale: 1,
    },
    program: { days: {}, last: null },  // days[n] = {steps:{revision,new,conv,pron,test}, done, completedAt}
    cards: {},       // id -> carte FSRS + compétences
    generated: {},   // jour -> mots générés par l'IA (pour les jours sans contenu intégré)
    log: {},         // date -> {minutes, reviews, correct, convSec, newWords, listenOk, listenTotal}
    pron: {},        // son -> {attempts, matched, words, wordsOk}
    confusions: {},  // "idA>idB" -> nb (choisi B au lieu de A)
    errors: [],      // corrections de l'IA {date, original, better, explanation}
    evaluations: [], // résultats des évaluations mensuelles
    conversation: null, // conversation en cours (survit à la rotation et au rechargement)
    challenges: {},
  };
}

let state = load();
const listeners = new Set();

function deepMerge(base, data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return data ?? base;
  const out = { ...base };
  for (const k of Object.keys(data)) {
    out[k] = base && typeof base[k] === "object" && base[k] !== null && !Array.isArray(base[k]) ? deepMerge(base[k], data[k]) : data[k];
  }
  return out;
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return migrate(JSON.parse(raw));
    const bak = localStorage.getItem(BACKUP_KEY);
    if (bak) return migrate(JSON.parse(bak));
  } catch (e) { console.warn("Lecture de la sauvegarde impossible", e); }
  return defaults();
}

// Les migrations AJOUTENT des champs, elles ne suppriment jamais de progrès.
function migrate(data) {
  const merged = deepMerge(defaults(), data);
  merged.schema = SCHEMA;
  return merged;
}

let saveTimer = null;
export function save(now = false) {
  clearTimeout(saveTimer);
  const doSave = () => {
    try {
      const raw = JSON.stringify(state);
      localStorage.setItem(KEY, raw);
      // copie de secours une fois par jour
      const bakDay = localStorage.getItem(BACKUP_KEY + ":day");
      if (bakDay !== today()) { localStorage.setItem(BACKUP_KEY, raw); localStorage.setItem(BACKUP_KEY + ":day", today()); }
    } catch (e) { console.error("Sauvegarde impossible", e); }
  };
  if (now) doSave(); else saveTimer = setTimeout(doSave, 250);
}
window.addEventListener("pagehide", () => save(true));
// Si l'application est ouverte dans deux onglets, on reprend les données les plus récentes
window.addEventListener("storage", (e) => {
  if (e.key === KEY && e.newValue) { try { state = migrate(JSON.parse(e.newValue)); listeners.forEach(l => l(state)); } catch {} }
});
document.addEventListener("visibilitychange", () => { if (document.hidden) save(true); });

export const get = () => state;
export function update(fn) { fn(state); save(); listeners.forEach(l => l(state)); }
export const subscribe = (fn) => (listeners.add(fn), () => listeners.delete(fn));

// ---------- Journal d'activité (statistiques réelles) ----------
export function logToday(fn) {
  update(s => {
    const k = today();
    s.log[k] = s.log[k] || { minutes: 0, reviews: 0, correct: 0, convSec: 0, newWords: 0, listenOk: 0, listenTotal: 0, pronAttempts: 0 };
    fn(s.log[k]);
  });
}

// temps d'utilisation actif (compté par minute quand l'app est visible et utilisée)
let lastActivity = Date.now();
["pointerdown", "keydown"].forEach(ev => window.addEventListener(ev, () => { lastActivity = Date.now(); }, { passive: true }));
setInterval(() => {
  if (!document.hidden && Date.now() - lastActivity < 120000 && state.profile.placementDone) logToday(l => { l.minutes += 1; });
}, 60000);
export const markActive = () => { lastActivity = Date.now(); };

// ---------- Cartes et compétences ----------
export const SKILLS = [
  ["discovered", "Découvert"],
  ["listening", "Reconnu à l'écoute"],
  ["understood", "Compris"],
  ["pronounced", "Prononcé correctement"],
  ["usedHelp", "Utilisé avec aide"],
  ["usedSpont", "Utilisé spontanément"],
];

export function card(id) {
  if (!state.cards[id]) state.cards[id] = { ...newCard(), skills: {}, wrong: 0, right: 0 };
  return state.cards[id];
}

export function setSkill(id, skill, val = true) {
  update(() => { const c = card(id); c.skills[skill] = val ? (c.skills[skill] || Date.now()) : 0; });
}

// Enregistre une réponse : met à jour FSRS + compteurs. grade 1..4
export function answer(id, grade, skill) {
  update(s => {
    const c = card(id);
    const updated = review(c, grade);
    Object.assign(c, updated);
    if (grade >= 3) c.right = (c.right || 0) + 1; else if (grade === 1) c.wrong = (c.wrong || 0) + 1;
    if (skill && grade >= 3) c.skills[skill] = c.skills[skill] || Date.now();
    c.skills.discovered = c.skills.discovered || Date.now();
  });
  logToday(l => { l.reviews += 1; if (grade >= 3) l.correct += 1; });
}

export function discover(id) {
  let isNew = false;
  update(() => {
    const c = card(id);
    if (!c.skills.discovered) c.skills.discovered = Date.now();
    // premier rappel dès le lendemain : les mots nouveaux reviennent vite
    if (c.state === "new") { c.state = "learning"; c.S = 1; c.D = 5; c.last = Date.now(); c.due = Date.now() + 20 * 3600000; isNew = true; }
  });
  if (isNew) logToday(l => { l.newWords += 1; });
}

export function markDifficult(id, val = true) {
  update(() => {
    const c = card(id);
    c.difficult = val;
    if (val) { c.skills.discovered = c.skills.discovered || Date.now(); if (c.state === "new") { c.state = "learning"; c.S = 0.5; c.D = 7; c.last = Date.now(); } c.due = Date.now(); }
  });
}

export function masteryLevel(id) {
  const c = state.cards[id];
  if (!c || !c.skills?.discovered) return { n: 0, label: "Pas encore vu" };
  if (isMastered(c) && c.skills.usedSpont) return { n: 7, label: "Maîtrisé" };
  if (isMastered(c)) return { n: 6, label: "Bien retenu" };
  const order = ["usedSpont", "usedHelp", "pronounced", "understood", "listening"];
  const labels = { usedSpont: "Utilisé spontanément", usedHelp: "Utilisé avec aide", pronounced: "Prononcé", understood: "Compris", listening: "Reconnu à l'écoute" };
  const levels = { usedSpont: 5, usedHelp: 4, pronounced: 3, understood: 2, listening: 2 };
  for (const k of order) if (c.skills[k]) return { n: levels[k], label: labels[k] };
  return { n: 1, label: "Découvert" };
}

export const dueIds = (now = Date.now()) => Object.entries(state.cards).filter(([, c]) => isDue(c, now)).sort((a, b) => (b[1].difficult - a[1].difficult) || (a[1].due - b[1].due)).map(([id]) => id);
export const masteredIds = () => Object.entries(state.cards).filter(([, c]) => isMastered(c)).map(([id]) => id);
export const studiedIds = () => Object.entries(state.cards).filter(([, c]) => c.skills?.discovered).map(([id]) => id);

// ---------- Programme ----------
export function currentDay() {
  for (let d = 1; d <= 120; d++) if (!state.program.days[d]?.done) return d;
  return 120;
}
export function dayState(n) {
  state.program.days[n] = state.program.days[n] || { steps: {}, done: false };
  return state.program.days[n];
}
export function setStep(n, step, done = true) {
  update(s => { const d = dayState(n); d.steps[step] = done; s.program.last = { day: n, step, at: Date.now() }; });
}
export function setLast(n, step, index = 0) {
  update(s => { s.program.last = { day: n, step, index, at: Date.now() }; });
}
export function completeDay(n) {
  update(() => { const d = dayState(n); d.done = true; d.completedAt = Date.now(); });
}

export function daysSinceLastActivity() {
  const keys = Object.keys(state.log).filter(k => state.log[k].minutes > 0 || state.log[k].reviews > 0).sort();
  if (!keys.length) return null;
  const last = new Date(keys[keys.length - 1] + "T12:00:00");
  const now = new Date(today() + "T12:00:00");
  return Math.round((now - last) / 86400000);
}

// ---------- Prononciation et confusions ----------
export function logPron(sound, words, wordsOk) {
  update(s => {
    const p = s.pron[sound || "general"] = s.pron[sound || "general"] || { attempts: 0, words: 0, wordsOk: 0 };
    p.attempts++; p.words += words; p.wordsOk += wordsOk;
  });
  logToday(l => { l.pronAttempts = (l.pronAttempts || 0) + 1; });
}
export function logConfusion(expectedId, chosenId) {
  update(s => { const k = `${expectedId}>${chosenId}`; s.confusions[k] = (s.confusions[k] || 0) + 1; });
}
export function logListening(ok) { logToday(l => { l.listenTotal++; if (ok) l.listenOk++; }); }
export function addError(e) {
  update(s => { s.errors.unshift({ date: Date.now(), ...e }); s.errors = s.errors.slice(0, 300); });
}

// ---------- Export / import / suppression ----------
export function exportData() {
  const blob = new Blob([JSON.stringify({ app: "speak-american", exportedAt: new Date().toISOString(), data: state }, null, 1)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `speak-american-sauvegarde-${today()}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
export async function importData(file) {
  const txt = await file.text();
  const obj = JSON.parse(txt);
  const data = obj && obj.app === "speak-american" ? obj.data : obj;
  if (!data || typeof data !== "object" || !data.program || !data.cards) throw new Error("Ce fichier n'est pas une sauvegarde SPEAK AMERICAN.");
  // garde une copie de l'état actuel avant de restaurer
  try { localStorage.setItem(KEY + ":before-import", JSON.stringify(state)); } catch {}
  state = migrate(data);
  save(true);
  listeners.forEach(l => l(state));
}
export function wipeAll() {
  localStorage.removeItem(KEY); localStorage.removeItem(BACKUP_KEY); localStorage.removeItem(BACKUP_KEY + ":day"); localStorage.removeItem(KEY + ":before-import");
  state = defaults(); save(true);
}

export async function requestPersistence() {
  try { if (navigator.storage?.persist) return await navigator.storage.persist(); } catch {}
  return false;
}
