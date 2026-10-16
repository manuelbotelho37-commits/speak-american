// Programme de 120 séances : 4 mois × 4 semaines (7, 7, 8, 8 jours = 30 jours par mois)
import { VOCAB, WEEK_SOUND } from "./content.js";

const WEEKS = [
  // MOIS 1 — LES FONDATIONS
  { theme: "Salutations, présentation, prononciation de base", character: "sarah", guided: "sarah_meet", days: [
    ["Dire bonjour", "Saluer quelqu'un et demander comment il va."],
    ["Se présenter", "Dire son prénom, d'où l'on vient, sa nationalité.", "My name is… / I'm from… : le verbe « to be » (I am = I'm)."],
    ["Les mots magiques", "Remercier, s'excuser, demander poliment.", "« Excuse me » avant, « Sorry » après."],
    ["Survivre quand on ne comprend pas", "Dire oui, non, faire répéter, faire ralentir.", "Do not = don't : la négation simple."],
    ["Prendre congé", "Dire au revoir de façon naturelle."],
    ["Parler un peu de soi", "Dire où l'on habite, qu'on est en vacances, qu'on apprend l'anglais.", "I'm learning : le présent en -ing pour ce qui se passe en ce moment."],
    ["Bilan de la semaine 1", "Réviser et rejouer la rencontre avec Sarah.", null, true],
  ]},
  { theme: "Famille, âge, nationalité, nombres, questions courantes", character: "sarah", guided: "sarah_family", days: [
    ["Les nombres de 0 à 10", "Compter, donner un numéro de téléphone."],
    ["Les nombres et l'âge", "Dire son âge, distinguer 13 et 30.", "« I'm 54 » : en anglais on EST son âge."],
    ["Ma famille", "Présenter sa famille.", "My / your / his / her : les possessifs."],
    ["Nationalités et pays", "Parler de la France et des États-Unis.", "Do you…? : poser une question au présent."],
    ["Les questions de base", "What, where, who, when, how.", "Le mot interrogatif se met en premier."],
    ["Mon travail, mon quotidien", "Dire ce que l'on fait dans la vie.", "I work / he works : le S de la 3e personne."],
    ["Bilan de la semaine 2", "Réviser et parler de sa famille avec Sarah.", null, true],
  ]},
  { theme: "Nourriture, restaurant, café, achats", character: "michael", guided: "michael_restaurant", days: [
    ["Au café", "Commander une boisson, répondre « for here or to go ».", "I'd like = je voudrais (I would like)."],
    ["Les aliments du quotidien", "Nommer les aliments courants."],
    ["Réserver une table", "Téléphoner pour réserver au restaurant."],
    ["Lire le menu et commander", "Commander un plat, poser une question sur un plat.", "Can I have…? / Could I get…?"],
    ["L'addition et le pourboire", "Demander l'addition, comprendre le « tip »."],
    ["Au supermarché", "Trouver un produit, demander de l'aide.", "Is there… / Are there… ?"],
    ["Payer et compter l'argent", "Comprendre les prix en dollars.", "How much is it? / How much are they?"],
    ["Bilan de la semaine 3", "Rejouer un repas complet avec Michael.", null, true],
  ]},
  { theme: "Déplacements, directions, activités quotidiennes", character: "james", guided: "james_help", days: [
    ["Demander son chemin", "Demander où se trouve un lieu.", "Where is…? / How do I get to…?"],
    ["Gauche, droite, tout droit", "Comprendre des indications simples."],
    ["Les transports", "Bus, métro (subway), train, à pied."],
    ["Prendre un taxi", "Donner une adresse, payer la course."],
    ["L'heure et les horaires", "Demander et dire l'heure, a.m. et p.m."],
    ["Ma journée type", "Raconter sa routine.", "Always, usually, sometimes, never."],
    ["Les jours et les mois", "Dire une date, prendre un rendez-vous simple."],
    ["Bilan du mois 1", "Évaluation du premier mois et conversation libre simple.", null, true, true],
  ]},
  // MOIS 2 — LA VIE QUOTIDIENNE
  { theme: "Hôtel et voyage", character: "jessica", guided: "jessica_hotel", days: [
    ["À l'aéroport", "L'enregistrement, les bagages."],
    ["Le contrôle des passeports", "Répondre aux questions de l'agent.", "The purpose of your visit : répondre court et clair."],
    ["Arriver à l'hôtel", "Faire son check-in avec Jessica."],
    ["Un problème dans la chambre", "Signaler un problème poliment.", "There is no… / …doesn't work."],
    ["Informations touristiques", "Demander quoi visiter, les horaires."],
    ["La météo", "Parler du temps qu'il fait (en °F !)."],
    ["Bilan de la semaine 5", "Rejouer un séjour à l'hôtel.", null, true],
  ]},
  { theme: "Achats, vêtements, prix", character: "emily", guided: null, days: [
    ["Dans un magasin", "Saluer la vendeuse, dire qu'on regarde.", "I'm just looking, thanks."],
    ["Vêtements et tailles", "Demander une taille, comprendre S/M/L."],
    ["Essayer et échanger", "Le fitting room, échanger un article."],
    ["Prix, réductions, soldes", "Comprendre « on sale », « 20% off »."],
    ["Couleurs et goûts", "Dire ce qu'on aime ou pas.", "I like / I don't like / I love."],
    ["Acheter un cadeau", "Demander conseil pour un cadeau."],
    ["Bilan de la semaine 6", "Rejouer une séance shopping avec Emily.", null, true],
  ]},
  { theme: "Rendez-vous, téléphone, organisation", character: "jessica", guided: null, days: [
    ["Prendre rendez-vous", "Fixer un jour et une heure.", "On Monday / at 3 p.m. / in May."],
    ["Au téléphone : se présenter", "Commencer un appel, épeler son nom."],
    ["Laisser un message", "Laisser un message clair."],
    ["Proposer une sortie", "Inviter quelqu'un.", "Would you like to…? / Do you want to…?"],
    ["Accepter, refuser poliment", "Dire oui ou non sans vexer."],
    ["Changer un rendez-vous", "Annuler, reporter."],
    ["Chez le médecin et à la pharmacie", "Dire où l'on a mal.", "My… hurts. / I have a headache."],
    ["Bilan de la semaine 7", "Rejouer un appel téléphonique complet.", null, true],
  ]},
  { theme: "Travail, loisirs, famille et projets", character: "sarah", guided: null, days: [
    ["Parler de mon travail", "Décrire son métier en détail."],
    ["Collègues et entreprise", "Parler de son entreprise."],
    ["Mes loisirs", "Dire ce qu'on aime faire.", "I like + -ing : I like cooking."],
    ["Le sport et la nature", "Parler d'activités en plein air."],
    ["Ma famille en détail", "Décrire les membres de sa famille."],
    ["Mes projets", "Parler de l'avenir proche.", "I'm going to… (gonna à l'oral)."],
    ["Rêves et envies", "Exprimer un souhait.", "I'd love to… / I want to…"],
    ["Bilan du mois 2", "Évaluation du deuxième mois et conversation libre.", null, true, true],
  ]},
  // MOIS 3 — IMMERSION AMÉRICAINE
  { theme: "Conversations avec des amis", character: "sarah", guided: null, days: [
    ["Retrouver Sarah", "Prendre des nouvelles d'une amie.", "What's up? / How's it going?"],
    ["Le small talk à l'américaine", "Parler de tout et de rien."],
    ["Inviter des amis", "Organiser un dîner, un barbecue."],
    ["Une soirée entre amis", "Se mêler à une conversation."],
    ["Expressions familières", "Gonna, wanna, kinda, awesome, cool."],
    ["Séries et films", "Parler de ce qu'on regarde."],
    ["Bilan de la semaine 9", "Conversation libre avec Sarah.", null, true],
  ]},
  { theme: "Raconter sa journée et ses expériences", character: "alex", guided: null, days: [
    ["Hier", "Raconter ce qu'on a fait hier.", "Le passé en -ed : worked, played, visited."],
    ["Les verbes irréguliers courants", "Went, had, saw, ate, did.", "Les 10 verbes irréguliers qui servent tout le temps."],
    ["Raconter un voyage", "Décrire un voyage passé."],
    ["Raconter une anecdote", "Enchaîner : first, then, after that, finally."],
    ["Le week-end dernier", "Raconter son week-end."],
    ["Mon parcours de vie", "Les grandes étapes de sa vie.", "I was born in… / I have lived here for…"],
    ["Bilan de la semaine 10", "Raconter sa semaine à Alex.", null, true],
  ]},
  { theme: "Exprimer ses opinions et ses préférences", character: "sarah", guided: null, days: [
    ["Donner son avis", "I think / I feel / In my opinion."],
    ["D'accord, pas d'accord", "Exprimer son accord poliment.", "I agree / I'm not sure / I see your point, but…"],
    ["Comparer", "Better, more, less, the best.", "Le comparatif : bigger / more expensive."],
    ["Mes préférences", "I prefer / I'd rather."],
    ["Donner un conseil", "You should / You could."],
    ["La France et les USA", "Comparer les deux cultures."],
    ["Débattre poliment", "Défendre une idée simplement."],
    ["Bilan de la semaine 11", "Une discussion d'opinions avec Sarah.", null, true],
  ]},
  { theme: "Comprendre des conversations américaines naturelles", character: "alex", guided: null, days: [
    ["L'anglais rapide : les réductions", "Comprendre « whaddaya », « gotta », « lemme »."],
    ["Plusieurs voix, plusieurs vitesses", "S'habituer aux voix différentes."],
    ["Les questions inattendues", "Réagir quand on ne s'y attend pas."],
    ["Les accents américains", "New York, le Sud, la Californie."],
    ["Expressions idiomatiques", "Break a leg, piece of cake, no big deal."],
    ["Interrompre et relancer", "Sorry to interrupt / Going back to…"],
    ["Écouter des Américains entre eux", "Suivre une conversation à plusieurs."],
    ["Bilan du mois 3", "Évaluation du troisième mois et conversation longue.", null, true, true],
  ]},
  // MOIS 4 — CONVERSATIONS AUTONOMES
  { theme: "Conversations libres", character: "alex", guided: null, days: [
    ["Conversation libre avec Alex", "Parler librement de sa semaine."],
    ["L'actualité légère", "Parler des nouvelles sans débat difficile."],
    ["Mon quartier, ma ville", "Décrire où l'on vit."],
    ["Cuisine et recettes", "Expliquer une recette française."],
    ["Les fêtes américaines", "Thanksgiving, 4th of July, Halloween."],
    ["La maison et l'immobilier", "Décrire un logement avec David."],
    ["Bilan de la semaine 13", "Conversation libre longue.", null, true],
  ]},
  { theme: "Situations imprévues", character: "james", guided: null, days: [
    ["Un vol annulé", "Gérer un problème à l'aéroport."],
    ["Une erreur dans l'addition", "Signaler poliment une erreur."],
    ["Un objet perdu", "Décrire un objet, demander de l'aide."],
    ["Une urgence", "Demander de l'aide, appeler le 911."],
    ["Un malentendu", "Corriger un malentendu.", "What I meant was…"],
    ["Une panne de voiture", "Expliquer un problème mécanique simple."],
    ["Bilan de la semaine 14", "Enchaîner plusieurs imprévus.", null, true],
  ]},
  { theme: "Discussions prolongées", character: "sarah", guided: null, days: [
    ["Raconter ma vie en 5 minutes", "Parler longtemps sans s'arrêter."],
    ["Longue conversation avec Sarah", "Tenir 10 minutes de conversation."],
    ["Rendez-vous professionnel", "Une réunion avec David."],
    ["Visiter un logement", "Poser des questions détaillées à David."],
    ["Discussion de dîner", "Plusieurs sujets à table."],
    ["Un long appel téléphonique", "Comprendre sans voir la personne."],
    ["Parler de l'avenir", "Projets, envies, plans.", "I will / I'm going to / I hope to."],
    ["Bilan de la semaine 15", "Conversation prolongée libre.", null, true],
  ]},
  { theme: "Immersion intensive et évaluation finale", character: "alex", guided: null, days: [
    ["Immersion : une journée à New York", "Enchaîner café, métro, musée, restaurant."],
    ["Immersion : un road trip", "Station-service, motel, diner."],
    ["Immersion : soirée chez des Américains", "Une soirée complète en anglais."],
    ["Immersion : rendez-vous d'affaires", "Une réunion professionnelle complète."],
    ["Consolidation : mes mots difficiles", "Revoir les mots que j'oublie le plus.", null, true],
    ["Consolidation : mes sons difficiles", "Revoir les sons qui me posent problème.", null, true],
    ["Consolidation : conversation libre", "Une grande conversation avec Alex.", null, true],
    ["Évaluation finale", "Mesurer mes progrès depuis le jour 1.", null, true, true],
  ]},
];

