'use client'

import { useState } from 'react'
import { ArrowDownRight, ArrowRight, Check, ChevronDown, Crosshair, Menu, MessageCircle, Shield, X } from 'lucide-react'

const whatsappNumber = '6281234567890'
const waBase = `https://wa.me/${whatsappNumber}`

const features = [
  ['▤', 'Akademik Terstruktur', 'Latihan soal dan pembahasan materi sesuai kebutuhan seleksi yang dituju.'],
  ['⌁', 'Pembinaan Fisik', 'Latihan bertahap, teknik yang benar, pemanasan, dan evaluasi perkembangan.'],
  ['◎', 'Psikotes & Wawasan', 'Latihan penalaran, psikotes, dan wawasan kebangsaan sesuai jalur seleksi.'],
  ['▣', 'Simulasi & Evaluasi', 'Tryout dan umpan balik untuk membantu mengenali area yang perlu ditingkatkan.'],
]
const paths = [
  ['tni', 'AD', 'TNI ANGKATAN DARAT', 'Kenali jalur Akademi TNI, Bintara, dan Tamtama sesuai pembukaan penerimaan.'],
  ['tni', 'AL', 'TNI ANGKATAN LAUT', 'Persiapan jalur matra laut dengan materi mengikuti pengumuman resmi.'],
  ['tni', 'AU', 'TNI ANGKATAN UDARA', 'Siapkan akademik serta kebugaran untuk pilihan jalur matra udara.'],
  ['polri', 'AK', 'AKADEMI KEPOLISIAN', 'Gambaran persiapan seleksi Akpol untuk calon peserta jalur akademi.'],
  ['polri', 'BR', 'BINTARA POLRI', 'Bangun fondasi pengetahuan, kesehatan, fisik, dan psikologi secara terarah.'],
  ['polri', 'TA', 'TAMTAMA POLRI', 'Latihan bertahap untuk mempersiapkan diri menuju proses seleksi.'],
]
const packages: Array<[string, string, string, string, string[]]> = [
  ['PROGRAM / 01', 'Kelas Reguler', 'Kelas kelompok untuk membangun fondasi materi dan rutinitas latihan.', 'Rp750.000', ['Kelas akademik terjadwal', 'Latihan psikotes dasar', 'Latihan fisik kelompok', 'Evaluasi perkembangan']],
  ['PROGRAM / 02', 'Kelas Intensif', 'Jadwal persiapan lebih padat dengan evaluasi dan simulasi berkala.', 'Rp1.500.000', ['Semua fasilitas Reguler', 'Tryout berkala', 'Program fisik terjadwal', 'Konsultasi progres siswa']],
  ['PROGRAM / 03', 'Privat Persiapan', 'Pendampingan lebih personal sesuai target dan kebutuhan siswa.', 'Rp2.500.000', ['Rencana belajar personal', 'Jadwal akademik terarah', 'Evaluasi fisik dan materi', 'Laporan progres berkala']],
]
const faqs = [
  ['Apakah bimbel menjamin kelulusan?', 'Tidak. Bimbingan membantu proses persiapan, tetapi hasil seleksi dipengaruhi banyak faktor dan keputusan panitia resmi.'],
  ['Apakah ada latihan fisik offline?', 'Konsep layanan mencakup pembinaan fisik langsung. Lokasi, jadwal, pelatih, dan fasilitas aktual dikonfirmasi admin.'],
  ['Apakah harga yang tertera sudah resmi?', 'Harga dan detail paket perlu dikonfirmasi admin sebelum pendaftaran agar sesuai lokasi, durasi, dan fasilitas yang tersedia.'],
  ['Kapan pendaftaran dibuka?', 'Hubungi admin melalui WhatsApp untuk mengetahui batch dan jadwal pendaftaran terdekat.'],
]

function whatsappMessage(message: string) { return `${waBase}?text=${encodeURIComponent(message)}` }

