import mongoose, { Document, Schema } from 'mongoose';
import { StructuredResume, ResumeAnalysis } from '../types.js';

// Interface pour le document MongoDB
export interface CandidateDocument extends Document {
  candidateId: string;
  profile: StructuredResume;
  analysis: ResumeAnalysis;
  qaHistory: Array<{
    question: string;
    answer: string;
    timestamp: string;
  }>;
  sourceText: string;
  metadata: {
    filename?: string;
    uploadedAt: string;
    lastUpdated: string;
  };
}

// Schema MongoDB
const candidateSchema = new Schema<CandidateDocument>({
  candidateId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Données structurées du CV (output du StructuringWorker)
  profile: {
    name: String,
    contact: {
      email: String,
      phone: String,
      location: String,
      links: [String]
    },
    skills: [String],
    experience: [{
      title: String,
      company: String,
      start: String,
      end: String,
      location: String,
      bullets: [String]
    }],
    education: [{
      degree: String,
      school: String,
      year: String
    }],
    certifications: [String],
    languages: [String],
    summary: String
  },
  
  // Analyse LLM (output du ComprehensiveResumeAnalyzer)
  analysis: {
    skills: [String],
    experience_years: Number,
    experience_level: String,
    overall_score: Number,
    strengths: [String],
    weaknesses: [String],
    recommendations: [String]
  },
  
  // Historique des questions/réponses
  qaHistory: [{
    question: { type: String, required: true },
    answer: { type: String, required: true },
    timestamp: { type: String, required: true }
  }],
  
  // Texte brut extrait du PDF (pour le Q&A)
  sourceText: {
    type: String,
    required: true
  },
  
  // Métadonnées
  metadata: {
    filename: String,
    uploadedAt: { type: String, required: true },
    lastUpdated: { type: String, required: true }
  }
}, {
  timestamps: true, // Ajoute createdAt et updatedAt automatiquement
  collection: 'candidates'
});

// Index pour les recherches fréquentes
candidateSchema.index({ 'profile.name': 'text', 'profile.skills': 'text' });
candidateSchema.index({ 'analysis.experience_level': 1 });
candidateSchema.index({ 'analysis.overall_score': -1 });

export const Candidate = mongoose.model<CandidateDocument>('Candidate', candidateSchema);