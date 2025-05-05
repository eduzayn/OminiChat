import { Request, Response } from "express";
import { Express } from "express";
import { db } from "@db";
import { organizations, organizationUsers, users } from "@shared/schema";
import { eq, and, inArray, sql } from "drizzle-orm";

// Middleware de autenticação
function isAuthenticated(req: any, res: any, next: any) {
  if (req.session && req.session.userId) {
    next();
  } else {
    res.status(401).json({ message: "Unauthorized" });
  }
}

// Middleware de autorização de admin
function isAdmin(req: any, res: any, next: any) {
  if (req.session && req.session.userRole === "admin") {
    next();
  } else {
    res.status(403).json({ message: "Forbidden - Admin access required" });
  }
}

export function registerOrganizationRoutes(app: Express, apiPrefix: string) {
  // Listar todas as organizações (apenas para admin)
  app.get(`${apiPrefix}/organizations`, isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const allOrganizations = await db.query.organizations.findMany({
        orderBy: organizations.name
      });
      
      res.json(allOrganizations);
    } catch (error) {
      console.error("Error fetching organizations:", error);
      res.status(500).json({ message: "Erro ao buscar organizações" });
    }
  });

  // Obter detalhes de uma organização específica
  app.get(`${apiPrefix}/organizations/:id`, isAuthenticated, async (req: Request, res: Response) => {
    try {
      const organizationId = parseInt(req.params.id);
      const userId = req.session.userId ? parseInt(req.session.userId) : 0;
      
      // Verificar permissão - usuário precisa ser admin ou pertencer à organização
      if (req.session.userRole !== 'admin') {
        const userMembership = await db.query.organizationUsers.findFirst({
          where: and(
            eq(organizationUsers.organizationId, organizationId),
            eq(organizationUsers.userId, userId)
          )
        });
        
        if (!userMembership) {
          return res.status(403).json({ message: "Acesso negado a esta organização" });
        }
      }

      // Buscar a organização
      const organization = await db.query.organizations.findFirst({
        where: eq(organizations.id, organizationId),
      });

      if (!organization) {
        return res.status(404).json({ message: "Organização não encontrada" });
      }

      // Buscar membros da organização
      const members = await db.query.organizationUsers.findMany({
        where: eq(organizationUsers.organizationId, organizationId),
        with: {
          user: true
        }
      });

      res.json({
        ...organization,
        members: members.map(member => ({
          id: member.user.id,
          name: member.user.name,
          role: member.role,
          active: member.active
        }))
      });
    } catch (error) {
      console.error("Error fetching organization:", error);
      res.status(500).json({ message: "Erro ao buscar detalhes da organização" });
    }
  });

  // Criar uma nova organização (apenas admin)
  app.post(`${apiPrefix}/organizations`, isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const { name, slug, schema, supportEmail, logo, primaryColor, planType } = req.body;

      // Verificar se já existe uma organização com o mesmo slug
      const existingOrg = await db.query.organizations.findFirst({
        where: eq(organizations.slug, slug)
      });

      if (existingOrg) {
        return res.status(400).json({ message: "Já existe uma organização com este slug" });
      }

      // Criar nova organização
      const [newOrganization] = await db.insert(organizations).values({
        name,
        slug,
        schema,
        supportEmail,
        logo,
        primaryColor,
        planType: planType || "basic",
        settings: {}
      }).returning();

      // Criar schema no PostgreSQL
      await db.execute(sql`CREATE SCHEMA IF NOT EXISTS "${sql.identifier(schema)}"`);

      res.status(201).json(newOrganization);
    } catch (error) {
      console.error("Error creating organization:", error);
      res.status(500).json({ message: "Erro ao criar organização" });
    }
  });

  // Atualizar uma organização
  app.put(`${apiPrefix}/organizations/:id`, isAuthenticated, async (req: Request, res: Response) => {
    try {
      const organizationId = parseInt(req.params.id);
      const userId = req.session.userId ? parseInt(req.session.userId) : 0;
      
      // Verificar permissão - usuário precisa ser admin ou owner da organização
      if (req.session.userRole !== 'admin') {
        const userMembership = await db.query.organizationUsers.findFirst({
          where: and(
            eq(organizationUsers.organizationId, organizationId),
            eq(organizationUsers.userId, userId),
            eq(organizationUsers.role, "owner")
          )
        });
        
        if (!userMembership) {
          return res.status(403).json({ message: "Acesso negado para editar esta organização" });
        }
      }

      const { name, supportEmail, logo, primaryColor, settings, active } = req.body;

      // Não permitir alterar slug ou schema depois de criado
      const [updatedOrganization] = await db.update(organizations)
        .set({
          name,
          supportEmail,
          logo,
          primaryColor,
          active,
          settings,
          updatedAt: new Date()
        })
        .where(eq(organizations.id, organizationId))
        .returning();

      if (!updatedOrganization) {
        return res.status(404).json({ message: "Organização não encontrada" });
      }

      res.json(updatedOrganization);
    } catch (error) {
      console.error("Error updating organization:", error);
      res.status(500).json({ message: "Erro ao atualizar organização" });
    }
  });

  // Adicionar usuário à organização
  app.post(`${apiPrefix}/organizations/:id/users`, isAuthenticated, async (req: Request, res: Response) => {
    try {
      const organizationId = parseInt(req.params.id);
      const userId = req.session.userId ? parseInt(req.session.userId) : 0;
      
      // Verificar permissão - usuário precisa ser admin ou owner/admin da organização
      if (req.session.userRole !== 'admin') {
        const userMembership = await db.query.organizationUsers.findFirst({
          where: and(
            eq(organizationUsers.organizationId, organizationId),
            eq(organizationUsers.userId, userId),
            inArray(organizationUsers.role, ['owner', 'admin'])
          )
        });
        
        if (!userMembership) {
          return res.status(403).json({ message: "Acesso negado para adicionar usuários" });
        }
      }

      const userIdToAdd = parseInt(req.body.userId);
      const userRole = req.body.role || "member";

      // Verificar se o usuário existe
      const user = await db.query.users.findFirst({
        where: eq(users.id, userIdToAdd)
      });

      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      // Verificar se o usuário já está na organização
      const existingMembership = await db.query.organizationUsers.findFirst({
        where: and(
          eq(organizationUsers.organizationId, organizationId),
          eq(organizationUsers.userId, userIdToAdd)
        )
      });

      if (existingMembership) {
        return res.status(400).json({ message: "Usuário já é membro desta organização" });
      }

      // Adicionar usuário à organização
      const [membership] = await db.insert(organizationUsers).values({
        organizationId,
        userId: userIdToAdd,
        role: userRole
      }).returning();

      res.status(201).json(membership);
    } catch (error) {
      console.error("Error adding user to organization:", error);
      res.status(500).json({ message: "Erro ao adicionar usuário à organização" });
    }
  });

  // Remover usuário da organização
  app.delete(`${apiPrefix}/organizations/:orgId/users/:userId`, isAuthenticated, async (req: Request, res: Response) => {
    try {
      const organizationId = parseInt(req.params.orgId);
      const userIdToRemove = parseInt(req.params.userId);
      const userId = req.session.userId ? parseInt(req.session.userId) : 0;
      
      // Verificar permissão - usuário precisa ser admin ou owner/admin da organização
      if (req.session.userRole !== 'admin') {
        const userMembership = await db.query.organizationUsers.findFirst({
          where: and(
            eq(organizationUsers.organizationId, organizationId),
            eq(organizationUsers.userId, userId),
            inArray(organizationUsers.role, ['owner', 'admin'])
          )
        });
        
        if (!userMembership) {
          return res.status(403).json({ message: "Acesso negado para remover usuários" });
        }
        
        // Verificar se está tentando remover o próprio owner
        const targetMembership = await db.query.organizationUsers.findFirst({
          where: and(
            eq(organizationUsers.userId, userIdToRemove),
            eq(organizationUsers.organizationId, organizationId)
          )
        });
        
        if (targetMembership?.role === "owner" && userMembership.role !== "owner") {
          return res.status(403).json({ message: "Apenas o proprietário pode remover outro proprietário" });
        }
      }

      // Remover usuário da organização
      await db.delete(organizationUsers)
        .where(and(
          eq(organizationUsers.organizationId, organizationId),
          eq(organizationUsers.userId, userIdToRemove)
        ));

      res.json({ message: "Usuário removido da organização com sucesso" });
    } catch (error) {
      console.error("Error removing user from organization:", error);
      res.status(500).json({ message: "Erro ao remover usuário da organização" });
    }
  });

  // Atualizar papel do usuário na organização
  app.put(`${apiPrefix}/organizations/:orgId/users/:userId`, isAuthenticated, async (req: Request, res: Response) => {
    try {
      const organizationId = parseInt(req.params.orgId);
      const userIdToUpdate = parseInt(req.params.userId);
      const userId = req.session.userId ? parseInt(req.session.userId) : 0;
      const { role, active } = req.body;
      
      // Verificar permissão - usuário precisa ser admin ou owner/admin da organização
      if (req.session.userRole !== 'admin') {
        const userMembership = await db.query.organizationUsers.findFirst({
          where: and(
            eq(organizationUsers.organizationId, organizationId),
            eq(organizationUsers.userId, userId),
            inArray(organizationUsers.role, ['owner', 'admin'])
          )
        });
        
        if (!userMembership) {
          return res.status(403).json({ message: "Acesso negado para atualizar papéis de usuários" });
        }
        
        // Verificar se está tentando alterar o papel do owner
        if (role) {
          const targetMembership = await db.query.organizationUsers.findFirst({
            where: and(
              eq(organizationUsers.userId, userIdToUpdate),
              eq(organizationUsers.organizationId, organizationId)
            )
          });
          
          if (targetMembership?.role === "owner" && userMembership.role !== "owner") {
            return res.status(403).json({ message: "Apenas o proprietário pode alterar o papel de outro proprietário" });
          }
        }
      }

      // Construir objeto de atualização
      const updateData: any = {};
      if (role) updateData.role = role;
      if (active !== undefined) updateData.active = active;
      updateData.updatedAt = new Date();

      // Atualizar papel do usuário
      const [updatedMembership] = await db.update(organizationUsers)
        .set(updateData)
        .where(and(
          eq(organizationUsers.organizationId, organizationId),
          eq(organizationUsers.userId, userIdToUpdate)
        ))
        .returning();

      if (!updatedMembership) {
        return res.status(404).json({ message: "Usuário não encontrado na organização" });
      }

      res.json(updatedMembership);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Erro ao atualizar papel do usuário" });
    }
  });

  // Listar organizações do usuário atual
  app.get(`${apiPrefix}/my-organizations`, isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId ? parseInt(req.session.userId) : 0;
      
      // Para admin, retornar todas as organizações
      if (req.session.userRole === 'admin') {
        const allOrganizations = await db.query.organizations.findMany({
          orderBy: organizations.name
        });
        return res.json(allOrganizations);
      }
      
      // Para usuários normais, retornar apenas as organizações às quais pertencem
      const userOrganizations = await db.query.organizationUsers.findMany({
        where: and(
          eq(organizationUsers.userId, userId),
          eq(organizationUsers.active, true)
        ),
        with: {
          organization: true
        },
        orderBy: organizations.name
      });

      const result = userOrganizations
        .filter(membership => membership.organization.active)
        .map(membership => ({
          ...membership.organization,
          userRole: membership.role
        }));

      res.json(result);
    } catch (error) {
      console.error("Error fetching user organizations:", error);
      res.status(500).json({ message: "Erro ao buscar organizações do usuário" });
    }
  });
}