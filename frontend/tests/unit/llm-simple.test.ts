import { describe, it, expect } from "vitest"
import { generateSimpleAnswer } from "@/server/llm"
import { makeCandidate } from "../helpers/candidate"

describe("generateSimpleAnswer (règles locales, sans LLM) — edge cases", () => {
  it("répond sur le nom quand demandé (fr + en)", () => {
    const c = makeCandidate()
    expect(generateSimpleAnswer("Qui est le candidat ?", c)).toContain("Sophie Martin")
    expect(generateSimpleAnswer("what is his name?", c)).toContain("Sophie Martin")
  })

  it("gère l'absence de nom", () => {
    const c = makeCandidate({ profile: { ...makeCandidate().profile, name: null } })
    expect(generateSimpleAnswer("nom du candidat", c)).toBe(
      "Nom non disponible dans le CV.",
    )
  })

  it("liste les compétences (limitées à 5)", () => {
    const c = makeCandidate()
    const answer = generateSimpleAnswer("Quelles compétences ?", c)
    expect(answer).toContain("Compétences principales:")
    expect(answer).toContain("React")
    // 6 compétences dans la fixture → seulement 5 affichées
    expect(answer).not.toContain("AWS")
  })

  it("gère l'absence de compétences", () => {
    const c = makeCandidate({ profile: { ...makeCandidate().profile, skills: [] } })
    expect(generateSimpleAnswer("compétences", c)).toBe(
      "Aucune compétence technique identifiée.",
    )
  })

  it("gère expérience nulle / niveau indéterminé", () => {
    const c = makeCandidate({
      analysis: {
        ...makeCandidate().analysis,
        experience_years: 0,
        experience_level: "",
      },
    })
    const answer = generateSimpleAnswer("années d'expérience", c)
    expect(answer).toContain("0 années")
    expect(answer).toContain("indéterminé")
  })

  it("contact absent → message dédié", () => {
    const c = makeCandidate({
      profile: {
        ...makeCandidate().profile,
        contact: { email: null, phone: null, location: null, links: [] },
      },
    })
    expect(generateSimpleAnswer("email ou téléphone", c)).toBe(
      "Informations de contact non disponibles.",
    )
  })

  it("formation absente → message dédié", () => {
    const c = makeCandidate({ profile: { ...makeCandidate().profile, education: [] } })
    expect(generateSimpleAnswer("sa formation", c)).toBe(
      "Aucune formation identifiée dans le CV.",
    )
  })

  it("score absent → 0/100", () => {
    const c = makeCandidate({
      analysis: { ...makeCandidate().analysis, overall_score: 0 },
    })
    const answer = generateSimpleAnswer("score", c)
    expect(answer).toContain("0/100")
  })

  it("points forts absents → message dédié", () => {
    const c = makeCandidate({
      analysis: { ...makeCandidate().analysis, strengths: [] },
    })
    expect(generateSimpleAnswer("points forts", c)).toBe("Points forts non analysés.")
  })

  it("ne matche pas une question hors règles (→ null, repli LLM)", () => {
    expect(generateSimpleAnswer("quel est ton plat préféré ?", makeCandidate())).toBeNull()
  })

  it("est insensible à la casse et aux accents basiques", () => {
    const c = makeCandidate()
    expect(generateSimpleAnswer("COMPÉTENCES ?", c)).toContain("Compétences principales")
    expect(generateSimpleAnswer("Expérience", c)).toContain("années")
  })
})
