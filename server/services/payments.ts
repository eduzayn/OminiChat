import axios from "axios";

// Interface for customer data
interface CustomerData {
  name: string;
  email?: string;
  phone?: string;
  cpfCnpj?: string;
  address?: {
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
}

// Interface for payment data
interface PaymentData {
  customer: CustomerData;
  value: number;
  description: string;
  dueDate?: string;
  externalReference?: string;
  billingType?: string;
}

// Interface for Asaas payment response
interface AsaasPaymentResponse {
  id: string;
  status: string;
  invoiceUrl: string;
  error?: string;
}

// Function to create a payment in Asaas
export async function createAsaasPayment(paymentData: PaymentData): Promise<AsaasPaymentResponse> {
  try {
    const apiKey = process.env.ASAAS_API_KEY;
    const apiUrl = process.env.ASAAS_API_URL || "https://www.asaas.com/api/v3";
    
    if (!apiKey) {
      return {
        id: "",
        status: "error",
        invoiceUrl: "",
        error: "Missing Asaas API key"
      };
    }
    
    // First, check if customer exists or create one
    let customerId = await getOrCreateCustomer(paymentData.customer);
    
    if (!customerId) {
      return {
        id: "",
        status: "error",
        invoiceUrl: "",
        error: "Failed to create or find customer"
      };
    }
    
    // Create payment
    const response = await axios.post(
      `${apiUrl}/payments`,
      {
        customer: customerId,
        billingType: paymentData.billingType || "BOLETO",
        value: paymentData.value,
        description: paymentData.description,
        dueDate: paymentData.dueDate || formatDate(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)), // 3 days from now
        externalReference: paymentData.externalReference
      },
      {
        headers: {
          access_token: apiKey
        }
      }
    );
    
    return {
      id: response.data.id,
      status: response.data.status,
      invoiceUrl: response.data.invoiceUrl
    };
  } catch (error) {
    console.error("Error creating Asaas payment:", error);
    return {
      id: "",
      status: "error",
      invoiceUrl: "",
      error: error instanceof Error ? error.message : "Unknown error creating payment"
    };
  }
}

// Function to get a payment from Asaas by ID
export async function getAsaasPaymentById(paymentId: string): Promise<any> {
  try {
    const apiKey = process.env.ASAAS_API_KEY;
    const apiUrl = process.env.ASAAS_API_URL || "https://www.asaas.com/api/v3";
    
    if (!apiKey) {
      throw new Error("Missing Asaas API key");
    }
    
    const response = await axios.get(
      `${apiUrl}/payments/${paymentId}`,
      {
        headers: {
          access_token: apiKey
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error("Error getting Asaas payment:", error);
    return null;
  }
}

// Function to get or create a customer in Asaas
async function getOrCreateCustomer(customerData: CustomerData): Promise<string | null> {
  try {
    const apiKey = process.env.ASAAS_API_KEY;
    const apiUrl = process.env.ASAAS_API_URL || "https://www.asaas.com/api/v3";
    
    if (!apiKey) {
      throw new Error("Missing Asaas API key");
    }
    
    // Try to find customer by email or phone
    if (customerData.email || customerData.phone) {
      const searchField = customerData.email ? "email" : "phone";
      const searchValue = customerData.email || customerData.phone;
      
      const searchResponse = await axios.get(
        `${apiUrl}/customers`,
        {
          headers: {
            access_token: apiKey
          },
          params: {
            [searchField]: searchValue
          }
        }
      );
      
      if (searchResponse.data.data && searchResponse.data.data.length > 0) {
        return searchResponse.data.data[0].id;
      }
    }
    
    // Create new customer
    const response = await axios.post(
      `${apiUrl}/customers`,
      {
        name: customerData.name,
        email: customerData.email,
        phone: customerData.phone,
        cpfCnpj: customerData.cpfCnpj,
        address: customerData.address
      },
      {
        headers: {
          access_token: apiKey
        }
      }
    );
    
    return response.data.id;
  } catch (error) {
    console.error("Error creating or finding Asaas customer:", error);
    return null;
  }
}

// Helper function to format date as YYYY-MM-DD
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}
