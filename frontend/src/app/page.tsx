import { SmoothScroll } from "@/components/smooth-scroll"
import { Navbar } from "@/components/navbar"
import { Hero } from "@/components/hero"
import { HowItWorks } from "@/components/how-it-works"
import { Footer } from "@/components/footer"
import CandidateQAContainer from "@/components/CandidateQAContainer"
import { isAppPublic } from "@/server/auth/guard"

// L'état d'accès est lu à chaque requête : ouvrir/fermer l'application se fait
// côté serveur (APP_PUBLIC) sans reconstruire le bundle.
export const dynamic = "force-dynamic"

export default function Home() {
  return (
    <SmoothScroll>
      <main className="min-h-screen bg-transparent">
        <Navbar />
        <Hero />
        <section id="upload" className="relative scroll-mt-24 bg-[#f5f4ef]">
          <CandidateQAContainer locked={!isAppPublic()} />
        </section>
        <HowItWorks />
        <Footer />
      </main>
    </SmoothScroll>
  )
}
