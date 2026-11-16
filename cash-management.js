/* Gestion de caisse — module séparé, additionnel aux historiques existants. */
let cashFundsCache = [];
let cashMovementsCache = [];

function cashMoney(value){ return formatMoney(Number(value||0)); }
function cashStatusLabel(status){
  return ({pending:'En attente de validation',approved:'Validée — à payer',paid:'Payée',rejected:'Refusée',posted:'Transfert effectué',cancelled:'Annulée'})[status]||status;
}
function cashBalanceForFund(fundId){
  return cashMovementsCache.filter(m=>m.fund_id===fundId).reduce((sum,m)=>{
    const incoming=['income','opening_balance','transfer_in','adjustment_in'].includes(m.movement_type);
    return sum+(incoming?1:-1)*Number(m.amount||0);
  },0);
}
function cashFundOptions(selected=''){
  return cashFundsCache.filter(f=>f.is_active).map(f=>'<option value="'+esc(f.id)+'" '+(f.id===selected?'selected':'')+'>'+esc(f.name)+'</option>').join('');
}
function cashMovementLabel(type){
  return ({opening_balance:'Solde initial',income:'Entrée',expense:'Dépense',transfer_in:'Transfert reçu',transfer_out:'Transfert envoyé',adjustment_in:'Correction positive',adjustment_out:'Correction négative'})[type]||type;
}

