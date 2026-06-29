const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

router.post('/send', async (req, res) => {
  try {
    const { to, subject, html, from } = req.body;
    
    if (!to || !subject || !html) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    
    const info = await transporter.sendMail({
      from: from || `"AA Jewellery" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: subject,
      html: html
    });
    
    res.json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error('❌ Email error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send bulk emails
router.post('/send-bulk', async (req, res) => {
  try {
    const { recipients, subject, html } = req.body;
    
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ success: false, error: 'Recipients array required' });
    }
    
    const results = [];
    for (const to of recipients) {
      try {
        const info = await transporter.sendMail({
          from: `"AA Jewellery" <${process.env.EMAIL_USER}>`,
          to: to,
          subject: subject,
          html: html
        });
        results.push({ to, success: true, messageId: info.messageId });
      } catch (error) {
        results.push({ to, success: false, error: error.message });
      }
    }
    
    res.json({ success: true, results });
  } catch (error) {
    console.error('❌ Bulk email error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;