// Test de bout en bout dans Chromium : premier lancement → leçon complète → persistance → tous les onglets
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { spawn } from "node:child_process";
import { startMock } from "./mock-ai.mjs";
import { mkdirSync } from "node:fs";

const OUT = process.env.SHOTS || "tests/screenshots";
mkdirSync(OUT, { recursive: true });
const mock = await startMock(8799);
process.on("exit", () => { try { server.kill(); } catch {} });
const server = spawn(process.execPath, ["dev-server.mjs"], { env: { ...process.env, PORT: "8788", AI_API_KEY: "k", ACCESS_CODE: "1234", AI_BASE_URL: "http://localhost:8799" }, stdio: "inherit" });
await new Promise(r => setTimeout(r, 800));
const URL0 = "http://localhost:8788/";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
const page = await ctx.newPage();
page.setDefaultTimeout(15000);
// code d'accès (comme le ferait l'utilisateur dans Réglages)
// Faux micro : renvoie window.__fakeSay (ou « rien entendu »)
await page.addInitScript(() => {
  class FakeSR { start() { setTimeout(() => { const t = window.__fakeSay; if (!t) { this.onerror?.({ error: "no-speech" }); this.onend?.(); return; }
    const res = [[{ transcript: t }]]; res[0].isFinal = true; this.onresult?.({ results: res }); setTimeout(() => this.onend?.(), 50); }, 300); }
    stop() { this.onend?.(); } abort() { this.onend?.(); } }
  window.SpeechRecognition = FakeSR; window.webkitSpeechRecognition = FakeSR;
});
await page.addInitScript(() => { if (!localStorage.getItem("speak-american:v1")) localStorage.setItem("speak-american:v1", JSON.stringify({ settings: { accessCode: "1234" } })); });
const errors = [];
page.on("pageerror", e => errors.push("pageerror: " + e.message));
page.on("console", m => { if (m.type() === "error" && !/favicon|speech|net::ERR/i.test(m.text())) errors.push("console: " + m.text()); });
// modifie les données depuis un autre onglet (comme un 2e onglet ouvert)
async function editState(fn) {
  const p2 = await ctx.newPage(); await p2.goto(URL0 + "manifest.webmanifest");
  await p2.evaluate(fn); await p2.close(); await page.waitForTimeout(200);
}
const step = (m) => console.log("→", m);
const click = (name, opts = {}) => page.getByRole("button", { name, ...opts }).first().click();

await page.goto(URL0);
step("Premier lancement");
await page.getByPlaceholder("Votre prénom").fill("Manu");
await click("Commencer");
await click("Suivant");
await click("Passer");
await click(/Suivant : test de niveau/);
for (let i = 0; i < 4; i++) await page.locator(".choice-btn").first().click();
for (let i = 0; i < 3; i++) await click("Passer");
await click(/J'en ai fait à l'école/);
await page.getByText("Votre point de départ").waitFor();
await page.screenshot({ path: `${OUT}/01-niveau.png` });
await click("Préparer mon programme");
await click("Lancer ma première leçon");

