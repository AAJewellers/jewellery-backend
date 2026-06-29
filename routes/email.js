// routes/email.js - HTML Support সহ
const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router();

// ✅ Gmail SMTP Configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  connectionTimeout: 60000,
  greetingTimeout: 60000,
  socketTimeout: 60000
});

// ✅ Transporter Verify
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Email transporter error:', error.message);
  } else {
    console.log('✅ Email transporter ready');
  }
});

// ============================================
// ✅ Send HTML Email (Full Template Support)
// ============================================
router.post('/send', async (req, res) => {
  const { to, subject, html, from } = req.body;
  
  if (!to || !subject || !html) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing required fields' 
    });
  }

  console.log('📧 HTML Email request:');
  console.log('  To:', to);
  console.log('  Subject:', subject);
  console.log('  HTML Length:', html.length);

  // ✅ Immediate Response
  res.status(200).json({ 
    success: true, 
    message: 'HTML email accepted for delivery',
    queued: true
  });

  // ✅ Background Send (HTML Email)
  setTimeout(async () => {
    try {
      const mailOptions = {
        from: from || `"AA Jewellery" <${process.env.EMAIL_USER}>`,
        to: to,
        subject: subject,
        html: html  // ✅ Full HTML Template
      };

      console.log('📤 Sending HTML email...');
      const info = await transporter.sendMail(mailOptions);
      console.log('✅ HTML Email sent successfully!');
      console.log('  Message ID:', info.messageId);
      console.log('  To:', to);
      
    } catch (error) {
      console.error('❌ HTML Email failed:');
      console.error('  To:', to);
      console.error('  Error:', error.message);
      console.error('  Code:', error.code || 'UNKNOWN');
    }
  }, 1000);
});

// ============================================
// ✅ Send Plain Text Email
// ============================================
router.post('/send-text', async (req, res) => {
  const { to, subject, text, from } = req.body;
  
  if (!to || !subject || !text) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing required fields' 
    });
  }

  res.status(200).json({ 
    success: true, 
    message: 'Text email accepted'
  });

  setTimeout(async () => {
    try {
      await transporter.sendMail({
        from: from || `"AA Jewellery" <${process.env.EMAIL_USER}>`,
        to: to,
        subject: subject,
        text: text
      });
      console.log('✅ Text email sent to:', to);
    } catch (error) {
      console.error('❌ Text email failed:', error.message);
    }
  }, 1000);
});

// ============================================
// ✅ Health Check
// ============================================
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'Email service running',
    emailUser: process.env.EMAIL_USER ? '✅ Set' : '❌ Not Set',
    supportsHTML: true,
    timestamp: new Date().toISOString()
  });
});

// ============================================
// ✅ Test Email
// ============================================
router.get('/test', async (req, res) => {
  try {
    const testEmail = process.env.TEST_EMAIL || process.env.EMAIL_USER;
    
    if (!testEmail) {
      return res.json({
        success: false,
        error: 'No test email configured'
      });
    }

    const htmlTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .header { background: linear-gradient(135deg, #ec4899, #8b5cf6); padding: 20px; color: white; text-align: center; border-radius: 10px; }
          .content { padding: 20px; background: #f9fafb; border-radius: 10px; margin-top: 20px; }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
          .btn { background: #ec4899; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>✨ AA Jewellery</h1>
          <p>HTML Email Test</p>
        </div>
        <div class="content">
          <h2>✅ HTML Email Working!</h2>
          <p>This is a <strong>test email</strong> with full HTML formatting.</p>
          <p>Time: ${new Date().toLocaleString()}</p>
          <p style="margin-top: 20px;">
            <a href="#" class="btn">Visit Our Store</a>
          </p>
        </div>
        <div class="footer">
          AA Jewellery - Premium Quality Jewellery
        </div>
      </body>
      </html>
    `;

    const info = await transporter.sendMail({
      from: `"AA Jewellery" <${process.env.EMAIL_USER}>`,
      to: testEmail,
      subject: '✅ HTML Email Test',
      html: htmlTemplate
    });

    res.json({
      success: true,
      message: 'HTML test email sent',
      messageId: info.messageId,
      to: testEmail
    });

  } catch (error) {
    console.error('❌ Test error:', error);
    res.json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
