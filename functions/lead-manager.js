// WhatsApp Bot Automation System - Lead Manager
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

class LeadManager {
  constructor() {
    this.db = admin.firestore();
  }

  // Save a new lead
  async saveLead(clientId, leadData) {
    try {
      // Validate required fields
      if (!leadData.name || !leadData.phone) {
        throw new Error('Name and phone are required for lead data');
      }

      // Add timestamp
      leadData.timestamp = admin.firestore.FieldValue.serverTimestamp();
      
      // Save lead to database
      const leadRef = await this.db.collection('clients').doc(clientId).collection('leads').add(leadData);
      
      // Send email notification
      await this.sendLeadNotification(clientId, leadData);
      
      return {
        leadId: leadRef.id,
        message: 'Lead saved successfully'
      };
    } catch (error) {
      console.error('Error saving lead:', error);
      throw error;
    }
  }

  // Get lead by ID
  async getLead(clientId, leadId) {
    try {
      const leadDoc = await this.db.collection('clients').doc(clientId).collection('leads').doc(leadId).get();
      
      if (!leadDoc.exists) {
        throw new Error(`Lead with ID ${leadId} not found for client ${clientId}`);
      }
      
      return {
        leadId: leadDoc.id,
        ...leadDoc.data()
      };
    } catch (error) {
      console.error('Error getting lead:', error);
      throw error;
    }
  }

  // List leads for a client with filtering and pagination
  async listLeads(clientId, options = {}) {
    try {
      const {
        limit = 50,
        startAfter = null,
        orderBy = 'timestamp',
        orderDirection = 'desc',
        filterField = null,
        filterValue = null,
        startDate = null,
        endDate = null
      } = options;
      
      // Start building query
      let query = this.db.collection('clients').doc(clientId).collection('leads');
      
      // Apply ordering
      query = query.orderBy(orderBy, orderDirection);
      
      // Apply field filter if provided
      if (filterField && filterValue !== null) {
        query = query.where(filterField, '==', filterValue);
      }
      
      // Apply date range filter if provided
      if (startDate) {
        const startTimestamp = admin.firestore.Timestamp.fromDate(new Date(startDate));
        query = query.where('timestamp', '>=', startTimestamp);
      }
      
      if (endDate) {
        const endTimestamp = admin.firestore.Timestamp.fromDate(new Date(endDate));
        query = query.where('timestamp', '<=', endTimestamp);
      }
      
      // Apply pagination
      if (startAfter) {
        const startAfterDoc = await this.db.collection('clients').doc(clientId).collection('leads').doc(startAfter).get();
        if (startAfterDoc.exists) {
          query = query.startAfter(startAfterDoc);
        }
      }
      
      // Apply limit
      query = query.limit(limit);
      
      // Execute query
      const snapshot = await query.get();
      
      // Process results
      const leads = [];
      let lastDoc = null;
      
      snapshot.forEach(doc => {
        leads.push({
          leadId: doc.id,
          ...doc.data()
        });
        lastDoc = doc;
      });
      
      return {
        leads,
        lastDoc: lastDoc ? lastDoc.id : null,
        hasMore: leads.length === limit
      };
    } catch (error) {
      console.error('Error listing leads:', error);
      throw error;
    }
  }

