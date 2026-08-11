import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { By, Key, until } from "selenium-webdriver";
import {
    baseUrl,
    createDriver,
    getSevereBrowserLogs,
    openPath,
    saveScreenshot,
    timeout,
    waitForApplication,
    waitForPath,
} from "../support/browser.mjs";
import { adminPassword, adminUsername } from "../support/config.mjs";

// Skenario regresi alur bisnis klinik nyata: pendaftaran -> pemeriksaan ->
// rawat inap / farmasi / laboratorium -> pembayaran, ditambah otentikasi dan
// manajemen pengguna berbasis role. Rute dan kontrak teks mengikuti struktur
// modul saat ini (lib/module-registry.ts), diverifikasi terhadap
// apps/frontend/app/* dan apps/backend/src/* sebelum ditulis.
const runId = `${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;
const configuredEvidenceDelay = Number(process.env.SELENIUM_EVIDENCE_DELAY_MS);
const evidenceDelayMs = Number.isFinite(configuredEvidenceDelay)
  ? Math.max(0, configuredEvidenceDelay)
  : process.env.SELENIUM_HEADLESS === "false" ? 2_500 : 0;
const configuredStepDelay = Number(process.env.SELENIUM_STEP_DELAY_MS);
const stepDelayMs = Number.isFinite(configuredStepDelay)
  ? Math.max(0, configuredStepDelay)
  : process.env.SELENIUM_HEADLESS === "false" ? 600 : 0;

const newPatient = {
  name: `Pasien Selenium ${runId}`,
  nik: `35${Date.now().toString().slice(-14)}`,
  birthDate: "1993-05-14",
  phone: `08${Date.now().toString().slice(-10)}`,
  address: `Jl. Uji Regresi No. ${runId}`,
};

const inpatientPatient = {
  noRM: `RM-SEL-${runId}-B`,
  nik: `36${Date.now().toString().slice(-14)}`,
  name: `Pasien Rawat Inap Selenium ${runId}`,
  birthDate: "1988-02-20",
  gender: "Perempuan",
  address: `Jl. Rawat Inap Selenium No. ${runId}`,
  phone: `08${(Date.now() + 1).toString().slice(-10)}`,
};

const labPatient = {
  noRM: `RM-SEL-${runId}-C`,
  nik: `37${Date.now().toString().slice(-14)}`,
  name: `Pasien Laboratorium Selenium ${runId}`,
  birthDate: "1979-11-02",
  gender: "Laki-laki",
  address: `Jl. Laboratorium Selenium No. ${runId}`,
  phone: `08${(Date.now() + 2).toString().slice(-10)}`,
};

const newBed = {
  bedNumber: `SEL-${runId}`,
  ward: "Ruang Uji Selenium",
  status: "available",
};

const doctorRoleUser = {
  username: `selenium.dokter.${runId}`,
  name: `Dokter Selenium ${runId}`,
  email: `selenium.dokter.${runId}@example.invalid`,
  password: "SeleniumDokter123",
  role: "dokter",
};

const umumRoleUser = {
  username: `selenium.umum.${runId}`,
  name: `Pengguna Umum Selenium ${runId}`,
  email: `selenium.umum.${runId}@example.invalid`,
  password: "SeleniumUmum123",
};

const state = {
  patientId: "",
  appointmentId: "",
  medicalRecordId: "",
  doctorId: "",
  doctorName: "",
  serviceId: "",
  serviceName: "",
  medicineId: "",
  pharmacyRequestId: "",
  inpatientPatientId: "",
  inpatientAppointmentId: "",
  inpatientMedicalRecordId: "",
  admissionId: "",
  bedId: "",
  labPatientId: "",
  labAppointmentId: "",
  labMedicalRecordId: "",
  labOrderId: "",
  labResultId: "",
  createdUserIds: [],
};

let driver;

before(async () => {
  await waitForApplication();
  driver = await createDriver();
});

after(async () => {
  try {
    await cleanupCreatedData();
  } finally {
    if (driver) await driver.quit();
  }
});

function assertStatus(response, expected, context = "") {
  assert.equal(
    response.status,
    expected,
    `${context} Status ${response.status}, respons: ${JSON.stringify(response.body)}`,
  );
}

function extractRows(response) {
  const payload = response.body?.data ?? response.body;
  return Array.isArray(payload) ? payload : [];
}

async function api(method, endpoint, body) {
  return driver.executeAsyncScript(
    function request(methodArg, endpointArg, bodyArg, done) {
      const headers = {};
      if (bodyArg !== null) headers["Content-Type"] = "application/json";

      fetch(endpointArg, {
        method: methodArg,
        headers,
        credentials: "include",
        body: bodyArg === null ? undefined : JSON.stringify(bodyArg),
      })
        .then(async (response) => {
          const raw = await response.text();
          let parsed = null;
          try {
            parsed = raw ? JSON.parse(raw) : null;
          } catch {
            parsed = raw;
          }
          done({ status: response.status, body: parsed });
        })
        .catch((error) => done({ status: 0, body: { message: error.message } }));
    },
    method,
    `/api${endpoint}`,
    body ?? null,
  );
}

async function loginAsAdminViaApi() {
  await api("POST", "/auth/login", { username: adminUsername, password: adminPassword });
}

async function cleanupCreatedData() {
  if (!driver) return;

  const safeApi = async (method, endpoint, body = null) => {
    try {
      await api(method, endpoint, body);
    } catch {
      // Cleanup bersifat best-effort agar kegagalan asli tetap terlihat.
    }
  };

  try {
    await driver.get(`${baseUrl}/login`);
    await loginAsAdminViaApi();
  } catch {
    // Jika login gagal, lanjutkan best-effort agar sisa cleanup tetap dicoba.
  }

  if (state.labResultId) await safeApi("DELETE", `/lab-results/${state.labResultId}`);
  if (state.labOrderId) await safeApi("DELETE", `/lab-orders/${state.labOrderId}`);
  if (state.labMedicalRecordId) await safeApi("DELETE", `/medical-records/${state.labMedicalRecordId}`);
  if (state.labAppointmentId) await safeApi("DELETE", `/appointments/${state.labAppointmentId}`);
  if (state.labPatientId) await safeApi("DELETE", `/patients/${state.labPatientId}`);

  if (state.admissionId) await safeApi("DELETE", `/hospital/admissions/${state.admissionId}`);
  if (state.bedId) await safeApi("DELETE", `/beds/${state.bedId}`);
  if (state.inpatientMedicalRecordId) await safeApi("DELETE", `/medical-records/${state.inpatientMedicalRecordId}`);
  if (state.inpatientAppointmentId) await safeApi("DELETE", `/appointments/${state.inpatientAppointmentId}`);
  if (state.inpatientPatientId) await safeApi("DELETE", `/patients/${state.inpatientPatientId}`);

  if (state.pharmacyRequestId) await safeApi("DELETE", `/pharmacy-requests/${state.pharmacyRequestId}`);
  if (state.medicalRecordId) await safeApi("DELETE", `/medical-records/${state.medicalRecordId}`);
  if (state.appointmentId) await safeApi("DELETE", `/appointments/${state.appointmentId}`);
  if (state.patientId) await safeApi("DELETE", `/patients/${state.patientId}`);

  for (const id of state.createdUserIds) {
    await safeApi("DELETE", `/users/${id}`, { deleteReason: "Pembersihan data Selenium" });
  }
  state.createdUserIds = [];
}

async function showEvidence(title, detail, passed) {
  await driver.executeScript(
    function render(titleArg, detailArg, passedArg) {
      document.getElementById("selenium-evidence")?.remove();

      const panel = document.createElement("section");
      panel.id = "selenium-evidence";
      panel.style.cssText = [
        "position:fixed",
        "left:50%",
        "top:50%",
        "transform:translate(-50%,-50%)",
        "z-index:2147483647",
        "display:flex",
        "align-items:center",
        "justify-content:center",
        "width:min(460px,44vw)",
        "min-width:320px",
        "box-sizing:border-box",
        "pointer-events:none",
        "font-family:Arial,sans-serif",
      ].join(";");
      const card = document.createElement("div");
      card.style.cssText = [
        "width:100%",
        "box-sizing:border-box",
        "padding:14px 16px",
        "border-radius:14px",
        "background:rgba(255,255,255,.97)",
        `border:3px solid ${passedArg ? "#16a34a" : "#dc2626"}`,
        "box-shadow:0 12px 36px rgba(15,23,42,.24)",
        "color:#0f172a",
      ].join(";");
      const status = document.createElement("div");
      status.style.cssText = `font-size:12px;font-weight:700;color:${passedArg ? "#15803d" : "#b91c1c"}`;
      status.textContent = passedArg ? "LULUS" : "GAGAL";
      const heading = document.createElement("h1");
      heading.style.cssText = "font-size:18px;margin:4px 0 8px";
      heading.textContent = titleArg;
      const detail = document.createElement("pre");
      detail.style.cssText = "max-height:110px;overflow:auto;white-space:pre-wrap;font-size:12px;line-height:1.45;background:#f1f5f9;padding:9px 11px;border-radius:8px;margin:0";
      detail.textContent = detailArg;
      card.append(status, heading, detail);
      panel.appendChild(card);
      document.body.appendChild(panel);
    },
    title,
    detail,
    passed,
  );
}

async function pauseForEvidence() {
  if (evidenceDelayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, evidenceDelayMs));
  }
}

async function clearEvidence() {
  if (!driver) return;
  try {
    await driver.executeScript("document.getElementById('selenium-evidence')?.remove()");
  } catch {
    // Navigasi dapat mengganti document tepat saat panel dibersihkan.
  }
}

async function pauseStep(multiplier = 1) {
  const duration = Math.round(stepDelayMs * multiplier);
  if (duration > 0) {
    await new Promise((resolve) => setTimeout(resolve, duration));
  }
}

async function openEvidencePath(pathname) {
  if (!pathname) return;

  try {
    await driver.get(`${baseUrl}${pathname}`);
    await driver.wait(until.elementLocated(By.css("body")), timeout);
    await driver.wait(async () => {
      const readyState = await driver.executeScript("return document.readyState");
      return readyState === "interactive" || readyState === "complete";
    }, timeout);

    // readyState "complete" hanya menandakan dokumen HTML selesai dimuat, bukan
    // bahwa fetch data sisi klien (useClinicData) sudah selesai. Tanpa menunggu,
    // screenshot bukti menangkap komponen <DataLoading> (spinner + "Memuat
    // data...") di atas area konten yang masih kosong/putih. Tunggu hingga
    // indikator loading hilang agar screenshot menampilkan konten fitur nyata.
    await waitForContentSettled();
    await pauseStep();
  } catch {
    // Abaikan kegagalan navigasi agar verifikasi utama tetap berjalan.
  }
}

// Menunggu (best-effort) hingga tidak ada lagi spinner loading yang terlihat
// pada halaman. <DataLoading> merender ikon Loader2 ber-kelas `animate-spin`,
// jadi hilangnya seluruh elemen `.animate-spin` yang terlihat menandakan konten
// utama sudah dirender. Memakai timeout sendiri yang lebih pendek dan menelan
// kegagalan karena ini hanya memperbaiki kualitas bukti, bukan verifikasi inti.
async function waitForContentSettled() {
  const settleTimeout = Math.min(timeout, 12_000);
  try {
    await driver.wait(async () => {
      return driver.executeScript(() => {
        const spinners = Array.from(document.querySelectorAll(".animate-spin"));
        return !spinners.some((element) => {
          const rect = element.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });
      });
    }, settleTimeout);
  } catch {
    // Halaman tertentu mungkin memang menahan spinner; jangan gagalkan bukti.
  }
}

function scenario(number, title, evidencePath, callback) {
  const screenshotName = `${String(number).padStart(2, "0")}-${title}`;
  test(title, async () => {
    await clearEvidence();
    await getSevereBrowserLogs(driver); // Kosongkan buffer log agar dump saat gagal relevan dengan skenario ini saja.
    try {
      const detail = await callback();
      await openEvidencePath(evidencePath);
      await showEvidence(title, detail || "Skenario berhasil diverifikasi.", true);
      await saveScreenshot(driver, screenshotName, "pass", { fullPage: true });
      await pauseForEvidence();
      await clearEvidence();
      await pauseStep(0.5);
    } catch (error) {
      const browserLogs = await getSevereBrowserLogs(driver);
      if (browserLogs.length > 0) {
        console.error(`  Browser console (SEVERE) saat "${title}" gagal:\n${browserLogs.map((line) => `    ${line}`).join("\n")}`);
      }
      await openEvidencePath(evidencePath);
      try {
        await showEvidence(title, error instanceof Error ? error.message : String(error), false);
        await saveScreenshot(driver, screenshotName, "fail", { fullPage: true });
        await pauseForEvidence();
        await clearEvidence();
        await pauseStep(0.5);
      } catch {
        // Pertahankan error skenario asli bila browser sudah tidak dapat mengambil screenshot.
      }
      throw error;
    }
  });
}

async function clickVisibleByXpath(xpath, description) {
  const element = await driver.wait(async () => {
    const candidates = await driver.findElements(By.xpath(xpath));
    for (const candidate of candidates) {
      if (await candidate.isDisplayed()) return candidate;
    }
    return null;
  }, timeout, `${description} tidak ditemukan atau tidak terlihat`);

  await driver.executeScript(
    "arguments[0].scrollIntoView({block: 'center', inline: 'nearest'})",
    element,
  );
  await driver.wait(until.elementIsEnabled(element), timeout);
  await element.click();
  await pauseStep();
  return element;
}

async function clickButton(label) {
  return clickVisibleByXpath(
    `//button[normalize-space(.)=${JSON.stringify(label)}]`,
    `Tombol "${label}"`,
  );
}

