CREATE TABLE recruitment_schedule (
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
CREATE INDEX idx_recruitment_schedule_public ON recruitment_schedule (is_published, institution);
INSERT INTO recruitment_schedule (slug,institution,title,pathway,cycle,status,date_label,date_detail,summary,official_url,is_verified,is_published,checked_at)
VALUES ('tni-ad-bintara-tamtama','TNI AD','Bintara & Tamtama TNI AD','CABA & CATA PK','Gelombang I · TA 2027','Pendaftaran dibuka','1 Okt 2026 – 13 Jan 2027 (CABA)','CABA online hingga 13 Januari 2027; CATA online hingga 15 Januari 2027. Periode validasi/daftar ulang berbeda.','Portal resmi TNI AD menampilkan pendaftaran CABA/CATA PK Gelombang I TA 2027. Periksa jalur yang dipilih pada situs resmi.','https://ad.rekrutmen-tni.mil.id/',true,true,now())
ON CONFLICT (slug) DO NOTHING;
INSERT INTO recruitment_schedule (slug,institution,title,pathway,cycle,status,date_label,date_detail,summary,official_url,is_verified,is_published,checked_at)
VALUES ('polri-penerimaan','POLRI','AKPOL, Bintara, Tamtama & SIPSS','Seluruh jalur sesuai pengumuman','TA 2027','Menunggu pengumuman','Belum diumumkan','Portal yang diperiksa masih menampilkan jadwal tahun 2026.','Jangan gunakan tanggal penerimaan tahun sebelumnya sebagai jadwal TA 2027. Periksa pengumuman terbaru di portal resmi.','https://penerimaan.polri.go.id/jadwal_seleksi/',false,true,now())
ON CONFLICT (slug) DO NOTHING;
INSERT INTO recruitment_schedule (slug,institution,title,pathway,cycle,status,date_label,date_detail,summary,official_url,is_verified,is_published,checked_at)
VALUES ('tni-al-penerimaan','TNI AL','Akademi, Bintara & Tamtama TNI AL','Pilih jalur dan gelombang aktif','Jadwal terbaru','Perlu verifikasi','Periksa portal resmi','Jadwal bergantung pada jalur dan gelombang penerimaan.','Periksa pengumuman yang masih aktif pada portal resmi TNI AL sebelum mendaftar.','https://al.rekrutmen-tni.mil.id/',false,true,now())
ON CONFLICT (slug) DO NOTHING;
INSERT INTO recruitment_schedule (slug,institution,title,pathway,cycle,status,date_label,date_detail,summary,official_url,is_verified,is_published,checked_at)
VALUES ('tni-au-dan-matra-lain','TNI / Matra lainnya','AAU dan jalur penerimaan TNI lainnya','Verifikasi per matra dan jalur','Jadwal terbaru','Perlu verifikasi','Periksa portal resmi','Periode pendaftaran berbeda menurut matra, jalur, dan gelombang.','Gunakan portal rekrutmen TNI untuk mencari pengumuman sesuai jalur pilihan.','https://rekrutmen-tni.mil.id/',false,true,now())
ON CONFLICT (slug) DO NOTHING;