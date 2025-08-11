// testPDFExtraction.js
import { extractPDFText } from './src/utils/agentUtils.js';

async function testPDFExtraction() {
  try {
    const pdfPath = 'resumes/John_Doe_Resume.pdf';
    const text = await extractPDFText(pdfPath);
    console.log(`\nFull extracted text:\n${'='.repeat(50)}`);
    console.log(text);
    console.log(`${'='.repeat(50)}`);
    console.log(`\nTotal length: ${text.length} characters`);
  } catch (error) {
    console.error("Error during PDF extraction:", error);
  }
}

testPDFExtraction();