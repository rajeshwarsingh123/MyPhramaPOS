import { db } from '../src/lib/db'

// ─── Helpers ────────────────────────────────────────────────────────────────────
const daysAgo = (d: number) => {
  const dt = new Date()
  dt.setDate(dt.getDate() - d)
  dt.setHours(Math.floor(Math.random() * 12) + 8, Math.floor(Math.random() * 60), 0, 0)
  return dt
}

// ─── Main Seed ──────────────────────────────────────────────────────────────────
async function main() {
  console.log('🌱 Seeding admin panel data...\n')

  // ═══════════════════════════════════════════════════════════════════════════════
  // CLEANUP — Idempotent re-seeding
  // ═══════════════════════════════════════════════════════════════════════════════
  await db.systemLog.deleteMany()
  await db.supportTicket.deleteMany()
  await db.subscription.deleteMany()
  await db.tenant.deleteMany()
  await db.announcement.deleteMany()
  await db.platformSetting.deleteMany()
  await db.admin.deleteMany()
  console.log('✅ Cleared all existing admin data.\n')

  // ═══════════════════════════════════════════════════════════════════════════════
  // 1. ADMIN USERS (2)
  // ═══════════════════════════════════════════════════════════════════════════════
  const admins = await Promise.all([
    db.admin.create({
      data: {
        name: 'Super Admin',
        email: 'admin@pharmpos.com',
        password: 'admin123',
        role: 'super_admin',
        isActive: true,
        lastLogin: daysAgo(0),
      },
    }),
    db.admin.create({
      data: {
        name: 'John Staff',
        email: 'staff@pharmpos.com',
        password: 'staff123',
        role: 'staff',
        isActive: true,
        lastLogin: daysAgo(2),
      },
    }),
  ])
  console.log(`👤 Created ${admins.length} admin users.`)

  // ═══════════════════════════════════════════════════════════════════════════════
  // 2. TENANTS (15 pharmacy businesses)
  // ═══════════════════════════════════════════════════════════════════════════════
  const tenantsData = [
    {
      name: 'Rajesh Kumar', email: 'rajesh@healthcarepharma.com',
      businessName: 'HealthCare Pharmacy', phone: '+91 98765 43210',
      businessPhone: '+91 98765 43211', businessAddress: '123, MG Road, Mumbai, Maharashtra - 400001',
      gstNumber: '27AADCR5678A1Z5', plan: 'pro', status: 'active', createdDaysAgo: 85,
    },
    {
      name: 'Priya Sharma', email: 'priya@medplusstore.com',
      businessName: 'MedPlus Store', phone: '+91 98765 43212',
      businessPhone: '+91 98765 43213', businessAddress: '45, Connaught Place, New Delhi - 110001',
      gstNumber: '07AADCS1234B2Z3', plan: 'free', status: 'active', createdDaysAgo: 78,
    },
    {
      name: 'Amit Patel', email: 'amit@apollopharmacy.in',
      businessName: 'Apollo Pharmacy', phone: '+91 98765 43214',
      businessPhone: '+91 98765 43215', businessAddress: '67, Brigade Road, Bangalore, Karnataka - 560001',
      gstNumber: '29AADCA9012C3Z1', plan: 'pro', status: 'active', createdDaysAgo: 72,
    },
    {
      name: 'Sunita Devi', email: 'sunita@newlifemedicos.com',
      businessName: 'New Life Medicos', phone: '+91 98765 43216',
      businessPhone: '+91 98765 43217', businessAddress: '89, T. Nagar, Chennai, Tamil Nadu - 600017',
      gstNumber: '33AADCN5678D4Z9', plan: 'free', status: 'active', createdDaysAgo: 65,
    },
    {
      name: 'Mohammed Irfan', email: 'irfan@citydrugstore.com',
      businessName: 'City Drug Store', phone: '+91 98765 43218',
      businessPhone: '+91 98765 43219', businessAddress: '12, Banjara Hills, Hyderabad, Telangana - 500034',
      gstNumber: '36AADCM2345E5Z7', plan: 'pro', status: 'active', createdDaysAgo: 60,
    },
    {
      name: 'Lakshmi Iyer', email: 'lakshmi@wellcarepharmacy.com',
      businessName: 'WellCare Pharmacy', phone: '+91 98765 43220',
      businessPhone: '+91 98765 43221', businessAddress: '34, Marine Drive, Mumbai, Maharashtra - 400020',
      gstNumber: '27AADCL6789F6Z3', plan: 'free', status: 'trial', createdDaysAgo: 14,
    },
    {
      name: 'Vikram Singh', email: 'vikram@royalpharmacy.in',
      businessName: 'Royal Pharmacy', phone: '+91 98765 43222',
      businessPhone: '+91 98765 43223', businessAddress: '56, Park Street, Kolkata, West Bengal - 700016',
      gstNumber: '19AADCV3456G7Z1', plan: 'pro', status: 'active', createdDaysAgo: 55,
    },
    {
      name: 'Deepa Nair', email: 'deepa@keralapharmacy.com',
      businessName: 'Kerala Pharmacy & General Store', phone: '+91 98765 43224',
      businessPhone: '+91 98765 43225', businessAddress: '78, MG Road, Kochi, Kerala - 682011',
      gstNumber: '32AADCD7890H8Z5', plan: 'free', status: 'active', createdDaysAgo: 50,
    },
    {
      name: 'Anil Verma', email: 'anil@vermadrugs.com',
      businessName: 'Verma Drugs & Pharmaceuticals', phone: '+91 98765 43226',
      businessPhone: '+91 98765 43227', businessAddress: '90, Hazratganj, Lucknow, Uttar Pradesh - 226001',
      gstNumber: '09AADCA1234I9Z2', plan: 'free', status: 'suspended', createdDaysAgo: 45,
    },
    {
      name: 'Kavita Reddy', email: 'kavita@reddypharma.in',
      businessName: 'Reddy Pharma', phone: '+91 98765 43228',
      businessPhone: '+91 98765 43229', businessAddress: '23, Jubilee Hills, Hyderabad, Telangana - 500033',
      gstNumber: '36AADCK5678J1Z8', plan: 'free', status: 'active', createdDaysAgo: 40,
    },
    {
      name: 'Manoj Gupta', email: 'manoj@guptamedicals.com',
      businessName: 'Gupta Medicals', phone: '+91 98765 43230',
      businessPhone: '+91 98765 43231', businessAddress: '45, FC Road, Pune, Maharashtra - 411004',
      gstNumber: '27AADCM9012K2Z6', plan: 'free', status: 'active', createdDaysAgo: 35,
    },
    {
      name: 'Sneha Joshi', email: 'sneha@smartpharma.in',
      businessName: 'SmartPharma', phone: '+91 98765 43232',
      businessPhone: '+91 98765 43233', businessAddress: '67, Koramangala, Bangalore, Karnataka - 560034',
      gstNumber: '29AADCS3456L3Z4', plan: 'pro', status: 'active', createdDaysAgo: 30,
    },
    {
      name: 'Ramesh Agarwal', email: 'ramesh@agarwalandsons.com',
      businessName: 'Agarwal & Sons Medical', phone: '+91 98765 43234',
      businessPhone: '+91 98765 43235', businessAddress: '12, MI Road, Jaipur, Rajasthan - 302001',
      gstNumber: '08AADC7890M4Z9', plan: 'free', status: 'active', createdDaysAgo: 25,
    },
    {
      name: 'Nisha Menon', email: 'nisha@lifecarepharma.com',
      businessName: 'LifeCare Pharma', phone: '+91 98765 43236',
      businessPhone: '+91 98765 43237', businessAddress: '34, Anna Nagar, Chennai, Tamil Nadu - 600040',
      gstNumber: '33AADCN1234N5Z7', plan: 'free', status: 'trial', createdDaysAgo: 7,
    },
    {
      name: 'Pradeep Kumar', email: 'pradeep@quickmeds.in',
      businessName: 'QuickMeds', phone: '+91 98765 43238',
      businessPhone: '+91 98765 43239', businessAddress: '56, Civil Lines, Delhi - 110054',
      gstNumber: '07AADCP5678O6Z3', plan: 'pro', status: 'active', createdDaysAgo: 20,
    },
  ]

  const tenants: Array<{ id: string; plan: string; status: string; name: string }> = []
  for (const t of tenantsData) {
    const tenant = await db.tenant.create({
      data: {
        name: t.name,
        email: t.email,
        phone: t.phone,
        businessName: t.businessName,
        businessPhone: t.businessPhone,
        businessAddress: t.businessAddress,
        gstNumber: t.gstNumber,
        plan: t.plan,
        status: t.status,
        passwordHash: 'hashed_' + t.email,
        createdAt: daysAgo(t.createdDaysAgo),
      },
    })
    tenants.push({ id: tenant.id, plan: tenant.plan, status: tenant.status, name: tenant.name })
    console.log(`🏪 Tenant: ${t.businessName} (${t.plan}/${t.status})`)
  }
  console.log(`\n✅ Created ${tenants.length} tenants.`)

  // ═══════════════════════════════════════════════════════════════════════════════
  // 3. SUBSCRIPTIONS (20 — some tenants have 2 subscriptions)
  // ═══════════════════════════════════════════════════════════════════════════════
  const subscriptionsData = [
    // Tenant 0 — HealthCare Pharmacy (pro, active)
    { tenantIdx: 0, plan: 'pro', amount: 999, status: 'active', startDaysAgo: 60, endDaysFromStart: 365, paymentMode: 'upi' as const | null },
    // Tenant 0 — previous expired subscription
    { tenantIdx: 0, plan: 'pro', amount: 999, status: 'expired', startDaysAgo: 425, endDaysFromStart: 365, paymentMode: 'upi' as const | null },
    // Tenant 1 — MedPlus Store (free, active)
    { tenantIdx: 1, plan: 'free', amount: 0, status: 'active', startDaysAgo: 75, endDaysFromStart: 30, paymentMode: null },
    // Tenant 2 — Apollo Pharmacy (pro, active)
    { tenantIdx: 2, plan: 'pro', amount: 1499, status: 'active', startDaysAgo: 45, endDaysFromStart: 365, paymentMode: 'card' as const | null },
    // Tenant 3 — New Life Medicos (free, active)
    { tenantIdx: 3, plan: 'free', amount: 0, status: 'active', startDaysAgo: 60, endDaysFromStart: 30, paymentMode: null },
    // Tenant 4 — City Drug Store (pro, active)
    { tenantIdx: 4, plan: 'pro', amount: 999, status: 'active', startDaysAgo: 30, endDaysFromStart: 365, paymentMode: 'bank_transfer' as const | null },
    // Tenant 5 — WellCare Pharmacy (free, active — trial)
    { tenantIdx: 5, plan: 'free', amount: 0, status: 'active', startDaysAgo: 10, endDaysFromStart: 30, paymentMode: null },
    // Tenant 6 — Royal Pharmacy (pro, active)
    { tenantIdx: 6, plan: 'pro', amount: 499, status: 'active', startDaysAgo: 90, endDaysFromStart: 365, paymentMode: 'upi' as const | null },
    // Tenant 7 — Kerala Pharmacy (free, active)
    { tenantIdx: 7, plan: 'free', amount: 0, status: 'active', startDaysAgo: 45, endDaysFromStart: 30, paymentMode: null },
    // Tenant 8 — Verma Drugs (free, expired — suspended)
    { tenantIdx: 8, plan: 'free', amount: 0, status: 'expired', startDaysAgo: 40, endDaysFromStart: 30, paymentMode: null },
    // Tenant 9 — Reddy Pharma (free, active)
    { tenantIdx: 9, plan: 'free', amount: 0, status: 'active', startDaysAgo: 35, endDaysFromStart: 30, paymentMode: null },
    // Tenant 10 — Gupta Medicals (free, active)
    { tenantIdx: 10, plan: 'free', amount: 0, status: 'active', startDaysAgo: 30, endDaysFromStart: 30, paymentMode: null },
    // Tenant 11 — SmartPharma (pro, active)
    { tenantIdx: 11, plan: 'pro', amount: 999, status: 'active', startDaysAgo: 20, endDaysFromStart: 365, paymentMode: 'card' as const | null },
    // Tenant 12 — Agarwal & Sons (free, active)
    { tenantIdx: 12, plan: 'free', amount: 0, status: 'active', startDaysAgo: 20, endDaysFromStart: 30, paymentMode: null },
    // Tenant 13 — LifeCare Pharma (free, active — trial)
    { tenantIdx: 13, plan: 'free', amount: 0, status: 'active', startDaysAgo: 5, endDaysFromStart: 30, paymentMode: null },
    // Tenant 14 — QuickMeds (pro, cancelled)
    { tenantIdx: 14, plan: 'pro', amount: 499, status: 'cancelled', startDaysAgo: 100, endDaysFromStart: 365, paymentMode: 'upi' as const | null },
    // Tenant 14 — QuickMeds current (pro, active)
    { tenantIdx: 14, plan: 'pro', amount: 999, status: 'active', startDaysAgo: 10, endDaysFromStart: 365, paymentMode: 'card' as const | null },
    // Tenant 3 — New Life Medicos old expired
    { tenantIdx: 3, plan: 'free', amount: 0, status: 'expired', startDaysAgo: 120, endDaysFromStart: 30, paymentMode: null },
    // Tenant 6 — Royal Pharmacy old expired
    { tenantIdx: 6, plan: 'pro', amount: 999, status: 'expired', startDaysAgo: 460, endDaysFromStart: 365, paymentMode: 'bank_transfer' as const | null },
    // Tenant 9 — Reddy Pharma old cancelled
    { tenantIdx: 9, plan: 'free', amount: 0, status: 'cancelled', startDaysAgo: 90, endDaysFromStart: 30, paymentMode: null },
  ]

  for (const s of subscriptionsData) {
    const startDate = daysAgo(s.startDaysAgo)
    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + s.endDaysFromStart)

    await db.subscription.create({
      data: {
        tenantId: tenants[s.tenantIdx].id,
        plan: s.plan,
        amount: s.amount,
        status: s.status,
        startDate,
        endDate,
        paymentMode: s.paymentMode,
      },
    })
  }
  console.log(`\n💳 Created ${subscriptionsData.length} subscriptions.`)

  // ═══════════════════════════════════════════════════════════════════════════════
  // 4. SUPPORT TICKETS (12)
  // ═══════════════════════════════════════════════════════════════════════════════
  const ticketsData = [
    {
      tenantIdx: 0, subject: 'Cannot add new medicine to inventory',
      description: 'When I try to add a new medicine through the Medicines page, the form submits but the medicine does not appear in the list. I have tried this with multiple medicines but the issue persists.',
      status: 'open', priority: 'high', replies: JSON.stringify([]), createdDaysAgo: 5,
    },
    {
      tenantIdx: 1, subject: 'Billing issue — total amount calculation wrong',
      description: 'The billing page is showing incorrect total amounts. GST is being calculated on the discounted price instead of MRP. This is causing mismatch with the physical receipt.',
      status: 'in_progress', priority: 'urgent', replies: JSON.stringify([
        { author: 'admin', message: 'We are looking into the GST calculation issue. It seems the discount logic is interfering with the tax computation.', time: new Date(Date.now() - 4 * 86400000).toISOString() },
      ]), createdDaysAgo: 6,
    },
    {
      tenantIdx: 2, subject: 'Report export not working',
      description: 'I am unable to export the monthly sales report to PDF or CSV. The export button clicks but nothing happens. I am using Google Chrome on Windows 11.',
      status: 'open', priority: 'medium', replies: JSON.stringify([]), createdDaysAgo: 3,
    },
    {
      tenantIdx: 4, subject: 'Feature request: Dark mode support',
      description: 'My staff works night shifts and it would be great if the app had a dark mode option. This would reduce eye strain during late hours. Please consider adding this feature.',
      status: 'open', priority: 'low', replies: JSON.stringify([]), createdDaysAgo: 10,
    },
    {
      tenantIdx: 6, subject: 'Invoice printing alignment issue',
      description: 'The printed invoices are not aligned properly on my thermal printer. The GST breakdown section is getting cut off on the right side. I am using an 80mm thermal printer.',
      status: 'resolved', priority: 'medium', replies: JSON.stringify([
        { author: 'admin', message: 'We have fixed the print CSS for 80mm thermal printers. Please clear your cache and try again.', time: new Date(Date.now() - 8 * 86400000).toISOString() },
        { author: 'tenant', message: 'Thank you! The alignment is now perfect. Great support!', time: new Date(Date.now() - 7 * 86400000).toISOString() },
      ]), createdDaysAgo: 12,
    },
    {
      tenantIdx: 7, subject: 'Expiry alerts not showing for some batches',
      description: 'I have several batches expiring within the next 15 days but the alerts panel only shows a few of them. Some critical expiring medicines are missing from the alert list.',
      status: 'in_progress', priority: 'high', replies: JSON.stringify([
        { author: 'admin', message: 'This might be related to the batch filter. Can you share the batch numbers of the missing alerts?', time: new Date(Date.now() - 2 * 86400000).toISOString() },
      ]), createdDaysAgo: 4,
    },
    {
      tenantIdx: 9, subject: 'Slow page loading on mobile',
      description: 'The app takes very long to load on my mobile phone. The medicines page with search is especially slow. I am using a budget Android phone with Jio network.',
      status: 'open', priority: 'medium', replies: JSON.stringify([]), createdDaysAgo: 7,
    },
    {
      tenantIdx: 10, subject: 'Password reset not working',
      description: 'I forgot my password and tried the reset option but I never received the reset email. My email address is correct in the settings. Please help me regain access.',
      status: 'resolved', priority: 'high', replies: JSON.stringify([
        { author: 'admin', message: 'The email service was down for a few hours. We have reset your password manually. Please check your email.', time: new Date(Date.now() - 9 * 86400000).toISOString() },
      ]), createdDaysAgo: 15,
    },
    {
      tenantIdx: 11, subject: 'Feature request: Bulk medicine import via CSV',
      description: 'We have over 500 medicines and entering them one by one is tedious. Please add a CSV import feature so we can bulk upload our medicine catalog.',
      status: 'open', priority: 'low', replies: JSON.stringify([]), createdDaysAgo: 2,
    },
    {
      tenantIdx: 12, subject: 'Customer history not showing old purchases',
      description: 'When I open a customer profile, it only shows purchases from the last 30 days. Older purchase history is not visible. We need at least 6 months of history for customer records.',
      status: 'in_progress', priority: 'medium', replies: JSON.stringify([
        { author: 'admin', message: 'We are increasing the history limit to 1 year in the next update.', time: new Date(Date.now() - 1 * 86400000).toISOString() },
      ]), createdDaysAgo: 8,
    },
    {
      tenantIdx: 13, subject: 'Cannot create purchase order',
      description: 'As a new user, I am trying to create my first purchase order but the form keeps showing a validation error even though all fields are filled correctly.',
      status: 'open', priority: 'low', replies: JSON.stringify([]), createdDaysAgo: 1,
    },
    {
      tenantIdx: 14, subject: 'GST report mismatch with tally data',
      description: 'The GST report exported from PharmPOS does not match with our Tally data. There is a small difference in the total taxable amount. We need this sorted before the filing deadline.',
      status: 'closed', priority: 'medium', replies: JSON.stringify([
        { author: 'admin', message: 'The mismatch was due to round-off differences. We have updated the rounding logic to match Tally standards.', time: new Date(Date.now() - 20 * 86400000).toISOString() },
        { author: 'tenant', message: 'Confirmed. The numbers now match exactly. Thanks for the quick fix!', time: new Date(Date.now() - 19 * 86400000).toISOString() },
      ]), createdDaysAgo: 22,
    },
  ]

  for (const t of ticketsData) {
    await db.supportTicket.create({
      data: {
        tenantId: tenants[t.tenantIdx].id,
        subject: t.subject,
        description: t.description,
        status: t.status,
        priority: t.priority,
        replies: t.replies,
        createdAt: daysAgo(t.createdDaysAgo),
      },
    })
  }
  console.log(`🎫 Created ${ticketsData.length} support tickets.`)

  // ═══════════════════════════════════════════════════════════════════════════════
  // 5. SYSTEM LOGS (25)
  // ═══════════════════════════════════════════════════════════════════════════════
  const logsData = [
    { tenantIdx: 0, action: 'User signup', details: 'HealthCare Pharmacy registered from Mumbai, Maharashtra', daysAgo: 85 },
    { tenantIdx: 1, action: 'User signup', details: 'MedPlus Store registered from New Delhi', daysAgo: 78 },
    { tenantIdx: 2, action: 'User signup', details: 'Apollo Pharmacy registered from Bangalore', daysAgo: 72 },
    { tenantIdx: 0, action: 'Login', details: 'User logged in from IP 103.xx.xx.45 (Mumbai)', daysAgo: 70 },
    { tenantIdx: 0, action: 'Password reset', details: 'Password reset requested via email for rajesh@healthcarepharma.com', daysAgo: 68 },
    { tenantIdx: 2, action: 'Plan upgrade', details: 'Apollo Pharmacy upgraded from free to pro plan — ₹1,499/month', daysAgo: 65 },
    { tenantIdx: 4, action: 'Subscription created', details: 'City Drug Store subscribed to pro plan — ₹999/month via UPI', daysAgo: 60 },
    { tenantIdx: 0, action: 'Login', details: 'User logged in from IP 103.xx.xx.45 (Mumbai)', daysAgo: 55 },
    { tenantIdx: 3, action: 'Login', details: 'User logged in from IP 49.xx.xx.12 (Chennai)', daysAgo: 50 },
    { tenantIdx: 6, action: 'Subscription created', details: 'Royal Pharmacy subscribed to pro plan — ₹999/month via bank_transfer', daysAgo: 48 },
    { tenantIdx: null, action: 'System backup completed', details: 'Automated daily database backup completed successfully (2.4 MB)', daysAgo: 45 },
    { tenantIdx: null, action: 'System error', details: 'Database connection timeout during peak hours — auto-recovered after 3 seconds', daysAgo: 42 },
    { tenantIdx: 1, action: 'Login', details: 'User logged in from IP 14.xx.xx.78 (New Delhi)', daysAgo: 40 },
    { tenantIdx: 8, action: 'Account suspended', details: 'Verma Drugs account suspended due to payment verification failure', daysAgo: 38 },
    { tenantIdx: 6, action: 'Login', details: 'User logged in from IP 116.xx.xx.90 (Kolkata)', daysAgo: 35 },
    { tenantIdx: null, action: 'System warning', details: 'Disk usage reached 75% on primary server — monitoring closely', daysAgo: 30 },
    { tenantIdx: 11, action: 'Subscription created', details: 'SmartPharma subscribed to pro plan — ₹999/month via card', daysAgo: 25 },
    { tenantIdx: null, action: 'System cleanup', details: 'Expired sessions and temp files cleaned up — freed 150 MB', daysAgo: 20 },
    { tenantIdx: 14, action: 'Plan upgrade', details: 'QuickMeds upgraded from free to pro plan — ₹999/month via card', daysAgo: 18 },
    { tenantIdx: 0, action: 'Login', details: 'User logged in from IP 103.xx.xx.45 (Mumbai)', daysAgo: 15 },
    { tenantIdx: 2, action: 'Login', details: 'User logged in from IP 49.xx.xx.33 (Bangalore)', daysAgo: 12 },
    { tenantIdx: 5, action: 'User signup', details: 'WellCare Pharmacy registered from Mumbai — trial account created', daysAgo: 10 },
    { tenantIdx: null, action: 'System maintenance', details: 'Scheduled maintenance window completed — SSL certificate renewed', daysAgo: 5 },
    { tenantIdx: 13, action: 'User signup', details: 'LifeCare Pharma registered from Chennai — trial account created', daysAgo: 3 },
    { tenantIdx: 1, action: 'Login', details: 'User logged in from IP 14.xx.xx.78 (New Delhi)', daysAgo: 1 },
  ]

  for (const l of logsData) {
    await db.systemLog.create({
      data: {
        tenantId: l.tenantIdx !== null ? tenants[l.tenantIdx].id : null,
        action: l.action,
        details: l.details,
        createdAt: daysAgo(l.daysAgo),
      },
    })
  }
  console.log(`📋 Created ${logsData.length} system logs.`)

  // ═══════════════════════════════════════════════════════════════════════════════
  // 6. ANNOUNCEMENTS (4)
  // ═══════════════════════════════════════════════════════════════════════════════
  const announcementsData = [
    {
      title: 'Welcome to PharmPOS v2.0!',
      message: 'We are excited to launch PharmPOS v2.0 with a brand new admin dashboard, improved billing experience, and real-time inventory tracking. Explore all the new features and let us know what you think!',
      type: 'info',
      isActive: true,
    },
    {
      title: 'Scheduled maintenance on Sunday',
      message: 'We will perform routine server maintenance this Sunday from 2:00 AM to 4:00 AM IST. The application may be briefly unavailable during this window. Please save your work before the maintenance window.',
      type: 'maintenance',
      isActive: true,
    },
    {
      title: 'Please update your passwords',
      message: 'As part of our security enhancement initiative, we recommend all users to update their passwords. Use a strong combination of uppercase, lowercase, numbers, and special characters. Enable two-factor authentication if available.',
      type: 'warning',
      isActive: false,
    },
    {
      title: '50% off Pro plan this month!',
      message: 'Celebrate the festive season with PharmPOS! Get 50% off on the Pro plan for the first 3 months. Use code FESTIVE50 during checkout. Offer valid until end of this month. Upgrade now and unlock premium features!',
      type: 'promotion',
      isActive: true,
    },
  ]

  for (const a of announcementsData) {
    await db.announcement.create({ data: a })
  }
  console.log(`📢 Created ${announcementsData.length} announcements.`)

  // ═══════════════════════════════════════════════════════════════════════════════
  // 7. PLATFORM SETTINGS
  // ═══════════════════════════════════════════════════════════════════════════════
  const settingsData = [
    { key: 'freePlanPrice', value: '0', description: 'Monthly price for Free plan' },
    { key: 'proPlanPrice', value: '999', description: 'Monthly price for Pro plan' },
    { key: 'freeMedicineLimit', value: '50', description: 'Max medicines allowed in Free plan' },
    { key: 'aiScanEnabled', value: 'true', description: 'Enable AI bill scanning feature' },
    { key: 'supportEmail', value: 'support@pharmpos.com', description: 'Customer support email' },
    { key: 'maintenanceMode', value: 'false', description: 'Enable maintenance mode' },
  ]

  for (const s of settingsData) {
    await db.platformSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    })
  }
  console.log(`⚙️ Created ${settingsData.length} platform settings.`)

  // ═══════════════════════════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════════
  const adminCount = await db.admin.count()
  const tenantCount = await db.tenant.count()
  const subCount = await db.subscription.count()
  const ticketCount = await db.supportTicket.count()
  const logCount = await db.systemLog.count()
  const announcementCount = await db.announcement.count()
  const settingCount = await db.platformSetting.count()

  console.log('\n═════════════════════════════════════════════════════════════════════')
  console.log('               📊 ADMIN SEED COMPLETE - SUMMARY')
  console.log('═════════════════════════════════════════════════════════════════════')
  console.log(`  Admin Users:         ${adminCount}`)
  console.log(`  Tenants:             ${tenantCount}`)
  console.log(`  Subscriptions:       ${subCount}`)
  console.log(`  Support Tickets:     ${ticketCount}`)
  console.log(`  System Logs:         ${logCount}`)
  console.log(`  Announcements:       ${announcementCount}`)
  console.log(`  Platform Settings:   ${settingCount}`)
  console.log('═════════════════════════════════════════════════════════════════════\n')

  console.log('🎉 Admin seeding complete!')
}

main()
  .catch((e) => {
    console.error('❌ Admin seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