// Dialog/AlertDialog Radix merender di portal terpisah dan dapat memuat tombol
// dengan label yang sama seperti tombol pemicu di halaman utama (mis. "Tambah
// Pengguna"). Batasi pencarian ke elemen berperan dialog agar selalu mengklik
// tombol di dalam dialog yang sedang terbuka, bukan tombol pemicu di baliknya.
async function clickDialogButton(label) {
  return clickVisibleByXpath(
    `//*[@role="dialog" or @role="alertdialog"]//button[normalize-space(.)=${JSON.stringify(label)}]`,
    `Tombol dialog "${label}"`,
  );
}

async function fillById(id, value) {
  const field = await driver.wait(until.elementLocated(By.id(id)), timeout);
  await driver.wait(until.elementIsVisible(field), timeout);
  await field.clear();
  await field.sendKeys(value);
  await pauseStep(0.3);
}

async function expectVisibleText(text) {
  await driver.wait(async () => {
    const bodyText = await driver.findElement(By.css("body")).getText();
    return bodyText.replace(/\s+/g, " ").includes(text);
  }, timeout, `Teks "${text}" tidak tampil`);
}

async function submitLogin(username, password) {
  const usernameInput = await driver.wait(until.elementLocated(By.id("username")), timeout);
  const passwordInput = await driver.wait(until.elementLocated(By.id("password")), timeout);
  await usernameInput.clear();
  await passwordInput.clear();
  if (username) await usernameInput.sendKeys(username);
  if (password) await passwordInput.sendKeys(password);
  await pauseStep(0.75);
  await driver.findElement(By.xpath('//button[@type="submit"][normalize-space()="Login"]')).click();
  await pauseStep();
}

