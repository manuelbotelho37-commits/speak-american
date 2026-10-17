// Conversations : avec l'IA (Alex et les personnages) ou en dialogue guidé (sans IA, clairement indiqué)
import { h, btn, toast, modal, personalize, itemById, knownItems } from "./ui.js";
import { speak, stopSpeaking, listen, support, sttErrorFr, compareWords } from "./speech.js";
import { get, update, addError, logToday, setSkill, markDifficult } from "./store.js";
import { CHARACTERS, GUIDED, SITUATIONS } from "./content.js";
import { chat, summarize, aiStatus, aiErrorFr, checkAi } from "./ai.js";
import { dayInfo } from "./program.js";
import { currentDay } from "./store.js";

const LEVEL_FR = { debutant: "Débutant", intermediaire: "Intermédiaire", immersion: "Immersion" };
const LEVEL_DESC = { debutant: "Anglais lent avec aides françaises", intermediaire: "Anglais naturel avec aides ponctuelles", immersion: "Anglais américain naturel, sans traduction automatique" };

export function defaultLevel() {
  const st = get();
  if (st.settings.immersionChosen) return st.settings.immersion;
  const m = dayInfo(currentDay()).month;
  return m <= 2 ? "debutant" : m === 3 ? "intermediaire" : "immersion";
}

