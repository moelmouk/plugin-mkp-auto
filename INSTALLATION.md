# Guide d'installation - Form Recorder Pro v3.0

## 📍 Pré-requis

- **Navigateur** : Google Chrome version 88 ou supérieure
- **Système d'exploitation** : Windows, macOS, ou Linux
- **Espace disque** : 5 MB minimum

---

## 🚀 Méthode 1 : Installation depuis le Chrome Web Store (Recommandé)

### Étape 1 : Accédez au Chrome Web Store
1. Ouvrez Google Chrome
2. Visitez : [Chrome Web Store - Form Recorder Pro](chrome://webstore/)
3. Recherchez "Form Recorder Pro"

### Étape 2 : Installation
1. Cliquez sur le bouton **"Ajouter à Chrome"**
2. Une fenêtre popup s'ouvre avec les permissions nécessaires
3. Lisez les permissions demandées :
   - 🔒 **Accéder aux données sur tous les sites** : Nécessaire pour enregistrer vos actions
   - 💾 **Stockage local** : Pour sauvegarder vos scénarios
   - 📝 **Onglets actifs** : Pour communiquer avec les pages
4. Cliquez sur **"Ajouter l'extension"**

### Étape 3 : Vérification
1. L'icône 🎥 apparaît dans la barre d'outils Chrome (en haut à droite)
2. Si elle n'est pas visible :
   - Cliquez sur l'icône puzzle 🧩 dans la barre d'outils
   - Trouvez "Form Recorder Pro"
   - Cliquez sur l'icône épingle 📌 pour la fixer

### Étape 4 : Premier lancement
1. Cliquez sur l'icône 🎥
2. Le popup s'ouvre avec l'interface principale
3. Vous êtes prêt à utiliser l'extension !

---

## 👨‍💻 Méthode 2 : Installation manuelle (Mode développeur)

Cette méthode est recommandée pour :
- Les développeurs qui veulent modifier le code
- Les testeurs qui veulent essayer les versions en développement
- Les utilisateurs qui veulent inspecter le code source

### Étape 1 : Télécharger le code source

#### Option A : Via Git (Recommandé)
```bash
# Cloner le repository
git clone https://github.com/votre-username/form-recorder-pro.git

# Accéder au dossier
cd form-recorder-pro
```

#### Option B : Téléchargement direct
1. Visitez la page GitHub du projet
2. Cliquez sur le bouton vert **"Code"**
3. Sélectionnez **"Download ZIP"**
4. Extraire le fichier ZIP dans un dossier de votre choix

### Étape 2 : Activer le mode développeur dans Chrome

1. Ouvrez Google Chrome
2. Tapez dans la barre d'adresse : `chrome://extensions/`
3. En haut à droite, activez l'interrupteur **"Mode développeur"**
   - L'interrupteur devient bleu
   - De nouveaux boutons apparaissent

### Étape 3 : Charger l'extension

1. Cliquez sur le bouton **"Charger l'extension non empaquetée"**
2. Une fenêtre de sélection de dossier s'ouvre
3. Naviguez vers le dossier du projet
4. Sélectionnez le dossier `/app` (celui qui contient `manifest.json`)
5. Cliquez sur **"Sélectionner le dossier"**

### Étape 4 : Vérification de l'installation

1. L'extension apparaît dans la liste avec :
   - Nom : **Form Recorder Pro**
   - Version : **3.0.0**
   - ID : Un identifiant unique
   - Statut : Activée ✅

2. Vérifiez qu'il n'y a pas d'erreurs :
   - Aucune erreur ne doit être affichée en rouge
   - Si des erreurs apparaissent, consultez la section Dépannage

3. L'icône 🎥 doit être visible dans la barre d'outils

### Étape 5 : Test de fonctionnement

1. Cliquez sur l'icône 🎥
2. Le popup doit s'ouvrir sans erreur
3. Ouvrez la console Chrome (F12) pour vérifier les logs :
   ```
   [FR BG] Form Recorder Pro v3.0 background script loaded
   [FR Popup] Initialized
   ```

---

## 🔄 Mise à jour de l'extension

### Via Chrome Web Store
Les mises à jour sont automatiques. Chrome vérifie les nouvelles versions toutes les quelques heures.

Pour forcer une mise à jour :
1. Allez dans `chrome://extensions/`
2. Cliquez sur le bouton **"Mettre à jour"** en haut

### Mode développeur
1. Téléchargez la nouvelle version du code
2. Allez dans `chrome://extensions/`
3. Cliquez sur le bouton **"Recharger"** 🔄 sous Form Recorder Pro
4. Ou utilisez Git :
   ```bash
   git pull origin main
   ```
   Puis rechargez dans Chrome

---

## 🛡️ Permissions expliquées

L'extension demande les permissions suivantes :

### 🌐 `<all_urls>` - Accès à tous les sites web
**Pourquoi ?** Pour pouvoir enregistrer et rejouer vos actions sur n'importe quelle page web.

**Ce que nous faisons :**
- Capture des clics, saisies et sélections
- Injection du script content.js pour la lecture

**Ce que nous ne faisons PAS :**
- Collecter vos données personnelles
- Envoyer vos actions vers un serveur
- Suivre votre navigation

### 💾 `storage` - Stockage local
**Pourquoi ?** Pour sauvegarder vos scénarios localement dans votre navigateur.

**Ce que nous stockons :**
- Vos scénarios enregistrés
- L'organisation des dossiers
- Vos paramètres personnalisés

**Où ?** Uniquement dans IndexedDB de votre navigateur, jamais sur un serveur.

### 📝 `tabs` - Gestion des onglets
**Pourquoi ?** Pour ouvrir de nouveaux onglets lors de la lecture de scénarios et communiquer entre les différentes parties de l'extension.

### 📤 `scripting` - Injection de scripts
**Pourquoi ?** Pour injecter le content script qui permet d'enregistrer et rejouer vos actions.

---

## ✅ Vérification de l'installation

### Test rapide

1. **Ouvrez le popup**
   - Cliquez sur l'icône 🎥
   - Le popup doit s'ouvrir instantanément

2. **Vérifiez les onglets**
   - Vous devriez voir 3 onglets : Scénarios, Paramètres, Export

3. **Vérifiez l'état**
   - Le statut doit être "Prêt" avec un point vert

4. **Testez un enregistrement**
   - Ouvrez une page web simple (ex: google.com)
   - Cliquez sur "Démarrer l'enregistrement"
   - Un indicateur rouge "REC" doit apparaître en haut à droite
   - Cliquez quelque part sur la page
   - Cliquez sur "Arrêter"
   - Un scénario doit apparaître dans l'onglet Scénarios

### Console de débogage

Si vous rencontrez des problèmes, ouvrez la console :

1. **Console du popup**
   - Clic droit sur le popup > Inspecter
   - Onglet Console
   - Vous devriez voir : `[FR Popup] Initialized`

2. **Console de la page**
   - F12 sur la page web
   - Onglet Console
   - Vous devriez voir : `[FR] Form Recorder Pro v3.0 content script loaded`

3. **Console du background**
   - Allez dans `chrome://extensions/`
   - Sous Form Recorder Pro, cliquez sur "Service worker"
   - Vous devriez voir : `[FR BG] Form Recorder Pro v3.0 background script loaded`

---

## 🔧 Dépannage de l'installation

### Problème 1 : L'extension n'apparaît pas

**Causes possibles :**
- Le mode développeur n'est pas activé
- Mauvais dossier sélectionné

**Solutions :**
1. Vérifiez que le mode développeur est activé (interrupteur bleu)
2. Vérifiez que vous avez sélectionné le dossier contenant `manifest.json`
3. Essayez de recharger l'extension

### Problème 2 : Erreurs lors du chargement

**Erreur : "Manifest file is missing or unreadable"**
- Vérifiez que `manifest.json` existe dans le dossier
- Vérifiez les permissions de lecture du fichier

**Erreur : "Invalid manifest"**
- Le fichier `manifest.json` est mal formaté
- Vérifiez avec un validateur JSON
- Téléchargez à nouveau le code source

**Erreur : "Could not load javascript 'xxx.js'"**
- Un fichier JavaScript est manquant
- Vérifiez que tous les fichiers sont présents :
  - `background.js`
  - `content/content.js`
  - `popup/popup.js`
  - `utils/storage.js`
  - `utils/xpath-builder.js`

### Problème 3 : Le popup ne s'ouvre pas

**Solutions :**
1. Redémarrez Chrome complètement
2. Désactivez puis réactivez l'extension
3. Rechargez l'extension (bouton 🔄)
4. Vérifiez la console pour des erreurs

### Problème 4 : Conflit avec d'autres extensions

**Symptômes :**
- L'extension se charge mais ne fonctionne pas correctement
- Des erreurs apparaissent dans la console

**Solutions :**
1. Désactivez temporairement les autres extensions
2. Réactivez-les une par une pour identifier le conflit
3. Les extensions qui modifient le DOM peuvent causer des conflits

### Problème 5 : IndexedDB non disponible

**Erreur : "Failed to open database"**

**Solutions :**
1. Vérifiez que les cookies ne sont pas bloqués
2. Dans Chrome : Paramètres > Confidentialité > Cookies
3. Autorisez les cookies pour les extensions

---

## 📱 Installation sur d'autres navigateurs

### Microsoft Edge
Form Recorder Pro est compatible avec Edge (basé sur Chromium) :

1. Activez le mode développeur dans `edge://extensions/`
2. Suivez les mêmes étapes que pour Chrome

### Brave Browser
Compatible, mêmes étapes que Chrome.

### Opera
Compatible, accédez à `opera://extensions/`

### Firefox
⚠️ **Non compatible actuellement**. Form Recorder Pro utilise Manifest V3 qui n'est pas encore pleinement supporté par Firefox. Une version Firefox est prévue pour la v3.2.

---

## 🛠️ Configuration post-installation

### Étape 1 : Personnaliser les paramètres

1. Ouvrez le popup
2. Allez dans l'onglet "Paramètres"
3. Ajustez selon vos besoins :
   - Délais (augmentez pour pages lentes)
   - Retry (augmentez pour sites dynamiques)
   - Options de lecture

### Étape 2 : Créer votre premier scénario

1. Ouvrez une page de test simple
2. Enregistrez quelques actions de base
3. Rejouez pour tester
4. Si ça fonctionne, vous êtes prêt !

### Étape 3 : Organiser avec des dossiers

1. Créez un dossier "Tests"
2. Déplacez votre scénario de test dedans
3. Testez la lecture depuis le dossier

---

## 📞 Support

Si vous rencontrez des problèmes d'installation :

1. **Consultez la FAQ** : [README.md](README.md)
2. **Ouvrez une issue** sur GitHub avec :
   - Version de Chrome
   - Système d'exploitation
   - Message d'erreur complet
   - Captures d'écran si possible
3. **Contactez le support** via l'onglet Support dans l'extension

---

**Félicitations ! 🎉 Form Recorder Pro est maintenant installé et prêt à l'emploi.**
