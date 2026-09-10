// utility functions - including the safe JSON parser 
import PDFParser from "pdf2json";
import { MAX_PDF_PAGES, MAX_RESUME_TEXT_CHARS } from "../limits.js";

/** 
* @param { string | buffer } 
* @returns { Promise<string> } 
* @throws { Error } 
*/
export async function extractPDFText(input) { 
   console.log(`\t🛠️ Util: Extracting text from PDF input...`);

   try { 
    let filePath;
    if (Buffer.isBuffer(input)) {  
      throw new Error("pdf2json requires file path, not buffer");
    } else if (typeof input === 'string') {    
      console.log(`\t Reading PDF from path: ${input}`); 
      filePath = input;
    } else { 
      throw new Error("Invalid input type for PDF extraction. Must be a file path (string).");
    }

    return new Promise((resolve, reject) => {
      const pdfParser = new PDFParser();
      pdfParser.on("pdfParser_dataError", err => reject(err.parserError));
      pdfParser.on("pdfParser_dataReady", pdfData => {
        try {
          const pages = Array.isArray(pdfData?.Pages) ? pdfData.Pages : [];

          // Borne 1 : nombre de pages — évite d'envoyer un document entier au LLM.
          if (pages.length > MAX_PDF_PAGES) {
            const error = new Error(
              `PDF trop long : ${pages.length} pages (maximum ${MAX_PDF_PAGES}).`
            );
            error.code = "PDF_TOO_LONG";
            reject(error);
            return;
          }

          const text = pages
            .map(page =>
              page.Texts.map(t => decodeURIComponent(t.R[0].T)).join(" ")
            )
            .join("\n");

          // Borne 2 : volume de caractères transmis au LLM.
          if (text.length > MAX_RESUME_TEXT_CHARS) {
            const error = new Error(
              `PDF trop volumineux : ${text.length} caractères extraits (maximum ${MAX_RESUME_TEXT_CHARS}).`
            );
            error.code = "PDF_TOO_LONG";
            reject(error);
            return;
          }

          console.log(`\t   ✅ Util: Successfully extracted text (${text.length} chars).`);
          resolve(text);
        } catch (parseError) {
          reject(parseError);
        }
      });
      pdfParser.loadPDF(filePath);
    });

   } catch (error) { 
     console.error(`\t   ❌ Util Error: Failed extracting text from PDF:`, error);
     throw new Error(`Failed to extract text from PDF: ${error.message}`);
   }
}
