import Navbar from "@/components/ui/Navbar";
import Hero from "@/components/ui/Hero";
import Features from "@/components/ui/Features";
import HowItWorks from "@/components/ui/HowItWorks";
import Platform from "@/components/ui/Platform";
import Dashboard from "@/components/ui/Dashboard";
import Footer from "@/components/ui/Footer";

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-gradient-to-b from-white via-green-50 to-white">
      <Navbar />
      <Hero />
      <Features />
      <HowItWorks />
      <Platform />
      <Dashboard />
      <Footer />
    </main>
  );
}