// Popup Script - Form Recorder Pro v4.0

// ===== ÉLÉMENTS DOM =====
const elements = {
  tabs: document.querySelectorAll('.tab'),
  tabContents: document.querySelectorAll('.tab-content'),
  
  recordBtn: document.getElementById('recordBtn'),
  stopBtn: document.getElementById('stopBtn'),
  playBtn: document.getElementById('playBtn'),
  pauseBtn: document.getElementById('pauseBtn'),
  clearBtn: document.getElementById('clearBtn'),
  saveBtn: document.getElementById('saveBtn'),
  exportBtn: document.getElementById('exportBtn'),
  importInput: document.getElementById('importInput'),
  addCommandBtn: document.getElementById('addCommandBtn'),
  
  status: document.getElementById('status'),
  commandCount: document.getElementById('commandCount'),
  commandsList: document.getElementById('commandsList'),
  scenariosList: document.getElementById('scenariosList'),
  logsContainer: document.getElementById('logsContainer'),
  
  clearLogsBtn: document.getElementById('clearLogsBtn'),
  exportLogsBtn: document.getElementById('exportLogsBtn'),
  
  saveModal: document.getElementById('saveModal'),
  scenarioName: document.getElementById('scenarioName'),
  cancelSaveBtn: document.getElementById('cancelSaveBtn'),
  confirmSaveBtn: document.getElementById('confirmSaveBtn'),
  
  editModal: document.getElementById('editModal'),
  editCommand: document.getElementById('editCommand'),
  editTarget: document.getElementById('editTarget'),
  editValue: document.getElementById('editValue'),
  editDescription: document.getElementById('editDescription'),
  alternateTargets: document.getElementById('alternateTargets'),
  locateTargetBtn: document.getElementById('locateTargetBtn'),
  copyTargetBtn: document.getElementById('copyTargetBtn'),
  cancelEditBtn: document.getElementById('cancelEditBtn'),
  confirmEditBtn: document.getElementById('confirmEditBtn'),
  
  addCommandModal: document.getElementById('addCommandModal'),
  addCommand: document.getElementById('addCommand'),
  addTarget: document.getElementById('addTarget'),
  addValue: document.getElementById('addValue'),
  addDescription: document.getElementById('addDescription'),
  cancelAddBtn: document.getElementById('cancelAddBtn'),
  confirmAddBtn: document.getElementById('confirmAddBtn'),
  
  recordOpenCommand: document.getElementById('recordOpenCommand'),
  defaultWait: document.getElementById('defaultWait'),
  typeDelay: document.getElementById('typeDelay'),
  waitTimeout: document.getElementById('waitTimeout'),
  highlightElements: document.getElementById('highlightElements')
};

// ===== ÉTAT =====
let currentCommands = [];
let savedScenarios = [];
let editingIndex = -1;
let currentPlayingIndex = -1;
let isPaused = false;
let logs = [];

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', async () => {
  await loadSavedScenarios();
  await updateState();
  setupEventListeners();
  renderScenarios();
  loadSettings();
});

