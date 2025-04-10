// WhatsApp Bot Integration Widget
// Version 1.0.0

(function() {
  // Configuration object
  const config = {
    clientId: '{{CLIENT_ID}}',
    apiUrl: '{{API_URL}}',
    buttonPosition: 'right', // 'right' or 'left'
    buttonColor: '#25D366', // WhatsApp green by default
    buttonSize: '60px',
    buttonRadius: '50%',
    buttonMargin: '20px',
    buttonImage: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/WhatsApp.svg/512px-WhatsApp.svg.png',
    buttonText: 'צור קשר',
    showButtonText: false,
    customCSS: ''
  };

  // Create and inject styles
  function injectStyles() {
    const css = `
      #whatsapp-bot-widget {
        position: fixed;
        ${config.buttonPosition === 'right' ? 'right' : 'left'}: ${config.buttonMargin};
        bottom: ${config.buttonMargin};
        width: ${config.buttonSize};
        height: ${config.buttonSize};
        border-radius: ${config.buttonRadius};
        background-color: ${config.buttonColor};
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        cursor: pointer;
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
      }
      
      #whatsapp-bot-widget:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 12px rgba(0,0,0,0.4);
      }
      
      #whatsapp-bot-widget img {
        width: calc(${config.buttonSize} * 0.6);
        height: calc(${config.buttonSize} * 0.6);
      }
      
      #whatsapp-bot-text {
        display: ${config.showButtonText ? 'block' : 'none'};
        position: fixed;
        ${config.buttonPosition === 'right' ? 'right' : 'left'}: calc(${config.buttonMargin} + ${config.buttonSize});
        bottom: calc(${config.buttonMargin} + ${config.buttonSize}/2 - 10px);
        background-color: white;
        color: #333;
        padding: 8px 16px;
        border-radius: 18px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        font-family: Arial, sans-serif;
        font-size: 14px;
        direction: rtl;
        ${config.buttonPosition === 'right' ? 'transform: translateX(-10px);' : 'transform: translateX(10px);'}
      }
      
      ${config.customCSS}
    `;
    
    const styleElement = document.createElement('style');
    styleElement.type = 'text/css';
    styleElement.appendChild(document.createTextNode(css));
    document.head.appendChild(styleElement);
  }

  // Create WhatsApp button
  function createButton() {
    // Create button container
    const button = document.createElement('div');
    button.id = 'whatsapp-bot-widget';
    
    // Create WhatsApp icon
    const icon = document.createElement('img');
    icon.src = config.buttonImage;
    icon.alt = 'WhatsApp';
    button.appendChild(icon);
    
    // Create text bubble if enabled
    if (config.showButtonText) {
      const textBubble = document.createElement('div');
      textBubble.id = 'whatsapp-bot-text';
      textBubble.textContent = config.buttonText;
      document.body.appendChild(textBubble);
    }
    
    // Add click event
    button.addEventListener('click', openWhatsApp);
    
    // Add button to page
    document.body.appendChild(button);
  }

  // Open WhatsApp with the client's number
  async function openWhatsApp() {
    try {
      // Get WhatsApp link from API
      const response = await fetch(`${config.apiUrl}/api/whatsapp/link/${config.clientId}`);
      const data = await response.json();
      
      if (data.whatsappLink) {
        window.open(data.whatsappLink, '_blank');
      } else {
        console.error('Failed to get WhatsApp link:', data.error);
      }
    } catch (error) {
      console.error('Error opening WhatsApp:', error);
      // Fallback to direct WhatsApp link if API fails
      window.open(`https://wa.me/${config.clientId}`, '_blank');
    }
  }

  // Initialize the widget
  function init(customConfig) {
    // Merge custom configuration with defaults
    if (customConfig) {
      Object.assign(config, customConfig);
    }
    
    // Check if the widget is already initialized
    if (document.getElementById('whatsapp-bot-widget')) {
      return;
    }
    
    // Initialize the widget
    injectStyles();
    createButton();
  }

  // Expose the init function globally
  window.WhatsAppBotWidget = {
    init: init
  };
  
  // Auto-initialize if data attribute is present
  document.addEventListener('DOMContentLoaded', function() {
    const scriptTag = document.querySelector('script[data-whatsapp-bot-client]');
    if (scriptTag) {
      const clientId = scriptTag.getAttribute('data-whatsapp-bot-client');
      const apiUrl = scriptTag.getAttribute('data-whatsapp-bot-api') || 'https://us-central1-whatsapp-bot-automation.cloudfunctions.net';
      
      init({
        clientId: clientId,
        apiUrl: apiUrl
      });
    }
  });
})();
