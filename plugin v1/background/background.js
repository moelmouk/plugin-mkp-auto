// Background Service Worker - Form Recorder Pro v3.0

let state = {
  isRecording: false,
  isPlaying: false,
  isPaused: false,
  commands: [],
  startTime: 0,
  currentTab: null,
  playbackSpeed: 1,
  currentCommandIndex: 0,
  settings: {
    defaultWait: 1000,
    typeDelay: 30,
    highlightElements: true,
    smartWait: true,
    recordOpenCommand: true,
    waitTimeout: 10000,
    debugMode: true
  }
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[BG] Message:', message.action);

  switch (message.action) {
    case 'getState':
      sendResponse({ ...state });
      break;

    case 'startRecording':
      startRecording(message.tabId, message.settings).then(result => sendResponse(result));
      return true;

    case 'stopRecording':
      stopRecording().then(result => sendResponse(result));
      return true;

    case 'recordCommand':
      if (state.isRecording) {
        recordCommand(message.data, sender.tab);
        sendResponse({ success: true });
      }
      break;

    case 'startPlaying':
      startPlaying(message.commands, message.tabId).then(result => sendResponse(result));
      return true;

    case 'stopPlaying':
      stopPlaying();
      sendResponse({ success: true });
      break;

    case 'pausePlaying':
      state.isPaused = !state.isPaused;
      sendResponse({ isPaused: state.isPaused });
      break;

    case 'getCommands':
      sendResponse({ commands: state.commands });
      break;

    case 'updateSettings':
      state.settings = { ...state.settings, ...message.settings };
      sendResponse({ success: true });
      break;

    case 'clearCommands':
      state.commands = [];
      sendResponse({ success: true });
      break;

    case 'toggleDebug':
      state.settings.debugMode = !state.settings.debugMode;
      // Propager au content script
      if (state.currentTab) {
        chrome.tabs.sendMessage(state.currentTab, { action: 'toggleDebug' }).catch(() => {});
      }
      sendResponse({ debugMode: state.settings.debugMode });
      break;

    default:
      sendResponse({ error: 'Unknown action' });
  }

  return true;
});

async function startRecording(tabId, settings = {}) {
  try {
    state.isRecording = true;
    state.isPlaying = false;
    state.commands = [];
    state.startTime = Date.now();
    state.currentTab = tabId;
    state.settings = { ...state.settings, ...settings };

    // Ajouter la commande 'open' si activé
    if (state.settings.recordOpenCommand) {
      const tab = await chrome.tabs.get(tabId);
      state.commands.push({
        Command: 'open',
        Target: tab.url,
        Value: '',
        Targets: [],
        Description: 'Page initiale'
      });
    }

    // Injecter le content script si nécessaire
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content/content.js']
      });
    } catch (e) {
      // Script déjà injecté
    }

    // Injecter les styles
    try {
      await chrome.scripting.insertCSS({
        target: { tabId: tabId },
        files: ['content/content.css']
      });
    } catch (e) {}

    // Attendre un peu et notifier
    await new Promise(resolve => setTimeout(resolve, 500));
    
    try {
      await chrome.tabs.sendMessage(tabId, { 
        action: 'startRecording',
        settings: state.settings
      });
    } catch (e) {
      console.warn('[BG] Could not send startRecording:', e.message);
    }

    return { success: true };
  } catch (e) {
    console.error('[BG] Start recording error:', e);
    return { success: false, error: e.message };
  }
}

async function stopRecording() {
  try {
    state.isRecording = false;

    if (state.currentTab) {
      try {
        await chrome.tabs.sendMessage(state.currentTab, { action: 'stopRecording' });
      } catch (e) {}
    }

    return { success: true, commands: state.commands };
  } catch (e) {
    console.error('[BG] Stop recording error:', e);
    return { success: false, error: e.message };
  }
}

function recordCommand(data, tab) {
  // Validation du selector
  if (data.target && data.target.includes('function')) {
    console.warn('[BG] Rejecting invalid selector:', data.target.substring(0, 50));
    return;
  }
  
  const command = {
    Command: data.command,
    Target: data.target,
    Value: data.value || '',
    Targets: (data.targets || []).filter(t => !t.includes('function')),
    Description: data.description || ''
  };

  // Ajouter les alternates si présents
  if (data.alternates && Array.isArray(data.alternates)) {
    command.alternates = data.alternates.filter(t => !t.includes('function'));
  }

  if (data.optionText) {
    command.optionText = data.optionText;
  }
  
  if (data.isSearchable) {
    command.isSearchable = data.isSearchable;
  }

  // Éviter les doublons pour type
  if (command.Command === 'type') {
    const lastCmd = state.commands[state.commands.length - 1];
    if (lastCmd && lastCmd.Command === 'type' && lastCmd.Target === command.Target) {
      lastCmd.Value = command.Value;
      return;
    }
  }

  // Éviter les clics dupliqués consécutifs
  if (command.Command === 'click') {
    const lastCmd = state.commands[state.commands.length - 1];
    if (lastCmd && lastCmd.Command === 'click' && lastCmd.Target === command.Target) {
      return;
    }
  }

  state.commands.push(command);
  console.log('[BG] Recorded:', command.Command, command.Value || command.Target?.substring(0, 40));
}

