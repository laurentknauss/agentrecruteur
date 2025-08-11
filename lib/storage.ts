// lib/storage.ts
import fs from "fs/promises";
import path from "path";
import { createClient } from "@supabase/supabase-js";

// Détermine l'environnement
const isProd = process.env.NODE_ENV === "production";

// Supabase client (prod uniquement)
let supabase: ReturnType<typeof createClient> | null = null;
if (isProd) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
    throw new Error("Supabase credentials missing in environment variables");
  }
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
}

// 📌 Chemin local pour le stockage dev
const localResumesDir = path.join(process.cwd(), "resumes");

/**
 * Interface pour abstraction du stockage
 */
export interface StorageProvider {
  uploadFile(buffer: Buffer, filename: string): Promise<{ storagePath: string; publicUrl?: string }>;
  getFileUrl(storagePath: string): Promise<string>;
  readFile(storagePath: string): Promise<Buffer>;
  deleteFile(storagePath: string): Promise<void>;
}

/**
 * Sauvegarde un fichier (Buffer ou Uint8Array)
 * @param fileBuffer - Contenu du fichier en Buffer
 * @param filename - Nom du fichier avec extension
 * @returns Object avec storagePath et publicUrl optionnelle
 */
export async function saveResumeFile(
  fileBuffer: Buffer,
  filename: string
): Promise<{ storagePath: string; publicUrl?: string }> {
  if (!isProd) {
    // Dev → stockage local
    await fs.mkdir(localResumesDir, { recursive: true });
    const filePath = path.join(localResumesDir, filename);
    await fs.writeFile(filePath, fileBuffer);
    return { storagePath: filePath };
  }

  // Prod → stockage Supabase
  if (!supabase) throw new Error("Supabase client not initialized");

  const { data, error } = await supabase.storage
    .from("resumes")
    .upload(filename, fileBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (error) throw new Error(`Supabase upload failed: ${error.message}`);

  const { data: publicUrlData } = supabase.storage
    .from("resumes")
    .getPublicUrl(filename);

  return {
    storagePath: filename,
    publicUrl: publicUrlData.publicUrl,
  };
}

/**
 * 📂 Lecture d'un fichier (Buffer)
 * @param storagePath - Chemin de stockage (local ou Supabase)
 * @returns Buffer du fichier
 */
export async function readResumeFile(storagePath: string): Promise<Buffer> {
  if (!isProd) {
    return await fs.readFile(storagePath);
  }

  if (!supabase) throw new Error("Supabase client not initialized");

  const { data, error } = await supabase.storage
    .from("resumes")
    .download(storagePath);

  if (error) throw new Error(`Supabase download failed: ${error.message}`);

  return Buffer.from(await data.arrayBuffer());
}

/**
 * 🔗 Obtient l'URL publique d'un fichier
 * @param storagePath - Chemin de stockage
 * @returns URL publique du fichier
 */
export async function getResumeFileUrl(storagePath: string): Promise<string> {
  if (!isProd) {
    // Dev → URL locale via API route
    const filename = path.basename(storagePath);
    return `/api/files/${filename}`;
  }

  if (!supabase) throw new Error("Supabase client not initialized");

  const { data } = supabase.storage
    .from("resumes")
    .getPublicUrl(storagePath);

  return data.publicUrl;
}

/**
 * 🗑️ Supprime un fichier
 * @param storagePath - Chemin de stockage
 */
export async function deleteResumeFile(storagePath: string): Promise<void> {
  if (!isProd) {
    // Dev → suppression locale
    await fs.unlink(storagePath);
    return;
  }

  if (!supabase) throw new Error("Supabase client not initialized");

  const { error } = await supabase.storage
    .from("resumes")
    .remove([storagePath]);

  if (error) throw new Error(`Supabase delete failed: ${error.message}`);
}

/**
 * 📝 Génère un nom de fichier unique avec timestamp
 * @param originalFilename - Nom original du fichier
 * @returns Nom de fichier unique
 */
export function generateUniqueFilename(originalFilename: string): string {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 8);
  const extension = path.extname(originalFilename);
  const baseName = path.basename(originalFilename, extension);
  
  return `${timestamp}_${randomId}_${baseName}${extension}`;
}

/**
 * ✅ Valide qu'un fichier est un PDF
 * @param buffer - Buffer du fichier
 * @returns true si c'est un PDF valide
 */
export function validatePDF(buffer: Buffer): boolean {
  // Vérifie la signature PDF (%PDF)
  const pdfSignature = buffer.subarray(0, 4).toString();
  return pdfSignature === '%PDF';
}

/**
 * 📊 Obtient les métadonnées d'un fichier
 * @param buffer - Buffer du fichier
 * @param filename - Nom du fichier
 * @returns Métadonnées du fichier
 */
export function getFileMetadata(buffer: Buffer, filename: string) {
  return {
    filename,
    size: buffer.length,
    type: 'application/pdf',
    extension: path.extname(filename),
    uploadedAt: new Date().toISOString(),
    isValidPDF: validatePDF(buffer)
  };
}

// Export du provider par défaut
export const storageProvider: StorageProvider = {
  uploadFile: saveResumeFile,
  getFileUrl: getResumeFileUrl,
  readFile: readResumeFile,
  deleteFile: deleteResumeFile
};

// Export pour compatibilité avec l'orchestrator existant
export {
  saveResumeFile as uploadFile,
  readResumeFile as downloadFile,
  getResumeFileUrl as getFileUrl,
  deleteResumeFile as removeFile
};