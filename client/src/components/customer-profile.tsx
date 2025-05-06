import { useConversation } from "@/context/conversation-context";
import { Contact } from "@shared/schema";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Edit, DollarSign, Calendar, MessageSquare, UserPlus, Plus } from "lucide-react";
import { format } from "date-fns";
import { useContacts } from "@/hooks/use-contacts";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type Activity = {
  id: string;
  type: "payment" | "appointment" | "conversation" | "contact_created";
  timestamp: string;
  description: string;
  details?: string;
};

function ActivityItem({ activity }: { activity: Activity }) {
  let icon;
  
  switch (activity.type) {
    case "payment":
      icon = <DollarSign className="text-success-500 mr-2 h-4 w-4" />;
      break;
    case "appointment":
      icon = <Calendar className="text-primary-500 mr-2 h-4 w-4" />;
      break;
    case "conversation":
      icon = <MessageSquare className="text-secondary-500 mr-2 h-4 w-4" />;
      break;
    case "contact_created":
      icon = <UserPlus className="text-primary-500 mr-2 h-4 w-4" />;
      break;
    default:
      icon = <MessageSquare className="text-neutral-500 mr-2 h-4 w-4" />;
  }
  
  return (
    <div className="border-l-2 border-primary-200 pl-3 pb-4">
      <div className="flex items-center mb-1">
        {icon}
        <span className="text-sm font-medium text-neutral-900">{activity.description}</span>
        <span className="ml-auto text-xs text-neutral-500">
          {format(new Date(activity.timestamp), "h:mm a")}
        </span>
      </div>
      {activity.details && (
        <p className="text-xs text-neutral-600">{activity.details}</p>
      )}
    </div>
  );
}

