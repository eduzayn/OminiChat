import React from "react";
import { Helmet } from "react-helmet";
import { useLocation } from "wouter";
import { Sidebar } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Construction, HelpCircle } from "lucide-react";
import { Link } from "wouter";

interface PlaceholderPageProps {
  title?: string;
  icon?: React.ReactNode;
  description?: string;
  moduleName?: string;
  features?: string[];
}

function PlaceholderPage({
  title,
  icon = <Construction className="h-16 w-16 text-primary-300" />,
  description = "Este módulo está em desenvolvimento e estará disponível em breve.",
  moduleName,
  features = []
}: PlaceholderPageProps) {
  const [location] = useLocation();
  
  // Extract module name from URL if not provided
  const pathSegments = location.split('/').filter(Boolean);
  const extractedModuleName = moduleName || (pathSegments.length > 0 ? 
    pathSegments[0].charAt(0).toUpperCase() + pathSegments[0].slice(1) : 
    "Módulo");
  
  // Generate page title
  const pageTitle = title || `${extractedModuleName} | OmniConnect`;

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
      </Helmet>

      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex-1 overflow-y-auto">
          <div className="container mx-auto py-10">
            <div className="flex items-center mb-6">
              <Button variant="ghost" size="icon" asChild className="mr-2">
                <Link href="/">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-neutral-900">{extractedModuleName}</h1>
                <p className="text-neutral-500">Módulo em desenvolvimento</p>
              </div>
            </div>
            
            <div className="flex flex-col items-center justify-center p-10 border rounded-lg border-dashed border-neutral-300 bg-neutral-50">
              <div className="mb-6">
                {icon}
              </div>
              <h2 className="text-xl font-semibold text-neutral-800 mb-3">
                {`Módulo de ${extractedModuleName} em Construção`}
              </h2>
              <p className="text-center text-neutral-600 max-w-lg mb-6">
                {description}
              </p>
              
              {features.length > 0 && (
                <div className="mt-6 w-full max-w-md">
                  <h3 className="text-sm font-medium text-neutral-700 mb-3">
                    Funcionalidades Planejadas:
                  </h3>
                  <ul className="space-y-2">
                    {features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <HelpCircle className="h-5 w-5 text-primary-400 mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-neutral-600">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              <Button className="mt-8" asChild>
                <Link href="/">
                  Voltar para a Caixa de Entrada
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default PlaceholderPage;