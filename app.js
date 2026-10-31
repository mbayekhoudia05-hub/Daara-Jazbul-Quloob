let sb=null,currentUser=null,isAdmin=false,signupMode=false;
const $=id=>document.getElementById(id), show=id=>$(id).classList.remove('hidden'), hide=id=>$(id).classList.add('hidden');
function openAuth(){show('authModal')} function closeAuth(){hide('authModal')}

function setAdminUI(){
  const sections=['adminDashboard','admin','members','commissions','membershipRequests','contributions','paymentTransactions','unpaidMembers','financeDashboard'];
  const navs=['dashboardNav','adminNav','membersNav','commissionsNav','membershipRequestsNav','contributionsNav','paymentsNav','unpaidNav','financeNav'];
  sections.forEach(hide);
  navs.forEach(hide);
  if(isAdmin){
    navs.forEach(show);
    show('adminDashboard');
    updateAdminDashboard();
  }
}
function showAdminSection(id){
  if(!isAdmin)return;
  const allowed=['adminDashboard','admin','members','commissions','membershipRequests','contributions','paymentTransactions','unpaidMembers','financeDashboard'];
  if(!allowed.includes(id))return;
  allowed.forEach(hide);
  show(id);
  const link=document.querySelector('[data-admin-target="'+id+'"]');
  document.querySelectorAll('.app-sidebar nav a').forEach(a=>a.classList.remove('active'));
  if(link)link.classList.add('active');
  if(id==='adminDashboard')updateAdminDashboard();
  if(id==='commissions')void loadCommissions();
  if(id==='membershipRequests')void loadMembershipRequests();
}
function updateAdminDashboard(){
  const copy=(from,to)=>{const a=$(from),b=$(to);if(a&&b)b.textContent=a.textContent};
  copy('memberCount','dashMembers');
  copy('contributionMonthTotal','dashContributions');
  copy('pendingPayments','dashPayments');
  const pending=document.querySelectorAll('#membershipRequestRows tr');
  const n=[...pending].filter(tr=>tr.textContent.includes('En attente')).length;
  const d=$('dashPending');if(d)d.textContent=String(n);
}
document.addEventListener('click',e=>{
  const a=e.target.closest('.app-sidebar nav a[data-admin-target]');
  if(!a||!isAdmin)return;
  e.preventDefault();
  showAdminSection(a.dataset.adminTarget);
  if(window.innerWidth<=800){
    document.body.classList.remove('sidebar-mobile-open');
  }
});

function msg(id,t,ok=false){$(id).textContent=t;$(id).style.color=ok?'#08733a':'#a52d2d'}
function esc(s){
  return String(s??'').replace(/[&<>"']/g,m=>({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;',
    "'":'&#039;'
  }[m]));
}

function formatMoney(n){
  return new Intl.NumberFormat('fr-FR').format(Number(n||0))+' FCFA';
}

function contributionMonthDate(){
  const v=$('contributionMonth')?.value;
  return v ? v+'-01' : '';
}

function contributionMonthLabel(v){
  if(!v)return '—';
  const d=new Date(v+'T00:00:00');
  return d.toLocaleDateString('fr-FR',{month:'long',year:'numeric'});
}

function contributionMethodLabel(v){
  return {
    especes:'Espèces',
    wave:'Wave',
    orange_money:'Orange Money'
  }[v]||v||'—';
}

async function auth(e){
  e.preventDefault();
  const email=$('email').value;
  const password=$('password').value;

  const r=signupMode
    ? await sb.auth.signUp({email,password})
    : await sb.auth.signInWithPassword({email,password});

  if(r.error){
    msg('authMessage',r.error.message);
    return;
  }

  msg('authMessage',signupMode?'Compte créé.':'Connexion réussie.',true);
  if(!signupMode)setTimeout(closeAuth,500);
}

async function load(){
  if(!sb)return;
  const r=await sb.from('contents')
    .select('*')
    .order('created_at',{ascending:false});

  if(r.error){
    if(isAdmin){
      const box=$('adminContentRows');
      if(box)box.innerHTML='<div class="loading">Erreur de chargement : '+esc(r.error.message)+'</div>';
      msg('formMessage',"Chargement des contenus impossible : "+r.error.message);
    }
    return;
  }
  const rows=r.data||[];
  render(rows.filter(x=>x.published));
  if(isAdmin){
    window._djqContentRows=rows;
    renderAdminContents(rows);
  }
}

