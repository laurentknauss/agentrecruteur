
// utility functions - including the safe JSON parser 
import PDFParser from "pdf2json";

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
          let text = "";
          if (pdfData && pdfData.Pages) {
            text = pdfData.Pages
              .map(page =>
                page.Texts.map(t => decodeURIComponent(t.R[0].T)).join(" ")
              )
              .join("\n");
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