import { HomeSwarm } from '@/modules/shared/HomeSwarm'
import { DeclarativeHero } from '@/components/layout/DeclarativeHero'
import { DeclarativeSection } from '@/components/layout/DeclarativeSection'
import NaturalCapitalGrid from '@/modules/ensurance/components/NaturalCapitalGrid'

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
