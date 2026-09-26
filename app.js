let sb=null,currentUser=null,isAdmin=false,signupMode=false;
const $=id=>document.getElementById(id), show=id=>$(id).classList.remove('hidden'), hide=id=>$(id).classList.add('hidden');
function openAuth(){show('authModal')} function closeAuth(){hide('authModal')}
function setAdminUI(){if(isAdmin){show('admin');show('members');show('membersNav');show('contributions');show('contributionsNav');show('financeDashboard');show('financeNav')}else{hide('admin');hide('members');hide('membersNav');hide('contributions');hide('contributionsNav');hide('financeDashboard');hide('financeNav')}}
function msg(id,t,ok=false){$(id).textContent=t;$(id).style.color=ok?'#08733a':'#a52d2d'}
async function init(){
 const c=window.DJQ_CONFIG;
 $('loginBtn').onclick=openAuth;$('logoutBtn').onclick=async()=>{await sb.auth.signOut();location.reload()};
 $('switchAuth').onclick=()=>{signupMode=!signupMode;$('authTitle').textContent=signupMode?'Créer un compte gratuit':'Connexion';$('authSubmit').textContent=signupMode?'Créer mon compte':'Se connecter';$('switchAuth').textContent=signupMode?'J’ai déjà un compte':'Créer un compte gratuit'};
 $('closeMemberFinance').onclick=()=>hide('memberFinanceModal');
 $('printCardBtn').onclick=()=>window.print();
 $('closeCardBtn').onclick=()=>hide('memberCard');
 $('contributionForm').onsubmit=addContribution;
 setDefaultContributionMonth();
 if($('financeMonthFilter')){
   $('financeMonthFilter').value='';
   $('financeMemberFilter').onchange=loadFinanceDashboard;
   $('financeMonthFilter').onchange=loadFinanceDashboard;
   $('financeResetBtn').onclick=()=>{ $('financeMemberFilter').value=''; $('financeMonthFilter').value=''; loadFinanceDashboard(); };
   $('financeExportBtn').onclick=exportFinanceCSV;
 }
 if(c.SUPABASE_PUBLISHABLE_KEY.startsWith('COLLER_')){loadDemo();return}
 sb=window.supabase.createClient(c.SUPABASE_URL,c.SUPABASE_PUBLISHABLE_KEY);$('authForm').onsubmit=auth;$('contentForm').onsubmit=publish;$('memberForm').onsubmit=addMember;
 const s=await sb.auth.getSession();if(s.data.session)await setUser(s.data.session.user);sb.auth.onAuthStateChange((_e,s)=>setUser(s?.user||null));load();await handlePublicMember();
}
async function setUser(u){currentUser=u;if(!u){isAdmin=false;setAdminUI();hide('logoutBtn');show('loginBtn');return}hide('loginBtn');show('logoutBtn');const r=await sb.from('profiles').select('role').eq('id',u.id).maybeSingle();isAdmin=r.data?.role==='admin';setAdminUI();if(isAdmin){await loadMembers();await loadContributions();await loadFinanceDashboard()}}
async function auth(e){e.preventDefault();const email=$('email').value,password=$('password').value;const r=signupMode?await sb.auth.signUp({email,password}):await sb.auth.signInWithPassword({email,password});if(r.error)return msg('authMessage',r.error.message);msg('authMessage',signupMode?'Compte créé.':'Connexion réussie.',true);if(!signupMode)setTimeout(closeAuth,500)}
async function load(){if(!sb)return;const r=await sb.from('contents').select('*').eq('published',true).order('created_at',{ascending:false});if(!r.error)render(r.data||[])}
function render(rows){$('contentGrid').innerHTML='';$('announcementGrid').innerHTML='';if(!rows.length)$('contentGrid').innerHTML='<div class="loading">Aucun contenu publié.</div>';for(const x of rows){const icon={khasside:'📖',audio:'🎧',video:'🎥',cours:'📚',annonce:'📢'}[x.type]||'📄';const h='<article class="card"><span class="tag">'+icon+' '+esc(x.type)+'</span><h3>'+esc(x.title)+'</h3><p>'+esc(x.description||'')+'</p>'+(x.external_url?'<a target="_blank" rel="noopener" href="'+esc(x.external_url)+'">Ouvrir →</a>':'')+'</article>';if(x.type==='annonce')$('announcementGrid').insertAdjacentHTML('beforeend',h);else $('contentGrid').insertAdjacentHTML('beforeend',h)}}
async function publish(e){e.preventDefault();if(!isAdmin)return;const r=await sb.from('contents').insert({type:$('type').value,title:$('title').value,description:$('description').value,external_url:$('external_url').value||null,published:true,created_by:currentUser.id});if(r.error)return msg('formMessage',r.error.message);msg('formMessage','Contenu publié.',true);e.target.reset();load()}
function loadDemo(){render([{type:'khasside',title:'Khassaïdes',description:'Les khassaïdes du Dahira seront disponibles ici.'},{type:'audio',title:'Audios',description:'Les récitations seront disponibles ici.'},{type:'video',title:'Vidéos',description:'Les vidéos du Dahira seront disponibles ici.'},{type:'cours',title:'Cours',description:'Les enseignements seront disponibles ici.'}])}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}

