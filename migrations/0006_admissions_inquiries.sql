CREATE TABLE admissions_inquiries (
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
CREATE INDEX idx_admissions_inquiries_status_created ON admissions_inquiries (status, created_at DESC);