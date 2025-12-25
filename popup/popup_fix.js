// CORRECTION: Fonction startRecording améliorée

async function startRecording() {
  try {
    const scenarioName = document.getElementById('scenarioNameInput').value.trim() ||
                        `Scenario ${new Date().toLocaleString('fr-FR')}`;
    
    console.log('[FR Popup] Starting recording for:', scenarioName);
    
    // Vérifier que le content script est chargé
    console.log('[FR Popup] Checking if content script is loaded...');
    let contentScriptReady = false;
    
    try {
      const response = await chrome.tabs.sendMessage(currentTab.id, { action: 'ping' });
      contentScriptReady = response && response.ready;
      console.log('[FR Popup] Content script ready:', contentScriptReady);
    } catch (pingError) {
      console.warn('[FR Popup] Content script not loaded:', pingError.message);
    }
    
    // Si le content script n'est pas chargé, l'injecter
    if (!contentScriptReady) {
      console.log('[FR Popup] Injecting content script...');
      showToast('Initialisation du script...', 'info');
      
      try {
        // Injecter le JavaScript
        await chrome.scripting.executeScript({
          target: { tabId: currentTab.id },
          files: ['content/content.js']
        });
        
        // Injecter le CSS
        await chrome.scripting.insertCSS({
          target: { tabId: currentTab.id },
          files: ['content/content.css']
        });
        
        // Attendre que le script soit prêt
        await sleep(1000);
        
        // Vérifier à nouveau
        const retryResponse = await chrome.tabs.sendMessage(currentTab.id, { action: 'ping' });
        if (!retryResponse || !retryResponse.ready) {
          throw new Error('Content script not responding after injection');
        }
        
        console.log('[FR Popup] Content script injected successfully');
      } catch (injectError) {
        console.error('[FR Popup] Failed to inject content script:', injectError);
        showToast('Erreur: Rechargez la page (F5) et réessayez', 'error');
        return;
      }
    }
    
    // Démarrer l'enregistrement dans le content script
    console.log('[FR Popup] Starting recording in content script...');
    try {
      await chrome.tabs.sendMessage(currentTab.id, {
        action: 'startRecording',
        settings: settings
      });
    } catch (contentError) {
      console.error('[FR Popup] Content script error:', contentError);
      showToast('Erreur: Rechargez la page (F5)', 'error');
      return;
    }
    
    // Notifier le background
    console.log('[FR Popup] Notifying background...');
    try {
      await chrome.runtime.sendMessage({
        action: 'startRecording',
        name: scenarioName
      });
    } catch (bgError) {
      console.error('[FR Popup] Background error:', bgError);
      // Continuer même si le background échoue
    }
    
    isRecording = true;
    updateRecordingUI(true);
    showToast('Enregistrement démarré', 'success');
    console.log('[FR Popup] Recording started successfully');
    
  } catch (error) {
    console.error('[FR Popup] Error starting recording:', error);
    showToast('Erreur: ' + error.message, 'error');
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Export pour intégration
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { startRecording, sleep };
}