function contentCard(x){
  const icon={khasside:'📖',audio:'🎧',video:'🎥',cours:'📚',annonce:'📢',information:'ℹ️',charte:'📜'}[x.type]||'📄';
  return '<article class="card"><span class="tag">'+icon+' '+esc(contentTypeLabel(x.type))+'</span><h3>'+esc(x.title)+'</h3><p>'+esc(x.description||'')+'</p>'+(x.external_url?'<a target="_blank" rel="noopener" href="'+esc(x.external_url)+'">Ouvrir →</a>':'')+'</article>';
}
function contentTypeLabel(type){
  return ({khasside:'Khassaïde',audio:'Audio',video:'Vidéo',cours:'Cours',annonce:'Annonce',information:'Information du Dahira',charte:'Charte du Dahira'})[type]||type;
}
function render(rows){
  ['contentGrid','announcementGrid','dahiraInformationGrid','dahiraChartersGrid'].forEach(id=>{const el=$(id);if(el)el.innerHTML='';});
  const targets={annonce:'announcementGrid',information:'dahiraInformationGrid',charte:'dahiraChartersGrid'};
  for(const x of rows){
    const target=targets[x.type]||'contentGrid';
    const el=$(target);
    if(el)el.insertAdjacentHTML('beforeend',contentCard(x));
  }
  const emptyLabels={
    contentGrid:'Aucun contenu public pour le moment.',
    announcementGrid:'Aucune annonce publiée.',
    dahiraInformationGrid:'Les informations du Dahira seront bientôt publiées.',
    dahiraChartersGrid:'Les chartes du Dahira seront bientôt publiées.'
  };
  for(const [id,label] of Object.entries(emptyLabels)){
    const el=$(id);if(el&&!el.children.length)el.innerHTML='<div class="loading">'+label+'</div>';
  }
}
function renderAdminContents(rows){
  const box=$('adminContentRows');if(!box)return;
  box.innerHTML=rows.length?rows.map(x=>'<article class="content-admin-row"><div><span class="tag">'+esc(contentTypeLabel(x.type))+(x.published?' · Publié':' · Brouillon')+'</span><h3>'+esc(x.title)+'</h3><p>'+esc(x.description||'')+'</p></div><div class="content-admin-actions"><button type="button" class="table-btn" data-content-edit="'+esc(x.id)+'">Modifier</button><button type="button" class="table-btn danger-btn" data-content-delete="'+esc(x.id)+'">Supprimer</button></div></article>').join(''):'<div class="loading">Aucun contenu enregistré.</div>';
  // Bind directly after rendering so edit/delete do not depend on a delegated click handler.
  box.querySelectorAll('[data-content-edit]').forEach(button=>{
    button.onclick=event=>{
      event.preventDefault();
      event.stopPropagation();
      startEditContent(button.dataset.contentEdit);
    };
  });
  box.querySelectorAll('[data-content-delete]').forEach(button=>{
    button.onclick=async event=>{
      event.preventDefault();
      event.stopPropagation();
      const id=button.dataset.contentDelete;
      if(!isAdmin||!currentUser){alert("Connecte-toi avec le compte administrateur.");return;}
      if(!confirm('Supprimer définitivement ce contenu ?'))return;
      button.disabled=true;
      const removed=await sb.from('contents').delete().eq('id',id).select('id').maybeSingle();
      if(removed.error){alert('Suppression impossible : '+removed.error.message);button.disabled=false;return;}
      if(!removed.data){alert("Aucun contenu supprimé. Vérifie les droits administrateur dans Supabase.");button.disabled=false;return;}
      await load();
    };
  });
}
function resetContentForm(){
  $('editingContentId').value='';
  $('contentForm').reset();
  $('contentSubmitBtn').textContent='Publier';
  hide('cancelContentEditBtn');
}
function startEditContent(id){
  const x=window._djqContentRows?.find(row=>String(row.id)===String(id));
  if(!x){
    msg('formMessage',"Impossible de retrouver ce contenu. Actualise la page puis réessaie.");
    return;
  }
  $('editingContentId').value=x.id;
  $('type').value=x.type;
  $('title').value=x.title||'';
  $('description').value=x.description||'';
  $('external_url').value=x.external_url||'';
  $('contentSubmitBtn').textContent='Enregistrer les modifications';
  show('cancelContentEditBtn');
  showAdminSection('admin');
  $('contentForm').scrollIntoView({behavior:'smooth',block:'start'});
  $('title').focus();
}
async function publish(e){
  e.preventDefault();
  const status=$('formMessage');
  const button=$('contentSubmitBtn');
  if(!sb){msg('formMessage',"Connexion à la base de données indisponible.");return;}
  if(!currentUser){msg('formMessage',"Votre session a expiré. Reconnecte-toi puis réessaie.");return;}
  if(!isAdmin){msg('formMessage',"Ton compte est connecté, mais son rôle administrateur n'est pas reconnu. Ne ferme pas la session; vérifie le rôle du profil.");return;}
  const id=$('editingContentId').value;
  const title=$('title').value.trim();
  if(!title){msg('formMessage',"Le titre est obligatoire.");$('title').focus();return;}
  const payload={
    type:$('type').value,
    title,
    description:$('description').value.trim(),
    external_url:$('external_url').value.trim()||null,
    published:true
  };
  button.disabled=true;
  button.textContent=id?'Enregistrement…':'Publication…';
  if(status)status.textContent='';
  try{
    const r=id
      ? await sb.from('contents').update(payload).eq('id',id).select('id').maybeSingle()
      : await sb.from('contents').insert({...payload,created_by:currentUser.id}).select('id').single();
    if(r.error){
      msg('formMessage',"Enregistrement impossible : "+r.error.message);
      return;
    }
    if(!r.data){
      msg('formMessage',"Aucune ligne n'a été modifiée. Vérifie les droits d'accès Supabase (RLS) du compte administrateur.");
      return;
    }
    msg('formMessage',id?'Modifications enregistrées avec succès.':'Contenu publié avec succès.',true);
    resetContentForm();
    await load();
  }catch(err){
    msg('formMessage',"Erreur inattendue : "+(err?.message||String(err)));
  }finally{
    button.disabled=false;
    button.textContent=$('editingContentId').value?'Enregistrer les modifications':'Publier';
  }
}
function setDefaultContributionMonth(){
  const el=$('contributionMonth');
  if(el){
    const d=new Date();
    el.value=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
  }
}
async function init(){
 const c=window.DJQ_CONFIG;
 $('loginBtn').onclick=openAuth;$('logoutBtn').onclick=async()=>{await sb.auth.signOut();location.reload()};
 $('switchAuth').onclick=()=>{signupMode=!signupMode;$('authTitle').textContent=signupMode?'Créer un compte gratuit':'Connexion';$('authSubmit').textContent=signupMode?'Créer mon compte':'Se connecter';$('switchAuth').textContent=signupMode?'J’ai déjà un compte':'Créer un compte gratuit'};
 $('closeMemberFinance').onclick=()=>hide('memberFinanceModal');
 $('printCardBtn').onclick=()=>window.print();
 $('closeCardBtn').onclick=()=>hide('memberCard');
 $('contributionForm').onsubmit=addContribution;
 const contributionMonthInput=$('contributionMonth');
if(contributionMonthInput){
  const d=new Date();
  contributionMonthInput.value=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
}
 
if($("unpaidMonth")){
  $("unpaidMonth").value=currentYM();
  $("unpaidMonth").onchange=loadUnpaidTracker;
  $("unpaidSearch").oninput=loadUnpaidTracker;
}

if($('financeMonthFilter')){
   $('financeMonthFilter').value='';
   $('financeMemberFilter').onchange=loadFinanceDashboard;
   $('financeMonthFilter').onchange=loadFinanceDashboard;
   $('financeResetBtn').onclick=()=>{ $('financeMemberFilter').value=''; $('financeMonthFilter').value=''; loadFinanceDashboard(); };
   $('financeExportBtn').onclick=exportFinanceCSV;
 }
 if(c.SUPABASE_PUBLISHABLE_KEY.startsWith('COLLER_')){loadDemo();return}
 sb=window.supabase.createClient(c.SUPABASE_URL,c.SUPABASE_PUBLISHABLE_KEY);void loadPublicCommissions();$('requestCommission')?.addEventListener('focus',()=>void loadPublicCommissions());$('authForm').onsubmit=auth;$('contentForm').onsubmit=publish;$('cancelContentEditBtn').onclick=resetContentForm;$('memberForm').onsubmit=addMember;$('commissionForm').onsubmit=saveCommission;const requestForm = $('membershipRequestForm');
if (requestForm) requestForm.onsubmit = submitMembershipRequest;
  if($('memberReportForm')){
  $('memberReportForm').onsubmit=submitMemberReport;
}
 const s=await sb.auth.getSession();if(s.data.session)await setUser(s.data.session.user);sb.auth.onAuthStateChange((_e,session)=>{setTimeout(()=>{void setUser(session?.user||null)},0)});load();await handlePublicMember();
}
async function setUser(u){
  currentUser=u;

  if(!u){
    isAdmin=false;
    setAdminUI();
    hide('logoutBtn');
    show('loginBtn');
    hide('memberDashboard');
    show('membershipFormSection');
    return;
  }

  hide('loginBtn');
  show('logoutBtn');

  const r=await sb.from('profiles')
    .select('role')
    .eq('id',u.id)
    .maybeSingle();

  isAdmin=r.data?.role==='admin';
  setAdminUI();

  await sb.rpc('link_my_member_account');

  const mr=await sb.from('members')
    .select('id,member_number,first_name,last_name,phone,email,status,membership_date,photo_url')
    .eq('auth_user_id',u.id)
    .maybeSingle();

  if(mr.error){
    alert('Erreur de chargement du profil : '+mr.error.message);
    return;
  }

  if(mr.data){
    hide('membershipFormSection');
    await loadConnectedMemberDashboard(mr.data);
  }else{
    hide('memberDashboard');
    show('membershipFormSection');
  }

  if(isAdmin){
    await loadMembers();
    await loadCommissions();
    await loadMembershipRequests();
    await loadContributions();
    await loadFinanceDashboard();
    await loadUnpaidTracker();
    await initPaymentTransactions();
    await load();
    showAdminSection('adminDashboard');
    updateAdminDashboard();
  }
}
async function loadConnectedMemberDashboard(member){
  show('memberDashboard');

  $('memberWelcome').textContent=member.first_name||'Membre';
  $('myMemberNumber').textContent=member.member_number||'—';
  $('myMemberName').textContent=(member.first_name||'')+' '+(member.last_name||'');
  $('myMemberPhone').textContent=member.phone||'—';
  $('myMemberEmail').textContent=member.email||'—';
  $('myMemberDate').textContent=member.membership_date||'—';
  $('myMemberStatus').textContent=member.status==='active'?'Actif':'Inactif';

  // Cotisations personnelles
  const cr=await sb.from('contributions')
    .select('id,amount,payment_month,payment_method,status,paid_at,created_at')
    .eq('member_id',member.id)
    .order('payment_month',{ascending:false});

  if(cr.error){
    $('myContributionRows').innerHTML='<tr><td colspan="5">Erreur de chargement.</td></tr>';
  }else{
    const rows=cr.data||[];
    const paid=rows.filter(x=>x.status==='paid');
    $('myTotalPaid').textContent=formatMoney(
      paid.reduce((s,x)=>s+Number(x.amount||0),0)
    );
    $('myPaymentCount').textContent=paid.length;

    $('myContributionRows').innerHTML=rows.length?rows.map(x=>`
      <tr>
        <td>${esc(contributionMonthLabel(x.payment_month))}</td>
        <td>${esc(formatMoney(x.amount))}</td>
        <td>${esc(contributionMethodLabel(x.payment_method))}</td>
        <td>${x.status==='paid'?'Payé':'En attente'}</td>
        <td>${esc(x.paid_at?new Date(x.paid_at).toLocaleDateString('fr-FR'):'—')}</td>
      </tr>
    `).join(''):'<tr><td colspan="5">Aucune cotisation enregistrée.</td></tr>';
  }

  // Transactions personnelles
  const pr=await sb.from('payment_transactions')
    .select('amount,payment_method,reference,payment_month,status,created_at')
    .eq('member_id',member.id)
    .order('created_at',{ascending:false});

  if(pr.error){
    $('myPaymentRows').innerHTML='<tr><td colspan="4">Erreur de chargement.</td></tr>';
  }else{
    const rows=pr.data||[];
    $('myPaymentRows').innerHTML=rows.length?rows.map(x=>`
      <tr>
        <td>${esc(formatMoney(x.amount))}</td>
        <td>${esc(x.payment_method==='wave'?'Wave':'Orange Money')}</td>
        <td>${esc(x.reference||'—')}</td>
        <td>${esc(x.status==='confirmed'?'Confirmé':x.status==='cancelled'?'Annulé':'En attente')}</td>
      </tr>
    `).join(''):'<tr><td colspan="4">Aucune transaction.</td></tr>';
  }

  // Signalements personnels
  const rr=await sb.from('member_reports')
    .select('subject,message,status,admin_note,created_at')
    .eq('auth_user_id',currentUser.id)
    .order('created_at',{ascending:false});

  if(rr.error){
    $('myReportRows').textContent='Erreur de chargement des signalements.';
  }else{
    const rows=rr.data||[];
    $('myReportRows').innerHTML=rows.length?rows.map(x=>`
      <div class="card">
        <strong>${esc(x.subject)}</strong>
        <p>${esc(x.message)}</p>
        <p>Statut : ${esc(x.status==='pending'?'En attente':x.status)}</p>
        <p>Réponse de l'administrateur : ${esc(x.admin_note||'Aucune réponse pour le moment.')}</p>
      </div>
    `).join(''):'Aucun signalement envoyé.';
  }

  // Informations du Dahira
  const ir=await sb.from('dahira_information')
    .select('title,content')
    .order('updated_at',{ascending:false});

  $('memberDahiraInformation').innerHTML=ir.error
    ?'Erreur de chargement.'
    :(ir.data||[]).map(x=>`
      <article><h4>${esc(x.title)}</h4><p>${esc(x.content)}</p></article>
    `).join('')||'Aucune information publiée pour le moment.';

  // Chartes publiées
  const hr=await sb.from('dahira_charters')
    .select('title,description,file_url')
    .eq('published',true)
    .order('created_at',{ascending:false});

  $('memberDahiraCharters').innerHTML=hr.error
    ?'Erreur de chargement.'
    :(hr.data||[]).map(x=>{
   const url=/^https?:\/\//i.test(x.file_url||'')?x.file_url:'';
      return `<article><h4>${esc(x.title)}</h4>
        <p>${esc(x.description)}</p>
        ${url?`<a href="${esc(url)}" target="_blank" rel="noopener">Consulter la charte</a>`:''}
      </article>`;
    }).join('')||'Aucune charte publiée pour le moment.';
}
async function submitMemberReport(e){
  e.preventDefault();

  if(!sb||!currentUser){
    alert('Veuillez vous connecter.');
    return;
  }

  const subject=$('memberReportSubject').value.trim();
  const message=$('memberReportMessage').value.trim();

  if(!subject||!message)return;

  const mr=await sb.from('members')
    .select('id')
    .eq('auth_user_id',currentUser.id)
    .maybeSingle();

  if(mr.error||!mr.data){
    msg('memberReportMessageStatus','Votre fiche de membre est introuvable.');
    return;
  }

  const r=await sb.from('member_reports').insert({
    member_id:mr.data.id,
    auth_user_id:currentUser.id,
    subject,
    message
  });

  if(r.error){
    msg('memberReportMessageStatus','Erreur : '+r.error.message);
    return;
  }

  $('memberReportForm').reset();
  msg('memberReportMessageStatus','Signalement envoyé à l’administrateur.',true);

  await loadConnectedMemberDashboard({
    id:mr.data.id,
    auth_user_id:currentUser.id
  });
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
          <button class="table-btn" data-action="print-receipt" data-id="${esc(x.id)}">🧾 Reçu</button>
          <button class="table-btn danger-btn" data-action="delete-contribution" data-id="${esc(x.id)}">Supprimer</button>
        </td>
      </tr>`).join('')
    : '<tr><td colspan="7">Aucune cotisation enregistrée.</td></tr>';
}

async function addContribution(e){
  e.preventDefault();
  if(!isAdmin||!currentUser)return;

  const memberId=$('contributionMember').value;
  const paymentMonth=contributionMonthDate();
  const amount=Number($('contributionAmount').value);
  const method=$('contributionMethod').value;
  const reference=$('contributionReference').value.trim()||null;
  const note=$('contributionNote').value.trim()||null;

  if(!memberId||!paymentMonth||!amount||amount<=0){
    msg('contributionMessage','Sélectionne le membre, le mois et un montant valide.');
    return;
  }

  // Les paiements digitaux doivent rester en attente jusqu'à vérification.
  const r=method==='especes'
    ? await sb.from('contributions').insert({
        member_id:memberId,amount,payment_month:paymentMonth,
        payment_method:method,status:'paid',reference,note
      })
    : await sb.from('payment_transactions').insert({
        member_id:memberId,amount,payment_month:paymentMonth,
        payment_method:method,status:'pending',reference,note
      });

  if(r.error){
    msg('contributionMessage','Erreur : '+r.error.message);
    return;
  }

  msg('contributionMessage',method==='especes'
    ?'Cotisation en espèces enregistrée.'
    :'Paiement numérique enregistré en attente de vérification dans le module Paiements.',true);
  const selectedMonth=$('contributionMonth').value;
  e.target.reset();
  $('contributionMonth').value=selectedMonth;
  await loadContributions();
  await loadPaymentTransactions();
  await loadFinanceDashboard();
}

async function deleteContribution(id){
  if(!isAdmin||!confirm('Supprimer cette cotisation ?'))return;
  const r=await sb.from('contributions').delete().eq('id',id);
  if(r.error){msg('contributionMessage','Erreur : '+r.error.message);return}
  msg('contributionMessage','Cotisation supprimée.',true);
  await loadContributions();
}

addEventListener('DOMContentLoaded',init);

document.addEventListener('click', function(e) {
  const link = e.target.closest('nav a[href^="#"]');
  if (!link) return;

  const id = link.getAttribute('href').slice(1);
  const section = document.getElementById(id);

  if (!section) return;

  e.preventDefault();

  if (id === 'membershipRequests') {
    if (!isAdmin) {
      alert("Cette section est réservée à l'administrateur.");
      return;
    }
    show('membershipRequests');
    loadMembershipRequests();
  }

  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
});


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
    <td><button class="table-btn" data-action="print-receipt" data-id="${esc(x.id)}">🧾 Imprimer</button></td>
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
 $('memberRows').innerHTML=rows.length?rows.map(x=>`<tr><td><strong>${esc(x.member_number)}</strong></td><td><div class="member-mini"><img src="${esc(x.photo_url||'logo.jpeg')}" alt=""><span>${esc(x.first_name)} ${esc(x.last_name)}</span></div></td><td>${esc(x.phone||'—')}</td><td>${esc(x.membership_date||'—')}</td><td><span class="status ${x.status==='active'?'active':'inactive'}">${x.status==='active'?'Actif':'Inactif'}</span></td><td><button class="table-btn" data-action="edit-member" data-id="${esc(x.id)}">Modifier</button> <button class="table-btn" data-action="show-member-card" data-id="${esc(x.id)}">Voir carte</button></td></tr>`).join(''):'<tr><td colspan="6">Aucun membre.</td></tr>';
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
async function handlePublicMember(){
  const n=new URLSearchParams(location.search).get('member');
  if(!n||!sb)return;

  hide('accueil');
  hide('contenus');
  hide('annonces');
  show('memberPublic');

  const r=await sb.rpc('get_public_member_card',{
    p_member_number:n
  });

  if(r.error){
    $('publicMemberBox').innerHTML='<p class="verify-no">Erreur de vérification de la carte.</p>';
    return;
  }

  const m=Array.isArray(r.data)?r.data[0]:r.data;

  if(!m){
    $('publicMemberBox').innerHTML='<p class="verify-no">Carte introuvable ou membre inactif.</p>';
    return;
  }

  $('publicMemberBox').innerHTML=`
    <img src="${esc(m.photo_url||'logo.jpeg')}" alt="Photo">
    <h3>${esc(m.first_name)} ${esc(m.last_name)}</h3>
    <p><b>N° membre :</b> ${esc(m.member_number)}</p>
    <p><b>Adhésion :</b> ${esc(m.membership_date||'—')}</p>
    <p class="verify-ok">✓ Carte valide — membre actif</p>
  `;
}

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
    <td><button class="table-btn" data-action="print-receipt" data-id="${esc(x.id)}">🧾 Reçu</button></td>
  </tr>`).join('') : '<tr><td colspan="5">Aucune cotisation enregistrée pour ce membre.</td></tr>';

  show('memberFinanceModal');
}


