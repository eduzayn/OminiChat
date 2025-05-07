import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import fileUpload from 'express-fileupload';
import { pool } from '@db';

// Estender a sessão
declare module 'express-session' {
  interface SessionData {
    userId: number;
    userRole: string;
    username: string;
  }
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Configurar middleware de upload de arquivos
app.use(fileUpload({
  useTempFiles: true,
  tempFileDir: '/tmp/',
  limits: { fileSize: 10 * 1024 * 1024 }, // limite de 10MB
  abortOnLimit: true,
  createParentPath: true
}));

// Configure session middleware
const PgSession = connectPgSimple(session);
app.use(session({
  store: new PgSession({
    pool: pool,
    tableName: 'session', // Use default table name
    createTableIfMissing: true // Cria a tabela se não existir
  }),
  name: 'connect.sid', // Usa o mesmo nome do cookie padrão para evitar conflitos
  secret: process.env.SESSION_SECRET || 'omnichannel-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Sempre falso para desenvolvimento 
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
    sameSite: 'lax', // Melhor compatibilidade com navegadores
    path: '/' // Garante que o cookie está disponível em todo o site
  }
}));

// Middleware de debug para sessão
app.use((req: any, res, next) => {
  if (req.path.startsWith('/api')) {
    console.log(`Session debug: ${req.path}, userId: ${req.session?.userId || 'none'}`);
  }
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
