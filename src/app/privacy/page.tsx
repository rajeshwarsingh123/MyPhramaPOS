import { LegalPageLayout } from '@/components/legal-page-layout'

export default function PrivacyPolicy() {
  return (
    <LegalPageLayout title="Privacy Policy" lastUpdated="May 7, 2026">
      <p>
        At PharmPOS, we take your privacy and the security of your pharmacy data extremely seriously. 
        This Privacy Policy describes how we collect, use, and protect the information you provide 
        when using our SaaS platform.
      </p>

      <h2>1. Information We Collect</h2>
      <p>
        To provide our services, we collect several types of information from our tenants (pharmacy owners) 
        and their authorized staff members:
      </p>
      <ul>
        <li><strong>Account Information:</strong> Name, pharmacy name, business address, email, phone number, and GST details.</li>
        <li><strong>Inventory Data:</strong> Details of medicines, stock levels, batch numbers, and expiry dates.</li>
        <li><strong>Sales Records:</strong> Transaction details, invoice history, and customer mobile numbers (if provided).</li>
        <li><strong>System Metadata:</strong> IP addresses, browser types, and usage patterns to ensure platform security and stability.</li>
      </ul>

      <h2>2. How We Use Your Data</h2>
      <p>
        Your data is used strictly for providing and improving the PharmPOS service:
      </p>
      <ul>
        <li>To generate bills, GST reports, and inventory alerts for your pharmacy.</li>
        <li>To provide real-time business analytics and insights.</li>
        <li>To monitor for system health and prevent unauthorized access.</li>
        <li>To communicate important service updates or support ticket resolutions.</li>
      </ul>

      <h2>3. Data Ownership & Sovereignty</h2>
      <p>
        <strong>You own your data.</strong> PharmPOS acts as a data processor. We do not sell, rent, 
        or share your pharmacy&apos;s inventory or sales data with third parties for marketing purposes. 
        Your data is stored securely on encrypted cloud servers (Supabase/PostgreSQL) and is only 
        accessible to you and your authorized administrators.
      </p>

      <h2>4. Data Security Measures</h2>
      <p>
        We implement industry-standard security protocols to protect your sensitive business information:
      </p>
      <ul>
        <li><strong>End-to-End Encryption:</strong> All data transmitted between your browser and our servers is encrypted using SSL/TLS.</li>
        <li><strong>Database Isolation:</strong> Multi-tenant architecture ensures that your data is logically separated from other pharmacies.</li>
        <li><strong>Regular Backups:</strong> Automated daily backups ensure that your records are safe even in the event of hardware failure.</li>
      </ul>

      <h2>5. Compliance with Indian IT Act</h2>
      <p>
        PharmPOS complies with the Information Technology Act, 2000 and the Rules made thereunder. 
        We maintain reasonable security practices and procedures for the protection of Personal 
        Sensitive Data or Information (SPDI).
      </p>

      <h2>6. Your Rights</h2>
      <p>
        As a tenant, you have the right to:
      </p>
      <ul>
        <li>Access and export your sales and inventory data at any time.</li>
        <li>Correct or update your pharmacy profile and business details.</li>
        <li>Request the deletion of your account and all associated data (subject to legal retention requirements).</li>
      </ul>

      <h2>7. Contact Us</h2>
      <p>
        If you have any questions about this Privacy Policy or our data practices, please contact 
        our grievance officer at <strong>support@pharmpos.com</strong>.
      </p>
    </LegalPageLayout>
  )
}
