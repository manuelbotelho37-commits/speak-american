// Client de l'IA : parle UNIQUEMENT à notre serveur relais (/api/alex). Aucune clé API dans le navigateur.
import { get, update } from "./store.js";

export let aiStatus = { state: "unknown", detail: "" }; // unknown | ok | off | badcode | error
const statusListeners = new Set();
export const onAiStatus = fn => (statusListeners.add(fn), () => statusListeners.delete(fn));
function setStatus(state, detail = "") { aiStatus = { state, detail }; statusListeners.forEach(f => f(aiStatus)); }

const ERR_FR = {
  badcode: "Le code d'accès est incorrect. Vérifiez-le dans Réglages → Alex (IA).",
  not_configured: "Le serveur d'Alex n'est pas encore configuré (clé gratuite manquante). Suivez l'étape 3 du guide d'installation.",
  quota: "La limite gratuite du service d'IA est atteinte pour le moment. Réessayez dans une minute (ou demain si c'est la limite du jour).",
  provider: "Le service d'IA ne répond pas correctement pour le moment. Réessayez dans un instant.",
  network: "Impossible de joindre Alex. Vérifiez votre connexion Internet.",
  offline: "Vous êtes hors ligne. Les dialogues guidés, le vocabulaire et les révisions fonctionnent sans Internet.",
  timeout: "Alex met trop de temps à répondre. Réessayez.",
  invalid: "La réponse de l'IA était incomplète. Réessayez.",
};
export const aiErrorFr = (code) => ERR_FR[code] || ERR_FR.provider;

async function post(body, { timeout = 30000 } = {}) {
  const s = get().settings;
  if (!navigator.onLine) throw Object.assign(new Error("offline"), { code: "offline" });
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  let res;
  try {
    res = await fetch(s.aiUrl || "/api/alex", {
      method: "POST",
      headers: { "content-type": "application/json", "x-access-code": s.accessCode || "" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
  } catch (e) {
    throw Object.assign(new Error("network"), { code: e.name === "AbortError" ? "timeout" : "network" });
  } finally { clearTimeout(t); }
  let data = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) {
    const code = data?.error || (res.status === 401 ? "badcode" : res.status === 404 ? "not_configured" : "provider");
    if (code === "badcode") setStatus("badcode"); else if (code === "not_configured") setStatus("off"); else setStatus("error", code);
    throw Object.assign(new Error(code), { code });
  }
  setStatus("ok");
  return data;
}

export async function checkAi() {
  const s = get().settings;
  try {
    const res = await fetch((s.aiUrl || "/api/alex") + "?check=1", { headers: { "x-access-code": s.accessCode || "" } });
    const data = await res.json().catch(() => null);
    if (res.status === 401) return setStatus("badcode"), aiStatus;
    if (!res.ok || !data) return setStatus("off", res.status === 404 ? "Serveur absent (site hébergé sans la fonction Netlify ?)" : ""), aiStatus;
    if (!data.configured) return setStatus("off", "Clé gratuite non configurée sur le serveur"), aiStatus;
    setStatus("ok", data.provider || "");
  } catch { setStatus(navigator.onLine ? "off" : "error", navigator.onLine ? "Serveur injoignable" : "Hors ligne"); }
  return aiStatus;
}

function learnerContext() {
  const st = get();
  const known = Object.entries(st.cards).filter(([, c]) => c.skills?.discovered).map(([id]) => id);
  const weak = Object.entries(st.cards).filter(([, c]) => c.difficult || c.lapses >= 2 || c.wrong > c.right).map(([id]) => id);
  return {
    name: st.profile.name || "",
    facts: st.profile.consentFacts ? st.profile.facts.slice(0, 12) : [],
    knownIds: known, weakIds: weak,
  };
}

// Tour de conversation. history : [{role:'user'|'assistant', text}]
export function chat({ character, situation, level, month, history, action, targetWords = [], mode = "chat" }) {
  const lc = learnerContext();
  return post({ mode, character, situation, level, month, action, history: history.slice(-24), targetWords: targetWords.slice(0, 12), learner: { name: lc.name, facts: lc.facts } });
}

export function summarize({ character, situation, level, history }) {
  return post({ mode: "summary", character, situation, level, history: history.slice(-40) }, { timeout: 40000 });
}

export function mnemonic(item) {
  return post({ mode: "mnemonic", item: { en: item.en, fr: item.fr } });
}

export function generateDay(day, title, objective, month, avoid) {
  return post({ mode: "generate_day", day, title, objective, month, avoid: avoid.slice(-150) }, { timeout: 45000 });
}

export function rememberFact(fact) {
  update(s => { if (s.profile.consentFacts && fact && !s.profile.facts.includes(fact)) s.profile.facts = [...s.profile.facts, fact].slice(-12); });
}
