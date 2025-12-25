# Guide Utilisateur - Form Recorder Pro v3.0

## 🎯 Bienvenue !

Ce guide vous explique comment utiliser Form Recorder Pro pour automatiser la saisie de formulaires web.

---

## 🚀 Démarrage rapide (5 minutes)

### 1. Votre premier enregistrement

1. **Ouvrez une page web** avec un formulaire simple (ex: formulaire de contact)
2. **Cliquez sur l'icône** 🎥 dans la barre d'outils Chrome
3. **Nommez votre scénario** : "Test formulaire contact"
4. **Cliquez sur "⏺ Démarrer l'enregistrement"**
5. **Un indicateur rouge "REC"** apparaît en haut à droite
6. **Remplissez le formulaire** normalement :
   - Tapez votre nom
   - Tapez votre email
   - Tapez un message
   - Cliquez sur "Envoyer"
7. **Cliquez sur "⏹ Arrêter"** dans le popup
8. **Félicitations !** Votre premier scénario est enregistré

### 2. Rejouer votre scénario

1. **Rechargez la page** web (F5)
2. **Ouvrez le popup** Form Recorder Pro
3. **Dans l'onglet "Scénarios"**, trouvez "Test formulaire contact"
4. **Cliquez sur le bouton "▶"** à droite
5. **Sélectionnez "Onglet actuel"**
6. **Cliquez sur "Lancer"**
7. **Regardez la magie opérer !** ✨

---

## 📖 Fonctionnalités détaillées

### Enregistrement

#### Types d'actions capturées

| Action | Description | Exemple |
|--------|-------------|--------|
| **Clic** | Clic sur boutons, liens | Bouton "Soumettre" |
| **Saisie** | Frappe dans champs texte | Nom, email, message |
| **Sélection** | Liste déroulante | Pays, langue |
| **Radio** | Boutons radio | Civilité (M./Mme) |
| **Checkbox** | Cases à cocher | Accepter CGU |
| **ng-select** | Composants Angular | Sélecteur avancé |

#### Bonnes pratiques

✅ **À FAIRE :**
- Donnez des noms descriptifs à vos scénarios
- Enregistrez sur une page complètement chargée
- Faites des actions claires et délibérées
- Arrêtez l'enregistrement après la dernière action

❌ **À ÉVITER :**
- Clics trop rapides (attendre le chargement)
- Actions inutiles (survol, scroll sans raison)
- Enregistrer des données sensibles (mots de passe)
- Enregistrer sur plusieurs pages sans lien

### Lecture de scénarios

#### Modes de lecture

**1. Onglet actuel**
- Lance le scénario dans la page actuelle
- Idéal pour tester rapidement
- La page doit être la même que lors de l'enregistrement

**2. Nouvel onglet**
- Ouvre une nouvelle page et lance le scénario
- Conserve votre page actuelle
- Idéal pour lancer plusieurs scénarios

#### Indicateurs pendant la lecture

- **Indicateur vert** : En cours d'exécution
- **Surlignage vert** : Élément en cours d'interaction
- **Messages** : Commande en cours d'exécution
- **Toast de fin** : Résultat (succès/échecs)

---

## 📁 Organisation avec dossiers

### Créer une structure

Exemple d'organisation recommandée :

```
📂 Production
  ├─ 🎥 Commande client standard
  ├─ 🎥 Commande express
  └─ 🎥 Retour produit

📂 Tests
  ├─ 📂 Formulaires
  │   ├─ 🎥 Contact
  │   └─ 🎥 Inscription
  └─ 📂 Checkout
      ├─ 🎥 Panier simple
      └─ 🎥 Panier avec code promo

📂 Développement
  └─ 🎥 Test rapide
```

### Opérations sur dossiers

**Créer un dossier :**
1. Cliquez sur "📂 Nouveau dossier"
2. Entrez le nom
3. Validez

**Renommer un dossier :**
1. Cliquez sur "✏️" à droite du dossier
2. Modifiez le nom
3. Validez

**Supprimer un dossier :**
1. Cliquez sur "🗑️" à droite du dossier
2. Confirmez
3. Les scénarios sont déplacés vers le dossier parent

**Lancer tous les scénarios d'un dossier :**
1. Cliquez sur "▶" à droite du dossier
2. Choisissez le mode (séquentiel/parallèle)
3. Validez

---

## 🚀 Lancement groupé

### Mode séquentiel