/*
  config : { kind: 'ai' | 'guided', character, situation, situationFr, guidedId, targetIds, mode: 'chat'|'journal', goal, onEnd(summary) }
*/
export function conversationView(config) {
  const st = get();
  // reprise d'une conversation en cours (rotation, rechargement, retour)
  let conv = st.conversation && st.conversation.key === convKey(config) ? st.conversation : null;
  if (!conv) {
    conv = { key: convKey(config), config: stripFns(config), level: config.level || defaultLevel(), history: [], step: 0, startedAt: Date.now(), activeSec: 0, turns: 0, helpUsed: false };
  }
  const isAI = config.kind === "ai";
  const guided = !isAI ? GUIDED[config.guidedId] : null;
  const charId = guided?.character || config.character || "alex";
  const ch = CHARACTERS[charId];
  const targets = (config.targetIds || []).map(itemById).filter(Boolean);
  let busy = false, handsFree = false, listener = null, lastUserText = "", noSpeech = 0, alive = true;
  let tick = setInterval(() => { if (!document.hidden && alive) { conv.activeSec += 5; } }, 5000);

  const persist = () => update(s => { s.conversation = conv; });
  persist();

  const list = h("div", { class: "chat-list", "aria-live": "polite" });
  const statusLine = h("div", { class: "chat-status", role: "status" });
  const sugBox = h("div", { class: "suggestions" });
  const input = h("input", { class: "chat-input", type: "text", placeholder: "Ou écrivez votre réponse en anglais…", "aria-label": "Votre réponse", enterkeyhint: "send" });
  input.addEventListener("keydown", e => { if (e.key === "Enter" && input.value.trim()) { const t = input.value.trim(); input.value = ""; userSays(t, false); } });
  const sendBtn = btn("➤", () => { const t = input.value.trim(); if (t) { input.value = ""; userSays(t, false); } }, "btn primary send-btn", { "aria-label": "Envoyer" });
  const micBtn = btn("", () => toggleMic(), "btn mic-btn");
  const levelSel = h("select", { class: "select", "aria-label": "Niveau", onChange: (e) => { conv.level = e.target.value; update(s => { s.settings.immersion = e.target.value; s.settings.immersionChosen = true; }); persist(); render(); toast(`Niveau : ${LEVEL_FR[conv.level]} — ${LEVEL_DESC[conv.level]}`); } },
    Object.entries(LEVEL_FR).map(([k, v]) => h("option", { value: k, selected: conv.level === k }, v)));

  function setStatus(t) { statusLine.textContent = t || ""; }
  function updateMic() {
    if (!support.stt) { micBtn.textContent = "🎤 Micro indisponible"; micBtn.disabled = true; return; }
    const hf = get().settings.handsFree;
    micBtn.textContent = handsFree ? "⏸ Mettre en pause" : (hf ? "🎤 COMMENCER À PARLER" : "🎤 Appuyer pour parler");
    micBtn.classList.toggle("live", handsFree);
  }

  function lastAssistant() { for (let i = conv.history.length - 1; i >= 0; i--) if (conv.history[i].role === "assistant") return conv.history[i]; return null; }
  function showFrDefault() { return conv.level === "debutant"; }

  function render() {
    list.replaceChildren(...conv.history.map((m, i) => bubble(m, i)));
    list.scrollTop = list.scrollHeight;
    const la = lastAssistant();
    sugBox.replaceChildren();
    const lastMsg = conv.history[conv.history.length - 1];
    if (la && lastMsg === la && la.suggestions?.length) { const cp = choicePanel(la); sugBox.append(cp); setTimeout(() => cp.scrollIntoView({ behavior: "smooth", block: "end" }), 60); }
    setTimeout(() => { list.scrollTop = list.scrollHeight; }, 30);
  }

  // 3 réponses proposées : on touche (vert / rouge en dialogue guidé), puis on la dit au micro.
  function choicePanel(la) {
    const sugs = la.suggestions.slice(0, 3);
    const box = h("div", { class: "choice-panel" });
    const say = h("div", {});
    const btns = sugs.map((sg, i) => h("button", { type: "button", class: "btn opt-btn", onClick: () => pick(i) },
      h("span", { class: "opt-en" }, "💬 ", sg.en), sg.fr ? h("small", { class: "opt-fr" }, sg.fr) : null));
    let tries = 0;
    const pick = (i) => {
      const sg = sugs[i];
      handsFree = false; try { listener?.abort?.(); } catch {} updateMic();
      btns.forEach(b => b.classList.remove("ok", "ko", "sel"));
      if (sugs.some(x => x.ok !== undefined)) { // dialogue guidé : une seule bonne réponse
        const good = sugs.findIndex(x => x.ok);
        btns[good].classList.add("ok");
        if (!sg.ok) { btns[i].classList.add("ko"); say.replaceChildren(h("div", { class: "wg-fb ko" }, "❌ Ce n'est pas la bonne réponse. Touchez celle en vert.")); speak(sugs[good].en, { rate: 0.85 }); return; }
      } else btns[i].classList.add("sel");
      conv.helpUsed = true;
      sayIt(sg.en);
    };
    const sayIt = async (text) => {
      say.replaceChildren(h("div", { class: "wg-hint" }, "🔊 Écoutez…"));
      try { await Promise.race([speak(text, { rate: 0.85 }), new Promise(r => setTimeout(r, 4000))]); } catch {}
      if (!alive || !box.isConnected) return;
      if (!support.stt) { say.replaceChildren(btn("➤ Envoyer cette réponse", () => userSays(text, false), "btn primary")); return; }
      say.replaceChildren(h("div", { class: "wg-hint live" }, "🎤 À vous ! Dites-la à voix haute…"));
      const r = await listenOnce();
      if (!alive || !box.isConnected) return;
      if (!r) { say.replaceChildren(btn("🎤 Je la dis", () => sayIt(text), "btn primary"), btn("➤ Envoyer sans parler", () => userSays(text, false), "btn ghost")); return; }
      if (!r.text) { say.replaceChildren(h("div", { class: "wg-hint" }, "⏸ Je vous attends. Touchez le micro quand vous êtes prêt."), h("div", { class: "row wrap" }, btn("🎤 Je la dis", () => sayIt(text), "btn primary"), btn("➤ Envoyer sans parler", () => userSays(text, false), "btn ghost"))); return; }
      const cmp = compareWords(text, [r.text, ...(r.alternatives || [])]);
      const words = h("div", { class: "words big" }, cmp.words.map(w => h("span", { class: w.ok ? "w ok" : "w ko" }, w.w, " ")));
      if (cmp.total && cmp.ok / cmp.total >= 0.6) {
        say.replaceChildren(h("div", { class: "wg-fb ok" }, "✅ Bien dit !"), words);
        setTimeout(() => { if (alive) userSays(text, false); }, 900);
      } else {
        tries++;
        say.replaceChildren(h("div", { class: "wg-fb ko" }, "❌ Pas tout à fait. Les mots en rouge sont à redire."), words,
          h("div", { class: "row wrap" }, btn("🎤 Réessayer", () => sayIt(text), "btn primary"), tries >= 2 ? btn("➤ Envoyer quand même", () => userSays(text, false), "btn ghost") : null));
      }
    };
    box.append(h("div", { class: "choice-title" }, "👉 Touchez votre réponse, puis dites-la :"), h("div", { class: "opts" }, btns), say);
    return box;
  }

  function bubble(m, i) {
    if (m.role === "user") {
      return h("div", { class: "msg me" },
        h("div", { class: "bubble" }, m.text),
        m.correction?.needed ? h("div", { class: "correction" },
          h("div", { class: "eyebrow" }, "🧑‍🏫 Alex vous aide"),
          h("div", {}, h("s", { class: "muted" }, m.correction.original || m.text)),
          h("div", { class: "better" }, "✔ ", m.correction.better, " ", btn("🔊", () => speak(m.correction.better, { rate: 0.85 }), "icon-btn")),
          m.correction.explanation_fr ? h("div", { class: "small" }, m.correction.explanation_fr) : null,
          btn("🎤 Je répète la bonne version", () => repeatBetter(m.correction.better), "btn sm")) : null);
    }
    const frShown = m.frOpen ?? showFrDefault();
    return h("div", { class: "msg them" },
      h("div", { class: "avatar", style: { background: ch.color } }, ch.emoji),
      h("div", { class: "bubble" },
        h("div", { class: "who" }, ch.name),
        h("div", { class: "en" }, m.text),
        m.fr ? h("div", { class: "fr" + (frShown ? "" : " hidden") }, "🇫🇷 ", m.fr) : null,
        m.coach ? h("div", { class: "coach" }, "💡 ", m.coach) : null,
        h("div", { class: "msg-tools" },
          btn("🔊", () => speak(m.text, { charId }), "icon-btn", { "aria-label": "Répéter" }),
          btn("🐢", () => speak(m.text, { charId, rate: 0.65 }), "icon-btn", { "aria-label": "Plus lentement" }),
          m.fr ? btn("🇫🇷", () => { m.frOpen = !frShown; persist(); render(); }, "icon-btn", { "aria-label": "Traduire en français" }) : null)));
  }

  async function repeatBetter(text) {
    if (!support.stt) { speak(text); return; }
    await speak(text, { rate: 0.85 });
    setStatus("🎤 À vous : répétez la phrase…");
    try {
      const r = listen({ silenceMs: 1600 });
      const { text: heard, alternatives } = await r.promise;
      const cmp = compareWords(text, [heard, ...(alternatives || [])]);
      setStatus(cmp.ok === cmp.total ? "✅ Parfait, tous les mots reconnus !" : `${cmp.ok}/${cmp.total} mots reconnus. Réessayez quand vous voulez.`);
    } catch (e) { setStatus(sttErrorFr(e.code)); }
  }

  // ---------- Réponses du personnage ----------
  async function characterSays(m) {
    conv.history.push(m); conv.turns++; persist(); render();
    setStatus(`${ch.name} parle…`);
    await speak(m.text, { charId, rate: conv.level === "debutant" ? 0.85 : conv.level === "immersion" ? 1.0 : 0.95 });
    if (!alive) return;
    setStatus(handsFree ? "" : "À vous ! Appuyez sur le micro ou écrivez.");
  }

  async function aiTurn(action) {
    if (busy) return; busy = true;
    setStatus(`${ch.name} réfléchit…`);
    try {
      const history = conv.history.map(m => ({ role: m.role, text: m.text }));
      const r = await chat({ character: charId, situation: config.situation, level: conv.level, month: dayInfo(currentDay()).month, day: currentDay(), knownWords: knownItems().map(i => i.en), history, action, targetWords: targets.map(t => t.en), mode: config.mode || "chat" });
      // correction de la dernière phrase de l'apprenant
      const lastUser = [...conv.history].reverse().find(m => m.role === "user");
      if (lastUser && r.correction?.needed) {
        lastUser.correction = r.correction;
        addError({ original: r.correction.original || lastUser.text, better: r.correction.better, explanation: r.correction.explanation_fr });
      }
      if (lastUser && r.used_words?.length) markUsedWords(r.used_words, lastUser.helped);
      busy = false;
      await characterSays({ role: "assistant", text: r.reply, fr: r.reply_fr, suggestions: r.suggestions, coach: r.coach_fr, showSug: action === "help_answer" });
    } catch (e) {
      busy = false;
      setStatus("");
      showError(e.code);
      handsFree = false; updateMic();
    }
  }

  function markUsedWords(words, helped) {
    const low = words.map(w => w.toLowerCase());
    for (const t of targets.concat(knownItems())) {
      const en = t.en.toLowerCase().replace(/[.…!?]/g, "").trim();
      if (low.some(w => w.includes(en) || en.includes(w))) setSkill(t.id, helped ? "usedHelp" : "usedSpont");
    }
  }

  function showError(code) {
    const el = h("div", { class: "msg system" }, h("div", { class: "bubble warn" }, "⚠️ ", aiErrorFr(code), " ",
      btn("Réessayer", () => { el.remove(); aiTurn(conv.history.length ? undefined : "start"); }, "btn sm")));
    list.append(el); list.scrollTop = list.scrollHeight;
  }

  // ---------- Dialogue guidé (sans IA) ----------
  function guidedChoices(step) {
    const good = { en: personalize(step.sug), fr: personalize(step.sugFr), ok: true };
    const others = Object.values(GUIDED).flatMap(g => g.steps).filter(x => x.sug && !step.keys.some(k => x.sug.toLowerCase().includes(k)));
    const uniq = [...new Map(others.map(x => [x.sug, x])).values()].sort(() => Math.random() - 0.5).slice(0, 2);
    return [good, ...uniq.map(x => ({ en: personalize(x.sug), fr: personalize(x.sugFr), ok: false }))].sort(() => Math.random() - 0.5);
  }
  async function guidedNext() {
    const step = guided.steps[conv.step];
    if (!step) { await characterSays({ role: "assistant", text: "That's it! Great job!", fr: "C'est fini ! Bravo !" }); setStatus("Dialogue terminé. Appuyez sur TERMINER ou recommencez."); handsFree = false; updateMic(); return; }
    await characterSays({ role: "assistant", text: personalize(step.en), fr: personalize(step.fr), suggestions: guidedChoices(step) });
  }
  async function guidedAnswer(text) {
    const step = guided.steps[conv.step];
    if (!step) return;
    const t = text.toLowerCase();
    const ok = step.keys.some(k => t.includes(k));
    const last = conv.history[conv.history.length - 1];
    if (ok) {
      for (const it of targets) if (t.includes(it.en.toLowerCase().replace(/[.…!?]/g, "").trim())) setSkill(it.id, "usedHelp");
      conv.step++; persist();
      await guidedNext();
    } else {
      last.correction = { needed: true, original: text, better: personalize(step.sug), explanation_fr: "Réponse inattendue pour ce dialogue préparé. Voici une réponse possible : écoutez-la et répétez-la." };
      persist(); render();
      setStatus("Essayez la réponse proposée, ou dites autre chose.");
    }
  }

  // ---------- L'apprenant parle ----------
  async function userSays(text, fromVoice = true) {
    if (!text) return;
    stopSpeaking();
    const cmd = voiceCommand(text);
    if (fromVoice && cmd) return runAction(cmd);
    lastUserText = text;
    conv.history.push({ role: "user", text, helped: conv.helpUsed });
    conv.helpUsed = false;
    const la = lastAssistant(); if (la) la.showSug = false;
    persist(); render();
    if (isAI) await aiTurn(); else await guidedAnswer(text);
  }

  function voiceCommand(t) {
    const s = t.toLowerCase().replace(/[^a-z ]/g, "").trim();
    if (/^(repeat|repeat please|say it again|again)$/.test(s)) return "repeat";
    if (/^(slower|slowly|slower please|slowly please|more slowly)$/.test(s)) return "slower";
    if (/^(translate|translation|translate please|in french)$/.test(s)) return "translate";
    if (/^(help|help me|help please)$/.test(s)) return "help";
    return null;
  }

  async function listenOnce() {
    if (!support.stt) return null;
    setStatus("🎤 Je vous écoute… parlez quand vous voulez, je patiente jusqu'à la fin.");
    micBtn.classList.add("listening");
    try {
      listener = listen({ onInterim: (t) => setStatus("🎤 « " + t + " »") });
      const r = await listener.promise;
      return r;
    } catch (e) {
      handsFree = false; updateMic();
      setStatus(sttErrorFr(e.code));
      if (e.code === "not-allowed" || e.code === "audio-capture") toast(sttErrorFr(e.code), 6000);
      return null;
    } finally { listener = null; micBtn.classList.remove("listening"); }
  }

  async function handsFreeLoop() {
    while (handsFree && alive) {
      if (busy) { await new Promise(r => setTimeout(r, 300)); continue; }
      const r = await listenOnce();
      if (!handsFree || !alive) break;
      if (!r) break;
      if (!r.text) {
        // Pas de réponse : on ne rallume PAS le micro en boucle. On attend tranquillement que la personne soit prête.
        handsFree = false; updateMic();
        setStatus("⏸ Je vous attends. Prenez votre temps, puis appuyez sur 🎤 quand vous êtes prêt à répondre.");
        break;
      }
      noSpeech = 0;
      await userSays(r.text, true);
    }
  }

  async function toggleMic() {
    stopSpeaking();
    if (!get().settings.handsFree) {
      // mode simple : une phrase par appui
      const r = await listenOnce();
      if (r?.text) userSays(r.text, true); else if (r) setStatus("Je n'ai rien entendu. Réessayez.");
      return;
    }
    if (handsFree) { handsFree = false; listener?.abort?.(); updateMic(); setStatus("En pause."); return; }
    handsFree = true; noSpeech = 0; updateMic();
    if (!conv.history.length) { if (isAI) await aiTurn("start"); else await guidedNext(); }
    handsFreeLoop();
  }

  // ---------- Boutons d'assistance ----------
  async function runAction(a) {
    const la = lastAssistant();
    if (a === "repeat") { if (la) speak(la.text, { charId }); return; }
    if (a === "slower") { if (la) speak(la.text, { charId, rate: 0.6 }); return; }
    if (a === "translate") { if (la) { la.frOpen = true; persist(); render(); } return; }
    if (a === "help") {
      if (!la) return;
      conv.helpUsed = true;
      if (isAI && !la.suggestions?.length) return aiTurn("help_answer");
      la.showSug = true; persist(); render(); return;
    }
    if (a === "not_understood") {
      if (!la) return;
      la.frOpen = true; persist(); render();
      if (isAI) return aiTurn("not_understood");
      speak(la.text, { charId, rate: 0.6 }); return;
    }
    if (a === "correct") {
      const lu = [...conv.history].reverse().find(m => m.role === "user");
      if (!lu) { toast("Dites d'abord une phrase."); return; }
      return aiTurn("correct");
    }
    if (a === "continue") return isAI ? aiTurn("continue") : guidedNext();
    if (a === "end") return end();
  }

  async function end() {
    handsFree = false; listener?.abort?.(); stopSpeaking(); alive = false; clearInterval(tick);
    const userTurns = conv.history.filter(m => m.role === "user").length;
    logToday(l => { l.convSec = (l.convSec || 0) + conv.activeSec; if (userTurns) l.convCount = (l.convCount || 0) + 1; });
    let summary = null;
    if (isAI && userTurns >= 2) {
      const m = modal("Bilan de la conversation", h("p", {}, "Alex prépare un petit bilan…"));
      try {
        summary = await summarize({ character: charId, situation: config.situation, level: conv.level, history: conv.history.map(x => ({ role: x.role, text: x.text })) });
        m.close();
        for (const w of summary.review_words || []) {
          const it = knownItems().find(k => k.en.toLowerCase().includes(w.toLowerCase()) || w.toLowerCase().includes(k.en.toLowerCase().replace(/[.…!?]/g, "")));
          if (it) markDifficult(it.id, true);
        }
        showSummary(summary, userTurns);
      } catch (e) { m.close(); toast("Bilan indisponible : " + aiErrorFr(e.code)); }
    }
    update(s => { s.conversation = null; });
    config.onEnd?.({ userTurns, seconds: conv.activeSec, summary });
  }

  function showSummary(s, turns) {
    modal("Bilan de la conversation", h("div", {},
      h("p", {}, `Vous avez parlé ${turns} fois. `, s.summary_fr),
      s.strengths_fr?.length ? h("div", {}, h("h4", {}, "👍 Points forts"), h("ul", {}, s.strengths_fr.map(x => h("li", {}, x)))) : null,
      s.improve_fr?.length ? h("div", {}, h("h4", {}, "🎯 À améliorer"), h("ul", {}, s.improve_fr.map(x => h("li", {}, x)))) : null,
      s.errors?.length ? h("div", {}, h("h4", {}, "✏️ Corrections"), s.errors.map(e => h("p", {}, h("s", { class: "muted" }, e.original), " → ", h("b", {}, e.better), " ", btn("🔊", () => speak(e.better), "icon-btn"), h("br"), h("small", {}, e.explanation_fr)))) : null,
      s.review_words?.length ? h("p", { class: "small" }, "À revoir : ", s.review_words.join(", "), " (ajoutés à vos révisions si ce sont des mots déjà vus).") : null),
      [{ label: "Fermer", cls: "btn primary" }]);
  }

  const assists = [
    ["🔁 RÉPÈTE", "repeat"], ["🐢 PLUS LENTEMENT", "slower"], ["🇫🇷 TRADUIS EN FRANÇAIS", "translate"],
    ["🤔 JE N'AI PAS COMPRIS", "not_understood"], ["🆘 AIDE-MOI À RÉPONDRE", "help"],
    isAI ? ["✏️ CORRIGE MA PHRASE", "correct"] : null, ["➡️ CONTINUE LA CONVERSATION", "continue"], ["🏁 TERMINER", "end"],
  ].filter(Boolean);

  const head = h("div", { class: "chat-head" },
    h("div", { class: "avatar big", style: { background: ch.color } }, ch.emoji),
    h("div", { class: "grow" }, h("div", { class: "who" }, ch.name, " · ", h("span", { class: "muted" }, ch.role)),
      h("div", { class: "small" }, config.situationFr || config.situation || "")),
    h("label", { class: "small level-pick" }, "Niveau ", levelSel));

  const banner = isAI
    ? (aiStatus.state === "ok" ? null : h("div", { class: "banner" }, "Connexion à l'IA en cours de vérification…"))
    : h("div", { class: "banner" }, "📘 Dialogue guidé : les répliques sont préparées à l'avance (pas d'IA). Idéal pour s'entraîner sans Internet.");

  const goal = config.goal ? h("div", { class: "goal small" }, "🎯 ", config.goal, " Continuez autant que vous voulez : rien ne s'arrête tout seul.") : null;
  const targetsBox = targets.length ? h("div", { class: "targets small" }, "Mots à placer : ", targets.map(t => h("span", { class: "tag" }, t.en))) : null;

  const root = h("div", { class: "chat" }, head, banner, goal, targetsBox, list, sugBox, statusLine,
    h("div", { class: "chat-controls" }, micBtn, h("div", { class: "input-row" }, input, sendBtn)),
    h("div", { class: "assist" }, assists.map(([l, a]) => btn(l, () => runAction(a), a === "end" ? "btn assist-btn end" : "btn assist-btn"))));

  root.cleanup = () => { const wasAlive = alive; alive = false; handsFree = false; clearInterval(tick); listener?.abort?.(); stopSpeaking(); if (wasAlive) persist(); };

  updateMic(); render();
  if (isAI && aiStatus.state !== "ok") checkAi().then(s => { if (banner) { if (s.state === "ok") banner.remove(); else banner.replaceChildren("⚠️ ", aiErrorFr(s.state === "badcode" ? "badcode" : "not_configured"), " En attendant, utilisez un dialogue guidé (onglet Dialogues)."); } });
  if (!conv.history.length) {
    setStatus(support.stt ? "Appuyez sur « COMMENCER À PARLER » : " + ch.name + " commence." : "La reconnaissance vocale n'est pas disponible ici : écrivez vos réponses. " + ch.name + " vous parlera à voix haute.");
    if (!support.stt) setTimeout(() => (isAI ? aiTurn("start") : guidedNext()), 300);
  } else setStatus("Conversation reprise là où vous l'aviez laissée.");
  return root;
}

