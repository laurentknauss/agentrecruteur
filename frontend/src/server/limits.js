// Bornes d'entrée partagées (route d'upload, extraction PDF, appels LLM).
// Fichier .js : consommé à la fois par les modules TypeScript et les workers CommonJS/ESM.

/** Taille maximale du fichier PDF accepté (10 Mo). */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Taille maximale du corps multipart (fichier + enveloppe), contrôlée avant lecture. */
export const MAX_BODY_BYTES = MAX_UPLOAD_BYTES + 1024 * 1024;

/** Nombre de pages maximal d'un CV (les CV au-delà ne sont pas analysés). */
export const MAX_PDF_PAGES = 20;

/** Nombre de caractères maximal envoyé au LLM (bornage du prompt). */
export const MAX_RESUME_TEXT_CHARS = 60_000;

/** Longueur maximale d'une question posée sur un candidat. */
export const MAX_QUESTION_CHARS = 2_000;

/** Dépôts d'upload autorisés par IP et par fenêtre. */
export const UPLOAD_RATE_LIMIT = { limit: 5, windowMs: 60 * 60 * 1000 };
