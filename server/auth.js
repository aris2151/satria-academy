import { createClient } from '@supabase/supabase-js';
import { db } from './db.js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be configured before starting the API.');
}

const authClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

export async function requireUser(req, res, next) {
  const authorization = req.get('authorization') || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) return res.status(401).json({ error: 'Silakan masuk untuk melanjutkan.' });

  try {
    const { data, error } = await authClient.auth.getUser(match[1]);
    if (error || !data.user) return res.status(401).json({ error: 'Sesi login tidak valid atau sudah berakhir.' });
    req.authUser = data.user;
    req.user = {
      id: data.user.id,
      email: data.user.email || '',
      name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || ''
    };
    return next();
  } catch (error) {
    return next(error);
  }
}

export async function requireAdmin(req, res, next) {
  try {
    const result = await db.query('SELECT 1 FROM public.admin_users WHERE user_id = $1 LIMIT 1', [req.authUser.id]);
    if (!result.rows.length) return res.status(403).json({ error: 'Akses admin diperlukan.' });
    return next();
  } catch (error) {
    return next(error);
  }
}
