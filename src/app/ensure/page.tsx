'use client'

export default function EnsurePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">Markets for What Matters</h1>
      <p className="text-lg text-gray-600">
        Coming soon: A unified interface for discovering all natural capital opportunities.
      </p>
      <div className="mt-8 p-6 bg-gray-50 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">What to Expect</h2>
        <ul className="list-disc list-inside space-y-2 text-gray-700">
          <li>Search by what matters (water, soil, air)</li>
          <li>Discover natural capital opportunities</li>
          <li>Unified view of all market types</li>
          <li>Simplified user experience</li>
        </ul>
      </div>
    </div>
  )
}