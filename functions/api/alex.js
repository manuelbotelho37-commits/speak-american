// Fonction Cloudflare Pages : relais sécurisé vers l'IA gratuite. La clé reste sur le serveur.
import { handleAlex } from "../../server/alex-core.mjs";

export const onRequest = (ctx) => handleAlex(ctx.request, ctx.env);
