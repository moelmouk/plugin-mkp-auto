// Content Script - Form Recorder Pro v4.2
// Compatible UI.Vision - Validation renforcée des sélecteurs

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
  let highlightOverlay = null;
  let lastInputElement = null;
  let inputDebounceTimer = null;
  let lastClickTime = 0;
  let lastClickTarget = null;
  let settings = {
    recordOpenCommand: true,
    defaultWait: 1000,
    typeDelay: 20,
    highlightElements: true,
    waitTimeout: 10000
  };

  // ===== VALIDATION DES IDs ET SÉLECTEURS (RENFORCÉE) =====

  function isValidId(id) {
    // Validation stricte des IDs
    if (!id || typeof id !== 'string') return false;
    if (id.length < 1 || id.length > 200) return false;
    
    // Un ID valide ne doit contenir que des caractères alphanumériques, tirets, underscores
    // et ne doit pas ressembler à du code JavaScript
    const invalidPatterns = [
      'function',
      'return',
      'throw',
      'new ',
      '{',
      '}',
      '=>',
      'if(',
      'if (',
      'else',
      'let ',
      'var ',
      'const ',
      '===',
      '!==',
      '==',
      '!=',
      'null',
      'undefined',
      'typeof',
      'instanceof',
      'this.',
      'window.',
      'document.',
      '.call(',
      '.apply(',
      '.bind(',
      'prototype',
      '__proto__',
      'Object.',
      'Array.',
      'String.',
      'Number.',
      'Boolean.',
      'Math.',
      'JSON.',
      'console.',
      '()',
      ');',
      '();',
      '[native code]',
      'use strict'
    ];
    
    const idLower = id.toLowerCase();
    for (const pattern of invalidPatterns) {
      if (idLower.includes(pattern.toLowerCase())) {
        console.warn('[FR] Invalid ID rejected (contains code pattern):', id.substring(0, 50));
        return false;
      }
    }
    
    // Rejeter les IDs qui ressemblent à des IDs dynamiques aléatoires
    if (/^[a-f0-9]{8,12}-\d+$/.test(id)) {
      return false;
    }
    
    // Rejeter si contient trop de caractères spéciaux
    const specialCharsCount = (id.match(/[^a-zA-Z0-9_\-]/g) || []).length;
    if (specialCharsCount > 5) {
      console.warn('[FR] Invalid ID rejected (too many special chars):', id.substring(0, 50));
      return false;
    }
    
    // Rejeter si ressemble à une fonction stringifiée (commence par "function")
    if (id.trim().startsWith('function')) {
      console.warn('[FR] Invalid ID rejected (starts with function):', id.substring(0, 50));
      return false;
    }
    
    return true;
  }

  function getElementId(element) {
    // CRITIQUE: Utiliser getAttribute pour éviter les getters dynamiques d'Angular
    // Ne JAMAIS utiliser element.id directement car Angular peut redéfinir le getter
    try {
      const id = element.getAttribute('id');
      if (id && typeof id === 'string' && isValidId(id)) {
        return id;
      }
    } catch (e) {
      console.warn('[FR] Error getting ID:', e.message);
    }
    return null;
  }

  function isValidSelector(selector) {
    if (!selector || typeof selector !== 'string') return false;
    if (selector.length > 1000) return false;
    
    const invalidPatterns = [
      'function',
      'return',
      'throw',
      '{',
      '}',
      '=>',
      'if(',
      'if (',
      'let ',
      'var ',
      'const ',
      '===',
      '!==',
      '()',
      'null',
      'undefined',
      '[native code]',
      'use strict',
      'prototype'
    ];
    
    const selectorLower = selector.toLowerCase();
    for (const pattern of invalidPatterns) {
      if (selectorLower.includes(pattern.toLowerCase())) {
        console.warn('[FR] Invalid selector rejected:', selector.substring(0, 80));
        return false;
      }
    }
    
    return true;
  }
  
  function sanitizeAttributeValue(value) {
    // Nettoyer les valeurs d'attributs pour les utiliser dans les sélecteurs
    if (!value || typeof value !== 'string') return null;
    if (value.length > 200) return null;
    
    // Vérifier que ce n'est pas du code
    if (!isValidId(value)) return null;
    
    // Échapper les guillemets
    return value.replace(/"/g, '\\"');
  }

  // ===== GÉNÉRATION DE SÉLECTEURS STYLE UI.VISION =====

  function generateUIVisionSelectors(element) {
    const selectors = [];
    
    // 1. ID (PRIORITÉ ABSOLUE comme UI.Vision)
    const id = getElementId(element);
    if (id) {
      selectors.push(`id=${id}`);
      selectors.push(`xpath=//*[@id="${id}"]`);
      selectors.push(`css=#${CSS.escape(id)}`);
    }
    
    // 2. XPath depuis l'ID le plus proche
    const xpathFromId = generateXPathFromNearestId(element);
    if (xpathFromId && isValidSelector(xpathFromId)) {
      selectors.push(`xpath=${xpathFromId}`);
    }
    
    // 3. XPath par attributs stables
    const xpathByAttr = generateXPathByAttributes(element);
    if (xpathByAttr && isValidSelector(xpathByAttr)) {
      selectors.push(`xpath=${xpathByAttr}`);
    }
    
    // 4. XPath absolu complet
    const absoluteXPath = generateAbsoluteXPath(element);
    if (absoluteXPath && isValidSelector(absoluteXPath)) {
      selectors.push(`xpath=${absoluteXPath}`);
    }
    
    // 5. CSS selector
    const cssSelector = generateCssSelector(element);
    if (cssSelector && isValidSelector(cssSelector)) {
      selectors.push(`css=${cssSelector}`);
    }
    
    // Dédupliquer et filtrer
    return selectors.filter((s, i, arr) => arr.indexOf(s) === i && isValidSelector(s));
  }

  function generateXPathFromNearestId(element) {
    let current = element;
    const pathParts = [];
    
    while (current && current !== document.body && current !== document.documentElement) {
      const currentId = getElementId(current);
      
      if (currentId) {
        // On a trouvé un ancêtre avec ID valide
        const basePath = `//*[@id="${currentId}"]`;
        if (pathParts.length === 0) {
          return basePath;
        }
        return basePath + '/' + pathParts.reverse().join('/');
      }
      
      // Construire le chemin relatif
      const tagName = current.tagName.toLowerCase();
      let index = 1;
      let sibling = current.previousElementSibling;
      while (sibling) {
        if (sibling.tagName.toLowerCase() === tagName) {
          index++;
        }
        sibling = sibling.previousElementSibling;
      }
      
      // Vérifier s'il y a des siblings avec le même tag
      const siblings = current.parentElement ? 
        Array.from(current.parentElement.children).filter(c => c.tagName.toLowerCase() === tagName) : [];
      
      if (siblings.length > 1) {
        pathParts.push(`${tagName}[${index}]`);
      } else {
        pathParts.push(tagName);
      }
      
      current = current.parentElement;
    }
    
    return null;
  }

  function generateXPathByAttributes(element) {
    const tagName = element.tagName.toLowerCase();
    
    // Attributs stables par ordre de priorité
    const attrChecks = [
      { attr: 'formcontrolname', direct: true },
      { attr: 'name', direct: true },
      { attr: 'data-testid', direct: true },
      { attr: 'data-cy', direct: true },
      { attr: 'data-test', direct: true },
      { attr: 'placeholder', direct: true },
      { attr: 'aria-label', direct: true },
      { attr: 'title', direct: true },
      { attr: 'type', direct: true, tagFilter: 'input' }
    ];
    
    for (const check of attrChecks) {
      if (check.tagFilter && tagName !== check.tagFilter) continue;
      
      const rawValue = element.getAttribute(check.attr);
      const value = sanitizeAttributeValue(rawValue);
      if (value && value.length > 0 && value.length < 100) {
        return `//${tagName}[@${check.attr}="${value}"]`;
      }
    }
    
    // Chercher dans les parents pour formcontrolname
    const fcParent = element.closest('[formcontrolname]');
    if (fcParent) {
      const rawFcName = fcParent.getAttribute('formcontrolname');
      const fcName = sanitizeAttributeValue(rawFcName);
      if (fcName) {
        return `//*[@formcontrolname="${fcName}"]//${tagName}`;
      }
    }
    
    return null;
  }

  function generateAbsoluteXPath(element) {
    const parts = [];
    let current = element;
    let depth = 0;
    const maxDepth = 15; // Limiter la profondeur pour éviter des XPaths trop longs
    
    while (current && current !== document.body && current !== document.documentElement && depth < maxDepth) {
      const tagName = current.tagName.toLowerCase();
      
      // Ignorer les balises script, style, etc.
      if (['script', 'style', 'noscript'].includes(tagName)) {
        current = current.parentElement;
        continue;
      }
      
      let index = 1;
      let sibling = current.previousElementSibling;
      
      while (sibling) {
        if (sibling.tagName.toLowerCase() === tagName) {
          index++;
        }
        sibling = sibling.previousElementSibling;
      }
      
      const siblings = current.parentElement ? 
        Array.from(current.parentElement.children).filter(c => c.tagName.toLowerCase() === tagName) : [];
      
      if (siblings.length > 1) {
        parts.unshift(`${tagName}[${index}]`);
      } else {
        parts.unshift(tagName);
      }
      
      current = current.parentElement;
      depth++;
    }
    
    if (parts.length > 0 && parts.length <= maxDepth) {
      return '/html/body/' + parts.join('/');
    }
    return null;
  }

  function generateCssSelector(element) {
    const parts = [];
    let current = element;
    let depth = 0;
    const maxDepth = 5;
    
    while (current && current !== document.body && depth < maxDepth) {
      const currentId = getElementId(current);
      
      if (currentId) {
        parts.unshift(`#${CSS.escape(currentId)}`);
        break;
      }
      
      const tagName = current.tagName.toLowerCase();
      let selector = tagName;
      
      // Ajouter l'index si nécessaire
      if (current.parentElement) {
        const siblings = Array.from(current.parentElement.children)
          .filter(c => c.tagName.toLowerCase() === tagName);
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
    // Priorité aux IDs valides
    const id = getElementId(element);
    if (id) {
      return `id=${id}`;
    }
    
    // XPath depuis l'ID le plus proche
    const xpathFromId = generateXPathFromNearestId(element);
    if (xpathFromId && isValidSelector(xpathFromId)) {
      return `xpath=${xpathFromId}`;
    }
    
    // XPath par attributs
    const xpathByAttr = generateXPathByAttributes(element);
    if (xpathByAttr && isValidSelector(xpathByAttr)) {
      return `xpath=${xpathByAttr}`;
    }
    
    // XPath absolu
    const absoluteXPath = generateAbsoluteXPath(element);
    if (absoluteXPath && isValidSelector(absoluteXPath)) {
      return `xpath=${absoluteXPath}`;
    }
    
    // Fallback CSS
    const cssSelector = generateCssSelector(element);
    if (cssSelector && isValidSelector(cssSelector)) {
      return `css=${cssSelector}`;
    }
    
    return null;
  }

  // ===== ENREGISTREMENT DES ACTIONS =====

  function recordCommand(command, target, value, description, element) {
    if (!isRecording) return;
    
    let primaryTarget = target;
    let targets = [];
    
    if (element) {
      targets = generateUIVisionSelectors(element);
      if (!primaryTarget || !isValidSelector(primaryTarget)) {
        primaryTarget = getPrimarySelector(element);
      }
    }
    
    if (!primaryTarget || !isValidSelector(primaryTarget)) {
      console.warn('[FR] No valid selector found, skipping');
      return;
    }
    
    console.log('[FR] Recording:', command, primaryTarget.substring(0, 80));
    
    chrome.runtime.sendMessage({
      action: 'recordCommand',
      data: {
        command: command,
        target: primaryTarget,
        value: value || '',
        targets: targets.filter(t => isValidSelector(t)),
        description: description || ''
      }
    });
  }

  // ===== GESTIONNAIRES D'ÉVÉNEMENTS =====

  function handleClick(event) {
    if (!isRecording) return;
    if (event.target.closest('#fr-indicator') || 
        event.target.closest('#fr-playback-indicator') ||
        event.target.closest('#fr-highlight-overlay')) return;
    
    const element = event.target;
    const tagName = element.tagName.toLowerCase();
    const now = Date.now();
    
    // Anti-doublon (même élément cliqué dans les 300ms)
    if (lastClickTarget === element && now - lastClickTime < 300) {
      return;
    }
    lastClickTime = now;
    lastClickTarget = element;
    
    // Pour les inputs radio/checkbox, laisser handleChange gérer
    if (tagName === 'input' && (element.type === 'radio' || element.type === 'checkbox')) {
      return;
    }
    
    // Gestion spéciale des options ng-select
    const ngOptionItem = element.closest('.ng-option');
    if (ngOptionItem) {
      // C'est un clic sur une option de ng-select
      const optionText = ngOptionItem.textContent?.trim();
      if (optionText && optionText.length < 100) {
        // Utiliser un sélecteur par texte pour plus de robustesse
        const escapedText = optionText.replace(/"/g, '\\"');
        const selector = `xpath=//div[contains(@class, "ng-option") and contains(normalize-space(.), "${escapedText}")]`;
        recordCommand('click', selector, '', `Option: ${optionText.substring(0, 40)}`, element);
        return;
      }
    }
    
    // Gestion des dropdown-item (ng-dropdown-panel)
    const dropdownItem = element.closest('.ng-dropdown-panel-items .ng-option, [role="option"]');
    if (dropdownItem) {
      const itemText = dropdownItem.textContent?.trim();
      if (itemText && itemText.length < 100) {
        const escapedText = itemText.replace(/"/g, '\\"');
        const selector = `xpath=//*[contains(@class, "ng-option") and contains(normalize-space(.), "${escapedText}")]`;
        recordCommand('click', selector, '', `Sélection: ${itemText.substring(0, 40)}`, element);
        return;
      }
    }
    
    // Gestion ng-select container (pour ouvrir le dropdown)
    const ngSelect = element.closest('ng-select');
    if (ngSelect && !element.closest('.ng-dropdown-panel')) {
      // Clic pour ouvrir le dropdown
      const ngSelectId = getElementId(ngSelect);
      if (ngSelectId) {
        recordCommand('click', `id=${ngSelectId}`, '', 'Ouvrir liste', ngSelect);
        return;
      }
      const fcName = ngSelect.getAttribute('formcontrolname');
      if (fcName && sanitizeAttributeValue(fcName)) {
        recordCommand('click', `xpath=//ng-select[@formcontrolname="${fcName}"]`, '', 'Ouvrir liste', ngSelect);
        return;
      }
    }
    
    // Description basée sur le contenu
    let description = '';
    const textContent = element.textContent?.trim();
    if (textContent && textContent.length < 50 && textContent.length > 0) {
      description = textContent;
    }
    
    recordCommand('click', null, '', description, element);
  }

  function handleInput(event) {
    if (!isRecording) return;
    
    const element = event.target;
    const tagName = element.tagName.toLowerCase();
    
    // Pour ng-select, enregistrer la saisie de recherche
    const ngSelect = element.closest('ng-select');
    if (ngSelect) {
      clearTimeout(inputDebounceTimer);
      lastInputElement = element;
      inputDebounceTimer = setTimeout(() => {
        if (lastInputElement === element && element.value) {
          // Pour ng-select, utiliser un sélecteur basé sur le ng-select parent
          const ngSelectId = getElementId(ngSelect);
          let targetSelector = null;
          
          if (ngSelectId) {
            targetSelector = `xpath=//*[@id="${ngSelectId}"]//input`;
          } else {
            const fcName = ngSelect.getAttribute('formcontrolname');
            if (fcName && sanitizeAttributeValue(fcName)) {
              targetSelector = `xpath=//ng-select[@formcontrolname="${fcName}"]//input`;
            }
          }
          
          if (targetSelector) {
            recordCommand('type', targetSelector, element.value, 'Recherche ng-select', element);
          } else {
            recordCommand('type', null, element.value, 'Recherche', element);
          }
        }
      }, 500);
      return;
    }
    
    // Pour les inputs normaux
    clearTimeout(inputDebounceTimer);
    lastInputElement = element;
    
    inputDebounceTimer = setTimeout(() => {
      if (lastInputElement === element) {
        const value = element.value || '';
        if (value) {
          recordCommand('type', null, value, '', element);
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
      recordCommand('select', null, value, `Sélection: ${value}`, element);
    } else if (element.type === 'checkbox' || element.type === 'radio') {
      // Style UI.Vision: type "on" puis click sur le label
      recordCommand('type', null, 'on', '', element);
      
      // Chercher et enregistrer le click sur le label
      const elementId = getElementId(element);
      if (elementId) {
        // Chercher label avec ID = elementId + '_label'
        const labelId = elementId + '_label';
        const label = document.getElementById(labelId);
        if (label) {
          setTimeout(() => {
            recordCommand('click', `id=${labelId}`, '', '', label);
          }, 50);
        } else {
          // Sinon click sur l'input
          setTimeout(() => {
            recordCommand('click', null, '', '', element);
          }, 50);
        }
      } else {
        // Pas d'ID, enregistrer click sur l'input
        setTimeout(() => {
          recordCommand('click', null, '', '', element);
        }, 50);
      }
    }
  }

  // ===== EXÉCUTION DES COMMANDES (REPLAY) =====

  async function findElement(command, timeout = 10000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      // Essayer le sélecteur principal
      let element = findElementBySelector(command.Target);
      if (element && isElementInteractable(element)) {
        return { element, selector: command.Target };
      }
      
      // Essayer les sélecteurs alternatifs
      if (command.Targets && command.Targets.length > 0) {
        for (const selector of command.Targets) {
          if (!isValidSelector(selector)) continue;
          element = findElementBySelector(selector);
          if (element && isElementInteractable(element)) {
            return { element, selector };
          }
        }
      }
      
      await sleep(200);
    }
    
    return null;
  }

  function isElementInteractable(element) {
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    
    if (rect.width === 0 || rect.height === 0) return false;
    if (style.visibility === 'hidden') return false;
    if (style.display === 'none') return false;
    if (style.opacity === '0') return false;
    
    return true;
  }

  function findElementBySelector(selector) {
    if (!selector || typeof selector !== 'string') return null;
    if (!isValidSelector(selector)) return null;
    
    try {
      if (selector.startsWith('id=')) {
        const id = selector.substring(3);
        return document.getElementById(id);
      }
      
      if (selector.startsWith('xpath=')) {
        const xpath = selector.substring(6);
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
      
      // Essayer comme CSS par défaut
      return document.querySelector(selector);
    } catch (e) {
      console.warn('[FR] Selector error:', e.message);
      return null;
    }
  }

  async function executeCommand(command, cmdSettings) {
    settings = { ...settings, ...cmdSettings };
    
    console.log('[FR] Executing:', command.Command, command.Value || command.Target?.substring(0, 50));
    
    // Commandes spéciales
    if (command.Command === 'waitForElementVisible') {
      const timeout = parseInt(command.Value) || 5000;
      const result = await findElement(command, timeout);
      return { success: !!result };
    }
    
    if (command.Command === 'pause') {
      await sleep(parseInt(command.Value) || 1000);
      return { success: true };
    }
    
    // Trouver l'élément
    const result = await findElement(command, settings.waitTimeout || 10000);
    
    if (!result) {
      console.error('[FR] Element not found:', command.Target);
      return { success: false, error: 'Element not found: ' + command.Target?.substring(0, 60) };
    }
    
    const { element, selector } = result;
    
    // Highlight
    if (settings.highlightElements) {
      highlightElement(element);
    }
    
    // Scroll into view
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await sleep(200);
    
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
        default:
          console.warn('[FR] Unknown command:', command.Command);
      }
      
      setTimeout(() => unhighlightElement(element), 300);
      return { success: true, usedSelector: selector };
    } catch (e) {
      console.error('[FR] Execution error:', e.message);
      return { success: false, error: e.message };
    }
  }

  async function performClick(element) {
    element.focus();
    await sleep(30);
    
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const eventInit = {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: centerX,
      clientY: centerY,
      button: 0
    };
    
    element.dispatchEvent(new MouseEvent('mouseenter', eventInit));
    element.dispatchEvent(new MouseEvent('mouseover', eventInit));
    await sleep(20);
    element.dispatchEvent(new MouseEvent('mousedown', eventInit));
    await sleep(30);
    element.dispatchEvent(new MouseEvent('mouseup', eventInit));
    element.click();
    element.dispatchEvent(new MouseEvent('mouseleave', eventInit));
  }

  async function performType(element, value) {
    if (!value) return;
    
    element.focus();
    await sleep(50);
    
    // Vider le champ
    element.value = '';
    element.dispatchEvent(new Event('input', { bubbles: true }));
    await sleep(30);
    
    // Taper caractère par caractère
    for (const char of value) {
      element.value += char;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));
      element.dispatchEvent(new KeyboardEvent('keypress', { key: char, bubbles: true }));
      element.dispatchEvent(new KeyboardEvent('keyup', { key: char, bubbles: true }));
      await sleep(settings.typeDelay || 20);
    }
    
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  async function performSelect(element, value) {
    if (element.tagName.toLowerCase() === 'select') {
      const option = Array.from(element.options).find(o => 
        o.text.trim() === value || o.value === value
      );
      if (option) {
        element.value = option.value;
        element.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ===== HIGHLIGHT & LOCATE =====

  function highlightElement(element) {
    if (!element) return;
    element.dataset.frOriginalOutline = element.style.outline;
    element.dataset.frOriginalBoxShadow = element.style.boxShadow;
    element.style.outline = '3px solid #4CAF50';
    element.style.boxShadow = '0 0 15px rgba(76, 175, 80, 0.6)';
  }

  function unhighlightElement(element) {
    if (!element) return;
    element.style.outline = element.dataset.frOriginalOutline || '';
    element.style.boxShadow = element.dataset.frOriginalBoxShadow || '';
  }

  function locateElement(selector) {
    if (!isValidSelector(selector)) {
      return { success: false, error: 'Invalid selector' };
    }
    
    const element = findElementBySelector(selector);
    if (!element) {
      return { success: false, error: 'Element not found' };
    }
    
    // Scroll et highlight temporaire
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Créer overlay de highlight
    removeHighlightOverlay();
    highlightOverlay = document.createElement('div');
    highlightOverlay.id = 'fr-highlight-overlay';
    
    const rect = element.getBoundingClientRect();
    highlightOverlay.style.cssText = `
      position: fixed;
      top: ${rect.top - 4}px;
      left: ${rect.left - 4}px;
      width: ${rect.width + 8}px;
      height: ${rect.height + 8}px;
      border: 3px solid #EF4444;
      border-radius: 4px;
      background: rgba(239, 68, 68, 0.1);
      pointer-events: none;
      z-index: 2147483646;
      animation: fr-locate-pulse 1s ease-in-out infinite;
    `;
    document.body.appendChild(highlightOverlay);
    
    // Supprimer après 3 secondes
    setTimeout(removeHighlightOverlay, 3000);
    
    return { success: true, rect: rect };
  }

  function removeHighlightOverlay() {
    if (highlightOverlay) {
      highlightOverlay.remove();
      highlightOverlay = null;
    }
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
        <span class="fr-pb-icon">▶</span>
        <span class="fr-pb-title">Lecture</span>
        <span class="fr-pb-progress-text" id="fr-pb-progress">0/0</span>
      </div>
      <div class="fr-pb-command">
        <span class="fr-pb-cmd-type" id="fr-pb-type">-</span>
        <span class="fr-pb-cmd-target" id="fr-pb-target">-</span>
      </div>
    `;
    document.body.appendChild(playbackIndicator);
  }

  function updatePlaybackIndicator(current, total, command) {
    if (!playbackIndicator) createPlaybackIndicator();
    
    const progressEl = document.getElementById('fr-pb-progress');
    const typeEl = document.getElementById('fr-pb-type');
    const targetEl = document.getElementById('fr-pb-target');
    
    if (progressEl) progressEl.textContent = `${current}/${total}`;
    if (typeEl) typeEl.textContent = command.Command || '-';
    if (targetEl) targetEl.textContent = (command.Value || command.Description || command.Target || '').substring(0, 40);
  }

  function removePlaybackIndicator() {
    if (playbackIndicator) {
      playbackIndicator.remove();
      playbackIndicator = null;
    }
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

  // ===== MESSAGE HANDLER =====

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
          .then(result => sendResponse(result))
          .catch(e => sendResponse({ success: false, error: e.message }));
        return true;
        
      case 'showPlaybackIndicator':
        createPlaybackIndicator();
        sendResponse({ success: true });
        break;
        
      case 'hidePlaybackIndicator':
        removePlaybackIndicator();
        sendResponse({ success: true });
        break;
        
      case 'updatePlaybackProgress':
        updatePlaybackIndicator(message.current, message.total, message.command);
        sendResponse({ success: true });
        break;
        
      case 'locateElement':
        const result = locateElement(message.selector);
        sendResponse(result);
        break;
        
      case 'ping':
        sendResponse({ success: true, ready: true });
        break;
    }
    return true;
  });

  console.log('[FR] Form Recorder Pro v4.1 loaded');
})();
