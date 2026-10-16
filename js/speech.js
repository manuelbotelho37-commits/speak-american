// Voix (synthèse vocale du navigateur, gratuite) et reconnaissance vocale (Web Speech API, gratuite)
import { get } from "./store.js";
import { CHARACTERS } from "./content.js";

const synth = window.speechSynthesis;
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
export const isAndroid = /Android/i.test(navigator.userAgent);

export const support = {
  tts: !!synth,
  stt: !!SR,
  record: !!(navigator.mediaDevices?.getUserMedia && window.MediaRecorder),
};

let voices = [];
function loadVoices() { voices = synth ? synth.getVoices() : []; }
if (synth) { loadVoices(); synth.addEventListener?.("voiceschanged", loadVoices); }
export const voicesReady = () => new Promise(res => {
  if (!synth) return res([]);
  if (voices.length) return res(voices);
  let done = false;
  const finish = () => { if (!done) { done = true; loadVoices(); res(voices); } };
  synth.addEventListener?.("voiceschanged", finish, { once: true });
  setTimeout(finish, 1500);
});

const MALE = /(guy|andrew|brian|christopher|eric|roger|steffan|davis|tony|jason|ryan|aaron|alex|fred|daniel|tom|male|man\b)/i;
const FEMALE = /(aria|jenny|ava|emma|michelle|ana\b|samantha|allison|susan|zira|female|woman|jane|nancy|sara|amber|ashley|cora|elizabeth|monica|google us english)/i;

export function usVoices() {
  const us = voices.filter(v => /^en[-_]US/i.test(v.lang));
  const score = v => (/(natural|neural|online)/i.test(v.name) ? 10 : 0) + (/google/i.test(v.name) ? 4 : 0) + (v.localService ? 0 : 1);
  return us.sort((a, b) => score(b) - score(a));
}

// Choisit une voix cohérente pour chaque personnage (réglable dans Réglages)
export function voiceFor(charId = "alex") {
  const s = get().settings;
  const list = usVoices();
  if (!list.length) return null;
  const chosen = s.charVoices?.[charId] || (charId === "alex" ? s.voiceURI : "");
  if (chosen) { const v = list.find(x => x.voiceURI === chosen); if (v) return v; }
  const g = CHARACTERS[charId]?.gender || "m";
  const pool = list.filter(v => (g === "m" ? MALE : FEMALE).test(v.name));
  const ids = Object.keys(CHARACTERS).filter(k => (CHARACTERS[k].gender) === g);
  const idx = Math.max(0, ids.indexOf(charId));
  const src = pool.length ? pool : list;
  return src[idx % src.length];
}

let speakingToken = 0;
export const isSpeaking = () => synth?.speaking;

// Lit un texte en anglais américain. Découpe en phrases (évite la coupure de Chrome sur les longs textes).
export function speak(text, { rate, charId = "alex", onend, onstart } = {}) {
  return new Promise(resolve => {
    if (!synth || !text) { onend?.(); return resolve(false); }
    stopSpeaking();
    const token = ++speakingToken;
    const s = get().settings;
    // rate = multiplicateur (1 = normal, 0.6 = lent) appliqué à la vitesse choisie par l'utilisateur
    const r = Math.max(0.3, Math.min(2, (rate ?? 1) * (s.speed ?? 0.8)));
    const v = voiceFor(charId);
    const parts = String(text).replace(/\s+/g, " ").match(/[^.!?…]+[.!?…]*\s*/g) || [text];
    let i = 0;
    const next = () => {
      if (token !== speakingToken) return resolve(false);
      if (i >= parts.length) { onend?.(); return resolve(true); }
      const u = new SpeechSynthesisUtterance(parts[i++].trim());
      u.lang = "en-US";
      if (v) u.voice = v;
      u.rate = r;
      // si aucune voix différente n'existe, on varie légèrement la hauteur selon le personnage
      u.pitch = CHARACTERS[charId]?.pitch || 1;
      if (i === 1) u.onstart = () => onstart?.();
      u.onend = next;
      u.onerror = (e) => { if (e.error === "interrupted" || e.error === "canceled") return resolve(false); next(); };
      synth.speak(u);
    };
    // Chrome : petite pause après cancel() sinon la première phrase peut être ignorée
    setTimeout(next, 60);
  });
}
export function stopSpeaking() { speakingToken++; try { synth?.cancel(); } catch {} }

