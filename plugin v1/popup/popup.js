// Popup Script - Form Recorder Pro v2.1

// ===== ÉLÉMENTS DOM =====
const elements = {
  // Tabs
  tabs: document.querySelectorAll('.tab'),
  tabContents: document.querySelectorAll('.tab-content'),
  
  // Controls
  recordBtn: document.getElementById('recordBtn'),
  stopBtn: document.getElementById('stopBtn'),
  playBtn: document.getElementById('playBtn'),
  clearBtn: document.getElementById('clearBtn'),
  saveBtn: document.getElementById('saveBtn'),
  exportBtn: document.getElementById('exportBtn'),
  importInput: document.getElementById('importInput'),
  
  // Status
  status: document.getElementById('status'),
  commandCount: document.getElementById('commandCount'),
  commandsList: document.getElementById('commandsList'),
  scenariosList: document.getElementById('scenariosList'),
  
  // Save Modal
  saveModal: document.getElementById('saveModal'),
  scenarioName: document.getElementById('scenarioName'),
  cancelSaveBtn: document.getElementById('cancelSaveBtn'),
  confirmSaveBtn: document.getElementById('confirmSaveBtn'),
  
  // Edit Modal
  editModal: document.getElementById('editModal'),
  editCommand: document.getElementById('editCommand'),
  editTarget: document.getElementById('editTarget'),
  editValue: document.getElementById('editValue'),
  editDescription: document.getElementById('editDescription'),
  cancelEditBtn: document.getElementById('cancelEditBtn'),
  confirmEditBtn: document.getElementById('confirmEditBtn'),
  
  // Settings
  recordOpenCommand: document.getElementById('recordOpenCommand'),
  defaultWait: document.getElementById('defaultWait'),
  typeDelay: document.getElementById('typeDelay'),
  waitTimeout: document.getElementById('waitTimeout'),
  highlightElements: document.getElementById('highlightElements'),
  smartWait: document.getElementById('smartWait')
};

// ===== ÉTAT =====
let currentCommands = [];
let savedScenarios = [];
let editingIndex = -1;


// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', async () => {
  await loadSavedScenarios();
  await updateState();
  setupEventListeners();
  renderScenarios();
  loadSettings();
});

// ===== GESTION DES TABS =====
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
  elements.stopBtn.addEventListener('click', stopRecording);
  elements.playBtn.addEventListener('click', startPlayback);
  elements.clearBtn.addEventListener('click', clearCommands);
  elements.saveBtn.addEventListener('click', openSaveModal);
  elements.exportBtn.addEventListener('click', exportCommands);
  elements.importInput.addEventListener('change', importCommands);

  // Save Modal
  elements.cancelSaveBtn.addEventListener('click', () => elements.saveModal.hidden = true);
  elements.confirmSaveBtn.addEventListener('click', saveScenario);
  document.querySelector('#saveModal .modal-overlay').addEventListener('click', () => elements.saveModal.hidden = true);

  // Edit Modal
  elements.cancelEditBtn.addEventListener('click', () => elements.editModal.hidden = true);
  elements.confirmEditBtn.addEventListener('click', saveEditedCommand);
  document.querySelector('#editModal .modal-overlay').addEventListener('click', () => elements.editModal.hidden = true);

  // Settings
  elements.recordOpenCommand.addEventListener('change', saveSettings);
  elements.defaultWait.addEventListener('change', saveSettings);
  elements.typeDelay.addEventListener('change', saveSettings);
  elements.waitTimeout.addEventListener('change', saveSettings);
  elements.highlightElements.addEventListener('change', saveSettings);
  elements.smartWait.addEventListener('change', saveSettings);

  // Écouter les messages du background
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'playbackProgress') {
      updatePlaybackProgress(message.current, message.total);
    } else if (message.action === 'playbackComplete') {
      setIdleUI();
    }
  });
}

