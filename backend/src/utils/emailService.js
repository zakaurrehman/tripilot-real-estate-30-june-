// // backend/src/utils/emailService.js

// const sgMail = require('@sendgrid/mail');

// // Initialize SendGrid with API key if available
// if (process.env.SENDGRID_API_KEY) {
//   sgMail.setApiKey(process.env.SENDGRID_API_KEY);
// }

// class EmailService {
//   async sendEmail({ to, subject, html, text }) {
//     try {
//       // In development/demo mode, just log the email
//       if (process.env.NODE_ENV !== 'production' || !process.env.SENDGRID_API_KEY) {
//         console.log('Email mock sent:', {
//           to,
//           subject,
//           preview: text ? text.substring(0, 100) : html.substring(0, 100)
//         });
//         return { success: true, messageId: 'mock-' + Date.now() };
//       }

//       // Production email sending
//       const msg = {
//         to,
//         from: process.env.SENDGRID_FROM_EMAIL || 'noreply@tripilot.com',
//         subject,
//         text: text || this.stripHtml(html),
//         html
//       };

//       const result = await sgMail.send(msg);
//       return { success: true, messageId: result[0].headers['x-message-id'] };
//     } catch (error) {
//       console.error('Email send error:', error);
//       throw error;
//     }
//   }

//   stripHtml(html) {
//     // Simple HTML stripping for text version
//     return html
//       .replace(/<[^>]*>/g, '')
//       .replace(/&nbsp;/g, ' ')
//       .replace(/&amp;/g, '&')
//       .replace(/&lt;/g, '<')
//       .replace(/&gt;/g, '>')
//       .replace(/&quot;/g, '"')
//       .trim();
//   }

//   async sendRFPEmail(contractor, rehabScope, startDate) {
//     const subject = 'Request for Proposal - Residential Renovation Project';
    
//     const workItemsList = rehabScope.items
//       .map(item => `- ${item.workType}: ${item.quantity} ${item.unit}`)
//       .join('\n');

//     const html = `
//       <h2>Request for Proposal</h2>
//       <p>Dear ${contractor.name},</p>
//       <p>We are seeking bids for a residential renovation project with the following scope:</p>
      
//       <h3>Project Details:</h3>
//       <ul>
//         <li><strong>Property Size:</strong> ${rehabScope.propertySize} sq ft</li>
//         <li><strong>Desired Start Date:</strong> ${new Date(startDate).toLocaleDateString()}</li>
//         <li><strong>Estimated Timeline:</strong> ${rehabScope.timeline} days</li>
//       </ul>

//       <h3>Scope of Work:</h3>
//       <pre>${workItemsList}</pre>

//       <h3>Budget Range:</h3>
//       <p>Total project budget: $${rehabScope.totalCost.toLocaleString()} (including contingency)</p>

//       <p>Please provide your detailed bid including:</p>
//       <ul>
//         <li>Line-item pricing for each work item</li>
//         <li>Proposed timeline and schedule</li>
//         <li>References from similar projects</li>
//         <li>Insurance and licensing information</li>
//       </ul>

//       <p>Please submit your proposal within 5 business days.</p>

//       <p>Best regards,<br>TriPilot Real Estate Team</p>
//     `;

//     return this.sendEmail({
//       to: contractor.email,
//       subject,
//       html
//     });
//   }

//   async sendInvoiceDisputeEmail(vendor, disputeDetails) {
//     const subject = `Invoice Dispute - ${disputeDetails.invoiceNumber}`;
    
//     const html = `
//       <h2>Invoice Dispute Notification</h2>
//       <p>Dear ${vendor.name},</p>
//       <p>We have identified discrepancies in invoice ${disputeDetails.invoiceNumber} that require resolution.</p>
      
//       <h3>Disputed Items:</h3>
//       <ul>
//         ${disputeDetails.items.map(item => `
//           <li>
//             <strong>${item.description}</strong><br>
//             PO Quantity: ${item.poQuantity} | Invoiced: ${item.invoicedQuantity}<br>
//             PO Price: $${item.poPrice} | Invoiced: $${item.invoicedPrice}
//           </li>
//         `).join('')}
//       </ul>

//       <h3>Total Disputed Amount:</h3>
//       <p><strong>$${disputeDetails.totalDisputed.toLocaleString()}</strong></p>

//       <p>Please review these discrepancies and provide corrected documentation within 3 business days.</p>

//       <p>Thank you for your prompt attention to this matter.</p>

//       <p>Best regards,<br>Accounts Payable Team</p>
//     `;

//     return this.sendEmail({
//       to: vendor.email,
//       subject,
//       html
//     });
//   }

//   async sendRenewalAlert(lease, contacts) {
//     const subject = `Lease Renewal Alert - ${lease.assetDescription}`;
    
//     const html = `
//       <h2>Upcoming Lease Renewal</h2>
//       <p>This is an automated reminder that the following lease is approaching its renewal date:</p>
      
//       <h3>Lease Details:</h3>
//       <ul>
//         <li><strong>Asset:</strong> ${lease.assetDescription}</li>
//         <li><strong>Lessor:</strong> ${lease.lessor}</li>
//         <li><strong>Current Term Ends:</strong> ${new Date(lease.endDate).toLocaleDateString()}</li>
//         <li><strong>Monthly Payment:</strong> $${lease.monthlyPayment.toLocaleString()}</li>
//         <li><strong>Buyout Option:</strong> ${lease.buyoutOption ? '$' + lease.buyoutOption.toLocaleString() : 'N/A'}</li>
//       </ul>

//       <h3>Action Required:</h3>
//       <p>Please review this lease and decide whether to:</p>
//       <ul>
//         <li>Renew the lease</li>
//         <li>Exercise buyout option (if available)</li>
//         <li>Return the equipment</li>
//       </ul>