step("Leçon jour 1 : révision");
await page.getByRole("heading", { name: "Dire bonjour" }).waitFor();
await page.getByText("Rien d'urgent à réviser").waitFor();
await page.getByRole("button", { name: "💬 Jouer avec Sarah" }).waitFor();
await click("Passer ➜");
await page.getByText("Étape terminée, bravo !").waitFor();
await page.screenshot({ path: `${OUT}/02b-pause.png` });
await click(/▶️ Continuer :/);
step("Nouveaux mots");
for (let i = 0; i < 5; i++) {
  const phone = async (name) => { if (i) return; await page.setViewportSize({ width: 412, height: 915 }); await page.screenshot({ path: `${OUT}/${name}.png` }); await page.setViewportSize({ width: 1280, height: 900 }); };
  const stageOn = (n) => page.waitForFunction((n) => document.querySelectorAll(".word-games .steps4 span.on").length === n, n);
  await stageOn(1); if (i === 0) await page.screenshot({ path: `${OUT}/02-mot.png` }); await phone("02m-mot-1-ecoute");
  await page.locator(".wg-next").click();
  await stageOn(2);
  if (i === 0) {
    const phrase = (await page.locator(".wg-word").innerText()).replace(/🔊/g, "").trim();
    await page.evaluate((t) => { window.__fakeSay = t; }, phrase);
    await page.getByRole("button", { name: "Je la dis" }).click();
    await page.getByText("✅ Bien dit !").waitFor();
    await phone("02m-mot-2-repete");
  }
  await page.locator(".wg-next").click();
  await stageOn(3);
  await page.locator(".word-games .opt-btn").first().click();
  if (await page.locator(".word-games .opt-btn.ko").count()) { await phone("02m-mot-3-sens"); await page.locator(".wg-next").click(); }
  await stageOn(4);
  if (await page.locator(".tiles .tile").count()) await page.locator(".tiles .tile").first().click();
  if (!(await page.locator(".tiles .tile").count()) && await page.locator(".word-games .opt-btn").count()) await page.locator(".word-games .opt-btn").first().click();
  await page.locator(".wg-next").waitFor(); await phone("02m-mot-4-utilise");
  await page.locator(".wg-next").click();
}
for (let i = 0; i < 5; i++) { await page.locator(".choice-btn").first().click(); await click("Suivant ➜"); }
await click(/Continuer : parler avec Sarah/);
await click(/▶️ Continuer :/);
step("Conversation avec l'IA (fournisseur simulé)");
await page.locator(".chat").waitFor();
await page.getByPlaceholder(/Ou écrivez votre réponse/).fill("Hello Sarah, I am agree");
await page.keyboard.press("Enter");
await page.getByText("Nice! And where are you from?").first().waitFor();
await page.getByText("✔ I agree").waitFor();
await click(/AIDE-MOI À RÉPONDRE/);
await page.getByText("I'm from France.").first().waitFor();
await page.screenshot({ path: `${OUT}/03-conversation.png` });
await page.getByRole("button", { name: "⌨️ Écrire" }).click();
await page.getByPlaceholder(/Ou écrivez votre réponse/).fill("I'm from France.");
await page.keyboard.press("Enter");
await page.waitForFunction(() => document.querySelectorAll(".msg.them").length >= 2);
// 3 réponses proposées : on touche, puis on la dit
await page.waitForFunction(() => document.querySelectorAll(".choice-panel .opt-btn").length === 3);
await page.setViewportSize({ width: 412, height: 915 }); await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/03m-conversation-choix.png` });
await page.setViewportSize({ width: 1280, height: 900 });
await page.evaluate(() => { window.__fakeSay = "From Lyon"; });
await page.locator(".choice-panel .opt-btn", { hasText: "From Lyon." }).click();
await page.getByText("✅ Bien dit !").waitFor();
await page.waitForFunction(() => document.querySelectorAll(".msg.them").length >= 3);
await page.screenshot({ path: `${OUT}/03b-conversation-choix.png` });
await click(/TERMINER/);
await page.getByText("Bonne conversation.").waitFor();
await page.screenshot({ path: `${OUT}/04-bilan.png` });
await page.locator(".modal-actions").getByRole("button", { name: "Fermer" }).click();
await click("Continuer ➜");
await click(/▶️ Continuer :/);
step("Prononciation");
await page.locator(".studio").first().waitFor();
await page.screenshot({ path: `${OUT}/05-prononciation.png` });
while (await page.getByRole("button", { name: "Phrase suivante ➜" }).count()) await click("Phrase suivante ➜");
await click("Terminer la prononciation ➜");
await click(/▶️ Continuer :/);
step("Petit test");
for (let i = 0; i < 10; i++) {
  await page.waitForSelector(".question, .lesson-area h3", { timeout: 15000 });
  if (!(await page.locator(".question").count())) break;
  if (await page.getByRole("button", { name: "Je ne sais pas" }).count()) await click("Je ne sais pas");
  else await page.locator(".choice-btn").first().click();
  await click("Suivant ➜");
}
await click("Continuer ➜");
await page.getByText("Jour 1 terminé !").waitFor();
await page.screenshot({ path: `${OUT}/06-fin.png` });

step("Persistance après rechargement");
await page.goto(URL0 + "#/home"); await page.reload();
await page.getByText("JOUR 2 / 120").waitFor();
const st = await page.evaluate(() => JSON.parse(localStorage.getItem("speak-american:v1")));
if (!st.program.days[1].done) throw new Error("jour 1 non sauvegardé");
const discovered = Object.values(st.cards).filter(c => c.skills.discovered).length;
if (discovered !== 5) throw new Error("5 mots attendus, trouvé " + discovered);
if (!st.errors.length) throw new Error("correction non enregistrée");
if (!st.log[Object.keys(st.log)[0]].reviews) throw new Error("révisions non comptées");
await page.screenshot({ path: `${OUT}/07-accueil.png`, fullPage: true });
step("Accueil : toucher une étape de « Ma séance » l'ouvre");
await page.locator(".check-row", { hasText: "Travailler ma prononciation" }).click();
await page.locator(".lesson-area.focus .studio").first().waitFor();
await page.getByRole("button", { name: "Quitter le plein écran" }).first().click();
await page.goto(URL0 + "#/home"); await page.locator(".checklist").waitFor();

step("Révision : simuler le lendemain (mots dus)");
await editState(() => { const s = JSON.parse(localStorage.getItem("speak-american:v1")); for (const c of Object.values(s.cards)) c.due = Date.now() - 1000; localStorage.setItem("speak-american:v1", JSON.stringify(s)); });
await page.reload();
console.log("    bouton :", (await page.locator(".big3").nth(2).textContent())); await page.locator(".big3").nth(2).click();
step("Révision « Réponds à Sarah » : toucher puis dire");
await page.locator(".oral-review .opt-btn").first().waitFor();
// mauvaise réponse d'abord → rouge
const wrongIdx = await page.evaluate(() => { const bs=[...document.querySelectorAll(".oral-review .opt-btn")]; return bs.length; });
await page.evaluate(() => { window.__fakeSay = ""; });
const correctText = await page.evaluate(() => null);
await page.locator(".oral-review .opt-btn").first().click();
await page.locator(".oral-review .opt-btn.ok").waitFor();
const okText = (await page.locator(".oral-review .opt-btn.ok").textContent()).replace("💬", "").trim();
await page.locator(".oral-review .say-box:not(.hidden)").waitFor();
await page.evaluate((t) => { window.__fakeSay = t; }, okText);
await click("🎤 Je la dis");
await page.getByText(/Bien dit/).waitFor({ timeout: 20000 });
await page.screenshot({ path: `${OUT}/08-revision-sarah.png` });
await page.evaluate(() => { window.__fakeSay = ""; });
await page.waitForFunction(() => /Question 2/.test(document.querySelector(".oral-review .rev-top")?.textContent || ""), null, { timeout: 20000 });
// question 2 : on force une erreur visible en rouge si possible
const n2 = await page.locator(".oral-review .opt-btn").count();
for (let i = 0; i < n2; i++) { /* on clique la première */ }
await page.locator(".oral-review .opt-btn").nth(0).click();
await page.locator(".oral-review .opt-btn.ok").waitFor();
await page.setViewportSize({ width: 412, height: 915 });
await page.screenshot({ path: `${OUT}/08b-revision-sarah-rep.png` });
await page.setViewportSize({ width: 1280, height: 900 });
step("Révision en mode cartes");
await click("🃏 Mode cartes");
await click("👁 Voir la réponse"); await click("😣 Oublié");
await click("👁 Voir la réponse"); await click("🙂 Bien");
await page.screenshot({ path: `${OUT}/08-revision.png` });
await click("💬 Revenir au mode Sarah");

step("Conversation conservée après rotation / rechargement");
await page.goto(URL0 + "#/parler");
await page.getByText("Parler avec Alex").click();
await page.getByPlaceholder(/Ou écrivez votre réponse/).fill("I like coffee");
await page.keyboard.press("Enter");
await page.getByText("Nice! And where are you from?").first().waitFor();
await page.setViewportSize({ width: 412, height: 915 });
await page.reload();
await page.getByText("I like coffee").waitFor();
await page.getByText("Conversation reprise").waitFor();
await page.screenshot({ path: `${OUT}/09-mobile-conversation.png` });

step("Tous les onglets s'ouvrent sans erreur");
for (const r of ["home", "parler", "ecouter", "prononciation", "vocabulaire", "dialogues", "amerique", "memoire", "jeux", "programme", "progres", "reglages", "plus"]) {
  await page.goto(URL0 + "#/" + r); await page.waitForTimeout(250);
  const h1 = await page.locator("main h1, main .hello").first().textContent();
  console.log("   ", r, "→", h1.trim().slice(0, 40));
  if (["home", "jeux", "progres", "memoire"].includes(r)) await page.screenshot({ path: `${OUT}/10-mobile-${r}.png`, fullPage: true });
}
step("Jeu : écoute et choisis");
await page.goto(URL0 + "#/jeux");
await page.getByText("Écoute et choisis").first().click();
await page.locator(".choice-btn").first().click(); await click("Suivant ➜");
step("Coach mémoire : aide-moi à retenir");
await page.goto(URL0 + "#/memoire");
await page.getByRole("button", { name: "🧠 AIDE-MOI À RETENIR" }).first().click();
await click("Suivant ➜"); await click(/Une autre astuce/); await page.getByText("Hello = « allô »").waitFor().catch(() => {});
await page.screenshot({ path: `${OUT}/11-memoire.png` });
await page.keyboard.press("Escape");
step("Export de la sauvegarde");
await page.goto(URL0 + "#/reglages");
const [dl] = await Promise.all([page.waitForEvent("download"), click("⬇️ Exporter ma sauvegarde")]);
console.log("    fichier :", dl.suggestedFilename());
step("Mode sombre, grand écran déplié");
await page.emulateMedia({ colorScheme: "dark" });
await page.setViewportSize({ width: 884, height: 1000 });
await page.goto(URL0 + "#/home");
await page.screenshot({ path: `${OUT}/12-sombre-deplie.png`, fullPage: true });
step("Jour 15 : mots préparés par l'IA");
await editState(() => { const s = JSON.parse(localStorage.getItem("speak-american:v1")); for (let d = 1; d < 15; d++) s.program.days[d] = { steps: {}, done: true }; s.conversation = null; localStorage.setItem("speak-american:v1", JSON.stringify(s)); });
await page.goto(URL0 + "#/lecon/15"); await page.reload();
if (await page.locator(".focus").count()) await page.getByRole("button", { name: "Quitter le plein écran" }).first().click();
await click(/Apprendre/);
await page.getByText("Test phrase 1").first().waitFor({ timeout: 8000 });

await browser.close(); server.kill(); mock.close();
if (errors.length) { console.error("ERREURS :", errors); process.exit(1); }
console.log("\n✅ Parcours complet réussi, aucune erreur JavaScript.");