function currentYM(){
  const d=new Date();
  return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");
}

async function loadUnpaidTracker(){
  if(!sb||!isAdmin)return;
  const month=$("unpaidMonth")?.value||currentYM();
  if($("unpaidMonth") && !$("unpaidMonth").value) $("unpaidMonth").value=month;

  const mr=await sb.from("members").select("id,member_number,first_name,last_name,status,membership_date").eq("status","active").order("first_name",{ascending:true});
  const cr=await sb.from("contributions").select("member_id,amount,payment_month,status").eq("status","paid");
  if(mr.error){alert(mr.error.message);return;}
  if(cr.error){alert(cr.error.message);return;}

  const members=mr.data||[], paidMap={};
  (cr.data||[]).filter(x=>String(x.payment_month||"").startsWith(month)).forEach(x=>{
    paidMap[x.member_id]=(paidMap[x.member_id]||0)+Number(x.amount||0);
  });

  const search=($("unpaidSearch")?.value||"").toLowerCase().trim();
  const filtered=members.filter(m=>(!search||(`${m.member_number||""} ${m.first_name||""} ${m.last_name||""}`).toLowerCase().includes(search)));

  const paid=members.filter(m=>paidMap[m.id]>0).length;
  $("paidMembersCount").textContent=paid;
  $("unpaidMembersCount").textContent=members.length-paid;
  $("checkedMembersCount").textContent=members.length;

  $("unpaidRows").innerHTML=filtered.length?filtered.map(m=>{
    const amount=paidMap[m.id]||0, ok=amount>0;
    return `<tr>
      <td><strong>${esc(m.member_number||"")}</strong><br>${esc((m.first_name||"")+" "+(m.last_name||""))}</td>
      <td>${esc(month)}</td>
      <td><span class="status-pill ${ok?"paid-pill":"unpaid-pill"}">${ok?"🟢 PAYÉ":"🔴 NON PAYÉ"}</span></td>
      <td>${esc(ok?formatMoney(amount):"0 FCFA")}</td>
      <td><button class="table-btn" data-action="member-history" data-id="${esc(m.id)}">Historique</button>
      ${!ok?`<button class="table-btn" data-action="prefill-contribution" data-id="${esc(m.id)}" data-month="${esc(month)}">➕ Ajouter</button>`:""}</td>
    </tr>`;
  }).join(""):'<tr><td colspan="5">Aucun membre trouvé.</td></tr>';
}

