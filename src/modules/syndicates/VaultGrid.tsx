'use client'

import { Card, CardContent } from "@/components/ui/card"
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Info } from 'lucide-react'

interface Vault {
  id: string
  name: string
  targetYield: number
  actualYield: number
  impact: string
  impactTags: string[]
  deposits: number
  currency: string
  description?: string
}

interface VaultGridProps {
  vaults: Vault[]
}

export default function VaultGrid({ vaults }: VaultGridProps) {
  // Helper function to format currency values
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  // Helper function to format yield percentages
  const formatYield = (value: number) => {
    return `${value.toFixed(2)}%`
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
      {vaults.map((vault) => (
        <Card 
          key={vault.id} 
          className="bg-background border-white/[0.05] hover:border-white/[0.1] transition-colors duration-300"
        >
          <CardContent className="p-6 space-y-6">
            {/* Coming Soon Badge */}
            <div className="flex justify-end">
              <span className="px-2 py-0.5 text-[10px] font-medium bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/20">
                Coming Soon
              </span>
            </div>

            {/* Vault Name and Impact */}
            <div>
              <h3 className="text-xl font-light mb-2">{vault.name}</h3>
              <div className="text-sm text-gray-400">{vault.impact}</div>
            </div>
            
            {/* Impact Tags */}
            <div className="flex flex-wrap gap-2">
              {vault.impactTags.map((tag, index) => (
                <span 
                  key={index}
                  className="px-2 py-1 text-[10px] font-medium bg-white/[0.03] text-gray-400 rounded-full border border-white/[0.05]"
                >
                  {tag}
                </span>
              ))}
            </div>
            
            {/* Yields Section */}
            <div className="space-y-3 py-4 border-y border-white/[0.05]">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">Target Yield</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3.5 w-3.5 text-gray-500" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Expected annual yield for this syndicate</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <span className="font-mono text-sm">{formatYield(vault.targetYield)}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">Current Yield</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3.5 w-3.5 text-gray-500" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Current realized annual yield</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <span className="font-mono text-sm">{formatYield(vault.actualYield)}</span>
              </div>
            </div>

            {/* TVL */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Total Value</span>
              <div className="text-right">
                <div className="font-mono text-sm">{formatCurrency(vault.deposits)}</div>
                <div className="text-xs text-gray-500 mt-0.5">{vault.currency}</div>
              </div>
            </div>

            {/* Description (if available) */}
            {vault.description && (
              <div className="text-xs text-gray-400 leading-relaxed">
                {vault.description}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
} 