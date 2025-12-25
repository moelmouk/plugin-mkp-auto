// Content Script - Form Recorder Pro v3.0
// Optimisé pour Angular 19 - Mode Debug + Gestion d'erreurs améliorée

(function() {
  'use strict';
  
  if (window.__formRecorderProLoaded) {
    console.log('[FR] Already loaded, skipping...');
    return;
  }
  window.__formRecorderProLoaded = true;

  let isRecording = false;
  let isPlaying = false;
  let recordingIndicator = null;
  let playbackIndicator = null;
  let debugPanel = null;
  let lastInputElement = null;
  let inputDebounceTimer = null;
  let debugLogs = [];
  let settings = {
    recordOpenCommand: true,
    defaultWait: 1000,
    typeDelay: 20,
    highlightElements: true,
    waitTimeout: 10000,
    debugMode: true
  };

  // ===== MODE DEBUG =====

  function debugLog(level, message, data = null) {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = { timestamp, level, message, data };
    debugLogs.push(logEntry);
    
    // Limiter à 100 logs
    if (debugLogs.length > 100) debugLogs.shift();
    
    const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : level === 'success' ? '✅' : 'ℹ️';
    console.log(`[FR ${prefix}] ${message}`, data || '');
    
    if (settings.debugMode && debugPanel) {
      updateDebugPanel();
    }
  }

  function createDebugPanel() {
    if (debugPanel) return;
    
    debugPanel = document.createElement('div');
    debugPanel.id = 'fr-debug-panel';
    debugPanel.innerHTML = `
      <div class="fr-debug-header">
        <span class="fr-debug-title">🔍 Debug Form Recorder</span>
        <div class="fr-debug-controls">
          <button class="fr-debug-btn" id="fr-debug-clear">Clear</button>
          <button class="fr-debug-btn" id="fr-debug-close">×</button>
        </div>
      </div>
      <div class="fr-debug-content" id="fr-debug-content"></div>
    `;
    document.body.appendChild(debugPanel);
    
    document.getElementById('fr-debug-close').addEventListener('click', () => {
      debugPanel.classList.toggle('fr-debug-minimized');
    });
    
    document.getElementById('fr-debug-clear').addEventListener('click', () => {
      debugLogs = [];
      updateDebugPanel();
    });
  }

  function updateDebugPanel() {
    if (!debugPanel) return;
    const content = document.getElementById('fr-debug-content');
    if (!content) return;
    
    content.innerHTML = debugLogs.slice(-20).map(log => {
      const levelClass = log.level === 'error' ? 'fr-log-error' : 
                         log.level === 'warn' ? 'fr-log-warn' : 
                         log.level === 'success' ? 'fr-log-success' : 'fr-log-info';
      const dataStr = log.data ? `<span class="fr-log-data">${JSON.stringify(log.data).substring(0, 100)}</span>` : '';
      return `<div class="fr-log-entry ${levelClass}">
        <span class="fr-log-time">${log.timestamp}</span>
        <span class="fr-log-msg">${log.message}</span>
        ${dataStr}
      </div>`;
    }).join('');
    
    content.scrollTop = content.scrollHeight;
  }

  function removeDebugPanel() {
    if (debugPanel) {
      debugPanel.remove();
      debugPanel = null;
    }
  }

  // ===== VALIDATION DES SÉLECTEURS =====

  function isValidId(id) {
    if (!id || typeof id !== 'string') return false;
    if (id.includes('function') || id.includes('{') || id.includes('}')) return false;
    if (id.includes('return') || id.includes('throw') || id.includes('new ')) return false;
    // Accepter les IDs Angular longs mais rejeter les IDs générés aléatoires courts
    if (/^[a-f0-9]{8,12}-\d+$/i.test(id)) return false;
    return id.length > 2 && id.length < 500;
  }

  function sanitizeSelector(selector) {
    if (!selector) return null;
    if (selector.includes('function') || selector.includes('{')) return null;
    return selector;
  }

  // ===== NORMALISATION DE TEXTE =====

  function normalizeText(text) {
    if (!text) return '';
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  function textsMatch(text1, text2) {
    const n1 = normalizeText(text1);
    const n2 = normalizeText(text2);
    return n1 === n2 || n1.includes(n2) || n2.includes(n1);
  }

  // ===== GÉNÉRATION DE SÉLECTEURS POUR RADIOS/CHECKBOXES =====

  function getRadioCheckboxSelector(element) {
    const type = element.type;
    const value = element.value;
    const name = element.name;
    const id = element.id;

    // Stratégie 1: ID valide (prioritaire pour Angular)
    if (id && isValidId(id)) {
      // Chercher le label associé
      const labelFor = document.querySelector(`label[for="${id}"]`);
      if (labelFor && labelFor.id && isValidId(labelFor.id)) {
        return {
          command: 'click',
          selector: `id=${labelFor.id}`,
          value: labelFor.textContent?.trim() || '',
          alternates: [`id=${id}`, `xpath=//*[@id="${id}"]`]
        };
      }
      return {
        command: 'click',
        selector: `id=${id}`,
        value: '',
        alternates: [`xpath=//*[@id="${id}"]`]
      };
    }

    // Stratégie 2: Composants Angular lb-aon-choice
    const lbChoice = element.closest('lb-aon-choice');
    if (lbChoice) {
      const fcName = lbChoice.getAttribute('formcontrolname');
      const inputId = element.id;
      
      if (inputId && isValidId(inputId)) {
        const label = document.querySelector(`label[for="${inputId}"]`);
        if (label) {
          const labelId = label.id;
          if (labelId && isValidId(labelId)) {
            return {
              command: 'click',
              selector: `id=${labelId}`,
              value: label.textContent?.trim() || '',
              alternates: [`id=${inputId}`, `xpath=//*[@id="${labelId}"]`]
            };
          }
        }
      }
      
      if (fcName) {
        // Trouver l'index de cet input dans le groupe
        const inputs = lbChoice.querySelectorAll(`input[type="${type}"]`);
        const index = Array.from(inputs).indexOf(element);
        return {
          command: 'click',
          selector: `xpath=//lb-aon-choice[@formcontrolname="${fcName}"]//input[@type="${type}"][${index + 1}]`,
          value: fcName,
          alternates: []
        };
      }
    }

    // Stratégie 3: Composants Angular lb-aon-checkbox
    const lbCheckbox = element.closest('lb-aon-checkbox');
    if (lbCheckbox) {
      const fcName = lbCheckbox.getAttribute('formcontrolname');
      const spanId = lbCheckbox.querySelector('span[id]')?.id;
      
      if (spanId && isValidId(spanId)) {
        return {
          command: 'click',
          selector: `id=${spanId}`,
          value: fcName || '',
          alternates: [`xpath=//*[@id="${spanId}"]`]
        };
      }
      
      if (fcName) {
        return {
          command: 'click',
          selector: `xpath=//lb-aon-checkbox[@formcontrolname="${fcName}"]//label`,
          value: fcName,
          alternates: [`xpath=//lb-aon-checkbox[@formcontrolname="${fcName}"]//span`]
        };
      }
    }

    // Stratégie 4: Par name + value
    if (name && value && value !== 'on') {
      return {
        command: 'click',
        selector: `xpath=//input[@type="${type}"][@name="${name}"][@value="${value}"]`,
        value: `${name}:${value}`,
        alternates: []
      };
    }

    // Stratégie 5: Label parent/sibling
    const parentLabel = element.closest('label');
    if (parentLabel) {
      const labelText = parentLabel.textContent?.trim();
      if (labelText && labelText.length < 100) {
        return {
          command: 'click',
          selector: `xpath=//label[contains(normalize-space(.), "${escapeXPathString(labelText.substring(0, 50))}")]//input[@type="${type}"]`,
          value: labelText,
          alternates: []
        };
      }
    }

    return null;
  }

  function escapeXPathString(str) {
    if (!str) return '';
    if (!str.includes("'")) return str;
    if (!str.includes('"')) return str;
    return str.replace(/'/g, "\\'");
  }

  // ===== GÉNÉRATION DE SÉLECTEURS ROBUSTES =====

  function generateAllSelectors(element) {
    const selectors = [];
    
    // 1. ID (prioritaire si valide)
    if (element.id && isValidId(element.id)) {
      selectors.push(`id=${element.id}`);
      selectors.push(`xpath=//*[@id="${element.id}"]`);
    }
    
    // 2. Attributs stables
    const stableSelector = getStableAttributeSelector(element);
    if (stableSelector) selectors.push(stableSelector);
    
    // 3. Contexte formulaire Angular
    const formContextSelector = getFormContextSelector(element);
    if (formContextSelector) selectors.push(formContextSelector);
    
    // 4. XPath relatif
    const xpathRelative = generateRelativeXPath(element);
    if (xpathRelative) selectors.push(`xpath=${xpathRelative}`);
    
    // 5. CSS stable
    const cssSelector = generateStableCssSelector(element);
    if (cssSelector) selectors.push(`css=${cssSelector}`);
    
    return selectors.filter(s => s && !s.includes('function'));
  }

  function getStableAttributeSelector(element) {
    const tag = element.tagName.toLowerCase();
    
    const stableAttrs = [
      'formcontrolname',
      'name', 
      'data-testid',
      'data-cy',
      'aria-label',
      'placeholder',
      'title'
    ];
    
    for (const attr of stableAttrs) {
      const value = element.getAttribute(attr);
      if (value && value.length < 100 && !value.includes('function')) {
        return `xpath=//${tag}[@${attr}="${value}"]`;
      }
    }
    
    return null;
  }

  function getFormContextSelector(element) {
    const formContainers = [
      'lb-aon-input-text',
      'lb-aon-select',
      'lb-aon-checkbox',
      'lb-aon-choice',
      'lb-aon-date-picker',
      'lb-aon-input-email',
      'lb-aon-input-tel-iti',
      'lb-aon-input-zipcode',
      'lb-aon-input-dual'
    ];
    
    for (const containerSelector of formContainers) {
      const container = element.closest(containerSelector);
      if (container) {
        const fcName = container.getAttribute('formcontrolname');
        if (fcName && !fcName.includes('function')) {
          const tag = element.tagName.toLowerCase();
          return `xpath=//${containerSelector}[@formcontrolname="${fcName}"]//${tag}`;
        }
      }
    }
    
    const fcParent = element.closest('[formcontrolname]');
    if (fcParent) {
      const fcName = fcParent.getAttribute('formcontrolname');
      if (fcName && !fcName.includes('function')) {
        const tag = element.tagName.toLowerCase();
        return `xpath=//*[@formcontrolname="${fcName}"]//${tag}`;
      }
    }
    
    return null;
  }

  function generateRelativeXPath(element) {
    let current = element;
    const path = [];
    
    while (current && current !== document.body) {
      const tag = current.tagName.toLowerCase();
      
      // Chercher d'abord un ID valide
      const id = current.id;
      if (id && isValidId(id)) {
        path.unshift(`*[@id="${id}"]`);
        return '//' + path.join('//');
      }
      
      // Puis formcontrolname
      const fcName = current.getAttribute('formcontrolname');
      if (fcName && !fcName.includes('function')) {
        path.unshift(`*[@formcontrolname="${fcName}"]`);
        return '//' + path.join('//');
      }
      
      let selector = tag;
      if (current.parentElement) {
        const siblings = Array.from(current.parentElement.children)
          .filter(e => e.tagName === current.tagName);
        if (siblings.length > 1) {
          const index = siblings.indexOf(current) + 1;
          selector += `[${index}]`;
        }
      }
      path.unshift(selector);
      current = current.parentElement;
      
      if (path.length > 6) break;
    }
    
    return null;
  }

  function generateStableCssSelector(element) {
    const parts = [];
    let current = element;
    let depth = 0;
    
    while (current && current !== document.body && depth < 4) {
      const tag = current.tagName.toLowerCase();
      let selector = tag;
      
      const fcName = current.getAttribute('formcontrolname');
      if (fcName && !fcName.includes('function')) {
        parts.unshift(`[formcontrolname="${fcName}"]`);
        break;
      }
      
      if (current.id && isValidId(current.id)) {
        parts.unshift(`#${CSS.escape(current.id)}`);
        break;
      }
      
      if (current.parentElement) {
        const siblings = Array.from(current.parentElement.children)
          .filter(e => e.tagName === current.tagName);
        if (siblings.length > 1) {
          const index = siblings.indexOf(current) + 1;
          selector += `:nth-of-type(${index})`;
        }
      }
      
      parts.unshift(selector);
      current = current.parentElement;
      depth++;
    }
    
    return parts.length > 0 ? parts.join(' > ') : null;
  }

  function getPrimarySelector(element) {
    // Priorité aux IDs
    if (element.id && isValidId(element.id)) {
      return `id=${element.id}`;
    }
    
    const stable = getStableAttributeSelector(element);
    if (stable) return stable;
    
    const formContext = getFormContextSelector(element);
    if (formContext) return formContext;
    
    const relative = generateRelativeXPath(element);
    if (relative) return `xpath=${relative}`;
    
    return `css=${generateStableCssSelector(element) || element.tagName.toLowerCase()}`;
  }

  // ===== DÉTECTION NG-SELECT =====

  function isNgSelectComponent(element) {
    return element.tagName.toLowerCase() === 'ng-select' ||
           element.closest('ng-select') !== null;
  }

  function getNgSelectInfo(element) {
    const ngSelect = element.tagName.toLowerCase() === 'ng-select' 
      ? element 
      : element.closest('ng-select');
    
    if (!ngSelect) return null;
    
    const id = ngSelect.id;
    const fcName = ngSelect.getAttribute('formcontrolname');
    const placeholder = ngSelect.getAttribute('placeholder');
    const bindLabel = ngSelect.getAttribute('bindlabel');
    
    // Vérifier si c'est un ng-select avec recherche (typeahead)
    const isSearchable = ngSelect.classList.contains('ng-select-searchable') || 
                         ngSelect.querySelector('input[type="text"]') !== null;
    
    let selector = null;
    if (id && isValidId(id)) {
      selector = `id=${id}`;
    } else if (fcName && !fcName.includes('function')) {
      selector = `xpath=//ng-select[@formcontrolname="${fcName}"]`;
    } else if (placeholder) {
      selector = `xpath=//ng-select[@placeholder="${placeholder}"]`;
    }
    
    return {
      element: ngSelect,
      id: id,
      formControlName: fcName,
      placeholder: placeholder,
      bindLabel: bindLabel,
      isSearchable: isSearchable,
      selector: selector
    };
  }

  function getNgOptionText(element) {
    const ngOption = element.closest('.ng-option') || element.closest('ng-option');
    if (ngOption) {
      // Chercher le texte dans différents conteneurs
      const textElements = [
        ngOption.querySelector('.text-span-ref'),
        ngOption.querySelector('.ng-option-label'),
        ngOption.querySelector('span:not(.ng-option-selected)'),
        ngOption
      ];
      
      for (const el of textElements) {
        if (el) {
          const text = el.textContent?.trim();
          if (text && text.length > 0) return text;
        }
      }
    }
    return element.textContent?.trim() || '';
  }

  // ===== ENREGISTREMENT DES ACTIONS =====

  function recordCommand(command, target, value, description, element, extras = {}) {
    if (!isRecording) return;
    
    let cleanTarget = sanitizeSelector(target);
    let targets = [];
    
    if (element) {
      targets = generateAllSelectors(element);
      if (!cleanTarget || cleanTarget.includes('function')) {
        cleanTarget = getPrimarySelector(element);
      }
    }
    
    if (!cleanTarget || cleanTarget.includes('function')) {
      debugLog('warn', 'Sélecteur invalide, commande ignorée');
      return;
    }
    
    debugLog('info', `Recording: ${command}`, { target: cleanTarget.substring(0, 50), value: value?.substring(0, 30) });
    
    chrome.runtime.sendMessage({
      action: 'recordCommand',
      data: {
        command: command,
        target: cleanTarget,
        value: value,
        targets: targets,
        description: description,
        ...extras
      }
    });
  }

  // ===== GESTIONNAIRES D'ÉVÉNEMENTS =====

  function handleClick(event) {
    if (!isRecording) return;
    if (event.target.closest('#fr-indicator') || 
        event.target.closest('#fr-playback-indicator') ||
        event.target.closest('#fr-debug-panel')) return;
    
    const element = event.target;
    const tagName = element.tagName.toLowerCase();
    
    // Pour radio/checkbox, on laisse handleChange gérer
    if (tagName === 'input' && (element.type === 'radio' || element.type === 'checkbox')) {
      return;
    }
    
    // Détecter clic sur option ng-select
    if (element.closest('.ng-option') || element.closest('ng-option') || 
        element.closest('.ng-dropdown-panel')) {
      const optionText = getNgOptionText(element);
      const ngSelect = document.querySelector('ng-select.ng-select-opened');
      
      if (ngSelect && optionText) {
        const ngInfo = getNgSelectInfo(ngSelect);
        const selector = ngInfo?.selector || getPrimarySelector(ngSelect);
        
        recordCommand(
          'selectNgOption',
          selector,
          optionText,
          `Sélection: ${optionText}`,
          ngSelect,
          { optionText: optionText, isSearchable: ngInfo?.isSearchable }
        );
        return;
      }
    }
    
    // Ne pas enregistrer les clics dans ng-select (seulement l'option)
    if (isNgSelectComponent(element)) {
      return;
    }
    
    // Détecter clic sur label de radio/checkbox
    if (tagName === 'label' || element.closest('label')) {
      const label = tagName === 'label' ? element : element.closest('label');
      const forId = label.getAttribute('for');
      
      if (forId) {
        const input = document.getElementById(forId);
        if (input && (input.type === 'radio' || input.type === 'checkbox')) {
          return; // handleChange gérera
        }
      }
      
      const lbChoice = label.closest('lb-aon-choice, lb-aon-checkbox');
      if (lbChoice) {
        return; // handleChange gérera
      }
    }
    
    // Clic normal
    const text = element.textContent?.trim().substring(0, 50) || '';
    recordCommand('click', '', '', text ? `Clic: "${text}"` : '', element);
  }

  function handleInput(event) {
    if (!isRecording) return;
    
    const element = event.target;
    
    if (element.closest('ng-select')) return;
    
    clearTimeout(inputDebounceTimer);
    lastInputElement = element;
    
    inputDebounceTimer = setTimeout(() => {
      if (lastInputElement === element) {
        const value = element.value || '';
        if (value) {
          recordCommand('type', '', value, '', element);
        }
      }
    }, 400);
  }

  function handleChange(event) {
    if (!isRecording) return;
    
    const element = event.target;
    const tagName = element.tagName.toLowerCase();
    
    if (tagName === 'select') {
      const selectedOption = element.options[element.selectedIndex];
      const value = selectedOption ? selectedOption.text : element.value;
      recordCommand('select', '', value, `Sélection: ${value}`, element);
    } else if (element.type === 'checkbox' || element.type === 'radio') {
      const radioInfo = getRadioCheckboxSelector(element);
      
      if (radioInfo) {
        recordCommand(
          radioInfo.command,
          radioInfo.selector,
          radioInfo.value,
          element.type === 'radio' ? `Radio: ${radioInfo.value}` : `Checkbox: ${radioInfo.value}`,
          null,
          { alternates: radioInfo.alternates }
        );
      } else {
        recordCommand('click', '', '', element.type, element);
      }
    }
  }

  // ===== EXÉCUTION DES COMMANDES (REPLAY) =====

  async function findElement(command, timeout = 10000) {
    const startTime = Date.now();
    
    debugLog('info', `Recherche élément: ${command.Command}`, { target: command.Target?.substring(0, 60) });
    
    while (Date.now() - startTime < timeout) {
      // Essayer le sélecteur principal
      let element = findElementBySelector(command.Target);
      if (element && isElementVisible(element)) {
        debugLog('success', 'Élément trouvé avec sélecteur principal');
        return element;
      }
      
      // Essayer les sélecteurs alternatifs
      if (command.Targets && command.Targets.length > 0) {
        for (const selector of command.Targets) {
          element = findElementBySelector(selector);
          if (element && isElementVisible(element)) {
            debugLog('success', `Élément trouvé avec fallback: ${selector.substring(0, 40)}`);
            return element;
          }
        }
      }
      
      // Essayer les alternates
      if (command.alternates && command.alternates.length > 0) {
        for (const selector of command.alternates) {
          element = findElementBySelector(selector);
          if (element && isElementVisible(element)) {
            debugLog('success', `Élément trouvé avec alternate: ${selector.substring(0, 40)}`);
            return element;
          }
        }
      }
      
      await sleep(200);
    }
    
    debugLog('error', `Élément non trouvé après ${timeout}ms`, { target: command.Target });
    return null;
  }

  function isElementVisible(element) {
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && 
           style.visibility !== 'hidden' && 
           style.display !== 'none' &&
           style.opacity !== '0';
  }

  function findElementBySelector(selector) {
    if (!selector || typeof selector !== 'string') return null;
    if (selector.includes('function') || selector.includes('{')) return null;
    
    try {
      if (selector.startsWith('id=')) {
        const id = selector.substring(3);
        return document.getElementById(id);
      }
      
      if (selector.startsWith('xpath=')) {
        const xpath = selector.substring(6);
        if (xpath.includes('function')) return null;
        const result = document.evaluate(
          xpath,
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        );
        return result.singleNodeValue;
      }
      
      if (selector.startsWith('css=')) {
        return document.querySelector(selector.substring(4));
      }
      
      return document.querySelector(selector);
    } catch (e) {
      debugLog('warn', `Erreur sélecteur: ${e.message}`);
      return null;
    }
  }

  async function executeCommand(command, cmdSettings) {
    settings = { ...settings, ...cmdSettings };
    updatePlaybackIndicator(command);
    
    debugLog('info', `Exécution: ${command.Command}`, { value: command.Value?.substring(0, 30) });
    
    try {
      // Commandes spéciales
      if (command.Command === 'selectNgOption') {
        return await executeNgSelectOption(command);
      }
      
      if (command.Command === 'clickLabel' || command.Command === 'clickCheckbox') {
        return await executeClickLabel(command);
      }

      if (command.Command === 'clickRadioByValue') {
        return await executeClickRadioByValue(command);
      }
      
      if (command.Command === 'waitForElementVisible') {
        return await executeWaitForElement(command);
      }
      
      if (command.Command === 'pause') {
        await sleep(parseInt(command.Value) || 1000);
        return true;
      }
      
      if (command.Command === 'typeAndSearch') {
        return await executeTypeAndSearch(command);
      }
      
      const element = await findElement(command, settings.waitTimeout || 10000);
      
      if (!element) {
        debugLog('error', `Élément non trouvé: ${command.Target?.substring(0, 50)}`);
        return false;
      }
      
      if (settings.highlightElements) {
        highlightElement(element);
      }
      
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await sleep(200);
      
      switch (command.Command) {
        case 'click':
          await performClick(element);
          debugLog('success', 'Click effectué');
          break;
        case 'type':
          await performType(element, command.Value);
          debugLog('success', `Type effectué: ${command.Value?.substring(0, 20)}`);
          break;
        case 'select':
          await performSelect(element, command.Value);
          debugLog('success', `Select effectué: ${command.Value}`);
          break;
      }
      
      setTimeout(() => unhighlightElement(element), 300);
      return true;
    } catch (e) {
      debugLog('error', `Erreur exécution: ${e.message}`);
      return false;
    }
  }

  // ===== NOUVELLES COMMANDES =====

  async function executeWaitForElement(command) {
    const timeout = parseInt(command.Value) || 5000;
    const element = await findElement(command, timeout);
    if (element) {
      debugLog('success', 'Élément visible');
      return true;
    }
    debugLog('warn', 'Timeout: élément non visible');
    return false;
  }

  async function executeTypeAndSearch(command) {
    // Pour les ng-select avec recherche
    const ngSelect = await findElement(command, settings.waitTimeout);
    if (!ngSelect) return false;
    
    if (settings.highlightElements) highlightElement(ngSelect);
    ngSelect.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await sleep(200);
    
    // Ouvrir le dropdown
    const container = ngSelect.querySelector('.ng-select-container');
    await performClick(container || ngSelect);
    await sleep(300);
    
    // Trouver et remplir l'input de recherche
    const input = ngSelect.querySelector('input[type="text"], input.ng-input');
    if (input) {
      input.focus();
      await sleep(100);
      
      // Taper le texte de recherche
      const searchText = command.searchText || command.Value.split(' ')[0];
      for (const char of searchText) {
        input.value += char;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        await sleep(50);
      }
      
      await sleep(500); // Attendre les résultats
    }
    
    unhighlightElement(ngSelect);
    return true;
  }

  async function executeClickLabel(command) {
    // Essayer d'abord le sélecteur direct
    let element = await findElement(command, 3000);
    
    if (element) {
      if (settings.highlightElements) highlightElement(element);
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await sleep(200);
      await performClick(element);
      setTimeout(() => unhighlightElement(element), 300);
      debugLog('success', `Label cliqué: ${command.Value?.substring(0, 30)}`);
      return true;
    }
    
    // Recherche par texte du label
    const searchText = command.Value;
    if (searchText) {
      debugLog('info', `Recherche label par texte: "${searchText}"`);
      
      // Chercher dans tous les labels et spans
      const candidates = document.querySelectorAll('label, span.label, span[class*="label"], div[class*="label"], span[class*="radio"], span[class*="checkbox"]');
      
      for (const candidate of candidates) {
        const candidateText = candidate.textContent?.trim();
        if (textsMatch(candidateText, searchText)) {
          if (isElementVisible(candidate)) {
            if (settings.highlightElements) highlightElement(candidate);
            candidate.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await sleep(200);
            await performClick(candidate);
            setTimeout(() => unhighlightElement(candidate), 300);
            debugLog('success', `Label trouvé par texte: "${candidateText?.substring(0, 30)}"`);
            return true;
          }
        }
      }
      
      // Recherche par ID partiel
      const allLabels = document.querySelectorAll('label[id], span[id]');
      for (const label of allLabels) {
        if (label.id.toLowerCase().includes('label') || label.id.includes('_label')) {
          const labelText = label.textContent?.trim();
          if (textsMatch(labelText, searchText) && isElementVisible(label)) {
            if (settings.highlightElements) highlightElement(label);
            label.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await sleep(200);
            await performClick(label);
            setTimeout(() => unhighlightElement(label), 300);
            debugLog('success', `Label trouvé par ID: ${label.id}`);
            return true;
          }
        }
      }
    }
    
    debugLog('error', `Label non trouvé: "${searchText}"`);
    return false;
  }

  async function executeClickRadioByValue(command) {
    let element = await findElement(command, 3000);
    
    if (element) {
      if (settings.highlightElements) highlightElement(element);
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await sleep(200);
      await performClick(element);
      setTimeout(() => unhighlightElement(element), 300);
      debugLog('success', 'Radio/Checkbox cliqué');
      return true;
    }

    const value = command.Value;
    if (value) {
      let searchValue = value;
      let searchName = null;
      
      if (value.includes(':')) {
        const parts = value.split(':');
        searchName = parts[0];
        searchValue = parts[1];
      }

      // Chercher l'input
      let inputs;
      if (searchName) {
        inputs = document.querySelectorAll(`input[name="${searchName}"], input[name*="${searchName}"]`);
      } else {
        inputs = document.querySelectorAll(`input[value="${searchValue}"], input[value*="${searchValue}"]`);
      }

      for (const input of inputs) {
        if (input.type === 'radio' || input.type === 'checkbox') {
          const label = document.querySelector(`label[for="${input.id}"]`) || input.closest('label');
          const target = label || input;
          
          if (isElementVisible(target)) {
            if (settings.highlightElements) highlightElement(target);
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await sleep(200);
            await performClick(target);
            setTimeout(() => unhighlightElement(target), 300);
            debugLog('success', `Radio trouvé par valeur: ${value}`);
            return true;
          }
        }
      }
    }

    debugLog('error', `Radio/Checkbox non trouvé: ${value}`);
    return false;
  }

  async function performClick(element) {
    element.focus();
    await sleep(30);
    
    // Simuler une séquence complète d'événements souris
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const mouseEventInit = {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: centerX,
      clientY: centerY
    };
    
    element.dispatchEvent(new MouseEvent('mouseenter', mouseEventInit));
    await sleep(10);
    element.dispatchEvent(new MouseEvent('mouseover', mouseEventInit));
    await sleep(10);
    element.dispatchEvent(new MouseEvent('mousedown', { ...mouseEventInit, button: 0 }));
    await sleep(30);
    element.dispatchEvent(new MouseEvent('mouseup', { ...mouseEventInit, button: 0 }));
    await sleep(10);
    element.click();
    await sleep(10);
    element.dispatchEvent(new MouseEvent('mouseleave', mouseEventInit));
  }

  async function performType(element, value) {
    element.focus();
    await sleep(50);
    
    // Vider le champ d'abord
    element.value = '';
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    await sleep(50);
    
    // Taper caractère par caractère
    for (const char of value) {
      element.value += char;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));
      element.dispatchEvent(new KeyboardEvent('keypress', { key: char, bubbles: true }));
      element.dispatchEvent(new KeyboardEvent('keyup', { key: char, bubbles: true }));
      await sleep(settings.typeDelay);
    }
    
    // Événements de fin
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  async function performSelect(element, value) {
    if (element.tagName === 'SELECT') {
      const option = Array.from(element.options).find(o => 
        o.text.trim() === value || o.value === value || textsMatch(o.text, value)
      );
      if (option) {
        element.value = option.value;
        element.dispatchEvent(new Event('change', { bubbles: true }));
        debugLog('success', `Option sélectionnée: ${option.text}`);
      } else {
        debugLog('warn', `Option non trouvée: ${value}`);
      }
    }
  }

  async function executeNgSelectOption(command) {
    const optionText = command.Value || command.optionText;
    debugLog('info', `ng-select recherche: "${optionText}"`);
    
    // ===== ÉTAPE 1: Trouver le ng-select =====
    let ngSelect = null;
    
    // Méthode 1: Sélecteur direct
    ngSelect = await findElement(command, 3000);
    
    // Méthode 2: Par ID dans le sélecteur
    if (!ngSelect && command.Target) {
      const idMatch = command.Target.match(/id=([^\s,\]]+)/);
      if (idMatch) {
        ngSelect = document.getElementById(idMatch[1]);
        if (ngSelect) debugLog('info', `ng-select trouvé par ID: ${idMatch[1]}`);
      }
    }
    
    // Méthode 3: Par formcontrolname
    if (!ngSelect && command.Target) {
      const fcMatch = command.Target.match(/formcontrolname="([^"]+)"/);
      if (fcMatch) {
        ngSelect = document.querySelector(`ng-select[formcontrolname="${fcMatch[1]}"]`);
        if (ngSelect) debugLog('info', `ng-select trouvé par formcontrolname: ${fcMatch[1]}`);
      }
    }
    
    // Méthode 4: Par placeholder
    if (!ngSelect && command.Target) {
      const phMatch = command.Target.match(/placeholder="([^"]+)"/);
      if (phMatch) {
        ngSelect = document.querySelector(`ng-select[placeholder="${phMatch[1]}"]`);
        if (ngSelect) debugLog('info', `ng-select trouvé par placeholder: ${phMatch[1]}`);
      }
    }
    
    // Méthode 5: Recherche par contexte CSS
    if (!ngSelect && command.Target && command.Target.startsWith('css=')) {
      const cssSelector = command.Target.substring(4);
      // Extraire le parent et chercher le ng-select
      const parts = cssSelector.split(' > ');
      if (parts.length > 0) {
        const firstPart = parts[0];
        const containers = document.querySelectorAll(firstPart);
        for (const container of containers) {
          const ns = container.querySelector('ng-select') || container.closest('ng-select');
          if (ns && isElementVisible(ns)) {
            ngSelect = ns;
            debugLog('info', 'ng-select trouvé via parent CSS');
            break;
          }
        }
      }
    }
    
    // Méthode 6: Premier ng-select visible sans valeur
    if (!ngSelect) {
      const allNgSelect = document.querySelectorAll('ng-select');
      for (const ns of allNgSelect) {
        if (isElementVisible(ns)) {
          const hasValue = ns.querySelector('.ng-value:not(.ng-placeholder)');
          if (!hasValue) {
            ngSelect = ns;
            debugLog('info', 'ng-select trouvé: premier sans valeur');
            break;
          }
        }
      }
    }

    if (!ngSelect) {
      debugLog('error', 'ng-select non trouvé');
      return false;
    }
    
    // ===== ÉTAPE 2: Ouvrir le dropdown =====
    if (settings.highlightElements) highlightElement(ngSelect);
    ngSelect.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await sleep(300);
    
    // Vérifier si c'est un ng-select avec recherche/autocomplétion
    const isSearchable = ngSelect.classList.contains('ng-select-searchable') ||
                         ngSelect.getAttribute('typeahead') !== null ||
                         command.isSearchable;
    
    const container = ngSelect.querySelector('.ng-select-container');
    const inputElement = ngSelect.querySelector('input');
    
    // Ouvrir le dropdown
    await performClick(container || ngSelect);
    await sleep(300);
    
    // Si c'est un select avec recherche et que l'option contient plusieurs mots,
    // on tape les premières lettres pour filtrer
    if (isSearchable && inputElement && optionText.length > 3) {
      inputElement.focus();
      await sleep(100);
      
      // Taper les 3-5 premiers caractères pour filtrer
      const searchChars = optionText.substring(0, Math.min(5, optionText.length)).toLowerCase();
      debugLog('info', `Recherche dans ng-select: "${searchChars}"`);
      
      for (const char of searchChars) {
        inputElement.value += char;
        inputElement.dispatchEvent(new Event('input', { bubbles: true }));
        await sleep(50);
      }
      
      await sleep(500); // Attendre les résultats de recherche
    }
    
    // Attendre le dropdown
    let dropdown = null;
    for (let i = 0; i < 30; i++) {
      dropdown = document.querySelector('.ng-dropdown-panel');
      if (dropdown && dropdown.offsetHeight > 0) {
        debugLog('info', `Dropdown ouvert après ${(i + 1) * 100}ms`);
        break;
      }
      await sleep(100);
    }
    
    if (!dropdown) {
      debugLog('error', 'Dropdown non ouvert');
      unhighlightElement(ngSelect);
      return false;
    }
    
    await sleep(200);
    
    // ===== ÉTAPE 3: Trouver et cliquer sur l'option =====
    const options = dropdown.querySelectorAll('.ng-option:not(.ng-option-disabled)');
    let targetOption = null;
    
    // Recherche exacte
    for (const opt of options) {
      const text = opt.textContent?.trim();
      if (text === optionText) {
        targetOption = opt;
        debugLog('info', `Option exacte trouvée: "${text}"`);
        break;
      }
    }
    
    // Recherche par correspondance partielle
    if (!targetOption) {
      for (const opt of options) {
        const text = opt.textContent?.trim();
        if (textsMatch(text, optionText)) {
          targetOption = opt;
          debugLog('info', `Option partielle trouvée: "${text}"`);
          break;
        }
      }
    }
    
    // Recherche par ID de l'option
    if (!targetOption && command.Target) {
      // Chercher si l'ID de l'option est spécifié (comme dans UI.Vision)
      const optionIdMatch = command.Target.match(/ng-option[^"]*[@id="([^"]+)"]/) ||
                            command.Target.match(/#([^\s>]+).*ng-option/);
      if (optionIdMatch) {
        const optionById = document.getElementById(optionIdMatch[1]);
        if (optionById) {
          targetOption = optionById.closest('.ng-option') || optionById;
          debugLog('info', `Option trouvée par ID: ${optionIdMatch[1]}`);
        }
      }
    }
    
    if (!targetOption) {
      const availableOptions = Array.from(options).map(o => o.textContent?.trim()).slice(0, 5);
      debugLog('error', `Option non trouvée: "${optionText}"`, { disponibles: availableOptions });
      
      // Fermer le dropdown
      await performClick(container || ngSelect);
      unhighlightElement(ngSelect);
      return false;
    }
    
    // Cliquer sur l'option
    if (settings.highlightElements) highlightElement(targetOption);
    targetOption.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await sleep(150);
    await performClick(targetOption);
    
    await sleep(300);
    unhighlightElement(ngSelect);
    unhighlightElement(targetOption);
    
    debugLog('success', `Option sélectionnée: "${optionText}"`);
    return true;
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function highlightElement(element) {
    if (!element) return;
    element.dataset.frOriginalOutline = element.style.outline;
    element.dataset.frOriginalBoxShadow = element.style.boxShadow;
    element.style.outline = '3px solid #4CAF50';
    element.style.boxShadow = '0 0 10px rgba(76, 175, 80, 0.5)';
  }

  function unhighlightElement(element) {
    if (!element) return;
    element.style.outline = element.dataset.frOriginalOutline || '';
    element.style.boxShadow = element.dataset.frOriginalBoxShadow || '';
  }

  // ===== INDICATEURS VISUELS =====

  function createRecordingIndicator() {
    if (recordingIndicator) return;
    recordingIndicator = document.createElement('div');
    recordingIndicator.id = 'fr-indicator';
    recordingIndicator.innerHTML = '<div class="fr-content"><span class="fr-dot"></span><span class="fr-text">REC</span></div>';
    document.body.appendChild(recordingIndicator);
    
    if (settings.debugMode) {
      createDebugPanel();
    }
  }

  function removeRecordingIndicator() {
    if (recordingIndicator) {
      recordingIndicator.remove();
      recordingIndicator = null;
    }
    removeDebugPanel();
  }

  function createPlaybackIndicator() {
    if (playbackIndicator) return;
    playbackIndicator = document.createElement('div');
    playbackIndicator.id = 'fr-playback-indicator';
    playbackIndicator.innerHTML = `
      <div class="fr-pb-header"><span class="fr-pb-icon">▶</span><span class="fr-pb-title">Lecture</span></div>
      <div class="fr-pb-command"><span class="fr-pb-cmd-type">-</span><span class="fr-pb-cmd-target">-</span></div>
    `;
    document.body.appendChild(playbackIndicator);
    
    if (settings.debugMode) {
      createDebugPanel();
    }
  }

  function updatePlaybackIndicator(command) {
    if (!playbackIndicator) createPlaybackIndicator();
    const cmdType = playbackIndicator.querySelector('.fr-pb-cmd-type');
    const cmdTarget = playbackIndicator.querySelector('.fr-pb-cmd-target');
    if (cmdType) cmdType.textContent = command.Command;
    if (cmdTarget) cmdTarget.textContent = (command.Value || command.Description || '').substring(0, 30);
  }

  function removePlaybackIndicator() {
    if (playbackIndicator) {
      playbackIndicator.remove();
      playbackIndicator = null;
    }
    removeDebugPanel();
  }

  // ===== INITIALISATION =====

  function startRecording() {
    isRecording = true;
    createRecordingIndicator();
    document.addEventListener('click', handleClick, true);
    document.addEventListener('input', handleInput, true);
    document.addEventListener('change', handleChange, true);
    debugLog('success', 'Enregistrement démarré');
  }

  function stopRecording() {
    isRecording = false;
    removeRecordingIndicator();
    document.removeEventListener('click', handleClick, true);
    document.removeEventListener('input', handleInput, true);
    document.removeEventListener('change', handleChange, true);
    debugLog('info', 'Enregistrement arrêté');
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.action) {
      case 'startRecording':
        settings = { ...settings, ...message.settings };
        startRecording();
        sendResponse({ success: true });
        break;
      case 'stopRecording':
        stopRecording();
        sendResponse({ success: true });
        break;
      case 'executeCommand':
        executeCommand(message.command, message.settings)
          .then(result => sendResponse({ success: result }))
          .catch(e => {
            debugLog('error', `Erreur: ${e.message}`);
            sendResponse({ success: false, error: e.message });
          });
        return true;
      case 'showPlaybackIndicator':
        createPlaybackIndicator();
        sendResponse({ success: true });
        break;
      case 'hidePlaybackIndicator':
        removePlaybackIndicator();
        sendResponse({ success: true });
        break;
      case 'ping':
        sendResponse({ success: true, ready: true });
        break;
      case 'toggleDebug':
        settings.debugMode = !settings.debugMode;
        if (settings.debugMode) {
          createDebugPanel();
        } else {
          removeDebugPanel();
        }
        sendResponse({ debugMode: settings.debugMode });
        break;
    }
    return true;
  });

  debugLog('info', 'Form Recorder Pro v3.0 chargé');
})();