  // Get lead statistics for a client
  async getLeadStats(clientId, period = '30d') {
    try {
      // Calculate start date based on period
      const now = new Date();
      let startDate = new Date();
      
      switch (period) {
        case '7d':
          startDate.setDate(now.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(now.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(now.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
        default:
          startDate.setDate(now.getDate() - 30); // Default to 30 days
      }
      
      const startTimestamp = admin.firestore.Timestamp.fromDate(startDate);
      
      // Get all leads in the period
      const snapshot = await this.db.collection('clients').doc(clientId)
        .collection('leads')
        .where('timestamp', '>=', startTimestamp)
        .get();
      
      // Initialize statistics
      const stats = {
        totalLeads: 0,
        byFlow: {},
        byDate: {},
        conversionRate: 0
      };
      
      // Process leads
      snapshot.forEach(doc => {
        const lead = doc.data();
        stats.totalLeads++;
        
        // Count by flow
        if (lead.flowId) {
          stats.byFlow[lead.flowId] = (stats.byFlow[lead.flowId] || 0) + 1;
        }
        
        // Count by date
        if (lead.timestamp) {
          const date = lead.timestamp.toDate().toISOString().split('T')[0];
          stats.byDate[date] = (stats.byDate[date] || 0) + 1;
        }
      });
      
      // Get total conversations for conversion rate
      const conversationsSnapshot = await this.db.collection('conversations')
        .where('clientId', '==', clientId)
        .where('createdAt', '>=', startTimestamp)
        .get();
      
      const totalConversations = conversationsSnapshot.size;
      
      if (totalConversations > 0) {
        stats.conversionRate = (stats.totalLeads / totalConversations) * 100;
      }
      
      return stats;
    } catch (error) {
      console.error('Error getting lead statistics:', error);
      throw error;
    }
  }

  // Send email notification for new lead
  async sendLeadNotification(clientId, leadData) {
    try {
      // Get client data
      const clientDoc = await this.db.collection('clients').doc(clientId).get();
      
      if (!clientDoc.exists) {
        throw new Error(`Client with ID ${clientId} not found`);
      }
      
      const clientData = clientDoc.data();
      
      // Check if client has email configured
      if (!clientData.email) {
        console.log(`No email configured for client ${clientId}, skipping notification`);
        return false;
      }
      
      // Get email configuration
      const emailConfig = await this.getEmailConfig();
      
      if (!emailConfig) {
        console.error('Email configuration not found');
        return false;
      }
      
      // Create email transporter
      const transporter = nodemailer.createTransport({
        service: emailConfig.service,
        auth: {
          user: emailConfig.email,
          pass: emailConfig.password
        }
      });
      
      // Prepare conversation transcript
      let transcript = '';
      if (leadData.conversation && Array.isArray(leadData.conversation)) {
        transcript = leadData.conversation.map(item => {
          return `${item.role === 'bot' ? 'בוט' : 'לקוח'}: ${item.text}`;
        }).join('\n');
      }
      
      // Prepare email content
      const mailOptions = {
        from: emailConfig.email,
        to: clientData.email,
        subject: `ליד חדש מהבוט של ${clientData.businessName}`,
        text: `
שם: ${leadData.name}
טלפון: ${leadData.phone}
תאריך: ${new Date().toLocaleString('he-IL')}

תסריט השיחה:
${transcript}
        `,
        html: `
<div dir="rtl">
  <h2>ליד חדש מהבוט של ${clientData.businessName}</h2>
  <p><strong>שם:</strong> ${leadData.name}</p>
  <p><strong>טלפון:</strong> ${leadData.phone}</p>
  <p><strong>תאריך:</strong> ${new Date().toLocaleString('he-IL')}</p>
  
  <h3>תסריט השיחה:</h3>
  <pre>${transcript}</pre>
</div>
        `
      };
      
      // Send email
      const info = await transporter.sendMail(mailOptions);
      console.log('Lead notification email sent:', info.messageId);
      
      // Update lead with notification status
      await this.db.collection('clients').doc(clientId).collection('leads').doc(leadData.leadId).update({
        notificationSent: true,
        notificationId: info.messageId,
        notificationTimestamp: admin.firestore.FieldValue.serverTimestamp()
      });
      
      return true;
    } catch (error) {
      console.error('Error sending lead notification:', error);
      return false;
    }
  }

  // Get email configuration from Firebase
  async getEmailConfig() {
    try {
      const configDoc = await this.db.collection('system').doc('email_config').get();
      
      if (!configDoc.exists) {
        return null;
      }
      
      return configDoc.data();
    } catch (error) {
      console.error('Error getting email configuration:', error);
      return null;
    }
  }

  // Set email configuration
  async setEmailConfig(config) {
    try {
      // Validate required fields
      if (!config.email || !config.password || !config.service) {
        throw new Error('Email, password, and service are required for email configuration');
      }
      
      // Save configuration
      await this.db.collection('system').doc('email_config').set({
        email: config.email,
        password: config.password,
        service: config.service,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      return {
        message: 'Email configuration saved successfully'
      };
    } catch (error) {
      console.error('Error setting email configuration:', error);
      throw error;
    }
  }

  // Export leads to CSV
  async exportLeadsToCsv(clientId, options = {}) {
    try {
      // Get leads
      const result = await this.listLeads(clientId, {
        ...options,
        limit: 1000 // Increase limit for export
      });
      
      if (result.leads.length === 0) {
        return {
          csv: 'No leads found',
          count: 0
        };
      }
      
      // Get client data for field names
      const clientDoc = await this.db.collection('clients').doc(clientId).get();
      const clientData = clientDoc.exists ? clientDoc.data() : { businessName: 'Unknown' };
      
      // Create CSV header
      let csv = 'שם,טלפון,תאריך,תסריט שיחה\n';
      
      // Add leads to CSV
      result.leads.forEach(lead => {
        // Format date
        const date = lead.timestamp ? lead.timestamp.toDate().toLocaleString('he-IL') : '';
        
        // Format conversation
        let conversation = '';
        if (lead.conversation && Array.isArray(lead.conversation)) {
          conversation = lead.conversation.map(item => {
            return `${item.role === 'bot' ? 'בוט' : 'לקוח'}: ${item.text}`;
          }).join(' | ');
        }
        
        // Escape fields for CSV
        const escapeCsv = (field) => {
          if (field === null || field === undefined) return '';
          return `"${String(field).replace(/"/g, '""')}"`;
        };
        
        // Add lead to CSV
        csv += `${escapeCsv(lead.name)},${escapeCsv(lead.phone)},${escapeCsv(date)},${escapeCsv(conversation)}\n`;
      });
      
      return {
        csv,
        count: result.leads.length,
        businessName: clientData.businessName
      };
    } catch (error) {
      console.error('Error exporting leads to CSV:', error);
      throw error;
    }
  }
}

module.exports = LeadManager;
