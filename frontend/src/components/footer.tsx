"use client"

export function Footer() {
  return (
    <footer className="relative border-t border-black/10 bg-[#f5f4ef]">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="flex flex-col items-center gap-4 text-center">
          {/* Brand */}
          <a href="#" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#5b5733]">
              <span className="text-sm font-bold text-[#f5f4ef]">CV</span>
            </div>
            <span className="font-semibold text-black">Agent Recruteur</span>
          </a>
          <p className="max-w-xl text-sm text-black/70">
            Assistant pour l&apos;élagage et l&apos;analyse préliminaire des candidatures.
          </p>

          {/* Bottom */}
          <div className="mt-8 w-full border-t border-black/10 pt-6">
            <p className="text-sm text-black/60">
              &copy; 2026 Agent Recruteur — Tous droits réservés.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
