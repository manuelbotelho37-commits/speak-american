// SPEAK AMERICAN — application principale : navigation, accueil, premier lancement, programme, progrès, réglages
import { h, btn, toast, modal, confirmBox, pct, fmtMin, listenBtns, itemById, knownItems, needsContent, itemsForDay } from "./ui.js";
import { get, update, save, subscribe, currentDay, dayState, dueIds, daysSinceLastActivity, exportData, importData, wipeAll, requestPersistence, masteredIds, studiedIds, todayKey } from "./store.js";
import { speak, stopSpeaking, support, voicesReady, usVoices, testMicrophone, listen, compareWords, sttErrorFr } from "./speech.js";
import { PROGRAM, MONTHS, dayInfo } from "./program.js";
import { PLACEMENT, CHARACTERS, SOUNDS, CEFR } from "./content.js";
import { checkAi, aiStatus, onAiStatus } from "./ai.js";
import { conversationView, talkPage, dialoguesPage, americaPage } from "./talk.js";
import { lessonPage, reviewSession, vocabPage, memoryPage, gamesPage, listenPage, pronPage, STEPS, PLAN, evaluationView } from "./learn.js";
import { isMastered } from "./srs.js";

// Curseur de vitesse de la voix (réglage global, les boutons « Lentement » ralentissent encore plus)
function speedSlider() {
  const st = get().settings;
  const out = h("span", { class: "small muted" }, Math.round((st.speed ?? 0.8) * 100) + " %");
  const inp = h("input", { type: "range", min: 0.4, max: 1.2, step: 0.05, value: st.speed ?? 0.8, "aria-label": "Vitesse de la voix",
    onChange: e => { const v = Number(e.target.value); update(x => { x.settings.speed = v; }); out.textContent = Math.round(v * 100) + " %"; speak("Hi! This is my speed.", { charId: "alex" }); } });
  return h("div", { class: "row" }, "🐢", inp, "🐇", out);
}

const TABS = [
  ["home", "🏠", "Accueil"], ["parler", "🎤", "Parler"], ["ecouter", "🎧", "Écouter"], ["prononciation", "👄", "Prononciation"],
  ["vocabulaire", "📖", "Vocabulaire"], ["dialogues", "💬", "Dialogues"], ["amerique", "🇺🇸", "Je suis en Amérique"], ["memoire", "🧠", "Mémoire"],
  ["jeux", "🎲", "Jeux"], ["programme", "🗓️", "Mon programme"], ["progres", "📈", "Mes progrès"], ["reglages", "⚙️", "Réglages"],
];
const MOBILE_TABS = ["home", "parler", "memoire", "progres"];

const main = document.getElementById("main");
let currentView = null;

// ---------- Navigation ----------
export const nav = {
  go(route, arg) { location.hash = "#/" + route + (arg != null ? "/" + arg : ""); },
  openConversation(config) { update(s => { s.pendingConv = config; }); nav.go("conversation"); },
  reviewNow() { nav.go("revision"); },
};

