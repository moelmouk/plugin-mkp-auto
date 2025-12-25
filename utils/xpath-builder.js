// Utilitaire pour construire des XPath robustes et uniques

class XPathBuilder {
  constructor() {
    this.maxDepth = 8;
    this.stableAttributes = [
      'id',
      'data-testid',
      'data-cy',
      'data-test',
      'name',
      'formcontrolname',
      'aria-label',
      'aria-labelledby',
      'placeholder',
      'title',
      'type',
      'role'
    ];
  }

  /**
   * Construit un XPath unique et robuste pour un élément
   */
  buildUniqueXPath(element) {
    if (!element || element === document.body) {
      return null;
    }

    // 1. Si l'element a un ID unique et valide, utiliser directement
    if (element.id && this.isUniqueId(element.id)) {
      return `//*[@id="${this.escapeXPath(element.id)}"]`;
    }

    // 2. Construire un XPath avec contexte complet
    const paths = [];
    let current = element;
    let depth = 0;

    while (current && current !== document.body && depth < this.maxDepth) {
      const part = this.buildElementPart(current);
      if (part) {
        paths.unshift(part);
        
        // Si on a trouvé un attribut stable et unique, on peut s'arrêter
        if (this.hasUniqueStableAttribute(current)) {
          break;
        }
      }
      
      current = current.parentElement;
      depth++;
    }

    if (paths.length === 0) return null;

    const xpath = '//' + paths.join('/');
    
    // Vérifier si le XPath est unique
    if (this.isXPathUnique(xpath)) {
      return xpath;
    }

    // 3. Si pas unique, ajouter des prédicats de position
    return this.makeXPathUnique(element, xpath);
  }

  /**
   * Construit la partie XPath pour un élément
   */
  buildElementPart(element) {
    const tagName = element.tagName.toLowerCase();
    const attributes = [];

    // Ajouter les attributs stables par ordre de priorité
    for (const attr of this.stableAttributes) {
      const value = element.getAttribute(attr);
      if (value && !value.includes('function') && value.length < 100) {
        attributes.push(`@${attr}="${this.escapeXPath(value)}"`);
      }
    }

    // Si pas d'attributs stables, utiliser la classe si elle est spécifique
    if (attributes.length === 0 && element.className) {
      const classes = element.className.split(' ').filter(c => 
        c && !c.startsWith('ng-') && c.length < 30
      );
      if (classes.length > 0 && classes.length <= 3) {
        const classConditions = classes.map(c => `contains(@class, "${c}")`).join(' and ');
        return `${tagName}[${classConditions}]`;
      }
    }

    if (attributes.length > 0) {
      return `${tagName}[${attributes.join(' and ')}]`;
    }

    return tagName;
  }

