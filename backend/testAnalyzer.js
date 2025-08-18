// Test script for ComprehensiveResumeAnalyzer
// Usage: node testAnalyzer.js <path-to-resume.pdf>

import { analyzeResume } from './src/workers/comprehensiveResumeAnalyzer.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testResumeAnalysis() {
  try {
    // Get PDF path from command line argument
    const pdfPath = process.argv[2];
    
    if (!pdfPath) {
      console.log("❌ Usage: node testAnalyzer.js <path-to-resume.pdf>");
      process.exit(1);
    }

    console.log("🚀 Testing Comprehensive Resume Analyzer");
    console.log("==========================================");
    
    // Test the analyzer
    const analysis = await analyzeResume(pdfPath);
    
    // Display results
    console.log("\n📊 ANALYSIS RESULTS:");
    console.log("===================");
    console.log(`📝 Summary: ${analysis.summary}`);
    console.log(`⭐ Overall Score: ${analysis.overall_score}/100`);
    console.log(`🎓 Education: ${analysis.education}`);
    console.log(`⏱️  Experience: ${analysis.experience_years} years (${analysis.experience_level})`);
    console.log(`🛠️  Skills: ${analysis.skills.join(', ')}`);
    console.log(`💪 Strengths: ${analysis.strengths.join(', ')}`);
    console.log(`⚠️  Concerns: ${analysis.weaknesses.join(', ')}`);
    console.log(`🏭 Industries: ${analysis.industries.join(', ')}`);
    console.log(`🤖 AI Confidence: ${analysis.confidence_score}%`);
    
    // Full JSON output (optional)
    if (process.argv.includes('--json')) {
      console.log("\n📄 FULL JSON OUTPUT:");
      console.log("====================");
      console.log(JSON.stringify(analysis, null, 2));
    }
    
    console.log("\n✅ Test completed successfully!");
    
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    process.exit(1);
  }
}

// Run test
testResumeAnalysis();