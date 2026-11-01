let sb=null,currentUser=null,currentMemberRecord=null,isAdmin=false,signupMode=false;
const $=id=>document.getElementById(id), show=id=>$(id).classList.remove('hidden'), hide=id=>$(id).classList.add('hidden');
function openAuth(){show('authModal')} function closeAuth(){hide('authModal')}

function setAdminUI(){
  const sections=['adminDashboard','admin','members','commissions','membershipRequests','contributions','paymentTransactions','unpaidMembers','financeDashboard','posters'];
  const navs=['dashboardNav','adminNav','membersNav','commissionsNav','membershipRequestsNav','contributionsNav','paymentsNav','unpaidNav','financeNav','postersNav'];
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
  const allowed=['adminDashboard','admin','members','commissions','membershipRequests','contributions','paymentTransactions','unpaidMembers','financeDashboard','posters'];
  if(!allowed.includes(id))return;
  allowed.forEach(hide);
  show(id);
  const link=document.querySelector('[data-admin-target="'+id+'"]');
  document.querySelectorAll('.app-sidebar nav a').forEach(a=>a.classList.remove('active'));
  if(link)link.classList.add('active');
  if(id==='adminDashboard')updateAdminDashboard();
  if(id==='members')void loadMembers();
  if(id==='commissions')void loadCommissions();
  if(id==='membershipRequests')void loadMembershipRequests();
}
async function updatePendingMembershipCount(){
  if(!sb||!isAdmin)return;
  const r=await sb.from('membership_requests').select('id',{count:'exact',head:true}).eq('status','pending');
  if(r.error){console.warn('Comptage des demandes impossible :',r.error.message);return;}
  const n=Number(r.count||0);
  const d=$('dashPending');if(d)d.textContent=String(n);
  const badge=$('membershipRequestBadge');
  if(badge){badge.textContent=String(n);badge.classList.toggle('hidden',n===0);badge.setAttribute('aria-label',n+' demande(s) en attente');}
}
function updateAdminDashboard(){
  const copy=(from,to)=>{const a=$(from),b=$(to);if(a&&b)b.textContent=a.textContent};
  copy('memberCount','dashMembers');
  copy('contributionMonthTotal','dashContributions');
  copy('pendingPayments','dashPayments');
  void updatePendingMembershipCount();
}
document.addEventListener('click',e=>{
  const button=e.target.closest('[data-action="export-members"],[data-action="export-commissions"]');
  if(!button||!isAdmin)return;
  if(button.dataset.action==='export-members')void exportMembersCSV();
  if(button.dataset.action==='export-commissions')void exportCommissionsCSV();
});
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
    ? await sb.auth.signUp({email,password,options:{emailRedirectTo:window.location.href}})
    : await sb.auth.signInWithPassword({email,password});

  if(r.error){
    msg('authMessage',r.error.message);
    return;
  }

  if(signupMode){
    msg('authMessage','Compte créé. Vérifie ta boîte e-mail et confirme ton adresse. Utilise exactement la même adresse que dans ta demande d’adhésion. Après validation par le Dahira, reconnecte-toi pour accéder à ton espace membre.',true);
  }else{
    msg('authMessage','Connexion réussie.',true);
    setTimeout(closeAuth,500);
  }
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
    renderAdminCharters(rows);
  }
}

function renderAdminCharters(rows){
  const box=$('adminChartersList');
  if(!box)return;
  const charters=(rows||[]).filter(x=>x.type==='charte'&&x.published);
  if(!charters.length){
    box.innerHTML='<p class="loading">Aucune charte publiée pour le moment.</p>';
    return;
  }
  box.innerHTML=charters.map((x,index)=>{
    const pdf=(x.file_url||'').startsWith('https://')||(x.file_url||'').startsWith('http://')?x.file_url:'';
    const external=(x.external_url||'').startsWith('https://')||(x.external_url||'').startsWith('http://')?x.external_url:'';
    const actions=[
      pdf?'<a class="pdf-download" href="'+esc(pdf)+(pdf.includes('?')?'&':'?')+'download=Reglement-Daara-Jazbul-Qulub.pdf">⬇ Télécharger le PDF original</a>':'',
      external?'<a href="'+esc(external)+'" target="_blank" rel="noopener">Ouvrir le lien complémentaire</a>':''
    ].filter(Boolean).join(' ');
    return '<article class="card admin-charter-card"><span class="tag">📜 Charte publiée</span><h3>'+esc(x.title)+'</h3><p>'+esc(x.description||'')+'</p>'+(x.charter_text?'<div class="charter-full-text" aria-label="Texte intégral du règlement">'+esc(x.charter_text)+'</div>':'<p class="loading">Le texte intégral n’est pas encore renseigné.</p>')+'<div class="charter-pdf-actions">'+(actions||'<span>Document PDF non joint.</span>')+'</div></article>';
  }).join('');
}

