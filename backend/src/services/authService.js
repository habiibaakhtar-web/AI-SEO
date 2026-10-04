import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import jwt from 'jsonwebtoken';
import { one } from '../config/store.js';
import { check } from '../utils/httpError.js';

const scrypt = promisify(scryptCallback);
export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = await scrypt(password, salt, 64);
  return `${salt}:${hash.toString('hex')}`;
}
export async function verifyPassword(password, saved) {
  const [salt, hex] = saved.split(':');
  const hash = await scrypt(password, salt, 64);
  const expected = Buffer.from(hex, 'hex');
  return hash.length === expected.length && timingSafeEqual(hash, expected);
}
export const publicUser = user => ({ id: user.id, name: user.name, email: user.email });
export const tokenHash = token => createHash('sha256').update(token).digest('hex');

export function authService(db, config) {
  async function createSession(user, res) {
    const id = randomUUID();
    await db.query("INSERT INTO sessions(id,user_id,expires_at) VALUES($1,$2,now()+interval '7 days')", [id, user.id]);
    const token = jwt.sign({ sid: id }, config.JWT_SECRET, { subject: user.id, expiresIn: '7d', algorithm: 'HS256' });
    res.cookie('seo_session', token, { httpOnly: true, secure: config.NODE_ENV === 'production', sameSite: 'lax', maxAge: 7*86400000, path: '/' });
    return publicUser(user);
  }
  async function authenticate(req, res, next) {
    try {
      const token = req.cookies?.seo_session;
      check(token, 401, 'Please log in to continue.');
      const payload = jwt.verify(token, config.JWT_SECRET, { algorithms: ['HS256'] });
      const user = await one(db, 'SELECT u.id,u.name,u.email FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.id=$1 AND u.id=$2 AND s.expires_at>now()', [payload.sid, payload.sub]);
      check(user, 401, 'Your session has expired. Please log in.');
      req.user = user; req.sessionId = payload.sid; next();
    } catch { next(Object.assign(new Error('Please log in to continue.'), { status: 401 })); }
  }
  return { createSession, authenticate };
}

