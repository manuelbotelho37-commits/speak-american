// Répétition espacée — implémentation de FSRS-4.5 (Free Spaced Repetition Scheduler)
// Notes : 1 = oublié, 2 = difficile, 3 = bien, 4 = facile
const W = [0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.031, 1.6474, 0.1367, 1.0461, 2.1072, 0.0793, 0.3246, 1.587, 0.2272, 2.8755];
const DECAY = -0.5;
const FACTOR = 19 / 81;
export const RETENTION = 0.9;
const DAY = 86400000;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

export const retrievability = (elapsedDays, S) => Math.pow(1 + FACTOR * elapsedDays / S, DECAY);
const intervalFor = (S) => Math.max(1, Math.round((S / FACTOR) * (Math.pow(RETENTION, 1 / DECAY) - 1)));
const initS = (g) => Math.max(0.1, W[g - 1]);
const initD = (g) => clamp(W[4] - (g - 3) * W[5], 1, 10);
const nextD = (D, g) => clamp(W[7] * initD(4) + (1 - W[7]) * (D - W[6] * (g - 3)), 1, 10);
const recallS = (D, S, R, g) => S * (Math.exp(W[8]) * (11 - D) * Math.pow(S, -W[9]) * (Math.exp(W[10] * (1 - R)) - 1) * (g === 2 ? W[15] : 1) * (g === 4 ? W[16] : 1) + 1);
const forgetS = (D, S, R) => Math.min(S, W[11] * Math.pow(D, -W[12]) * (Math.pow(S + 1, W[13]) - 1) * Math.exp(W[14] * (1 - R)));

export function newCard() {
  return { state: "new", S: 0, D: 0, due: 0, last: 0, reps: 0, lapses: 0, difficult: false };
}

// Met à jour une carte après une réponse. Les erreurs reviennent dans 10 minutes (même séance), sinon selon FSRS.
export function review(card, grade, now = Date.now()) {
  const c = { ...card };
  if (c.state === "new" || !c.S) {
    c.S = initS(grade);
    c.D = initD(grade);
  } else {
    const elapsed = Math.max(0, (now - c.last) / DAY);
    const R = retrievability(elapsed, c.S);
    c.D = nextD(c.D, grade);
    c.S = grade === 1 ? forgetS(c.D, c.S, R) : recallS(c.D, c.S, R, grade);
  }
  c.reps = (c.reps || 0) + 1;
  c.last = now;
  if (grade === 1) {
    if (card.state !== "new") c.lapses = (c.lapses || 0) + 1;
    c.state = "learning";
    c.due = now + 10 * 60000;
  } else {
    c.state = "review";
    // Un mot marqué « difficile » revient au plus tard dans 2 jours tant qu'il n'est pas consolidé
    let days = intervalFor(c.S);
    if (c.difficult) days = Math.min(days, 2);
    c.due = now + days * DAY;
  }
  return c;
}

export const isDue = (card, now = Date.now()) => card && card.state !== "new" && card.due <= now;
export const isMastered = (card) => !!card && card.state === "review" && card.S >= 21 && card.reps >= 3;
export const daysUntil = (card, now = Date.now()) => Math.round((card.due - now) / DAY);
