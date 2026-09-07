import { SmoothScroll } from "@/components/smooth-scroll"
import { Navbar } from "@/components/navbar"
import { Hero } from "@/components/hero"
import { HowItWorks } from "@/components/how-it-works"
import { Footer } from "@/components/footer"
import CandidateQAContainer from "@/components/CandidateQAContainer"

export default function Home() {
  const isDev = process.env.NODE_ENV === "development"

  return (
    <SmoothScroll>
      {isDev && (
        <style
          dangerouslySetInnerHTML={{
            __html: `
[data-devbox]{outline:2px dashed #ff2b2b;outline-offset:2px}
[data-devbox]::after{content:attr(data-devbox);position:absolute;top:0;left:0;background:#e11d48;color:#fff;font:700 11px/1.3 ui-monospace,Menlo,Consolas,monospace;padding:2px 6px;border-radius:0 0 6px 0;z-index:2147483000;pointer-events:none;letter-spacing:.04em;max-width:90%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
[data-devbox="navbar"]::after{left:auto;right:0;border-radius:0 0 0 6px}
[data-devbox="hero"]::after{top:15rem}
`,
          }}
        />
      )}
      <main className="min-h-screen bg-transparent">
        <Navbar />
        <Hero />
        <section id="upload" className="relative scroll-mt-24 bg-[#f5f4ef]" data-devbox="section-upload">
          <CandidateQAContainer />
        </section>
        <HowItWorks />
        <Footer />
      </main>
    </SmoothScroll>
  )
}
