// Cœur du serveur relais d'Alex. Tourne côté serveur (Netlify Functions) : la clé API reste secrète.
// Fournisseur par défaut : Groq (offre gratuite, sans carte bancaire), API compatible « chat completions ».
// Variables d'environnement :
//   AI_API_KEY   (obligatoire) clé gratuite Groq (ou d'un autre fournisseur compatible)
//   ACCESS_CODE  (obligatoire) code personnel que l'application doit envoyer : empêche les inconnus d'utiliser votre quota
//   AI_BASE_URL  (facultatif)  défaut https://api.groq.com/openai/v1
//   AI_MODEL     (facultatif)  défaut openai/gpt-oss-120b
//   AI_FALLBACK_MODEL (facultatif) modèle de secours si le premier est saturé

const DEFAULT_BASE = "https://api.groq.com/openai/v1";
const DEFAULT_MODEL = "openai/gpt-oss-120b";

const CHARACTERS = {
  alex: "Alex, a warm, patient American English teacher from Chicago, in his forties. You are the learner's personal coach: encouraging, clear, never condescending.",
  sarah: "Sarah, a friendly, enthusiastic American woman in her thirties from San Diego. You are the learner's friend; casual and curious, you love France.",
  michael: "Michael, a cheerful, efficient waiter in a busy diner in Boston. You stay in your role as a waiter.",
  jessica: "Jessica, a polite, professional hotel front-desk receptionist in New York. You stay in your role.",
  david: "David, an energetic real-estate agent in Miami who likes to sell. You stay in your role.",
  emily: "Emily, a bubbly sales assistant in a clothing store. You stay in your role.",
  james: "James, a busy but helpful New Yorker in the street (or a taxi driver if the situation says so). You stay in your role.",
};

const LEVELS = {
  debutant: "LEVEL: BEGINNER. Use very short, simple sentences (max 8-10 words), very common words, one question at a time. Speak slowly and clearly (no slang). The learner may answer with very few words: accept it warmly.",
  intermediaire: "LEVEL: INTERMEDIATE. Use natural but clear American English, everyday contractions (I'm, don't, gonna occasionally), sentences up to ~15 words, one or two questions max.",
  immersion: "LEVEL: IMMERSION. Speak natural, fluent American English as you would with a native speaker: contractions, common idioms, normal pace. Keep turns short (1-3 sentences) so the learner speaks a lot.",
};

const MONTH_HELP = {
  1: "Month 1 of 4: the learner is a beginner; French help is very welcome. Keep coach_fr helpful and reassuring.",
  2: "Month 2 of 4: use more English; keep French help short.",
  3: "Month 3 of 4: conversation mostly in English; French help only when needed.",
  4: "Month 4 of 4: near-full American immersion; French help only if the learner is stuck.",
};

const BASE_RULES = `You are part of SPEAK AMERICAN, an app that teaches spoken AMERICAN English to a 54-year-old French man who has memory difficulties and wants to talk naturally with Americans. Everything you say in "reply" will be read aloud by a text-to-speech voice, so write only plain spoken English (no emojis, no markdown, no lists, no stage directions).
The learner's messages come from speech recognition: ignore small transcription glitches, punctuation and capitalization; guess the intended meaning generously (French accent).
Rules:
- Stay in character and keep the conversation going: end most turns with a simple question that invites the learner to speak.
- Never leave the learner stuck: if they seem lost, rephrase more simply.
- If the learner makes a mistake, the character continues naturally (no lecture inside "reply"); the correction goes in the "correction" field, explained in simple French by Alex the teacher.
- Only flag real mistakes that matter for being understood or sounding natural. Do not correct missing punctuation or capitals. If the sentence is fine, correction.needed = false.
- Reuse the target words when natural. Be kind, positive and honest.
- Never ask for sensitive personal data (health, money, address, passwords).
Answer ONLY with a JSON object with exactly these keys:
{"reply": "what the character says (English)", "reply_fr": "natural French translation of reply", "correction": {"needed": true|false, "original": "learner's sentence", "better": "corrected/more natural American version", "explanation_fr": "short simple explanation in French"}, "suggestions": [{"en": "a possible short answer the learner could say next", "fr": "its French translation"}, {"en": "...", "fr": "..."}], "used_words": ["target words the learner used correctly in their LAST message"], "coach_fr": "optional very short tip or encouragement in French, or empty string"}`;

