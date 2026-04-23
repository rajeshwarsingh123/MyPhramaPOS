import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// Predefined composition-based category keywords
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Pain/Fever': ['paracetamol', 'ibuprofen', 'aspirin', 'crocin', 'acetaminophen', 'analgesic', 'antipyretic', 'diclofenac', 'naproxen'],
  'Antibiotics': ['amoxicillin', 'azithromycin', 'ciprofloxacin', 'metronidazole', 'doxycycline', 'ampicillin', 'ceftriaxone', 'ofloxacin', 'levofloxacin', 'antibiotic'],
  'Diabetes': ['metformin', 'glimepiride', 'insulin', 'glyburide', 'sitagliptin', 'pioglitazone', 'voglibose'],
  'Blood Pressure': ['amlodipine', 'telmisartan', 'losartan', 'atenolol', 'enalapril', 'ramipril', 'valsartan', 'olmesartan'],
  'Vitamins': ['vitamin', 'multivitamin', 'supradyn', 'becosules', 'zincovit', 'shelcal', 'calcium', 'iron', 'folic', 'b12'],
  'Digestive': ['omeprazole', 'pantoprazole', 'domperidone', 'digene', 'antacid', 'ranitidine', 'lansoprazole', 'esomeprazole', 'rabeprazole'],
  'Cough/Cold': ['cetirizine', 'dextromethorphan', 'ambroxol', 'cough', 'cold', 'sinus', 'chlorpheniramine', 'phenylephrine', 'levocetirizine'],
  'Skin': ['betadine', 'clotrimazole', 'cream', 'ointment', 'lotion', 'mupirocin', 'ketoconazole', 'antifungal'],
  'Eye/Ear': ['eye drops', 'ear drops', 'ciprofloxacin', 'tobramycin', 'ofloxacin', 'chloramphenicol'],
  'Heart': ['atorvastatin', 'rosuvastatin', 'clopidogrel', 'aspirin', 'ezetimibe', 'fenofibrate', 'statin'],
}

export async function GET() {
  try {
    // Fetch all active medicines with their compositions
    const medicines = await db.medicine.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        composition: true,
        genericName: true,
        unitType: true,
      },
    })

    // Count by unit type
    const unitTypeCounts: Record<string, number> = {}
    for (const med of medicines) {
      const ut = med.unitType || 'tablet'
      unitTypeCounts[ut] = (unitTypeCounts[ut] || 0) + 1
    }

    // Count by composition-based category
    const categoryCounts: Record<string, number> = {}
    const uncategorized = medicines.filter((med) => {
      const searchText = `${med.name} ${med.composition || ''} ${med.genericName || ''}`.toLowerCase()
      let matched = false
      for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        for (const kw of keywords) {
          if (searchText.includes(kw.toLowerCase())) {
            categoryCounts[category] = (categoryCounts[category] || 0) + 1
            matched = true
            break
          }
        }
        if (matched) break
      }
      return !matched
    })

    categoryCounts['Other'] = uncategorized.length

    // Build category list with counts
    const categories = Object.entries(categoryCounts)
      .filter(([, count]) => count > 0)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)

    const unitTypes = Object.entries(unitTypeCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)

    return NextResponse.json({
      categories,
      unitTypes,
      totalMedicines: medicines.length,
    })
  } catch (error) {
    console.error('GET /api/medicines/categories error:', error)
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
  }
}