function setDefaultContributionMonth(){
  const d=new Date();
  $('contributionMonth').value=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}

function formatMoney(n){
  return new Intl.NumberFormat('fr-FR').format(Number(n||0))+' FCFA';
}

function contributionMonthDate(){
  const v=$('contributionMonth').value;
  return v ? v+'-01' : '';
}

function contributionMonthLabel(v){
  if(!v)return '—';
  const d=new Date(v+'T00:00:00');
  return d.toLocaleDateString('fr-FR',{month:'long',year:'numeric'});
}

function contributionMethodLabel(v){
  return {especes:'Espèces',wave:'Wave',orange_money:'Orange Money'}[v]||v||'—';
}

async function loadContributionMembers(){
  if(!sb||!isAdmin)return;
  const r=await sb.from('members')
    .select('id,member_number,first_name,last_name,status')
    .order('first_name',{ascending:true});
  if(r.error){msg('contributionMessage',r.error.message);return}
  const active=(r.data||[]).filter(m=>m.status==='active');
  $('contributionMember').innerHTML='<option value="">Sélectionner un membre</option>'+
    active.map(m=>`<option value="${esc(m.id)}">${esc(m.member_number)} — ${esc(m.first_name)} ${esc(m.last_name)}</option>`).join('');
}

async function loadContributions(){
  if(!sb||!isAdmin)return;
  await loadContributionMembers();

  const r=await sb.from('contributions')
    .select('id,member_id,amount,payment_month,payment_method,status,reference,note,paid_at,members(member_number,first_name,last_name)')
    .order('paid_at',{ascending:false});

  if(r.error){
    msg('contributionMessage','Erreur : '+r.error.message);
    return;
  }

  const rows=r.data||[];
  const now=new Date();
  const ym=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const monthRows=rows.filter(x=>String(x.payment_month||'').startsWith(ym) && x.status==='paid');
  const total=monthRows.reduce((s,x)=>s+Number(x.amount||0),0);
  const paidIds=new Set(monthRows.map(x=>x.member_id));

  $('contributionMonthTotal').textContent=formatMoney(total);
  $('contributionMonthCount').textContent=monthRows.length;
  $('contributionPaidCount').textContent=paidIds.size;

  const membersR=await sb.from('members').select('id,status');
  const activeCount=(membersR.data||[]).filter(x=>x.status==='active').length;
  $('contributionUnpaidCount').textContent=Math.max(activeCount-paidIds.size,0);

  $('contributionRows').innerHTML=rows.length
    ? rows.map(x=>`<tr>
        <td><strong>${esc(x.members?.member_number||'—')}</strong><br>${esc((x.members?.first_name||'')+' '+(x.members?.last_name||''))}</td>
        <td>${esc(contributionMonthLabel(x.payment_month))}</td>
        <td><strong>${esc(formatMoney(x.amount))}</strong></td>
        <td>${esc(contributionMethodLabel(x.payment_method))}</td>
        <td>${esc(x.reference||'—')}</td>
        <td>${esc(new Date(x.paid_at).toLocaleDateString('fr-FR'))}</td>
        <td>
          <button class="table-btn" onclick='printContributionReceipt(${JSON.stringify(x)})'>🧾 Reçu</button>
          <button class="table-btn danger-btn" onclick='deleteContribution(${JSON.stringify(x.id)})'>Supprimer</button>
        </td>
      </tr>`).join('')
    : '<tr><td colspan="7">Aucune cotisation enregistrée.</td></tr>';
}