const ACTIONS = {
  start: "(The conversation starts now. Greet the learner in character, set the scene in one short sentence, and ask a first easy question.)",
  continue: "(The learner wants you to continue: keep the conversation going with a new, related question.)",
  not_understood: "(The learner did NOT understand your last message. Rephrase it much more simply and slowly, with simpler words. Put a short helpful explanation in coach_fr.)",
  help_answer: "(The learner asks for help to answer. Repeat your question briefly and give 2 easy example answers in suggestions.)",
  correct: "(The learner asks you to check their last sentence carefully: fill correction with the most natural American version, even for small improvements. In reply, briefly encourage them to say the better version.)",
};

// Progression « crescendo » : la longueur et la difficulté des répliques suivent le jour du programme.
function stageFor(day, level) {
  if (level === "immersion") return null;
  if (level === "intermediaire" && day < 46) day = 46;
  if (day <= 7) return "STAGE 1 (very first week, absolute beginner). Each reply = ONE tiny sentence of 2 to 5 words, e.g. \"Hi! I'm Sarah. And you?\" or \"Nice to meet you!\". Use ONLY the target words, the known words and the most basic words (hi, hello, yes, no, I, you, my, name, is, and, good, thanks, please). Ask only yes/no or one-word-answer questions. Each suggestion = 1 to 3 words. Never two questions. If the learner answers with one word, that is perfect: praise it.";
  if (day <= 21) return "STAGE 2 (weeks 2-3). Each reply = 1 short sentence, max 6 words, present tense only, very common words, mostly the target and known words. One simple question. Each suggestion = 2 to 5 words.";
  if (day <= 45) return "STAGE 3 (weeks 4-6). Each reply = 1 or 2 short sentences, max 9 words each, simple present/past/future with will. One question. Suggestions = short full sentences (max 7 words).";
  if (day <= 75) return "STAGE 4 (months 3). Replies of 1-2 sentences, max 12 words each, natural but clear. Suggestions up to 10 words.";
  return "STAGE 5 (month 4). Natural conversation, 1-3 sentences, still clear.";
}

function clip(s, n) { return String(s ?? "").slice(0, n); }

function buildChatMessages(b) {
  const char = CHARACTERS[b.character] ? b.character : "alex";
  const level = LEVELS[b.level] ? b.level : "debutant";
  const month = Math.min(4, Math.max(1, Number(b.month) || 1));
  const learner = b.learner || {};
  const facts = Array.isArray(learner.facts) ? learner.facts.slice(0, 12).map(f => clip(f, 140)) : [];
  const targets = Array.isArray(b.targetWords) ? b.targetWords.slice(0, 12).map(w => clip(w, 60)) : [];
  let system = `${BASE_RULES}\n\nYOUR CHARACTER: ${CHARACTERS[char]}\n${LEVELS[level]}\n${MONTH_HELP[month]}`;
  if (b.mode === "journal") system += "\nMODE: CONVERSATION JOURNAL. The learner tells you about their day or life. Listen, react with genuine interest, ask follow-up questions, and in correction offer a more natural version of their sentence when useful.";
  if (b.situation) system += `\nSITUATION / LESSON TOPIC: ${clip(b.situation, 300)}`;
  if (targets.length) system += `\nTARGET WORDS to reuse: ${targets.join(" | ")}`;
  const day = Math.min(120, Math.max(1, Number(b.day) || 1));
  const stage = stageFor(day, level);
  const known = Array.isArray(b.knownWords) ? b.knownWords.slice(-80).map(w => clip(w, 50)) : [];
  if (known.length) system += `\nWORDS THE LEARNER ALREADY KNOWS (prefer these): ${known.join(" | ")}`;
  if (stage) system += `\nPROGRAM DAY ${day} of 120. ${stage} This length limit is STRICT and overrides everything else, including the situation.`;
  if (learner.name) system += `\nThe learner's first name is ${clip(learner.name, 40)}.`;
  if (facts.length) system += `\nThings the learner chose to share (use them to personalize): ${facts.join("; ")}`;

  const messages = [{ role: "system", content: system }];
  const hist = Array.isArray(b.history) ? b.history.slice(-24) : [];
  for (const h of hist) {
    const role = h.role === "assistant" ? "assistant" : "user";
    const content = clip(h.text, 700);
    if (!content) continue;
    const last = messages[messages.length - 1];
    if (last.role === role) last.content += "\n" + content; else messages.push({ role, content });
  }
  const action = ACTIONS[b.action];
  if (action) {
    const last = messages[messages.length - 1];
    if (last.role === "user") last.content += "\n" + action; else messages.push({ role: "user", content: action });
  }
  if (messages.length === 1) messages.push({ role: "user", content: ACTIONS.start });
  if (messages[1].role === "assistant") messages.splice(1, 0, { role: "user", content: ACTIONS.start });
  return messages;
}

