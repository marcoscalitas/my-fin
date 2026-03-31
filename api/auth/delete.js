import { sql } from '../../lib/db.js';
import { getSession } from '../../lib/session.js';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const session = await getSession(req, res);
    if (!session.userId) {
      return res.status(401).json({ error: 'Não autenticado.' });
    }

    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Senha é obrigatória para confirmar a exclusão.' });
    }

    // Verificar senha antes de deletar
    const result = await sql`SELECT password_hash FROM users WHERE id = ${session.userId}`;
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const valid = await bcrypt.compare(password, result.rows[0].password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Senha incorreta.' });
    }

    // Deletar em cascata: settings → despesas → usuário
    await sql`DELETE FROM user_settings WHERE user_id = ${session.userId}`;
    await sql`DELETE FROM despesas WHERE user_id = ${session.userId}`;
    await sql`DELETE FROM users WHERE id = ${session.userId}`;

    // Destruir sessão
    session.destroy();
    await session.save();

    return res.status(200).json({ ok: true, message: 'Conta excluída com sucesso.' });
  } catch (error) {
    console.error('Delete account error:', error);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
}
