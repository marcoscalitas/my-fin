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
          SELECT salario, custom_reserva, custom_reserva_label, custom_resto_label
          FROM user_settings WHERE user_id = ${userId}
        `;

        if (result.rows.length === 0) {
          return res.status(200).json({
            settings: { salario: 0, custom_reserva: null, custom_reserva_label: 'Reserva', custom_resto_label: 'Resto' },
          });
        }

        return res.status(200).json({ settings: result.rows[0] });
      }

      case 'PUT': {
        const { salario, custom_reserva, custom_reserva_label, custom_resto_label } = req.body;

        await sql`
          INSERT INTO user_settings (user_id, salario, custom_reserva, custom_reserva_label, custom_resto_label)
          VALUES (
            ${userId},
            ${salario != null ? parseFloat(salario) : 0},
            ${custom_reserva != null ? parseFloat(custom_reserva) : null},
            ${custom_reserva_label || 'Reserva'},
            ${custom_resto_label || 'Resto'}
          )
          ON CONFLICT (user_id) DO UPDATE SET
            salario = EXCLUDED.salario,
            custom_reserva = EXCLUDED.custom_reserva,
            custom_reserva_label = EXCLUDED.custom_reserva_label,
            custom_resto_label = EXCLUDED.custom_resto_label
        `;

        return res.status(200).json({ ok: true });
      }

      default:
        return res.status(405).json({ error: 'Método não permitido' });
    }
  } catch (error) {
    console.error('Settings error:', error);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
}
