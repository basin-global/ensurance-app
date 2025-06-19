import { GeneralCertificate } from './GeneralGrid';
import { EnsureButtons } from '@/modules/ensure/buttons';
import Image from 'next/image';
import Link from 'next/link';
import { CONTRACTS } from '@/modules/specific/config';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { SpecificAsset } from '@/modules/specific/SpecificAsset';

interface GeneralListProps {
  certificates: GeneralCertificate[];
  urlPrefix?: string;
  isMiniApp?: boolean;
}

const FALLBACK_IMAGE = '/assets/no-image-found.png';

const isSpecificAsset = (cert: GeneralCertificate) => cert.is_specific

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
            <tr key={cert.contract_address} className="group hover:bg-gray-900/30 transition-colors">
              <td className="py-4">
                <Link href={cert.is_specific 
                  ? `/specific/${CONTRACTS.specific}/${cert.token_uri.split('/').pop()}`
                  : `${urlPrefix}${isMiniApp ? '/mini-app' : ''}/general/${cert.contract_address}`
                }>
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-12 h-12 bg-gray-800 rounded-lg overflow-hidden flex items-center justify-center",
                      cert.is_specific && "relative after:content-[''] after:absolute after:inset-0 after:rounded-lg after:shadow-[0_0_15px_rgba(255,215,0,0.6),0_0_30px_rgba(255,215,0,0.3)] after:border-2 after:border-[rgba(255,215,0,0.8)]"
                    )}>
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
              {!cert.is_specific ? (
                <>
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
                      <EnsureButtons
                        context="general"
                        contractAddress={cert.contract_address}
                        tokenSymbol="TOKEN"
                        tokenName={cert.name}
                        imageUrl={cert.image_url || FALLBACK_IMAGE}
                        variant="buy-only"
                        className="text-sm"
                      />
                    </div>
                  </td>
                </>
              ) : (
                <>
                  <td className="py-4 text-gray-400 font-medium" colSpan={2}>
                    specific ensurance provides direct funding
                  </td>
                  <td className="py-4 text-right">
                    <div className="flex justify-end">
                      <SpecificAsset tokenId={Number(cert.token_uri.split('/').pop())} />
                    </div>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 