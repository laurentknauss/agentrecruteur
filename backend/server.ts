// MVP Express Server for AI Recruiter
import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { extractPDFText } from './src/utils/agentUtils.js';
import { structureResumeText } from './src/workers/structuringWorker.js';
import { analyzeResume } from './src/workers/comprehensiveResumeAnalyzer.js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3001;

// CORS + JSON middleware
app.use(cors());
app.use(express.json());

// In-memory storage for candidate profiles
interface CandidateProfile {
  id: string;
  profile: any; // Structured resume data
  sourceText: string;
  analysis: any; // Full analysis from orchestrator
  uploadedAt: string;
}

const candidateStore = new Map<string, CandidateProfile>();

// Multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files allowed'));
    }
  }
});

/**
 * POST /api/upload-cv
 * Upload PDF → Extract text → Analyze → Store → Return profile
 */
app.post('/api/upload-cv', upload.single('cv'), async (req, res) => {
  console.log('📤 Upload CV request received');
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    const candidateId = uuidv4();
    console.log(`👤 Processing candidate: ${candidateId}`);

    // Save PDF temporarily for processing
    const tempPath = path.join(process.cwd(), 'temp', `${candidateId}.pdf`);
    const fs = await import('fs/promises');
    await fs.mkdir(path.dirname(tempPath), { recursive: true });
    await fs.writeFile(tempPath, req.file.buffer);

    // Step 1: Extract PDF text
    console.log('📄 Extracting PDF text...');
    const sourceText = await extractPDFText(tempPath);
    
    // Step 2: Structure resume with GPT-5
    console.log('🏗️ Structuring resume with GPT-5...');
    const structuredProfile = await structureResumeText(sourceText);
    
    // Step 3: Full analysis (optional for MVP)
    console.log('🔍 Running full analysis...');
    const fullAnalysis = await analyzeResume(tempPath);

    // Step 4: Store in memory
    const candidate: CandidateProfile = {
      id: candidateId,
      profile: structuredProfile,
      sourceText: sourceText,
      analysis: fullAnalysis,
      uploadedAt: new Date().toISOString()
    };

    candidateStore.set(candidateId, candidate);

    // Cleanup temp file
    await fs.unlink(tempPath);

    console.log(`✅ Candidate ${candidateId} processed and stored`);

    // Return profile data
    res.json({
      success: true,
      candidateId: candidateId,
      profile: structuredProfile,
      analysis: {
        skills: fullAnalysis.skills || [],
        experience_years: fullAnalysis.experience_years || 0,
        experience_level: fullAnalysis.experience_level || 'Unknown',
        overall_score: fullAnalysis.overall_score || 0
      }
    });

  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({ 
      error: 'Failed to process CV',
      details: error.message 
    });
  }
});

/**
 * POST /api/candidate/:id/ask
 * Ask questions about candidate profile
 */
app.post('/api/candidate/:id/ask', async (req, res) => {
  const { id } = req.params;
  const { question } = req.body;

  console.log(`💬 Q&A request for candidate ${id}: "${question}"`);

  try {
    if (!question || question.trim().length === 0) {
      return res.status(400).json({ error: 'Question is required' });
    }

    const candidate = candidateStore.get(id);
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    // Simple rule-based Q&A with fallback to structured data
    let answer = generateSimpleAnswer(question, candidate);
    
    if (!answer) {
      // Fallback: Use LLM for complex questions
      answer = await generateLLMAnswer(question, candidate);
    }

    res.json({
      success: true,
      candidateId: id,
      question: question,
      answer: answer,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Q&A error:', error);
    res.status(500).json({ 
      error: 'Failed to answer question',
      details: error.message 
    });
  }
});

/**
 * Simple rule-based answers for common questions
 */
function generateSimpleAnswer(question: string, candidate: CandidateProfile): string | null {
  const q = question.toLowerCase();
  const profile = candidate.profile;
  const analysis = candidate.analysis;

  // Name questions
  if (q.includes('name') || q.includes('qui est')) {
    return profile.name ? `Le candidat s'appelle ${profile.name}.` : 'Nom non disponible dans le CV.';
  }

  // Skills questions
  if (q.includes('compétence') || q.includes('skill') || q.includes('technologie')) {
    if (profile.skills && profile.skills.length > 0) {
      return `Compétences principales: ${profile.skills.slice(0, 5).join(', ')}.`;
    }
    return 'Aucune compétence technique identifiée.';
  }

  // Experience questions
  if (q.includes('expérience') || q.includes('experience') || q.includes('années')) {
    return `${analysis.experience_years || 0} années d'expérience, niveau ${analysis.experience_level || 'indéterminé'}.`;
  }

  // Email/Contact questions
  if (q.includes('email') || q.includes('contact')) {
    return profile.contact?.email ? `Email: ${profile.contact.email}` : 'Email non disponible.';
  }

  // Education questions
  if (q.includes('formation') || q.includes('étude') || q.includes('diplôme')) {
    if (profile.education && profile.education.length > 0) {
      const edu = profile.education[0];
      return `Formation: ${edu.degree || 'Non spécifié'} à ${edu.school || 'École non spécifiée'}.`;
    }
    return 'Aucune formation identifiée dans le CV.';
  }

  return null; // No simple answer found
}

/**
 * LLM-powered answer generation for complex questions
 */
async function generateLLMAnswer(question: string, candidate: CandidateProfile): Promise<string> {
  try {
    // Import LLM client dynamically
    const { default: createReplicateClient, runGPT5Model } = await import('./src/clients/replicateClient.js');
    
    const client = createReplicateClient();
    
    const systemPrompt = `Tu es un assistant RH expert qui répond aux questions sur les candidats.
Réponds de manière concise et professionnelle en français.
Utilise uniquement les informations fournies dans le profil candidat.`;

    const analysisPrompt = `PROFIL CANDIDAT:
${JSON.stringify(candidate.profile, null, 2)}

ANALYSE COMPLÈTE:
${JSON.stringify(candidate.analysis, null, 2)}

TEXTE SOURCE:
${candidate.sourceText.substring(0, 1000)}...

QUESTION: ${question}

Réponds de manière précise et professionnelle:`;

    const answer = await runGPT5Model(client, analysisPrompt, systemPrompt, "low", 500);
    
    return answer || "Désolé, je n'ai pas pu générer une réponse à cette question.";

  } catch (error) {
    console.error('LLM Answer error:', error);
    return "Erreur lors de la génération de la réponse. Veuillez reformuler votre question.";
  }
}

/**
 * GET /api/candidates - List all stored candidates
 */
app.get('/api/candidates', (req, res) => {
  const candidates = Array.from(candidateStore.values()).map(c => ({
    id: c.id,
    name: c.profile.name || 'Nom non disponible',
    uploadedAt: c.uploadedAt,
    skillsCount: c.profile.skills?.length || 0,
    experience: `${c.analysis.experience_years || 0} ans`
  }));

  res.json({ candidates });
});

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    candidatesCount: candidateStore.size 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 AI Recruiter API running on http://localhost:${PORT}`);
  console.log(`📋 Endpoints:`);
  console.log(`   POST /api/upload-cv - Upload and analyze CV`);
  console.log(`   POST /api/candidate/:id/ask - Ask questions about candidate`);
  console.log(`   GET /api/candidates - List all candidates`);
  console.log(`   GET /health - Health check`);
});

export default app;