function prefillContribution(member,month){
  show("contributions");
  if($("contributionMember")) $("contributionMember").value=member.id;
  if($("contributionMonth")) $("contributionMonth").value=month;
  const form=document.querySelector("#contributionForm");
  if(form) form.scrollIntoView({behavior:"smooth",block:"start"});
}


async function initPaymentTransactions(){
  if(!sb||!isAdmin)return;
  const d=new Date();
  if($("paymentMonth")) $("paymentMonth").value=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");

  const mr=await sb.from("members").select("id,member_number,first_name,last_name").eq("status","active").order("first_name",{ascending:true});
  if(mr.error){alert(mr.error.message);return;}
  $("paymentMember").innerHTML='<option value="">Choisir un membre</option>'+
    (mr.data||[]).map(m=>`<option value="${esc(m.id)}">${esc(m.member_number)} — ${esc(m.first_name)} ${esc(m.last_name)}</option>`).join('');

  $("paymentTransactionForm").onsubmit=savePaymentTransaction;
  await loadPaymentTransactions();
}

async function savePaymentTransaction(e){
  e.preventDefault();
  const member_id=$("paymentMember").value;
  const amount=Number($("paymentAmount").value);
  const payment_method=$("paymentMethod").value;
  const reference=$("paymentReference").value.trim()||null;
  const payment_month=$("paymentMonth").value+"-01";
  const status="pending";
  const note=$("paymentNote").value.trim()||null;
  if(!member_id||!amount||!payment_month){alert("Remplis les champs obligatoires.");return;}

  const r=await sb.from("payment_transactions").insert({
    member_id,amount,payment_method,reference,payment_month,status,note
  });
  if(r.error){alert(r.error.message);return;}

  alert("Transaction enregistrée.");
  $("paymentTransactionForm").reset();
  $("paymentStatus").value="pending";
  const d=new Date();
  $("paymentMonth").value=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");
  await loadPaymentTransactions();
}

