const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router();

// ✅ ইমেইল ট্রান্সপোর্টার কনফিগারেশন (টাইমআউট সহ)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  // ✅ টাইমআউট কনফিগারেশন
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000,
  // ✅ TLS/SSL কনফিগারেশন
  tls: {
    rejectUnauthorized: false
  }
});

// ✅ ট্রান্সপোর্টার ভেরিফাই করুন (স্টার্টআপে)
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Email transporter error:', error);
  } else {
    console.log('✅ Email transporter ready to send emails');
  }
});

// ============================================
// ✅ সিঙ্গেল ইমেইল সেন্ড
// ============================================
router.post('/send', async (req, res) => {
  try {
    const { to, subject, html, from } = req.body;
    
    // ✅ ভ্যালিডেশন
    if (!to || !subject || !html) {
      console.error('❌ Missing fields:', { to: !!to, subject: !!subject, html: !!html });
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: to, subject, or html' 
      });
    }

    // ✅ ইমেইল ফরম্যাট চেক
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      console.error('❌ Invalid email format:', to);
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid email format' 
      });
    }

    console.log('📧 Sending email:');
    console.log('  To:', to);
    console.log('  Subject:', subject);
    console.log('  HTML Length:', html?.length || 0);
    console.log('  HTML Preview:', html?.substring(0, 100) + '...');

    // ✅ ইমেইল সেন্ড
    const mailOptions = {
      from: from || `"AA Jewellery" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: subject,
      html: html,
      // ✅ ট্র্যাকিং এর জন্য
      headers: {
        'X-Entity-Ref-ID': `order-${Date.now()}`
      }
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Email sent successfully!');
    console.log('  Message ID:', info.messageId);
    console.log('  Response:', info.response);
    
    res.json({ 
      success: true, 
      messageId: info.messageId,
      message: 'Email sent successfully'
    });

  } catch (error) {
    console.error('❌ Email send error:');
    console.error('  Message:', error.message);
    console.error('  Code:', error.code);
    console.error('  Response:', error.response);
    
    // ✅ ক্লায়েন্টকে ডিটেইলড এরর পাঠান
    let errorMessage = error.message;
    if (error.code === 'EAUTH') {
      errorMessage = 'Authentication failed. Please check EMAIL_USER and EMAIL_PASS.';
    } else if (error.code === 'ESOCKET') {
      errorMessage = 'Connection timeout. Please check internet connection.';
    } else if (error.code === 'ECONNECTION') {
      errorMessage = 'Cannot connect to email server. Please try again later.';
    }

    res.status(500).json({ 
      success: false, 
      error: errorMessage,
      code: error.code || 'UNKNOWN'
    });
  }
});

// ============================================
// ✅ বাল্ক ইমেইল সেন্ড
// ============================================
router.post('/send-bulk', async (req, res) => {
  try {
    const { recipients, subject, html } = req.body;
    
    // ✅ ভ্যালিডেশন
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Recipients array required' 
      });
    }

    if (!subject || !html) {
      return res.status(400).json({ 
        success: false, 
        error: 'Subject and html are required' 
      });
    }

    console.log(`📧 Sending bulk email to ${recipients.length} recipients`);
    
    const results = [];
    const errors = [];

    // ✅ প্রতিটি রেসিপিয়েন্টে ইমেইল সেন্ড
    for (const to of recipients) {
      try {
        // ✅ ইমেইল ফরম্যাট চেক
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(to)) {
          errors.push({ to, error: 'Invalid email format' });
          continue;
        }

        const info = await transporter.sendMail({
          from: `"AA Jewellery" <${process.env.EMAIL_USER}>`,
          to: to,
          subject: subject,
          html: html
        });
        
        results.push({ 
          to, 
          success: true, 
          messageId: info.messageId 
        });
        
        console.log(`  ✅ Sent to ${to}`);
      } catch (error) {
        console.error(`  ❌ Failed to send to ${to}:`, error.message);
        errors.push({ 
          to, 
          success: false, 
          error: error.message 
        });
      }
    }

    res.json({ 
      success: true, 
      results,
      errors,
      total: recipients.length,
      successful: results.length,
      failed: errors.length
    });

  } catch (error) {
    console.error('❌ Bulk email error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============================================
// ✅ টেস্ট ইমেইল এন্ডপয়েন্ট
// ============================================
router.get('/test', async (req, res) => {
  try {
    const testEmail = process.env.TEST_EMAIL || 'test@example.com';
    
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
