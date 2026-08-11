// PDF processing utilities - mapped to existing codebase
import { extractPDFText } from './utils/agentUtils.js';
import { structureResumeText } from './workers/structuringWorker.js';
import { StructuredResume } from './types.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * Process uploaded PDF buffer and extract structured resume data
 * Uses existing extractPDFText + structureResumeText from codebase
 */
export async function processPDFBuffer(
  buffer: Buffer, 
  candidateId: string
): Promise<{ sourceText: string; structuredProfile: StructuredResume }> {
  
  console.log(`📄 Processing PDF for candidate ${candidateId}`);
  
  // Create temp directory if it doesn't exist
  const tempDir = path.join(process.cwd(), 'temp');
  await fs.mkdir(tempDir, { recursive: true });
  
  // Save buffer to temporary file (required by existing extractPDFText)
  const tempPath = path.join(tempDir, `${candidateId}.pdf`);
  await fs.writeFile(tempPath, buffer);
  
  try {
    // Step 1: Extract raw text using existing agentUtils
    console.log(`📝 Extracting text from PDF...`);
    const sourceText = await extractPDFText(tempPath);
    
    if (!sourceText || sourceText.trim().length === 0) {
      throw new Error('No text could be extracted from PDF');
    }
    
    // Step 2: Structure using existing StructuringWorker (GPT-5.5)
    console.log(`🏗️ Structuring resume with GPT-5...`);
    const structuredProfile = await structureResumeText(sourceText) as StructuredResume;
    
    console.log(`✅ PDF processed successfully for ${candidateId}`);
    
    return {
      sourceText: sourceText.trim(),
      structuredProfile
    };
    
  } finally {
    // Cleanup temporary file
    try {
      await fs.unlink(tempPath);
    } catch (cleanupError) {
      console.warn(`⚠️ Failed to cleanup temp file: ${tempPath}`);
    }
  }
}

/**
 * Validate PDF file buffer
 */
export function validatePDFBuffer(buffer: Buffer): { valid: boolean; error?: string } {
  if (!buffer || buffer.length === 0) {
    return { valid: false, error: 'Empty file buffer' };
  }
  
  // Check PDF signature (%PDF)
  const pdfSignature = buffer.subarray(0, 4).toString();
  if (pdfSignature !== '%PDF') {
    return { valid: false, error: 'Invalid PDF file format' };
  }
  
  // Check file size limits
  if (buffer.length < 1024) {
    return { valid: false, error: 'PDF file too small' };
  }
  
  if (buffer.length > 10 * 1024 * 1024) {
    return { valid: false, error: 'PDF file too large (max 10MB)' };
  }
  
  return { valid: true };
}