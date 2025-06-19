import type { Operation } from '../types'

interface TooltipEntry {
  default: string
  variants?: Record<string, string>
}

type TooltipConfig = Record<Operation, TooltipEntry>

const TOOLTIP_CONFIG: TooltipConfig = {
  buy: {
    default: 'buy'
  },
  swap: {
    default: 'swap'
  },
  send: {
    default: 'send'
  },
  burn: {
    default: 'burn'
  }
}

/**
 * Get tooltip text for an operation
 * @param operation - The operation type
 * @param variant - Optional variant for custom tooltip text
 * @returns The tooltip text
 */
export const getTooltipText = (operation: Operation, variant?: string): string => {
  const config = TOOLTIP_CONFIG[operation]
  
  if (variant && config.variants && config.variants[variant]) {
    return config.variants[variant]
  }
  
  return config.default
}

/**
 * Update tooltip for a specific operation and variant
 * @param operation - The operation type
 * @param text - The new tooltip text
 * @param variant - Optional variant name, defaults to 'default'
 */
export const updateTooltip = (operation: Operation, text: string, variant: string = 'default'): void => {
  if (variant === 'default') {
    TOOLTIP_CONFIG[operation].default = text
  } else {
    if (!TOOLTIP_CONFIG[operation].variants) {
      TOOLTIP_CONFIG[operation].variants = {}
    }
    TOOLTIP_CONFIG[operation].variants![variant] = text
  }
}

/**
 * Add a new tooltip variant
 * @param operation - The operation type
 * @param variant - The variant name
 * @param text - The tooltip text
 */
export const addTooltipVariant = (operation: Operation, variant: string, text: string): void => {
  updateTooltip(operation, text, variant)
}

// Example usage:
// To add a context-specific variant:
// addTooltipVariant('buy', 'erc1155', 'ensure')
// addTooltipVariant('buy', 'general', 'acquire')
// 
// To use a variant:
// getTooltipText('buy', 'erc1155') // returns 'ensure'
// getTooltipText('buy') // returns 'buy' (default) 