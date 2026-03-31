import { sql } from '../../lib/db.js';
import { getSession } from '../../lib/session.js';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const session = await getSession(req, res);
    if (!session.userId) {
      return res.status(401).json({ error: 'Não autenticado.' });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias.' });
    }

    // Validação da nova senha
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'A nova senha deve ter pelo menos 8 caracteres.' });
    }
    if (!/[A-Z]/.test(newPassword)) {
      return res.status(400).json({ error: 'A nova senha deve conter pelo menos uma letra maiúscula.' });
    }
    if (!/[a-z]/.test(newPassword)) {
      return res.status(400).json({ error: 'A nova senha deve conter pelo menos uma letra minúscula.' });
    }
    if (!/[0-9]/.test(newPassword)) {
      return res.status(400).json({ error: 'A nova senha deve conter pelo menos um número.' });
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword)) {
      return res.status(400).json({ error: 'A nova senha deve conter pelo menos um caractere especial.' });
    }

    // Buscar hash atual
    const result = await sql`SELECT password_hash FROM users WHERE id = ${session.userId}`;
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const valid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Senha atual incorreta.' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await sql`UPDATE users SET password_hash = ${newHash} WHERE id = ${session.userId}`;

    return res.status(200).json({ ok: true, message: 'Senha alterada com sucesso.' });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
}
