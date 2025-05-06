import Sidebar from "@/components/sidebar";
import { Helmet } from "react-helmet";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";

function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();

  return (
    <>
      <Helmet>
        <title>Dashboard | OmniConnect</title>
        <link 
          href="https://cdn.jsdelivr.net/npm/remixicon@2.5.0/fonts/remixicon.css" 
          rel="stylesheet" 
        />
      </Helmet>
      
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex justify-center items-center bg-neutral-50">
          <div className="max-w-md text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center">
                <i className="ri-inbox-fill text-3xl text-primary-600"></i>
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-2">Caixa de Entrada</h2>
            <p className="text-neutral-600 mb-6">
              A caixa de entrada está temporariamente indisponível. Estamos realizando atualizações para melhorar sua experiência.
            </p>
            <Button className="mx-auto">Recarregar página</Button>
          </div>
        </div>
      </div>
    </>
  );
}

export default Dashboard;