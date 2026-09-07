import { SmoothScroll } from "@/components/smooth-scroll"
import { Navbar } from "@/components/navbar"
import { Hero } from "@/components/hero"
import { HowItWorks } from "@/components/how-it-works"
import { Footer } from "@/components/footer"
import CandidateQAContainer from "@/components/CandidateQAContainer"

export default function Home() {
  return (
    <SmoothScroll>
      <main className="min-h-screen bg-transparent">
        <Navbar />
        <Hero />
        <section id="upload" className="relative scroll-mt-24 bg-[#f5f4ef]">
          <CandidateQAContainer />
        </section>
        <HowItWorks />
        <Footer />
      </main>
    </SmoothScroll>
  )
}
