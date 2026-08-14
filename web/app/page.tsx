import Navbar from "@/components/ui/Navbar";
import Hero from "@/components/ui/Hero";
import Features from "@/components/ui/Features";
import AIDecisionLayer from "@/components/ui/AIDecisionLayer";
import HowItWorks from "@/components/ui/HowItWorks";
import DashboardPreview from "@/components/ui/DashboardPreview";
import MobileAppPreview from "@/components/ui/mobile/MobileAppPreview";
import Ecosystem from "@/components/ui/ecosystem/Ecosystem";
import WhySmartAgri from "@/components/ui/why-smart-agri/WhySmartAgri";
import UseCases from "@/components/ui/use-cases/UseCases";
import FAQ from "@/components/ui/faq/FAQ";
import CTA from "@/components/ui/cta/CTA";
import Footer from "@/components/ui/footer/Footer";

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-gradient-to-b from-white via-green-50 to-white pt-24">
      <Navbar />

      <section id="home" className="scroll-mt-24">
        <Hero />
      </section>

      <section id="features" className="scroll-mt-24">
        <Features />
      </section>

      <section id="ai" className="scroll-mt-24">
        <AIDecisionLayer />
      </section>

      <section id="how-it-works" className="scroll-mt-24">
        <HowItWorks />
      </section>

      <section id="dashboard" className="scroll-mt-24">
        <DashboardPreview />
      </section>

      <section id="mobile" className="scroll-mt-24">
        <MobileAppPreview />
      </section>

      <section id="ecosystem" className="scroll-mt-24">
        <Ecosystem />
      </section>

      <section id="why-smart-agri" className="scroll-mt-24">
        <WhySmartAgri />
      </section>

      <section id="use-cases" className="scroll-mt-24">
        <UseCases />
      </section>

      <section id="faq" className="scroll-mt-24">
        <FAQ />
      </section>

      <section id="contact" className="scroll-mt-24">
        <CTA />
        <Footer />
      </section>
    </main>
  );
}