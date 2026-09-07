"use client"

import { useState } from "react"
import Image from "next/image"

export function Navbar() {
  const [open, setOpen] = useState<null | "signup" | "login">(null)

  const message =
    open === "signup"
      ? "Pour obtenir des identifiants de test, contactez Laurent Knauss via LinkedIn — créateur de l'application IA de sélection de CV."
      : "Accès restreint en démo. Contactez Laurent Knauss via LinkedIn pour obtenir des identifiants."

  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full bg-[#f5f4ef] border-b border-black/10">
      <div className="mx-auto flex items-center justify-between px-6 py-3">
        <a href="#" className="block" aria-label="Agent Recruteur">
          <Image
            src="/logo.png"
            alt="Agent Recruteur"
            width={210}
            height={210}
            priority
            className="w-[210px] h-[210px] object-contain"
          />
        </a>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setOpen("signup")}
            className="group relative inline-flex items-center overflow-hidden rounded-full bg-gradient-to-b from-[#E8601C] to-[#C94F10] px-6 py-2.5 text-sm font-bold text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-6px_rgba(232,96,28,0.6)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E8601C]/50"
            aria-label="Créer un compte (démo sur demande)"
          >
            <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            <span className="relative">Inscription</span>
          </button>
          <button
            type="button"
            onClick={() => setOpen("login")}
            className="group relative inline-flex items-center overflow-hidden rounded-full border border-[#4d4a2f]/40 bg-white px-5 py-2.5 text-sm font-semibold text-[#4d4a2f] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#4d4a2f]/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4d4a2f]/40"
            aria-label="Se connecter (accès restreint)"
          >
            <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-[#f5f4ef] to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            <span className="relative">Connexion</span>
          </button>
        </div>
      </div>

      {open && (
        <div aria-live="polite" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-lg border border-black/20 bg-white p-5 shadow-xl">
            <h2 className="mb-2 text-lg font-semibold text-black">
              {open === "signup" ? "Inscription" : "Connexion"}
            </h2>
            <p className="text-sm text-black/80">{message}</p>
            <div className="mt-4 flex justify-end gap-2">
              <a
                href="https://linkedin.com/in/laurentknauss"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-md bg-gradient-to-b from-[#E8601C] to-[#C94F10] px-3 py-2 text-sm font-medium text-white hover:-translate-y-0.5 transition-transform"
              >
                Contacter via LinkedIn
              </a>
              <button
                type="button"
                onClick={() => setOpen(null)}
                className="inline-flex items-center rounded-md border border-black/20 bg-white px-3 py-2 text-sm font-medium text-black hover:bg-black/5"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
