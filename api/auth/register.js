import { sql } from '../../lib/db.js';
import { getSession } from '../../lib/session.js';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nome, email e senha são obrigatórios.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'A senha deve ter pelo menos 8 caracteres.' });
    }

    if (!/[A-Z]/.test(password)) {
      return res.status(400).json({ error: 'A senha deve conter pelo menos uma letra maiúscula.' });
    }
    if (!/[a-z]/.test(password)) {
      return res.status(400).json({ error: 'A senha deve conter pelo menos uma letra minúscula.' });
    }
    if (!/[0-9]/.test(password)) {
      return res.status(400).json({ error: 'A senha deve conter pelo menos um número.' });
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      return res.status(400).json({ error: 'A senha deve conter pelo menos um caractere especial.' });
    }

    const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Este email já está cadastrado.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await sql`
      INSERT INTO users (name, email, password_hash)
      VALUES (${name}, ${email}, ${passwordHash})
      RETURNING id, name, email
    `;

    const user = result.rows[0];

    // Criar settings padrão
    await sql`
      INSERT INTO user_settings (user_id, salario, custom_reserva_label, custom_resto_label)
      VALUES (${user.id}, 0, 'Reserva', 'Resto')
    `;

    // Criar sessão
    const session = await getSession(req, res);
    session.userId = user.id;
    session.userName = user.name;
    session.userEmail = user.email;
    await session.save();

    return res.status(201).json({ user: { id: user.id, name: user.name, email: user.email } });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
}
