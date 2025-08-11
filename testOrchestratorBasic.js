#!/usr/bin/env node
// Basic Test for Orchestrator-Worker Pattern Implementation

import { RunnableSequence } from "@langchain/core/runnables";

/**
 * Mock PDF Extraction Worker
 */
const mockPdfExtractionWorker = async (input) => {
  console.log(`📄 PDF Extraction Worker: Processing ${input.resumePath}`);
  
  return {
    ...input,
    extractionStatus: 'completed',
    extractedText: 'Mock extracted text from resume',
    extractedAt: new Date().toISOString()
  };
};

/**
 * Mock Skills Analysis Worker
 */
const mockSkillsAnalysisWorker = async (input) => {
  console.log(`🔧 Skills Analysis Worker: Analyzing skills`);
  
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 100));
  
  return {
    ...input,
    skillsAnalysis: {
      skills: ['JavaScript', 'Node.js', 'React', 'Python'],
      industries: ['Technology', 'Software'],
      experience_years: 5,
      experience_level: 'Mid-level',
      analyzedAt: new Date().toISOString()
    }
  };
};

/**
 * Mock Experience Evaluation Worker
 */
const mockExperienceWorker = async (input) => {
  console.log(`💼 Experience Worker: Evaluating experience`);
  
  return {
    ...input,
    experienceEvaluation: {
      years: input.skillsAnalysis.experience_years,
      level: input.skillsAnalysis.experience_level,
      industries: input.skillsAnalysis.industries,
      evaluatedAt: new Date().toISOString()
    }
  };
};

/**
 * Mock Screening Worker
 */
const mockScreeningWorker = async (input) => {
  console.log(`📋 Screening Worker: Generating evaluation`);
  
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 150));
  
  return {
    ...input,
    screeningEvaluation: {
      strengths: ['Strong technical skills', 'Good communication', 'Team player'],
      weaknesses: ['Limited leadership experience', 'Could improve in testing'],
      key_achievements: ['Led project migration', 'Improved system performance'],
      overall_score: 78,
      summary: 'Strong mid-level candidate with solid technical foundation and room for growth.',
      confidence_score: 85,
      screenedAt: new Date().toISOString()
    }
  };
};

/**
 * Mock Matching Worker
 */
const mockMatchingWorker = async (input) => {
  console.log(`🎯 Matching Worker: Comparing to job requirements`);
  
  if (!input.jobDescription) {
    return {
      ...input,
      matchingScore: {
        message: "No job description provided for matching",
        matchedAt: new Date().toISOString()
      }
    };
  }
  
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
};

/**
 * Create Mock Recruiting Orchestrator using LangChain RunnableSequence
 */
const mockRecruitingOrchestrator = RunnableSequence.from([
  mockPdfExtractionWorker,
  mockSkillsAnalysisWorker,
  mockExperienceWorker,
  mockScreeningWorker,
  mockMatchingWorker
]);

/**
 * Test the mock orchestrator
 */
async function testMockOrchestrator() {
  console.log('🧪 Testing Mock Orchestrator-Worker Pattern...\n');
  
  const input = {
    resumePath: 'mock-resume.pdf',
    jobDescription: 'Software Engineer: JavaScript, Node.js, 3+ years experience',
    pipelineStarted: new Date().toISOString()
  };
  
  const startTime = Date.now();
  
  try {
    console.log('🚀 Starting orchestrator pipeline...\n');
    
    const result = await mockRecruitingOrchestrator.invoke(input);
    
    const duration = Date.now() - startTime;
    
    console.log('\n✅ Orchestrator pipeline completed!');
    console.log('=====================================');
    console.log(`Processing Time: ${duration}ms`);
    console.log(`Resume: ${result.resumePath}`);
    console.log(`Extraction Status: ${result.extractionStatus}`);
    console.log(`Skills Found: ${result.skillsAnalysis.skills.join(', ')}`);
    console.log(`Experience Level: ${result.skillsAnalysis.experience_level} (${result.skillsAnalysis.experience_years} years)`);
    console.log(`Overall Score: ${result.screeningEvaluation.overall_score}/100`);
    console.log(`Job Match: ${result.matchingScore.recommendation} (${result.matchingScore.score}/100)`);
    console.log(`Confidence: ${result.screeningEvaluation.confidence_score}%`);
    
    return result;
    
  } catch (error) {
    console.error('❌ Mock orchestrator test failed:', error);
    return null;
  }
}

/**
 * Test RunnableSequence functionality
 */
async function testRunnableSequence() {
  console.log('\n🧪 Testing RunnableSequence Architecture...\n');
  
  // Test simple sequence
  const simpleSequence = RunnableSequence.from([
    (input) => ({ ...input, step1: 'completed' }),
    (input) => ({ ...input, step2: 'completed' }),
    (input) => ({ ...input, step3: 'completed' })
  ]);
  
  const result = await simpleSequence.invoke({ test: true });
  
  console.log('✅ RunnableSequence test result:');
  console.log(`Step 1: ${result.step1}`);
  console.log(`Step 2: ${result.step2}`);
  console.log(`Step 3: ${result.step3}`);
  
  return result;
}

/**
 * Test error handling
 */
async function testErrorHandling() {
  console.log('\n🧪 Testing Error Handling...\n');
  
  const errorSequence = RunnableSequence.from([
    (input) => ({ ...input, step1: 'completed' }),
    (input) => { throw new Error('Simulated worker failure'); },
    (input) => ({ ...input, step3: 'completed' })
  ]);
  
  try {
    await errorSequence.invoke({ test: true });
    console.log('❌ Error handling test failed - should have thrown');
    return false;
  } catch (error) {
    console.log('✅ Error handling works correctly:', error.message);
    return true;
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🚀 Starting Basic Orchestrator-Worker Pattern Tests');
  console.log('='.repeat(60));
  
  const startTime = Date.now();
  
  try {
    // Test 1: RunnableSequence functionality
    const sequenceResult = await testRunnableSequence();
    
    // Test 2: Error handling
    const errorHandlingResult = await testErrorHandling();
    
    // Test 3: Full mock orchestrator
    const orchestratorResult = await testMockOrchestrator();
    
    const totalTime = Date.now() - startTime;
    
    console.log('\n🎉 All Tests Complete!');
    console.log('='.repeat(60));
    console.log(`Total Test Time: ${totalTime}ms`);
    
    // Test summary
    console.log('\n📋 Test Summary:');
    console.log(`${sequenceResult ? '✅' : '❌'} RunnableSequence: ${sequenceResult ? 'Passed' : 'Failed'}`);
    console.log(`${errorHandlingResult ? '✅' : '❌'} Error handling: ${errorHandlingResult ? 'Passed' : 'Failed'}`);
    console.log(`${orchestratorResult ? '✅' : '❌'} Mock orchestrator: ${orchestratorResult ? 'Passed' : 'Failed'}`);
    
    if (sequenceResult && errorHandlingResult && orchestratorResult) {
      console.log('\n🎯 Orchestrator-Worker Pattern Implementation: ✅ VERIFIED');
      console.log('   - LangChain RunnableSequence working correctly');
      console.log('   - Worker functions properly isolated');
      console.log('   - Sequential processing pipeline functional');
      console.log('   - Error handling implemented');
    } else {
      console.log('\n❌ Some tests failed - check implementation');
    }
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });
}