'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import ExposureSankey from '@/modules/exposure/ExposureSankey'
import Link from 'next/link'
import { exposureData } from '@/modules/exposure/data'

export default function ExposurePage() {
  return (
    <>
      <div className="h-screen w-screen bg-primary-dark overflow-hidden p-0 m-0">
        <ExposureSankey data={exposureData} />
      </div>
      <div className="w-full text-xs text-gray-400 text-center py-2 bg-black/80 border-t border-gray-800/60">
        Data based on industry dependencies and risks mapping from{' '}
        <Link 
          href="https://docs.basin.global/appendix/ecosystem-services-dependencies-and-risks" 
          target="_blank"
          className="underline hover:text-gray-300"
        >
          BASIN Field Manual
        </Link>
        . Magnitude represents total nature-related financial risk exposure.
      </div>
    </>
  );
} 