async function loadPaymentTransactions(){
  const r=await sb.from("payment_transactions")
    .select("id,member_id,amount,payment_method,reference,payment_month,status,note,created_at,confirmed_at,members(member_number,first_name,last_name)")
    .order("created_at",{ascending:false});
  if(r.error){alert(r.error.message);return;}
  const rows=r.data||[];
  const pending=rows.filter(x=>x.status==="pending").length;
  const confirmed=rows.filter(x=>x.status==="confirmed").reduce((s,x)=>s+Number(x.amount||0),0);
  const cancelled=rows.filter(x=>x.status==="cancelled").length;

  $("pendingPayments").textContent=pending;
  $("confirmedPayments").textContent=formatMoney(confirmed);
  $("cancelledPayments").textContent=cancelled;

  $("paymentTransactionRows").innerHTML=rows.length?rows.map(x=>{
    const method=x.payment_method==="wave"?"🌊 Wave":"🟠 Orange Money";
    const status=x.status==="confirmed"?"<span class='status-pill paid-pill'>✅ CONFIRMÉ</span>":
      x.status==="cancelled"?"<span class='status-pill unpaid-pill'>❌ ANNULÉ</span>":
      "<span class='status-pill pending-pill'>⏳ EN ATTENTE</span>";
    return `<tr>
      <td><strong>${esc(x.members?.member_number||"")}</strong><br>${esc((x.members?.first_name||"")+" "+(x.members?.last_name||""))}</td>
      <td>${esc(formatMoney(x.amount))}</td><td>${method}</td>
      <td>${esc(x.reference||"—")}</td><td>${esc(contributionMonthLabel(x.payment_month))}</td>
      <td>${status}</td>
      <td>${esc(x.confirmed_at?new Date(x.confirmed_at).toLocaleDateString("fr-FR"):new Date(x.created_at).toLocaleDateString("fr-FR"))}</td>
      <td>
        ${x.status==="pending"?`<button class="table-btn" data-action="confirm-payment" data-id="${esc(x.id)}">✅ Confirmer</button>
        <button class="table-btn danger-btn" data-action="cancel-payment" data-id="${esc(x.id)}">❌ Annuler</button>`:""}
      </td>
    </tr>`;
  }).join(""):'<tr><td colspan="8">Aucune transaction.</td></tr>';
}