async function loginViaUi(username, password) {
  // Hapus seluruh cookie lebih dulu agar tidak ada cookie sesi lama (mis. dari
  // akun yang login otomatis lewat registrasi) yang tersisa berdampingan
  // dengan cookie sesi baru.
  await driver.manage().deleteAllCookies();
  await openPath(driver, "/login");
  await submitLogin(username, password);
  await waitForPath(driver, "/dashboard");
}

async function logoutViaUi() {
  const logoutButton = await driver.wait(
    until.elementLocated(By.css('button[aria-label="Keluar"]')),
    timeout,
  );
  await driver.wait(until.elementIsVisible(logoutButton), timeout);
  await logoutButton.click();
  await waitForPath(driver, "/login");
}

// Backend membatasi laju request (lihat apps/backend/src/index.ts, apiLimiter
// dan authLimiter). driver.wait() dengan kondisi async mengulang fungsinya
// nyaris tanpa jeda, sehingga menyertakan panggilan api() di dalamnya dapat
// menghabiskan kuota rate limit dalam hitungan detik. Gunakan helper ini
// untuk polling API dengan jeda nyata dan jumlah percobaan terbatas.
async function pollUntilTruthy(fn, attempts = 6, delayMs = 1500) {
  let lastResult;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    lastResult = await fn();
    if (lastResult) return lastResult;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return lastResult;
}