// ===== MISE À JOUR DE L'ÉTAT =====
async function updateState() {
  try {
    const state = await chrome.runtime.sendMessage({ action: 'getState' });
    
    if (state.isRecording) {
      setRecordingUI();
    } else if (state.isPlaying) {
      setPlayingUI();
    } else {
      setIdleUI();
    }
    
    if (state.commands) {
      currentCommands = state.commands;
      renderCommands();
    }
  } catch (e) {
    console.error('Error getting state:', e);
  }
}

// ===== UI STATES =====
function setIdleUI() {
  elements.recordBtn.disabled = false;
  elements.recordBtn.classList.remove('recording');
  elements.stopBtn.disabled = true;
  elements.playBtn.disabled = currentCommands.length === 0;
  elements.clearBtn.disabled = currentCommands.length === 0;
  elements.saveBtn.disabled = currentCommands.length === 0;
  elements.exportBtn.disabled = currentCommands.length === 0;
  
  elements.status.className = 'status';
  elements.status.innerHTML = '<span class="status-icon">⏸️</span><span class="status-text">Prêt à enregistrer</span>';
}

function setRecordingUI() {
  elements.recordBtn.disabled = true;
  elements.recordBtn.classList.add('recording');
  elements.stopBtn.disabled = false;
  elements.playBtn.disabled = true;
  elements.clearBtn.disabled = true;
  elements.saveBtn.disabled = true;
  elements.exportBtn.disabled = true;
  
  elements.status.className = 'status recording';
  elements.status.innerHTML = '<span class="status-icon">🔴</span><span class="status-text">Enregistrement en cours...</span>';
}

function setPlayingUI() {
  elements.recordBtn.disabled = true;
  elements.stopBtn.disabled = false;
  elements.playBtn.disabled = true;
  elements.clearBtn.disabled = true;
  elements.saveBtn.disabled = true;
  elements.exportBtn.disabled = true;
  
  elements.status.className = 'status playing';
  elements.status.innerHTML = '<span class="status-icon">▶️</span><span class="status-text">Lecture en cours...</span>';
}

function updatePlaybackProgress(current, total) {
  elements.status.innerHTML = `<span class="status-icon">▶️</span><span class="status-text">Lecture: ${current}/${total}</span>`;
}

// ===== ENREGISTREMENT =====
async function startRecording() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      alert('Impossible d\'enregistrer sur cette page.\nVeuillez ouvrir un site web.');
      return;
    }
    
    const settings = getSettings();
    
    const response = await chrome.runtime.sendMessage({ 
      action: 'startRecording',
      tabId: tab.id,
      settings: settings
    });
    
    if (response.success) {
      setRecordingUI();
      currentCommands = [];
      renderCommands();
      
      // Mettre à jour après un délai pour récupérer la commande 'open'
      setTimeout(async () => {
        const state = await chrome.runtime.sendMessage({ action: 'getCommands' });
        if (state.commands) {
          currentCommands = state.commands;
          renderCommands();
        }
      }, 500);
    }
  } catch (e) {
    console.error('Error starting recording:', e);
    alert('Erreur: ' + e.message);
  }
}

async function stopRecording() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'stopRecording' });
    
    if (response.success && response.commands) {
      currentCommands = response.commands;
    }
    
    setIdleUI();
    renderCommands();
  } catch (e) {
    console.error('Error stopping recording:', e);
  }
}

// ===== LECTURE =====
async function startPlayback() {
  if (currentCommands.length === 0) return;
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab) {
      alert('Aucun onglet actif trouvé.');
      return;
    }
    
    const response = await chrome.runtime.sendMessage({
      action: 'startPlaying',
      commands: currentCommands,
      tabId: tab.id
    });
    
    if (response.success) {
      setPlayingUI();
    }
  } catch (e) {
    console.error('Error starting playback:', e);
    alert('Erreur: ' + e.message);
  }
}

