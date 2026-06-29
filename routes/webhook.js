const express = require('express');
const crypto = require('crypto');
const router = express.Router();

// Razorpay webhook receiver
router.post('/razorpay', async (req, res) => {
  try {
    const webhookData = req.body;
    const signature = req.headers['x-razorpay-signature'];
    
    // Verify webhook signature
    if (process.env.RAZORPAY_WEBHOOK_SECRET) {
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
        .update(JSON.stringify(webhookData))
        .digest('hex');
      
      if (expectedSignature !== signature) {
        return res.status(401).json({ success: false, error: 'Invalid signature' });
      }
    }
    
    console.log('📡 Razorpay webhook received:', webhookData.event);
    
    // Process webhook - just log and forward
    const event = webhookData.event;
    const payload = webhookData.payload;
    
    let response = { success: true, event };
    
    if (event === 'payment.captured') {
      const payment = payload.payment.entity;
      console.log(`💰 Payment captured: ${payment.id} for order: ${payment.order_id}`);
      response = { success: true, event, paymentId: payment.id, orderId: payment.order_id };
    } else if (event === 'payment.failed') {
      const payment = payload.payment.entity;
      console.log(`❌ Payment failed: ${payment.id}`);
      response = { success: true, event, paymentId: payment.id };
    } else if (event === 'refund.processed') {
      const refund = payload.refund.entity;
      console.log(`🔄 Refund processed: ${refund.id}`);
      response = { success: true, event, refundId: refund.id };
    }
    
    res.json(response);
  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delhivery webhook receiver
router.post('/delhivery', async (req, res) => {
  try {
    const data = req.body;
    console.log('📡 Delhivery webhook received:', data);
    
    // Process status update
    if (data.status && data.awb) {
      console.log(`📦 Shipment ${data.awb} status: ${data.status}`);
    }
    
    res.json({ success: true, received: true });
  } catch (error) {
    console.error('❌ Delhivery webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test webhook
router.post('/test', async (req, res) => {
  console.log('🧪 Test webhook received:', req.body);
  res.json({ success: true, message: 'Test webhook working' });
});

module.exports = router;