//       <p>Contact the lessor at least 30 days before the term end date to avoid automatic renewal.</p>

//       <p>Best regards,<br>TriPilot Lease Management</p>
//     `;

//     // Send to all contacts
//     const results = await Promise.all(
//       contacts.map(email => this.sendEmail({ to: email, subject, html }))
//     );

//     return results;
//   }
// }

// module.exports = new EmailService();

// backend/src/utils/emailService.js

const nodemailer = require('nodemailer');

let transporter = null;
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

class EmailService {
  /**
   * Send a generic email.
   * In dev (or if no transporter), this just logs a mock send.
   */
  async sendEmail({ to, subject, html, text }) {
    // Dev or missing creds → mock
    if (
      process.env.NODE_ENV !== 'production' ||
      transporter === null
    ) {
      console.log('🟡 Email mock:', { to, subject, preview: (text || html).substring(0, 100) });
      return { success: true, messageId: 'mock-' + Date.now() };
    }

    // Real send
    const msg = {
      from: process.env.EMAIL_FROM || 'noreply@tripilot.com',
      to,
      subject,
      text: text || this.stripHtml(html),
      html,
    };

    const info = await transporter.sendMail(msg);
    return { success: true, messageId: info.messageId };
  }

  /**
   * Strip basic HTML tags for a text fallback.
   */
  stripHtml(html) {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }

  /**
   * Send an RFP email to a contractor.
   */
  async sendRFPEmail(contractor, rehabScope, startDate) {
    const subject = 'Request for Proposal - Residential Renovation Project';

    const workItemsList = rehabScope.items
      .map(item => `- ${item.workType}: ${item.quantity} ${item.unit}`)
      .join('\n');

    const html = `
      <h2>Request for Proposal</h2>
      <p>Dear ${contractor.name},</p>
      <p>We are seeking bids for a residential renovation project with the following scope:</p>
      <h3>Project Details:</h3>
      <ul>
        <li><strong>Property Size:</strong> ${rehabScope.propertySize} sq ft</li>
        <li><strong>Desired Start Date:</strong> ${new Date(startDate).toLocaleDateString()}</li>
        <li><strong>Estimated Timeline:</strong> ${rehabScope.timeline} days</li>
      </ul>
      <h3>Scope of Work:</h3>
      <pre>${workItemsList}</pre>
      <h3>Budget Range:</h3>
      <p>Total project budget: $${rehabScope.totalCost.toLocaleString()} (including contingency)</p>
      <p>Please provide your detailed bid including:</p>
      <ul>
        <li>Line-item pricing for each work item</li>
        <li>Proposed timeline and schedule</li>
        <li>References from similar projects</li>
        <li>Insurance and licensing information</li>
      </ul>
      <p>Please submit your proposal within 5 business days.</p>
      <p>Best regards,<br>TriPilot Real Estate Team</p>
    `;

    return this.sendEmail({
      to: contractor.email,
      subject,
      html,
    });
  }

  /**
   * Send an invoice dispute notification to a vendor.
   */
  async sendInvoiceDisputeEmail(vendor, disputeDetails) {
    const subject = `Invoice Dispute - ${disputeDetails.invoiceNumber}`;

    const html = `
      <h2>Invoice Dispute Notification</h2>
      <p>Dear ${vendor.name},</p>
      <p>We have identified discrepancies in invoice ${disputeDetails.invoiceNumber} that require resolution.</p>
      <h3>Disputed Items:</h3>
      <ul>
        ${disputeDetails.items.map(item => `
          <li>
            <strong>${item.description}</strong><br>
            PO Quantity: ${item.poQuantity} | Invoiced: ${item.invoicedQuantity}<br>
            PO Price: $${item.poPrice} | Invoiced: $${item.invoicedPrice}
          </li>
        `).join('')}
      </ul>
      <h3>Total Disputed Amount:</h3>
      <p><strong>$${disputeDetails.totalDisputed.toLocaleString()}</strong></p>
      <p>Please review these discrepancies and provide corrected documentation within 3 business days.</p>
      <p>Thank you for your prompt attention to this matter.</p>
      <p>Best regards,<br>Accounts Payable Team</p>
    `;

    return this.sendEmail({
      to: vendor.email,
      subject,
      html,
    });
  }

  /**
   * Send a lease renewal alert to multiple contacts.
   */
  async sendRenewalAlert(lease, contacts) {
    const subject = `Lease Renewal Alert - ${lease.assetDescription}`;

    const html = `
      <h2>Upcoming Lease Renewal</h2>
      <p>This is an automated reminder that the following lease is approaching its renewal date:</p>
      <h3>Lease Details:</h3>
      <ul>
        <li><strong>Asset:</strong> ${lease.assetDescription}</li>
        <li><strong>Lessor:</strong> ${lease.lessor}</li>
        <li><strong>Current Term Ends:</strong> ${new Date(lease.endDate).toLocaleDateString()}</li>
        <li><strong>Monthly Payment:</strong> $${lease.monthlyPayment.toLocaleString()}</li>
        <li><strong>Buyout Option:</strong> ${lease.buyoutOption ? '$' + lease.buyoutOption.toLocaleString() : 'N/A'}</li>
      </ul>
      <h3>Action Required:</h3>
      <ul>
        <li>Renew the lease</li>
        <li>Exercise buyout option (if available)</li>
        <li>Return the equipment</li>
      </ul>
      <p>Contact the lessor at least 30 days before the term end date to avoid automatic renewal.</p>
      <p>Best regards,<br>TriPilot Lease Management</p>
    `;

    // Send to all contacts in parallel
    const results = await Promise.all(
      contacts.map(email => this.sendEmail({ to: email, subject, html }))
    );

    return results;
  }
}

module.exports = new EmailService();
