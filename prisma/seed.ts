import { db } from '../src/lib/db';

// ─── Helpers ────────────────────────────────────────────────────────────────────
const daysAgo = (d: number) => {
  const dt = new Date();
  dt.setDate(dt.getDate() - d);
  return dt;
};
const daysFromNow = (d: number) => {
  const dt = new Date();
  dt.setDate(dt.getDate() + d);
  return dt;
};

function pad(n: number, w = 4) {
  return String(n).padStart(w, '0');
}

// ─── Main Seed ──────────────────────────────────────────────────────────────────
async function main() {
  console.log('🌱 Seeding database...\n');

  // Clean up existing data in reverse dependency order
  await db.saleItem.deleteMany();
  await db.sale.deleteMany();
  await db.purchaseItem.deleteMany();
  await db.purchaseOrder.deleteMany();
  await db.batch.deleteMany();
  await db.medicine.deleteMany();
  await db.customer.deleteMany();
  await db.supplier.deleteMany();
  await db.storeSetting.deleteMany();
  console.log('✅ Cleared all existing data.\n');

  // ═══════════════════════════════════════════════════════════════════════════════
  // 1. STORE SETTINGS
  // ═══════════════════════════════════════════════════════════════════════════════
  const store = await db.storeSetting.create({
    data: {
      storeName: 'HealthCare Pharmacy',
      phone: '+91-9876543210',
      email: 'info@healthcarepharmacy.in',
      address: '123, MG Road, Bangalore, Karnataka - 560001',
      gstNumber: '29AABCH1234A1Z5',
      licenseNo: 'KA-MFG-2024-12345',
      invoicePrefix: 'INV',
      nextInvoiceNo: 1001,
    },
  });
  console.log(`🏪 Store: ${store.storeName}`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 2. SUPPLIERS
  // ═══════════════════════════════════════════════════════════════════════════════
  const suppliersData = [
    {
      name: 'Sun Pharmaceutical Industries',
      phone: '+91-22-2740 8800',
      email: 'info@sunpharma.com',
      address: 'Sumel Business Park, Andheri East, Mumbai - 400093',
      gstNumber: '27AABCS1429B1Z5',
    },
    {
      name: 'Cipla Ltd',
      phone: '+91-22-2427 8000',
      email: 'info@cipla.com',
      address: 'Cipla House, V. L. Mehta Road, Andheri East, Mumbai - 400093',
      gstNumber: '27AABCC1595P1Z1',
    },
    {
      name: "Dr. Reddy's Laboratories",
      phone: '+91-40-4900 2900',
      email: 'info@drreddys.com',
      address: 'Dr. Reddys Labs, Bachupally, Hyderabad - 500090',
      gstNumber: '36AABCD1234L1Z3',
    },
    {
      name: 'Lupin Ltd',
      phone: '+91-22-6801 6801',
      email: 'info@lupin.com',
      address: 'Lupin Research Park, Gurgaon - 122002',
      gstNumber: '06AABCL5196K1Z5',
    },
    {
      name: 'Abbott India Ltd',
      phone: '+91-22-6786 6786',
      email: 'info.india@abbott.com',
      address: 'Abbott India Ltd, Mumbai - 400063',
      gstNumber: '27AABCA1234B1Z1',
    },
  ];

  const suppliers = [];
  for (const s of suppliersData) {
    const sup = await db.supplier.create({ data: s });
    suppliers.push(sup);
    console.log(`📦 Supplier: ${sup.name}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // 3. CUSTOMERS
  // ═══════════════════════════════════════════════════════════════════════════════
  const customersData = [
    { name: 'Rajesh Kumar Sharma', phone: '+91-9845012345', doctorName: 'Dr. Priya Mehta' },
    { name: 'Lakshmi Devi', phone: '+91-9886056789', doctorName: 'Dr. Suresh Babu' },
    { name: 'Mohammed Irfan', phone: '+91-9900011122', address: '45, Koramangala, Bangalore' },
    { name: 'Annapurna Reddy', phone: '+91-9876522333', doctorName: 'Dr. Kavitha Rao' },
    { name: 'Suresh Nair', phone: '+91-9945633444', email: 'suresh.nair@email.com' },
    { name: 'Geetha Mahesh', phone: '+91-9886778899', doctorName: 'Dr. Ramesh Hegde' },
    { name: 'Arun Venkatesh', phone: '+91-7760998877', address: '78, Jayanagar, Bangalore' },
    { name: 'Kavitha Subramaniam', phone: '+91-9845066554', doctorName: 'Dr. Anand Gupta' },
    { name: 'Prakash Hegde', phone: '+91-9900033221', email: 'prakash.h@email.com' },
    { name: 'Fatima Begum', phone: '+91-9886112233', doctorName: 'Dr. Meera Krishnan' },
  ];

  const customers = [];
  for (const c of customersData) {
    const cust = await db.customer.create({ data: c });
    customers.push(cust);
    console.log(`👤 Customer: ${cust.name}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // 4. MEDICINES
  // ═══════════════════════════════════════════════════════════════════════════════
  const medicinesData = [
    // ── Pain / Fever ──
    {
      name: 'Paracetamol 500mg', genericName: 'Paracetamol', companyName: 'Cipla Ltd',
      composition: 'Paracetamol', strength: '500mg', category: 'Pain/Fever', unitType: 'tablet', packSize: '15 tablets/strip',
      gstPercent: 5, sellingPrice: 28, marginPercent: 22,
    },
    {
      name: 'Ibuprofen 400mg', genericName: 'Ibuprofen', companyName: 'Abbott India Ltd',
      composition: 'Ibuprofen', strength: '400mg', category: 'Pain/Fever', unitType: 'tablet', packSize: '10 tablets/strip',
      gstPercent: 12, sellingPrice: 35, marginPercent: 20,
    },
    {
      name: 'Aspirin 150mg', genericName: 'Aspirin', companyName: 'Bayer',
      composition: 'Aspirin', strength: '150mg', category: 'Pain/Fever', unitType: 'tablet', packSize: '14 tablets/strip',
      gstPercent: 12, sellingPrice: 22, marginPercent: 25,
    },
    {
      name: 'Crocin Advance 500mg', genericName: 'Paracetamol', companyName: 'GSK',
      composition: 'Paracetamol', strength: '500mg', category: 'Pain/Fever', unitType: 'tablet', packSize: '15 tablets/strip',
      gstPercent: 5, sellingPrice: 35, marginPercent: 24,
    },
    // ── Antibiotics ──
    {
      name: 'Amoxicillin 500mg', genericName: 'Amoxicillin', companyName: 'Sun Pharmaceutical Industries',
      composition: 'Amoxicillin Trihydrate', strength: '500mg', category: 'Antibiotics', unitType: 'capsule', packSize: '10 capsules/strip',
      gstPercent: 5, sellingPrice: 58, marginPercent: 20,
    },
    {
      name: 'Azithromycin 500mg', genericName: 'Azithromycin', companyName: 'Cipla Ltd',
      composition: 'Azithromycin Dihydrate', strength: '500mg', category: 'Antibiotics', unitType: 'tablet', packSize: '3 tablets/strip',
      gstPercent: 5, sellingPrice: 95, marginPercent: 18,
    },
    {
      name: 'Ciprofloxacin 500mg', genericName: 'Ciprofloxacin', companyName: 'Dr. Reddy\'s Laboratories',
      composition: 'Ciprofloxacin Hydrochloride', strength: '500mg', category: 'Antibiotics', unitType: 'tablet', packSize: '10 tablets/strip',
      gstPercent: 5, sellingPrice: 45, marginPercent: 22,
    },
    {
      name: 'Metronidazole 400mg', genericName: 'Metronidazole', companyName: 'Lupin Ltd',
      composition: 'Metronidazole', strength: '400mg', category: 'Antibiotics', unitType: 'tablet', packSize: '10 tablets/strip',
      gstPercent: 5, sellingPrice: 30, marginPercent: 25,
    },
    {
      name: 'Doxycycline 100mg', genericName: 'Doxycycline', companyName: 'Sun Pharmaceutical Industries',
      composition: 'Doxycycline Hyclate', strength: '100mg', category: 'Antibiotics', unitType: 'capsule', packSize: '10 capsules/strip',
      gstPercent: 5, sellingPrice: 52, marginPercent: 20,
    },
    // ── Diabetes ──
    {
      name: 'Metformin 500mg', genericName: 'Metformin', companyName: 'Dr. Reddy\'s Laboratories',
      composition: 'Metformin Hydrochloride', strength: '500mg', category: 'Diabetes', unitType: 'tablet', packSize: '20 tablets/strip',
      gstPercent: 5, sellingPrice: 18, marginPercent: 28,
    },
    {
      name: 'Glimepiride 2mg', genericName: 'Glimepiride', companyName: 'Sun Pharmaceutical Industries',
      composition: 'Glimepiride', strength: '2mg', category: 'Diabetes', unitType: 'tablet', packSize: '10 tablets/strip',
      gstPercent: 5, sellingPrice: 42, marginPercent: 22,
    },
    // ── Blood Pressure ──
    {
      name: 'Amlodipine 5mg', genericName: 'Amlodipine', companyName: 'Cipla Ltd',
      composition: 'Amlodipine Besylate', strength: '5mg', category: 'Blood Pressure', unitType: 'tablet', packSize: '14 tablets/strip',
      gstPercent: 5, sellingPrice: 38, marginPercent: 25,
    },
    {
      name: 'Telmisartan 40mg', genericName: 'Telmisartan', companyName: 'Lupin Ltd',
      composition: 'Telmisartan', strength: '40mg', category: 'Blood Pressure', unitType: 'tablet', packSize: '15 tablets/strip',
      gstPercent: 5, sellingPrice: 85, marginPercent: 20,
    },
    {
      name: 'Losartan 50mg', genericName: 'Losartan', companyName: 'Abbott India Ltd',
      composition: 'Losartan Potassium', strength: '50mg', category: 'Blood Pressure', unitType: 'tablet', packSize: '10 tablets/strip',
      gstPercent: 5, sellingPrice: 65, marginPercent: 22,
    },
    // ── Vitamins ──
    {
      name: 'Vitamin D3 60K IU', genericName: 'Cholecalciferol', companyName: 'Abbott India Ltd',
      composition: 'Cholecalciferol', strength: '60,000 IU', category: 'Vitamins', unitType: 'capsule', packSize: '4 capsules/pack',
      gstPercent: 12, sellingPrice: 135, marginPercent: 25,
    },
    {
      name: 'Vitamin B12 500mcg', genericName: 'Methylcobalamin', companyName: 'Sun Pharmaceutical Industries',
      composition: 'Methylcobalamin', strength: '500mcg', category: 'Vitamins', unitType: 'tablet', packSize: '10 tablets/strip',
      gstPercent: 12, sellingPrice: 32, marginPercent: 30,
    },
    {
      name: 'Supradyn Multivitamin', genericName: 'Multivitamin', companyName: 'Bayer',
      composition: 'Vit A, B1, B2, B6, B12, C, D3, E, Niacinamide, Folic Acid, Calcium Pantothenate',
      strength: '', category: 'Vitamins', unitType: 'tablet', packSize: '15 tablets/strip',
      gstPercent: 12, sellingPrice: 68, marginPercent: 22,
    },
    // ── Digestive ──
    {
      name: 'Omeprazole 20mg', genericName: 'Omeprazole', companyName: 'Cipla Ltd',
      composition: 'Omeprazole', strength: '20mg', category: 'Digestive', unitType: 'capsule', packSize: '15 capsules/strip',
      gstPercent: 5, sellingPrice: 48, marginPercent: 25,
    },
    {
      name: 'Pantoprazole 40mg', genericName: 'Pantoprazole', companyName: 'Dr. Reddy\'s Laboratories',
      composition: 'Pantoprazole Sodium', strength: '40mg', category: 'Digestive', unitType: 'tablet', packSize: '10 tablets/strip',
      gstPercent: 5, sellingPrice: 55, marginPercent: 20,
    },
    {
      name: 'Domperidone 10mg', genericName: 'Domperidone', companyName: 'Lupin Ltd',
      composition: 'Domperidone', strength: '10mg', category: 'Digestive', unitType: 'tablet', packSize: '10 tablets/strip',
      gstPercent: 5, sellingPrice: 22, marginPercent: 26,
    },
    {
      name: 'Digene Antacid Syrup', genericName: 'Antacid', companyName: 'Abbott India Ltd',
      composition: 'Dried Aluminium Hydroxide, Magnesium Hydroxide, Simethicone',
      strength: '170ml', category: 'Digestive', unitType: 'syrup', packSize: '170ml bottle',
      gstPercent: 5, sellingPrice: 115, marginPercent: 22,
    },
    // ── Cough / Cold ──
    {
      name: 'Cetirizine 10mg', genericName: 'Cetirizine', companyName: 'Dr. Reddy\'s Laboratories',
      composition: 'Cetirizine Hydrochloride', strength: '10mg', category: 'Cough/Cold', unitType: 'tablet', packSize: '10 tablets/strip',
      gstPercent: 5, sellingPrice: 25, marginPercent: 28,
    },
    {
      name: 'Dextromethorphan Syrup', genericName: 'Dextromethorphan', companyName: 'Cipla Ltd',
      composition: 'Dextromethorphan HBr, Chlorpheniramine, Phenylephrine',
      strength: '60ml', category: 'Cough/Cold', unitType: 'syrup', packSize: '60ml bottle',
      gstPercent: 5, sellingPrice: 72, marginPercent: 25,
    },
    {
      name: 'Ambroxol Syrup', genericName: 'Ambroxol', companyName: 'Sun Pharmaceutical Industries',
      composition: 'Ambroxol Hydrochloride', strength: '30mg/5ml, 100ml', category: 'Cough/Cold', unitType: 'syrup', packSize: '100ml bottle',
      gstPercent: 5, sellingPrice: 88, marginPercent: 22,
    },
    // ── Skin ──
    {
      name: 'Betadine Ointment 15g', genericName: 'Povidone-Iodine', companyName: 'Win-Medicare',
      composition: 'Povidone-Iodine 5% w/w', strength: '5%', category: 'Skin', unitType: 'cream', packSize: '15g tube',
      gstPercent: 5, sellingPrice: 62, marginPercent: 24,
    },
    {
      name: 'Clotrimazole Cream 15g', genericName: 'Clotrimazole', companyName: 'Lupin Ltd',
      composition: 'Clotrimazole 1% w/w', strength: '1%', category: 'Skin', unitType: 'cream', packSize: '15g tube',
      gstPercent: 5, sellingPrice: 55, marginPercent: 26,
    },
    // ── Eye ──
    {
      name: 'Ciprofloxacin Eye Drops 5ml', genericName: 'Ciprofloxacin', companyName: 'Cipla Ltd',
      composition: 'Ciprofloxacin Hydrochloride', strength: '0.3% w/v', category: 'Eye', unitType: 'drops', packSize: '5ml bottle',
      gstPercent: 5, sellingPrice: 42, marginPercent: 30,
    },
    // ── Other ──
    {
      name: 'ORS Powder (Electral)', genericName: 'ORS', companyName: 'Abbott India Ltd',
      composition: 'Sodium Chloride, Potassium Chloride, Sodium Citrate, Dextrose',
      strength: '21.8g', category: 'Other', unitType: 'powder', packSize: '4 sachets/pack',
      gstPercent: 5, sellingPrice: 30, marginPercent: 28,
    },
  ];

  const medicines = [];
  for (const m of medicinesData) {
    const med = await db.medicine.create({ data: m });
    medicines.push(med);
  }
  console.log(`\n💊 Created ${medicines.length} medicines.`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 5. BATCHES (2-3 per medicine)
  // ═══════════════════════════════════════════════════════════════════════════════
  // Batch pattern: expiry scenarios spread across medicines
  // batchIdx 0: expired (3-6 months ago)
  // batchIdx 1: expiring in ~7 days
  // batchIdx 2: safe (>90 days)
  // Some medicines get a 3rd batch with ~20 or ~60 day expiry

  interface BatchInput {
    medicineIdx: number;
    batchNumber: string;
    expiryDays: number; // negative = past
    purchasePrice: number;
    mrp: number;
    quantity: number;
  }

  const batchesInput: BatchInput[] = [];
  let batchCounter = 1;

  function addBatch(mIdx: number, expDays: number, pPrice: number, mrp: number, qty: number) {
    batchesInput.push({
      medicineIdx: mIdx,
      batchNumber: `BN2024-${pad(batchCounter++)}`,
      expiryDays: expDays,
      purchasePrice: pPrice,
      mrp,
      quantity: qty,
    });
  }

  // Pain/Fever (0-3)
  addBatch(0, -90, 20, 28, 45);   // expired
  addBatch(0, 7, 21, 28, 30);     // 7 days
  addBatch(0, 180, 22, 28, 120);  // safe

  addBatch(1, -45, 25, 35, 25);   // expired
  addBatch(1, 20, 26, 35, 50);    // 20 days
  addBatch(1, 150, 27, 35, 80);

  addBatch(2, -120, 15, 22, 10);  // expired
  addBatch(2, 90, 16, 22, 60);

  addBatch(3, 60, 26, 35, 75);    // 60 days
  addBatch(3, 7, 27, 35, 5);      // low stock + near expiry
  addBatch(3, 200, 27, 35, 100);

  // Antibiotics (4-8)
  addBatch(4, 150, 42, 58, 60);
  addBatch(4, 20, 43, 58, 35);
  addBatch(4, -60, 40, 58, 0);    // expired + zero stock

  addBatch(5, 90, 68, 95, 40);
  addBatch(5, 7, 70, 95, 8);      // low + near expiry

  addBatch(6, 120, 32, 45, 90);
  addBatch(6, 20, 33, 45, 25);

  addBatch(7, 180, 20, 30, 150);
  addBatch(7, 60, 21, 30, 45);

  addBatch(8, 100, 36, 52, 50);
  addBatch(8, -150, 34, 52, 3);   // expired + very low

  // Diabetes (9-10)
  addBatch(9, 200, 12, 18, 200);
  addBatch(9, 60, 13, 18, 80);
  addBatch(9, 7, 13, 18, 4);      // low + near expiry

  addBatch(10, 150, 30, 42, 55);
  addBatch(10, 90, 31, 42, 40);

  // Blood Pressure (11-13)
  addBatch(11, 180, 27, 38, 100);
  addBatch(11, 20, 28, 38, 30);
  addBatch(11, 7, 28, 38, 6);     // low + near expiry

  addBatch(12, 120, 62, 85, 65);
  addBatch(12, 60, 63, 85, 35);

  addBatch(13, 200, 48, 65, 90);
  addBatch(13, 150, 49, 65, 60);

  // Vitamins (14-16)
  addBatch(14, 180, 95, 135, 40);
  addBatch(14, 60, 97, 135, 20);
  addBatch(14, 20, 98, 135, 7);   // low + near expiry

  addBatch(15, 150, 20, 32, 110);
  addBatch(15, 90, 21, 32, 60);

  addBatch(16, 120, 48, 68, 50);
  addBatch(16, 7, 50, 68, 3);     // low + near expiry

  // Digestive (17-20)
  addBatch(17, 200, 33, 48, 85);
  addBatch(17, 60, 34, 48, 40);

  addBatch(18, 150, 38, 55, 60);
  addBatch(18, 20, 39, 55, 25);

  addBatch(19, 180, 14, 22, 150);
  addBatch(19, 7, 15, 22, 5);     // low + near expiry

  addBatch(20, 120, 82, 115, 30);
  addBatch(20, 60, 84, 115, 15);

  // Cough/Cold (21-23)
  addBatch(21, 150, 17, 25, 100);
  addBatch(21, 20, 18, 25, 40);

  addBatch(22, 90, 50, 72, 35);
  addBatch(22, 7, 52, 72, 6);     // low + near expiry

  addBatch(23, 120, 62, 88, 25);
  addBatch(23, 60, 63, 88, 15);

  // Skin (24-25)
  addBatch(24, 180, 44, 62, 50);
  addBatch(24, 20, 45, 62, 20);

  addBatch(25, 150, 38, 55, 40);
  addBatch(25, 7, 40, 55, 4);     // low + near expiry

  // Eye (26)
  addBatch(26, 120, 28, 42, 60);
  addBatch(26, 20, 29, 42, 25);

  // Other (27)
  addBatch(27, 200, 20, 30, 100);
  addBatch(27, 60, 21, 30, 50);

  // Create batches in DB
  const batchRecords: Map<number, any[]> = new Map(); // medicineIdx -> batch[]
  for (const bi of batchesInput) {
    const expDate = bi.expiryDays < 0 ? daysAgo(Math.abs(bi.expiryDays)) : daysFromNow(bi.expiryDays);
    const mfgDate = new Date(expDate);
    mfgDate.setFullYear(mfgDate.getFullYear() - 2);

    const batch = await db.batch.create({
      data: {
        medicineId: medicines[bi.medicineIdx].id,
        batchNumber: bi.batchNumber,
        expiryDate: expDate,
        mfgDate,
        purchasePrice: bi.purchasePrice,
        mrp: bi.mrp,
        quantity: bi.quantity,
        initialQuantity: bi.quantity,
      },
    });

    if (!batchRecords.has(bi.medicineIdx)) batchRecords.set(bi.medicineIdx, []);
    batchRecords.get(bi.medicineIdx)!.push(batch);
  }
  console.log(`📦 Created ${batchesInput.length} batches.`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 6. PURCHASE ORDERS (3-5)
  // ═══════════════════════════════════════════════════════════════════════════════
  // Each PurchaseItem links to a UNIQUE batchId, so we need to pick batches
  // that are NOT already linked. We'll use batches from our newly created set.

  // We need a mapping from batch index in batchesInput to the actual batch record
  // Let's create purchase orders for some safe-expiry batches

  const purchaseOrdersData = [
    {
      supplierIdx: 0, // Sun Pharma
      invoiceNo: 'PO-2024-001',
      invoiceDate: daysAgo(25),
      notes: 'Monthly stock replenishment',
      batchInputIndices: [0, 4, 8, 10, 15], // Paracetamol, Amoxicillin, Doxycycline, Metformin, Vit B12 - safe batches
      quantities: [100, 50, 40, 80, 80],
    },
    {
      supplierIdx: 1, // Cipla
      invoiceNo: 'PO-2024-002',
      invoiceDate: daysAgo(15),
      notes: 'Urgent order - fast moving items',
      batchInputIndices: [3, 5, 11, 17, 21], // Ibuprofen, Azithromycin, Amlodipine, Omeprazole, Cetirizine - safe batches
      quantities: [60, 30, 80, 70, 80],
    },
    {
      supplierIdx: 2, // Dr. Reddy's
      invoiceNo: 'PO-2024-003',
      invoiceDate: daysAgo(5),
      notes: 'Regular order',
      batchInputIndices: [6, 9, 12, 18, 24], // Ciprofloxacin, Metformin BP, Telmisartan, Pantoprazole, Betadine
      quantities: [80, 60, 50, 50, 40],
    },
    {
      supplierIdx: 4, // Abbott
      invoiceNo: 'PO-2024-004',
      invoiceDate: daysAgo(2),
      notes: 'Vitamins and general items',
      batchInputIndices: [14, 20, 27], // Vit D3, Digene, ORS
      quantities: [30, 20, 80],
    },
  ];

  for (const po of purchaseOrdersData) {
    const supplier = suppliers[po.supplierIdx];
    let totalAmount = 0;
    let totalGst = 0;

    const itemsData = [];
    for (let i = 0; i < po.batchInputIndices.length; i++) {
      const biIdx = po.batchInputIndices[i];
      const bi = batchesInput[biIdx];
      const medicine = medicines[bi.medicineIdx];
      const qty = po.quantities[i];
      const purchasePrice = bi.purchasePrice;
      const mrp = bi.mrp;
      const gstPercent = medicine.gstPercent;
      const itemTotal = qty * purchasePrice;
      const gst = itemTotal * (gstPercent / 100);

      totalAmount += itemTotal + gst;
      totalGst += gst;

      itemsData.push({
        batchId: batchRecords.get(bi.medicineIdx)!.find(
          (b) => b.batchNumber === bi.batchNumber
        )!.id,
        quantity: qty,
        purchasePrice,
        mrp,
        gstPercent,
        totalAmount: itemTotal + gst,
      });
    }

    await db.purchaseOrder.create({
      data: {
        supplierId: supplier.id,
        invoiceNo: po.invoiceNo,
        invoiceDate: po.invoiceDate,
        totalAmount,
        totalGst,
        notes: po.notes,
        items: { create: itemsData },
      },
    });
    console.log(`🛒 Purchase: ${po.invoiceNo} from ${supplier.name} - ₹${totalAmount.toFixed(2)}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // 7. SALES (15-20 with items)
  // ═══════════════════════════════════════════════════════════════════════════════

  // Helper: find the best available (non-expired, in-stock) batch for a medicine
  function getBestBatch(medicineIdx: number) {
    const batches = batchRecords.get(medicineIdx) || [];
    // Prefer: non-expired, in stock, later expiry first
    const now = new Date();
    return batches
      .filter((b) => b.expiryDate > now && b.quantity > 0)
      .sort((a, b) => b.expiryDate.getTime() - a.expiryDate.getTime())[0];
  }

  // Sale definitions: (daysAgo, customerIdx|null, paymentMode, notes, items: [{medicineIdx, qty, discount%}])
  const salesData: Array<{
    daysAgo: number;
    customerIdx: number | null;
    paymentMode: string;
    notes: string;
    doctorName: string | null;
    items: Array<{ medicineIdx: number; qty: number; discount: number }>;
  }> = [
    {
      daysAgo: 28, customerIdx: 0, paymentMode: 'cash', doctorName: 'Dr. Priya Mehta',
      notes: '',
      items: [
        { medicineIdx: 0, qty: 2, discount: 0 },    // Paracetamol 2 strips
        { medicineIdx: 21, qty: 1, discount: 0 },    // Cetirizine 1 strip
        { medicineIdx: 22, qty: 1, discount: 0 },    // Dextromethorphan
      ],
    },
    {
      daysAgo: 26, customerIdx: 1, paymentMode: 'upi', doctorName: 'Dr. Suresh Babu',
      notes: 'Fever and infection',
      items: [
        { medicineIdx: 4, qty: 3, discount: 0 },     // Amoxicillin 3 strips
        { medicineIdx: 0, qty: 1, discount: 0 },     // Paracetamol
      ],
    },
    {
      daysAgo: 24, customerIdx: null, paymentMode: 'cash', doctorName: null,
      notes: 'OTC walk-in',
      items: [
        { medicineIdx: 3, qty: 1, discount: 5 },     // Crocin Advance
        { medicineIdx: 24, qty: 1, discount: 0 },    // Betadine
      ],
    },
    {
      daysAgo: 22, customerIdx: 2, paymentMode: 'card', doctorName: null,
      notes: '',
      items: [
        { medicineIdx: 14, qty: 2, discount: 0 },    // Vit D3
        { medicineIdx: 15, qty: 3, discount: 10 },   // Vit B12
        { medicineIdx: 16, qty: 1, discount: 0 },    // Supradyn
      ],
    },
    {
      daysAgo: 20, customerIdx: 3, paymentMode: 'cash', doctorName: 'Dr. Kavitha Rao',
      notes: 'BP medication refill',
      items: [
        { medicineIdx: 11, qty: 2, discount: 0 },    // Amlodipine
        { medicineIdx: 12, qty: 2, discount: 0 },    // Telmisartan
      ],
    },
    {
      daysAgo: 18, customerIdx: 4, paymentMode: 'upi', doctorName: null,
      notes: '',
      items: [
        { medicineIdx: 9, qty: 4, discount: 0 },     // Metformin 4 strips
        { medicineIdx: 10, qty: 2, discount: 0 },    // Glimepiride
      ],
    },
    {
      daysAgo: 16, customerIdx: 5, paymentMode: 'cash', doctorName: 'Dr. Ramesh Hegde',
      notes: 'Stomach issues',
      items: [
        { medicineIdx: 17, qty: 2, discount: 0 },    // Omeprazole
        { medicineIdx: 19, qty: 1, discount: 0 },    // Domperidone
        { medicineIdx: 20, qty: 1, discount: 0 },    // Digene
      ],
    },
    {
      daysAgo: 14, customerIdx: null, paymentMode: 'cash', doctorName: null,
      notes: 'OTC',
      items: [
        { medicineIdx: 0, qty: 3, discount: 5 },     // Paracetamol 3 strips
      ],
    },
    {
      daysAgo: 12, customerIdx: 6, paymentMode: 'card', doctorName: null,
      notes: 'Cold and cough',
      items: [
        { medicineIdx: 21, qty: 2, discount: 0 },    // Cetirizine
        { medicineIdx: 23, qty: 1, discount: 0 },    // Ambroxol
        { medicineIdx: 0, qty: 1, discount: 0 },     // Paracetamol
      ],
    },
    {
      daysAgo: 10, customerIdx: 7, paymentMode: 'upi', doctorName: 'Dr. Anand Gupta',
      notes: 'Post-surgery care',
      items: [
        { medicineIdx: 5, qty: 2, discount: 0 },     // Azithromycin
        { medicineIdx: 24, qty: 2, discount: 0 },    // Betadine
        { medicineIdx: 1, qty: 2, discount: 0 },     // Ibuprofen
        { medicineIdx: 26, qty: 1, discount: 0 },    // Eye drops
      ],
    },
    {
      daysAgo: 8, customerIdx: 8, paymentMode: 'cash', doctorName: null,
      notes: '',
      items: [
        { medicineIdx: 13, qty: 3, discount: 0 },    // Losartan
        { medicineIdx: 11, qty: 2, discount: 5 },    // Amlodipine
      ],
    },
    {
      daysAgo: 6, customerIdx: 9, paymentMode: 'cash', doctorName: 'Dr. Meera Krishnan',
      notes: 'Fever for child',
      items: [
        { medicineIdx: 3, qty: 1, discount: 0 },     // Crocin Advance
        { medicineIdx: 22, qty: 1, discount: 0 },    // Dextromethorphan
        { medicineIdx: 27, qty: 2, discount: 0 },    // ORS
      ],
    },
    {
      daysAgo: 4, customerIdx: null, paymentMode: 'upi', doctorName: null,
      notes: 'Walk-in customer',
      items: [
        { medicineIdx: 25, qty: 1, discount: 0 },    // Clotrimazole
        { medicineIdx: 18, qty: 1, discount: 0 },    // Pantoprazole
      ],
    },
    {
      daysAgo: 3, customerIdx: 0, paymentMode: 'card', doctorName: 'Dr. Priya Mehta',
      notes: 'Follow-up prescription',
      items: [
        { medicineIdx: 6, qty: 2, discount: 0 },     // Ciprofloxacin
        { medicineIdx: 19, qty: 2, discount: 0 },    // Domperidone
        { medicineIdx: 0, qty: 2, discount: 0 },     // Paracetamol
      ],
    },
    {
      daysAgo: 2, customerIdx: 3, paymentMode: 'cash', doctorName: 'Dr. Kavitha Rao',
      notes: 'BP checkup',
      items: [
        { medicineIdx: 11, qty: 1, discount: 0 },    // Amlodipine
        { medicineIdx: 12, qty: 1, discount: 0 },    // Telmisartan
      ],
    },
    {
      daysAgo: 1, customerIdx: null, paymentMode: 'upi', doctorName: null,
      notes: 'Late night walk-in',
      items: [
        { medicineIdx: 0, qty: 1, discount: 0 },     // Paracetamol
        { medicineIdx: 21, qty: 1, discount: 0 },    // Cetirizine
      ],
    },
    {
      daysAgo: 0, customerIdx: 5, paymentMode: 'cash', doctorName: 'Dr. Ramesh Hegde',
      notes: 'Digestive issues',
      items: [
        { medicineIdx: 17, qty: 1, discount: 0 },    // Omeprazole
        { medicineIdx: 18, qty: 1, discount: 0 },    // Pantoprazole
        { medicineIdx: 20, qty: 1, discount: 0 },    // Digene
      ],
    },
  ];

  // Track batch quantity deductions
  const batchDeductions: Map<string, number> = new Map();
  let invoiceCounter = 1001;

  for (const sd of salesData) {
    const saleItems: any[] = [];
    let subtotal = 0;
    let totalGst = 0;
    let totalDiscount = 0;

    for (const item of sd.items) {
      const batch = getBestBatch(item.medicineIdx);
      if (!batch) {
        console.warn(`  ⚠️ No available batch for medicine idx ${item.medicineIdx}, skipping item.`);
        continue;
      }

      const medicine = medicines[item.medicineIdx];
      const mrp = batch.mrp;
      const lineTotalBeforeDiscount = mrp * item.qty;
      const discountAmt = lineTotalBeforeDiscount * (item.discount / 100);
      const lineTotalAfterDiscount = lineTotalBeforeDiscount - discountAmt;
      const gstAmt = lineTotalAfterDiscount * (medicine.gstPercent / 100);
      const lineTotal = lineTotalAfterDiscount + gstAmt;

      subtotal += lineTotalAfterDiscount;
      totalGst += gstAmt;
      totalDiscount += discountAmt;

      saleItems.push({
        batchId: batch.id,
        medicineId: medicine.id,
        medicineName: medicine.name,
        quantity: item.qty,
        mrp,
        discount: item.discount,
        gstPercent: medicine.gstPercent,
        gstAmount: Math.round(gstAmt * 100) / 100,
        totalAmount: Math.round(lineTotal * 100) / 100,
      });

      // Track deduction
      batchDeductions.set(batch.id, (batchDeductions.get(batch.id) || 0) + item.qty);
    }

    if (saleItems.length === 0) continue;

    const totalAmount = Math.round((subtotal + totalGst) * 100) / 100;
    const invoiceNo = `INV${invoiceCounter++}`;

    await db.sale.create({
      data: {
        customerId: sd.customerIdx !== null ? customers[sd.customerIdx].id : null,
        doctorName: sd.doctorName,
        invoiceNo,
        saleDate: daysAgo(sd.daysAgo),
        subtotal: Math.round(subtotal * 100) / 100,
        totalGst: Math.round(totalGst * 100) / 100,
        totalDiscount: Math.round(totalDiscount * 100) / 100,
        totalAmount,
        paymentMode: sd.paymentMode,
        notes: sd.notes,
        items: { create: saleItems },
      },
    });

    saleItems.length = 0; // just clearing the array
  }

  // Now apply batch deductions
  for (const [batchId, deduction] of batchDeductions) {
    await db.batch.update({
      where: { id: batchId },
      data: { quantity: { decrement: deduction } },
    });
  }

  // Update store's next invoice number
  const totalSales = salesData.length;
  await db.storeSetting.update({
    where: { id: store.id },
    data: { nextInvoiceNo: 1001 + totalSales },
  });

  console.log(`\n🧾 Created ${totalSales} sales with items.`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════════
  const medCount = await db.medicine.count();
  const batchCount = await db.batch.count();
  const supplierCount = await db.supplier.count();
  const customerCount = await db.customer.count();
  const saleCount = await db.sale.count();
  const saleItemCount = await db.saleItem.count();
  const poCount = await db.purchaseOrder.count();

  console.log('\n═════════════════════════════════════════════════════════════════════');
  console.log('                  📊 SEED COMPLETE - SUMMARY');
  console.log('═════════════════════════════════════════════════════════════════════');
  console.log(`  Store Settings:    1`);
  console.log(`  Suppliers:         ${supplierCount}`);
  console.log(`  Medicines:         ${medCount}`);
  console.log(`  Batches:           ${batchCount}`);
  console.log(`  Customers:         ${customerCount}`);
  console.log(`  Sales:             ${saleCount}`);
  console.log(`  Sale Items:        ${saleItemCount}`);
  console.log(`  Purchase Orders:   ${poCount}`);
  console.log('═════════════════════════════════════════════════════════════════════\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
