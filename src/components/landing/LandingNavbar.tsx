import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Wallet, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBrandingContext } from "@/contexts/BrandingContext";

const LandingNavbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { logoUrl, platformName } = useBrandingContext();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { label: "Recursos", href: "#features" },
    { label: "Como Funciona", href: "#how-it-works" },
    { label: "Preços", href: "#pricing" },
    { label: "FAQ", href: "#faq" },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? "glass-topbar shadow-premium" : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            {logoUrl ? (
              <img src={logoUrl} alt={platformName} className="h-8 w-auto max-w-[160px] object-contain" />
            ) : (
              <>
                <div className="icon-circle icon-circle-success p-2 group-hover:shadow-green-glow transition-shadow duration-300">
                  <Wallet className="h-5 w-5 text-user-accent" />
                </div>
                <span className="text-xl font-bold text-user-text-primary">
                  {platformName}
                </span>
              </>
            )}
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-user-text-secondary hover:text-user-accent transition-colors duration-200 text-sm font-medium"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Link to="/auth">
              <Button 
                variant="outline" 
                className="border-user-text-secondary/40 text-user-text-primary hover:bg-user-accent/10 hover:border-user-accent hover:text-user-accent"
              >
                Entrar
              </Button>
            </Link>
            <Link to="/auth">
              <Button className="btn-premium">Começar Grátis</Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-user-text-primary"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-4 glass-card p-4 fade-in">
            <nav className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-user-text-secondary hover:text-user-accent transition-colors duration-200 py-2"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <div className="flex flex-col gap-2 pt-4 border-t border-user-border-glass">
                <Link to="/auth">
                  <Button 
                    variant="outline" 
                    className="w-full justify-center border-user-text-secondary/40 text-user-text-primary hover:bg-user-accent/10 hover:border-user-accent"
                  >
                    Entrar
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button className="btn-premium w-full">Começar Grátis</Button>
                </Link>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default LandingNavbar;