function setupEventListeners() {
  // Tabs
  elements.tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabId = tab.dataset.tab;
      elements.tabs.forEach(t => t.classList.remove('active'));
      elements.tabContents.forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`tab-${tabId}`).classList.add('active');
    });
  });

  // Controls
  elements.recordBtn.addEventListener('click', startRecording);
  elements.stopBtn.addEventListener('click', stopAll);
  elements.playBtn.addEventListener('click', startPlayback);
  elements.pauseBtn.addEventListener('click', togglePause);
  elements.clearBtn.addEventListener('click', clearCommands);
  elements.saveBtn.addEventListener('click', () => {
    elements.scenarioName.value = `Scénario ${savedScenarios.length + 1}`;
    elements.saveModal.hidden = false;
  });
  elements.exportBtn.addEventListener('click', exportCommands);
  elements.importInput.addEventListener('change', importCommands);
  elements.addCommandBtn.addEventListener('click', openAddModal);

  // Logs
  elements.clearLogsBtn.addEventListener('click', clearLogs);
  elements.exportLogsBtn.addEventListener('click', exportLogs);

  // Save Modal
  elements.cancelSaveBtn.addEventListener('click', () => elements.saveModal.hidden = true);
  elements.confirmSaveBtn.addEventListener('click', saveScenario);
  document.querySelector('#saveModal .modal-overlay').addEventListener('click', () => elements.saveModal.hidden = true);

  // Edit Modal
  elements.cancelEditBtn.addEventListener('click', () => elements.editModal.hidden = true);
  elements.confirmEditBtn.addEventListener('click', saveEditedCommand);
  elements.locateTargetBtn.addEventListener('click', locateCurrentTarget);
  elements.copyTargetBtn.addEventListener('click', copyCurrentTarget);
  document.querySelector('#editModal .modal-overlay').addEventListener('click', () => elements.editModal.hidden = true);

  // Add Modal
  elements.cancelAddBtn.addEventListener('click', () => elements.addCommandModal.hidden = true);
  elements.confirmAddBtn.addEventListener('click', addNewCommand);
  document.querySelector('#addCommandModal .modal-overlay').addEventListener('click', () => elements.addCommandModal.hidden = true);

  // Settings
  elements.recordOpenCommand.addEventListener('change', saveSettings);
  elements.defaultWait.addEventListener('change', saveSettings);
  elements.typeDelay.addEventListener('change', saveSettings);
  elements.waitTimeout.addEventListener('change', saveSettings);
  elements.highlightElements.addEventListener('change', saveSettings);

  // Messages du background
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'playbackProgress') {
      currentPlayingIndex = message.current - 1;
      renderCommands();
      addLog('info', `Exécution ${message.current}/${message.total}: ${message.command.Command}`);
    } else if (message.action === 'playbackComplete') {
      currentPlayingIndex = -1;
      setIdleUI();
      addLog('success', 'Lecture terminée');
    } else if (message.action === 'commandError') {
      addLog('error', `Erreur cmd ${message.index + 1}: ${message.error}`);
    } else if (message.action === 'commandSuccess') {
      addLog('success', `Cmd ${message.index + 1} OK`);
    }
  });
}

// ===== LOGS =====
function addLog(level, message) {
  const timestamp = new Date().toLocaleTimeString();
  logs.push({ timestamp, level, message });
  if (logs.length > 200) logs.shift();
  renderLogs();
}

function renderLogs() {
  if (logs.length === 0) {
    elements.logsContainer.innerHTML = '<p class="empty-state">Aucun log</p>';
    return;
  }
  
  elements.logsContainer.innerHTML = logs.map(log => {
    const icon = log.level === 'error' ? '❌' : log.level === 'success' ? '✅' : 'ℹ️';
    return `<div class="log-entry log-${log.level}">
      <span class="log-time">${log.timestamp}</span>
      <span class="log-icon">${icon}</span>
      <span class="log-msg">${escapeHtml(log.message)}</span>
    </div>`;
  }).reverse().join('');
}

function clearLogs() {
  logs = [];
  renderLogs();
}

