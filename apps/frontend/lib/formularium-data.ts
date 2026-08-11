export type FormulariumCategory = {
  category: string
  medicines: string[]
}

export const formulariumData: FormulariumCategory[] = [
  {
    category: "Analgesik & Antipiretik",
    medicines: [
      "Paracetamol", "Ibuprofen", "Asam Mefenamat", "Ketorolac", "Tramadol", "Diclofenac", "Meloxicam", "Celecoxib",
    ],
  },
  {
    category: "Antibiotik",
    medicines: [
      "Amoxicillin", "Amoxicillin + Clavulanate", "Ampicillin", "Cefadroxil", "Cephalexin", "Cefixime", "Ceftriaxone", "Cefotaxime", "Ceftazidime", "Azithromycin", "Clarithromycin", "Erythromycin", "Ciprofloxacin", "Levofloxacin", "Metronidazole", "Clindamycin", "Doxycycline", "Cotrimoxazole", "Gentamicin",
    ],
  },
  { category: "Antivirus", medicines: ["Acyclovir", "Oseltamivir", "Valacyclovir"] },
  {
    category: "Antijamur",
    medicines: ["Ketoconazole", "Fluconazole", "Itraconazole", "Nystatin", "Clotrimazole", "Miconazole", "Terbinafine"],
  },
  {
    category: "Antialergi",
    medicines: ["Cetirizine", "Loratadine", "Fexofenadine", "Chlorpheniramine (CTM)", "Diphenhydramine"],
  },
  {
    category: "Saluran Pernapasan",
    medicines: ["Salbutamol", "Ipratropium", "Budesonide", "Ambroxol", "Bromhexine", "Acetylcysteine", "Dextromethorphan", "Guaifenesin"],
  },
  {
    category: "Gastrointestinal",
    medicines: ["Omeprazole", "Lansoprazole", "Pantoprazole", "Antasida", "Sucralfate", "Domperidone", "Ondansetron", "Metoclopramide", "Oralit", "Loperamide", "Zinc"],
  },
  {
    category: "Diabetes",
    medicines: ["Metformin", "Glimepiride", "Gliclazide", "Acarbose", "Insulin Regular", "Insulin NPH", "Insulin Glargine"],
  },
  {
    category: "Hipertensi & Kardiovaskular",
    medicines: ["Amlodipine", "Captopril", "Lisinopril", "Ramipril", "Valsartan", "Losartan", "Bisoprolol", "Atenolol", "Furosemide", "Hydrochlorothiazide", "Spironolactone"],
  },
  {
    category: "Antikoagulan & Antiplatelet",
    medicines: ["Aspirin", "Clopidogrel", "Heparin", "Enoxaparin"],
  },
  { category: "Penurun Lipid", medicines: ["Simvastatin", "Atorvastatin", "Rosuvastatin"] },
  {
    category: "Vitamin & Mineral",
    medicines: ["Vitamin B Complex", "Vitamin B12", "Vitamin C", "Vitamin D3", "Vitamin E", "Asam Folat", "Ferrous Sulfate", "Calcium Carbonate", "Zinc"],
  },
  {
    category: "Dermatologi",
    medicines: ["Mupirocin", "Gentamicin Cream", "Hydrocortisone Cream", "Betamethasone Cream", "Silver Sulfadiazine", "Calamine Lotion"],
  },
  {
    category: "Mata",
    medicines: ["Chloramphenicol Eye Drops", "Tobramycin Eye Drops", "Artificial Tears"],
  },
  { category: "Telinga", medicines: ["Ofloxacin Ear Drops", "Ciprofloxacin Ear Drops"] },
  {
    category: "Obat Gigi & Mulut",
    medicines: ["Chlorhexidine Mouthwash", "Triamcinolone Oral Paste", "Lidocaine Gel"],
  },
  {
    category: "Obstetri & Ginekologi",
    medicines: ["Oxytocin", "Misoprostol", "Asam Folat", "Ferrous Sulfate", "Kalsium"],
  },
  {
    category: "Pediatri",
    medicines: ["Paracetamol Syrup", "Ibuprofen Syrup", "Amoxicillin Syrup", "Zinc Syrup", "Oralit"],
  },
  {
    category: "Cairan Infus",
    medicines: ["NaCl 0.9%", "Ringer Lactate", "Dextrose 5%", "Dextrose 10%", "Dextrose Saline", "Aminofluid"],
  },
  {
    category: "Injeksi",
    medicines: ["Ceftriaxone Injection", "Metoclopramide Injection", "Ondansetron Injection", "Ketorolac Injection", "Dexamethasone Injection", "Diazepam Injection", "Adrenaline", "Atropine"],
  },
  {
    category: "Emergency",
    medicines: ["Adrenaline", "Atropine", "Amiodarone", "Dopamine", "Dobutamine", "Magnesium Sulfate", "Nitroglycerin", "Diazepam", "Midazolam"],
  },
  {
    category: "Alat Medis Habis Pakai",
    medicines: ["Spuit", "Infusion Set", "Abocath", "IV Catheter", "Selang Oksigen", "Nebulizer Mask", "Sarung Tangan", "Masker", "Kasa Steril", "Perban", "Plester", "Kapas Alkohol", "Alkohol 70%", "Povidone Iodine"],
  },
];

/**
 * Peta untuk mencari kategori berdasarkan nama obat dengan cepat.
 * @example medicineToCategoryMap.get("Paracetamol") // "Analgesik & Antipiretik"
 */
export const medicineToCategoryMap = new Map<string, string>();
formulariumData.forEach(category => {
  category.medicines.forEach(medicine => {
    medicineToCategoryMap.set(medicine, category.category);
  });
});

/**
 * Daftar semua obat dari formularium dalam format yang cocok untuk komponen select/combobox.
 */
export const allFormulariumMedicines = formulariumData.flatMap(cat => 
  cat.medicines.map(med => ({
    value: med, // Menggunakan nama asli sebagai value untuk kemudahan mapping
    label: med,
    category: cat.category,
  }))
).sort((a, b) => a.label.localeCompare(b.label)); // Urutkan berdasarkan abjad