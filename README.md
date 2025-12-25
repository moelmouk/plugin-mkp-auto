# Form Recorder Pro v3.0

🎥 **Extension Chrome professionnelle pour enregistrer et rejouer automatiquement la saisie de formulaires**

## 🌟 Caractéristiques

### Fonctionnalités principales
- ✅ **Enregistrement intelligent** : Capture toutes vos interactions (clics, saisies, sélections)
- ✅ **Sélecteurs XPath robustes** : Utilise des identifiants uniques pour une fiabilité maximale
- ✅ **Support ng-select avancé** : Gestion complète des composants Angular ng-select
- ✅ **Gestion des radio/checkbox** : Détection précise avec multiples stratégies de sélection
- ✅ **Timing précis** : Enregistre et respecte les délais entre les actions
- ✅ **Retry automatique** : Tentatives multiples en cas d'échec
- ✅ **Organisation hiérarchique** : Dossiers et sous-dossiers pour classer vos scénarios
- ✅ **Lancement groupé** : Exécution séquentielle ou parallèle de plusieurs scénarios
- ✅ **Export/Import JSON** : Sauvegardez et partagez vos scénarios
- ✅ **IndexedDB** : Stockage local illimité pour vos données

### Bugs corrigés par rapport à la v2.5

✅ **Sélecteurs non uniques** : Les XPath générés sont maintenant toujours uniques avec contexte hiérarchique

✅ **Labels non trouvés** : Recherche avancée avec normalisation de texte, sans accents, recherche partielle

✅ **ng-select dropdown ne s'ouvre pas** : 5 méthodes différentes pour ouvrir le dropdown

✅ **Options ng-select non trouvées** : Recherche flexible avec exacte, normalisée, partielle et par mots-clés

✅ **Pas de gestion du timing** : Enregistrement automatique des délais entre actions

✅ **Confusion entre éléments** : Détection précise avec validation d'unicité

---

## 📚 Table des matières

