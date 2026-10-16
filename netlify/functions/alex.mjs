// Fonction Netlify : relais sécurisé vers l'IA gratuite. La clé reste sur le serveur.
import { handleAlex } from "../../server/alex-core.mjs";

export default async (req) => handleAlex(req, process.env);

export const config = { path: "/api/alex" };
