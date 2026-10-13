# FR PrintMargin v1.0
**Kalkulator harga printing untuk FR Dream Resources.** Aplikasi PWA percuma, tanpa login, tanpa backend berbayar, tanpa kebergantungan luar.

## Tiga modul
1. **Margin & Harga:** outsource kilang atau cetak sendiri, kos seunit, kos setiap tempahan, sasaran margin dan harga jual manual.
2. **Kalkulator Saiz:** dimensi ft/in/cm/mm/m, keluasan sqft/m², kos kilang per sqft, allowance, minimum keluasan, finishing dan harga jual.
3. **Kalkulator Sticker:** kertas A4/A3/A5/SRA3/custom, sticker segi empat atau bulat, margin kertas, gap, bleed, susunan standard atau putar 90°, preview layout, jumlah sheet, kos dan margin.

**Lain-lain:** preset kalkulator, sejarah disimpan secara manual, copy ringkasan untuk kegunaan dalaman, tema gelap/cerah, backup JSON, sokongan offline selepas install/cache.

## Cara paling mudah untuk buka di PC
Buka terminal (PowerShell) di folder aplikasi dan jalankan salah satu:

```powershell
python -m http.server 8080
```

Kemudian buka `http://localhost:8080/` di Chrome atau Edge. Aplikasi boleh berfungsi tanpa memuat turun `npm` atau dependensi lain. Jika Python tiada tetapi VS Code ada, boleh gunakan extension Live Server. **Jangan hanya double-click `index.html`** kerana sebahagian browser menyekat `import` modul JavaScript melalui `file://`.

## Deploy PERCUMA ke GitHub Pages (PWA online)
1. Daftar/log masuk ke GitHub (akaun percuma).
2. Cipta repository **public** bernama `fr-printmargin`.
3. Upload semua fail dan folder di dalam folder `FR-PrintMargin-v1.0` ke **root** repository (pastikan `index.html`, `app.js`, `math.js`, `sw.js`, `styles.css`, `manifest.webmanifest` dan `icons/` ada).
4. Buka **Settings → Pages**, di bahagian **Build and deployment** pilih `Deploy from a branch`, branch `main` dan folder `/(root)`. Save.
5. Buka URL yang GitHub Pages beri (biasanya `https://USERNAME.github.io/fr-printmargin/`). Kali pertama perlu online untuk cache app. Kemudian ia boleh digunakan offline selepas aset disimpan oleh service worker.
6. Pada Android Chrome: menu `⋮` → **Install app** / **Add to Home screen**. Pada iPhone Safari: **Share → Add to Home Screen**. Pada Chrome/Edge desktop: butang Install jika ditawarkan oleh browser.

> GitHub Pages percuma mengikut polisi/kuota semasa GitHub. `HTTPS` adalah keperluan untuk pemasangan PWA dan service worker (kecuali pada `localhost`).

## Simpanan data & privasi
- Data disimpan **di browser/peranti itu sahaja** menggunakan IndexedDB (fallback kepada localStorage jika IndexedDB tidak tersedia).
- **Tidak ada login atau sync automatik** antara telefon dan PC.
- Data mungkin hilang apabila browser storage dibersihkan atau aplikasi dipadam. **Export backup JSON** selalu jika data penting. Import akan menggantikan data sedia ada.
- Salin Ringkasan termasuk KOS DALAMAN dan untung, bukan mesej harga pelanggan.
- Bila deploy versi baharu, naikkan `CACHE_NAME` dalam `sw.js` untuk memaksa aset baharu dimuat. Buka semula aplikasi sekali secara online untuk menerima kemas kini.

## Asas pengiraan
- **Margin:** `(Harga jual - Kos) / Harga jual × 100%`.
- **Markup:** `(Harga jual - Kos) / Kos × 100%`.
- **Harga sasaran:** `Kos / (1 - Margin/100)`, dan dibundarkan *ke atas* mengikut increment pilihan.
- Kos tempahan (courier/design/setup) diagihkan ikut bilangan unit yang dijual.
- **Sticker:** `(ruang cetak + gap) / (saiz akhir + dua sisi bleed + gap)` dibulatkan ke bawah untuk setiap dimensi; pilihan putaran 90° hanya digunakan apabila lebih banyak unit muat. Bilangan sheet dibulatkan ke atas selepas allowance reject diambil kira.
- **Sticker preview** menggunakan grid orientasi seragam sahaja, bukan pelan nesting campuran. Semak border mesin, bleed sebenar, cutting, pembaziran dan harga supplier sebelum jual.
- Hasil untung ialah **anggaran daripada kos yang dimasukkan**, bukan untung bersih perniagaan keseluruhan jika ada kos yang tidak dimasukkan (sewa, cukai, pemasaran, lain-lain).

## Ujian pengiraan (opsyenal)
Jika Node.js tersedia:
```powershell
node --test tests/calculations.test.mjs
```

## Struktur fail
- `index.html` — skrin dan borang
- `styles.css` — tema dan paparan responsif
- `app.js` — interaksi, storan, sejarah dan backup
- `math.js` — formula pengiraan dan packing sticker
- `sw.js` — cache offline
- `manifest.webmanifest` & `icons/` — identiti PWA