function contentCard(x){
  const icon={khasside:'📖',audio:'🎧',video:'🎥',cours:'📚',annonce:'📢',information:'ℹ️',charte:'📜'}[x.type]||'📄';
  const external=(x.external_url||'').match(/^https?:\/\//i)?'<a target="_blank" rel="noopener" href="'+esc(x.external_url)+'">Ouvrir le lien →</a>':'';
  const pdf=(x.file_url||'').match(/^https?:\/\//i)?'<a class="pdf-download" href="'+esc(x.file_url)+(x.file_url.includes('?')?'&':'?')+'download=Reglement-Daara-Jazbul-Qulub.pdf">⬇️ Télécharger le PDF original</a>':'';
  const charterText=x.type==='charte'&&x.charter_text?'<div class="charter-full-text" aria-label="Texte intégral du règlement">'+esc(x.charter_text)+'</div>':'';
  return '<article class="card"><span class="tag">'+icon+' '+esc(contentTypeLabel(x.type))+'</span><h3>'+esc(x.title)+'</h3><p>'+esc(x.description||'')+'</p>'+charterText+pdf+external+'</article>';
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
  const info=$('pdfCurrentInfo');if(info)info.textContent='PDF facultatif — 15 Mo maximum.';
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
  if($('charterText'))$('charterText').value=x.charter_text||'';
  $('external_url').value=x.external_url||'';
  const info=$('pdfCurrentInfo');
  if(info)info.innerHTML=x.file_url?'<a href="'+esc(x.file_url)+'" target="_blank" rel="noopener">PDF actuellement associé : consulter</a>':'Aucun PDF associé pour le moment.';
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
  const pdfFile=$('contentPdf')?.files?.[0]||null;
  if(pdfFile && (pdfFile.type!=='application/pdf' || !pdfFile.name.toLowerCase().endsWith('.pdf'))){
    msg('formMessage',"Le fichier choisi doit être un document PDF.");return;
  }
  if(pdfFile && pdfFile.size>15*1024*1024){msg('formMessage',"Le PDF dépasse la limite de 15 Mo.");return;}
  button.disabled=true;
  button.textContent=id?'Enregistrement…':'Publication…';
  if(status)status.textContent='';
  try{
    let fileUrl=null;
    if(pdfFile){
      const safeName=pdfFile.name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]/g,'-').slice(-90);
      const filePath='charters/'+Date.now()+'-'+Math.random().toString(36).slice(2,9)+'-'+safeName;
      const upload=await sb.storage.from('dahira-documents').upload(filePath,pdfFile,{upsert:false,contentType:'application/pdf'});
      if(upload.error){msg('formMessage',"Envoi du PDF impossible : "+upload.error.message);return;}
      fileUrl=sb.storage.from('dahira-documents').getPublicUrl(filePath).data.publicUrl;
    }
    const payload={
      type:$('type').value,title,description:$('description').value.trim(),
      charter_text:$('type').value==='charte'?($('charterText')?.value||'').trim()||null:null,
      external_url:$('external_url').value.trim()||null,
      ...(fileUrl?{file_url:fileUrl}:{}),published:true
    };
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

let posterImages={logo:null,event:null,marabout:null};
function posterLoadImage(file){
 return new Promise((resolve,reject)=>{
  if(!file){resolve(null);return}
  if(!file.type.startsWith('image/')){reject(new Error('Veuillez choisir un fichier image.'));return}
  if(file.size>8*1024*1024){reject(new Error('Chaque image doit faire moins de 8 Mo.'));return}
  const reader=new FileReader();
  reader.onload=()=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('Cette image ne peut pas être lue.'));img.src=reader.result};
  reader.onerror=()=>reject(new Error('Lecture du fichier impossible.'));
  reader.readAsDataURL(file);
 });
}
function posterCrop(ctx,img,x,y,w,h,radius=0){
 if(!img)return;
 ctx.save();
 if(radius){ctx.beginPath();ctx.roundRect(x,y,w,h,radius);ctx.clip()}
 const scale=Math.max(w/img.width,h/img.height),sw=w/scale,sh=h/scale,sx=(img.width-sw)/2,sy=(img.height-sh)/2;
 ctx.drawImage(img,sx,sy,sw,sh,x,y,w,h);
 ctx.restore();
}
function posterText(ctx,text,x,y,maxWidth,lineHeight,maxLines=3){
 const words=String(text||'').trim().split(/\s+/);let line='',lines=[];
 for(const word of words){const test=line?line+' '+word:word;if(ctx.measureText(test).width>maxWidth&&line){lines.push(line);line=word}else line=test}
 if(line)lines.push(line);
 lines.slice(0,maxLines).forEach((v,i)=>ctx.fillText(v,x,y+i*lineHeight));
 return Math.min(lines.length,maxLines);
}
function drawPoster(){
 const canvas=$('posterCanvas');if(!canvas)return;
 const ctx=canvas.getContext('2d'),W=1080,H=1350;
 const green=ctx.createLinearGradient(0,0,W,H);green.addColorStop(0,'#063c25');green.addColorStop(.55,'#08723e');green.addColorStop(1,'#022d20');
 ctx.fillStyle=green;ctx.fillRect(0,0,W,H);
 ctx.strokeStyle='#d9b95c';ctx.lineWidth=12;ctx.strokeRect(28,28,W-56,H-56);
 ctx.strokeStyle='rgba(231,203,119,.45)';ctx.lineWidth=2;ctx.strokeRect(48,48,W-96,H-96);
 ctx.fillStyle='#e8cb78';ctx.textAlign='center';ctx.font='bold 30px Georgia';ctx.fillText('DAARA JAZBUL QULUB',W/2,105);
 ctx.fillStyle='#fff';ctx.font='bold 58px Georgia';posterText(ctx,$('posterTitle')?.value||'VOTRE ÉVÉNEMENT',W/2,190,900,68,2);
 ctx.fillStyle='#f0d98d';ctx.font='30px Arial';posterText(ctx,$('posterSubtitle')?.value||'Vous êtes cordialement invités',W/2,320,900,40,2);
 if(posterImages.event){posterCrop(ctx,posterImages.event,100,400,880,450,28);ctx.strokeStyle='#e4c56b';ctx.lineWidth=7;ctx.strokeRect(100,400,880,450)}
 else{ctx.fillStyle='rgba(255,255,255,.08)';ctx.beginPath();ctx.roundRect(100,400,880,450,28);ctx.fill();ctx.fillStyle='#d9c58d';ctx.font='34px Arial';ctx.fillText('PHOTO DE L’ÉVÉNEMENT',W/2,635)}
 const py=890;ctx.fillStyle='#fff9e9';ctx.beginPath();ctx.roundRect(95,py,890,220,28);ctx.fill();
 ctx.textAlign='left';ctx.fillStyle='#075331';ctx.font='bold 34px Arial';ctx.fillText('LIEU',145,py+58);
 ctx.fillStyle='#183c2a';ctx.font='32px Arial';posterText(ctx,$('posterPlace')?.value||'Lieu à préciser',145,py+105,780,40,2);
 ctx.fillStyle='#075331';ctx.font='bold 30px Arial';ctx.fillText('DATE',145,py+170);
 ctx.fillStyle='#183c2a';ctx.font='29px Arial';
 const dv=$('posterDate')?.value;let dt='Date à préciser';if(dv){const d=new Date(dv+'T12:00:00');dt=new Intl.DateTimeFormat('fr-FR',{day:'numeric',month:'long',year:'numeric'}).format(d)}
 ctx.fillText(dt,260,py+170);ctx.fillStyle='#075331';ctx.font='bold 30px Arial';ctx.fillText('HEURE',650,py+170);
 ctx.fillStyle='#183c2a';ctx.font='29px Arial';ctx.fillText($('posterTime')?.value||'À préciser',790,py+170);
 if(posterImages.marabout){ctx.save();ctx.beginPath();ctx.arc(220,1195,78,0,Math.PI*2);ctx.clip();posterCrop(ctx,posterImages.marabout,142,1117,156,156);ctx.restore();ctx.strokeStyle='#e6c66d';ctx.lineWidth=6;ctx.beginPath();ctx.arc(220,1195,82,0,Math.PI*2);ctx.stroke()}
 if(posterImages.logo)posterCrop(ctx,posterImages.logo,850,1110,130,130,65);
 else{ctx.fillStyle='#e6c66d';ctx.beginPath();ctx.arc(915,1175,65,0,Math.PI*2);ctx.fill();ctx.fillStyle='#075331';ctx.font='bold 24px Arial';ctx.textAlign='center';ctx.fillText('DJQ',915,1184)}
 ctx.fillStyle='#f4dfa0';ctx.textAlign='center';ctx.font='bold 22px Arial';ctx.fillText('ENSEMBLE DANS LA FOI ET LE PARTAGE',W/2,1300);ctx.textAlign='left';
}
function initPosterGenerator(){
 const form=$('posterForm');if(!form)return;
 const logo=new Image();logo.onload=()=>{if(!posterImages.logo){posterImages.logo=logo;drawPoster()}};logo.src='logo.jpeg';
 ['posterTitle','posterSubtitle','posterPlace','posterDate','posterTime'].forEach(id=>$(id)?.addEventListener('input',drawPoster));
 [['posterLogo','logo'],['posterEventPhoto','event'],['posterMaraboutPhoto','marabout']].forEach(([id,key])=>{
  $(id)?.addEventListener('change',async e=>{
   const file=e.target.files?.[0];if(!file){if(key==='logo')posterImages.logo=null;else posterImages[key]=null;drawPoster();return}
   try{posterImages[key]=await posterLoadImage(file);$('posterMessage').textContent='Image ajoutée.';drawPoster()}
   catch(err){e.target.value='';$('posterMessage').textContent=err.message}
  });
 });
 $('posterDownloadBtn')?.addEventListener('click',()=>{
  const title=($('posterTitle').value||'affiche-daara').trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'affiche-daara';
  try{const a=document.createElement('a');a.download=title+'.png';a.href=$('posterCanvas').toDataURL('image/png');a.click();$('posterMessage').textContent='Affiche téléchargée. Vous pouvez la partager.'}
  catch(e){$('posterMessage').textContent='Impossible de télécharger l’affiche.'}
 });
 $('posterResetBtn')?.addEventListener('click',()=>{
  form.reset();posterImages={logo:null,event:null,marabout:null};
  const img=new Image();img.onload=()=>{posterImages.logo=img;drawPoster()};img.src='logo.jpeg';
  $('posterMessage').textContent='Formulaire réinitialisé.';drawPoster();
 });
 drawPoster();
}

