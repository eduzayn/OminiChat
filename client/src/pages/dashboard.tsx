import { Helmet } from "react-helmet";
import { useLocation } from "wouter";
import { useEffect } from "react";

/**
 * Página do Dashboard - completamente removida conforme solicitado
 */
function Dashboard() {
  const [location, setLocation] = useLocation();
  
  useEffect(() => {
    // Redireciona para a página inicial
    setLocation("/");
  }, [setLocation]);

  return (
    <>
      <Helmet>
        <title>Dashboard | OmniConnect</title>
      </Helmet>
      
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Página Removida</h1>
          <p className="text-gray-600 mb-8">A caixa de entrada foi completamente removida conforme solicitado.</p>
        </div>
      </div>
    </>
  );
}

export default Dashboard;