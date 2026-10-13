# FR PrintMargin v1.1 — Soft Pastel

Aplikasi Progressive Web App (PWA) kalkulator harga untuk **FR Dream Resources**. Tanpa login, tanpa server atau subscription. Data disimpan dalam peranti, bukan dalam repository GitHub.

## Yang baharu dalam v1.1
- **Tema cerah kekal:** putih dengan baby blue, lavender, peach dan mint. Dark mode dan butang toggle dibuang, termasuk untuk data yang pernah menyimpan `theme: dark`.
- **iPhone tanpa auto-zoom input:** semua input yang boleh difokuskan sekurang-kurangnya `16px`. Viewport dikonfigurasi tanpa user scaling seperti diminta; hasil sebenar bergantung pada iOS/Safari, dan ciri pembesaran aksesibiliti sistem mungkin masih wujud.
- **Icon baharu:** gambar printer, kertas dan simbol peratus dalam warna pastel. PNG 180px (`apple-touch-icon`), 192px, 512px, serta favicon 32px disertakan. Nama ikon mengandungi v11 supaya rujukan lama tidak digunakan oleh cache iPhone.
- **Offline shell dikemas kini:** versi cache `fr-printmargin-v1.1.0` supaya aset CSS/JS/ikon baharu dimuat semula.
- Ketiga-tiga **formula dan modul asal dikekalkan**.

## Tiga kalkulator
1. **Margin & Harga Jual:** kos kilang atau cetak sendiri, kos seunit, kos satu tempahan, margin sasaran, markup, harga jual pilihan sendiri.
2. **Kalkulator Saiz:** unit ft/in/cm/mm/m, keluasan sqft/m², kadar kilang, pembaziran, minimum caj, finishing dan harga jual.
3. **Kalkulator Sticker:** saiz kertas A4/A3/A5/SRA3/custom, bentuk segi empat/bulat, margin, jarak, bleed, susunan putar 90°, preview kertas, jumlah sheet dan harga jual.

Preset, sejarah pengiraan, copy ringkasan dalaman dan backup JSON tersedia.

## Kemas kini daripada v1.0 ke v1.1 menggunakan GitHub Pages
**PENTING:** Jangan cipta repository baharu. Kekalkan repository dan URL asal supaya sejarah/preset yang disimpan pada origin sedia ada lebih berpeluang kekal.

1. **Dalam PWA lama pada iPhone:** buka `Data & Backup` → `Export Backup JSON`. Simpan JSON di aplikasi Files/iCloud Drive dahulu.
2. Pada PC, unzip `FR-PrintMargin-v1.1.zip`.
3. Buka repository GitHub yang sama (`fr-printmargin`) dan upload **kandungan di dalam folder** `FR-PrintMargin-v1.1` ke root repository melalui **Add file → Upload files**. Timpa fail versi lama (`index.html`, `styles.css`, `app.js`, `sw.js`, `manifest.webmanifest`, dll.) serta upload keseluruhan folder `icons`.
4. Klik **Commit changes**. Tetapan **Settings → Pages → main / (root)** tidak perlu diubah jika sudah aktif.
5. Tunggu GitHub Pages publish, sambung iPhone ke Internet, buka URL aplikasi melalui Safari dahulu dan refresh. Tutup dan buka semula PWA pada Home Screen untuk menerima cache v1.1. Kadang-kadang refresh kali kedua diperlukan kerana kemas kini service worker berlaku berperingkat.
6. **Jika ikon lama huruf F masih muncul:** selepas backup data, buang ikon PWA lama daripada Home Screen dan gunakan Safari → Share → **Add to Home Screen** semula. Ini membolehkan iOS mengambil `apple-touch-icon` baharu. Proses buang/pasang semula *mungkin memadam storan aplikasi* — sebab itu backup JSON wajib dibuat terlebih dahulu. Import semula jika data tiada.

> Jangan padam IndexedDB/storage Safari atau tukar domain/site URL tanpa backup. Simpanan tempatan tidak mempunyai cloud sync.

## Cara buka pada komputer

Buka PowerShell/Terminal dalam folder aplikasi, jalankan:

```powershell
python -m http.server 8080
```

Kemudian buka `http://localhost:8080/`. Jangan sekadar double click `index.html` kerana ES modules biasanya disekat di `file://`.

## Sokongan iPhone
- Buka aplikasi melalui **Safari > Share > Add to Home Screen**. HTTPS GitHub Pages diperlukan untuk service worker.
- `meta viewport` mengehadkan zoom halaman berdasarkan permintaan pengguna. iOS mungkin mengendalikan pilihan aksesibiliti sendiri di luar kawalan web app.
- Saiz font input >=16px untuk mengurangkan auto-zoom apabila menaip pada iPhone.
- Selepas dibuka semasa online dan asset di-cache, kebanyakan fungsi boleh digunakan offline. Uji pada peranti sebenar.

## Pengiraan
- `Margin = (Harga jual − Kos) / Harga jual × 100%`.
- `Markup = (Harga jual − Kos) / Kos × 100%`.
- `Harga sasaran = Kos / (1 − Margin sasaran/100)`.
- Kos order dikongsi ikut kuantiti produk; harga dibundarkan ke atas mengikut tetapan.
- Layout sticker menggunakan grid seragam, memilih susunan asal atau putar 90°, bukan mixed nesting.
- Kos yang belum diisi (cukai, sewa, caj supplier khas, dll.) tidak termasuk dalam untung yang dilaporkan.

## Ujian formula

Jika ada Node.js:

```powershell
node --test tests/calculations.test.mjs
```

7 ujian pengiraan disediakan. Penampilan dan sentuhan sebenar Safari iOS perlu diuji pada iPhone.

## Fail utama
- `index.html` — borang, metadata iPhone dan manifest
- `styles.css` — tema pastel dan responsif
- `app.js` — interaksi, pengiraan dan simpanan IndexedDB
- `math.js` — formula pengiraan
- `sw.js` — offline cache versi 1.1
- `manifest.webmanifest` dan `icons/` — identiti dan ikon aplikasi
