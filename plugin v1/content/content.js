// Content Script - Form Recorder Pro v2.5
// Optimisé pour Angular 19 - Radio/Checkbox et ng-select améliorés

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
  let lastInputElement = null;
  let inputDebounceTimer = null;
  let settings = {
    recordOpenCommand: true,
    defaultWait: 800,
    typeDelay: 20,
    highlightElements: true,
    waitTimeout: 8000 // Augmenté pour les éléments lents
  };

  // ===== VALIDATION DES SÉLECTEURS =====

  function isValidId(id) {
    if (!id || typeof id !== 'string') return false;
    if (id.includes('function') || id.includes('{') || id.includes('}')) return false;
    if (id.includes('return') || id.includes('throw') || id.includes('new ')) return false;
    if (/^a[0-9a-f]{8,}-\d+$/i.test(id)) return false;
    if (/^(ng-|cdk-|mat-)/i.test(id)) return false;
    return id.length > 3 && id.length < 200;
  }

  function sanitizeSelector(selector) {
    if (!selector) return null;
    if (selector.includes('function') || selector.includes('{')) return null;
    return selector;
  }

  // ===== GÉNÉRATION DE SÉLECTEURS POUR RADIOS/CHECKBOXES =====

  function getRadioCheckboxSelector(element) {
    const type = element.type; // 'radio' ou 'checkbox'
    const value = element.value;
    const name = element.name;
    const id = element.id;

    // Stratégie 1: Composants Angular lb-aon-choice (radios)
    const lbChoice = element.closest('lb-aon-choice');
    if (lbChoice) {
      // Trouver le label cliquable associé à cet input spécifique
      const inputId = element.id;
      if (inputId) {
        const label = lbChoice.querySelector(`label[for="${inputId}"]`);
        if (label) {
          const labelText = label.textContent?.trim();
          if (labelText && labelText.length < 80) {
            return {
              command: 'clickLabel',
              selector: `xpath=//lb-aon-choice//label[contains(normalize-space(.), "${escapeXPathString(labelText)}")]`,
              value: labelText
            };
          }
        }
      }
      // Fallback: chercher par valeur
      if (value && value !== 'on') {
        return {
          command: 'clickRadioByValue',
          selector: `xpath=//lb-aon-choice//input[@value="${value}"]/following-sibling::label | //lb-aon-choice//input[@value="${value}"]/parent::*/label`,
          value: value
        };
      }
    }

    // Stratégie 2: Composants Angular lb-aon-checkbox
    const lbCheckbox = element.closest('lb-aon-checkbox');
    if (lbCheckbox) {
      const fcName = lbCheckbox.getAttribute('formcontrolname');
      if (fcName) {
        return {
          command: 'clickCheckbox',
          selector: `xpath=//lb-aon-checkbox[@formcontrolname="${fcName}"]//label | //lb-aon-checkbox[@formcontrolname="${fcName}"]//span[contains(@class,'checkbox')]`,
          value: fcName
        };
      }
    }

    // Stratégie 3: Par ID valide de l'input + label for
    if (id && isValidId(id)) {
      const label = document.querySelector(`label[for="${id}"]`);
      if (label) {
        const labelText = label.textContent?.trim();
        if (labelText && labelText.length < 80) {
          return {
            command: 'clickLabel',
            selector: `xpath=//label[@for="${id}"] | //label[contains(normalize-space(.), "${escapeXPathString(labelText)}")]`,
            value: labelText
          };
        }
        // Utiliser l'ID du label si disponible
        if (label.id && isValidId(label.id)) {
          return {
            command: 'click',
            selector: `id=${label.id}`,
            value: ''
          };
        }
      }
      // Sinon utiliser l'ID de l'input directement
      return {
        command: 'click',
        selector: `id=${id}`,
        value: ''
      };
    }

    // Stratégie 4: Par name + value (très fiable pour les radios)
    if (name && value && value !== 'on') {
      return {
        command: 'clickRadioByValue',
        selector: `xpath=//input[@type="${type}"][@name="${name}"][@value="${value}"]`,
        value: `${name}:${value}`
      };
    }

    // Stratégie 5: Par value seule si unique
    if (value && value !== 'on' && value.length < 50) {
      return {
        command: 'clickRadioByValue',
        selector: `xpath=//input[@type="${type}"][@value="${value}"]`,
        value: value
      };
    }

    // Stratégie 6: Chercher le label parent/sibling
    const parentLabel = element.closest('label');
    if (parentLabel) {
      const labelText = parentLabel.textContent?.trim();
      if (labelText && labelText.length < 80) {
        return {
          command: 'clickLabel',
          selector: `xpath=//label[contains(normalize-space(.), "${escapeXPathString(labelText)}")]`,
          value: labelText
        };
      }
    }

    // Sibling label
    const siblingLabel = element.nextElementSibling;
    if (siblingLabel?.tagName === 'LABEL') {
      const labelText = siblingLabel.textContent?.trim();
      if (labelText && labelText.length < 80) {
        return {
          command: 'clickLabel',
          selector: `xpath=//label[contains(normalize-space(.), "${escapeXPathString(labelText)}")]`,
          value: labelText
        };
      }
    }

    // Stratégie 7: formcontrolname du parent
    const fcParent = element.closest('[formcontrolname]');
    if (fcParent) {
      const fcName = fcParent.getAttribute('formcontrolname');
      if (value && value !== 'on') {
        return {
          command: 'clickRadioByValue',
          selector: `xpath=//*[@formcontrolname="${fcName}"]//input[@type="${type}"][@value="${value}"]`,
          value: `${fcName}:${value}`
        };
      }
      // Index-based si pas de value
      const inputs = fcParent.querySelectorAll(`input[type="${type}"]`);
      const index = Array.from(inputs).indexOf(element) + 1;
      return {
        command: 'click',
        selector: `xpath=//*[@formcontrolname="${fcName}"]//input[@type="${type}"][${index}]`,
        value: `${fcName}[${index}]`
      };
    }

    // Stratégie 8: Position dans le groupe name
    if (name) {
      const allWithName = document.querySelectorAll(`input[name="${name}"]`);
      const index = Array.from(allWithName).indexOf(element) + 1;
      return {
        command: 'click',
        selector: `xpath=//input[@name="${name}"][${index}]`,
        value: `${name}[${index}]`
      };
    }

    return null;
  }

  // Échapper les caractères spéciaux pour XPath
  function escapeXPathString(str) {
    if (!str) return '';
    if (!str.includes("'")) return str;
    if (!str.includes('"')) return str;
    // Si contient les deux, on utilise concat
    return str.replace(/'/g, "\\'");
  }

  // ===== GÉNÉRATION DE SÉLECTEURS ROBUSTES =====

  function generateAllSelectors(element) {
    const selectors = [];
    
    const stableSelector = getStableAttributeSelector(element);
    if (stableSelector) selectors.push(stableSelector);
    
    if (element.id && isValidId(element.id)) {
      selectors.push(`id=${element.id}`);
    }
    
    const formContextSelector = getFormContextSelector(element);
    if (formContextSelector) selectors.push(formContextSelector);
    
    const xpathRelative = generateRelativeXPath(element);
    if (xpathRelative) selectors.push(`xpath=${xpathRelative}`);
    
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
    
    // Fallback: formcontrolname direct
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
      
      const fcName = current.getAttribute('formcontrolname');
      if (fcName && !fcName.includes('function')) {
        path.unshift(`*[@formcontrolname="${fcName}"]`);
        return '//' + path.join('//');
      }
      
      const id = current.id;
      if (id && isValidId(id)) {
        path.unshift(`*[@id="${id}"]`);
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
    const stable = getStableAttributeSelector(element);
    if (stable) return stable;
    
    const formContext = getFormContextSelector(element);
    if (formContext) return formContext;
    
    if (element.id && isValidId(element.id)) {
      return `id=${element.id}`;
    }
    
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
    
    const fcName = ngSelect.getAttribute('formcontrolname');
    const placeholder = ngSelect.getAttribute('placeholder');
    
    let selector = null;
    if (fcName && !fcName.includes('function')) {
      selector = `xpath=//ng-select[@formcontrolname="${fcName}"]`;
    } else if (placeholder) {
      selector = `xpath=//ng-select[@placeholder="${placeholder}"]`;
    }
    
    return {
      element: ngSelect,
      formControlName: fcName,
      placeholder: placeholder,
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

  // ===== GESTIONNAIRES D'ÉVÉNEMENTS =====

  function handleClick(event) {
    if (!isRecording) return;
    if (event.target.closest('#fr-indicator') || event.target.closest('#fr-playback-indicator')) return;
    
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
          { optionText: optionText }
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
          // Laisser handleChange gérer via l'input
          return;
        }
      }
      
      // Vérifier si c'est dans un lb-aon-choice ou lb-aon-checkbox
      const lbChoice = label.closest('lb-aon-choice, lb-aon-checkbox');
      if (lbChoice) {
        return; // handleChange va gérer
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
      // Utiliser le sélecteur optimisé pour radio/checkbox
      const radioInfo = getRadioCheckboxSelector(element);
      
      if (radioInfo) {
        recordCommand(
          radioInfo.command,
          radioInfo.selector,
          radioInfo.value,
          element.type === 'radio' ? `Radio: ${radioInfo.value}` : `Checkbox: ${radioInfo.value}`,
          null // Pas besoin de l'élément, on a déjà le sélecteur
        );
      } else {
        // Fallback
        recordCommand('click', '', '', element.type, element);
      }
    }
  }

  // ===== EXÉCUTION DES COMMANDES (REPLAY) =====

  async function findElement(command, timeout = 5000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      let element = findElementBySelector(command.Target);
      if (element && isElementVisible(element)) return element;
      
      if (command.Targets && command.Targets.length > 0) {
        for (const selector of command.Targets) {
          element = findElementBySelector(selector);
          if (element && isElementVisible(element)) return element;
        }
      }
      
      await sleep(150);
    }
    
    return null;
  }

  function isElementVisible(element) {
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
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
      return null;
    }
  }

  async function executeCommand(command, cmdSettings) {
    settings = { ...settings, ...cmdSettings };
    updatePlaybackIndicator(command);
    
    console.log('[FR] Exec:', command.Command, command.Value || '');
    
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
    
    const element = await findElement(command, settings.waitTimeout || 8000);
    
    if (!element) {
      console.warn('[FR] Not found, skipping');
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
  }

  async function executeClickLabel(command) {
    const element = await findElement(command, settings.waitTimeout || 8000);
    
    if (!element) {
      // Essayer de trouver par le texte du label
      if (command.Value) {
        const searchTexts = [command.Value];
        // Essayer aussi sans accents si possible
        const normalizedValue = command.Value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (normalizedValue !== command.Value) {
          searchTexts.push(normalizedValue);
        }

        for (const searchText of searchTexts) {
          const labels = document.querySelectorAll('label, span.label, span.radio-label, span.checkbox-label, div.label');
          for (const label of labels) {
            const labelText = label.textContent?.trim();
            if (labelText && (labelText.includes(searchText) || searchText.includes(labelText))) {
              if (settings.highlightElements) highlightElement(label);
              label.scrollIntoView({ behavior: 'smooth', block: 'center' });
              await sleep(200);
              await performClick(label);
              setTimeout(() => unhighlightElement(label), 300);
              return true;
            }
          }
        }
      }
      console.warn('[FR] Label not found:', command.Value);
      return false;
    }
    
    if (settings.highlightElements) highlightElement(element);
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await sleep(200);
    await performClick(element);
    setTimeout(() => unhighlightElement(element), 300);
    return true;
  }

  async function executeClickRadioByValue(command) {
    // Essayer d'abord avec le sélecteur principal
    let element = await findElement(command, settings.waitTimeout || 8000);
    
    if (element) {
      if (settings.highlightElements) highlightElement(element);
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await sleep(200);
      await performClick(element);
      setTimeout(() => unhighlightElement(element), 300);
      return true;
    }

    // Fallback: chercher par la valeur
    const value = command.Value;
    if (value) {
      // Extraire name:value si présent
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
        inputs = document.querySelectorAll(`input[name="${searchName}"][value="${searchValue}"], input[name="${searchName}"]`);
      } else {
        inputs = document.querySelectorAll(`input[value="${searchValue}"]`);
      }

      for (const input of inputs) {
        if (input.type === 'radio' || input.type === 'checkbox') {
          // Trouver le label associé ou cliquer sur l'input
          const label = document.querySelector(`label[for="${input.id}"]`) || input.closest('label');
          const target = label || input;
          
          if (settings.highlightElements) highlightElement(target);
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          await sleep(200);
          await performClick(target);
          setTimeout(() => unhighlightElement(target), 300);
          return true;
        }
      }
    }

    console.warn('[FR] Radio/checkbox not found by value:', value);
    return false;
  }

  async function performClick(element) {
    element.focus();
    await sleep(30);
    element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
    await sleep(30);
    element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
    await sleep(30);
    element.click();
  }

  async function performType(element, value) {
    element.focus();
    await sleep(50);
    element.value = '';
    element.dispatchEvent(new Event('input', { bubbles: true }));
    
    for (const char of value) {
      element.value += char;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      await sleep(settings.typeDelay);
    }
    
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  async function performSelect(element, value) {
    if (element.tagName === 'SELECT') {
      const option = Array.from(element.options).find(o => 
        o.text.trim() === value || o.value === value
      );
      if (option) {
        element.value = option.value;
        element.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  }

  async function executeNgSelectOption(command) {
    const optionText = command.Value || command.optionText;
    console.log('[FR] ng-select option:', optionText);
    
    let ngSelect = await findElement(command, 4000);
    
    if (!ngSelect) {
      // Stratégie 1: Chercher par formcontrolname dans le sélecteur
      const fcMatch = command.Target?.match(/formcontrolname="([^"]+)"/);
      if (fcMatch) {
        ngSelect = document.querySelector(`ng-select[formcontrolname="${fcMatch[1]}"]`);
        console.log('[FR] Found by formcontrolname:', fcMatch[1], !!ngSelect);
      }
    }
    
    if (!ngSelect) {
      // Stratégie 2: Chercher par placeholder dans le sélecteur
      const placeholderMatch = command.Target?.match(/placeholder="([^"]+)"/);
      if (placeholderMatch) {
        ngSelect = document.querySelector(`ng-select[placeholder="${placeholderMatch[1]}"]`);
        console.log('[FR] Found by placeholder:', placeholderMatch[1], !!ngSelect);
      }
    }
    
    if (!ngSelect) {
      // Stratégie 3: Chercher tous les ng-select visibles sans valeur sélectionnée
      const allNgSelect = document.querySelectorAll('ng-select');
      for (const ns of allNgSelect) {
        // Vérifier si visible
        const rect = ns.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          // Vérifier si pas déjà une valeur sélectionnée
          const hasValue = ns.querySelector('.ng-value:not(.ng-placeholder)');
          if (!hasValue) {
            ngSelect = ns;
            console.log('[FR] Found empty ng-select');
            break;
          }
        }
      }
    }

    if (!ngSelect) {
      // Stratégie 4: Prendre le premier ng-select visible
      const allNgSelect = document.querySelectorAll('ng-select');
      for (const ns of allNgSelect) {
        const rect = ns.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          ngSelect = ns;
          console.log('[FR] Using first visible ng-select');
          break;
        }
      }
    }
    
    if (!ngSelect) {
      console.warn('[FR] ng-select not found, skipping');
      return false;
    }
    
    if (settings.highlightElements) highlightElement(ngSelect);
    ngSelect.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await sleep(300);
    
    // Ouvrir le dropdown - essayer plusieurs méthodes
    const container = ngSelect.querySelector('.ng-select-container');
    const inputElement = ngSelect.querySelector('input');
    
    // Méthode 1: Clic sur le container
    await performClick(container || ngSelect);
    await sleep(200);
    
    // Vérifier si ouvert
    let dropdown = document.querySelector('.ng-dropdown-panel');
    
    // Méthode 2: Si pas ouvert, essayer avec l'input
    if (!dropdown && inputElement) {
      inputElement.focus();
      await sleep(100);
      await performClick(inputElement);
      await sleep(200);
    }
    
    // Attendre le dropdown avec timeout augmenté
    for (let i = 0; i < 30; i++) { // 3 secondes max
      dropdown = document.querySelector('.ng-dropdown-panel');
      if (dropdown && dropdown.offsetHeight > 0) {
        console.log('[FR] Dropdown opened after', (i + 1) * 100, 'ms');
        break;
      }
      await sleep(100);
    }
    
    if (!dropdown) {
      console.warn('[FR] ng-dropdown-panel not found after click');
      unhighlightElement(ngSelect);
      return false;
    }
    
    await sleep(300);
    
    // Trouver l'option - recherche flexible
    const options = dropdown.querySelectorAll('.ng-option:not(.ng-option-disabled)');
    let targetOption = null;
    
    // Recherche exacte d'abord
    for (const opt of options) {
      const text = opt.textContent?.trim();
      if (text === optionText) {
        targetOption = opt;
        console.log('[FR] Exact match found:', text);
        break;
      }
    }
    
    // Recherche partielle si pas trouvé
    if (!targetOption) {
      for (const opt of options) {
        const text = opt.textContent?.trim();
        if (text?.toLowerCase().includes(optionText.toLowerCase()) || 
            optionText.toLowerCase().includes(text?.toLowerCase())) {
          targetOption = opt;
          console.log('[FR] Partial match found:', text);
          break;
        }
      }
    }

    // Recherche sans accents
    if (!targetOption) {
      const normalizedSearch = optionText.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      for (const opt of options) {
        const text = opt.textContent?.trim();
        const normalizedText = text?.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        if (normalizedText?.includes(normalizedSearch) || normalizedSearch.includes(normalizedText)) {
          targetOption = opt;
          console.log('[FR] Normalized match found:', text);
          break;
        }
      }
    }
    
    if (!targetOption) {
      console.warn('[FR] Option not found:', optionText, '- Available:', Array.from(options).map(o => o.textContent?.trim()).slice(0, 5));
      unhighlightElement(ngSelect);
      // Fermer le dropdown
      await performClick(container || ngSelect);
      return false;
    }
    
    if (settings.highlightElements) highlightElement(targetOption);
    targetOption.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await sleep(150);
    await performClick(targetOption);
    
    await sleep(300);
    unhighlightElement(ngSelect);
    unhighlightElement(targetOption);
    
    console.log('[FR] ng-select option selected successfully');
    return true;
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function highlightElement(element) {
    if (!element) return;
    element.dataset.frOriginalOutline = element.style.outline;
    element.style.outline = '3px solid #4CAF50';
  }

  function unhighlightElement(element) {
    if (!element) return;
    element.style.outline = element.dataset.frOriginalOutline || '';
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
      <div class="fr-pb-header"><span class="fr-pb-icon">▶</span><span class="fr-pb-title">Lecture</span></div>
      <div class="fr-pb-command"><span class="fr-pb-cmd-type">-</span><span class="fr-pb-cmd-target">-</span></div>
    `;
    document.body.appendChild(playbackIndicator);
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
          .catch(e => sendResponse({ success: false }));
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

  console.log('[FR] Form Recorder Pro v2.5 loaded');
})();
