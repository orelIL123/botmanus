// WhatsApp Bot Automation System - Backend Utilities
const axios = require('axios');
const admin = require('firebase-admin');

// Helper function to initialize WhatsApp session
async function initializeWhatsAppSession(clientId, userPhone) {
  try {
    // This is a placeholder for actual WhatsApp Business API integration
    // In a real implementation, this would connect to WhatsApp Business API
    console.log(`Initializing WhatsApp session for client ${clientId} with user ${userPhone}`);
    
    return {
      sessionId: `session_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      status: 'active'
    };
  } catch (error) {
    console.error('Error initializing WhatsApp session:', error);
    throw error;
  }
}

// Helper function to send WhatsApp message
async function sendWhatsAppMessage(sessionId, message, options = []) {
  try {
    // This is a placeholder for actual WhatsApp Business API integration
    // In a real implementation, this would send messages via WhatsApp Business API
    console.log(`Sending message to session ${sessionId}: ${message}`);
    
    if (options && options.length > 0) {
      console.log('With options:', options);
    }
    
    return {
      status: 'sent',
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    throw error;
  }
}

// Helper function to process user response
async function processUserResponse(clientId, sessionId, userResponse, currentStep) {
  try {
    const db = admin.firestore();
    
    // Get client flow
    const clientDoc = await db.collection('clients').doc(clientId).get();
    if (!clientDoc.exists) {
      throw new Error('Client not found');
    }
    
    const clientData = clientDoc.data();
    
    // Get current flow
    const flowsSnapshot = await db.collection('clients').doc(clientId).collection('flows').get();
    if (flowsSnapshot.empty) {
      throw new Error('No flows found for this client');
    }
    
    // Find the current flow and step
    let currentFlow = null;
    let nextStep = null;
    
    flowsSnapshot.forEach(doc => {
      const flow = doc.data();
      
      if (flow.steps) {
        const step = flow.steps.find(s => s.id === currentStep);
        
        if (step) {
          currentFlow = flow;
          
          // Determine next step based on user response
          if (step.type === 'options' && step.options) {
            const selectedOption = step.options.find(opt => opt.id === userResponse || opt.text === userResponse);
            if (selectedOption && selectedOption.next) {
              nextStep = flow.steps.find(s => s.id === selectedOption.next);
            }
          } else if (step.next) {
            nextStep = flow.steps.find(s => s.id === step.next);
          }
        }
      }
    });
    
    if (!nextStep) {
      throw new Error('Could not determine next step');
    }
    
    return {
      flowId: currentFlow.flowId,
      nextStep: nextStep,
      clientData: clientData
    };
  } catch (error) {
    console.error('Error processing user response:', error);
    throw error;
  }
}

// Helper function to save lead information
async function saveLeadInformation(clientId, leadData) {
  try {
    const db = admin.firestore();
    
    // Add timestamp
    leadData.timestamp = admin.firestore.FieldValue.serverTimestamp();
    
    // Save lead to database
    const leadRef = await db.collection('clients').doc(clientId).collection('leads').add(leadData);
    
    // Get client email for notification
    const clientDoc = await db.collection('clients').doc(clientId).get();
    let notificationSent = false;
    
    if (clientDoc.exists) {
      const clientData = clientDoc.data();
      if (clientData.email) {
        // In a real implementation, this would send an email notification
        console.log(`Notification would be sent to ${clientData.email} about new lead from ${leadData.name}`);
        notificationSent = true;
      }
    }
    
    return {
      leadId: leadRef.id,
      notificationSent
    };
  } catch (error) {
    console.error('Error saving lead information:', error);
    throw error;
  }
}

// Helper function to generate WhatsApp deep link
function generateWhatsAppLink(phoneNumber, message = '') {
  // Format phone number (remove any non-digit characters)
  const formattedPhone = phoneNumber.replace(/\D/g, '');
  
  // Generate WhatsApp link
  let whatsappLink = `https://wa.me/${formattedPhone}`;
  
  // Add message if provided
  if (message) {
    whatsappLink += `?text=${encodeURIComponent(message)}`;
  }
  
  return whatsappLink;
}

module.exports = {
  initializeWhatsAppSession,
  sendWhatsAppMessage,
  processUserResponse,
  saveLeadInformation,
  generateWhatsAppLink
};