  /**
   * Vérifie si l'élément a un attribut stable et unique
   */
  hasUniqueStableAttribute(element) {
    for (const attr of ['id', 'data-testid', 'data-cy', 'name']) {
      const value = element.getAttribute(attr);
      if (value && this.isUniqueAttributeValue(attr, value)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Vérifie si un ID est unique dans la page
   */
  isUniqueId(id) {
    if (!id || id.length > 100 || id.includes('function')) return false;
    try {
      const elements = document.querySelectorAll(`[id="${CSS.escape(id)}"]`);
      return elements.length === 1;
    } catch {
      return false;
    }
  }

  /**
   * Vérifie si une valeur d'attribut est unique
   */
  isUniqueAttributeValue(attr, value) {
    if (!value || value.length > 100) return false;
    try {
      const xpath = `//*[@${attr}="${this.escapeXPath(value)}"]`;
      const result = document.evaluate(
        xpath,
        document,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null
      );
      return result.snapshotLength === 1;
    } catch {
      return false;
    }
  }

  /**
   * Vérifie si un XPath est unique
   */
  isXPathUnique(xpath) {
    try {
      const result = document.evaluate(
        xpath,
        document,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null
      );
      return result.snapshotLength === 1;
    } catch {
      return false;
    }
  }

  /**
   * Rend un XPath unique en ajoutant des prédicats de position
   */
  makeXPathUnique(element, baseXPath) {
    let current = element;
    const positions = [];

    while (current && current !== document.body) {
      const parent = current.parentElement;
      if (!parent) break;

      const siblings = Array.from(parent.children).filter(
        child => child.tagName === current.tagName
      );

      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        const tagName = current.tagName.toLowerCase();
        positions.unshift({ tagName, index });
      }

      current = parent;
    }

    // Reconstruire le XPath avec les positions
    let xpath = baseXPath;
    for (const pos of positions) {
      xpath = xpath.replace(
        new RegExp(`/${pos.tagName}(?![\\[/])`),
        `/${pos.tagName}[${pos.index}]`
      );
    }

    return xpath;
  }

  /**
   * Échappe les caractères spéciaux pour XPath
   */
  escapeXPath(str) {
    if (!str) return '';
    
    // Si pas de quotes, retourner directement
    if (!str.includes("'") && !str.includes('"')) {
      return str;
    }
    
    // Si seulement des single quotes, utiliser double quotes
    if (!str.includes('"')) {
      return str;
    }
    
    // Si seulement des double quotes, utiliser single quotes
    if (!str.includes("'")) {
      return str;
    }
    
    // Si les deux, utiliser concat
    const parts = str.split("'").map(part => `'${part}'`);
    return `concat(${parts.join(", \"'\" ,")})`;
  }

  /**
   * Génère plusieurs sélecteurs alternatifs
   */
  buildAlternativeSelectors(element) {
    const selectors = [];

    // 1. XPath unique principal
    const mainXPath = this.buildUniqueXPath(element);
    if (mainXPath) {
      selectors.push({ type: 'xpath', value: mainXPath, priority: 1 });
    }

    // 2. ID si disponible
    if (element.id && this.isUniqueId(element.id)) {
      selectors.push({ type: 'id', value: element.id, priority: 2 });
    }

    // 3. CSS Selector avec attributs stables
    const cssSelector = this.buildCSSSelector(element);
    if (cssSelector) {
      selectors.push({ type: 'css', value: cssSelector, priority: 3 });
    }

    // 4. XPath par texte si pertinent
    const textXPath = this.buildTextXPath(element);
    if (textXPath) {
      selectors.push({ type: 'xpath', value: textXPath, priority: 4 });
    }

    // 5. XPath par position absolue (fallback)
    const absoluteXPath = this.buildAbsoluteXPath(element);
    if (absoluteXPath) {
      selectors.push({ type: 'xpath', value: absoluteXPath, priority: 5 });
    }

    return selectors.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Construit un sélecteur CSS
   */
  buildCSSSelector(element) {
    const parts = [];
    let current = element;
    let depth = 0;

    while (current && current !== document.body && depth < 4) {
      let part = current.tagName.toLowerCase();

      if (current.id && this.isUniqueId(current.id)) {
        part = `#${CSS.escape(current.id)}`;
        parts.unshift(part);
        break;
      }

      const formControlName = current.getAttribute('formcontrolname');
      if (formControlName) {
        part += `[formcontrolname="${formControlName}"]`;
      }

      const name = current.getAttribute('name');
      if (name) {
        part += `[name="${name}"]`;
      }

      parts.unshift(part);
      current = current.parentElement;
      depth++;
    }

    return parts.join(' > ');
  }

  /**
   * Construit un XPath basé sur le texte
   */
  buildTextXPath(element) {
    const text = element.textContent?.trim();
    if (!text || text.length > 50 || text.length < 2) return null;

    const tagName = element.tagName.toLowerCase();
    const escapedText = this.escapeXPath(text);
    
    const xpath = `//${tagName}[normalize-space(text())="${escapedText}"]`;
    return this.isXPathUnique(xpath) ? xpath : null;
  }

  /**
   * Construit un XPath absolu (fallback)
   */
  buildAbsoluteXPath(element) {
    const parts = [];
    let current = element;

    while (current && current !== document.documentElement) {
      const parent = current.parentElement;
      if (!parent) break;

      const siblings = Array.from(parent.children);
      const index = siblings.indexOf(current) + 1;
      const tagName = current.tagName.toLowerCase();
      
      parts.unshift(`${tagName}[${index}]`);
      current = parent;
    }

    return parts.length > 0 ? '/' + parts.join('/') : null;
  }
}

// Instance singleton
const xpathBuilder = new XPathBuilder();