function buildSummaryMessages(b) {
  const hist = (Array.isArray(b.history) ? b.history : []).slice(-40).map(h => `${h.role === "assistant" ? "CHARACTER" : "LEARNER"}: ${clip(h.text, 500)}`).join("\n");
  return [
    { role: "system", content: `You are Alex, an American English teacher. Review this conversation by a French beginner learner (54 years old, memory difficulties). Be positive but honest; do not invent anything that is not in the transcript. Answer ONLY with JSON: {"summary_fr": "2-3 short sentences in French", "strengths_fr": ["..."], "improve_fr": ["..."], "errors": [{"original": "...", "better": "...", "explanation_fr": "..."}], "review_words": ["English words or expressions worth reviewing"]}. Max 3 items per list.` },
    { role: "user", content: hist || "(empty conversation)" },
  ];
}

function buildMnemonicMessages(b) {
  const it = b.item || {};
  return [
    { role: "system", content: `You help a 54-year-old French learner with memory difficulties remember an American English word or expression. Answer ONLY with JSON: {"simple_fr": "the meaning in very simple French (max 12 words)", "association_fr": "a vivid, funny or visual memory association in French, linking the English sound to French words or an image (max 30 words)", "sound_tip_fr": "how to pronounce it the American way, explained simply in French (max 25 words)"}.` },
    { role: "user", content: `English: ${clip(it.en, 80)}\nFrench: ${clip(it.fr, 120)}` },
  ];
}

function buildGenerateMessages(b) {
  const avoid = (Array.isArray(b.avoid) ? b.avoid : []).slice(-150).map(a => clip(a, 50)).join(" | ");
  return [
    { role: "system", content: `You create lesson content for SPEAK AMERICAN, a 120-day spoken American English course for a French beginner (54, memory difficulties). Create exactly 5 useful, high-frequency AMERICAN English words or short expressions for the lesson below, suited to month ${Math.min(4, Math.max(1, Number(b.month) || 1))} of 4. Prefer whole useful phrases. Do not repeat these already-learned items: ${avoid || "(none)"}.
Answer ONLY with JSON: {"items": [{"en": "...", "fr": "French meaning", "ph": "simplified pronunciation for French speakers, stressed syllable in CAPITALS (e.g. hè-LÔ)", "ipa": "/American IPA/", "ex": "short natural example sentence", "exFr": "its French translation", "tip": "memory tip in French (max 25 words)", "emoji": "one emoji", "dlg": [["A", "line", "French"], ["B", "line", "French"]]}]}` },
    { role: "user", content: `Day ${Number(b.day) || 0}: ${clip(b.title, 120)} — ${clip(b.objective, 200)}` },
  ];
}

// ---------- Validation des réponses ----------
function extractJson(text) {
  if (!text) return null;
  try { return JSON.parse(text); } catch {}
  const a = text.indexOf("{"), z = text.lastIndexOf("}");
  if (a >= 0 && z > a) { try { return JSON.parse(text.slice(a, z + 1)); } catch {} }
  return null;
}
const str = (v, n = 600) => (typeof v === "string" ? v : v == null ? "" : String(v)).slice(0, n);

function normalize(mode, o) {
  if (!o || typeof o !== "object") return null;
  if (mode === "summary") {
    return {
      summary_fr: str(o.summary_fr, 800),
      strengths_fr: (o.strengths_fr || []).slice(0, 3).map(x => str(x, 200)),
      improve_fr: (o.improve_fr || []).slice(0, 3).map(x => str(x, 200)),
      errors: (o.errors || []).slice(0, 3).map(e => ({ original: str(e?.original, 300), better: str(e?.better, 300), explanation_fr: str(e?.explanation_fr, 300) })).filter(e => e.better),
      review_words: (o.review_words || []).slice(0, 5).map(x => str(x, 60)),
    };
  }
  if (mode === "mnemonic") {
    if (!o.association_fr) return null;
    return { simple_fr: str(o.simple_fr, 200), association_fr: str(o.association_fr, 400), sound_tip_fr: str(o.sound_tip_fr, 300) };
  }
  if (mode === "generate_day") {
    const items = (o.items || []).slice(0, 5).map(i => ({
      en: str(i?.en, 80), fr: str(i?.fr, 120), ph: str(i?.ph, 80), ipa: str(i?.ipa, 80), ex: str(i?.ex, 200), exFr: str(i?.exFr, 200),
      tip: str(i?.tip, 250), emoji: str(i?.emoji, 8),
      dlg: Array.isArray(i?.dlg) ? i.dlg.slice(0, 4).map(l => [str(l?.[0], 2) || "A", str(l?.[1], 200), str(l?.[2], 200)]) : [],
    })).filter(i => i.en && i.fr);
    return items.length >= 3 ? { items } : null;
  }
  // chat / journal
  if (!o.reply) return null;
  const c = o.correction || {};
  return {
    reply: str(o.reply, 700),
    reply_fr: str(o.reply_fr, 900),
    correction: { needed: !!c.needed && !!c.better, original: str(c.original, 400), better: str(c.better, 400), explanation_fr: str(c.explanation_fr, 400) },
    suggestions: (Array.isArray(o.suggestions) ? o.suggestions : []).slice(0, 3).map(s => (typeof s === "string" ? { en: str(s, 200), fr: "" } : { en: str(s?.en, 200), fr: str(s?.fr, 200) })).filter(s => s.en),
    used_words: (Array.isArray(o.used_words) ? o.used_words : []).slice(0, 12).map(w => str(w, 60)),
    coach_fr: str(o.coach_fr, 400),
  };
}

