import { type ReactNode } from 'react'

export type DocSection = {
  title: string
  href: string
  subsections?: DocSection[]
}

export const docsNav: DocSection[] = [
  { title: 'overview', href: '/docs' },
  { title: 'quick start', href: '/docs/quick-start' },
  { title: 'policies', href: '/docs/policies' },
  { title: 'agents', href: '/docs/agents' },
  { title: 'api', href: '/docs/api' }
]

// This function extracts headings from MDX/React content
export function extractToc(element: ReactNode): DocSection[] {
  const toc: DocSection[] = []
  
  // Recursively walk through React elements
  const walk = (el: any) => {
    if (!el) return
    
    // Check for heading elements
    if (el.type === 'section' && el.props?.id) {
      const section: DocSection = {
        title: el.props.id.replace(/-/g, ' '),
        href: `#${el.props.id}`,
        subsections: []
      }
      
      // Look for subsections (h3s inside the section)
      if (el.props?.children) {
        if (Array.isArray(el.props.children)) {
          el.props.children.forEach((child: any) => {
            if (child?.props?.id) {
              section.subsections?.push({
                title: child.props.id.replace(/-/g, ' '),
                href: `#${child.props.id}`
              })
            }
          })
        }
      }
      
      toc.push(section)
    }
    
    // Recurse through children
    if (el.props?.children) {
      if (Array.isArray(el.props.children)) {
        el.props.children.forEach(walk)
      }
    }
  }
  
  walk(element)
  return toc
} 