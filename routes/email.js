const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router();

// ✅ ALTERNATIVE: Use Gmail with 587 port (STARTTLS)
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,  // STARTTLS use করে
  secure: false, // STARTTLS এর জন্য false
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  // ✅ Timeout বাড়ানো
  connectionTimeout: 30000,
  greetingTimeout: 30000,
  socketTimeout: 30000,
  // ✅ TLS কনফিগারেশন
  tls: {
    rejectUnauthorized: false,
    minVersion: 'TLSv1.2'
  },
  // ✅ Pooling
  pool: true,
  maxConnections: 5,
  maxMessages: 100
});

// ✅ Transporter Verify (Startup)
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Email transporter error:', error.message);
    console.error('❌ Please check EMAIL_USER and EMAIL_PASS in .env');
  } else {
    console.log('✅ Email transporter ready to send emails');
  }
});

// ============================================
// ✅ HEALTH CHECK for Email
// ============================================
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Email service is running',
    emailUser: process.env.EMAIL_USER ? '✅ Set' : '❌ Not Set',
    timestamp: new Date().toISOString()
  });
});

// ============================================
// ✅ SIMPLE EMAIL SEND (WITHOUT WAITING FOR VERIFICATION)
// ============================================
router.post('/send', async (req, res) => {
  try {
    const { to, subject, html, from } = req.body;
    
    // ✅ Validation
    if (!to || !subject || !html) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: to, subject, or html' 
      });
    }

    // ✅ Email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid email format' 
      });
    }

    console.log('📧 Sending email to:', to);
    console.log('📧 Subject:', subject);

    // ✅ Mail Options
    const mailOptions = {
      from: from || `"AA Jewellery" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: subject,
      html: html,
      headers: {
        'X-Entity-Ref-ID': `order-${Date.now()}`
      }
    };

    // ✅ Send email with timeout
    const info = await Promise.race([
      transporter.sendMail(mailOptions),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Email send timeout after 25 seconds')), 25000)
      )
    ]);
    
    console.log('✅ Email sent! Message ID:', info.messageId);
    
    res.json({ 
      success: true, 
      messageId: info.messageId,
      message: 'Email sent successfully'
    });

  } catch (error) {
    console.error('❌ Email send error:', error.message);
    
    let errorMessage = error.message;
    let statusCode = 500;
    
    if (error.code === 'EAUTH') {
      errorMessage = 'Gmail authentication failed. Please use App Password.';
      statusCode = 401;
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKET') {
      errorMessage = 'Connection timeout. Using fallback to skip email.';
      statusCode = 504;
    } else if (error.code === 'ECONNECTION') {
      errorMessage = 'Cannot connect to Gmail.';
      statusCode = 503;
    } else if (error.message?.includes('timeout')) {
      errorMessage = 'Email send timeout.';
      statusCode = 504;
    }

    res.status(statusCode).json({ 
      success: false, 
      error: errorMessage,
      code: error.code || 'TIMEOUT'
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

    console.log('📧 Sending test email to:', testEmail);

    const info = await transporter.sendMail({
      from: `"AA Jewellery" <${process.env.EMAIL_USER}>`,
      to: testEmail,
      subject: '✅ Email Configuration Test',
      html: `
        <h1>✅ Email Configuration Test</h1>
        <p>If you see this email, your email configuration is working!</p>
        <p>Time: ${new Date().toLocaleString()}</p>
        <hr>
        <p><strong>AA Jewellery</strong></p>
      `
    });

    res.json({
      success: true,
      message: 'Test email sent successfully',
      messageId: info.messageId,
      to: testEmail
    });

  } catch (error) {
    console.error('❌ Test email error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code || 'UNKNOWN'
    });
  }
});

module.exports = router;
