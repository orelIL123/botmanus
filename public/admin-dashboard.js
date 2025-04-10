// WhatsApp Bot Automation System - Admin Dashboard API
const express = require('express');
const admin = require('firebase-admin');
const LeadManager = require('./lead-manager');
const ClientManager = require('./client-manager');

// Initialize managers
const leadManager = new LeadManager();
const clientManager = new ClientManager();

// Create router
const router = express.Router();

// Middleware to check authentication
const checkAuth = async (req, res, next) => {
  try {
    const idToken = req.headers.authorization;
    if (!idToken) {
      return res.status(401).json({ error: 'Unauthorized - No token provided' });
    }

    // Verify token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Error verifying auth token:', error);
    return res.status(401).json({ error: 'Unauthorized - Invalid token' });
  }
};

// Apply auth middleware to all routes
router.use(checkAuth);

// Dashboard overview
router.get('/overview', async (req, res) => {
  try {
    // Get all clients
    const clients = await clientManager.listClients();
    
    // Get lead stats for each client
    const clientStats = [];
    for (const client of clients) {
      const stats = await leadManager.getLeadStats(client.clientId, '30d');
      clientStats.push({
        clientId: client.clientId,
        businessName: client.businessName,
        stats
      });
    }
    
    // Calculate total stats
    const totalStats = {
      totalClients: clients.length,
      totalLeads: clientStats.reduce((sum, client) => sum + client.stats.totalLeads, 0),
      averageConversionRate: clientStats.length > 0 
        ? clientStats.reduce((sum, client) => sum + client.stats.conversionRate, 0) / clientStats.length 
        : 0
    };
    
    return res.status(200).json({
      totalStats,
      clientStats
    });
  } catch (error) {
    console.error('Error getting dashboard overview:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Get leads for a client
router.get('/clients/:clientId/leads', async (req, res) => {
  try {
    const clientId = req.params.clientId;
    
    // Parse query parameters
    const options = {
      limit: req.query.limit ? parseInt(req.query.limit) : 50,
      startAfter: req.query.startAfter || null,
      orderBy: req.query.orderBy || 'timestamp',
      orderDirection: req.query.orderDirection || 'desc',
      filterField: req.query.filterField || null,
      filterValue: req.query.filterValue || null,
      startDate: req.query.startDate || null,
      endDate: req.query.endDate || null
    };
    
    const result = await leadManager.listLeads(clientId, options);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error getting leads:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Get lead statistics for a client
router.get('/clients/:clientId/lead-stats', async (req, res) => {
  try {
    const clientId = req.params.clientId;
    const period = req.query.period || '30d';
    
    const stats = await leadManager.getLeadStats(clientId, period);
    return res.status(200).json(stats);
  } catch (error) {
    console.error('Error getting lead statistics:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Export leads to CSV
router.get('/clients/:clientId/export-leads', async (req, res) => {
  try {
    const clientId = req.params.clientId;
    
    // Parse query parameters
    const options = {
      filterField: req.query.filterField || null,
      filterValue: req.query.filterValue || null,
      startDate: req.query.startDate || null,
      endDate: req.query.endDate || null
    };
    
    const result = await leadManager.exportLeadsToCsv(clientId, options);
    
    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="leads_${clientId}_${new Date().toISOString().split('T')[0]}.csv"`);
    
    return res.status(200).send(result.csv);
  } catch (error) {
    console.error('Error exporting leads:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Configure email notifications
router.post('/email-config', async (req, res) => {
  try {
    const config = req.body;
    
    // Validate required fields
    if (!config.email || !config.password || !config.service) {
      return res.status(400).json({ error: 'Email, password, and service are required' });
    }
    
    const result = await leadManager.setEmailConfig(config);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error configuring email:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Test email notification
router.post('/test-email', async (req, res) => {
  try {
    const { clientId, email } = req.body;
    
    if (!clientId || !email) {
      return res.status(400).json({ error: 'Client ID and email are required' });
    }
    
    // Create test lead data
    const testLead = {
      leadId: 'test_' + Date.now(),
      name: 'לקוח לדוגמה',
      phone: '0501234567',
      timestamp: admin.firestore.Timestamp.now(),
      conversation: [
        { role: 'bot', text: 'שלום! איך אוכל לעזור לך היום?' },
        { role: 'user', text: 'אני מעוניין במידע על המוצרים שלכם' },
        { role: 'bot', text: 'אשמח לספר לך על המוצרים שלנו. מה מעניין אותך במיוחד?' }
      ]
    };
    
    // Override client email for test
    const clientDoc = await admin.firestore().collection('clients').doc(clientId).get();
    const clientData = clientDoc.data();
    const originalEmail = clientData.email;
    
    // Update client with test email
    await admin.firestore().collection('clients').doc(clientId).update({
      email: email
    });
    
    // Send test notification
    const result = await leadManager.sendLeadNotification(clientId, testLead);
    
    // Restore original email
    await admin.firestore().collection('clients').doc(clientId).update({
      email: originalEmail
    });
    
    if (result) {
      return res.status(200).json({ message: 'Test email sent successfully' });
    } else {
      return res.status(500).json({ error: 'Failed to send test email' });
    }
  } catch (error) {
    console.error('Error sending test email:', error);
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
