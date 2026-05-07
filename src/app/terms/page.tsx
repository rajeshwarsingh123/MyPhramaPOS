import { LegalPageLayout } from '@/components/legal-page-layout'

export default function TermsOfService() {
  return (
    <LegalPageLayout title="Terms of Service" lastUpdated="May 7, 2026">
      <p>
        Welcome to PharmPOS. By accessing or using our SaaS platform, you agree to comply with 
        and be bound by the following Terms of Service. Please read them carefully.
      </p>

      <h2>1. Acceptance of Terms</h2>
      <p>
        By creating an account on PharmPOS, you acknowledge that you have read, understood, and 
        agree to be bound by these terms. These terms apply to all pharmacy owners, administrators, 
        and staff members who access the platform.
      </p>

      <h2>2. Description of Service</h2>
      <p>
        PharmPOS provides a cloud-based Pharmacy Management System, including features such as 
        billing, inventory management, expiry tracking, and reporting. The service is provided 
        on a subscription basis as detailed on our pricing page.
      </p>

      <h2>3. User Responsibilities</h2>
      <p>
        As a user of PharmPOS, you are responsible for:
      </p>
      <ul>
        <li>Maintaining the confidentiality of your login credentials.</li>
        <li>Ensuring the accuracy of all data entered into the system, including medicine prices and GST calculations.</li>
        <li>Complying with all local pharmacy laws and regulations regarding the sale of scheduled drugs.</li>
        <li>Ensuring that you have the legal right to operate a pharmacy in your jurisdiction.</li>
      </ul>

      <h2>4. Prohibited Uses</h2>
      <p>
        You agree not to:
      </p>
      <ul>
        <li>Use the platform for any illegal purpose or to sell prohibited substances.</li>
        <li>Attempt to reverse engineer, decompile, or disrupt the platform&apos;s security.</li>
        <li>Use automated scripts to scrape data from the platform.</li>
        <li>Share your account access with unauthorized third parties.</li>
      </ul>

      <h2>5. Subscription & Payments</h2>
      <p>
        Subscription fees are billed on an annual basis. Access to certain features is gated by 
        your subscription status. Failure to renew your subscription may result in limited access 
        to data or suspension of billing capabilities.
      </p>

      <h2>6. Medical Disclaimer</h2>
      <p>
        <strong>PharmPOS is a management tool, not a medical advisor.</strong> While our platform 
        helps track inventory and expiry, the ultimate responsibility for dispensing the correct 
        medication and verifying expiry dates lies with the registered pharmacist. PharmPOS is 
        not liable for any errors in dispensing or medical advice.
      </p>

      <h2>7. Limitation of Liability</h2>
      <p>
        To the maximum extent permitted by law, PharmPOS shall not be liable for any indirect, 
        incidental, or consequential damages arising from the use of our platform, including 
        loss of business profits or data.
      </p>

      <h2>8. Termination of Service</h2>
      <p>
        We reserve the right to suspend or terminate your account if you violate these terms 
        or if your actions pose a security risk to our platform.
      </p>

      <h2>9. Governing Law</h2>
      <p>
        These terms shall be governed by and construed in accordance with the laws of India. 
        Any disputes arising under these terms shall be subject to the exclusive jurisdiction 
        of the courts in Mumbai, Maharashtra.
      </p>
    </LegalPageLayout>
  )
}
