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
async function loadCashManagement(){
  if(!sb||!canManageFinance())return;
  const fundsBox=$('cashFundsRows'), movementBox=$('cashMovementRows');
  if(fundsBox)fundsBox.innerHTML='<tr><td colspan="4">Chargement…</td></tr>';
  const [fr,mr,er,tr]=await Promise.all([
    sb.from('cash_funds').select('id,name,fund_type,parent_fund_id,description,is_active,created_at').order('fund_type').order('name'),
    sb.from('cash_movements').select('id,fund_id,movement_type,amount,movement_date,category,description,created_at,cash_funds(name)').order('movement_date',{ascending:false}).order('created_at',{ascending:false}).limit(300),
    sb.from('cash_expense_requests').select('id,fund_id,amount,category,description,beneficiary,status,requested_by,requested_at,approved_by,approved_at,paid_at').order('requested_at',{ascending:false}).limit(150),
    sb.from('cash_transfers').select('id,from_fund_id,to_fund_id,amount,reason,status,requested_by,requested_at,approved_by,approved_at').order('requested_at',{ascending:false}).limit(100)
  ]);
  const error=[fr,mr,er,tr].find(x=>x.error);
  if(error){if(fundsBox)fundsBox.innerHTML='<tr><td colspan="4">Erreur : '+esc(error.error.message)+'</td></tr>';return;}
  cashFundsCache=fr.data||[];
  cashMovementsCache=mr.data||[];
  const general=cashFundsCache.find(f=>f.fund_type==='general');
  const total=cashFundsCache.reduce((s,f)=>s+cashBalanceForFund(f.id),0);
  const generalBalance=general?cashBalanceForFund(general.id):0;
  const expenses=cashMovementsCache.filter(m=>['expense','adjustment_out'].includes(m.movement_type)).reduce((s,m)=>s+Number(m.amount||0),0);
  const incomes=cashMovementsCache.filter(m=>['income','opening_balance','adjustment_in'].includes(m.movement_type)).reduce((s,m)=>s+Number(m.amount||0),0);
  if($('cashTotalBalance'))$('cashTotalBalance').textContent=cashMoney(total);
  if($('cashGeneralBalance'))$('cashGeneralBalance').textContent=cashMoney(generalBalance);
  if($('cashTotalIncome'))$('cashTotalIncome').textContent=cashMoney(incomes);
  if($('cashTotalOutflow'))$('cashTotalOutflow').textContent=cashMoney(expenses);
  if($('cashFundsRows'))$('cashFundsRows').innerHTML=cashFundsCache.length?cashFundsCache.map(f=>'<tr><td><strong>'+esc(f.name)+'</strong><br><small>'+(f.fund_type==='general'?'Caisse générale':'Sous-caisse activité')+'</small></td><td>'+cashMoney(cashBalanceForFund(f.id))+'</td><td>'+esc(f.description||'—')+'</td><td>'+(f.is_active?'Active':'Désactivée')+'</td></tr>').join(''):'<tr><td colspan="4">Aucune caisse.</td></tr>';
  const fundMap=new Map(cashFundsCache.map(f=>[f.id,f.name]));
  if($('cashMovementRows'))$('cashMovementRows').innerHTML=cashMovementsCache.length?cashMovementsCache.map(m=>'<tr><td>'+new Date(m.movement_date+'T00:00:00').toLocaleDateString('fr-FR')+'</td><td>'+esc(fundMap.get(m.fund_id)||m.cash_funds?.name||'—')+'</td><td>'+esc(cashMovementLabel(m.movement_type))+'</td><td>'+cashMoney(m.amount)+'</td><td>'+esc(m.category||'—')+'</td><td>'+esc(m.description||'—')+'</td></tr>').join(''):'<tr><td colspan="6">Aucun mouvement. Les nouvelles cotisations confirmées seront ajoutées automatiquement.</td></tr>';
  if($('cashExpenseRows'))$('cashExpenseRows').innerHTML=(er.data||[]).length?(er.data||[]).map(x=>'<tr><td>'+new Date(x.requested_at).toLocaleDateString('fr-FR')+'</td><td>'+esc(fundMap.get(x.fund_id)||'—')+'</td><td>'+esc(x.description)+'</td><td>'+cashMoney(x.amount)+'</td><td>'+esc(x.beneficiary||'—')+'</td><td>'+esc(cashStatusLabel(x.status))+'</td><td>'+cashExpenseActions(x)+'</td></tr>').join(''):'<tr><td colspan="7">Aucune dépense enregistrée.</td></tr>';
  if($('cashTransferRows'))$('cashTransferRows').innerHTML=(tr.data||[]).length?(tr.data||[]).map(x=>'<tr><td>'+new Date(x.requested_at).toLocaleDateString('fr-FR')+'</td><td>'+esc(fundMap.get(x.from_fund_id)||'—')+'</td><td>'+esc(fundMap.get(x.to_fund_id)||'—')+'</td><td>'+cashMoney(x.amount)+'</td><td>'+esc(x.reason)+'</td><td>'+esc(cashStatusLabel(x.status))+'</td><td>'+cashTransferActions(x)+'</td></tr>').join(''):'<tr><td colspan="7">Aucun transfert.</td></tr>';
  const fundSelects=['cashExpenseFund','cashTransferFrom','cashTransferTo'];
  fundSelects.forEach(id=>{const el=$(id);if(el){const previous=el.value;el.innerHTML=cashFundOptions(previous);}});
  if($('cashOpeningFund'))$('cashOpeningFund').innerHTML=general?'<option value="'+esc(general.id)+'">'+esc(general.name)+'</option>':'';
  const hasOpening=general&&cashMovementsCache.some(m=>m.fund_id===general.id&&m.movement_type==='opening_balance');
  if($('cashOpeningPanel'))$('cashOpeningPanel').classList.toggle('hidden',!general||hasOpening);
  if($('cashOpeningRecorded'))$('cashOpeningRecorded').textContent=hasOpening?'Solde initial déjà enregistré.':'';
  if($('cashFundParent'))$('cashFundParent').innerHTML=general?'<option value="'+esc(general.id)+'">'+esc(general.name)+'</option>':'';
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
  $('cashFundForm')?.addEventListener('submit',submitCashFund);
  $('cashOpeningForm')?.addEventListener('submit',submitCashOpening);
  $('cashExpenseForm')?.addEventListener('submit',submitCashExpense);
  $('cashTransferForm')?.addEventListener('submit',submitCashTransfer);
  $('cashExpenseRows')?.addEventListener('click',handleCashActions);
  $('cashTransferRows')?.addEventListener('click',handleCashActions);
  if($('cashOpeningDate'))$('cashOpeningDate').value=new Date().toISOString().slice(0,10);
});