1. [Installation](#installation)
2. [Guide d'utilisation](#guide-dutilisation)
3. [Fonctionnalités avancées](#fonctionnalités-avancées)
4. [Configuration](#configuration)
5. [Développement](#développement)
6. [Dépannage](#dépannage)
7. [Changelog](#changelog)

---

## 📦 Installation

### Méthode 1 : Installation depuis le Chrome Web Store (Recommandé)
1. Visitez la page de l'extension sur le Chrome Web Store
2. Cliquez sur "Ajouter à Chrome"
3. Confirmez l'installation

### Méthode 2 : Installation manuelle (Mode développeur)

1. **Téléchargez le code source**
   ```bash
   git clone <repository-url>
   cd form-recorder-pro
   ```

2. **Ouvrez Chrome et accédez aux extensions**
   - Tapez `chrome://extensions/` dans la barre d'adresse
   - OU Menu Chrome > Plus d'outils > Extensions

3. **Activez le mode développeur**
   - Cliquez sur l'interrupteur en haut à droite

4. **Chargez l'extension**
   - Cliquez sur "Charger l'extension non empaquetée"
   - Sélectionnez le dossier du projet `/app`

5. **Vérification**
   - L'icône 🎥 devrait apparaître dans la barre d'outils
   - Cliquez dessus pour ouvrir le popup

---

## 📖 Guide d'utilisation

### 1️⃣ Enregistrer un scénario

1. **Ouvrez le popup**
   - Cliquez sur l'icône 🎥 dans la barre d'outils

2. **Nommez votre scénario** (optionnel)
   - Entrez un nom dans le champ "Nom du scénario"
   - Si vide, un nom automatique sera généré

3. **Démarrez l'enregistrement**
   - Cliquez sur le bouton "⏺ Démarrer l'enregistrement"
   - Un indicateur rouge "REC" apparaît en haut à droite de la page

4. **Effectuez vos actions**
   - Cliquez sur les éléments
   - Remplissez les champs
   - Sélectionnez des options
   - Toutes les actions sont capturées automatiquement

5. **Arrêtez l'enregistrement**
   - Cliquez sur "⏹ Arrêter"
   - Le scénario est automatiquement sauvegardé

### 2️⃣ Rejouer un scénario

#### Méthode simple
1. Ouvrez le popup
2. Dans l'onglet "Scénarios", trouvez votre scénario
3. Cliquez sur le bouton "▶" à droite
4. Choisissez :
   - **Onglet actuel** : Lance le scénario dans la page actuelle
   - **Nouvel onglet** : Ouvre une nouvelle page et lance le scénario
5. Cliquez sur "Lancer"

#### Lancement groupé
1. Cochez les cases des scénarios à lancer
2. Cliquez sur "▶ Lancer la sélection" en bas
3. Choisissez le mode :
   - **Séquentiel** : Exécute les scénarios les uns après les autres
   - **Parallèle** : Ouvre un onglet pour chaque scénario

### 3️⃣ Organiser avec des dossiers

1. **Créer un dossier**
   - Cliquez sur "📂 Nouveau dossier"
   - Entrez le nom du dossier

2. **Déplacer un scénario** (glisser-déposer)
   - Sélectionnez un scénario
   - Faites-le glisser vers un dossier

3. **Lancer tous les scénarios d'un dossier**
   - Cliquez sur "▶" à droite du dossier

---

## 🚀 Fonctionnalités avancées

### Gestion des délais

Par défaut, le plugin enregistre le temps entre chaque action et le respecte lors de la lecture.

Vous pouvez ajuster cela dans les **Paramètres** :
- **Respecter le timing enregistré** : Utilise les délais réels
- **Délai par défaut** : Utilisé si le timing n'est pas respecté
- **Délai maximum** : Limite les délais trop longs

### Retry automatique

Si un élément n'est pas trouvé immédiatement :
- Le plugin attend et réessaie automatiquement
- Par défaut : 3 tentatives avec 500ms entre chaque
- Configurable dans les paramètres

### Export/Import

#### Exporter tous vos scénarios
1. Onglet "Export"
2. Cliquez sur "📥 Exporter tout"
3. Un fichier JSON est téléchargé avec tous vos scénarios et dossiers

#### Importer des scénarios
1. Onglet "Export"
2. Cliquez sur "📤 Importer"
3. Sélectionnez le fichier JSON
4. Les scénarios sont ajoutés à votre bibliothèque

### Recherche

Utilisez la barre de recherche en haut de l'onglet "Scénarios" pour filtrer par nom.

---

## ⚙️ Configuration

### Paramètres de lecture

| Paramètre | Description | Valeur par défaut |
|-----------|-------------|---------------------|
| Surligner les éléments | Affiche un contour vert pendant la lecture | Activé |
| Respecter le timing | Utilise les délais enregistrés | Activé |
| Arrêter en cas d'erreur | Stoppe la lecture si une action échoue | Désactivé |
| Délai par défaut | Temps d'attente entre actions (ms) | 300 |
| Délai maximum | Limite supérieure des délais (ms) | 5000 |
| Timeout d'attente | Temps max pour trouver un élément (ms) | 10000 |
| Délai de frappe | Temps entre chaque caractère (ms) | 50 |

### Paramètres avancés

| Paramètre | Description | Valeur par défaut |
|-----------|-------------|---------------------|
| Tentatives de retry | Nombre de tentatives pour trouver un élément | 3 |
| Délai entre retry | Temps entre chaque tentative (ms) | 500 |

---

## 👨‍💻 Développement

### Architecture

```
form-recorder-pro/
├── manifest.json          # Configuration de l'extension
├── background.js          # Service worker (gestion des messages)
├── content/
│   ├── content.js         # Script injecté (enregistrement/lecture)
│   └── content.css        # Styles des indicateurs
├── popup/
│   ├── popup.html         # Interface utilisateur
│   ├── popup.js           # Logique de l'interface
│   └── popup.css          # Styles de l'interface
├── utils/
│   ├── storage.js         # Gestion IndexedDB
│   └── xpath-builder.js   # Construction XPath robuste
└── icons/                 # Icônes de l'extension
```

### Technologies utilisées

- **Manifest V3** : Dernière version des extensions Chrome
- **IndexedDB** : Base de données locale pour stockage illimité
- **XPath & CSS Selectors** : Localisation précise des éléments
- **Service Worker** : Gestion des messages en arrière-plan
- **Vanilla JavaScript** : Pas de dépendances externes

### Contribuer

1. Fork le projet
2. Créez une branche (`git checkout -b feature/AmazingFeature`)
3. Committez vos changements (`git commit -m 'Add AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrez une Pull Request

---

## 🔧 Dépannage

### Problème : L'élément n'est pas trouvé lors de la lecture

**Causes possibles :**
- La page a changé depuis l'enregistrement
- L'élément charge lentement

**Solutions :**
1. Augmentez le "Timeout d'attente" dans les paramètres
2. Augmentez les "Tentatives de retry"
3. Ré-enregistrez le scénario sur la page actuelle

### Problème : Les ng-select ne s'ouvrent pas

**Solution :**
- Le plugin essaie 5 méthodes différentes
- Augmentez le délai entre retry (500ms → 1000ms)
- Vérifiez que la page est complètement chargée

### Problème : Les délais sont trop rapides/lents

**Solution :**
- Désactivez "Respecter le timing enregistré"
- Ajustez le "Délai par défaut"

### Problème : L'extension ne s'affiche pas

**Solution :**
1. Vérifiez que l'extension est activée dans `chrome://extensions/`
2. Actualisez la page
3. Redémarrez Chrome

---

## 📝 Changelog

### Version 3.0.0 (Actuelle)

#### ✨ Nouvelles fonctionnalités
- 📁 Système de dossiers/sous-dossiers hiérarchique
- 🚀 Lancement groupé de scénarios (séquentiel/parallèle)
- ⏱️ Enregistrement et respect automatique du timing
- 📥 Export/Import JSON complet
- 🔍 Retry automatique configurable
- 🎯 Sélecteurs XPath ultra-robustes

#### 🐛 Corrections de bugs
- ✅ XPath toujours uniques avec contexte hiérarchique
- ✅ Recherche avancée de labels (normalisation, accents)
- ✅ 5 stratégies d'ouverture ng-select dropdown
- ✅ Recherche flexible d'options ng-select
- ✅ Détection précise des radio/checkbox
- ✅ Gestion des éléments à chargement lent

#### 🔧 Améliorations techniques
- Migration vers Manifest V3
- Utilisation d'IndexedDB pour stockage illimité
- Architecture modulaire avec utils/
- Interface utilisateur moderne et responsive
- Messages d'erreur explicites

### Version 2.5.0 (Ancienne)
- Enregistrement de base
- Support ng-select initial
- Export JSON simple

---

## 💬 Support

Pour toute question ou problème :
- Ouvrez une issue sur GitHub
- Consultez la documentation technique
- Contactez le support

---

## 📜 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

---

## 🚀 Roadmap

### Version 3.1 (Prévue)
- [ ] Variables dynamiques dans les scénarios
- [ ] Assertions et validations
- [ ] Export en code (Puppeteer, Playwright)
- [ ] Synchronisation cloud

### Version 3.2 (Prévue)
- [ ] Enregistrement de screenshots
- [ ] Rapports d'exécution détaillés
- [ ] Planification automatique
- [ ] Intégration CI/CD

---

**Form Recorder Pro v3.0** - Conçu avec ❤️ pour simplifier l'automatisation web
