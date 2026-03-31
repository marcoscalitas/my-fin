import { getIronSession } from 'iron-session';

const sessionOptions = {
  password: process.env.SESSION_SECRET,
  cookieName: 'myfin_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 dias
  },
};

export async function getSession(req, res) {
  return getIronSession(req, res, sessionOptions);
}