async function goToLoginPage() {
  await openPath(driver, "/login");
  await driver.wait(until.elementLocated(By.id("username")), timeout);
}

async function readBrowserSession() {
  return driver.executeScript(() => {
    const raw = localStorage.getItem("clinic_current_user");
    return raw ? JSON.parse(raw) : null;
  });
}

async function clickTab(label) {
  const tab = await clickVisibleByXpath(
    `//*[@role="tab" and normalize-space(.)=${JSON.stringify(label)}]`,
    `Tab "${label}"`,
  );
  await driver.wait(async () => (
    (await tab.getAttribute("aria-selected")) === "true"
    || (await tab.getAttribute("data-state")) === "active"
  ), timeout, `Tab "${label}" tidak menjadi aktif setelah diklik`);
}

async function findRowButton(rowText, buttonLabel) {
  return clickVisibleByXpath(
    `//tr[contains(., ${JSON.stringify(rowText)})]//button[normalize-space(.)=${JSON.stringify(buttonLabel)}]`,
    `Tombol "${buttonLabel}" pada baris "${rowText}"`,
  );
}

scenario(1, "Login dengan akun admin valid", "/dashboard", async () => {
  await loginViaUi(adminUsername, adminPassword);
  const session = await readBrowserSession();
  assert.ok(session, "Sesi pengguna tidak tersimpan setelah login");
  assert.equal(session.role, "admin", "Akun pengujian harus memiliki role admin");
  return `Username: ${adminUsername}\nRole: ${session.role}\nDashboard berhasil dibuka.`;
});

scenario(2, "Password salah ditolak", "/login", async () => {
  // Navigasi langsung ke /login (bukan lewat tombol keluar) agar tidak
  // memakai kuota rate limit /auth/logout secara tidak perlu; halaman login
  // tidak mengalihkan pengguna yang sudah punya sesi aktif.
  await goToLoginPage();
  await submitLogin(adminUsername, `${adminPassword}-salah`);
  await driver.wait(async () => {
    const bodyText = await driver.findElement(By.css("body")).getText();
    return /username atau password salah/i.test(bodyText);
  }, timeout, "Pesan password salah tidak tampil");
  assert.equal(new URL(await driver.getCurrentUrl()).pathname, "/login");
  return "Validasi UI berhasil.\nPassword yang salah ditolak dan pengguna tetap di halaman login.";
});

scenario(3, "Login dengan field kosong ditolak backend", "/login", async () => {
  const response = await api("POST", "/auth/login", { username: "", password: "" });
  assert.ok([400, 401, 422].includes(response.status), `Field kosong seharusnya ditolak, diterima status ${response.status}`);
  assert.equal(new URL(await driver.getCurrentUrl()).pathname, "/login");
  return `HTTP ${response.status}\nUsername dan password kosong ditolak sebelum sesi dibuat.`;
});

scenario(4, "Pendaftaran pasien baru ke antrean pemeriksaan awal", "/antrian", async () => {
  await loginViaUi(adminUsername, adminPassword);
  await openPath(driver, "/antrian");

  await clickButton("Mulai Pendaftaran");
  await driver.wait(until.elementLocated(By.xpath('//*[normalize-space(.)="Form Pendaftaran Pasien"]')), timeout);
  await clickDialogButton("Pasien Baru");

  await fillById("new-patient-name", newPatient.name);
  await fillById("new-patient-nik", newPatient.nik);
  // Input tanggal native tidak bisa diisi lewat sendKeys dengan format ISO
  // secara andal (Chrome mengharapkan urutan ketikan per sub-field sesuai
  // locale). Set value lewat native setter React lalu picu event "input".
  const birthDateInput = await driver.wait(until.elementLocated(By.id("new-patient-birthDate")), timeout);
  await driver.executeScript(
    function setDateValue(element, value) {
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      nativeSetter.call(element, value);
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
    },
    birthDateInput,
    newPatient.birthDate,
  );
  await fillById("new-patient-phone", newPatient.phone);
  await fillById("new-patient-address", newPatient.address);

  await clickDialogButton("Daftarkan ke Antrean Awal");
  await driver.wait(
    async () => !(await driver.findElements(By.xpath('//*[normalize-space(.)="Form Pendaftaran Pasien"]'))).length,
    timeout,
    "Dialog pendaftaran tidak tertutup setelah disimpan",
  );

  let createdPatient = null;
  let createdAppointment = null;
  await pollUntilTruthy(async () => {
    const patients = extractRows(await api("GET", "/patients"));
    createdPatient = patients.find((item) => item.nik === newPatient.nik);
    if (!createdPatient) return false;
    const appointments = extractRows(await api("GET", "/appointments"));
    createdAppointment = appointments.find((item) => item.patientId === createdPatient.id);
    return Boolean(createdAppointment);
  });

  assert.ok(createdPatient, "Pasien baru tidak ditemukan lewat API setelah pendaftaran");
  state.patientId = createdPatient.id;
  assert.ok(createdAppointment, "Antrean untuk pasien baru tidak ditemukan");
  state.appointmentId = createdAppointment.id;
  assert.equal(createdAppointment.status, "Menunggu");

  return `Pasien: ${newPatient.name}\nNo. RM: ${createdPatient.noRM}\nStatus antrean: ${createdAppointment.status}`;
});

