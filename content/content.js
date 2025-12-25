// Form Recorder Pro v3.0 - Content Script
// Script am\u00e9lior\u00e9 avec correction de tous les bugs identifi\u00e9s

(function() {
  'use strict';

  // ===== VARIABLES GLOBALES =====
  
  let isRecording = false;
  let recordingIndicator = null;
  let playbackIndicator = null;
  let inputDebounceTimer = null;
  let lastInputElement = null;
  let lastClickTime = 0;
  let lastClickElement = null;

  let settings = {
    highlightElements: true,
    waitTimeout: 10000,
    typeDelay: 50,
    respectTiming: true,
    maxDelay: 5000,
    defaultDelay: 300,
    stopOnError: false,
    retryAttempts: 3,
    retryDelay: 500
  };

  // ===== VALIDATION ET UTILITAIRES =====

  function isValidId(id) {
    return id && 
           typeof id === 'string' && 
           id.length > 0 && 
           id.length < 150 && 
           !id.includes('function') && 
           !id.includes('{{') &&
           !id.includes('undefined');
  }

  function sanitizeSelector(selector) {
    if (!selector || typeof selector !== 'string') return '';
    return selector.replace(/function\s*\([^)]*\)/g, '').trim();
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function normalizeText(text) {
    if (!text) return '';
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  // ===== CONSTRUCTION DE S\u00c9LECTEURS ROBUSTES =====

  /**
   * G\u00e9n\u00e8re un XPath unique et robuste pour un \u00e9l\u00e9ment
   * Correction du bug: utilise toujours des identifiants uniques
   */
  function buildUniqueXPath(element) {
    if (!element || element === document.body) return null;

    // Strat\u00e9gie 1: ID unique
    if (element.id && isValidId(element.id)) {
      const xpath = `//*[@id="${escapeXPath(element.id)}"]`;
      if (isXPathUnique(xpath)) {
        return xpath;
      }
    }

    // Strat\u00e9gie 2: Attributs stables uniques
    const stableAttrs = ['data-testid', 'data-cy', 'data-test', 'name', 'formcontrolname'];
    for (const attr of stableAttrs) {
      const value = element.getAttribute(attr);
      if (value && !value.includes('function') && value.length < 100) {
        const tagName = element.tagName.toLowerCase();
        let xpath = `//${tagName}[@${attr}="${escapeXPath(value)}"]`;
        
        // V\u00e9rifier l'unicit\u00e9
        if (!isXPathUnique(xpath)) {
          // Ajouter le contexte parent pour rendre unique
          const parent = element.closest('[formcontrolname], [id], [data-testid]');
          if (parent && parent !== element) {
            const parentAttr = parent.getAttribute('formcontrolname') || parent.getAttribute('id') || parent.getAttribute('data-testid');
            const parentAttrName = parent.hasAttribute('formcontrolname') ? 'formcontrolname' : 
                                  parent.hasAttribute('id') ? 'id' : 'data-testid';
            if (parentAttr) {
              xpath = `//*[@${parentAttrName}="${escapeXPath(parentAttr)}"]//${tagName}[@${attr}="${escapeXPath(value)}"]`;
              if (isXPathUnique(xpath)) return xpath;
            }
          }
        } else {
          return xpath;
        }
      }
    }

    // Strat\u00e9gie 3: XPath avec contexte complet
    return buildContextualXPath(element);
  }

  /**
   * Construit un XPath avec contexte hi\u00e9rarchique
   */
  function buildContextualXPath(element) {
    const paths = [];
    let current = element;
    let depth = 0;
    const maxDepth = 6;

    while (current && current !== document.body && depth < maxDepth) {
      const tagName = current.tagName.toLowerCase();
      let part = tagName;

      // Ajouter attributs discriminants
      const fcName = current.getAttribute('formcontrolname');
      if (fcName && !fcName.includes('function')) {
        part += `[@formcontrolname="${escapeXPath(fcName)}"]`;
        paths.unshift(part);
        break; // Suffisamment sp\u00e9cifique
      }

      const id = current.id;
      if (id && isValidId(id)) {
        part += `[@id="${escapeXPath(id)}"]`;
        paths.unshift(part);
        break;
      }

      const name = current.getAttribute('name');
      if (name && name.length < 50) {
        part += `[@name="${escapeXPath(name)}"]`;
      }

      // Ajouter position si n\u00e9cessaire
      const parent = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(
          child => child.tagName === current.tagName
        );
        if (siblings.length > 1) {
          const index = siblings.indexOf(current) + 1;
          part += `[${index}]`;
        }
      }

      paths.unshift(part);
      current = parent;
      depth++;
    }

    return paths.length > 0 ? '//' + paths.join('/') : null;
  }

  /**
   * V\u00e9rifie si un XPath est unique
   */
  function isXPathUnique(xpath) {
    try {
      const result = document.evaluate(
        xpath,
        document,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null
      );
      return result.snapshotLength === 1;
    } catch (e) {
      return false;
    }
  }

  /**
   * \u00c9chappe les caract\u00e8res sp\u00e9ciaux pour XPath
   */
  function escapeXPath(str) {
    if (!str) return '';
    
    // Remplacer les guillemets par des apostrophes
    if (!str.includes("'")) {
      return str;
    }
    
    if (!str.includes('"')) {
      return str;
    }
    
    // Si contient les deux, utiliser concat
    const parts = str.split("'");
    return `concat('${parts.join("', \"'\", '")}')`;
  }

  /**
   * G\u00e9n\u00e8re tous les s\u00e9lecteurs possibles pour un \u00e9l\u00e9ment
   */
  function generateAllSelectors(element) {
    const selectors = [];
    
    // 1. XPath unique principal
    const mainXPath = buildUniqueXPath(element);
    if (mainXPath) {
      selectors.push(`xpath=${mainXPath}`);
    }
    
    // 2. ID si unique
    if (element.id && isValidId(element.id)) {
      selectors.push(`id=${element.id}`);
    }
    
    // 3. Attributs stables
    const stableSelector = getStableAttributeSelector(element);
    if (stableSelector) {
      selectors.push(stableSelector);
    }
    
    // 4. CSS Selector
    const cssSelector = generateStableCssSelector(element);
    if (cssSelector) {
      selectors.push(`css=${cssSelector}`);
    }
    
    return selectors.filter(s => s && !s.includes('function'));
  }

  function getStableAttributeSelector(element) {
    const tag = element.tagName.toLowerCase();
    const stableAttrs = ['data-testid', 'data-cy', 'name', 'formcontrolname', 'aria-label', 'placeholder'];
    
    for (const attr of stableAttrs) {
      const value = element.getAttribute(attr);
      if (value && value.length < 100 && !value.includes('function')) {
        return `xpath=//${tag}[@${attr}="${escapeXPath(value)}"]`;
      }
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
      
      if (current.id && isValidId(current.id)) {
        parts.unshift(`#${CSS.escape(current.id)}`);
        break;
      }
      
      const fcName = current.getAttribute('formcontrolname');
      if (fcName && !fcName.includes('function')) {
        selector += `[formcontrolname="${fcName}"]`;
      }
      
      parts.unshift(selector);
      current = current.parentElement;
      depth++;
    }
    
    return parts.length > 0 ? parts.join(' > ') : null;
  }

  function getPrimarySelector(element) {
    const mainXPath = buildUniqueXPath(element);
    if (mainXPath) return `xpath=${mainXPath}`;
    
    if (element.id && isValidId(element.id)) {
      return `id=${element.id}`;
    }
    
    const stable = getStableAttributeSelector(element);
    if (stable) return stable;
    
    return `css=${generateStableCssSelector(element) || element.tagName.toLowerCase()}`;
  }

  // ===== GESTION RADIO/CHECKBOX AM\u00c9LIOR\u00c9E =====

  /**
   * Correction du bug: utilise des s\u00e9lecteurs uniques pour radio/checkbox
   */
  function getRadioCheckboxSelector(element) {
    const type = element.type;
    const id = element.id;
    const name = element.getAttribute('name');
    const value = element.value;

    // Strat\u00e9gie 1: XPath unique complet
    const uniqueXPath = buildUniqueXPath(element);
    if (uniqueXPath) {
      return {
        command: 'clickByXPath',
        selector: `xpath=${uniqueXPath}`,
        value: value || name || 'checked'
      };
    }

    // Strat\u00e9gie 2: Par ID du label associ\u00e9
    if (id && isValidId(id)) {
      const label = document.querySelector(`label[for="${id}"]`);
      if (label) {
        const labelText = label.textContent?.trim();
        if (labelText && labelText.length < 80) {
          // Utiliser le texte du label comme identifiant
          return {
            command: 'clickLabel',
            selector: `xpath=//label[normalize-space(text())="${escapeXPath(labelText)}"]`,
            value: labelText,
            inputId: id
          };
        }
        
        if (label.id && isValidId(label.id)) {
          return {
            command: 'click',
            selector: `id=${label.id}`,
            value: labelText || value
          };
        }
      }
      
      // Utiliser l'ID de l'input directement
      return {
        command: 'click',
        selector: `id=${id}`,
        value: value
      };
    }

    // Strat\u00e9gie 3: Par name + value (pour radios group\u00e9s)
    if (name && value && value !== 'on') {
      const xpath = `//input[@type="${type}"][@name="${escapeXPath(name)}"][@value="${escapeXPath(value)}"]`;
      if (isXPathUnique(xpath)) {
        return {
          command: 'clickRadioByValue',
          selector: `xpath=${xpath}`,
          value: `${name}:${value}`
        };
      }
    }

    // Strat\u00e9gie 4: Par contexte parent avec formcontrolname
    const fcParent = element.closest('[formcontrolname]');
    if (fcParent) {
      const fcName = fcParent.getAttribute('formcontrolname');
      if (fcName && !fcName.includes('function')) {
        if (value && value !== 'on') {
          const xpath = `//*[@formcontrolname="${escapeXPath(fcName)}"]//input[@type="${type}"][@value="${escapeXPath(value)}"]`;
          return {
            command: 'clickRadioByValue',
            selector: `xpath=${xpath}`,
            value: `${fcName}:${value}`
          };
        }
        
        // Utiliser l'index si pas de value
        const inputs = fcParent.querySelectorAll(`input[type="${type}"]`);
        const index = Array.from(inputs).indexOf(element) + 1;
        const xpath = `//*[@formcontrolname="${escapeXPath(fcName)}"]//input[@type="${type}"][${index}]`;
        return {
          command: 'click',
          selector: `xpath=${xpath}`,
          value: `${fcName}[${index}]`
        };
      }
    }

    // Fallback: Chercher le label parent/sibling
    const parentLabel = element.closest('label');
    if (parentLabel) {
      const labelText = parentLabel.textContent?.trim();
      if (labelText && labelText.length < 80) {
        return {
          command: 'clickLabel',
          selector: `xpath=//label[normalize-space(text())="${escapeXPath(labelText)}"]`,
          value: labelText
        };
      }
    }

    return null;
  }

  // ===== GESTION NG-SELECT AM\u00c9LIOR\u00c9E =====

  function isNgSelectComponent(element) {
    return element.tagName.toLowerCase() === 'ng-select' ||
           element.closest('ng-select') !== null;
  }

  function getNgSelectInfo(element) {
    const ngSelect = element.tagName.toLowerCase() === 'ng-select' 
      ? element 
      : element.closest('ng-select');
    
    if (!ngSelect) return null;
    
    const fcName = ngSelect.getAttribute('formcontrolname');
    const placeholder = ngSelect.getAttribute('placeholder');
    const ariaLabel = ngSelect.getAttribute('aria-label');
    
    // Construire un s\u00e9lecteur unique
    let selector = null;
    if (fcName && !fcName.includes('function')) {
      selector = buildUniqueXPath(ngSelect) || `xpath=//ng-select[@formcontrolname="${escapeXPath(fcName)}"]`;
    } else if (placeholder) {
      selector = `xpath=//ng-select[@placeholder="${escapeXPath(placeholder)}"]`;
    } else if (ariaLabel) {
      selector = `xpath=//ng-select[@aria-label="${escapeXPath(ariaLabel)}"]`;
    } else {
      selector = buildUniqueXPath(ngSelect);
    }
    
    return {
      element: ngSelect,
      formControlName: fcName,
      placeholder: placeholder,
      ariaLabel: ariaLabel,
      selector: selector
    };
  }

  function getNgOptionText(element) {
    const ngOption = element.closest('.ng-option') || element.closest('ng-option');
    if (ngOption) {
      const textSpan = ngOption.querySelector('.text-span-ref, .ng-option-label, span');
      return (textSpan ? textSpan.textContent : ngOption.textContent).trim();
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
      console.warn('[FR] Invalid selector, skipping');
      return;
    }
    
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

  // ===== GESTIONNAIRES D'\u00c9V\u00c9NEMENTS =====

  function handleClick(event) {
    if (!isRecording) return;
    if (event.target.closest('#fr-indicator') || event.target.closest('#fr-playback-indicator')) return;
    
    const element = event.target;
    const tagName = element.tagName.toLowerCase();
    
    // \u00c9viter les double-clics
    const now = Date.now();
    if (lastClickElement === element && now - lastClickTime < 500) {
      return;
    }
    lastClickTime = now;
    lastClickElement = element;
    
    // Pour radio/checkbox, on laisse handleChange g\u00e9rer
    if (tagName === 'input' && (element.type === 'radio' || element.type === 'checkbox')) {
      return;
    }
    
    // D\u00e9tecter clic sur option ng-select
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
          `S\u00e9lection: ${optionText}`,
          ngSelect,
          { optionText: optionText, ngInfo: ngInfo }
        );
        return;
      }
    }
    
    // Ne pas enregistrer les clics dans ng-select (seulement l'option)
    if (isNgSelectComponent(element)) {
      return;
    }
    
    // D\u00e9tecter clic sur label de radio/checkbox
    if (tagName === 'label' || element.closest('label')) {
      const label = tagName === 'label' ? element : element.closest('label');
      const forId = label.getAttribute('for');
      
      if (forId) {
        const input = document.getElementById(forId);
        if (input && (input.type === 'radio' || input.type === 'checkbox')) {
          // Laisser handleChange g\u00e9rer via l'input
          return;
        }
      }
      
      // V\u00e9rifier si c'est dans un lb-aon-choice ou lb-aon-checkbox
      const lbChoice = label.closest('lb-aon-choice, lb-aon-checkbox');
      if (lbChoice) {
        return; // handleChange va g\u00e9rer
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
      recordCommand('select', '', value, `S\u00e9lection: ${value}`, element);
    } else if (element.type === 'checkbox' || element.type === 'radio') {
      // Utiliser le s\u00e9lecteur optimis\u00e9 pour radio/checkbox
      const radioInfo = getRadioCheckboxSelector(element);
      
      if (radioInfo) {
        recordCommand(
          radioInfo.command,
          radioInfo.selector,
          radioInfo.value,
          element.type === 'radio' ? `Radio: ${radioInfo.value}` : `Checkbox: ${radioInfo.value}`,
          null, // Pas besoin de l'\u00e9l\u00e9ment, on a d\u00e9j\u00e0 le s\u00e9lecteur
          radioInfo
        );
      } else {
        // Fallback
        recordCommand('click', '', '', element.type, element);
      }
    }
  }

  // ===== EX\u00c9CUTION DES COMMANDES (REPLAY) =====

  /**
   * Trouve un \u00e9l\u00e9ment avec retry et multiples strat\u00e9gies
   * Correction du bug: meilleure recherche avec fallbacks
   */
  async function findElement(command, timeout = 8000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      // Essayer le s\u00e9lecteur principal
      let element = findElementBySelector(command.Target);
      if (element && isElementVisible(element)) return element;
      
      // Essayer les s\u00e9lecteurs alternatifs
      if (command.Targets && command.Targets.length > 0) {
        for (const selector of command.Targets) {
          element = findElementBySelector(selector);
          if (element && isElementVisible(element)) return element;
        }
      }
      
      // Si c'est un label, essayer la recherche par texte
      if (command.Command === 'clickLabel' && command.Value) {
        element = findLabelByText(command.Value);
        if (element && isElementVisible(element)) return element;
      }
      
      await sleep(150);
    }
    
    return null;
  }

  function isElementVisible(element) {
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return rect.width > 0 && 
           rect.height > 0 && 
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
        if (!isValidId(id)) return null;
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
      console.error('[FR] Error finding element:', e);
      return null;
    }
  }

  /**
   * Recherche avanc\u00e9e de label par texte
   * Correction du bug: recherche flexible avec normalisation
   */
  function findLabelByText(text) {
    if (!text) return null;
    
    const normalizedSearch = normalizeText(text);
    const labelSelectors = [
      'label',
      'span.label',
      'span.radio-label',
      'span.checkbox-label',
      'div.label',
      '[role="label"]'
    ];
    
    for (const selector of labelSelectors) {
      const labels = document.querySelectorAll(selector);
      for (const label of labels) {
        const labelText = label.textContent?.trim();
        if (!labelText) continue;
        
        const normalizedLabel = normalizeText(labelText);
        
        // Correspondance exacte
        if (labelText === text || normalizedLabel === normalizedSearch) {
          return label;
        }
        
        // Correspondance partielle
        if (labelText.includes(text) || normalizedLabel.includes(normalizedSearch)) {
          return label;
        }
        
        // Correspondance inverse
        if (text.includes(labelText) || normalizedSearch.includes(normalizedLabel)) {
          return label;
        }
      }
    }
    
    return null;
  }

  /**
   * Ex\u00e9cute une commande avec retry
   */
  async function executeCommand(command, cmdSettings) {
    settings = { ...settings, ...cmdSettings };
    updatePlaybackIndicator(command);
    
    console.log('[FR] Exec:', command.Command, command.Value || '');
    
    // Commandes sp\u00e9ciales
    if (command.Command === 'selectNgOption') {
      return await executeNgSelectOption(command);
    }
    
    if (command.Command === 'clickLabel' || command.Command === 'clickCheckbox') {
      return await executeClickLabel(command);
    }

    if (command.Command === 'clickRadioByValue' || command.Command === 'clickByXPath') {
      return await executeClickRadioByValue(command);
    }
    
    const element = await findElement(command, settings.waitTimeout || 8000);
    
    if (!element) {
      console.warn('[FR] Element not found, skipping');
      showErrorMessage('Element not found: ' + (command.Description || command.Target));
      return false;
    }
    
    if (settings.highlightElements) {
      highlightElement(element);
    }
    
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await sleep(300);
    
    try {
      switch (command.Command) {
        case 'click':
          await performClick(element);
          break;
        case 'type':
          await performType(element, command.Value);
          break;
        case 'select':
          await performSelect(element, command.Value);
          break;
      }
      
      setTimeout(() => unhighlightElement(element), 300);
      return true;
    } catch (error) {
      console.error('[FR] Error executing command:', error);
      unhighlightElement(element);
      showErrorMessage('Error: ' + error.message);
      return false;
    }
  }

  /**
   * Ex\u00e9cute le clic sur un label
   * Correction du bug: recherche avanc\u00e9e multi-strat\u00e9gies
   */
  async function executeClickLabel(command) {
    let element = await findElement(command, settings.waitTimeout || 8000);
    
    if (!element && command.Value) {
      // Recherche avanc\u00e9e par texte
      element = findLabelByText(command.Value);
    }
    
    if (!element && command.inputId) {
      // Recherche par l'ID de l'input associ\u00e9
      const input = document.getElementById(command.inputId);
      if (input) {
        element = input;
      }
    }
    
    if (!element) {
      console.warn('[FR] Label not found:', command.Value);
      showErrorMessage('Label not found: ' + command.Value);
      return false;
    }
    
    if (settings.highlightElements) highlightElement(element);
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await sleep(300);
    await performClick(element);
    setTimeout(() => unhighlightElement(element), 300);
    return true;
  }

  /**
   * Ex\u00e9cute le clic sur radio/checkbox par valeur
   */
  async function executeClickRadioByValue(command) {
    // Essayer d'abord avec le s\u00e9lecteur principal
    let element = await findElement(command, settings.waitTimeout || 8000);
    
    if (element) {
      if (settings.highlightElements) highlightElement(element);
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await sleep(300);
      await performClick(element);
      setTimeout(() => unhighlightElement(element), 300);
      return true;
    }

    // Fallback: chercher par la valeur
    const value = command.Value;
    if (value) {
      // Extraire name:value si pr\u00e9sent
      let searchValue = value;
      let searchName = null;
      if (value.includes(':')) {
        const parts = value.split(':');
        searchName = parts[0];
        searchValue = parts[1];
      }

      // Chercher l'input radio/checkbox avec cette valeur
      let inputs;
      if (searchName) {
        inputs = document.querySelectorAll(
          `input[name="${searchName}"][value="${searchValue}"], input[name="${searchName}"]`
        );
      } else {
        inputs = document.querySelectorAll(`input[value="${searchValue}"]`);
      }

      for (const input of inputs) {
        if (input.type === 'radio' || input.type === 'checkbox') {
          // Trouver le label associ\u00e9 ou cliquer sur l'input
          const label = document.querySelector(`label[for="${input.id}"]`) || input.closest('label');
          const target = label || input;
          
          if (settings.highlightElements) highlightElement(target);
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          await sleep(300);
          await performClick(target);
          setTimeout(() => unhighlightElement(target), 300);
          return true;
        }
      }
    }

    console.warn('[FR] Radio/checkbox not found by value:', value);
    showErrorMessage('Radio/checkbox not found: ' + value);
    return false;
  }

  async function performClick(element) {
    element.focus();
    await sleep(50);
    
    // Dispatcher plusieurs \u00e9v\u00e9nements pour compatibilit\u00e9 Angular
    element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
    await sleep(30);
    element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
    await sleep(30);
    element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    await sleep(30);
    element.click();
  }

  async function performType(element, value) {
    element.focus();
    await sleep(100);
    
    // Vider le champ
    element.value = '';
    element.dispatchEvent(new Event('input', { bubbles: true }));
    await sleep(50);
    
    // Taper caract\u00e8re par caract\u00e8re
    for (const char of value) {
      element.value += char;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));
      element.dispatchEvent(new KeyboardEvent('keypress', { key: char, bubbles: true }));
      element.dispatchEvent(new KeyboardEvent('keyup', { key: char, bubbles: true }));
      await sleep(settings.typeDelay || 50);
    }
    
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  async function performSelect(element, value) {
    if (element.tagName.toLowerCase() !== 'select') return;
    
    const option = Array.from(element.options).find(o => 
      o.text.trim() === value || 
      o.value === value ||
      normalizeText(o.text) === normalizeText(value)
    );
    
    if (option) {
      element.value = option.value;
      element.dispatchEvent(new Event('change', { bubbles: true }));
      element.dispatchEvent(new Event('blur', { bubbles: true }));
    }
  }

  /**
   * Ex\u00e9cute la s\u00e9lection d'une option ng-select
   * Correction du bug: strat\u00e9gies multiples + retry + timing am\u00e9lior\u00e9
   */
  async function executeNgSelectOption(command) {
    const optionText = command.Value || command.optionText;
    console.log('[FR] ng-select option:', optionText);
    
    // Trouver le ng-select avec retry
    let ngSelect = null;
    let attempts = 0;
    const maxAttempts = settings.retryAttempts || 3;
    
    while (!ngSelect && attempts < maxAttempts) {
      ngSelect = await findNgSelect(command);
      if (!ngSelect) {
        await sleep(settings.retryDelay || 500);
        attempts++;
      }
    }
    
    if (!ngSelect) {
      console.warn('[FR] ng-select not found after', attempts, 'attempts');
      showErrorMessage('ng-select not found');
      return false;
    }
    
    if (settings.highlightElements) highlightElement(ngSelect);
    ngSelect.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await sleep(500);
    
    // Ouvrir le dropdown avec plusieurs m\u00e9thodes
    const opened = await openNgSelectDropdown(ngSelect);
    if (!opened) {
      console.warn('[FR] Could not open ng-select dropdown');
      unhighlightElement(ngSelect);
      showErrorMessage('Could not open dropdown');
      return false;
    }
    
    await sleep(500);
    
    // Trouver et cliquer sur l'option
    const success = await selectNgOption(optionText);
    
    unhighlightElement(ngSelect);
    
    if (success) {
      console.log('[FR] ng-select option selected successfully');
      return true;
    } else {
      console.warn('[FR] Could not find option:', optionText);
      showErrorMessage('Option not found: ' + optionText);
      return false;
    }
  }

  /**
   * Trouve le ng-select avec plusieurs strat\u00e9gies
   */
  async function findNgSelect(command) {
    // Strat\u00e9gie 1: Utiliser le s\u00e9lecteur de la commande
    let ngSelect = await findElement(command, 2000);
    if (ngSelect && ngSelect.tagName.toLowerCase() === 'ng-select') {
      return ngSelect;
    }
    
    // Strat\u00e9gie 2: Chercher par formcontrolname
    const fcMatch = command.Target?.match(/formcontrolname="([^"]+)"/);
    if (fcMatch) {
      ngSelect = document.querySelector(`ng-select[formcontrolname="${fcMatch[1]}"]`);
      if (ngSelect && isElementVisible(ngSelect)) {
        console.log('[FR] Found by formcontrolname:', fcMatch[1]);
        return ngSelect;
      }
    }
    
    // Strat\u00e9gie 3: Chercher par placeholder
    const placeholderMatch = command.Target?.match(/placeholder="([^"]+)"/);
    if (placeholderMatch) {
      ngSelect = document.querySelector(`ng-select[placeholder="${placeholderMatch[1]}"]`);
      if (ngSelect && isElementVisible(ngSelect)) {
        console.log('[FR] Found by placeholder:', placeholderMatch[1]);
        return ngSelect;
      }
    }
    
    // Strat\u00e9gie 4: Chercher tous les ng-select visibles sans valeur
    const allNgSelect = document.querySelectorAll('ng-select');
    for (const ns of allNgSelect) {
      if (!isElementVisible(ns)) continue;
      
      const hasValue = ns.querySelector('.ng-value:not(.ng-placeholder)');
      if (!hasValue) {
        console.log('[FR] Found empty ng-select');
        return ns;
      }
    }
    
    // Strat\u00e9gie 5: Prendre le premier ng-select visible
    for (const ns of allNgSelect) {
      if (isElementVisible(ns)) {
        console.log('[FR] Using first visible ng-select');
        return ns;
      }
    }
    
    return null;
  }

  /**
   * Ouvre le dropdown ng-select avec plusieurs m\u00e9thodes
   */
  async function openNgSelectDropdown(ngSelect) {
    const container = ngSelect.querySelector('.ng-select-container');
    const arrow = ngSelect.querySelector('.ng-arrow-wrapper, .ng-arrow');
    const inputElement = ngSelect.querySelector('input');
    
    // M\u00e9thode 1: Clic sur la fl\u00e8che
    if (arrow) {
      await performClick(arrow);
      await sleep(300);
      if (document.querySelector('.ng-dropdown-panel')) {
        console.log('[FR] Dropdown opened via arrow');
        return true;
      }
    }
    
    // M\u00e9thode 2: Clic sur le container
    if (container) {
      await performClick(container);
      await sleep(300);
      if (document.querySelector('.ng-dropdown-panel')) {
        console.log('[FR] Dropdown opened via container');
        return true;
      }
    }
    
    // M\u00e9thode 3: Focus + clic sur l'input
    if (inputElement) {
      inputElement.focus();
      await sleep(100);
      await performClick(inputElement);
      await sleep(300);
      if (document.querySelector('.ng-dropdown-panel')) {
        console.log('[FR] Dropdown opened via input');
        return true;
      }
    }
    
    // M\u00e9thode 4: Clic direct sur ng-select
    await performClick(ngSelect);
    await sleep(300);
    if (document.querySelector('.ng-dropdown-panel')) {
      console.log('[FR] Dropdown opened via ng-select');
      return true;
    }
    
    // M\u00e9thode 5: Dispatcher un \u00e9v\u00e9nement Angular
    try {
      ngSelect.dispatchEvent(new Event('click', { bubbles: true }));
      ngSelect.dispatchEvent(new Event('mousedown', { bubbles: true }));
      await sleep(300);
      if (document.querySelector('.ng-dropdown-panel')) {
        console.log('[FR] Dropdown opened via events');
        return true;
      }
    } catch (e) {
      console.error('[FR] Error dispatching events:', e);
    }
    
    // Attendre encore un peu au cas o\u00f9
    await sleep(500);
    return document.querySelector('.ng-dropdown-panel') !== null;
  }

  /**
   * S\u00e9lectionne une option dans le dropdown ng-select
   */
  async function selectNgOption(optionText) {
    const dropdown = document.querySelector('.ng-dropdown-panel');
    if (!dropdown) return false;
    
    await sleep(300);
    
    const options = dropdown.querySelectorAll('.ng-option:not(.ng-option-disabled)');
    if (options.length === 0) {
      console.warn('[FR] No options found in dropdown');
      return false;
    }
    
    const normalizedSearch = normalizeText(optionText);
    let targetOption = null;
    
    // Recherche exacte
    for (const opt of options) {
      const text = opt.textContent?.trim();
      if (text === optionText) {
        targetOption = opt;
        console.log('[FR] Exact match:', text);
        break;
      }
    }
    
    // Recherche normalis\u00e9e
    if (!targetOption) {
      for (const opt of options) {
        const text = opt.textContent?.trim();
        const normalizedText = normalizeText(text);
        if (normalizedText === normalizedSearch) {
          targetOption = opt;
          console.log('[FR] Normalized match:', text);
          break;
        }
      }
    }
    
    // Recherche partielle
    if (!targetOption) {
      for (const opt of options) {
        const text = opt.textContent?.trim();
        const normalizedText = normalizeText(text);
        if (normalizedText.includes(normalizedSearch) || normalizedSearch.includes(normalizedText)) {
          targetOption = opt;
          console.log('[FR] Partial match:', text);
          break;
        }
      }
    }
    
    // Recherche tr\u00e8s flexible (mots-cl\u00e9s)
    if (!targetOption) {
      const searchWords = normalizedSearch.split(/\s+/).filter(w => w.length > 2);
      for (const opt of options) {
        const text = normalizeText(opt.textContent?.trim());
        const matchCount = searchWords.filter(word => text.includes(word)).length;
        if (matchCount >= Math.ceil(searchWords.length / 2)) {
          targetOption = opt;
          console.log('[FR] Flexible match:', opt.textContent?.trim());
          break;
        }
      }
    }
    
    if (!targetOption) {
      console.warn('[FR] Option not found:', optionText);
      console.log('[FR] Available options:', Array.from(options).map(o => o.textContent?.trim()).slice(0, 10));
      return false;
    }
    
    if (settings.highlightElements) highlightElement(targetOption);
    targetOption.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await sleep(200);
    await performClick(targetOption);
    await sleep(300);
    unhighlightElement(targetOption);
    
    return true;
  }

  // ===== INDICATEURS VISUELS =====

  function createRecordingIndicator() {
    if (recordingIndicator) return;
    recordingIndicator = document.createElement('div');
    recordingIndicator.id = 'fr-indicator';
    recordingIndicator.innerHTML = '<div class="fr-content"><span class="fr-dot"></span><span class="fr-text">REC</span></div>';
    document.body.appendChild(recordingIndicator);
  }

  function removeRecordingIndicator() {
    if (recordingIndicator) {
      recordingIndicator.remove();
      recordingIndicator = null;
    }
  }

  function createPlaybackIndicator() {
    if (playbackIndicator) return;
    playbackIndicator = document.createElement('div');
    playbackIndicator.id = 'fr-playback-indicator';
    playbackIndicator.innerHTML = `
      <div class="fr-pb-header">
        <span class="fr-pb-icon">\u25b6</span>
        <span class="fr-pb-title">Lecture</span>
      </div>
      <div class="fr-pb-command">
        <span class="fr-pb-cmd-type">-</span>
        <span class="fr-pb-cmd-target">-</span>
      </div>
    `;
    document.body.appendChild(playbackIndicator);
  }

  function updatePlaybackIndicator(command) {
    if (!playbackIndicator) createPlaybackIndicator();
    const cmdType = playbackIndicator.querySelector('.fr-pb-cmd-type');
    const cmdTarget = playbackIndicator.querySelector('.fr-pb-cmd-target');
    if (cmdType) cmdType.textContent = command.Command;
    if (cmdTarget) cmdTarget.textContent = (command.Value || command.Description || '').substring(0, 40);
  }

  function removePlaybackIndicator() {
    if (playbackIndicator) {
      playbackIndicator.remove();
      playbackIndicator = null;
    }
  }

  function highlightElement(element) {
    if (!element) return;
    element.dataset.frOriginalOutline = element.style.outline;
    element.dataset.frOriginalBackground = element.style.backgroundColor;
    element.style.outline = '3px solid #4CAF50';
    element.style.outlineOffset = '2px';
    element.style.backgroundColor = 'rgba(76, 175, 80, 0.1)';
  }

  function unhighlightElement(element) {
    if (!element) return;
    element.style.outline = element.dataset.frOriginalOutline || '';
    element.style.backgroundColor = element.dataset.frOriginalBackground || '';
  }

  function showErrorMessage(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'fr-error-message';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
      errorDiv.remove();
    }, 3000);
  }

  function showSuccessMessage(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'fr-success-message';
    successDiv.textContent = message;
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
      successDiv.remove();
    }, 3000);
  }

  // ===== INITIALISATION =====

  function startRecording() {
    isRecording = true;
    createRecordingIndicator();
    document.addEventListener('click', handleClick, true);
    document.addEventListener('input', handleInput, true);
    document.addEventListener('change', handleChange, true);
    console.log('[FR] Recording started');
  }

  function stopRecording() {
    isRecording = false;
    removeRecordingIndicator();
    document.removeEventListener('click', handleClick, true);
    document.removeEventListener('input', handleInput, true);
    document.removeEventListener('change', handleChange, true);
    console.log('[FR] Recording stopped');
  }

  // ===== GESTIONNAIRE DE MESSAGES =====

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
            console.error('[FR] Error:', e);
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
    }
    return true;
  });

  console.log('[FR] Form Recorder Pro v3.0 content script loaded');
})();
