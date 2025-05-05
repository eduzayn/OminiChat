import { Request, Response } from "express";
import { Express } from "express";
import { db } from "@db";
import { opportunities, users, contacts, insertOpportunitySchema } from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { z } from "zod";
import { validateRequest } from "../utils/validation";

function isAuthenticated(req: any, res: any, next: any) {
  if (req.session && req.session.userId) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
}

export function registerOpportunityRoutes(app: Express, apiPrefix: string) {
  // Obter todas as oportunidades (com paginação e filtros)
  app.get(`${apiPrefix}/opportunities`, isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { userId, userRole } = req.session as any;
      
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;
      
      // Filtros opcionais
      const status = req.query.status as string | undefined;
      const stage = req.query.stage as string | undefined;
      const contactId = req.query.contactId as string | undefined;
      
      // Consultar oportunidades com relacionamentos
      const result = await db.query.opportunities.findMany({
        limit,
        offset,
        orderBy: [desc(opportunities.createdAt)],
        with: {
          contact: true,
          user: true
        },
        where: (opps, { and, eq }) => {
          const conditions = [];
          
          if (status) {
            conditions.push(eq(opps.status, status));
          }
          
          if (stage) {
            conditions.push(eq(opps.stage, stage));
          }
          
          if (contactId) {
            conditions.push(eq(opps.contactId, parseInt(contactId)));
          }
          
          // Administradores podem ver todas as oportunidades, agentes apenas as suas
          if (userRole !== 'admin') {
            conditions.push(eq(opps.userId, userId));
          }
          
          return conditions.length ? and(...conditions) : undefined;
        }
      });
      
      // Contar total de resultados para paginação
      const countResult = await db.select({ count: sql`count(*)` }).from(opportunities);
      const totalCount = Number(countResult[0].count);
      
      return res.status(200).json({
        data: result,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit)
        }
      });
    } catch (error) {
      console.error('Erro ao buscar oportunidades:', error);
      return res.status(500).json({ message: "Erro ao buscar oportunidades", error: (error as Error).message });
    }
  });
  
  // Obter uma oportunidade específica
  app.get(`${apiPrefix}/opportunities/:id`, isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { userId, userRole } = req.session as any;
      
      const opportunity = await db.query.opportunities.findFirst({
        where: eq(opportunities.id, id),
        with: {
          contact: true,
          user: true
        }
      });
      
      if (!opportunity) {
        return res.status(404).json({ message: "Oportunidade não encontrada" });
      }
      
      // Verificar permissão
      if (userRole !== 'admin' && opportunity.userId !== userId) {
        return res.status(403).json({ message: "Sem permissão para acessar esta oportunidade" });
      }
      
      return res.status(200).json(opportunity);
    } catch (error) {
      console.error('Erro ao buscar oportunidade:', error);
      return res.status(500).json({ message: "Erro ao buscar oportunidade", error: (error as Error).message });
    }
  });
  
  // Criar uma nova oportunidade
  app.post(`${apiPrefix}/opportunities`, isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { userId } = req.session as any;
      
      // Validar dados da requisição
      const validation = validateRequest(insertOpportunitySchema, req.body);
      if (validation.error) {
        return res.status(400).json({ message: "Dados inválidos", errors: validation.error });
      }
      
      // Garantir que validation.data não é undefined
      if (!validation.data) {
        return res.status(400).json({ message: "Dados inválidos" });
      }
      
      // Verificar se o contato existe
      const contactExists = await db.query.contacts.findFirst({
        where: eq(contacts.id, validation.data.contactId),
      });
      
      if (!contactExists) {
        return res.status(400).json({ message: "Contato não encontrado" });
      }
      
      // Criar a oportunidade
      const newOpportunity = await db.insert(opportunities)
        .values({
          ...validation.data,
          userId: userId // Garantir que o usuário atual seja o proprietário
        })
        .returning();
      
      // Criar uma atividade relacionada a esta oportunidade (opcional)
      
      return res.status(201).json(newOpportunity[0]);
    } catch (error) {
      console.error('Erro ao criar oportunidade:', error);
      return res.status(500).json({ message: "Erro ao criar oportunidade", error: (error as Error).message });
    }
  });
  
  // Atualizar uma oportunidade
  app.put(`${apiPrefix}/opportunities/:id`, isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { userId, userRole } = req.session as any;
      
      // Primeiro verificar se a oportunidade existe e se o usuário tem permissão
      const existingOpportunity = await db.query.opportunities.findFirst({
        where: eq(opportunities.id, id)
      });
      
      if (!existingOpportunity) {
        return res.status(404).json({ message: "Oportunidade não encontrada" });
      }
      
      // Verificar permissão
      if (userRole !== 'admin' && existingOpportunity.userId !== userId) {
        return res.status(403).json({ message: "Sem permissão para editar esta oportunidade" });
      }
      
      // Validar dados
      const updateSchema = insertOpportunitySchema.partial(); // Todos os campos são opcionais para atualização
      const validation = validateRequest(updateSchema, req.body);
      if (validation.error) {
        return res.status(400).json({ message: "Dados inválidos", errors: validation.error });
      }
      
      // Garantir que validation.data não é undefined
      if (!validation.data) {
        return res.status(400).json({ message: "Dados inválidos" });
      }
      
      // Atualizar a oportunidade
      const updatedOpportunity = await db.update(opportunities)
        .set({
          ...validation.data,
          updatedAt: new Date()
        })
        .where(eq(opportunities.id, id))
        .returning();
      
      return res.status(200).json(updatedOpportunity[0]);
    } catch (error) {
      console.error('Erro ao atualizar oportunidade:', error);
      return res.status(500).json({ message: "Erro ao atualizar oportunidade", error: (error as Error).message });
    }
  });
  
  // Excluir uma oportunidade
  app.delete(`${apiPrefix}/opportunities/:id`, isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { userId, userRole } = req.session as any;
      
      // Primeiro verificar se a oportunidade existe e se o usuário tem permissão
      const existingOpportunity = await db.query.opportunities.findFirst({
        where: eq(opportunities.id, id)
      });
      
      if (!existingOpportunity) {
        return res.status(404).json({ message: "Oportunidade não encontrada" });
      }
      
      // Verificar permissão - apenas administradores ou o criador podem excluir
      if (userRole !== 'admin' && existingOpportunity.userId !== userId) {
        return res.status(403).json({ message: "Sem permissão para excluir esta oportunidade" });
      }
      
      // Excluir a oportunidade
      await db.delete(opportunities).where(eq(opportunities.id, id));
      
      return res.status(200).json({ success: true, message: "Oportunidade excluída com sucesso" });
    } catch (error) {
      console.error('Erro ao excluir oportunidade:', error);
      return res.status(500).json({ message: "Erro ao excluir oportunidade", error: (error as Error).message });
    }
  });
}