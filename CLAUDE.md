# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an AI Recruiter Agency built using Node.js backend with GPT-5 integration and a Next.js 15 frontend. The project uses an orchestrator-worker architecture for comprehensive resume analysis including PDF extraction, text structuring, skills analysis, experience evaluation, and candidate screening.

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
- **LLM Client**: GPT-5 via Replicate API with structured JSON output
- **Pipeline Architecture**: Sequential LangChain RunnableSequence with error handling

### Frontend Technologies (To be implemented)
- **Framework**: Next.js 15 with App Router
- **UI/UX**: Tailwind CSS + shadcn/ui components
- **State Management**: Zustand + React Query
- **Visualizations**: Recharts for interactive charts and graphs
- **Real-time Updates**: Server-Sent Events for progress streaming

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

## Recent Improvements

### ✅ Completed
- **StructuringWorker**: GPT-5 powered text → JSON structuring
- **Enhanced Orchestrator**: Integrated structuring into extraction worker
- **Robust PDF Processing**: Migrated from pdf-parse to pdf2json
- **Complete Pipeline**: All workers communicate via structured data

### 🚧 In Progress
- **Next.js 15 Frontend**: Recruiter interface with real-time progress
- **Storage Abstraction**: Local → Supabase migration strategy
- **API Integration**: Frontend ↔ Backend communication layer