function convKey(c) { return [c.kind, c.character || "", c.guidedId || "", c.situation || "", c.lessonDay || "", c.mode || ""].join("|"); }
function stripFns(c) { const o = { ...c }; delete o.onEnd; return o; }

// ---------- Pages ----------
export function talkPage(nav) {
  const day = dayInfo(currentDay());
  return h("div", { class: "page" },
    h("h1", {}, "🎤 Parler"),
    h("p", { class: "lead" }, "Choisissez avec qui parler. Alex vous aide à chaque instant."),
    h("div", { class: "grid cards" },
      bigChoice("🧑‍🏫", "Parler avec Alex", `Sujet du jour : ${day.title}`, () => nav.openConversation({ kind: "ai", character: "alex", situation: `Today's lesson topic: ${day.title} — ${day.objective}`, situationFr: day.title })),
      bigChoice("📔", "Mon journal", "Racontez votre journée en anglais. Alex vous pose des questions.", () => nav.openConversation({ kind: "ai", character: "alex", mode: "journal", situation: "The learner tells you about their day, work, home, plans, hobbies, trips, friends or habits.", situationFr: "Mon journal de conversation" })),
      bigChoice("🇺🇸", "Je suis en Amérique", "Aéroport, hôtel, restaurant… des situations réelles.", () => nav.go("amerique")),
      bigChoice("💬", "Dialogues et personnages", "Sarah, Michael, Jessica, David, Emily, James.", () => nav.go("dialogues"))),
    journalFacts());
}