function CustomerProfile() {
  const { activeConversation } = useConversation();
  const { updateContact } = useContacts();
  const [contact, setContact] = useState<Contact | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  // Função para buscar atividades
  const fetchActivities = async (contactId: number) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/contacts/${contactId}/activities`, {
        credentials: "include"
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch activities: ${response.status}`);
      }
      
      const data = await response.json();
      setActivities(data);
    } catch (err) {
      console.error("Error fetching contact activities:", err);
      setActivities([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch contact details and activities when active conversation changes
  useEffect(() => {
    if (activeConversation) {
      setContact(activeConversation.contact);
      fetchActivities(activeConversation.contact.id);
    } else {
      setContact(null);
      setActivities([]);
    }
  }, [activeConversation]);
  
  if (!contact) {
    return (
      <div className="w-80 bg-white border-l border-neutral-200 h-screen flex flex-col items-center justify-center">
        <div className="text-center p-4">
          <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserPlus className="text-neutral-400 h-7 w-7" />
          </div>
          <h3 className="text-neutral-700 font-medium text-lg">Nenhum Contato Selecionado</h3>
          <p className="text-neutral-500 text-sm mt-2 max-w-[200px] mx-auto">
            Selecione uma conversa para visualizar os detalhes do contato
          </p>
        </div>
      </div>
    );
  }
  
  const addTag = async () => {
    const tag = prompt("Digite uma nova etiqueta:");
    if (!tag) return;
    
    try {
      const updatedTags = [...(contact.tags || []), tag];
      
      await apiRequest("PATCH", `/api/contacts/${contact.id}`, {
        tags: updatedTags
      });
      
      // Update local state
      setContact({
        ...contact,
        tags: updatedTags
      });
      
      // Invalidate the contacts query
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      
      toast({
        title: "Etiqueta adicionada",
        description: `Etiqueta "${tag}" adicionada a ${contact.name}`
      });
      
    } catch (error) {
      console.error("Error adding tag:", error);
      toast({
        variant: "destructive",
        title: "Erro ao adicionar etiqueta",
        description: "Não foi possível adicionar a etiqueta. Tente novamente."
      });
    }
  };
  
  const sendInvoice = async () => {
    if (!contact) return;
    
    try {
      const amount = prompt("Digite o valor da cobrança (R$):");
      const description = prompt("Digite a descrição da cobrança:");
      
      if (!amount || !description) return;
      
      await apiRequest("POST", `/api/payments/invoice`, {
        contactId: contact.id,
        amount: parseFloat(amount),
        description
      });
      
      toast({
        title: "Cobrança enviada",
        description: `Uma cobrança de R$${amount} foi enviada para ${contact.name}`
      });
      
      // Refresh activities
      await fetchActivities(contact.id);
      
    } catch (error) {
      console.error("Error sending invoice:", error);
      toast({
        variant: "destructive",
        title: "Erro ao enviar cobrança",
        description: "Não foi possível enviar a cobrança. Tente novamente."
      });
    }
  };
  
  const addNote = async () => {
    const note = prompt("Digite uma nota sobre este contato:");
    if (!note) return;
    
    try {
      await apiRequest("POST", `/api/contacts/${contact.id}/notes`, {
        content: note
      });
      
      toast({
        title: "Nota adicionada",
        description: "Sua nota foi adicionada ao histórico do contato"
      });
      
      // Refresh activities
      await fetchActivities(contact.id);
      
    } catch (error) {
      console.error("Error adding note:", error);
      toast({
        variant: "destructive",
        title: "Erro ao adicionar nota",
        description: "Não foi possível adicionar a nota. Tente novamente."
      });
    }
  };
  
  const customerSince = contact.createdAt 
    ? format(new Date(contact.createdAt), "MMM yyyy")
    : "Unknown";
  
  return (
    <div className="w-80 bg-white border-l border-neutral-200 h-screen flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-neutral-200 flex justify-between items-center">
        <h3 className="text-sm font-semibold text-neutral-900">Detalhes do Contato</h3>
        <Button variant="ghost" size="icon" title="Editar contato">
          <Edit className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Profile info */}
      <div className="p-4 border-b border-neutral-200">
        <div className="flex flex-col items-center mb-4">
          <div className="relative">
            <Avatar className="w-16 h-16 mb-2 border-2 border-primary-100">
              <AvatarImage src={contact.avatarUrl} />
              <AvatarFallback className="bg-primary-50 text-primary-600">{contact.name?.charAt(0) || "C"}</AvatarFallback>
            </Avatar>
            {contact.isPreferred && (
              <div className="absolute -bottom-1 -right-1 bg-success-500 text-white rounded-full w-6 h-6 flex items-center justify-center">
                <i className="ri-star-fill text-xs"></i>
              </div>
            )}
          </div>
          <h4 className="text-base font-medium text-neutral-900 mt-2">{contact.name}</h4>
          <span className="text-sm text-neutral-500">Cliente desde {customerSince}</span>
        </div>
        
        <div className="space-y-3">
          {contact.phone && (
            <div className="flex items-center p-2 rounded-md hover:bg-neutral-50 transition-colors">
              <div className="w-8 h-8 rounded-full bg-success-50 flex items-center justify-center">
                <i className="ri-whatsapp-fill text-success-500"></i>
              </div>
              <div className="ml-2">
                <span className="text-sm text-neutral-700 block">{contact.phone}</span>
                <span className="text-xs text-neutral-500">WhatsApp</span>
              </div>
            </div>
          )}
          {contact.email && (
            <div className="flex items-center p-2 rounded-md hover:bg-neutral-50 transition-colors">
              <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center">
                <i className="ri-mail-line text-primary-500"></i>
              </div>
              <div className="ml-2">
                <span className="text-sm text-neutral-700 block truncate">{contact.email}</span>
                <span className="text-xs text-neutral-500">Email</span>
              </div>
            </div>
          )}
          {contact.location && (
            <div className="flex items-center p-2 rounded-md hover:bg-neutral-50 transition-colors">
              <div className="w-8 h-8 rounded-full bg-secondary-50 flex items-center justify-center">
                <i className="ri-map-pin-line text-secondary-500"></i>
              </div>
              <div className="ml-2">
                <span className="text-sm text-neutral-700 block">{contact.location}</span>
                <span className="text-xs text-neutral-500">Localização</span>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Customer tags */}
      <div className="p-4 border-b border-neutral-200">
        <h5 className="text-xs font-semibold text-neutral-700 uppercase mb-2">Etiquetas</h5>
        <div className="flex flex-wrap gap-2">
          {contact.tags && contact.tags.length > 0 ? (
            contact.tags.map((tag, index) => (
              <span key={index} className="px-2 py-1 bg-primary-50 text-primary-700 rounded-md text-xs">
                {tag}
              </span>
            ))
          ) : (
            <span className="text-xs text-neutral-500">Sem etiquetas</span>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            className="px-2 py-1 border border-dashed border-neutral-300 rounded-md text-xs text-neutral-500 hover:border-neutral-400"
            onClick={addTag}
          >
            <Plus className="h-3 w-3 mr-1" /> 
            Adicionar
          </Button>
        </div>
      </div>
      
      {/* Customer history */}
      <div className="flex-1 overflow-y-auto p-4">
        <h5 className="text-xs font-semibold text-neutral-700 uppercase mb-3">Histórico de Atividades</h5>
        {isLoading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-4">
            <div className="mb-2 mx-auto w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center">
              <Calendar className="text-neutral-400 h-5 w-5" />
            </div>
            <p className="text-sm text-neutral-500">Nenhuma atividade recente</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map(activity => (
              <ActivityItem key={activity.id} activity={activity} />
            ))}
          </div>
        )}
      </div>
      
      {/* Action buttons */}
      <div className="p-4 border-t border-neutral-200">
        <Button 
          className="w-full bg-primary-500 text-white hover:bg-primary-600 mb-2"
          onClick={sendInvoice}
        >
          <DollarSign className="h-4 w-4 mr-2" />
          Enviar Cobrança
        </Button>
        <div className="flex gap-2 mt-2">
          <Button 
            variant="outline" 
            className="flex-1 border border-neutral-300 text-neutral-700 hover:bg-neutral-50"
            onClick={addNote}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Adicionar Nota
          </Button>
          <Button
            variant="outline"
            className="border border-neutral-300 text-neutral-700 hover:bg-neutral-50 w-12"
          >
            <Calendar className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default CustomerProfile;
