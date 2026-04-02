import { useEffect } from "react";
import LandingNavbar from "@/components/landing/LandingNavbar";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import StatsSection from "@/components/landing/StatsSection";
import PricingSection from "@/components/landing/PricingSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import FAQSection from "@/components/landing/FAQSection";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/landing/Footer";

const Index = () => {
  useEffect(() => {
    // Força tema dark na landing page
    document.documentElement.classList.add('dark');
    
    return () => {
      // Remove ao sair se o usuário não tinha dark ativo
      const savedTheme = localStorage.getItem('poupe_theme_preference');
      if (savedTheme !== 'dark') {
        document.documentElement.classList.remove('dark');
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-user-bg-primary dark">
      <LandingNavbar />
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <StatsSection />
      <PricingSection />
      <TestimonialsSection />
      <FAQSection />
      <CTASection />
      <Footer />
    </div>
  );
};

export default Index;
