import Navbar from '../components/landing/Navbar.jsx';
import Hero from '../components/landing/Hero.jsx';
import Trust from '../components/landing/Trust.jsx';
import ProblemSolution from '../components/landing/ProblemSolution.jsx';
import Features from '../components/landing/Features.jsx';
import Showcase from '../components/landing/Showcase.jsx';
import Security from '../components/landing/Security.jsx';
import Pricing from '../components/landing/Pricing.jsx';
import FAQ from '../components/landing/FAQ.jsx';
import FinalCTA from '../components/landing/FinalCTA.jsx';
import Footer from '../components/landing/Footer.jsx';

export default function Home() {
  return (
    <div className="landing">
      <Navbar />
      <main>
        <Hero />
        <Trust />
        <ProblemSolution />
        <Features />
        <Showcase />
        <Security />
        <Pricing />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
