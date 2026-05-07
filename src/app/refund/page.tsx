import { LegalPageLayout } from '@/components/legal-page-layout'

export default function RefundPolicy() {
  return (
    <LegalPageLayout title="Refund Policy" lastUpdated="May 7, 2026">
      <p>
        At PharmPOS, we want to ensure that you are completely satisfied with our pharmacy 
        management solution. This policy outlines the terms for cancellations and refunds 
        regarding our subscription services.
      </p>

      <h2>1. Subscription Cancellation</h2>
      <p>
        You can cancel your PharmPOS subscription at any time through your Admin Settings 
        or by contacting our support team. Upon cancellation, you will continue to have 
        access to the service until the end of your current billing cycle. No further 
        automatic renewals will occur.
      </p>

      <h2>2. Refund Eligibility</h2>
      <p>
        We offer a <strong>7-day money-back guarantee</strong> for new annual subscriptions. 
        If you are not satisfied with the platform for any reason, you may request a 
        full refund within 7 days of your initial purchase.
      </p>
      <p>
        Please note:
      </p>
      <ul>
        <li>Refunds are only applicable to the first year of a new subscription.</li>
        <li>Renewal payments are non-refundable.</li>
        <li>Refunds are not provided for partial use of a billing cycle beyond the 7-day window.</li>
      </ul>

      <h2>3. Refund Process</h2>
      <p>
        To request a refund, please send an email to <strong>billing@pharmpos.com</strong> with 
        your pharmacy name and account email. Once your request is received:
      </p>
      <ul>
        <li>Our billing team will verify the purchase date and usage.</li>
        <li>Approved refunds will be processed within 5-7 business days.</li>
        <li>The refund will be credited back to the original payment method (Credit Card, UPI, or Net Banking).</li>
      </ul>

      <h2>4. Exceptional Circumstances</h2>
      <p>
        In the rare event of a prolonged system outage (exceeding 48 continuous hours) that 
        significantly disrupts your business operations, we may, at our discretion, provide 
        pro-rated credits or partial refunds as a gesture of goodwill.
      </p>

      <h2>5. Chargebacks</h2>
      <p>
        We encourage you to contact us directly for any billing issues. Initiating a chargeback 
        through your bank without first contacting us will result in immediate suspension 
        of your pharmacy account until the dispute is resolved.
      </p>

      <h2>6. Changes to this Policy</h2>
      <p>
        PharmPOS reserves the right to modify this Refund Policy at any time. Any changes 
        will be effective immediately upon posting to this page.
      </p>
    </LegalPageLayout>
  )
}
