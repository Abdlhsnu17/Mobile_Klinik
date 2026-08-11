import type { Supplier } from "../../types"

const SUPPLIER_SEED_DATE = "2026-01-01T00:00:00.000Z"

const supplierSeeds = [
  ["PT Sehat Sentosa Medika", "Andi Pratama", "0812-1000-0001", "Jl. Melati No. 12, Jakarta Pusat"],
  ["CV Anugerah Farma", "Siti Rahma", "0812-1000-0002", "Jl. Asia Afrika No. 45, Bandung"],
  ["PT Nusantara Alkesindo", "Budi Santoso", "0812-1000-0003", "Jl. Diponegoro No. 18, Surabaya"],
  ["PT Mitra Obat Indonesia", "Rina Kurniawati", "0812-1000-0004", "Jl. Pemuda No. 27, Semarang"],
  ["CV Prima Medika Jaya", "Dedi Irawan", "0812-1000-0005", "Jl. Kaliurang Km 5, Sleman"],
  ["PT Cipta Kesehatan Abadi", "Maya Lestari", "0812-1000-0006", "Jl. Gatot Subroto No. 88, Medan"],
  ["PT Sumber Farmasi Utama", "Fajar Nugroho", "0812-1000-0007", "Jl. Sudirman No. 34, Pekanbaru"],
  ["CV Karya Medis Mandiri", "Nur Aisyah", "0812-1000-0008", "Jl. Ahmad Yani No. 56, Makassar"],
  ["PT Bina Sehat Persada", "Arif Hidayat", "0812-1000-0009", "Jl. Veteran No. 21, Malang"],
  ["PT Global Diagnostik Indonesia", "Putri Maharani", "0812-1000-0010", "Jl. Teuku Umar No. 17, Denpasar"],
  ["CV Cahaya Farma Sejahtera", "Rizky Maulana", "0812-1000-0011", "Jl. Pahlawan No. 9, Bogor"],
  ["PT Sarana Medika Nusantara", "Dian Permata", "0812-1000-0012", "Jl. Margonda Raya No. 103, Depok"],
  ["PT Inti Alat Kesehatan", "Agus Setiawan", "0812-1000-0013", "Jl. Jenderal Sudirman No. 62, Tangerang"],
  ["CV Berkah Medifarma", "Lina Marlina", "0812-1000-0014", "Jl. KH Noer Ali No. 25, Bekasi"],
  ["PT Pusaka Medika Indonesia", "Hendra Wijaya", "0812-1000-0015", "Jl. Raden Fatah No. 40, Palembang"],
  ["PT Amanah Distribusi Farma", "Fitri Handayani", "0812-1000-0016", "Jl. Adi Sucipto No. 31, Solo"],
  ["CV Sentra Kesehatan Mandiri", "Yoga Saputra", "0812-1000-0017", "Jl. Sisingamangaraja No. 14, Padang"],
  ["PT Graha Laboratorium Utama", "Nadia Oktaviani", "0812-1000-0018", "Jl. Antasari No. 73, Banjarmasin"],
  ["PT Medika Karya Bersama", "Wahyu Firmansyah", "0812-1000-0019", "Jl. Tanjungpura No. 29, Pontianak"],
  ["CV Solusi Farmasi Indonesia", "Citra Dewi", "0812-1000-0020", "Jl. Basuki Rahmat No. 51, Balikpapan"],
  ["PT Abadi Sejahtera Medika", "Eko Prasetyo", "0812-1000-0021", "Jl. Sam Ratulangi No. 16, Manado"],
  ["PT Kencana Alkes Mandiri", "Desi Anggraini", "0812-1000-0022", "Jl. Pattimura No. 38, Ambon"],
  ["CV Tunas Medika Farma", "Ilham Ramadhan", "0812-1000-0023", "Jl. Cendrawasih No. 11, Jayapura"],
  ["PT Bumi Farmasi Nusantara", "Ratna Sari", "0812-1000-0024", "Jl. Gajah Mada No. 67, Bandar Lampung"],
  ["PT Sinergi Kesehatan Prima", "Reza Fahlevi", "0812-1000-0025", "Jl. Soekarno Hatta No. 90, Banda Aceh"],
  ["CV Mulia Alat Medis", "Ayu Wulandari", "0812-1000-0026", "Jl. Sriwijaya No. 24, Mataram"],
  ["PT Pro Medika Distribusi", "Galih Pamungkas", "0812-1000-0027", "Jl. Dr. Wahidin No. 19, Cirebon"],
  ["PT Visi Farma Indonesia", "Tika Amelia", "0812-1000-0028", "Jl. Sultan Agung No. 42, Yogyakarta"],
  ["CV Sahabat Klinik Sejahtera", "Bayu Kurniawan", "0812-1000-0029", "Jl. Merdeka No. 35, Kediri"],
  ["PT Artha Medis Utama", "Novianti Putri", "0812-1000-0030", "Jl. Hayam Wuruk No. 58, Jember"],
] as const

export const defaultSuppliers: Supplier[] = supplierSeeds.map(
  ([name, contactPerson, phone, address], index) => {
    const sequence = String(index + 1).padStart(3, "0")

    return {
      id: `supplier-${sequence}`,
      code: `SUP-${sequence}`,
      name,
      contactPerson,
      phone,
      email: `supplier${sequence}@example.com`,
      address,
      status: (index + 1) % 6 === 0 ? "nonaktif" : "aktif",
      notes: "Data dummy supplier untuk pengujian modul pengadaan.",
      createdAt: SUPPLIER_SEED_DATE,
      updatedAt: SUPPLIER_SEED_DATE,
    }
  },
)
