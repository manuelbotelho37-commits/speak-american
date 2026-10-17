// Leçon quotidienne, révisions, vocabulaire, coach mémoire, jeux, écoute
import { h, btn, toast, modal, shuffle, pct, itemById, itemsForDay, allItemsUpTo, knownItems, needsContent, listenBtns, speakIcon } from "./ui.js";
import { speak, speakFr, stopSpeaking, listen, compareWords, support, sttErrorFr } from "./speech.js";
import { get, update, answer, discover, markDifficult, setSkill, setStep, setLast, completeDay, dayState, currentDay, dueIds, logConfusion, logListening, masteryLevel, SKILLS, card as getCard } from "./store.js";
import { PROGRAM, dayInfo } from "./program.js";
import { SOUNDS, GUIDED, CHARACTERS, SITUATIONS, VOCAB } from "./content.js";
import { conversationView } from "./talk.js";
import { pronStudio, soundCard } from "./pron.js";
import { aiStatus, checkAi, generateDay, mnemonic, aiErrorFr } from "./ai.js";
import { isMastered, daysUntil } from "./srs.js";

export const PLAN = {
  10: { rev: 6, newMax: 3, pron: 1, test: 4, goal: 3 },
  20: { rev: 10, newMax: 5, pron: 2, test: 5, goal: 4 },
  30: { rev: 15, newMax: 5, pron: 3, test: 6, goal: 6 },
  45: { rev: 25, newMax: 6, pron: 3, test: 8, goal: 10 },
};
export const STEPS = [
  ["revision", "Réviser mes expressions"],
  ["new", "Apprendre mes nouveaux mots"],
  ["conv", "Parler"],
  ["pron", "Travailler ma prononciation"],
  ["test", "Réussir mon petit test"],
];
const plan = () => PLAN[get().settings.duration] || PLAN[30];
const clean = (s) => s.replace(/[.…!?]/g, "").trim();

// ====================== Questions de quiz (réutilisées partout) ======================
function distractors(item, n, key = "fr") {
  const pool = allItemsUpTo(Math.max(currentDay(), 14)).concat(VOCAB).filter(x => x.id !== item.id && x[key] && x[key] !== item[key]);
  const uniq = [...new Map(pool.map(x => [x[key], x])).values()];
  return shuffle(uniq).slice(0, n);
}

