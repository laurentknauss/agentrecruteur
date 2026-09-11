// Initialisation du stockage — sélection Atlas ou mémoire.
import { candidateStore, type CandidateRepository } from "./store"
import { mongoCandidateStore } from "./database/mongoCandidateStore"
import MongoDBConnection from "./database/mongodb"

// On ne mémorise que la tentative réussie : un repli mémoire n'est pas figé à vie,
// une requête ultérieure retentera Atlas (le coût est porté par mongodb.ts, qui
// conserve lui-même son état de connexion).
let mongoRepository: Promise<CandidateRepository> | null = null

export async function getRepository(): Promise<CandidateRepository> {
  mongoRepository ??= MongoDBConnection.getInstance()
    .connect()
    .then(() => mongoCandidateStore)

  try {
    return await mongoRepository
  } catch (error) {
    console.warn(
      "⚠️ MongoDB Atlas unavailable — falling back to in-memory storage:",
      error instanceof Error ? error.message : error,
    )
    mongoRepository = null
    return candidateStore
  }
}
