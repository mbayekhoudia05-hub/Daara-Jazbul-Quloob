# Daara Jazbul Quluub – Cellule Dakar (mobile)

## Décision technique

L'application mobile est préparée avec Capacitor 8 afin de réutiliser l'application web existante (HTML, CSS et JavaScript) dans des conteneurs natifs Android et iOS.

- Identifiant mobile : sn.daarajazbulquluub.celluledakar
- Nom affiché : Daara Jazbul Quluub
- Ressources web embarquées : www/
- Backend conservé : projet Supabase existant
- Source de référence : branche main au commit 3e70c01f2c5509d05d864ad1f433678565b15b1e

## Protection des données

Cette préparation ne crée, ne modifie et ne migre aucune table Supabase. Elle ne change aucun compte, membre, carte, cotisation, transaction, rôle ou document. L'application mobile doit utiliser le même projet Supabase et les mêmes politiques d'accès que le site existant.

Ne jamais placer de clé Supabase service_role, mot de passe ou secret privé dans l'application. Seule la clé publishable déjà utilisée par le client web peut être embarquée.

## Commandes locales

Prérequis : Node.js 22 ou plus récent, Android Studio et SDK Android pour Android, macOS avec Xcode et CocoaPods pour iOS.

```bash
npm install
npm run build:mobile
npx cap add android
npx cap add ios
npm run cap:sync
```

Ouvrir ensuite android/ dans Android Studio et ios/App/App.xcworkspace dans Xcode.

## Points obligatoires avant publication

1. Tester la connexion, la création de compte, la confirmation d'e-mail et la récupération de mot de passe sur Android et iOS.
2. Configurer les URL de redirection et les liens profonds Supabase pour le retour dans l'application. Aucune configuration Supabase n'a été modifiée à cette étape.
3. Vérifier les téléchargements de PDF, les photos, les cartes QR, l'impression/partage et les paiements externes.
4. Vérifier les permissions, la navigation retour Android, les liens externes et les états hors connexion.
5. Créer les icônes et écrans de lancement officiels, puis renseigner les fiches Play Store et App Store.
6. Configurer la signature Android et les certificats/profils Apple dans un environnement sécurisé.

## État actuel

Cette branche contient uniquement le socle de préparation. Les projets natifs Android/iOS, les builds signés, les tests sur appareils et les soumissions aux boutiques ne sont pas encore réalisés. Ne pas fusionner dans main avant validation complète.
