// React MVP container for CV upload and Q&A
'use client';

import React, { useState, useCallback } from 'react';

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

export default function CandidateQAContainer() {
  const [isUploading, setIsUploading] = useState(false);
  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [profile, setProfile] = useState<StructuredResume | null>(null);
  const [analysis, setAnalysis] = useState<UploadResponse['analysis'] | null>(null);
  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [qaHistory, setQAHistory] = useState<QAHistory[]>([]);
  const [error, setError] = useState<string | null>(null);

  // File upload handler
  const handleFileUpload = useCallback(async (file: File) => {
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

  // File drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  }, [handleFileUpload]);

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
    <div className="max-w-4xl mx-auto p-6 bg-white">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">
        🤖 AI Recruiter - Analyse de CV
      </h1>

      {/* File Upload Section */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-3 text-gray-700">
          📄 Télécharger un CV (PDF)
        </h2>
        
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isUploading 
              ? 'border-blue-300 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {isUploading ? (
            <div className="text-blue-600">
              <div className="animate-spin inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mb-2"></div>
              <p>Analyse en cours...</p>
            </div>
          ) : (
            <div>
              <p className="text-gray-600 mb-4">
                Glissez-déposez votre fichier PDF ici ou cliquez pour sélectionner
              </p>
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileInputChange}
                className="hidden"
                id="file-input"
              />
              <label
                htmlFor="file-input"
                className="inline-block px-4 py-2 bg-blue-500 text-white rounded-md cursor-pointer hover:bg-blue-600 transition-colors"
              >
                Choisir un fichier PDF
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600">❌ {error}</p>
        </div>
      )}

      {/* Profile Display */}
      {profile && analysis && (
        <div className="mb-8 p-6 bg-gray-50 rounded-lg">
          <h2 className="text-lg font-semibold mb-4 text-gray-700">
            👤 Profil Extrait
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-800 mb-2">Informations</h3>
              <p><strong>Nom:</strong> {profile.name || 'Non spécifié'}</p>
              <p><strong>Email:</strong> {profile.contact.email || 'Non spécifié'}</p>
              <p><strong>Téléphone:</strong> {profile.contact.phone || 'Non spécifié'}</p>
              <p><strong>Localisation:</strong> {profile.contact.location || 'Non spécifiée'}</p>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-800 mb-2">Analyse</h3>
              <p><strong>Expérience:</strong> {analysis.experience_years} ans ({analysis.experience_level})</p>
              <p><strong>Score global:</strong> {analysis.overall_score}/100</p>
              <p><strong>Compétences:</strong> {analysis.skills.length} identifiées</p>
            </div>
          </div>

          {profile.skills.length > 0 && (
            <div className="mt-4">
              <h3 className="font-medium text-gray-800 mb-2">Compétences principales</h3>
              <div className="flex flex-wrap gap-2">
                {profile.skills.slice(0, 10).map((skill, idx) => (
                  <span 
                    key={idx}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Q&A Section */}
      {candidateId && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 text-gray-700">
            💬 Poser une question
          </h2>
          
          <form onSubmit={handleQuestionSubmit} className="mb-6">
            <div className="flex gap-3">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Posez votre question sur le candidat..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isAsking}
              />
              <button
                type="submit"
                disabled={isAsking || !question.trim()}
                className="px-6 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isAsking ? 'Analyse...' : 'Envoyer'}
              </button>
            </div>
          </form>

          {/* Q&A History */}
          {qaHistory.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-800">Historique des questions</h3>
              {qaHistory.map((qa, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg p-4">
                  <div className="mb-2">
                    <strong className="text-blue-600">Q:</strong> {qa.question}
                  </div>
                  <div className="text-gray-700">
                    <strong className="text-green-600">R:</strong> {qa.answer}
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    {new Date(qa.timestamp).toLocaleString('fr-FR')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      {!candidateId && (
        <div className="text-center text-gray-500 mt-8">
          <p>Commencez par télécharger un CV pour analyser un candidat</p>
        </div>
      )}
    </div>
  );
}