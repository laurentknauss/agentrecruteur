"use client"

import { useState } from "react"
import Image from "next/image"

export function Navbar() {
  const [open, setOpen] = useState<null | "signup" | "login">(null)

  const message =
    open === "signup"
      ? "Contactez Laurent Knauss, le créateur du site, afin d'avoir des identifiants pour tester cette application IA de sélection de CV."
      : "Accès restreint. Contactez Laurent Knauss pour obtenir des identifiants de démo."

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
            className="group relative inline-flex items-center overflow-hidden rounded-full border border-[#4d4a2f]/30 bg-white px-5 py-2.5 text-sm font-semibold text-[#4d4a2f] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#4d4a2f]/60 hover:shadow-[0_8px_24px_-6px_rgba(77,74,47,0.45)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4d4a2f]/40"
            aria-label="Créer un compte (démo sur demande)"
          >
            <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-[#f5f4ef] to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            <span className="relative">Inscription</span>
          </button>
          <button
            type="button"
            onClick={() => setOpen("login")}
            className="group relative inline-flex items-center overflow-hidden rounded-full bg-gradient-to-b from-[#5b5733] to-[#3f3c26] px-5 py-2.5 text-sm font-semibold text-[#f5f4ef] shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_28px_-6px_rgba(77,74,47,0.65)] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            aria-label="Se connecter (accès restreint)"
          >
            <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
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
                href="mailto:laurentknauss@protonmail.com?subject=Accès%20démo%20Agent%20Recruteur"
                className="inline-flex items-center rounded-md border border-black/20 bg-white px-3 py-2 text-sm font-medium text-black hover:bg-black/5"
              >
                Contacter Laurent
              </a>
              <button
                type="button"
                onClick={() => setOpen(null)}
                className="inline-flex items-center rounded-md bg-[#111] px-3 py-2 text-sm font-medium text-white hover:bg-black"
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
