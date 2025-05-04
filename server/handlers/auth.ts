import { Express } from "express";
import { db } from "@db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { compareSync, hashSync } from "bcrypt";
import { z } from "zod";

// Validation schema for login
const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

// Middleware to check if user is authenticated
function isAuthenticated(req: any, res: any, next: any) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  next();
}

export function registerAuthRoutes(app: Express, apiPrefix: string) {
  // Login route
  app.post(`${apiPrefix}/auth/login`, async (req, res) => {
    try {
      // Validate request body
      const validation = loginSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid login data", errors: validation.error.errors });
      }
      
      const { username, password } = validation.data;
      
      // Find user by username
      const user = await db.query.users.findFirst({
        where: eq(users.username, username)
      });
      
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      // Check password
      if (!compareSync(password, user.password)) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      // Create session
      if (req.session) {
        req.session.userId = user.id;
        req.session.userRole = user.role;
      }
      
      // Return user data (excluding password)
      const { password: _, ...userData } = user;
      
      return res.status(200).json(userData);
      
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Logout route
  app.post(`${apiPrefix}/auth/logout`, (req, res) => {
    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({ message: "Error logging out" });
        }
        
        res.clearCookie("connect.sid");
        return res.status(200).json({ message: "Logged out successfully" });
      });
    } else {
      return res.status(200).json({ message: "Already logged out" });
    }
  });
  
  // Get current user
  app.get(`${apiPrefix}/auth/me`, async (req, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await db.query.users.findFirst({
        where: eq(users.id, req.session.userId)
      });
      
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      
      // Return user data (excluding password)
      const { password, ...userData } = user;
      
      return res.status(200).json(userData);
      
    } catch (error) {
      console.error("Auth check error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Get all agents (for assignment)
  app.get(`${apiPrefix}/users/agents`, isAuthenticated, async (req, res) => {
    try {
      // Buscar usuários com papel de agente ou admin
      const agents = await db.select({
        id: users.id,
        name: users.name,
        username: users.username,
        role: users.role,
        avatarUrl: users.avatarUrl,
        createdAt: users.createdAt
      })
      .from(users)
      .where(
        eq(users.role, "agent")
      );
      
      return res.status(200).json(agents);
      
    } catch (error) {
      console.error("Error fetching agents:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
}