function exportLogs() {
  const text = logs.map(l => `[${l.timestamp}] [${l.level.toUpperCase()}] ${l.message}`).join('\n');
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `form-recorder-logs-${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// ===== ÉTAT =====
async function updateState() {
  try {
    const state = await chrome.runtime.sendMessage({ action: 'getState' });
    
    if (state.isRecording) {
      setRecordingUI();
    } else if (state.isPlaying) {
      setPlayingUI();
      isPaused = state.isPaused;
    } else {
      setIdleUI();
    }
    
    if (state.commands) {
      currentCommands = state.commands;
      renderCommands();
    }
  } catch (e) {
    console.error('State error:', e);
  }
}

function setIdleUI() {
  elements.recordBtn.disabled = false;
  elements.recordBtn.classList.remove('recording');
  elements.stopBtn.disabled = true;
  elements.playBtn.disabled = currentCommands.length === 0;
  elements.pauseBtn.disabled = true;
  elements.clearBtn.disabled = currentCommands.length === 0;
  elements.saveBtn.disabled = currentCommands.length === 0;
  elements.exportBtn.disabled = currentCommands.length === 0;
  currentPlayingIndex = -1;
  isPaused = false;
  
  elements.status.className = 'status';
  elements.status.innerHTML = '<span class="status-icon">⏸️</span><span class="status-text">Prêt</span>';
}

function setRecordingUI() {
  elements.recordBtn.disabled = true;
  elements.recordBtn.classList.add('recording');
  elements.stopBtn.disabled = false;
  elements.playBtn.disabled = true;
  elements.pauseBtn.disabled = true;
  elements.clearBtn.disabled = true;
  elements.saveBtn.disabled = true;
  elements.exportBtn.disabled = true;
  
  elements.status.className = 'status recording';
  elements.status.innerHTML = '<span class="status-icon">🔴</span><span class="status-text">Enregistrement...</span>';
}

function setPlayingUI() {
  elements.recordBtn.disabled = true;
  elements.stopBtn.disabled = false;
  elements.playBtn.disabled = true;
  elements.pauseBtn.disabled = false;
  elements.clearBtn.disabled = true;
  elements.saveBtn.disabled = true;
  elements.exportBtn.disabled = true;
  
  elements.status.className = 'status playing';
  elements.status.innerHTML = '<span class="status-icon">▶️</span><span class="status-text">Lecture...</span>';
}

// ===== ENREGISTREMENT =====
async function startRecording() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      addLog('error', 'Impossible d\'enregistrer sur cette page');
      return;
    }
    
    const response = await chrome.runtime.sendMessage({ 
      action: 'startRecording',
      tabId: tab.id,
      settings: getSettings()
    });
    
    if (response.success) {
      setRecordingUI();
      currentCommands = [];
      renderCommands();
      addLog('info', 'Enregistrement démarré');
      
      setTimeout(async () => {
        const state = await chrome.runtime.sendMessage({ action: 'getCommands' });
        if (state.commands) {
          currentCommands = state.commands;
          renderCommands();
        }
      }, 600);
    }
  } catch (e) {
    addLog('error', e.message);
  }
}

async function stopAll() {
  try {
    const state = await chrome.runtime.sendMessage({ action: 'getState' });
    
    if (state.isRecording) {
      const response = await chrome.runtime.sendMessage({ action: 'stopRecording' });
      if (response.commands) {
        currentCommands = response.commands;
      }
      addLog('info', `Enregistrement arrêté: ${currentCommands.length} commandes`);
    } else if (state.isPlaying) {
      await chrome.runtime.sendMessage({ action: 'stopPlaying' });
      addLog('info', 'Lecture arrêtée');
    }
    
    setIdleUI();
    renderCommands();
  } catch (e) {
    addLog('error', e.message);
  }
}

// ===== LECTURE =====
async function startPlayback() {
  if (currentCommands.length === 0) return;
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      addLog('error', 'Aucun onglet actif');
      return;
    }
    
    addLog('info', `Démarrage lecture: ${currentCommands.length} commandes`);
    
    const response = await chrome.runtime.sendMessage({
      action: 'startPlaying',
      commands: currentCommands,
      tabId: tab.id
    });
    
    if (response.success) {
      setPlayingUI();
    }
  } catch (e) {
    addLog('error', e.message);
  }
}

async function togglePause() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'pausePlaying' });
    isPaused = response.isPaused;
    elements.pauseBtn.classList.toggle('active', isPaused);
    addLog('info', isPaused ? 'Pause' : 'Reprise');
  } catch (e) {
    addLog('error', e.message);
  }
}

// ===== RENDU DES COMMANDES =====
function renderCommands() {
  elements.commandCount.textContent = currentCommands.length;
  
  if (currentCommands.length === 0) {
    elements.commandsList.innerHTML = '<p class="empty-state">Cliquez sur REC pour commencer</p>';
    return;
  }
  
  elements.commandsList.innerHTML = currentCommands.map((cmd, index) => {
    const isPlaying = index === currentPlayingIndex;
    const targetShort = shortenSelector(cmd.Target, 35);
    let typeClass = cmd.Command;
    if (cmd.Command === 'waitForElementVisible' || cmd.Command === 'pause') typeClass = 'wait';
    
    return `
      <div class="command-item ${isPlaying ? 'playing' : ''}" data-index="${index}">
        <span class="command-index">${index + 1}</span>
        <span class="command-type ${typeClass}">${cmd.Command}</span>
        <span class="command-target" title="${escapeHtml(cmd.Target)}">${escapeHtml(targetShort)}</span>
        ${cmd.Value ? `<span class="command-value" title="${escapeHtml(cmd.Value)}">${escapeHtml(cmd.Value.substring(0, 12))}</span>` : ''}
        <div class="command-actions">
          <button class="cmd-btn locate" title="Localiser" data-index="${index}">🔍</button>
          <button class="cmd-btn edit" title="Modifier" data-index="${index}">✏️</button>
          <button class="cmd-btn delete" title="Supprimer" data-index="${index}">❌</button>
        </div>
      </div>
    `;
  }).join('');
  
  // Event listeners
  elements.commandsList.querySelectorAll('.cmd-btn.edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openEditModal(parseInt(btn.dataset.index));
    });
  });
  
  elements.commandsList.querySelectorAll('.cmd-btn.delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteCommand(parseInt(btn.dataset.index));
    });
  });
  
  elements.commandsList.querySelectorAll('.cmd-btn.locate').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      locateCommand(parseInt(btn.dataset.index));
    });
  });
  
  // Scroll vers la commande en cours
  if (currentPlayingIndex >= 0) {
    const playingEl = elements.commandsList.querySelector('.command-item.playing');
    if (playingEl) {
      playingEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }
}

function shortenSelector(selector, maxLen = 40) {
  if (!selector) return '';
  
  if (selector.startsWith('id=')) {
    const id = selector.substring(3);
    if (id.length > maxLen) {
      return 'id=...' + id.substring(id.length - (maxLen - 6));
    }
    return selector;
  }
  
  if (selector.startsWith('xpath=')) {
    const xpath = selector.substring(6);
    if (xpath.includes('@id="')) {
      const match = xpath.match(/@id="([^"]+)"/);
      if (match) {
        const id = match[1];
        if (id.length > maxLen - 15) {
          return `xpath=...[@id="...${id.substring(id.length - 20)}"]`;
        }
        return `xpath=...[@id="${id}"]`;
      }
    }
    if (xpath.length > maxLen) {
      return 'xpath=...' + xpath.substring(xpath.length - (maxLen - 9));
    }
    return selector;
  }
  
  if (selector.length > maxLen) {
    return '...' + selector.substring(selector.length - (maxLen - 3));
  }
  return selector;
}

// ===== LOCALISATION =====
async function locateCommand(index) {
  const cmd = currentCommands[index];
  if (!cmd || !cmd.Target) return;
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;
    
    await chrome.tabs.sendMessage(tab.id, {
      action: 'locateElement',
      selector: cmd.Target
    });
    
    addLog('info', `Localisation: ${cmd.Target.substring(0, 50)}`);
  } catch (e) {
    addLog('error', 'Impossible de localiser: ' + e.message);
  }
}

async function locateCurrentTarget() {
  const selector = elements.editTarget.value;
  if (!selector) return;
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;
    
    const result = await chrome.tabs.sendMessage(tab.id, {
      action: 'locateElement',
      selector: selector
    });
    
    if (result.success) {
      addLog('success', 'Élément localisé');
    } else {
      addLog('error', 'Élément non trouvé');
    }
  } catch (e) {
    addLog('error', e.message);
  }
}

function copyCurrentTarget() {
  const selector = elements.editTarget.value;
  if (selector) {
    navigator.clipboard.writeText(selector);
    addLog('info', 'Sélecteur copié');
  }
}

// ===== ÉDITION =====
function openEditModal(index) {
  editingIndex = index;
  const cmd = currentCommands[index];
  
  elements.editCommand.value = cmd.Command;
  elements.editTarget.value = cmd.Target || '';
  elements.editValue.value = cmd.Value || '';
  elements.editDescription.value = cmd.Description || '';
  
  // Afficher les targets alternatifs
  if (cmd.Targets && cmd.Targets.length > 0) {
    elements.alternateTargets.innerHTML = cmd.Targets.map((t, i) => `
      <div class="alt-target" data-selector="${escapeHtml(t)}">
        <span class="alt-target-text" title="${escapeHtml(t)}">${shortenSelector(t, 50)}</span>
        <button class="alt-target-use" title="Utiliser ce sélecteur">→</button>
      </div>
    `).join('');
    
    // Event listeners pour utiliser un target alternatif
    elements.alternateTargets.querySelectorAll('.alt-target-use').forEach(btn => {
      btn.addEventListener('click', () => {
        const parent = btn.closest('.alt-target');
        elements.editTarget.value = parent.dataset.selector;
      });
    });
  } else {
    elements.alternateTargets.innerHTML = '<span class="empty-text">Aucun</span>';
  }
  
  elements.editModal.hidden = false;
}

function saveEditedCommand() {
  if (editingIndex < 0) return;
  
  currentCommands[editingIndex] = {
    ...currentCommands[editingIndex],
    Command: elements.editCommand.value,
    Target: elements.editTarget.value,
    Value: elements.editValue.value,
    Description: elements.editDescription.value
  };
  
  elements.editModal.hidden = true;
  editingIndex = -1;
  renderCommands();
  addLog('info', 'Commande modifiée');
}

function openAddModal() {
  elements.addCommand.value = 'click';
  elements.addTarget.value = '';
  elements.addValue.value = '';
  elements.addDescription.value = '';
  elements.addCommandModal.hidden = false;
}

function addNewCommand() {
  currentCommands.push({
    Command: elements.addCommand.value,
    Target: elements.addTarget.value,
    Value: elements.addValue.value,
    Targets: [],
    Description: elements.addDescription.value
  });
  
  elements.addCommandModal.hidden = true;
  renderCommands();
  setIdleUI();
  addLog('info', 'Commande ajoutée');
}

function deleteCommand(index) {
  currentCommands.splice(index, 1);
  renderCommands();
  setIdleUI();
}

function clearCommands() {
  if (!confirm('Effacer toutes les commandes ?')) return;
  currentCommands = [];
  chrome.runtime.sendMessage({ action: 'clearCommands' });
  renderCommands();
  setIdleUI();
  addLog('info', 'Commandes effacées');
}

// ===== SCÉNARIOS =====
async function saveScenario() {
  const name = elements.scenarioName.value.trim();
  if (!name) return;
  
  const scenario = {
    Name: name,
    CreationDate: new Date().toISOString().split('T')[0],
    Commands: currentCommands.map(cmd => ({
      Command: cmd.Command,
      Target: cmd.Target,
      Value: cmd.Value || '',
      Targets: cmd.Targets || [],
      Description: cmd.Description || ''
    }))
  };
  
  savedScenarios.push(scenario);
  await saveScenariosToStorage();
  
  elements.saveModal.hidden = true;
  renderScenarios();
  addLog('success', `Scénario "${name}" sauvegardé`);
  
  // Aller à l'onglet scénarios
  elements.tabs.forEach(t => t.classList.remove('active'));
  elements.tabContents.forEach(c => c.classList.remove('active'));
  document.querySelector('[data-tab="scenarios"]').classList.add('active');
  document.getElementById('tab-scenarios').classList.add('active');
}

function renderScenarios() {
  if (savedScenarios.length === 0) {
    elements.scenariosList.innerHTML = '<p class="empty-state">Aucun scénario</p>';
    return;
  }
  
  elements.scenariosList.innerHTML = savedScenarios.map((s, i) => `
    <div class="scenario-item">
      <div class="scenario-info">
        <h4>${escapeHtml(s.Name)}</h4>
        <span class="scenario-meta">${s.Commands.length} cmd • ${s.CreationDate}</span>
      </div>
      <div class="scenario-actions">
        <button class="scenario-btn load" data-index="${i}" title="Charger">📥</button>
        <button class="scenario-btn play" data-index="${i}" title="Jouer">▶️</button>
        <button class="scenario-btn export" data-index="${i}" title="Exporter">💾</button>
        <button class="scenario-btn delete" data-index="${i}" title="Supprimer">❌</button>
      </div>
    </div>
  `).join('');
  
  elements.scenariosList.querySelectorAll('.scenario-btn.load').forEach(btn => {
    btn.addEventListener('click', () => loadScenario(parseInt(btn.dataset.index)));
  });
  
  elements.scenariosList.querySelectorAll('.scenario-btn.play').forEach(btn => {
    btn.addEventListener('click', () => playScenario(parseInt(btn.dataset.index)));
  });
  
  elements.scenariosList.querySelectorAll('.scenario-btn.export').forEach(btn => {
    btn.addEventListener('click', () => exportScenario(parseInt(btn.dataset.index)));
  });
  
  elements.scenariosList.querySelectorAll('.scenario-btn.delete').forEach(btn => {
    btn.addEventListener('click', () => deleteScenario(parseInt(btn.dataset.index)));
  });
}

function loadScenario(index) {
  currentCommands = [...savedScenarios[index].Commands];
  renderCommands();
  setIdleUI();
  
  elements.tabs.forEach(t => t.classList.remove('active'));
  elements.tabContents.forEach(c => c.classList.remove('active'));
  document.querySelector('[data-tab="record"]').classList.add('active');
  document.getElementById('tab-record').classList.add('active');
  
  addLog('info', `Scénario "${savedScenarios[index].Name}" chargé`);
}

async function playScenario(index) {
  currentCommands = savedScenarios[index].Commands;
  renderCommands();
  
  elements.tabs.forEach(t => t.classList.remove('active'));
  elements.tabContents.forEach(c => c.classList.remove('active'));
  document.querySelector('[data-tab="record"]').classList.add('active');
  document.getElementById('tab-record').classList.add('active');
  
  await startPlayback();
}

function exportScenario(index) {
  const s = savedScenarios[index];
  downloadJSON(s, `${s.Name.replace(/\s+/g, '-')}.json`);
}

async function deleteScenario(index) {
  if (!confirm(`Supprimer "${savedScenarios[index].Name}" ?`)) return;
  savedScenarios.splice(index, 1);
  await saveScenariosToStorage();
  renderScenarios();
}

// ===== EXPORT/IMPORT =====
function exportCommands() {
  if (currentCommands.length === 0) return;
  downloadJSON({
    Name: 'Export',
    CreationDate: new Date().toISOString().split('T')[0],
    Commands: currentCommands
  }, `form-recorder-${Date.now()}.json`);
}

function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function importCommands(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    
    if (data.Commands && Array.isArray(data.Commands)) {
      currentCommands = data.Commands.map(cmd => ({
        Command: cmd.Command,
        Target: cmd.Target,
        Value: cmd.Value || '',
        Targets: cmd.Targets || [],
        Description: cmd.Description || ''
      }));
      renderCommands();
      setIdleUI();
      addLog('success', `Importé: ${currentCommands.length} commandes`);
    } else {
      throw new Error('Format invalide');
    }
  } catch (e) {
    addLog('error', 'Erreur import: ' + e.message);
  }
  
  elements.importInput.value = '';
}

// ===== STORAGE =====
async function loadSavedScenarios() {
  try {
    const result = await chrome.storage.local.get(['scenarios']);
    savedScenarios = result.scenarios || [];
  } catch (e) {
    savedScenarios = [];
  }
}

async function saveScenariosToStorage() {
  await chrome.storage.local.set({ scenarios: savedScenarios });
}

// ===== SETTINGS =====
function loadSettings() {
  chrome.storage.local.get(['settings'], (result) => {
    const s = result.settings || {};
    elements.recordOpenCommand.checked = s.recordOpenCommand !== false;
    elements.defaultWait.value = s.defaultWait || 1000;
    elements.typeDelay.value = s.typeDelay || 20;
    elements.waitTimeout.value = s.waitTimeout || 10000;
    elements.highlightElements.checked = s.highlightElements !== false;
  });
}

function getSettings() {
  return {
    recordOpenCommand: elements.recordOpenCommand.checked,
    defaultWait: parseInt(elements.defaultWait.value) || 1000,
    typeDelay: parseInt(elements.typeDelay.value) || 20,
    waitTimeout: parseInt(elements.waitTimeout.value) || 10000,
    highlightElements: elements.highlightElements.checked
  };
}

function saveSettings() {
  const settings = getSettings();
  chrome.storage.local.set({ settings });
  chrome.runtime.sendMessage({ action: 'updateSettings', settings });
}

// ===== UTILS =====
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