async function confirmPaymentTransaction(x) {
  if (!sb || !isAdmin) {
    alert("Action réservée à l'administrateur.");
    return;
  }

  if (!x || !x.id) {
    alert("Identifiant de transaction manquant.");
    return;
  }

  if (x.status !== "pending") {
    alert("Seules les transactions en attente peuvent être confirmées.");
    await loadPaymentTransactions();
    return;
  }

  if (!confirm("Confirmer cette transaction et enregistrer sa cotisation ?")) {
    return;
  }

  const result = await sb.rpc("confirm_payment_transaction", {
    p_transaction_id: x.id
  });

  if (result.error) {
    alert("Confirmation impossible : " + result.error.message);
    await loadPaymentTransactions();
    return;
  }

  const outcome = result.data?.status;

  if (outcome !== "confirmed" && outcome !== "already_confirmed") {
    alert("Résultat inattendu. Vérifie l'état de la transaction avant de recommencer.");
    await loadPaymentTransactions();
    return;
  }

  alert(
    outcome === "already_confirmed"
      ? "Cette transaction était déjà confirmée."
      : "Paiement confirmé et cotisation enregistrée."
  );

  await loadPaymentTransactions();
  await loadContributions();
  await loadFinanceDashboard();
  await loadUnpaidTracker();
}


async function cancelPaymentTransaction(id){
  if(!sb||!isAdmin||!confirm("Annuler cette transaction en attente ?"))return;
  const r=await sb.from("payment_transactions").update({status:"cancelled"}).eq("id",id).eq("status","pending").select("id").maybeSingle();
  if(r.error){alert(r.error.message);return;}
  if(!r.data){alert("Cette transaction n'est plus en attente. Actualise la liste.");}
  await loadPaymentTransactions();
}

