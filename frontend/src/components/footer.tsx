"use client"

import { motion, useInView } from "motion/react"
import { useRef } from "react"

const footerLinks: Record<string, { label: string; href: string }[]> = {
  Product: [
    { label: "Analyser un CV", href: "#upload" },
    { label: "Candidats", href: "#" },
    { label: "API MCP", href: "#" },
  ],
  Resources: [
    { label: "Guide", href: "#" },
    { label: "FAQ", href: "#" },
    { label: "Blog", href: "#" },
  ],
  Company: [
    { label: "À propos", href: "#" },
    { label: "Contact", href: "#" },
  ],
  Legal: [
    { label: "Mentions légales", href: "#" },
    { label: "Confidentialité", href: "#" },
  ],
}

export function Footer() {
  const ref = useRef<HTMLElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-50px" })

  return (
    <footer ref={ref} className="border-t border-slate-700 bg-transparent">
      <div className="max-w-6xl mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-2 md:grid-cols-5 gap-8"
        >
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <a href="#" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
                <span className="text-zinc-950 font-bold text-sm">CV</span>
              </div>
              <span className="font-semibold text-white">Agent Recruteur</span>
            </a>
            <p className="text-sm text-zinc-500 mb-4">
              Assistant pour l&apos;élagage et l&apos;analyse préliminaire des candidatures.
            </p>
            {/* System Status */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 pulse-glow" />
              <span className="text-xs text-zinc-400">Backend opérationnel</span>
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="text-sm font-semibold text-white mb-4">{title}</h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <a href={link.href} className="text-sm text-zinc-500 hover:text-white transition-colors">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </motion.div>

        {/* Bottom */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-16 pt-8 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4"
        >
          <p className="text-sm text-zinc-500">&copy; 2026 Agent Recruteur — Tous droits réservés.</p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-sm text-zinc-500 hover:text-white transition-colors">
              X
            </a>
            <a href="#" className="text-sm text-zinc-500 hover:text-white transition-colors">
              GitHub
            </a>
            <a href="#" className="text-sm text-zinc-500 hover:text-white transition-colors">
              LinkedIn
            </a>
          </div>
        </motion.div>
      </div>
    </footer>
  )
}
