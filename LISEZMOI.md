# SPEAK AMERICAN 🇺🇸 — guide simple

Votre coach d'anglais américain en 120 séances. **Tout est gratuit** : aucun abonnement, aucune carte bancaire, aucune publicité.

---

## 1. Les choix techniques (en bref)

| Besoin | Solution choisie | Coût | Limites honnêtes |
|---|---|---|---|
| Application sur PC et Galaxy Z Fold 7 | **PWA** (une page web qui s'installe comme une application) | 0 € | Fonctionne dans Chrome et Edge. |
| Hébergement | **Netlify** (offre gratuite) | 0 € | Largement suffisant pour un usage personnel. |
| Voix américaine d'Alex et des personnages | **Synthèse vocale du navigateur** | 0 € | Qualité selon l'appareil : très bonne avec les voix « Natural » d'Edge sur Windows, correcte avec les voix Google sur Android. |
| Reconnaissance de votre voix | **Reconnaissance vocale de Chrome / Edge** | 0 € | Il faut Internet. Le son est transformé en texte par Google (Chrome) ou Microsoft (Edge). Pas disponible dans Firefox. |
| Conversation avec Alex (vraie IA) | **Groq**, offre gratuite (modèle `openai/gpt-oss-120b`) via un petit serveur relais | 0 € | Environ 30 messages par minute et 1 000 par jour : bien plus qu'une séance quotidienne. Si la limite est atteinte, l'application le dit clairement. |
| Mémorisation | **FSRS** (algorithme de répétition espacée moderne) | 0 € | Calculé sur votre appareil. |
| Sauvegarde | Mémoire du navigateur + **export/restauration** d'un fichier | 0 € | Pas de synchronisation automatique entre PC et téléphone (voir §5). |
| Analyse phonétique | Non incluse | — | Aucun service gratuit fiable. L'application montre honnêtement quels mots ont été reconnus et permet de comparer votre voix à la voix américaine, **sans jamais inventer de note**. |

**Pourquoi un serveur relais ?** La clé de l'IA ne doit jamais être visible dans l'application. Elle reste cachée sur Netlify, et un **code d'accès** que vous choisissez empêche les inconnus d'utiliser votre quota gratuit.

**Pourquoi Groq et pas Google Gemini ?** Les conditions de l'offre gratuite de Gemini la réservent aux utilisateurs hors d'Europe ; Groq n'a pas cette restriction.

---

## 2. Installation (environ 15 minutes, une seule fois)

### Étape 1 — Créer votre clé IA gratuite (Groq)
1. Allez sur **console.groq.com** et créez un compte (avec Google, c'est le plus simple).
2. Menu **API Keys** → **Create API Key** → nom : `speak-american` → **Submit**.
3. **Copiez la clé** (elle commence par `gsk_`) et gardez-la de côté (dans une note). Ne la donnez à personne.

### Étape 2 — Mettre l'application sur GitHub
Je m'en occupe pour vous : créez simplement un dépôt **vide** sur github.com nommé `speak-american` (bouton **New**, rien d'autre à cocher), puis dites-le-moi dans le projet. J'y dépose tous les fichiers.

### Étape 3 — Publier sur Netlify (gratuit)
1. Allez sur **app.netlify.com** → **Sign up** → **Continue with GitHub**.
2. **Add new project** → **Import an existing project** → **GitHub** → choisissez `speak-american`.
3. Ne changez rien aux réglages, cliquez sur **Deploy**.
4. Une fois en ligne : **Project configuration** → **Environment variables** → **Add a variable** :
   - Clé : `AI_API_KEY` → valeur : votre clé Groq (`gsk_…`)
   - Clé : `ACCESS_CODE` → valeur : un code que vous inventez (ex. `manu-1971`). C'est votre mot de passe pour Alex.
5. **Deploys** → **Trigger deploy** → **Deploy project** (pour prendre en compte les variables).
6. Notez l'adresse de votre application (du type `https://speak-american-xxxx.netlify.app`). Vous pouvez la renommer dans **Project configuration → Change project name**.

### Étape 4 — Installer sur votre ordinateur Windows
1. Ouvrez l'adresse dans **Microsoft Edge** (meilleures voix américaines).
2. Cliquez sur l'icône **⊕ Installer** à droite de la barre d'adresse.
3. Dans l'application : **Réglages → Alex (IA)** → tapez votre code d'accès → **Enregistrer et tester**. Vous devez voir « 🟢 Alex connecté ».

### Étape 5 — Installer sur le Galaxy Z Fold 7
1. Ouvrez l'adresse dans **Google Chrome**.
2. Menu **⋮** → **Ajouter à l'écran d'accueil** → **Installer**.
3. Entrez le même code d'accès dans **Réglages**.
4. Si Alex n'a pas d'accent américain : **Paramètres du téléphone → Gestion globale → Synthèse vocale** → moteur **Google** → installez **Anglais (États-Unis)**.

---

## 3. Utilisation quotidienne
Ouvrez l'application et appuyez sur **COMMENCER / CONTINUER MA LEÇON**. C'est tout.
- **PARLER AVEC ALEX** : conversation libre à tout moment.
- **RÉVISER MES MOTS** : 2 à 5 minutes, quand vous voulez.
- Appuyez sur **🎤 COMMENCER À PARLER** une seule fois : ensuite le micro se rallume tout seul après chaque réponse d'Alex (mode mains libres). Appuyez de nouveau pour faire une pause.

---

## 4. Ce qui fonctionne sans IA
Même sans Internet ou sans clé : leçons, mots, révisions, jeux, studio de prononciation (sans reconnaissance vocale hors ligne), **dialogues guidés** (répliques préparées, clairement indiquées « sans IA »). Les jours 1 à 14 ont leurs mots intégrés ; à partir du jour 15, Alex prépare les 5 mots du jour une seule fois (il faut l'IA), puis ils sont gardés sur l'appareil.

## 5. Vos données
- Tout est enregistré **automatiquement sur l'appareil**, et une copie de secours quotidienne est gardée.
- Les mises à jour de l'application **n'effacent jamais** vos progrès.
- PC et téléphone ont chacun leurs données. Pour passer de l'un à l'autre : **Réglages → Exporter ma sauvegarde** sur l'un, puis **Restaurer une sauvegarde** sur l'autre.
- Envoyé sur Internet : le texte de vos phrases à l'IA pendant les conversations, et le son du micro au service de reconnaissance vocale de Chrome/Edge. Vos enregistrements de prononciation restent sur l'appareil et sont effacés après l'exercice.
- **Réglages → Supprimer toutes mes données** efface tout.

## 6. Rappels
**Réglages → Rappels** : téléchargez un événement quotidien et ouvrez-le pour l'ajouter à votre agenda (Google Agenda, Outlook, Samsung Agenda). C'est le moyen gratuit et fiable de recevoir une notification chaque jour.

---

## Pour les curieux : fichiers
- `index.html`, `css/`, `js/` : l'application (sans framework, rapide).
- `js/content.js` : mots, sons, personnages, dialogues guidés, test de niveau. `js/program.js` : les 120 séances.
- `js/srs.js` : répétition espacée FSRS. `js/store.js` : sauvegarde locale.
- `server/alex-core.mjs` + `netlify/functions/alex.mjs` : le serveur relais (clé cachée, code d'accès).
- `tests/` : tests automatiques (`node tests/unit.mjs`, `node tests/e2e.mjs`).
- Variables facultatives : `AI_MODEL` (autre modèle Groq), `AI_FALLBACK_MODEL` (modèle de secours si le premier est saturé), `AI_BASE_URL` (autre fournisseur compatible).
