import { BookOpen, House, MessageCircle } from "lucide-react";
import type { ReactNode } from "react";
import { useLocation } from "wouter";
import { WA_ORCAMENTO } from "@/config/site";
import Dock from "@/components/Dock";
import { FloatingWhatsApp, SiteFooter, SiteHeader } from "@/components/SiteChrome";

type Props = { children: ReactNode };

export default function RecipeSiteChrome({ children }: Props) {
  const [, setLocation] = useLocation();
  const navigate = (path: string) => {
    setLocation(path);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#FFF9F0] pb-28 text-[#5A3428] md:pb-12">
      <SiteHeader variant="recipes" />
      <div className="recipe-header-spacer h-[74px] lg:h-20" aria-hidden="true" />
      {children}
      <SiteFooter variant="recipes" />
      <Dock
        items={[
          { icon: <House size={18} aria-hidden="true" />, label: "Início", onClick: () => navigate("/") },
          { icon: <BookOpen size={18} aria-hidden="true" />, label: "Receitas", onClick: () => navigate("/receitas") },
          { icon: <MessageCircle size={18} aria-hidden="true" />, label: "Contato", onClick: () => window.open(WA_ORCAMENTO, "_blank", "noopener,noreferrer") },
        ]}
        panelHeight={68}
        baseItemSize={48}
        magnification={64}
      />
      <FloatingWhatsApp label="Falar com a Chocolícia pelo WhatsApp" placement="recipes_floating_button" />
    </div>
  );
}
