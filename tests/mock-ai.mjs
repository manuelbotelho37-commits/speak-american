// Faux fournisseur d'IA (compatible « chat completions ») pour les tests automatiques uniquement.
import http from "node:http";
export const calls = [];
export function startMock(port = 8799) {
  return new Promise(res => {
    const srv = http.createServer(async (req, resp) => {
      const chunks = []; for await (const c of req) chunks.push(c);
      const body = JSON.parse(Buffer.concat(chunks).toString() || "{}");
      calls.push({ auth: req.headers.authorization, body });
      const sys = body.messages?.[0]?.content || "";
      let out;
      if (sys.includes("Create exactly 5")) out = { items: [1, 2, 3, 4, 5].map(i => ({ en: `Test phrase ${i}`, fr: `Phrase test ${i}`, ph: "TEST", ipa: "/tɛst/", ex: `This is test phrase ${i}.`, exFr: `Ceci est la phrase ${i}.`, tip: "astuce", emoji: "🧪", dlg: [["A", "Hi", "Salut"], ["B", "Hello", "Bonjour"]] })) };
      else if (sys.includes("Review this conversation")) out = { summary_fr: "Bonne conversation.", strengths_fr: ["Salutations"], improve_fr: ["Le TH"], errors: [{ original: "I am agree", better: "I agree", explanation_fr: "Pas de « am »." }], review_words: ["Hello"] };
      else if (sys.includes("remember an American")) out = { simple_fr: "bonjour", association_fr: "Hello = « allô » au téléphone", sound_tip_fr: "Soufflez le H" };
      else {
        const last = body.messages[body.messages.length - 1].content;
        out = { reply: "Nice! And where are you from?", reply_fr: "Super ! Et d'où viens-tu ?", correction: /i am agree/i.test(last) ? { needed: true, original: "I am agree", better: "I agree", explanation_fr: "On dit « I agree »." } : { needed: false, original: "", better: "", explanation_fr: "" }, suggestions: [{ en: "I'm from France.", fr: "Je viens de France." }, { en: "From Lyon.", fr: "De Lyon." }], used_words: ["hello"], coach_fr: "" };
      }
      resp.writeHead(200, { "content-type": "application/json" });
      resp.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify(out) } }] }));
    }).listen(port, () => res(srv));
  });
}
