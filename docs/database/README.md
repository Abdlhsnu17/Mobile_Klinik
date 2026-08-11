# Database Structure

- `database/schema.sql` adalah dump referensi struktur tabel hasil bootstrap backend.
- `database/migrations/` berisi migrasi SQL bertahap untuk perubahan skema yang aman.
- `database/seeds/` disiapkan untuk seed SQL jika nanti dibutuhkan.

Source of truth skema aplikasi tetap berada di `apps/backend/src/models/store.ts`.
