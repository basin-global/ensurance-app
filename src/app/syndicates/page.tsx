'use client'

import VaultGrid from '@/modules/syndicates/VaultGrid'

// Example vault data
const exampleVaults = [
  {
    id: '1',
    name: 'West Texas Aquifer Recharge',
    targetYield: 8.5,
    actualYield: 7.8,
    impact: 'Water Conservation',
    impactTags: ['Water Security', 'Drought Resilience', 'Groundwater'],
    deposits: 2500000,
    currency: 'USDC',
    description: 'Supporting aquifer recharge projects in West Texas to ensure sustainable water resources.'
  },
  {
    id: '2',
    name: 'High Colorado Beaver Habitat',
    targetYield: 6.2,
    actualYield: 6.5,
    impact: 'Wildlife Conservation',
    impactTags: ['Biodiversity', 'Water Storage', 'Ecosystem Services'],
    deposits: 1800000,
    currency: 'DAI',
    description: 'Restoring and protecting beaver habitats in the High Colorado region.'
  },
  {
    id: '3',
    name: 'Chihuahuan Biocrust',
    targetYield: 7.0,
    actualYield: 7.2,
    impact: 'Soil Health',
    impactTags: ['Erosion Control', 'Carbon Storage', 'Desert Ecosystems'],
    deposits: 1200000,
    currency: 'ENSURE',
    description: 'Preserving and regenerating biological soil crusts in the Chihuahuan Desert.'
  },
  {
    id: '4',
    name: 'Urban Heat Reduction',
    targetYield: 9.0,
    actualYield: 8.7,
    impact: 'Climate Resilience',
    impactTags: ['Urban Resilience', 'Public Health', 'Energy Efficiency'],
    deposits: 3500000,
    currency: 'ETH',
    description: 'Implementing urban greening projects to reduce heat island effects in cities.'
  },
  {
    id: '5',
    name: 'Prairie Pothole Restoration',
    targetYield: 7.5,
    actualYield: 7.3,
    impact: 'Wetland Conservation',
    impactTags: ['Bird Habitat', 'Flood Control', 'Water Quality'],
    deposits: 2100000,
    currency: 'USDGLO',
    description: 'Restoring prairie pothole wetlands to support migratory birds and local ecosystems.'
  },
  {
    id: '6',
    name: 'Native Pollinators',
    targetYield: 8.0,
    actualYield: 8.2,
    impact: 'Biodiversity',
    impactTags: ['Food Security', 'Agriculture', 'Species Recovery'],
    deposits: 1500000,
    currency: 'USDC',
    description: 'Supporting native pollinator populations through habitat creation and protection.'
  },
  {
    id: '7',
    name: 'Coastal Flood Buffer',
    targetYield: 8.8,
    actualYield: 8.5,
    impact: 'Coastal Resilience',
    impactTags: ['Storm Protection', 'Erosion Control', 'Blue Carbon'],
    deposits: 4200000,
    currency: 'DAI',
    description: 'Developing natural flood buffers through coastal ecosystem restoration.'
  },
  {
    id: '8',
    name: 'Gulf Coast Mangroves',
    targetYield: 7.8,
    actualYield: 7.9,
    impact: 'Carbon Sequestration',
    impactTags: ['Blue Carbon', 'Storm Protection', 'Fish Habitat', 'Coastal Protection'],
    deposits: 2800000,
    currency: 'ENSURE',
    description: 'Protecting and expanding mangrove forests along the Gulf Coast.'
  }
]

export default function SyndicatesPage() {
  return (
    <div className="max-w-[1200px] mx-auto px-[30px] py-16">
      <div className="mb-16 space-y-4">
        <div className="flex items-center gap-4 mb-2">
          <h1 className="text-4xl font-light">Ensurance Syndicates</h1>
          <span className="px-3 py-1 text-xs font-medium bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/20">
            Coming Soon
          </span>
        </div>
        <div className="max-w-2xl space-y-4 text-gray-400">
          <p>
            Join these syndicates ensuring the stocks and flows of natural capital to reduce risk and increase resilience.
          </p>
          <p className="text-sm">
            Each syndicate is independently managed with its own risk profile and strategy, backed by real natural capital assets. Returns are generated through a combination of yield farming, revenue sharing, and impact-driven value appreciation of the underlying natural assets.
          </p>
        </div>
      </div>
      <VaultGrid vaults={exampleVaults} />
    </div>
  )
} 