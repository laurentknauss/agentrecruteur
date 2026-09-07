"use client"

import { motion } from "motion/react"
import { VARIANT } from "@/lib/variant"

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

// Palette militaire
const OLIVE_FONCE = "oklch(0.40 0.06 105)"
const KAKI_MOYEN = "oklch(0.55 0.05 105)"
const CREME = "#f5f4ef"

function Inner() {
  const isB = VARIANT === "B"
  return (
    <div className="relative z-10 max-w-5xl mx-auto text-center">
      {/* Headline with text mask animation */}
      <h1
        className={
          "relative text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6 " +
          (isB ? "text-white" : "text-[oklch(0.40_0.06_105)]")
        }
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
        className={
          "relative text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed " +
          (isB ? "" : "text-[oklch(0.40_0.06_105)]")
        }
        style={isB ? { color: CREME } : undefined}
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
        className={"relative text-sm " + (isB ? "" : "text-zinc-500")}
        style={isB ? { color: CREME } : undefined}
        data-devbox="hero-badge-techno"
      >
        PDF → Profil structuré → Score · Q&amp;A
      </motion.p>
    </div>
  )
}

export function Hero() {
  const isB = VARIANT === "B"
  return (
    <section
      className="relative flex flex-col items-center justify-center px-4 pt-80 pb-16 overflow-hidden bg-[#f5f4ef]"
      data-devbox="hero"
    >
      {isB ? (
        /* Direction B — panneau kaki « insigne » avec textes blancs */
        <div
          className="relative z-10 w-full max-w-5xl mx-auto rounded-3xl px-6 py-12 sm:px-12 sm:py-16 shadow-xl"
          style={{ backgroundColor: KAKI_MOYEN, outline: `3px solid ${OLIVE_FONCE}` }}
          data-devbox="panneau-kaki"
        >
          <Inner />
        </div>
      ) : (
        /* Direction C — crème + galon kaki discret */
        <>
          <div
            aria-hidden
            className="relative z-10 h-2 w-2/3 max-w-3xl mx-auto mb-10 rounded-full"
            style={{
              background: `repeating-linear-gradient(90deg, ${OLIVE_FONCE} 0 18px, ${KAKI_MOYEN} 18px 36px)`,
            }}
            data-devbox="galon-kaki"
          />
          <Inner />
        </>
      )}
    </section>
  )
}
