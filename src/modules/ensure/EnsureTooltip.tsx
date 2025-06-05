'use client'

import * as React from "react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface EnsureTooltipProps {
  children: React.ReactNode
  content: string | { name: string; label: string }
  className?: string
}

export function EnsureTooltip({ children, content, className }: EnsureTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent 
          className={cn(
            "bg-black/90 backdrop-blur-sm border border-white/10",
            "text-white/90 text-sm font-medium",
            "px-3 py-2",
            "z-50",
            className
          )}
        >
          {typeof content === 'string' ? content : (
            <div className="text-center">
              <div>{content.name}</div>
              <div className="text-xs text-gray-400 mt-1">{content.label}</div>
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
} 