async function addContribution(e){
  e.preventDefault();
  if(!isAdmin)return;

  const memberId=$('contributionMember').value;
  const paymentMonth=contributionMonthDate();
  const amount=Number($('contributionAmount').value);

  if(!memberId||!paymentMonth||!amount||amount<=0){
    msg('contributionMessage','Sélectionne le membre, le mois et un montant valide.');
    return;
  }

  const r=await sb.from('contributions').insert({
    member_id:memberId,
    amount,
    payment_month:paymentMonth,
    payment_method:$('contributionMethod').value,
    status:'paid',
    reference:$('contributionReference').value.trim()||null,
    note:$('contributionNote').value.trim()||null
  });

  if(r.error){
    msg('contributionMessage','Erreur : '+r.error.message);
    return;
  }

  msg('contributionMessage','Cotisation enregistrée avec succès.',true);
  const selectedMonth=$('contributionMonth').value;
  e.target.reset();
  $('contributionMonth').value=selectedMonth;
  setTimeout(()=>msg('contributionMessage',''),2500);
  await loadContributions();
}

async function deleteContribution(id){
  if(!isAdmin||!confirm('Supprimer cette cotisation ?'))return;
  const r=await sb.from('contributions').delete().eq('id',id);
  if(r.error){msg('contributionMessage','Erreur : '+r.error.message);return}
  msg('contributionMessage','Cotisation supprimée.',true);
  await loadContributions();
}

addEventListener('DOMContentLoaded',init);


async function loadFinanceDashboard(){
  if(!sb||!isAdmin)return;

  const r=await sb.from('contributions')
    .select('id,member_id,amount,payment_month,payment_method,status,reference,note,paid_at,members(member_number,first_name,last_name)')
    .eq('status','paid')
    .order('paid_at',{ascending:false});

  if(r.error)return;

  const rows=r.data||[];
  const total=rows.reduce((s,x)=>s+Number(x.amount||0),0);
  const now=new Date();
  const ym=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const monthRows=rows.filter(x=>String(x.payment_month||'').startsWith(ym));
  const wave=rows.filter(x=>x.payment_method==='wave').reduce((s,x)=>s+Number(x.amount||0),0);
  const orange=rows.filter(x=>x.payment_method==='orange_money').reduce((s,x)=>s+Number(x.amount||0),0);

  $('financeTotal').textContent=formatMoney(total);
  $('financeMonth').textContent=formatMoney(monthRows.reduce((s,x)=>s+Number(x.amount||0),0));
  $('financeWave').textContent=formatMoney(wave);
  $('financeOrange').textContent=formatMoney(orange);

  const membersR=await sb.from('members')
    .select('id,member_number,first_name,last_name')
    .order('first_name',{ascending:true});

  const members=membersR.data||[];
  $('financeMemberFilter').innerHTML='<option value="">Tous les membres</option>'+
    members.map(m=>`<option value="${esc(m.id)}">${esc(m.member_number)} — ${esc(m.first_name)} ${esc(m.last_name)}</option>`).join('');

  renderFinanceRows(rows);
}

async function renderFinanceRows(rows){
  const memberId=$('financeMemberFilter')?.value||'';
  const month=$('financeMonthFilter')?.value||'';

  const filtered=rows.filter(x=>{
    const okMember=!memberId || x.member_id===memberId;
    const okMonth=!month || String(x.payment_month||'').startsWith(month);
    return okMember && okMonth;
  });

  $('financeRows').innerHTML=filtered.length ? filtered.map(x=>`<tr>
    <td><strong>${esc(x.members?.member_number||'—')}</strong><br>${esc((x.members?.first_name||'')+' '+(x.members?.last_name||''))}</td>
    <td>${esc(contributionMonthLabel(x.payment_month))}</td>
    <td><strong>${esc(formatMoney(x.amount))}</strong></td>
    <td>${esc(contributionMethodLabel(x.payment_method))}</td>
    <td>${esc(new Date(x.paid_at).toLocaleDateString('fr-FR'))}</td>
    <td><button class="table-btn" onclick='printContributionReceipt(${JSON.stringify(x)})'>🧾 Imprimer</button></td>
  </tr>`).join('') : '<tr><td colspan="6">Aucune cotisation pour ces critères.</td></tr>';
}