scenario(5, "Tetapkan dokter dan layanan lalu mulai pemeriksaan", "/pemeriksaan", async () => {
  const doctors = extractRows(await api("GET", "/doctors"));
  assert.ok(doctors.length > 0, "Data dokter kosong, tidak dapat melanjutkan pemeriksaan");
  const doctor = doctors[0];

  const services = extractRows(await api("GET", "/services"));
  const service = services.find((item) => Number(item.price) > 0);
  assert.ok(service, "Tidak ada layanan berbayar untuk diuji");

  state.doctorId = doctor.id;
  state.doctorName = doctor.name;
  state.serviceId = service.id;
  state.serviceName = service.name;

  const assignResponse = await api("PUT", `/appointments/${state.appointmentId}`, {
    doctorId: doctor.id,
    doctorName: doctor.name,
    serviceId: service.id,
    serviceName: service.name,
    serviceIds: [service.id],
    serviceNames: [service.name],
    status: "Dipanggil",
  });
  assertStatus(assignResponse, 200, "Menetapkan dokter dan layanan:");

  const startResponse = await api("POST", `/workflows/visits/${state.appointmentId}/start-exam`);
  assertStatus(startResponse, 200, "Memulai pemeriksaan:");
  assert.equal(startResponse.body.data.status, "Diperiksa");

  return `Dokter: ${doctor.name}\nLayanan: ${service.name}\nStatus kunjungan: Diperiksa`;
});

scenario(6, "Selesaikan pemeriksaan dan catat resep obat", "/pemeriksaan", async () => {
  const medicines = extractRows(await api("GET", "/medicines"));
  const medicine = medicines.find((item) => Number(item.stock) >= 2);
  assert.ok(medicine, "Tidak ada obat dengan stok cukup untuk diuji");
  state.medicineId = medicine.id;

  const finishResponse = await api("POST", `/workflows/visits/${state.appointmentId}/finish-exam`, {
    diagnosis: "Diagnosis uji regresi Selenium",
    symptoms: "Keluhan uji regresi Selenium",
    treatment: "Tindakan uji regresi Selenium",
    vitalSigns: {
      bloodPressure: "120/80 mmHg",
      heartRate: "78 bpm",
      temperature: "36.6°C",
    },
    prescription: [
      {
        medicineId: medicine.id,
        medicineName: medicine.name,
        dosage: "500mg",
        frequency: "3x sehari",
        duration: "3 hari",
        quantity: 2,
      },
    ],
    clinicalDecision: "prescription",
  });
  assertStatus(finishResponse, 200, "Menyelesaikan pemeriksaan:");
  const medicalRecord = finishResponse.body.data.medicalRecord;
  assert.equal(medicalRecord.status, "completed");
  state.medicalRecordId = medicalRecord.id;

  const billingRecords = extractRows(await api("GET", "/billing-records"));
  const billing = billingRecords.find((item) => item.medicalRecordId === state.medicalRecordId);
  assert.ok(billing, "Tagihan tidak otomatis terbentuk dari rekam medis");
  assert.ok(billing.total > 0, "Total tagihan seharusnya lebih dari nol");

  return `Diagnosis tersimpan untuk ${newPatient.name}\nTotal tagihan: ${billing.total}`;
});

scenario(7, "Proses pembayaran tagihan pasien di kasir", "/pembayaran", async () => {
  await openPath(driver, "/pembayaran");
  // Tabel "Tagihan Terbuka" dipaginasi, jadi baris pasien uji bisa berada di
  // halaman selanjutnya bila ada banyak tagihan terbuka lain. Saring lebih dulu
  // lewat kotak pencarian agar baris target pasti berada di DOM sebelum diklik.
  const outstandingSearch = await driver.wait(
    until.elementLocated(By.css('input[placeholder="Cari pasien atau No. RM..."]')),
    timeout,
  );
  await outstandingSearch.clear();
  await outstandingSearch.sendKeys(newPatient.name);
  await pauseStep();
  await findRowButton(newPatient.name, "Bayar");
  await driver.wait(until.elementLocated(By.xpath('//*[normalize-space(.)="Proses Pembayaran"]')), timeout);
  await clickButton("Konfirmasi Pembayaran");
  await expectVisibleText("Pembayaran Berhasil");

  const billingRecords = extractRows(await api("GET", "/billing-records"));
  const billing = billingRecords.find((item) => item.medicalRecordId === state.medicalRecordId);
  assert.ok(billing, "Tagihan tidak ditemukan setelah pembayaran");
  assert.equal(billing.status, "paid", `Status tagihan seharusnya lunas, diterima "${billing.status}"`);

  return `Pasien: ${newPatient.name}\nStatus tagihan: ${billing.status}`;
});

