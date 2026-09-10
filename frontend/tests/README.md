# Tests — stratégie & edge cases

Suite de tests unitaires **Vitest** pour le code métier de CV Inspector — pensée pour être
compréhensible par un CTO sur un repo public, et pour soutenir une éventuelle **commercialisation**
(couverture renforcée, exécution hermétique sans réseau ni coûts LLM).

## Pourquoi ce README

Les tests ne se contentent pas de vérifier le cas nominal : ils documentent les **cas limites**
(edge cases) et les **invariants** du domaine. Un lecteur extérieur doit comprendre, en parcourant
ce dossier, ce qui est garanti par la suite et ce qui ne l'est pas.

## Exécution

```bash
pnpm install
pnpm test          # depuis la racine (alias frontend)
# ou :
cd frontend && pnpm test        # équivalent
```

Résultat attendu : **7 fichiers, 70 tests, tous verts** (aucun appel réseau, aucun coût LLM —
les tests sont purement unitaires sur des fonctions pures / mémoire).

## Suites

| Suite | Fichier | Cible | Cas couverts (extraits) |
|---|---|---|---|
| **CandidateStore** (mémoire) | `tests/unit/store.test.ts` | `frontend/src/server/store.ts` | roundtrip set/get ; id inconnu → `undefined` ; `has()` ; count/clear ; delete true/false ; list() ; `listSummary()` (projection nom/compétences/expérience) ; **upsert** (écrase sans dupliquer) ; **filtrage par propriétaire** (lecture/suppression/count) ; portée administrateur sans contexte ; `findByFingerprint()` |
| **Validation PDF** | `tests/unit/pdf.test.ts` | `validatePDFBuffer` (`frontend/src/server/pdf.ts`) | buffer vide / null ; signature non-PDF ; PDF trop petit (< 1 024 o) ; **limite basse** (1 024 o) ; taille normale ; **> 10 Mo rejeté** ; limite haute exacte 10 Mo acceptée ; signatures partielles sans crash |
| **Route d'upload** | `tests/unit/upload-route.test.ts` | `POST /api/upload-cv` | fichier absent ; mauvais champ ; MIME non PDF ; fichier > 10 Mo (413) ; **corps trop gros rejeté avant tampon** (413) ; signature non PDF ; **422 PDF chiffré / sans texte / illisible** ; **502 service d'analyse** ; 500 générique corrélé sans fuite de message ; mode de stockage exposé ; **déduplication sha256** (aucun second appel LLM) ; **rate-limit 429** |
| **Classification d'erreurs** | `tests/unit/errors.test.ts` | `frontend/src/server/errors.ts` | `toPdfError` (mot de passe, bornes, sans texte, corrompu, idempotence) ; `toAnalysisError` (LLM → 502, PDF → 422) |
| **Garde-fou d'accès** | `tests/unit/guard.test.ts` | `frontend/src/server/auth/guard.ts` | `ADMIN_TOKEN` absent en production → **503 fail-closed** ; absent en dev → accès local ; jeton absent/erroné → 401 ; jeton valide → `ownerId` ; `optionalOwnerId` |
| **Q&A rule-based** | `tests/unit/llm-simple.test.ts` | `generateSimpleAnswer` (`frontend/src/server/llm.ts`) | question nom (fr/en) ; nom absent ; compétences **limitées à 5** ; compétences absentes ; expérience nulle / niveau indéterminé ; contact absent ; formation absente ; score 0 → `0/100` ; points forts absents ; question hors règles → `null` (repli LLM) ; insensibilité casse/accents |
| **Limiteur de débit** | `tests/unit/rate-limit.test.ts` | `frontend/src/server/rate-limit.ts` | résolution d'IP (`x-forwarded-for`, `x-real-ip`, défaut) ; blocage au-delà de la limite ; compteurs isolés par clé ; libération à l'expiration de la fenêtre |

## Principes (à respecter pour tout nouveau test)

1. **Hermétique** — aucun appel externe (réseau, OpenAI, MongoDB). On teste le code local pur.
2. **Edge cases d'abord** — bordures (min/max), valeurs absentes/vides, casse/accents, `undefined`/`null`.
3. **Un helper par fixture** — `tests/helpers/candidate.ts` centralise le candidat de test
   (`makeCandidate()` avec surcharges), évitant la duplication.
4. **Nommage explicite** — chaque `it()` décrit le comportement attendu en français.
5. **Pas de flakiness** — aucune dépendance d'ordre : le store est nettoyé (`clear()`) avant chaque test.

## Pourquoi c'est utile en vue d'une commercialisation

- **Régression** : la projection CV, la validation upload ou la classification d'erreurs peuvent évoluer sans casser le contrat.
- **Sécurité** : bornes de taille (10 Mo), signature PDF, entrées absentes, garde-fou fail-closed des routes de données → premières lignes de défense.
- **Coût** : les réponses rule-based couvrent une part des questions SANS appel LLM, et la déduplication évite une seconde analyse payante — les tests verrouillent ces comportements économiques.

## Roadmap (à venir, non inclus)

- Tests **orchestrateur/workers** avec client LLM **mocké** (couverture directe des workers, pas seulement via la route).
- Tests **e2e** (Playwright) du parcours upload → analyse → Q&A.
- Tests d'intégration MongoDB (aujourd'hui seuls le store mémoire et l'interface sont couverts).
