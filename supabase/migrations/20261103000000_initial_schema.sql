CREATE TABLE public.student_profiles (
  user_id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL DEFAULT '',
  target_path TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.quiz_attempts (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  quiz_code TEXT NOT NULL,
  quiz_title TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0),
  total INTEGER NOT NULL CHECK (total > 0),
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.student_tasks (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Belajar',
  due_date DATE,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_quiz_attempts_user_created ON public.quiz_attempts(user_id, created_at DESC);
CREATE INDEX idx_student_tasks_user_due ON public.student_tasks(user_id, due_date);

CREATE TABLE public.recruitment_schedule (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  institution TEXT NOT NULL,
  title TEXT NOT NULL,
  pathway TEXT NOT NULL DEFAULT '',
  cycle TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Perlu verifikasi',
  date_label TEXT NOT NULL DEFAULT 'Belum diumumkan',
  date_detail TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  official_url TEXT NOT NULL,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  is_published BOOLEAN NOT NULL DEFAULT true,
  checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT recruitment_schedule_status_check CHECK (status IN ('Pendaftaran dibuka','Menunggu pengumuman','Perlu verifikasi','Pendaftaran ditutup'))
);
CREATE INDEX idx_recruitment_schedule_public ON public.recruitment_schedule (is_published, institution);

CREATE TABLE public.practice_quizzes (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Akademik',
  description TEXT NOT NULL DEFAULT '',
  week_label TEXT NOT NULL DEFAULT '',
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30 CHECK (duration_minutes BETWEEN 1 AND 240),
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT practice_quizzes_date_check CHECK (week_end >= week_start),
  CONSTRAINT practice_quizzes_questions_check CHECK (jsonb_typeof(questions) = 'array')
);
CREATE INDEX idx_practice_quizzes_public_dates ON public.practice_quizzes (is_published, week_start, week_end);

CREATE TABLE public.practice_quiz_tokens (
  id BIGSERIAL PRIMARY KEY,
  quiz_id BIGINT NOT NULL REFERENCES public.practice_quizzes(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  token_hint TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT 'Token latihan mingguan',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_by TEXT NOT NULL DEFAULT 'admin'
);
CREATE INDEX idx_practice_quiz_tokens_active ON public.practice_quiz_tokens (quiz_id, expires_at) WHERE revoked_at IS NULL;

CREATE TABLE public.site_content (
  content_key TEXT PRIMARY KEY,
  content_value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.learning_materials (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Umum',
  description TEXT NOT NULL DEFAULT '',
  resource_url TEXT NOT NULL,
  resource_type TEXT NOT NULL DEFAULT 'link',
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT learning_materials_type_check CHECK (resource_type IN ('pdf','image','video','link'))
);
CREATE INDEX idx_learning_materials_public ON public.learning_materials (is_published, category, updated_at DESC);

CREATE TABLE public.admissions_inquiries (
  id BIGSERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  target_path TEXT NOT NULL,
  package_name TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Baru',
  consent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT admissions_inquiries_status_check CHECK (status IN ('Baru','Dihubungi','Konsultasi','Terdaftar','Tidak lanjut'))
);
CREATE INDEX idx_admissions_inquiries_status_created ON public.admissions_inquiries (status, created_at DESC);

CREATE TABLE public.admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.site_content (content_key, content_value) VALUES
  ('announcement', 'SATRIA ACADEMY • DISCIPLINE / READINESS / HONOR'),
  ('hero_eyebrow', 'Military & Police Academy Prep'),
  ('hero_title_line1', 'YOUR FUTURE.'),
  ('hero_title_line2', 'YOUR HONOR.'),
  ('hero_title_line3', 'YOUR MISSION.'),
  ('hero_description', 'Bimbingan persiapan seleksi TNI–Polri melalui pembelajaran akademik, psikotes, pembinaan fisik bertahap, dan evaluasi rutin. Bangun kesiapanmu lewat proses yang disiplin dan terukur.'),
  ('hero_image_url', ''),
  ('contact_whatsapp', '6281225044520')
ON CONFLICT (content_key) DO NOTHING;

INSERT INTO public.recruitment_schedule (slug,institution,title,pathway,cycle,status,date_label,date_detail,summary,official_url,is_verified,is_published,checked_at)
VALUES
  ('tni-ad-bintara-tamtama','TNI AD','Bintara & Tamtama TNI AD','CABA & CATA PK','Gelombang I · TA 2027','Perlu verifikasi','Periksa portal resmi','Portal resmi saat diperiksa menampilkan CABA/CATA PK Gelombang I TA 2027. Tenggat pendaftaran dan validasi per jalur belum dapat dipastikan dari halaman tersebut.','Pastikan tenggat dan persyaratan jalur yang dipilih melalui pengumuman resmi sebelum mendaftar.','https://ad.rekrutmen-tni.mil.id/',false,true,now()),
  ('polri-penerimaan','POLRI','AKPOL, Bintara, Tamtama & SIPSS','Seluruh jalur sesuai pengumuman','TA 2027','Perlu verifikasi','Periksa portal resmi','Jadwal TA 2027 belum dapat diverifikasi pada pemeriksaan portal kali ini.','Periksa pengumuman terbaru pada portal resmi POLRI sebelum mendaftar.','https://penerimaan.polri.go.id/jadwal_seleksi/',false,true,now()),
  ('tni-al-penerimaan','TNI AL','Akademi, Bintara & Tamtama TNI AL','Pilih jalur dan gelombang aktif','Jadwal terbaru','Perlu verifikasi','Periksa portal resmi','Jadwal berbeda menurut jalur dan gelombang; tanggal aktif belum dapat diverifikasi.','Periksa pengumuman yang masih aktif pada portal resmi TNI AL sebelum mendaftar.','https://al.rekrutmen-tni.mil.id/',false,true,now()),
  ('tni-au-dan-matra-lain','TNI / Matra lainnya','AAU dan jalur penerimaan TNI lainnya','Verifikasi per matra dan jalur','Jadwal terbaru','Perlu verifikasi','Periksa portal resmi','Periode pendaftaran berbeda menurut matra, jalur, dan gelombang.','Gunakan portal rekrutmen TNI untuk mencari pengumuman sesuai jalur pilihan.','https://rekrutmen-tni.mil.id/',false,true,now()),
  ('tni-pa-pk-dokter-spesialis-2026','TNI','PA PK TNI Gelombang II Khusus Dokter Spesialis','Perwira Prajurit Karier','TA 2026','Pendaftaran dibuka','16 Sep – 13 Nov 2026','Halaman resmi Penerimaan Online Prajurit TNI menampilkan periode 16 September sampai 13 November 2026 saat diperiksa pada 3 November 2026. Pastikan kualifikasi dan status pendaftaran pada portal.','Portal resmi menampilkan jadwal ini; verifikasi persyaratan dan status terbaru langsung sebelum mendaftar.','https://rekrutmen-tni.mil.id/landing-page',true,true,now())
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruitment_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_quiz_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admissions_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.student_profiles, public.quiz_attempts, public.student_tasks,
  public.recruitment_schedule, public.practice_quizzes, public.practice_quiz_tokens,
  public.site_content, public.learning_materials, public.admissions_inquiries,
  public.admin_users FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
