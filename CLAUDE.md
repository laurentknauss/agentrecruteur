# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an AI Recruiter Agency built specifically for the **French recruitment market** using Node.js backend with GPT-4.1 integration and a Next.js 15 frontend. The project uses an orchestrator-worker architecture for comprehensive resume analysis including PDF extraction, text structuring, skills analysis, experience evaluation, and candidate screening.

### French Market Specifications
- **Target Market**: French recruitment agencies and HR departments
- **CV Format**: French CV standards (includes personal information like age, marital status, children, nationality)
- **Language**: French interface and interactions by default
- **Compliance**: GDPR European regulations for personal data handling
- **Localization**: French postal codes, cities, educational institutions (Universities, Écoles de Commerce, BTS, etc.)
- **Cultural Adaptation**: Different from US resume format - includes personal details that are standard in French recruitment

## Commands

### Backend (Node.js)
- **Start application**: `npm start` or `node app.js`
- **Install dependencies**: `pnpm install` (project uses pnpm as package manager)
- **Test full pipeline**: `node testOrchestrator.js`
- **Test PDF extraction**: `npm run test:pdf`
- **Test GPT-5 analysis**: `npm test`

### Frontend (Next.js 15) - To be implemented
- **Development server**: `npm run dev`
- **Production build**: `npm run build`
- **Start production**: `npm start`

## Architecture

The project follows a **production-ready orchestrator-worker pattern** with the following architecture:

### Backend (Node.js + GPT-5)
- **Main orchestrator**: `src/orchestrator/recruitingOrchestrator.js` - LangChain RunnableSequence implementation
- **Worker system**: Located in `/src/workers/` directory:
  - `structuringWorker.js` - **NEW**: Converts raw PDF text to structured JSON using GPT-5
  - `comprehensiveResumeAnalyzer.js` - Complete resume analysis pipeline
- **LLM Integration**: 
  - Replicate client (`src/clients/replicateClient.js`) for GPT-5
  - Requires `REPLICATE_API_TOKEN` environment variable
- **Utilities**: `src/utils/agentUtils.js` - PDF text extraction using pdf2json (more robust than pdf-parse)

### Frontend (Next.js 15) - Planned Implementation
- **User Interface**: Recruiter dashboard for CV upload and analysis visualization
- **API Routes**: Integration layer between frontend and backend orchestrator
- **React Hooks**: Custom hooks for resume analysis lifecycle and file upload management
- **Storage Abstraction**: Dev (local filesystem) / Prod (Supabase Storage + Postgres)

## Key Implementation Details

### Backend Technologies
- **ES Modules**: `"type": "module"` in package.json
- **PDF Processing**: Using `pdf2json` library for robust PDF text extraction (replaced pdf-parse)
- **LLM Client**: GPT-4.1 via Replicate API with structured JSON output (switched from GPT-5)
- **Pipeline Architecture**: Sequential LangChain RunnableSequence with error handling
- **REST API**: Express TypeScript server with /api/upload-cv and /api/candidate/:id/ask endpoints
- **Storage**: In-memory CandidateStore for MVP (CandidateProfile persistence)

### Frontend Technologies (Implemented)
- **Framework**: Next.js 15 with App Router
- **UI/UX**: Tailwind CSS with Aceternity UI components
- **File Upload**: React Dropzone with Motion/Framer Motion animations
- **State Management**: React hooks for local state management
- **Development**: Concurrently for frontend (3000) + backend (3001) workflow

## Orchestrator-Worker Pipeline

### Current Pipeline Stages:
```
📄 PDFExtractionWorker (Enhanced)
├── Extract raw text from PDF (pdf2json)
├── Structure text → JSON using GPT-5 (StructuringWorker)
└── Output: rawText + structuredResume

🔧 SkillsAnalysisWorker  
├── Use structured data when available
├── Fallback to comprehensive analysis
└── Output: skills, experience_years, experience_level

💼 ExperienceWorker
├── Leverage structured experience array
└── Output: career progression evaluation

📋 ScreeningWorker
├── Generate strengths/weaknesses analysis
└── Output: overall_score, pros/cons evaluation

🎯 MatchingWorker (Optional)
├── Compare against job description
└── Output: match_score, recommendation
```