// ---------- Reconnaissance vocale ----------
// listen() : écoute une réponse et renvoie le texte final. Attend un silence (réglable) avant de conclure.
export function listen({ onInterim, onStart, silenceMs, maxMs = 30000, lang = "en-US" } = {}) {
  let rec;
  let resolveFn, rejectFn;
  const p = new Promise((res, rej) => { resolveFn = res; rejectFn = rej; });
  if (!SR) { rejectFn(Object.assign(new Error("Reconnaissance vocale non disponible"), { code: "unsupported" })); return { promise: p, stop() {} }; }
  const wait = silenceMs ?? get().settings.silenceMs ?? 2200;
  rec = new SR();
  rec.lang = lang;
  rec.interimResults = true;
  rec.maxAlternatives = 3;
  // Sur Android, le mode continu duplique les résultats : on utilise le mode simple
  rec.continuous = !isAndroid;
  let finalText = "", interim = "", alts = [], silenceTimer = null, ended = false, gotSpeech = false;
  const hardTimer = setTimeout(() => stop(), maxMs);
  const finish = () => {
    if (ended) return; ended = true;
    clearTimeout(silenceTimer); clearTimeout(hardTimer);
    const text = (finalText + " " + interim).replace(/\s+/g, " ").trim();
    resolveFn({ text, alternatives: alts });
  };
  const stop = () => { try { rec.stop(); } catch { finish(); } setTimeout(finish, 800); };
  rec.onstart = () => onStart?.();
  rec.onresult = (e) => {
    gotSpeech = true;
    let fin = "", int = "";
    alts = [];
    for (let i = 0; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) { fin += r[0].transcript + " "; for (let j = 0; j < r.length; j++) alts.push(r[j].transcript.trim()); }
      else int += r[0].transcript + " ";
    }
    finalText = fin.trim(); interim = int.trim();
    onInterim?.((finalText + " " + interim).trim());
    clearTimeout(silenceTimer);
    if (rec.continuous) silenceTimer = setTimeout(stop, wait);
  };
  rec.onerror = (e) => {
    clearTimeout(hardTimer);
    if (e.error === "no-speech" || e.error === "aborted") { if (!ended) { ended = true; resolveFn({ text: (finalText + " " + interim).trim(), alternatives: alts, noSpeech: !gotSpeech }); } return; }
    if (!ended) { ended = true; rejectFn(Object.assign(new Error(e.error), { code: e.error })); }
  };
  rec.onend = () => finish();
  try { rec.start(); } catch (err) { rejectFn(Object.assign(new Error(String(err)), { code: "start-failed" })); }
  return { promise: p, stop, abort: () => { try { rec.abort(); } catch {} finish(); } };
}

export function sttErrorFr(code) {
  return ({
    "not-allowed": "Le micro est bloqué. Autorisez le micro pour ce site (icône 🔒 à gauche de l'adresse), puis réessayez.",
    "service-not-allowed": "La reconnaissance vocale est bloquée par le navigateur. Utilisez Google Chrome ou Microsoft Edge.",
    "audio-capture": "Aucun micro détecté. Vérifiez qu'un micro est branché et autorisé.",
    "network": "La reconnaissance vocale a besoin d'Internet. Vérifiez votre connexion.",
    "unsupported": "Ce navigateur ne reconnaît pas la voix. Utilisez Google Chrome ou Microsoft Edge, ou écrivez votre réponse au clavier.",
    "language-not-supported": "L'anglais américain n'est pas disponible pour la reconnaissance sur cet appareil.",
  })[code] || "La reconnaissance vocale n'a pas fonctionné. Réessayez, ou écrivez votre réponse.";
}

// ---------- Comparaison honnête : quels mots le navigateur a-t-il reconnus ? ----------
const norm = s => s.toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim();
const EXPAND = { "i'm": "i am", "it's": "it is", "don't": "do not", "what's": "what is", "you're": "you are", "that's": "that is", "i'd": "i would", "can't": "cannot", "let's": "let us", "where's": "where is" };
const expand = s => norm(s).split(" ").map(w => EXPAND[w] || w).join(" ").split(" ").filter(Boolean);

export function compareWords(target, heardList) {
  const t = expand(target);
  let best = null;
  for (const heard of heardList.filter(Boolean)) {
    const h = expand(heard);
    const pool = [...h];
    const words = t.map(w => { const i = pool.indexOf(w); if (i >= 0) { pool.splice(i, 1); return { w, ok: true }; } return { w, ok: false }; });
    const ok = words.filter(x => x.ok).length;
    if (!best || ok > best.ok) best = { words, ok, total: t.length, heard };
  }
  return best || { words: t.map(w => ({ w, ok: false })), ok: 0, total: t.length, heard: "" };
}

// ---------- Enregistrement de la voix (reste dans la mémoire du navigateur, jamais envoyé) ----------
export async function recordVoice(maxMs = 8000) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  const mr = new MediaRecorder(stream);
  const chunks = [];
  mr.ondataavailable = e => e.data.size && chunks.push(e.data);
  let resolveFn;
  const done = new Promise(res => { resolveFn = res; });
  mr.onstop = () => {
    stream.getTracks().forEach(t => t.stop());
    const blob = new Blob(chunks, { type: mr.mimeType || "audio/webm" });
    resolveFn(blob.size ? URL.createObjectURL(blob) : null);
  };
  mr.start();
  const timer = setTimeout(() => mr.state !== "inactive" && mr.stop(), maxMs);
  return { done, stop: () => { clearTimeout(timer); if (mr.state !== "inactive") mr.stop(); } };
}

export function playUrl(url) {
  return new Promise(res => { const a = new Audio(url); a.onended = () => res(true); a.onerror = () => res(false); a.play().catch(() => res(false)); });
}

export async function testMicrophone() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  stream.getTracks().forEach(t => t.stop());
  return true;
}
