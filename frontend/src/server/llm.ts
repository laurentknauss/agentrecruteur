// LLM integration - mapped to existing openaiClient (GPT-5.5)
import createOpenAIClient, { runGPT5Model } from './clients/openaiClient.js';
import { CandidateProfile } from './types.ts';

/**
 * Generate LLM-powered answer using existing openaiClient
 * Conserves prompts and signature from original design
 */
export async function generateLLMAnswer(
  question: string, 
  candidate: CandidateProfile
): Promise<string> {
  try {
    console.log(`🤖 Generating LLM answer for candidate ${candidate.id}`);
    
    // Use existing openaiClient
    const client = createOpenAIClient();
    
    // System prompt for Q&A context
    const systemPrompt = `Tu es un assistant RH expert qui répond aux questions sur les candidats.
Réponds de manière concise et professionnelle en français.
Utilise uniquement les informations fournies dans le profil candidat.
Si l'information n'est pas disponible, dis-le clairement.`;

    // Analysis prompt with candidate data
    const analysisPrompt = `PROFIL CANDIDAT:
${JSON.stringify(candidate.profile, null, 2)}

ANALYSE COMPLÈTE:
${JSON.stringify(candidate.analysis, null, 2)}

TEXTE SOURCE (extrait):
${candidate.sourceText.substring(0, 1000)}...

QUESTION: ${question}

Réponds de manière précise et professionnelle:`;

    // Call existing runGPT5Model with signature preservation
    const answer = await runGPT5Model(
      client,
      analysisPrompt,
      systemPrompt,
      "low", // reasoning effort
      500   // max tokens
    );
    
    return answer || "Désolé, je n'ai pas pu générer une réponse à cette question.";

  } catch (error) {
    console.error('❌ LLM Answer generation error:', error);
    return "Erreur lors de la génération de la réponse. Veuillez reformuler votre question.";
  }
}

/**
 * Simple rule-based Q&A with fallback to LLM
 * Maps common questions to structured data
 */
export function generateSimpleAnswer(
  question: string, 
  candidate: CandidateProfile
): string | null {
  const q = question.toLowerCase();
  const profile = candidate.profile;
  const analysis = candidate.analysis;

  // Name questions
  if (q.includes('name') || q.includes('nom') || q.includes('qui est')) {
    return profile.name ? `Le candidat s'appelle ${profile.name}.` : 'Nom non disponible dans le CV.';
  }

  // Skills questions
  if (q.includes('compétence') || q.includes('skill') || q.includes('technologie')) {
    if (profile.skills && profile.skills.length > 0) {
      return `Compétences principales: ${profile.skills.slice(0, 5).join(', ')}.`;
    }
    return 'Aucune compétence technique identifiée.';
  }

  // Experience questions
  if (q.includes('expérience') || q.includes('experience') || q.includes('années')) {
    return `${analysis.experience_years || 0} années d'expérience, niveau ${analysis.experience_level || 'indéterminé'}.`;
  }

  // Email/Contact questions
  if (q.includes('email') || q.includes('contact') || q.includes('téléphone')) {
    const contact = profile.contact;
    const parts = [];
    if (contact?.email) parts.push(`Email: ${contact.email}`);
    if (contact?.phone) parts.push(`Téléphone: ${contact.phone}`);
    return parts.length > 0 ? parts.join(', ') : 'Informations de contact non disponibles.';
  }

  // Education questions
  if (q.includes('formation') || q.includes('étude') || q.includes('diplôme')) {
    if (profile.education && profile.education.length > 0) {
      const edu = profile.education[0];
      return `Formation: ${edu.degree || 'Non spécifié'} à ${edu.school || 'École non spécifiée'}.`;
    }
    return 'Aucune formation identifiée dans le CV.';
  }

  // Score/evaluation questions
  if (q.includes('score') || q.includes('évaluation') || q.includes('note')) {
    return `Score global: ${analysis.overall_score || 0}/100. Niveau d'expérience: ${analysis.experience_level}.`;
  }

  // Strengths questions
  if (q.includes('forces') || q.includes('points forts') || q.includes('atouts')) {
    if (analysis.strengths && analysis.strengths.length > 0) {
      return `Points forts: ${analysis.strengths.slice(0, 3).join(', ')}.`;
    }
    return 'Points forts non analysés.';
  }

  return null; // No simple answer found, will fallback to LLM
}

/**
 * Combined Q&A function with rule-based + LLM fallback
 */
export async function answerQuestion(
  question: string, 
  candidate: CandidateProfile
): Promise<string> {
  
  // First try simple rule-based answer
  const simpleAnswer = generateSimpleAnswer(question, candidate);
  
  if (simpleAnswer) {
    console.log(`✅ Simple answer provided for: "${question}"`);
    return simpleAnswer;
  }
  
  // Fallback to LLM for complex questions
  console.log(`🤖 Using LLM for complex question: "${question}"`);
  return await generateLLMAnswer(question, candidate);
}