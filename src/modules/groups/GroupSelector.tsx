'use client'

import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useOG } from '@/contexts/og-context'

export function AdminOGSelector() {
  const { currentOG, setCurrentOG, OGs } = useOG()

  const handleOGChange = (value: string) => {
    const selectedOG = OGs.find(og => og.og_name === value);
    if (selectedOG) {
      setCurrentOG(selectedOG)
    }
  }

  return (
    <Select onValueChange={handleOGChange} value={currentOG?.og_name || undefined}>
      <SelectTrigger className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-lg font-semibold text-gray-900 dark:text-white p-2 rounded-md w-full">
        <SelectValue placeholder="Choose OG" />
      </SelectTrigger>
      <SelectContent className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-lg">
        {OGs.map((og) => (
          <SelectItem 
            key={og.contract_address || og.og_name} 
            value={og.og_name}
            className="text-lg font-semibold text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-300"
          >
            {og.og_name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

