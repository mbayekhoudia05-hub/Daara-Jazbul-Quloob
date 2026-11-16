(() => {
  'use strict';
  const OWNER_ID = 'af676419-4711-48e6-8caf-5099b823facf';
  const PROJECT_KEY = 'daara-jazbul-quluub-2027-2031';
  const $ = id => document.getElementById(id);
  const money = value => new Intl.NumberFormat('fr-FR').format(Number(value || 0)) + ' FCFA';
  const today = () => new Date().toISOString().slice(0,10);
  let data = { plan:null, ledger:[], inventory:[] };
  let ready = false;
  function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
  function ownerIsSignedIn() { return currentUser?.id === OWNER_ID; }
  function lockUI() {
    if(ownerIsSignedIn())return;
    $('privateDevelopmentProjectNav')?.classList.add('hidden');
    $('privateDevelopmentProject')?.classList.add('hidden');
  }
  function render() {
    if(!data.plan)return;
    const p=data.plan;
    const income=data.ledger.filter(x=>x.type==='income').reduce((s,x)=>s+Number(x.amount||0),0);
    const expenses=data.ledger.filter(x=>x.type==='expense').reduce((s,x)=>s+Number(x.amount||0),0);
    const content=$('privateDevelopmentProjectContent');
    content.innerHTML=`
      <div class="stats contribution-stats">
        <div class="stat"><strong>${money(p.goal)}</strong><span>Objectif quinquennal</span></div>
        <div class="stat"><strong>${money(income)}</strong><span>Recettes réelles enregistrées</span></div>
        <div class="stat"><strong>${money(expenses)}</strong><span>Dépenses réelles enregistrées</span></div>
        <div class="stat"><strong>${money(income-expenses)}</strong><span>Solde du registre privé</span></div>
      </div>
      <div class="card"><h3>Vision et objectifs</h3><p>${escapeHtml(p.vision)}</p><p><strong>Hypothèse :</strong> ${p.participants.min} à ${p.participants.max} participants, contribution volontaire proposée de ${money(p.participants.monthlyContribution)} par mois. Base centrale : ${p.participants.base} participants, soit ${money(p.participants.annualBase)} par an et ${money(p.participants.fiveYearBase)} sur cinq ans.</p><p><strong>Première activité :</strong> ${escapeHtml(p.firstActivity)}</p></div>
      <div class="card"><h3>Objectifs annuels</h3><div class="member-table-wrap"><table><thead><tr><th>Année</th><th>Objectif annuel</th><th>Cumul</th></tr></thead><tbody>${p.annualTargets.map(x=>`<tr><td>${x.year}</td><td>${money(x.target)}</td><td>${money(x.cumulative)}</td></tr>`).join('')}</tbody></table></div><p class="preview-note">Cibles de mobilisation non garanties. Elles comprennent les contributions, dons, collectes et bénéfices nets.</p></div>
      <div class="card"><h3>Budget d’affectation · ${money(p.goal)}</h3><div class="member-table-wrap"><table><thead><tr><th>Affectation</th><th>Budget</th></tr></thead><tbody>${p.allocations.map(x=>`<tr><td>${escapeHtml(x.name)}</td><td>${money(x.amount)}</td></tr>`).join('')}</tbody></table></div></div>
      <div class="card"><h3>Sources de financement visées</h3><div class="member-table-wrap"><table><thead><tr><th>Source</th><th>Objectif</th></tr></thead><tbody>${p.funding.map(x=>`<tr><td>${escapeHtml(x.name)}</td><td>${money(x.amount)}</td></tr>`).join('')}</tbody></table></div></div>
      <div class="card"><h3>Feuille de route ${escapeHtml(p.period)}</h3><ol>${p.annualTargets.map(x=>`<li><strong>${x.year} :</strong> ${escapeHtml(x.stage)}</li>`).join('')}</ol></div>
      <div class="card"><h3>Gouvernance et responsabilités</h3><ul>${p.governance.map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul></div>
      <div class="card"><h3>Règlement de gestion</h3><ol>${p.rules.map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ol></div>
      <div class="card"><h3>Registre confidentiel des recettes et dépenses</h3><p>Ce registre ne déclenche aucun mouvement automatique dans la Caisse générale. Les montants saisis ici servent au suivi privé du projet.</p>
        <form id="devLedgerForm" class="member-form"><div class="form-row"><label>Type<select id="devEntryType"><option value="income">Recette / contribution / don / location</option><option value="expense">Dépense / achat / entretien</option></select></label><label>Montant (FCFA)<input id="devEntryAmount" type="number" min="1" step="1" required></label></div>
        <div class="form-row"><label>Catégorie<select id="devEntryCategory"><option>Contribution volontaire</option><option>Don</option><option>Collecte</option><option>Location de matériel</option><option>Achat de matériel</option><option>Transport</option><option>Entretien / réparation</option><option>Activité du Dahira</option><option>Réserve futur local</option><option>Autre</option></select></label><label>Date<input id="devEntryDate" type="date" required value="${today()}"></label></div>
        <label>Description<input id="devEntryDescription" maxlength="240" required placeholder="Ex. Location de 50 chaises"></label><button class="primary" type="submit">Enregistrer dans le registre privé</button><p id="devLedgerMessage" role="status"></p></form>
        <div id="devLedgerRows" class="admin-module-list"></div>
      </div>
      <div class="card"><h3>Inventaire et parc de location</h3>
        <form id="devInventoryForm" class="member-form"><div class="form-row"><label>Matériel<input id="devItemName" maxlength="120" required placeholder="Ex. Chaises plastiques"></label><label>Quantité<input id="devItemQty" type="number" min="1" step="1" required></label></div>
        <div class="form-row"><label>Coût d’acquisition total (FCFA)<input id="devItemCost" type="number" min="0" step="1" value="0"></label><label>État<select id="devItemStatus"><option>À acquérir</option><option>Disponible</option><option>En location</option><option>À réparer</option></select></label></div><button class="primary" type="submit">Ajouter au suivi du matériel</button><p id="devInventoryMessage" role="status"></p></form>
        <div id="devInventoryRows" class="admin-module-list"></div>
      </div>
      <div class="card"><h3>Règles pratiques de location</h3><ol><li>Vérifier la disponibilité avant confirmation.</li><li>Définir le tarif, le transport et une caution éventuelle avant la location.</li><li>Établir une fiche de sortie et contrôler le matériel au retour.</li><li>Consigner les dommages, pertes, réparations et frais.</li><li>Réserver la priorité du matériel aux activités du Dahira.</li><li>Calculer le bénéfice après déduction des charges réelles.</li></ol></div>
      <p class="preview-note">Dossier confidentiel chargé depuis la base protégée. Les autres comptes, y compris les autres administrateurs, n’ont aucun droit d’accès à ces données.</p>`;
    renderRows();
  }
  function renderRows() {
    const lr=$('devLedgerRows'), ir=$('devInventoryRows');
    if(lr)lr.innerHTML=data.ledger.length?[...data.ledger].reverse().map((x,i)=>`<div class="admin-module-row"><div><strong>${escapeHtml(x.description)}</strong><small>${escapeHtml(x.date)} · ${escapeHtml(x.category)} · ${x.type==='income'?'Recette':'Dépense'}</small></div><strong>${x.type==='income'?'+':'−'}${money(x.amount)}</strong><button type="button" class="secondary" data-ledger-remove="${data.ledger.length-1-i}">Retirer</button></div>`).join(''):'<p class="preview-note">Aucun mouvement enregistré.</p>';
    if(ir)ir.innerHTML=data.inventory.length?data.inventory.map((x,i)=>`<div class="admin-module-row"><div><strong>${escapeHtml(x.name)}</strong><small>Quantité : ${escapeHtml(x.qty)} · Coût : ${money(x.cost)} · ${escapeHtml(x.status)}</small></div><button type="button" class="secondary" data-inventory-remove="${i}">Retirer</button></div>`).join(''):'<p class="preview-note">Aucun matériel enregistré.</p>';
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
    data={plan:result.data.project_data.plan,ledger:Array.isArray(result.data.project_data.ledger)?result.data.project_data.ledger:[],inventory:Array.isArray(result.data.project_data.inventory)?result.data.project_data.inventory:[]};
    ready=true;render();
  }
  window.loadPrivateDevelopmentProject=async()=>{if(!ownerIsSignedIn())return;try{await load();}catch(error){console.error(error);const c=$('privateDevelopmentProjectContent');if(c)c.innerHTML='<p role="alert">Impossible de charger le dossier privé. Réessaie après reconnexion.</p>'; }};
  document.addEventListener('DOMContentLoaded',()=>{lockUI();if(ownerIsSignedIn())void window.loadPrivateDevelopmentProject();});
  document.addEventListener('submit',async event=>{
    if(event.target.id==='devLedgerForm'){
      event.preventDefault();if(!ownerIsSignedIn()||!ready)return;
      const amount=Number($('devEntryAmount').value);if(!Number.isFinite(amount)||amount<=0)return;
      const entry={type:$('devEntryType').value,amount,category:$('devEntryCategory').value,date:$('devEntryDate').value,description:$('devEntryDescription').value.trim(),created_at:new Date().toISOString()};
      data.ledger.push(entry);
      try{await save();render();}catch(error){data.ledger.pop();render();alert('Enregistrement impossible : '+error.message);}
    }
    if(event.target.id==='devInventoryForm'){
      event.preventDefault();if(!ownerIsSignedIn()||!ready)return;
      const item={name:$('devItemName').value.trim(),qty:Number($('devItemQty').value),cost:Number($('devItemCost').value||0),status:$('devItemStatus').value};
      data.inventory.push(item);
      try{await save();render();}catch(error){data.inventory.pop();render();alert('Enregistrement impossible : '+error.message);}
    }
  });
  document.addEventListener('click',async event=>{
    const lr=event.target.closest('[data-ledger-remove]'),ir=event.target.closest('[data-inventory-remove]');
    if(!ownerIsSignedIn()||!ready)return;
    if(lr){const i=Number(lr.dataset.ledgerRemove);if(i<0||i>=data.ledger.length)return;const old=data.ledger.splice(i,1)[0];try{await save();render();}catch(error){data.ledger.splice(i,0,old);render();alert('Suppression impossible : '+error.message);}}
    if(ir){const i=Number(ir.dataset.inventoryRemove);if(i<0||i>=data.inventory.length)return;const old=data.inventory.splice(i,1)[0];try{await save();render();}catch(error){data.inventory.splice(i,0,old);render();alert('Suppression impossible : '+error.message);}}
  });
})();
