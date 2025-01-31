import { HomeSwarm } from '@/modules/shared/HomeSwarm'
import { DeclarativeHero } from '@/components/layout/DeclarativeHero'
import { DeclarativeSection } from '@/components/layout/DeclarativeSection'
import NaturalCapitalGrid from '@/modules/ensurance/components/NaturalCapitalGrid'
import CertificatesGrid from '@/modules/ensurance/components/CertificatesGrid'

export default function HomePage() {
  return (
    <main>
      <HomeSwarm />
      <DeclarativeHero />
      <DeclarativeSection />
      <NaturalCapitalGrid activeCategory="all" />
      <CertificatesGrid 
        variant="home"
        maxItems={16}
        hideSearch={true}
      />
    </main>
  )
}
