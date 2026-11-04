import { createClient } from 'npm:@supabase/supabase-js@2';

const requiredEnvironment = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'];
const missingEnvironment = requiredEnvironment.filter(key => !Deno.env.get(key));
if (missingEnvironment.length) {
  throw new Error(`Missing Supabase function environment variables: ${missingEnvironment.join(', ')}`);
}

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const allowedOrigins = new Set((Deno.env.get('CORS_ORIGINS') || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean));
if (!allowedOrigins.size) throw new Error('CORS_ORIGINS must contain at least one trusted frontend origin.');

const service = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});
const authClient = createClient(supabaseUrl, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const noCacheHeaders = { 'Cache-Control': 'no-store, private', Pragma: 'no-cache' };
const allowedMethods = {
  '/healthz': ['GET'],
  '/inquiries': ['POST'],
  '/materials': ['GET'],
  '/practice-quizzes': ['GET', 'POST'],
  '/recruitment-schedule': ['GET'],
  '/site-content': ['GET'],
  '/admin/inquiries': ['GET', 'POST'],
  '/admin/materials': ['GET', 'POST'],
  '/admin/overview': ['GET'],
  '/admin/practice-quizzes': ['GET', 'POST'],
  '/admin/practice-tokens': ['GET', 'POST'],
  '/admin/recruitment-schedule': ['GET', 'POST'],
  '/admin/site-content': ['GET', 'POST'],
  '/student/dashboard': ['GET', 'POST'],
  '/student/practice-quizzes': ['POST']
};
const adminRoutes = new Set([
  '/admin/inquiries',
  '/admin/materials',
  '/admin/overview',
  '/admin/practice-quizzes',
  '/admin/practice-tokens',
  '/admin/recruitment-schedule',
  '/admin/site-content'
]);
const studentRoutes = new Set(['/student/dashboard', '/student/practice-quizzes']);
const inquiryStatuses = ['Baru', 'Dihubungi', 'Konsultasi', 'Terdaftar', 'Tidak lanjut'];
const scheduleStatuses = ['Pendaftaran dibuka', 'Menunggu pengumuman', 'Perlu verifikasi', 'Pendaftaran ditutup'];
const materialTypes = new Set(['pdf', 'image', 'video', 'link']);
const settingKeys = [
  'announcement',
  'hero_eyebrow',
  'hero_title_line1',
  'hero_title_line2',
  'hero_title_line3',
  'hero_description',
  'hero_image_url',
  'contact_whatsapp'
];
const defaultSettings = {
  announcement: 'SATRIA ACADEMY • DISCIPLINE / READINESS / HONOR',
  hero_eyebrow: 'Military & Police Academy Prep',
  hero_title_line1: 'YOUR FUTURE.',
  hero_title_line2: 'YOUR HONOR.',
  hero_title_line3: 'YOUR MISSION.',
  hero_description: 'Bimbingan persiapan seleksi TNI–Polri melalui pembelajaran akademik, psikotes, pembinaan fisik bertahap, dan evaluasi rutin. Bangun kesiapanmu lewat proses yang disiplin dan terukur.',
  hero_image_url: '',
  contact_whatsapp: '6281225044520'
};
const settingLimits = {
  announcement: 160,
  hero_eyebrow: 100,
  hero_title_line1: 80,
  hero_title_line2: 80,
  hero_title_line3: 80,
  hero_description: 700,
  hero_image_url: 500,
  contact_whatsapp: 24
};
const starterTasks = [
  ['Latihan numerik 20 menit', 'Akademik', 1],
  ['Latihan lari ringan dan pemanasan', 'Fisik', 2],
  ['Kerjakan 10 soal wawasan kebangsaan', 'Wawasan', 3]
];

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function jsonResponse(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...headers
    }
  });
}

function fail(status, message) {
  throw new HttpError(status, message);
}

function assertNoError(error) {
  if (error) throw new Error(error.message || 'Supabase database request failed.');
}

async function getData(query) {
  const { data, error } = await query;
  assertNoError(error);
  return data || [];
}

async function getOne(query) {
  const { data, error } = await query;
  assertNoError(error);
  return data;
}

async function getCount(query) {
  const { count, error } = await query;
  assertNoError(error);
  return count || 0;
}

async function readJson(request) {
  try {
    const body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) fail(400, 'Format permintaan tidak valid.');
    return body;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    fail(400, 'Format JSON tidak valid.');
  }
}

