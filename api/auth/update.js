import { sql } from '../../lib/db.js';
import { getSession } from '../../lib/session.js';

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const session = await getSession(req, res);
    if (!session.userId) {
      return res.status(401).json({ error: 'Não autenticado.' });
    }

    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Nome e email são obrigatórios.' });
    }

    if (name.length < 2 || name.length > 100) {
      return res.status(400).json({ error: 'Nome deve ter entre 2 e 100 caracteres.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Email inválido.' });
    }

    // Verificar se o email já está em uso por outro usuário
    const existing = await sql`
      SELECT id FROM users WHERE email = ${email} AND id != ${session.userId}
    `;
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Este email já está em uso por outra conta.' });
    }

    await sql`
      UPDATE users SET name = ${name}, email = ${email} WHERE id = ${session.userId}
    `;

    // Atualizar sessão
    session.userName = name;
    session.userEmail = email;
    await session.save();

    return res.status(200).json({ user: { id: session.userId, name, email } });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
}
