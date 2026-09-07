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

export interface CandidateRepository {
  readonly backend: 'memory' | 'mongodb';
  set(id: string, candidate: CandidateProfile): Promise<void>;
  get(id: string): Promise<CandidateProfile | undefined>;
  has(id: string): Promise<boolean>;
  delete(id: string): Promise<boolean>;
  list(): Promise<CandidateProfile[]>;
  listSummary(): Promise<CandidateSummary[]>;
  count(): Promise<number>;
  clear(): Promise<void>;
}

// In-memory fallback (data lost on restart)
class CandidateStore implements CandidateRepository {
  readonly backend = 'memory' as const;
  private store = new Map<string, CandidateProfile>();

  async set(id: string, candidate: CandidateProfile): Promise<void> {
    this.store.set(id, candidate);
    console.log(`📁 Stored candidate ${id} (total: ${this.store.size})`);
  }

  async get(id: string): Promise<CandidateProfile | undefined> {
    return this.store.get(id);
  }

  async has(id: string): Promise<boolean> {
    return this.store.has(id);
  }

  async delete(id: string): Promise<boolean> {
    const deleted = this.store.delete(id);
    if (deleted) {
      console.log(`🗑️ Deleted candidate ${id} (remaining: ${this.store.size})`);
    }
    return deleted;
  }

  async list(): Promise<CandidateProfile[]> {
    return Array.from(this.store.values());
  }

  async listSummary(): Promise<CandidateSummary[]> {
    return Array.from(this.store.values()).map(c => ({
      id: c.id,
      name: c.profile.name || 'Nom non disponible',
      uploadedAt: c.uploadedAt,
      skillsCount: c.profile.skills?.length || 0,
      experience: `${c.analysis.experience_years || 0} ans`
    }));
  }

  async count(): Promise<number> {
    return this.store.size;
  }

  async clear(): Promise<void> {
    this.store.clear();
    console.log('🧹 Cleared all candidates from store');
  }
}

// Singleton instance
export const candidateStore: CandidateRepository = new CandidateStore();
export default candidateStore;
