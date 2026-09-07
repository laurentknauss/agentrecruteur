"use client"

import { motion } from "motion/react"
const textRevealVariants = {
  hidden: { y: "100%" },
  visible: (i: number) => ({
    y: 0,
    transition: {
      duration: 0.8,
      ease: [0.22, 1, 0.36, 1] as const,
      delay: i * 0.1,
    },
  }),
}

const CREME = "#f5f4ef"

export function Hero() {
  return (
    <section
      className="relative flex flex-col items-center justify-center px-4 pt-80 pb-16 overflow-hidden"
      style={{
        backgroundImage: "url('/bg-camo.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundColor: "oklch(0.45 0.06 105)",
      }}
      data-devbox="hero"
    >
      {/* Voile kaki semi-transparent pour la lisibilité */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ backgroundColor: "oklch(0.35 0.05 105)", opacity: 0.45 }}
        data-devbox="voile-hero"
      />

      <div className="relative z-10 w-full max-w-5xl mx-auto text-center">
        {/* Headline with text mask animation */}
        <h1
          className="relative text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white mb-6"
          style={{ textShadow: "0 2px 10px rgba(0,0,0,0.45)" }}
          data-devbox="hero-titre"
        >
          <span className="block overflow-hidden relative" data-devbox="slogan-ligne-1">
            <motion.span className="block" variants={textRevealVariants} initial="hidden" animate="visible" custom={0}>
              Laissez votre agent IA présélectionner les candidats.
            </motion.span>
          </span>
          <span className="block overflow-hidden relative" data-devbox="slogan-ligne-2">
            <motion.span
              className="block"
              variants={textRevealVariants}
              initial="hidden"
              animate="visible"
              custom={1}
            >
              Choisissez les meilleurs.
            </motion.span>
          </span>
        </h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="relative text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
          style={{ color: CREME, textShadow: "0 1px 6px rgba(0,0,0,0.5)" }}
          data-devbox="hero-sous-titre"
        >
          Notre agent scanne et analyse chaque CV en quelques secondes : structuration, score et
          pré-sélection automatiques. Gagnez des heures par recrutement et concentrez-vous sur les décisions.
        </motion.p>

        {/* Tech stack */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="relative text-sm"
          style={{ color: "rgba(245,244,239,0.9)", textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}
          data-devbox="hero-badge-techno"
        >
          PDF → Profil structuré → Score · Q&amp;A
        </motion.p>
      </div>
    </section>
  )
}
