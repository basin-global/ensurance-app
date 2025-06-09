import { GeneralCertificate } from './GeneralGrid';
import { EnsureButtons0x } from '@/components/layout/EnsureButtonsGeneral';
import Image from 'next/image';
import Link from 'next/link';

interface GeneralListProps {
  certificates: GeneralCertificate[];
  urlPrefix?: string;
  isMiniApp?: boolean;
}

const FALLBACK_IMAGE = '/assets/no-image-found.png';

export default function GeneralList({ certificates, urlPrefix = '', isMiniApp = false }: GeneralListProps) {
  if (!certificates.length) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No certificates found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-left text-sm text-gray-400">
            <th className="pb-4 font-medium w-[40%]">certificate</th>
            <th className="pb-4 font-medium w-[20%]">market cap</th>
            <th className="pb-4 font-medium text-right w-[20%]">volume</th>
            <th className="pb-4 font-medium text-right w-[20%]">actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {certificates.map((cert) => (
            <tr key={cert.contract_address} className="hover:bg-gray-900/30 transition-colors">
              <td className="py-4">
                <Link href={`${urlPrefix}${isMiniApp ? '/mini-app' : ''}/general/${cert.contract_address}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-800 rounded-lg overflow-hidden flex items-center justify-center">
                      {cert.video_url ? (
                        <video
                          src={cert.video_url}
                          autoPlay
                          loop
                          muted
                          playsInline
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Image
                          src={cert.image_url || FALLBACK_IMAGE}
                          alt={cert.name || 'Certificate'}
                          width={48}
                          height={48}
                          className="object-cover"
                          unoptimized={cert.image_url?.toLowerCase?.()?.endsWith('.gif') || false}
                          onError={(e) => {
                            const img = e.target as HTMLImageElement;
                            img.src = FALLBACK_IMAGE;
                          }}
                        />
                      )}
                    </div>
                    <div className="font-medium text-white">
                      {cert.name || 'Unnamed Certificate'}
                    </div>
                  </div>
                </Link>
              </td>
              <td className="py-4">
                <div className="font-medium text-white">
                  ${Number(cert.market_cap || '0').toLocaleString(undefined, { 
                    minimumFractionDigits: Number(cert.market_cap || '0') < 10 ? 2 : 0,
                    maximumFractionDigits: Number(cert.market_cap || '0') < 10 ? 2 : 0
                  })}
                </div>
              </td>
              <td className="py-4 text-right">
                <div className="font-medium text-white">
                  ${Number(cert.total_volume || '0').toLocaleString(undefined, { 
                    minimumFractionDigits: Number(cert.total_volume || '0') < 10 ? 2 : 0,
                    maximumFractionDigits: Number(cert.total_volume || '0') < 10 ? 2 : 0
                  })}
                </div>
              </td>
              <td className="py-4 text-right">
                <div className="flex justify-end">
                  <EnsureButtons0x 
                    contractAddress={cert.contract_address as `0x${string}`}
                    showMinus={false} 
                    size="sm"
                    imageUrl={cert.image_url}
                    showBalance={false}
                    tokenName={cert.name}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 