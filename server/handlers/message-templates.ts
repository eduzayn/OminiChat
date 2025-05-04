import { Request, Response, Express } from "express";
import { db } from "@db";
import { eq } from "drizzle-orm";
import { 
  messageTemplates, 
  insertMessageTemplateSchema,
  MessageTemplate
} from "@shared/schema.ts";
import { z } from "zod";

function isAuthenticated(req: any, res: any, next: any) {
  if (req.session && req.session.userId) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
}

// Esquema de validação para atualização
const updateMessageTemplateSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters").optional(),
  content: z.string().min(5, "Template content must be at least 5 characters").optional(),
  category: z.string().optional(),
  isActive: z.boolean().optional(),
});

export function registerMessageTemplateRoutes(app: Express, apiPrefix: string) {
  // Obter todos os modelos de mensagens rápidas
  app.get(`${apiPrefix}/message-templates`, isAuthenticated, async (req, res) => {
    try {
      const templates = await db.query.messageTemplates.findMany({
        orderBy: (messageTemplates, { desc }) => [desc(messageTemplates.createdAt)],
        with: {
          createdByUser: true
        }
      });
      
      return res.json(templates);
    } catch (error) {
      console.error("Erro ao buscar modelos de mensagens:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  
  // Obter um modelo específico
  app.get(`${apiPrefix}/message-templates/:id`, isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      
      const template = await db.query.messageTemplates.findFirst({
        where: eq(messageTemplates.id, id),
        with: {
          createdByUser: true
        }
      });
      
      if (!template) {
        return res.status(404).json({ message: "Modelo não encontrado" });
      }
      
      return res.json(template);
    } catch (error) {
      console.error("Erro ao buscar modelo de mensagem:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  
  // Criar um novo modelo
  app.post(`${apiPrefix}/message-templates`, isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      
      // Validar dados de entrada
      const validatedData = insertMessageTemplateSchema.parse({
        ...req.body,
        createdBy: userId
      });
      
      // Inserir no banco de dados
      const [newTemplate] = await db.insert(messageTemplates)
        .values(validatedData)
        .returning();
      
      return res.status(201).json(newTemplate);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      
      console.error("Erro ao criar modelo de mensagem:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  
  // Atualizar um modelo existente
  app.patch(`${apiPrefix}/message-templates/:id`, isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      
      // Verificar se o modelo existe
      const existingTemplate = await db.query.messageTemplates.findFirst({
        where: eq(messageTemplates.id, id)
      });
      
      if (!existingTemplate) {
        return res.status(404).json({ message: "Modelo não encontrado" });
      }
      
      // Validar dados de atualização
      const validatedData = updateMessageTemplateSchema.parse(req.body);
      
      // Atualizar no banco de dados
      const [updatedTemplate] = await db.update(messageTemplates)
        .set({
          ...validatedData,
          updatedAt: new Date()
        })
        .where(eq(messageTemplates.id, id))
        .returning();
      
      return res.json(updatedTemplate);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      
      console.error("Erro ao atualizar modelo de mensagem:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  
  // Excluir um modelo
  app.delete(`${apiPrefix}/message-templates/:id`, isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      
      // Verificar se o modelo existe
      const existingTemplate = await db.query.messageTemplates.findFirst({
        where: eq(messageTemplates.id, id)
      });
      
      if (!existingTemplate) {
        return res.status(404).json({ message: "Modelo não encontrado" });
      }
      
      // Excluir do banco de dados
      await db.delete(messageTemplates).where(eq(messageTemplates.id, id));
      
      return res.status(204).end();
    } catch (error) {
      console.error("Erro ao excluir modelo de mensagem:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
}