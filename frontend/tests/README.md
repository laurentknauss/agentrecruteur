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

Résultat attendu : **3 fichiers, 29 tests, tous verts** (aucun appel réseau, aucun coût LLM —
les tests sont purement unitaires sur des fonctions pures / mémoire).

## Suites

| Suite | Fichier | Cible | Cas couverts (extraits) |
|---|---|---|---|
| **CandidateStore** (mémoire) | `tests/unit/store.test.ts` | `frontend/src/server/store.ts` | roundtrip set/get ; id inconnu → `undefined` ; `has()` ; count/clear ; delete true/false ; list() ; `listSummary()` (projection nom/compétences/expérience) ; **upsert** (écrase sans dupliquer) |
| **Validation PDF** | `tests/unit/pdf.test.ts` | `validatePDFBuffer` (`frontend/src/server/pdf.ts`) | buffer vide / null ; signature non-PDF ; PDF trop petit (< 1 024 o) ; **limite basse** (1 024 o) ; taille normale ; **> 10 Mo rejeté** ; limite haute exacte 10 Mo acceptée ; signatures partielles sans crash |
| **Q&A rule-based** | `tests/unit/llm-simple.test.ts` | `generateSimpleAnswer` (`frontend/src/server/llm.ts`) | question nom (fr/en) ; nom absent ; compétences **limitées à 5** ; compétences absentes ; expérience nulle / niveau indéterminé ; contact absent ; formation absente ; score 0 → `0/100` ; points forts absents ; question hors règles → `null` (repli LLM) ; insensibilité casse/accents |

## Principes (à respecter pour tout nouveau test)

1. **Hermétique** — aucun appel externe (réseau, OpenAI, MongoDB). On teste le code local pur.
2. **Edge cases d'abord** — bordures (min/max), valeurs absentes/vides, casse/accents, `undefined`/`null`.
3. **Un helper par fixture** — `tests/helpers/candidate.ts` centralise le candidat de test
   (`makeCandidate()` avec surcharges), évitant la duplication.
4. **Nommage explicite** — chaque `it()` décrit le comportement attendu en français.
5. **Pas de flakiness** — aucune dépendance d'ordre : le store est nettoyé (`clear()`) avant chaque test.

## Pourquoi c'est utile en vue d'une commercialisation

- **Régression** : le verrou démo, la projection CV ou la validation upload peuvent évoluer sans casser le contrat.
- **Sécurité** : bornes de taille (10 Mo), signature PDF, entrées absentes → premières lignes de défense.
- **Coût** : les réponses rule-based couvrent une part des questions SANS appel LLM — les tests verrouillent ce comportement économique.

## Roadmap (à venir, non inclus)

- Tests des **route handlers API** (upload 403 sous `DEMO_LOCK`, candidats, health) via appels HTTP mocks.
- Tests **orchestrateur/workers** avec client LLM **mocké** (aucune clé requise).
- Tests **e2e** (Playwright) du parcours upload → analyse → Q&A en mode démo.
