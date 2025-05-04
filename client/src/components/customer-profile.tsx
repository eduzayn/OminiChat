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
  
  // Fetch contact details and activities when active conversation changes
  useEffect(() => {
    if (activeConversation) {
      setIsLoading(true);
      setContact(activeConversation.contact);
      
      // Fetch activities for the contact
      fetch(`/api/contacts/${activeConversation.contact.id}/activities`)
        .then(res => res.json())
        .then(data => {
          setActivities(data);
          setIsLoading(false);
        })
        .catch(err => {
          console.error("Error fetching contact activities:", err);
          setIsLoading(false);
          setActivities([]);
        });
    } else {
      setContact(null);
      setActivities([]);
    }
  }, [activeConversation]);
  
  if (!contact) {
    return (
      <div className="w-80 bg-white border-l border-neutral-200 h-screen flex flex-col items-center justify-center">
        <div className="text-center p-4">
          <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <UserPlus className="text-neutral-400 h-6 w-6" />
          </div>
          <h3 className="text-neutral-500 font-medium">No Contact Selected</h3>
          <p className="text-neutral-400 text-sm mt-1">
            Select a conversation to view contact details
          </p>
        </div>
      </div>
    );
  }
  
  const addTag = async () => {
    const tag = prompt("Enter a new tag:");
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
        title: "Tag added",
        description: `Tag "${tag}" has been added to ${contact.name}`
      });
      
    } catch (error) {
      console.error("Error adding tag:", error);
      toast({
        variant: "destructive",
        title: "Error adding tag",
        description: "The tag could not be added. Please try again."
      });
    }
  };
  
  const sendInvoice = async () => {
    if (!contact) return;
    
    try {
      const amount = prompt("Enter invoice amount (R$):");
      const description = prompt("Enter invoice description:");
      
      if (!amount || !description) return;
      
      await apiRequest("POST", `/api/payments/invoice`, {
        contactId: contact.id,
        amount: parseFloat(amount),
        description
      });
      
      toast({
        title: "Invoice sent",
        description: `An invoice for R$${amount} has been sent to ${contact.name}`
      });
      
      // Refresh activities
      const response = await fetch(`/api/contacts/${contact.id}/activities`);
      const data = await response.json();
      setActivities(data);
      
    } catch (error) {
      console.error("Error sending invoice:", error);
      toast({
        variant: "destructive",
        title: "Error sending invoice",
        description: "The invoice could not be sent. Please try again."
      });
    }
  };
  
  const addNote = async () => {
    const note = prompt("Enter a note about this contact:");
    if (!note) return;
    
    try {
      await apiRequest("POST", `/api/contacts/${contact.id}/notes`, {
        content: note
      });
      
      toast({
        title: "Note added",
        description: "Your note has been added to the contact's history"
      });
      
      // Refresh activities
      const response = await fetch(`/api/contacts/${contact.id}/activities`);
      const data = await response.json();
      setActivities(data);
      
    } catch (error) {
      console.error("Error adding note:", error);
      toast({
        variant: "destructive",
        title: "Error adding note",
        description: "The note could not be added. Please try again."
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
        <h3 className="text-sm font-semibold text-neutral-900">Contact Details</h3>
        <Button variant="ghost" size="icon">
          <Edit className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Profile info */}
      <div className="p-4 border-b border-neutral-200">
        <div className="flex flex-col items-center mb-4">
          <Avatar className="w-16 h-16 mb-2">
            <AvatarImage src={contact.avatarUrl} />
            <AvatarFallback>{contact.name?.charAt(0) || "C"}</AvatarFallback>
          </Avatar>
          <h4 className="text-base font-medium text-neutral-900">{contact.name}</h4>
          <span className="text-sm text-neutral-500">Customer since {customerSince}</span>
        </div>
        
        <div className="space-y-3">
          {contact.phone && (
            <div className="flex items-center">
              <i className="ri-whatsapp-fill text-success-500 w-5"></i>
              <span className="text-sm text-neutral-700 ml-2">{contact.phone}</span>
            </div>
          )}
          {contact.email && (
            <div className="flex items-center">
              <i className="ri-mail-line text-neutral-500 w-5"></i>
              <span className="text-sm text-neutral-700 ml-2">{contact.email}</span>
            </div>
          )}
          {contact.location && (
            <div className="flex items-center">
              <i className="ri-map-pin-line text-neutral-500 w-5"></i>
              <span className="text-sm text-neutral-700 ml-2">{contact.location}</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Customer tags */}
      <div className="p-4 border-b border-neutral-200">
        <h5 className="text-xs font-semibold text-neutral-700 uppercase mb-2">Tags</h5>
        <div className="flex flex-wrap gap-2">
          {contact.tags && contact.tags.length > 0 ? (
            contact.tags.map((tag, index) => (
              <span key={index} className="px-2 py-1 bg-primary-50 text-primary-700 rounded text-xs">
                {tag}
              </span>
            ))
          ) : (
            <span className="text-xs text-neutral-500">No tags</span>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            className="px-2 py-1 border border-dashed border-neutral-300 rounded text-xs text-neutral-500 hover:border-neutral-400"
            onClick={addTag}
          >
            <Plus className="h-3 w-3 mr-1" /> 
            Add tag
          </Button>
        </div>
      </div>
      
      {/* Customer history */}
      <div className="flex-1 overflow-y-auto p-4">
        <h5 className="text-xs font-semibold text-neutral-700 uppercase mb-3">Activity History</h5>
        {isLoading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-neutral-500">No activities yet</p>
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
          Send Invoice
        </Button>
        <Button 
          variant="outline" 
          className="w-full border border-neutral-300 text-neutral-700 hover:bg-neutral-50"
          onClick={addNote}
        >
          Add Note
        </Button>
      </div>
    </div>
  );
}

export default CustomerProfile;