function journalFacts() {
  const st = get();
  const box = h("div", { class: "card" },
    h("h3", {}, "🔒 Ce qu'Alex peut retenir sur moi"),
    h("p", { class: "small" }, "Pour personnaliser les conversations, vous pouvez noter quelques informations (métier, loisirs, projets…). Elles restent sur cet appareil et ne sont envoyées à l'IA que si vous cochez la case. N'écrivez rien de sensible."),
    h("label", { class: "check" }, h("input", { type: "checkbox", checked: st.profile.consentFacts, onChange: e => update(s => { s.profile.consentFacts = e.target.checked; }) }), " J'accepte qu'Alex utilise ces informations"),
    h("ul", { class: "facts" }, st.profile.facts.map((f, i) => h("li", {}, f, " ", btn("✕", () => { update(s => { s.profile.facts.splice(i, 1); }); box.replaceWith(journalFacts()); }, "icon-btn", { "aria-label": "Supprimer" })))));
  const inp = h("input", { class: "chat-input", placeholder: "Ex. : I work in a bank. / J'aime le vélo.", maxlength: 120 });
  box.append(h("div", { class: "input-row" }, inp, btn("Ajouter", () => { const v = inp.value.trim(); if (!v) return; update(s => { s.profile.facts = [...s.profile.facts, v].slice(-12); }); box.replaceWith(journalFacts()); }, "btn")));
  return box;
}