scenario(8, "Verifikasi dan serahkan resep di farmasi", "/farmasi", async () => {
  const requests = extractRows(await api("GET", "/pharmacy-requests"));
  const request = requests.find((item) => item.medicalRecordId === state.medicalRecordId);
  assert.ok(request, "Permintaan farmasi tidak otomatis terbentuk dari resep");
  state.pharmacyRequestId = request.id;

  const verifyResponse = await api("POST", `/workflows/pharmacy/requests/${request.id}/verify`, { notes: "Diverifikasi Selenium" });
  assertStatus(verifyResponse, 200, "Verifikasi permintaan farmasi:");

  const processResponse = await api("POST", `/workflows/pharmacy/requests/${request.id}/process`, { notes: "Diproses Selenium" });
  assertStatus(processResponse, 200, "Memproses permintaan farmasi:");

  const dispenseResponse = await api("POST", `/workflows/pharmacy/requests/${request.id}/dispense`, { notes: "Diserahkan Selenium" });
  assertStatus(dispenseResponse, 200, "Menyerahkan resep farmasi:");
  assert.equal(dispenseResponse.body.data.status, "dispensed");

  await openPath(driver, "/farmasi");
  await expectVisibleText("Daftar Permintaan Farmasi");

  return `Permintaan farmasi untuk ${newPatient.name}\nStatus akhir: dispensed`;
});

scenario(9, "Rekomendasi rawat inap disetujui dan pasien diadmisi", "/rawat-inap", async () => {
  const createPatientResponse = await api("POST", "/patients", inpatientPatient);
  assertStatus(createPatientResponse, 201, "Membuat pasien rawat inap:");
  state.inpatientPatientId = createPatientResponse.body.data.id;

  const registerResponse = await api("POST", "/workflows/visits/register", {
    patientId: state.inpatientPatientId,
    date: new Date().toISOString().slice(0, 10),
    time: "09:00",
    notes: "Kunjungan uji rawat inap Selenium",
  });
  assertStatus(registerResponse, 201, "Registrasi kunjungan rawat inap:");
  state.inpatientAppointmentId = registerResponse.body.data.id;

  await api("PUT", `/appointments/${state.inpatientAppointmentId}`, {
    doctorId: state.doctorId,
    doctorName: state.doctorName,
    serviceId: state.serviceId,
    serviceName: state.serviceName,
    serviceIds: [state.serviceId],
    serviceNames: [state.serviceName],
    status: "Dipanggil",
  });
  const startResponse = await api("POST", `/workflows/visits/${state.inpatientAppointmentId}/start-exam`);
  assertStatus(startResponse, 200, "Memulai pemeriksaan rawat inap:");

  const finishResponse = await api("POST", `/workflows/visits/${state.inpatientAppointmentId}/finish-exam`, {
    diagnosis: "Diagnosis uji rawat inap Selenium",
    symptoms: "Keluhan uji rawat inap Selenium",
    treatment: "Rekomendasi rawat inap Selenium",
    clinicalDecision: "inpatient-required",
  });
  assertStatus(finishResponse, 200, "Menyelesaikan pemeriksaan rawat inap:");
  state.inpatientMedicalRecordId = finishResponse.body.data.medicalRecord.id;

  const admissionResponse = await api("POST", "/hospital/admissions", {
    patientId: state.inpatientPatientId,
    patientName: inpatientPatient.name,
    medicalRecordId: state.inpatientMedicalRecordId,
    attendingDoctorId: state.doctorId,
    attendingDoctorName: state.doctorName,
    admittedAt: new Date().toISOString(),
    status: "pending",
  });
  assertStatus(admissionResponse, 201, "Membuat rekomendasi admisi:");
  state.admissionId = admissionResponse.body.data.id;

  const bedResponse = await api("POST", "/beds", newBed);
  assertStatus(bedResponse, 201, "Membuat bed uji:");
  state.bedId = bedResponse.body.data.id;

  await openPath(driver, "/rawat-inap");
  // Tab default halaman ini adalah "Manajemen Bed"; tabel "Pasien Menunggu
  // Penerimaan" beserta tombol "Proses Penerimaan" ada di tab "Menunggu
  // Penerimaan" dan baru terlihat/aktif setelah tab tersebut diklik.
  await clickTab("Menunggu Penerimaan");
  await findRowButton(inpatientPatient.name, "Proses Penerimaan");
  // Dropdown "Pilih Bed" adalah combobox kedua di dalam form admisi (yang
  // pertama adalah "Dokter Penanggung Jawab"). Ditarget lewat posisi, bukan
  // teks placeholder, karena placeholder Radix Select tidak selalu terbaca
  // sebagai teks biasa oleh WebDriver. Tanda kurung diperlukan agar indeks [2]
  // dihitung terhadap seluruh hasil, bukan per elemen induk (kedua combobox
  // berada di dalam div terpisah sehingga masing-masing adalah combobox pertama
  // pada induknya).
  await clickVisibleByXpath(
    '(//*[@id="admission-form"]//button[@role="combobox"])[2]',
    "Dropdown Pilih Bed",
  );
  await clickVisibleByXpath(
    `//*[@role="option"][contains(., ${JSON.stringify(newBed.bedNumber)})]`,
    `Opsi bed ${newBed.bedNumber}`,
  );
  await clickButton("Selesaikan Penerimaan & Simpan");
  await expectVisibleText("Admisi Berhasil");

  return `Pasien: ${inpatientPatient.name}\nBed: ${newBed.bedNumber} - ${newBed.ward}`;
});

