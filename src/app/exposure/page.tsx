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
      <div className="fixed bottom-0 left-0 right-0 w-full text-sm text-gray-400 text-center pb-4 bg-primary-dark bg-opacity-80">
        <p>
          Data based on industry dependencies and risks mapping from{' '}
          <Link 
            href="https://docs.basin.global/appendix/ecosystem-services-dependencies-and-risks" 
            target="_blank"
            className="underline hover:text-gray-300"
          >
            BASIN Field Manual
          </Link>
          . Magnitude represents total nature-related financial risk exposure.
        </p>
      </div>
    </>
  );
} 