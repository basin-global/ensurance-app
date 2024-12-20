'use client'

import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Group {
  og_name: string;
  contract_address?: string;
}

interface GroupSelectorProps {
  groups: Group[];
  currentGroup?: string;
  onGroupChange: (value: string) => void;
}

export function GroupSelector({ groups, currentGroup, onGroupChange }: GroupSelectorProps) {
  return (
    <Select onValueChange={onGroupChange} value={currentGroup}>
      <SelectTrigger className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-lg font-semibold text-gray-900 dark:text-white p-2 rounded-md w-full">
        <SelectValue placeholder="Choose Group" />
      </SelectTrigger>
      <SelectContent className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-lg">
        {groups.map((group) => (
          <SelectItem 
            key={group.contract_address || group.og_name} 
            value={group.og_name}
            className="text-lg font-semibold text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-300"
          >
            {group.og_name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

