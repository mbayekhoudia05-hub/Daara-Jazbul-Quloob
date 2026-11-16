/* Dossier personnel de développement — accès limité par identifiant et RLS Supabase. */
(() => {
  'use strict';
  const OWNER_ID = 'af676419-4711-48e6-8caf-5099b823facf';
  const PROJECT_KEY = 'daara-jazbul-quluub-2027-2031';
  const $ = id => document.getElementById(id);
  const money = value => new Intl.NumberFormat('fr-FR').format(Number(value || 0)) + ' FCFA';
  const today = () => new Date().toISOString().slice(0,10);
  let data = { plan:null, ledger:[], inventory:[], rentals:[] };
  let ready = false;
  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }
  function ownerIsSignedIn() { return currentUser?.id === OWNER_ID; }
  function lockUI() {
    if(ownerIsSignedIn()) return;
    $('privateDevelopmentProjectNav')?.classList.add('hidden');
    $('privateDevelopmentProject')?.classList.add('hidden');
  }
  function render() {
    if(!data.plan || !ownerIsSignedIn()) return;
    const p=data.plan;
    const income=data.ledger.filter(x=>x.type==='income').reduce((s,x)=>s+Number(x.amount||0),0);
    const expenses=data.ledger.filter(x=>x.type==='expense').reduce((s,x)=>s+Number(x.amount||0),0);
    const completedRentals=data.rentals.filter(x=>x.status==='completed');
    const rentalGross=completedRentals.reduce((s,x)=>s+Number(x.amount||0),0);
    const rentalCosts=completedRentals.reduce((s,x)=>s+Number(x.costs||0),0);
    const rentalNet=rentalGross-rentalCosts;
    const content=$('privateDevelopmentProjectContent');
    content.innerHTML=`
      <div class="development-print-actions">
        <p class="development-confidential-note">🔒 Dossier personnel — accès réservé à ton compte. Ne pas partager ni publier ce document.</p>
        <button class="primary" type="button" id="developmentPrintBtn">🖨️ Imprimer le projet / Enregistrer en PDF</button>
      </div>
      <article class="development-cover">
        <div class="development-cover-mark">DAARA JAZBUL QULUUB</div>
        <div class="development-cover-rule"></div>
        <p class="development-cover-kicker">CELLULE DAKAR</p>
        <h1>PROJET DE DÉVELOPPEMENT<br>ET D’AUTONOMIE FINANCIÈRE</h1>
        <p class="development-cover-subtitle">Programme quinquennal 2027–2031</p>
        <div class="development-cover-objective"><span>OBJECTIF DE MOBILISATION</span><strong>${money(p.goal)}</strong></div>
        <div class="development-cover-meta"><span>Première activité : location de matériel</span><span>Document de travail confidentiel</span><span>Édition : ${new Date().toLocaleDateString('fr-FR')}</span></div>
        <div class="development-cover-rule"></div>
        <p class="development-cover-motto">« Construire progressivement un Dahira autonome, bien équipé et capable de préparer son avenir. »</p>
      </article>

      <div class="development-document">
        <div class="development-document-heading"><span>DAARA JAZBUL QULUUB · CELLULE DAKAR</span><h2>Sommaire du dossier</h2></div>
        <ol class="development-toc">
          <li>Présentation, vision et objectifs</li><li>Axes de développement</li><li>Activité prioritaire : location de matériel</li>
          <li>Plan de financement et objectifs annuels</li><li>Budget d’affectation prévisionnel</li><li>Calendrier de réalisation sur cinq ans</li>
          <li>Plan de lancement des 90 premiers jours</li><li>Gouvernance et responsabilités</li><li>Règles financières et de contrôle</li>
          <li>Indicateurs de réussite et risques</li><li>Registre des locations et inventaire</li><li>Validation du projet</li>
        </ol>
        <section class="development-section">
          <h2>1. Présentation, vision et objectifs</h2>
          <p>Le Daara Jazbul Quluub – Cellule Dakar souhaite renforcer progressivement ses moyens financiers et matériels afin de garantir le bon fonctionnement de ses activités religieuses, éducatives, culturelles et sociales. Le programme vise à constituer un patrimoine utile au Dahira, à développer une activité de location et à préparer des investissements durables.</p>
          <h3>Vision à cinq ans</h3><p>${escapeHtml(p.vision)}</p>
          <h3>Objectif général</h3><p>Mobiliser un objectif indicatif de ${money(p.goal)} sur cinq ans, sans considérer cette cible comme une recette garantie, pour acquérir des équipements, développer une activité économique, soutenir les activités du Dahira et préparer un futur local.</p>
          <h3>Objectifs spécifiques</h3><ul><li>Mobiliser 30 à 50 participants volontaires à raison de 500 FCFA par mois.</li><li>Constituer un premier parc de matériel événementiel.</li><li>Développer la location de chaises, tables et autres équipements.</li><li>Réinvestir une partie des bénéfices nets dans le matériel.</li><li>Financer progressivement les activités et besoins logistiques.</li><li>Constituer une réserve affectée à un futur local.</li><li>Garantir une gestion documentée, vérifiable et transparente.</li></ul>
        </section>
        <section class="development-section">
          <h2>2. Axes de développement</h2>
          <h3>Axe 1 — Équipements du Dahira</h3><p>Acquérir progressivement chaises, tables, tentes, bâches, sonorisation, microphones, matériel audiovisuel, informatique, rangement et transport. Le matériel du Dahira reste prioritaire pour ses propres activités.</p>
          <h3>Axe 2 — Activités génératrices de revenus</h3><p>Commencer par la location de matériel événementiel. Après évaluation de la demande et des résultats, étudier les prestations audiovisuelles, la location de sonorisation et d’autres services compatibles avec les capacités du Dahira.</p>
          <h3>Axe 3 — Activités et événements</h3><p>Soutenir progressivement les rassemblements, événements religieux et culturels, déplacements, activités éducatives et besoins logistiques, selon le budget annuel approuvé.</p>
          <h3>Axe 4 — Futur local</h3><p>Constituer une réserve dédiée, réaliser une étude des besoins, comparer les options de location durable, acquisition ou construction, puis vérifier les aspects juridiques, fonciers et techniques avant tout engagement.</p>
          <h3>Axe 5 — Réserve et maintenance</h3><p>Conserver une réserve de sécurité pour réparations, renouvellement du matériel et imprévus, sans l’utiliser sans autorisation.</p>
        </section>
        <section class="development-section">
          <h2>3. Activité prioritaire : location de matériel</h2>
          <p>Le Dahira constitue un parc de matériel utilisable pour ses propres activités et louable à des tiers lorsqu’il est disponible. Cette activité doit réduire certaines dépenses de location du Dahira et générer des bénéfices nets réinvestissables.</p>
          <h3>Premier investissement : parc de chaises</h3>
          <div class="member-table-wrap"><table><thead><tr><th>Équipement</th><th>Quantité visée</th><th>Prix unitaire communiqué</th><th>Coût total</th><th>Tarif de location unitaire</th><th>Recette si tout le lot est loué une fois</th></tr></thead><tbody><tr><td>Chaise VIP</td><td>50</td><td>15 000 FCFA</td><td>750 000 FCFA</td><td>500 FCFA</td><td>25 000 FCFA</td></tr><tr><td>Chaise plastique</td><td>100</td><td>7 000 FCFA</td><td>700 000 FCFA</td><td>100 FCFA</td><td>10 000 FCFA</td></tr><tr><th>Total</th><th>150 chaises</th><th>—</th><th>1 450 000 FCFA</th><th>—</th><th>35 000 FCFA brut</th></tr></tbody></table></div>
          <p><strong>Budget d’achat des 150 chaises :</strong> 1 450 000 FCFA. <strong>Provision de sécurité de 10 % :</strong> 145 000 FCFA. <strong>Enveloppe à réunir avant achat complet :</strong> 1 595 000 FCFA. Cette provision n’est pas un prix fournisseur : elle ne sera dépensée que sur justificatif et autorisation.</p>
          <p>Les prix unitaires ci-dessus sont ceux communiqués par la porteuse du projet après sa recherche. Ils restent à confirmer par des devis écrits récents avant la commande. Le stockage est prévu au siège du Dahira.</p>
          <h3>Acquisition en deux étapes pour ne pas bloquer le projet</h3>
          <div class="member-table-wrap"><table><thead><tr><th>Étape</th><th>Quantités</th><th>Achat</th><th>Provision 10 %</th><th>Enveloppe</th><th>Recette brute par location complète du lot</th></tr></thead><tbody><tr><td>Phase 1 — lancement</td><td>30 VIP + 60 plastiques</td><td>870 000 F</td><td>87 000 F</td><td>957 000 F</td><td>21 000 F</td></tr><tr><td>Phase 2 — complément</td><td>20 VIP + 40 plastiques</td><td>580 000 F</td><td>58 000 F</td><td>638 000 F</td><td>14 000 F</td></tr><tr><th>Total</th><th>50 VIP + 100 plastiques</th><th>1 450 000 F</th><th>145 000 F</th><th>1 595 000 F</th><th>35 000 F</th></tr></tbody></table></div>
          <p>La location de la totalité des 150 chaises au tarif indiqué produirait 35 000 FCFA de chiffre d’affaires brut par location complète, avant transport, manutention, entretien, casse et réparations. Ce n’est pas un bénéfice net.</p>
          <h3>Ordre d’acquisition ultérieur</h3><ol><li>Tables pliantes et accessoires de protection.</li><li>Tentes et bâches après validation de la demande.</li><li>Sonorisation et microphones lorsque l’entretien et la gestion sont maîtrisés.</li><li>Matériel audiovisuel et logistique complémentaire selon rentabilité.</li></ol>
          <h3>Procédure de chaque location</h3><ol><li>Recevoir la demande et vérifier le calendrier de disponibilité.</li><li>Confirmer les quantités, le tarif, le transport, la caution éventuelle et les conditions.</li><li>Enregistrer le client, les dates, le matériel et le montant convenu.</li><li>Faire signer ou confirmer une fiche de sortie avec l’état du matériel.</li><li>Contrôler le matériel au retour et consigner pertes, casse ou réparations.</li><li>Enregistrer séparément l’encaissement et les charges réellement payées.</li><li>Calculer le bénéfice net après déduction des coûts.</li></ol>
          <p><strong>Principe :</strong> le chiffre d’affaires d’une location n’est pas le bénéfice. Transport, manutention, entretien, casse et réparations doivent être pris en compte.</p>
        </section>
        <section class="development-section">
          <h2>4. Plan de financement et objectifs annuels</h2>
          <h3>Contributions volontaires</h3><p>Hypothèse centrale : 40 participants × 500 FCFA par mois = 20 000 FCFA par mois, 240 000 FCFA par an et 1 200 000 FCFA sur cinq ans. Avec 30 participants, le total serait 900 000 FCFA ; avec 50 participants, 1 500 000 FCFA. La participation reste volontaire et distincte des cotisations ordinaires.</p>
          <h3>Objectif financier et capacité réelle de démarrage</h3><p>Le premier parc de 150 chaises représente 1 450 000 FCFA d’achat, ou 1 595 000 FCFA avec une provision de 10 %. Avec 40 participants réguliers, les contributions rapportent 240 000 FCFA par an : elles seules ne suffisent donc pas à financer rapidement le premier achat. Il faut compléter par des dons, collectes et soutiens extérieurs. La première phase peut commencer dès que 957 000 FCFA sont effectivement disponibles et réservés, sans utiliser les fonds nécessaires au fonctionnement courant.</p>
          <p>Au tarif annoncé, la location simultanée de 50 chaises VIP et 100 chaises plastiques rapporterait 35 000 FCFA brut par location complète. Les charges réelles seront déduites avant de retenir un bénéfice net.</p>
          <div class="member-table-wrap"><table><thead><tr><th>Participants</th><th>Mensuel</th><th>Annuel</th><th>Sur 5 ans</th></tr></thead><tbody><tr><td>30</td><td>15 000 F</td><td>180 000 F</td><td>900 000 F</td></tr><tr><td>40</td><td>20 000 F</td><td>240 000 F</td><td>1 200 000 F</td></tr><tr><td>50</td><td>25 000 F</td><td>300 000 F</td><td>1 500 000 F</td></tr></tbody></table></div>
          <h3>Sources de financement visées</h3><div class="member-table-wrap"><table><thead><tr><th>Source</th><th>Objectif sur 5 ans</th></tr></thead><tbody>${p.funding.map(x=>`<tr><td>${escapeHtml(x.name)}</td><td>${money(x.amount)}</td></tr>`).join('')}<tr><th>Total</th><th>${money(p.funding.reduce((s,x)=>s+Number(x.amount||0),0))}</th></tr></tbody></table></div>
          <h3>Objectifs annuels de mobilisation</h3><div class="member-table-wrap"><table><thead><tr><th>Année</th><th>Objectif annuel</th><th>Cumul</th><th>Étape principale</th></tr></thead><tbody>${p.annualTargets.map(x=>`<tr><td>${x.year}</td><td>${money(x.target)}</td><td>${money(x.cumulative)}</td><td>${escapeHtml(x.stage)}</td></tr>`).join('')}</tbody></table></div>
          <p class="development-note">Les objectifs annuels sont des cibles de mobilisation combinant contributions, dons, collectes et bénéfices nets. Ils ne sont pas garantis. Les bénéfices de location sont calculés après charges et ne doivent pas être confondus avec le chiffre d’affaires.</p>
        </section>
        <section class="development-section">
          <h2>5. Budget d’affectation prévisionnel</h2>
          <div class="member-table-wrap"><table><thead><tr><th>Affectation</th><th>Budget sur 5 ans</th></tr></thead><tbody>${p.allocations.map(x=>`<tr><td>${escapeHtml(x.name)}</td><td>${money(x.amount)}</td></tr>`).join('')}<tr><th>Total</th><th>${money(p.allocations.reduce((s,x)=>s+Number(x.amount||0),0))}</th></tr></tbody></table></div>
          <p>Les achats sont échelonnés selon les devis, les besoins réels et les fonds disponibles. Les montants affectés au futur local sont une réserve à constituer, et non une promesse d’achat immobilier.</p>
        </section>
        <section class="development-section">
          <h2>6. Calendrier de réalisation 2027–2031</h2>
          ${p.annualTargets.map(x=>`<div class="development-year"><h3>${x.year} — ${money(x.target)}</h3><p>${escapeHtml(x.stage)}</p></div>`).join('')}
        </section>
        <section class="development-section">
          <h2>7. Plan de lancement des 90 premiers jours</h2>
          <div class="development-year"><h3>16 novembre – 15 décembre 2026 — Préparation et validation</h3><p>Présenter le projet aux responsables, faire approuver le principe des contributions volontaires et de la location, désigner les responsables de la Commission Organisation et valider les procédures. Aucun achat à ce stade.</p></div>
          <div class="development-year"><h3>16 décembre 2026 – 31 janvier 2027 — Mobilisation et devis</h3><p>Recueillir les engagements volontaires, lancer les dons et collectes, obtenir au moins trois devis écrits pour les chaises, vérifier qualité, livraison, délais et garanties. Confirmer le stockage au siège du Dahira.</p></div>
          <div class="development-year"><h3>Février – mars 2027 — Constitution de la première enveloppe</h3><p>Constituer et tracer les fonds. La première commande ne sera autorisée que lorsque 957 000 FCFA sont réellement disponibles pour financer 30 chaises VIP et 60 chaises plastiques, provision de 10 % comprise. Si le seuil n’est pas atteint, la collecte continue et la date est reportée.</p></div>
          <div class="development-year"><h3>Avril 2027 — Décision de lancement conditionnelle</h3><p>Réunion de contrôle : vérifier le solde disponible, les devis, le stockage, le registre, les tarifs, les personnes responsables et les imprévus. Si toutes les conditions sont remplies, les responsables approuvent l’achat de la phase 1. Sinon, report au prochain contrôle trimestriel.</p></div>
          <div class="development-year"><h3>Mai – juin 2027 — Première mise en location, si achat réalisé</h3><p>Inventorier et identifier les chaises, établir les fiches de sortie/retour, lancer les locations tests et produire un premier bilan. La phase 2 ne sera décidée qu’après observation de la demande et constitution de l’enveloppe de 638 000 FCFA.</p></div>
          <p><strong>Condition de prudence :</strong> ne pas engager d’achat sur la base de recettes espérées. L’achat doit être couvert par des fonds réellement disponibles et autorisés.</p>
        </section>
        <section class="development-section">
          <h2>8. Gouvernance et responsabilités</h2>
          <ul>${p.governance.map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul>
          <p>Les responsables du Dahira approuvent les orientations et dépenses importantes. La Commission Finance tient les écritures et les justificatifs. La Commission Organisation coordonne les activités et la logistique. Un responsable du matériel suit les sorties, retours et réparations. Un comité de suivi contrôle l’avancement. Les fonctions de demande, approbation, paiement et contrôle doivent être séparées autant que possible.</p>
        </section>
        <section class="development-section">
          <h2>9. Règles financières et de contrôle</h2>
          <ol>${p.rules.map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ol>
          <ul><li>Un reçu ou justificatif est conservé pour chaque recette et dépense.</li><li>Les recettes du projet sont encaissées dans la Caisse générale, puis identifiées dans le suivi analytique du projet.</li><li>Le transfert interne ou l’affectation comptable d’une somme ne constitue pas une nouvelle recette.</li><li>Le registre privé de cette page est un outil de préparation et de suivi ; il ne crée aucun mouvement dans la caisse officielle.</li><li>Un rapprochement périodique doit être fait entre le registre du projet, les justificatifs et la comptabilité réelle.</li></ul>
        </section>
        <section class="development-section">
          <h2>10. Indicateurs de réussite et risques</h2>
          <h3>Indicateurs</h3><ul><li>Montant réellement collecté et montant réservé au projet.</li><li>Nombre de participants réguliers et niveau de contribution volontaire.</li><li>Nombre et valeur des équipements acquis et inventoriés.</li><li>Nombre de locations, chiffre d’affaires, charges et bénéfice net.</li><li>Taux de disponibilité et état du matériel.</li><li>Rapports financiers produits à temps et dépenses justifiées.</li><li>Montant de la réserve dédiée au futur local.</li></ul>
          <h3>Principaux risques et mesures</h3><ul><li>Faible participation : adapter le rythme d’achat et diversifier les dons.</li><li>Faible demande locative : tester le marché avant les acquisitions importantes.</li><li>Casse ou perte : fiches de sortie, caution adaptée, inventaire et entretien.</li><li>Confusion des fonds : suivi analytique, justificatifs et rapprochement régulier.</li><li>Conflit d’usage : priorité écrite aux activités du Dahira et calendrier de réservation.</li></ul>
        </section>
        <section class="development-section">
          <h2>11. Registre confidentiel de suivi</h2>
          <div class="development-print-actions"><button type="button" class="secondary" id="developmentPrintBtn2">Imprimer le dossier</button></div>
          <h3>Résumé du registre financier privé</h3>
          <div class="member-table-wrap"><table><tbody><tr><th>Objectif quinquennal</th><td>${money(p.goal)}</td></tr><tr><th>Recettes saisies dans ce registre</th><td>${money(income)}</td></tr><tr><th>Dépenses saisies dans ce registre</th><td>${money(expenses)}</td></tr><tr><th>Solde du registre privé</th><td>${money(income-expenses)}</td></tr><tr><th>Chiffre d’affaires locatif saisi</th><td>${money(rentalGross)}</td></tr><tr><th>Charges locatives saisies</th><td>${money(rentalCosts)}</td></tr><tr><th>Résultat net théorique du registre de locations</th><td>${money(rentalNet)}</td></tr></tbody></table></div>
          <p class="development-note">Les registres de cette page sont confidentiels et ne remplacent pas les pièces comptables officielles. Les locations doivent également être rapprochées des encaissements et dépenses réellement enregistrés dans la comptabilité du Dahira.</p>
          <h3>Enregistrer une recette ou une dépense</h3>
          <form id="devLedgerForm" class="member-form"><div class="form-row"><label>Type<select id="devEntryType"><option value="income">Recette / contribution / don / encaissement</option><option value="expense">Dépense / achat / entretien</option></select></label><label>Montant (FCFA)<input id="devEntryAmount" type="number" min="1" step="1" required></label></div><div class="form-row"><label>Catégorie<select id="devEntryCategory"><option>Contribution volontaire</option><option>Don</option><option>Collecte</option><option>Location de matériel</option><option>Achat de matériel</option><option>Transport</option><option>Entretien / réparation</option><option>Activité du Dahira</option><option>Réserve futur local</option><option>Autre</option></select></label><label>Date<input id="devEntryDate" type="date" required value="${today()}"></label></div><label>Description<input id="devEntryDescription" maxlength="240" required placeholder="Référence ou explication"></label><button class="primary" type="submit">Enregistrer au registre privé</button><p id="devLedgerMessage" role="status"></p></form>
          <div id="devLedgerRows" class="admin-module-list"></div>
          <h3>Registre des locations</h3>
          <p>Enregistrer chaque réservation et ses charges pour calculer le résultat net. Ce registre opérationnel ne déclenche pas automatiquement un mouvement dans la Caisse générale.</p>
          <form id="devRentalForm" class="member-form"><div class="form-row"><label>Date de location<input id="devRentalDate" type="date" required value="${today()}"></label><label>Client / bénéficiaire<input id="devRentalClient" maxlength="120" required></label></div><div class="form-row"><label>Matériel loué<input id="devRentalItem" maxlength="120" required placeholder="Ex. 40 chaises et 2 tables"></label><label>Quantité<input id="devRentalQty" type="number" min="1" step="1" required></label></div><div class="form-row"><label>Montant convenu (FCFA)<input id="devRentalAmount" type="number" min="0" step="1" required></label><label>Charges (FCFA)<input id="devRentalCosts" type="number" min="0" step="1" value="0" required></label></div><label>État<select id="devRentalStatus"><option value="reserved">Réservée</option><option value="completed">Effectuée</option><option value="cancelled">Annulée</option></select></label><button class="primary" type="submit">Ajouter la location</button><p id="devRentalMessage" role="status"></p></form><div id="devRentalRows" class="admin-module-list"></div>
          <h3>Inventaire du matériel</h3>
          <form id="devInventoryForm" class="member-form"><div class="form-row"><label>Matériel<input id="devItemName" maxlength="120" required placeholder="Ex. Chaises plastiques"></label><label>Quantité<input id="devItemQty" type="number" min="1" step="1" required></label></div><div class="form-row"><label>Coût total d’acquisition (FCFA)<input id="devItemCost" type="number" min="0" step="1" value="0"></label><label>État<select id="devItemStatus"><option>À acquérir</option><option>Disponible</option><option>En location</option><option>À réparer</option></select></label></div><button class="primary" type="submit">Ajouter à l’inventaire</button><p id="devInventoryMessage" role="status"></p></form><div id="devInventoryRows" class="admin-module-list"></div>
        </section>
        <section class="development-section development-approval">
          <h2>12. Validation du projet</h2>
          <p>Projet soumis à l’approbation des responsables et des membres du Daara Jazbul Quluub – Cellule Dakar.</p>
          <div class="development-signatures"><div>Président / Responsable<br><span></span></div><div>Responsable financier<br><span></span></div><div>Secrétaire<br><span></span></div><div>Date et signatures<br><span></span></div></div>
        </section>
        <footer class="development-footer">DAARA JAZBUL QULUUB – CELLULE DAKAR · DOSSIER CONFIDENTIEL · PROGRAMME 2027–2031</footer>
      </div>`;
    $('developmentPrintBtn')?.addEventListener('click',()=>window.print());
    $('developmentPrintBtn2')?.addEventListener('click',()=>window.print());
    renderRows();
  }
  function renderRows() {
    const lr=$('devLedgerRows'),ir=$('devInventoryRows'),rr=$('devRentalRows');
    if(lr)lr.innerHTML=data.ledger.length?[...data.ledger].reverse().map((x,i)=>`<div class="admin-module-row"><div><strong>${escapeHtml(x.description)}</strong><small>${escapeHtml(x.date)} · ${escapeHtml(x.category)} · ${x.type==='income'?'Recette':'Dépense'}</small></div><strong>${x.type==='income'?'+':'−'}${money(x.amount)}</strong><button type="button" class="secondary" data-ledger-remove="${data.ledger.length-1-i}">Retirer</button></div>`).join(''):'<p class="preview-note">Aucun mouvement enregistré.</p>';
    if(ir)ir.innerHTML=data.inventory.length?data.inventory.map((x,i)=>`<div class="admin-module-row"><div><strong>${escapeHtml(x.name)}</strong><small>Quantité : ${escapeHtml(x.qty)} · Coût : ${money(x.cost)} · ${escapeHtml(x.status)}</small></div><button type="button" class="secondary" data-inventory-remove="${i}">Retirer</button></div>`).join(''):'<p class="preview-note">Aucun matériel enregistré.</p>';
    if(rr)rr.innerHTML=data.rentals.length?[...data.rentals].reverse().map((x,i)=>`<div class="admin-module-row"><div><strong>${escapeHtml(x.client)} — ${escapeHtml(x.item)}</strong><small>${escapeHtml(x.date)} · Qté : ${escapeHtml(x.qty)} · ${escapeHtml(({reserved:'Réservée',completed:'Effectuée',cancelled:'Annulée'})[x.status]||x.status)}</small></div><strong>Net : ${money(Number(x.amount||0)-Number(x.costs||0))}</strong><button type="button" class="secondary" data-rental-remove="${data.rentals.length-1-i}">Retirer</button></div>`).join(''):'<p class="preview-note">Aucune location enregistrée.</p>';
  }
  async function save() {
    if(!ownerIsSignedIn())throw new Error('Accès personnel non autorisé.');
    const result=await sb.from('private_development_projects').upsert({owner_id:OWNER_ID,project_key:PROJECT_KEY,project_data:data,updated_at:new Date().toISOString()},{onConflict:'owner_id,project_key'});
    if(result.error)throw result.error;
  }
  async function load() {
    if(!ownerIsSignedIn()){lockUI();return;}
    const result=await sb.from('private_development_projects').select('project_data').eq('owner_id',OWNER_ID).eq('project_key',PROJECT_KEY).maybeSingle();
    if(result.error)throw result.error;
    if(!result.data?.project_data?.plan)throw new Error('Le dossier privé n’est pas initialisé.');
    const stored=result.data.project_data;
    data={plan:stored.plan,ledger:Array.isArray(stored.ledger)?stored.ledger:[],inventory:Array.isArray(stored.inventory)?stored.inventory:[],rentals:Array.isArray(stored.rentals)?stored.rentals:[]};
    ready=true;render();
  }
  window.loadPrivateDevelopmentProject=async()=>{if(!ownerIsSignedIn())return;try{await load();}catch(error){console.error(error);const c=$('privateDevelopmentProjectContent');if(c)c.innerHTML='<p role="alert">Impossible de charger le dossier privé. Réessaie après reconnexion.</p>'; }};
  document.addEventListener('DOMContentLoaded',()=>{lockUI();if(ownerIsSignedIn())void window.loadPrivateDevelopmentProject();});
  document.addEventListener('submit',async event=>{
    const form=event.target;
    if(!['devLedgerForm','devInventoryForm','devRentalForm'].includes(form.id))return;
    event.preventDefault();if(!ownerIsSignedIn()||!ready)return;
    if(form.id==='devLedgerForm'){
      const amount=Number($('devEntryAmount').value);if(!Number.isFinite(amount)||amount<=0)return;
      const entry={type:$('devEntryType').value,amount,category:$('devEntryCategory').value,date:$('devEntryDate').value,description:$('devEntryDescription').value.trim(),created_at:new Date().toISOString()};
      data.ledger.push(entry);
    }else if(form.id==='devInventoryForm'){
      const item={name:$('devItemName').value.trim(),qty:Number($('devItemQty').value),cost:Number($('devItemCost').value||0),status:$('devItemStatus').value};
      data.inventory.push(item);
    }else{
      const rental={date:$('devRentalDate').value,client:$('devRentalClient').value.trim(),item:$('devRentalItem').value.trim(),qty:Number($('devRentalQty').value),amount:Number($('devRentalAmount').value),costs:Number($('devRentalCosts').value||0),status:$('devRentalStatus').value,created_at:new Date().toISOString()};
      data.rentals.push(rental);
    }
    try{await save();render();}catch(error){alert('Enregistrement impossible : '+error.message);await load();}
  });
  document.addEventListener('click',async event=>{
    const lr=event.target.closest('[data-ledger-remove]'),ir=event.target.closest('[data-inventory-remove]'),rr=event.target.closest('[data-rental-remove]');
    if(!ownerIsSignedIn()||!ready)return;
    let list=null,button=null;
    if(lr){list=data.ledger;button=lr;}
    else if(ir){list=data.inventory;button=ir;}
    else if(rr){list=data.rentals;button=rr;}
    if(!list||!button)return;
    const i=Number(button.dataset.ledgerRemove??button.dataset.inventoryRemove??button.dataset.rentalRemove);
    if(!Number.isInteger(i)||i<0||i>=list.length)return;
    if(!confirm('Retirer cette ligne du registre privé ?'))return;
    const old=list.splice(i,1)[0];
    try{await save();render();}catch(error){list.splice(i,0,old);render();alert('Modification impossible : '+error.message);}
  });
})();