# Sistem Informasi DAMAI v3.0 — Fullstack
## Pengukuran Kinerja Budaya Kerja — Yayasan Dhyana Pura

> **DAMAI** = **D**isiplin · **A**manah · **M**elayani · **A**daptif · **I**novatif

**Dikembangkan oleh: Jatmiko Wahyu Nugroho**

Ini adalah implementasi **fullstack nyata** (bukan simulasi/demo statis) dengan backend Express.js + SQLite asli dan frontend React asli, terhubung melalui REST API sungguhan dengan autentikasi JWT dan hierarki otorisasi yang ditegakkan di level database/API.

---

## 🚀 Siap untuk Deploy ke Production

Backend telah disiapkan untuk deploy ke platform cloud (Railway, Render, dsb) dengan tiga penyesuaian utama dibanding mode pengembangan lokal:

1. **`src/database/start.js`** — start command produksi yang HANYA menjalankan seed jika database benar-benar kosong. Ini mencegah data (termasuk perubahan bobot KPI atau akun yang dibuat admin) ter-reset setiap kali container restart/redeploy. **Jangan** gunakan `node src/database/seed.js` langsung sebagai start command di produksi — itu akan menghapus seluruh data setiap restart.
2. **CORS multi-origin** — `FRONTEND_URL` di `.env` sekarang dapat menerima beberapa origin dipisah koma, untuk mendukung domain production sekaligus preview deployment.
3. **`app.listen(PORT, '0.0.0.0', ...)`** — wajib bind ke `0.0.0.0` (bukan `localhost`) agar dapat diakses dari luar container di platform seperti Railway/Render.

Lihat panduan deploy langkah-demi-langkah yang menyertai proyek ini untuk instruksi lengkap men-deploy ke Railway (backend) + Vercel (frontend).

---

## 🏛️ Struktur Organisasi

```
Yayasan Dhyana Pura
 ├── Universitas Dhyana Pura (UNDHIRA)
 │    ├── Fakultas Ekonomi & Bisnis (FEB)
 │    ├── Fakultas Ilmu Komunikasi (FIKOM)
 │    └── Fakultas Teknik & Informatika (FTI)
 ├── LPK Dhyana Pura (LPK)
 │    ├── Divisi Operasional Pelatihan
 │    └── Divisi Administrasi & Sertifikasi
 └── PT Dhyana Pura Talenta (PTPTK)
      ├── Divisi Rekrutmen & Penempatan
      └── Divisi Administrasi & Legal
```

## 🔐 Hierarki Visibilitas Data (Ditegakkan di Backend)

| Role | Cakupan Akses | Implementasi |
|------|---------------|---------------|
| **Yayasan** | Seluruh unit (Universitas + LPK + PT) | `getVisibleEmployeeIds()` → `null` (unrestricted) |
| **Admin** | Seluruh unit (akses administratif) | `getVisibleEmployeeIds()` → `null` (unrestricted) |
| **Pimpinan** | Seluruh fakultas/divisi **di dalam satu unit** (`scope_org_unit_id`) | Filter `JOIN faculties WHERE org_unit_id = ?` |
| **Manajer Unit** | Hanya fakultas/divisinya sendiri | Filter `WHERE faculty_id = (SELECT faculty_id FROM employees WHERE id = ?)` |
| **Dosen/Tendik** | Hanya dirinya sendiri | Filter `WHERE id = employee_id` |
| **Mahasiswa** | Tidak ada akses ke data pegawai | `[]` (empty) |

Aturan ini ditegakkan di **satu titik pusat**: `backend/src/utils/visibility-scope.js`, lalu dipanggil dari setiap route (`employees.js`, `kpi.js`, `reviews.js`) — sehingga tidak mungkin ada kebocoran data lintas-unit/fakultas, bahkan jika frontend di-bypass.

---

## ⚡ Quick Start

### 1. Backend

```bash
cd backend
npm install            # tidak ada native compile — pakai node:sqlite built-in
node src/database/seed.js   # buat database + seed struktur organisasi & data demo
npm run dev             # API berjalan di http://localhost:5000
```

> **Persyaratan:** Node.js **≥ 22.5.0** (untuk modul built-in `node:sqlite`). Cek dengan `node --version`.

### 2. Frontend (terminal baru)

```bash
cd frontend
npm install
npm run dev              # UI berjalan di http://localhost:5173
```

Buka browser: **http://localhost:5173**

---

## 🔑 Akun Demo

