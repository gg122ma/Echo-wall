# Echo Wall — 留声墙

> Platform Warisan Ilmu Pelajar Matrikulasi Malaysia

Echo Wall adalah papan gabus digital di mana pelajar matrikulasi Malaysia berkongsi tips belajar, pengalaman kampus, dan sokongan emosi untuk generasi seterusnya.

## 🚀 Cara Guna

1. Buka `index.html` dalam pelayar web
2. Daftar akaun baru di `register.html`
3. Pilih jurusan, aliran, dan sesi anda
4. Mula berkongsi pengalaman di dinding (wall)

## 📁 Struktur Fail

```
echo-wall/
├── index.html          ← Halaman utama
├── login.html          ← Halaman log masuk
├── register.html       ← Halaman pendaftaran
├── explore.html        ← Teroka dinding
├── wall.html           ← Dinding utama (soft board)
├── feedback.html       ← Maklum balas pengguna
├── profile.html        ← Profil peribadi
├── admin.html          ← Papan pemuka admin
├── css/
│   ├── style.css       ← Gaya global
│   └── wall.css        ← Gaya khusus dinding
├── js/
│   ├── i18n.js         ← Pengurus bahasa
│   ├── auth.js         ← Pengurusan pengguna
│   ├── notes.js        ← CRUD便利贴
│   ├── votes.js        ← Sistem undi
│   ├── comments.js     ← Komen & balas
│   ├── bookmarks.js    ← Simpanan
│   ├── feedback.js     ← Maklum balas
│   └── app.js          ← UI kongsi
├── translations/
│   ├── en.json         ← English
│   ├── ms.json         ← Bahasa Melayu
│   └── zh.json         ← 中文
└── public/
    └── favicon.svg
```

## 🌐 Bahasa Sokongan

- Bahasa Melayu (default)
- English
- 中文

Tukar bahasa melalui butang BM / EN / 中文 di navbar.

## 📊 Data Storage

Semua data disimpan dalam `localStorage` pelayar:

| Key | Content |
|-----|---------|
| `ew-users` | Registered users |
| `ew-session` | Current login session |
| `ew-notes` | All notes |
| `ew-votes` | Vote records |
| `ew-comments` | Comments & replies |
| `ew-bookmarks` | Bookmarked notes |
| `ew-feedbacks` | User feedback |
| `ew-lang` | Selected language |
| `ew-theme` | Light/dark theme |

## 🏆 InnoSTEM KaSKuM 2026

Projek ini dicipta untuk Pertandingan Mini InnoSTEM dalam Karnival STEM dan Keusahawanan Matrikulasi 2026 (KaSKuM 2026).

Tema: **Inovator STEM: Memacu Inovasi, Melestarikan Masa Hadapan**

## 📝 Lesen

Projek ini adalah karya asal untuk tujuan pertandingan pendidikan.
