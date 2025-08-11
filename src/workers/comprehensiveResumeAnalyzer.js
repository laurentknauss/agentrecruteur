// ComprehensiveResumeAnalyzer - Single worker for complete resume analysis
// This is our "walking skeleton" - handles entire resume processing pipeline

import createReplicateClient, { runGPT5Model } from '../clients/replicateClient.js';
import { extractPDFText } from '../utils/agentUtils.js';

/**
 * Comprehensive Resume Analysis Schema
 */
export const ResumeAnalysisSchema = {
  skills: [], // Array of technical/professional skills
  experience_years: 0, // Total years of relevant experience
  education: "", // Highest education level and field
  experience_level: "", // Junior/Mid-level/Senior/Executive
  key_achievements: [], // Notable accomplishments
  strengths: [], // Top 3-5 candidate strengths
  weaknesses: [], // Areas for improvement/concerns
  overall_score: 0, // Score out of 100
  summary: "", // 2-3 sentence executive summary
  industries: [], // Relevant industry experience
  confidence_score: 0 // AI confidence in analysis (0-100)
};

/**
 * Analyzes a resume PDF comprehensively using GPT-5
 * @param {string} pdfPath - Path to PDF resume file
 * @param {string} jobDescription - Optional job description for targeted analysis
 * @returns {Promise<Object>} Structured resume analysis
 */
export async function analyzeResume(pdfPath, jobDescription = null) {
  console.log(`🔍 Starting comprehensive analysis of: ${pdfPath}`);
  
  try {
    // Step 1: Extract text from PDF
    console.log(`📄 Extracting text from PDF...`);
    const resumeText = await extractPDFText(pdfPath);
    
    if (!resumeText || resumeText.trim().length === 0) {
      throw new Error("No text could be extracted from the PDF");
    }
    
    console.log(`✅ Extracted ${resumeText.length} characters from PDF`);

    // Step 2: Initialize GPT-5 client
    const client = createReplicateClient();

    // Step 3: Create comprehensive analysis prompt
    const systemPrompt = `You are an expert HR analyst and recruiter with 15+ years of experience. 
    Analyze resumes comprehensively and provide structured insights that help recruiting agencies make informed decisions.
    
    Always return valid JSON matching this exact schema:
    {
      "skills": ["skill1", "skill2"],
      "experience_years": number,
      "education": "string",
      "experience_level": "Junior|Mid-level|Senior|Executive",
      "key_achievements": ["achievement1", "achievement2"],
      "strengths": ["strength1", "strength2"],
      "weaknesses": ["concern1", "concern2"],
      "overall_score": number_0_to_100,
      "summary": "2-3 sentence executive summary",
      "industries": ["industry1", "industry2"],
      "confidence_score": number_0_to_100
    }`;

    const analysisPrompt = `Analyze this resume comprehensively:

${resumeText}

${jobDescription ? `\nJob Description for Context:\n${jobDescription}` : ''}

Provide a thorough analysis focusing on:
1. Technical and soft skills (be specific, not generic)
2. Years of relevant experience (calculate based on roles)
3. Education level and relevance
4. Career progression and achievements
5. Honest strengths and potential concerns
6. Overall candidate quality score
7. Industry expertise areas
8. Your confidence in this analysis

Return ONLY valid JSON, no other text.`;

    // Step 4: Get analysis from GPT-5
    console.log(`🤖 Analyzing resume with GPT-5...`);
    const analysisResult = await runGPT5Model(
      client, 
      analysisPrompt, 
      systemPrompt, 
      "high", // reasoning effort
      4096 // max tokens
    );

    // Step 5: Parse and validate JSON response
    console.log(`📊 Parsing analysis results...`);
    let analysis;
    try {
      analysis = JSON.parse(analysisResult);
    } catch (parseError) {
      console.error("Failed to parse GPT-5 response as JSON:", parseError);
      throw new Error("Invalid JSON response from AI analysis");
    }

    // Step 6: Validate required fields
    const requiredFields = ['skills', 'experience_years', 'education', 'experience_level', 'overall_score', 'summary'];
    for (const field of requiredFields) {
      if (!(field in analysis)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Step 7: Add metadata
    analysis.analyzed_at = new Date().toISOString();
    analysis.analyzer_version = "1.0.0";
    analysis.source_file = pdfPath;

    console.log(`✅ Analysis complete. Score: ${analysis.overall_score}/100`);
    return analysis;

  } catch (error) {
    console.error(`❌ Resume analysis failed:`, error);
    throw new Error(`Resume analysis failed: ${error.message}`);
  }
}

/**
 * Batch analyze multiple resumes
 * @param {Array<string>} pdfPaths - Array of PDF file paths
 * @param {string} jobDescription - Optional job description
 * @returns {Promise<Array<Object>>} Array of resume analyses
 */
export async function batchAnalyzeResumes(pdfPaths, jobDescription = null) {
  console.log(`📋 Starting batch analysis of ${pdfPaths.length} resumes...`);
  
  const results = [];
  for (let i = 0; i < pdfPaths.length; i++) {
    const pdfPath = pdfPaths[i];
    try {
      console.log(`\n--- Processing ${i + 1}/${pdfPaths.length}: ${pdfPath} ---`);
      const analysis = await analyzeResume(pdfPath, jobDescription);
      results.push(analysis);
    } catch (error) {
      console.error(`Failed to analyze ${pdfPath}:`, error.message);
      results.push({
        error: error.message,
        source_file: pdfPath,
        analyzed_at: new Date().toISOString()
      });
    }
  }
  
  console.log(`\n✅ Batch analysis complete. ${results.filter(r => !r.error).length}/${pdfPaths.length} successful`);
  return results;
}