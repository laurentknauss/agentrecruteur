// Seed demo candidates into MongoDB Atlas (via the same store the API uses).
// Usage (from backend/): pnpm exec tsx scripts/seed-demo.ts
// Requires MONGODB_ATLAS_URI + MONGODB_DATABASE in .env — see README.
import MongoDBConnection from '../src/database/mongodb.js';
import { mongoCandidateStore } from '../src/database/mongoCandidateStore.js';
import { CandidateProfile } from '../src/types.js';

const now = new Date().toISOString();

const samples: CandidateProfile[] = [
  {
    id: 'demo-sophie-martin',
    filename: 'Sophie_Martin_Marketing.pdf',
    uploadedAt: now,
    sourceText:
      'Sophie Martin, Responsable Marketing Digital. TechStart Lyon (2021-2024): campagnes Facebook Ads et Google Ads (budget 150K€), +15% de conversion en 18 mois, management de 3 personnes. Retail Plus (2019-2021): emailing, événements. Master Marketing Digital EMLYON. Certifiée Google Ads, Google Analytics, HubSpot, Mailchimp. Français natif, anglais courant (TOEIC 890), espagnol intermédiaire.',
    profile: {
      name: 'Sophie Martin',
      contact: {
        email: 'sophie.martin@email.com',
        phone: '+33 6 12 34 56 78',
        location: 'Lyon, France',
        links: ['linkedin.com/in/sophie-martin-marketing'],
      },
      skills: ['Google Ads', 'Facebook Ads', 'Google Analytics', 'HubSpot', 'Mailchimp', 'SEO', 'SEA', 'Marketing automation', 'Content marketing', 'WordPress', 'HTML/CSS'],
      experience: [
        { title: 'Responsable Marketing Digital', company: 'TechStart Lyon', start: '2021', end: '2024', location: 'Lyon', bullets: ['Gestion campagnes Facebook Ads et Google Ads (budget annuel 150K€)', 'Augmentation du taux de conversion de 15% en 18 mois', "Management d'une équipe de 3 personnes"] },
        { title: 'Chargée de Marketing', company: 'Retail Plus', start: '2019', end: '2021', location: 'France', bullets: ['Campagnes emailing (taux d\'ouverture moyen 25%)', 'Organisation d\'événements promotionnels', 'Analyse des données clients et segmentation'] },
        { title: 'Assistant Marketing', company: 'StartupCorp', start: '2018', end: '2019', location: 'France', bullets: ['Création de contenus marketing', 'Gestion des réseaux sociaux'] },
      ],
      education: [
        { degree: 'Master Marketing Digital', school: 'EMLYON Business School', year: '2018' },
        { degree: 'Licence Commerce et Marketing', school: 'Université Lyon 3', year: '2016' },
      ],
      certifications: ['Google Ads', 'Google Analytics'],
      languages: ['Français (natif)', 'Anglais (courant, TOEIC 890)', 'Espagnol (intermédiaire)'],
      summary: 'Responsable marketing digital senior avec 6 ans d\'expérience en acquisition payante et marketing automation.',
    },
    analysis: {
      skills: ['Google Ads', 'Facebook Ads', 'Google Analytics', 'HubSpot', 'SEO', 'Marketing automation'],
      experience_years: 6,
      experience_level: 'Senior',
      strengths: ['Acquisition payante multi-canaux', 'Certifications Google', 'Management d\'équipe', 'Résultats chiffrés'],
      weaknesses: ['Stack technique limitée (HTML/CSS débutant)', 'Pas d\'expérience produit tech'],
      key_achievements: ['+15% de conversion en 18 mois', 'Budget annuel géré : 150K€'],
      overall_score: 78,
      summary: 'Profil marketing senior solide, orienté résultats, prêt pour une mission d\'acquisition digitale.',
      confidence_score: 0.9,
      industries: ['Retail', 'Startup', 'E-commerce'],
    },
  },
  {
    id: 'demo-thomas-bernard',
    filename: 'Thomas_Bernard_Data_Engineer.pdf',
    uploadedAt: now,
    sourceText:
      'Thomas Bernard, Data Engineer senior. BigData Corp (2020-2026): pipelines Spark/Airflow, data warehouse Snowflake, modélisation dbt, Python, SQL. DataStart (2018-2020): ETL, BI Looker. Master Data Science Centrale Lyon. Français natif, anglais professionnel.',
    profile: {
      name: 'Thomas Bernard',
      contact: {
        email: 'thomas.bernard@email.com',
        phone: '+33 6 98 76 54 32',
        location: 'Paris, France',
        links: ['linkedin.com/in/thomas-bernard-data'],
      },
      skills: ['Python', 'SQL', 'Apache Spark', 'Airflow', 'dbt', 'Snowflake', 'BigQuery', 'Kafka', 'Docker', 'Terraform'],
      experience: [
        { title: 'Data Engineer Senior', company: 'BigData Corp', start: '2020', end: '2026', location: 'Paris', bullets: ['Pipelines Spark/Airflow en production (50M+ événements/jour)', 'Data warehouse Snowflake + modélisation dbt', 'Migration on-premise vers cloud (GCP)'] },
        { title: 'Data Engineer', company: 'DataStart', start: '2018', end: '2020', location: 'Lyon', bullets: ['ETL et reporting BI (Looker)', 'Mise en place des premiers pipelines Kafka'] },
      ],
      education: [{ degree: 'Master Data Science', school: 'Centrale Lyon', year: '2018' }],
      certifications: ['Google Cloud Professional Data Engineer'],
      languages: ['Français (natif)', 'Anglais (professionnel)'],
      summary: 'Data engineer senior spécialisé pipelines de données à grande échelle et architectures cloud.',
    },
    analysis: {
      skills: ['Python', 'SQL', 'Spark', 'Airflow', 'Snowflake', 'Kafka', 'GCP'],
      experience_years: 8,
      experience_level: 'Senior',
      strengths: ['Pipelines à grande échelle en production', 'Stack cloud moderne (GCP)', 'Certification GCP'],
      weaknesses: ['Peu d\'expérience ML/MLOps'],
      key_achievements: ['50M+ événements/jour traités', 'Migration cloud complète'],
      overall_score: 85,
      summary: 'Excellent profil data engineering senior, pipeline lourd maîtrisé, certifié cloud.',
      confidence_score: 0.92,
      industries: ['Tech', 'Fintech', 'Data'],
    },
  },
  {
    id: 'demo-claire-dubois',
    filename: 'Claire_Dubois_Fullstack.pdf',
    uploadedAt: now,
    sourceText:
      'Claire Dubois, Développeuse Full-Stack. WebAgency (2019-2026): React/Node.js/TypeScript, API REST, CI/CD, PostgreSQL. Junior Dev (2017-2019): PHP/WordPress. Licence Informatique Université Paris. Français natif, anglais technique.',
    profile: {
      name: 'Claire Dubois',
      contact: {
        email: 'claire.dubois@email.com',
        phone: '+33 7 12 34 56 78',
        location: 'Bordeaux, France',
        links: ['github.com/clairedubois'],
      },
      skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Docker', 'CI/CD', 'REST API', 'Jest'],
      experience: [
        { title: 'Développeuse Full-Stack', company: 'WebAgency', start: '2019', end: '2026', location: 'Bordeaux', bullets: ['Développement d\'applications React/Node.js/TypeScript', 'Mise en place CI/CD (GitHub Actions)', 'Migration PostgreSQL'] },
        { title: 'Développeuse Junior', company: 'Junior Dev', start: '2017', end: '2019', location: 'France', bullets: ['Sites WordPress', 'Intégration HTML/CSS'] },
      ],
      education: [{ degree: 'Licence Informatique', school: 'Université Paris', year: '2017' }],
      certifications: [],
      languages: ['Français (natif)', 'Anglais (technique)'],
      summary: 'Développeuse full-stack TypeScript/React/Node avec 9 ans d\'expérience, solide sur la qualité et la CI.',
    },
    analysis: {
      skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Docker', 'CI/CD'],
      experience_years: 9,
      experience_level: 'Senior',
      strengths: ['Stack web moderne complète', 'Tests et CI bien maîtrisés', 'Backend et frontend'],
      weaknesses: ['Pas d\'expérience IA/LLM'],
      key_achievements: ['CI/CD déployée sur 10+ projets'],
      overall_score: 82,
      summary: 'Profil full-stack senior fiable et complet, excellent pour des missions web produit.',
      confidence_score: 0.88,
      industries: ['Web', 'Agence', 'SaaS'],
    },
  },
];

async function main(): Promise<void> {
  await MongoDBConnection.getInstance().connect();
  for (const candidate of samples) {
    await mongoCandidateStore.set(candidate.id, candidate);
  }
  const count = await mongoCandidateStore.count();
  console.log(`✅ Seed terminé : ${samples.length} candidats insérés (total en base : ${count})`);
  await MongoDBConnection.getInstance().disconnect();
}

main().catch((error) => {
  console.error('❌ Seed échoué:', error);
  process.exit(1);
});
