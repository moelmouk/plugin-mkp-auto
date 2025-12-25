# Form Recorder Pro v3.0

Un plugin Chrome professionnel pour enregistrer et rejouer vos formulaires, **100% compatible avec UI.Vision RPA**, optimisé pour **Angular 19**.

## 🆕 Nouveautés v3.0

### Mode Debug
- 🔍 **Panneau de debug en temps réel** : Visualisez les logs directement sur la page
- ✅ Logs de succès, ⚠️ avertissements, ❌ erreurs avec horodatage
- Activation/désactivation via le bouton 🔍 dans l'interface

### Amélioration de la gestion des erreurs
- **Bannière d'erreur** visible dans le popup
- **Feedback détaillé** sur chaque commande en échec
- **Recherche de fallback** améliorée pour les sélecteurs

### Nouvelles commandes
- `clickLabel` : Clic sur label de radio/checkbox par texte
- `clickRadioByValue` : Sélection de radio par valeur
- `waitForElementVisible` : Attendre qu'un élément soit visible
- `pause` : Pause de X millisecondes
- `typeAndSearch` : Taper et chercher dans un ng-select

### Optimisation des sélecteurs
- **Priorité aux IDs** même longs (IDs Angular)
- **Meilleure détection ng-select** avec autocomplétion
- **Normalisation des textes** (accents, espaces, casse)
- **Fallback automatique** sur Targets alternatifs

### Interface améliorée
- Bouton **Ajouter une commande** manuellement
- Bouton **Dupliquer** une commande
- Bouton **Charger** un scénario (sans le jouer)
- Liste des commandes supportées dans les Options

## ✨ Fonctionnalités

### Enregistrement
- 🎯 **Sélecteurs multiples** avec fallback (ID, XPath, CSS, formcontrolname)
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
5. Sélectionnez le dossier `plugin v1`

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
4. Consultez le panneau debug pour les détails

### Éditer une commande
- Survolez une commande dans la liste
- Cliquez l'icône ✏️ pour modifier
- Changez la commande, le sélecteur ou la valeur

### Ajouter une commande manuellement
- Cliquez le bouton **+** à côté de "Commandes"
- Choisissez le type de commande
- Entrez le sélecteur (format: `id=xxx`, `xpath=//...`, `css=...`)

### Mode Debug
- Cliquez sur 🔍 dans l'en-tête pour activer/désactiver
- Le panneau apparaît en bas à gauche de la page
- Affiche les logs en temps réel pendant l'enregistrement et la lecture

## 📋 Format des commandes

Le format est 100% compatible avec UI.Vision :

```json
{
  "Name": "Mon Scénario",
  "CreationDate": "2024-12-25",
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
    },
    {
      "Command": "selectNgOption",
      "Target": "xpath=//ng-select[@formcontrolname=\"profession\"]",
      "Value": "Développeur Informatique",
      "Targets": [...],
      "Description": "Sélection profession"
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

### Sélecteurs recommandés pour Angular

| Type | Exemple | Utilisation |
|------|---------|-------------|
| Par ID | `id=market-place_xxx_input` | Meilleur choix si l'ID est stable |
| Par formcontrolname | `xpath=//*[@formcontrolname="email"]//input` | Pour les composants Angular |
| Par placeholder | `xpath=//input[@placeholder="e-mail"]` | Alternative pratique |

## ⚙️ Options

| Option | Description | Défaut |
|--------|-------------|--------|
| Délai entre actions | Temps d'attente entre chaque commande | 1000ms |
| Délai de frappe | Temps entre chaque caractère | 30ms |
| Timeout recherche | Temps max pour trouver un élément | 10000ms |
| Surligner les éléments | Highlight vert pendant l'exécution | ✓ |
| Attente intelligente | Attend que l'élément soit visible | ✓ |
| Mode debug | Affiche le panneau de logs | ✓ |

## 📁 Structure du projet

```
plugin v1/
├── manifest.json           # Configuration Chrome Extension
├── background/
│   └── background.js       # Service Worker
├── content/
│   ├── content.js          # Injection dans les pages + debug panel
│   └── content.css         # Styles (indicateurs + debug)
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
- ✅ `select` - Sélectionner dans un dropdown natif
- ✅ `selectNgOption` - Sélectionner dans ng-select Angular
- ✅ `clickLabel` - Cliquer sur un label (radio/checkbox)
- ✅ `waitForElementVisible` - Attendre qu'un élément soit visible
- ✅ `pause` - Pause de X ms

## 🐛 Résolution des problèmes

### L'enregistrement ne fonctionne pas
- Vérifiez que vous n'êtes pas sur une page `chrome://`
- Rafraîchissez la page et réessayez

### Les sélecteurs ne trouvent pas l'élément
- **Activez le mode debug** pour voir les logs
- Éditez la commande et utilisez un sélecteur alternatif
- Préférez les IDs complets même s'ils sont longs
- Les Targets contiennent plusieurs options de fallback

### ng-select avec autocomplétion (profession, etc.)
- Le plugin tape automatiquement les premiers caractères pour filtrer
- Assurez-vous que la Value correspond exactement au texte affiché
- Augmentez le "Timeout recherche" si nécessaire

### Le replay est trop rapide/lent
- Ajustez le "Délai entre actions" dans les Options

### Erreur "Label not found"
- Vérifiez que le texte du label correspond exactement
- Essayez d'utiliser l'ID du label ou de l'input directement
- Utilisez le mode debug pour voir les éléments disponibles

## 📜 Licence

MIT License - Libre d'utilisation et de modification.

## 🙏 Crédits

Inspiré par [UI.Vision RPA](https://ui.vision) - Le meilleur outil d'automatisation web.
