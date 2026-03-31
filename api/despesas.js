import { sql } from '../lib/db.js';
import { getSession } from '../lib/session.js';

export default async function handler(req, res) {
  const session = await getSession(req, res);

  if (!session.userId) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  const userId = session.userId;

  try {
    switch (req.method) {
      case 'GET': {
        const result = await sql`
          SELECT id, descricao, valor FROM despesas
          WHERE user_id = ${userId}
          ORDER BY created_at ASC
        `;
        return res.status(200).json({ despesas: result.rows });
      }

      case 'POST': {
        const { descricao, valor } = req.body;

        if (!descricao || valor == null) {
          return res.status(400).json({ error: 'Descrição e valor são obrigatórios.' });
        }

        const result = await sql`
          INSERT INTO despesas (user_id, descricao, valor)
          VALUES (${userId}, ${descricao}, ${parseFloat(valor)})
          RETURNING id, descricao, valor
        `;
        return res.status(201).json({ despesa: result.rows[0] });
      }

      case 'PUT': {
        const { id, descricao, valor } = req.body;

        if (!id || !descricao || valor == null) {
          return res.status(400).json({ error: 'ID, descrição e valor são obrigatórios.' });
        }

        const result = await sql`
          UPDATE despesas SET descricao = ${descricao}, valor = ${parseFloat(valor)}
          WHERE id = ${id} AND user_id = ${userId}
          RETURNING id, descricao, valor
        `;

        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Despesa não encontrada.' });
        }

        return res.status(200).json({ despesa: result.rows[0] });
      }

      case 'DELETE': {
        const { id } = req.body;

        if (!id) {
          return res.status(400).json({ error: 'ID é obrigatório.' });
        }

        await sql`DELETE FROM despesas WHERE id = ${id} AND user_id = ${userId}`;
        return res.status(200).json({ ok: true });
      }

      default:
        return res.status(405).json({ error: 'Método não permitido' });
    }
  } catch (error) {
    console.error('Despesas error:', error);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
}
