const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router();

// ✅ Gmail SMTP কনফিগারেশন - Render এর জন্য অপটিমাইজড
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // SSL ব্যবহার করুন (port 465)
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  // ✅ Render এর জন্য টাইমআউট বাড়ানো
  connectionTimeout: 30000,  // 30 সেকেন্ড
  greetingTimeout: 30000,
  socketTimeout: 30000,
  // ✅ TLS কনফিগারেশন
  tls: {
    rejectUnauthorized: false,
    minVersion: 'TLSv1.2'
  },
  // ✅ Pooling - বেশি ইমেইলের জন্য
  pool: true,
  maxConnections: 5,
  maxMessages: 100
});

// ============================================
// ✅ ইমেইল সেন্ড এন্ডপয়েন্ট (FIXED)
// ============================================
router.post('/send', async (req, res) => {
  try {
    const { to, subject, html, from } = req.body;
    
    // ✅ ভ্যালিডেশন
    if (!to || !subject || !html) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: to, subject, or html' 
      });
    }

    // ✅ ইমেইল ফরম্যাট চেক
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid email format' 
      });
    }

    console.log('📧 Sending email to:', to);

    // ✅ ইমেইল সেন্ড
    const mailOptions = {
      from: from || `"AA Jewellery" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: subject,
      html: html,
      // ✅ Gmail এর জন্য গুরুত্বপূর্ণ হেডার
      headers: {
        'X-Entity-Ref-ID': `order-${Date.now()}`
      }
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Email sent successfully! Message ID:', info.messageId);
    
    res.json({ 
      success: true, 
      messageId: info.messageId,
      message: 'Email sent successfully'
    });

  } catch (error) {
    console.error('❌ Email send error:', error.message);
    
    // ✅ ডিটেইলড এরর মেসেজ
    let errorMessage = error.message;
    let statusCode = 500;
    
    if (error.code === 'EAUTH') {
      errorMessage = 'Gmail authentication failed. Please check EMAIL_USER and EMAIL_PASS.';
      statusCode = 401;
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKET') {
      errorMessage = 'Connection timeout. Please check internet connection or try again.';
      statusCode = 504;
    } else if (error.code === 'ECONNECTION') {
      errorMessage = 'Cannot connect to Gmail server. Please try again later.';
      statusCode = 503;
    } else if (error.code === 'EENVELOPE') {
      errorMessage = 'Invalid email format or recipient address.';
      statusCode = 400;
    }

    res.status(statusCode).json({ 
      success: false, 
      error: errorMessage,
      code: error.code || 'UNKNOWN'
    });
  }
});

// ============================================
// ✅ টেস্ট এন্ডপয়েন্ট
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
      subject: '🔧 Email Configuration Test',
      html: `
        <h1>✅ Email Configuration Test</h1>
        <p>If you see this email, your email configuration is working perfectly!</p>
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
      error: error.message
    });
  }
});

module.exports = router;
