// MongoDB Atlas storage backend — persistent candidate storage.
// Same interface as the in-memory store (see store.ts), swappable at runtime.
import { CandidateProfile } from '../types.js';
import { Candidate, CandidateDocument } from '../models/Candidate.js';
import { CandidateRepository, CandidateSummary } from '../store.js';

function toProfile(doc: CandidateDocument): CandidateProfile {
  return {
    id: doc.candidateId,
    profile: doc.profile,
    sourceText: doc.sourceText,
    analysis: doc.analysis,
    uploadedAt: doc.metadata?.uploadedAt ?? new Date().toISOString(),
    filename: doc.metadata?.filename,
  };
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

  async get(id: string): Promise<CandidateProfile | undefined> {
    const doc = await Candidate.findOne({ candidateId: id }).lean();
    return doc ? toProfile(doc as unknown as CandidateDocument) : undefined;
  }

  async has(id: string): Promise<boolean> {
    return (await Candidate.exists({ candidateId: id })) !== null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await Candidate.deleteOne({ candidateId: id });
    if (result.deletedCount > 0) {
      console.log(`🗑️ Mongo: deleted candidate ${id}`);
    }
    return result.deletedCount > 0;
  }

  async list(): Promise<CandidateProfile[]> {
    const docs = await Candidate.find({}).lean();
    return docs.map(d => toProfile(d as unknown as CandidateDocument));
  }

  async listSummary(): Promise<CandidateSummary[]> {
    const docs = await Candidate.find(
      {},
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

  async count(): Promise<number> {
    return Candidate.countDocuments();
  }

  async clear(): Promise<void> {
    const result = await Candidate.deleteMany({});
    console.log(`🧹 Mongo: cleared ${result.deletedCount} candidates`);
  }
}

// Singleton instance
export const mongoCandidateStore: CandidateRepository = new MongoCandidateStore();
export default mongoCandidateStore;
