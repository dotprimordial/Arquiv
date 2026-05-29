import { Hexagon } from "lucide-react"
import { Footer } from "@/components/ui/footer"

function Demo() {
  return (
    <div className="w-full">
      <Footer
        logo={<Hexagon className="h-10 w-10" />}
        brandName="SaaSarc"
        socialLinks={[]}
        mainLinks={[
          { href: "/top-up", label: "Recargas" },
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
