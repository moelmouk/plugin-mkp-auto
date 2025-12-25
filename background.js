// Background Service Worker pour Form Recorder Pro v3.0

let recordingTabId = null;
let currentScenario = {
  id: null,
  name: '',
  commands: [],
  metadata: {
    url: '',
    startTime: null,
    lastActionTime: null
  }
};

// Gestion des messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'startRecording':
      handleStartRecording(message, sender, sendResponse);
      break;
    case 'stopRecording':
      handleStopRecording(message, sender, sendResponse);
      break;
    case 'recordCommand':
      handleRecordCommand(message, sender, sendResponse);
      break;
    case 'playScenario':
      handlePlayScenario(message, sender, sendResponse);
      return true; // Keep channel open for async
    case 'playScenarioGroup':
      handlePlayScenarioGroup(message, sender, sendResponse);
      return true;
    case 'getRecordingState':
      sendResponse({ 
        isRecording: recordingTabId !== null,
        tabId: recordingTabId,
        scenario: currentScenario 
      });
      break;
    default:
      sendResponse({ success: false, error: 'Unknown action' });
  }
  return true;
});

function handleStartRecording(message, sender, sendResponse) {
  recordingTabId = sender.tab.id;
  const now = Date.now();
  currentScenario = {
    id: generateId(),
    name: message.name || `Scenario ${new Date().toLocaleString('fr-FR')}`,
    commands: [],
    metadata: {
      url: sender.tab.url,
      startTime: now,
      lastActionTime: now,
      recordedAt: new Date().toISOString()
    }
  };
  
  console.log('[FR BG] Recording started:', currentScenario.name);
  sendResponse({ success: true, scenarioId: currentScenario.id });
}

function handleStopRecording(message, sender, sendResponse) {
  if (recordingTabId === null) {
    sendResponse({ success: false, error: 'Not recording' });
    return;
  }
  
  const scenario = { ...currentScenario };
  recordingTabId = null;
  currentScenario = {
    id: null,
    name: '',
    commands: [],
    metadata: {}
  };
  
  console.log('[FR BG] Recording stopped. Commands:', scenario.commands.length);
  sendResponse({ success: true, scenario: scenario });
}

function handleRecordCommand(message, sender, sendResponse) {
  if (recordingTabId === null || sender.tab.id !== recordingTabId) {
    sendResponse({ success: false, error: 'Not recording' });
    return;
  }
  
  const now = Date.now();
  const delay = now - currentScenario.metadata.lastActionTime;
  
  const command = {
    id: generateId(),
    Command: message.data.command,
    Target: message.data.target,
    Value: message.data.value || '',
    Targets: message.data.targets || [],
    Description: message.data.description || '',
    Delay: delay,
    Timestamp: now,
    ...message.data
  };
  
  currentScenario.commands.push(command);
  currentScenario.metadata.lastActionTime = now;
  
  console.log('[FR BG] Command recorded:', command.Command, command.Value);
  sendResponse({ success: true, commandCount: currentScenario.commands.length });
}

async function handlePlayScenario(message, sender, sendResponse) {
  try {
    const { scenario, settings, tabId } = message;
    const targetTabId = tabId || sender.tab.id;
    
    console.log('[FR BG] Playing scenario:', scenario.name, 'Commands:', scenario.commands.length);
    
    // Envoyer au content script pour exécution
    await chrome.tabs.sendMessage(targetTabId, {
      action: 'showPlaybackIndicator'
    });
    
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < scenario.commands.length; i++) {
      const cmd = scenario.commands[i];
      
      // Respecter le délai enregistré
      if (cmd.Delay && settings.respectTiming !== false) {
        const delayMs = Math.min(cmd.Delay, settings.maxDelay || 5000);
        await sleep(delayMs);
      } else if (settings.defaultDelay) {
        await sleep(settings.defaultDelay);
      }
      
      try {
        const result = await chrome.tabs.sendMessage(targetTabId, {
          action: 'executeCommand',
          command: cmd,
          settings: settings
        });
        
        if (result.success) {
          successCount++;
        } else {
          failCount++;
          if (settings.stopOnError) {
            console.error('[FR BG] Stopping on error at command', i + 1);
            break;
          }
        }
      } catch (error) {
        console.error('[FR BG] Error executing command', i + 1, error);
        failCount++;
        if (settings.stopOnError) break;
      }
    }
    
    await chrome.tabs.sendMessage(targetTabId, {
      action: 'hidePlaybackIndicator'
    });
    
    sendResponse({ 
      success: true, 
      stats: { 
        total: scenario.commands.length, 
        success: successCount, 
        failed: failCount 
      } 
    });
  } catch (error) {
    console.error('[FR BG] Error playing scenario:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handlePlayScenarioGroup(message, sender, sendResponse) {
  try {
    const { scenarios, settings, mode } = message;
    
    if (mode === 'sequential') {
      // Exécution séquentielle
      const results = [];
      for (const scenario of scenarios) {
        const result = await playScenarioInTab(scenario, settings, sender.tab.id);
        results.push(result);
        if (!result.success && settings.stopOnError) break;
      }
      sendResponse({ success: true, results });
    } else if (mode === 'parallel') {
      // Exécution parallèle (nouveaux onglets)
      const results = await Promise.all(
        scenarios.map(async (scenario) => {
          try {
            const tab = await chrome.tabs.create({ url: scenario.metadata.url, active: false });
            await sleep(2000); // Attendre chargement page
            return await playScenarioInTab(scenario, settings, tab.id);
          } catch (error) {
            return { success: false, error: error.message, scenario: scenario.name };
          }
        })
      );
      sendResponse({ success: true, results });
    }
  } catch (error) {
    console.error('[FR BG] Error playing scenario group:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function playScenarioInTab(scenario, settings, tabId) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({
      action: 'playScenario',
      scenario,
      settings,
      tabId
    }, (response) => {
      resolve(response || { success: false, error: 'No response' });
    });
  });
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

console.log('[FR BG] Form Recorder Pro v3.0 background script loaded');
