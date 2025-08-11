// RecruitingOrchestrator - LangChain RunnableSequence Implementation
// Orchestrator-Worker Pattern for AI Recruiting Pipeline

import { RunnableSequence, RunnablePassthrough } from "@langchain/core/runnables";
import { analyzeResume } from '../workers/comprehensiveResumeAnalyzer.js';
import { extractPDFText } from '../utils/agentUtils.js';
import { structureResumeText } from '../workers/structuringWorker.js';

/**
 * PDF Extraction Worker - Handles resume text extraction and structuring
 */
const pdfExtractionWorker = async (input) => {
  console.log(`📄 PDF Extraction Worker: Processing ${input.resumePath}`);
  
  try {
    // Step 1: Extract raw text from PDF
    const resumeText = await extractPDFText(input.resumePath);
    
    // Step 2: Structure the raw text into JSON using GPT-5
    const structuredResume = await structureResumeText(resumeText, input.jobDescription);
    
    return {
      ...input,
      rawText: resumeText,
      structuredResume: structuredResume,
      extractionStatus: 'completed',
      extractedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error(`❌ PDF Extraction Worker failed:`, error);
    return {
      ...input,
      extractionStatus: 'failed',
      extractionError: error.message,
      extractedAt: new Date().toISOString()
    };
  }
};

/**
 * Skills Analysis Worker - Identifies technical skills
 */
const skillsAnalysisWorker = async (input) => {
  console.log(`🔧 Skills Analysis Worker: Analyzing skills from ${input.resumePath}`);
  
  try {
    // Check if we have structured resume data from extraction worker
    if (input.structuredResume && input.extractionStatus === 'completed') {
      console.log(`🏗️ Using structured resume data for skills analysis`);
      
      // Extract skills from structured data
      const skills = input.structuredResume.skills || [];
      
      // Estimate experience years from experience array
      let experience_years = 0;
      if (input.structuredResume.experience && input.structuredResume.experience.length > 0) {
        // Simple calculation: count unique companies/roles
        experience_years = input.structuredResume.experience.length * 1.5; // Rough estimate
      }
      
      // Determine experience level
      let experience_level = "Junior";
      if (experience_years >= 8) experience_level = "Senior";
      else if (experience_years >= 3) experience_level = "Mid-level";
      
      return {
        ...input,
        skillsAnalysis: {
          skills: skills,
          industries: [], // Could be extracted from structured data in the future
          experience_years: Math.round(experience_years),
          experience_level: experience_level,
          analyzedAt: new Date().toISOString(),
          source: "structured_resume"
        }
      };
    }
    
    // Fallback to comprehensive analysis if structured data not available
    console.log(`📄 Falling back to comprehensive analysis`);
    const analysis = await analyzeResume(input.resumePath, input.jobDescription);
    
    return {
      ...input,
      skillsAnalysis: {
        skills: analysis.skills,
        industries: analysis.industries,
        experience_years: analysis.experience_years,
        experience_level: analysis.experience_level,
        analyzedAt: new Date().toISOString(),
        source: "comprehensive_analyzer"
      }
    };
  } catch (error) {
    console.error(`❌ Skills Analysis Worker failed:`, error);
    return {
      ...input,
      skillsAnalysis: {
        error: error.message,
        analyzedAt: new Date().toISOString()
      }
    };
  }
};

/**
 * Experience Evaluation Worker - Calculates years/roles
 */
const experienceWorker = async (input) => {
  console.log(`💼 Experience Worker: Evaluating experience from ${input.resumePath}`);
  
  // Use the existing analysis if available
  if (input.skillsAnalysis && !input.skillsAnalysis.error) {
    return {
      ...input,
      experienceEvaluation: {
        years: input.skillsAnalysis.experience_years,
        level: input.skillsAnalysis.experience_level,
        industries: input.skillsAnalysis.industries,
        evaluatedAt: new Date().toISOString()
      }
    };
  }
  
  return {
    ...input,
    experienceEvaluation: {
      error: "Skills analysis failed, cannot evaluate experience",
      evaluatedAt: new Date().toISOString()
    }
  };
};

/**
 * Screening Worker - Generate pros/cons evaluation
 */
const screeningWorker = async (input) => {
  console.log(`📋 Screening Worker: Generating evaluation for ${input.resumePath}`);
  
  try {
    const analysis = await analyzeResume(input.resumePath, input.jobDescription);
    
    return {
      ...input,
      screeningEvaluation: {
        strengths: analysis.strengths,
        weaknesses: analysis.weaknesses,
        key_achievements: analysis.key_achievements,
        overall_score: analysis.overall_score,
        summary: analysis.summary,
        confidence_score: analysis.confidence_score,
        screenedAt: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error(`❌ Screening Worker failed:`, error);
    return {
      ...input,
      screeningEvaluation: {
        error: error.message,
        screenedAt: new Date().toISOString()
      }
    };
  }
};

/**
 * Optional Matching Worker - Compare against job requirements
 */
const matchingWorker = async (input) => {
  console.log(`🎯 Matching Worker: Comparing candidate to job requirements`);
  
  if (!input.jobDescription) {
    return {
      ...input,
      matchingScore: {
        message: "No job description provided for matching",
        matchedAt: new Date().toISOString()
      }
    };
  }
  
  // Use screening evaluation to create a simple matching score
  if (input.screeningEvaluation && !input.screeningEvaluation.error) {
    const matchScore = input.screeningEvaluation.overall_score;
    
    return {
      ...input,
      matchingScore: {
        score: matchScore,
        confidence: input.screeningEvaluation.confidence_score,
        recommendation: matchScore > 75 ? "Strong Match" : matchScore > 50 ? "Moderate Match" : "Weak Match",
        matchedAt: new Date().toISOString()
      }
    };
  }
  
  return {
    ...input,
    matchingScore: {
      error: "Cannot perform matching without screening evaluation",
      matchedAt: new Date().toISOString()
    }
  };
};

/**
 * Create the Recruiting Orchestrator using LangChain RunnableSequence
 * This follows the orchestrator-worker pattern with sequential processing
 */
export const recruitingOrchestrator = RunnableSequence.from([
  // Step 1: PDF Extraction
  pdfExtractionWorker,
  
  // Step 2: Skills Analysis  
  skillsAnalysisWorker,
  
  // Step 3: Experience Evaluation
  experienceWorker,
  
  // Step 4: Screening Evaluation
  screeningWorker,
  
  // Step 5: Optional Matching (if job description provided)
  matchingWorker
]);

/**
 * Helper function to process a single resume through the orchestrator
 * @param {string} resumePath - Path to resume PDF
 * @param {string} jobDescription - Optional job description
 * @returns {Promise<Object>} Complete analysis result
 */
export async function processResume(resumePath, jobDescription = null) {
  console.log(`\n🚀 Recruiting Orchestrator: Starting pipeline for ${resumePath}`);
  
  const startTime = Date.now();
  
  try {
    const input = {
      resumePath,
      jobDescription,
      pipelineStarted: new Date().toISOString()
    };
    
    const result = await recruitingOrchestrator.invoke(input);
    
    const duration = Date.now() - startTime;
    console.log(`✅ Orchestrator complete in ${duration}ms`);
    
    return {
      ...result,
      pipelineCompleted: new Date().toISOString(),
      processingTimeMs: duration
    };
    
  } catch (error) {
    console.error(`❌ Orchestrator failed:`, error);
    throw new Error(`Recruiting orchestrator failed: ${error.message}`);
  }
}

/**
 * Process multiple resumes with the orchestrator
 * @param {Array<string>} resumePaths - Array of resume PDF paths
 * @param {string} jobDescription - Optional job description
 * @returns {Promise<Array<Object>>} Array of analysis results
 */
export async function processBatchResumes(resumePaths, jobDescription = null) {
  console.log(`\n📋 Batch Processing: ${resumePaths.length} resumes`);
  
  const results = [];
  for (let i = 0; i < resumePaths.length; i++) {
    const resumePath = resumePaths[i];
    try {
      console.log(`\n--- Processing ${i + 1}/${resumePaths.length} ---`);
      const result = await processResume(resumePath, jobDescription);
      results.push(result);
    } catch (error) {
      console.error(`Failed to process ${resumePath}:`, error.message);
      results.push({
        error: error.message,
        resumePath,
        pipelineCompleted: new Date().toISOString()
      });
    }
  }
  
  const successful = results.filter(r => !r.error).length;
  console.log(`\n✅ Batch processing complete: ${successful}/${resumePaths.length} successful`);
  
  return results;
}