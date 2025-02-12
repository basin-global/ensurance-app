import Link from 'next/link'
import Image from 'next/image'

// Base link style matching other footer components
const baseLinkStyle = "text-gray-400 hover:text-gray-200 transition-colors text-[9px]"

export function LegalLinks() {
  return (
    <div>
      <div className="flex flex-col items-center text-center mt-8">
        <div className="flex flex-col gap-1.5 font-mono text-[9px] w-72">
          {/* ELIZA OS Logo */}
          <div className="flex justify-center mb-1.5">
            <Link
              href="https://elizaos.github.io/eliza/docs/intro/"
              target="_blank"
              rel="noopener noreferrer"
              className="opacity-60 hover:opacity-100 transition-opacity"
            >
              <Image
                src="/assets/logos/eliza-os_logo-mark_light.png"
                alt="ELIZA OS"
                width={42}
                height={42}
                className="w-auto h-auto"
              />
            </Link>
          </div>

          {/* Built on Ethereum Logo */}
          <div className="flex justify-center mb-1.5">
            <Link
              href="https://x.com/jackbutcher/status/1887159739815018794"
              target="_blank"
              rel="noopener noreferrer"
              className="opacity-60 hover:opacity-100 transition-opacity"
            >
              <Image
                src="/assets/logos/builtOnEthereum.png"
                alt="Built on Ethereum"
                width={50}
                height={23}
                className="w-auto h-auto"
              />
            </Link>
          </div>
          
          {/* Gradient Divider */}
          <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-800 to-transparent mb-1.5" />
          
          {/* Links line */}
          <div className="flex justify-center gap-2">
            <Link
              href="https://docs.basin.global/dossier/formalities/license"
              target="_blank"
              rel="noopener noreferrer"
              className={baseLinkStyle}
            >
              license
            </Link>
            <Link
              href="https://docs.basin.global/dossier/formalities/disclaimer"
              target="_blank"
              rel="noopener noreferrer"
              className={baseLinkStyle}
            >
              terms
            </Link>
            <span className="text-gray-400">privacy</span>
          </div>
        </div>
      </div>
    </div>
  )
} 