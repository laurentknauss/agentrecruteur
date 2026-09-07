'use client';

import React, { useState, useCallback } from 'react';
import { FileUpload } from './FileUpload';
import { CardSpotlight } from './CardSpotlight';
import { GridPattern } from './GridPattern';
import { motion, AnimatePresence } from 'motion/react';
import { IconUser, IconBriefcase, IconStar, IconMessageCircle, IconBrain, IconTrendingUp } from '@tabler/icons-react';

interface StructuredResume {
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
}

interface UploadResponse {
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

interface QAResponse {
  success: boolean;
  candidateId: string;
  question: string;
  answer: string;
  timestamp: string;
}

interface QAHistory {
  question: string;
  answer: string;
  timestamp: string;
}

function CandidateQAContainer() {
  const [isUploading, setIsUploading] = useState(false);
  const isDemoLocked = process.env.NEXT_PUBLIC_DEMO_LOCK === "1"
  const [demoAsk, setDemoAsk] = useState(false);
  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [profile, setProfile] = useState<StructuredResume | null>(null);
  const [analysis, setAnalysis] = useState<UploadResponse['analysis'] | null>(null);
  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [qaHistory, setQAHistory] = useState<QAHistory[]>([]);
  const [error, setError] = useState<string | null>(null);

  // File upload handler
  const handleFileUpload = useCallback(async (files: File[]) => {
    if (files.length === 0) return;

    const file = files[0];
    if (!file.type.includes('pdf')) {
      setError('Veuillez sélectionner un fichier PDF');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('cv', file);

      const response = await fetch('/api/upload-cv', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors du téléchargement');
      }

      const data: UploadResponse = await response.json();

      setCandidateId(data.candidateId);
      setProfile(data.profile);
      setAnalysis(data.analysis);
      setQAHistory([]); // Reset history for new candidate

      console.log('✅ CV téléchargé et analysé:', data.candidateId);

    } catch (err) {
      console.error('❌ Upload error:', err);
      setError(err instanceof Error ? err.message : 'Erreur de téléchargement');
    } finally {
      setIsUploading(false);
    }
  }, []);

  // Q&A submit handler
  const handleQuestionSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!candidateId || !question.trim()) {
      return;
    }

    setIsAsking(true);
    setError(null);