**Quand l'utiliser :**
- Pour tester plusieurs variations d'un même formulaire
- Pour exécuter des étapes dépendantes
- Pour éviter de surcharger le site

**Comment ça marche :**
1. Scénario 1 s'exécute complètement
2. Pause (si configurée)
3. Scénario 2 s'exécute
4. etc.

**Exemple d'usage :**
```
1. Remplir formulaire avec données valides
2. Remplir formulaire avec email invalide
3. Remplir formulaire avec téléphone invalide
```

### Mode parallèle

**Quand l'utiliser :**
- Pour tester plusieurs pages différentes simultanément
- Pour gagner du temps
- Pour vérifier la charge serveur

**Comment ça marche :**
- Chaque scénario ouvre un nouvel onglet
- Tous s'exécutent en même temps
- Vous recevez un rapport global à la fin

**Exemple d'usage :**
```
Onglet 1: Test formulaire contact
Onglet 2: Test formulaire inscription
Onglet 3: Test formulaire newsletter
Tous en même temps !
```

### Configuration

1. **Sélectionnez les scénarios** (cochez les cases)
2. **Cliquez sur "▶ Lancer la sélection"**
3. **Choisissez le mode**
4. **Lancez**

---

## ⚙️ Paramètres

### Paramètres de base

#### Surligner les éléments
- **Activé** : Affiche un contour vert
- **Désactivé** : Pas d'indication visuelle
- **Conseil** : Laissez activé pour déboguer

#### Respecter le timing enregistré
- **Activé** : Utilise les délais réels
- **Désactivé** : Utilise le délai par défaut
- **Conseil** : Activez pour reproduire exactement

#### Arrêter en cas d'erreur
- **Activé** : Stoppe au premier échec
- **Désactivé** : Continue malgré les erreurs
- **Conseil** : Désactivez pour les tests exploratoires

### Paramètres avancés

#### Délai par défaut (300ms)
- Temps d'attente entre chaque action
- **Augmenter si** : Pages lentes, nombreux échecs
- **Diminuer si** : Pages rapides, gain de temps

#### Délai maximum (5000ms)
- Limite supérieure des délais enregistrés
- Empêche les attentes trop longues
- **Conseil** : Laissez à 5000ms

#### Timeout d'attente (10000ms)
- Temps max pour trouver un élément
- **Augmenter si** : Pages très lentes
- **Diminuer si** : Vous voulez échouer rapidement

#### Délai de frappe (50ms)
- Temps entre chaque caractère
- **Augmenter si** : Champs avec validation live
- **Diminuer si** : Formulaires simples

#### Tentatives de retry (3)
- Nombre d'essais pour trouver un élément
- **Augmenter si** : Éléments à chargement lent
- **Diminuer si** : Vous voulez échouer rapidement

#### Délai entre retry (500ms)
- Temps entre chaque tentative
- **Augmenter si** : Chargements très lents
- **Diminuer si** : Éléments stables

### Presets recommandés

**Pages rapides (sites statiques) :**
```
Délai par défaut: 200ms
Timeout: 5000ms
Retry: 2
```

**Pages standard :**
```
Délai par défaut: 300ms
Timeout: 10000ms
Retry: 3
```

**Pages lentes (Angular, React complexe) :**
```
Délai par défaut: 500ms
Timeout: 15000ms
Retry: 5
Délai entre retry: 1000ms
```

---

## 📥 Export / Import

### Exporter vos scénarios

**Pourquoi exporter ?**
- Sauvegarde de sécurité
- Partage avec des collègues
- Migration vers un autre ordinateur
- Versioning

**Comment exporter :**
1. Onglet "Export"
2. Cliquez sur "📥 Exporter tout"
3. Un fichier JSON est téléchargé
4. Nom du fichier : `form-recorder-export-[timestamp].json`

**Contenu du fichier :**
```json
{
  "version": "3.0",
  "exportDate": "2024-12-25T10:30:00.000Z",
  "folders": [...],
  "scenarios": [...]
}
```

### Importer des scénarios

**Comment importer :**
1. Onglet "Export"
2. Cliquez sur "📤 Importer"
3. Sélectionnez un fichier JSON
4. Les scénarios sont ajoutés

**⚠️ Attention :**
- Les scénarios existants ne sont pas écrasés
- Les doublons sont ajoutés avec un nouvel ID
- La structure de dossiers est préservée

### Partage entre équipes

