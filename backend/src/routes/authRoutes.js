import { Router } from 'express';
import { randomUUID, randomBytes } from 'node:crypto';
import { z } from 'zod';
import { rateLimit } from 'express-rate-limit';
import { one } from '../config/store.js';
import { success } from '../utils/apiResponse.js';
import { check } from '../utils/httpError.js';
import { hashPassword, verifyPassword, publicUser, tokenHash } from '../services/authService.js';

const credentials = z.object({ email: z.email().max(254).transform(v => v.toLowerCase()), password: z.string().min(10).max(128) });
const register = credentials.extend({ name: z.string().trim().min(2).max(100) });
export function authRoutes(db, config, auth, mailer = {configured:false}) {
  const router = Router();
  const limited = rateLimit({ windowMs: 900000, limit: config.NODE_ENV === 'test' ? 200 : 30, message: { success: false, message: 'Too many attempts. Please try again later.' } });
  router.post('/register', limited, async (req, res) => {
    const body = register.parse(req.body);
    check(!await one(db, 'SELECT id FROM users WHERE email=$1', [body.email]), 409, 'An account with this email already exists.');
    const user = await one(db, 'INSERT INTO users(id,name,email,password_hash) VALUES($1,$2,$3,$4) RETURNING *', [randomUUID(), body.name, body.email, await hashPassword(body.password)]);
    return success(res, 'Your account is ready.', await auth.createSession(user, res), 201);
  });
  router.post('/login', limited, async (req, res) => {
    const body = credentials.parse(req.body);
    const user = await one(db, 'SELECT * FROM users WHERE email=$1', [body.email]);
    // Apply comparable password work even for an unknown account.
    const dummy = '00000000000000000000000000000000:' + '00'.repeat(64);
    const valid = await verifyPassword(body.password, user?.password_hash || dummy);
    check(user && valid, 401, 'Email or password is incorrect.');
    return success(res, 'Welcome back.', await auth.createSession(user, res));
  });
  router.get('/me', auth.authenticate, (req, res) => success(res, 'Account loaded.', publicUser(req.user)));
  router.post('/logout', auth.authenticate, async (req, res) => {
    await db.query('DELETE FROM sessions WHERE id=$1', [req.sessionId]);
    res.clearCookie('seo_session', { httpOnly:true, sameSite:'lax', secure:config.NODE_ENV==='production', path:'/' });
    success(res, 'You are logged out.');
  });
  router.post('/forgot-password', limited, async (req, res) => {
    const { email } = z.object({ email: z.email().transform(v => v.toLowerCase()) }).parse(req.body);
    check(config.NODE_ENV !== 'production' || mailer.configured, 503, 'Password reset email delivery is not configured. Contact support.');
    const user = await one(db, 'SELECT id FROM users WHERE email=$1', [email]);
    let resetUrl;
    if (user) {
      const token = randomBytes(32).toString('hex');
      await db.query('DELETE FROM password_resets WHERE user_id=$1', [user.id]);
      await db.query("INSERT INTO password_resets(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '30 minutes')", [tokenHash(token), user.id]);
      resetUrl = `${config.FRONTEND_ORIGIN}/reset-password?token=${token}`;
      if(mailer.configured){
        try{await mailer.sendReset(email,resetUrl);}
        catch{await db.query('DELETE FROM password_resets WHERE token_hash=$1',[tokenHash(token)]);check(false,503,'The email service is unavailable. Please try again later.');}
      }
    }
    if(mailer.configured)success(res,'If the account exists, a reset link has been emailed. It expires in 30 minutes.');
    else success(res, 'Local development: use the reset link below if the account exists. Links expire in 30 minutes.', { resetUrl });
  });
  router.post('/reset-password', limited, async (req, res) => {
    const body = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/), password: z.string().min(10).max(128) }).parse(req.body);
    const passwordHash=await hashPassword(body.password);
    const reset = await one(db, 'DELETE FROM password_resets WHERE token_hash=$1 AND expires_at>now() RETURNING user_id', [tokenHash(body.token)]);
    check(reset, 400, 'This reset link is invalid or expired.');
    await db.query('UPDATE users SET password_hash=$1,updated_at=now() WHERE id=$2', [passwordHash, reset.user_id]);
    await db.query('DELETE FROM sessions WHERE user_id=$1', [reset.user_id]);
    success(res, 'Password updated. Please log in.');
  });
  return router;
}

