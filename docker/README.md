# Docker deployment

Konfigurasi utama di `docker/compose.yml` dibuat untuk production/VPS. Hanya
frontend yang dipublikasikan ke host dan, secara default, hanya pada
`127.0.0.1:3001`. MySQL, Redis, dan backend hanya dapat diakses melalui network
internal Compose. Pasang Nginx/Caddy di depan port frontend untuk HTTPS.

## Deploy pertama kali di VPS

Prasyarat: Docker Engine dengan plugin Compose, Git, domain yang mengarah ke
VPS, dan reverse proxy.

```bash
git clone <repository-url> sistem_manajemen_klinik
cd sistem_manajemen_klinik
cp docker/.env.vps.example .env
```

Edit `.env`, ganti seluruh nilai `CHANGE_ME`, serta isi domain publik. Buat
secret acak, misalnya dengan `openssl rand -hex 32`. Lalu validasi dan jalankan:

```bash
docker compose --env-file .env -f docker/compose.yml config --quiet
docker compose --env-file .env -f docker/compose.yml up -d --build --wait
docker compose --env-file .env -f docker/compose.yml ps
```

Reverse proxy diarahkan ke `http://127.0.0.1:3001`. Path `/api`, `/uploads`, dan
`/socket.io` diteruskan oleh server Next.js ke backend internal, sehingga port
4004 tidak perlu dibuka pada firewall VPS.

Data MySQL, Redis, dan unggahan backend disimpan dalam named volumes. Perintah
`docker compose down` tidak menghapus data; jangan gunakan opsi `-v` kecuali
memang ingin menghapus seluruh data persisten.

phpMyAdmin tidak aktif secara default. Untuk akses sementara yang aman melalui
SSH tunnel:

```bash
docker compose --env-file .env -f docker/compose.yml --profile tools up -d phpmyadmin
ssh -L 8082:127.0.0.1:8082 user@vps
```

Lalu buka `http://127.0.0.1:8082`. Hentikan lagi setelah selesai dengan
`docker compose --env-file .env -f docker/compose.yml --profile tools stop phpmyadmin`.

## Development lokal

```bash
npm run docker:dev
```

Perintah ini memakai `docker/dev.env` dan override development. Nilai di file
tersebut hanya untuk komputer lokal dan tidak boleh dipakai di VPS.