export function AcademyHome() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [filter, setFilter] = useState('tni')
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [submitted, setSubmitted] = useState(false)

  function submitRegistration(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const message = `Halo SATRIA ACADEMY, saya ingin konsultasi.\nNama: ${data.get('name')}\nNo. HP: ${data.get('phone')}\nTarget: ${data.get('target')}\nPaket: ${data.get('package')}\nDomisili: ${data.get('city') || '-'}\nCatatan: ${data.get('message') || '-'}`
    setSubmitted(true)
    window.open(whatsappMessage(message), '_blank', 'noopener,noreferrer')
  }

  return <div className="satria-site">
    <div className="announcement">SATRIA ACADEMY • DISCIPLINE / READINESS / HONOR</div>
    <header className="site-header"><div className="container nav"><a className="logo" href="#home"><span className="logo-mark">SA</span><span>SATRIA ACADEMY<small>ELITE PREPARATION CENTER</small></span></a><nav className={`nav-links ${menuOpen ? 'open' : ''}`}><a href="#program" onClick={() => setMenuOpen(false)}>Program</a><a href="#keunggulan" onClick={() => setMenuOpen(false)}>Keunggulan</a><a href="#alur" onClick={() => setMenuOpen(false)}>Alur belajar</a><a href="#faq" onClick={() => setMenuOpen(false)}>FAQ</a><a href="#daftar" onClick={() => setMenuOpen(false)}>Pendaftaran</a></nav><a className="btn nav-cta" href="#daftar">KONSULTASI <ArrowRight size={14}/></a><button className="menu-toggle" aria-label="Buka menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X/> : <Menu/>}</button></div></header>
    <main>
      <section className="hero" id="home"><div className="grid-overlay"/><div className="container hero-inner"><div className="hero-copy"><div className="eyebrow">MILITARY & POLICE ACADEMY PREP</div><h1>YOUR FUTURE.<br/><span>YOUR HONOR.</span><br/>YOUR MISSION.</h1><p>Bimbingan persiapan seleksi TNI–Polri melalui pembelajaran akademik, psikotes, pembinaan fisik bertahap, dan evaluasi rutin. Bangun kesiapanmu lewat proses yang disiplin dan terukur.</p><div className="hero-actions"><a className="btn" href="#program">JELAJAHI PROGRAM <ArrowDownRight size={15}/></a><a className="btn btn-outline" href="#daftar">KONSULTASI DULU</a></div><div className="proofs"><span><b>✓</b> Materi terarah</span><span><b>✓</b> Latihan fisik</span><span><b>✓</b> Evaluasi berkala</span></div></div><div className="hero-art"><div className="art-chip">TRAIN WITH PURPOSE</div><div className="art-card"><div className="mountains"/><div className="silhouette"><div className="head"/><div className="body"/><div className="leg left"/><div className="leg right"/></div><div className="art-caption"><span>MENTAL • FISIK • AKADEMIK</span><strong>DISIPLIN MEMBENTUK KESIAPAN</strong></div></div><div className="hero-stamp">01 / KOMITMEN • 02 / PROSES • 03 / EVALUASI</div></div></div></section>
      <section className="section" id="keunggulan"><div className="container"><div className="section-head"><div><div className="kicker">METODE SATRIA</div><h2>Latihan punya arah.<br/>Perkembangan terukur.</h2></div><p>Bangun kebiasaan belajar dan latihan yang konsisten. Program disesuaikan dengan jalur seleksi, kemampuan awal siswa, serta jadwal pembinaan.</p></div><div className="features">{features.map(([icon, title, text]) => <article className="feature" key={title}><div className="feature-icon">{icon}</div><h3>{title}</h3><p>{text}</p></article>)}</div></div></section>
      <section className="section paths" id="program"><div className="container"><div className="section-head"><div><div className="kicker">FOKUS SATRIA ACADEMY</div><h2>Pilih jalur pengabdian.</h2></div><p>Persiapan difokuskan pada seleksi Tentara Nasional Indonesia dan Kepolisian Negara Republik Indonesia.</p></div><div className="path-tabs" role="group" aria-label="Pilih institusi">{[['tni','TNI'],['polri','POLRI'],['all','SEMUA JALUR']].map(([value, label]) => <button key={value} className={`path-tab ${filter === value ? 'active' : ''}`} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}</div><div className="path-cards">{paths.filter(([group]) => filter === 'all' || group === filter).map(([group, symbol, title, text]) => <article className="path-card" key={title}><div className="path-symbol">{symbol}</div><h3>{title}</h3><p>{text}</p><a href="#daftar">PILIH JALUR <ArrowRight size={14}/></a></article>)}</div></div></section>
      <section className="section programs" id="paket"><div className="container"><div className="section-head"><div><div className="kicker">PILIH JALUR PERSIAPAN</div><h2>Paket bimbingan.</h2></div><p>Harga contoh. Konfirmasi detail biaya, durasi, fasilitas, dan lokasi kepada admin sebelum mendaftar.</p></div><div className="package-grid">{packages.map(([no, title, desc, price, items], index) => <article className={`package ${index === 1 ? 'featured' : ''}`} key={title}>{index === 1 && <div className="package-tag">PROGRAM UNGGULAN</div>}<div className="package-no">{no}</div><h3>{title}</h3><p className="package-desc">{desc}</p><div className="price">{price} <small>/ paket contoh</small></div><ul>{items.map(item => <li key={item}><Check size={14}/>{item}</li>)}</ul><a className={`btn ${index === 1 ? '' : 'btn-outline'}`} href={whatsappMessage(`Halo SATRIA ACADEMY, saya ingin menanyakan ${title}.`)}>TANYAKAN PAKET <ArrowRight size={14}/></a></article>)}</div></div></section>
      <section className="section process" id="alur"><div className="container process-grid"><div><div className="kicker">LANGKAH PERSIAPAN</div><h2>Mulai dari target.<br/>Jalani prosesnya.</h2><p>Calon siswa dapat berkonsultasi terlebih dahulu agar pilihan program, kebutuhan latihan, dan jadwal lebih sesuai.</p><a className="btn" href="#daftar">KONSULTASIKAN TARGET <ArrowRight size={14}/></a></div><div className="steps">{['Konsultasi target seleksi','Pilih program dan jadwal','Mulai latihan terarah','Evaluasi dan perbaikan'].map((step, index) => <div className="step" key={step}><b>0{index + 1}</b><div><h3>{step}</h3><p>{['Diskusikan jalur yang diminati dan kebutuhan utama.','Admin menjelaskan paket, fasilitas, biaya, dan jadwal.','Ikuti pembelajaran, pembinaan fisik, dan simulasi.','Tinjau hasil latihan dan susun langkah berikutnya.'][index]}</p></div></div>)}</div></div></section>
      <section className="section enroll" id="daftar"><div className="container enroll-grid"><div><div className="kicker">PENDAFTARAN & KONSULTASI</div><h2>Langkah pertama dimulai di sini.</h2><p>Isi formulir singkat. Website akan menyiapkan pesan yang bisa kamu periksa lalu kirim ke admin melalui WhatsApp.</p><div className="contact-benefits"><span>✓ Konsultasi target dan kebutuhan</span><span>✓ Informasi jadwal serta biaya resmi</span><span>✓ Konfirmasi langsung dengan admin</span></div></div><form className="form-card" onSubmit={submitRegistration}><h3>Form minat bimbingan</h3><p>Kolom bertanda * wajib diisi.</p><div className="fields"><label>NAMA CALON SISWA *<input name="name" required placeholder="Nama lengkap"/></label><label>NOMOR HP AKTIF *<input name="phone" required inputMode="tel" placeholder="08xxxxxxxxxx"/></label><label>TARGET SELEKSI *<select name="target" required defaultValue=""><option value="" disabled>Pilih target</option><option>Akmil</option><option>Bintara TNI</option><option>Akpol</option><option>Bintara Polri</option><option>Masih konsultasi</option></select></label><label>PAKET PILIHAN *<select name="package" required defaultValue=""><option value="" disabled>Pilih paket</option><option>Kelas Reguler</option><option>Kelas Intensif</option><option>Privat Persiapan</option><option>Belum menentukan</option></select></label><label className="full">DOMISILI<input name="city" placeholder="Kota / kabupaten"/></label><label className="full">CATATAN<input name="message" placeholder="Ceritakan target atau pertanyaanmu"/></label></div><button className="btn" type="submit"><MessageCircle size={15}/> {submitted ? 'PESAN SIAP DIKIRIM' : 'KIRIM VIA WHATSAPP'}</button></form></div></section>
      <section className="section faq" id="faq"><div className="container faq-grid"><div><div className="kicker">PERTANYAAN UMUM</div><h2>Kenali programnya.</h2><p>Belum yakin memilih paket? Mulailah dengan konsultasi untuk memahami layanan yang tersedia.</p></div><div className="faq-list">{faqs.map(([question, answer], index) => <div className="faq-item" key={question}><button onClick={() => setOpenFaq(openFaq === index ? null : index)} aria-expanded={openFaq === index}><span>{question}</span><ChevronDown size={18}/></button>{openFaq === index && <p>{answer}</p>}</div>)}</div></div></section>
      <section className="closing"><div className="container"><div><div className="kicker">READY WHEN YOU ARE</div><h2>Mulai langkahmu.</h2></div><a className="btn btn-dark" href={whatsappMessage('Halo SATRIA ACADEMY, saya ingin mulai konsultasi.')}>DAFTAR SEKARANG <ArrowRight size={15}/></a></div></section>
    </main><footer><div className="container"><span>© 2026 SATRIA ACADEMY</span><span>DISCIPLINE CREATES FREEDOM.</span></div></footer>
  </div>
}
