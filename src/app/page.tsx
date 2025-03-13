import { HomeSwarm } from '@/modules/shared/HomeSwarm'
import { DeclarativeHero } from '@/components/layout/DeclarativeHero'
import { DeclarativeSection } from '@/components/layout/DeclarativeSection'
import NaturalCapitalGrid from '@/modules/pools/NaturalCapitalGrid'

export default function HomePage() {
  return (
    <main>
      <HomeSwarm />
      <DeclarativeHero />
      <DeclarativeSection />
      <NaturalCapitalGrid activeCategory="all" />
    </main>
  )
}
