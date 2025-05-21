'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import ExposureSankey from '@/modules/exposure/ExposureSankey'

// Test data - this will be replaced with data from your database
const testData = [
  { source: 'Food & Agriculture', target: 'Raw Materials', value: 3 },
  { source: 'Food & Agriculture', target: 'Food', value: 3 },
  { source: 'Food & Agriculture', target: 'Energy', value: 2 },
  { source: 'Food & Agriculture', target: 'Water Abundance', value: 3 },
  { source: 'Food & Agriculture', target: 'Healthy Soils', value: 3 },
  { source: 'Food & Agriculture', target: 'Medicinal & Genetic', value: 3 },
  { source: 'Food & Agriculture', target: 'Climate Stability', value: 3 },
  { source: 'Food & Agriculture', target: 'Clean Air', value: 2 },
  { source: 'Food & Agriculture', target: 'Clean Water', value: 3 },
  { source: 'Food & Agriculture', target: 'Risk Resilience', value: 3 },
  { source: 'Food & Agriculture', target: 'Pollination', value: 3 },
  { source: 'Food & Agriculture', target: 'Erosion Control', value: 3 },
  { source: 'Food & Agriculture', target: 'Pest & Disease Control', value: 3 },
  { source: 'Food & Agriculture', target: 'Habitat', value: 2 },
  { source: 'Food & Agriculture', target: 'Recreation & Experiences', value: 3 },
  { source: 'Food & Agriculture', target: 'Research & Learning', value: 3 },
  { source: 'Food & Agriculture', target: 'Aesthetic & Sensory', value: 3 },
  { source: 'Food & Agriculture', target: 'Art & Inspiration', value: 3 },
  { source: 'Food & Agriculture', target: 'Existence & Legacy', value: 3 },
  { source: 'Raw Materials', target: 'Tropical Forest', value: 3 },
  { source: 'Food', target: 'Tropical Forest', value: 3 },
  { source: 'Energy', target: 'Tropical Forest', value: 3 },
  { source: 'Water Abundance', target: 'Tropical Forest', value: 3 },
  { source: 'Healthy Soils', target: 'Tropical Forest', value: 3 },
  { source: 'Medicinal & Genetic', target: 'Tropical Forest', value: 3 },
  { source: 'Climate Stability', target: 'Tropical Forest', value: 3 },
  { source: 'Clean Air', target: 'Tropical Forest', value: 3 },
  { source: 'Clean Water', target: 'Tropical Forest', value: 3 },
  { source: 'Risk Resilience', target: 'Tropical Forest', value: 3 },
  { source: 'Pollination', target: 'Tropical Forest', value: 3 },
  { source: 'Erosion Control', target: 'Tropical Forest', value: 3 },
  { source: 'Pest & Disease Control', target: 'Tropical Forest', value: 3 },
  { source: 'Habitat', target: 'Tropical Forest', value: 3 },
  { source: 'Recreation & Experiences', target: 'Tropical Forest', value: 3 },
  { source: 'Research & Learning', target: 'Tropical Forest', value: 3 },
  { source: 'Aesthetic & Sensory', target: 'Tropical Forest', value: 3 },
  { source: 'Art & Inspiration', target: 'Tropical Forest', value: 3 },
  { source: 'Existence & Legacy', target: 'Tropical Forest', value: 3 },
  { source: 'Raw Materials', target: 'Temperate Forest', value: 3 },
  { source: 'Food', target: 'Temperate Forest', value: 2 },
  { source: 'Energy', target: 'Temperate Forest', value: 2 },
  { source: 'Water Abundance', target: 'Temperate Forest', value: 3 },
  { source: 'Healthy Soils', target: 'Temperate Forest', value: 3 },
  { source: 'Medicinal & Genetic', target: 'Temperate Forest', value: 3 },
  { source: 'Climate Stability', target: 'Temperate Forest', value: 3 },
  { source: 'Clean Air', target: 'Temperate Forest', value: 3 },
  { source: 'Clean Water', target: 'Temperate Forest', value: 3 },
  { source: 'Risk Resilience', target: 'Temperate Forest', value: 3 },
  { source: 'Pollination', target: 'Temperate Forest', value: 3 },
  { source: 'Erosion Control', target: 'Temperate Forest', value: 3 },
  { source: 'Pest & Disease Control', target: 'Temperate Forest', value: 2 },
  { source: 'Habitat', target: 'Temperate Forest', value: 3 },
  { source: 'Recreation & Experiences', target: 'Temperate Forest', value: 3 },
  { source: 'Research & Learning', target: 'Temperate Forest', value: 3 },
  { source: 'Aesthetic & Sensory', target: 'Temperate Forest', value: 3 },
  { source: 'Art & Inspiration', target: 'Temperate Forest', value: 3 },
  { source: 'Existence & Legacy', target: 'Temperate Forest', value: 3 },
  { source: 'Energy & Power', target: 'Raw Materials', value: 2 },
  { source: 'Energy & Power', target: 'Food', value: 1 },
  { source: 'Energy & Power', target: 'Energy', value: 3 },
  { source: 'Energy & Power', target: 'Water Abundance', value: 3 },
  { source: 'Energy & Power', target: 'Healthy Soils', value: 2 },
  { source: 'Energy & Power', target: 'Medicinal & Genetic', value: 1 },
  { source: 'Energy & Power', target: 'Climate Stability', value: 3 },
  { source: 'Energy & Power', target: 'Clean Air', value: 1 },
  { source: 'Energy & Power', target: 'Clean Water', value: 3 },
  { source: 'Energy & Power', target: 'Risk Resilience', value: 3 },
  { source: 'Energy & Power', target: 'Pollination', value: 1 },
  { source: 'Energy & Power', target: 'Erosion Control', value: 3 },
  { source: 'Energy & Power', target: 'Pest & Disease Control', value: 1 },
  { source: 'Energy & Power', target: 'Habitat', value: 2 },
  { source: 'Energy & Power', target: 'Recreation & Experiences', value: 2 },
  { source: 'Energy & Power', target: 'Research & Learning', value: 3 },
  { source: 'Energy & Power', target: 'Aesthetic & Sensory', value: 1 },
  { source: 'Energy & Power', target: 'Art & Inspiration', value: 1 },
  { source: 'Energy & Power', target: 'Existence & Legacy', value: 3 }
];

export default function ExposurePage() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="min-h-screen flex flex-col">
      <div className="container mx-auto px-4 py-8 flex-1">
        <div className="space-y-8">
          <PageHeader
            title="exposure"
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            searchPlaceholder="search exposure..."
            showSearch={true}
          />
          <div className="flex flex-col items-center justify-start text-center space-y-2 mb-8">
            <p className="text-lg font-medium">explore how industries connect to ecosystem services and natural capital</p>
          </div>
          <div className="w-full h-[800px] bg-primary-dark rounded-xl p-4">
            <ExposureSankey data={testData} />
          </div>
        </div>
      </div>
    </div>
  );
} 