scenario(10, "Order laboratorium otomatis terbentuk dan hasil dicatat", "/laboratorium", async () => {
  const createPatientResponse = await api("POST", "/patients", labPatient);
  assertStatus(createPatientResponse, 201, "Membuat pasien laboratorium:");
  state.labPatientId = createPatientResponse.body.data.id;

  const registerResponse = await api("POST", "/workflows/visits/register", {
    patientId: state.labPatientId,
    date: new Date().toISOString().slice(0, 10),
    time: "10:00",
    notes: "Kunjungan uji laboratorium Selenium",
  });
  assertStatus(registerResponse, 201, "Registrasi kunjungan laboratorium:");
  state.labAppointmentId = registerResponse.body.data.id;

  await api("PUT", `/appointments/${state.labAppointmentId}`, {
    doctorId: state.doctorId,
    doctorName: state.doctorName,
    serviceId: state.serviceId,
    serviceName: state.serviceName,
    serviceIds: [state.serviceId],
    serviceNames: [state.serviceName],
    status: "Dipanggil",
  });
  await api("POST", `/workflows/visits/${state.labAppointmentId}/start-exam`);

  const finishResponse = await api("POST", `/workflows/visits/${state.labAppointmentId}/finish-exam`, {
    diagnosis: "Diagnosis uji laboratorium Selenium",
    symptoms: "Keluhan uji laboratorium Selenium",
    treatment: "Rujukan pemeriksaan laboratorium Selenium",
    clinicalDecision: "lab-required",
  });
  assertStatus(finishResponse, 200, "Menyelesaikan pemeriksaan laboratorium:");
  state.labMedicalRecordId = finishResponse.body.data.medicalRecord.id;

  const labOrders = extractRows(await api("GET", "/lab-orders"));
  const labOrder = labOrders.find((item) => item.medicalRecordId === state.labMedicalRecordId);
  assert.ok(labOrder, "Order laboratorium tidak otomatis terbentuk");
  assert.equal(labOrder.status, "requested");
  state.labOrderId = labOrder.id;

  const resultResponse = await api("POST", "/lab-results", {
    patientId: state.labPatientId,
    labOrderId: labOrder.id,
    testName: labOrder.tests?.[0] ?? "Pemeriksaan Laboratorium",
    resultValue: "5.6 mmol/L",
    unit: "mmol/L",
    notes: "Dicatat oleh Selenium",
    performedAt: new Date().toISOString(),
  });
  assertStatus(resultResponse, 201, "Mencatat hasil laboratorium:");
  state.labResultId = resultResponse.body.data.id;

  await openPath(driver, "/laboratorium");
  await expectVisibleText("Pengecekan Laboratorium");
  await expectVisibleText("Hasil Pemeriksaan");

  return `Pasien: ${labPatient.name}\nOrder: ${labOrder.tests?.join(", ")}\nHasil tersimpan.`;
});

scenario(11, "Registrasi akun dan duplikasi username ditolak", "/daftar", async () => {
  const registerPayload = {
    username: umumRoleUser.username,
    password: umumRoleUser.password,
    name: umumRoleUser.name,
    email: umumRoleUser.email,
  };

  const firstResponse = await api("POST", "/auth/register", registerPayload);
  assertStatus(firstResponse, 201, "Registrasi akun baru:");
  assert.equal(firstResponse.body.data.user.role, "umum");
  state.createdUserIds.push(firstResponse.body.data.user.id);

  const duplicateResponse = await api("POST", "/auth/register", registerPayload);
  assertStatus(duplicateResponse, 409, "Registrasi duplikat:");
  assert.match(duplicateResponse.body.error.message, /sudah terdaftar/i);

  return `Username: ${umumRoleUser.username}\nRegistrasi kedua ditolak: ${duplicateResponse.body.error.message}`;
});

scenario(12, "Tambah pengguna baru dengan role dokter", "/pengguna", async () => {
  // POST /auth/register (skenario sebelumnya) otomatis login sebagai akun
  // yang baru didaftarkan (setAuthCookie dipanggil di authController.register),
  // sehingga menimpa sesi admin di cookie browser. Login ulang di sini.
  await loginViaUi(adminUsername, adminPassword);
  const sessionAfterRelogin = await readBrowserSession();
  assert.equal(sessionAfterRelogin?.role, "admin", `Sesi seharusnya admin setelah login ulang, didapat: ${JSON.stringify(sessionAfterRelogin)}`);
  const cookieProbe = await api("GET", "/users");
  console.log(`  [DEBUG] Probe GET /users setelah login ulang: status=${cookieProbe.status}`);
  await openPath(driver, "/pengguna");
  await clickButton("Tambah Pengguna");
  await driver.wait(until.elementLocated(By.xpath('//*[normalize-space(.)="Tambah Pengguna Baru"]')), timeout);

  await fillById("username", doctorRoleUser.username);
  await fillById("name", doctorRoleUser.name);
  await fillById("email", doctorRoleUser.email);
  await fillById("password", doctorRoleUser.password);

  await clickVisibleByXpath('//button[@role="combobox"]', "Dropdown Role");
  await clickVisibleByXpath('//*[@role="option"][normalize-space(.)="Dokter"]', "Opsi role Dokter");

  const cookieProbe2 = await api("GET", "/users");
  const sessionProbe2 = await readBrowserSession();
  console.log(`  [DEBUG] Probe sesaat sebelum submit: GET /users status=${cookieProbe2.status}, localStorage role=${sessionProbe2?.role}`);
  const cdpCookies = await driver.sendAndGetDevToolsCommand("Network.getCookies", { urls: [baseUrl] });
  console.log(`  [DEBUG] CDP cookies: ${JSON.stringify((cdpCookies.cookies || []).map((c) => ({ name: c.name, valueTail: String(c.value).slice(-12) })))}`);

  await clickDialogButton("Tambah Pengguna");
  await expectVisibleText("Pengguna ditambahkan");
  await expectVisibleText(doctorRoleUser.name);

  const users = extractRows(await api("GET", "/users"));
  const created = users.find((item) => item.username === doctorRoleUser.username);
  assert.ok(created, "Pengguna baru tidak ditemukan lewat API");
  assert.equal(created.role, "dokter");
  state.createdUserIds.push(created.id);

  return `Username: ${doctorRoleUser.username}\nRole: ${created.role}`;
});

