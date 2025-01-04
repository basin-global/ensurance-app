import { HomeSwarm } from '@/modules/shared/HomeSwarm'
import { DeclarativeHero } from '@/components/layout/DeclarativeHero'
import { DeclarativeSection } from '@/components/layout/DeclarativeSection'

export default function Home() {
  return (
    <>
      <HomeSwarm />
      <DeclarativeHero />
      <DeclarativeSection />
    </>
  )
}
