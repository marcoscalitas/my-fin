import { getSession } from '../../lib/session.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const session = await getSession(req, res);

  if (!session.userId) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  return res.status(200).json({
    user: {
      id: session.userId,
      name: session.userName,
      email: session.userEmail,
    },
  });
}
