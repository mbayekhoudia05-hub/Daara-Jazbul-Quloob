Daara Jazbul Qulub — V12 Paiements

Cette version prépare une gestion sécurisée des transactions Wave / Orange Money :
- création d'une transaction ;
- membre, montant, mois ;
- Wave ou Orange Money ;
- référence ;
- statuts En attente / Confirmé / Annulé ;
- tableau des transactions ;
- statistiques.

IMPORTANT :
Cette version est un module de gestion interne. Elle NE déclenche PAS encore un paiement réel et ne communique pas directement avec Wave ou Orange Money.
Pour les API réelles, les identifiants marchands et secrets devront rester côté serveur (Supabase Edge Function ou autre backend sécurisé).

Conserver le config.js actuel et logo.jpeg.
Ne jamais mettre sb_secret_ ou service_role dans GitHub.