### Structured Resume Schema (StructuringWorker Output):
```json
{
  "name": "string or null",
  "contact": {
    "email": "string or null",
    "phone": "string or null", 
    "location": "string or null",
    "links": ["array of strings"]
  },
  "skills": ["array of strings"],
  "experience": [
    {
      "title": "string or null",
      "company": "string or null",
      "start": "string or null", 
      "end": "string or null",
      "location": "string or null",
      "bullets": ["array of strings"]
    }
  ],
  "education": [
    {
      "degree": "string or null",
      "school": "string or null",
      "year": "string or null"
    }
  ],
  "certifications": ["array of strings"],
  "languages": ["array of strings"],
  "summary": "string or null"
}
```

## Frontend Architecture (Next.js 15) - Planned

### Storage Strategy
- **Development**: Local filesystem storage in `/resumes` directory
- **Production**: Supabase Storage for PDFs + Postgres for analysis metadata
- **Abstraction Layer**: StorageProvider interface for seamless dev/prod switching

### API Routes Design
- `/api/upload` - Handle PDF uploads, store locally (dev) or in Supabase (prod)
- `/api/analyze` - Trigger `processResume()` from orchestrator with progress streaming
- `/api/results/[id]` - Retrieve complete analysis results

### React Hooks Architecture
- **useResumeAnalysis**: Manage complete analysis lifecycle (upload → processing → results)
- **useUpload**: Handle drag & drop file uploads with validation
- **useAnalysisHistory**: Manage candidate history and comparisons

### UI Components for Recruiters
- **ResumeUpload**: Drag & drop upload interface
- **AnalysisResults**: Structured data visualization
- **SkillsRadar**: Interactive radar chart for skills
- **ExperienceTimeline**: Career progression timeline
- **MatchGauge**: Visual match score gauge
- **CandidateCard**: Candidate overview cards

## Why Orchestrator-Worker Pattern

**✅ Production Benefits:**
- **Predictable workflows** for business-critical recruiting processes
- **Easy debugging** with clear worker separation
- **Independent scaling** of worker capacity
- **LangChain integration** with RunnableSequence

**✅ Perfect for AI Recruiting:**
- Sequential pipeline (PDF → Structure → Analyze → Screen)
- Parallel processing where beneficial
- Error handling and retry mechanisms
- Real-time progress tracking

## Development Notes

- **PDF Processing**: Using pdf2json for better handling of malformed PDFs
- **Environment**: Requires `REPLICATE_API_TOKEN` in `.env` file
- **Testing**: Use `node testOrchestrator.js` for complete pipeline testing
- **Frontend**: Next.js implementation planned with recruiter-focused UI/UX
- **Storage**: Abstracted for easy dev/prod migration (local → Supabase)
- **French CV Testing**: Sample CV available (`Sophie_Martin_Marketing.pdf`) with typical French resume information including age (28), marital status (married), children (1 child), for realistic testing of Q&A functionality

## Recent Improvements

### ✅ Completed
- **StructuringWorker**: GPT-4.1 powered text → JSON structuring (fixed JSON parsing issues)
- **Enhanced Orchestrator**: Integrated structuring into extraction worker
- **Robust PDF Processing**: Migrated from pdf-parse to pdf2json
- **Complete Pipeline**: All workers communicate via structured data
- **MVP Backend**: Express TypeScript API with /api/upload-cv and /api/candidate/:id/ask endpoints
- **In-Memory Storage**: CandidateStore with full CRUD operations for candidate profiles
- **Next.js 15 Frontend**: Complete recruiter interface with drag-and-drop PDF upload
- **Concurrently Setup**: Frontend (3000) + Backend (3001) development workflow
- **End-to-End Testing**: Playwright automated testing of full upload → analysis → Q&A flow
- **Aceternity UI Integration**: Sleek file upload component with Motion animations
- **Modern UI Components**: FileUpload.tsx with React Dropzone and Tailwind styling

### 🚧 In Progress
- **Component Integration**: Finalizing Aceternity FileUpload in CandidateQAContainer
- **Storage Abstraction**: Local → Supabase migration strategy for production

### 🎯 Next Phase
- **SQLite Persistence**: Replace in-memory storage with local database
- **Multi-Session Support**: Handle multiple recruiters and candidate histories
- **Advanced Analytics**: Enhanced resume scoring and comparison features