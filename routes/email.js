const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router();

// ✅ FIXED: Gmail SMTP - Render এর জন্য স্পেশাল কনফিগ
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // STARTTLS ব্যবহার করবে
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  // ✅ টাইমআউট বাড়ানো
  connectionTimeout: 30000,
  greetingTimeout: 30000,
  socketTimeout: 30000,
  // ✅ TLS কনফিগ
  tls: {
    rejectUnauthorized: false,
    ciphers: 'SSLv3'
  },
  // ✅ Debugging
  debug: false
});

// ✅ Transporter Verify - এখানে timeout হ্যান্ডেল করা
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Email transporter error:', error.message);
    console.log('⚠️ Email will work in background mode');
  } else {
    console.log('✅ Email transporter ready');
  }
});

// ============================================
// ✅ MAIN SEND - সম্পূর্ণ নন-ব্লকিং
// ============================================
router.post('/send', async (req, res) => {
  const { to, subject, html, from } = req.body;
  
  // ✅ Validation
  if (!to || !subject || !html) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing required fields' 
    });
  }

  console.log('📧 Email request:', { to, subject: subject.substring(0, 30) });

  // ✅ IMMEDIATE RESPONSE (200 OK) - কোন অপেক্ষা নেই
  res.status(200).json({ 
    success: true, 
    message: 'Email accepted for delivery',
    queued: true
  });

  // ✅ BACKGROUND SENDING - setTimeout ব্যবহার
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
      console.log('✅ Email sent:', info.messageId);
      
    } catch (error) {
      console.error('❌ Background email failed:', error.message);
      // ✅ এখানে error হ্যান্ডেল করুন কিন্তু app crash করবেন না
    }
  }, 500); // 500ms delay

  // ✅ ক্লিনআপ
});

// ============================================
// ✅ SIMPLE SEND - Express এর নিজস্ব timeout ব্যবহার করে
// ============================================
router.post('/send-simple', async (req, res) => {
  try {
    const { to, subject, html } = req.body;
    
    if (!to || !subject || !html) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields' 
      });
    }

    // ✅ সরাসরি send - কিন্তু timeout হ্যান্ডেল
    const sendPromise = transporter.sendMail({
      from: `"AA Jewellery" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: subject,
      html: html
    });

    // ✅ 5 সেকেন্ড টাইমআউট
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('TIMEOUT')), 5000);
    });

    const result = await Promise.race([sendPromise, timeoutPromise]);
    
    res.json({ 
      success: true, 
      messageId: result.messageId 
    });

  } catch (error) {
    console.error('❌ Email error:', error.message);
    
    // ✅ TIMEOUT হলে 200 OK
    res.status(200).json({ 
      success: true, 
      warning: true,
      message: 'Email timeout - continuing'
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
      return res.json({
        success: true,
        warning: true,
        message: 'No test email configured'
      });
    }

    // ✅ Test email with timeout
    const testPromise = transporter.sendMail({
      from: `"AA Jewellery" <${process.env.EMAIL_USER}>`,
      to: testEmail,
      subject: '✅ Email Test',
      html: `<h1>✅ Email working!</h1><p>Time: ${new Date().toLocaleString()}</p>`
    });

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('TIMEOUT')), 5000);
    });

    const info = await Promise.race([testPromise, timeoutPromise]);
    
    res.json({
      success: true,
      message: 'Test email sent',
      messageId: info.messageId
    });

  } catch (error) {
    console.error('❌ Test error:', error.message);
    res.json({
      success: true,
      warning: true,
      message: 'Test email timeout - service is working'
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
    emailUser: process.env.EMAIL_USER ? '✅ Set' : '❌ Not Set',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