async function loadCommissions(){
  if(!sb||!isAdmin)return;
  const box=$('commissionRows');
  if(!box)return;
  box.innerHTML='<tr><td colspan="6">Chargement des commissions…</td></tr>';
  try{
    const cr=await sb.from('commissions')
      .select('id,name,description,responsible_member_id,successor_member_id,is_active')
      .order('name');
    if(cr.error){
      box.innerHTML='<tr><td colspan="6">Erreur Supabase : '+esc(cr.error.message)+'</td></tr>';
      msg('commissionMessage','Chargement impossible : '+cr.error.message);
      return;
    }
    const mr=await sb.from('members')
      .select('id,member_number,first_name,last_name,status')
      .order('first_name');
    const members=mr.error?[]:(mr.data||[]);
    const rows=cr.data||[];
    const memberOptions=(selected)=>'<option value="">— Non désigné —</option>'+members.map(m=>
      '<option value="'+esc(m.id)+'" '+(selected===m.id?'selected':'')+'>'+esc(m.member_number||'')+' — '+esc(m.first_name)+' '+esc(m.last_name)+'</option>'
    ).join('');
    box.innerHTML=rows.length?rows.map(c=>{
      return '<tr>'+
        '<td><strong>'+esc(c.name)+'</strong></td>'+
        '<td>'+esc(c.description||'—')+'</td>'+
        '<td><select aria-label="Responsable de '+esc(c.name)+'" data-commission-responsible="'+esc(c.id)+'" '+(mr.error?'disabled':'')+'>'+memberOptions(c.responsible_member_id)+'</select></td>'+
        '<td><select aria-label="Successeur de '+esc(c.name)+'" data-commission-successor="'+esc(c.id)+'" '+(mr.error?'disabled':'')+'>'+memberOptions(c.successor_member_id)+'</select></td>'+
        '<td>'+(c.is_active?'Active':'Inactive')+'</td>'+
        '<td><button type="button" class="table-btn" data-action="assign-commission" data-id="'+esc(c.id)+'" '+(mr.error?'disabled':'')+'>Enregistrer</button> <button type="button" class="table-btn danger-btn" data-action="toggle-commission" data-id="'+esc(c.id)+'" data-active="'+String(c.is_active)+'">'+(c.is_active?'Désactiver':'Activer')+'</button></td>'+
      '</tr>';
    }).join(''):'<tr><td colspan="6">Aucune commission trouvée dans la base de données.</td></tr>';
    if(mr.error)msg('commissionMessage','Les '+rows.length+' commissions sont affichées, mais les membres ne peuvent pas être chargés : '+mr.error.message);
    else msg('commissionMessage',rows.length+' commission(s) chargée(s). Choisis un responsable et un successeur pour chaque commission.',true);
  }catch(err){
    box.innerHTML='<tr><td colspan="6">Erreur inattendue : '+esc(err?.message||String(err))+'</td></tr>';
    msg('commissionMessage','Erreur pendant le chargement : '+(err?.message||String(err)));
  }
}
async function saveCommission(e){
  e.preventDefault();
  if(!sb||!isAdmin)return;
  const name=$('commissionName').value.trim();
  const description=$('commissionDescription').value.trim();
  if(!name){msg('commissionMessage','Le nom de la commission est obligatoire.');return;}
  const r=await sb.from('commissions').insert({name,description,is_active:true});
  if(r.error){msg('commissionMessage','Erreur : '+r.error.message);return;}
  $('commissionForm').reset();
  msg('commissionMessage','Commission ajoutée.',true);
  await loadCommissions();
}
async function assignCommission(id){
  if(!sb||!isAdmin)return;
  const responsible=document.querySelector('[data-commission-responsible="'+CSS.escape(id)+'"]');
  const successor=document.querySelector('[data-commission-successor="'+CSS.escape(id)+'"]');
  if(!responsible||!successor)return;
  if(responsible.value&&successor.value&&responsible.value===successor.value){
    msg('commissionMessage','Le responsable et son successeur doivent être deux membres différents.');
    return;
  }
  const r=await sb.from('commissions').update({
    responsible_member_id:responsible.value||null,
    successor_member_id:successor.value||null
  }).eq('id',id);
  if(r.error){msg('commissionMessage','Enregistrement impossible : '+r.error.message);return;}
  msg('commissionMessage','Responsable et successeur enregistrés.',true);
  await loadCommissions();
}
async function toggleCommission(id,active){
  if(!sb||!isAdmin)return;
  const next=!active;
  if(!confirm((next?'Activer':'Désactiver')+' cette commission ?'))return;
  const r=await sb.from('commissions').update({is_active:next}).eq('id',id);
  if(r.error){msg('commissionMessage','Modification impossible : '+r.error.message);return;}
  await loadCommissions();
}

async function loadMembershipRequests() {
  if (!sb || !isAdmin) return;

  const box = document.getElementById('membershipRequestRows');
  if (!box) {
    console.warn("La zone membershipRequestRows n'existe pas encore dans index.html.");
    return;
  }

  const r = await sb
    .from('membership_requests')
    .select('id, first_name, last_name, phone, email, note, commission_id, commissions(name), status, created_at')
    .order('created_at', { ascending: false });

  if (r.error) {
    box.innerHTML =
      '<tr><td colspan="6">Erreur : ' + esc(r.error.message) + '</td></tr>';
    return;
  }

  const requests = r.data || [];

  box.innerHTML = requests.length
    ? requests.map(x => `
        <tr>
          <td>${esc(x.first_name)} ${esc(x.last_name)}</td>
          <td>${esc(x.phone)}</td>
          <td>${esc(x.email || '—')}</td>
          <td>${esc(x.commissions?.name || '—')}</td>
          <td>${esc(x.status === 'pending' ? 'En attente' :
                     x.status === 'approved' ? 'Approuvée' : 'Refusée')}</td>
          <td>
            ${x.status === 'pending'
              ? `<button class="table-btn"
                  data-action="approve-request" data-id="${esc(x.id)}">
                  Valider
                </button>
                <button class="table-btn danger-btn"
                  data-action="reject-request" data-id="${esc(x.id)}">
                  Refuser
                </button>`
              : '—'}
          </td>
        </tr>
      `).join('')
    : '<tr><td colspan="6">Aucune demande pour le moment.</td></tr>';
}
async function loadPublicCommissions(){
  const select=$('requestCommission');
  if(!select||!sb)return;
  const fallbackOptions=select.innerHTML;
  const r=await sb.from('commissions')
    .select('id,name')
    .eq('is_active',true)
    .order('name');
  if(r.error){
    // Conserver les 7 choix préchargés dans la page si l'API est temporairement indisponible.
    if(!select.options.length||select.options.length<2)select.innerHTML=fallbackOptions;
    msg('membershipRequestMessage','Liste préchargée affichée. Actualisation Supabase impossible : '+r.error.message);
    return;
  }
  const rows=r.data||[];
  if(rows.length){
    select.innerHTML='<option value="">Choisir une commission *</option>'+
      rows.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.name)+'</option>').join('');
    select.disabled=false;
  }else{
    msg('membershipRequestMessage','Aucune commission active disponible dans la base.');
  }
}
async function submitMembershipRequest(e) {
  e.preventDefault();

  const first_name = $('requestFirstName').value.trim();
  const last_name = $('requestLastName').value.trim();
  const phone = $('requestPhone').value.trim();
  const email = $('requestEmail').value.trim() || null;
  const note = $('requestNote').value.trim() || null;
  const commission_id = $('requestCommission').value || null;

  if (!first_name || !last_name || !phone || !commission_id) {
    msg('membershipRequestMessage', 'Remplis les champs obligatoires et choisis une commission.');
    return;
  }

  if (!sb) {
    msg('membershipRequestMessage', 'Connexion à la base de données indisponible.');
    return;
  }

  const button = e.target.querySelector('button[type="submit"]');
  button.disabled = true;

  try {
    const r = await sb.from('membership_requests').insert({
      first_name,
      last_name,
      phone,
      email,
      note,
      commission_id,
      status: 'pending'
    });

    if (r.error) {
      msg('membershipRequestMessage', 'Erreur : ' + r.error.message);
      return;
    }

    msg(
      'membershipRequestMessage',
      'Demande envoyée avec succès. Elle sera examinée par l’administrateur.',
      true
    );
    e.target.reset();
  } finally {
    button.disabled = false;
  }
}
async function approveMembershipRequest(id) {
  if (!sb || !isAdmin) {
    alert("Réservé à l'administrateur.");
    return;
  }

  if (!confirm("Valider cette demande et créer la carte de membre ?")) return;

  const r = await sb
    .from('membership_requests')
    .select('id, first_name, last_name, phone, email, commission_id, status')
    .eq('id', id)
    .eq('status', 'pending')
    .single();

  if (r.error || !r.data) {
    alert("Demande introuvable ou déjà traitée.");
    await loadMembershipRequests();
    return;
  }

  const x = r.data;

  const created = await sb.from('members').insert({
    first_name: x.first_name,
    last_name: x.last_name,
    phone: x.phone || null,
    email: x.email || null,
    commission_id: x.commission_id || null
  }).select('id, member_number').single();

  if (created.error) {
    alert("Impossible de créer le membre : " + created.error.message);
    return;
  }

  const updated = await sb
    .from('membership_requests')
    .update({
      status: 'approved',
      reviewed_at: new Date().toISOString(),
      reviewed_by: currentUser.id
    })
    .eq('id', id)
    .eq('status', 'pending');

  if (updated.error) {
    alert(
      "Le membre " + created.data.member_number +
      " a été créé, mais la demande n'a pas pu être mise à jour. " +
      "Ne valide pas une deuxième fois. Erreur : " + updated.error.message
    );
    await loadMembers();
    await loadMembershipRequests();
    return;
  }

  alert("Demande validée. Numéro du membre : " + created.data.member_number);

  await loadMembers();
  await loadMembershipRequests();
}

