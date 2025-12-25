// Form Recorder Pro v3.0 - Popup Script

(async function() {
  'use strict';

  // === VARIABLES GLOBALES ===
  
  let currentTab = null;
  let isRecording = false;
  let currentScenario = null;
  let selectedScenarios = new Set();
  let folders = [];
  let scenarios = [];
  let settings = {
    highlightElements: true,
    respectTiming: true,
    stopOnError: false,
    defaultDelay: 300,
    maxDelay: 5000,
    waitTimeout: 10000,
    typeDelay: 50,
    retryAttempts: 3,
    retryDelay: 500
  };

  // === INITIALISATION ===

  async function init() {
    try {
      // Initialiser le storage
      await storage.init();
      
      // Charger les param\u00e8tres
      await loadSettings();
      
      // R\u00e9cup\u00e9rer l'onglet actuel
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      currentTab = tabs[0];
      
      // Charger les donn\u00e9es
      await refreshData();
      
      // Initialiser les \u00e9couteurs d'\u00e9v\u00e9nements
      setupEventListeners();
      
      // V\u00e9rifier l'\u00e9tat d'enregistrement
      await checkRecordingState();
      
      console.log('[FR Popup] Initialized');
    } catch (error) {
      console.error('[FR Popup] Init error:', error);
      showToast('Erreur d\\'initialisation', 'error');
    }
  }

  async function loadSettings() {
    const savedSettings = await storage.getSetting('playbackSettings');
    if (savedSettings) {
      settings = { ...settings, ...savedSettings };
    }
    updateSettingsUI();
  }

  async function refreshData() {
    try {
      folders = await storage.getAllFolders();
      scenarios = await storage.getAllScenarios();
      renderTree();
    } catch (error) {
      console.error('[FR Popup] Error refreshing data:', error);
      showToast('Erreur de chargement', 'error');
    }
  }

  async function checkRecordingState() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getRecordingState' });
      if (response && response.isRecording) {
        isRecording = true;
        currentScenario = response.scenario;
        updateRecordingUI(true);
      }
    } catch (error) {
      console.error('[FR Popup] Error checking recording state:', error);
    }
  }

  // === GESTION DES ONGLETS ===

  function setupEventListeners() {
    // Navigation par onglets
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    // Enregistrement
    document.getElementById('startRecordBtn').addEventListener('click', startRecording);
    document.getElementById('stopRecordBtn').addEventListener('click', stopRecording);

    // Dossiers
    document.getElementById('newFolderBtn').addEventListener('click', createFolder);
    document.getElementById('refreshBtn').addEventListener('click', refreshData);

    // Recherche
    document.getElementById('searchInput').addEventListener('input', handleSearch);

    // Actions groupies
    document.getElementById('playGroupBtn').addEventListener('click', showPlayGroupModal);
    document.getElementById('deleteGroupBtn').addEventListener('click', deleteSelectedScenarios);

    // Param\u00e8tres
    document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
    document.getElementById('resetSettingsBtn').addEventListener('click', resetSettings);

    // Export/Import
    document.getElementById('exportAllBtn').addEventListener('click', exportAll);
    document.getElementById('importBtn').addEventListener('click', () => {
      document.getElementById('importFileInput').click();
    });
    document.getElementById('importFileInput').addEventListener('change', importData);
    document.getElementById('clearAllBtn').addEventListener('click', clearAll);

    // Modals
    document.getElementById('playModalConfirm').addEventListener('click', confirmPlayScenario);
    document.getElementById('playModalCancel').addEventListener('click', () => {
      hideModal('playModal');
    });
    document.getElementById('playGroupModalConfirm').addEventListener('click', confirmPlayGroup);
    document.getElementById('playGroupModalCancel').addEventListener('click', () => {
      hideModal('playGroupModal');
    });
  }

  function switchTab(tabName) {
    // Mettre \u00e0 jour les boutons d'onglet
    document.querySelectorAll('.tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    // Afficher le contenu correspondant
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('active', content.id === `${tabName}Tab`);
    });
  }

  // === ENREGISTREMENT ===

  async function startRecording() {
    try {
      const scenarioName = document.getElementById('scenarioNameInput').value.trim() ||
                          `Sc\u00e9nario ${new Date().toLocaleString('fr-FR')}`;
      
      // D\u00e9marrer l'enregistrement dans le content script
      await chrome.tabs.sendMessage(currentTab.id, {
        action: 'startRecording',
        settings: settings
      });
      
      // Notifier le background
      await chrome.runtime.sendMessage({
        action: 'startRecording',
        name: scenarioName
      });
      
      isRecording = true;
      updateRecordingUI(true);
      showToast('Enregistrement d\u00e9marr\u00e9', 'success');
    } catch (error) {
      console.error('[FR Popup] Error starting recording:', error);
      showToast('Erreur de d\u00e9marrage', 'error');
    }
  }

  async function stopRecording() {
    try {
      // Arr\u00eater l'enregistrement dans le content script
      await chrome.tabs.sendMessage(currentTab.id, {
        action: 'stopRecording'
      });
      
      // R\u00e9cup\u00e9rer le sc\u00e9nario depuis le background
      const response = await chrome.runtime.sendMessage({
        action: 'stopRecording'
      });
      
      if (response.success && response.scenario) {
        // Enregistrer le sc\u00e9nario
        const scenario = response.scenario;
        scenario.folderId = 'root'; // Par d\u00e9faut dans la racine
        await storage.saveScenario(scenario);
        
        showToast(`Sc\u00e9nario "${scenario.name}" enregistr\u00e9 (${scenario.commands.length} actions)`, 'success');
        
        // Rafra\u00eechir l'affichage
        await refreshData();
      }
      
      isRecording = false;
      updateRecordingUI(false);
    } catch (error) {
      console.error('[FR Popup] Error stopping recording:', error);
      showToast('Erreur d\\'arr\u00eat', 'error');
    }
  }

  function updateRecordingUI(recording) {
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    const startBtn = document.getElementById('startRecordBtn');
    const stopBtn = document.getElementById('stopRecordBtn');
    const scenarioNameSection = document.getElementById('scenarioNameSection');

    if (recording) {
      statusDot.classList.add('recording');
      statusText.textContent = 'Enregistrement en cours...';
      startBtn.style.display = 'none';
      stopBtn.style.display = 'flex';
      scenarioNameSection.style.display = 'none';
    } else {
      statusDot.classList.remove('recording');
      statusDot.classList.add('ready');
      statusText.textContent = 'Pr\u00eat';
      startBtn.style.display = 'flex';
      stopBtn.style.display = 'none';
      scenarioNameSection.style.display = 'block';
    }
  }

  // === ARBORESCENCE DES SC\u00c9NARIOS ===

  function renderTree() {
    const container = document.getElementById('treeContainer');
    container.innerHTML = '';

    if (scenarios.length === 0 && folders.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">\ud83d\udcc1</div>
          <div class="empty-state-text">
            Aucun sc\u00e9nario enregistr\u00e9.<br>
            Cliquez sur "D\u00e9marrer l'enregistrement" pour commencer.
          </div>
        </div>
      `;
      return;
    }

    // Construire l'arborescence
    const tree = buildTree('root');
    container.appendChild(tree);
  }

  function buildTree(parentId, depth = 0) {
    const container = document.createElement('div');
    if (depth > 0) {
      container.className = 'tree-children';
    }

    // Afficher les dossiers
    const childFolders = folders.filter(f => f.parentId === parentId);
    childFolders.sort((a, b) => a.name.localeCompare(b.name));

    for (const folder of childFolders) {
      const folderElement = createFolderElement(folder, depth);
      container.appendChild(folderElement);
      
      // Ajouter les enfants r\u00e9cursivement
      const children = buildTree(folder.id, depth + 1);
      if (children.children.length > 0) {
        container.appendChild(children);
      }
    }

    // Afficher les sc\u00e9narios
    const childScenarios = scenarios.filter(s => s.folderId === parentId);
    childScenarios.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    for (const scenario of childScenarios) {
      const scenarioElement = createScenarioElement(scenario);
      container.appendChild(scenarioElement);
    }

    return container;
  }

  function createFolderElement(folder) {
    const div = document.createElement('div');
    div.className = 'tree-item folder';
    div.dataset.folderId = folder.id;
    
    div.innerHTML = `
      <div class="tree-item-left">
        <span class="tree-item-icon">\u25b6</span>
        <span class="tree-item-name">${escapeHtml(folder.name)}</span>
      </div>
      <div class="tree-item-actions">
        <button class="tree-item-action play" title="Lancer tous">\u25b6</button>
        <button class="tree-item-action edit" title="Renommer">\u270f\ufe0f</button>
        <button class="tree-item-action delete" title="Supprimer">\ud83d\uddd1\ufe0f</button>
      </div>
    `;

    // Toggle expand/collapse
    div.querySelector('.tree-item-left').addEventListener('click', () => {
      div.classList.toggle('expanded');
      const children = div.nextElementSibling;
      if (children && children.classList.contains('tree-children')) {
        children.style.display = children.style.display === 'none' ? 'block' : 'none';
      }
    });

    // Actions
    div.querySelector('.play').addEventListener('click', (e) => {
      e.stopPropagation();
      playFolderScenarios(folder.id);
    });

    div.querySelector('.edit').addEventListener('click', (e) => {
      e.stopPropagation();
      renameFolder(folder);
    });

    div.querySelector('.delete').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteFolder(folder.id);
    });

    return div;
  }

  function createScenarioElement(scenario) {
    const div = document.createElement('div');
    div.className = 'tree-item';
    div.dataset.scenarioId = scenario.id;
    
    const isSelected = selectedScenarios.has(scenario.id);
    if (isSelected) {
      div.classList.add('selected');
    }
    
    const commandCount = scenario.commands?.length || 0;
    const date = new Date(scenario.createdAt).toLocaleDateString('fr-FR');
    
    div.innerHTML = `
      <div class="tree-item-left">
        <input type="checkbox" class="tree-item-checkbox" ${isSelected ? 'checked' : ''}>
        <span class="tree-item-icon">\ud83c\udfa5</span>
        <span class="tree-item-name" title="${escapeHtml(scenario.name)}">${escapeHtml(scenario.name)}</span>
        <span style="font-size: 11px; color: #999; margin-left: 8px;">${commandCount} actions</span>
      </div>
      <div class="tree-item-actions">
        <button class="tree-item-action play" title="Lancer">\u25b6</button>
        <button class="tree-item-action edit" title="Modifier">\u270f\ufe0f</button>
        <button class="tree-item-action delete" title="Supprimer">\ud83d\uddd1\ufe0f</button>
      </div>
    `;

    // S\u00e9lection multiple
    const checkbox = div.querySelector('.tree-item-checkbox');
    checkbox.addEventListener('change', (e) => {
      e.stopPropagation();
      if (checkbox.checked) {
        selectedScenarios.add(scenario.id);
        div.classList.add('selected');
      } else {
        selectedScenarios.delete(scenario.id);
        div.classList.remove('selected');
      }
      updateGroupActions();
    });

    // Actions
    div.querySelector('.play').addEventListener('click', (e) => {
      e.stopPropagation();
      showPlayModal(scenario);
    });

    div.querySelector('.edit').addEventListener('click', (e) => {
      e.stopPropagation();
      editScenario(scenario);
    });

    div.querySelector('.delete').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteScenario(scenario.id);
    });

    return div;
  }

  function updateGroupActions() {
    const groupActions = document.getElementById('groupActions');
    const groupCount = document.getElementById('groupCount');
    
    if (selectedScenarios.size > 0) {
      groupActions.style.display = 'flex';
      groupCount.textContent = `${selectedScenarios.size} s\u00e9lectionn\u00e9${selectedScenarios.size > 1 ? 's' : ''}`;
    } else {
      groupActions.style.display = 'none';
    }
  }

  function handleSearch(event) {
    const query = event.target.value.toLowerCase().trim();
    const items = document.querySelectorAll('.tree-item');
    
    items.forEach(item => {
      const name = item.querySelector('.tree-item-name')?.textContent.toLowerCase() || '';
      const matches = name.includes(query);
      item.style.display = matches || query === '' ? 'flex' : 'none';
    });
  }

  // === GESTION DES DOSSIERS ===

  async function createFolder() {
    const name = prompt('Nom du nouveau dossier :');
    if (!name || !name.trim()) return;

    try {
      await storage.createFolder(name.trim(), 'root');
      showToast('Dossier cr\u00e9\u00e9', 'success');
      await refreshData();
    } catch (error) {
      console.error('[FR Popup] Error creating folder:', error);
      showToast('Erreur de cr\u00e9ation', 'error');
    }
  }

  async function renameFolder(folder) {
    const newName = prompt('Nouveau nom :', folder.name);
    if (!newName || !newName.trim() || newName === folder.name) return;

    try {
      folder.name = newName.trim();
      await storage.updateFolder(folder);
      showToast('Dossier renomm\u00e9', 'success');
      await refreshData();
    } catch (error) {
      console.error('[FR Popup] Error renaming folder:', error);
      showToast('Erreur de renommage', 'error');
    }
  }

  async function deleteFolder(folderId) {
    if (!confirm('Supprimer ce dossier ? Les sc\u00e9narios seront d\u00e9plac\u00e9s vers le dossier parent.')) return;

    try {
      await storage.deleteFolder(folderId);
      showToast('Dossier supprim\u00e9', 'success');
      await refreshData();
    } catch (error) {
      console.error('[FR Popup] Error deleting folder:', error);
      showToast('Erreur de suppression', 'error');
    }
  }

  async function playFolderScenarios(folderId) {
    const folderScenarios = scenarios.filter(s => s.folderId === folderId);
    if (folderScenarios.length === 0) {
      showToast('Aucun sc\u00e9nario dans ce dossier', 'warning');
      return;
    }

    selectedScenarios.clear();
    folderScenarios.forEach(s => selectedScenarios.add(s.id));
    updateGroupActions();
    showPlayGroupModal();
  }

  // === GESTION DES SC\u00c9NARIOS ===

  function showPlayModal(scenario) {
    document.getElementById('playScenarioName').textContent = scenario.name;
    document.getElementById('playModal').dataset.scenarioId = scenario.id;
    showModal('playModal');
  }

  async function confirmPlayScenario() {
    const scenarioId = document.getElementById('playModal').dataset.scenarioId;
    const mode = document.querySelector('input[name="playMode"]:checked').value;
    
    hideModal('playModal');

    try {
      const scenario = await storage.getScenario(scenarioId);
      if (!scenario) {
        showToast('Sc\u00e9nario introuvable', 'error');
        return;
      }

      if (mode === 'new') {
        // Ouvrir nouvel onglet
        const newTab = await chrome.tabs.create({ url: scenario.metadata.url });
        setTimeout(async () => {
          await playScenario(scenario, newTab.id);
        }, 2000);
      } else {
        // Onglet actuel
        await playScenario(scenario, currentTab.id);
      }
    } catch (error) {
      console.error('[FR Popup] Error playing scenario:', error);
      showToast('Erreur de lecture', 'error');
    }
  }

  async function playScenario(scenario, tabId) {
    try {
      showToast(`Lecture de "${scenario.name}"...`, 'success');

      const response = await chrome.runtime.sendMessage({
        action: 'playScenario',
        scenario: scenario,
        settings: settings,
        tabId: tabId
      });

      if (response.success) {
        const stats = response.stats;
        showToast(
          `Termin\u00e9 : ${stats.success}/${stats.total} actions r\u00e9ussies`,
          stats.failed > 0 ? 'warning' : 'success'
        );
      } else {
        showToast('Erreur lors de la lecture', 'error');
      }
    } catch (error) {
      console.error('[FR Popup] Error playing scenario:', error);
      showToast('Erreur de lecture', 'error');
    }
  }

  function showPlayGroupModal() {
    const count = selectedScenarios.size;
    document.getElementById('playGroupCount').textContent = 
      `${count} sc\u00e9nario${count > 1 ? 's' : ''} s\u00e9lectionn\u00e9${count > 1 ? 's' : ''}`;
    showModal('playGroupModal');
  }

  async function confirmPlayGroup() {
    const mode = document.querySelector('input[name="groupPlayMode"]:checked').value;
    hideModal('playGroupModal');

    try {
      const selectedScenariosList = [];
      for (const id of selectedScenarios) {
        const scenario = await storage.getScenario(id);
        if (scenario) selectedScenariosList.push(scenario);
      }

      if (selectedScenariosList.length === 0) {
        showToast('Aucun sc\u00e9nario \u00e0 lancer', 'warning');
        return;
      }

      showToast(`Lancement de ${selectedScenariosList.length} sc\u00e9narios...`, 'success');

      const response = await chrome.runtime.sendMessage({
        action: 'playScenarioGroup',
        scenarios: selectedScenariosList,
        settings: settings,
        mode: mode
      });

      if (response.success) {
        const successCount = response.results.filter(r => r.success).length;
        showToast(
          `Termin\u00e9 : ${successCount}/${selectedScenariosList.length} sc\u00e9narios r\u00e9ussis`,
          successCount === selectedScenariosList.length ? 'success' : 'warning'
        );
      }

      // R\u00e9initialiser la s\u00e9lection
      selectedScenarios.clear();
      updateGroupActions();
      await refreshData();
    } catch (error) {
      console.error('[FR Popup] Error playing group:', error);
      showToast('Erreur de lecture de groupe', 'error');
    }
  }

  async function editScenario(scenario) {
    const newName = prompt('Nouveau nom :', scenario.name);
    if (!newName || !newName.trim() || newName === scenario.name) return;

    try {
      scenario.name = newName.trim();
      await storage.saveScenario(scenario);
      showToast('Sc\u00e9nario renomm\u00e9', 'success');
      await refreshData();
    } catch (error) {
      console.error('[FR Popup] Error editing scenario:', error);
      showToast('Erreur de modification', 'error');
    }
  }

  async function deleteScenario(scenarioId) {
    if (!confirm('Supprimer ce sc\u00e9nario ?')) return;

    try {
      await storage.deleteScenario(scenarioId);
      selectedScenarios.delete(scenarioId);
      updateGroupActions();
      showToast('Sc\u00e9nario supprim\u00e9', 'success');
      await refreshData();
    } catch (error) {
      console.error('[FR Popup] Error deleting scenario:', error);
      showToast('Erreur de suppression', 'error');
    }
  }

  async function deleteSelectedScenarios() {
    if (selectedScenarios.size === 0) return;
    if (!confirm(`Supprimer ${selectedScenarios.size} sc\u00e9nario(s) ?`)) return;

    try {
      for (const id of selectedScenarios) {
        await storage.deleteScenario(id);
      }
      selectedScenarios.clear();
      updateGroupActions();
      showToast('Sc\u00e9narios supprim\u00e9s', 'success');
      await refreshData();
    } catch (error) {
      console.error('[FR Popup] Error deleting scenarios:', error);
      showToast('Erreur de suppression', 'error');
    }
  }

  // === PARAM\u00c8TRES ===

  function updateSettingsUI() {
    document.getElementById('settingHighlight').checked = settings.highlightElements;
    document.getElementById('settingRespectTiming').checked = settings.respectTiming;
    document.getElementById('settingStopOnError').checked = settings.stopOnError;
    document.getElementById('settingDefaultDelay').value = settings.defaultDelay;
    document.getElementById('settingMaxDelay').value = settings.maxDelay;
    document.getElementById('settingWaitTimeout').value = settings.waitTimeout;
    document.getElementById('settingTypeDelay').value = settings.typeDelay;
    document.getElementById('settingRetryAttempts').value = settings.retryAttempts;
    document.getElementById('settingRetryDelay').value = settings.retryDelay;
  }

  async function saveSettings() {
    settings = {
      highlightElements: document.getElementById('settingHighlight').checked,
      respectTiming: document.getElementById('settingRespectTiming').checked,
      stopOnError: document.getElementById('settingStopOnError').checked,
      defaultDelay: parseInt(document.getElementById('settingDefaultDelay').value),
      maxDelay: parseInt(document.getElementById('settingMaxDelay').value),
      waitTimeout: parseInt(document.getElementById('settingWaitTimeout').value),
      typeDelay: parseInt(document.getElementById('settingTypeDelay').value),
      retryAttempts: parseInt(document.getElementById('settingRetryAttempts').value),
      retryDelay: parseInt(document.getElementById('settingRetryDelay').value)
    };

    try {
      await storage.setSetting('playbackSettings', settings);
      showToast('Param\u00e8tres enregistr\u00e9s', 'success');
    } catch (error) {
      console.error('[FR Popup] Error saving settings:', error);
      showToast('Erreur de sauvegarde', 'error');
    }
  }

  function resetSettings() {
    if (!confirm('R\u00e9initialiser tous les param\u00e8tres ?')) return;

    settings = {
      highlightElements: true,
      respectTiming: true,
      stopOnError: false,
      defaultDelay: 300,
      maxDelay: 5000,
      waitTimeout: 10000,
      typeDelay: 50,
      retryAttempts: 3,
      retryDelay: 500
    };

    updateSettingsUI();
    saveSettings();
  }

  // === EXPORT/IMPORT ===

  async function exportAll() {
    try {
      const data = await storage.exportAll();
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `form-recorder-export-${Date.now()}.json`;
      a.click();
      
      URL.revokeObjectURL(url);
      showToast('Export r\u00e9ussi', 'success');
    } catch (error) {
      console.error('[FR Popup] Error exporting:', error);
      showToast('Erreur d\\'export', 'error');
    }
  }

  async function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (!data.scenarios || !data.folders) {
        throw new Error('Format invalide');
      }

      await storage.importAll(data);
      showToast(`Import r\u00e9ussi : ${data.scenarios.length} sc\u00e9narios, ${data.folders.length} dossiers`, 'success');
      await refreshData();
    } catch (error) {
      console.error('[FR Popup] Error importing:', error);
      showToast('Erreur d\\'import : ' + error.message, 'error');
    } finally {
      event.target.value = '';
    }
  }

  async function clearAll() {
    if (!confirm('ATTENTION : Cette action supprimera TOUS les sc\u00e9narios et dossiers de mani\u00e8re irr\u00e9versible !')) return;
    if (!confirm('\u00cates-vous VRAIMENT s\u00fbr ?')) return;

    try {
      await storage.clear();
      selectedScenarios.clear();
      showToast('Toutes les donn\u00e9es ont \u00e9t\u00e9 supprim\u00e9es', 'success');
      await refreshData();
    } catch (error) {
      console.error('[FR Popup] Error clearing:', error);
      showToast('Erreur de suppression', 'error');
    }
  }

  // === UTILITAIRES UI ===

  function showModal(modalId) {
    document.getElementById(modalId).style.display = 'flex';
  }

  function hideModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
  }

  function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.style.display = 'block';

    setTimeout(() => {
      toast.style.display = 'none';
    }, 3000);
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // === D\u00c9MARRAGE ===

  init();
})();