async function exportFinanceCSV(){
  if(!sb||!isAdmin)return;
  const r=await sb.from('contributions')
    .select('member_id,amount,payment_month,payment_method,status,reference,paid_at,members(member_number,first_name,last_name)')
    .order('paid_at',{ascending:false});
  if(r.error){alert(r.error.message);return;}

  const rows=r.data||[];
  const memberId=$('financeMemberFilter')?.value||'';
  const month=$('financeMonthFilter')?.value||'';
  const filtered=rows.filter(x=>
    (!memberId||x.member_id===memberId) &&
    (!month||String(x.payment_month||'').startsWith(month))
  );

  const lines=[
    ['N° membre','Nom','Mois','Montant FCFA','Mode','Statut','Référence','Date'].map(csvCell).join(';'),
    ...filtered.map(x=>[
      x.members?.member_number||'',
      `${x.members?.first_name||''} ${x.members?.last_name||''}`.trim(),
      x.payment_month||'',
      Number(x.amount||0),
      contributionMethodLabel(x.payment_method),
      x.status||'',
      x.reference||'',
      x.paid_at?new Date(x.paid_at).toLocaleDateString('fr-FR'):''
    ].map(csvCell).join(';'))
  ];

  const blob=new Blob(["\ufeff"+lines.join('\n')],{type:'text/csv;charset=utf-8;'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='cotisations_daara_jazbul_qulub.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}

function csvCell(v){
  return '"'+String(v??'').replace(/"/g,'""')+'"';
}

function printContributionReceipt(x){
  const member=(x.members?.first_name||'')+' '+(x.members?.last_name||'');
  const html=`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Reçu ${esc(x.members?.member_number||'')}</title>
  <style>
  body{font-family:Arial,sans-serif;padding:35px;color:#153522}
  .receipt{max-width:620px;margin:auto;border:2px solid #075c2d;border-radius:14px;padding:28px}
  h1{color:#075c2d;margin:0 0 5px}.sub{color:#666;margin-bottom:25px}
  .line{display:flex;justify-content:space-between;border-bottom:1px solid #ddd;padding:10px 0}
  .amount{font-size:25px;font-weight:700;color:#075c2d;margin:22px 0}
  .footer{margin-top:28px;font-size:12px;color:#666;text-align:center}
  </style></head><body><div class="receipt">
  <h1>Daara Jazbul Qulub</h1><div class="sub">Reçu de cotisation</div>
  <div class="line"><b>N° membre</b><span>${esc(x.members?.member_number||'—')}</span></div>
  <div class="line"><b>Membre</b><span>${esc(member.trim())}</span></div>
  <div class="line"><b>Mois</b><span>${esc(contributionMonthLabel(x.payment_month))}</span></div>
  <div class="line"><b>Mode</b><span>${esc(contributionMethodLabel(x.payment_method))}</span></div>
  <div class="line"><b>Référence</b><span>${esc(x.reference||'—')}</span></div>
  <div class="amount">Montant : ${esc(formatMoney(x.amount))}</div>
  <div class="line"><b>Date du paiement</b><span>${esc(x.paid_at?new Date(x.paid_at).toLocaleDateString('fr-FR'):'—')}</span></div>
  <div class="footer">Document généré depuis l'espace administrateur du Daara.</div>
  </div><script>window.onload=()=>{window.print();}</script></body></html>`;

  const w=window.open('','_blank','width=800,height=700');
  if(!w){alert('Autorise les fenêtres pop-up pour imprimer le reçu.');return;}
  w.document.write(html);
  w.document.close();
}


async function loadMembers(){
 if(!sb||!isAdmin)return;const r=await sb.from('members').select('id,member_number,first_name,last_name,phone,email,status,membership_date,photo_url').order('created_at',{ascending:false});
 if(r.error){msg('memberMessage',r.error.message);return}const rows=r.data||[];$('totalMemberCount').textContent=rows.length;$('memberCount').textContent=rows.filter(x=>x.status==='active').length;
 $('memberRows').innerHTML=rows.length?rows.map(x=>`<tr><td><strong>${esc(x.member_number)}</strong></td><td><div class="member-mini"><img src="${esc(x.photo_url||'logo.jpeg')}" alt=""><span>${esc(x.first_name)} ${esc(x.last_name)}</span></div></td><td>${esc(x.phone||'—')}</td><td>${esc(x.membership_date||'—')}</td><td><span class="status ${x.status==='active'?'active':'inactive'}">${x.status==='active'?'Actif':'Inactif'}</span></td><td><button class="table-btn" onclick='editMember(${JSON.stringify(x.id)})'>Modifier</button> <button class="table-btn" onclick='showMemberCard(${JSON.stringify(x)})'>Voir carte</button></td></tr>`).join(''):'<tr><td colspan="6">Aucun membre.</td></tr>';
}

async function addMember(e){
 e.preventDefault();if(!isAdmin)return;if(editingMemberId)return updateExistingMember(e);let photoUrl=null;const file=$('memberPhoto').files[0];
 if(file && file.size>5*1024*1024){msg('memberMessage','Photo trop lourde. Maximum 5 Mo.');return}
 if(file && !['image/jpeg','image/png','image/webp'].includes(file.type)){msg('memberMessage','Format photo non accepté. Utilise JPG, PNG ou WEBP.');return}
 const r=await sb.from('members').insert({first_name:$('memberFirstName').value.trim(),last_name:$('memberLastName').value.trim(),phone:$('memberPhone').value.trim()||null,email:$('memberEmail').value.trim()||null}).select('id,member_number').single();
 if(r.error){msg('memberMessage',r.error.message);return}
 if(file){const ext=(file.name.split('.').pop()||'jpg').toLowerCase();const path=`${r.data.member_number}-${Date.now()}.${ext}`;const up=await sb.storage.from('member-photos').upload(path,file,{upsert:false,contentType:file.type});if(up.error){await sb.from('members').delete().eq('id',r.data.id);msg('memberMessage','Membre non créé : '+up.error.message);return}photoUrl=sb.storage.from('member-photos').getPublicUrl(path).data.publicUrl;const ur=await sb.from('members').update({photo_url:photoUrl}).eq('id',r.data.id);if(ur.error){msg('memberMessage','Membre créé, mais photo non enregistrée : '+ur.error.message,true)} }
 msg('memberMessage','Membre créé : '+r.data.member_number,true);e.target.reset();await loadMembers();
}
function previewMemberPhoto(e){const f=e.target.files[0];if(!f)return;const img=$('photoPreview');img.src=URL.createObjectURL(f);show('photoPreviewWrap');$('photoPreviewName').textContent=f.name}
function showMemberCard(m){
 show('memberCard');$('cardIntro').textContent='Carte de '+m.first_name+' '+m.last_name;$('cardName').textContent=(m.first_name+' '+m.last_name).trim();$('cardNumber').textContent=m.member_number;$('cardPhone').textContent=m.phone||'Non renseigné';$('cardDate').textContent=m.membership_date||'—';$('cardStatus').textContent=m.status==='active'?'Actif':'Inactif';$('cardPhoto').src=m.photo_url||'logo.jpeg';$('qrcode').innerHTML='';const url=location.origin+location.pathname+'?member='+encodeURIComponent(m.member_number);new QRCode($('qrcode'),{text:url,width:104,height:104,colorDark:'#075c2d',colorLight:'#ffffff'});document.getElementById('memberCard').scrollIntoView({behavior:'smooth'});
}
async function handlePublicMember(){const n=new URLSearchParams(location.search).get('member');if(!n||!sb)return;hide('accueil');hide('contenus');hide('annonces');show('memberPublic');const r=await sb.from('members').select('member_number,first_name,last_name,status,membership_date,photo_url').eq('member_number',n).eq('status','active').maybeSingle();if(r.error||!r.data){$('publicMemberBox').innerHTML='<p class="verify-no">Carte introuvable ou membre inactif.</p>';return}const m=r.data;$('publicMemberBox').innerHTML=`<img src="${esc(m.photo_url||'logo.jpeg')}" alt="Photo"><h3>${esc(m.first_name)} ${esc(m.last_name)}</h3><p><b>N° membre :</b> ${esc(m.member_number)}</p><p><b>Adhésion :</b> ${esc(m.membership_date||'—')}</p><p class="verify-ok">✓ Carte valide — membre actif</p>`}


let editingMemberId=null;
function startEditMember(m){
 editingMemberId=m.id;
 $('memberForm').querySelector('h3').textContent='Modifier le membre '+m.member_number;
 $('memberFirstName').value=m.first_name||'';
 $('memberLastName').value=m.last_name||'';
 $('memberPhone').value=m.phone||'';
 $('memberEmail').value=m.email||'';
 $('memberPhoto').value='';
 if(m.photo_url){$('photoPreview').src=m.photo_url;show('photoPreviewWrap');$('photoPreviewName').textContent='Photo actuelle — choisir un nouveau fichier pour la remplacer.';}
 const btn=$('memberForm').querySelector('button.primary');btn.textContent='Enregistrer les modifications';
 if(!$('cancelMemberEdit')){
   const c=document.createElement('button');c.type='button';c.id='cancelMemberEdit';c.className='secondary';c.textContent='Annuler';c.onclick=cancelEditMember;$('memberForm').appendChild(c);
 }
 $('members').scrollIntoView({behavior:'smooth'});
}
function cancelEditMember(){
 editingMemberId=null;$('memberForm').reset();$('memberForm').querySelector('h3').textContent='Ajouter un membre';$('memberForm').querySelector('button.primary').textContent='Créer le membre';hide('photoPreviewWrap');msg('memberMessage','');
 const c=$('cancelMemberEdit');if(c)c.remove();
}
async function editMember(id){
 if(!sb||!isAdmin)return;
 const r=await sb.from('members').select('id,member_number,first_name,last_name,phone,email,status,membership_date,photo_url').eq('id',id).single();
 if(r.error){msg('memberMessage',r.error.message);return}
 startEditMember(r.data);
}
async function updateExistingMember(e){
 e.preventDefault();if(!editingMemberId)return addMember(e);
 const file=$('memberPhoto').files[0];
 if(file && file.size>5*1024*1024){msg('memberMessage','Photo trop lourde. Maximum 5 Mo.');return}
 if(file && !['image/jpeg','image/png','image/webp'].includes(file.type)){msg('memberMessage','Format photo non accepté. Utilise JPG, PNG ou WEBP.');return}
 const payload={first_name:$('memberFirstName').value.trim(),last_name:$('memberLastName').value.trim(),phone:$('memberPhone').value.trim()||null,email:$('memberEmail').value.trim()||null};
 const r=await sb.from('members').update(payload).eq('id',editingMemberId).select('member_number').single();
 if(r.error){msg('memberMessage',r.error.message);return}
 if(file){const ext=(file.name.split('.').pop()||'jpg').toLowerCase();const path=`${r.data.member_number}-${Date.now()}.${ext}`;const up=await sb.storage.from('member-photos').upload(path,file,{upsert:false,contentType:file.type});if(up.error){msg('memberMessage','Membre modifié, mais photo non enregistrée : '+up.error.message);return}const url=sb.storage.from('member-photos').getPublicUrl(path).data.publicUrl;const ur=await sb.from('members').update({photo_url:url}).eq('id',editingMemberId);if(ur.error){msg('memberMessage','Membre modifié, mais photo non enregistrée : '+ur.error.message);return}}
 msg('memberMessage','Membre '+r.data.member_number+' modifié avec succès.',true);cancelEditMember();await loadMembers();
}


async function viewMemberContributions(member){
  if(!sb||!isAdmin)return;
  const r=await sb.from('contributions')
    .select('id,member_id,amount,payment_month,payment_method,status,reference,note,paid_at,members(member_number,first_name,last_name)')
    .eq('member_id',member.id)
    .eq('status','paid')
    .order('payment_month',{ascending:false});

  if(r.error){alert(r.error.message);return;}
  const rows=r.data||[];
  $('memberFinanceHead').innerHTML=`<strong>${esc(member.member_number||'')}</strong> — ${esc(member.first_name||'')} ${esc(member.last_name||'')}`;

  const total=rows.reduce((s,x)=>s+Number(x.amount||0),0);
  $('memberFinanceTotal').textContent=formatMoney(total);
  $('memberFinanceCount').textContent=String(rows.length);
  $('memberFinanceLast').textContent=rows[0]?.paid_at?new Date(rows[0].paid_at).toLocaleDateString('fr-FR'):'—';

  $('memberFinanceRows').innerHTML=rows.length ? rows.map(x=>`<tr>
    <td>${esc(contributionMonthLabel(x.payment_month))}</td>
    <td><strong>${esc(formatMoney(x.amount))}</strong></td>
    <td>${esc(contributionMethodLabel(x.payment_method))}</td>
    <td>${esc(x.paid_at?new Date(x.paid_at).toLocaleDateString('fr-FR'):'—')}</td>
    <td><button class="table-btn" onclick='printContributionReceipt(${JSON.stringify(x)})'>🧾 Reçu</button></td>
  </tr>`).join('') : '<tr><td colspan="5">Aucune cotisation enregistrée pour ce membre.</td></tr>';

  show('memberFinanceModal');
}
