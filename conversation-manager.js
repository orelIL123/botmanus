// WhatsApp Bot Automation System - Conversation Manager
const admin = require('firebase-admin');
const utils = require('./whatsapp-utils');

class ConversationManager {
  constructor() {
    this.db = admin.firestore();
  }

  // Initialize a new conversation
  async startConversation(clientId, userPhone) {
    try {
      // Get client configuration
      const clientDoc = await this.db.collection('clients').doc(clientId).get();
      if (!clientDoc.exists) {
        throw new Error(`Client with ID ${clientId} not found`);
      }

      const clientData = clientDoc.data();
      
      // Initialize WhatsApp session
      const session = await utils.initializeWhatsAppSession(clientId, userPhone);
      
      // Store conversation state in Firestore
      const conversationRef = await this.db.collection('conversations').add({
        clientId,
        userPhone,
        sessionId: session.sessionId,
        status: 'active',
        currentStep: 'welcome',
        leadInfo: {
          phone: userPhone
        },
        conversation: [
          {
            role: 'bot',
            text: clientData.welcomeMessage,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
          }
        ],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Send welcome message with initial options
      await utils.sendWhatsAppMessage(
        session.sessionId, 
        clientData.welcomeMessage,
        clientData.initialOptions
      );
      
      return {
        conversationId: conversationRef.id,
        sessionId: session.sessionId
      };
    } catch (error) {
      console.error('Error starting conversation:', error);
      throw error;
    }
  }
  
  // Process user message and advance conversation
  async processMessage(conversationId, userMessage) {
    try {
      // Get conversation state
      const conversationRef = this.db.collection('conversations').doc(conversationId);
      const conversationDoc = await conversationRef.get();
      
      if (!conversationDoc.exists) {
        throw new Error(`Conversation with ID ${conversationId} not found`);
      }
      
      const conversation = conversationDoc.data();
      
      // If conversation is ended, restart it
      if (conversation.status === 'ended') {
        return this.startConversation(conversation.clientId, conversation.userPhone);
      }
      
      // Add user message to conversation history
      await conversationRef.update({
        conversation: admin.firestore.FieldValue.arrayUnion({
          role: 'user',
          text: userMessage,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        }),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Process user response based on current step
      const result = await utils.processUserResponse(
        conversation.clientId,
        conversation.sessionId,
        userMessage,
        conversation.currentStep
      );
      
      // Handle different step types
      let response = '';
      let options = [];
      let nextStep = result.nextStep;
      let isEndStep = false;
      
      // Update lead information if this is a collect_info step
      if (conversation.currentStep.includes('collect_info') && nextStep) {
        // Parse user input for name and phone
        if (userMessage.includes(':')) {
          const parts = userMessage.split(':');
          if (parts.length === 2) {
            const field = parts[0].trim().toLowerCase();
            const value = parts[1].trim();
            
            if (field === 'שם' || field === 'name') {
              await conversationRef.update({
                'leadInfo.name': value
              });
            } else if (field === 'טלפון' || field === 'phone') {
              await conversationRef.update({
                'leadInfo.phone': value
              });
            }
          }
        }
      }
      
      // Handle the next step
      if (nextStep) {
        response = nextStep.message;
        
        // Replace placeholders in message
        if (response && conversation.leadInfo) {
          Object.keys(conversation.leadInfo).forEach(key => {
            response = response.replace(`{{${key}}}`, conversation.leadInfo[key] || '');
          });
        }
        
        // Get options if this is an options step
        if (nextStep.type === 'options' && nextStep.options) {
          options = nextStep.options.map(opt => opt.text);
        }
        
        // Check if this is an end step
        if (nextStep.type === 'end') {
          isEndStep = true;
        }
      } else {
        response = "מצטער, לא הצלחתי להבין את הבקשה. אנא נסה שוב או פנה לשירות לקוחות.";
      }
      
      // Send response to user
      await utils.sendWhatsAppMessage(conversation.sessionId, response, options);
      
      // Add bot response to conversation history
      await conversationRef.update({
        conversation: admin.firestore.FieldValue.arrayUnion({
          role: 'bot',
          text: response,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        }),
        currentStep: nextStep ? nextStep.id : conversation.currentStep,
        status: isEndStep ? 'ended' : 'active',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // If conversation ended, save lead information
      if (isEndStep && conversation.leadInfo && conversation.leadInfo.name && conversation.leadInfo.phone) {
        await utils.saveLeadInformation(conversation.clientId, {
          name: conversation.leadInfo.name,
          phone: conversation.leadInfo.phone,
          conversation: conversation.conversation,
          flowId: result.flowId
        });
      }
      
      return {
        response,
        options,
        isEnded: isEndStep
      };
    } catch (error) {
      console.error('Error processing message:', error);
      throw error;
    }
  }
}

module.exports = ConversationManager;
