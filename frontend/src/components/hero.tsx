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

export function Hero() {
  return (
    <section className="relative flex flex-col items-center justify-center px-4 pt-60 pb-12 overflow-hidden">
      {/* Background — identique au fond global */}
      

      <div className="relative z-10 max-w-5xl mx-auto text-center">
        {/* Headline with text mask animation */}
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white mb-6">
          <span className="block overflow-hidden">
            <motion.span className="block" variants={textRevealVariants} initial="hidden" animate="visible" custom={0}>
              Laissez votre agent IA présélectionner les candidats.
            </motion.span>
          </span>
          <span className="block overflow-hidden">
            <motion.span
              className="block text-black"
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
          className="text-lg sm:text-xl text-white max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          Notre agent scanne et analyse chaque CV en quelques secondes : structuration, score et
          pré-sélection automatiques. Gagnez des heures par recrutement et concentrez-vous sur les décisions.
        </motion.p>

        {/* Tech stack */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="text-sm text-zinc-500"
        >
          PDF → Profil structuré → Score · Q&amp;A
        </motion.p>
      </div>
    </section>
  )
}
