// In-memory storage for candidate profiles
import { CandidateProfile } from './types.js';

class CandidateStore {
  private store = new Map<string, CandidateProfile>();

  set(id: string, candidate: CandidateProfile): void {
    this.store.set(id, candidate);
    console.log(`📁 Stored candidate ${id} (total: ${this.store.size})`);
  }

  get(id: string): CandidateProfile | undefined {
    return this.store.get(id);
  }

  has(id: string): boolean {
    return this.store.has(id);
  }

  delete(id: string): boolean {
    const deleted = this.store.delete(id);
    if (deleted) {
      console.log(`🗑️ Deleted candidate ${id} (remaining: ${this.store.size})`);
    }
    return deleted;
  }

  list(): CandidateProfile[] {
    return Array.from(this.store.values());
  }

  listSummary(): Array<{
    id: string;
    name: string;
    uploadedAt: string;
    skillsCount: number;
    experience: string;
  }> {
    return Array.from(this.store.values()).map(c => ({
      id: c.id,
      name: c.profile.name || 'Nom non disponible',
      uploadedAt: c.uploadedAt,
      skillsCount: c.profile.skills?.length || 0,
      experience: `${c.analysis.experience_years || 0} ans`
    }));
  }

  count(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
    console.log('🧹 Cleared all candidates from store');
  }
}

// Singleton instance
export const candidateStore = new CandidateStore();
export default candidateStore;