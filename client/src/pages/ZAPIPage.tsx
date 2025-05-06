import React from "react";
import { ZAPIConfig } from "../components/ZAPIConfig";
import { Helmet } from "react-helmet";

export function ZAPIPage() {
  return (
    <>
      <Helmet>
        <title>Configuração Z-API | OmniConnect</title>
      </Helmet>
      <div className="container mx-auto py-6">
        <h1 className="text-2xl font-bold mb-6">Configuração do WhatsApp (Z-API)</h1>
        <p className="text-gray-600 mb-6">
          Configure a integração com o WhatsApp através da Z-API. Esta integração permite enviar e receber mensagens
          pelo WhatsApp integrado à plataforma OmniConnect.
        </p>
        
        <ZAPIConfig />
      </div>
    </>
  );
}