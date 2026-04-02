import { Link } from "react-router-dom";
import { Wallet, Instagram, Twitter, Linkedin, Youtube } from "lucide-react";

const footerLinks = {
  produto: [
    { label: "Recursos", href: "#features" },
    { label: "Preços", href: "#pricing" },
    { label: "Integrações", href: "#" },
    { label: "Atualizações", href: "#" },
  ],
  empresa: [
    { label: "Sobre Nós", href: "#" },
    { label: "Blog", href: "#" },
    { label: "Carreiras", href: "#" },
    { label: "Contato", href: "#" },
  ],
  suporte: [
    { label: "Central de Ajuda", href: "#" },
    { label: "FAQ", href: "#faq" },
    { label: "Comunidade", href: "#" },
    { label: "Status", href: "#" },
  ],
  legal: [
    { label: "Privacidade", href: "#" },
    { label: "Termos de Uso", href: "#" },
    { label: "Cookies", href: "#" },
    { label: "Licenças", href: "#" },
  ],
};

const socialLinks = [
  { icon: Instagram, href: "#", label: "Instagram" },
  { icon: Twitter, href: "#", label: "Twitter" },
  { icon: Linkedin, href: "#", label: "LinkedIn" },
  { icon: Youtube, href: "#", label: "YouTube" },
];

const Footer = () => {
  return (
    <footer className="relative py-16 border-t border-user-border-glass">
      <div className="absolute inset-0 bg-user-bg-secondary/30" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 mb-12">
          {/* Brand Column */}
          <div className="col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="icon-circle icon-circle-success p-2">
                <Wallet className="h-5 w-5 text-user-accent" />
              </div>
              <span className="text-xl font-bold text-user-text-primary">
                Poupe <span className="text-user-accent">Agora</span>
              </span>
            </Link>
            <p className="text-user-text-secondary text-sm mb-6 max-w-xs">
              A plataforma mais inteligente para você controlar suas finanças pessoais e alcançar seus objetivos.
            </p>
            {/* Social Links */}
            <div className="flex gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  className="w-10 h-10 rounded-full glass flex items-center justify-center text-user-text-secondary hover:text-user-accent hover:shadow-green-glow-sm transition-all duration-200"
                  aria-label={social.label}
                >
                  <social.icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Links Columns */}
          <div>
            <h4 className="text-user-text-primary font-semibold mb-4">Produto</h4>
            <ul className="space-y-2">
              {footerLinks.produto.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-user-text-secondary text-sm hover:text-user-accent transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-user-text-primary font-semibold mb-4">Empresa</h4>
            <ul className="space-y-2">
              {footerLinks.empresa.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-user-text-secondary text-sm hover:text-user-accent transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-user-text-primary font-semibold mb-4">Suporte</h4>
            <ul className="space-y-2">
              {footerLinks.suporte.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-user-text-secondary text-sm hover:text-user-accent transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-user-text-primary font-semibold mb-4">Legal</h4>
            <ul className="space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-user-text-secondary text-sm hover:text-user-accent transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-user-border-glass flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-user-text-secondary text-sm">
            © {new Date().getFullYear()} Poupe Agora. Todos os direitos reservados.
          </p>
          <p className="text-user-text-secondary text-sm">
            Feito com <span className="text-user-accent">♥</span> para suas finanças
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
