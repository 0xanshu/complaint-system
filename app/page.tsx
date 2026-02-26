export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] noise">
      {/* Warning Banner */}
      <div className="border-b border-[#333] bg-[#0a0a0a]">
        <div className="flex overflow-hidden py-2">
          <div className="marquee flex whitespace-nowrap font-mono-data text-xs text-[#ff3333]">
            <span className="mx-4">⚠ SECURE CONNECTION ESTABLISHED</span>
            <span className="mx-4">(// ANONYMITY PROTOCOL ACTIVE)</span>
            <span className="mx-4">⚠ NO IP LOGGING</span>
            <span className="mx-4">(// END-TO-END ENCRYPTION)</span>
            <span className="mx-4">⚠ SECURE CONNECTION ESTABLISHED</span>
            <span className="mx-4">(// ANONYMITY PROTOCOL ACTIVE)</span>
            <span className="mx-4">⚠ NO IP LOGGING</span>
            <span className="mx-4">(// END-TO-END ENCRYPTION)</span>
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="border-b border-[#333] px-6 py-6 md:px-12">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-4">
            <h1 className="font-display text-2xl md:text-3xl tracking-tighter">
              WHISTLE<span className="text-[#ff3333] blink">_</span>
            </h1>
            <span className="font-mono-data hidden text-xs text-[#666] md:inline">
              v2.4.1 // BUILD 8921
            </span>
          </div>
          <div className="flex items-center gap-6">
            <span className="font-mono-data text-xs text-[#ffcc00]">
              ● ENCRYPTED
            </span>
            <button className="border border-[#333] bg-[#111] px-4 py-2 font-mono-data text-xs uppercase transition-colors hover:border-[#ff3333] hover:text-[#ff3333]">
              Access Portal
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="grid-bg relative border-b border-[#333]">
        <div className="px-6 py-20 md:px-12 md:py-32">
          <div className="max-w-6xl">
            <h2 className="font-display mb-8 text-5xl leading-[0.9] md:text-7xl lg:text-8xl">
              SPEAK
              <br />
              <span className="text-[#888]">FREELY</span>
              <br />
              <span className="text-[#ff3333]">ANONYMOUSLY</span>
            </h2>

            <p className="max-w-xl font-mono-data text-sm leading-relaxed text-[#888] md:text-base">
              A secure, encrypted platform for reporting misconduct without fear
              of retaliation. Your identity remains protected. Your voice is
              amplified.
            </p>

            <div className="mt-12 flex flex-wrap gap-4">
              <button className="group relative overflow-hidden border-2 border-[#ff3333] bg-[#ff3333] px-8 py-4 font-display text-sm uppercase transition-all hover:bg-transparent">
                <span className="relative z-10 group-hover:text-[#ff3333]">
                  File Report
                </span>
              </button>
              <button className="border border-[#333] px-8 py-4 font-display text-sm uppercase text-[#888] transition-all hover:border-[#fff] hover:text-white">
                Learn More
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-b border-[#333] px-6 py-20 md:px-12">
        <div className="mb-12 flex items-center gap-4">
          <span className="font-mono-data text-xs text-[#666]">01</span>
          <h3 className="font-display text-2xl">CORE_FEATURES</h3>
          <div className="h-px flex-1 bg-[#333]"></div>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              id: "001",
              title: "ENCRYPTED",
              desc: "Military-grade encryption for all submissions",
            },
            {
              id: "002",
              title: "NO TRACE",
              desc: "Zero metadata collection or IP logging",
            },
            {
              id: "003",
              title: "TRACKABLE",
              desc: "Anonymous case tracking with secure codes",
            },
            {
              id: "004",
              title: "PROTECTED",
              desc: "Legal shield for whistleblowers",
            },
          ].map((feature) => (
            <div
              key={feature.id}
              className="group border border-[#222] p-6 transition-all hover:border-[#444]"
            >
              <div className="font-mono-data mb-4 text-xs text-[#444]">
                {feature.id}
              </div>
              <h4 className="font-display mb-3 text-lg group-hover:text-[#ffcc00]">
                {feature.title}
              </h4>
              <p className="font-mono-data text-xs leading-relaxed text-[#666]">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="border-b border-[#333] px-6 py-20 md:px-12">
        <div className="mb-12 flex items-center gap-4">
          <span className="font-mono-data text-xs text-[#666]">02</span>
          <h3 className="font-display text-2xl">PROCESS_FLOW</h3>
          <div className="h-px flex-1 bg-[#333]"></div>
        </div>

        <div className="space-y-0">
          {[
            {
              step: "01",
              title: "SUBMIT",
              desc: "File your complaint through our secure portal",
            },
            {
              step: "02",
              title: "ENCRYPT",
              desc: "Data is encrypted and anonymized instantly",
            },
            {
              step: "03",
              title: "ROUTE",
              desc: "Routed to appropriate oversight body",
            },
            {
              step: "04",
              title: "RESOLVE",
              desc: "Track progress with your anonymous ID",
            },
          ].map((item, i) => (
            <div
              key={item.step}
              className="flex items-start gap-6 border-b border-[#222] py-8 first:border-t"
            >
              <span className="font-display text-4xl text-[#333]">
                {item.step}
              </span>
              <div className="flex-1">
                <h4 className="font-display mb-2 text-xl">{item.title}</h4>
                <p className="font-mono-data text-sm text-[#666]">
                  {item.desc}
                </p>
              </div>
              <div className="hidden text-right md:block">
                <span className="font-mono-data text-xs text-[#444]">
                  PHASE_{item.step}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="scanline relative px-6 py-24 md:px-12 md:py-32">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 font-mono-data text-xs text-[#ff3333]">
            [ WARNING: SYSTEM SECURE ]
          </div>
          <h3 className="font-display mb-6 text-4xl md:text-6xl">
            YOUR VOICE MATTERS
          </h3>
          <p className="mb-10 font-mono-data text-sm text-[#888] md:text-base">
            Join thousands who have spoken up without fear. Your anonymity is
            guaranteed.
          </p>
          <button className="glitch group relative inline-flex items-center gap-4 border-2 border-[#ff3333] bg-[#ff3333] px-10 py-5 font-display text-lg uppercase transition-all hover:bg-transparent">
            <span className="relative z-10 group-hover:text-[#ff3333]">
              Initialize Report
            </span>
            <span className="font-mono-data text-sm group-hover:text-[#ff3333]">
              →
            </span>
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#333] bg-[#0a0a0a] px-6 py-12 md:px-12">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="font-mono-data text-xs text-[#444]">
            WHISTLE_SYSTEM // EST. 2021 // SECURE_CHANNEL
          </div>
          <div className="flex gap-6">
            <a
              href="#"
              className="font-mono-data text-xs text-[#666] hover:text-white"
            >
              PRIVACY
            </a>
            <a
              href="#"
              className="font-mono-data text-xs text-[#666] hover:text-white"
            >
              SECURITY
            </a>
            <a
              href="#"
              className="font-mono-data text-xs text-[#666] hover:text-white"
            >
              CONTACT
            </a>
          </div>
        </div>
        <div className="mt-8 text-center font-mono-data text-[10px] text-[#333]">
          THIS_SYSTEM_IS_PROTECTED_UNDER_WHISTLEBLOWER_PROTECTION_ACT
        </div>
      </footer>
    </div>
  );
}
