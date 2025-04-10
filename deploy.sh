#!/bin/bash

# WhatsApp Bot Automation System - Deployment Script

echo "Starting deployment of WhatsApp Bot Automation System..."

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "Firebase CLI not found. Installing..."
    npm install -g firebase-tools
fi

# Login to Firebase (this will open a browser window)
echo "Logging in to Firebase..."
firebase login

# Initialize Firebase project if .firebaserc doesn't exist
if [ ! -f .firebaserc ]; then
    echo "Initializing Firebase project..."
    firebase init
fi

# Install dependencies
echo "Installing dependencies..."
cd functions
npm install
cd ..

# Build the project
echo "Building project..."
cd functions
npm run build
cd ..

# Deploy to Firebase
echo "Deploying to Firebase..."
firebase deploy

echo "Deployment completed successfully!"
echo "Your WhatsApp Bot Automation System is now live."
echo "Admin Dashboard: https://whatsapp-bot-automation.web.app/admin-dashboard.html"
echo "Widget Demo: https://whatsapp-bot-automation.web.app/example.html"
echo "Integration Guide: https://whatsapp-bot-automation.web.app/integration-guide.html"