function bigChoice(emoji, title, sub, onClick) {
  return h("button", { class: "card choice", type: "button", onClick }, h("div", { class: "choice-emoji" }, emoji), h("div", {}, h("div", { class: "choice-title" }, title), h("div", { class: "small muted" }, sub)));
}

export function dialoguesPage(nav) {
  const cd = currentDay();
  return h("div", { class: "page" },
    h("h1", {}, "💬 Dialogues"),
    h("p", { class: "lead" }, "Choisissez un personnage. Avec l'IA, la conversation s'adapte librement à vos réponses."),
    h("div", { class: "grid chars" }, Object.entries(CHARACTERS).map(([id, c]) =>
      h("div", { class: "card char" },
        h("div", { class: "avatar big", style: { background: c.color } }, c.emoji),
        h("h3", {}, c.name), h("div", { class: "muted small" }, c.role), h("p", { class: "small" }, c.desc),
        btn("🎙 Parler avec " + c.name, () => pickSituation(nav, id), "btn primary")))),
    h("h2", {}, "📘 Dialogues guidés (sans IA)"),
    h("p", { class: "small muted" }, "Répliques préparées à l'avance : utiles hors connexion ou pour se rassurer."),
    h("div", { class: "grid cards" }, Object.entries(GUIDED).map(([id, g]) =>
      h("button", { class: "card choice" + (g.minDay > cd ? " later" : ""), type: "button", onClick: () => nav.openConversation({ kind: "guided", guidedId: id, situationFr: g.title }) },
        h("div", { class: "choice-emoji" }, CHARACTERS[g.character].emoji),
        h("div", {}, h("div", { class: "choice-title" }, g.title), h("div", { class: "small muted" }, g.minDay > cd ? `Prévu vers le jour ${g.minDay}` : "Disponible"))))));
}

