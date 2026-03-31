import { sql } from '../../lib/db.js';
import { getSession } from '../../lib/session.js';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
    }

    const result = await sql`SELECT id, name, email, password_hash FROM users WHERE email = ${email}`;

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Email ou senha inválidos.' });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      return res.status(401).json({ error: 'Email ou senha inválidos.' });
    }

    const session = await getSession(req, res);
    session.userId = user.id;
    session.userName = user.name;
    session.userEmail = user.email;
    await session.save();

    return res.status(200).json({ user: { id: user.id, name: user.name, email: user.email } });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
}
