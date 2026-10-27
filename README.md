# Pousse : suivi des dépenses à deux

Pousse est une petite application pour noter les dépenses du quotidien, pensée pour deux personnes.

- **100 % hors ligne** : les données restent sur le téléphone, sans compte ni serveur.
- **Gratuite à distribuer** : sur iPhone, elle s'installe comme une application web (PWA) ; sur Android, en PWA ou en APK.
- **Fusion à deux** : chacun exporte un fichier, l'autre l'importe. Les doublons sont éliminés grâce à l'identifiant unique de chaque dépense.
- **Deux profils, Zizou et Zuzu** : chaque dépense est notée au nom de la personne qui l'a payée. L'analyse se filtre par personne.
- **Calendrier** : vue mensuelle avec le total de chaque jour, et ajout d'une dépense à une date précise.
- **Export CSV** pour Excel, Numbers ou Google Sheets, en plus de la sauvegarde JSON.
- **Français et anglais**, multi-devise avec des taux saisis à la main, thème clair et sombre automatique, mode contraste élevé.

---

## Sommaire

1. [Prérequis](#1-prérequis)
2. [Lancer en local](#2-lancer-en-local)
3. [Déployer sur GitHub Pages](#3-déployer-sur-github-pages)
4. [Installer sur iPhone](#4-installer-sur-iphone)
5. [Générer l'APK Android](#5-générer-lapk-android)
6. [Utiliser l'app à deux (export, import, fusion)](#6-utiliser-lapp-à-deux)
7. [Lisibilité en toute lumière](#7-lisibilité-en-toute-lumière)
8. [Organisation du code](#8-organisation-du-code)
9. [Ajouter une langue](#9-ajouter-une-langue)

---

## 1. Prérequis

- [Node.js](https://nodejs.org) 22 ou plus récent (le projet est développé avec Node 24).
- Git.
- Seulement pour l'APK : [Android Studio](https://developer.android.com/studio). Il fournit le JDK et le SDK Android.

## 2. Lancer en local

```bash
npm install
```

```bash
npm run dev
```

Ouvre ensuite http://localhost:5173 dans ton navigateur. Pour tester sur ton téléphone, branché sur le même Wi-Fi :

```bash
npm run dev -- --host
```

Vite affiche alors une adresse du type `http://192.168.x.x:5173`, à ouvrir sur le téléphone.

> Le mode hors ligne (service worker) et l'installation sur l'écran d'accueil ne marchent qu'en HTTPS, donc avec la version déployée. En local, tout le reste se teste normalement.

Commandes utiles :

| Commande | Rôle |
|---|---|
| `npm test` | Lance les tests : calculs d'analyse, fusion à l'import, contrastes des couleurs, scénario à deux téléphones |
| `npm run build` | Construit la version de production dans `dist/` |
| `npm run preview` | Sert `dist/` en local pour vérifier le build |

## 3. Déployer sur GitHub Pages

Le dépôt contient un workflow ([.github/workflows/deploy.yml](.github/workflows/deploy.yml)). Il teste, construit et publie l'app à chaque push sur `main`.

1. Crée un dépôt sur GitHub (il peut être privé si ton offre GitHub le permet pour Pages, sinon public).
2. Relie le projet et pousse le code :

   ```bash
   git remote add origin https://github.com/<ton-pseudo>/<nom-du-depot>.git
   ```

   ```bash
   git push -u origin main
   ```

3. Sur GitHub, va dans **Settings → Pages**, puis dans **Build and deployment → Source**, choisis **GitHub Actions**.
4. Dans l'onglet **Actions**, attends que le workflow « Déployer sur GitHub Pages » passe au vert, en 1 à 2 minutes.
5. L'app est en ligne à l'adresse `https://<ton-pseudo>.github.io/<nom-du-depot>/`.

Les chemins sont relatifs (`base: './'` dans [vite.config.ts](vite.config.ts)) : aucune configuration n'est nécessaire, quel que soit le nom du dépôt.

**Mises à jour** : à chaque push, l'app installée se met à jour toute seule à la prochaine ouverture avec du réseau. Les données ne sont pas touchées.

> Alternatives gratuites équivalentes : Netlify ou Cloudflare Pages. Commande de build `npm run build`, dossier publié `dist`.

## 4. Installer sur iPhone

Aucun compte Apple Developer ni App Store n'est nécessaire.

1. Ouvre l'adresse GitHub Pages dans **Safari**. Ça doit être Safari : les autres navigateurs iOS ne proposent pas toujours l'option.
2. Touche le bouton **Partager**, le carré avec une flèche vers le haut.
3. Fais défiler et choisis **« Sur l'écran d'accueil »**, puis **Ajouter**.
4. Lance Pousse depuis l'icône : elle s'ouvre en plein écran, sans barre Safari, et fonctionne ensuite sans réseau.

Ce qui est prévu pour l'iPhone :

- `viewport-fit=cover` et marges de sécurité (`env(safe-area-inset-*)`) : rien n'est caché par l'encoche, la Dynamic Island ou la barre d'accueil.
- Icône Apple dédiée (`apple-touch-icon-180x180.png`), titre « Pousse » sous l'icône, barre d'état assortie au thème.
- Pavé numérique intégré pour le montant : le clavier iOS ne recouvre pas la moitié de l'écran, et le zoom automatique de Safari est évité (champs en 17 px).
- Le bouton « Exporter » ouvre la feuille de partage iOS : **Enregistrer dans Fichiers**, AirDrop, Messages…

> ⚠️ Les données vivent dans l'app installée. Si tu supprimes l'icône de l'écran d'accueil, elles sont effacées. **Exporte régulièrement** : l'export sert de sauvegarde.

## 5. Générer l'APK Android

> Sur Android, tu peux aussi simplement installer la PWA : ouvre l'adresse dans Chrome, puis **⋮ → Installer l'application**. L'APK est utile si tu préfères un vrai fichier à installer.
> Attention : l'APK et la PWA ont des données séparées sur un même téléphone. Choisis l'un ou l'autre.

### 5.1. Installer les outils (une seule fois)

1. Installe **Android Studio**, puis ouvre-le une première fois. L'assistant télécharge le SDK Android.
2. Indique où se trouvent Java et le SDK. Sous Windows, dans PowerShell, en adaptant les chemins si besoin :

   ```powershell
   setx JAVA_HOME "C:\Program Files\Android\Android Studio\jbr"
   ```

   ```powershell
   setx ANDROID_HOME "$env:LOCALAPPDATA\Android\Sdk"
   ```

   Ferme puis rouvre le terminal pour que ces variables soient prises en compte.

   Sur macOS, Android Studio fournit Java dans `/Applications/Android Studio.app/Contents/jbr/Contents/Home`, et le SDK est dans `~/Library/Android/sdk`.

### 5.2. Construire l'app web et la copier dans le projet Android

```bash
npm run build:android
```

Cette commande construit `dist/`, puis le copie dans `android/` avec `npx cap sync android`.

### 5.3. APK de test (le plus simple)

```bash
cd android
```

```bash
./gradlew assembleDebug
```

Sous Windows, utilise `gradlew.bat assembleDebug`. L'APK est créé dans `android/app/build/outputs/apk/debug/app-debug.apk`. Il est signé avec une clé de debug et convient très bien à un usage à deux.

### 5.4. APK signé « release » (recommandé pour durer)

Pourquoi signer avec ta propre clé : Android n'accepte une **mise à jour** de l'app que si elle est signée avec **la même clé**. Sinon, il faut désinstaller, ce qui **efface les données**. Crée la clé une seule fois et garde-la précieusement.

1. **Crée la clé.** `keytool` est fourni avec le JDK d'Android Studio. Lance la commande depuis le dossier `android/` :

   ```bash
   keytool -genkeypair -v -keystore pousse-release.jks -alias pousse -keyalg RSA -keysize 2048 -validity 10000
   ```

   L'outil demande un mot de passe et quelques informations (nom…). Elles restent locales.

2. **Crée le fichier `android/keystore.properties`.** Il n'est jamais commité : il est listé dans `.gitignore`.

   ```properties
   storeFile=pousse-release.jks
   storePassword=ton-mot-de-passe
   keyAlias=pousse
   keyPassword=ton-mot-de-passe
   ```

3. **Construis l'APK signé**, toujours depuis `android/` :

   ```bash
   ./gradlew assembleRelease
   ```

   Résultat : `android/app/build/outputs/apk/release/app-release.apk`.

4. **Sauvegarde** `pousse-release.jks` et ses mots de passe hors de l'ordinateur, par exemple dans un gestionnaire de mots de passe. Sans eux, plus aucune mise à jour n'est possible sans perdre les données.

**Pour une nouvelle version** : augmente `versionCode` (1, 2, 3…) et `versionName` dans [android/app/build.gradle](android/app/build.gradle), puis relance les étapes 5.2 et 5.4.

### 5.5. Installer l'APK sur le téléphone

- Envoie le fichier `.apk` sur le téléphone : câble USB, Google Drive, e-mail, Telegram…
- Ouvre-le. Android demande d'autoriser l'installation depuis cette source (par exemple « Fichiers »). Accepte, puis **Installer**.
- Play Protect peut avertir qu'il ne connaît pas l'app : choisis **Installer quand même**. C'est normal pour une app hors Play Store.

Avec le téléphone branché et le débogage USB activé, une seule commande suffit : `adb install -r app/build/outputs/apk/release/app-release.apk`.

## 6. Utiliser l'app à deux

Chaque téléphone a ses propres données. Pour les réunir :

1. Sur le téléphone A : **Réglages → Exporter**. Envoie le fichier `pousse-AAAA-MM-JJ.json` à B (Messages, WhatsApp, AirDrop…).
2. Sur le téléphone B : **Réglages → Importer et fusionner**, puis choisis le fichier.
3. Fais la même chose dans l'autre sens pour que les deux téléphones aient tout.

Comment fonctionne la fusion ([src/domain/merge.ts](src/domain/merge.ts)) :

- Chaque dépense a un **UUID**. Une dépense déjà présente n'est jamais dupliquée, même si le même fichier est importé plusieurs fois.
- Si une dépense a été **modifiée** des deux côtés, c'est la version modifiée **le plus récemment** qui l'emporte.
- Les **suppressions se propagent** : une dépense supprimée reste marquée « supprimée » dans la base, donc elle ne réapparaît pas au prochain import.
- Les 7 catégories par défaut ont le même identifiant sur tous les téléphones : pas de doublon de catégories.
- Les taux de change de l'autre téléphone ne sont repris que s'ils manquent chez toi, et seulement si vous avez la même devise par défaut.
- Les lignes invalides d'un fichier sont ignorées et comptées ; le reste est importé.

L'export contient **tout**. C'est aussi ta sauvegarde : garde le dernier quelque part.

### Profils Zizou et Zuzu

- Au premier lancement, l'app demande qui utilise le téléphone. Le choix se change dans **Réglages → Profil**.
- À chaque saisie, « Qui a payé ? » est réglé sur le profil du téléphone. On peut choisir l'autre personne, par exemple pour noter une dépense faite par Zuzu depuis le téléphone de Zizou.
- Dans **Analyse**, le filtre **Tous / Zizou / Zuzu** s'applique à tout l'écran. En mode « Tous », une carte **Par personne** montre qui a dépensé combien sur la période.
- Il n'y a que ces deux profils, volontairement. Les dépenses saisies avant l'ajout des profils apparaissent comme « Non attribué ».

### Export CSV

**Réglages → Exporter en CSV** crée un tableau avec une ligne par dépense : date, montant, devise, montant converti, catégorie, note, profil, identifiant.

- En français, le séparateur est « ; » et la virgule est décimale, comme l'attend Excel en France. En anglais, c'est « , » et le point.
- Le CSV sert à consulter ou retravailler les chiffres. Il **ne se réimporte pas** : pour sauvegarder ou fusionner, utilise **Exporter** (JSON).

## 7. Lisibilité en toute lumière

- **Plein soleil** : Réglages → Contraste → **Élevé**. Encre presque noire, contours de 2 px, textes secondaires assombris. Il s'active aussi automatiquement si le réglage « Augmenter le contraste » du téléphone est activé.
- **Dans le noir** : le thème sombre (automatique ou forcé) reprend le fond noir de la charte avec des aplats vert profond, et un texte légèrement adouci plutôt que blanc pur pour éviter l'éblouissement. Il existe aussi un sombre à contraste élevé.
- **Contrastes vérifiés automatiquement** ([src/ui/tokens.test.ts](src/ui/tokens.test.ts)) dans les 4 thèmes :
  - texte principal ≥ 7:1 (niveau AAA) ;
  - texte secondaire ≥ 4,5:1 (≥ 7:1 en contraste élevé) ;
  - contours ≥ 3:1 ;
  - texte sur chaque couleur de catégorie ≥ 7:1.

  Modifier une couleur qui casse un contraste fait échouer les tests.
- **Le sens ne passe jamais par la couleur seule** : une hausse est en rouge **et** a une flèche, et les segments de l'anneau sont séparés par un trait.
- **Respect des réglages du téléphone** : taille du texte (tailles en `rem`), réduction des animations (fondus à la place des ressorts), zones de toucher d'au moins 44 px.

## 8. Organisation du code

```
src/
  domain/      Logique pure, sans interface, entièrement testée
    types.ts       Modèle de données (dépense, catégorie, réglages, export)
    money.ts       Montants en centimes (entiers) : aucune erreur d'arrondi
    currency.ts    Conversion par taux manuels
    periods.ts     Semaines (du lundi), mois, années ; navigation
    analytics.ts   Totaux, répartition, courbe, comparaison avec la période précédente
    merge.ts       Fusion à l'import, validation des fichiers
  db/          Base IndexedDB (Dexie) et opérations d'écriture
  ui/          Design system : couleurs (tokens), thème, composants, graphiques, icônes
  features/    Écrans : Dépenses, saisie, Analyse, Réglages, catégories, export
  i18n/        Traductions (fr, en)
android/       Projet Android généré par Capacitor
```

**Choix techniques**

- **React + TypeScript + Vite**, **vite-plugin-pwa** pour le service worker et le manifest, **Dexie** pour IndexedDB, **i18next** pour les langues : comme proposé au départ.
- **Graphiques en SVG maison avec `d3-shape`**, plutôt que Recharts :
  - il n'y a que 3 graphiques simples ;
  - le style du design system (fond blanc, aplats vert tendre, pilules noires, contours fins) est maîtrisé à 100 % ;
  - les couleurs suivent les variables CSS du thème, contraste élevé compris ;
  - l'app est plus légère d'environ 90 Ko.
- **`motion`** pour les animations à ressort (panneau qu'on fait glisser, glisser pour supprimer), en suivant les principes d'Apple : réponse immédiate à l'appui, gestes interruptibles, élan conservé.
- **Polices embarquées** (Outfit pour les chiffres, Silkscreen, police pixel, pour les titres) : disponibles hors ligne.

**Comparaison des périodes** : pour une période en cours, on compare « à date ». Par exemple, du 1er au 27 octobre contre du 1er au 27 septembre, ce qui est plus juste qu'un mois entier contre un mois commencé. La comparaison est bornée à la fin d'un mois plus court (31 mars contre 28 février). Une période terminée est comparée en entier.

## 9. Ajouter une langue

1. Copie `src/i18n/locales/fr.json` en `src/i18n/locales/es.json`, par exemple, et traduis les valeurs (pas les clés).
2. Dans [src/i18n/index.ts](src/i18n/index.ts), importe le fichier, puis ajoute-le à `resources` et à `LANGUAGES`.

Les dates, nombres et devises sont formatés automatiquement selon la langue, via `Intl`.
