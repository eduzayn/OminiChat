import pg from 'pg';
const { Pool } = pg;

async function applyDatabaseChanges() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Iniciando criação de tabelas...');
    
    // Criar tabela de organizações
    await pool.query(`
      CREATE TABLE IF NOT EXISTS organizations (
        id SERIAL PRIMARY KEY,
        uuid UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        schema TEXT NOT NULL UNIQUE,
        active BOOLEAN DEFAULT TRUE,
        logo TEXT,
        primary_color TEXT DEFAULT '#1E40AF',
        plan_type TEXT DEFAULT 'basic',
        support_email TEXT,
        settings JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now()
      );
    `);
    console.log('Tabela "organizations" criada com sucesso!');
    
    // Criar tabela de usuários da organização
    await pool.query(`
      CREATE TABLE IF NOT EXISTS organization_users (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER NOT NULL REFERENCES organizations(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        role TEXT NOT NULL DEFAULT 'member',
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now()
      );
    `);
    console.log('Tabela "organization_users" criada com sucesso!');
    
    console.log('Todas as alterações aplicadas com sucesso!');
    
  } catch (error) {
    console.error('Erro ao aplicar alterações no banco de dados:', error);
  } finally {
    await pool.end();
  }
}

applyDatabaseChanges();