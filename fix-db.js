import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;
const client = postgres(connectionString);
const db = drizzle(client);

async function createOpportunitiesTable() {
  try {
    // Criar a tabela opportunities
    await client`
      CREATE TABLE IF NOT EXISTS opportunities (
        id SERIAL PRIMARY KEY,
        contact_id INTEGER NOT NULL REFERENCES contacts(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        title TEXT NOT NULL,
        value DECIMAL(10, 2) NOT NULL,
        stage TEXT NOT NULL DEFAULT 'prospecting',
        status TEXT NOT NULL DEFAULT 'open',
        description TEXT,
        expected_close_date TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;
    console.log('Tabela opportunities criada com sucesso!');

    // Atualizar o botão no componente CRM
    console.log('Esquema do banco de dados atualizado com sucesso!');
    
    process.exit(0);
  } catch (error) {
    console.error('Erro ao criar tabela opportunities:', error);
    process.exit(1);
  }
}

createOpportunitiesTable();