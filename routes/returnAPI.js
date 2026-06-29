// jewellery-backend/routes/returnAPI.js

const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');

// ✅ 1. SPECIFIC ROUTES FIRST (Before dynamic routes)

// Get return stats
router.get('/stats', async (req, res) => {
  try {
    const db = admin.firestore();
    const snapshot = await db.collection('returns').get();
    
    const returns = [];
    snapshot.forEach(doc => {
      returns.push(doc.data());
    });
    
    const stats = {
      total: returns.length,
      pending: returns.filter(r => r.status === 'pending').length,
      approved: returns.filter(r => r.status === 'approved').length,
      pickupScheduled: returns.filter(r => r.status === 'pickup_scheduled').length,
      pickedUp: returns.filter(r => r.status === 'picked_up').length,
      refundProcessed: returns.filter(r => r.status === 'refund_processed').length,
      rejected: returns.filter(r => r.status === 'rejected').length,
      autoApproved: returns.filter(r => r.autoApproved === true).length
    };
    
    res.json({ success: true, stats });
  } catch (error) {
    console.error('❌ Stats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all returns
router.get('/all', async (req, res) => {
  try {
    const db = admin.firestore();
    const snapshot = await db.collection('returns').orderBy('createdAt', 'desc').get();
    
    const returns = [];
    snapshot.forEach(doc => {
      returns.push({ id: doc.id, ...doc.data() });
    });
    
    res.json({ success: true, returns });
  } catch (error) {
    console.error('❌ Get all returns error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get user returns
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const db = admin.firestore();
    const snapshot = await db.collection('returns')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    
    const returns = [];
    snapshot.forEach(doc => {
      returns.push({ id: doc.id, ...doc.data() });
    });
    
    res.json({ success: true, returns });
  } catch (error) {
    console.error('❌ User returns error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get order return status
router.get('/order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const db = admin.firestore();
    const snapshot = await db.collection('returns')
      .where('orderId', '==', orderId)
      .get();
    
    if (snapshot.empty) {
      return res.json({ 
        success: true, 
        returnRequested: false,
        message: 'No return found for this order'
      });
    }
    
    const returns = [];
    snapshot.forEach(doc => {
      returns.push({ id: doc.id, ...doc.data() });
    });
    
    res.json({ 
      success: true, 
      returnRequested: true,
      returns
    });
  } catch (error) {
    console.error('❌ Order return error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:returnId', async (req, res) => {
  try {
    const { returnId } = req.params;
    
    // Check if it's a valid return ID
    if (!returnId || returnId.length < 5) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid return ID' 
      });
    }
    
    const db = admin.firestore();
    const docRef = db.collection('returns').doc(returnId);
    const docSnap = await docRef.get();
    
    // ✅ FIX: Check exists properly
    if (!docSnap.exists) {
      return res.status(404).json({ 
        success: false, 
        error: 'Return not found' 
      });
    }
    
    res.json({ 
      success: true, 
      return: { id: docSnap.id, ...docSnap.data() } 
    });
  } catch (error) {
    console.error('❌ Get return by ID error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Approve return
router.put('/approve', async (req, res) => {
  try {
    const { returnId, adminNotes } = req.body;
    
    if (!returnId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Return ID is required' 
      });
    }
    
    const db = admin.firestore();
    const returnRef = db.collection('returns').doc(returnId);
    const returnSnap = await returnRef.get();
    
    if (!returnSnap.exists()) {
      return res.status(404).json({ 
        success: false, 
        error: 'Return not found' 
      });
    }
    
    const returnData = returnSnap.data();
    
    if (returnData.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        error: `Return cannot be approved in status: ${returnData.status}` 
      });
    }
    
    await returnRef.update({
      status: 'approved',
      approvedAt: admin.firestore.FieldValue.serverTimestamp(),
      adminNotes: adminNotes || 'Approved by admin',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Update order
    if (returnData.orderId) {
      await db.collection('orders').doc(returnData.orderId).update({
        returnStatus: 'approved',
        returnApprovedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      await db.collection('adminorders').doc(returnData.orderId).update({
        returnStatus: 'approved',
        returnApprovedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    
    res.json({ 
      success: true, 
      status: 'approved',
      message: 'Return approved successfully'
    });
  } catch (error) {
    console.error('❌ Approve return error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Reject return
router.put('/reject', async (req, res) => {
  try {
    const { returnId, reason } = req.body;
    
    if (!returnId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Return ID is required' 
      });
    }
    
    const db = admin.firestore();
    const returnRef = db.collection('returns').doc(returnId);
    const returnSnap = await returnRef.get();
    
    if (!returnSnap.exists()) {
      return res.status(404).json({ 
        success: false, 
        error: 'Return not found' 
      });
    }
    
    const returnData = returnSnap.data();
    
    await returnRef.update({
      status: 'rejected',
      rejectedAt: admin.firestore.FieldValue.serverTimestamp(),
      rejectReason: reason || 'Rejected by admin',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Update order
    if (returnData.orderId) {
      await db.collection('orders').doc(returnData.orderId).update({
        returnStatus: 'rejected',
        returnRejectedAt: admin.firestore.FieldValue.serverTimestamp(),
        returnRejectReason: reason,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      await db.collection('adminorders').doc(returnData.orderId).update({
        returnStatus: 'rejected',
        returnRejectedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    
    res.json({ 
      success: true, 
      status: 'rejected',
      message: 'Return rejected'
    });
  } catch (error) {
    console.error('❌ Reject return error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Delete return
router.delete('/:returnId', async (req, res) => {
  try {
    const { returnId } = req.params;
    
    const db = admin.firestore();
    const returnRef = db.collection('returns').doc(returnId);
    const returnSnap = await returnRef.get();
    
    if (!returnSnap.exists()) {
      return res.status(404).json({ 
        success: false, 
        error: 'Return not found' 
      });
    }
    
    const returnData = returnSnap.data();
    
    await returnRef.delete();
    
    // Update order
    if (returnData.orderId) {
      await db.collection('orders').doc(returnData.orderId).update({
        returnRequested: false,
        returnStatus: null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      await db.collection('adminorders').doc(returnData.orderId).update({
        returnStatus: null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Return deleted successfully' 
    });
  } catch (error) {
    console.error('❌ Delete return error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;