import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function seed() {
  console.log('🌱 Seeding admin panel data...')

  // Create admin
  const admin = await db.admin.upsert({
    where: { email: 'rajeshwarsinghrana16@gmail.com' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'rajeshwarsinghrana16@gmail.com',
      password: 'admin123', // In production, this would be hashed
      role: 'super_admin',
    },
  })
  console.log('✅ Admin created:', admin.email)

  // Create sample tenants
  const tenantData = [
    { name: 'Rajesh Kumar', email: 'rajesh@kumarpharma.com', businessName: 'Kumar Medical Store', phone: '9876543210', businessPhone: '9876543210', businessAddress: 'Mumbai, Maharashtra', gstNumber: '27AADCK1234A1Z5', plan: 'pro', status: 'active' },
    { name: 'Priya Sharma', email: 'priya@sharmapharma.com', businessName: 'Sharma Pharmacy', phone: '9876543211', businessPhone: '9876543211', businessAddress: 'Delhi', gstNumber: '07AABCS5678B2Z3', plan: 'pro', status: 'active' },
    { name: 'Mohammed Ali', email: 'ali@alihealthcare.com', businessName: 'Ali Healthcare', phone: '9876543212', businessPhone: '9876543212', businessAddress: 'Hyderabad, Telangana', gstNumber: '36AADCM9012C3Z1', plan: 'free', status: 'active' },
    { name: 'Suresh Patel', email: 'suresh@patelmedicos.com', businessName: 'Patel Medicos', phone: '9876543213', businessPhone: '9876543214', businessAddress: 'Ahmedabad, Gujarat', plan: 'free', status: 'active' },
    { name: 'Lakshmi Iyer', email: 'lakshmi@iyerpharma.com', businessName: 'Iyer Pharmacy', phone: '9876543215', businessPhone: '9876543215', businessAddress: 'Chennai, Tamil Nadu', plan: 'pro', status: 'active' },
    { name: 'Anil Verma', email: 'anil@vermadrugs.com', businessName: 'Verma Drugs', phone: '9876543216', businessPhone: '9876543217', businessAddress: 'Lucknow, UP', plan: 'free', status: 'trial' },
    { name: 'Deepa Nair', email: 'deepa@nairpharmacy.com', businessName: 'Nair Pharmacy & General Store', phone: '9876543218', businessPhone: '9876543218', businessAddress: 'Kochi, Kerala', plan: 'pro', status: 'active' },
    { name: 'Ravi Singh', email: 'ravi@singhmedico.com', businessName: 'Singh Medico', phone: '9876543219', businessPhone: '9876543220', businessAddress: 'Jaipur, Rajasthan', plan: 'free', status: 'suspended' },
    { name: 'Kavita Reddy', email: 'kavita@reddypharma.com', businessName: 'Reddy Pharma', phone: '9876543221', businessPhone: '9876543221', businessAddress: 'Bangalore, Karnataka', plan: 'pro', status: 'active' },
    { name: 'Manoj Gupta', email: 'manoj@guptamedicals.com', businessName: 'Gupta Medicals', phone: '9876543222', businessPhone: '9876543223', businessAddress: 'Pune, Maharashtra', plan: 'free', status: 'active' },
  ]

  const tenants = []
  for (const t of tenantData) {
    const tenant = await db.tenant.upsert({
      where: { email: t.email },
      update: {},
      create: {
        ...t,
        passwordHash: 'hashed_' + t.email,
      },
    })
    tenants.push(tenant)
  }
  console.log(`✅ ${tenants.length} tenants created`)

  // Create subscriptions
  const subData = tenants.map((t) => {
    const isPro = t.plan === 'pro'
    return {
      tenantId: t.id,
      plan: t.plan,
      amount: isPro ? 499 : 0,
      status: t.status === 'suspended' ? 'expired' : 'active',
      startDate: new Date(2026, 0, 1),
      endDate: new Date(2027, 0, 1),
      paymentMode: isPro ? 'upi' : null,
    }
  })

  for (const s of subData) {
    await db.subscription.upsert({
      where: { id: `${s.tenantId}-sub` },
      update: {},
      create: { ...s, id: `${s.tenantId}-sub` },
    })
  }
  console.log(`✅ ${subData.length} subscriptions created`)

  // Create support tickets
  const ticketData = [
    { tenantId: tenants[0].id, subject: 'Cannot generate GST report', description: 'When I try to generate monthly GST report, it shows an error. Please fix this urgently.', status: 'open', priority: 'high' },
    { tenantId: tenants[1].id, subject: 'Billing is slow', description: 'The billing page takes too long to load after the latest update.', status: 'in_progress', priority: 'medium' },
    { tenantId: tenants[2].id, subject: 'Feature request: Dark mode', description: 'Please add dark mode to the app. It would be great for night shifts.', status: 'open', priority: 'low' },
    { tenantId: tenants[4].id, subject: 'Expiry alerts not working', description: 'I have medicines expiring next week but no alerts are showing up.', status: 'resolved', priority: 'urgent', replies: JSON.stringify([{ from: 'admin', message: 'Fixed the alert cron job. Please check now.', date: new Date().toISOString() }]) },
    { tenantId: tenants[6].id, subject: 'Invoice printing issue', description: 'Printed invoices are cutting off the GST breakdown section.', status: 'open', priority: 'medium' },
  ]

  for (const t of ticketData) {
    await db.supportTicket.create({ data: t })
  }
  console.log(`✅ ${ticketData.length} support tickets created`)

  // Create system logs
  const logData = [
    { tenantId: tenants[0].id, action: 'login', details: 'User logged in from Mumbai' },
    { tenantId: tenants[1].id, action: 'bill_created', details: 'Invoice #INV1047 created for ₹2,450' },
    { tenantId: tenants[2].id, action: 'subscription_changed', details: 'Plan changed from free to pro' },
    { tenantId: tenants[4].id, action: 'medicine_added', details: 'Added 15 new medicines to inventory' },
    { tenantId: tenants[6].id, action: 'purchase_entry', details: 'Purchase order PO-234 created for ₹45,000' },
    { tenantId: tenants[8].id, action: 'export_data', details: 'Exported sales report CSV' },
    { action: 'system_backup', details: 'Automated daily backup completed' },
    { action: 'system_cleanup', details: 'Expired sessions cleared' },
  ]

  for (const l of logData) {
    await db.systemLog.create({ data: l })
  }
  console.log(`✅ ${logData.length} system logs created`)

  // Create announcements
  const announcementData = [
    { title: 'New Feature: AI Bill Scanning', message: 'You can now scan any pharmacy bill with AI to instantly extract medicine details. Go to Billing → AI Scan to try it out!', type: 'promotion' },
    { title: 'Scheduled Maintenance', message: 'We will perform server maintenance on May 1st, 2026 from 2:00 AM to 4:00 AM IST. The app may be briefly unavailable.', type: 'maintenance' },
    { title: 'GST Report Update', message: 'GST reports now support HSN code mapping. Update your medicine categories for accurate filing.', type: 'info' },
  ]

  for (const a of announcementData) {
    await db.announcement.create({ data: a })
  }
  console.log(`✅ ${announcementData.length} announcements created`)

  // Create platform settings
  const settingData = [
    { key: 'free_plan_price', value: '0', description: 'Monthly price for Free plan' },
    { key: 'pro_plan_price', value: '499', description: 'Monthly price for Pro plan' },
    { key: 'free_plan_medicine_limit', value: '500', description: 'Max medicines allowed in Free plan' },
    { key: 'pro_plan_medicine_limit', value: 'unlimited', description: 'Max medicines allowed in Pro plan' },
    { key: 'ai_scan_enabled', value: 'true', description: 'Enable AI bill scanning feature' },
    { key: 'support_email', value: 'rajeshwarsinghrana16@gmail.com', description: 'Customer support email' },
    { key: 'maintenance_mode', value: 'false', description: 'Enable maintenance mode' },
  ]

  for (const s of settingData) {
    await db.platformSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    })
  }
  console.log(`✅ ${settingData.length} platform settings created`)

  console.log('\n🎉 Seeding complete!')
}

seed().catch(console.error).finally(() => db.$disconnect())