// ===== RENDU DES COMMANDES =====
function renderCommands() {
  elements.commandCount.textContent = currentCommands.length;
  
  if (currentCommands.length === 0) {
    elements.commandsList.innerHTML = '<p class="empty-state">Cliquez sur "Enregistrer" pour commencer</p>';
    return;
  }
  
  elements.commandsList.innerHTML = currentCommands.map((cmd, index) => {
    const targetShort = shortenSelector(cmd.Target);
    let typeClass = cmd.Command;
    if (cmd.Command.startsWith('wait')) typeClass = 'wait';
    if (cmd.Command === 'selectNgOption') typeClass = 'select';
    
    return `
      <div class="command-item" data-index="${index}">
        <span class="command-index">${index + 1}</span>
        <span class="command-type ${typeClass}">${cmd.Command}</span>
        <span class="command-target" title="${escapeHtml(cmd.Target)}">${escapeHtml(targetShort)}</span>
        ${cmd.Value ? `<span class="command-value" title="${escapeHtml(cmd.Value)}">${escapeHtml(cmd.Value.substring(0, 15))}</span>` : ''}
        <div class="command-actions">
          <button class="cmd-btn edit" title="Modifier" data-index="${index}">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button class="cmd-btn delete" title="Supprimer" data-index="${index}">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  }).join('');
  
  // Event listeners pour édition/suppression
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
}

function shortenSelector(selector) {
  if (!selector) return '';
  
  if (selector.startsWith('id=')) {
    return selector;
  }
  
  if (selector.startsWith('xpath=')) {
    const xpath = selector.substring(6);
    // Extraire le dernier élément significatif
    if (xpath.includes('@id=')) {
      const match = xpath.match(/@id="([^"]+)"/);
      if (match) return `xpath=...[@id="${match[1]}"]...`;
    }
    if (xpath.length > 40) {
      return 'xpath=...' + xpath.substring(xpath.length - 35);
    }
    return selector;
  }
  
  if (selector.startsWith('css=')) {
    const css = selector.substring(4);
    if (css.length > 40) {
      return 'css=...' + css.substring(css.length - 35);
    }
    return selector;
  }
  
  return selector.length > 40 ? '...' + selector.substring(selector.length - 35) : selector;
}

// ===== ÉDITION =====
function openEditModal(index) {
  editingIndex = index;
  const cmd = currentCommands[index];
  
  elements.editCommand.value = cmd.Command;
  elements.editTarget.value = cmd.Target;
  elements.editValue.value = cmd.Value || '';
  elements.editDescription.value = cmd.Description || '';
  
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
}

// ===== SAUVEGARDE =====
function openSaveModal() {
  elements.scenarioName.value = `Scénario ${savedScenarios.length + 1}`;
  elements.saveModal.hidden = false;
  elements.scenarioName.focus();
  elements.scenarioName.select();
}

async function saveScenario() {
  const name = elements.scenarioName.value.trim();
  if (!name) {
    alert('Veuillez entrer un nom.');
    return;
  }
  
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
  
  // Passer à l'onglet Scénarios
  elements.tabs.forEach(t => t.classList.remove('active'));
  elements.tabContents.forEach(c => c.classList.remove('active'));
  document.querySelector('[data-tab="scenarios"]').classList.add('active');
  document.getElementById('tab-scenarios').classList.add('active');
}

// ===== SCÉNARIOS =====
function renderScenarios() {
  if (savedScenarios.length === 0) {
    elements.scenariosList.innerHTML = '<p class="empty-state">Aucun scénario sauvegardé</p>';
    return;
  }
  
  elements.scenariosList.innerHTML = savedScenarios.map((scenario, index) => `
    <div class="scenario-item" data-index="${index}">
      <div class="scenario-info">
        <h4>${escapeHtml(scenario.Name)}</h4>
        <span class="scenario-meta">${scenario.Commands.length} commandes • ${scenario.CreationDate}</span>
      </div>
      <div class="scenario-actions">
        <button class="scenario-btn play" data-index="${index}" title="Rejouer">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
            <polygon points="8,5 19,12 8,19"/>
          </svg>
        </button>
        <button class="scenario-btn export" data-index="${index}" title="Exporter">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </button>
        <button class="scenario-btn delete" data-index="${index}" title="Supprimer">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      </div>
    </div>
  `).join('');
  
  // Event listeners
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

async function playScenario(index) {
  const scenario = savedScenarios[index];
  if (!scenario) return;
  
  currentCommands = scenario.Commands;
  renderCommands();
  
  // Passer à l'onglet Enregistrer et lancer la lecture
  elements.tabs.forEach(t => t.classList.remove('active'));
  elements.tabContents.forEach(c => c.classList.remove('active'));
  document.querySelector('[data-tab="record"]').classList.add('active');
  document.getElementById('tab-record').classList.add('active');
  
  await startPlayback();
}

function exportScenario(index) {
  const scenario = savedScenarios[index];
  downloadJSON(scenario, `${scenario.Name.replace(/\s+/g, '-')}.json`);
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
  
  const scenario = {
    Name: 'Exported Scenario',
    CreationDate: new Date().toISOString().split('T')[0],
    Commands: currentCommands
  };
  
  downloadJSON(scenario, `form-recorder-${Date.now()}.json`);
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
    
    // Support format UI.Vision et notre format
    if (data.Commands && Array.isArray(data.Commands)) {
      currentCommands = data.Commands.map(cmd => ({
        Command: cmd.Command,
        Target: cmd.Target,
        Value: cmd.Value || '',
        Targets: cmd.Targets || [],
        Description: cmd.Description || ''
      }));
    } else if (data.actions && Array.isArray(data.actions)) {
      // Ancien format
      currentCommands = data.actions.map(action => ({
        Command: action.type === 'input' ? 'type' : action.type,
        Target: action.selector,
        Value: action.value || '',
        Targets: [],
        Description: ''
      }));
    } else {
      throw new Error('Format non reconnu');
    }
    
    renderCommands();
    setIdleUI();
    alert(`Importé: ${currentCommands.length} commandes`);
  } catch (e) {
    console.error('Import error:', e);
    alert('Erreur lors de l\'import: ' + e.message);
  }
  
  elements.importInput.value = '';
}

// ===== STORAGE =====
async function loadSavedScenarios() {
  try {
    const result = await chrome.storage.local.get(['scenarios']);
    savedScenarios = result.scenarios || [];
  } catch (e) {
    console.error('Error loading scenarios:', e);
    savedScenarios = [];
  }
}

async function saveScenariosToStorage() {
  try {
    await chrome.storage.local.set({ scenarios: savedScenarios });
  } catch (e) {
    console.error('Error saving scenarios:', e);
  }
}

// ===== SETTINGS =====
function loadSettings() {
  chrome.storage.local.get(['settings'], (result) => {
    const settings = result.settings || {};
    elements.recordOpenCommand.checked = settings.recordOpenCommand !== false;
    elements.defaultWait.value = settings.defaultWait || 1000;
    elements.typeDelay.value = settings.typeDelay || 30;
    elements.waitTimeout.value = settings.waitTimeout || 10000;
    elements.highlightElements.checked = settings.highlightElements !== false;
    elements.smartWait.checked = settings.smartWait !== false;
  });
}

function getSettings() {
  return {
    recordOpenCommand: elements.recordOpenCommand.checked,
    defaultWait: parseInt(elements.defaultWait.value) || 1000,
    typeDelay: parseInt(elements.typeDelay.value) || 30,
    waitTimeout: parseInt(elements.waitTimeout.value) || 10000,
    highlightElements: elements.highlightElements.checked,
    smartWait: elements.smartWait.checked
  };
}

function saveSettings() {
  const settings = getSettings();
  chrome.storage.local.set({ settings });
  chrome.runtime.sendMessage({ action: 'updateSettings', settings });
}

// ===== UTILITAIRES =====
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
