import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'

interface DocSearchResult {
  name: string
  path: string
  type: 'doc'
  doc_section: string
  subsection?: string
}

const docsDirectory = join(process.cwd(), 'src/app/docs')

// Helper function to extract headers and their content from MDX
function extractHeaders(content: string) {
  const lines = content.split('\n')
  const headers: { title: string; anchor: string; content: string[] }[] = []
  let currentHeader: { title: string; anchor: string; content: string[] } | null = null

  lines.forEach((line) => {
    // Match headers (# Header, ## Header, ### Header)
    const headerMatch = line.match(/^(#{1,3})\s+(.+)$/)
    if (headerMatch) {
      if (currentHeader) {
        headers.push(currentHeader)
      }
      const title = headerMatch[2]
      // Create URL-friendly anchor
      const anchor = title.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
      currentHeader = { title, anchor, content: [] }
    } else if (currentHeader) {
      currentHeader.content.push(line)
    }
  })

  if (currentHeader) {
    headers.push(currentHeader)
  }

  return headers
}

export function searchDocs(query: string): DocSearchResult[] {
  const results: DocSearchResult[] = []
  const sections = ['tldr', 'fundamentals', 'natural-capital', 'ensurance', 'protocol', 'technical', 'faq']
  
  const searchQuery = query.toLowerCase()

  sections.forEach(section => {
    try {
      const filePath = join(docsDirectory, section, 'page.mdx')
      const content = readFileSync(filePath, 'utf8')
      const headers = extractHeaders(content)
      
      // Get page title (first h1)
      const pageTitle = headers.find(h => h.title)?.title || section

      // Search in each section first
      const sectionMatches: DocSearchResult[] = []
      headers.forEach(header => {
        const sectionContent = [header.title, ...header.content].join(' ')
        if (sectionContent.toLowerCase().includes(searchQuery)) {
          sectionMatches.push({
            name: header.title,
            path: `/docs/${section}#${header.anchor}`,
            type: 'doc',
            doc_section: section.toUpperCase().replace('-', ' '),
            subsection: pageTitle
          })
        }
      })

      // If we found section matches, add them
      if (sectionMatches.length > 0) {
        results.push(...sectionMatches)
      } 
      // If no section matches but content includes query, add the page result
      else if (content.toLowerCase().includes(searchQuery)) {
        results.push({
          name: pageTitle,
          path: `/docs/${section}`,
          type: 'doc',
          doc_section: section.toUpperCase().replace('-', ' ')
        })
      }
    } catch (error) {
      console.warn(`Error reading doc section ${section}:`, error)
    }
  })

  return results
} 