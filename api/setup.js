import { sql } from '../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // Proteção simples: requer um token de setup
  const { token } = req.body;
  if (token !== process.env.SETUP_TOKEN) {
    return res.status(403).json({ error: 'Token inválido.' });
  }

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS despesas (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        descricao VARCHAR(255) NOT NULL,
        valor DECIMAL(12,2) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS user_settings (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        salario DECIMAL(12,2) DEFAULT 0,
        custom_reserva DECIMAL(12,2),
        custom_reserva_label VARCHAR(100) DEFAULT 'Reserva',
        custom_resto_label VARCHAR(100) DEFAULT 'Resto'
      )
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_despesas_user ON despesas(user_id)`;

    return res.status(200).json({ ok: true, message: 'Tabelas criadas com sucesso!' });
  } catch (error) {
    console.error('Setup error:', error);
    return res.status(500).json({ error: 'Erro ao criar tabelas.', details: error.message });
  }
}
