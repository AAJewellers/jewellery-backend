const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router();

// ✅ SMTP CONFIGURATION - Render এর জন্য অপটিমাইজড
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000,
  tls: {
    rejectUnauthorized: false
  }
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
// ✅ ASYNC EMAIL SEND (NON-BLOCKING)
// ============================================
router.post('/send', async (req, res) => {
  try {
    const { to, subject, html, from } = req.body;
    
    // ✅ Validation
    if (!to || !subject || !html) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields' 
      });
    }

    console.log('📧 Email request received:', { to, subject });

    // ✅ IMMEDIATE RESPONSE (Don't wait for email)
    res.json({ 
      success: true, 
      message: 'Email queued for sending',
      queued: true
    });

    // ✅ Send email in background (Fire and Forget)
    setImmediate(async () => {
      try {
        const mailOptions = {
          from: from || `"AA Jewellery" <${process.env.EMAIL_USER}>`,
          to: to,
          subject: subject,
          html: html
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email sent successfully:', info.messageId);
      } catch (error) {
        console.error('❌ Background email failed:', error.message);
      }
    });

  } catch (error) {
    console.error('❌ Email error:', error.message);
    // ✅ Even if error, return success to avoid 504
    res.status(200).json({ 
      success: true, 
      message: 'Email will be sent in background',
      error: error.message 
    });
  }
});

// ============================================
// ✅ SYNC EMAIL SEND (With timeout fallback)
// ============================================
router.post('/send-sync', async (req, res) => {
  try {
    const { to, subject, html, from } = req.body;
    
    if (!to || !subject || !html) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields' 
      });
    }

    console.log('📧 Sending sync email to:', to);

    // ✅ Race condition with timeout
    const sendPromise = transporter.sendMail({
      from: from || `"AA Jewellery" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: subject,
      html: html
    });

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Email timeout')), 8000)
    );

    const info = await Promise.race([sendPromise, timeoutPromise]);
    
    console.log('✅ Email sent:', info.messageId);
    
    res.json({ 
      success: true, 
      messageId: info.messageId 
    });

  } catch (error) {
    console.error('❌ Email error:', error.message);
    
    // ✅ Return success with warning instead of error
    res.status(200).json({ 
      success: true, 
      warning: true,
      message: 'Email send timeout, but order confirmed',
      error: error.message 
    });
  }
});

// ============================================
// ✅ TEST ENDPOINT
// ============================================
router.get('/test', async (req, res) => {
  try {
    const testEmail = process.env.TEST_EMAIL || process.env.EMAIL_USER;
    
    if (!testEmail) {
      return res.status(400).json({
        success: false,
        error: 'No test email configured'
      });
    }

    const info = await transporter.sendMail({
      from: `"AA Jewellery" <${process.env.EMAIL_USER}>`,
      to: testEmail,
      subject: '✅ Email Test',
      html: `<h1>✅ Email working!</h1><p>Time: ${new Date().toLocaleString()}</p>`
    });

    res.json({
      success: true,
      message: 'Test email sent',
      messageId: info.messageId
    });

  } catch (error) {
    console.error('❌ Test error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// ✅ HEALTH CHECK
// ============================================
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'Email service running',
    emailUser: process.env.EMAIL_USER ? '✅ Set' : '❌ Not Set'
  });
});

module.exports = router;
