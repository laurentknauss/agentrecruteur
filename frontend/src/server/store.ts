// Storage abstraction for candidate profiles.
// Backends: in-memory (fallback) or MongoDB Atlas (persistent).
import { CandidateProfile } from './types.ts';

export interface CandidateSummary {
  id: string;
  name: string;
  uploadedAt: string;
  skillsCount: number;
  experience: string;
}

/**
 * Contexte de lecture/écriture.
 * `ownerId` non nul → seuls les candidats de ce propriétaire sont visibles/modifiables.
 * `null`/`undefined` → aucune restriction (usage administrateur, ou développement).
 */
export type OwnerFilter = string | null | undefined;

export interface CandidateRepository {
  readonly backend: 'memory' | 'mongodb';
  set(id: string, candidate: CandidateProfile): Promise<void>;
  get(id: string, ownerId?: OwnerFilter): Promise<CandidateProfile | undefined>;
  has(id: string, ownerId?: OwnerFilter): Promise<boolean>;
  delete(id: string, ownerId?: OwnerFilter): Promise<boolean>;
  list(ownerId?: OwnerFilter): Promise<CandidateProfile[]>;
  listSummary(ownerId?: OwnerFilter): Promise<CandidateSummary[]>;
  count(ownerId?: OwnerFilter): Promise<number>;
  /** Retrouve un candidat par empreinte SHA-256 (déduplication d'upload). */
  findByFingerprint(fingerprint: string, ownerId?: OwnerFilter): Promise<CandidateProfile | undefined>;
  clear(): Promise<void>;
}

/** Applique le filtre propriétaire quand un contexte est fourni. */
export function matchesOwner(candidate: CandidateProfile, ownerId: OwnerFilter): boolean {
  if (ownerId === null || ownerId === undefined) return true;
  return candidate.ownerId === ownerId;
}

// In-memory fallback (data lost on restart)
class CandidateStore implements CandidateRepository {
  readonly backend = 'memory' as const;
  private store = new Map<string, CandidateProfile>();

  async set(id: string, candidate: CandidateProfile): Promise<void> {
    this.store.set(id, candidate);
    console.log(`📁 Stored candidate ${id} (total: ${this.store.size})`);
  }

  async get(id: string, ownerId: OwnerFilter = null): Promise<CandidateProfile | undefined> {
    const candidate = this.store.get(id);
    return candidate && matchesOwner(candidate, ownerId) ? candidate : undefined;
  }

  async has(id: string, ownerId: OwnerFilter = null): Promise<boolean> {
    return (await this.get(id, ownerId)) !== undefined;
  }

  async delete(id: string, ownerId: OwnerFilter = null): Promise<boolean> {
    const candidate = this.store.get(id);
    if (!candidate || !matchesOwner(candidate, ownerId)) return false;
    const deleted = this.store.delete(id);
    if (deleted) {
      console.log(`🗑️ Deleted candidate ${id} (remaining: ${this.store.size})`);
    }
    return deleted;
  }

  async list(ownerId: OwnerFilter = null): Promise<CandidateProfile[]> {
    return Array.from(this.store.values()).filter(c => matchesOwner(c, ownerId));
  }

  async listSummary(ownerId: OwnerFilter = null): Promise<CandidateSummary[]> {
    return (await this.list(ownerId)).map(c => ({
      id: c.id,
      name: c.profile.name || 'Nom non disponible',
      uploadedAt: c.uploadedAt,
      skillsCount: c.profile.skills?.length || 0,
      experience: `${c.analysis.experience_years || 0} ans`
    }));
  }

  async count(ownerId: OwnerFilter = null): Promise<number> {
    return (await this.list(ownerId)).length;
  }

  async findByFingerprint(fingerprint: string, ownerId: OwnerFilter = null): Promise<CandidateProfile | undefined> {
    return (await this.list(ownerId)).find(c => c.fingerprint === fingerprint);
  }

  async clear(): Promise<void> {
    this.store.clear();
    console.log('🧹 Cleared all candidates from store');
  }
}

// Singleton instance
export const candidateStore: CandidateRepository = new CandidateStore();
export default candidateStore;
