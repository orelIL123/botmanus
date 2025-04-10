// WhatsApp Bot Automation System - Client Manager
const admin = require('firebase-admin');

class ClientManager {
  constructor() {
    this.db = admin.firestore();
  }

  // Create a new client
  async createClient(clientData) {
    try {
      // Validate required fields
      if (!clientData.businessName || !clientData.whatsappNumber) {
        throw new Error('Business name and WhatsApp number are required');
      }

      // Generate client ID from business name if not provided
      if (!clientData.clientId) {
        clientData.clientId = clientData.businessName
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '_')
          .replace(/_+/g, '_')
          .replace(/^_|_$/g, '');
      }

      // Set default welcome message if not provided
      if (!clientData.welcomeMessage) {
        clientData.welcomeMessage = `שלום! אני הבוט החכם של ${clientData.businessName}. איך אוכל לעזור לך היום?`;
      }

      // Check if client already exists
      const clientDoc = await this.db.collection('clients').doc(clientData.clientId).get();
      if (clientDoc.exists) {
        throw new Error(`Client with ID ${clientData.clientId} already exists`);
      }

      // Create client document
      await this.db.collection('clients').doc(clientData.clientId).set({
        ...clientData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return {
        clientId: clientData.clientId,
        message: `Client ${clientData.businessName} created successfully`
      };
    } catch (error) {
      console.error('Error creating client:', error);
      throw error;
    }
  }

  // Update client information
  async updateClient(clientId, clientData) {
    try {
      // Check if client exists
      const clientDoc = await this.db.collection('clients').doc(clientId).get();
      if (!clientDoc.exists) {
        throw new Error(`Client with ID ${clientId} not found`);
      }

      // Update client document
      await this.db.collection('clients').doc(clientId).update({
        ...clientData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return {
        clientId,
        message: `Client ${clientId} updated successfully`
      };
    } catch (error) {
      console.error('Error updating client:', error);
      throw error;
    }
  }

  // Get client information
  async getClient(clientId) {
    console.log(`getClient called with clientId: [${clientId}]`);
    try {
      console.log(`Attempting to get document: clients/${clientId}`);
      const clientDoc = await this.db.collection('clients').doc(clientId).get();
      console.log(`Firestore get() result exists: ${clientDoc.exists}`);
      if (!clientDoc.exists) {
        throw new Error(`Client with ID ${clientId} not found in Firestore`);
      }

      return clientDoc.data();
    } catch (error) {
      console.error('Error getting client:', error);
      throw error;
    }
  }

  // List all clients
  async listClients() {
    try {
      const clientsSnapshot = await this.db.collection('clients').get();
      const clients = [];

      clientsSnapshot.forEach(doc => {
        clients.push({
          clientId: doc.id,
          ...doc.data()
        });
      });

      return clients;
    } catch (error) {
      console.error('Error listing clients:', error);
      throw error;
    }
  }

  // Create or update a flow for a client
  async saveFlow(clientId, flowData) {
    try {
      // Check if client exists
      const clientDoc = await this.db.collection('clients').doc(clientId).get();
      if (!clientDoc.exists) {
        throw new Error(`Client with ID ${clientId} not found`);
      }

      // Validate required fields
      if (!flowData.flowId || !flowData.name || !flowData.steps || !Array.isArray(flowData.steps)) {
        throw new Error('Flow ID, name, and steps array are required');
      }

      // Create or update flow document
      await this.db.collection('clients').doc(clientId).collection('flows').doc(flowData.flowId).set({
        ...flowData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return {
        clientId,
        flowId: flowData.flowId,
        message: `Flow ${flowData.name} saved successfully for client ${clientId}`
      };
    } catch (error) {
      console.error('Error saving flow:', error);
      throw error;
    }
  }

  // Get a specific flow for a client
  async getFlow(clientId, flowId) {
    try {
      const flowDoc = await this.db.collection('clients').doc(clientId).collection('flows').doc(flowId).get();
      if (!flowDoc.exists) {
        throw new Error(`Flow with ID ${flowId} not found for client ${clientId}`);
      }

      const flowData = flowDoc.data();
      if (!flowData.flowDefinition) {
        throw new Error(`Flow document ${flowId} for client ${clientId} does not contain a flowDefinition field.`);
      }

      // Parse the JSON string from the flowDefinition field
      return JSON.parse(flowData.flowDefinition);

    } catch (error) {
      console.error('Error getting flow:', error);
      // Add more specific error handling for JSON parsing errors if needed
      if (error instanceof SyntaxError) {
        console.error('Failed to parse flowDefinition JSON:', error.message);
        throw new Error(`Failed to parse flow definition for flow ${flowId}. Check the JSON format.`);
      } 
      throw error;
    }
  }

  // List all flows for a client
  async listFlows(clientId) {
    try {
      const flowsSnapshot = await this.db.collection('clients').doc(clientId).collection('flows').get();
      const flows = [];

      flowsSnapshot.forEach(doc => {
        flows.push({
          flowId: doc.id,
          ...doc.data()
        });
      });

      return flows;
    } catch (error) {
      console.error('Error listing flows:', error);
      throw error;
    }
  }

  // Get leads for a client
  async getLeads(clientId, limit = 100) {
    try {
      const leadsSnapshot = await this.db.collection('clients').doc(clientId).collection('leads')
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();
      
      const leads = [];

      leadsSnapshot.forEach(doc => {
        leads.push({
          leadId: doc.id,
          ...doc.data()
        });
      });

      return leads;
    } catch (error) {
      console.error('Error getting leads:', error);
      throw error;
    }
  }
}

module.exports = ClientManager;
