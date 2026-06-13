import { Hexagon } from "lucide-react"
import { Footer } from "@/components/ui/footer"
import { toast } from "sonner"

function Demo() {
  return (
    <div className="w-full">
      <Footer
        logo={<Hexagon className="h-10 w-10 opacity-0" />}
        brandName="SaaSarc"
        socialLinks={[]}
        mainLinks={[
          { label: "Recargas", onClick: () => toast.info("Brevemente") },
          { href: "/about", label: "Sobre" },
          { href: "/contact", label: "Contacto" },
        ]}
        legalLinks={[
          { href: "/privacypolicy", label: "politicas de privacidade" },
          { href: "/termosofuse", label: "Termos de Uso" },
        ]}
        copyright={{
          text: "© 2026 SaaSarc",
          license: "Todos os direitos reservados",
        }}
      />
    </div>
  )
}

export { Demo }
