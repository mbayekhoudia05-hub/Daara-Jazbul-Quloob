(() => {
  'use strict';
  const OWNER_ID = 'af676419-4711-48e6-8caf-5099b823facf';
  const PROJECT_KEY = 'daara-jazbul-quluub-2027-2031';
  const $ = id => document.getElementById(id);
  const money = value => new Intl.NumberFormat('fr-FR').format(Number(value || 0)) + ' FCFA';
  const today = () => new Date().toISOString().slice(0,10);
  let data = { ledger: [], inventory: [] };
  let ready = false;
  function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
  function notify(id, text, ok=false) { const el=$(id); if(el){el.textContent=text;el.style.color=ok?'#167344':'#b42318';} }
  function ownerIsSignedIn() { return window.currentUser?.id === OWNER_ID; }
  function lockUI() {
    const nav=$('privateDevelopmentProjectNav'), section=$('privateDevelopmentProject');
    if(!ownerIsSignedIn()){nav?.classList.add('hidden');section?.classList.add('hidden');}
  }
  function render() {
    const income=data.ledger.filter(x=>x.type==='income').reduce((s,x)=>s+Number(x.amount||0),0);
    const expenses=data.ledger.filter(x=>x.type==='expense').reduce((s,x)=>s+Number(x.amount||0),0);
    $('devActualIncome').textContent=money(income);
    $('devActualExpenses').textContent=money(expenses);
    $('devActualBalance').textContent=money(income-expenses);
    $('devLedgerRows').innerHTML=data.ledger.length ? [...data.ledger].reverse().map((x,i)=>'<div class="admin-module-row"><div><strong>'+escapeHtml(x.description)+'</strong><small>'+escapeHtml(x.date)+' · '+escapeHtml(x.category)+' · '+(x.type==='income'?'Recette':'Dépense')+'</small></div><strong>'+ (x.type==='income'?'+':'−')+money(x.amount)+'</strong><button type="button" class="secondary" data-ledger-remove="'+(data.ledger.length-1-i)+'">Retirer</button></div>').join('') : '<p class="preview-note">Aucun mouvement enregistré.</p>';
    $('devInventoryRows').innerHTML=data.inventory.length ? data.inventory.map((x,i)=>'<div class="admin-module-row"><div><strong>'+escapeHtml(x.name)+'</strong><small>Quantité : '+escapeHtml(x.qty)+' · Coût : '+money(x.cost)+' · '+escapeHtml(x.status)+'</small></div><button type="button" class="secondary" data-inventory-remove="'+i+'">Retirer</button></div>').join('') : '<p class="preview-note">Aucun matériel enregistré.</p>';
  }
  async function save() {
    if(!ownerIsSignedIn()) throw new Error('Accès personnel non autorisé.');
    const result=await window.sb.from('private_development_projects').upsert({
      owner_id:OWNER_ID, project_key:PROJECT_KEY, project_data:data, updated_at:new Date().toISOString()
    },{onConflict:'owner_id,project_key'});
    if(result.error) throw result.error;
  }
  async function load() {
    if(!ownerIsSignedIn()){lockUI();return;}
    const result=await window.sb.from('private_development_projects').select('project_data').eq('owner_id',OWNER_ID).eq('project_key',PROJECT_KEY).maybeSingle();
    if(result.error) throw result.error;
    if(result.data?.project_data) data={ledger:Array.isArray(result.data.project_data.ledger)?result.data.project_data.ledger:[],inventory:Array.isArray(result.data.project_data.inventory)?result.data.project_data.inventory:[]};
    else await save();
    ready=true; render();
  }
  window.loadPrivateDevelopmentProject=async()=>{if(!ownerIsSignedIn())return;try{await load();}catch(error){console.error(error);notify('devLedgerMessage','Impossible de charger le dossier privé : '+(error.message||'erreur'),false);}};
  document.addEventListener('DOMContentLoaded',()=>{
    lockUI();
    const ledger=$('devLedgerForm');
    ledger?.addEventListener('submit',async event=>{
      event.preventDefault();if(!ownerIsSignedIn()||!ready)return;
      const amount=Number($('devEntryAmount').value);
      if(!Number.isFinite(amount)||amount<=0)return;
      data.ledger.push({type:$('devEntryType').value,amount,category:$('devEntryCategory').value,date:$('devEntryDate').value,description:$('devEntryDescription').value.trim(),created_at:new Date().toISOString()});
      try{await save();ledger.reset();$('devEntryDate').value=today();notify('devLedgerMessage','Mouvement enregistré dans le registre privé.',true);render();}
      catch(error){data.ledger.pop();notify('devLedgerMessage','Enregistrement impossible : '+error.message);}
    });
    const inventory=$('devInventoryForm');
    inventory?.addEventListener('submit',async event=>{
      event.preventDefault();if(!ownerIsSignedIn()||!ready)return;
      data.inventory.push({name:$('devItemName').value.trim(),qty:Number($('devItemQty').value),cost:Number($('devItemCost').value||0),status:$('devItemStatus').value});
      try{await save();inventory.reset();notify('devInventoryMessage','Matériel ajouté au suivi privé.',true);render();}
      catch(error){data.inventory.pop();notify('devInventoryMessage','Enregistrement impossible : '+error.message);}
    });
    document.addEventListener('click',async event=>{
      const ledgerRemove=event.target.closest('[data-ledger-remove]');
      const itemRemove=event.target.closest('[data-inventory-remove]');
      if(!ownerIsSignedIn()||!ready)return;
      if(ledgerRemove){const i=Number(ledgerRemove.dataset.ledgerRemove);if(!Number.isInteger(i)||i<0||i>=data.ledger.length)return;const removed=data.ledger.splice(i,1)[0];try{await save();render();}catch(error){data.ledger.splice(i,0,removed);render();alert('Suppression impossible : '+error.message);}}
      if(itemRemove){const i=Number(itemRemove.dataset.inventoryRemove);if(!Number.isInteger(i)||i<0||i>=data.inventory.length)return;const removed=data.inventory.splice(i,1)[0];try{await save();render();}catch(error){data.inventory.splice(i,0,removed);render();alert('Suppression impossible : '+error.message);}}
    });
    if($('devEntryDate'))$('devEntryDate').value=today();
    if(ownerIsSignedIn())void load();
  });
  window.addEventListener('storage',lockUI);
})();