function clean(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateText, days) {
  const date = new Date(`${dateText}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function normalizeToken(value) {
  return typeof value === 'string' ? value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 32) : '';
}

async function hashToken(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

function createToken() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const chars = Array.from(bytes, byte => alphabet[byte % alphabet.length]).join('');
  return `SAT-${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}`;
}

function routeFromRequest(request) {
  const pathname = new URL(request.url).pathname;
  const marker = '/functions/v1/satria-api';
  const markerIndex = pathname.indexOf(marker);
  if (markerIndex < 0) return '/';
  const route = pathname.slice(markerIndex + marker.length).replace(/\/+$/, '') || '/';
  return route.startsWith('/api/') ? route.slice(4) : route;
}

async function authenticate(request, requireAdmin) {
  const match = (request.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/i);
  if (!match) fail(401, 'Silakan masuk untuk melanjutkan.');

  const { data, error } = await authClient.auth.getUser(match[1]);
  if (error || !data.user) fail(401, 'Sesi login tidak valid atau sudah berakhir.');
  const user = data.user;

  if (requireAdmin) {
    const admin = await getOne(
      service.from('admin_users').select('user_id').eq('user_id', user.id).maybeSingle()
    );
    if (!admin) fail(403, 'Akses admin diperlukan.');
  }

  return {
    id: user.id,
    email: user.email || '',
    name: user.user_metadata?.full_name || user.user_metadata?.name || ''
  };
}

async function publicInquiry(body) {
  if (clean(body.website, 200)) return jsonResponse({ ok: true }, 202);
  const fullName = clean(body.full_name, 100);
  const phone = clean(body.phone, 24).replace(/[\s().-]/g, '');
  const targetPath = clean(body.target_path, 80);
  const packageName = clean(body.package_name, 80);
  const city = clean(body.city, 100);
  const message = clean(body.message, 500);

  if (!fullName || fullName.length < 2) fail(400, 'Nama lengkap wajib diisi.');
  if (!/^\+?[0-9]{9,16}$/.test(phone)) fail(400, 'Nomor HP tidak valid. Periksa kembali nomor yang dimasukkan.');
  if (!targetPath || !packageName) fail(400, 'Target seleksi dan paket pilihan wajib diisi.');
  if (body.consent !== true) fail(400, 'Persetujuan penyimpanan data wajib diberikan.');

  const inquiry = await getOne(service.from('admissions_inquiries')
    .insert({
      full_name: fullName,
      phone,
      target_path: targetPath,
      package_name: packageName,
      city,
      message
    })
    .select('id,created_at')
    .single());
  return jsonResponse({ ok: true, inquiry }, 201);
}

async function enforceInquiryRateLimit(request) {
  const forwardedFor = request.headers.get('x-forwarded-for') || '';
  const clientIp = request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-real-ip') ||
    forwardedFor.split(',')[0].trim();
  if (!clientIp) return;
  const rateKey = await hashToken(`${serviceRoleKey}:${clientIp}`);
  const allowed = await getOne(service.rpc('consume_edge_rate_limit', {
    p_key: rateKey,
    p_limit: 10,
    p_window_seconds: 900
  }));
  if (!allowed) fail(429, 'Terlalu banyak permintaan. Silakan coba lagi beberapa saat.');
}

async function publicMaterials() {
  const materials = await getData(service.from('learning_materials')
    .select('id,title,category,description,resource_url,resource_type,updated_at')
    .eq('is_published', true)
    .order('category', { ascending: true })
    .order('updated_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(100));
  return jsonResponse({ materials });
}

async function publicPracticeQuizzes(request, body) {
  if (request.method === 'GET') {
    const today = todayUtc();
    const quizzes = await getData(service.from('practice_quizzes')
      .select('id,slug,title,category,description,week_label,week_start,week_end,duration_minutes,questions')
      .eq('is_published', true)
      .gte('week_end', today)
      .order('week_start', { ascending: true })
      .order('id', { ascending: false })
      .limit(50));
    return jsonResponse({
      quizzes: quizzes.map(({ questions, ...quiz }) => ({
        ...quiz,
        question_count: Array.isArray(questions) ? questions.length : 0,
        upcoming: today < quiz.week_start,
        is_open: today >= quiz.week_start && today <= quiz.week_end
      }))
    });
  }

  const quizId = Number(body.quiz_id);
  const token = normalizeToken(body.token);
  if (!Number.isSafeInteger(quizId) || quizId < 1 || token.length < 12 || token.length > 24) {
    fail(400, 'Masukkan token akses latihan mingguan yang valid.');
  }
  const tokenHash = await hashToken(token);
  const tokenRecord = await getOne(service.from('practice_quiz_tokens')
    .select('quiz_id')
    .eq('quiz_id', quizId)
    .eq('token_hash', tokenHash)
    .is('revoked_at', null)
    .gte('expires_at', new Date().toISOString())
    .maybeSingle());
  if (!tokenRecord) {
    fail(403, 'Token salah, sudah dicabut/kedaluwarsa, atau latihan tidak sedang aktif.');
  }

  const quiz = await getOne(service.from('practice_quizzes')
    .select('id,slug,title,category,description,week_label,week_start,week_end,duration_minutes,questions')
    .eq('id', quizId)
    .eq('is_published', true)
    .maybeSingle());
  const today = todayUtc();
  if (!quiz || today < quiz.week_start || today > quiz.week_end) {
    fail(403, 'Token salah, sudah dicabut/kedaluwarsa, atau latihan tidak sedang aktif.');
  }
  return jsonResponse({
    ok: true,
    quiz: {
      ...quiz,
      questions: (quiz.questions || []).map(item => ({ question: item.question, options: item.options }))
    }
  }, 200, noCacheHeaders);
}

async function publicSchedules() {
  const schedules = await getData(service.from('recruitment_schedule')
    .select('id,slug,institution,title,pathway,cycle,status,date_label,date_detail,summary,official_url,is_verified,checked_at,updated_at')
    .eq('is_published', true)
    .order('institution', { ascending: true }));
  const priority = new Map([
    ['Pendaftaran dibuka', 0],
    ['Menunggu pengumuman', 1],
    ['Perlu verifikasi', 2],
    ['Pendaftaran ditutup', 3]
  ]);
  schedules.sort((a, b) => (priority.get(a.status) ?? 4) - (priority.get(b.status) ?? 4) ||
    a.institution.localeCompare(b.institution));
  return jsonResponse({ schedules });
}

async function publicSiteContent() {
  const rows = await getData(service.from('site_content')
    .select('content_key,content_value')
    .in('content_key', settingKeys));
  const settings = { ...defaultSettings };
  for (const row of rows) settings[row.content_key] = row.content_value;
  return jsonResponse({ settings });
}

async function healthCheck() {
  await getOne(service.from('site_content').select('content_key').limit(1).maybeSingle());
  return jsonResponse({ status: 'ok' });
}

async function adminInquiries(request, body) {
  if (request.method === 'GET') {
    const status = new URL(request.url).searchParams.get('status') || '';
    const query = service.from('admissions_inquiries')
      .select('id,full_name,phone,target_path,package_name,city,message,status,created_at,updated_at')
      .order('created_at', { ascending: false })
      .limit(300);
    const inquiries = await getData(status && inquiryStatuses.includes(status) ? query.eq('status', status) : query);
    const counts = await Promise.all(inquiryStatuses.map(async value => [
      value,
      await getCount(service.from('admissions_inquiries')
        .select('id', { count: 'exact', head: true })
        .eq('status', value))
    ]));
    return jsonResponse({ inquiries, counts: Object.fromEntries(counts) });
  }

  const id = Number(body.id);
  const status = typeof body.status === 'string' ? body.status : '';
  if (!Number.isSafeInteger(id) || id < 1 || !inquiryStatuses.includes(status)) {
    fail(400, 'ID atau status pendaftaran tidak valid.');
  }
  const inquiry = await getOne(service.from('admissions_inquiries')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id,status,updated_at')
    .maybeSingle());
  if (!inquiry) fail(404, 'Pendaftaran tidak ditemukan.');
  return jsonResponse({ ok: true, inquiry });
}

async function adminMaterials(request, body) {
  const columns = 'id,title,category,description,resource_url,resource_type,is_published,created_at,updated_at';
  if (request.method === 'GET') {
    const materials = await getData(service.from('learning_materials')
      .select(columns)
      .order('updated_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(200));
    return jsonResponse({ materials });
  }

  if (body.action === 'delete') {
    const id = Number(body.id);
    if (!Number.isSafeInteger(id) || id < 1) fail(400, 'ID materi tidak valid.');
    const deleted = await getOne(service.from('learning_materials')
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle());
    if (!deleted) fail(404, 'Materi tidak ditemukan.');
    return jsonResponse({ ok: true, deleted_id: deleted.id });
  }

  const id = Number(body.id || 0);
  const title = clean(body.title, 180);
  const category = clean(body.category, 80) || 'Umum';
  const description = clean(body.description, 1200);
  const resourceUrl = clean(body.resource_url, 1000);
  const resourceType = clean(body.resource_type, 20);
  const isPublished = body.is_published === true || body.is_published === 'true';
  if (!title || !resourceUrl || !materialTypes.has(resourceType)) {
    fail(400, 'Judul, tautan, dan jenis materi wajib diisi.');
  }
  try {
    if (new URL(resourceUrl).protocol !== 'https:') fail(400, 'Tautan materi harus menggunakan HTTPS.');
  } catch (error) {
    if (error instanceof HttpError) throw error;
    fail(400, 'Tautan materi wajib berupa URL HTTPS yang valid.');
  }
  const values = {
    title,
    category,
    description,
    resource_url: resourceUrl,
    resource_type: resourceType,
    is_published: isPublished,
    updated_at: new Date().toISOString()
  };
  if (id > 0) {
    const material = await getOne(service.from('learning_materials')
      .update(values)
      .eq('id', id)
      .select('id,title,category,description,resource_url,resource_type,is_published,updated_at')
      .maybeSingle());
    if (!material) fail(404, 'Materi tidak ditemukan.');
    return jsonResponse({ ok: true, material });
  }
  const material = await getOne(service.from('learning_materials')
    .insert(values)
    .select(columns)
    .single());
  return jsonResponse({ ok: true, material }, 201);
}

async function adminOverview() {
  const [
    students,
    attempts,
    quizzes,
    schedules,
    materials,
    inquiries,
    latestAttempts,
    latestStudents
  ] = await Promise.all([
    getCount(service.from('student_profiles').select('user_id', { count: 'exact', head: true }).neq('full_name', '')),
    getCount(service.from('quiz_attempts').select('id', { count: 'exact', head: true })),
    getCount(service.from('practice_quizzes').select('id', { count: 'exact', head: true }).eq('is_published', true)),
    getCount(service.from('recruitment_schedule').select('id', { count: 'exact', head: true }).eq('is_published', true)),
    getCount(service.from('learning_materials').select('id', { count: 'exact', head: true }).eq('is_published', true)),
    getCount(service.from('admissions_inquiries').select('id', { count: 'exact', head: true })),
    getData(service.from('quiz_attempts')
      .select('quiz_title,score,total,created_at')
      .order('created_at', { ascending: false })
      .limit(8)),
    getData(service.from('student_profiles')
      .select('full_name,target_path,city,updated_at')
      .neq('full_name', '')
      .order('updated_at', { ascending: false })
      .limit(8))
  ]);
  return jsonResponse({
    metrics: {
      students,
      attempts,
      published_quizzes: quizzes,
      published_schedules: schedules,
      published_materials: materials,
      inquiries
    },
    latest_attempts: latestAttempts,
    latest_students: latestStudents,
    note: 'Form minat disimpan setelah calon siswa memberikan persetujuan. Gunakan data hanya untuk menindaklanjuti konsultasi; jumlah siswa berasal dari profil akun yang terisi.'
  });
}

function validateQuestions(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 50) return 'Isi 1 sampai 50 soal.';
  for (let index = 0; index < value.length; index++) {
    const question = value[index];
    if (!question || typeof question.question !== 'string' || !question.question.trim() || question.question.length > 1200) {
      return `Teks soal nomor ${index + 1} wajib diisi (maksimal 1.200 karakter).`;
    }
    if (!Array.isArray(question.options) || question.options.length < 2 || question.options.length > 6 ||
        question.options.some(option => typeof option !== 'string' || !option.trim() || option.length > 400)) {
      return `Soal nomor ${index + 1} harus memiliki 2–6 pilihan jawaban yang terisi.`;
    }
    if (!Number.isInteger(question.answer) || question.answer < 0 || question.answer >= question.options.length) {
      return `Kunci jawaban soal nomor ${index + 1} tidak valid.`;
    }
    if (typeof (question.explanation || '') !== 'string' || (question.explanation || '').length > 1200) {
      return `Pembahasan soal nomor ${index + 1} terlalu panjang.`;
    }
  }
  return null;
}

async function adminPracticeQuizzes(request, body) {
  const columns = 'id,slug,title,category,description,week_label,week_start,week_end,duration_minutes,questions,is_published,created_at,updated_at';
  if (request.method === 'GET') {
    const quizzes = await getData(service.from('practice_quizzes')
      .select(columns)
      .order('week_start', { ascending: false })
      .order('id', { ascending: false })
      .limit(100));
    return jsonResponse({ quizzes });
  }

  const slug = clean(body.slug, 90).toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  const title = clean(body.title, 180);
  const category = clean(body.category, 80) || 'Akademik';
  const description = clean(body.description, 1200);
  const weekLabel = clean(body.week_label, 120);
  const weekStart = clean(body.week_start, 10);
  const weekEnd = clean(body.week_end, 10);
  const duration = Number(body.duration_minutes || 30);
  const questions = body.questions;
  const isPublished = body.is_published === true || body.is_published === 'true';
  const id = Number(body.id || 0);
  if (!slug || !title) fail(400, 'Slug dan judul latihan wajib diisi.');
  if (!validDate(weekStart) || !validDate(weekEnd) || weekEnd < weekStart) {
    fail(400, 'Tanggal mulai dan selesai harus valid; tanggal selesai tidak boleh sebelum tanggal mulai.');
  }
  if (!Number.isInteger(duration) || duration < 1 || duration > 240) fail(400, 'Durasi harus antara 1–240 menit.');
  const questionError = validateQuestions(questions);
  if (questionError) fail(400, questionError);
  const values = {
    slug,
    title,
    category,
    description,
    week_label: weekLabel,
    week_start: weekStart,
    week_end: weekEnd,
    duration_minutes: duration,
    questions,
    is_published: isPublished,
    updated_at: new Date().toISOString()
  };
  if (id > 0) {
    const { data, error } = await service.from('practice_quizzes')
      .update(values)
      .eq('id', id)
      .select(columns)
      .maybeSingle();
    if (error?.code === '23505') fail(409, 'Slug sudah digunakan. Ubah slug atau edit latihan yang sudah ada.');
    assertNoError(error);
    if (!data) fail(404, 'Latihan tidak ditemukan.');
    return jsonResponse({ ok: true, quiz: data });
  }
  const { data, error } = await service.from('practice_quizzes')
    .insert(values)
    .select(columns)
    .maybeSingle();
  if (error?.code === '23505') fail(409, 'Slug sudah digunakan. Ubah slug atau edit latihan yang sudah ada.');
  assertNoError(error);
  return jsonResponse({ ok: true, quiz: data }, 201);
}

async function adminPracticeTokens(request, body) {
  if (request.method === 'GET') {
    const quizId = Number(new URL(request.url).searchParams.get('quiz_id') || 0);
    let query = service.from('practice_quiz_tokens')
      .select('id,quiz_id,token_hint,label,created_at,expires_at,revoked_at')
      .order('created_at', { ascending: false })
      .limit(200);
    if (quizId > 0) query = query.eq('quiz_id', quizId);
    const tokens = await getData(query);
    const quizIds = [...new Set(tokens.map(token => token.quiz_id))];
    const quizzes = quizIds.length
      ? await getData(service.from('practice_quizzes').select('id,title').in('id', quizIds))
      : [];
    const titles = new Map(quizzes.map(quiz => [quiz.id, quiz.title]));
    return jsonResponse({
      tokens: tokens.map(token => ({
        ...token,
        quiz_title: titles.get(token.quiz_id) || '',
        is_active: !token.revoked_at && new Date(token.expires_at) >= new Date()
      }))
    });
  }

  if (body.action === 'revoke') {
    const id = Number(body.id);
    if (!Number.isSafeInteger(id) || id < 1) fail(400, 'ID token tidak valid.');
    const revoked = await getOne(service.from('practice_quiz_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', id)
      .is('revoked_at', null)
      .select('id')
      .maybeSingle());
    if (!revoked) fail(404, 'Token tidak ditemukan atau sudah dicabut.');
    return jsonResponse({ ok: true, message: 'Token berhasil dicabut.' });
  }
  if (body.action !== 'issue') fail(400, 'Aksi token tidak dikenal.');
  const quizId = Number(body.quiz_id);
  if (!Number.isSafeInteger(quizId) || quizId < 1) fail(400, 'Pilih latihan yang valid.');
  const quiz = await getOne(service.from('practice_quizzes')
    .select('id,title,week_end')
    .eq('id', quizId)
    .eq('is_published', true)
    .maybeSingle());
  if (!quiz) fail(404, 'Terbitkan latihan terlebih dahulu sebelum membuat token.');
  const token = createToken();
  const tokenHash = await hashToken(normalizeToken(token));
  const record = await getOne(service.from('practice_quiz_tokens')
    .insert({
      quiz_id: quizId,
      token_hash: tokenHash,
      token_hint: token.slice(-4),
      label: clean(body.label, 100) || 'Token latihan mingguan',
      expires_at: `${addDays(quiz.week_end, 1)}T00:00:00.000Z`,
      created_by: 'admin'
    })
    .select('id,quiz_id,token_hint,label,created_at,expires_at')
    .single());
  return jsonResponse({
    ok: true,
    token,
    record,
    warning: 'Simpan token sekarang. Demi keamanan, token lengkap tidak akan ditampilkan lagi.'
  }, 201, noCacheHeaders);
}

function officialRecruitmentUrl(value) {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    const officialHost = hostname === 'rekrutmen-tni.mil.id' ||
      hostname.endsWith('.rekrutmen-tni.mil.id') ||
      hostname === 'penerimaan.polri.go.id';
    return url.protocol === 'https:' && officialHost;
  } catch {
    return false;
  }
}

async function adminRecruitmentSchedule(request, body) {
  if (request.method === 'GET') {
    const schedules = await getData(service.from('recruitment_schedule')
      .select('*')
      .order('institution', { ascending: true })
      .order('id', { ascending: true }));
    return jsonResponse({ schedules });
  }

  const slug = clean(body.slug, 80).toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  const institution = clean(body.institution, 80);
  const title = clean(body.title, 160);
  const pathway = clean(body.pathway, 160);
  const cycle = clean(body.cycle, 100);
  const status = clean(body.status, 40);
  const dateLabel = clean(body.date_label, 160);
  const dateDetail = clean(body.date_detail, 500);
  const summary = clean(body.summary, 1200);
  const officialUrl = clean(body.official_url, 500);
  const isVerified = body.is_verified === true || body.is_verified === 'true';
  const isPublished = body.is_published !== false && body.is_published !== 'false';
  const id = Number(body.id || 0);
  if (!slug || !institution || !title || !officialUrl || !scheduleStatuses.includes(status)) {
    fail(400, 'Slug, institusi, judul, tautan resmi, dan status yang valid wajib diisi.');
  }
  if (!officialRecruitmentUrl(officialUrl)) {
    fail(400, 'Gunakan tautan HTTPS dari portal resmi rekrutmen TNI atau penerimaan POLRI.');
  }
  if (isVerified && status === 'Perlu verifikasi') {
    fail(400, 'Ubah status dari Perlu verifikasi sebelum menandai informasi sebagai terverifikasi.');
  }
  const values = {
    slug,
    institution,
    title,
    pathway,
    cycle,
    status,
    date_label: dateLabel || 'Belum diumumkan',
    date_detail: dateDetail,
    summary,
    official_url: officialUrl,
    is_verified: isVerified,
    is_published: isPublished,
    checked_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  if (id > 0) {
    const { data, error } = await service.from('recruitment_schedule')
      .update(values)
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error?.code === '23505') fail(409, 'Slug sudah digunakan. Gunakan slug unik atau edit data yang sudah ada.');
    assertNoError(error);
    if (!data) fail(404, 'Jadwal tidak ditemukan.');
    return jsonResponse({ ok: true, schedule: data });
  }
  const { data, error } = await service.from('recruitment_schedule')
    .insert(values)
    .select('*')
    .maybeSingle();
  if (error?.code === '23505') fail(409, 'Slug sudah digunakan. Gunakan slug unik atau edit data yang sudah ada.');
  assertNoError(error);
  return jsonResponse({ ok: true, schedule: data }, 201);
}

function validateSetting(key, value) {
  if (!Object.hasOwn(settingLimits, key)) return 'Pengaturan tidak dikenal.';
  if (typeof value !== 'string') return 'Nilai harus berupa teks.';
  if (value.length > settingLimits[key]) return 'Teks terlalu panjang.';
  if (key === 'hero_image_url' && value.trim()) {
    try {
      if (new URL(value.trim()).protocol !== 'https:') return 'URL gambar harus menggunakan HTTPS.';
    } catch {
      return 'URL gambar tidak valid.';
    }
  }
  if (key === 'contact_whatsapp' && value && !/^[1-9][0-9]{8,14}$/.test(value)) {
    return 'Nomor WhatsApp harus memakai kode negara dan angka saja, misalnya 62812xxxxxxxx.';
  }
  return null;
}

async function adminSiteContent(request, body) {
  if (request.method === 'GET') {
    const rows = await getData(service.from('site_content')
      .select('content_key,content_value,updated_at')
      .order('content_key', { ascending: true }));
    const stored = new Map(rows.map(row => [row.content_key, row]));
    return jsonResponse({
      settings: settingKeys.map(content_key => ({
        content_key,
        content_value: stored.get(content_key)?.content_value ?? defaultSettings[content_key],
        updated_at: stored.get(content_key)?.updated_at ?? null
      }))
    });
  }
  const key = typeof body.key === 'string' ? body.key : '';
  const value = typeof body.value === 'string' ? body.value.trim() : null;
  const validationError = validateSetting(key, value);
  if (validationError) fail(400, validationError);
  const setting = await getOne(service.from('site_content')
    .upsert({
      content_key: key,
      content_value: value,
      updated_at: new Date().toISOString()
    }, { onConflict: 'content_key' })
    .select('content_key,content_value,updated_at')
    .single());
  return jsonResponse({ ok: true, setting });
}

async function studentDashboard(request, body, user) {
  if (request.method === 'GET') {
    const { error: profileInsertError } = await service.from('student_profiles')
      .upsert({ user_id: user.id, full_name: user.name || '' }, { onConflict: 'user_id', ignoreDuplicates: true });
    assertNoError(profileInsertError);
    const profile = await getOne(service.from('student_profiles')
      .select('full_name,target_path,phone,city,created_at,updated_at')
      .eq('user_id', user.id)
      .single());
    const [attempts, tasks] = await Promise.all([
      getData(service.from('quiz_attempts')
        .select('id,quiz_code,quiz_title,score,total,created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)),
      getData(service.from('student_tasks')
        .select('id,title,category,due_date,completed,created_at')
        .eq('user_id', user.id)
        .order('completed', { ascending: true })
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('id', { ascending: false })
        .limit(50))
    ]);
    let finalTasks = tasks;
    if (!tasks.length) {
      const start = todayUtc();
      const { error } = await service.from('student_tasks').insert(starterTasks.map(([title, category, day]) => ({
        user_id: user.id,
        title,
        category,
        due_date: addDays(start, day)
      })));
      assertNoError(error);
      finalTasks = await getData(service.from('student_tasks')
        .select('id,title,category,due_date,completed,created_at')
        .eq('user_id', user.id)
        .order('completed', { ascending: true })
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('id', { ascending: false })
        .limit(50));
    }
    return jsonResponse({ user, profile, attempts, tasks: finalTasks });
  }

  const action = String(body.action || '');
  if (action === 'save_profile') {
    const fullName = clean(body.full_name, 100);
    const target = clean(body.target_path, 80);
    const phone = clean(body.phone, 24);
    const city = clean(body.city, 100);
    if (!fullName) fail(400, 'Nama lengkap wajib diisi.');
    const profile = await getOne(service.from('student_profiles')
      .upsert({
        user_id: user.id,
        full_name: fullName,
        target_path: target,
        phone,
        city,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' })
      .select('full_name,target_path,phone,city,updated_at')
      .single());
    return jsonResponse({ ok: true, profile });
  }
  if (action === 'save_attempt') {
    fail(403, 'Penyimpanan nilai langsung tidak diizinkan. Kerjakan latihan resmi agar nilai dihitung dan disimpan oleh server.');
  }
  if (action === 'add_task') {
    const title = clean(body.title, 140);
    const category = clean(body.category, 40) || 'Belajar';
    const dueDate = validDate(body.due_date) ? body.due_date : null;
    if (!title) fail(400, 'Judul jadwal wajib diisi.');
    const task = await getOne(service.from('student_tasks')
      .insert({ user_id: user.id, title, category, due_date: dueDate })
      .select('id,title,category,due_date,completed,created_at')
      .single());
    return jsonResponse({ ok: true, task }, 201);
  }
  if (action === 'toggle_task') {
    const id = Number(body.id);
    if (!Number.isSafeInteger(id) || id < 1) fail(400, 'ID jadwal tidak valid.');
    const existing = await getOne(service.from('student_tasks')
      .select('completed')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle());
    if (!existing) fail(404, 'Jadwal tidak ditemukan.');
    const task = await getOne(service.from('student_tasks')
      .update({ completed: !existing.completed, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id,title,category,due_date,completed')
      .single());
    return jsonResponse({ ok: true, task });
  }
  fail(400, 'Aksi tidak dikenal.');
}

async function studentPracticeQuizzes(body, user) {
  const quizId = Number(body.quiz_id);
  const token = normalizeToken(body.token);
  const answers = body.answers;
  if (!Number.isSafeInteger(quizId) || quizId < 1 || token.length < 12 || token.length > 24 ||
      !Array.isArray(answers) || answers.length > 50 ||
      answers.some(answer => !Number.isInteger(answer) || answer < 0 || answer > 5)) {
    fail(400, 'Data jawaban atau token tidak valid.');
  }
  const tokenHash = await hashToken(token);
  const tokenRecord = await getOne(service.from('practice_quiz_tokens')
    .select('quiz_id')
    .eq('quiz_id', quizId)
    .eq('token_hash', tokenHash)
    .is('revoked_at', null)
    .gte('expires_at', new Date().toISOString())
    .maybeSingle());
  const today = todayUtc();
  const quiz = tokenRecord
    ? await getOne(service.from('practice_quizzes')
      .select('id,slug,title,week_start,week_end,questions')
      .eq('id', quizId)
      .eq('is_published', true)
      .maybeSingle())
    : null;
  if (!quiz || today < quiz.week_start || today > quiz.week_end) {
    fail(403, 'Token tidak valid atau akses latihan sudah berakhir.');
  }
  const questions = quiz.questions || [];
  if (answers.length !== questions.length) fail(400, 'Jumlah jawaban tidak sesuai dengan jumlah soal.');
  const review = questions.map((question, index) => ({
    question: index + 1,
    selected: answers[index],
    correctIndex: question.answer,
    isCorrect: answers[index] === question.answer,
    explanation: question.explanation || ''
  }));
  const score = review.reduce((sum, item) => sum + (item.isCorrect ? 1 : 0), 0);
  const attempt = await getOne(service.from('quiz_attempts')
    .insert({
      user_id: user.id,
      quiz_code: quiz.slug,
      quiz_title: quiz.title,
      score,
      total: questions.length,
      answers: review.map(({ question, selected, isCorrect }) => ({
        question,
        answer: selected,
        correct: isCorrect
      }))
    })
    .select('id,score,total,created_at')
    .single());
  return jsonResponse({ ok: true, attempt, score, total: questions.length, review }, 201, noCacheHeaders);
}

async function handle(request) {
  const origin = request.headers.get('origin') || '';
  const corsHeaders = {};
  if (origin && allowedOrigins.has(origin)) {
    corsHeaders['Access-Control-Allow-Origin'] = origin;
    corsHeaders.Vary = 'Origin';
  } else if (origin) {
    return jsonResponse({ error: 'Origin tidak diizinkan.' }, 403);
  }
  corsHeaders['Access-Control-Allow-Headers'] = 'authorization, apikey, content-type, x-client-info';
  corsHeaders['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
  corsHeaders['Access-Control-Max-Age'] = '600';

  let route = '/';
  try {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
    route = routeFromRequest(request);
    const methods = allowedMethods[route];
    if (!methods) return jsonResponse({ error: 'Endpoint tidak ditemukan.' }, 404, corsHeaders);
    if (!methods.includes(request.method)) return jsonResponse({ error: 'Metode tidak didukung.' }, 405, corsHeaders);

    const isAdmin = adminRoutes.has(route);
    const user = isAdmin || studentRoutes.has(route) ? await authenticate(request, isAdmin) : null;
    if (route === '/inquiries' && request.method === 'POST') await enforceInquiryRateLimit(request);
    const body = request.method === 'POST' ? await readJson(request) : {};
    let response;
    switch (route) {
      case '/healthz':
        response = await healthCheck();
        break;
      case '/inquiries':
        response = await publicInquiry(body);
        break;
      case '/materials':
        response = await publicMaterials();
        break;
      case '/practice-quizzes':
        response = await publicPracticeQuizzes(request, body);
        break;
      case '/recruitment-schedule':
        response = await publicSchedules();
        break;
      case '/site-content':
        response = await publicSiteContent();
        break;
      case '/admin/inquiries':
        response = await adminInquiries(request, body);
        break;
      case '/admin/materials':
        response = await adminMaterials(request, body);
        break;
      case '/admin/overview':
        response = await adminOverview();
        break;
      case '/admin/practice-quizzes':
        response = await adminPracticeQuizzes(request, body);
        break;
      case '/admin/practice-tokens':
        response = await adminPracticeTokens(request, body);
        break;
      case '/admin/recruitment-schedule':
        response = await adminRecruitmentSchedule(request, body);
        break;
      case '/admin/site-content':
        response = await adminSiteContent(request, body);
        break;
      case '/student/dashboard':
        response = await studentDashboard(request, body, user);
        break;
      case '/student/practice-quizzes':
        response = await studentPracticeQuizzes(body, user);
        break;
      default:
        response = jsonResponse({ error: 'Endpoint tidak ditemukan.' }, 404);
    }

    const headers = new Headers(response.headers);
    for (const [key, value] of Object.entries(corsHeaders)) headers.set(key, value);
    if (isAdmin || studentRoutes.has(route)) {
      for (const [key, value] of Object.entries(noCacheHeaders)) headers.set(key, value);
    }
    return new Response(response.body, { status: response.status, headers });
  } catch (error) {
    const errorHeaders = { ...corsHeaders, ...noCacheHeaders };
    if (error instanceof HttpError) return jsonResponse({ error: error.message }, error.status, errorHeaders);
    console.error('SATRIA API request failed:', error);
    return jsonResponse({ error: 'Terjadi kesalahan server. Silakan coba lagi.' }, 500, errorHeaders);
  }
}

Deno.serve(handle);