| Role | Username | Password | Cakupan |
|------|----------|----------|---------|
| Ketua Yayasan | `yayasan` | `yayasan2024` | Semua unit |
| Administrator | `admin` | `admin2024` | Semua unit |
| Rektor (Pimpinan Undhira) | `rektor` | `damai2024` | Universitas saja |
| Kepala LPK (Pimpinan) | `kalpk` | `damai2024` | LPK saja |
| Direktur PT (Pimpinan) | `dirptptk` | `damai2024` | PT Talenta saja |
| Dekan FEB (Manajer Unit) | `dekan.feb` | `damai2024` | Fakultas FEB saja |
| Dosen | `dosen1` | `damai2024` | Diri sendiri |
| Instruktur LPK | `instruktur1` | `damai2024` | Diri sendiri |
| Staf PT | `staf.pt1` | `damai2024` | Diri sendiri |

---

## 👑 Admin sebagai Super User

Akun **`admin`** dirancang sebagai satu-satunya role dengan kapabilitas **CRUD penuh atas seluruh akun**, terlepas dari role-nya:

| Aksi | Endpoint | Siapa yang Boleh |
|------|----------|-------------------|
| Lihat daftar user | `GET /api/users` | `admin`, `yayasan` (read-only) |
| Buat user baru (role apapun) | `POST /api/users` | **hanya `admin`** |
| Edit role/status/keterkaitan user | `PUT /api/users/:id` | **hanya `admin`** |
| Reset password user manapun | `PUT /api/users/:id/reset-password` | **hanya `admin`** |
| Nonaktifkan akun (soft-delete) | `DELETE /api/users/:id` | **hanya `admin`** (kecuali akun admin lain) |

**Cara menambah akun dosen baru:** masuk sebagai `admin` → menu **Manajemen User** → *Tambah User* → pilih role *Dosen/Tendik* → pilih pegawai yang terkait dari dropdown (dropdown ini sendiri sudah otomatis dibatasi oleh hierarki visibilitas yang berlaku untuk siapa yang membuatnya).

**Safety guard:** akun ber-role `admin` tidak dapat dihapus/dinonaktifkan melalui sistem (baik oleh dirinya sendiri maupun admin lain), untuk mencegah situasi di mana tidak ada lagi admin yang dapat mengelola sistem.

---

## ⚙️ Mengubah Persentase Bobot KPI

Bobot kelima dimensi DAMAI (`Disiplin 20%, Amanah 25%, Melayani 25%, Adaptif 15%, Inovatif 15%`) **tidak hardcode** — tersimpan di kolom `kpi_dimensions.weight` dan dapat diubah kapan saja oleh admin.

**Lewat UI:** masuk sebagai `admin` → menu **Bobot KPI** → ubah slider/angka tiap dimensi → sistem memvalidasi total harus tepat 100% → klik *Simpan & Hitung Ulang*.

**Lewat API:**
```http
PUT /api/kpi/dimensions/weights
Authorization: Bearer <token admin>
Content-Type: application/json

{
  "weights": [
    { "id": 1, "weight": 0.30 },
    { "id": 2, "weight": 0.20 },
    { "id": 3, "weight": 0.20 },
    { "id": 4, "weight": 0.15 },
    { "id": 5, "weight": 0.15 }
  ]
}
```

**Yang terjadi otomatis setelah perubahan disimpan:**
1. Validasi: total seluruh bobot (termasuk dimensi yang tidak disertakan di body) harus tepat 100% — jika tidak, request ditolak dengan `400` dan rincian bobot saat ini.
2. **Seluruh skor DAMAI yang sudah pernah dihitung** (semua periode, historis maupun aktif) dihitung ulang otomatis memakai bobot baru — tidak perlu klik "Hitung Ulang" manual satu per satu.
3. Response mengembalikan jumlah skor yang ter-update (`"40 skor DAMAI dihitung ulang otomatis"`).

Hanya role `admin` yang dapat mengakses endpoint ini — role lain (termasuk `yayasan`) akan menerima `403`.

---

## 🧪 Pengujian Otomatis Visibilitas

Backend telah diuji end-to-end dengan skenario lintas-role berikut (lihat hasil verifikasi nyata, bukan simulasi):

```
✅ yayasan:    sees 20/20 employees — Seluruh unit Yayasan
✅ admin:      sees 20/20 employees — Seluruh unit (administratif)
✅ rektor:     sees 15/20 employees — Universitas Dhyana Pura saja (TANPA kebocoran ke LPK/PT)
✅ kalpk:      sees  3/20 employees — LPK Dhyana Pura saja
✅ dirptptk:   sees  2/20 employees — PT Dhyana Pura Talenta saja
✅ dekan.feb:  sees  5/20 employees — Fakultas Ekonomi & Bisnis saja (TANPA kebocoran ke FIKOM/FTI)
✅ dosen1:     sees  1/20 employees — Data diri sendiri
```

Skrip pengujian tersedia di referensi commit — gunakan `requests` Python atau `curl` untuk mereplikasi.

---

