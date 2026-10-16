// Studio de prononciation : écoute, répétition, enregistrement, comparaison honnête (sans fausse note)
import { h, btn, toast, listenBtns } from "./ui.js";
import { speak, stopSpeaking, listen, compareWords, recordVoice, playUrl, support, sttErrorFr } from "./speech.js";
import { logPron, setSkill } from "./store.js";
import { SOUNDS } from "./content.js";

export function soundCard(key) {
  const s = SOUNDS[key];
  if (!s) return null;
  return h("div", { class: "card sound-card" },
    h("div", { class: "eyebrow" }, "Son du jour"),
    h("h3", {}, s.name),
    h("p", {}, s.fr),
    h("p", { class: "tip" }, "💡 ", s.tip),
    s.pairs?.length ? h("div", { class: "pairs" }, h("div", { class: "muted small" }, "Écoutez la différence :"),
      s.pairs.map(([a, b]) => h("div", { class: "pair" },
        btn(`🔊 ${a}`, () => speak(a.replace(/\(.*\)|[↗↘]/g, ""), { rate: 0.75 }), "btn sm"),
        h("span", { class: "muted" }, "≠"),
        btn(`🔊 ${b}`, () => speak(b.replace(/\(.*\)|[↗↘]/g, ""), { rate: 0.75 }), "btn sm")))) : null);
}

// phrase : texte anglais ; opts : {sound, itemId, onResult}
export function pronStudio(phrase, opts = {}) {
  let recUrl = null, recorder = null;
  const result = h("div", { class: "pron-result", "aria-live": "polite" });
  const recState = h("div", { class: "muted small" });
  const shown = h("div", { class: "pron-phrase" }, phrase);

  async function check() {
    if (!support.stt) { result.replaceChildren(h("p", { class: "warn" }, sttErrorFr("unsupported"))); return; }
    stopSpeaking();
    result.replaceChildren(h("p", { class: "listening" }, "🎤 Je vous écoute… dites la phrase."));
    try {
      const r = listen({ silenceMs: 1600, maxMs: 15000 });
      const { text, alternatives, noSpeech } = await r.promise;
      if (!text) { result.replaceChildren(h("p", { class: "warn" }, noSpeech ? "Je n'ai rien entendu. Rapprochez-vous du micro et réessayez." : "Rien n'a été reconnu. Réessayez.")); return; }
      const cmp = compareWords(phrase, [text, ...(alternatives || [])]);
      logPron(opts.sound, cmp.total, cmp.ok);
      const all = cmp.ok === cmp.total;
      if (all && opts.itemId) setSkill(opts.itemId, "pronounced");
      result.replaceChildren(
        h("div", { class: "words" }, cmp.words.map(w => h("span", { class: w.ok ? "w ok" : "w ko" }, w.w))),
        h("p", {}, all ? "✅ Tous les mots ont été reconnus. Très bien !" : `${cmp.ok} mot(s) sur ${cmp.total} reconnu(s). Les mots en orange sont à retravailler : écoutez-les lentement et réessayez.`),
        h("p", { class: "muted small" }, "Le navigateur a compris : « ", cmp.heard || text, " »"),
        h("p", { class: "muted small" }, "ℹ️ Ce n'est pas une note de prononciation : c'est ce que la reconnaissance vocale a compris. Une analyse phonétique fiable n'est pas disponible gratuitement."));
      opts.onResult?.(cmp);
    } catch (e) {
      result.replaceChildren(h("p", { class: "warn" }, sttErrorFr(e.code)));
    }
  }

  async function record() {
    if (!support.record) { toast("L'enregistrement n'est pas disponible sur ce navigateur."); return; }
    if (recorder) { recorder.stop(); return; }
    stopSpeaking();
    try {
      recorder = await recordVoice(10000);
      recBtn.textContent = "⏹ Arrêter";
      recState.textContent = "⏺ Enregistrement en cours… dites la phrase puis appuyez sur Arrêter.";
      const url = await recorder.done;
      recorder = null;
      recBtn.textContent = "⏺ M'enregistrer";
      if (recUrl) URL.revokeObjectURL(recUrl);
      recUrl = url;
      recState.textContent = url ? "✔ Enregistré (gardé seulement pendant cet exercice, jamais envoyé)." : "Enregistrement vide.";
      [playBtn, cmpBtn].forEach(b => b.disabled = !url);
    } catch (e) {
      recorder = null; recBtn.textContent = "⏺ M'enregistrer";
      recState.textContent = e.name === "NotAllowedError" ? "Le micro est refusé. Autorisez-le dans le navigateur (icône 🔒 près de l'adresse)." : "Impossible d'utiliser le micro.";
    }
  }

  const recBtn = btn("⏺ M'enregistrer", record, "btn");
  const playBtn = btn("▶️ Réécouter ma voix", () => recUrl && playUrl(recUrl), "btn", { disabled: true });
  const cmpBtn = btn("⚖️ Comparer", async () => { await speak(phrase, { rate: 0.9 }); await new Promise(r => setTimeout(r, 400)); if (recUrl) await playUrl(recUrl); }, "btn", { disabled: true });

  // Répétition par petits groupes de mots
  const words = phrase.split(/\s+/);
  const groups = [];
  for (let i = 0; i < words.length; i += 3) groups.push(words.slice(i, i + 3).join(" "));
  const chunkBox = h("div", { class: "chunks" });
  if (groups.length > 1) {
    chunkBox.append(h("div", { class: "muted small" }, "Par petits groupes :"), ...groups.map((g, i) => btn(`🔊 ${g}`, () => speak(groups.slice(0, i + 1).join(" "), { rate: 0.8 }), "btn sm ghost")));
  }

  async function shadow() {
    // Shadowing : la voix américaine dit la phrase, puis vous répétez immédiatement en imitant le rythme
    await speak(phrase, { rate: 0.9 });
    await check();
  }

  const el = h("div", { class: "card studio" },
    h("div", { class: "eyebrow" }, "Phrase à prononcer"), shown,
    h("div", { class: "row wrap" },
      btn("🔊 Écouter", () => speak(phrase), "btn primary"),
      btn("🐢 Écouter lentement", () => speak(phrase, { rate: 0.6 }), "btn"),
      btn("🔁 Répéter après la voix", shadow, "btn"),
      btn("🎤 Vérifier ma phrase", check, "btn")),
    h("div", { class: "row wrap" }, recBtn, playBtn, cmpBtn, btn("↺ Recommencer", () => { result.replaceChildren(); recState.textContent = ""; }, "btn ghost")),
    recState, chunkBox, result);
  el.cleanup = () => { if (recUrl) URL.revokeObjectURL(recUrl); recorder?.stop(); };
  return el;
}

export { listenBtns };
