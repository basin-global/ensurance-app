import type { MDXComponents } from 'mdx/types'
import Link from 'next/link'
import Image from 'next/image'

// Custom components for MDX
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    // Override default components
    h1: ({ children }) => (
      <h1 className="text-4xl font-bold mt-8 mb-4 font-grotesk text-[rgb(var(--foreground-rgb))]">
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-3xl font-bold mt-8 mb-4 font-grotesk text-[rgb(var(--foreground-rgb))]">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-2xl font-bold mt-6 mb-3 font-grotesk text-[rgb(var(--foreground-rgb))]">
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h4 className="text-xl font-bold mt-4 mb-2 font-grotesk text-[rgb(var(--foreground-rgb))]">
        {children}
      </h4>
    ),
    p: ({ children }) => (
      <p className="my-4 leading-7 font-grotesk text-[rgba(var(--foreground-rgb),0.9)]">
        {children}
      </p>
    ),
    a: ({ href = '', children }) => {
      const isInternal = href.startsWith('/')
      if (isInternal) {
        return (
          <Link 
            href={href} 
            className="text-[rgb(var(--foreground-rgb))] hover:opacity-80 underline font-grotesk"
          >
            {children}
          </Link>
        )
      }
      return (
        <a 
          href={href} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-[rgb(var(--foreground-rgb))] hover:opacity-80 underline font-grotesk"
        >
          {children}
        </a>
      )
    },
    img: ({ src = '', alt = '' }) => (
      <div className="my-8">
        <Image
          src={src}
          alt={alt}
          width={800}
          height={400}
          className="rounded-lg"
        />
      </div>
    ),
    ul: ({ children }) => (
      <ul className="list-disc list-inside my-4 space-y-2 font-grotesk text-[rgba(var(--foreground-rgb),0.9)]">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal list-inside my-4 space-y-2 font-grotesk text-[rgba(var(--foreground-rgb),0.9)]">
        {children}
      </ol>
    ),
    li: ({ children }) => (
      <li className="ml-4 text-[rgba(var(--foreground-rgb),0.9)]">
        {children}
      </li>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-[rgba(var(--foreground-rgb),0.2)] pl-4 my-4 italic font-grotesk text-[rgba(var(--foreground-rgb),0.7)]">
        {children}
      </blockquote>
    ),
    code: ({ children }) => (
      <code className="bg-[rgba(var(--foreground-rgb),0.1)] rounded px-1 py-0.5 text-sm font-mono text-[rgb(var(--foreground-rgb))]">
        {children}
      </code>
    ),
    pre: ({ children }) => (
      <pre className="bg-[rgba(var(--foreground-rgb),0.1)] p-4 rounded-lg my-4 overflow-x-auto font-mono text-[rgb(var(--foreground-rgb))]">
        {children}
      </pre>
    ),
    // Merge with any custom components passed in
    ...components,
  }
} 