function cashCategoryKey(value){
  const v=String(value||'').toLowerCase().replaceAll('é','e').replaceAll('è','e').replaceAll('ê','e').replaceAll('û','u').trim();
  if(v.includes('mensual')||v.includes('cotisation'))return 'Mensualités';
  if(v.includes('tombe'))return 'Tombes';
  if(v.includes('chasse'))return 'Chasse';
  return 'Autres recettes et divers';
}
async function loadCashManagement(){
  if(!sb||!canManageFinance())return;
  const fundsBox=$('cashFundsRows');
  if(fundsBox)fundsBox.innerHTML='<tr><td colspan="4">Chargement…</td></tr>';
  const [fr,mr,er]=await Promise.all([
    sb.from('cash_funds').select('id,name,fund_type,parent_fund_id,description,is_active,created_at').order('fund_type').order('name'),
    sb.from('cash_movements').select('id,fund_id,movement_type,amount,movement_date,category,description,created_at,cash_funds(name)').order('movement_date',{ascending:false}).order('created_at',{ascending:false}).limit(1000),
    sb.from('cash_expense_requests').select('id,fund_id,amount,category,description,beneficiary,status,requested_by,requested_at,approved_by,approved_at,paid_at').order('requested_at',{ascending:false}).limit(150)
  ]);
  const error=[fr,mr,er].find(x=>x.error);
  if(error){if(fundsBox)fundsBox.innerHTML='<tr><td colspan="4">Erreur : '+esc(error.error.message)+'</td></tr>';return;}
  cashFundsCache=fr.data||[];
  cashMovementsCache=mr.data||[];
  const general=cashFundsCache.find(f=>f.fund_type==='general');
  const generalBalance=general?cashBalanceForFund(general.id):0;
  const expenses=cashMovementsCache.filter(m=>['expense','adjustment_out'].includes(m.movement_type)).reduce((s,m)=>s+Number(m.amount||0),0);
  const incomes=cashMovementsCache.filter(m=>['income','adjustment_in'].includes(m.movement_type)).reduce((s,m)=>s+Number(m.amount||0),0);
  if($('cashTotalBalance'))$('cashTotalBalance').textContent=cashMoney(generalBalance);
  if($('cashGeneralBalance'))$('cashGeneralBalance').textContent=cashMoney(generalBalance);
  if($('cashTotalIncome'))$('cashTotalIncome').textContent=cashMoney(incomes);
  if($('cashTotalOutflow'))$('cashTotalOutflow').textContent=cashMoney(expenses);
  if(fundsBox)fundsBox.innerHTML=general?'<tr><td><strong>'+esc(general.name)+'</strong><br><small>Caisse centrale — toutes les recettes y sont rattachées</small></td><td>'+cashMoney(generalBalance)+'</td><td>Regroupe les quatre sous-caisses de suivi ci-dessous.</td><td>'+(general.is_active?'Active':'Désactivée')+'</td></tr>':'<tr><td colspan="4">Caisse générale introuvable.</td></tr>';
  const names=['Mensualités','Tombes','Chasse','Autres recettes et divers'];
  const totals=Object.fromEntries(names.map(n=>[n,0]));
  cashMovementsCache.filter(m=>m.fund_id===general?.id).forEach(m=>{
    const key=cashCategoryKey(m.category);
    if(m.movement_type==='income'||m.movement_type==='adjustment_in')totals[key]+=Number(m.amount||0);
    if(m.movement_type==='adjustment_out')totals[key]-=Number(m.amount||0);
  });
  if($('cashSubcashRows'))$('cashSubcashRows').innerHTML=names.map(name=>'<tr><td><strong>'+esc(name)+'</strong></td><td>'+cashMoney(totals[name])+'</td><td>Sous-caisse de suivi — fonds conservés dans la caisse générale</td></tr>').join('');
  const fundMap=new Map(cashFundsCache.map(f=>[f.id,f.name]));
  const monthFilter=$('cashMovementMonthFilter')?.value||'';
  const visible=cashMovementsCache.filter(m=>!monthFilter||String(m.movement_date||'').startsWith(monthFilter));
  if($('cashMovementRows'))$('cashMovementRows').innerHTML=visible.length?visible.map(m=>'<tr><td>'+new Date(m.movement_date+'T00:00:00').toLocaleDateString('fr-FR')+'</td><td>'+esc(fundMap.get(m.fund_id)||m.cash_funds?.name||'—')+'</td><td>'+esc(cashMovementLabel(m.movement_type))+'</td><td>'+cashMoney(m.amount)+'</td><td>'+esc(['income','adjustment_in','adjustment_out'].includes(m.movement_type)?cashCategoryKey(m.category):(m.category||'—'))+'</td><td>'+esc(m.description||'—')+'</td></tr>').join(''):'<tr><td colspan="6">Aucun mouvement pour cette période.</td></tr>';
  if($('cashExpenseRows'))$('cashExpenseRows').innerHTML=(er.data||[]).length?er.data.map(x=>'<tr><td>'+new Date(x.requested_at).toLocaleDateString('fr-FR')+'</td><td>'+esc(general?.name||'Caisse générale')+'</td><td>'+esc(x.description)+'</td><td>'+cashMoney(x.amount)+'</td><td>'+esc(x.beneficiary||'—')+'</td><td>'+esc(cashStatusLabel(x.status))+'</td><td>'+cashExpenseActions(x)+'</td></tr>').join(''):'<tr><td colspan="7">Aucune dépense enregistrée.</td></tr>';
  const hasOpening=general&&cashMovementsCache.some(m=>m.fund_id===general.id&&m.movement_type==='opening_balance');
  if($('cashOpeningPanel'))$('cashOpeningPanel').classList.toggle('hidden',!general||hasOpening);
  if($('cashOpeningFund'))$('cashOpeningFund').innerHTML=general?'<option value="'+esc(general.id)+'">'+esc(general.name)+'</option>':'';
  if($('cashExpenseFund'))$('cashExpenseFund').innerHTML=general?'<option value="'+esc(general.id)+'">'+esc(general.name)+'</option>':'';
  if($('cashOpeningRecorded'))$('cashOpeningRecorded').textContent=hasOpening?'Solde initial déjà enregistré.':'';
}
async function submitCashIncome(event){
  event.preventDefault();if(!canManageFinance())return;
  const amount=Number($('cashIncomeAmount').value),category=$('cashIncomeCategory').value;
  const date=$('cashIncomeDate').value,description=$('cashIncomeDescription').value.trim();
  if(!Number.isFinite(amount)||amount<=0||!date||!category||!description)return;
  const r=await sb.rpc('record_general_cash_income',{p_amount:amount,p_category:category,p_date:date,p_description:description});
  if(r.error){alert('Enregistrement de la recette impossible : '+r.error.message);return;}
  event.target.reset();if($('cashIncomeDate'))$('cashIncomeDate').value=new Date().toISOString().slice(0,10);
  await loadCashManagement();alert('Recette enregistrée dans la caisse générale et rattachée à la sous-caisse choisie.');
}
function cashExpenseActions(x){
  let html='';
  if(isAdmin&&x.status==='pending')html+='<button class="table-btn" data-cash-action="approve-expense" data-id="'+esc(x.id)+'">Valider</button> <button class="table-btn danger-btn" data-cash-action="reject-expense" data-id="'+esc(x.id)+'">Refuser</button>';
  if((isAdmin||isFinance)&&x.status==='approved')html+='<button class="table-btn" data-cash-action="pay-expense" data-id="'+esc(x.id)+'">Confirmer le paiement</button>';
  return html||'—';
}
function cashTransferActions(x){
  if(isAdmin&&x.status==='pending')return '<button class="table-btn" data-cash-action="approve-transfer" data-id="'+esc(x.id)+'">Valider</button> <button class="table-btn danger-btn" data-cash-action="reject-transfer" data-id="'+esc(x.id)+'">Refuser</button>';
  return '—';
}
async function submitCashFund(event){
  event.preventDefault();if(!canManageFinance())return;
  const name=$('cashFundName').value.trim(),parent=$('cashFundParent').value,description=$('cashFundDescription').value.trim();
  if(!name||!parent)return;
  const r=await sb.from('cash_funds').insert({name,fund_type:'activity',parent_fund_id:parent,description,created_by:currentUser.id});
  if(r.error){alert('Création impossible : '+r.error.message);return;}
  event.target.reset();await loadCashManagement();alert('Sous-caisse créée.');
}
async function submitCashOpening(event){
  event.preventDefault();if(!isAdmin)return;
  const r=await sb.rpc('record_cash_opening_balance',{p_fund_id:$('cashOpeningFund').value,p_amount:Number($('cashOpeningAmount').value),p_date:$('cashOpeningDate').value,p_note:$('cashOpeningNote').value});
  if(r.error){alert('Enregistrement du solde initial impossible : '+r.error.message);return;}
  event.target.reset();await loadCashManagement();alert('Solde initial enregistré.');
}
async function submitCashExpense(event){
  event.preventDefault();if(!canManageFinance())return;
  const payload={fund_id:$('cashExpenseFund').value,amount:Number($('cashExpenseAmount').value),category:$('cashExpenseCategory').value,description:$('cashExpenseDescription').value.trim(),beneficiary:$('cashExpenseBeneficiary').value.trim(),requested_by:currentUser.id};
  if(!payload.fund_id||payload.amount<=0||!payload.description)return;
  const r=await sb.from('cash_expense_requests').insert(payload);
  if(r.error){alert('Demande de dépense impossible : '+r.error.message);return;}
  event.target.reset();await loadCashManagement();alert('Demande enregistrée. Elle attend la validation de l’administrateur principal.');
}
async function submitCashTransfer(event){
  event.preventDefault();if(!canManageFinance())return;
  const r=await sb.rpc('request_cash_transfer',{p_from_fund_id:$('cashTransferFrom').value,p_to_fund_id:$('cashTransferTo').value,p_amount:Number($('cashTransferAmount').value),p_reason:$('cashTransferReason').value.trim()});
  if(r.error){alert('Demande de transfert impossible : '+r.error.message);return;}
  event.target.reset();await loadCashManagement();alert('Transfert demandé. Il sera comptabilisé après validation de l’administrateur.');
}
async function handleCashActions(event){
  const b=event.target.closest('[data-cash-action]');if(!b)return;
  const id=b.dataset.id,action=b.dataset.cashAction;
  let r;
  if(action==='approve-expense'||action==='reject-expense'){
    const approve=action==='approve-expense',reason=approve?null:(prompt('Motif du refus (facultatif)')||null);
    if(!approve&&!confirm('Refuser cette demande de dépense ?'))return;
    r=await sb.rpc('approve_cash_expense',{p_expense_id:id,p_approve:approve,p_reason:reason});
  }else if(action==='pay-expense'){
    if(!confirm('Confirmer que cette dépense a réellement été payée ? Le solde diminuera immédiatement.'))return;
    r=await sb.rpc('pay_cash_expense',{p_expense_id:id,p_date:new Date().toISOString().slice(0,10)});
  }else if(action==='approve-transfer'||action==='reject-transfer'){
    const approve=action==='approve-transfer';
    if(!confirm(approve?'Valider ce transfert entre les deux caisses ?':'Refuser ce transfert ?'))return;
    r=await sb.rpc('approve_cash_transfer',{p_transfer_id:id,p_approve:approve,p_reason:null});
  }
  if(r?.error){alert('Opération impossible : '+r.error.message);return;}
  await loadCashManagement();alert('Opération enregistrée.');
}
document.addEventListener('DOMContentLoaded',()=>{
  $('cashIncomeForm')?.addEventListener('submit',submitCashIncome);
  $('cashOpeningForm')?.addEventListener('submit',submitCashOpening);
  $('cashExpenseForm')?.addEventListener('submit',submitCashExpense);

  $('cashExpenseRows')?.addEventListener('click',handleCashActions);

  $('cashMovementMonthFilter')?.addEventListener('change',()=>void loadCashManagement());
  $('cashMovementMonthReset')?.addEventListener('click',()=>{if($('cashMovementMonthFilter'))$('cashMovementMonthFilter').value='';void loadCashManagement();});
  if($('cashOpeningDate'))$('cashOpeningDate').value=new Date().toISOString().slice(0,10);
  if($('cashIncomeDate'))$('cashIncomeDate').value=new Date().toISOString().slice(0,10);
});
