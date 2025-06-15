import { CONTRACTS } from '../specific/config'

// Map of node names to specific asset token IDs
export const NODE_TO_ASSET_MAP: Record<string, number | null> = {
  // Stocks (layer 2)
  'Rivers & Lakes': null,
  'Tropical Forest': null,
  'Temperate Forest': null,
  'Boreal Forest': null,
  'Coastal Systems': null,
  'Inland Wetlands': null,
  'Cultivated & Developed': null,
  'Urban Open Space': null,
  'Rural Open Space': null,
  'Marine Systems': null,
  'Grasslands': null,
  'Shrublands': null,
  'Polar & Alpine': null,
  'Desert': null,
  'Subterranean': null,

  // Flows (layer 1)
  'Raw Materials': null,
  'Food': null,
  'Energy': null,
  'Water Abundance': null,
  'Healthy Soils': null,
  'Medicinal & Genetic': null,
  'Climate Stability': null,
  'Clean Air': null,
  'Clean Water': null,
  'Risk Resilience': null,
  'Pollination': null,
  'Erosion Control': null,
  'Pest & Disease Control': null,
  'Habitat': null,
  'Recreation & Experiences': null,
  'Research & Learning': null,
  'Aesthetic & Sensory': null,
  'Art & Inspiration': null,
  'Existence & Legacy': null,

  // Sectors (layer 0)
  'Food & Agriculture': null,
  'Energy & Power': 13,  // Only this one has an asset ID
  'Manufacturing & Materials': null,
  'Infrastructure & Construction': null,
  'Finance & Insurance': null,
  'Retail': null,
  'Transportation & Logistics': null
}

// Helper function to get asset ID for a node
export function getAssetIdForNode(nodeName: string): number | null {
  return NODE_TO_ASSET_MAP[nodeName] ?? null
}

// Helper function to check if a node has an associated asset
export function hasAsset(nodeName: string): boolean {
  return NODE_TO_ASSET_MAP[nodeName] !== null
} 