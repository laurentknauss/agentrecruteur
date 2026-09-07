// Initialisation du stockage (une seule fois) — sélection Atlas ou mémoire.
import { candidateStore, type CandidateRepository } from "./store"
import { mongoCandidateStore } from "./database/mongoCandidateStore"
import MongoDBConnection from "./database/mongodb"

let promise: Promise<CandidateRepository> | null = null

export function getRepository(): Promise<CandidateRepository> {
  promise ??= (async () => {
    try {
      await MongoDBConnection.getInstance().connect()
      return mongoCandidateStore
    } catch (error) {
      console.warn(
        "⚠️ MongoDB Atlas unavailable — falling back to in-memory storage:",
        error instanceof Error ? error.message : error,
      )
      return candidateStore
    }
  })()
  return promise
}

export const DEMO_LOCKED = process.env.DEMO_LOCK === "1"
export const DEMO_ERROR =
  "Accès restreint en démo. Contactez Laurent Knauss pour obtenir des identifiants."