export const PROGRAM = [];
{
  let day = 1;
  WEEKS.forEach((w, wi) => {
    w.days.forEach((d, di) => {
      const month = Math.floor((day - 1) / 30) + 1;
      PROGRAM.push({
        day, month, week: wi + 1, theme: w.theme,
        title: d[0], objective: d[1], grammar: d[2] || null,
        review: !!d[3], evaluation: !!d[4],
        character: w.character, guided: w.guided,
        sound: WEEK_SOUND[wi],
        vocabIds: VOCAB.filter(v => v.day === day).map(v => v.id),
      });
      day++;
    });
  });
}
if (PROGRAM.length !== 120) console.error("Le programme doit compter 120 séances, il en a", PROGRAM.length);

export const MONTHS = [
  { n: 1, title: "Les fondations", goal: "Comprendre et produire des phrases simples. Tenir de très courts échanges.", immersion: "Beaucoup d'aide en français" },
  { n: 2, title: "La vie quotidienne", goal: "Devenir plus autonome en voyage et au quotidien.", immersion: "Davantage d'anglais" },
  { n: 3, title: "Immersion américaine", goal: "Comprendre et répondre plus spontanément.", immersion: "Principalement en anglais" },
  { n: 4, title: "Conversations autonomes", goal: "Tenir de vraies conversations sur des sujets courants.", immersion: "Immersion presque complète, aide disponible" },
];

export const dayInfo = (n) => PROGRAM[Math.min(Math.max(n, 1), 120) - 1];
