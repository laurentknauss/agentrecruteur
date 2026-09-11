// MongoDB Atlas storage backend — persistent candidate storage.
// Same interface as the in-memory store (see store.ts), swappable at runtime.
import { CandidateProfile } from '../types.ts';
import { Candidate, CandidateDocument } from '../models/Candidate.ts';
import { CandidateRepository, CandidateSummary, OwnerFilter } from '../store.ts';

function toProfile(doc: CandidateDocument): CandidateProfile {
  return {
    id: doc.candidateId,
    profile: doc.profile,
    sourceText: doc.sourceText,
    analysis: doc.analysis,
    uploadedAt: doc.metadata?.uploadedAt ?? new Date().toISOString(),
    filename: doc.metadata?.filename,
    ownerId: doc.ownerId ?? null,
    fingerprint: doc.fingerprint,
  };
}

/** Filtre Mongo : ajoute la contrainte propriétaire uniquement quand un contexte est fourni. */
function ownerFilter(ownerId: OwnerFilter): Record<string, string> {
  return ownerId === null || ownerId === undefined ? {} : { ownerId };
}

class MongoCandidateStore implements CandidateRepository {
  readonly backend = 'mongodb' as const;

  async set(id: string, candidate: CandidateProfile): Promise<void> {
    await Candidate.findOneAndUpdate(
      { candidateId: id },
      {
        $set: {
          profile: candidate.profile,
          analysis: candidate.analysis,
          sourceText: candidate.sourceText,
          ownerId: candidate.ownerId ?? null,
          fingerprint: candidate.fingerprint,
          'metadata.filename': candidate.filename,
          'metadata.uploadedAt': candidate.uploadedAt,
          'metadata.lastUpdated': new Date().toISOString(),
        },
        $setOnInsert: { qaHistory: [] },
      },
      { upsert: true, new: true }
    );
    console.log(`📁 Mongo: upserted candidate ${id}`);
  }

  async get(id: string, ownerId: OwnerFilter = null): Promise<CandidateProfile | undefined> {
    const doc = await Candidate.findOne({ candidateId: id, ...ownerFilter(ownerId) }).lean();
    return doc ? toProfile(doc as unknown as CandidateDocument) : undefined;
  }

  async has(id: string, ownerId: OwnerFilter = null): Promise<boolean> {
    return (await Candidate.exists({ candidateId: id, ...ownerFilter(ownerId) })) !== null;
  }

  async delete(id: string, ownerId: OwnerFilter = null): Promise<boolean> {
    const result = await Candidate.deleteOne({ candidateId: id, ...ownerFilter(ownerId) });
    if (result.deletedCount > 0) {
      console.log(`🗑️ Mongo: deleted candidate ${id}`);
    }
    return result.deletedCount > 0;
  }

  async list(ownerId: OwnerFilter = null): Promise<CandidateProfile[]> {
    const docs = await Candidate.find(ownerFilter(ownerId)).lean();
    return docs.map(d => toProfile(d as unknown as CandidateDocument));
  }

  async listSummary(ownerId: OwnerFilter = null): Promise<CandidateSummary[]> {
    const docs = await Candidate.find(
      ownerFilter(ownerId),
      {
        candidateId: 1,
        'profile.name': 1,
        'profile.skills': 1,
        'metadata.uploadedAt': 1,
        'analysis.experience_years': 1,
        'analysis.experience_level': 1,
      }
    ).lean();

    return docs.map(d => {
      const doc = d as unknown as CandidateDocument;
      return {
        id: doc.candidateId,
        name: doc.profile?.name || 'Nom non disponible',
        uploadedAt: doc.metadata?.uploadedAt ?? '',
        skillsCount: doc.profile?.skills?.length || 0,
        experience: `${doc.analysis?.experience_years || 0} ans`,
      };
    });
  }

  async count(ownerId: OwnerFilter = null): Promise<number> {
    return Candidate.countDocuments(ownerFilter(ownerId));
  }

  async findByFingerprint(fingerprint: string, ownerId: OwnerFilter = null): Promise<CandidateProfile | undefined> {
    const doc = await Candidate.findOne({ fingerprint, ...ownerFilter(ownerId) }).lean();
    return doc ? toProfile(doc as unknown as CandidateDocument) : undefined;
  }

  async clear(): Promise<void> {
    const result = await Candidate.deleteMany({});
    console.log(`🧹 Mongo: cleared ${result.deletedCount} candidates`);
  }
}

// Singleton instance
export const mongoCandidateStore: CandidateRepository = new MongoCandidateStore();
export default mongoCandidateStore;
