import { z } from "zod";

// Common validation schemas
export const idSchema = z.number().int().positive();

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10)
});

export const dateRangeSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
});

// Contact validation
export const contactValidationSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address").optional().nullable(),
  phone: z.string().min(7, "Phone must be at least 7 characters").optional().nullable(),
  location: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  avatarUrl: z.string().url().optional().nullable()
});

// Message validation
export const messageValidationSchema = z.object({
  content: z.string().min(1, "Message content cannot be empty"),
  isFromAgent: z.boolean().default(false),
  agentId: z.number().optional(),
  metadata: z.record(z.any()).optional()
});

// Channel validation
export const channelValidationSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  type: z.enum(["whatsapp", "instagram", "facebook", "sms"]),
  isActive: z.boolean().default(true),
  config: z.record(z.any()).optional()
});

// Payment validation
export const paymentRequestValidationSchema = z.object({
  conversationId: z.number().int().positive(),
  amount: z.number().positive("Amount must be positive"),
  description: z.string().min(1, "Description cannot be empty"),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
});

export const invoiceValidationSchema = z.object({
  contactId: z.number().int().positive(),
  amount: z.number().positive("Amount must be positive"),
  description: z.string().min(1, "Description cannot be empty"),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
});

// User validation
export const userValidationSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  role: z.enum(["admin", "agent", "supervisor"]).default("agent"),
  avatarUrl: z.string().url().optional().nullable()
});

export const loginValidationSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required")
});

// Note validation
export const noteValidationSchema = z.object({
  contactId: z.number().int().positive(),
  content: z.string().min(1, "Note content cannot be empty")
});

// Helper functions for request validation
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): { 
  success: boolean; 
  data?: T;
  error?: string;
  errors?: z.ZodError;
} {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        error: "Validation failed", 
        errors: error
      };
    }
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown validation error"
    };
  }
}

// Validate pagination parameters
export function validatePagination(query: any): { page: number; limit: number } {
  const result = paginationSchema.safeParse(query);
  if (result.success) {
    return result.data;
  }
  return { page: 1, limit: the10 };
}

// Validate date range parameters
export function validateDateRange(query: any): { startDate?: Date; endDate?: Date } {
  const result = dateRangeSchema.safeParse(query);
  if (result.success) {
    return {
      startDate: result.data.startDate ? new Date(result.data.startDate) : undefined,
      endDate: result.data.endDate ? new Date(result.data.endDate) : undefined
    };
  }
  return {};
}
