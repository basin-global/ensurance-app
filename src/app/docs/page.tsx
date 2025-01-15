export default function DocsPage() {
  return (
    <div className="flex flex-col gap-12">
      <section id="quick-start" className="flex flex-col gap-6">
        <h2 className="text-xl font-mono opacity-50">quick start</h2>
        <p className="font-mono text-sm opacity-50">
          get started with ensurance in minutes:
        </p>
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-4">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 font-mono text-sm opacity-50">1</span>
            <p className="font-mono text-sm opacity-50">create your account and connect your wallet</p>
          </div>
          <div className="flex items-start gap-4">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 font-mono text-sm opacity-50">2</span>
            <p className="font-mono text-sm opacity-50">browse available insurance policies</p>
          </div>
          <div className="flex items-start gap-4">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 font-mono text-sm opacity-50">3</span>
            <p className="font-mono text-sm opacity-50">select and customize your coverage</p>
          </div>
        </div>
      </section>

      <section id="core-features" className="flex flex-col gap-6">
        <h2 className="text-xl font-mono opacity-50">core features</h2>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <div id="policy-management" className="flex flex-col gap-2">
            <h3 className="font-mono text-sm opacity-50">policy management</h3>
            <p className="font-mono text-sm opacity-50">create, manage, and optimize your insurance policies with our intuitive interface.</p>
          </div>
          <div id="smart-contract" className="flex flex-col gap-2">
            <h3 className="font-mono text-sm opacity-50">smart contract integration</h3>
            <p className="font-mono text-sm opacity-50">seamlessly interact with blockchain-based insurance contracts for transparent coverage.</p>
          </div>
          <div id="agent-network" className="flex flex-col gap-2">
            <h3 className="font-mono text-sm opacity-50">agent network</h3>
            <p className="font-mono text-sm opacity-50">connect with our network of verified insurance agents for personalized service.</p>
          </div>
        </div>
      </section>

      <section id="need-help" className="flex flex-col gap-6">
        <h2 className="text-xl font-mono opacity-50">need help?</h2>
        <div className="flex flex-wrap gap-4">
          <a href="#" className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 font-mono text-sm opacity-50 hover:bg-white/10">
            join discord
          </a>
          <a href="#" className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 font-mono text-sm opacity-50 hover:bg-white/10">
            follow on twitter
          </a>
          <a href="#" className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 font-mono text-sm opacity-50 hover:bg-white/10">
            contact support
          </a>
        </div>
      </section>
    </div>
  )
} 