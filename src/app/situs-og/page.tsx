import { SitusOGMinter } from '@/modules/situs-og/components/SitusOGMinter'
import { AllowlistAdmin } from '@/modules/situs-og/components/AllowlistAdmin'

export default function SitusOGPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">SITUS OG Allowlist Minter</h1>
          <p className="text-xl text-muted-foreground">
            Mint SITUS OG domains with allowlist protection
          </p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Minter */}
          <div>
            <SitusOGMinter />
          </div>

          {/* Admin */}
          <div>
            <AllowlistAdmin />
          </div>
        </div>

        {/* Info */}
        <div className="bg-muted p-6 rounded-lg">
          <h2 className="text-2xl font-semibold mb-4">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="font-semibold mb-2">1. Allowlist Setup</h3>
              <p className="text-sm text-muted-foreground">
                Contract owner adds addresses to the allowlist using the admin panel.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">2. Domain Minting</h3>
              <p className="text-sm text-muted-foreground">
                Allowlisted addresses can mint one domain each by providing a domain name.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">3. Protection</h3>
              <p className="text-sm text-muted-foreground">
                Each address can only mint once, preventing abuse and ensuring fair distribution.
              </p>
            </div>
          </div>
        </div>

        {/* Contract Info */}
        <div className="bg-muted p-6 rounded-lg">
          <h2 className="text-2xl font-semibold mb-4">Contract Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong>SITUS OG Contract:</strong>
              <p className="text-muted-foreground font-mono break-all">
                0x... (Update with actual address)
              </p>
            </div>
            <div>
              <strong>Allowlist Contract:</strong>
              <p className="text-muted-foreground font-mono break-all">
                0x... (Update with deployed address)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}