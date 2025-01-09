import { useState } from 'react';
import ReactMarkdown from 'react-markdown';

const DESCRIPTION_CHAR_LIMIT = 300;

interface AssetMetadataProps {
  name?: string;
  description?: string;
  className?: string;
}

export function AssetMetadata({ name, description, className = '' }: AssetMetadataProps) {
  const [showFullDescription, setShowFullDescription] = useState(false);

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Asset Name */}
      <h1 className="text-3xl font-bold text-gray-200 mb-4">
        {name || 'Unnamed Asset'}
      </h1>

      {/* Description with character limit */}
      {description && (
        <div className="mb-6">
          <div className="prose dark:prose-invert">
            <div className={showFullDescription ? '' : 'relative'}>
              <ReactMarkdown>
                {showFullDescription 
                  ? description 
                  : description.slice(0, DESCRIPTION_CHAR_LIMIT) + '...'}
              </ReactMarkdown>
              {!showFullDescription && description.length > DESCRIPTION_CHAR_LIMIT && (
                <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-background dark:from-background-dark to-transparent" />
              )}
            </div>
            {description.length > DESCRIPTION_CHAR_LIMIT && (
              <button
                onClick={() => setShowFullDescription(!showFullDescription)}
                className="mt-2 text-sm text-gray-400 hover:text-gray-200"
              >
                {showFullDescription ? 'Show Less' : 'Show More'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 