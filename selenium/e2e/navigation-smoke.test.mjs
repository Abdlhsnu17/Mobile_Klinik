import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { By, until } from "selenium-webdriver";
import {
  createDriver,
  openPath,
  saveScreenshot,
  timeout,
  waitForApplication,
  waitForPath,
} from "../support/browser.mjs";
import { adminPassword, adminUsername } from "../support/config.mjs";

// Kontrak tampilan utama setiap fitur. Test tidak cukup hanya memastikan halaman
// tidak kosong: judul dan label fitur/kolom penting juga harus tetap tersedia.
// Rute, label sidebar, dan teks berikut mengikuti struktur modul klinik saat ini
// (lib/module-registry.ts), bukan aplikasi manajemen aset lama.
const routes = [
  {
    name: "Dashboard",
    pathname: "/dashboard",
    expectedTexts: ["Dashboard Operasional", "Selamat Datang", "Menu Utama"],
  },
  {
    name: "Pendaftaran",
    pathname: "/antrian",
    heading: "Pendaftaran Pasien",
    expectedTexts: ["Daftar Antrian", "Cari pasien, dokter, layanan, no. antrian"],
  },
  {
    name: "Rekam Medic",
    pathname: "/pasien",
    heading: "Data Pasien",
    expectedTexts: ["Daftar Pasien", "No. RM"],
  },
  {
    name: "Layanan",
    pathname: "/layanan-klinis",
    heading: "Katalog Layanan",
    expectedTexts: ["Daftar Layanan", "Tambah Layanan", "Cari layanan..."],
  },
  {
    name: "Pemeriksaan",
    pathname: "/pemeriksaan",
    heading: "Ruang Pemeriksaan",
    expectedTexts: ["Alur Pemeriksaan Pasien"],
  },
  {
    name: "Rawat Inap",
    pathname: "/rawat-inap",
    expectedTexts: ["Bed Tersedia", "Bed Terisi", "Status Bed & Kamar"],
  },
  {
    name: "Laboratorium",
    pathname: "/laboratorium",
    expectedTexts: ["Pengecekan Laboratorium", "Hasil Pemeriksaan"],
  },
  {
    name: "Rujukan",
    pathname: "/rujukan",
    heading: "Manajemen Rujukan",
    expectedTexts: ["Daftar Rujukan", "Direktori Fasilitas"],
  },
  {
    name: "Dokter",
    pathname: "/dokter",
    heading: "Data Dokter",
    expectedTexts: ["Daftar Dokter", "Tambah Dokter"],
  },
  {
    name: "Farmasi",
    pathname: "/farmasi",
    expectedTexts: ["Resep Diminta", "Sedang Diproses", "Daftar Permintaan Farmasi"],
  },
  {
    name: "Depo Farmasi",
    pathname: "/depo-farmasi",
    heading: "Data Obat",
    expectedTexts: ["Daftar Obat", "Tambah Obat Baru"],
  },
  {
    name: "Pembayaran",
    pathname: "/pembayaran",
    heading: "Modul Pembayaran & Kasir",
    expectedTexts: ["Tagihan Terbuka", "Transaksi Hari Ini"],
  },
  {
    name: "Asuransi",
    pathname: "/asuransi",
    heading: "Asuransi dan BPJS",
    expectedTexts: ["Profil Penjamin Pasien", "Tambah Profil"],
  },
  {
    name: "Laporan",
    pathname: "/laporan",
    // "Top Morbiditas" berpindah ke tab "Klinis"; tab default "Ringkasan"
    // menampilkan kartu Pasien Hari Ini, Pasien Bulanan, dan Pendapatan Tahun Ini.
    expectedTexts: ["Pasien Hari Ini", "Pasien Bulanan", "Pendapatan Tahun Ini"],
  },
  {
    name: "Alat Medis",
    pathname: "/alat-medis",
    heading: "Alat Medis",
    expectedTexts: ["Daftar Alat Medis", "Tambah Alat", "Cari alat medis..."],
  },
  {
    name: "Komunikasi",
    pathname: "/komunikasi",
    expectedTexts: ["Notifikasi Pengingat", "Survei Kepuasan"],
  },
  {
    name: "Unggahan",
    pathname: "/unggahan",
    heading: "Unggahan Dokumen",
    expectedTexts: ["Unggah Dokumen Baru", "Judul Dokumen"],
  },
  {
    name: "Pengguna",
    pathname: "/pengguna",
    heading: "Kelola Pengguna",
    expectedTexts: ["Daftar Pengguna", "Tambah Pengguna", "Cari pengguna..."],
  },
  {
    name: "Pengaturan",
    pathname: "/pengaturan",
    heading: "Pengaturan",
    // "Informasi Sistem" berada di tab "Sistem"; tab default "Akun" menampilkan
    // kartu Profil Pengguna dan Keamanan Akun.
    expectedTexts: ["Konfigurasi sistem dan tema aplikasi", "Profil Pengguna", "Keamanan Akun"],
  },
].sort((left, right) => left.name.localeCompare(right.name, "id"));

