// Types for AI Recruiter MVP
export interface StructuredResume {
  name: string | null;
  contact: {
    email: string | null;
    phone: string | null;
    location: string | null;
    links: string[];
  };
  skills: string[];
  experience: Array<{
    title: string | null;
    company: string | null;
    start: string | null;
    end: string | null;
    location: string | null;
    bullets: string[];
  }>;
  education: Array<{
    degree: string | null;
    school: string | null;
    year: string | null;
  }>;
  certifications: string[];
  languages: string[];
  summary: string | null;
  structured_at?: string;
  structuring_version?: string;
}

export interface ResumeAnalysis {
  skills: string[];
  experience_years: number;
  experience_level: string;
  strengths: string[];
  weaknesses: string[];
  key_achievements: string[];
  overall_score: number;
  summary: string;
  confidence_score: number;
  industries: string[];
}

export interface CandidateProfile {
  id: string;
  profile: StructuredResume;
  sourceText: string;
  analysis: ResumeAnalysis;
  uploadedAt: string;
  filename?: string;
}

export interface QARequest {
  question: string;
}

export interface QAResponse {
  success: boolean;
  candidateId: string;
  question: string;
  answer: string;
  timestamp: string;
}

export interface UploadResponse {
  success: boolean;
  candidateId: string;
  profile: StructuredResume;
  analysis: {
    skills: string[];
    experience_years: number;
    experience_level: string;
    overall_score: number;
  };
}

export interface ApiError {
  error: string;
  details?: string;
}