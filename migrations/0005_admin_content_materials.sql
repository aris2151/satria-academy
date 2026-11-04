CREATE TABLE site_content (
  content_key TEXT PRIMARY KEY,
  content_value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE learning_materials (
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
CREATE INDEX idx_learning_materials_public ON learning_materials (is_published, category, updated_at DESC);

INSERT INTO site_content (content_key, content_value) VALUES
 ('announcement', 'SATRIA ACADEMY • DISCIPLINE / READINESS / HONOR'),
 ('hero_eyebrow', 'Military & Police Academy Prep'),
 ('hero_title_line1', 'YOUR FUTURE.'),
 ('hero_title_line2', 'YOUR HONOR.'),
 ('hero_title_line3', 'YOUR MISSION.'),
 ('hero_description', 'Bimbingan persiapan seleksi TNI–Polri melalui pembelajaran akademik, psikotes, pembinaan fisik bertahap, dan evaluasi rutin. Bangun kesiapanmu lewat proses yang disiplin dan terukur.'),
 ('hero_image_url', ''),
 ('contact_whatsapp', '6281225044520')
ON CONFLICT (content_key) DO NOTHING;