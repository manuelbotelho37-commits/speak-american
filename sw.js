// Service worker : l'application fonctionne hors ligne (sauf l'IA et la reconnaissance vocale).
// Les progrès sont dans localStorage : une mise à jour de ce fichier ne les efface JAMAIS.
const VERSION = "sa-v1.0.9";
const SHELL = ["./", "index.html", "css/style.css", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png",
  "js/main.js", "js/ui.js", "js/store.js", "js/srs.js", "js/speech.js", "js/ai.js", "js/content.js", "js/program.js", "js/talk.js", "js/learn.js", "js/pron.js"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/api/")) return;
  // Réseau d'abord (pour recevoir les mises à jour), cache si hors ligne
  e.respondWith(fetch(e.request).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); }
    return res;
  }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match("index.html"))));
});
