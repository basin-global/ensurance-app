import { PlusCircle, MinusCircle } from 'lucide-react'
import { usePrivy } from '@privy-io/react-auth'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface EnsureButtonsProps {
  showMinus?: boolean
  size?: 'sm' | 'lg'
}

export function EnsureButtons({ 
  showMinus = true,
  size = 'lg'
}: EnsureButtonsProps) {
  const { login, authenticated } = usePrivy()

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!authenticated) {
      login()
    } else {
      alert('Feature coming soon!')
    }
  }

  const iconSize = size === 'sm' ? 'w-6 h-6' : 'w-10 h-10'

  return (
    <div className="flex gap-8">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleClick}
              className="flex items-center gap-2 text-gray-300 hover:text-gray-100 transition-colors group"
            >
              <PlusCircle className={`${iconSize} stroke-[1.5] stroke-green-500 group-hover:stroke-green-400 transition-colors`} />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>ensure</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {showMinus && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleClick}
                className="flex items-center gap-2 text-gray-300 hover:text-gray-100 transition-colors group"
              >
                <MinusCircle className={`${iconSize} stroke-[1.5] stroke-red-500 group-hover:stroke-red-400 transition-colors`} />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>un-ensure</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  )
} 