export function makeQuestion(item, type) {
  if (type === "complete") {
    const re = new RegExp(clean(item.en).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    if (!item.ex || !re.test(item.ex)) type = "fr_to_en";
    else return { type, item, prompt: item.ex.replace(re, "_____"), choices: shuffle([item, ...distractors(item, 2, "en")]) };
  }
  if (type === "say_it" && !support.stt) type = "fr_to_en";
  if (type === "say_it") return { type, item };
  if (type === "meaning") { const d = distractors(item, 2, "exFr"); return { type, item, choices: shuffle([item, ...d]) }; }
  const key = type === "listen_choose" ? "fr" : "en";
  return { type, item, choices: shuffle([item, ...distractors(item, 2, key)]) };
}

const SKILL_OF = { listen_choose: "listening", fr_to_en: "understood", complete: "understood", meaning: "listening", say_it: "pronounced" };

// Affiche une question ; onDone(correct:boolean)
export function questionView(q, onDone, { grade = true } = {}) {
  const it = q.item;
  const fb = h("div", { class: "feedback", "aria-live": "polite" });
  let answered = false;
  const finish = (ok, chosen) => {
    if (answered) return; answered = true;
    if (grade) answer(it.id, ok ? 3 : 1, SKILL_OF[q.type]);
    if (q.type === "listen_choose" || q.type === "meaning") logListening(ok);
    if (!ok && chosen && chosen.id !== it.id) logConfusion(it.id, chosen.id);
    fb.replaceChildren(
      h("div", { class: ok ? "good" : "bad" }, ok ? "✅ Bravo !" : "❌ Pas tout à fait."),
      h("div", { class: "answer" }, h("b", {}, it.en), " ", speakIcon(it.en), " = ", it.fr),
      btn("Suivant ➜", () => onDone(ok), "btn primary"));
    speak(it.en, { rate: 0.9 });
  };
  const choiceBtns = (key) => h("div", { class: "choices" }, q.choices.map(c => {
    const b = btn(c[key], () => { [...b.parentNode.children].forEach(x => x.disabled = true); b.classList.add(c.id === it.id ? "right" : "wrong"); if (c.id !== it.id) [...b.parentNode.children].find(x => x.dataset.id === it.id)?.classList.add("right"); finish(c.id === it.id, c); }, "btn choice-btn", { "data-id": c.id });
    return b;
  }));
  let body;
  if (q.type === "listen_choose") {
    setTimeout(() => speak(it.en), 250);
    body = h("div", {}, h("div", { class: "q" }, "🎧 Écoutez et choisissez la traduction"), h("div", { class: "row" }, listenBtns(it.en)), choiceBtns("fr"));
  } else if (q.type === "meaning") {
    setTimeout(() => speak(it.ex), 250);
    body = h("div", {}, h("div", { class: "q" }, "🎧 Écoutez la phrase : que veut-elle dire ?"), h("div", { class: "row" }, listenBtns(it.ex)), choiceBtns("exFr"));
  } else if (q.type === "fr_to_en") {
    body = h("div", {}, h("div", { class: "q" }, "Comment dit-on en anglais :"), h("div", { class: "big-fr" }, it.fr), choiceBtns("en"));
  } else if (q.type === "complete") {
    body = h("div", {}, h("div", { class: "q" }, "Complétez la phrase :"), h("div", { class: "big-en" }, q.prompt), h("div", { class: "muted small" }, it.exFr), choiceBtns("en"));
  } else if (q.type === "say_it") {
    const st = h("div", { class: "muted" });
    const go = async () => {
      st.textContent = "🎤 Je vous écoute…";
      try {
        const r = await listen({ silenceMs: 1600 }).promise;
        const cmp = compareWords(it.en, [r.text, ...(r.alternatives || [])]);
        st.replaceChildren(h("div", { class: "words" }, cmp.words.map(w => h("span", { class: w.ok ? "w ok" : "w ko" }, w.w))), h("div", { class: "small" }, "Compris : « ", r.text || "rien", " »"));
        finish(cmp.total > 0 && cmp.ok / cmp.total >= 0.75);
      } catch (e) { st.textContent = sttErrorFr(e.code); }
    };
    body = h("div", {}, h("div", { class: "q" }, "Dites en anglais :"), h("div", { class: "big-fr" }, it.fr),
      h("div", { class: "row" }, btn("🎤 Je le dis", go, "btn primary"), btn("Je ne sais pas", () => finish(false), "btn ghost")), st);
  }
  return h("div", { class: "card question" }, body, fb);
}

// Suite de questions ; onEnd({ok, total})
export function quizRunner(questions, onEnd, opts = {}) {
  const wrap = h("div", {});
  let i = 0, ok = 0;
  const progress = h("div", { class: "progress-dots" });
  const show = () => {
    if (i >= questions.length) { onEnd({ ok, total: questions.length }); return; }
    progress.textContent = `Question ${i + 1} / ${questions.length}`;
    wrap.replaceChildren(progress, questionView(questions[i], (good) => { if (good) ok++; i++; show(); }, opts));
  };
  show();
  return wrap;
}

// ====================== Révision (flashcards + auto-évaluation) ======================
function cardReview(ids, onEnd) {
  const queue = ids.map(id => ({ id, n: 0 }));
  const wrap = h("div", {});
  let done = 0, good = 0;
  const next = () => {
    const cur = queue.shift();
    if (!cur) { onEnd({ done, good }); return; }
    const it = itemById(cur.id);
    if (!it) return next();
    const mode = (done % 2 === 0) ? "listen" : "recall";
    const reveal = h("div", { class: "reveal hidden" },
      h("div", { class: "big-en" }, it.en, " ", speakIcon(it.en)),
      h("div", { class: "ph" }, it.ph, get().settings.showIPA ? "  " + it.ipa : ""),
      h("div", { class: "big-fr" }, it.fr),
      it.tip ? h("div", { class: "tip small" }, "🧠 ", it.tip) : null,
      h("div", { class: "q small" }, "Comment ça s'est passé ?"),
      h("div", { class: "grades" }, [[1, "😣 Oublié"], [2, "😐 Difficile"], [3, "🙂 Bien"], [4, "😄 Facile"]].map(([g, l]) => btn(l, () => {
        answer(cur.id, g, mode === "listen" ? "listening" : "understood");
        done++; if (g >= 3) good++;
        if (g === 1 && cur.n < 1) queue.push({ id: cur.id, n: cur.n + 1 }); // revient en fin de séance
        next();
      }, "btn grade g" + g))));
    const showBtn = btn("👁 Voir la réponse", () => { reveal.classList.remove("hidden"); showBtn.remove(); if (mode === "recall") speak(it.en); }, "btn primary");
    const front = mode === "listen"
      ? h("div", {}, h("div", { class: "q" }, "🎧 Écoutez. Que veut dire cette expression ?"), listenBtns(it.en))
      : h("div", {}, h("div", { class: "q" }, "🧠 Retrouvez l'anglais (dites-le à voix haute) :"), h("div", { class: "big-fr" }, it.fr), it.emoji ? h("div", { class: "emoji-big" }, it.emoji) : null);
    if (mode === "listen") setTimeout(() => speak(it.en), 250);
    wrap.replaceChildren(h("div", { class: "progress-dots" }, `Carte ${done + 1} · encore ${queue.length} après celle-ci`), h("div", { class: "card flash" }, front, showBtn, reveal));
  };
  next();
  return wrap;
}

// ====================== Révision : orale (par défaut) ou cartes ======================
export function reviewSession(ids, onEnd) {
  const wrap = h("div", {});
  const oralOk = support.stt && support.tts;
  const draw = () => {
    const oral = oralOk && get().settings.reviewMode !== "cards";
    const sw = oralOk ? h("div", { class: "row wrap small" },
      h("span", { class: "muted" }, oral ? "Mode : 💬 je touche puis je dis la réponse" : "Mode : 🃏 cartes"),
      btn(oral ? "🃏 Passer en mode cartes" : "💬 Revenir au mode Sarah", () => { stopSpeaking(); update(s => { s.settings.reviewMode = oral ? "cards" : "oral"; }); draw(); }, "btn ghost sm")) : null;
    wrap.replaceChildren(...[oral ? null : sw, oral ? oralReview(ids, onEnd, () => { update(s => { s.settings.reviewMode = "cards"; }); draw(); }) : cardReview(ids, onEnd)].filter(Boolean));
  };
  draw();
  return wrap;
}

// Révision « Réponds à Sarah » : on touche la bonne réponse (vert / rouge), puis on la dit à voix haute.
// Entraînement libre quand rien n'est « à réviser » : les mots déjà vus (sinon ceux du programme jusqu'à aujourd'hui).
export function practiceIds(n = 8) {
  let ids = knownItems().map(i => i.id);
  if (ids.length < 4) ids = [...new Set(ids.concat(allItemsUpTo(Math.max(1, currentDay())).map(i => i.id)))];
  return shuffle(ids).slice(0, n);
}
let lessonFocus = false; // l'étape de leçon est déjà en plein écran
const PRAISE = ["Great job!", "Perfect!", "Excellent!", "Yes! Well done!", "That's right!"];
function oralReview(ids, onEnd, onCards) {
  const queue = ids.map(id => ({ id, n: 0 }));
  const own = !lessonFocus; // dans une leçon, c'est la leçon qui gère le plein écran
  const wrap = h("div", { class: "oral-review" + (own ? " focus" : "") });
  let done = 0, good = 0, points = 0, listener = null, token = 0;
  // Plein écran pendant l'exercice : rien d'autre autour
  if (own) document.body.classList.add("focus-on");
  const watch = setInterval(() => { if (!wrap.isConnected) { clearInterval(watch); if (own) document.body.classList.remove("focus-on"); stopAll(); } }, 800);
  const isAlive = () => wrap.isConnected;
  const stopAll = () => { token++; try { listener?.abort?.(); } catch {} listener = null; stopSpeaking(); };
  const pool = () => knownItems().concat(VOCAB);
  const lineOf = (it) => (Array.isArray(it.dlg) && it.dlg.length >= 2 && it.dlg[1]?.[1]) ? it.dlg[1][1] : null;

  const next = () => {
    stopAll();
    const cur = queue.shift();
    if (!cur) { clearInterval(watch); if (own) document.body.classList.remove("focus-on"); wrap.classList.remove("focus"); onEnd({ done, good, points }); return; }
    const it = itemById(cur.id);
    if (!it) return next();
    // Question : une réplique de Sarah (dialogue du mot) ou « Comment dit-on… ? »
    const dialog = lineOf(it) && it.dlg[0]?.[1] ? { q: it.dlg[0][1], qFr: it.dlg[0][2] || "", a: it.dlg[1][1], aFr: it.dlg[1][2] || "" } : null;
    const correct = dialog ? dialog.a : it.en;
    const others = shuffle(pool().filter(x => x.id !== it.id).map(x => dialog ? lineOf(x) : x.en).filter(t => t && t !== correct));
    const choices = shuffle([correct, ...[...new Set(others)].slice(0, 2)]);
    let answered = false, tappedOk = false, finished = false;

    const status = h("div", { class: "oral-status" });
    const heard = h("div", { class: "small muted" });
    const sayBox = h("div", { class: "say-box hidden" });
    const grade = (g) => { if (finished) return; finished = true; answer(cur.id, g, g >= 3 ? "usedSpont" : null); done++; if (g >= 3) good++; if (g === 1 && cur.n < 1) queue.push({ id: cur.id, n: cur.n + 1 }); };
    const ptsEl = h("span", { class: "pts" }, `⭐ ${points} pts`);
    const addPts = (n) => { points += n; ptsEl.textContent = `⭐ ${points} pts`; };

    const optBtns = choices.map(c => btn(h("span", {}, "💬 ", c), () => pick(c, optBtns[choices.indexOf(c)]), "btn opt-btn"));
    const pick = async (c, el) => {
      if (answered) return; answered = true;
      tappedOk = c === correct;
      optBtns.forEach((b, i) => { b.disabled = true; if (choices[i] === correct) b.classList.add("ok"); });
      if (!tappedOk) el.classList.add("ko");
      if (tappedOk) addPts(10);
      status.textContent = tappedOk ? "✅ Bonne réponse !" : "❌ Ce n'est pas ça. La bonne réponse est en vert.";
      stopAll(); const my = ++token;
      sayBox.classList.remove("hidden");
      sayBox.replaceChildren(
        h("div", { class: "q" }, "🗣 Maintenant, dites-la à voix haute :"),
        h("div", { class: "big-en" }, correct, " ", speakIcon(correct)),
        h("div", { class: "small muted" }, dialog ? dialog.aFr : it.fr),
        support.stt ? micBtn : null, heard,
        h("div", { class: "row wrap" }, btn("⏭ Question suivante", () => { grade(tappedOk ? 3 : 1); next(); }, "btn")));
      await speak(correct, { rate: 0.85 });
      if (support.stt && my === token && isAlive()) setTimeout(() => { if (my === token && isAlive()) hear(); }, 250);
    };
    const hear = async () => {
      stopAll(); const my = ++token;
      micBtn.classList.add("listening"); heard.textContent = "🎤 Je vous écoute…";
      let r;
      try { listener = listen({ onInterim: t => { heard.textContent = "« " + t + " »"; } }); r = await listener.promise; }
      catch (e) { heard.textContent = sttErrorFr(e.code); micBtn.classList.remove("listening"); return; }
      finally { listener = null; }
      micBtn.classList.remove("listening");
      if (my !== token || !isAlive()) return;
      if (!r?.text) { heard.textContent = "⏸ Je vous attends : appuyez sur 🎤 quand vous êtes prêt."; return; }
      const c = compareWords(correct, [r.text, ...(r.alternatives || [])]);
      if (c.total && c.ok / c.total >= 0.6) {
        addPts(5);
        heard.textContent = `✅ Bien dit ! (+5 ⭐) Compris : « ${r.text} »`;
        grade(tappedOk ? 3 : 2);
        await speak(PRAISE[Math.floor(Math.random() * PRAISE.length)], { charId: "alex" });
        if (my === token && isAlive()) setTimeout(() => { if (my === token) next(); }, 600);
      } else {
        heard.textContent = `🙂 Presque ! Compris : « ${r.text} ». Écoutez et réessayez.`;
        await speak(correct, { rate: 0.7 });
      }
    };
    const micBtn = btn("🎤 Je la dis", () => hear(), "btn huge primary");
    const replay = () => { stopAll(); dialog ? speak(dialog.q, { charId: "sarah" }) : speakFr("Comment dit-on : " + it.fr.replace(/\(.*?\)/g, "").replace(/[«»"]/g, "").trim() + " ?"); };
    const head = dialog
      ? h("div", {}, h("div", { class: "av-line" }, h("span", { class: "av-dot" }, "👩"), "Sarah vous parle :"),
          h("div", { class: "bubble-big" }, dialog.q, " ", h("button", { type: "button", class: "icon-btn", "aria-label": "Réécouter", onClick: replay }, "🔊")),
          h("div", { class: "small muted" }, dialog.qFr),
          h("div", { class: "q" }, "Touchez la bonne réponse :"))
      : h("div", {}, h("div", { class: "q" }, "🗣 Comment dit-on en anglais :"), h("div", { class: "big-fr" }, it.emoji ? it.emoji + " " : "", it.fr, " ", h("button", { type: "button", class: "icon-btn", "aria-label": "Réécouter", onClick: replay }, "🔊")),
          h("div", { class: "q" }, "Touchez la bonne réponse :"));
    wrap.replaceChildren(
      h("div", { class: "rev-top" }, h("span", {}, `Question ${done + 1} · encore ${queue.length} après`), ptsEl,
        !own ? null : h("button", { type: "button", class: "icon-btn quit", "aria-label": "Quitter le plein écran", onClick: () => { stopAll(); clearInterval(watch); document.body.classList.remove("focus-on"); wrap.classList.remove("focus"); } }, "✕")),
      h("div", { class: "bar" }, h("span", { style: { width: Math.round(100 * done / Math.max(1, done + queue.length + 1)) + "%" } })),
      h("div", { class: "card flash" }, head, h("div", { class: "opts" }, optBtns), status, sayBox),
      onCards ? h("div", { class: "focus-foot" }, btn("🃏 Mode cartes", () => { stopAll(); clearInterval(watch); if (own) document.body.classList.remove("focus-on"); onCards(); }, "btn ghost sm")) : null);
    setTimeout(() => { if (isAlive()) replay(); }, 300);
  };
  next();
  return wrap;
}

// ====================== Carte d'un nouveau mot ======================
// ====================== Apprendre un mot : 4 petits jeux, un seul bouton à la fois ======================
const STOP = new Set(["the","a","an","is","are","am","i","i'm","you","to","of","and","it","my","your","me","do","in","on","at"]);
function blankFor(it) {
  // Phrase à compléter : la réponse B du mini-dialogue (sinon l'exemple), avec un mot-clé de l'expression caché.
  const ctx = Array.isArray(it.dlg) && it.dlg[0] ? it.dlg[0][1] : null;
  const toks = clean(it.en).replace(/[,;:"]/g, "").split(/\s+/).filter(Boolean);
  const keys = toks.filter(w => w.length > 2 && !STOP.has(w.toLowerCase())).sort((a, b) => b.length - a.length);
  const all = keys.length ? keys : toks;
  for (const sent of [Array.isArray(it.dlg) && it.dlg[1]?.[1], it.ex].filter(Boolean)) {
    const words = sent.split(/\s+/);
    const bare = (w) => w.replace(/[.…!?,;:"]/g, "").toLowerCase();
    for (const k of all) {
      const idx = words.findIndex(w => bare(w) === k.toLowerCase());
      if (idx >= 0) return { ctx: sent === it.ex ? null : ctx, before: words.slice(0, idx).join(" "), after: words.slice(idx + 1).join(" "), answer: words[idx].replace(/[.…!?,;:"]/g, ""), punct: words[idx].replace(/^[^.…!?,;:"]*/, ""), sent };
    }
  }
  return null;
}
function wordGames(it, num, total, onDone) {
  const wrap = h("div", { class: "word-games" });
  let stage = 0, token = 0, listener = null;
  const alive = () => wrap.isConnected;
  const stop = () => { token++; try { listener?.abort?.(); } catch {} listener = null; stopSpeaking(); };
  const bar = () => h("div", { class: "steps4" }, [0, 1, 2, 3].map(k => h("span", { class: k <= stage ? "on" : "" })));
  const top = () => h("div", { class: "row wg-top" }, h("span", { class: "muted" }, `Mot ${num} / ${total}`));
  const hint = (t) => h("div", { class: "wg-hint" }, "👉 ", t);
  const nextBtn = (label = "Suivant ➜") => btn(label, () => { stop(); stage++; draw(); }, "btn huge primary wg-next");
  const fb = (ok, text) => h("div", { class: "wg-fb " + (ok ? "ok" : "ko") }, text);
  const hard = btn("⭐ Ce mot est difficile", (e) => { markDifficult(it.id, true); e.currentTarget.textContent = "⭐ Il reviendra plus souvent"; }, "btn ghost sm");

  function draw() {
    stop();
    if (stage > 3) { onDone(); return; }
    const scr = h("div", { class: "wg-screen" });
    wrap.replaceChildren(top(), bar(), scr, h("div", { class: "wg-foot" }, hard));
    [listenGame, repeatGame, meaningGame, useGame][stage](scr);
  }

  // 1. J'écoute
  function listenGame(scr) {
    let taps = 0;
    const play = () => { taps++; speak(it.en, taps % 2 === 0 ? { rate: 0.6 } : {}); };
    scr.append(h("div", { class: "wg-pic" }, it.emoji || "💬"), h("div", { class: "wg-word" }, it.en), h("div", { class: "wg-ph" }, it.ph), h("div", { class: "wg-fr" }, it.fr),
      h("button", { type: "button", class: "round-big", "aria-label": "Écouter", onClick: play }, "🔊"),
      h("div", { class: "small muted center" }, "🐢 Touchez encore : plus lentement"),
      hint("Touchez le haut-parleur doré pour écouter, puis « Suivant »."),
      it.tip ? h("div", { class: "tip" }, "🧠 ", it.tip) : null, nextBtn());
    setTimeout(() => { if (alive() && stage === 0) play(); }, 300);
  }

  // 2. Je répète
  function repeatGame(scr) {
    const phrase = it.ex && it.ex.split(/\s+/).length <= 6 ? it.ex : it.en;
    const out = h("div", {});
    const go = async () => {
      if (!support.stt) { out.replaceChildren(fb(false, sttErrorFr("unsupported"))); return; }
      const my = ++token;
      out.replaceChildren(h("div", { class: "wg-hint" }, "🔊 Écoutez…"));
      try { await Promise.race([speak(phrase, { rate: 0.85 }), new Promise(r => setTimeout(r, 4000))]); } catch {}
      if (my !== token || !alive()) return;
      out.replaceChildren(h("div", { class: "wg-hint live" }, "🎤 À vous ! Dites la phrase…"));
      try {
        listener = listen({ silenceMs: 1500 });
        const r = await listener.promise;
        if (my !== token || !alive()) return;
        const cmp = compareWords(phrase, [r.text, ...(r.alternatives || [])]);
        const good = cmp.total ? cmp.ok / cmp.total >= 0.6 : false;
        const words = h("div", { class: "words big" }, cmp.words.map(w => h("span", { class: w.ok ? "w ok" : "w ko" }, w.w, " ")));
        if (good) { setSkill(it.id, "pronounced"); out.replaceChildren(fb(true, "✅ Bien dit !"), words); }
        else out.replaceChildren(fb(false, "❌ Pas tout à fait. Les mots en rouge sont à redire."), words, h("div", { class: "small muted" }, "Compris : « " + (r.text || "rien") + " »"), btn("🎤 Réessayer", go, "btn"));
      } catch (e) { if (my === token && alive()) out.replaceChildren(fb(false, e.code === "no-speech" ? "⏸ Je n'ai rien entendu. Touchez le micro quand vous êtes prêt." : sttErrorFr(e.code)), btn("🎤 Réessayer", go, "btn")); }
    };
    scr.append(h("div", { class: "wg-word" }, phrase, " ", speakIcon(phrase)), phrase === it.en ? h("div", { class: "wg-ph" }, it.ph) : h("div", { class: "wg-fr" }, it.exFr || ""),
      h("button", { type: "button", class: "round-big mic", "aria-label": "Je la dis", onClick: go }, "🎤"),
      hint("Touchez le micro, écoutez, puis dites la phrase."), out, nextBtn());
  }

  // 3. Je trouve le sens
  function meaningGame(scr) {
    const choices = shuffle([it, ...distractors(it, 2, "fr")]);
    const status = h("div", {});
    const btns = choices.map(c => h("button", { type: "button", class: "btn opt-btn", onClick: () => pick(c) }, (c.emoji || "💬") + "  " + c.fr));
    const pick = (c) => {
      btns.forEach(b => b.disabled = true);
      const ok = c.id === it.id;
      btns[choices.indexOf(it)].classList.add("ok");
      if (!ok) btns[choices.indexOf(c)].classList.add("ko");
      if (ok) setSkill(it.id, "understood");
      status.replaceChildren(fb(ok, ok ? "✅ Bravo !" : "❌ Raté. La bonne réponse est en vert."), nextBtn());
      if (ok) setTimeout(() => { if (alive() && stage === 2) { stage++; draw(); } }, 1400);
    };
    scr.append(h("div", { class: "muted" }, "🎧 Que veut dire :"), h("div", { class: "wg-word" }, it.en, " ", speakIcon(it.en)),
      h("div", { class: "opts" }, btns), hint("Touchez la bonne traduction."), status);
    setTimeout(() => { if (alive() && stage === 2) speak(it.en); }, 300);
  }

  // 4. Je l'utilise
  function useGame(scr) {
    const b = blankFor(it);
    const status = h("div", {});
    const finish = (sent) => { speak(sent); status.replaceChildren(fb(true, "🎉 Parfait ! Mot appris."), nextBtn(num < total ? "Mot suivant ➜" : "Terminer ➜")); };
    if (!b) { // pas de phrase à compléter : « Comment dit-on… ? » avec 3 réponses en anglais
      const choices = shuffle([it, ...distractors(it, 2, "en")]);
      const btns = choices.map(c => h("button", { type: "button", class: "btn opt-btn", onClick: () => {
        btns.forEach(x => x.disabled = true);
        btns[choices.indexOf(it)].classList.add("ok");
        if (c.id === it.id) { setSkill(it.id, "usedSpont"); finish(it.en); }
        else { btns[choices.indexOf(c)].classList.add("ko"); speak(it.en); status.replaceChildren(fb(false, "❌ Raté. La bonne réponse est en vert."), nextBtn(num < total ? "Mot suivant ➜" : "Terminer ➜")); }
      } }, "💬  " + c.en));
      scr.append(h("div", { class: "muted" }, "🧩 Comment dit-on :"), h("div", { class: "wg-word" }, it.fr), h("div", { class: "opts" }, btns), hint("Touchez la bonne phrase en anglais."), status);
      return;
    }
    const pool = shuffle(allItemsUpTo(Math.max(currentDay(), 14)).concat(VOCAB).flatMap(x => clean(x.en).split(/\s+/)).filter(w => w.length > 2 && w.toLowerCase() !== b.answer.toLowerCase() && !STOP.has(w.toLowerCase())));
    const opts = shuffle([b.answer, ...[...new Set(pool)].slice(0, 2)]);
    const slot = h("span", { class: "tile slot" }, "____");
    const tiles = opts.map(w => h("button", { type: "button", class: "btn tile", onClick: () => pick(w) }, w));
    const pick = (w) => {
      tiles.forEach(t => t.disabled = true);
      const ok = w === b.answer;
      tiles[opts.indexOf(b.answer)].classList.add("ok");
      slot.textContent = b.answer; slot.classList.add(ok ? "ok" : "ko");
      if (!ok) { tiles[opts.indexOf(w)].classList.add("ko"); }
      if (ok) setSkill(it.id, "usedSpont");
      if (ok) finish(b.sent);
      else { speak(b.sent); status.replaceChildren(fb(false, "❌ Raté. Le bon mot est en vert."), nextBtn(num < total ? "Mot suivant ➜" : "Terminer ➜")); }
    };
    scr.append(b.ctx ? h("div", { class: "av-line" }, h("span", { class: "av-dot" }, "👩"), " Sarah : ", b.ctx, " ", speakIcon(b.ctx, "sarah")) : null,
      h("div", { class: "muted" }, "🧩 Complétez votre réponse :"),
      h("div", { class: "wg-sent" }, b.before ? b.before + " " : "", slot, b.punct || "", b.after ? " " + b.after : ""),
      h("div", { class: "tiles" }, tiles), hint("Touchez le mot qui manque."), status);
    if (b.ctx) setTimeout(() => { if (alive() && stage === 3) speak(b.ctx); }, 300);
  }

  draw();
  return wrap;
}

export function wordCard(it, { onNext, compact = false } = {}) {
  const c = getCard(it.id);
  const skillsBox = h("div", { class: "skills" });
  const drawSkills = () => {
    const cc = get().cards[it.id] || c;
    const boxes = [["discovered", "Je découvre"], ["understood", "Je comprends"], ["listening", "Je reconnais à l'écoute"], ["pronounced", "Je sais prononcer"], ["usedSpont", "Je sais utiliser sans aide"]];
    skillsBox.replaceChildren(...boxes.map(([k, l]) => h("label", { class: "check" }, h("input", { type: "checkbox", checked: !!cc.skills?.[k], onChange: (e) => { setSkill(it.id, k, e.target.checked); } }), " ", l)),
      h("div", { class: "small muted" }, "Niveau : ", masteryLevel(it.id).label));
  };
  drawSkills();
  const diffBtn = btn(c.difficult ? "⭐ À réviser (marqué)" : "⭐ À RÉVISER", () => { markDifficult(it.id, true); diffBtn.textContent = "⭐ À réviser (marqué)"; toast("Ce mot reviendra dans vos prochaines séances."); }, "btn warn-btn");
  const st = h("div", { class: "small" });
  const repeat = async () => {
    if (!support.stt) { st.textContent = sttErrorFr("unsupported"); return; }
    await speak(it.en, { rate: 0.85 });
    st.textContent = "🎤 À vous…";
    try {
      const r = await listen({ silenceMs: 1500 }).promise;
      const cmp = compareWords(it.en, [r.text, ...(r.alternatives || [])]);
      st.replaceChildren(h("span", { class: "words" }, cmp.words.map(w => h("span", { class: w.ok ? "w ok" : "w ko" }, w.w))), " ", cmp.ok === cmp.total ? "✅ Reconnu !" : "Encore une fois ?", h("span", { class: "muted" }, " (compris : « " + (r.text || "rien") + " »)"));
      if (cmp.ok === cmp.total) { setSkill(it.id, "pronounced"); drawSkills(); }
    } catch (e) { st.textContent = sttErrorFr(e.code); }
  };
  return h("div", { class: "card word" },
    h("div", { class: "word-top" }, h("div", { class: "emoji-big" }, it.emoji || "💬"),
      h("div", {}, h("div", { class: "big-en" }, it.en), h("div", { class: "ph" }, "🗣 ", it.ph, h("span", { class: "ipa" + (get().settings.showIPA ? "" : " hidden") }, "  ", it.ipa)), h("div", { class: "big-fr" }, it.fr))),
    h("div", { class: "row wrap" }, btn("🔊 Écouter", () => speak(it.en), "btn primary"), btn("🐢 Lentement", () => speak(it.en, { rate: 0.6 }), "btn"), btn("🎤 Répéter", repeat, "btn"), btn("IPA", (e) => { e.currentTarget.closest(".word").querySelector(".ipa").classList.toggle("hidden"); }, "btn ghost sm")),
    st,
    it.ex ? h("div", { class: "example" }, h("div", {}, "📝 ", it.ex, " ", speakIcon(it.ex)), h("div", { class: "muted small" }, it.exFr)) : null,
    it.dlg?.length && !compact ? h("div", { class: "mini-dlg" }, h("div", { class: "eyebrow" }, "Mini-dialogue"), it.dlg.map(([who, en, fr]) => h("div", { class: "dlg-line" }, h("b", {}, who, " : "), en, " ", speakIcon(en, who === "A" ? "sarah" : "alex"), h("div", { class: "muted small" }, fr)))) : null,
    it.tip ? h("div", { class: "tip" }, "🧠 Astuce : ", it.tip) : null,
    it.generated ? h("div", { class: "muted small" }, "✨ Contenu préparé par l'IA pour ce jour.") : null,
    skillsBox,
    h("div", { class: "row wrap" }, diffBtn, btn("🧠 AIDE-MOI À RETENIR", () => memoryHelper(it), "btn"), onNext ? btn("J'ai compris ➜", onNext, "btn primary") : null));
}

// ====================== LEÇON DU JOUR ======================
export function lessonPage(dayN, nav) {
  const info = dayInfo(dayN);
  const ds = dayState(dayN);
  const p = plan();
  const ch = CHARACTERS[info.character];
  const stepsBox = h("div", { class: "lesson-steps" });
  const area = h("div", { class: "lesson-area" });
  const body = h("div", { class: "lesson-body" });
  const fTitle = h("div", { class: "focus-title" });
  const fBar = h("div", { class: "focus-bar" }, fTitle,
    h("button", { type: "button", class: "icon-btn quit", "aria-label": "Quitter le plein écran", onClick: () => unfocus(true) }, "✕"));
  area.append(fBar, body);
  let cleanup = null;
  // Plein écran : pendant une étape, l'exercice prend toute la page (rien d'autre autour).
  function focus(title) { fTitle.textContent = title; area.classList.add("focus"); document.body.classList.add("focus-on"); lessonFocus = true; area.scrollTop = 0; }
  function unfocus(showHint) {
    area.classList.remove("focus"); document.body.classList.remove("focus-on"); lessonFocus = false;
    if (showHint) { cleanupArea(); drawSteps(); body.replaceChildren(h("div", { class: "card" }, h("p", {}, "👆 Touchez une étape ci-dessus pour la faire (ou la refaire)."))); stepsBox.scrollIntoView({ block: "start" }); }
  }

  const stepLabel = (k) => k === "new" ? `Apprendre ${Math.min(p.newMax, get().settings.newPerSession)} nouveaux mots` : k === "conv" ? `Parler avec ${ch.name}` : STEPS.find(s => s[0] === k)[1];
  const order = STEPS.map(s => s[0]);
  const skipNew = info.review;

  function drawSteps(active) {
    const d = dayState(dayN);
    stepsBox.replaceChildren(...order.map((k, i) => {
      const done = d.steps[k] || (k === "new" && skipNew);
      return h("button", { type: "button", class: "step" + (done ? " done" : "") + (k === active ? " active" : ""), onClick: () => open(k) },
        h("span", { class: "box" }, done ? "☑" : "☐"), " ", k === "new" && skipNew ? "Pas de nouveaux mots (jour de bilan)" : stepLabel(k));
    }));
  }
  function nextStep(after) {
    const d = dayState(dayN);
    const idx = order.indexOf(after);
    const rest = order.slice(idx + 1).concat(order.slice(0, idx + 1));
    const nxt = rest.find(k => !d.steps[k] && !(k === "new" && skipNew));
    if (!nxt) return finished();
    pause(nxt);
  }
  // Après chaque étape : on peut s'arrêter là (10 minutes par-ci, par-là). Tout est sauvegardé.
  function pause(nxt) {
    cleanupArea();
    drawSteps();
    const d = dayState(dayN);
    const left = order.filter(k => !d.steps[k] && !(k === "new" && skipNew)).length;
    body.replaceChildren(h("div", { class: "card done-card" },
      h("div", { class: "emoji-big" }, "✅"), h("h2", {}, "Étape terminée, bravo !"),
      h("p", {}, `Encore ${left} étape${left > 1 ? "s" : ""} pour finir la séance du jour.`),
      h("p", { class: "small muted" }, "Vous pouvez vous arrêter ici : tout est enregistré. La prochaine fois, l'application reprendra exactement à cet endroit."),
      h("div", { class: "row wrap" }, btn(`▶️ Continuer : ${stepLabel(nxt)}`, () => open(nxt), "btn huge primary"), btn("⏸ J'arrête pour l'instant", () => nav.go("home"), "btn"))));
    focus("✅ Étape terminée");
  }
  function markDone(k) { setStep(dayN, k, true); drawSteps(k); }

  function finished() {
    completeDay(dayN);
    drawSteps();
    cleanupArea();
    const next = dayInfo(Math.min(120, dayN + 1));
    body.replaceChildren(h("div", { class: "card done-card" },
      h("div", { class: "emoji-big" }, "🎉"), h("h2", {}, `Jour ${dayN} terminé !`),
      h("p", {}, "Bravo. Vos révisions sont programmées automatiquement : les mots reviendront au bon moment."),
      dayN < 120 ? h("p", { class: "small muted" }, `Prochaine séance : jour ${dayN + 1} — ${next.title}. Conseil : une séance par jour suffit, la mémoire travaille pendant le sommeil.`) : h("p", {}, "Vous avez terminé les 120 séances. Continuez à parler avec Alex chaque jour !"),
      h("div", { class: "row wrap" }, btn("🏠 Retour à l'accueil", () => nav.go("home"), "btn primary"), btn("🎤 Parler encore avec Alex", () => nav.go("parler"), "btn"))));
  }
  function cleanupArea() { if (cleanup) { try { cleanup(); } catch {} cleanup = null; } stopSpeaking(); }

  function open(k) {
    cleanupArea();
    setLast(dayN, k);
    drawSteps(k);
    body.replaceChildren();
    focus(k === "new" && skipNew ? "Bilan" : stepLabel(k));
    ({ revision: stepRevision, new: stepNew, conv: stepConv, pron: stepPron, test: stepTest })[k]();
  }

  // --- 1. Révision ---
  function revEnd({ done, good }) {
    markDone("revision");
    body.replaceChildren(h("div", { class: "card" }, h("h3", {}, "Révision terminée"), h("p", {}, `${done} cartes revues, ${good} bien retenues.`), btn("Continuer ➜", () => nextStep("revision"), "btn primary")));
  }
  function stepRevision() {
    let ids = dueIds().slice(0, p.rev);
    if (info.review) {
      const week = PROGRAM.filter(x => x.week === info.week).flatMap(x => itemsForDay(x.day).map(i => i.id)).filter(id => get().cards[id]?.skills?.discovered);
      ids = [...new Set([...ids, ...week])].slice(0, p.rev + 5);
    }
    const head = h("div", {}, h("h2", {}, "🔁 Révision intelligente"), h("p", { class: "small muted" }, "Les expressions reviennent quand vous êtes sur le point de les oublier (méthode FSRS). Soyez honnête : « Oublié » n'est pas un échec, c'est ce qui les fait revenir plus souvent."));
    if (!ids.length) {
      const pr = practiceIds();
      body.append(head, h("div", { class: "card" }, h("p", {}, "Rien d'urgent à réviser aujourd'hui. 👍 Vous pouvez quand même jouer avec Sarah."),
        h("div", { class: "row wrap" }, pr.length ? btn("💬 Jouer avec Sarah", () => body.replaceChildren(reviewSession(pr, revEnd)), "btn huge primary") : null,
          btn("Passer ➜", () => { markDone("revision"); nextStep("revision"); }, "btn"))));
      return;
    }
    body.append(head, reviewSession(ids, revEnd));
  }

  // --- 2. Nouveaux mots ---
  function stepNew() {
    if (needsContent(dayN) && !get().generated[dayN]) return contentGenerator();
    let ids = ds.newIds;
    if (!ids || !ids.length) {
      const n = Math.min(p.newMax, get().settings.newPerSession);
      const candidates = [...itemsForDay(dayN), ...allItemsUpTo(dayN - 1)].filter(it => !get().cards[it.id]?.skills?.discovered);
      ids = [...new Map(candidates.map(c => [c.id, c])).keys()].slice(0, n);
      update(() => { dayState(dayN).newIds = ids; });
    }
    if (!ids.length) { body.append(h("div", { class: "card" }, h("p", {}, "Tous les mots prévus sont déjà découverts."), btn("Continuer ➜", () => { markDone("new"); nextStep("new"); }, "btn primary"))); return; }
    let i = Math.min(get().program.last?.day === dayN && get().program.last?.step === "new" ? (get().program.last.index || 0) : 0, ids.length - 1);
    const holder = h("div", {});
    body.append(holder);
    const show = () => {
      const it = itemById(ids[i]);
      discover(it.id);
      setLast(dayN, "new", i);
      holder.replaceChildren(wordGames(it, i + 1, ids.length, () => { i++; if (i < ids.length) show(); else quick(); }));
    };
    const quick = () => {
      holder.replaceChildren(h("h3", {}, "Petite vérification à l'écoute"), quizRunner(shuffle(ids).map(id => makeQuestion(itemById(id), "listen_choose")), ({ ok, total }) => {
        markDone("new");
        holder.replaceChildren(h("div", { class: "card" }, h("p", {}, `${ok} / ${total} reconnus à l'écoute.`), btn(`Continuer : parler avec ${ch.name} ➜`, () => nextStep("new"), "btn primary")));
      }));
    };
    show();
  }

  function contentGenerator() {
    const box = h("div", { class: "card" },
      h("p", {}, `Les mots du jour ${dayN} (« ${info.title} ») sont préparés par Alex grâce à l'IA, une seule fois, puis gardés sur votre appareil.`));
    const go = async () => {
      box.replaceChildren(h("p", {}, "✨ Alex prépare vos 5 mots…"));
      try {
        const avoid = knownItems().map(x => x.en).concat(VOCAB.map(v => v.en));
        const r = await generateDay(dayN, info.title, info.objective, info.month, avoid);
        update(s => { s.generated[dayN] = r.items; });
        open("new");
      } catch (e) {
        box.replaceChildren(h("p", { class: "warn" }, aiErrorFr(e.code)), h("p", { class: "small" }, "En attendant, vous pouvez faire les autres étapes ou réviser vos anciens mots."),
          h("div", { class: "row wrap" }, btn("Réessayer", go, "btn primary"), btn("Passer cette étape", () => { markDone("new"); nextStep("new"); }, "btn ghost")));
      }
    };
    box.append(btn("✨ Préparer les mots du jour", go, "btn primary"));
    body.append(box);
    if (aiStatus.state === "ok") go();
  }

  // --- 3. Conversation ---
  function stepConv() {
    const targetIds = (dayState(dayN).newIds || []).concat(dueIds().slice(0, 3));
    const doneBtn = () => h("div", { class: "card" }, h("p", {}, "Conversation terminée. Bravo d'avoir parlé !"), btn("Continuer ➜", () => nextStep("conv"), "btn primary"));
    const start = (kind) => {
      body.replaceChildren(h("h2", {}, `💬 Parler avec ${ch.name}`));
      const v = conversationView({
        kind, character: info.character, guidedId: guidedFor(dayN), lessonDay: dayN,
        situation: `Lesson day ${dayN}: ${info.title} — ${info.objective}`, situationFr: info.title,
        targetIds, goal: `Objectif : environ ${p.goal} échanges.`,
        onEnd: () => { markDone("conv"); body.replaceChildren(doneBtn()); },
      });
      cleanup = v.cleanup;
      body.append(v);
    };
    body.append(h("h2", {}, `💬 Parler avec ${ch.name}`), h("p", { class: "small muted" }, info.objective));
    const choice = h("div", { class: "card" }, h("p", {}, "Vérification de la connexion à l'IA…"));
    body.append(choice);
    checkAi().then(s => {
      const g = guidedFor(dayN);
      if (s.state === "ok") { start("ai"); return; }
      choice.replaceChildren(
        h("p", {}, "⚠️ ", aiErrorFr(s.state === "badcode" ? "badcode" : navigator.onLine ? "not_configured" : "offline")),
        g ? h("p", {}, "Vous pouvez faire un dialogue guidé à la place (répliques préparées, sans IA).") : null,
        h("div", { class: "row wrap" }, g ? btn("📘 Dialogue guidé", () => start("guided"), "btn primary") : null, btn("Réessayer l'IA", () => open("conv"), "btn"), btn("Passer cette étape", () => { markDone("conv"); nextStep("conv"); }, "btn ghost")));
    });
  }

  // --- 4. Prononciation ---
  function stepPron() {
    const items = (dayState(dayN).newIds || []).map(itemById).filter(Boolean);
    const counts = {};
    items.forEach(it => { if (it.sound) counts[it.sound] = (counts[it.sound] || 0) + 1; });
    const sound = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || info.sound;
    const s = SOUNDS[sound];
    const phrases = [...new Set([...items.filter(it => it.sound === sound).map(it => it.ex || it.en), ...(s?.phrases || [])])].slice(0, p.pron);
    let i = 0;
    body.append(h("h2", {}, "👄 Prononciation"), soundCard(sound));
    const holder = h("div", {});
    body.append(holder);
    const show = () => {
      if (cleanup) cleanup();
      const st = pronStudio(phrases[i], { sound });
      cleanup = st.cleanup;
      holder.replaceChildren(h("div", { class: "progress-dots" }, `Phrase ${i + 1} / ${phrases.length}`), st,
        btn(i + 1 < phrases.length ? "Phrase suivante ➜" : "Terminer la prononciation ➜", () => { i++; if (i < phrases.length) show(); else { markDone("pron"); nextStep("pron"); } }, "btn primary"));
    };
    show();
  }

  // --- 5. Test ---
  function stepTest() {
    if (info.evaluation) return body.append(h("h2", {}, "📋 Évaluation du mois"), evaluationView(dayN, () => { markDone("test"); nextStep("test"); }));
    const newIds = dayState(dayN).newIds || [];
    let pool = newIds.map(itemById).filter(Boolean);
    const others = shuffle(knownItems().filter(x => !newIds.includes(x.id)));
    if (info.review) pool = PROGRAM.filter(x => x.week === info.week).flatMap(x => itemsForDay(x.day)).filter(x => get().cards[x.id]?.skills?.discovered);
    pool = [...pool, ...others].slice(0, p.test);
    body.append(h("h2", {}, "✅ Petit test"));
    if (!pool.length) { body.append(h("div", { class: "card" }, h("p", {}, "Pas encore de mots à tester."), btn("Terminer ➜", () => { markDone("test"); nextStep("test"); }, "btn primary"))); return; }
    const types = ["listen_choose", "fr_to_en", "complete", "say_it"];
    const qs = pool.map((it, k) => makeQuestion(it, types[k % types.length]));
    body.append(quizRunner(qs, ({ ok, total }) => {
      adaptPace(ok / total);
      markDone("test");
      body.replaceChildren(h("div", { class: "card" }, h("h3", {}, `Résultat : ${ok} / ${total}`), h("p", {}, ok / total >= 0.8 ? "Excellent ! 💪" : ok / total >= 0.5 ? "C'est bien. Les mots ratés reviendront plus souvent." : "Pas de souci : on apprend en se trompant. Les mots ratés reviendront dès demain."), btn("Continuer ➜", () => nextStep("test"), "btn primary")));
    }));
  }

  drawSteps();
  const root = h("div", { class: "page lesson" },
    h("div", { class: "lesson-head" },
      h("div", { class: "eyebrow" }, `Jour ${dayN} / 120 · Mois ${info.month} · Semaine ${info.week}`),
      h("h1", {}, info.title),
      h("p", { class: "lead" }, info.objective),
      info.grammar ? h("div", { class: "grammar" }, "📐 Grammaire utile : ", info.grammar) : null,
      h("div", { class: "small muted" }, `Durée prévue : ${get().settings.duration} minutes (modifiable dans Réglages).`)),
    stepsBox, area);
  root.cleanup = () => { cleanupArea(); unfocus(false); };
  const forced = get().program.openStep; // étape touchée sur l'accueil
  if (forced) update(x => { delete x.program.openStep; });
  if (forced && order.includes(forced) && !(forced === "new" && skipNew)) { setTimeout(() => open(forced), 0); return root; }
  const last = get().program.last;
  const startStep = last?.day === dayN && last.step && !dayState(dayN).steps[last.step] ? last.step : order.find(k => !dayState(dayN).steps[k] && !(k === "new" && skipNew));
  if (dayState(dayN).done && !startStep) { body.append(h("div", { class: "card" }, h("p", {}, "✅ Cette séance est déjà terminée. Vous pouvez refaire n'importe quelle étape ci-dessus."))); }
  else setTimeout(() => open(startStep || "revision"), 0);
  return root;
}

function guidedFor(day) {
  const info = dayInfo(day);
  if (info.guided) return info.guided;
  const ok = Object.entries(GUIDED).filter(([, g]) => g.minDay <= day).sort((a, b) => b[1].minDay - a[1].minDay);
  return ok[0]?.[0] || "sarah_meet";
}

// Adapte le nombre de nouveaux mots aux résultats réels (3 à 6)
function adaptPace(ratio) {
  update(s => {
    const backlog = dueIds().length;
    let n = s.settings.newPerSession;
    if (ratio >= 0.85 && backlog < 10) n = Math.min(6, n + 1);
    else if (ratio < 0.6 || backlog > 25) n = Math.max(3, n - 1);
    s.settings.newPerSession = n;
  });
}

// ====================== Évaluation mensuelle ======================
export function evaluationView(dayN, onEnd) {
  const known = shuffle(knownItems());
  const wrap = h("div", {});
  if (known.length < 4) { wrap.append(h("p", {}, "Pas encore assez de mots appris pour une évaluation."), btn("Continuer", onEnd, "btn primary")); return wrap; }
  const listenQs = known.slice(0, 6).map(it => makeQuestion(it, "listen_choose"));
  const recallQs = known.slice(6, 10).map(it => makeQuestion(it, "fr_to_en"));
  const speakQs = support.stt ? known.slice(0, 3).map(it => makeQuestion(it, "say_it")) : [];
  const res = {};
  wrap.append(h("p", { class: "small muted" }, "Une évaluation honnête, calculée sur vos vraies réponses. Elle ne donne aucune certification officielle."));
  const run = (name, qs, then) => {
    if (!qs.length) { res[name] = null; return then(); }
    wrap.replaceChildren(h("h3", {}, { listening: "1. Compréhension orale", recall: "2. Mémoire", speaking: "3. Expression orale" }[name]), quizRunner(qs, ({ ok, total }) => { res[name] = pct(ok, total); then(); }));
  };
  run("listening", listenQs, () => run("recall", recallQs, () => run("speaking", speakQs, () => {
    const ev = { date: Date.now(), day: dayN, ...res, mastered: Object.values(get().cards).filter(isMastered).length, studied: knownItems().length };
    update(s => { s.evaluations.push(ev); });
    const prev = get().evaluations.slice(-2, -1)[0];
    wrap.replaceChildren(h("div", { class: "card" }, h("h3", {}, "Résultats de l'évaluation"),
      h("ul", {}, h("li", {}, `Compréhension orale : ${res.listening ?? "—"} %`), h("li", {}, `Mémoire (retrouver l'anglais) : ${res.recall ?? "—"} %`), h("li", {}, `Expression (mots reconnus) : ${res.speaking ?? "non mesuré"}${res.speaking != null ? " %" : ""}`), h("li", {}, `Mots étudiés : ${ev.studied}, bien retenus : ${ev.mastered}`)),
      prev ? h("p", { class: "small" }, `Évaluation précédente (jour ${prev.day}) : écoute ${prev.listening ?? "—"} %, mémoire ${prev.recall ?? "—"} %.`) : null,
      h("p", { class: "small muted" }, "Repères CECRL : consultez « Mes progrès » pour vous situer avec les descriptions officielles (auto-évaluation)."),
      btn("Continuer ➜", onEnd, "btn primary")));
  })));
  return wrap;
}

// ====================== 🧠 AIDE-MOI À RETENIR ======================
export function memoryHelper(it) {
  let step = 1;
  const body = h("div", {});
  const m = modal("🧠 Aide-moi à retenir", body);
  let ai = null;
  const draw = () => {
    const nav = (label, fn = () => { step++; draw(); }) => btn(label, fn, "btn primary");
    const dots = h("div", { class: "progress-dots" }, `Étape ${step} / 6`);
    if (step === 1) body.replaceChildren(dots, h("h3", {}, "1. Simplifier"), h("div", { class: "big-en" }, it.en), h("div", { class: "big-fr" }, ai?.simple_fr || it.fr), it.emoji ? h("div", { class: "emoji-big" }, it.emoji) : null, nav("Suivant ➜"));
    if (step === 2) {
      const assoc = h("div", { class: "tip" }, "🔗 ", it.tip || "Imaginez une scène où vous utilisez cette expression.");
      const aiBox = h("div", {});
      if (ai) aiBox.append(h("div", { class: "tip" }, "✨ ", ai.association_fr), ai.sound_tip_fr ? h("div", { class: "small" }, "🗣 ", ai.sound_tip_fr) : null);
      const askAi = btn("✨ Une autre astuce par Alex (IA)", async () => {
        askAi.disabled = true; askAi.textContent = "Alex réfléchit…";
        try { ai = await mnemonic(it); draw(); } catch (e) { askAi.textContent = aiErrorFr(e.code); }
      }, "btn");
      body.replaceChildren(dots, h("h3", {}, "2. Une association facile"), assoc, aiBox, h("div", { class: "row wrap" }, ai ? null : askAi, nav("Suivant ➜")));
    }
    if (step === 3) { body.replaceChildren(dots, h("h3", {}, "3. Écouter"), h("div", { class: "big-en" }, it.en), listenBtns(it.en), nav("Suivant ➜")); speak(it.en); }
    if (step === 4) {
      const st = h("div", { class: "small" });
      body.replaceChildren(dots, h("h3", {}, "4. Répéter à voix haute"), h("div", { class: "big-en" }, it.en), h("p", { class: "small" }, "Répétez 3 fois, lentement puis normalement."),
        h("div", { class: "row wrap" }, btn("🔊 Écouter", () => speak(it.en), "btn"), support.stt ? btn("🎤 Vérifier", async () => {
          st.textContent = "🎤 …";
          try { const r = await listen({ silenceMs: 1500 }).promise; const c = compareWords(it.en, [r.text, ...(r.alternatives || [])]); st.textContent = `${c.ok}/${c.total} mots reconnus (compris : « ${r.text || "rien"} »)`; if (c.ok === c.total) setSkill(it.id, "pronounced"); } catch (e) { st.textContent = sttErrorFr(e.code); }
        }, "btn") : null), st, nav("Suivant ➜"));
    }
    if (step === 5) {
      const inp = h("input", { class: "chat-input", placeholder: "Écrivez ou dites l'expression en anglais", "aria-label": "Votre réponse" });
      const st = h("div", {});
      const check = (txt) => { const c = compareWords(it.en, [txt]); const ok = c.total && c.ok / c.total >= 0.75; st.replaceChildren(h("div", { class: ok ? "good" : "bad" }, ok ? "✅ Retrouvé sans aide !" : "Presque. La réponse : " + it.en), nav("Suivant ➜", () => { step++; ai = Object.assign(ai || {}, { recalled: ok }); draw(); })); speak(it.en); };
      body.replaceChildren(dots, h("h3", {}, "5. Retrouver sans aide"), h("div", { class: "big-fr" }, it.fr), h("div", { class: "input-row" }, inp, btn("Vérifier", () => check(inp.value), "btn primary")),
        support.stt ? btn("🎤 Le dire", async () => { try { const r = await listen({ silenceMs: 1500 }).promise; inp.value = r.text; check(r.text); } catch (e) { st.textContent = sttErrorFr(e.code); } }, "btn") : null,
        btn("Je ne sais pas", () => check(""), "btn ghost"), st);
    }
    if (step === 6) {
      const ok = !!ai?.recalled;
      answer(it.id, ok ? 2 : 1, ok ? "understood" : null);
      markDifficult(it.id, true);
      const c = get().cards[it.id];
      body.replaceChildren(dots, h("h3", {}, "6. Prochaine révision programmée"),
        h("p", {}, ok ? `Bravo. Ce mot reviendra dans ${Math.max(1, daysUntil(c))} jour(s), puis de moins en moins souvent.` : "Ce mot reviendra dans 10 minutes, puis demain. C'est comme ça que la mémoire se construit."),
        btn("Fermer", () => m.close(), "btn primary"));
    }
  };
  draw();
}

// ====================== ONGLET VOCABULAIRE ======================
export function vocabPage(nav) {
  let filter = "all", q = "";
  const listBox = h("div", { class: "vocab-list" });
  const draw = () => {
    const cd = currentDay();
    const items = allItemsUpTo(Math.max(cd, 7)).filter(it => {
      const c = get().cards[it.id];
      if (q && !(it.en + " " + it.fr).toLowerCase().includes(q)) return false;
      if (filter === "studied") return c?.skills?.discovered;
      if (filter === "difficult") return c?.difficult || c?.lapses > 0;
      if (filter === "due") return c && c.state !== "new" && c.due <= Date.now();
      if (filter === "mastered") return isMastered(c);
      return true;
    });
    listBox.replaceChildren(...(items.length ? items.map(it => {
      const lvl = masteryLevel(it.id);
      return h("button", { type: "button", class: "vocab-row", onClick: () => modal(it.en, wordCard(it, { compact: false })) },
        h("span", { class: "emoji" }, it.emoji || "💬"), h("span", { class: "grow" }, h("b", {}, it.en), h("br"), h("span", { class: "muted small" }, it.fr)),
        h("span", { class: "lvl l" + lvl.n }, lvl.label), speakIcon(it.en));
    }) : [h("p", { class: "muted" }, "Aucun mot dans cette catégorie pour l'instant.")]));
  };
  const filters = [["all", "Tous"], ["studied", "Étudiés"], ["due", "À réviser"], ["difficult", "Difficiles"], ["mastered", "Bien retenus"]];
  const seg = h("div", { class: "seg small-seg" });
  const drawSeg = () => seg.replaceChildren(...filters.map(([k, l]) => btn(l, () => { filter = k; drawSeg(); draw(); }, "seg-btn" + (filter === k ? " on" : ""))));
  drawSeg(); draw();
  return h("div", { class: "page" },
    h("h1", {}, "📖 Vocabulaire"),
    h("p", { class: "lead" }, "Touchez un mot pour l'écouter, voir sa prononciation, son exemple et votre niveau."),
    h("input", { class: "chat-input", type: "search", placeholder: "Rechercher (anglais ou français)", "aria-label": "Rechercher", onInput: e => { q = e.target.value.toLowerCase(); draw(); } }),
    seg, listBox);
}

// ====================== ONGLET MÉMOIRE (coach) ======================
export function memoryPage(nav) {
  const st = get();
  const due = dueIds();
  const forgotten = Object.entries(st.cards).filter(([, c]) => c.lapses > 0 || (c.wrong || 0) > (c.right || 0)).sort((a, b) => (b[1].lapses + b[1].wrong) - (a[1].lapses + a[1].wrong)).map(([id]) => itemById(id)).filter(Boolean).slice(0, 10);
  const difficult = Object.entries(st.cards).filter(([, c]) => c.difficult).map(([id]) => itemById(id)).filter(Boolean);
  const confusions = Object.entries(st.confusions).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, n]) => { const [a, b] = k.split(">"); return [itemById(a), itemById(b), n]; }).filter(x => x[0] && x[1]);
  const sounds = Object.entries(st.pron).filter(([k, p]) => SOUNDS[k] && p.attempts >= 2).map(([k, p]) => [k, pct(p.wordsOk, p.words), p.attempts]).sort((a, b) => a[1] - b[1]).slice(0, 4);
  const notPron = Object.entries(st.cards).filter(([, c]) => c.skills?.listening && !c.skills?.pronounced).map(([id]) => itemById(id)).filter(Boolean).slice(0, 8);
  const errors = st.errors.slice(0, 6);
  const row = (it) => h("div", { class: "mem-row" }, h("span", { class: "grow" }, h("b", {}, it.en), " — ", h("span", { class: "muted" }, it.fr)), speakIcon(it.en), btn("🧠 AIDE-MOI À RETENIR", () => memoryHelper(it), "btn sm"));
  const section = (title, content, empty) => h("div", { class: "card" }, h("h3", {}, title), content && content.length ? content : h("p", { class: "muted small" }, empty));
  return h("div", { class: "page" },
    h("h1", {}, "🧠 Mon coach mémoire"),
    h("p", { class: "lead" }, "Il se souvient de vos difficultés à votre place et vous propose des révisions courtes."),
    h("div", { class: "card hero-mini" }, h("div", { class: "grow" }, h("b", {}, `${due.length} expression(s) à réviser maintenant`), h("div", { class: "small muted" }, "Une révision courte (2 à 5 minutes) vaut mieux qu'une longue.")),
      btn(due.length ? "🔁 Révision express" : "Rien à réviser", () => due.length && nav.reviewNow(), "btn primary", { disabled: !due.length })),
    section("😣 Les mots que j'oublie", forgotten.map(row), "Aucun mot oublié pour l'instant."),
    section("⭐ Mes mots marqués « À réviser »", difficult.map(row), "Marquez un mot avec « À RÉVISER » pour le retrouver ici."),
    section("🔀 Les expressions que je confonds", confusions.map(([a, b, n]) => h("div", { class: "mem-row" }, h("span", { class: "grow" }, h("b", {}, a.en), " (", a.fr, ")  ≠  ", h("b", {}, b.en), " (", b.fr, ")", h("span", { class: "muted small" }, ` · ${n} fois`)), btn("🧠", () => memoryHelper(a), "btn sm"))), "Aucune confusion repérée."),
    section("👄 Les sons qui me posent problème", sounds.map(([k, p, n]) => h("div", { class: "mem-row" }, h("span", { class: "grow" }, h("b", {}, SOUNDS[k].name), h("span", { class: "muted small" }, ` · ${p} % des mots reconnus sur ${n} essais`)), btn("S'entraîner", () => nav.go("prononciation", k), "btn sm"))), "Pas encore assez d'essais de prononciation."),
    section("🗣 Je reconnais, mais je ne prononce pas encore", notPron.map(row), "Rien à signaler."),
    section("✏️ Mes erreurs qui reviennent", errors.map(e => h("div", { class: "mem-row" }, h("span", { class: "grow" }, h("s", { class: "muted" }, e.original), " → ", h("b", {}, e.better), e.explanation ? h("div", { class: "small muted" }, e.explanation) : null), speakIcon(e.better))), "Les corrections d'Alex pendant vos conversations apparaîtront ici."));
}

// ====================== ONGLET JEUX ======================
const QUICK_QS = [
  { q: "What's your name?", fr: "Comment tu t'appelles ?", keys: ["name", "i'm", "i am"], sug: "My name is Manu." },
  { q: "How are you today?", fr: "Comment vas-tu aujourd'hui ?", keys: ["fine", "good", "great", "ok", "okay", "well", "not bad"], sug: "I'm fine, thanks." },
  { q: "Where are you from?", fr: "D'où viens-tu ?", keys: ["france", "french", "from"], sug: "I'm from France." },
  { q: "Do you speak English?", fr: "Tu parles anglais ?", keys: ["little", "yes", "bit", "learning"], sug: "A little. I'm learning." },
  { q: "How old are you?", fr: "Quel âge as-tu ?", keys: ["fifty", "forty", "sixty", "years", "i'm"], sug: "I'm fifty-four." },
  { q: "Do you have kids?", fr: "Tu as des enfants ?", keys: ["yes", "no", "kids", "children", "son", "daughter"], sug: "Yes, I have two kids." },
  { q: "What do you do?", fr: "Tu fais quoi dans la vie ?", keys: ["work", "job", "i'm", "retired"], sug: "I work in an office." },
  { q: "Do you like coffee?", fr: "Tu aimes le café ?", keys: ["yes", "no", "like", "love"], sug: "Yes, I love coffee." },
  { q: "Is this your first time in the U.S.?", fr: "C'est ta première fois aux USA ?", keys: ["yes", "no", "first", "second", "time"], sug: "Yes, it's my first time." },
];

export function gamesPage(nav) {
  const area = h("div", {});
  const known = () => knownItems().length >= 3 ? knownItems() : allItemsUpTo(Math.max(currentDay(), 2));
  const end = (title) => ({ ok, total }) => area.replaceChildren(h("div", { class: "card" }, h("h3", {}, title), h("p", {}, `Score : ${ok} / ${total}`), btn("Rejouer", () => games.find(g => g[1] === title)[3](), "btn primary"), btn("Autres jeux", () => area.replaceChildren(), "btn")));
  const run = (title, qs) => { area.replaceChildren(h("h2", {}, title), quizRunner(qs, end(title))); area.scrollIntoView({ behavior: "smooth" }); };
  const games = [
    ["🎧", "Écoute et choisis", "J'écoute un mot et je choisis sa traduction.", () => run("Écoute et choisis", shuffle(known()).slice(0, 6).map(it => makeQuestion(it, "listen_choose")))],
    ["🧩", "Complète la phrase", "Je choisis le mot manquant.", () => run("Complète la phrase", shuffle(known()).slice(0, 6).map(it => makeQuestion(it, "complete")))],
    ["⚡", "Réponds rapidement", "Alex pose une question, je réponds à voix haute.", () => quickAnswer()],
    ["👂", "Reconnais la phrase", "J'écoute une phrase et j'identifie son sens.", () => run("Reconnais la phrase", shuffle(known().filter(x => x.ex && x.exFr)).slice(0, 6).map(it => makeQuestion(it, "meaning")))],
    ["🎭", "Conversation surprise", "Un personnage apparaît et me parle.", () => surprise()],
    ["🧠", "Mémoire express", "Je retrouve les mots appris (anglais à partir du français).", () => run("Mémoire express", shuffle(known()).slice(0, 8).map(it => makeQuestion(it, support.stt ? "say_it" : "fr_to_en")))],
    ["👄", "Prononciation", "Je reproduis une phrase et j'améliore les sons difficiles.", () => pronGame()],
  ];
  function quickAnswer() {
    const qs = shuffle(QUICK_QS).slice(0, 5);
    let i = 0, ok = 0;
    const draw = () => {
      if (i >= qs.length) return end("Réponds rapidement")({ ok, total: qs.length });
      const q = qs[i];
      const st = h("div", {});
      const go = async () => {
        await speak(q.q);
        if (!support.stt) { st.replaceChildren(h("p", { class: "warn" }, sttErrorFr("unsupported"))); return; }
        st.replaceChildren(h("p", {}, "🎤 Répondez…"));
        try {
          const r = await listen({ silenceMs: 1800 }).promise;
          const t = (r.text || "").toLowerCase();
          const good = q.keys.some(k => t.includes(k));
          if (good) ok++;
          st.replaceChildren(h("p", { class: good ? "good" : "bad" }, good ? "✅ Réponse qui convient !" : "Hmm, essayez par exemple :"), h("p", {}, "Compris : « ", r.text || "rien", " »"), h("p", {}, "Exemple : ", h("b", {}, q.sug.replace("Manu", get().profile.name || "Manu")), " ", speakIcon(q.sug)), h("p", { class: "muted small" }, "Vérification simple par mots-clés (sans IA)."), btn("Suivant ➜", () => { i++; draw(); }, "btn primary"));
        } catch (e) { st.replaceChildren(h("p", { class: "warn" }, sttErrorFr(e.code))); }
      };
      area.replaceChildren(h("h2", {}, "⚡ Réponds rapidement"), h("div", { class: "progress-dots" }, `Question ${i + 1} / ${qs.length}`), h("div", { class: "card" }, h("div", { class: "big-en" }, "🧑‍🏫 ", q.q), h("details", {}, h("summary", {}, "Voir la traduction"), q.fr), btn("▶️ Alex pose la question", go, "btn primary"), st));
      go();
    };
    draw();
  }
  function surprise() {
    const s = SITUATIONS[Math.floor(Math.random() * SITUATIONS.length)];
    checkAi().then(stt => {
      if (stt.state === "ok") nav.openConversation({ kind: "ai", character: s.character, situation: s.en + " The character starts the conversation by surprise.", situationFr: "Conversation surprise : " + s.fr });
      else { const g = Object.entries(GUIDED).filter(([, x]) => x.minDay <= Math.max(currentDay(), 8)); const [id, gd] = g[Math.floor(Math.random() * g.length)]; toast("IA indisponible : dialogue guidé surprise."); nav.openConversation({ kind: "guided", guidedId: id, situationFr: gd.title }); }
    });
  }
  function pronGame() {
    const keys = Object.keys(SOUNDS);
    const k = keys[Math.floor(Math.random() * keys.length)];
    const ph = SOUNDS[k].phrases[Math.floor(Math.random() * SOUNDS[k].phrases.length)];
    area.replaceChildren(h("h2", {}, "👄 Prononciation"), soundCard(k), pronStudio(ph, { sound: k }), btn("Une autre phrase", pronGame, "btn primary"));
  }
  return h("div", { class: "page" },
    h("h1", {}, "🎲 Jeux"),
    h("p", { class: "lead" }, "Des mini-jeux courts pour retenir sans s'en rendre compte. Les résultats alimentent vos révisions."),
    h("div", { class: "grid cards" }, games.map(([e, t, d, f]) => h("button", { type: "button", class: "card choice", onClick: f }, h("div", { class: "choice-emoji" }, e), h("div", {}, h("div", { class: "choice-title" }, t), h("div", { class: "small muted" }, d))))),
    area);
}

// ====================== ONGLET ÉCOUTER ======================
export function listenPage(nav) {
  const pool = () => {
    const cd = currentDay();
    const items = knownItems().length ? knownItems() : allItemsUpTo(Math.max(cd, 2));
    const lines = items.flatMap(it => [it.ex && { en: it.ex, fr: it.exFr }, ...(it.dlg || []).map(d => ({ en: d[1], fr: d[2] }))]).filter(Boolean);
    const g = Object.values(GUIDED).filter(x => x.minDay <= Math.max(cd, 1)).flatMap(x => x.steps.map(s => ({ en: s.en, fr: s.fr, ch: x.character })));
    return [...lines, ...g];
  };
  let speed = 0.9;
  const chars = Object.keys(CHARACTERS);
  const card = h("div", { class: "card listen-card" });
  const speeds = [[0.65, "Très lent"], [0.8, "Lent"], [0.9, "Normal"], [1.05, "Rapide"]];
  const seg = h("div", { class: "seg small-seg" });
  const drawSeg = () => seg.replaceChildren(...speeds.map(([v, l]) => btn(l, () => { speed = v; drawSeg(); }, "seg-btn" + (speed === v ? " on" : ""))));
  drawSeg();
  let total = 0, okN = 0;
  const score = h("div", { class: "small muted" });
  const next = () => {
    const p = pool();
    const s = p[Math.floor(Math.random() * p.length)];
    const ch = s.ch || chars[Math.floor(Math.random() * chars.length)];
    const text = h("div", { class: "big-en hidden" }, s.en);
    const fr = h("div", { class: "big-fr hidden" }, s.fr);
    const play = () => speak(s.en, { charId: ch, rate: speed });
    card.replaceChildren(
      h("div", { class: "who" }, CHARACTERS[ch].emoji, " ", CHARACTERS[ch].name, " parle :"),
      h("div", { class: "row wrap" }, btn("▶️ Écouter", play, "btn primary"), btn("🔁 Réécouter", play, "btn"), btn("📝 Voir le texte", () => text.classList.toggle("hidden"), "btn ghost"), btn("🇫🇷 Traduction", () => fr.classList.toggle("hidden"), "btn ghost")),
      text, fr,
      h("div", { class: "q small" }, "Avez-vous compris le sens ?"),
      h("div", { class: "row wrap" }, btn("✅ J'ai compris", () => { logListening(true); total++; okN++; score.textContent = `Cette séance : ${okN}/${total} compris`; next(); }, "btn grade g3"), btn("❌ Pas compris", () => { logListening(false); total++; text.classList.remove("hidden"); fr.classList.remove("hidden"); score.textContent = `Cette séance : ${okN}/${total} compris`; play(); }, "btn grade g1"), btn("Suivante ➜", next, "btn")));
    setTimeout(play, 250);
  };
  next();
  return h("div", { class: "page" },
    h("h1", {}, "🎧 Écouter"),
    h("p", { class: "lead" }, "Entraînez votre oreille avec plusieurs voix américaines et plusieurs vitesses. D'abord sans le texte, puis avec."),
    h("div", { class: "row wrap" }, h("span", { class: "small" }, "Vitesse :"), seg), card, score,
    h("div", { class: "card" }, h("h3", {}, "Quiz d'écoute"), h("p", { class: "small" }, "Écoutez une phrase et choisissez son sens."), btn("Lancer le quiz", (e) => { const host = e.currentTarget.parentNode; const items = shuffle(knownItems().filter(x => x.ex)).slice(0, 5); if (!items.length) { toast("Apprenez d'abord quelques mots dans la leçon du jour."); return; } host.replaceChildren(quizRunner(items.map(it => makeQuestion(it, "meaning")), ({ ok, total: t }) => host.replaceChildren(h("p", {}, `Résultat : ${ok}/${t}`)))); }, "btn primary")));
}

export function pronPage(nav, soundKey) {
  const keys = Object.keys(SOUNDS);
  let k = SOUNDS[soundKey] ? soundKey : keys[0];
  const area = h("div", {});
  let clean = null;
  const sel = h("select", { class: "select", "aria-label": "Son à travailler", onChange: e => { k = e.target.value; draw(); } }, keys.map(x => h("option", { value: x, selected: x === k }, SOUNDS[x].name)));
  const custom = h("input", { class: "chat-input", placeholder: "Ou tapez votre propre phrase en anglais", maxlength: 120 });
  const draw = (phrase) => {
    clean?.();
    const studios = (phrase ? [phrase] : SOUNDS[k].phrases).map(p => { const s = pronStudio(p, { sound: phrase ? "general" : k }); return s; });
    clean = () => studios.forEach(s => s.cleanup());
    area.replaceChildren(phrase ? null : soundCard(k), ...studios);
  };
  draw();
  const page = h("div", { class: "page" },
    h("h1", {}, "👄 Studio de prononciation"),
    h("p", { class: "lead" }, "Écoutez, répétez, enregistrez-vous et comparez. Prononciation de référence : anglais américain standard."),
    h("div", { class: "card small" }, "ℹ️ Honnêteté : aucun service gratuit ne permet une vraie analyse phonétique fiable. L'application vous montre les mots que la reconnaissance vocale a compris, vous permet de comparer votre voix à la voix américaine, et vous donne des conseils ciblés. Aucune note inventée."),
    h("div", { class: "row wrap" }, sel), h("div", { class: "input-row" }, custom, btn("Travailler cette phrase", () => custom.value.trim() && draw(custom.value.trim()), "btn")),
    area);
  page.cleanup = () => clean?.();
  return page;
}
