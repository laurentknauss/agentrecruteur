// StructuringWorker - Transforms raw resume text into structured JSON using GPT-5
import createReplicateClient, { runGPT5Model } from '../clients/replicateClient.js';

/**
 * Resume Structure Schema
 */
export const ResumeStructureSchema = {
  name: "string",
  contact: {
    email: "string",
    phone: "string", 
    location: "string",
    links: ["string"]
  },
  skills: ["string"],
  experience: [
    {
      title: "string",
      company: "string", 
      start: "string",
      end: "string",
      location: "string",
      bullets: ["string"]
    }
  ],
  education: [
    {
      degree: "string",
      school: "string",
      year: "string"
    }
  ],
  certifications: ["string"],
  languages: ["string"],
  summary: "string"
};

/**
 * Structures raw resume text into JSON format using GPT-5
 * @param {string} resumeText - Raw text extracted from PDF
 * @param {string} jobDescription - Optional job description for context
 * @returns {Promise<Object>} Structured resume JSON
 */
export async function structureResumeText(resumeText, jobDescription = null) {
  console.log(`🏗️ Structuring resume text into JSON...`);
  
  try {
    // Validate input
    if (!resumeText || resumeText.trim().length === 0) {
      throw new Error("Resume text is empty or invalid");
    }

    // Initialize GPT-5 client
    const client = createReplicateClient();

    // System prompt with strict JSON instructions
    const systemPrompt = `You are an expert resume parser. Your ONLY task is to extract information from raw resume text and return it as valid JSON.

CRITICAL RULES:
1. Return ONLY valid JSON, no other text whatsoever
2. Follow the exact schema provided
3. If information is missing, use null (not empty strings)
4. Arrays should be empty [] if no data found
5. Always include ALL required fields from the schema
6. Dates should be strings in format "MM/YYYY" or "YYYY"
7. Extract bullet points exactly as written

Required JSON Schema:
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
}`;

    // Analysis prompt with resume text
    const analysisPrompt = `Extract and structure the following resume text into the exact JSON schema provided:

RESUME TEXT:
${resumeText}

${jobDescription ? `\nJOB DESCRIPTION CONTEXT:\n${jobDescription}` : ''}

Instructions:
- Parse all sections carefully
- Extract contact info (email, phone, location, LinkedIn/website links)
- List all technical and soft skills mentioned
- Structure work experience with exact job titles, companies, dates, and bullet points
- Include education with degrees, schools, and graduation years
- List certifications and languages if mentioned
- Create a brief summary if one exists, or null if not

Return ONLY the JSON object, no explanations or additional text.`;

    // Get structured data from GPT-5
    console.log(`🤖 Calling GPT-5 for text structuring...`);
    const structuredResult = await runGPT5Model(
      client,
      analysisPrompt,
      systemPrompt,
      "high", // reasoning effort
      4096   // max tokens
    );

    // Parse and validate JSON response
    console.log(`📋 Parsing GPT-5 JSON response...`);
    let structuredResume;
    try {
      structuredResume = JSON.parse(structuredResult);
    } catch (parseError) {
      console.error("Failed to parse GPT-5 response as JSON:", parseError);
      console.error("Raw response:", structuredResult);
      throw new Error("Invalid JSON response from GPT-5 structuring");
    }

    // Validate required top-level fields
    const requiredFields = ['name', 'contact', 'skills', 'experience', 'education', 'certifications', 'languages', 'summary'];
    for (const field of requiredFields) {
      if (!(field in structuredResume)) {
        throw new Error(`Missing required field in structured resume: ${field}`);
      }
    }

    // Validate contact object structure
    if (structuredResume.contact && typeof structuredResume.contact === 'object') {
      const contactFields = ['email', 'phone', 'location', 'links'];
      for (const field of contactFields) {
        if (!(field in structuredResume.contact)) {
          structuredResume.contact[field] = field === 'links' ? [] : null;
        }
      }
    } else {
      structuredResume.contact = { email: null, phone: null, location: null, links: [] };
    }

    // Ensure arrays are arrays
    ['skills', 'experience', 'education', 'certifications', 'languages'].forEach(field => {
      if (!Array.isArray(structuredResume[field])) {
        structuredResume[field] = [];
      }
    });

    // Add metadata
    structuredResume.structured_at = new Date().toISOString();
    structuredResume.structuring_version = "1.0.0";

    console.log(`✅ Resume successfully structured. Name: ${structuredResume.name || 'N/A'}`);
    return structuredResume;

  } catch (error) {
    console.error(`❌ Resume structuring failed:`, error);
    throw new Error(`Resume structuring failed: ${error.message}`);
  }
}

/**
 * Batch structure multiple resume texts
 * @param {Array<{text: string, source?: string}>} resumeTexts - Array of resume text objects
 * @param {string} jobDescription - Optional job description
 * @returns {Promise<Array<Object>>} Array of structured resumes
 */
export async function batchStructureResumes(resumeTexts, jobDescription = null) {
  console.log(`📋 Starting batch structuring of ${resumeTexts.length} resumes...`);
  
  const results = [];
  for (let i = 0; i < resumeTexts.length; i++) {
    const { text, source } = resumeTexts[i];
    try {
      console.log(`\n--- Structuring ${i + 1}/${resumeTexts.length} ${source ? `(${source})` : ''} ---`);
      const structured = await structureResumeText(text, jobDescription);
      if (source) structured.source = source;
      results.push(structured);
    } catch (error) {
      console.error(`Failed to structure resume ${i + 1}:`, error.message);
      results.push({
        error: error.message,
        source: source || `resume_${i + 1}`,
        structured_at: new Date().toISOString()
      });
    }
  }
  
  console.log(`\n✅ Batch structuring complete. ${results.filter(r => !r.error).length}/${resumeTexts.length} successful`);
  return results;
}