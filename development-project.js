/* Business plan privé — Daara Jazbul Quluub, Cellule Dakar.
   Accès réservé au compte propriétaire ; les écritures privées restent séparées de la Caisse générale. */
(() => {
  'use strict';
  const OWNER_ID='af676419-4711-48e6-8caf-5099b823facf';
  const PROJECT_KEY='daara-jazbul-quluub-2027-2031';
  const $=id=>document.getElementById(id);
  const money=v=>new Intl.NumberFormat('fr-FR').format(Number(v||0))+' FCFA';
  const today=()=>new Date().toISOString().slice(0,10);
  let data={plan:null,ledger:[],inventory:[],rentals:[]},ready=false;
  const PLAN={
    years:'2027–2031', monthly:500, participants:40, specialGift:1000000,
    items:[['Système de sonorisation','Priorité 1'],['Chaises', '100 unités'],['Tables pliantes rectangulaires','10 unités'],['Bâche / tente','1 unité – 8 m'],['Bâche / tente','1 unité – 12 m']],
    stages:[
      ['2027','Lancer la mobilisation, acheter en priorité la sonorisation lorsque le financement est disponible, puis commencer le parc de location.'],
      ['2028','Développer les locations, entretenir le matériel et compléter les équipements selon les recettes réellement obtenues.'],
      ['2029','Renforcer le parc et améliorer l’organisation, le stockage et le suivi des locations.'],
      ['2030','Consolider les revenus, constituer une réserve et étudier les besoins à long terme du Dahira.'],
      ['2031','Faire le bilan des cinq années et préparer le programme suivant sur la base des résultats réels.']
    ]
  };
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const owner=()=>currentUser?.id===OWNER_ID;
  function note(t){return '<p class="development-note">'+t+'</p>';}
  function table(head,rows){return '<div class="member-table-wrap"><table><thead><tr>'+head.map(x=>'<th>'+x+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map(x=>'<td>'+x+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';}
  function render(){
    if(!owner()||!data.plan)return;
    const income=data.ledger.filter(x=>x.type==='income').reduce((s,x)=>s+Number(x.amount||0),0);
    const expenses=data.ledger.filter(x=>x.type==='expense').reduce((s,x)=>s+Number(x.amount||0),0);
    const done=data.rentals.filter(x=>x.status==='completed');
    const rentalGross=done.reduce((s,x)=>s+Number(x.amount||0),0);
    const rentalCosts=done.reduce((s,x)=>s+Number(x.costs||0),0);
    const monthly=PLAN.participants*PLAN.monthly, annual=monthly*12, five=annual*5;
    const c=$('privateDevelopmentProjectContent');
    c.innerHTML=`
      <div class="development-print-actions">
        <p class="development-confidential-note">🔒 Dossier personnel : visible uniquement depuis ton compte administrateur.</p>
        <button class="primary" type="button" id="developmentPrintBtn">🖨️ Imprimer / Enregistrer en PDF</button>
      </div>
      <article class="development-cover">
        <div class="development-cover-mark">DAARA JAZBUL QULUUB</div><div class="development-cover-rule"></div>
        <p class="development-cover-kicker">CELLULE DAKAR</p>
        <h1>BUSINESS PLAN<br>PROJET DE DÉVELOPPEMENT</h1>
        <p class="development-cover-subtitle">Programme quinquennal 2027–2031</p>
        <div class="development-cover-objective"><span>CAP : UN DAHIRA MIEUX ÉQUIPÉ ET PLUS AUTONOME</span><strong>5 ANS</strong></div>
        <div class="development-cover-meta"><span>Activité de départ : location de matériel</span><span>Version de travail confidentielle</span><span>Document à valider par les responsables</span></div>
        <div class="development-cover-rule"></div><p class="development-cover-motto">« Ensemble, préparons les moyens de notre Dahira. »</p>
      </article>
      <div class="development-document">
        <header class="development-document-heading"><span>DAARA JAZBUL QULUUB · CELLULE DAKAR</span><h2>Le projet en bref</h2></header>
        <div class="development-toc"><p><b>Notre objectif :</b> mobiliser des ressources, acheter du matériel utile et développer progressivement sa location.</p><p><b>Notre méthode :</b> avancer par étapes, acheter seulement avec l’argent disponible et rendre compte de chaque opération.</p></div>
        <section class="development-section">
          <h2>1. Pourquoi ce projet ?</h2>
          <p>Le Dahira organise des activités qui demandent du matériel et des moyens financiers. Ce projet doit nous aider à mieux nous équiper, à réduire certaines dépenses de location et à créer une source de revenus complémentaires.</p>
          <p>Le programme dure cinq ans, de 2027 à 2031. Il avance selon les moyens réellement réunis. Les objectifs présentés sont des prévisions et non des sommes déjà encaissées.</p>
        </section>
        <section class="development-section">
          <h2>2. Le matériel prévu</h2>
          <p>Le matériel servira d’abord aux activités du Dahira. Lorsqu’il sera disponible, il pourra aussi être loué à d’autres personnes ou organisations.</p>
          <div class="development-equipment-grid">
            <div class="development-equipment-card"><div class="development-equipment-icon">🔊</div><b>Sonorisation</b><span>Priorité d’achat</span></div>
            <div class="development-equipment-card"><div class="development-equipment-icon">🪑</div><b>100 chaises</b><span>Pour les cérémonies et locations</span></div>
            <div class="development-equipment-card"><div class="development-equipment-icon">▤</div><b>10 tables pliantes</b><span>Tables rectangulaires</span></div>
            <div class="development-equipment-card"><div class="development-equipment-icon">⛺</div><b>1 bâche de 8 m</b><span>Dimensions finales à confirmer</span></div>
            <div class="development-equipment-card"><div class="development-equipment-icon">⛺</div><b>1 bâche de 12 m</b><span>Dimensions finales à confirmer</span></div>
          </div>
          ${table(['Équipement','Quantité prévue','Budget'],PLAN.items.map(x=>[esc(x[0]),esc(x[1]),'À confirmer par devis']))}
          ${note('Les prix ne sont pas inventés : ils seront ajoutés après réception et comparaison de devis écrits.')}
        </section>
        <section class="development-section">
          <h2>3. Comment le projet sera financé ?</h2>
          <h3>A. Participation mensuelle proposée</h3>
          <p>Chaque participant volontaire contribue à hauteur de <b>500 FCFA par mois</b>, pendant les cinq années du projet.</p>
          ${table(['Participants','Par mois','Par an','Sur 5 ans'],[[30,money(15000),money(180000),money(900000)],[40,money(20000),money(240000),money(1200000)],[50,money(25000),money(300000),money(1500000)]])}
          <p>Le scénario de travail est de 40 participants : 20 000 FCFA par mois, soit 240 000 FCFA par an et 1 200 000 FCFA sur cinq ans.</p>
          <h3>B. Collecte spéciale pour la sonorisation</h3>
          <p>En complément, le Dahira cherchera <b>1 000 000 FCFA</b> auprès des parents, familles, amis et personnes de bonne volonté, sur cinq mois, de janvier à mai 2027. Cela représente un objectif moyen de 200 000 FCFA par mois pendant cette campagne.</p>
          <p>Cette collecte est ponctuelle et distincte des contributions mensuelles. Elle ne doit pas être comptée une deuxième fois dans les contributions.</p>
          <h3>C. Objectif de financement de référence</h3>
          ${table(['Source','Objectif'],[['Contributions mensuelles – 40 participants sur 5 ans',money(1200000)],['Collecte spéciale sonorisation – 2027',money(1000000)],['Total de référence',money(2200000)]])}
          ${note('Les 2 200 000 FCFA représentent un objectif théorique de mobilisation. Le montant réel sera celui qui aura été effectivement reçu et enregistré. Les dons supplémentaires et les revenus de location ne sont pas garantis.')}
        </section>
        <section class="development-section">
          <h2>4. Comment le matériel rapportera de l’argent ?</h2>
          <div class="development-process"><div><b>1</b><span>Réunir les fonds</span></div><div><b>2</b><span>Acheter le matériel</span></div><div><b>3</b><span>Utiliser et louer</span></div><div><b>4</b><span>Entretenir et réinvestir</span></div></div>
          <p>Après l’achat, le matériel pourra être loué lorsqu’il ne sera pas utilisé par le Dahira. Chaque location devra être enregistrée : client, matériel, quantité, dates, prix, paiement et état du matériel au retour.</p>
          <p>Le montant payé par le client est une recette brute. Il faut retirer les frais réels de transport, manutention, entretien et réparation pour connaître le bénéfice net.</p>
          ${note('Aucun revenu de location n’est inscrit à l’avance. Une recette ne sera comptée qu’après une location réalisée et un paiement réellement reçu.')}
        </section>
        <section class="development-section">
          <h2>5. Les grandes étapes de 2027 à 2031</h2>
          ${PLAN.stages.map(x=>'<div class="development-year"><h3>'+x[0]+'</h3><p>'+x[1]+'</p></div>').join('')}
        </section>
        <section class="development-section">
          <h2>6. Comment gérer l’argent ?</h2>
          <ul><li>Toutes les sommes réellement reçues passent par la <b>Caisse générale</b>.</li><li>Chaque entrée et chaque dépense doit avoir une date, un motif et un justificatif.</li><li>Le suivi du projet doit distinguer les contributions, les dons, les recettes de location et les dépenses.</li><li>Aucun achat ne doit être lancé avec de l’argent simplement espéré.</li><li>Les responsables doivent vérifier régulièrement la caisse, les justificatifs et le matériel.</li><li>Le matériel appartient au Dahira et doit être inventorié.</li></ul>
        </section>
        <section class="development-section">
          <h2>7. Les conditions avant de commencer</h2>
          <ol><li>Faire valider le projet par les responsables.</li><li>Obtenir des devis pour chaque équipement.</li><li>Identifier les personnes chargées de l’argent, du matériel et des locations.</li><li>Confirmer un lieu sûr pour stocker les équipements.</li><li>Fixer les tarifs de location après étude des prix locaux.</li><li>Mettre en place des fiches de sortie et de retour.</li><li>Faire un bilan régulier et présenter les comptes.</li></ol>
        </section>
        <section class="development-section">
          <h2>8. Résultat attendu à la fin des cinq ans</h2>
          <p>À la fin de 2031, le Dahira devra disposer d’un bilan clair : sommes mobilisées, matériel acheté, état des équipements, locations réalisées, charges payées, bénéfices nets et réserves disponibles. Les prochaines décisions seront prises à partir de ces résultats réels.</p>
        </section>
        <section class="development-section">
          <h2>9. Registre personnel de suivi</h2>
          <p>Cette partie est réservée au suivi privé du dossier. Elle ne remplace pas les écritures officielles de la Caisse générale.</p>
          ${table(['Suivi','Montant'],[['Objectif de contributions – scénario 40 personnes / 5 ans',money(five)],['Collecte spéciale visée',money(PLAN.specialGift)],['Total de référence',money(five+PLAN.specialGift)],['Recettes inscrites au registre privé',money(income)],['Dépenses inscrites au registre privé',money(expenses)],['Solde du registre privé',money(income-expenses)],['Recettes locatives réalisées saisies',money(rentalGross)],['Charges locatives saisies',money(rentalCosts)],['Résultat locatif net du registre',money(rentalGross-rentalCosts)]])}
          <h3>Ajouter une recette ou une dépense</h3>
          <form id="devLedgerForm" class="member-form"><div class="form-row"><label>Type<select id="devEntryType"><option value="income">Recette</option><option value="expense">Dépense</option></select></label><label>Montant (FCFA)<input id="devEntryAmount" type="number" min="1" step="1" required></label></div><div class="form-row"><label>Catégorie<select id="devEntryCategory"><option>Contribution volontaire</option><option>Don</option><option>Collecte sonorisation</option><option>Location de matériel</option><option>Achat de matériel</option><option>Transport</option><option>Entretien / réparation</option><option>Autre</option></select></label><label>Date<input id="devEntryDate" type="date" value="${today()}" required></label></div><label>Description<input id="devEntryDescription" maxlength="240" required></label><button class="primary" type="submit">Enregistrer au registre privé</button><p id="devLedgerMessage" role="status"></p></form><div id="devLedgerRows" class="admin-module-list"></div>
          <h3>Suivi des locations</h3>
          <form id="devRentalForm" class="member-form"><div class="form-row"><label>Date<input id="devRentalDate" type="date" value="${today()}" required></label><label>Client<input id="devRentalClient" maxlength="120" required></label></div><div class="form-row"><label>Matériel loué<input id="devRentalItem" maxlength="120" required></label><label>Quantité<input id="devRentalQty" type="number" min="1" required></label></div><div class="form-row"><label>Montant reçu (FCFA)<input id="devRentalAmount" type="number" min="0" required></label><label>Charges (FCFA)<input id="devRentalCosts" type="number" min="0" value="0" required></label></div><label>Statut<select id="devRentalStatus"><option value="reserved">Réservée</option><option value="completed">Effectuée</option><option value="cancelled">Annulée</option></select></label><button class="primary" type="submit">Ajouter la location</button><p id="devRentalMessage" role="status"></p></form><div id="devRentalRows" class="admin-module-list"></div>
          <h3>Inventaire du matériel</h3>
          <form id="devInventoryForm" class="member-form"><div class="form-row"><label>Matériel<input id="devItemName" maxlength="120" required></label><label>Quantité<input id="devItemQty" type="number" min="1" required></label></div><div class="form-row"><label>Coût d’achat (FCFA)<input id="devItemCost" type="number" min="0" value="0"></label><label>État<select id="devItemStatus"><option>À acquérir</option><option>Disponible</option><option>En location</option><option>À réparer</option></select></label></div><button class="primary" type="submit">Ajouter à l’inventaire</button><p id="devInventoryMessage" role="status"></p></form><div id="devInventoryRows" class="admin-module-list"></div>
        </section>
        <section class="development-section development-approval"><h2>10. Validation</h2><p>Projet soumis à la validation des responsables du Daara Jazbul Quluub – Cellule Dakar.</p><div class="development-signatures"><div>Responsable du Dahira<br><span></span></div><div>Responsable financier<br><span></span></div><div>Secrétaire<br><span></span></div><div>Date et signatures<br><span></span></div></div></section>
        <footer class="development-footer">DAARA JAZBUL QULUUB – CELLULE DAKAR · DOSSIER CONFIDENTIEL · 2027–2031</footer>
      </div>`;
    $('developmentPrintBtn')?.addEventListener('click',()=>window.print());
    renderRows();
  }
  function renderRows(){
    const lr=$('devLedgerRows'),ir=$('devInventoryRows'),rr=$('devRentalRows');
    if(lr)lr.innerHTML=data.ledger.length?[...data.ledger].reverse().map((x,i)=>'<div class="admin-module-row"><div><strong>'+esc(x.description)+'</strong><small>'+esc(x.date)+' · '+esc(x.category)+' · '+(x.type==='income'?'Recette':'Dépense')+'</small></div><strong>'+(x.type==='income'?'+':'−')+money(x.amount)+'</strong><button type="button" class="secondary" data-ledger-remove="'+(data.ledger.length-1-i)+'">Retirer</button></div>').join(''):'<p class="preview-note">Aucun mouvement enregistré.</p>';
    if(ir)ir.innerHTML=data.inventory.length?data.inventory.map((x,i)=>'<div class="admin-module-row"><div><strong>'+esc(x.name)+'</strong><small>Quantité : '+esc(x.qty)+' · Coût : '+money(x.cost)+' · '+esc(x.status)+'</small></div><button type="button" class="secondary" data-inventory-remove="'+i+'">Retirer</button></div>').join(''):'<p class="preview-note">Aucun matériel enregistré.</p>';
    if(rr)rr.innerHTML=data.rentals.length?[...data.rentals].reverse().map((x,i)=>'<div class="admin-module-row"><div><strong>'+esc(x.client)+' — '+esc(x.item)+'</strong><small>'+esc(x.date)+' · Qté : '+esc(x.qty)+' · '+esc(x.status)+'</small></div><strong>Net : '+money(Number(x.amount||0)-Number(x.costs||0))+'</strong><button type="button" class="secondary" data-rental-remove="'+(data.rentals.length-1-i)+'">Retirer</button></div>').join(''):'<p class="preview-note">Aucune location enregistrée.</p>';
  }
  async function save(){
    if(!owner())throw new Error('Accès non autorisé.');
    const r=await sb.from('private_development_projects').upsert({owner_id:OWNER_ID,project_key:PROJECT_KEY,project_data:data,updated_at:new Date().toISOString()},{onConflict:'owner_id,project_key'});
    if(r.error)throw r.error;
  }
  async function load(){
    if(!owner())return;
    const r=await sb.from('private_development_projects').select('project_data').eq('owner_id',OWNER_ID).eq('project_key',PROJECT_KEY).maybeSingle();
    if(r.error)throw r.error;
    const stored=r.data?.project_data||{};
    data={plan:stored.plan||{version:2},ledger:Array.isArray(stored.ledger)?stored.ledger:[],inventory:Array.isArray(stored.inventory)?stored.inventory:[],rentals:Array.isArray(stored.rentals)?stored.rentals:[]};
    ready=true;render();
  }
  window.loadPrivateDevelopmentProject=async()=>{if(!owner())return;try{await load();}catch(e){console.error(e);const c=$('privateDevelopmentProjectContent');if(c)c.innerHTML='<p role="alert">Impossible de charger le dossier privé. Vérifie la connexion puis réessaie.</p>';}};
  document.addEventListener('DOMContentLoaded',()=>{if(owner())void window.loadPrivateDevelopmentProject();else{$('privateDevelopmentProjectNav')?.classList.add('hidden');$('privateDevelopmentProject')?.classList.add('hidden');}});
  document.addEventListener('submit',async e=>{
    const f=e.target;if(!['devLedgerForm','devInventoryForm','devRentalForm'].includes(f.id))return;
    e.preventDefault();if(!owner()||!ready)return;
    if(f.id==='devLedgerForm')data.ledger.push({type:$('devEntryType').value,amount:Number($('devEntryAmount').value),category:$('devEntryCategory').value,date:$('devEntryDate').value,description:$('devEntryDescription').value.trim(),created_at:new Date().toISOString()});
    else if(f.id==='devInventoryForm')data.inventory.push({name:$('devItemName').value.trim(),qty:Number($('devItemQty').value),cost:Number($('devItemCost').value||0),status:$('devItemStatus').value});
    else data.rentals.push({date:$('devRentalDate').value,client:$('devRentalClient').value.trim(),item:$('devRentalItem').value.trim(),qty:Number($('devRentalQty').value),amount:Number($('devRentalAmount').value),costs:Number($('devRentalCosts').value||0),status:$('devRentalStatus').value,created_at:new Date().toISOString()});
    try{await save();render();}catch(err){alert('Enregistrement impossible : '+err.message);await load();}
  });
  document.addEventListener('click',async e=>{
    const b=e.target.closest('[data-ledger-remove],[data-inventory-remove],[data-rental-remove]');if(!b||!owner()||!ready)return;
    const key=b.hasAttribute('data-ledger-remove')?'ledger':b.hasAttribute('data-inventory-remove')?'inventory':'rentals';
    const index=Number(b.getAttribute('data-'+(key==='ledger'?'ledger':key==='inventory'?'inventory':'rental')+'-remove'));
    if(!Number.isInteger(index)||index<0||index>=data[key].length||!confirm('Retirer cette ligne du registre privé ?'))return;
    const old=data[key].splice(index,1)[0];try{await save();render();}catch(err){data[key].splice(index,0,old);render();alert('Modification impossible : '+err.message);}
  });
})();