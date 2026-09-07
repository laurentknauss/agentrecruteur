"use client"

import { motion } from "motion/react"
import { FileUp, BarChart3, MessageCircleQuestion } from "lucide-react"

const steps = [
  {
    icon: FileUp,
    title: "Déposez un CV",
    description:
      "Glissez-déposez le CV en PDF du candidat dans la zone d'upload. Le document est extrait automatiquement.",
  },
  {
    icon: BarChart3,
    title: "Analyse structurée",
    description:
      "Le profil est structuré : compétences, expériences, formation. Un score global et une évaluation sont générés.",
  },
  {
    icon: MessageCircleQuestion,
    title: "Interrogez le CV du candidat",
    description:
      "Posez vos questions à notre agent et obtenez des réponses immédiates, précises et sourcées : expérience, compétences, points forts — sans relire et re-parcourir le CV pour la énième fois.",
  },
]

export function HowItWorks() {
  return (
    <section id="comment" className="relative py-16 px-4 bg-[#f5f4ef] scroll-mt-24">
      <div className="max-w-6xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative text-3xl sm:text-4xl font-bold text-black text-center mb-12"

        >
          Comment ça marche
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
              className="relative rounded-2xl border border-slate-700 bg-slate-700/40 p-6 text-center"
              data-devbox={`etape-${index + 1}-${step.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white text-slate-600 mb-4">
                <step.icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-black mb-2">{step.title}</h3>
              <p className="text-sm text-black leading-relaxed">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