async function init(){
 const c=window.DJQ_CONFIG;
 $('loginBtn').onclick=openAuth;$('logoutBtn').onclick=async()=>{await sb.auth.signOut();location.reload()};
 $('switchAuth').onclick=()=>{signupMode=!signupMode;$('authTitle').textContent=signupMode?'Créer un compte gratuit':'Connexion';$('authSubmit').textContent=signupMode?'Créer mon compte':'Se connecter';$('switchAuth').textContent=signupMode?'J’ai déjà un compte':'Créer un compte gratuit'};
 $('closeMemberFinance').onclick=()=>hide('memberFinanceModal');
 initPosterGenerator();
 $('printCardBtn').onclick=()=>window.print();
 $('myMemberCardBtn')?.addEventListener('click',()=>void showMyMemberCard());
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
 sb.auth.onAuthStateChange((event,session)=>{if(event!=='SIGNED_IN'&&event!=='SIGNED_OUT')return;setTimeout(()=>{void setUser(session?.user||null)},0)});const s=await sb.auth.getSession();if(s.data.session)await setUser(s.data.session.user);load();await handlePublicMember();
}
async function setUser(u){
  currentUser=u;

  if(!u){
    currentMemberRecord=null;
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
    .select('id,member_number,first_name,last_name,phone,email,status,membership_date,photo_url,commission_id')
    .eq('auth_user_id',u.id)
    .maybeSingle();

  if(mr.error){
    alert('Erreur de chargement du profil : '+mr.error.message);
    return;
  }

  if(mr.data && mr.data.commission_id){
    const commissionResult=await sb.from('commissions')
      .select('name,description,responsible_member_id,successor_member_id')
      .eq('id',mr.data.commission_id)
      .maybeSingle();
    if(commissionResult.error){
      console.error('Chargement commission:',commissionResult.error.message);
    }
    mr.data.commissions=commissionResult.data||null;
  }

  if(mr.data && mr.data.status!=='active' && !isAdmin){
    alert("Ton accès à l’espace membre a été suspendu par l’administration. Contacte le responsable du Daara.");
    await sb.auth.signOut();
    hide('memberDashboard');
    hide('logoutBtn');
    show('loginBtn');
    show('membershipFormSection');
    return;
  }
  if(mr.data && mr.data.status==='active' && !isAdmin){
    currentMemberRecord=mr.data;
    hide('membershipFormSection');
    await loadConnectedMemberDashboard(mr.data);
  }else if(isAdmin){
    currentMemberRecord=mr.data?.status==='active'?mr.data:null;
    hide('memberDashboard');
    hide('membershipFormSection');
  }else{
    currentMemberRecord=null;
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

  // Commission personnelle : relire directement la commission liée à la fiche membre.
  // Cela évite de dépendre d'une ancienne relation ou d'un objet incomplet transmis à la fonction.
  const commissionName=$('myCommissionName');
  const commissionDescription=$('myCommissionDescription');
  const commissionRole=$('myCommissionRole');
  let commission=null;
  if(member.commission_id){
    const commissionResult=await sb.from('commissions')
      .select('id,name,description,responsible_member_id,successor_member_id')
      .eq('id',member.commission_id)
      .maybeSingle();
    if(commissionResult.error){
      if(commissionName)commissionName.textContent='Erreur de chargement';
      if(commissionDescription)commissionDescription.textContent=commissionResult.error.message;
    }else{
      commission=commissionResult.data||null;
    }
  }
  if(commissionName)commissionName.textContent=commission?.name||'Aucune commission attribuée';
  if(commissionDescription)commissionDescription.textContent=commission?.description||'Aucune description disponible pour le moment.';
  if(commissionRole){
    const roles=[];
    if(commission?.responsible_member_id===member.id)roles.push('Président de commission');
    if(commission?.successor_member_id===member.id)roles.push('Vice-président / successeur');
    commissionRole.textContent=roles.length?roles.join(' · '):(commission?'Membre de la commission':'—');
  }

  // Annuaire complet des commissions actives du Dahira.
  const allCommissionsBox=$('memberAllCommissions');
  if(allCommissionsBox){
    allCommissionsBox.textContent='Chargement des commissions…';
    const allCommissions=await sb.from('commissions')
      .select('id,name,description,is_active')
      .eq('is_active',true)
      .order('name');
    if(allCommissions.error){
      allCommissionsBox.textContent='Impossible de charger les commissions : '+allCommissions.error.message;
    }else{
      const rows=allCommissions.data||[];
      allCommissionsBox.innerHTML=rows.length
        ?'<p class="muted">'+rows.length+' commission(s) active(s) dans le Dahira</p>'+
          rows.map(c=>'<article class="member-commission-item"><h4>'+esc(c.name)+'</h4><p>'+esc(c.description||'Description à venir.')+'</p></article>').join('')
        :'Aucune commission active pour le moment.';
    }
  }

  // Cotisations personnelles
  const cr=await sb.from('contributions')
    .select('id,amount,payment_month,payment_method,status,paid_at,created_at')
    .eq('member_id',member.id)
    .order('payment_month',{ascending:false});

  if(cr.error){
    $('myContributionRows').innerHTML='<tr><td colspan="5">Impossible de charger vos cotisations : '+esc(cr.error.message)+'</td></tr>';
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

  // Informations et chartes : utiliser la même source que le gestionnaire de contenus.
  const ir=await sb.from('contents')
    .select('title,description')
    .eq('type','information')
    .eq('published',true)
    .order('created_at',{ascending:false});

  const infoBox=$('memberDahiraInformation');
  if(infoBox){
    infoBox.innerHTML=ir.error
      ?'Erreur de chargement.'
      :(ir.data||[]).map(x=>`
        <article><h4>${esc(x.title)}</h4><p>${esc(x.description||'')}</p></article>
      `).join('')||'Aucune information publiée pour le moment.';
  }

  const hr=await sb.from('contents')
    .select('title,description,external_url,file_url,charter_text')
    .eq('type','charte')
    .eq('published',true)
    .order('created_at',{ascending:false});

  const charterBox=$('memberDahiraCharters');
  if(charterBox){
    charterBox.innerHTML=hr.error
      ?'Erreur de chargement.'
      :(hr.data||[]).map((x,index)=>{
        const url=(x.external_url||'').startsWith('https://')||(x.external_url||'').startsWith('http://')?x.external_url:'';
        const pdfUrl=(x.file_url||'').startsWith('https://')||(x.file_url||'').startsWith('http://')?x.file_url:'';
        const downloadUrl=pdfUrl+(pdfUrl.includes('?')?'&':'?')+'download='+encodeURIComponent('Charte-'+(index+1)+'.pdf');
        return `<article class="member-charter">
          <h4>📜 ${esc(x.title)}</h4>
          <p>${esc(x.description||'')}</p>
          ${x.charter_text?`<div class="charter-full-text" aria-label="Texte intégral du règlement">${esc(x.charter_text)}</div>`:''}
          ${url?`<p><a href="${esc(url)}" target="_blank" rel="noopener">Ouvrir le lien complémentaire ↗</a></p>`:''}
          ${pdfUrl?`<div class="charter-pdf-actions">
            <a class="pdf-download" href="${esc(downloadUrl)}">⬇️ Télécharger le PDF original</a>
          </div>`:''}
        </article>`;
      }).join('')||'Aucune charte publiée pour le moment.';
  }
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

function safeExportCell(value){
  const text=String(value??'');
  return csvCell(/^[\s\u0000-\u001f]*[=+@-]/.test(text) ? "'"+text : text);
}

function downloadAdminCSV(filename,headers,rows){
  const lines=[headers,...rows].map(row=>row.map(safeExportCell).join(';'));
  const blob=new Blob(["\ufeff"+lines.join('\r\n')],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');
  link.href=url;
  link.download=filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

async function exportMembersCSV(){
  if(!sb||!isAdmin)return;
  const [membersResult,commissionsResult]=await Promise.all([
    sb.from('members').select('member_number,first_name,last_name,phone,email,status,membership_date,commission_id').order('created_at',{ascending:false}),
    sb.from('commissions').select('id,name')
  ]);
  if(membersResult.error){alert('Export des membres impossible : '+membersResult.error.message);return;}
  if(commissionsResult.error){alert('Export des commissions impossible : '+commissionsResult.error.message);return;}
  const commissionById=new Map((commissionsResult.data||[]).map(c=>[c.id,c.name]));
  const rows=(membersResult.data||[]).map(m=>[
    m.member_number,m.first_name,m.last_name,m.phone,m.email,
    m.status==='active'?'Actif':'Inactif',m.membership_date,
    commissionById.get(m.commission_id)||'Aucune'
  ]);
  downloadAdminCSV('membres_daara_jazbul_qulub.csv',
    ['N° membre','Prénom','Nom','Téléphone','E-mail','Statut','Date adhésion','Commission'],rows);
  alert('Export des membres terminé : '+rows.length+' ligne(s).');
}

async function exportCommissionsCSV(){
  if(!sb||!isAdmin)return;
  const [commissionsResult,membersResult]=await Promise.all([
    sb.from('commissions').select('name,description,is_active,responsible_member_id,successor_member_id').order('name'),
    sb.from('members').select('id,first_name,last_name,member_number')
  ]);
  if(commissionsResult.error){alert('Export des commissions impossible : '+commissionsResult.error.message);return;}
  if(membersResult.error){alert('Export des commissions impossible : '+membersResult.error.message);return;}
  const memberById=new Map((membersResult.data||[]).map(m=>[m.id,
    [m.member_number,m.first_name,m.last_name].filter(Boolean).join(' ')]));
  const rows=(commissionsResult.data||[]).map(c=>[
    c.name,c.description,c.is_active?'Active':'Inactive',
    memberById.get(c.responsible_member_id)||'Non désigné',
    memberById.get(c.successor_member_id)||'Non désigné'
  ]);
  downloadAdminCSV('commissions_daara_jazbul_qulub.csv',
    ['Commission','Description','Statut','Président','Vice-président'],rows);
  alert('Export des commissions terminé : '+rows.length+' ligne(s).');
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
 if(!sb||!isAdmin)return;
 const box=$('memberRows');
 if(!box)return;
 box.innerHTML='<tr><td colspan="7">Chargement des membres…</td></tr>';
 try{
  // Charger les membres sans jointure : une relation PostgREST défectueuse ne doit pas masquer toute la liste.
  const r=await sb.from('members')
   .select('id,member_number,first_name,last_name,phone,email,status,membership_date,photo_url,commission_id,created_at')
   .order('created_at',{ascending:false});
  if(r.error){
   box.innerHTML='<tr><td colspan="7">Erreur de chargement des membres : '+esc(r.error.message)+'</td></tr>';
   msg('memberMessage','Chargement impossible : '+r.error.message);
   return;
  }
  const rows=r.data||[];
  let commissionNames={};
  const cr=await sb.from('commissions').select('id,name');
  if(!cr.error)for(const c of cr.data||[])commissionNames[c.id]=c.name;
  $('totalMemberCount').textContent=String(rows.length);
  $('memberCount').textContent=String(rows.filter(x=>x.status==='active').length);
  box.innerHTML=rows.length?rows.map(x=>'<tr><td><strong>'+esc(x.member_number)+'</strong></td><td><div class="member-mini"><img src="'+esc(x.photo_url||'logo.jpeg')+'" alt=""><span>'+esc(x.first_name)+' '+esc(x.last_name)+'</span></div></td><td>'+esc(commissionNames[x.commission_id]||'Non affecté')+'</td><td>'+esc(x.phone||'—')+'</td><td>'+esc(x.membership_date||'—')+'</td><td><span class="status '+(x.status==='active'?'active':'inactive')+'">'+(x.status==='active'?'Actif':'Inactif')+'</span></td><td><button class="table-btn" data-action="edit-member" data-id="'+esc(x.id)+'">Modifier</button> <button class="table-btn" data-action="show-member-card" data-id="'+esc(x.id)+'">Voir carte</button> <button class="table-btn" data-action="toggle-member-status" data-status="'+esc(x.status||'active')+'" data-id="'+esc(x.id)+'">'+(x.status==='active'?'Désactiver':'Réactiver')+'</button> <button class="table-btn danger-btn" data-action="delete-member" data-id="'+esc(x.id)+'">Supprimer</button></td></tr>').join(''):'<tr><td colspan="7">Aucun membre enregistré dans la base.</td></tr>';
  msg('memberMessage',rows.length+' membre(s) chargé(s).'+(cr.error?' Les commissions n’ont pas pu être récupérées : '+cr.error.message:''),!cr.error);
 }catch(err){
  box.innerHTML='<tr><td colspan="7">Erreur inattendue : '+esc(err?.message||String(err))+'</td></tr>';
  msg('memberMessage','Erreur pendant le chargement : '+(err?.message||String(err)));
 }
}

async function toggleMemberStatus(id,nextStatus){
 if(!isAdmin||!currentUser)return;
 const label=nextStatus==='active'?'réactiver':'désactiver';
 if(!confirm(`Confirmer : ${label} ce membre ? ${nextStatus==='inactive'?'Il ne pourra plus accéder à son espace membre ni consulter ses cotisations.':''}`))return;
 const r=await sb.from('members').update({status:nextStatus}).eq('id',id).select('id,status').maybeSingle();
 if(r.error||!r.data){alert('Modification impossible : '+(r.error?.message||'aucun membre modifié.'));return;}
 await loadMembers();
}
async function deleteMemberPermanently(id){
 if(!isAdmin||!currentUser)return;
 const ok=confirm('SUPPRESSION DÉFINITIVE : cette action supprime la fiche du membre ainsi que ses cotisations et transactions de paiement liées. Les rapports associés peuvent empêcher la suppression. Préfère « Désactiver » si tu veux conserver son historique. Continuer ?');
 if(!ok)return;
 const r=await sb.from('members').delete().eq('id',id).select('id').maybeSingle();
 if(r.error){alert('Suppression impossible : '+r.error.message+'\\nTu peux désactiver le membre pour lui couper l’accès tout en conservant son dossier.');return;}
 if(!r.data){alert('Aucun membre supprimé.');return;}
 await loadMembers();
 alert('Membre supprimé. Son compte de connexion Supabase n’est pas supprimé automatiquement, mais il ne possède plus de fiche membre et ne peut donc plus accéder à son espace membre.');
}

async function addMember(e){
 e.preventDefault();if(!isAdmin)return;if(editingMemberId)return updateExistingMember(e);let photoUrl=null;const file=$('memberPhoto').files[0];
 if(file && file.size>5*1024*1024){msg('memberMessage','Photo trop lourde. Maximum 5 Mo.');return}
 if(file && !['image/jpeg','image/png','image/webp'].includes(file.type)){msg('memberMessage','Format photo non accepté. Utilise JPG, PNG ou WEBP.');return}
 const r=await sb.from('members').insert({first_name:$('memberFirstName').value.trim(),last_name:$('memberLastName').value.trim(),phone:$('memberPhone').value.trim()||null,email:$('memberEmail').value.trim()||null,commission_id:$('memberCommission')?.value||null}).select('id,member_number').single();
 if(r.error){msg('memberMessage',r.error.message);return}
 if(file){const ext=(file.name.split('.').pop()||'jpg').toLowerCase();const path=`${r.data.member_number}-${Date.now()}.${ext}`;const up=await sb.storage.from('member-photos').upload(path,file,{upsert:false,contentType:file.type});if(up.error){await sb.from('members').delete().eq('id',r.data.id);msg('memberMessage','Membre non créé : '+up.error.message);return}photoUrl=sb.storage.from('member-photos').getPublicUrl(path).data.publicUrl;const ur=await sb.from('members').update({photo_url:photoUrl}).eq('id',r.data.id);if(ur.error){msg('memberMessage','Membre créé, mais photo non enregistrée : '+ur.error.message,true)} }
 msg('memberMessage','Membre créé : '+r.data.member_number,true);e.target.reset();await loadMembers();await loadCommissions();
}
function previewMemberPhoto(e){const f=e.target.files[0];if(!f)return;const img=$('photoPreview');img.src=URL.createObjectURL(f);show('photoPreviewWrap');$('photoPreviewName').textContent=f.name}
async function showMyMemberCard(){
 const member=currentMemberRecord;
 if(!member||!currentUser||member.status!=='active'){
   alert("Votre carte de membre n'est pas disponible. Vérifiez que votre adhésion est active.");
   return;
 }
 let commission=null;
 if(member.commission_id){
   const result=await sb.from('commissions')
     .select('name,description,responsible_member_id,successor_member_id')
     .eq('id',member.commission_id)
     .maybeSingle();
   if(result.error){
     alert("Impossible de charger les informations de votre commission : "+result.error.message);
     return;
   }
   commission=result.data||null;
 }
 showMemberCard({...member,commissions:commission});
}
function showMemberCard(m){
 const commission=m.commissions?.name||'Aucune commission';
 const role=m.commissions?.responsible_member_id===m.id?'Président':(m.commissions?.successor_member_id===m.id?'Vice-président':(m.commission_id?'Membre de la commission':'—'));
 show('memberCard');$('cardIntro').textContent='Carte de '+m.first_name+' '+m.last_name;$('cardName').textContent=(m.first_name+' '+m.last_name).trim();$('cardNumber').textContent=m.member_number;$('cardPhone').textContent=m.phone||'Non renseigné';$('cardCommission').textContent=commission;$('cardCommissionRole').textContent=role;$('cardCommissionDescription').textContent=m.commissions?.description||'—';$('cardDate').textContent=m.membership_date||'—';$('cardStatus').textContent=m.status==='active'?'Actif':'Inactif';$('cardPhoto').src=m.photo_url||'logo.jpeg';$('qrcode').innerHTML='';const url=location.origin+location.pathname+'?member='+encodeURIComponent(m.member_number);new QRCode($('qrcode'),{text:url,width:104,height:104,colorDark:'#075c2d',colorLight:'#ffffff'});document.getElementById('memberCard').scrollIntoView({behavior:'smooth'});
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
    <p><b>Commission :</b> ${esc(m.commission_name||'Aucune commission')}</p>
    <p><b>Fonction :</b> ${esc(m.commission_role||'—')}</p>
    <p><b>Mission :</b> ${esc(m.commission_description||'—')}</p>
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
 if($('memberCommission'))$('memberCommission').value=m.commission_id||'';
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
 const r=await sb.from('members').select('id,member_number,first_name,last_name,phone,email,status,membership_date,photo_url,commission_id').eq('id',id).single();
 if(r.error){msg('memberMessage',r.error.message);return}
 startEditMember(r.data);
}
async function updateExistingMember(e){
 e.preventDefault();if(!editingMemberId)return addMember(e);
 const file=$('memberPhoto').files[0];
 if(file && file.size>5*1024*1024){msg('memberMessage','Photo trop lourde. Maximum 5 Mo.');return}
 if(file && !['image/jpeg','image/png','image/webp'].includes(file.type)){msg('memberMessage','Format photo non accepté. Utilise JPG, PNG ou WEBP.');return}
 const payload={first_name:$('memberFirstName').value.trim(),last_name:$('memberLastName').value.trim(),phone:$('memberPhone').value.trim()||null,email:$('memberEmail').value.trim()||null,commission_id:$('memberCommission')?.value||null};
 const r=await sb.from('members').update(payload).eq('id',editingMemberId).select('member_number').single();
 if(r.error){msg('memberMessage',r.error.message);return}
 if(file){const ext=(file.name.split('.').pop()||'jpg').toLowerCase();const path=`${r.data.member_number}-${Date.now()}.${ext}`;const up=await sb.storage.from('member-photos').upload(path,file,{upsert:false,contentType:file.type});if(up.error){msg('memberMessage','Membre modifié, mais photo non enregistrée : '+up.error.message);return}const url=sb.storage.from('member-photos').getPublicUrl(path).data.publicUrl;const ur=await sb.from('members').update({photo_url:url}).eq('id',editingMemberId);if(ur.error){msg('memberMessage','Membre modifié, mais photo non enregistrée : '+ur.error.message);return}}
 msg('memberMessage','Membre '+r.data.member_number+' modifié avec succès.',true);cancelEditMember();await loadMembers();await loadCommissions();
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
  box.innerHTML='<tr><td colspan="7">Chargement des commissions…</td></tr>';
  try{
    const cr=await sb.from('commissions')
      .select('id,name,description,responsible_member_id,successor_member_id,is_active')
      .order('name');
    if(cr.error){
      box.innerHTML='<tr><td colspan="7">Erreur Supabase : '+esc(cr.error.message)+'</td></tr>';
      msg('commissionMessage','Chargement impossible : '+cr.error.message);
      return;
    }
    const mr=await sb.from('members')
      .select('id,member_number,first_name,last_name,status,commission_id')
      .order('first_name');
    const members=mr.error?[]:(mr.data||[]);
    const rows=cr.data||[];
    const memberOptions=(selected)=>'<option value="">— Non désigné —</option>'+members.map(m=>
      '<option value="'+esc(m.id)+'" '+(selected===m.id?'selected':'')+'>'+esc(m.member_number||'')+' — '+esc(m.first_name)+' '+esc(m.last_name)+'</option>'
    ).join('');
    const memberSelect=$('memberCommission');
    if(memberSelect){
      const current=memberSelect.value;
      memberSelect.innerHTML='<option value="">Aucune commission (facultatif)</option>'+
        rows.filter(c=>c.is_active).map(c=>'<option value="'+esc(c.id)+'">'+esc(c.name)+'</option>').join('');
      if(current)memberSelect.value=current;
    }
    box.innerHTML=rows.length?rows.map(c=>{
      const roster=members.filter(m=>m.commission_id===c.id);
      const rosterHtml=roster.length
        ? '<ul class="commission-roster-list">'+roster.map(m=>'<li>'+esc(m.first_name)+' '+esc(m.last_name)+(m.status==='active'?'':' <span>(inactif)</span>')+'</li>').join('')+'</ul>'
        : '<span class="muted">Aucun membre affecté pour le moment.</span>';
      const president=members.find(m=>m.id===c.responsible_member_id);
      const vice=members.find(m=>m.id===c.successor_member_id);
      return '<tr>'+
        '<td><strong>'+esc(c.name)+'</strong></td>'+
        '<td><textarea rows="3" maxlength="1000" aria-label="Description de '+esc(c.name)+'" data-commission-description="'+esc(c.id)+'" placeholder="Décris la mission et les activités de cette commission">'+esc(c.description||'')+'</textarea><button type="button" class="table-btn" data-action="update-commission-description" data-id="'+esc(c.id)+'">Enregistrer la description</button></td>'+
        '<td><label class="commission-role-label">Président</label><select aria-label="Président de '+esc(c.name)+'" data-commission-responsible="'+esc(c.id)+'" '+(mr.error?'disabled':'')+'>'+memberOptions(c.responsible_member_id)+'</select>'+(president?'<small>'+esc(president.first_name)+' '+esc(president.last_name)+'</small>':'')+'</td>'+
        '<td><label class="commission-role-label">Vice-président</label><select aria-label="Vice-président de '+esc(c.name)+'" data-commission-successor="'+esc(c.id)+'" '+(mr.error?'disabled':'')+'>'+memberOptions(c.successor_member_id)+'</select>'+(vice?'<small>'+esc(vice.first_name)+' '+esc(vice.last_name)+'</small>':'')+'</td>'+
        '<td>'+rosterHtml+'</td>'+
        '<td>'+(c.is_active?'Active':'Inactive')+'</td>'+
        '<td><button type="button" class="table-btn" data-action="assign-commission" data-id="'+esc(c.id)+'" '+(mr.error?'disabled':'')+'>Enregistrer</button> <button type="button" class="table-btn danger-btn" data-action="toggle-commission" data-id="'+esc(c.id)+'" data-active="'+String(c.is_active)+'">'+(c.is_active?'Désactiver':'Activer')+'</button></td>'+
      '</tr>';
    }).join(''):'<tr><td colspan="7">Aucune commission trouvée dans la base de données.</td></tr>';
    if(mr.error)msg('commissionMessage','Les commissions sont affichées, mais les membres ne peuvent pas être chargés : '+mr.error.message);
    else msg('commissionMessage',rows.length+' commission(s) chargée(s). Désigne un président, un vice-président et affecte les membres à leur commission.',true);
  }catch(err){
    box.innerHTML='<tr><td colspan="7">Erreur inattendue : '+esc(err?.message||String(err))+'</td></tr>';
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
async function updateCommissionDescription(id){
  if(!sb||!isAdmin)return;
  const field=document.querySelector('[data-commission-description="'+CSS.escape(id)+'"]');
  if(!field)return;
  const description=field.value.trim();
  const r=await sb.from('commissions').update({description}).eq('id',id);
  if(r.error){msg('commissionMessage','Enregistrement de la description impossible : '+r.error.message);return;}
  msg('commissionMessage','Description de la commission mise à jour.',true);
  await loadCommissions();
}
async function assignCommission(id){
  if(!sb||!isAdmin)return;
  const responsible=document.querySelector('[data-commission-responsible="'+CSS.escape(id)+'"]');
  const successor=document.querySelector('[data-commission-successor="'+CSS.escape(id)+'"]');
  if(!responsible||!successor)return;
  if(responsible.value&&successor.value&&responsible.value===successor.value){
    msg('commissionMessage','Le président et le vice-président doivent être deux membres différents.');
    return;
  }
  const r=await sb.from('commissions').update({
    responsible_member_id:responsible.value||null,
    successor_member_id:successor.value||null
  }).eq('id',id).select('id,responsible_member_id,successor_member_id').maybeSingle();
  if(r.error){msg('commissionMessage','Enregistrement impossible : '+r.error.message);return;}
  if(!r.data){msg('commissionMessage','Aucune modification enregistrée. Vérifie les droits administrateur sur cette commission.');return;}
  msg('commissionMessage','Président et vice-président enregistrés.',true);
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
  void updatePendingMembershipCount();

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
  const email = $('requestEmail').value.trim().toLowerCase();
  const note = $('requestNote').value.trim() || null;
  const commission_id = $('requestCommission').value || null;

  if (!first_name || !last_name || !phone || !email || !commission_id) {
    msg('membershipRequestMessage', 'Remplis tous les champs obligatoires et choisis une commission.');
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
  if(!x.email){
    alert("Cette demande ne contient pas d’adresse e-mail. Demande au candidat de refaire sa demande avec une adresse e-mail valide avant la validation.");
    return;
  }

  const existing = await sb.from('members')
    .select('id, member_number')
    .ilike('email', x.email)
    .maybeSingle();
  if(existing.error){
    alert("Vérification de l’adresse e-mail impossible : "+existing.error.message);
    return;
  }
  if(existing.data){
    alert("Un membre utilise déjà cette adresse e-mail (N° "+existing.data.member_number+"). Vérifie sa fiche avant de poursuivre.");
    return;
  }

  const created = await sb.from('members').insert({
    first_name: x.first_name,
    last_name: x.last_name,
    phone: x.phone || null,
    email: x.email.toLowerCase(),
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
    .eq('status', 'pending')
    .select('id')
    .maybeSingle();

  if (updated.error || !updated.data) {
    const cleanup = await sb.from('members').delete().eq('id',created.data.id).select('id').maybeSingle();
    const cleanupText = cleanup.error || !cleanup.data
      ? " La fiche créée n’a pas pu être annulée automatiquement : vérifie les membres avant une nouvelle validation."
      : " La création a été annulée ; tu peux réessayer.";
    alert("La demande n'a pas pu être marquée comme validée." + cleanupText + (updated.error ? " Erreur : "+updated.error.message : ""));
    await loadMembers();
    await loadMembershipRequests();
    return;
  }

  alert("Demande validée. Numéro du membre : " + created.data.member_number + ". Le candidat doit maintenant créer son compte avec l’adresse e-mail "+x.email+" via « Connexion » puis « Créer un compte gratuit », confirmer son e-mail et se connecter.");

  await loadMembers();
  await loadCommissions();
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





// Enregistrer automatiquement le président ou le vice-président dès que le choix change.
document.addEventListener('change', function(e) {
  const field=e.target;
  if(!isAdmin||!field||!field.matches('[data-commission-responsible],[data-commission-successor]'))return;
  const id=field.dataset.commissionResponsible||field.dataset.commissionSuccessor;
  if(id)void assignCommission(id);
});

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
    case 'toggle-member-status': toggleMemberStatus(id,button.dataset.status==='active'?'inactive':'active'); break;
    case 'delete-member': deleteMemberPermanently(id); break;
    case 'show-member-card': {
      const r = await sb.from('members')
        .select('id,member_number,first_name,last_name,phone,email,status,membership_date,photo_url,commission_id')
        .eq('id', id).maybeSingle();
      if (r.error || !r.data) { alert("Membre introuvable."); return; }
      if(r.data.commission_id){
        const commissionResult=await sb.from('commissions')
          .select('name,description,responsible_member_id,successor_member_id')
          .eq('id',r.data.commission_id)
          .maybeSingle();
        r.data.commissions=commissionResult.data||null;
      }
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
    case 'update-commission-description': updateCommissionDescription(id); break;
    case 'assign-commission': assignCommission(id); break;
    case 'toggle-commission': toggleCommission(id,button.dataset.active==='true'); break;
    case 'approve-request': approveMembershipRequest(id); break;
    case 'reject-request': rejectMembershipRequest(id); break;
  }
});