**Workflow recommandé :**
1. **Créez une bibliothèque** de scénarios standard
2. **Exportez** régulièrement
3. **Stockez** dans un drive partagé (Google Drive, Dropbox)
4. **Chaque membre importe** la dernière version
5. **Contribuez** en ajoutant de nouveaux scénarios

---

## 🔍 Recherche et filtres

### Barre de recherche

**Utilisation :**
1. Cliquez dans la barre de recherche
2. Tapez une partie du nom
3. Les résultats se filtrent en temps réel

**Exemples :**
```
"contact" → Trouve tous les scénarios avec "contact"
"test"    → Trouve tous les tests
"prod"    → Trouve les scénarios de production
```

### Tri

Les scénarios sont triés par :
1. **Dossiers** (ordre alphabétique)
2. **Scénarios** (plus récents en premier)

---

## 👥 Cas d'usage

### 1. Tests de formulaires

**Objectif :** Tester différentes variations d'un formulaire

**Workflow :**
1. Créez un dossier "Tests Formulaire Contact"
2. Enregistrez plusieurs scénarios :
   - Email valide
   - Email invalide
   - Téléphone invalide
   - Champs vides
   - Message trop long
3. Lancez en mode séquentiel
4. Vérifiez les messages d'erreur

### 2. Saisie répétitive

**Objectif :** Gagner du temps sur des tâches répétitives

**Workflow :**
1. Enregistrez la saisie complète une fois
2. Modifiez uniquement les données variables
3. Lancez quand nécessaire

**Exemple :** Saisie de commandes clients

### 3. Démonstrations

**Objectif :** Automatiser les démos produit

**Workflow :**
1. Enregistrez le parcours parfait
2. Ajustez les délais pour une lecture fluide
3. Lancez pendant la démo

**Avantage :** Pas d'erreur de manipulation

### 4. Tests de charge

**Objectif :** Tester la montée en charge

**Workflow :**
1. Enregistrez un scénario utilisateur type
2. Dupliquez-le
3. Lancez plusieurs instances en parallèle
4. Observez le comportement du serveur

---

## ❓ FAQ

### Q: Puis-je enregistrer sur plusieurs pages ?
**R:** Non, chaque scénario doit rester sur une seule page. Pour des parcours multi-pages, créez plusieurs scénarios.

### Q: Les mots de passe sont-ils sauvegardés ?
**R:** Oui, tout est enregistré localement. Pour des raisons de sécurité, évitez d'enregistrer des données sensibles.

### Q: Puis-je modifier un scénario enregistré ?
**R:** Dans la v3.0, vous pouvez renommer et supprimer. L'édition des commandes sera disponible en v3.1.

### Q: Combien de scénarios puis-je stocker ?
**R:** IndexedDB n'a pas de limite stricte. En pratique, vous pouvez stocker des milliers de scénarios.

### Q: Ça fonctionne avec tous les sites ?
**R:** La plupart, oui. Les sites avec des protections anti-bot peuvent poser problème.

### Q: Puis-je accélérer la lecture ?
**R:** Oui, désactivez "Respecter le timing" et diminuez le "Délai par défaut".

### Q: Le scénario échoue, que faire ?
**R:** 
1. Vérifiez que la page est identique
2. Augmentez les timeouts
3. Activez le surlignage pour voir où ça bloque
4. Ré-enregistrez si nécessaire

---

## 👍 Conseils d'expert

### Pour un enregistrement optimal

1. **Chargez complètement la page** avant de démarrer
2. **Attendez 2 secondes** entre les actions importantes
3. **Évitez les survols** (ils ne sont pas toujours nécessaires)
4. **Testez immédiatement** après l'enregistrement

### Pour une lecture fiable

1. **Utilisez des ID uniques** dans votre HTML (pour les développeurs)
2. **Augmentez les timeouts** pour les pages lentes
3. **Activez le surlignage** pour déboguer
4. **Vérifiez les logs** dans la console (F12)

### Pour l'organisation

1. **Nommez clairement** vos scénarios : "[Site] - [Action] - [Variante]"
2. **Utilisez des dossiers** par projet ou par site
3. **Exportez régulièrement** pour sauvegarder
4. **Supprimez** les scénarios obsolètes

---

## 📞 Besoin d'aide ?

- **Documentation technique** : [TECHNICAL_ANALYSIS.md](TECHNICAL_ANALYSIS.md)
- **Installation** : [INSTALLATION.md](INSTALLATION.md)
- **GitHub Issues** : Ouvrez un ticket
- **Support** : Contact via l'extension

---

**Bonne automatisation ! 🎉**