## 📊 Framework DAMAI

| Dimensi | Kode | Bobot | Contoh KPI |
|---------|------|-------|-----|
| Disiplin | D | 20% | Kehadiran, Ketepatan Laporan, SOP Compliance, Cuti Tertib |
| Amanah | A | 25% | Integritas, Transparansi Anggaran, Akuntabilitas, Etika |
| Melayani | M | 25% | Kepuasan Klien/Mahasiswa, Response Time, Service Quality |
| Adaptif | AD | 15% | Learning Agility, Change Readiness, Resilience, Flexibility |
| Inovatif | I | 15% | Inovasi/Tahun, Publikasi, Digital Adoption, Improvement Ideas |

**Formula:** `Skor DAMAI = D×0.20 + A×0.25 + M×0.25 + AD×0.15 + I×0.15`

### Kategori Pencapaian

| Rentang | Kategori | Tindak Lanjut |
|---------|----------|---------------|
| 90–100 | 🟢 Sangat Baik | Reward & Recognition |
| 80–89 | 🔵 Baik | Pengembangan Potensi |
| 70–79 | 🟡 Cukup | Coaching & Mentoring |
| 60–69 | 🟠 Kurang | Program Perbaikan Intensif |
| < 60 | 🔴 Perlu Perhatian | Evaluasi & Rencana Aksi |

---

## 🚀 API Endpoints Utama

| Method | Endpoint | Akses |
|--------|----------|-------|
| POST | `/api/auth/login` | Publik |
| GET | `/api/auth/me` | Semua role |
| GET | `/api/org/units` | Semua role |
| GET | `/api/org/faculties` | Semua role |
| GET | `/api/employees` | **Difilter sesuai scope** |
| GET | `/api/kpi/scores` | **Difilter sesuai scope** |
| GET | `/api/kpi/scores/summary` | **Difilter sesuai scope**, breakdown per unit/fakultas |
| GET | `/api/reviews` | **Difilter sesuai scope** |
| POST | `/api/reviews` | yayasan, admin, pimpinan, manajer_unit |
| GET | `/api/users` | yayasan, admin |

---

## 🛠️ Stack Teknologi

- **Frontend:** React 18 + Vite + Tailwind CSS + Recharts + React Router + Axios
- **Backend:** Node.js 22+ + Express.js
- **Database:** SQLite via **built-in `node:sqlite`** (tidak ada native module/compile step)
- **Auth:** JWT (jsonwebtoken) + bcryptjs

> **Catatan teknis:** Versi ini menggunakan modul `node:sqlite` bawaan Node.js 22+ sebagai pengganti `better-sqlite3`, karena tidak memerlukan kompilasi native binding sama sekali — instalasi `npm install` jauh lebih cepat dan portable di lingkungan apa pun yang punya Node 22+. API method (`prepare`, `run`, `get`, `all`, `exec`) sepenuhnya kompatibel; fungsi `db.transaction()` di-polyfill secara manual di `schema.js` menggunakan `BEGIN`/`COMMIT`/`ROLLBACK`.

---

## 📁 Struktur Folder

```
damai-fullstack/
├── backend/
│   ├── src/
│   │   ├── database/
│   │   │   ├── schema.js       # DDL + koneksi DB (node:sqlite)
│   │   │   └── seed.js         # Seed struktur organisasi + data demo
│   │   ├── middleware/
│   │   │   └── auth.js         # JWT authenticate() + authorize()
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── organization.js # org_units & faculties
│   │   │   ├── employees.js    # dengan visibility scope
│   │   │   ├── periods.js
│   │   │   ├── kpi.js          # dimensions, entries, scores — dengan visibility scope
│   │   │   ├── reviews.js      # performance reviews — dengan visibility scope
│   │   │   ├── notifications.js
│   │   │   └── users.js
│   │   ├── utils/
│   │   │   ├── damai-engine.js       # normalisasi & scoring
│   │   │   └── visibility-scope.js   # 🔑 PUSAT LOGIKA HIERARKI AKSES
│   │   └── index.js            # Express app entry
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── Layout/ (Sidebar, Header, MainLayout)
    │   │   ├── Charts/ (GaugeChart, DimRadarChart)
    │   │   └── UI/ (Modal, ScopeBanner, StatCard, ScoreBadge, ...)
    │   ├── context/AuthContext.jsx
    │   ├── pages/ (Login, Dashboard, KpiInput, KpiScores, Reviews, Employees, Organization, Periods, Users, Profile)
    │   ├── utils/ (api.js, helpers.js)
    │   └── App.jsx
    └── package.json
```

---

*Sistem Informasi DAMAI v3.0 · Yayasan Dhyana Pura · Dikembangkan oleh Jatmiko Wahyu Nugroho*
