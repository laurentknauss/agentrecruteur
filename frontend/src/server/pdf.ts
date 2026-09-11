// PDF processing utilities - mapped to existing codebase
import { extractPDFText } from './utils/agentUtils.js';
import { structureResumeText } from './workers/structuringWorker.js';
import { StructuredResume } from './types.ts';
import { PdfError, PDF_ERROR_CODES, toAnalysisError, toPdfError } from './errors.ts';
import { MAX_UPLOAD_BYTES } from './limits.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * Process uploaded PDF buffer and extract structured resume data
 * Uses existing extractPDFText + structureResumeText from codebase
 *
 * Erreurs : `PdfError` pour tout incident de lecture PDF (422),
 * `AnalysisServiceError` pour une indisponibilité du LLM (502).
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
    let sourceText: string;
    try {
      sourceText = await extractPDFText(tempPath);
    } catch (extractionError) {
      throw toPdfError(extractionError);
    }
    
    if (!sourceText || sourceText.trim().length === 0) {
      throw new PdfError(
        PDF_ERROR_CODES.NO_TEXT,
        "Aucune couche texte détectée dans ce PDF (document scanné). L'OCR n'est pas pris en charge : fournissez un PDF texte.",
      );
    }
    
    // Step 2: Structure using existing StructuringWorker (GPT-5.5)
    console.log(`🏗️ Structuring resume with GPT-5...`);
    let structuredProfile: StructuredResume;
    try {
      structuredProfile = await structureResumeText(sourceText) as StructuredResume;
    } catch (structuringError) {
      throw toAnalysisError(structuringError);
    }
    
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
  
  if (buffer.length > MAX_UPLOAD_BYTES) {
    return { valid: false, error: 'PDF file too large (max 10MB)' };
  }
  
  return { valid: true };
}