function pickSituation(nav, charId) {
  const opts = SITUATIONS.filter(s => s.character === charId);
  const c = CHARACTERS[charId];
  const free = h("input", { class: "chat-input", placeholder: "Ou décrivez une situation (en français ou en anglais)", maxlength: 200 });
  const m = modal(`Parler avec ${c.name}`, h("div", {},
    h("div", { class: "grid cards" },
      btn("💬 Conversation libre", () => { m.close(); nav.openConversation({ kind: "ai", character: charId, situation: `Free conversation with ${c.name}.`, situationFr: "Conversation libre" }); }, "btn"),
      opts.map(s => btn(`${s.emoji} ${s.fr}`, () => { m.close(); nav.openConversation({ kind: "ai", character: charId, situation: s.en, situationFr: s.fr }); }, "btn"))),
    h("div", { class: "input-row" }, free, btn("Lancer", () => { const v = free.value.trim(); if (!v) return; m.close(); nav.openConversation({ kind: "ai", character: charId, situation: v, situationFr: v }); }, "btn primary"))));
}

export function americaPage(nav) {
  const st = get();
  let level = st.settings.immersionChosen ? st.settings.immersion : defaultLevel();
  const levels = h("div", { class: "seg", role: "radiogroup", "aria-label": "Niveau" });
  const drawLevels = () => levels.replaceChildren(...Object.entries(LEVEL_FR).map(([k, v]) => h("button", { type: "button", role: "radio", "aria-checked": String(level === k), class: "seg-btn" + (level === k ? " on" : ""), onClick: () => { level = k; update(s => { s.settings.immersion = k; s.settings.immersionChosen = true; }); drawLevels(); } }, h("b", {}, v), h("small", {}, LEVEL_DESC[k]))));
  drawLevels();
  return h("div", { class: "page" },
    h("h1", {}, "🇺🇸 JE SUIS EN AMÉRIQUE"),
    h("p", { class: "lead" }, "Choisissez une situation : un personnage vous parle en anglais américain et la conversation évolue librement selon vos réponses."),
    levels,
    h("div", { class: "grid situations" }, SITUATIONS.map(s => h("button", { type: "button", class: "card situation", onClick: () => nav.openConversation({ kind: "ai", character: s.character, situation: s.en, situationFr: s.fr, level }) },
      h("div", { class: "choice-emoji" }, s.emoji), h("div", { class: "choice-title" }, s.fr), h("div", { class: "small muted" }, "avec " + CHARACTERS[s.character].name)))),
    h("p", { class: "small muted" }, "Ce mode utilise l'IA (connexion Internet nécessaire). Vous pouvez changer de niveau à tout moment, même pendant la conversation."));
}
