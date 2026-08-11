// MVP Express Server - mapped to existing codebase
import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { candidateStore, CandidateRepository } from './store.js';
import { mongoCandidateStore } from './database/mongoCandidateStore.js';
import MongoDBConnection from './database/mongodb.js';
import { processPDFBuffer, validatePDFBuffer } from './pdf.js';
import { answerQuestion } from './llm.js';
import { analyzeResume } from './workers/comprehensiveResumeAnalyzer.js';
import { CandidateProfile, QARequest, UploadResponse, QAResponse, ApiError, ResumeAnalysis } from './types.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Storage backend: MongoDB Atlas when reachable, in-memory fallback otherwise.
let store: CandidateRepository = candidateStore;

async function initStorage(): Promise<void> {
  try {
    await MongoDBConnection.getInstance().connect();
    store = mongoCandidateStore;
    console.log('🗄️ Storage: MongoDB Atlas (persistent)');
  } catch (error) {
    console.warn('⚠️ MongoDB Atlas unavailable — falling back to in-memory storage:', error instanceof Error ? error.message : error);
  }
}

// Middleware
app.use(cors());
app.use(express.json());

// Multer configuration for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
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
 * Upload PDF → Extract text → Structure with GPT-5 → Analyze → Store
 */
app.post('/api/upload-cv', upload.single('cv'), async (req, res) => {
  console.log('📤 Upload CV request received');
  
  try {
    if (!req.file) {
      const error: ApiError = { error: 'No PDF file uploaded' };
      return res.status(400).json(error);
    }

    // Validate PDF buffer
    const validation = validatePDFBuffer(req.file.buffer);
    if (!validation.valid) {
      const error: ApiError = { error: validation.error! };
      return res.status(400).json(error);
    }

    const candidateId = uuidv4();
    console.log(`👤 Processing candidate: ${candidateId}`);

    // Step 1 & 2: Extract text + Structure with existing codebase
    const { sourceText, structuredProfile } = await processPDFBuffer(
      req.file.buffer, 
      candidateId
    );

    // Step 3: Full analysis using existing comprehensiveResumeAnalyzer
    console.log('🔍 Running full analysis...');
    
    // Save PDF temporarily for analysis (required by existing analyzer)
    const tempPath = `temp/${candidateId}.pdf`;
    const fs = await import('fs/promises');
    await fs.mkdir('temp', { recursive: true });
    await fs.writeFile(tempPath, req.file.buffer);
    
    let fullAnalysis: ResumeAnalysis;
    try {
      fullAnalysis = await analyzeResume(tempPath) as ResumeAnalysis;
    } finally {
      // Cleanup temp file
      try {
        await fs.unlink(tempPath);
      } catch {} // Ignore cleanup errors
    }

    // Step 4: Store in memory
    const candidate: CandidateProfile = {
      id: candidateId,
      profile: structuredProfile,
      sourceText: sourceText,
      analysis: fullAnalysis,
      uploadedAt: new Date().toISOString(),
      filename: req.file.originalname
    };

    await store.set(candidateId, candidate);

    console.log(`✅ Candidate ${candidateId} processed and stored (${store.backend})`);

    // Return structured response
    const response: UploadResponse = {
      success: true,
      candidateId: candidateId,
      profile: structuredProfile,
      analysis: {
        skills: fullAnalysis.skills || [],
        experience_years: fullAnalysis.experience_years || 0,
        experience_level: fullAnalysis.experience_level || 'Unknown',
        overall_score: fullAnalysis.overall_score || 0
      }
    };

    res.json(response);

  } catch (error) {
    console.error('❌ Upload error:', error);
    const apiError: ApiError = { 
      error: 'Failed to process CV',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
    res.status(500).json(apiError);
  }
});

/**
 * POST /api/candidate/:id/ask
 * Q&A endpoint using rule-based + LLM fallback
 */
app.post('/api/candidate/:id/ask', async (req, res) => {
  const { id } = req.params;
  const { question }: QARequest = req.body;

  console.log(`💬 Q&A request for candidate ${id}: "${question}"`);

  try {
    if (!question || question.trim().length === 0) {
      const error: ApiError = { error: 'Question is required' };
      return res.status(400).json(error);
    }

    const candidate = await store.get(id);
    if (!candidate) {
      const error: ApiError = { error: 'Candidate not found' };
      return res.status(404).json(error);
    }

    // Use combined rule-based + LLM answer generation
    const answer = await answerQuestion(question, candidate);

    const response: QAResponse = {
      success: true,
      candidateId: id,
      question: question,
      answer: answer,
      timestamp: new Date().toISOString()
    };

    res.json(response);

  } catch (error) {
    console.error('❌ Q&A error:', error);
    const apiError: ApiError = { 
      error: 'Failed to answer question',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
    res.status(500).json(apiError);
  }
});

/**
 * GET /api/candidates - List all stored candidates
 */
app.get('/api/candidates', async (req, res) => {
  const candidates = await store.listSummary();
  res.json({ candidates });
});

/**
 * GET /api/candidate/:id - Get specific candidate details
 */
app.get('/api/candidate/:id', async (req, res) => {
  const { id } = req.params;
  const candidate = await store.get(id);
  
  if (!candidate) {
    const error: ApiError = { error: 'Candidate not found' };
    return res.status(404).json(error);
  }
  
  res.json(candidate);
});

/**
 * DELETE /api/candidate/:id - Remove candidate from store
 */
app.delete('/api/candidate/:id', async (req, res) => {
  const { id } = req.params;
  const deleted = await store.delete(id);
  
  if (!deleted) {
    const error: ApiError = { error: 'Candidate not found' };
    return res.status(404).json(error);
  }
  
  res.json({ success: true, message: `Candidate ${id} deleted` });
});

/**
 * GET /health - Health check
 */
app.get('/health', async (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    storage: store.backend,
    candidatesCount: await store.count() 
  });
});

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('💥 Server error:', error);
  const apiError: ApiError = {
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  };
  res.status(500).json(apiError);
});

// Start server (storage initialized before listen)
await initStorage();

app.listen(PORT, () => {
  console.log(`🚀 AI Recruiter API running on http://localhost:${PORT}`);
  console.log(`🗄️ Storage backend: ${store.backend}`);
  console.log(`📋 Endpoints:`);
  console.log(`   POST /api/upload-cv - Upload and analyze CV`);
  console.log(`   POST /api/candidate/:id/ask - Ask questions about candidate`);
  console.log(`   GET /api/candidates - List all candidates`);
  console.log(`   GET /api/candidate/:id - Get candidate details`);
  console.log(`   DELETE /api/candidate/:id - Remove candidate`);
  console.log(`   GET /health - Health check`);
});

export default app;