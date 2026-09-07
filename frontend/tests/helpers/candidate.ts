import type { CandidateProfile } from "@/server/types"

/** Fabrique un candidat réaliste (test) avec surcharges possibles. */
export function makeCandidate(overrides: Partial<CandidateProfile> = {}): CandidateProfile {
  return {
    id: "c1",
    profile: {
      name: "Sophie Martin",
      contact: {
        email: "sophie.martin@exemple.fr",
        phone: "0601020304",
        location: "Lyon",
        links: [],
      },
      skills: ["React", "TypeScript", "Node.js", "SQL", "Docker", "AWS"],
      experience: [
        {
          title: "Développeuse fullstack",
          company: "ACME",
          start: "2019",
          end: null,
          location: null,
          bullets: ["Développement front React", "API Node"],
        },
      ],
      education: [
        { degree: "Master Informatique", school: "Université Lyon 1", year: "2018" },
      ],
      certifications: ["AWS Practitioner"],
      languages: ["français", "anglais"],
      summary: "Profil confirmé.",
    },
    sourceText: "CV texte",
    analysis: {
      skills: ["React", "TypeScript"],
      experience_years: 6,
      experience_level: "Senior",
      overall_score: 87,
      strengths: ["Stack JS", "Autonomie"],
      weaknesses: [],
      key_achievements: [],
      summary: "",
      confidence_score: 0.92,
      industries: ["Tech"],
    },
    uploadedAt: "2026-09-07T00:00:00.000Z",
    filename: "cv-sophie.pdf",
    ...overrides,
  }
}
