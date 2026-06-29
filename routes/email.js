const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router();

// ✅ Gmail SMTP - সিম্পল কনফিগারেশন
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  // টাইমআউট বাড়ানো
  connectionTimeout: 60000,
  greetingTimeout: 60000,
  socketTimeout: 60000
});

// ✅ ট্রান্সপোর্টার ভেরিফাই
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Email transporter error:', error.message);
  } else {
    console.log('✅ Email transporter ready');
  }
});

// ============================================
// ✅ সেন্ড ইমেইল - নন-ব্লকিং
// ============================================
router.post('/send', async (req, res) => {
  const { to, subject, html, from } = req.body;
  
  // ✅ ভ্যালিডেশন
  if (!to || !subject || !html) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing required fields' 
    });
  }

  console.log('📧 Email request:', { to, subject: subject?.substring(0, 30) });

  // ✅ ইমিডিয়েট রেসপন্স (২০০ OK)
  res.status(200).json({ 
    success: true, 
    message: 'Email accepted for delivery',
    queued: true
  });

  // ✅ ব্যাকগ্রাউন্ডে ইমেইল সেন্ড (Fire and Forget)
  setTimeout(async () => {
    try {
      const mailOptions = {
        from: from || `"AA Jewellery" <${process.env.EMAIL_USER}>`,
        to: to,
        subject: subject,
        html: html
      };

      console.log('📤 Sending email in background...');
      const info = await transporter.sendMail(mailOptions);
      console.log('✅ Email sent successfully!');
      console.log('  Message ID:', info.messageId);
      console.log('  To:', to);
      
    } catch (error) {
      console.error('❌ Background email failed:');
      console.error('  To:', to);
      console.error('  Error:', error.message);
      console.error('  Code:', error.code || 'UNKNOWN');
    }
  }, 500);
});

// ============================================
// ✅ হেলথ চেক
// ============================================
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'Email service running',
    emailUser: process.env.EMAIL_USER ? '✅ Set' : '❌ Not Set',
    timestamp: new Date().toISOString()
  });
});

// ============================================
// ✅ টেস্ট ইমেইল
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

    const info = await transporter.sendMail({
      from: `"AA Jewellery" <${process.env.EMAIL_USER}>`,
      to: testEmail,
      subject: '✅ Test Email from AA Jewellery',
      html: `
        <h1>✅ Email Working!</h1>
        <p>This is a test email from AA Jewellery backend.</p>
        <p>Time: ${new Date().toLocaleString()}</p>
        <hr>
        <p>Thank you for using our service!</p>
      `
    });

    res.json({
      success: true,
      message: 'Test email sent',
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
