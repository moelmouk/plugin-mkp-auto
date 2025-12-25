# 🔧 Guide de dépannage - Form Recorder Pro v3.0

## Problèmes courants et solutions

### 1. ❌ Erreur lors du démarrage de l'enregistrement

**Erreur:**
```
Error: Cannot read properties of undefined (reading 'id')
```

**Solution:**
✅ **CORRIGÉ dans la dernière version**
1. Allez dans `chrome://extensions/`
2. Trouvez "Form Recorder Pro"
3. Cliquez sur le bouton de rechargement 🔄
4. Réessayez

**Vérification:**
- Ouvrez la console du Service Worker (cliquez sur "Service worker" sous l'extension)
- Vous devriez voir: `[FR BG] Recording started: ...`

---

### 2. 🔴 L'extension ne se charge pas

**Symptômes:**
- Extension apparaît avec des erreurs
- Icône grisée
- Ne répond pas

**Solutions:**

**A. Vérifier les fichiers**
```bash
cd /app
ls -la
# Vérifiez que ces fichiers existent:
# - manifest.json
# - background.js
# - content/content.js
# - popup/popup.html
```

**B. Vérifier manifest.json**
1. Ouvrez `manifest.json`
2. Vérifiez qu'il n'y a pas d'erreur de syntaxe JSON
3. Utilisez un validateur JSON en ligne si nécessaire

**C. Recharger l'extension**
1. `chrome://extensions/`
2. Désactivez l'extension
3. Réactivez-la
4. Cliquez sur 🔄 Recharger

---

### 3. 🎬 L'enregistrement ne capture rien

**Symptômes:**
- L'indicateur "REC" n'apparaît pas
- Aucune action n'est enregistrée

**Solutions:**

**A. Vérifier le content script**
1. F12 sur la page web
2. Console → devrait afficher:
   ```
   [FR] Form Recorder Pro v3.0 content script loaded
   ```
3. Si absent, rechargez la page

**B. Vérifier les permissions**
1. `chrome://extensions/`
2. Cliquez sur "Détails" sous Form Recorder Pro
3. Vérifiez que "Accès aux données du site" = "Sur tous les sites"

**C. Rafraîchir la page**
- Appuyez sur F5 après avoir installé l'extension
- Le content script doit se charger à nouveau

---

### 4. ▶️ La lecture échoue

**Symptômes:**
- "Element not found"
- Scénario s'arrête prématurément
- Clique au mauvais endroit

**Solutions:**

**A. Augmenter les timeouts**
1. Ouvrez le popup
2. Onglet "Paramètres"
3. Augmentez:
   - Timeout d'attente: 15000ms
   - Tentatives de retry: 5
   - Délai entre retry: 1000ms

**B. Activer le surlignage**
1. Paramètres → Cochez "Surligner les éléments"
2. Relancez → vous verrez où ça bloque

**C. Vérifier la page**
- La page doit être identique à l'enregistrement
- Même URL
- Même état (pas de popup modal ouvert)

**D. Réenregistrer**
Si la page a changé, réenregistrez le scénario

---

### 5. 📦 ng-select ne fonctionne pas

**Symptômes:**
- "ng-dropdown-panel not found"
- Options non trouvées
- Dropdown ne s'ouvre pas

**Solutions:**

**A. Paramètres pour Angular**
```
Délai par défaut: 500ms
Timeout: 15000ms
Retry: 5
Délai entre retry: 1000ms
```

**B. Vérifier le chargement**
- Attendez que la page soit complètement chargée
- Les ng-select doivent être visibles avant de cliquer

**C. Console logs**
F12 → Console → cherchez:
```
[FR] Dropdown opened via arrow
[FR] Exact match: VOTRE_OPTION
```

---

### 6. 🏷️ Labels non trouvés

**Symptômes:**
- "Label not found: Monsieur"
- Radio/checkbox ne se cochent pas

**Solutions:**

**A. Vérifier le texte**
Le texte doit correspondre exactement:
- "Monsieur" ≠ "monsieur" (la normalisation s'en charge)
- Accents supportés: "François" = "Francois"

**B. Inspecter l'élément**
1. Clic droit sur le label → Inspecter
2. Vérifiez la structure HTML
3. Le label doit avoir un `for` ou être parent de l'input

**C. Réenregistrer avec l'input**
Au lieu de cliquer sur le label, cliquez directement sur le bouton radio

---

### 7. 💾 Perte de données

**Symptômes:**
- Scénarios disparus après fermeture Chrome
- Dossiers vides

**Solutions:**

**A. Vérifier IndexedDB**
1. F12 sur le popup
2. Onglet "Application"
3. IndexedDB → FormRecorderDB
4. Vérifiez que les données sont présentes

**B. Exporter régulièrement**
1. Onglet "Export"
2. "Exporter tout"
3. Sauvegardez le fichier JSON

**C. Réimporter si nécessaire**
1. Onglet "Export"
2. "Importer"
3. Sélectionnez votre backup JSON

---

### 8. ⚡ Performance lente

**Symptômes:**
- Lecture très lente
- Délais excessifs
- Navigateur ralenti

**Solutions:**

**A. Ajuster les délais**
Paramètres:
```
Délai par défaut: 200ms (au lieu de 300ms)
Décocher "Respecter le timing enregistré"
```

**B. Limiter le retry**
```
Tentatives de retry: 2 (au lieu de 3)
Délai entre retry: 300ms (au lieu de 500ms)
```

**C. Fermer les onglets inutiles**
- Le mode parallèle ouvre beaucoup d'onglets
- Fermez ceux qui ne sont plus nécessaires

---

### 9. 🌐 Compatibilité navigateur

**Chrome:**
✅ Version 88+ supportée
✅ Toutes les fonctionnalités disponibles

**Edge (Chromium):**
✅ Compatible
⚠️ Suivre les mêmes étapes que Chrome

**Firefox:**
❌ Non compatible actuellement
📅 Support prévu en v3.2

**Safari:**
❌ Non compatible (pas de support Manifest V3)

---

### 10. 🔍 Debugging avancé

**Console du Service Worker:**
```
chrome://extensions/ → "Service worker" → Console

Logs attendus:
[FR BG] Form Recorder Pro v3.0 background script loaded
[FR BG] Recording started: ...
[FR BG] Command recorded: click ...
```

**Console de la page:**
```
F12 sur la page web → Console

Logs attendus:
[FR] Form Recorder Pro v3.0 content script loaded
[FR] Exec: click ...
[FR] Exact match: ...
```

**Console du popup:**
```
Clic droit sur le popup → Inspecter → Console

Logs attendus:
[FR Popup] Initialized
storage.js:XX Database initialized
```

---

## 📝 Checklist de dépannage

Avant de demander de l'aide, vérifiez:

- [ ] Extension rechargée dans chrome://extensions/
- [ ] Mode développeur activé
- [ ] Page web rechargée (F5)
- [ ] Console ouverte (F12) pour voir les erreurs
- [ ] Paramètres de timeout augmentés
- [ ] Scénario testé sur page identique
- [ ] Documentations consultées (README, USER_GUIDE)

---

## 🆘 Support

Si le problème persiste:

1. **Consultez la documentation:**
   - `README.md` - Vue d'ensemble
   - `USER_GUIDE.md` - Utilisation
   - `TECHNICAL_ANALYSIS.md` - Détails techniques

2. **Ouvrez une issue GitHub** avec:
   - Version de Chrome
   - Système d'exploitation
   - Message d'erreur complet
   - Étapes pour reproduire
   - Capture d'écran de la console

3. **Logs utiles:**
   - Console du service worker
   - Console de la page web
   - Console du popup

---

## ✅ Corrections récentes

### Version 3.0.1 (Décembre 2024)
- ✅ **Corrigé:** Erreur "Cannot read properties of undefined (reading 'id')"
- ✅ **Amélioré:** Gestion des messages async
- ✅ **Ajouté:** Protection contre sender.tab undefined

---

**Form Recorder Pro v3.0** - Tous les bugs critiques sont corrigés ! 🎉