let driver;

before(async () => {
  await waitForApplication();
  driver = await createDriver();
});

after(async () => {
  if (driver) await driver.quit();
});

// Urutan pengujian mengikuti alur nyata pengguna: login lebih dulu, lalu
// menjelajah seluruh fitur (diurutkan abjad), dan diakhiri dengan logout.
test("Login dengan akun admin", async () => {
  try {
    await openPath(driver, "/login");
    const usernameInput = await driver.wait(until.elementLocated(By.id("username")), timeout);
    await driver.wait(until.elementIsVisible(usernameInput), timeout);
    await usernameInput.sendKeys(adminUsername);
    await driver.findElement(By.id("password")).sendKeys(adminPassword);
    await saveScreenshot(driver, "smoke-Login", "pass");
    await driver.findElement(By.xpath('//button[@type="submit"][normalize-space()="Login"]')).click();
    await waitForPath(driver, "/dashboard");
  } catch (error) {
    await saveScreenshot(driver, "smoke-Login", "fail");
    throw error;
  }
});

function normalizeText(value) {
  return value.replace(/\s+/g, " ").trim().toLocaleLowerCase("id-ID");
}

async function getPageContractText() {
  return driver.executeScript(() => {
    const bodyText = document.body?.innerText || "";
    const attributeText = Array.from(
      document.querySelectorAll("input, textarea, select, [aria-label], [title]"),
    ).flatMap((element) => [
      element.getAttribute("placeholder"),
      element.getAttribute("aria-label"),
      element.getAttribute("title"),
    ]).filter(Boolean);

    return [bodyText, ...attributeText].join("\n");
  });
}

async function navigateByFeatureClick(pathname, menuName) {
  const links = await driver.findElements(By.css(`a[href="${pathname}"]`));
  let link = null;
  for (const candidate of links) {
    if (await candidate.isDisplayed()) {
      const text = normalizeText(await candidate.getText());
      if (text === normalizeText(menuName)) {
        link = candidate;
        break;
      }
      if (!link && text) link = candidate;
    }
  }

  assert.ok(link, `Menu sidebar untuk ${pathname} tidak ditemukan atau tidak terlihat`);
  await driver.executeScript(
    "arguments[0].scrollIntoView({block: 'center', inline: 'nearest'})",
    link,
  );
  await driver.wait(until.elementIsEnabled(link), timeout);
  await link.click();
  await waitForPath(driver, pathname);
}

for (const { name, pathname, heading, expectedTexts } of routes) {
  test(`Menu ${name} dapat diklik dan fitur utamanya tampil`, async () => {
    try {
      await navigateByFeatureClick(pathname, name);
      await driver.wait(until.elementLocated(By.css("body")), timeout);

      if (heading) {
        await driver.wait(async () => {
          const headings = await driver.findElements(By.css("h1"));
          const headingTexts = await Promise.all(headings.map((element) => element.getText()));
          return headingTexts.some((text) => normalizeText(text).includes(normalizeText(heading)));
        }, timeout, `Judul halaman "${heading}" tidak ditemukan`);
      }

      await driver.wait(async () => {
        const text = normalizeText(await getPageContractText());
        return expectedTexts.every((expected) => text.includes(normalizeText(expected)));
      }, timeout, `Fitur/kolom wajib halaman ${pathname} tidak lengkap`);

      const bodyText = await getPageContractText();
      assert.ok(bodyText.trim().length > 0, `Halaman ${pathname} kosong`);
      assert.doesNotMatch(bodyText, /404|page not found/i);
      for (const expected of expectedTexts) {
        assert.ok(
          normalizeText(bodyText).includes(normalizeText(expected)),
          `Fitur/kolom "${expected}" tidak ditemukan pada ${pathname}`,
        );
      }
      await saveScreenshot(driver, `smoke-${name}`, "pass");
    } catch (error) {
      await saveScreenshot(driver, `smoke-${name}`, "fail");
      throw error;
    }
  });
}

test("Logout dari sistem", async () => {
  try {
    const logoutButton = await driver.wait(
      until.elementLocated(By.css('button[aria-label="Keluar"]')),
      timeout,
    );
    await driver.wait(until.elementIsVisible(logoutButton), timeout);
    await logoutButton.click();
    await waitForPath(driver, "/login");

    const currentUser = await driver.executeScript(
      "return localStorage.getItem('clinic_current_user')",
    );
    assert.equal(currentUser, null, "Sesi pengguna masih tersimpan setelah logout");
    await saveScreenshot(driver, "smoke-Logout", "pass");
  } catch (error) {
    await saveScreenshot(driver, "smoke-Logout", "fail");
    throw error;
  }
});