function render() {
  stopSpeaking();
  document.querySelectorAll(".modal-wrap").forEach(m => m.remove());
  if (currentView?.cleanup) { try { currentView.cleanup(); } catch {} }
  const st = get();
  const [route, arg] = location.hash.replace(/^#\/?/, "").split("/");
  if (!st.profile.placementDone && route !== "onboarding") { location.replace("#/onboarding"); return; }
  const r = route || "home";
  let view;
  switch (r) {
    case "onboarding": view = onboardingPage(); break;
    case "home": view = homePage(); break;
    case "lecon": view = lessonPage(Number(arg) || currentDay(), nav); break;
    case "parler": view = talkPage(nav); break;
    case "conversation": view = conversationPage(); break;
    case "dialogues": view = dialoguesPage(nav); break;
    case "amerique": view = americaPage(nav); break;
    case "ecouter": view = listenPage(nav); break;
    case "prononciation": view = pronPage(nav, arg); break;
    case "vocabulaire": view = vocabPage(nav); break;
    case "memoire": view = memoryPage(nav); break;
    case "revision": view = revisionPage(); break;
    case "jeux": view = gamesPage(nav); break;
    case "programme": view = programPage(); break;
    case "progres": view = progressPage(); break;
    case "reglages": view = settingsPage(); break;
    case "plus": view = morePage(); break;
    default: view = homePage();
  }
  currentView = view;
  main.replaceChildren(view);
  main.focus({ preventScroll: true });
  window.scrollTo(0, 0);
  drawNav(r);
}

function drawNav(active) {
  const side = document.getElementById("sidenav");
  side.replaceChildren(h("div", { class: "brand" }, h("span", { class: "flag" }, "🇺🇸"), h("span", {}, "SPEAK", h("br"), "AMERICAN")),
    ...TABS.map(([k, e, l]) => h("a", { href: "#/" + k, class: "nav-item" + (k === active ? " on" : ""), "aria-current": k === active ? "page" : null }, h("span", { class: "nav-ico" }, e), h("span", {}, l))),
    h("div", { class: "ai-pill " + aiStatus.state, title: "État de la connexion à l'IA" }, aiLabel()));
  const bottom = document.getElementById("bottomnav");
  bottom.replaceChildren(...MOBILE_TABS.map(k => { const t = TABS.find(x => x[0] === k); return h("a", { href: "#/" + k, class: "bn-item" + (k === active ? " on" : "") }, h("span", { class: "nav-ico" }, t[1]), h("span", {}, t[2])); }),
    h("a", { href: "#/plus", class: "bn-item" + (!MOBILE_TABS.includes(active) ? " on" : "") }, h("span", { class: "nav-ico" }, "☰"), h("span", {}, "Plus")));
  document.body.classList.toggle("onboarding", active === "onboarding");
}
const aiLabel = () => ({ ok: "🟢 Alex connecté (IA)", off: "⚪ IA non configurée", badcode: "🔴 Code d'accès incorrect", error: "🟠 IA indisponible", unknown: "⏳ Vérification de l'IA…" })[aiStatus.state];
onAiStatus(() => { const p = document.querySelector(".ai-pill"); if (p) { p.className = "ai-pill " + aiStatus.state; p.textContent = aiLabel(); } });

function morePage() {
  return h("div", { class: "page" }, h("h1", {}, "Toutes les rubriques"),
    h("div", { class: "grid more" }, TABS.map(([k, e, l]) => h("a", { href: "#/" + k, class: "card more-item" }, h("span", { class: "choice-emoji" }, e), h("span", { class: "choice-title" }, l)))));
}

// ---------- ACCUEIL ----------
function greeting() { const hr = new Date().getHours(); return hr < 12 ? "GOOD MORNING!" : hr < 18 ? "GOOD AFTERNOON!" : "GOOD EVENING!"; }

function homePage() {
  const st = get();
  const cd = currentDay();
  const info = dayInfo(cd);
  const ds = dayState(cd);
  const doneDays = Object.values(st.program.days).filter(d => d.done).length;
  const due = dueIds().length;
  const away = daysSinceLastActivity();
  const ch = CHARACTERS[info.character];
  const stepsDone = STEPS.filter(([k]) => ds.steps[k] || (k === "new" && info.review)).length;
  const items = STEPS.map(([k, l]) => {
    const done = ds.steps[k] || (k === "new" && info.review);
    const label = k === "new" ? (info.review ? "Jour de bilan : pas de nouveaux mots" : `Apprendre ${Math.min(PLAN[st.settings.duration].newMax, st.settings.newPerSession)} nouveaux mots`) : k === "conv" ? `Parler avec ${ch.name}` : k === "revision" ? `Réviser mes expressions${due ? ` (${due})` : ""}` : l;
    return h("li", { class: done ? "done" : "" }, h("span", { class: "box", "aria-hidden": "true" }, done ? "☑" : "☐"), " ", label);
  });
  const last = st.program.last;
  const startLabel = stepsDone > 0 && !ds.done ? "CONTINUER MA LEÇON" : ds.done ? "SÉANCE DU JOUR TERMINÉE ✓" : "COMMENCER MA LEÇON";
  const streak = Object.keys(st.log).filter(k => st.log[k].minutes > 0 || st.log[k].reviews > 0).length;
  return h("div", { class: "page home" },
    h("div", { class: "hero" },
      h("div", { class: "hello" }, greeting()),
      h("p", {}, `Bienvenue${st.profile.name ? ", " + st.profile.name : ""} dans SPEAK AMERICAN.`),
      h("div", { class: "day-big" }, `JOUR ${cd} / 120`),
      h("div", { class: "bar", role: "progressbar", "aria-valuenow": pct(doneDays, 120), "aria-valuemin": 0, "aria-valuemax": 100 }, h("span", { style: { width: pct(doneDays, 120) + "%" } })),
      h("div", { class: "small" }, `Progression : ${pct(doneDays, 120)} % (${doneDays} séance${doneDays > 1 ? "s" : ""} terminée${doneDays > 1 ? "s" : ""})`)),
    away != null && away >= 3 ? h("div", { class: "card welcome-back" }, h("b", {}, "Content de vous revoir ! 👋"), h("p", { class: "small" }, `Cela fait ${away} jours. Aucun souci : on commence par une petite révision pour réveiller la mémoire.`), due ? btn("🔁 Petite révision de reprise", () => nav.reviewNow(), "btn primary") : null) : null,
    h("div", { class: "card today" },
      h("div", { class: "eyebrow" }, "Aujourd'hui"),
      h("h2", {}, info.title.toUpperCase()),
      h("div", { class: "small muted" }, `Durée prévue : ${st.settings.duration} minutes · ${info.objective}`),
      h("h3", {}, "Ma séance"),
      h("ul", { class: "checklist" }, items),
      btn(startLabel, () => nav.go("lecon", cd), "btn huge primary", { disabled: ds.done && cd === 120 }),
      !ds.done ? h("p", { class: "small muted" }, "⏱ Pas beaucoup de temps ? Faites une seule étape (5 à 10 minutes) et revenez plus tard : tout est gardé, l'application reprend où vous vous êtes arrêté.") : null,
      ds.done && cd < 120 ? h("p", { class: "small muted" }, "La séance suivante est prête quand vous voulez (idéalement demain).") : null),
    h("div", { class: "simple3" },
      btn(h("span", {}, "▶️", h("br"), "CONTINUER MA LEÇON"), () => nav.go("lecon", cd), "btn big3"),
      btn(h("span", {}, "🎤", h("br"), "PARLER AVEC ALEX"), () => nav.openConversation({ kind: "ai", character: "alex", situation: `Today's lesson topic: ${info.title} — ${info.objective}`, situationFr: info.title }), "btn big3"),
      btn(h("span", {}, "🔁", h("br"), `RÉVISER MES MOTS${due ? ` (${due})` : ""}`), () => due ? nav.reviewNow() : nav.go("vocabulaire"), "btn big3")),
    h("div", { class: "card small muted" }, `🗓️ ${streak} jour${streak > 1 ? "s" : ""} d'entraînement au total · ${studiedIds().length} mots étudiés · ${masteredIds().length} bien retenus`));
}

function revisionPage() {
  const ids = dueIds().slice(0, 30);
  const box = h("div", {});
  if (!ids.length) box.append(h("div", { class: "card" }, h("p", {}, "Rien à réviser pour l'instant. 👍"), btn("Retour à l'accueil", () => nav.go("home"), "btn primary")));
  else box.append(reviewSession(ids, ({ done, good }) => box.replaceChildren(h("div", { class: "card" }, h("h3", {}, "Révision terminée"), h("p", {}, `${done} cartes revues, ${good} bien retenues.`), btn("Retour à l'accueil", () => nav.go("home"), "btn primary")))));
  return h("div", { class: "page" }, h("h1", {}, "🔁 Réviser mes mots"), h("p", { class: "lead" }, "Courte et efficace : les mots oubliés reviennent plus souvent."), box);
}

function conversationPage() {
  const st = get();
  const cfg = st.pendingConv || st.conversation?.config;
  if (!cfg) { setTimeout(() => nav.go("parler")); return h("div"); }
  const v = conversationView({ ...cfg, onEnd: () => { update(s => { s.pendingConv = null; }); setTimeout(() => nav.go("parler"), 50); } });
  const page = h("div", { class: "page conv-page" }, v);
  page.cleanup = v.cleanup;
  return page;
}

// ---------- PREMIER LANCEMENT ----------
function onboardingPage() {
  const st = get();
  let step = st.profile.obStep || 1;
  const box = h("div", { class: "card onboarding-card" });
  const setStep = (n) => { step = n; update(s => { s.profile.obStep = n; }); draw(); };
  const placement = { listening: 0, speaking: [], self: null };
  const draw = () => {
    const dots = h("div", { class: "progress-dots" }, `Étape ${Math.min(step, 7)} / 7`);
    if (step === 1) {
      const name = h("input", { class: "chat-input", placeholder: "Votre prénom (facultatif)", value: get().profile.name, maxlength: 30, "aria-label": "Prénom" });
      box.replaceChildren(dots, h("div", { class: "emoji-big" }, "🇺🇸"), h("h1", {}, "Bienvenue dans SPEAK AMERICAN"),
        h("p", { class: "lead" }, "Votre coach pour apprendre à parler et comprendre l'anglais américain, à votre rythme, en 120 séances."),
        h("p", {}, "Comment vous appelez-vous ?"), name,
        btn("Commencer ➜", () => { update(s => { s.profile.name = name.value.trim(); }); setStep(2); }, "btn huge primary"));
    }
    if (step === 2) box.replaceChildren(dots, h("h2", {}, "Comment ça marche ?"),
      h("ol", { class: "explain" },
        h("li", {}, "Chaque jour, une séance courte (30 minutes par défaut) : révision, 5 mots, conversation, prononciation, petit test."),
        h("li", {}, "Vous écoutez, vous répétez, vous parlez : la grammaire arrive seulement quand elle est utile."),
        h("li", {}, "L'application se souvient de vos difficultés et fait revenir les mots au bon moment.")),
      h("p", { class: "small muted" }, "Vos progrès sont enregistrés sur cet appareil. Rien n'est vendu, aucune publicité."),
      btn("Suivant ➜", () => setStep(3), "btn huge primary"));
    if (step === 3) {
      const res = h("div", { class: "small", "aria-live": "polite" });
      box.replaceChildren(dots, h("h2", {}, "🎤 Vérifions le micro"),
        h("p", {}, "Le navigateur va vous demander l'autorisation d'utiliser le micro. Répondez « Autoriser »."),
        h("p", { class: "small muted" }, support.stt ? "La reconnaissance vocale de Chrome/Edge envoie le son à Google ou Microsoft pour le transformer en texte. Vos enregistrements ne sont pas conservés par SPEAK AMERICAN." : "⚠️ Ce navigateur ne sait pas reconnaître la voix. Pour parler avec Alex, utilisez Google Chrome (téléphone ou ordinateur) ou Microsoft Edge (ordinateur)."),
        btn("🎤 Tester le micro", async () => {
          res.textContent = "Autorisation…";
          try {
            await testMicrophone();
            if (!support.stt) { res.textContent = "✅ Micro autorisé. (Reconnaissance vocale indisponible sur ce navigateur.)"; return; }
            res.textContent = "✅ Micro autorisé. Dites maintenant : « Hello! »";
            const r = await listen({ silenceMs: 1500, maxMs: 10000 }).promise;
            res.textContent = r.text ? `✅ J'ai entendu : « ${r.text} ». Parfait !` : "Je n'ai rien entendu. Rapprochez-vous et réessayez.";
          } catch (e) { res.textContent = e.name === "NotAllowedError" ? sttErrorFr("not-allowed") : sttErrorFr(e.code); }
        }, "btn huge"), res,
        h("div", { class: "row wrap" }, btn("Suivant ➜", () => setStep(4), "btn primary"), btn("Passer", () => setStep(4), "btn ghost")));
    }
    if (step === 4) {
      const sel = h("select", { class: "select", "aria-label": "Voix d'Alex" });
      voicesReady().then(() => {
        const vs = usVoices();
        sel.replaceChildren(...(vs.length ? vs.map(v => h("option", { value: v.voiceURI, selected: v.voiceURI === get().settings.voiceURI }, v.name)) : [h("option", {}, "Voix américaine par défaut")]));
      });
      sel.addEventListener("change", () => update(s => { s.settings.voiceURI = sel.value; }));
      box.replaceChildren(dots, h("h2", {}, "🔊 Voici Alex, votre professeur"),
        h("div", { class: "avatar big", style: { background: CHARACTERS.alex.color } }, "🧑‍🏫"),
        btn("▶️ Écouter Alex", () => speak("Hi! I'm Alex, your American English teacher. Don't worry, we will go step by step. You can do it!", { charId: "alex" }), "btn huge primary"),
        h("p", { class: "small" }, "Choisissez la voix qui vous plaît le plus :"), sel,
        h("p", { class: "small" }, "Vitesse de la voix (vers la gauche = plus lent) :"), speedSlider(),
        h("p", { class: "small muted" }, "Sur Windows, Microsoft Edge propose des voix « Natural » très réalistes. Sur Android, les voix Google sont dans Paramètres → Gestion globale → Synthèse vocale."),
        btn("Suivant : test de niveau (5 min) ➜", () => setStep(5), "btn primary"));
      speak("Hi! I'm Alex, your American English teacher. Nice to meet you!", { charId: "alex" });
    }
    if (step === 5) {
      let i = 0;
      const area = h("div", {});
      const q = () => {
        const it = PLACEMENT.listening[i];
        if (!it) return speaking();
        speak(it.en, { rate: 0.9 });
        area.replaceChildren(h("div", { class: "progress-dots" }, `Écoute ${i + 1} / ${PLACEMENT.listening.length}`), h("p", {}, "🎧 Écoutez la phrase et choisissez son sens :"), listenBtns(it.en),
          h("div", { class: "choices" }, it.choices.map((c, k) => btn(c, () => { if (k === it.answer) placement.listening++; i++; q(); }, "btn choice-btn"))),
          btn("Je ne sais pas", () => { i++; q(); }, "btn ghost"));
      };
      const speaking = () => {
        let j = 0;
        const s = () => {
          const ph = PLACEMENT.speaking[j];
          if (!ph) return selfAssess();
          const st2 = h("div", { class: "small" });
          area.replaceChildren(h("div", { class: "progress-dots" }, `Parler ${j + 1} / ${PLACEMENT.speaking.length}`), h("p", {}, "🗣 Écoutez puis répétez :"), h("div", { class: "big-en" }, ph), listenBtns(ph),
            support.stt ? btn("🎤 Je répète", async () => {
              st2.textContent = "🎤 Je vous écoute…";
              try { const r = await listen({ silenceMs: 1600 }).promise; const c = compareWords(ph, [r.text, ...(r.alternatives || [])]); placement.speaking.push(pct(c.ok, c.total)); st2.textContent = `${c.ok}/${c.total} mots reconnus (compris : « ${r.text || "rien"} »)`; setTimeout(() => { j++; s(); }, 1500); } catch (e) { st2.textContent = sttErrorFr(e.code); }
            }, "btn primary") : h("p", { class: "small muted" }, "Reconnaissance vocale indisponible : cette partie ne sera pas évaluée."),
            st2, btn("Passer", () => { j++; s(); }, "btn ghost"));
        };
        s();
      };
      const selfAssess = () => {
        area.replaceChildren(h("p", {}, "Dernière question : votre expérience de l'anglais ?"), h("div", { class: "choices" }, PLACEMENT.self.map(o => btn(o.fr, () => { placement.self = o.id; finish(); }, "btn choice-btn"))));
      };
      const finish = () => {
        const L = placement.listening, S = placement.speaking.length ? Math.round(placement.speaking.reduce((a, b) => a + b, 0) / placement.speaking.length) : null;
        let level = "A0", label = "Grand débutant";
        if (L >= 3 && placement.self !== "never") { level = "A1+"; label = "Débutant avec des bases"; }
        else if (L >= 2 || placement.self === "school") { level = "A1"; label = "Débutant"; }
        update(s => { s.profile.placement = { date: Date.now(), listening: L, listeningTotal: PLACEMENT.listening.length, speaking: S, self: placement.self }; s.profile.level = level; s.settings.newPerSession = level === "A1+" ? 6 : 5; });
        setStep(6);
      };
      box.replaceChildren(dots, h("h2", {}, "📋 Test de niveau (5 minutes)"), h("p", { class: "small muted" }, "Pas de stress : ce test sert seulement à adapter votre programme. Aucun résultat n'est inventé."), area);
      q();
    }
    if (step === 6) {
      const p = get().profile.placement;
      const lvl = get().profile.level;
      box.replaceChildren(dots, h("h2", {}, "Votre point de départ"),
        h("ul", {}, h("li", {}, `Compréhension orale : ${p.listening} / ${p.listeningTotal} phrases comprises`), h("li", {}, p.speaking != null ? `Répétition : ${p.speaking} % des mots reconnus par le navigateur (indication, pas une note de prononciation)` : "Expression orale : non mesurée sur ce navigateur")),
        h("p", {}, "Niveau de départ estimé : ", h("b", {}, { A0: "grand débutant", A1: "débutant", "A1+": "débutant avec des bases" }[lvl]), "."),
        h("p", {}, lvl === "A1+" ? "Votre programme commence au jour 1 avec un rythme un peu plus rapide (6 nouveaux mots par séance). Il s'adaptera ensuite à vos résultats." : "Votre programme commence au jour 1, avec 5 nouveaux mots par séance et beaucoup d'aide en français. Il s'adaptera à vos résultats."),
        h("p", { class: "small muted" }, "Durée d'une séance :"), durationPicker(),
        btn("Préparer mon programme ➜", () => setStep(7), "btn huge primary"));
    }
    if (step === 7) {
      requestPersistence();
      box.replaceChildren(dots, h("div", { class: "emoji-big" }, "✅"), h("h2", {}, "Votre programme de 120 jours est prêt"),
        h("p", {}, "Première séance : ", h("b", {}, dayInfo(1).title), "."),
        h("p", { class: "small muted" }, "Astuce : installez l'application sur votre écran d'accueil (voir Réglages → Installer)."),
        h("details", { class: "small" }, h("summary", {}, "J'ai déjà mon code d'accès pour Alex (IA)"),
          h("input", { class: "chat-input", type: "password", placeholder: "Code d'accès", value: get().settings.accessCode, autocomplete: "off", onChange: (e) => { update(s => { s.settings.accessCode = e.target.value.trim(); }); checkAi(); } })),
        btn("🚀 Lancer ma première leçon", () => { update(s => { s.profile.placementDone = true; }); nav.go("lecon", 1); }, "btn huge primary"));
    }
  };
  draw();
  return h("div", { class: "page onboarding" }, box);
}

function durationPicker() {
  const seg = h("div", { class: "seg" });
  const draw = () => seg.replaceChildren(...[10, 20, 30, 45].map(m => h("button", { type: "button", class: "seg-btn" + (get().settings.duration === m ? " on" : ""), onClick: () => { update(s => { s.settings.duration = m; }); draw(); } }, h("b", {}, `${m} min`))));
  draw();
  return seg;
}

// ---------- MON PROGRAMME ----------
function programPage() {
  const st = get();
  const cd = currentDay();
  return h("div", { class: "page" },
    h("h1", {}, "🗓️ Mon programme"),
    h("p", { class: "lead" }, "120 séances progressives. L'objectif : tenir des conversations simples et naturelles sur les sujets courants, au niveau de vos progrès réels."),
    MONTHS.map(m => h("details", { class: "card month", open: dayInfo(cd).month === m.n },
      h("summary", {}, h("b", {}, `Mois ${m.n} — ${m.title}`), h("span", { class: "small muted" }, ` · ${m.goal}`)),
      h("p", { class: "small" }, "Immersion : ", m.immersion),
      [...new Set(PROGRAM.filter(d => d.month === m.n).map(d => d.week))].map(w => {
        const days = PROGRAM.filter(d => d.week === w);
        return h("div", { class: "week" }, h("h4", {}, `Semaine ${w} — ${days[0].theme}`),
          h("ul", { class: "days" }, days.map(d => {
            const ds = st.program.days[d.day];
            const status = ds?.done ? "done" : d.day === cd ? "current" : d.day < cd ? "late" : "later";
            const content = d.review ? "Bilan" : itemsForDay(d.day).length ? `${itemsForDay(d.day).length} mots` : "mots préparés par l'IA";
            return h("li", { class: "day " + status },
              h("button", { type: "button", onClick: () => nav.go("lecon", d.day) },
                h("span", { class: "dnum" }, ds?.done ? "✓" : d.day), h("span", { class: "grow" }, h("b", {}, d.title), h("br"), h("span", { class: "small muted" }, d.objective)),
                h("span", { class: "small muted" }, content)));
          })));
      }))));
}

// ---------- MES PROGRÈS ----------
function progressPage() {
  const st = get();
  const logs = Object.entries(st.log);
  const sum = (f, from = null) => logs.filter(([k]) => from == null || k >= dateKey(from)).reduce((a, [, l]) => a + (l[f] || 0), 0);
  const activeDays = logs.filter(([, l]) => l.minutes > 0 || l.reviews > 0).length;
  const studied = studiedIds().length, mastered = masteredIds().length;
  const listenRate = pct(sum("listenOk"), sum("listenTotal"));
  const pr = Object.entries(st.pron).filter(([k]) => SOUNDS[k]);
  const prWords = pr.reduce((a, [, p]) => a + p.words, 0), prOk = pr.reduce((a, [, p]) => a + p.wordsOk, 0);
  const daysDone = Object.values(st.program.days).filter(d => d.done).length;
  const toReview = Object.values(st.cards).filter(c => c.difficult || (c.state !== "new" && c.due <= Date.now())).length;
  const worstSound = pr.filter(([, p]) => p.attempts >= 2).map(([k, p]) => [k, pct(p.wordsOk, p.words)]).sort((a, b) => a[1] - b[1])[0];
  const bestSound = pr.filter(([, p]) => p.attempts >= 2).map(([k, p]) => [k, pct(p.wordsOk, p.words)]).sort((a, b) => b[1] - a[1])[0];
  const stat = (n, l) => h("div", { class: "stat" }, h("div", { class: "stat-n" }, n), h("div", { class: "stat-l" }, l));

  // Bilan de la semaine (7 derniers jours)
  const w = { conv: sum("convSec", 6), reviews: sum("reviews", 6), correct: sum("correct", 6), newWords: sum("newWords", 6), lOk: sum("listenOk", 6), lTot: sum("listenTotal", 6), days: logs.filter(([k, l]) => k >= dateKey(6) && (l.minutes > 0 || l.reviews > 0)).length, convCount: sum("convCount", 6) };
  const strong = w.lTot >= 5 && pct(w.lOk, w.lTot) >= 70 ? `compréhension à l'écoute (${pct(w.lOk, w.lTot)} %)` : bestSound && bestSound[1] >= 70 ? `prononciation : ${SOUNDS[bestSound[0]].name.toLowerCase()}` : w.reviews >= 10 ? `régularité des révisions (${w.reviews})` : null;
  const weak = worstSound && worstSound[1] < 80 ? `prononciation : ${SOUNDS[worstSound[0]].name.toLowerCase()} (${worstSound[1]} % des mots reconnus)` : w.reviews && pct(w.correct, w.reviews) < 70 ? "mémorisation : refaites les révisions courtes plus souvent" : null;
  const nextGoal = dayInfo(currentDay()).title;

  // Défi de la semaine et récompenses (calculés sur les vraies données)
  const challenge = { label: "Défi de la semaine : 3 conversations et 4 jours d'entraînement", done: w.convCount >= 3 && w.days >= 4, progress: `${Math.min(w.convCount, 3)}/3 conversations · ${Math.min(w.days, 4)}/4 jours` };
  const badges = [
    [daysDone >= 1, "🥇", "Première séance"], [st.log && sum("convCount") >= 1, "🗣", "Première conversation"], [activeDays >= 7, "📅", "7 jours d'entraînement"],
    [studied >= 25, "📚", "25 mots étudiés"], [mastered >= 10, "🧠", "10 mots bien retenus"], [daysDone >= 30, "🏅", "Mois 1 terminé"], [daysDone >= 60, "🏆", "Mois 2 terminé"], [daysDone >= 90, "🌟", "Mois 3 terminé"], [daysDone >= 120, "🇺🇸", "120 séances !"],
  ];

  const cefr = st.profile.cefr || {};
  return h("div", { class: "page" },
    h("h1", {}, "📈 Mes progrès"),
    h("p", { class: "lead" }, "Tous les chiffres sont calculés à partir de vos exercices réels sur cet appareil."),
    h("div", { class: "stats" },
      stat(activeDays, "jours travaillés"), stat(fmtMin(sum("minutes") * 60), "temps d'entraînement"), stat(fmtMin(sum("convSec")), "temps de conversation"),
      stat(studied, "mots étudiés"), stat(mastered, "mots bien retenus*"), stat(sum("listenTotal") ? listenRate + " %" : "—", "compréhension orale"),
      stat(prWords ? pct(prOk, prWords) + " %" : "—", "mots reconnus en prononciation"), stat(sum("reviews"), "révisions effectuées"), stat(daysDone, "séances terminées")),
    h("p", { class: "small muted" }, "* Bien retenu : revu au moins 3 fois avec succès et mémorisé pour au moins 3 semaines (estimation FSRS). Prononciation : pourcentage de mots compris par la reconnaissance vocale, pas une note phonétique."),
    h("div", { class: "card report" },
      h("h2", {}, "BILAN DE LA SEMAINE"),
      w.days === 0 ? h("p", {}, "Pas encore d'activité cette semaine. Une séance de 10 minutes suffit pour reprendre !") : h("ul", {},
        h("li", {}, `Jours d'entraînement : ${w.days} / 7`), h("li", {}, `Temps de conversation : ${fmtMin(w.conv)}`), h("li", {}, `Nouveaux mots : ${w.newWords}`),
        h("li", {}, `Mots bien retenus (au total) : ${mastered}`), h("li", {}, `Expressions à revoir : ${toReview}`),
        h("li", {}, `Point fort : ${strong || "pas encore assez de données"}`), h("li", {}, `À améliorer : ${weak || "pas encore assez de données"}`), h("li", {}, `Objectif suivant : ${nextGoal}`))),
    h("div", { class: "card" }, h("h3", {}, challenge.done ? "✅ " : "🎯 ", challenge.label), h("p", { class: "small" }, challenge.progress)),
    h("div", { class: "card" }, h("h3", {}, "Récompenses"), h("div", { class: "badges" }, badges.map(([ok, e, l]) => h("div", { class: "badge" + (ok ? " on" : "") }, h("span", { class: "emoji" }, ok ? e : "🔒"), h("span", { class: "small" }, l))))),
    h("div", { class: "card" }, h("h3", {}, "📋 Évaluations"),
      st.profile.placement ? h("p", { class: "small" }, `Test initial : ${st.profile.placement.listening}/${st.profile.placement.listeningTotal} en écoute${st.profile.placement.speaking != null ? `, ${st.profile.placement.speaking} % de mots reconnus en répétition` : ""}.`) : null,
      st.evaluations.length ? h("ul", {}, st.evaluations.map(e => h("li", { class: "small" }, `${new Date(e.date).toLocaleDateString("fr-FR")} (jour ${e.day}) : écoute ${e.listening ?? "—"} %, mémoire ${e.recall ?? "—"} %, expression ${e.speaking ?? "—"}${e.speaking != null ? " %" : ""}, ${e.mastered} mots bien retenus`))) : h("p", { class: "small muted" }, "Les évaluations mensuelles ont lieu aux jours 30, 60, 90 et 120."),
      btn("Faire une évaluation maintenant", (e) => { const host = e.currentTarget.parentNode; host.replaceChildren(evaluationView(currentDay(), () => render())); }, "btn")),
    h("div", { class: "card" }, h("h3", {}, "Repères CECRL (auto-évaluation)"),
      h("p", { class: "small muted" }, "Cochez ce que vous savez faire. Ces repères sont inspirés du Cadre européen ; ils ne remplacent pas une certification officielle."),
      Object.entries(CEFR).map(([lvl, list]) => h("div", {}, h("h4", {}, lvl), list.map((t, i) => h("label", { class: "check" }, h("input", { type: "checkbox", checked: !!cefr[lvl + i], onChange: (e) => update(s => { s.profile.cefr = { ...(s.profile.cefr || {}), [lvl + i]: e.target.checked }; }) }), " ", t))))));
}
function dateKey(daysAgo) { const d = new Date(); d.setDate(d.getDate() - daysAgo); return d.toLocaleDateString("sv-SE"); }

// ---------- RÉGLAGES ----------
function settingsPage() {
  const st = get();
  const s = st.settings;
  const row = (label, control, help) => h("div", { class: "setting" }, h("div", { class: "grow" }, h("b", {}, label), help ? h("div", { class: "small muted" }, help) : null), control);
  const voiceSel = h("select", { class: "select", "aria-label": "Voix d'Alex", onChange: e => update(x => { x.settings.voiceURI = e.target.value; x.settings.charVoices.alex = e.target.value; }) });
  const charVoiceBox = h("div", {});
  voicesReady().then(() => {
    const vs = usVoices();
    voiceSel.replaceChildren(h("option", { value: "" }, "Automatique"), ...vs.map(v => h("option", { value: v.voiceURI, selected: v.voiceURI === s.voiceURI }, v.name)));
    charVoiceBox.replaceChildren(...Object.entries(CHARACTERS).filter(([k]) => k !== "alex").map(([k, c]) => row(`Voix de ${c.name}`, h("span", { class: "row" },
      h("select", { class: "select", onChange: e => update(x => { x.settings.charVoices[k] = e.target.value; }) }, h("option", { value: "" }, "Automatique"), ...vs.map(v => h("option", { value: v.voiceURI, selected: v.voiceURI === s.charVoices?.[k] }, v.name))),
      btn("🔊", () => speak(`Hi, I'm ${c.name}.`, { charId: k }), "icon-btn")))));
    if (!vs.length) charVoiceBox.replaceChildren(h("p", { class: "small warn" }, "Aucune voix américaine trouvée sur cet appareil. Sur Android : Paramètres → Gestion globale → Synthèse vocale → installez « Anglais (États-Unis) ». Sur Windows : Paramètres → Heure et langue → Voix."));
  });
  const aiState = h("div", { class: "small" }, aiLabel());
  const code = h("input", { class: "chat-input", type: "password", value: s.accessCode, placeholder: "Code d'accès choisi lors de l'installation", "aria-label": "Code d'accès", autocomplete: "off" });
  const url = h("input", { class: "chat-input", value: s.aiUrl, "aria-label": "Adresse du serveur d'Alex" });
  const fileIn = h("input", { type: "file", accept: "application/json,.json", class: "hidden", onChange: async (e) => {
    const f = e.target.files[0]; if (!f) return;
    if (!(await confirmBox("Restaurer une sauvegarde", "Vos données actuelles seront remplacées par celles du fichier (une copie de secours est gardée).", "Restaurer"))) return;
    try { await importData(f); toast("✅ Sauvegarde restaurée."); render(); } catch (err) { toast("❌ " + err.message, 5000); }
  } });
  const remindTime = h("input", { type: "time", value: s.remindTime || "19:00", class: "select", "aria-label": "Heure du rappel" });

  return h("div", { class: "page settings" },
    h("h1", {}, "⚙️ Réglages"),
    h("div", { class: "card" }, h("h2", {}, "Ma séance"),
      row("Durée d'une séance", durationPicker()),
      row("Nouveaux mots par séance", h("b", {}, s.newPerSession), "S'ajuste tout seul selon vos résultats (entre 3 et 6)."),
      row("Prénom", h("input", { class: "chat-input short", value: st.profile.name, maxlength: 30, onChange: e => update(x => { x.profile.name = e.target.value.trim(); }) }))),
    h("div", { class: "card" }, h("h2", {}, "Voix et micro"),
      row("Voix d'Alex", h("span", { class: "row" }, voiceSel, btn("🔊", () => speak("Hi! I'm Alex. Let's practice!", { charId: "alex" }), "icon-btn"))),
      charVoiceBox,
      row("Vitesse de la voix", speedSlider()),
      row("Conversation mains libres", h("input", { type: "checkbox", checked: s.handsFree, onChange: e => update(x => { x.settings.handsFree = e.target.checked; }) }), "Activé : après chaque réponse d'Alex, le micro se rallume tout seul. Désactivé : appuyez sur le micro à chaque phrase."),
      row("Temps d'attente quand je réfléchis", h("select", { class: "select", onChange: e => update(x => { x.settings.silenceMs = Number(e.target.value); }) }, [[1500, "Court (1,5 s)"], [2200, "Normal (2 s)"], [3500, "Long (3,5 s)"], [5000, "Très long (5 s)"]].map(([v, l]) => h("option", { value: v, selected: s.silenceMs === v }, l))), "Silence à attendre avant de considérer que vous avez fini (sur ordinateur ; Android décide lui-même)."),
      row("Afficher l'IPA", h("input", { type: "checkbox", checked: s.showIPA, onChange: e => update(x => { x.settings.showIPA = e.target.checked; }) }), "Transcription phonétique internationale, en plus de la prononciation simplifiée."),
      h("p", { class: "small muted" }, support.stt ? "✅ Reconnaissance vocale disponible sur ce navigateur." : "⚠️ Reconnaissance vocale indisponible ici : utilisez Chrome ou Edge.")),
    h("div", { class: "card" }, h("h2", {}, "🧑‍🏫 Alex (IA gratuite)"),
      aiState,
      row("Code d'accès", code, "Le même code que la variable ACCESS_CODE sur Netlify (étape 3 du guide)."),
      h("details", {}, h("summary", { class: "small" }, "Avancé : adresse du serveur"), url),
      btn("Enregistrer et tester la connexion", async () => { update(x => { x.settings.accessCode = code.value.trim(); x.settings.aiUrl = url.value.trim() || "/api/alex"; }); aiState.textContent = "Test…"; const r = await checkAi(); aiState.textContent = aiLabel() + (r.detail ? " — " + r.detail : ""); }, "btn primary"),
      h("p", { class: "small muted" }, "L'IA (Groq, offre gratuite) n'est jamais appelée directement depuis votre appareil : votre petit serveur Netlify garde la clé secrète. Limite gratuite d'environ 1 000 échanges par jour.")),
    h("div", { class: "card" }, h("h2", {}, "Apparence"),
      row("Thème", h("select", { class: "select", onChange: e => { update(x => { x.settings.theme = e.target.value; }); applyTheme(); } }, [["dark", "Sombre (mon code couleur)"], ["light", "Clair"], ["auto", "Automatique (selon le téléphone)"]].map(([v, l]) => h("option", { value: v, selected: s.theme === v }, l)))),
      row("Taille du texte", h("select", { class: "select", onChange: e => { update(x => { x.settings.fontScale = Number(e.target.value); }); applyTheme(); } }, [[1, "Normale"], [1.12, "Grande"], [1.25, "Très grande"]].map(([v, l]) => h("option", { value: v, selected: s.fontScale === v }, l))))),
    h("div", { class: "card" }, h("h2", {}, "⏰ Rappels (facultatifs)"),
      h("p", { class: "small" }, "Pour un rappel quotidien fiable et gratuit, ajoutez un événement récurrent à votre agenda (Google Agenda, Outlook, Samsung Agenda)."),
      h("div", { class: "row wrap" }, remindTime, btn("📅 Télécharger le rappel quotidien", () => { update(x => { x.settings.remindTime = remindTime.value; }); downloadIcs(remindTime.value); }, "btn"))),
    h("div", { class: "card" }, h("h2", {}, "📲 Installer l'application"),
      installBox()),
    h("div", { class: "card" }, h("h2", {}, "🔄 Mise à jour"),
      h("p", { class: "small muted" }, "Recharge l'application pour obtenir la dernière version. Vos progrès sont conservés."),
      btn("🔄 Mettre à jour l'application", reloadApp, "btn")),
    h("div", { class: "card" }, h("h2", {}, "💾 Mes données"),
      h("p", { class: "small" }, "Vos progrès sont enregistrés automatiquement dans ce navigateur, sur cet appareil uniquement. Ils ne se synchronisent PAS tout seuls entre l'ordinateur et le téléphone : utilisez « Exporter » sur l'un puis « Restaurer » sur l'autre."),
      h("p", { class: "small" }, "Ce qui part sur Internet : vos phrases (texte) envoyées à l'IA pendant les conversations, et le son du micro envoyé par Chrome/Edge à leur service de reconnaissance vocale. Vos enregistrements de prononciation restent sur l'appareil et sont effacés après l'exercice."),
      h("div", { class: "row wrap" }, btn("⬇️ Exporter ma sauvegarde", exportData, "btn primary"), btn("⬆️ Restaurer une sauvegarde", () => fileIn.click(), "btn"), fileIn),
      btn("🗑 Supprimer toutes mes données", async () => { if (await confirmBox("Tout supprimer ?", "Tous vos progrès, mots et réglages seront effacés de cet appareil. Pensez à exporter une sauvegarde avant.", "Tout supprimer", true)) { wipeAll(); toast("Données supprimées."); location.hash = "#/onboarding"; render(); } }, "btn danger")),
    h("p", { class: "small muted center" }, "SPEAK AMERICAN · version 1.0 · gratuit, sans publicité"));
}

let deferredPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferredPrompt = e; });
function installBox() {
  const standalone = matchMedia("(display-mode: standalone)").matches;
  if (standalone) return h("p", {}, "✅ L'application est installée.");
  return h("div", {},
    deferredPrompt ? btn("📲 Installer SPEAK AMERICAN", async () => { deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; render(); }, "btn primary") : null,
    h("ul", { class: "small" },
      h("li", {}, "Téléphone (Chrome) : menu ⋮ → « Ajouter à l'écran d'accueil » → « Installer »."),
      h("li", {}, "Ordinateur (Edge ou Chrome) : icône ⊕ à droite de la barre d'adresse → « Installer »."))) ;
}

