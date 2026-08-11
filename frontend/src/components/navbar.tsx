import Image from "next/image"

export function Navbar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full bg-[#f5f4ef] border-b border-black/10">
      <div className="flex items-center px-6 py-3">
        <a href="#" className="block" aria-label="Agent Recruteur">
          <Image
            src="/logo.png"
            alt="Agent Recruteur"
            width={160}
            height={160}
            priority
            className="w-40 h-40 object-contain"
          />
        </a>
      </div>
    </header>
  )
}
