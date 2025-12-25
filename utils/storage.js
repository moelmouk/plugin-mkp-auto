// Gestion du stockage avec IndexedDB pour Form Recorder Pro

class StorageManager {
  constructor() {
    this.dbName = 'FormRecorderDB';
    this.dbVersion = 1;
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Store pour les scénarios
        if (!db.objectStoreNames.contains('scenarios')) {
          const scenarioStore = db.createObjectStore('scenarios', { keyPath: 'id' });
          scenarioStore.createIndex('folderId', 'folderId', { unique: false });
          scenarioStore.createIndex('name', 'name', { unique: false });
          scenarioStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Store pour les dossiers
        if (!db.objectStoreNames.contains('folders')) {
          const folderStore = db.createObjectStore('folders', { keyPath: 'id' });
          folderStore.createIndex('parentId', 'parentId', { unique: false });
          folderStore.createIndex('name', 'name', { unique: false });
        }

        // Store pour les paramètres
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };
    });
  }

  // === SCÉNARIOS ===

  async saveScenario(scenario) {
    if (!this.db) await this.init();
    
    const scenarioData = {
      ...scenario,
      id: scenario.id || this.generateId(),
      folderId: scenario.folderId || 'root',
      createdAt: scenario.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['scenarios'], 'readwrite');
      const store = transaction.objectStore('scenarios');
      const request = store.put(scenarioData);

      request.onsuccess = () => resolve(scenarioData);
      request.onerror = () => reject(request.error);
    });
  }

  async getScenario(id) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['scenarios'], 'readonly');
      const store = transaction.objectStore('scenarios');
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllScenarios() {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['scenarios'], 'readonly');
      const store = transaction.objectStore('scenarios');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getScenariosByFolder(folderId) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['scenarios'], 'readonly');
      const store = transaction.objectStore('scenarios');
      const index = store.index('folderId');
      const request = index.getAll(folderId);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteScenario(id) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['scenarios'], 'readwrite');
      const store = transaction.objectStore('scenarios');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // === DOSSIERS ===

  async createFolder(name, parentId = 'root') {
    if (!this.db) await this.init();

    const folder = {
      id: this.generateId(),
      name,
      parentId,
      createdAt: new Date().toISOString()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['folders'], 'readwrite');
      const store = transaction.objectStore('folders');
      const request = store.add(folder);

      request.onsuccess = () => resolve(folder);
      request.onerror = () => reject(request.error);
    });
  }

  async getFolder(id) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['folders'], 'readonly');
      const store = transaction.objectStore('folders');
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllFolders() {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['folders'], 'readonly');
      const store = transaction.objectStore('folders');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteFolder(id) {
    if (!this.db) await this.init();

    // Déplacer les scénarios et sous-dossiers vers le parent
    const folder = await this.getFolder(id);
    if (folder) {
      const scenarios = await this.getScenariosByFolder(id);
      for (const scenario of scenarios) {
        scenario.folderId = folder.parentId;
        await this.saveScenario(scenario);
      }

      const subfolders = await this.getSubfolders(id);
      for (const subfolder of subfolders) {
        subfolder.parentId = folder.parentId;
        await this.updateFolder(subfolder);
      }
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['folders'], 'readwrite');
      const store = transaction.objectStore('folders');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async updateFolder(folder) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['folders'], 'readwrite');
      const store = transaction.objectStore('folders');
      const request = store.put(folder);

      request.onsuccess = () => resolve(folder);
      request.onerror = () => reject(request.error);
    });
  }

  async getSubfolders(parentId) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['folders'], 'readonly');
      const store = transaction.objectStore('folders');
      const index = store.index('parentId');
      const request = index.getAll(parentId);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // === EXPORT / IMPORT ===

  async exportAll() {
    const scenarios = await this.getAllScenarios();
    const folders = await this.getAllFolders();

    return {
      version: '3.0',
      exportDate: new Date().toISOString(),
      folders,
      scenarios
    };
  }

  async importAll(data) {
    if (!this.db) await this.init();

    // Importer les dossiers d'abord
    for (const folder of data.folders || []) {
      try {
        const transaction = this.db.transaction(['folders'], 'readwrite');
        const store = transaction.objectStore('folders');
        await store.put(folder);
      } catch (error) {
        console.error('Error importing folder:', folder.name, error);
      }
    }

    // Puis les scénarios
    for (const scenario of data.scenarios || []) {
      try {
        await this.saveScenario(scenario);
      } catch (error) {
        console.error('Error importing scenario:', scenario.name, error);
      }
    }
  }

  // === PARAMÈTRES ===

  async getSetting(key, defaultValue = null) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['settings'], 'readonly');
      const store = transaction.objectStore('settings');
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.value : defaultValue);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async setSetting(key, value) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['settings'], 'readwrite');
      const store = transaction.objectStore('settings');
      const request = store.put({ key, value });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // === UTILITAIRES ===

  generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async clear() {
    if (!this.db) await this.init();

    const stores = ['scenarios', 'folders', 'settings'];
    for (const storeName of stores) {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      await store.clear();
    }
  }
}

// Instance singleton
const storage = new StorageManager();
