# 💍 Dashboard Planner Nikah A–Z

Dashboard web + **Jemputan Digital & RSVP** untuk pembeli template **Planner Nikah A–Z** (Google Sheets). Buka di **telefon, tablet dan laptop**, dan data dikemas kini terus dari Google Sheet anda.

- `/` : dashboard peribadi (perlu PIN), termasuk tab **✏️ Edit** untuk tambah & kemas kini data terus ke Google Sheet
- `/jemputan` : kad jemputan digital + RSVP untuk dikongsi di WhatsApp (4 reka bentuk)

**Created by Hizami Radzi**

## Pasang dalam 1 klik

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fplannernikahhq-bot%2Fplanner-nikah-dashboard&env=APPS_SCRIPT_URL&envDescription=Tampal%20Web%20App%20URL%20dari%20Apps%20Script%20(bermula%20https%3A%2F%2Fscript.google.com%2Fmacros%2Fs%2F%20dan%20berakhir%20%2Fexec)&envLink=https%3A%2F%2Fgithub.com%2Fplannernikahhq-bot%2Fplanner-nikah-dashboard%23cara-dapatkan-apps_script_url&project-name=dashboard-nikah&repository-name=dashboard-nikah)

Semasa deploy, Vercel akan minta satu nilai sahaja: **APPS_SCRIPT_URL**.

## Cara dapatkan APPS_SCRIPT_URL

1. Buka salinan Google Sheet **Planner Nikah A–Z** anda.
2. Isi **PIN** (min 6 aksara, campur huruf & nombor) di tab **Dashboard**, sel **C13**.
3. **Extensions → Apps Script → Deploy → New deployment**.
4. Klik ⚙️ **Select type → Web app**.
   - **Execute as:** Me
   - **Who has access:** Anyone
5. **Deploy → Authorize access** → pilih akaun Google anda → **Advanced → Go to … (unsafe)** → **Allow**.
6. Salin **Web app URL** (berakhir dengan `/exec`). Itulah `APPS_SCRIPT_URL`.

Panduan penuh bergambar ada dalam PDF **Cara Sambung Dashboard** yang disertakan bersama template.

## 💍 Menu dalam Google Sheet

Selepas skrip dibenarkan, bar menu Google Sheet ada menu **💍 Planner Nikah** (tiada kod perlu dibuka):

- **🔗 Link dashboard & jemputan saya**: link dashboard, link jemputan & Web app URL (dengan butang Salin).
- **✅ Semak sambungan dashboard**: semak PIN, nama tab, deploy & sambungan.
- **🧹 Padam data contoh**: buang data contoh template (data anda sendiri tidak disentuh).
- **✏️ Ubah pilihan dropdown** / **✔️ Siap ubah dropdown**: tambah pilihan baharu dalam dropdown.
- **🔧 Baiki**: pasang semula dropdown atau pulihkan tab Jemputan Digital & RSVP Online.

## ✏️ Edit dari dashboard

Tab **Edit** membolehkan anda tambah, kemas kini dan padam rekod terus dari telefon: Bajet, Bayaran, Tetamu, Checklist, Urusan Nikah, Hantaran, Vendor, Tentatif, AJK, Duit Salam, Simpanan, RSVP Online dan Maklumat Majlis.

- Semua perubahan ditulis ke Google Sheet anda (perlu PIN).
- Hanya kolum input ditulis. Kolum formula (automatik) tidak disentuh.
- Pilihan dropdown dibaca terus dari Google Sheet.

### Kemas kini (pembeli lama)

1. **Skrip Google Sheet:** buka [`apps-script/Code.gs`](apps-script/Code.gs) → salin semua → dalam Apps Script, ganti semua kod lama → 💾 Save →
   **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy** (URL kekal sama).
2. **Laman Vercel:** laman anda ialah salinan kod pada hari anda deploy. Untuk kod terkini, klik butang **Deploy** di atas sekali lagi
   (beri nama repo baharu, cth. `dashboard-nikah-2`, dan tampal `APPS_SCRIPT_URL` yang sama). Link laman baharu akan berbeza.
Jika dropdown tiada dalam tab template: menu **💍 Planner Nikah → 🔧 Baiki → Pasang semula semua dropdown**.

Laman demo boleh dijadikan *baca sahaja* dengan Environment Variable `READ_ONLY = 1` di Vercel.

## Jemputan Digital & RSVP

1. Isi tab **Jemputan Digital** dalam Google Sheet (kotak kuning), termasuk pilihan reka bentuk:
   **Lavender Kasih**, **Ivory Emas**, **Gerbang Nur** atau **Zamrud Songket**.
2. Kongsi jemputan: dashboard → menu **⋯ → 💬 Kongsi jemputan** → taip nama tetamu (pilihan) → **Hantar di WhatsApp**.
3. Jawapan RSVP tetamu masuk terus ke tab **RSVP Online**, dan dipaparkan dalam dashboard (tab Tetamu).

Tip:
- `?reka=lavender|ivory|gerbang|zamrud` : pratonton reka bentuk lain.
- `?untuk=Keluarga%20Encik%20Ali` : papar nama tetamu di muka depan.

Sudah deploy versi lama? Tampal `Code.gs` baharu dalam Apps Script, klik menu **💍 Planner Nikah → 🔧 Baiki → Pulihkan tab Jemputan Digital & RSVP Online**, kemudian
**Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy** (URL kekal sama).

## Keselamatan

- Data kekal dalam Google Sheet **anda**. Dashboard ini tidak menyimpan data di mana-mana server.
- URL Apps Script disimpan sebagai *Environment Variable* dalam Vercel, jadi ia tidak didedahkan kepada pelayar.
- Data hanya dipaparkan jika **PIN** betul.
- Nombor telefon tetamu **tidak** dihantar ke dashboard.
- Skrip hanya boleh membaca & mengemas kini fail Google Sheet itu sahaja (`@OnlyCurrentDoc`).
- PIN salah 10 kali dari satu peranti = peranti itu dikunci 15 minit (peranti lain tidak terjejas).
- Halaman tidak diindeks oleh Google (`noindex`).
- Jemputan hanya memaparkan butiran majlis. Bajet dan senarai tetamu tidak didedahkan.
- RSVP dilindungi had kekerapan, perangkap bot dan penapis formula.

## Struktur

| Fail | Fungsi |
|---|---|
| `index.html`, `app.js`, `style.css` | Aplikasi dashboard (tanpa library luar) |
| `api/data.js` | Proksi selamat Vercel → Apps Script (dashboard) |
| `api/edit.js` | Baca & simpan rekod dari tab Edit (perlu PIN) |
| `jemputan.html`, `jemputan.js`, `jemputan.css` | Kad jemputan digital (4 reka bentuk) |
| `api/jemputan.js`, `api/rsvp.js`, `api/page.js` | Baca butiran jemputan, hantar RSVP, papar halaman |
| `apps-script/Code.gs` | Salinan rujukan skrip dalam template Google Sheet |
| `vercel.json` | Header keselamatan |

Jika `APPS_SCRIPT_URL` belum diisi, dashboard dan jemputan dibuka dalam **Mod Demo** dengan data contoh.
