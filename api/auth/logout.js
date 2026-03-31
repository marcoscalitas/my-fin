import { getSession } from '../../lib/session.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const session = await getSession(req, res);
  session.destroy();

  return res.status(200).json({ ok: true });
}
