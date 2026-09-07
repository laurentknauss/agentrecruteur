import { describe, it, expect, beforeEach } from "vitest"
import { candidateStore } from "@/server/store"
import type { CandidateProfile } from "@/server/types"

function sampleCandidate(id: string): CandidateProfile {
  return {
    id,
    profile: {
      name: `Candidat ${id}`,
      contact: { email: `${id}@exemple.fr`, phone: null, location: "Paris", links: [] },
      skills: ["React", "TypeScript"],
      experience: [
        {
          title: "Développeur",
          company: "ACME",
          start: "2020",
          end: null,
          location: null,
          bullets: ["Dev front"],
        },
      ],
      education: [],
      certifications: [],
      languages: ["français"],
      summary: null,
    },
    sourceText: "texte brut du CV",
    analysis: {
      skills: ["React", "TypeScript"],
      experience_years: 5,
      experience_level: "Senior",
      overall_score: 82,
      strengths: [],
      weaknesses: [],
      key_achievements: [],
      summary: "",
      confidence_score: 0.9,
      industries: [],
    },
    uploadedAt: "2026-09-07T00:00:00.000Z",
    filename: `${id}.pdf`,
  }
}

describe("CandidateStore (mémoire)", () => {
  beforeEach(async () => {
    await candidateStore.clear()
  })

  it("expose le backend mémoire", () => {
    expect(candidateStore.backend).toBe("memory")
  })

  it("enregistre puis relit un candidat (roundtrip)", async () => {
    const c = sampleCandidate("a1")
    await candidateStore.set(c.id, c)

    const found = await candidateStore.get("a1")
    expect(found).toBeDefined()
    expect(found?.id).toBe("a1")
    expect(found?.profile.name).toBe("Candidat a1")
    expect(found?.analysis.overall_score).toBe(82)
    expect(found?.filename).toBe("a1.pdf")
  })

  it("retourne undefined pour un id inconnu", async () => {
    await expect(candidateStore.get("missing")).resolves.toBeUndefined()
  })

  it("has() reflète la présence", async () => {
    await expect(candidateStore.has("x")).resolves.toBe(false)
    await candidateStore.set("x", sampleCandidate("x"))
    await expect(candidateStore.has("x")).resolves.toBe(true)
  })

  it("compte les candidats et clear() remet à zéro", async () => {
    await candidateStore.set("c1", sampleCandidate("c1"))
    await candidateStore.set("c2", sampleCandidate("c2"))
    await expect(candidateStore.count()).resolves.toBe(2)

    await candidateStore.clear()
    await expect(candidateStore.count()).resolves.toBe(0)
  })

  it("supprime un candidat (true) et signale l'absence (false)", async () => {
    await candidateStore.set("d1", sampleCandidate("d1"))
    await expect(candidateStore.delete("d1")).resolves.toBe(true)
    await expect(candidateStore.delete("d1")).resolves.toBe(false)
  })

  it("liste les candidats", async () => {
    await candidateStore.set("l1", sampleCandidate("l1"))
    await candidateStore.set("l2", sampleCandidate("l2"))
    const all = await candidateStore.list()
    expect(all.map((c) => c.id).sort()).toEqual(["l1", "l2"])
  })

  it("listSummary() projette nom / compétences / expérience", async () => {
    await candidateStore.set("s1", sampleCandidate("s1"))
    const summary = await candidateStore.listSummary()
    expect(summary).toHaveLength(1)
    expect(summary[0]).toMatchObject({
      id: "s1",
      name: "Candidat s1",
      skillsCount: 2,
      experience: "5 ans",
    })
    expect(summary[0].uploadedAt).toBe("2026-09-07T00:00:00.000Z")
  })

  it("écrase une entrée existante (upsert)", async () => {
    await candidateStore.set("u1", sampleCandidate("u1"))
    const updated = sampleCandidate("u1")
    updated.analysis.overall_score = 99
    await candidateStore.set("u1", updated)

    const found = await candidateStore.get("u1")
    expect(found?.analysis.overall_score).toBe(99)
    await expect(candidateStore.count()).resolves.toBe(1)
  })
})