async function startPlaying(commands, tabId) {
  try {
    state.isPlaying = true;
    state.isPaused = false;
    state.currentCommandIndex = 0;

    // Injecter le content script
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content/content.js']
      });
    } catch (e) {}

    // Injecter les styles
    try {
      await chrome.scripting.insertCSS({
        target: { tabId: tabId },
        files: ['content/content.css']
      });
    } catch (e) {}

    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      await chrome.tabs.sendMessage(tabId, { action: 'showPlaybackIndicator' });
    } catch (e) {}

    for (let i = 0; i < commands.length; i++) {
      if (!state.isPlaying) break;

      while (state.isPaused) {
        await new Promise(resolve => setTimeout(resolve, 100));
        if (!state.isPlaying) break;
      }

      const cmd = commands[i];
      state.currentCommandIndex = i;
      console.log(`[BG] Playing ${i + 1}/${commands.length}:`, cmd.Command, cmd.Value || '');

      chrome.runtime.sendMessage({
        action: 'playbackProgress',
        current: i + 1,
        total: commands.length,
        command: cmd
      }).catch(() => {});

      try {
        if (cmd.Command === 'open') {
          await chrome.tabs.update(tabId, { url: cmd.Target });
          await waitForPageLoad(tabId, 20000);
          
          // Réinjecter le content script après navigation
          await new Promise(resolve => setTimeout(resolve, 1500));
          try {
            await chrome.scripting.executeScript({
              target: { tabId: tabId },
              files: ['content/content.js']
            });
            await chrome.scripting.insertCSS({
              target: { tabId: tabId },
              files: ['content/content.css']
            });
          } catch (e) {}
          
          await new Promise(resolve => setTimeout(resolve, 500));
          
          try {
            await chrome.tabs.sendMessage(tabId, { action: 'showPlaybackIndicator' });
          } catch (e) {}
        } else {
          // Attendre que le content script soit prêt
          let ready = false;
          for (let j = 0; j < 15; j++) {
            try {
              const response = await chrome.tabs.sendMessage(tabId, { action: 'ping' });
              if (response && response.ready) {
                ready = true;
                break;
              }
            } catch (e) {}
            await new Promise(resolve => setTimeout(resolve, 200));
          }
          
          if (!ready) {
            console.warn('[BG] Content script not ready, retrying injection...');
            try {
              await chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ['content/content.js']
              });
            } catch (e) {}
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          
          const result = await chrome.tabs.sendMessage(tabId, {
            action: 'executeCommand',
            command: cmd,
            settings: state.settings
          });
          
          if (!result || !result.success) {
            console.warn(`[BG] Command failed: ${cmd.Command}`);
            // Notifier le popup
            chrome.runtime.sendMessage({
              action: 'commandError',
              index: i,
              command: cmd,
              error: result?.error || 'Unknown error'
            }).catch(() => {});
          }
        }
      } catch (e) {
        console.error('[BG] Command error:', e.message);
        chrome.runtime.sendMessage({
          action: 'commandError',
          index: i,
          command: cmd,
          error: e.message
        }).catch(() => {});
      }

      await new Promise(resolve => 
        setTimeout(resolve, state.settings.defaultWait)
      );
    }

    state.isPlaying = false;
    
    try {
      await chrome.tabs.sendMessage(tabId, { action: 'hidePlaybackIndicator' });
    } catch (e) {}
    
    chrome.runtime.sendMessage({ action: 'playbackComplete' }).catch(() => {});

    return { success: true };
  } catch (e) {
    state.isPlaying = false;
    console.error('[BG] Playback error:', e);
    return { success: false, error: e.message };
  }
}

function stopPlaying() {
  state.isPlaying = false;
  state.isPaused = false;
}

async function waitForPageLoad(tabId, timeout = 20000) {
  return new Promise((resolve) => {
    const startTime = Date.now();

    const checkComplete = async () => {
      try {
        const tab = await chrome.tabs.get(tabId);
        if (tab.status === 'complete') {
          // Attendre encore pour Angular et les frameworks SPA
          setTimeout(resolve, 2500);
          return;
        }
      } catch (e) {
        resolve();
        return;
      }

      if (Date.now() - startTime > timeout) {
        resolve();
        return;
      }

      setTimeout(checkComplete, 200);
    };

    checkComplete();
  });
}

console.log('[BG] Form Recorder Pro v3.0 loaded');