function downloadIcs(time) {
  const [hh, mm] = (time || "19:00").split(":");
  const d = new Date(); const ymd = d.toLocaleDateString("sv-SE").replaceAll("-", "");
  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//SPEAK AMERICAN//FR", "BEGIN:VEVENT", `UID:speak-american-${Date.now()}@local`, `DTSTAMP:${ymd}T000000`, `DTSTART:${ymd}T${hh}${mm}00`, "DURATION:PT30M", "RRULE:FREQ=DAILY", "SUMMARY:🇺🇸 SPEAK AMERICAN : ma séance d'anglais", "DESCRIPTION:Ouvrez SPEAK AMERICAN et appuyez sur CONTINUER MA LEÇON.", "BEGIN:VALARM", "TRIGGER:PT0M", "ACTION:DISPLAY", "DESCRIPTION:SPEAK AMERICAN", "END:VALARM", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  const a = h("a", { href: URL.createObjectURL(new Blob([ics], { type: "text/calendar" })), download: "rappel-speak-american.ics" });
  document.body.append(a); a.click(); a.remove();
}

function applyTheme() {
  const s = get().settings;
  document.documentElement.dataset.theme = s.theme || "dark";
  document.documentElement.style.setProperty("--scale", s.fontScale || 1);
}

// ---------- Démarrage ----------
applyTheme();
window.addEventListener("hashchange", render);
render();
checkAi();
window.addEventListener("online", () => checkAi());
// Mise à jour simple : un bandeau propose de recharger quand une nouvelle version est publiée.
function reloadApp() { try { save(true); } catch {} location.reload(); }
function showUpdateBanner() {
  if (document.querySelector(".update-banner")) return;
  document.body.append(h("div", { class: "update-banner card", role: "status" },
    h("span", {}, "✨ Une nouvelle version de l'application est prête."), btn("🔄 Mettre à jour", reloadApp, "btn primary")));
}
if ("serviceWorker" in navigator && location.protocol !== "file:") {
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register("./sw.js").then(reg => {
    const check = () => reg.update().catch(() => {});
    document.addEventListener("visibilitychange", () => { if (!document.hidden) check(); });
    setInterval(check, 30 * 60 * 1000);
  }).catch(() => {});
  navigator.serviceWorker.addEventListener("controllerchange", () => { if (hadController) showUpdateBanner(); });
}
