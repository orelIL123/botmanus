const admin = require('firebase-admin');

// Initialize Firebase Admin FIRST
admin.initializeApp();

const functions = require('firebase-functions');
const express = require('express');
const cors = require('cors');
const ClientManager = require('./client-manager');
const ConversationManager = require('./conversation-manager');
const LeadManager = require('./lead-manager');
const adminDashboardRoutes = require('./admin-routes');
const whatsappUtils = require('./whatsapp-utils');

// Initialize Express app
const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Initialize managers
const clientManager = new ClientManager();
const conversationManager = new ConversationManager();
const leadManager = new LeadManager();

// Mount admin dashboard routes
app.use('/api/admin', adminDashboardRoutes);

// API Routes

// Client Management Routes
app.post('/api/clients', async (req, res) => {
  try {
    const result = await clientManager.createClient(req.body);
    return res.status(201).json(result);
  } catch (error) {
    console.error('Error creating client:', error);
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/clients', async (req, res) => {
  try {
    const clients = await clientManager.listClients();
    return res.status(200).json(clients);
  } catch (error) {
    console.error('Error listing clients:', error);
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/clients/:clientId', async (req, res) => {
  try {
    const client = await clientManager.getClient(req.params.clientId);
    return res.status(200).json(client);
  } catch (error) {
    console.error('Error getting client:', error);
    return res.status(500).json({ error: error.message });
  }
});

app.put('/api/clients/:clientId', async (req, res) => {
  try {
    const result = await clientManager.updateClient(req.params.clientId, req.body);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error updating client:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Flow Management Routes
app.post('/api/clients/:clientId/flows', async (req, res) => {
  try {
    const result = await clientManager.saveFlow(req.params.clientId, req.body);
    return res.status(201).json(result);
  } catch (error) {
    console.error('Error saving flow:', error);
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/clients/:clientId/flows', async (req, res) => {
  try {
    const flows = await clientManager.listFlows(req.params.clientId);
    return res.status(200).json(flows);
  } catch (error) {
    console.error('Error listing flows:', error);
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/clients/:clientId/flows/:flowId', async (req, res) => {
  try {
    const flow = await clientManager.getFlow(req.params.clientId, req.params.flowId);
    return res.status(200).json(flow);
  } catch (error) {
    console.error('Error getting flow:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Lead Management Routes
app.get('/api/clients/:clientId/leads', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 100;
    const leads = await clientManager.getLeads(req.params.clientId, limit);
    return res.status(200).json(leads);
  } catch (error) {
    console.error('Error getting leads:', error);
    return res.status(500).json({ error: error.message });
  }
});

// WhatsApp Integration Routes
app.post('/api/whatsapp/start', async (req, res) => {
  try {
    const { clientId, userPhone } = req.body;
    
    if (!clientId || !userPhone) {
      return res.status(400).json({ error: 'Client ID and user phone are required' });
    }
    
    const result = await conversationManager.startConversation(clientId, userPhone);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error starting WhatsApp conversation:', error);
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/whatsapp/message', async (req, res) => {
  try {
    const { conversationId, message } = req.body;
    
    if (!conversationId || !message) {
      return res.status(400).json({ error: 'Conversation ID and message are required' });
    }
    
    const result = await conversationManager.processMessage(conversationId, message);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error processing WhatsApp message:', error);
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/whatsapp/link/:clientId', async (req, res) => {
  try {
    const clientId = req.params.clientId;
    const client = await clientManager.getClient(clientId);
    
    if (!client.whatsappNumber) {
      return res.status(400).json({ error: 'Client does not have a WhatsApp number configured' });
    }
    
    const welcomeMessage = client.welcomeMessage || `שלום! אני הבוט החכם של ${client.businessName}. איך אוכל לעזור לך היום?`;
    const whatsappLink = whatsappUtils.generateWhatsAppLink(client.whatsappNumber, welcomeMessage);
    
    return res.status(200).json({ whatsappLink });
  } catch (error) {
    console.error('Error generating WhatsApp link:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Website Integration Routes
app.get('/api/integration/:clientId', async (req, res) => {
  try {
    const clientId = req.params.clientId;
    const client = await clientManager.getClient(clientId);
    
    // Generate integration code
    const integrationCode = `
<!-- WhatsApp Bot Integration for ${client.businessName} -->
<script>
(function() {
  // Create WhatsApp button
  var button = document.createElement('div');
  button.id = 'whatsapp-bot-button';
  button.innerHTML = '<img src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/WhatsApp.svg/512px-WhatsApp.svg.png" alt="WhatsApp">';
  button.style.position = 'fixed';
  button.style.bottom = '20px';
  button.style.right = '20px';
  button.style.width = '60px';
  button.style.height = '60px';
  button.style.borderRadius = '50%';
  button.style.backgroundColor = '#25D366';
  button.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
  button.style.cursor = 'pointer';
  button.style.zIndex = '9999';
  button.style.display = 'flex';
  button.style.alignItems = 'center';
  button.style.justifyContent = 'center';
  
  // Style for the WhatsApp icon
  button.querySelector('img').style.width = '35px';
  button.querySelector('img').style.height = '35px';
  
  // Add click event
  button.addEventListener('click', function() {
    window.open('${whatsappUtils.generateWhatsAppLink(client.whatsappNumber)}', '_blank');
  });
  
  // Add button to page
  document.body.appendChild(button);
})();
</script>
`;
    
    return res.status(200).json({ 
      clientId,
      businessName: client.businessName,
      integrationCode
    });
  } catch (error) {
    console.error('Error generating integration code:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Seed sample data (for development purposes)
app.post('/api/seed-sample-data', async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    // Read sample data
    const clientConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '../sample-data/client-config.json'), 'utf8'));
    
    // Create client
    await clientManager.createClient(clientConfig);
    
    // Read and create flows
    const flowFiles = [
      'new_collection_flow.json',
      'sale_flow.json',
      'sizes_flow.json',
      'return_flow.json',
      'store_hours_flow.json'
    ];
    
    for (const flowFile of flowFiles) {
      const flowData = JSON.parse(fs.readFileSync(path.join(__dirname, `../sample-data/flows/${flowFile}`), 'utf8'));
      await clientManager.saveFlow(clientConfig.clientId, flowData);
    }
    
    return res.status(200).json({ 
      message: 'Sample data seeded successfully',
      clientId: clientConfig.clientId
    });
  } catch (error) {
    console.error('Error seeding sample data:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Export the Express app as a Firebase Function
exports.app = functions.https.onRequest(app);

// Scheduled function to clean up old conversations (runs daily)
exports.cleanupOldConversations = functions.scheduler.schedule('every 24 hours').onRun(async (context) => {
  try {
    const db = admin.firestore();
    
    // Get conversations older than 30 days
    const thirtyDaysAgo = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );
    
    const oldConversationsSnapshot = await db.collection('conversations')
      .where('updatedAt', '<', thirtyDaysAgo)
      .get();
    
    if (oldConversationsSnapshot.empty) {
      console.log('No old conversations to clean up');
      return null;
    }
    
    // Delete old conversations in batches
    const batch = db.batch();
    let count = 0;
    
    oldConversationsSnapshot.forEach(doc => {
      batch.delete(doc.ref);
      count++;
    });
    
    await batch.commit();
    console.log(`Cleaned up ${count} old conversations`);
    
    return null;
  } catch (error) {
    console.error('Error cleaning up old conversations:', error);
    return null;
  }
});