async function rejectMembershipRequest(id) {
  if (!sb || !isAdmin) {
    alert("Réservé à l'administrateur.");
    return;
  }

  if (!confirm("Veux-tu vraiment refuser cette demande ?")) return;

  const r = await sb
    .from('membership_requests')
    .update({
      status: 'rejected',
      reviewed_at: new Date().toISOString(),
      reviewed_by: currentUser.id
    })
    .eq('id', id)
    .eq('status', 'pending')
    .select('id');

  if (r.error) {
    alert("Erreur : " + r.error.message);
    return;
  }

  if (!r.data || r.data.length === 0) {
    alert("Cette demande a déjà été traitée ou n'existe plus.");
  } else {
    alert("Demande refusée.");
  }

  await loadMembershipRequests();
}





// Actions de tableaux : aucun JavaScript utilisateur n'est injecté dans les attributs HTML.
document.addEventListener('click', async function(e) {
  const button = e.target.closest('[data-action]');
  if (!button) return;
  const id = button.dataset.id;
  if (!id) return;
  if (!isAdmin) {
    alert("Action réservée à l'administrateur.");
    return;
  }
  switch (button.dataset.action) {
    case 'edit-content': startEditContent(id); break;
    case 'delete-content': {
      if(!confirm('Supprimer définitivement ce contenu ?'))break;
      const removed=await sb.from('contents').delete().eq('id',id);
      if(removed.error){alert('Suppression impossible : '+removed.error.message);break;}
      await load();
      break;
    }
    case 'print-receipt': {
      const r = await sb.from('contributions')
        .select('id,member_id,amount,payment_month,payment_method,status,reference,note,paid_at,members(member_number,first_name,last_name)')
        .eq('id', id).maybeSingle();
      if (r.error || !r.data) { alert("Cotisation introuvable."); return; }
      printContributionReceipt(r.data);
      break;
    }
    case 'delete-contribution': deleteContribution(id); break;
    case 'edit-member': editMember(id); break;
    case 'show-member-card': {
      const r = await sb.from('members')
        .select('id,member_number,first_name,last_name,phone,email,status,membership_date,photo_url')
        .eq('id', id).maybeSingle();
      if (r.error || !r.data) { alert("Membre introuvable."); return; }
      showMemberCard(r.data);
      break;
    }
    case 'member-history': {
      const r = await sb.from('members')
        .select('id,member_number,first_name,last_name')
        .eq('id', id).maybeSingle();
      if (r.error || !r.data) { alert("Membre introuvable."); return; }
      viewMemberContributions(r.data);
      break;
    }
    case 'prefill-contribution': {
      const r = await sb.from('members').select('id').eq('id', id).maybeSingle();
      if (r.error || !r.data) { alert("Membre introuvable."); return; }
      prefillContribution(r.data, button.dataset.month || currentYM());
      break;
    }
    case 'confirm-payment': {
      const r = await sb.from('payment_transactions')
        .select('id,status').eq('id', id).maybeSingle();
      if (r.error || !r.data) { alert("Transaction introuvable."); return; }
      confirmPaymentTransaction(r.data);
      break;
    }
    case 'cancel-payment': cancelPaymentTransaction(id); break;
    case 'assign-commission': assignCommission(id); break;
    case 'toggle-commission': toggleCommission(id,button.dataset.active==='true'); break;
    case 'approve-request': approveMembershipRequest(id); break;
    case 'reject-request': rejectMembershipRequest(id); break;
  }
});