    try {
      const response = await fetch(`/api/candidate/${candidateId}/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question: question.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la question');
      }

      const data: QAResponse = await response.json();

      // Add to history
      setQAHistory(prev => [...prev, {
        question: data.question,
        answer: data.answer,
        timestamp: data.timestamp
      }]);

      setQuestion(''); // Clear input

      console.log('✅ Question répondue:', data.answer.substring(0, 50) + '...');

    } catch (err) {
      console.error('❌ Q&A error:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la question');
    } finally {
      setIsAsking(false);
    }
  }, [candidateId, question]);

  return (
    <div className="relative overflow-hidden bg-transparent py-16">
      {/* Popup démo : n'apparaît que quand un visiteur clique sur la zone d'upload */}
      {isDemoLocked && demoAsk && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4"
          onClick={() => setDemoAsk(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl bg-[#f5f4ef] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            data-testid="demo-locked-popup"
          >
            <h3 className="text-xl font-bold text-black">Accès démo protégé 🛡️</h3>
            <p className="mt-2 text-sm text-black/75">
              Pour tester l&apos;application, contactez Laurent Knauss via LinkedIn :
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <a
                href="https://linkedin.com/in/laurentknauss"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-b from-[#5b5733] to-[#3f3c26] px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
                data-testid="linkedin-contact"
              >
                💬 Contacter via LinkedIn
              </a>
              <button
                type="button"
                onClick={() => setDemoAsk(false)}
                className="inline-flex items-center justify-center rounded-full border border-black/20 bg-white px-5 py-2.5 text-sm font-medium text-black hover:bg-black/5"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Background Effects */}
      <div className="absolute inset-0">
        <GridPattern className="opacity-20" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto p-6 px-8">
        {/* Upload Section */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative max-w-6xl mx-auto mb-12"

        >
          <CardSpotlight className="h-fit group">
            <div className="relative z-20">
              {isUploading ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center p-12 text-blue-400"
                  data-testid="uploading-state"
                >
                  <div className="relative w-16 h-16 mx-auto mb-4">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-400 border-t-transparent"></div>
                    <IconBrain className="absolute inset-0 m-auto w-6 h-6 text-blue-400" />
                  </div>
                  <p className="text-lg font-medium">Analyse en cours...</p>
                  <p className="text-sm text-neutral-400 mt-2">Traite le CV du candidat(e)</p>
                </motion.div>
              ) : (
                <FileUpload
                  onChange={handleFileUpload}
                  locked={isDemoLocked}
                  onLockedClick={() => setDemoAsk(true)}
                />
              )}

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl"
                  data-testid="error-display"
                >
                  <p className="text-red-400 flex items-center gap-2">
                    <span>⚠️</span>
                    {error}
                  </p>
                </motion.div>
              )}
            </div>
          </CardSpotlight>
        </motion.div>

        {/* Profile Results Section */}
        <AnimatePresence mode="wait">
          {profile && analysis && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              transition={{ duration: 0.5 }}
              className="relative max-w-6xl mx-auto mb-12"

            >
              <CardSpotlight className="h-fit group">
                <div className="relative z-20" data-testid="profile-display">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl">
                      <IconUser className="w-6 h-6 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">Profil Candidat</h2>
                  </div>

                  {/* Candidate Info */}
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-6">
                      <InfoCard
                        icon={<IconUser className="w-5 h-5" />}
                        label="Nom"
                        value={profile.name || 'Non spécifié'}
                        testId="candidate-name"
                      />
                      <InfoCard
                        icon={<IconMessageCircle className="w-5 h-5" />}
                        label="Email"
                        value={profile.contact.email || 'Non spécifié'}
                        testId="candidate-email"
                      />
                      <InfoCard
                        icon={<IconTrendingUp className="w-5 h-5" />}
                        label="Expérience"
                        value={`${analysis.experience_years} ans (${analysis.experience_level})`}
                        testId="experience-info"
                      />
                      <InfoCard
                        icon={<IconStar className="w-5 h-5" />}
                        label="Score"
                        value={`${analysis.overall_score}/100`}
                        testId="overall-score"
                      />
                    </div>

                    {/* Skills */}
                    {profile.skills.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <IconBriefcase className="w-5 h-5 text-blue-400" />
                          <h3 className="text-lg font-semibold text-white">Compétences</h3>
                        </div>
                        <div className="flex flex-wrap gap-2" data-testid="skills-list">
                          {profile.skills.slice(0, 12).map((skill, idx) => (
                            <motion.span
                              key={idx}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: idx * 0.1 }}
                              className="px-3 py-1 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-full text-blue-300 text-sm"
                              data-testid={`skill-${idx}`}
                            >
                              {skill}
                            </motion.span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardSpotlight>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Q&A Section */}
        {candidateId && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="relative mt-12"

          >
            <CardSpotlight className="group">
              <div className="relative z-20">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl">
                    <IconMessageCircle className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Conversation candidat</h2>
                </div>

                <form onSubmit={handleQuestionSubmit} className="mb-8">
                  <div className="flex gap-4">
                    <input
                      type="text"
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder="Posez votre question sur le candidat..."
                      className="flex-1 px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-neutral-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                      disabled={isAsking}
                      data-testid="question-input"
                    />
                    <motion.button
                      type="submit"
                      disabled={isAsking || !question.trim()}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                      data-testid="submit-question"
                    >
                      {isAsking ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                          Analyse...
                        </div>
                      ) : (
                        'Envoyer'
                      )}
                    </motion.button>
                  </div>
                </form>

                {/* Q&A History */}
                {qaHistory.length > 0 && (
                  <div className="space-y-4" data-testid="qa-history">
                    <h3 className="text-lg font-semibold text-white mb-4">Historique des questions</h3>
                    <AnimatePresence>
                      {qaHistory.map((qa, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ delay: idx * 0.1 }}
                          className="bg-slate-700/50 border border-slate-600 rounded-xl p-6"
                          data-testid={`qa-item-${idx}`}
                        >
                          <div className="mb-3">
                            <div className="flex items-start gap-3">
                              <div className="p-2 bg-blue-500/20 rounded-lg">
                                <IconMessageCircle className="w-4 h-4 text-blue-400" />
                              </div>
                              <div>
                                <p className="text-blue-300 font-medium">Question</p>
                                <p className="text-white" data-testid={`question-${idx}`}>{qa.question}</p>
                              </div>
                            </div>
                          </div>
                          <div className="border-l-2 border-slate-600 pl-6 ml-5">
                            <div className="flex items-start gap-3">
                              <div className="p-2 bg-green-500/20 rounded-lg">
                                <IconBrain className="w-4 h-4 text-green-400" />
                              </div>
                              <div>
                                <p className="text-green-300 font-medium">Réponse</p>
                                <p className="text-neutral-200 leading-relaxed" data-testid={`answer-${idx}`}>
                                  {qa.answer}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="text-xs text-neutral-500 mt-4 flex items-center gap-2">
                            <IconMessageCircle className="w-3 h-3" />
                            {new Date(qa.timestamp).toLocaleString('fr-FR')}
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </CardSpotlight>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// InfoCard Component
const InfoCard = ({ icon, label, value, testId }: { 
  icon: React.ReactNode; 
  label: string; 
  value: string; 
  testId?: string 
}) => (
  <div className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg border border-slate-600/50">
    <div className="text-neutral-400">{icon}</div>
    <div className="flex-1">
      <p className="text-xs text-neutral-400 uppercase tracking-wide">{label}</p>
      <p className="text-white font-medium" data-testid={testId}>{value}</p>
    </div>
  </div>
);

export default CandidateQAContainer;
