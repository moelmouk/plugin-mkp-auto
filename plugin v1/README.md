# Form Recorder Pro v2.0

Un plugin Chrome professionnel pour enregistrer et rejouer vos formulaires, **100% compatible avec UI.Vision RPA**.

## ✨ Fonctionnalités

### Enregistrement
- 🎯 **Sélecteurs multiples** avec fallback (XPath, ID, CSS)
- 📝 **Commandes standards** : `click`, `type`, `select`, `open`, `waitForElementVisible`
- 🔄 **Format compatible UI.Vision** pour l'import/export
- ⏱️ **Debouncing intelligent** pour éviter les doublons

### Lecture (Replay)
- ▶️ **Exécution séquentielle** avec délais configurables
- 🎨 **Highlight des éléments** pendant l'exécution
- ⏸️ **Pause/Reprise** disponible
- 🔍 **Recherche de sélecteurs** avec fallback automatique

### Interface
- 📊 **3 onglets** : Enregistrer, Scénarios, Options
- ✏️ **Édition des commandes** en direct
- 💾 **Sauvegarde locale** illimitée
- 📤 **Export/Import JSON** compatible UI.Vision

## 📦 Installation

### Mode Développeur
1. Téléchargez ou clonez ce dossier
2. Ouvrez Chrome → `chrome://extensions/`
3. Activez le **Mode développeur** (en haut à droite)
4. Cliquez **"Charger l'extension non empaquetée"**
5. Sélectionnez le dossier `chrome-extension`

## 🚀 Utilisation

### Enregistrer un scénario
1. Naviguez vers la page web cible
2. Cliquez sur l'icône Form Recorder Pro
3. Cliquez **"Enregistrer"** (bouton rouge)
4. Effectuez vos actions (clics, saisies, sélections...)
5. Cliquez **"Arrêter"**

### Rejouer un scénario
1. Assurez-vous d'être sur la bonne page (ou laissez le scénario naviguer)
2. Cliquez **"Rejouer"**
3. Observez l'exécution automatique

### Éditer une commande
- Survolez une commande dans la liste
- Cliquez l'icône ✏️ pour modifier
- Changez la commande, le sélecteur ou la valeur

### Sauvegarder/Exporter
- **Sauvegarder** : Stockage local dans le navigateur
- **Exporter** : Télécharge un fichier JSON compatible UI.Vision

## 📋 Format des commandes

Le format est 100% compatible avec UI.Vision :

```json
{
  "Name": "Mon Scénario",
  "CreationDate": "2024-12-24",
  "Commands": [
    {
      "Command": "open",
      "Target": "https://example.com",
      "Value": "",
      "Targets": [],
      "Description": "Page initiale"
    },
    {
      "Command": "click",
      "Target": "id=mon-bouton",
      "Value": "",
      "Targets": [
        "id=mon-bouton",
        "xpath=//*[@id=\"mon-bouton\"]",
        "css=#mon-bouton"
      ],
      "Description": ""
    },
    {
      "Command": "type",
      "Target": "id=email-input",
      "Value": "test@example.com",
      "Targets": [...],
      "Description": ""
    }
  ]
}
```

## 🎯 Types de sélecteurs

| Préfixe | Exemple | Description |
|---------|---------|-------------|
| `id=` | `id=mon-element` | Sélection par ID (prioritaire) |
| `xpath=` | `xpath=//*[@id="x"]` | XPath absolu ou relatif |
| `css=` | `css=.class > div` | Sélecteur CSS |

## ⚙️ Options

| Option | Description | Défaut |
|--------|-------------|--------|
| Délai entre actions | Temps d'attente entre chaque commande | 500ms |
| Délai de frappe | Temps entre chaque caractère | 30ms |
| Surligner les éléments | Highlight vert pendant l'exécution | ✓ |
| Attente intelligente | Attend que l'élément soit visible | ✓ |

## 📁 Structure du projet

```
chrome-extension/
├── manifest.json           # Configuration Chrome Extension
├── background/
│   └── background.js       # Service Worker
├── content/
│   ├── content.js          # Injection dans les pages
│   └── content.css         # Styles (indicateur REC)
├── popup/
│   ├── popup.html          # Interface utilisateur
│   ├── popup.js            # Logique du popup
│   └── popup.css           # Styles
├── icons/                  # Icônes de l'extension
└── README.md
```

## 🔄 Compatibilité UI.Vision

Les fichiers exportés par Form Recorder Pro peuvent être directement importés dans UI.Vision RPA et vice-versa.

### Commandes supportées
- ✅ `open` - Ouvrir une URL
- ✅ `click` - Cliquer sur un élément
- ✅ `type` - Saisir du texte
- ✅ `select` - Sélectionner dans un dropdown
- ✅ `waitForElementVisible` - Attendre qu'un élément soit visible

## 🐛 Résolution des problèmes

### L'enregistrement ne fonctionne pas
- Vérifiez que vous n'êtes pas sur une page `chrome://`
- Rafraîchissez la page et réessayez

### Les sélecteurs ne trouvent pas l'élément
- Éditez la commande et utilisez un sélecteur alternatif
- Les Targets contiennent plusieurs options de fallback

### Le replay est trop rapide/lent
- Ajustez le "Délai entre actions" dans les Options

## 📜 Licence

MIT License - Libre d'utilisation et de modification.

## 🙏 Crédits

Inspiré par [UI.Vision RPA](https://ui.vision) - Le meilleur outil d'automatisation web.
