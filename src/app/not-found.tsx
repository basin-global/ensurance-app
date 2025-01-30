import Image from 'next/image'

export default function NotFound() {
  // Array of disaster photos - you'll need to add these to /public/404/
  const disasterPhotos = Array.from({ length: 8 }, (_, i) => `/404/disaster-${i + 1}.jpg`)

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-[min(90vh,90vw)] mx-auto">
        <a href="/" className="block hover:opacity-90 transition-opacity">
          {/* 3x3 Grid with Message in Center */}
          <div className="grid grid-cols-3 gap-2 aspect-square w-full">
            {disasterPhotos.slice(0, 4).map((photo, index) => (
              <div key={index} className="relative aspect-square w-full overflow-hidden rounded-lg">
                <Image
                  src={photo}
                  alt={`Natural disaster ${index + 1}`}
                  fill
                  className="object-cover transition-all hover:scale-105"
                  sizes="(max-width: 768px) 33vw, 25vw"
                />
              </div>
            ))}
            
            {/* Center Message Tile */}
            <div className="relative aspect-square w-full rounded-lg bg-black/50 backdrop-blur-sm flex items-center justify-center p-2">
              <div className="text-center">
                <h1 className="text-lg md:text-2xl font-bold font-grotesk mb-1">
                  <span className="text-2xl md:text-4xl block mb-1">404</span>
                  this no longer exists!!!
                </h1>
                <p className="text-xs md:text-sm font-grotesk text-[rgba(var(--foreground-rgb),0.8)] mb-1">
                  neither will society or the economy
                </p>
                <p className="text-sm md:text-base font-bold font-grotesk">
                  unless we <span className="text-emerald-400">$ENSURE</span> it
                </p>
              </div>
            </div>

            {/* Remaining Photos */}
            {disasterPhotos.slice(4).map((photo, index) => (
              <div key={index + 4} className="relative aspect-square w-full overflow-hidden rounded-lg">
                <Image
                  src={photo}
                  alt={`Natural disaster ${index + 5}`}
                  fill
                  className="object-cover transition-all hover:scale-105"
                  sizes="(max-width: 768px) 33vw, 25vw"
                />
              </div>
            ))}
          </div>
        </a>
      </div>
    </div>
  )
} 