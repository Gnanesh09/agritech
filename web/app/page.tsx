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
    <main className="min-h-screen overflow-x-hidden bg-gradient-to-b from-white via-green-50 to-white">
      <Navbar />
      <Hero />
      <Features />
      <AIDecisionLayer />
      <HowItWorks />
      <DashboardPreview />
      <MobileAppPreview />
      <Ecosystem />
      <WhySmartAgri />
      <UseCases />
      <FAQ />
      <CTA />
      <Footer />
    </main>
  );
}