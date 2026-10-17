// Tests unitaires : répétition espacée, programme, serveur relais (avec faux fournisseur)
import assert from "node:assert/strict";
import { review, newCard, isMastered } from "../js/srs.js";
import { PROGRAM } from "../js/program.js";
import { VOCAB } from "../js/content.js";
import { handleAlex } from "../server/alex-core.mjs";
import { startMock, calls } from "./mock-ai.mjs";

let n = 0; const ok = (m) => { n++; console.log("✔", m); };

// --- FSRS ---
let c = newCard(); const t0 = Date.UTC(2026, 0, 1);
c = review(c, 3, t0); assert.equal(c.state, "review"); assert.ok(c.due > t0); const first = c.due - t0;
let c2 = review(c, 3, c.due); assert.ok(c2.due - c.due > first, "l'intervalle grandit après un succès");
let c3 = review(c2, 1, c2.due); assert.equal(c3.state, "learning"); assert.equal(c3.lapses, 1); assert.ok(c3.due - c2.due <= 10 * 60000, "un oubli revient dans 10 min");
assert.ok(c3.S < c2.S, "un oubli réduit la stabilité");
let m = newCard(); let t = t0; for (let i = 0; i < 6; i++) { m = review(m, 3, t); t = m.due; } assert.ok(isMastered(m));
let d = { ...newCard(), difficult: true }; d = review(d, 4, t0); assert.ok(d.due - t0 <= 2 * 86400000, "un mot difficile revient sous 2 jours");
ok("FSRS : intervalles, oublis, maîtrise, mots difficiles");

// --- Programme ---
assert.equal(PROGRAM.length, 120);
assert.equal(new Set(PROGRAM.map(p => p.title)).size, 120, "120 séances distinctes");
assert.deepEqual([30, 60, 90, 120].map(x => PROGRAM[x - 1].evaluation), [true, true, true, true]);
assert.ok(PROGRAM.slice(116).every(p => p.review), "les 4 derniers jours = consolidation");
assert.equal(new Set(VOCAB.map(v => v.id)).size, VOCAB.length);
VOCAB.forEach(v => { for (const k of ["en", "fr", "ph", "ipa", "ex", "exFr", "tip"]) assert.ok(v[k], `${v.id}.${k}`); });
ok(`Programme : 120 séances distinctes, ${VOCAB.length} mots complets`);

// --- Serveur relais ---
const srv = await startMock(8799);
const env = { AI_API_KEY: "k-secret", ACCESS_CODE: "1234", AI_BASE_URL: "http://localhost:8799" };
const req = (method, body, code = "1234") => new Request("http://x/api/alex", { method, headers: { "content-type": "application/json", "x-access-code": code }, body: body ? JSON.stringify(body) : undefined });

let r = await handleAlex(req("GET"), {}); assert.equal((await r.json()).configured, false); ok("Serveur sans clé : signale « non configuré »");
r = await handleAlex(req("POST", { mode: "chat" }), {}); assert.equal(r.status, 503);
r = await handleAlex(req("POST", { mode: "chat" }, "mauvais"), env); assert.equal(r.status, 401); ok("Mauvais code d'accès refusé (401)");
r = await handleAlex(req("GET"), env); assert.equal((await r.json()).configured, true);
r = await handleAlex(req("POST", { mode: "chat", character: "michael", level: "debutant", month: 1, history: [{ role: "user", text: "I am agree" }], targetWords: ["Hello"] }), env);
let j = await r.json(); assert.equal(r.status, 200); assert.ok(j.reply); assert.equal(j.correction.needed, true); assert.equal(j.suggestions.length, 3);
const last = calls[calls.length - 1];
assert.equal(last.auth, "Bearer k-secret", "la clé est envoyée par le serveur seulement");
assert.ok(last.body.messages[0].content.includes("Michael"));
assert.equal(last.body.model, "openai/gpt-oss-120b");
ok("Conversation : réponse, correction, suggestions, personnage");
r = await handleAlex(req("POST", { mode: "chat", history: [], action: "start" }), env); j = await r.json(); assert.ok(j.reply);
assert.equal(calls[calls.length - 1].body.messages[1].role, "user"); ok("Démarrage de conversation");
r = await handleAlex(req("POST", { mode: "summary", history: [{ role: "user", text: "hi" }, { role: "assistant", text: "Hello" }] }), env); j = await r.json(); assert.ok(j.summary_fr); ok("Bilan de conversation");
r = await handleAlex(req("POST", { mode: "mnemonic", item: { en: "Hello", fr: "Bonjour" } }), env); j = await r.json(); assert.ok(j.association_fr); ok("Aide-moi à retenir (IA)");
r = await handleAlex(req("POST", { mode: "generate_day", day: 15, title: "Au café", objective: "Commander", month: 1, avoid: ["Hello"] }), env); j = await r.json(); assert.equal(j.items.length, 5); ok("Génération des mots d'un jour");
r = await handleAlex(req("POST", { mode: "chat", history: [{ role: "user", text: "x".repeat(50000) }] }), env); assert.equal(r.status, 413); ok("Requête trop grosse refusée");
// quota → 429 propre
const quotaFetch = async () => new Response(JSON.stringify({ error: { message: "rate limit" } }), { status: 429 });
r = await handleAlex(req("POST", { mode: "chat", history: [] }), env, quotaFetch); assert.equal(r.status, 429); assert.equal((await r.json()).error, "quota"); ok("Quota gratuit atteint : message clair");
srv.close();
console.log(`\n${n} tests unitaires réussis.`);
