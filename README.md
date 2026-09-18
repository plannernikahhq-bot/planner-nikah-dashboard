# 💍 Dashboard Planner Nikah A–Z

Dashboard web untuk pembeli template **Planner Nikah A–Z** (Google Sheets). Buka di **telefon, tablet dan laptop**, dan data dikemas kini terus dari Google Sheet anda.

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

## Keselamatan

- Data kekal dalam Google Sheet **anda**. Dashboard ini tidak menyimpan data di mana-mana server.
- URL Apps Script disimpan sebagai *Environment Variable* dalam Vercel, jadi ia tidak didedahkan kepada pelayar.
- Data hanya dipaparkan jika **PIN** betul. 10 kali PIN salah akan dikunci 15 minit.
- Nombor telefon tetamu **tidak** dihantar ke dashboard.
- Skrip hanya boleh membaca fail Google Sheet itu sahaja (`@OnlyCurrentDoc`).
- Halaman tidak diindeks oleh Google (`noindex`).

## Struktur

| Fail | Fungsi |
|---|---|
| `index.html`, `app.js`, `style.css` | Aplikasi dashboard (tanpa library luar) |
| `api/data.js` | Proksi selamat Vercel → Apps Script |
| `apps-script/Code.gs` | Salinan rujukan skrip dalam template Google Sheet |
| `vercel.json` | Header keselamatan |

Jika `APPS_SCRIPT_URL` belum diisi, dashboard dibuka dalam **Mod Demo** dengan data contoh.