scenario(13, "Validasi password minimal 6 karakter saat tambah pengguna", "/pengguna", async () => {
  await openPath(driver, "/pengguna");
  await clickButton("Tambah Pengguna");
  await driver.wait(until.elementLocated(By.xpath('//*[normalize-space(.)="Tambah Pengguna Baru"]')), timeout);

  await fillById("username", `selenium.invalid.${runId}`);
  await fillById("name", "Pengguna Password Pendek");
  await fillById("email", `selenium.invalid.${runId}@example.invalid`);
  await fillById("password", "123");

  await clickDialogButton("Tambah Pengguna");
  await expectVisibleText("Password baru minimal harus 6 karakter.");
  // Dialog tambah pengguna tidak punya tombol "Batal"; tutup lewat tombol Escape
  // agar tidak mengganggu skenario berikutnya.
  await driver.switchTo().activeElement().sendKeys(Key.ESCAPE);
  await driver.wait(
    async () => !(await driver.findElements(By.xpath('//*[normalize-space(.)="Tambah Pengguna Baru"]'))).length,
    timeout,
    "Dialog tambah pengguna tidak tertutup setelah Escape",
  );

  return "Password kurang dari 6 karakter ditolak sebelum request dikirim ke server.";
});

scenario(14, "Pengguna role umum tidak dapat mengakses menu maupun API Pengguna", "/pengguna", async () => {
  // Login langsung menimpa cookie sesi sebelumnya, jadi tidak perlu logout
  // eksplisit lebih dulu (menghemat kuota rate limit /auth/logout).
  await loginViaUi(umumRoleUser.username, umumRoleUser.password);

  await driver.get(`${baseUrl}/pengguna`);
  await waitForPath(driver, "/dashboard");

  const listResponse = await api("GET", "/users");
  assertStatus(listResponse, 403, "Akses baca data pengguna oleh role umum:");

  const createResponse = await api("POST", "/users", {
    username: `selenium.blocked.${runId}`,
    password: "SeleniumBlocked123",
    name: "Percobaan Blokir",
    email: `selenium.blocked.${runId}@example.invalid`,
    role: "umum",
  });
  assertStatus(createResponse, 403, "Akses membuat pengguna oleh role umum:");

  return "Role umum dialihkan ke /dashboard saat membuka /pengguna, dan API pengguna menolak akses (403).";
});

scenario(15, "Hapus pengguna uji setelah admin login kembali", "/pengguna", async () => {
  await loginViaUi(adminUsername, adminPassword);
  await openPath(driver, "/pengguna");

  // Tombol hapus pada baris tabel hanya berupa ikon (tanpa teks), jadi diklik
  // lewat posisinya (tombol terakhir pada kolom Aksi) alih-alih lewat label.
  const row = await driver.wait(
    until.elementLocated(By.xpath(`//tr[contains(., ${JSON.stringify(doctorRoleUser.name)})]`)),
    timeout,
    `Baris pengguna "${doctorRoleUser.name}" tidak ditemukan`,
  );
  const rowButtons = await row.findElements(By.css("button"));
  assert.ok(rowButtons.length > 0, "Tombol aksi pada baris pengguna tidak ditemukan");
  await rowButtons[rowButtons.length - 1].click();
  await pauseStep();

  await driver.wait(until.elementLocated(By.xpath('//*[normalize-space(.)="Hapus Pengguna"]')), timeout);
  await clickDialogButton("Hapus");
  await expectVisibleText("Pengguna Dihapus");

  const users = extractRows(await api("GET", "/users"));
  const stillExists = users.some((item) => item.username === doctorRoleUser.username);
  assert.equal(stillExists, false, "Pengguna seharusnya sudah terhapus");
  state.createdUserIds = state.createdUserIds.filter((id) => !users.some((u) => u.id === id && u.username === doctorRoleUser.username));

  return `Pengguna ${doctorRoleUser.name} berhasil dihapus dari daftar.`;
});

scenario(16, "Logout dari sistem", "/login", async () => {
  await driver.get(baseUrl);
  await logoutViaUi();
  const session = await readBrowserSession();
  assert.equal(session, null, "Sesi pengguna masih tersimpan setelah logout");
  return "Sesi berakhir dan halaman login ditampilkan.";
});
