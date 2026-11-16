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

  function buildMonthlyProjection(p, participantsOverride) {
    const cfg = p.financialPlan || {};
    const participants = Number(participantsOverride || cfg.participants || 40);
    const monthlyContribution = Number(cfg.monthlyContribution || 500);
    const monthlyDonation = Number(cfg.monthlyDonationTarget || 200000);
    const donationMonths = Number(cfg.donationMonths || 5);
    const soundBudget = Number(cfg.soundSystemBudget || 1000000);
    const sequence = Array.isArray(cfg.equipmentSequence) ? cfg.equipmentSequence : [];
    let balance = 0, donationCollected = 0, soundPurchased = false, nextItem = 0;
    const rows = [], purchaseDates = [];
    for (let i=0;i<60;i++) {
      const year = 2027 + Math.floor(i/12), month = (i%12)+1;
      const days = new Date(year, month, 0).getDate();
      let lastSunday = 0, thursdays = 0, paidSundays = 0;
      for(let d=1;d<=days;d++) if(new Date(year,month-1,d).getDay()===0) lastSunday=d;
      for(let d=1;d<=days;d++) {
        const weekday = new Date(year,month-1,d).getDay();
        if(weekday===4) thursdays++;
        if(weekday===0 && d!==lastSunday) paidSundays++;
      }
      const opening = balance;
      const contributions = participants * monthlyContribution;
      const donations = i < donationMonths ? monthlyDonation : 0;
      donationCollected += donations;
      balance += contributions + donations;
      const soundIncome = soundPurchased ? thursdays*Number(cfg.thursdayRentalFee||2500)+paidSundays*Number(cfg.sundayRentalFee||3500) : 0;
      balance += soundIncome;
      const purchases = [];
      if(!soundPurchased && donationCollected >= soundBudget) {
        balance -= soundBudget;
        soundPurchased = true;
        purchases.push({name:'Sonorisation complète — enveloppe budgétaire',amount:soundBudget});
        purchaseDates.push({name:'Sonorisation',year,month,amount:soundBudget});
      }
      while(soundPurchased && nextItem < sequence.length && balance >= Number(sequence[nextItem].total||0)) {
        const item=sequence[nextItem++];
        balance -= Number(item.total||0);
        purchases.push({name:item.name,amount:Number(item.total||0)});
        purchaseDates.push({name:item.name,year,month,amount:Number(item.total||0)});
      }
      let objective;
      if(i===0) objective='Lancer la collecte spéciale : 200 000 F de dons visés ; encaisser les mensualités ; obtenir les devis de sonorisation.';
      else if(i<4) objective='Atteindre 200 000 F de dons supplémentaires ; suivre les promesses et encaissements ; poursuivre les cotisations.';
      else if(i===4) objective='Atteindre 1 000 000 F de collecte spéciale, contrôler les devis et acheter la sonorisation uniquement si le million est encaissé.';
      else objective='Encaisser '+money(contributions)+' de cotisations ; viser '+money(soundIncome)+' de locations sonorisation ('+thursdays+' jeudis × 2 500 F et '+paidSundays+' dimanches × 3 500 F) ; déduire les charges réelles et alimenter le prochain achat dans l’ordre prévu.';
      if(purchases.length) objective += ' Achat prévu ce mois : '+purchases.map(x=>x.name).join(', ')+'.';
      rows.push({year,month,opening,contributions,donations,thursdays,paidSundays,soundIncome,purchases,closing:balance,objective});
    }
    return {rows,purchaseDates,participants,monthlyContribution,monthlyDonation,soundBudget};
  }
  function renderFinancialRoadmap(p) {
    const cfg=p.financialPlan || {};
    const projection=buildMonthlyProjection(p);
    const fmtDate=x=>String(new Date(x.year,x.month,0).getDate()).padStart(2,'0')+'/'+String(x.month).padStart(2,'0')+'/'+x.year;
    const purchases=projection.purchaseDates;
    const purchaseRows=purchases.length?purchases.map(x=>`<tr><td>${escapeHtml(x.name)}</td><td>${fmtDate(x)}</td><td>${money(x.amount)}</td></tr>`).join(''):'<tr><td colspan="3">Aucun achat atteint dans la simulation.</td></tr>';
    const scenarioRows=[30,40,50].map(n=>{
      const q=buildMonthlyProjection(p,n);
      const when=name=>{const found=q.purchaseDates.find(x=>x.name===name);return found?fmtDate(found):'Après 2031';};
      return `<tr><td>${n}</td><td>${money(n*500)}</td><td>${when('Chaises — phase 1 (30 VIP + 60 plastiques)')}</td><td>${when('Chaises — phase 2 (20 VIP + 40 plastiques)')}</td><td>${when('Bâche 8×6 m ouverte')}</td><td>${when('Bâche 12×7 m ouverte')}</td><td>${when('Tables pliantes')}</td></tr>`;
    }).join('');
    const monthlyRows=projection.rows.map((x,i)=>`<tr><td>${String(x.month).padStart(2,'0')}/${x.year}</td><td>${money(x.contributions)}</td><td>${money(x.donations)}</td><td>${money(x.soundIncome)}</td><td>${x.thursdays} / ${x.paidSundays}</td><td>${x.purchases.length?x.purchases.map(y=>escapeHtml(y.name)+' : '+money(y.amount)).join('<br>'):'—'}</td><td>${money(x.closing)}</td><td>${escapeHtml(x.objective)}</td></tr>`).join('');
    const sequenceRows=(cfg.equipmentSequence||[]).map(x=>`<tr><td>${escapeHtml(x.name)}</td><td>${escapeHtml(x.quantityLabel||'—')}</td><td>${escapeHtml(x.priceDisplay||money(x.unitPrice||0))}</td><td>${money(x.total||0)}</td><td>${escapeHtml(x.priceNote||'Prix indicatif à confirmer par devis')}</td></tr>`).join('');
    const annualRows=[2027,2028,2029,2030,2031].map(y=>{
      const rows=projection.rows.filter(x=>x.year===y);
      const contrib=rows.reduce((a,x)=>a+x.contributions,0), dons=rows.reduce((a,x)=>a+x.donations,0), sound=rows.reduce((a,x)=>a+x.soundIncome,0);
      const bought=rows.flatMap(x=>x.purchases).map(x=>x.name);
      return `<tr><td>${y}</td><td>${money(contrib)}</td><td>${money(dons)}</td><td>${money(sound)}</td><td>${bought.length?escapeHtml(bought.join(', ')):'Financement et suivi'}</td></tr>`;
    }).join('');
    return `
      <section class="development-section" id="dev-section-3">
        <h2>3. Stratégie de financement : la sonorisation en premier</h2>
        <p>Le projet démarre le <strong>1er janvier 2027</strong>. La première priorité est de réunir <strong>1 000 000 FCFA en cinq mois</strong> auprès des parents des membres, des proches et des personnes de bonne volonté. L’objectif de collecte est de 200 000 FCFA par mois de janvier à mai 2027.</p>
        <p>Les mensualités volontaires des membres, fixées à 500 FCFA par personne et par mois, sont cumulées en parallèle. La simulation principale retient 40 participants, soit 20 000 FCFA par mois. Les mensualités ne sont pas confondues avec les dons affectés à l’achat de la sonorisation.</p>
        <div class="member-table-wrap"><table><thead><tr><th>Mois de collecte</th><th>Objectif mensuel</th><th>Cumul des dons</th><th>Cotisations estimées (40 membres)</th></tr></thead><tbody>
          ${Array.from({length:5},(_,i)=>`<tr><td>${['Janvier','Février','Mars','Avril','Mai'][i]} 2027</td><td>${money(200000)}</td><td>${money((i+1)*200000)}</td><td>${money((i+1)*20000)}</td></tr>`).join('')}
        </tbody></table></div>
        <p><strong>Échéance visée :</strong> 31 mai 2027. L’achat de la sonorisation ne sera engagé qu’après vérification du million réellement encaissé, comparaison d’au moins trois devis, contrôle du matériel et validation des responsables. Si la collecte est en retard, l’achat sera reporté : aucune dette ni dépense anticipée n’est prévue.</p>
        <h3>Enveloppe de sonorisation : 1 000 000 FCFA</h3>
        <p>Cette somme est un budget maximal à réunir, pas un devis fournisseur déjà accepté. Les annonces consultées à Dakar présentent notamment des packs complets autour de 515 000 FCFA et 760 000 FCFA selon les configurations. Le solde de l’enveloppe pourra couvrir, après devis, les accessoires manquants, câbles, protections, transport, installation et réserve initiale de maintenance. Aucun reliquat ne sera dépensé sans justificatif.</p>
        <h3>Recettes prévisionnelles après acquisition</h3>
        <ul><li>Chaque jeudi d’utilisation payante : 2 500 FCFA.</li><li>Chaque dimanche d’utilisation payante : 3 500 FCFA.</li><li>Hypothèse de calcul à confirmer : le dernier dimanche de chaque mois est réservé au siège et ne génère pas de recette de location.</li></ul>
        <p>La simulation compte les jeudis et dimanches réellement présents dans chaque mois, à partir de juin 2027. Elle suppose que chaque activité payante a lieu et que le paiement est encaissé. Le revenu brut annuel de référence est d’environ 270 000 FCFA sur une année complète. Les recettes de location des chaises ne sont pas intégrées au calcul, car la fréquence des locations n’a pas encore été définie.</p>
      </section>
      <section class="development-section" id="dev-section-4">
        <h2>4. Liste du matériel et budget prévisionnel</h2>
        <p>Le budget révisé de 4 145 000 FCFA couvre uniquement les équipements prioritaires de cette séquence ; le futur local, les activités et les autres projets feront l’objet d’un budget distinct. Les prix ci-dessous sont des bases de travail. Les prix des chaises reprennent les estimations déjà retenues dans le projet ; les offres actuellement visibles à Dakar doivent être comparées avant achat. Les bâches et tables sont basées sur des annonces de vente consultées. Tous les montants restent à confirmer par devis écrits, disponibilité et frais de livraison.</p>
        <div class="member-table-wrap"><table><thead><tr><th>Matériel / étape</th><th>Quantité</th><th>Prix unitaire estimé</th><th>Enveloppe</th><th>Précision</th></tr></thead><tbody>
          <tr><td>Sonorisation complète</td><td>1 lot</td><td>—</td><td>${money(1000000)}</td><td>Budget plafond, configuration à choisir sur devis</td></tr>
          ${sequenceRows}
        </tbody></table></div>
        <p><strong>Chaises — phase 1 :</strong> 30 VIP à 15 000 F et 60 plastiques à 7 000 F = 870 000 F, plus provision de 10 % (87 000 F), soit 957 000 F.</p>
        <p><strong>Chaises — phase 2 :</strong> 20 VIP à 15 000 F et 40 plastiques à 7 000 F = 580 000 F, plus provision de 10 % (58 000 F), soit 638 000 F. Total visé : 50 VIP et 100 plastiques.</p>
        <p>La bâche 8×6 m (dimensions 8 × 6 m) est estimée à 550 000 F (estimation provisoire, à confirmer par devis) ; la bâche 12×7 m ouverte à 850 000 F. Les 5 tables pliantes sont estimées à 30 000 F l’unité, soit 150 000 F. Ces montants ne constituent pas des commandes.</p>
        <h3>Sources de prix consultées</h3>
        <ul>
          <li><a href="https://www.dakarvente.com/fr/annonce/vente-de-baches-sur-mesure-chaises-et-packs-pour-vos-evenements" target="_blank" rel="noopener">DakarVente — bâches et chaises</a> : annonce consultée pour les chaises ; le tarif exact de la bâche 8×6 m reste à demander.</li>
          <li><a href="https://dakarvente.com/fr/annonce/fabrication-des-baches-au-senegal-3" target="_blank" rel="noopener">DakarVente — fabrication bâche 12×7 m</a> : annonce de 850 000 F en toiture simple ; une autre annonce consultée indique 770 000 F. Prix à confirmer par devis.</li>
          <li><a href="https://www.senemarket.sn/public/vente-de-chaises-de-qualite/19597" target="_blank" rel="noopener">SeneMarket — chaises à Dakar</a> : VIP 1re qualité 16 500 F, VIP 2e qualité 13 000 F, plastique 6 500 F.</li>
          <li><a href="https://dakarvente.com/fr/annonce/table-pliante-multi-usage" target="_blank" rel="noopener">DakarVente — table pliante</a> : 30 000 F à l’unité, prix de détail affiché.</li>
          <li><a href="https://www.senemarket.sn/public/table-rectangulaire-pliable-a-vendre/13368" target="_blank" rel="noopener">SeneMarket — table pliante 8 personnes</a> : annonce à 55 000 F, à comparer selon modèle et qualité.</li>
        </ul>
      </section>
      <section class="development-section" id="dev-section-5">
        <h2>5. Comment l’argent est cumulé et utilisé</h2>
        <ol>
          <li>Les dons de janvier à mai 2027 sont affectés à l’objectif sonorisation de 1 000 000 F.</li>
          <li>Les mensualités des membres sont cumulées à part et servent au financement du matériel suivant après l’achat de la sonorisation.</li>
          <li>À partir de juin 2027, les recettes de location de sonorisation sont ajoutées au cumul disponible, après encaissement effectif.</li>
          <li>L’ordre est obligatoire : chaises phase 1, chaises phase 2, bâche 8×6, bâche 12×7, puis tables et autres équipements.</li>
          <li>Une étape suivante ne peut pas être achetée avant que l’étape précédente soit financée intégralement.</li>
          <li>Les frais de réparation, transport, entretien et autres dépenses réelles doivent être déduits avant de confirmer un achat.</li>
          <li>Les transferts internes vers la ligne analytique du projet ne sont jamais comptés comme une nouvelle recette de la Caisse générale.</li>
        </ol>
        <p class="development-note">Les dates calculées sont des dates théoriques de fin de mois, sur la base de 40 membres payant chaque mois, d’une collecte de 200 000 F pendant cinq mois et de toutes les locations de sonorisation prévues effectivement encaissées. Les charges d’exploitation ne sont pas encore chiffrées : les dates réelles peuvent donc être plus tardives.</p>
      </section>
      <section class="development-section" id="dev-section-6">
        <h2>6. Dates prévisionnelles et objectifs annuels</h2>
        <h3>Comparaison selon le nombre de participants</h3>
        <p>La collecte spéciale de 1 000 000 F reste identique dans les trois scénarios ; seule la mensualité totale change. Les dates sont calculées avant charges d'exploitation.</p>
        <div class="member-table-wrap"><table><thead><tr><th>Participants</th><th>Cotisations / mois</th><th>Chaises phase 1</th><th>Chaises phase 2</th><th>Bâche 8×6</th><th>Bâche 12×7</th><th>5 tables</th></tr></thead><tbody>${scenarioRows}</tbody></table></div>
        <div class="member-table-wrap"><table><thead><tr><th>Projet / achat</th><th>Mois théorique</th><th>Enveloppe</th></tr></thead><tbody>${purchaseRows}</tbody></table></div>
        <p>Si une recette n’est pas encaissée, si le nombre de participants diminue ou si des frais sont engagés, l’achat est reporté au mois où le solde réel atteint le seuil. Les dates ne sont pas des engagements fournisseurs.</p>
        <h3>Objectifs annuels de suivi</h3>
        <div class="member-table-wrap"><table><thead><tr><th>Année</th><th>Cotisations prévues</th><th>Dons prévus</th><th>Recettes brutes de sonorisation</th><th>Jalon principal</th></tr></thead><tbody>${annualRows}</tbody></table></div>
      </section>
      <section class="development-section" id="dev-section-7">
        <h2>7. Calendrier détaillé : janvier 2027 à décembre 2031</h2>
        <p>Chaque ligne donne l’objectif du mois, les recettes estimées et le cumul disponible après les achats déclenchés en fin de mois. Les recettes de sonorisation sont nulles avant l’achat prévu en mai 2027.</p>
        <div class="member-table-wrap"><table><thead><tr><th>Mois</th><th>Cotisations prévues</th><th>Dons prévus</th><th>Sonorisation brute</th><th>Jeudis / dimanches payants</th><th>Achat déclenché</th><th>Solde projeté</th><th>Objectif du mois</th></tr></thead><tbody>${monthlyRows}</tbody></table></div>
      </section>`;
  }

  function render() {
    if(!data.plan || !ownerIsSignedIn()) return;
    const p={...data.plan, goal:4145000, financialPlan:{...(data.plan.financialPlan||{}), equipmentSequence:(data.plan.financialPlan?.equipmentSequence||[]).map(item=>{if(String(item.name||'').toLowerCase().includes('tables pliantes'))return {...item,quantityLabel:'5 unités',unitPrice:30000,total:150000,priceDisplay:'30 000 FCFA / unité',priceNote:'Prix indicatif conservé du projet précédent'};return item;})}};
    const summaryProjection=buildMonthlyProjection(p);
    const projectedFunds=summaryProjection.rows.reduce((s,x)=>s+x.contributions+x.donations+x.soundIncome,0);
    const equipmentBudget=Number(p.goal||0);
    const fundingGap=Math.max(0,equipmentBudget-projectedFunds);
    const projectedPurchases=summaryProjection.purchaseDates.map(x=>x.name);
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
        <div class="development-document-heading"><span>DAARA JAZBUL QULUUB · CELLULE DAKAR</span><h2>Guide de lecture et sommaire</h2><p>Le dossier commence par l’essentiel, explique ensuite le financement et les achats, puis présente l’organisation et les outils de suivi.</p></div>
        <ol class="development-toc">
          <li><a href="#dev-section-1">Présentation du projet</a></li>
          <li><a href="#dev-section-2">Les cinq axes de développement</a></li>
          <li><a href="#dev-section-3">Stratégie de financement</a></li>
          <li><a href="#dev-section-4">Matériel et budget</a></li>
          <li><a href="#dev-section-5">Règles de cumul et d’achat</a></li>
          <li><a href="#dev-section-6">Dates prévisionnelles et objectifs annuels</a></li>
          <li><a href="#dev-section-7">Calendrier détaillé sur 60 mois</a></li>
          <li><a href="#dev-section-8">Plan de lancement</a></li>
          <li><a href="#dev-section-9">Responsabilités</a></li>
          <li><a href="#dev-section-10">Règles financières et contrôles</a></li>
          <li><a href="#dev-section-11">Résultats attendus et risques</a></li>
          <li><a href="#dev-section-12">Registre privé de suivi</a></li>
          <li><a href="#dev-section-13">Validation</a></li>
        </ol>
        <section class="development-summary">
          <h2>Le projet en quelques minutes</h2>
          <div class="development-summary-grid">
            <article><strong>Début</strong><span>1er janvier 2027</span></article>
            <article><strong>Durée</strong><span>5 ans · 2027–2031</span></article>
            <article><strong>Participants visés</strong><span>30 à 50 · base de calcul : 40</span></article>
            <article><strong>Cotisation proposée</strong><span>500 FCFA par participant et par mois</span></article>
            <article><strong>Collecte spéciale</strong><span>1 000 000 FCFA de janvier à mai 2027</span></article>
            <article><strong>Budget du matériel</strong><span>4 145 000 FCFA, prix à confirmer</span></article>
          </div>
          <h3>Dans quel ordre le projet avance-t-il ?</h3>
          <ol><li>Réunir les dons destinés à la sonorisation.</li><li>Acquérir et mettre en service la sonorisation.</li><li>Ajouter les cotisations et les recettes nettes de location réellement encaissées.</li><li>Acheter les chaises en deux étapes, puis les bâches 8 × 6 m et 12 × 7 m, et enfin les cinq tables.</li></ol>
          <div class="development-funding-alert">
            <h3>Le financement suffit-il pour tout acheter avant fin 2031 ?</h3>
            <p>Dans le scénario de 40 participants, les ressources brutes simulées sur cinq ans sont de <strong>${money(projectedFunds)}</strong>, pour un budget matériel de <strong>${money(equipmentBudget)}</strong>. Il reste donc un besoin de financement estimé à <strong>${money(fundingGap)}</strong>, avant déduction des frais réels.</p>
            <p>Avec les hypothèses actuelles, les achats atteints dans la simulation sont : <strong>${escapeHtml(projectedPurchases.join(', ')||'aucun achat')}</strong>. La bâche de 12 × 7 m et les cinq tables restent à financer après 2031, sauf dons supplémentaires, recettes supérieures aux prévisions ou baisse des coûts.</p>
            <p>Cette simulation est volontairement prudente sur les engagements : les recettes locatives sont des montants bruts et peuvent être inférieures si les locations ne se réalisent pas. Les charges réelles retarderont les achats.</p>
          </div>
          <p class="development-note"><strong>À retenir :</strong> les chiffres du dossier sont des objectifs et des simulations, pas de l’argent déjà collecté. Les achats ne sont autorisés que lorsque les fonds sont réellement disponibles et que les responsables ont donné leur accord. Toutes les opérations financières réelles passent par la Caisse générale.</p>
        </section>
        <section class="development-section" id="dev-section-1">
          <h2>1. Présentation du projet</h2>
          <p>Le Daara Jazbul Quluub – Cellule Dakar souhaite renforcer progressivement ses moyens financiers et matériels afin de garantir le bon fonctionnement de ses activités religieuses, éducatives, culturelles et sociales. Le programme vise à constituer un patrimoine utile au Dahira, à développer une activité de location et à préparer des investissements durables.</p>
          <h3>Vision à cinq ans</h3><p>${escapeHtml(p.vision)}</p>
          <h3>Objectif général</h3><p>Le montant de ${money(p.goal)} correspond au budget prévisionnel de la séquence d’équipements décrite dans ce dossier. Il ne constitue ni une somme déjà disponible ni une promesse de recettes. Les activités futures et le projet de local nécessiteront des budgets séparés, qui seront étudiés et validés ultérieurement.</p>
          <h3>Objectifs spécifiques</h3><ul><li>Mobiliser 30 à 50 participants volontaires à raison de 500 FCFA par mois.</li><li>Constituer un premier parc de matériel événementiel.</li><li>Développer la location de chaises, tables et autres équipements.</li><li>Réinvestir une partie des bénéfices nets dans le matériel.</li><li>Financer progressivement les activités et besoins logistiques.</li><li>Constituer une réserve affectée à un futur local.</li><li>Garantir une gestion documentée, vérifiable et transparente.</li></ul>
        </section>
        <section class="development-section" id="dev-section-2">
          <h2>2. Les cinq grands axes du projet</h2>
          <h3>Axe 1 — Équipements du Dahira</h3><p>Acquérir d’abord une sonorisation pour les activités hebdomadaires et la location, puis les chaises, les deux bâches et les tables et les équipements complémentaires. Le matériel du Dahira reste prioritaire pour ses propres activités.</p>
          <h3>Axe 2 — Activités génératrices de revenus</h3><p>Commencer par la location de matériel événementiel. Après évaluation de la demande et des résultats, étudier les prestations audiovisuelles, la location de sonorisation et d’autres services compatibles avec les capacités du Dahira.</p>
          <h3>Axe 3 — Activités et événements</h3><p>Soutenir progressivement les rassemblements, événements religieux et culturels, déplacements, activités éducatives et besoins logistiques, selon le budget annuel approuvé.</p>
          <h3>Axe 4 — Futur local</h3><p>Constituer une réserve dédiée, réaliser une étude des besoins, comparer les options de location durable, acquisition ou construction, puis vérifier les aspects juridiques, fonciers et techniques avant tout engagement.</p>
          <h3>Axe 5 — Réserve et maintenance</h3><p>Conserver une réserve de sécurité pour réparations, renouvellement du matériel et imprévus, sans l’utiliser sans autorisation.</p>
        </section>
        ${renderFinancialRoadmap(p)}
        <section class="development-section" id="dev-section-8">
          <h2>8. Plan de lancement : les cinq premiers mois</h2>
          <p>Le lancement est organisé autour d’une collecte spéciale de cinq mois. Chaque mois, le responsable du suivi compare l’objectif, les dons réellement reçus et les cotisations effectivement encaissées.</p>
          <div class="development-launch-steps">
            ${(p.launchMilestones||[]).map((x,i)=>`<article><span>Étape ${i+1}</span><strong>${escapeHtml(x.period)}</strong><p>${escapeHtml(x.step)}</p></article>`).join('')}
          </div>
          <h3>Point de contrôle à la fin de chaque mois</h3>
          <ul><li>Compter uniquement les sommes réellement encaissées et enregistrées dans la Caisse générale.</li><li>Comparer le cumul des dons au seuil de 1 000 000 FCFA.</li><li>Mettre à jour la liste des participants et les cotisations reçues.</li><li>Conserver les reçus, preuves de transfert et devis.</li><li>Présenter l’état d’avancement aux responsables et décider de la suite.</li></ul>
        </section>
        <section class="development-section" id="dev-section-9">
          <h2>9. Qui fait quoi ? Organisation et responsabilités</h2>
          <ul>${p.governance.map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul>
          <p>Les responsables du Dahira approuvent les orientations et dépenses importantes. La Commission Finance tient les écritures et les justificatifs. La Commission Organisation coordonne les activités et la logistique. Un responsable du matériel suit les sorties, retours et réparations. Un comité de suivi contrôle l’avancement. Les fonctions de demande, approbation, paiement et contrôle doivent être séparées autant que possible.</p>
        </section>
        <section class="development-section" id="dev-section-10">
          <h2>10. Règles financières et contrôles</h2>
          <ol>${p.rules.map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ol>
          <ul><li>Un reçu ou justificatif est conservé pour chaque recette et dépense.</li><li>Les recettes du projet sont encaissées dans la Caisse générale, puis identifiées dans le suivi analytique du projet.</li><li>Le transfert interne ou l’affectation comptable d’une somme ne constitue pas une nouvelle recette.</li><li>Le registre privé de cette page est un outil de préparation et de suivi ; il ne crée aucun mouvement dans la caisse officielle.</li><li>Un rapprochement périodique doit être fait entre le registre du projet, les justificatifs et la comptabilité réelle.</li></ul>
        </section>
        <section class="development-section" id="dev-section-11">
          <h2>11. Comment mesurer les résultats et prévenir les risques</h2>
          <h3>Indicateurs</h3><ul><li>Montant réellement collecté et montant réservé au projet.</li><li>Nombre de participants réguliers et niveau de contribution volontaire.</li><li>Nombre et valeur des équipements acquis et inventoriés.</li><li>Nombre de locations, chiffre d’affaires, charges et bénéfice net.</li><li>Taux de disponibilité et état du matériel.</li><li>Rapports financiers produits à temps et dépenses justifiées.</li><li>Montant de la réserve dédiée au futur local.</li></ul>
          <h3>Principaux risques et mesures</h3><ul><li>Faible participation : adapter le rythme d’achat et diversifier les dons.</li><li>Faible demande locative : tester le marché avant les acquisitions importantes.</li><li>Casse ou perte : fiches de sortie, caution adaptée, inventaire et entretien.</li><li>Confusion des fonds : suivi analytique, justificatifs et rapprochement régulier.</li><li>Conflit d’usage : priorité écrite aux activités du Dahira et calendrier de réservation.</li></ul>
        </section>
        <section class="development-section" id="dev-section-12">
          <h2>12. Registre privé de suivi et outils de gestion</h2>
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
        <section class="development-section development-approval" id="dev-section-13">
          <h2>13. Validation du projet</h2>
          <p>Projet soumis à l’approbation des responsables et des membres du Daara Jazbul Quluub – Cellule Dakar.</p>
          <div class="development-signatures"><div>Président / Responsable<br><span></span></div><div>Responsable financier<br><span></span></div><div>Secrétaire<br><span></span></div><div>Date et signatures<br><span></span></div></div>
        </section>
        <footer class="development-footer">DAARA JAZBUL QULUUB – CELLULE DAKAR · DOSSIER CONFIDENTIEL · PROGRAMME 2027–2031</footer>
      </div>`;
    function printDevelopmentProject(){
      const source=$('privateDevelopmentProject');
      if(!source)return;
      const printWindow=window.open('','_blank');
      if(!printWindow){
        alert('La fenêtre d’impression a été bloquée. Autorise les fenêtres contextuelles pour ce site, puis réessaie.');
        return;
      }
      const project=source.cloneNode(true);
      project.classList.remove('hidden');
      project.querySelectorAll('.development-print-actions').forEach(el=>el.remove());
      const styles=[...document.querySelectorAll('link[rel="stylesheet"]')]
        .map(link=>'<link rel="stylesheet" href="'+link.href+'">').join('');
      printWindow.document.open();
      printWindow.document.write('<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Projet de développement — Daara Jazbul Quluub</title>'+styles+'<style>@page{size:A4 portrait;margin:10mm}html,body{margin:0!important;padding:0!important;background:#fff!important}body> :not(main){display:none!important}main#mainContent{display:block!important;width:100%!important;max-width:none!important;margin:0!important;padding:0!important}#privateDevelopmentProject{display:block!important;position:static!important;width:100%!important;max-width:none!important;margin:0!important;padding:0!important;background:#fff!important;overflow:visible!important}#privateDevelopmentProject>.head,.development-print-actions,.development-section form,.development-section [data-ledger-remove],.development-section [data-inventory-remove],.development-section [data-rental-remove],.development-section #devLedgerRows,.development-section #devInventoryRows,.development-section #devRentalRows{display:none!important}</style></head><body><main id="mainContent"></main></body></html>');
      printWindow.document.close();
      printWindow.document.getElementById('mainContent').appendChild(project);
      printWindow.addEventListener('load',()=>setTimeout(()=>{printWindow.focus();printWindow.print();},700),{once:true});
    }
    $('developmentPrintBtn')?.addEventListener('click',printDevelopmentProject);
    $('developmentPrintBtn2')?.addEventListener('click',printDevelopmentProject);
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