// ---------- Appel du fournisseur ----------
async function callProvider(env, model, messages, maxTokens, fetchImpl) {
  const base = (env.AI_BASE_URL || DEFAULT_BASE).replace(/\/$/, "");
  const body = { model, messages, temperature: 0.7, max_tokens: maxTokens, response_format: { type: "json_object" } };
  if (/gpt-oss/.test(model)) body.reasoning_effort = "low"; // réponses plus rapides pour la conversation vocale
  const doFetch = (b) => fetchImpl(`${base}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${env.AI_API_KEY}` },
    body: JSON.stringify(b),
  });
  let res = await doFetch(body);
  if (res.status === 400 && body.reasoning_effort) { delete body.reasoning_effort; res = await doFetch(body); }
  if (res.status === 400) { delete body.response_format; res = await doFetch(body); }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = new Error(data?.error?.message || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data?.choices?.[0]?.message?.content || "";
}

const json = (status, obj) => new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

function safeEqual(a, b) {
  a = String(a || ""); b = String(b || "");
  if (!a || a.length !== b.length) return false;
  let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export async function handleAlex(req, env, fetchImpl = fetch) {
  const configured = !!env.AI_API_KEY && !!env.ACCESS_CODE;
  const code = req.headers.get("x-access-code");

  if (req.method === "GET") {
    if (!configured) return json(200, { ok: true, configured: false });
    if (!safeEqual(code, env.ACCESS_CODE)) return json(401, { error: "badcode" });
    return json(200, { ok: true, configured: true, provider: (env.AI_BASE_URL || DEFAULT_BASE).includes("groq") ? "Groq (gratuit)" : "personnalisé", model: env.AI_MODEL || DEFAULT_MODEL });
  }
  if (req.method !== "POST") return json(405, { error: "method" });
  if (!configured) return json(503, { error: "not_configured" });
  if (!safeEqual(code, env.ACCESS_CODE)) return json(401, { error: "badcode" });

  let b;
  try { b = await req.json(); } catch { return json(400, { error: "invalid" }); }
  if (!b || typeof b !== "object") return json(400, { error: "invalid" });
  const raw = JSON.stringify(b);
  if (raw.length > 40000) return json(413, { error: "invalid" });

  const mode = ["chat", "journal", "summary", "mnemonic", "generate_day"].includes(b.mode) ? b.mode : "chat";
  const messages = mode === "summary" ? buildSummaryMessages(b) : mode === "mnemonic" ? buildMnemonicMessages(b) : mode === "generate_day" ? buildGenerateMessages(b) : buildChatMessages(b);
  const maxTokens = mode === "generate_day" ? 3000 : mode === "summary" ? 1500 : 1200;
  const models = [env.AI_MODEL || DEFAULT_MODEL, env.AI_FALLBACK_MODEL].filter(Boolean);

  let lastErr = null;
  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const text = await callProvider(env, model, messages, maxTokens, fetchImpl);
        const out = normalize(mode === "journal" ? "chat" : mode, extractJson(text));
        if (out) return json(200, out);
        lastErr = Object.assign(new Error("invalid"), { status: 502, code: "invalid" });
      } catch (e) {
        lastErr = e;
        if (e.status === 429) break;            // quota : essayer le modèle de secours
        if (e.status === 401 || e.status === 403) return json(503, { error: "not_configured" });
      }
    }
  }
  if (lastErr?.status === 429) return json(429, { error: "quota" });
  if (lastErr?.code === "invalid") return json(502, { error: "invalid" });
  console.error("Erreur fournisseur IA:", lastErr?.message);
  return json(502, { error: "provider" });
}
