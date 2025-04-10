#!/bin/bash

# WhatsApp Bot Automation System - Test Script

echo "Starting test of WhatsApp Bot Automation System..."

# Test Firebase connection
echo "Testing Firebase connection..."
firebase apps:list

# Test API endpoints
echo "Testing API endpoints..."

# Create a test client
echo "Creating test client..."
curl -X POST -H "Content-Type: application/json" -d '{
  "clientId": "test_client",
  "businessName": "Test Business",
  "whatsappNumber": "972501234567",
  "email": "test@example.com",
  "welcomeMessage": "שלום! אני הבוט החכם של Test Business. איך אוכל לעזור לך היום?"
}' https://us-central1-whatsapp-bot-automation.cloudfunctions.net/app/api/clients

# Get client information
echo "Getting client information..."
curl -X GET https://us-central1-whatsapp-bot-automation.cloudfunctions.net/app/api/clients/test_client

# Create a test flow
echo "Creating test flow..."
curl -X POST -H "Content-Type: application/json" -d '{
  "flowId": "test_flow",
  "name": "Test Flow",
  "steps": [
    {
      "id": "welcome",
      "type": "message",
      "message": "ברוכים הבאים לבוט הבדיקה!",
      "next": "collect_info"
    },
    {
      "id": "collect_info",
      "type": "collect_info",
      "message": "אנא ספר/י לנו קצת על עצמך:",
      "fields": [
        {
          "id": "name",
          "type": "text",
          "label": "שם מלא",
          "required": true
        },
        {
          "id": "phone",
          "type": "phone",
          "label": "מספר טלפון",
          "required": true
        }
      ],
      "next": "thank_you"
    },
    {
      "id": "thank_you",
      "type": "message",
      "message": "תודה רבה!",
      "next": "end"
    },
    {
      "id": "end",
      "type": "end",
      "message": "שיחה זו הסתיימה. תודה ולהתראות!"
    }
  ]
}' https://us-central1-whatsapp-bot-automation.cloudfunctions.net/app/api/clients/test_client/flows

# Get WhatsApp link
echo "Getting WhatsApp link..."
curl -X GET https://us-central1-whatsapp-bot-automation.cloudfunctions.net/app/api/whatsapp/link/test_client

# Clean up test data
echo "Cleaning up test data..."
# Uncomment the following line to delete the test client in production
# curl -X DELETE https://us-central1-whatsapp-bot-automation.cloudfunctions.net/app/api/clients/test_client

echo "Tests completed!"
