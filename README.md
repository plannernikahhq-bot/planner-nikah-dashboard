# 💍 Dashboard Planner Nikah A–Z

Dashboard web + **Jemputan Digital & RSVP** untuk pembeli template **Planner Nikah A–Z** (Google Sheets). Buka di **telefon, tablet dan laptop**, dan data dikemas kini terus dari Google Sheet anda.

- `/` : dashboard peribadi (perlu PIN)
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

## Jemputan Digital & RSVP

1. Isi tab **Jemputan Digital** dalam Google Sheet (kotak kuning), termasuk pilihan reka bentuk:
   **Lavender Kasih**, **Ivory Emas**, **Gerbang Nur** atau **Zamrud Songket**.
2. Kongsi link `https://nama-projek-anda.vercel.app/jemputan` kepada tetamu.
3. Jawapan RSVP tetamu masuk terus ke tab **RSVP Online**, dan dipaparkan dalam dashboard (tab Tetamu).

Tip:
- `?reka=lavender|ivory|gerbang|zamrud` : pratonton reka bentuk lain.
- `?untuk=Keluarga%20Encik%20Ali` : papar nama tetamu di muka depan.

Sudah deploy versi lama? Tampal `Code.gs` baharu dalam Apps Script, jalankan `setupJemputan` sekali, kemudian
**Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy** (URL kekal sama).

## Keselamatan

- Data kekal dalam Google Sheet **anda**. Dashboard ini tidak menyimpan data di mana-mana server.
- URL Apps Script disimpan sebagai *Environment Variable* dalam Vercel, jadi ia tidak didedahkan kepada pelayar.
- Data hanya dipaparkan jika **PIN** betul. 10 kali PIN salah akan dikunci 15 minit.
- Nombor telefon tetamu **tidak** dihantar ke dashboard.
- Skrip hanya boleh membaca fail Google Sheet itu sahaja (`@OnlyCurrentDoc`).
- Halaman tidak diindeks oleh Google (`noindex`).
- Jemputan hanya memaparkan butiran majlis. Bajet dan senarai tetamu tidak didedahkan.
- RSVP dilindungi had kekerapan, perangkap bot dan penapis formula.

## Struktur

| Fail | Fungsi |
|---|---|
| `index.html`, `app.js`, `style.css` | Aplikasi dashboard (tanpa library luar) |
| `api/data.js` | Proksi selamat Vercel → Apps Script (dashboard) |
| `jemputan.html`, `jemputan.js`, `jemputan.css` | Kad jemputan digital (4 reka bentuk) |
| `api/jemputan.js`, `api/rsvp.js`, `api/page.js` | Baca butiran jemputan, hantar RSVP, papar halaman |
| `apps-script/Code.gs` | Salinan rujukan skrip dalam template Google Sheet |
| `vercel.json` | Header keselamatan |

Jika `APPS_SCRIPT_URL` belum diisi, dashboard dan jemputan dibuka dalam **Mod Demo** dengan data contoh.
