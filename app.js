let sb=null,currentUser=null,currentMemberRecord=null,isAdmin=false,signupMode=false;
let paymentCategories=[];
let galleryPreviewUrl=null;
const DAHIRA_WAVE_PAYMENT_URL='https://qr.wave.com/iVVNfc25fc3ZJOTlSbDlxcnlW/Bq8E-h/B_HnCU/p';
function configureDahiraWaveLinks(){
 ['memberWavePayLink','adminWavePayLink'].forEach(id=>{const linkEl=$(id);if(linkEl)linkEl.href=DAHIRA_WAVE_PAYMENT_URL;});
}
document.addEventListener('DOMContentLoaded',configureDahiraWaveLinks);
const $=id=>document.getElementById(id), show=id=>$(id).classList.remove('hidden'), hide=id=>$(id).classList.add('hidden');
let activeAccessibleModalId=null;
let previousAccessibleModalFocus=null;
function getDialogFocusable(dialog){
  return [...dialog.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')]
    .filter(el=>el.getClientRects().length>0);
}
function openAccessibleModal(id,initialFocusSelector){
  const modal=$(id);
  if(!modal)return;
  if(activeAccessibleModalId)closeAccessibleModal(activeAccessibleModalId,false);
  previousAccessibleModalFocus=document.activeElement;
  activeAccessibleModalId=id;
  show(id);
  const dialog=modal.querySelector('[role="dialog"]')||modal;
  const target=(initialFocusSelector&&dialog.querySelector(initialFocusSelector))||getDialogFocusable(dialog)[0]||dialog;
  target.focus();
}
function closeAccessibleModal(id,restoreFocus=true){
  const modal=$(id);
  if(!modal)return;
  hide(id);
  if(activeAccessibleModalId!==id)return;
  activeAccessibleModalId=null;
  const target=previousAccessibleModalFocus;
  previousAccessibleModalFocus=null;
  if(restoreFocus&&target&&target.isConnected)target.focus();
}
document.addEventListener('keydown',event=>{
  if(!activeAccessibleModalId)return;
  const modal=$(activeAccessibleModalId);
  const dialog=modal?.querySelector('[role="dialog"]')||modal;
  if(event.key==='Escape'){
    event.preventDefault();
    closeAccessibleModal(activeAccessibleModalId);
    return;
  }
  if(event.key!=='Tab')return;
  const focusable=getDialogFocusable(dialog);
  if(!focusable.length){event.preventDefault();dialog.focus();return;}
  const first=focusable[0],last=focusable[focusable.length-1];
  if(event.shiftKey&&(document.activeElement===first||!dialog.contains(document.activeElement))){
    event.preventDefault();last.focus();
  }else if(!event.shiftKey&&(document.activeElement===last||!dialog.contains(document.activeElement))){
    event.preventDefault();first.focus();
  }
});
function openAuth(){openAccessibleModal('authModal','#email')}
function closeAuth(){closeAccessibleModal('authModal')}

function setAdminUI(){
  const sections=['adminDashboard','admin','members','commissions','membershipRequests','contributions','paymentTransactions','unpaidMembers','financeDashboard','posters','adminEvents','adminGallery','adminNotifications'];
  const navs=['dashboardNav','adminNav','membersNav','commissionsNav','membershipRequestsNav','contributionsNav','paymentsNav','unpaidNav','financeNav','financeWaveNav','postersNav','eventsNav','galleryNav','notificationsNav'];
  sections.forEach(hide);
  navs.forEach(hide);
  if(isAdmin){
    navs.forEach(show);
    show('adminNavigationGroup');
    show('adminDashboard');
    updateAdminDashboard();
  }
}
function showAdminSection(id){
  if(!isAdmin)return;
  const allowed=['adminDashboard','admin','members','commissions','membershipRequests','contributions','paymentTransactions','unpaidMembers','financeDashboard','posters','adminEvents','adminGallery','adminNotifications'];
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
  if(id==='adminEvents')void loadAdminEvents();
  if(id==='adminGallery')void loadAdminGallery();
  if(id==='adminNotifications')void loadAdminNotifications();
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
  const a=e.target.closest('a[data-admin-target]');
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

function syncContributionDate(){
  const date=$('contributionPaymentDate')?.value||'';
  const month=$('contributionMonth');
  if(month)month.value=date?date.slice(0,7):'';
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
function contributionCategoryLabel(v){
  return paymentCategories.find(c=>c.id===v)?.label||({mensualite:'Mensualité',tombe_dahira:'Tombe Dahira',chasse:'Chasse',divers:'Divers'})[v]||v||'Autre';
}

async function auth(e){
  e.preventDefault();
  const email=$('email').value.trim().toLowerCase();
  const password=$('password').value;
  const submit=$('authSubmit');
  if(!sb){
    msg('authMessage',"Le service de connexion n'est pas encore prêt. Actualise la page puis réessaie.");
    return;
  }

  const previousLabel=submit.textContent;
  submit.disabled=true;
  submit.textContent=signupMode?'Création en cours…':'Connexion…';
  try{
    const redirectTo=window.location.origin+window.location.pathname;
    const result=signupMode
      ? await sb.auth.signUp({email,password,options:{emailRedirectTo:redirectTo}})
      : await sb.auth.signInWithPassword({email,password});

    if(result.error) throw result.error;

    if(signupMode){
      msg('authMessage',
        result.data?.session
          ? "Compte créé et connecté. Le Dahira va associer ton compte à ta fiche membre."
          : "Demande de création envoyée. Vérifie ta boîte e-mail (et les courriers indésirables), puis confirme ton adresse. Utilise exactement l'adresse e-mail enregistrée sur ta fiche membre.",
        true
      );
    }else{
      msg('authMessage','Connexion réussie. Chargement de ton espace…',true);
      setTimeout(closeAuth,700);
    }
  }catch(error){
    console.error('Erreur Auth Supabase:',error);
    const raw=error?.message||"Une erreur inconnue est survenue.";
    const lower=raw.toLowerCase();
    let message=raw;
    if(lower.includes('invalid login credentials')) message="Adresse e-mail ou mot de passe incorrect.";
    else if(lower.includes('email not confirmed')) message="Ton adresse e-mail n'est pas encore confirmée. Ouvre le message reçu de Supabase puis réessaie.";
    else if(lower.includes('already registered')||lower.includes('user already registered')) message="Un compte existe déjà avec cette adresse. Utilise « J’ai déjà un compte » pour te connecter.";
    else if(lower.includes('password should be at least')) message="Le mot de passe doit contenir au moins 6 caractères.";
    else if(lower.includes('redirect')||lower.includes('not allowed')) message="L'adresse de retour après confirmation n'est pas autorisée dans Supabase. Il faut ajouter l'adresse du site dans les URL de redirection autorisées.";
    msg('authMessage',message);
  }finally{
    submit.disabled=false;
    submit.textContent=previousLabel;
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
    return '<article class="card admin-charter-card"><span class="tag">📜 Charte publiée</span><h3>'+esc(x.title)+'</h3><p>'+esc(x.description||'')+'</p>'+(x.charter_text?'<div class="charter-full-text" aria-label="Texte intégral du règlement">'+esc(x.charter_text)+'</div>':'<p class="loading">Le texte intégral n’est pas encore renseigné.</p>')+(pdf?'<iframe class="charter-pdf-viewer" title="Lecture de '+esc(x.title)+'" src="'+esc(pdf)+'#view=FitH" loading="lazy"></iframe>':'')+'<div class="charter-pdf-actions">'+(actions||'<span>Document PDF non joint.</span>')+'</div></article>';
  }).join('');
}

function contentCard(x){
  const icon={khasside:'📖',audio:'🎧',video:'🎥',cours:'📚',annonce:'📢',information:'ℹ️',charte:'📜'}[x.type]||'📄';
  const external=(x.external_url||'').match(/^https?:\/\//i)?'<a target="_blank" rel="noopener" href="'+esc(x.external_url)+'">Ouvrir le lien →</a>':'';
  const pdf=(x.file_url||'').match(/^https?:\/\//i)?'<a class="pdf-download" href="'+esc(x.file_url)+(x.file_url.includes('?')?'&':'?')+'download=Reglement-Daara-Jazbul-Qulub.pdf">⬇️ Télécharger le PDF original</a>':'';
  const charterText=x.type==='charte'&&x.charter_text?'<div class="charter-full-text" aria-label="Texte intégral du règlement">'+esc(x.charter_text)+'</div>':'';
  const charterPdf=x.type==='charte'&&(x.file_url||'').match(/^https?:\/\//i)?'<iframe class="charter-pdf-viewer" title="Lecture de '+esc(x.title)+'" src="'+esc(x.file_url)+'#view=FitH" loading="lazy"></iframe>':'';
  return '<article class="card"><span class="tag">'+icon+' '+esc(contentTypeLabel(x.type))+'</span><h3>'+esc(x.title)+'</h3><p>'+esc(x.description||'')+'</p>'+charterText+charterPdf+pdf+external+'</article>';
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

let posterImages={left:null,center:null,right:null,logo:null},posterBackground=null,posterSegmentationPromise=null,posterSegmenter=null,posterSegmentationQueue=Promise.resolve();
const posterImageAdjust={left:{rotate:0,zoom:1,x:0,y:0},center:{rotate:0,zoom:1,x:0,y:0},right:{rotate:0,zoom:1,x:0,y:0},logo:{rotate:0,zoom:1,x:0,y:0}};
function posterLoadSegmentation(){if(posterSegmenter)return Promise.resolve(posterSegmenter);if(!posterSegmentationPromise)posterSegmentationPromise=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/selfie_segmentation.js';script.crossOrigin='anonymous';script.onload=()=>{try{posterSegmenter=new window.SelfieSegmentation({locateFile:file=>'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/'+file});posterSegmenter.setOptions({modelSelection:1});posterSegmenter.initialize().then(()=>resolve(posterSegmenter)).catch(reject)}catch(err){reject(err)}};script.onerror=()=>reject(new Error('Impossible de charger le module IA de détourage.'));document.head.appendChild(script)}).catch(err=>{posterSegmentationPromise=null;throw err});return posterSegmentationPromise}
async function posterRemovePhotoBackground(file){
  await posterLoadSegmentation();
  const task=async()=>new Promise(async(resolve,reject)=>{
    const url=URL.createObjectURL(file),image=new Image();
    image.onload=async()=>{
      try{
        const canvas=document.createElement('canvas'),mask=document.createElement('canvas');
        canvas.width=mask.width=image.naturalWidth;canvas.height=mask.height=image.naturalHeight;
        const ctx=canvas.getContext('2d',{willReadFrequently:true}),mctx=mask.getContext('2d',{willReadFrequently:true});
        posterSegmenter.onResults(results=>{
          try{
            ctx.clearRect(0,0,canvas.width,canvas.height);
            ctx.drawImage(image,0,0,canvas.width,canvas.height);
            mctx.clearRect(0,0,mask.width,mask.height);
            mctx.filter='blur(0.7px)';
            mctx.drawImage(results.segmentationMask,0,0,mask.width,mask.height);
            mctx.filter='none';
            const matte=mctx.getImageData(0,0,mask.width,mask.height),md=matte.data;
            const pixels=ctx.getImageData(0,0,canvas.width,canvas.height),pd=pixels.data;
            for(let i=0;i<pd.length;i+=4){
              const v=md[i]/255;
              let a=Math.max(0,Math.min(1,(v-0.24)/(0.78-0.24)));
              a=a*a*(3-2*a);
              if(a<0.035)a=0;
              pd[i+3]=Math.round(pd[i+3]*a);
            }
            ctx.putImageData(pixels,0,0);
            canvas.toBlob(blob=>{URL.revokeObjectURL(url);if(blob)resolve(blob);else reject(new Error('Impossible de créer la photo détourée.'))},'image/png');
          }catch(err){URL.revokeObjectURL(url);reject(err)}
        });
        $('posterMessage').textContent='Détourage précis : suppression des résidus et adoucissement des bords…';
        await posterSegmenter.send({image});
      }catch(err){URL.revokeObjectURL(url);reject(err)}
    };
    image.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Cette image ne peut pas être lue.'))};
    image.src=url;
  });
  const result=posterSegmentationQueue.then(task,task);
  posterSegmentationQueue=result.catch(()=>{});
  return result;
}
function posterRemoveLogoBackground(file){
  return new Promise((resolve,reject)=>{
    const url=URL.createObjectURL(file),img=new Image();
    img.onload=()=>{
      try{
        const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;
        const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0);
        const im=ctx.getImageData(0,0,c.width,c.height),d=im.data,w=c.width,h=c.height;
        const seen=new Uint8Array(w*h),stack=[],edge=[];
        for(let x=0;x<w;x++){edge.push(x,(h-1)*w+x)}
        for(let y=1;y<h-1;y++){edge.push(y*w,y*w+w-1)}
        let bg=[0,0,0],n=0;
        for(const p of edge){const k=p*4;if(d[k+3]>0){bg[0]+=d[k];bg[1]+=d[k+1];bg[2]+=d[k+2];n++}}
        if(!n){URL.revokeObjectURL(url);resolve(file);return}
        bg=bg.map(v=>v/n);
        const tolerance=45,softness=35;
        const distance=p=>{const k=p*4;return Math.hypot(d[k]-bg[0],d[k+1]-bg[1],d[k+2]-bg[2])};
        const add=p=>{if(p<0||p>=w*h||seen[p]||d[p*4+3]===0)return;if(distance(p)<=tolerance+softness){seen[p]=1;stack.push(p)}};
        for(const p of edge)add(p);
        while(stack.length){
          const p=stack.pop(),x=p%w,y=(p/w)|0;
          if(x)add(p-1);if(x<w-1)add(p+1);if(y)add(p-w);if(y<h-1)add(p+w);
        }
        for(let p=0;p<w*h;p++){
          if(!seen[p])continue;
          const k=p*4,dist=distance(p);
          const alpha=Math.max(0,Math.min(1,(dist-tolerance)/softness));
          d[k+3]=Math.round(d[k+3]*alpha);
          if(alpha>0&&alpha<1){
            for(let ch=0;ch<3;ch++)d[k+ch]=Math.max(0,Math.min(255,Math.round((d[k+ch]-bg[ch]*(1-alpha))/alpha)));
          }else if(alpha===0){d[k]=bg[0];d[k+1]=bg[1];d[k+2]=bg[2]}
        }
        ctx.putImageData(im,0,0);
        c.toBlob(blob=>{URL.revokeObjectURL(url);blob?resolve(blob):reject(new Error('Nettoyage du fond du logo impossible.'))},'image/png');
      }catch(e){URL.revokeObjectURL(url);reject(e)}
    };
    img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Le logo ne peut pas être lu.'))};
    img.src=url;
  });
}
function posterBlobToImage(blob){return new Promise((resolve,reject)=>{const url=URL.createObjectURL(blob),img=new Image();img.onload=()=>{URL.revokeObjectURL(url);resolve(img)};img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('L’image détourée ne peut pas être affichée.'))};img.src=url})}
async function posterLoadImage(file){if(!file)return null;if(!file.type.startsWith('image/'))throw new Error('Veuillez choisir un fichier image.');if(file.size>8*1024*1024)throw new Error('Chaque image doit faire moins de 8 Mo.');$('posterMessage').textContent='Suppression automatique du fond de la photo…';return posterBlobToImage(await posterRemovePhotoBackground(file))}
async function posterLoadLogo(file){if(!file)return null;if(!file.type.startsWith('image/'))throw new Error('Veuillez choisir un fichier image.');$('posterMessage').textContent='Nettoyage automatique du fond du logo…';return posterBlobToImage(await posterRemoveLogoBackground(file))}
function posterCrop(ctx,img,x,y,w,h,radius=0,adjust={}){if(!img)return;ctx.save();if(radius){ctx.beginPath();ctx.roundRect(x,y,w,h,radius);ctx.clip()}const zoom=Number(adjust.zoom)||1,angle=(Number(adjust.rotate)||0)*Math.PI/180;ctx.translate(x+w/2+(Number(adjust.x)||0)*w/100,y+h/2+(Number(adjust.y)||0)*h/100);ctx.rotate(angle);const scale=Math.max(w/img.width,h/img.height)*zoom,sw=w/scale,sh=h/scale,sx=(img.width-sw)/2,sy=(img.height-sh)/2;ctx.drawImage(img,sx,sy,sw,sh,-w/2,-h/2,w,h);ctx.restore()}
function posterPortrait(ctx,img,x,y,w,h,key){
 if(!img)return;
 const pw=Math.max(1,Math.ceil(w)),ph=Math.max(1,Math.ceil(h));
 const layer=document.createElement('canvas');layer.width=pw;layer.height=ph;
 const lctx=layer.getContext('2d');
 lctx.imageSmoothingEnabled=true;lctx.imageSmoothingQuality='high';
 posterCrop(lctx,img,0,0,pw,ph,0,posterImageAdjust[key]);
 lctx.globalCompositeOperation='destination-in';
 const fade=lctx.createLinearGradient(0,ph*.68,0,ph);
 fade.addColorStop(0,'rgba(255,255,255,1)');
 fade.addColorStop(.42,'rgba(255,255,255,.94)');
 fade.addColorStop(.78,'rgba(255,255,255,.48)');
 fade.addColorStop(1,'rgba(255,255,255,0)');
 lctx.fillStyle=fade;lctx.fillRect(0,0,pw,ph);
 lctx.globalCompositeOperation='source-over';
 ctx.save();ctx.shadowColor='rgba(0,0,0,.10)';ctx.shadowBlur=12;ctx.drawImage(layer,x,y,w,h);ctx.restore();
}
function posterText(ctx,text,x,y,maxWidth,lineHeight,maxLines=2){const words=String(text||'').trim().split(/\\s+/);let line='',lines=[];for(const word of words){const test=line?line+' '+word:word;if(ctx.measureText(test).width>maxWidth&&line){lines.push(line);line=word}else line=test}if(line)lines.push(line);lines.slice(0,maxLines).forEach((v,i)=>ctx.fillText(v,x,y+i*lineHeight))}
function posterTrackedText(ctx,text,x,y,maxWidth,font,fill,tracking=5){
 const chars=Array.from(String(text||'').trim().toLocaleUpperCase('fr-FR'));
 if(!chars.length)return;
 const match=String(font).match(/([0-9]+(?:\.[0-9]+)?)px/);
 let size=match?Number(match[1]):28;
 const family=String(font).replace(/[0-9]+(?:\.[0-9]+)?px/,'__SIZE__');
 let widths=[],space=tracking,total=0;
 const measure=()=>{ctx.font=family.replace('__SIZE__',size+'px');widths=chars.map(ch=>ctx.measureText(ch).width);total=widths.reduce((sum,v)=>sum+v,0)+Math.max(0,chars.length-1)*space};
 measure();
 while(total>maxWidth&&size>11){size-=1;measure()}
 if(total>maxWidth){space=0;measure()}
 if(total>maxWidth){while(total>maxWidth&&size>9){size-=1;measure()}}
 ctx.fillStyle=fill;ctx.textAlign='left';
 let cursor=x-total/2;
 chars.forEach((ch,i)=>{ctx.fillText(ch,cursor,y);cursor+=widths[i]+space});
}
function posterFitFont(ctx,text,family,weight,maxWidth,initial,min){
 let size=initial;ctx.font=`${weight} ${size}px ${family}`;
 while(ctx.measureText(text).width>maxWidth&&size>min){size-=2;ctx.font=`${weight} ${size}px ${family}`}
 return size;
}
function posterDrawDateFlower(ctx,cx,cy,r){
 ctx.save();ctx.fillStyle='#078d28';
 for(let i=0;i<8;i++){const a=i*Math.PI/4;ctx.beginPath();ctx.ellipse(cx+Math.cos(a)*r*.47,cy+Math.sin(a)*r*.47,r*.52,r*.43,a,0,Math.PI*2);ctx.fill()}
 ctx.beginPath();ctx.arc(cx,cy,r*.66,0,Math.PI*2);ctx.fill();ctx.restore();
}
function posterDrawPin(ctx,x,y,size){
 ctx.save();ctx.translate(x,y);ctx.strokeStyle='#4a2413';ctx.lineWidth=size*.095;ctx.fillStyle='rgba(255,255,255,.0)';
 ctx.beginPath();ctx.arc(0,-size*.18,size*.34,0,Math.PI*2);ctx.stroke();
 ctx.beginPath();ctx.moveTo(-size*.24,size*.08);ctx.lineTo(0,size*.55);ctx.lineTo(size*.24,size*.08);ctx.stroke();
 ctx.beginPath();ctx.arc(0,-size*.18,size*.13,0,Math.PI*2);ctx.stroke();ctx.restore();
}
async function drawPoster(){
 const canvas=$('posterCanvas');if(!canvas||!posterBackground||!posterBackground.complete)return;
 const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
 const W=canvas.width,H=canvas.height,sx=W/1024,sy=H/1536,X=v=>v*sx,Y=v=>v*sy;
 ctx.clearRect(0,0,W,H);
 // Le visuel de fond fourni reste strictement inchangé.
 ctx.drawImage(posterBackground,0,0,W,H);
 // Les portraits sont superposés comme un groupe, puis fondus progressivement vers le bas.
 posterPortrait(ctx,posterImages.left,X(0),Y(42),X(405),Y(650),'left');
 posterPortrait(ctx,posterImages.right,X(619),Y(28),X(405),Y(665),'right');
 posterPortrait(ctx,posterImages.center,X(275),Y(145),X(474),Y(555),'center');
 ctx.textAlign='center';ctx.textBaseline='alphabetic';
 posterTrackedText(ctx,$('posterEyebrow')?.value||'SPÉCIAL',W/2,Y(825),X(800),`500 ${Y(30)}px Arial`,'#090909',Y(9));
 const title=$('posterTitle')?.value||'VOTRE ÉVÉNEMENT';
 const titleSize=posterFitFont(ctx,title,'Georgia','bold',X(940),Y(170),Y(78));
 ctx.font=`bold ${titleSize}px Georgia`;
 const gold=ctx.createLinearGradient(0,Y(880),0,Y(1040));gold.addColorStop(0,'#f7d84c');gold.addColorStop(.48,'#e6a900');gold.addColorStop(1,'#bd7900');
 ctx.save();ctx.shadowColor='rgba(88,55,0,.24)';ctx.shadowBlur=Y(5);ctx.shadowOffsetY=Y(4);
 ctx.lineJoin='round';ctx.lineWidth=Y(7);ctx.strokeStyle='#fff0b0';ctx.strokeText(title,W/2,Y(1015),X(940));
 ctx.lineWidth=Y(2);ctx.strokeStyle='#d79b08';ctx.strokeText(title,W/2,Y(1015),X(940));
 ctx.fillStyle=gold;ctx.fillText(title,W/2,Y(1015),X(940));ctx.restore();
 posterTrackedText(ctx,$('posterSubtitle')?.value||'NOM DE LA RENCONTRE',W/2,Y(1080),X(950),`900 ${Y(31)}px Arial`,'#090909',Y(5));
 posterTrackedText(ctx,$('posterDetails')?.value||'',W/2,Y(1125),X(900),`700 ${Y(23)}px Arial`,'#171717',Y(4));
 const dv=$('posterDate')?.value;let day='--',month='MOIS. ANNÉE',weekday='JOUR';
 if(dv){const d=new Date(dv+'T12:00:00');day=String(d.getDate());month=new Intl.DateTimeFormat('fr-FR',{month:'short',year:'numeric'}).format(d).toLocaleUpperCase('fr-FR').replace('.','');weekday=new Intl.DateTimeFormat('fr-FR',{weekday:'long'}).format(d).toLocaleUpperCase('fr-FR')}
 ctx.fillStyle='#07852a';ctx.font=`900 ${Y(47)}px Arial`;ctx.textAlign='right';ctx.fillText(weekday,W/2-X(94),Y(1272),X(330));
 posterDrawDateFlower(ctx,W/2,Y(1248),X(75));
 ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font=`900 ${Y(92)}px Arial`;ctx.fillText(day,W/2,Y(1280));
 ctx.fillStyle='#07852a';ctx.textAlign='left';ctx.font=`900 ${Y(44)}px Arial`;ctx.fillText(month,W/2+X(94),Y(1272),X(360));
 posterDrawPin(ctx,W/2-X(215),Y(1360),Y(76));
 ctx.fillStyle='#111';ctx.textAlign='left';ctx.font=`500 ${Y(35)}px Arial`;ctx.fillText(($('posterPlace')?.value||'LIEU').toLocaleUpperCase('fr-FR'),W/2-X(155),Y(1374),X(620));
 ctx.textAlign='center';ctx.font=`500 ${Y(30)}px Arial`;posterTrackedText(ctx,$('posterPlaceDetail')?.value||$('posterTime')?.value||'',W/2,Y(1430),X(850),`500 ${Y(26)}px Arial`,'#171717',Y(1.5));
 if(posterImages.logo)posterCrop(ctx,posterImages.logo,W/2-X(70),Y(1450),X(140),Y(78),0,posterImageAdjust.logo);
 ctx.textAlign='left';
}
function initPosterGenerator(){const form=$('posterForm');if(!form)return;posterBackground=new Image();posterBackground.onload=()=>{const canvas=$('posterCanvas');canvas.width=posterBackground.naturalWidth||1024;canvas.height=posterBackground.naturalHeight||1536;drawPoster()};posterBackground.onerror=()=>{$('posterMessage').textContent='Le fond original lv_0_20261110143839.jpg ne peut pas être chargé.'};posterBackground.src='lv_0_20261110143839.jpg';['posterEyebrow','posterTitle','posterSubtitle','posterDetails','posterPlace','posterPlaceDetail','posterDate','posterTime'].forEach(id=>$(id)?.addEventListener('input',drawPoster));form.querySelectorAll('[data-poster-adjust]').forEach(el=>el.addEventListener('input',()=>{const [key,prop]=el.dataset.posterAdjust.split(':');posterImageAdjust[key][prop]=Number(el.value);drawPoster()}));form.querySelectorAll('[data-poster-reset]').forEach(btn=>btn.addEventListener('click',()=>{const key=btn.dataset.posterReset;Object.assign(posterImageAdjust[key],{rotate:0,zoom:1,x:0,y:0});form.querySelectorAll('[data-poster-adjust]').forEach(el=>{if(el.dataset.posterAdjust.startsWith(key+':'))el.value=el.dataset.defaultValue|| (el.dataset.posterAdjust.endsWith(':zoom')?'1':'0')});drawPoster()}));[['posterPhotoLeft','left'],['posterPhotoCenter','center'],['posterPhotoRight','right'],['posterLogo','logo']].forEach(([id,key])=>{$(id)?.addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file){posterImages[key]=null;drawPoster();return}try{posterImages[key]=key==='logo'?await posterLoadLogo(file):await posterLoadImage(file);$('posterMessage').textContent=key==='logo'?'Fond du logo supprimé automatiquement.':'Fond supprimé automatiquement : photo ajoutée.';drawPoster()}catch(err){e.target.value='';$('posterMessage').textContent=err.message}})});$('posterDownloadBtn')?.addEventListener('click',()=>{const title=($('posterTitle')?.value||'affiche-daara').trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'affiche-daara';try{const a=document.createElement('a');a.download=title+'.png';a.href=$('posterCanvas').toDataURL('image/png');a.click();$('posterMessage').textContent='Affiche téléchargée.'}catch(e){$('posterMessage').textContent='Impossible de télécharger l’affiche.'}});$('posterResetBtn')?.addEventListener('click',()=>{form.reset();posterImages={left:null,center:null,right:null,logo:null};Object.keys(posterImageAdjust).forEach(k=>Object.assign(posterImageAdjust[k],{rotate:0,zoom:1,x:0,y:0}));form.querySelectorAll('[data-poster-adjust]').forEach(el=>{el.value=el.dataset.defaultValue||0});drawPoster();$('posterMessage').textContent='Formulaire réinitialisé.'});drawPoster()}
async function init(){
 const c=window.DJQ_CONFIG;
 $('loginBtn').onclick=openAuth;$('logoutBtn').onclick=async()=>{await sb.auth.signOut();location.reload()};
 $('switchAuth').onclick=()=>{signupMode=!signupMode;$('authTitle').textContent=signupMode?'Créer un compte gratuit':'Connexion';$('authSubmit').textContent=signupMode?'Créer mon compte':'Se connecter';$('switchAuth').textContent=signupMode?'J’ai déjà un compte':'Créer un compte gratuit'};
 $('closeMemberFinance').onclick=()=>closeAccessibleModal('memberFinanceModal');
 initPosterGenerator();
 $('printCardBtn').onclick=()=>void printSelectedMemberCard();
 $('printAllMemberCardsBtn')?.addEventListener('click',()=>void printAllMemberCards());
 $('myMemberCardBtn')?.addEventListener('click',()=>void showMyMemberCard());
 $('closeCardBtn').onclick=()=>hide('memberCard');
 $('contributionForm').onsubmit=addContribution;
 $('memberPaymentForm')?.addEventListener('submit',submitMemberPayment);
 $('memberPaymentFor')?.addEventListener('change',togglePaymentBeneficiary);
 $('paymentCategoryForm')?.addEventListener('submit',addPaymentCategory);
 $('paymentCategoryRows')?.addEventListener('click',handlePaymentCategoryAction);
 $('paymentCategoryRows')?.addEventListener('change',handlePaymentCategoryRename);
 ['contributionSearch','contributionHistoryMonth','contributionHistoryCategory','contributionHistoryStatus'].forEach(id=>{
   const input=$(id);
   if(input) input.addEventListener(input.tagName==='INPUT'&&input.type==='search'?'input':'change',()=>renderContributionRows(window.__contributionRows||[]));
 });
 $('contributionFiltersReset')?.addEventListener('click',()=>{
   ['contributionSearch','contributionHistoryMonth','contributionHistoryCategory','contributionHistoryStatus'].forEach(id=>{if($(id))$(id).value='';});
   renderContributionRows(window.__contributionRows||[]);
 });
 const contributionMonthInput=$('contributionMonth');
if(contributionMonthInput){
  const dateInput=$('contributionPaymentDate');
  if(dateInput)dateInput.value=new Date().toISOString().slice(0,10);
  syncContributionDate();
  dateInput?.addEventListener('change',syncContributionDate);
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
   $('financeCategoryFilter').onchange=loadFinanceDashboard;
   $('financeResetBtn').onclick=()=>{ $('financeMemberFilter').value=''; $('financeMonthFilter').value=''; $('financeCategoryFilter').value=''; loadFinanceDashboard(); };
   $('financeExportBtn').onclick=exportFinanceCSV;
 }
 if(c.SUPABASE_PUBLISHABLE_KEY.startsWith('COLLER_')){loadDemo();return}
 sb=window.supabase.createClient(c.SUPABASE_URL,c.SUPABASE_PUBLISHABLE_KEY);void loadGeneralLeadership();void loadPublicCommissions();void loadPublicCommissionDirectory();void loadPublicEvents();void loadPublicGallery();
 $('adminEventForm')?.addEventListener('submit',createAdminEvent);
 $('adminGalleryForm')?.addEventListener('submit',createAdminGalleryItem);
 $('galleryImageFile')?.addEventListener('change',()=>{const file=$('galleryImageFile').files?.[0],preview=$('galleryImagePreview');if(galleryPreviewUrl){URL.revokeObjectURL(galleryPreviewUrl);galleryPreviewUrl=null;}if(!preview)return;if(!file){preview.removeAttribute('src');preview.classList.add('hidden');return;}if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>8*1024*1024){msg('galleryMessage','Format accepté : JPG, PNG ou WebP. Taille maximale : 8 Mo.');$('galleryImageFile').value='';preview.classList.add('hidden');return;}galleryPreviewUrl=URL.createObjectURL(file);preview.src=galleryPreviewUrl;preview.classList.remove('hidden');});
 $('adminNotificationForm')?.addEventListener('submit',createAdminNotification);$('generalLeaderForm')?.addEventListener('submit',saveGeneralLeadership);$('requestCommission')?.addEventListener('focus',()=>void loadPublicCommissions());$('authForm').onsubmit=auth;$('contentForm').onsubmit=publish;$('cancelContentEditBtn').onclick=resetContentForm;$('memberForm').onsubmit=addMember;$('commissionForm').onsubmit=saveCommission;const requestForm = $('membershipRequestForm');
if (requestForm) requestForm.onsubmit = submitMembershipRequest;
  if($('memberReportForm')){
  $('memberReportForm').onsubmit=submitMemberReport;
}
 sb.auth.onAuthStateChange((event,session)=>{
  if(event!=='SIGNED_IN'&&event!=='SIGNED_OUT')return;
  setTimeout(()=>{
    void setUser(session?.user||null).catch(error=>{
      console.error('Erreur de chargement après authentification:',error);
      msg('authMessage',"Ton compte est connecté, mais le chargement de ton profil a échoué. Contacte l'administrateur.");
    });
  },0);
});
const sessionResult=await sb.auth.getSession();
if(sessionResult.error) throw sessionResult.error;
if(sessionResult.data.session) await setUser(sessionResult.data.session.user);
load();
await handlePublicMember();
}
async function setUser(u){
  currentUser=u;

  if(!u){
    currentMemberRecord=null;
    isAdmin=false;
    setAdminUI();
    await loadPublicCommissionDirectory();
    hide('logoutBtn');
    show('loginBtn');
    hide('memberDashboard');
    show('membershipFormSection');
    return;
  }

  hide('loginBtn');
  show('logoutBtn');

  const r=await sb.from('profiles')
    .select('role,full_name')
    .eq('id',u.id)
    .maybeSingle();

  if(r.error){
    console.error('Lecture du profil utilisateur impossible:',r.error);
    alert("Impossible de vérifier les droits de ce compte. Déconnecte-toi puis réessaie. Si le problème persiste, contacte l'administrateur.");
    await sb.auth.signOut();
    return;
  }
  if(!r.data){
    alert("Le profil de ce compte n'a pas été créé correctement. Contacte l'administrateur avant de réessayer.");
    await sb.auth.signOut();
    return;
  }

  isAdmin=r.data.role==='admin';
  setAdminUI();
  await loadPublicCommissionDirectory();

  const linkResult=await sb.rpc('link_my_member_account');
  if(linkResult.error){
    console.error('Liaison du compte à la fiche membre impossible:',linkResult.error);
    alert("Ton compte est connecté, mais la liaison à ta fiche membre n'a pas abouti. Contacte l'administrateur.");
  }

  const mr=await sb.from('members')
    .select('id,member_number,first_name,last_name,phone,email,status,membership_date,photo_url,commission_id,function_title,mission')
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
    await loadGeneralLeadership();
    await loadCommissions();
    await loadMembershipRequests();
    await initPortalAdminModules();
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
  void loadMemberNotifications();

  $('memberWelcome').textContent=member.first_name||'Membre';
  $('myMemberNumber').textContent=member.member_number||'—';
  $('myMemberName').textContent=(member.first_name||'')+' '+(member.last_name||'');
  $('myMemberPhone').textContent=member.phone||'—';
  $('myMemberEmail').textContent=member.email||'—';
  $('myMemberDate').textContent=member.membership_date||'—';
  $('myMemberStatus').textContent=member.status==='active'?'Actif':'Inactif';

  await loadMemberPaymentForm(member);

  // Commission personnelle : relire directement la commission liée à la fiche membre.
  // Cela évite de dépendre d'une ancienne relation ou d'un objet incomplet transmis à la fonction.
  const commissionName=$('myCommissionName');
  const commissionDescription=$('myCommissionDescription');
  const commissionRole=$('myCommissionRole');
  let commission=null;
  const generalLeadership=await getGeneralLeadershipForMember(member.id).catch(error=>{console.warn('Lecture direction générale impossible',error);return false;});
  const isGeneralDieuwrigne=!!generalLeadership;
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
  if(commissionName)commissionName.textContent=isGeneralDieuwrigne?'Direction générale':(commission?.name||'Aucune commission attribuée');
  if(commissionDescription){
    commissionDescription.textContent=isGeneralDieuwrigne?(generalLeadership.leadershipMission||generalLeadership.mission||GENERAL_DIEUWRIGNE_MISSION):((member.mission||'').trim()||(commission?.description||'Aucune description disponible pour le moment.'));
    commissionDescription.style.fontSize=isGeneralDieuwrigne?'8px':'';
    commissionDescription.style.lineHeight=isGeneralDieuwrigne?'1.15':'';
  }
  if(commissionRole){
    const roles=[];
    if(isGeneralDieuwrigne)roles.push(generalLeadership.title||'Dieuwrigne Général du Dahira');
    if(commission?.responsible_member_id===member.id)roles.push('Dieuwrigne de commission');
    if(commission?.successor_member_id===member.id)roles.push('Adjoint Dieuwrigne / successeur');
    commissionRole.textContent=isGeneralDieuwrigne?(generalLeadership.title||'Dieuwrigne Général du Dahira'):((member.function_title||'').trim()||(roles.length?roles.join(' · '):(commission?'Membre de la commission':'—')));
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
    .select('id,amount,payment_month,payment_date,payment_method,category,status,paid_at,created_at')
    .eq('member_id',member.id)
    .order('payment_month',{ascending:false});

  if(cr.error){
    $('myContributionRows').innerHTML='<tr><td colspan="6">Impossible de charger vos cotisations : '+esc(cr.error.message)+'</td></tr>';
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
        <td>${esc(contributionCategoryLabel(x.category))}</td>
        <td>${esc(formatMoney(x.amount))}</td>
        <td>${esc(contributionMethodLabel(x.payment_method))}</td>
        <td>${x.status==='paid'?'Payé':'En attente'}</td>
        <td>${esc(x.payment_date?new Date(x.payment_date+'T00:00:00').toLocaleDateString('fr-FR'):'—')}</td>
      </tr>
    `).join(''):'<tr><td colspan="6">Aucune cotisation enregistrée.</td></tr>';
  }

  // Transactions personnelles
  const pr=await sb.from('payment_transactions')
    .select('amount,payment_method,category,reference,payment_month,status,created_at,payer_name')
    .eq('member_id',member.id)
    .order('created_at',{ascending:false});

  if(pr.error){
    $('myPaymentRows').innerHTML='<tr><td colspan="6">Erreur de chargement.</td></tr>';
  }else{
    const rows=pr.data||[];
    $('myPaymentRows').innerHTML=rows.length?rows.map(x=>`
      <tr>
        <td>${esc(formatMoney(x.amount))}</td>
        <td>${esc(contributionCategoryLabel(x.category))}</td>
        <td>${esc(x.payment_method==='wave'?'Wave':'Orange Money')}</td>
        <td>${esc(x.reference||'—')}</td>
        <td>${esc(x.payer_name||'—')}</td>
        <td>${esc(x.status==='confirmed'?'Confirmé':x.status==='cancelled'?'Annulé':'En attente')}</td>
      </tr>
    `).join(''):'<tr><td colspan="6">Aucune transaction.</td></tr>';
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
          ${pdfUrl?`<iframe class="charter-pdf-viewer" title="Lecture de ${esc(x.title)}" src="${esc(pdfUrl)}#view=FitH" loading="lazy"></iframe>`:''}
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
    .select('id,member_id,amount,payment_month,payment_date,payment_method,category,status,reference,note,paid_at,members(member_number,first_name,last_name)')
    .order('paid_at',{ascending:false});

  if(r.error){
    msg('contributionMessage','Erreur : '+r.error.message);
    return;
  }

  const rows=r.data||[];
  window.__contributionRows=rows;
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

  renderContributionRows(rows);
}
function renderContributionRows(sourceRows){
  const search=($('contributionSearch')?.value||'').toLowerCase().trim();
  const month=$('contributionHistoryMonth')?.value||'';
  const category=$('contributionHistoryCategory')?.value||'';
  const status=$('contributionHistoryStatus')?.value||'';
  const rows=(sourceRows||[]).filter(x=>{
    const name=((x.members?.member_number||'')+' '+(x.members?.first_name||'')+' '+(x.members?.last_name||'')).toLowerCase();
    return (!search||name.includes(search))
      &&(!month||String(x.payment_month||'').startsWith(month))
      &&(!category||x.category===category)
      &&(!status||x.status===status);
  });
  $('contributionRows').innerHTML=rows.length
    ? rows.map(x=>`<tr>
        <td><strong>${esc(x.members?.member_number||'—')}</strong><br>${esc((x.members?.first_name||'')+' '+(x.members?.last_name||''))}</td>
        <td>${esc(contributionMonthLabel(x.payment_month))}</td>
        <td>${esc(contributionCategoryLabel(x.category))}</td>
        <td><strong>${esc(formatMoney(x.amount))}</strong></td>
        <td>${esc(contributionMethodLabel(x.payment_method))}</td>
        <td>${esc(x.reference||'—')}</td>
        <td>${esc(x.payment_date?new Date(x.payment_date+'T00:00:00').toLocaleDateString('fr-FR'):'—')}</td>
        <td>
          <button class="table-btn" data-action="print-receipt" data-id="${esc(x.id)}">🧾 Reçu</button>
          <button class="table-btn danger-btn" data-action="delete-contribution" data-id="${esc(x.id)}">Supprimer</button>
        </td>
      </tr>`).join('')
    : '<tr><td colspan="8">Aucune cotisation pour ces critères.</td></tr>';
}

async function addContribution(e){
  e.preventDefault();
  if(!isAdmin||!currentUser)return;

  const memberId=$('contributionMember').value;
  const paymentDate=$('contributionPaymentDate')?.value||'';
  syncContributionDate();
  const paymentMonth=contributionMonthDate();
  const amount=Number($('contributionAmount').value);
  const method=$('contributionMethod').value;
  const category=$('contributionCategory').value;
  const reference=$('contributionReference').value.trim()||null;
  const note=$('contributionNote').value.trim()||null;

  if(!memberId||!paymentMonth||!paymentDate||!amount||amount<=0){
    msg('contributionMessage','Sélectionne le membre, le mois, le jour du versement et un montant valide.');
    return;
  }

  // Les paiements digitaux doivent rester en attente jusqu'à vérification.
  const r=method==='especes'
    ? await sb.from('contributions').insert({
        member_id:memberId,amount,payment_month:paymentMonth,payment_date:paymentDate,
        payment_method:method,category,status:'paid',reference,note
      })
    : await sb.from('payment_transactions').insert({
        member_id:memberId,amount,payment_month:paymentMonth,payment_date:paymentDate,
        payment_method:method,category,status:'pending',reference,note
      });

  if(r.error){
    msg('contributionMessage','Erreur : '+r.error.message);
    return;
  }

  msg('contributionMessage',method==='especes'
    ?'Cotisation en espèces enregistrée.'
    :'Paiement numérique enregistré en attente de vérification dans le module Paiements.',true);
  e.target.reset();
  const dateInput=$('contributionPaymentDate');
  if(dateInput)dateInput.value=new Date().toISOString().slice(0,10);
  syncContributionDate();
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
    .select('id,member_id,amount,payment_month,payment_date,payment_method,category,status,reference,note,paid_at,members(member_number,first_name,last_name)')
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
  ['mensualite','tombe_dahira','chasse','divers'].forEach(category=>{
    const amount=rows.filter(x=>x.category===category).reduce((sum,x)=>sum+Number(x.amount||0),0);
    const target=$('financeCategory_'+category);
    if(target)target.textContent=formatMoney(amount);
  });

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
  const category=$('financeCategoryFilter')?.value||'';

  const filtered=rows.filter(x=>{
    const okMember=!memberId || x.member_id===memberId;
    const okMonth=!month || String(x.payment_month||'').startsWith(month);
    const okCategory=!category || x.category===category;
    return okMember && okMonth && okCategory;
  });

  $('financeRows').innerHTML=filtered.length ? filtered.map(x=>`<tr>
    <td><strong>${esc(x.members?.member_number||'—')}</strong><br>${esc((x.members?.first_name||'')+' '+(x.members?.last_name||''))}</td>
    <td>${esc(contributionMonthLabel(x.payment_month))}</td>
    <td>${esc(contributionCategoryLabel(x.category))}</td>
    <td><strong>${esc(formatMoney(x.amount))}</strong></td>
    <td>${esc(contributionMethodLabel(x.payment_method))}</td>
    <td>${esc(x.payment_date?new Date(x.payment_date+'T00:00:00').toLocaleDateString('fr-FR'):'—')}</td>
    <td><button class="table-btn" data-action="print-receipt" data-id="${esc(x.id)}">🧾 Imprimer</button></td>
  </tr>`).join('') : '<tr><td colspan="7">Aucune cotisation pour ces critères.</td></tr>';
}

async function exportFinanceCSV(){
  if(!sb||!isAdmin)return;
  const r=await sb.from('contributions')
    .select('member_id,amount,payment_month,payment_date,payment_method,category,status,reference,paid_at,members(member_number,first_name,last_name)')
    .order('paid_at',{ascending:false});
  if(r.error){alert(r.error.message);return;}

  const rows=r.data||[];
  const memberId=$('financeMemberFilter')?.value||'';
  const month=$('financeMonthFilter')?.value||'';
  const category=$('financeCategoryFilter')?.value||'';
  const filtered=rows.filter(x=>
    (!memberId||x.member_id===memberId) &&
    (!month||String(x.payment_month||'').startsWith(month)) &&
    (!category||x.category===category)
  );

  const lines=[
    ['N° membre','Nom','Mois','Catégorie','Montant FCFA','Mode','Statut','Référence','Date'].map(csvCell).join(';'),
    ...filtered.map(x=>[
      x.members?.member_number||'',
      `${x.members?.first_name||''} ${x.members?.last_name||''}`.trim(),
      x.payment_month||'',
      contributionCategoryLabel(x.category),
      Number(x.amount||0),
      contributionMethodLabel(x.payment_method),
      x.status||'',
      x.reference||'',
      x.payment_date?new Date(x.payment_date+'T00:00:00').toLocaleDateString('fr-FR'):''
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
    ['Commission','Description','Statut','Dieuwrigne','Adjoint Dieuwrigne'],rows);
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
  
/* Logo d'impression : pastille noire réduite et strictement circulaire. */
#memberCard .print-sheet .card-top img.card-emblem{
  display:block!important;
  position:relative!important;
  inset:auto!important;
  flex:0 0 34px!important;
  width:34px!important;
  min-width:34px!important;
  max-width:34px!important;
  height:34px!important;
  min-height:34px!important;
  max-height:34px!important;
  aspect-ratio:1/1!important;
  object-fit:cover!important;
  object-position:50% 58%!important;
  clip-path:circle(50% at 50% 50%)!important;
  border-radius:50%!important;
  overflow:hidden!important;
  margin:2px auto 0!important;
  padding:0!important;
  border:0!important;
  box-shadow:none!important;
  transform:none!important;
}
</style></head><body><div class="receipt">
  <h1>Daara Jazbul Qulub</h1><div class="sub">Reçu de cotisation</div>
  <div class="line"><b>N° membre</b><span>${esc(x.members?.member_number||'—')}</span></div>
  <div class="line"><b>Membre</b><span>${esc(member.trim())}</span></div>
  <div class="line"><b>Mois</b><span>${esc(contributionMonthLabel(x.payment_month))}</span></div>
  <div class="line"><b>Catégorie</b><span>${esc(contributionCategoryLabel(x.category))}</span></div>
  <div class="line"><b>Mode</b><span>${esc(contributionMethodLabel(x.payment_method))}</span></div>
  <div class="line"><b>Référence</b><span>${esc(x.reference||'—')}</span></div>
  <div class="amount">Montant : ${esc(formatMoney(x.amount))}</div>
  <div class="line"><b>Date du versement</b><span>${esc(x.payment_date?new Date(x.payment_date+'T00:00:00').toLocaleDateString('fr-FR'):'—')}</span></div>
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
   .select('id,member_number,first_name,last_name,phone,email,status,membership_date,photo_url,commission_id,function_title,mission,created_at')
   .order('member_number',{ascending:true});
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
 const r=await sb.from('members').insert({first_name:$('memberFirstName').value.trim(),last_name:$('memberLastName').value.trim(),phone:$('memberPhone').value.trim()||null,email:$('memberEmail').value.trim()||null,commission_id:$('memberCommission')?.value||null,function_title:$('memberFunctionTitle')?.value.trim()||null,mission:$('memberMission')?.value.trim()||null}).select('id,member_number').single();
 if(r.error){msg('memberMessage',r.error.message);return}
 if(file){const ext=(file.name.split('.').pop()||'jpg').toLowerCase();const path=`${r.data.member_number}-${Date.now()}.${ext}`;const up=await sb.storage.from('member-photos').upload(path,file,{upsert:false,contentType:file.type});if(up.error){await sb.from('members').delete().eq('id',r.data.id);msg('memberMessage','Membre non créé : '+up.error.message);return}photoUrl=sb.storage.from('member-photos').getPublicUrl(path).data.publicUrl;const ur=await sb.from('members').update({photo_url:photoUrl}).eq('id',r.data.id);if(ur.error){msg('memberMessage','Membre créé, mais photo non enregistrée : '+ur.error.message,true)} }
 msg('memberMessage','Membre créé : '+r.data.member_number,true);e.target.reset();await loadMembers();await loadCommissions();
}
function previewMemberPhoto(e){const f=e.target.files[0];if(!f)return;const img=$('photoPreview');img.src=URL.createObjectURL(f);show('photoPreviewWrap');$('photoPreviewName').textContent=f.name}
const GENERAL_DIEUWRIGNE_MISSION='Assurer la direction et la coordination générale du Dahira. Superviser les différentes commissions, veiller à leur bon fonctionnement, coordonner leurs responsables, suivre l’exécution des décisions et orienter les activités vers la réalisation des objectifs du Dahira, dans un esprit d’unité, de discipline et de solidarité.';
async function getGeneralLeadershipForMember(memberId){
  const result=await sb.from('dahira_general_leadership').select('member_id,title,mission').eq('member_id',memberId).maybeSingle();
  if(result.error)throw result.error;
  if(!result.data)return false;
  return {...result.data,isGeneralDieuwrigne:true,leadershipMission:result.data.mission||GENERAL_DIEUWRIGNE_MISSION};
}
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
 const leadership=await getGeneralLeadershipForMember(member.id).catch(error=>{console.warn('Lecture direction générale impossible',error);return false;});
 showMemberCard({...member,commissions:commission,isGeneralDieuwrigne:!!leadership,...(leadership||{})});
}
function formatMemberCardDate(value){if(!value)return '—';const s=String(value).slice(0,10);const m=s.match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?`${m[1]} | ${m[2]} | ${m[3]}`:s;}
function showMemberCard(m){
 currentCardMember={...m};
 const commission=m.isGeneralDieuwrigne?'Direction générale':(m.commissions?.name||'Aucune commission');
 const defaultRole=m.isGeneralDieuwrigne?'Dieuwrigne Général du Dahira':(m.commissions?.responsible_member_id===m.id?'Dieuwrigne de commission':(m.commissions?.successor_member_id===m.id?'Adjoint Dieuwrigne':(m.commission_id?'Membre de la commission':'Membre')));
 const role=(m.isGeneralDieuwrigne?(m.title||'Dieuwrigne Général du Dahira'):(m.function_title||'').trim()||defaultRole);
 const mission=(m.isGeneralDieuwrigne?(m.leadershipMission||m.mission||GENERAL_DIEUWRIGNE_MISSION):((m.mission||'').trim()||(m.commissions?.description||'Participation aux activités et aux travaux de sa commission.')));
 show('memberCard');$('cardIntro').textContent='Carte de '+m.first_name+' '+m.last_name;$('cardName').textContent=(m.first_name+' '+m.last_name).trim();$('cardNumber').textContent=m.member_number;$('cardPhone').textContent=m.phone||'Non renseigné';$('cardCommission').textContent=commission;$('cardCommission').closest('p').style.display=m.isGeneralDieuwrigne?'none':'';$('cardCommissionRole').textContent=role;$('cardCommissionDescription').textContent=mission;$('cardCommissionDescription').style.fontSize=m.isGeneralDieuwrigne?'8px':'';$('cardCommissionDescription').style.lineHeight=m.isGeneralDieuwrigne?'1.15':'';$('cardMissionLabel').textContent=m.isGeneralDieuwrigne?'Mission du Dieuwrigne Général :':'Mission :';$('cardDate').textContent=formatMemberCardDate(m.membership_date);$('cardStatus').textContent=m.status==='active'?'Actif':'Inactif';$('cardPhoto').src=m.photo_url||'';$('cardPhoto').style.display=m.photo_url?'block':'none';$('qrcode').innerHTML='';const url=location.origin+location.pathname+'?member='+encodeURIComponent(m.member_number);new QRCode($('qrcode'),{text:url,width:104,height:104,colorDark:'#075c2d',colorLight:'#ffffff'});document.getElementById('memberCard').scrollIntoView({behavior:'smooth'});
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
    <div class="verify-organization"><strong>DAHIRA JAZBUL QULOUB</strong><span>CELLULE DAKAR</span></div>
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


let currentCardMember=null;
function memberCardPrintMarkup(m){
 const template=document.querySelector('#printCard');
 if(!template)throw new Error('Modèle de carte introuvable.');
 const card=template.cloneNode(true);
 card.removeAttribute('id');
 card.classList.add('print-card-copy');
 const commission=m.isGeneralDieuwrigne?'Direction générale':(m.commissions?.name||'Aucune commission');
 const defaultRole=m.isGeneralDieuwrigne?'Dieuwrigne Général du Dahira':(m.commissions?.responsible_member_id===m.id?'Dieuwrigne de commission':(m.commissions?.successor_member_id===m.id?'Adjoint Dieuwrigne':(m.commission_id?'Membre de la commission':'Membre')));
 const role=m.isGeneralDieuwrigne?(m.title||'Dieuwrigne Général du Dahira'):((m.function_title||'').trim()||defaultRole);
 const mission=m.isGeneralDieuwrigne?(m.leadershipMission||m.mission||GENERAL_DIEUWRIGNE_MISSION):((m.mission||'').trim()||(m.commissions?.description||'Participation aux activités et aux travaux de sa commission.'));
 card.querySelector('.card-background').src='carte-fond-nettoye.jpg';
 const memberPhoto=card.querySelector('.card-photo');memberPhoto.src=m.photo_url||'';memberPhoto.style.display=m.photo_url?'block':'none';
 card.querySelector('.card-info h3').textContent=(m.first_name+' '+m.last_name).trim();
 const values={cardNumber:m.member_number,cardPhone:m.phone||'Non renseigné',cardCommission:commission,cardCommissionRole:role,cardCommissionDescription:mission,cardDate:formatMemberCardDate(m.membership_date),cardStatus:m.status==='active'?'ACTIF':'INACTIF'};
 Object.entries(values).forEach(([id,value])=>{const node=card.querySelector('#'+id);if(node)node.textContent=value;});
 const commissionLine=card.querySelector('#cardCommission')?.closest('p');
 if(commissionLine)commissionLine.style.display=m.isGeneralDieuwrigne?'none':'';
 const missionText=card.querySelector('#cardCommissionDescription');
 if(missionText){missionText.style.fontSize=m.isGeneralDieuwrigne?'8px':'';missionText.style.lineHeight=m.isGeneralDieuwrigne?'1.15':'';}
 const missionLabel=card.querySelector('#cardMissionLabel');
 if(missionLabel)missionLabel.textContent=m.isGeneralDieuwrigne?'Mission du Dieuwrigne Général :':'Mission :';
 const qr=card.querySelector('.qrcode');
 qr.innerHTML='';
 new QRCode(qr,{text:location.origin+location.pathname+'?member='+encodeURIComponent(m.member_number),width:104,height:104,colorDark:'#075c2d',colorLight:'#ffffff'});
 const qrCanvas=qr.querySelector('canvas');
 const qrGeneratedImage=qr.querySelector('img');
 const qrSource=qrCanvas?qrCanvas.toDataURL('image/png'):(qrGeneratedImage?.src||'');
 if(qrSource){
  const qrImage=document.createElement('img');
  qrImage.src=qrSource;
  qrImage.alt='QR code du membre '+(m.member_number||'');
  qrImage.width=104;
  qrImage.height=104;
  qr.innerHTML='';
  qr.appendChild(qrImage);
 }else{
  throw new Error('Le QR code du membre n’a pas pu être généré.');
 }
 return card.outerHTML;
}
function openMemberCardsPrint(members,title){
 if(!members.length){alert('Aucun membre actif à imprimer.');return;}
 const w=window.open('','_blank','width=900,height=1000');
 if(!w){alert('Autorise les fenêtres pop-up pour imprimer les cartes.');return;}
 try{
  const cardMarkup=members.map(memberCardPrintMarkup);
   const cards=Array.from({length:Math.ceil(cardMarkup.length/9)},(_,page)=>'<section class="print-sheet">'+cardMarkup.slice(page*9,(page+1)*9).join('')+'</section>').join('');
  const stylesheet=new URL('style.css?v=20261105-qr-16-v12',location.href).href;
  w.document.open();
  w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><link rel="stylesheet" href="${stylesheet}"><style>
@page{size:A4 portrait;margin:10mm}
*{box-sizing:border-box}
html,body{margin:0!important;padding:0!important;width:100%!important;background:#fff!important;color:#17351f!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;forced-color-adjust:none!important}
#memberCard{display:block!important;width:100%!important;max-width:none!important;margin:0!important;padding:0!important;background:transparent!important}
.print-sheet{display:grid!important;grid-template-columns:repeat(3,206.93px)!important;grid-template-rows:repeat(3,310.4px)!important;gap:3mm!important;align-content:center!important;justify-content:center!important;width:100%!important;height:277mm!important;min-height:277mm!important;margin:0!important;padding:0!important;box-sizing:border-box!important;break-after:page!important;page-break-after:always!important}
.print-sheet:last-child{break-after:auto!important;page-break-after:auto!important}
#memberCard .print-sheet .member-card{display:flex!important;flex:0 0 206.93px!important;flex-direction:column!important;gap:5px!important;width:206.93px!important;height:310.4px!important;min-width:206.93px!important;min-height:297.64px!important;max-width:206.93px!important;max-height:297.64px!important;margin:0 auto!important;padding:8px!important;overflow:hidden!important;box-sizing:border-box!important;border-radius:7px!important;box-shadow:none!important;color:#17351f!important;break-inside:avoid!important;page-break-inside:avoid!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
#memberCard .print-sheet .card-top{position:relative!important;display:flex!important;flex:0 0 48px!important;align-items:center!important;justify-content:center!important;gap:4px!important;width:100%!important;height:48px!important;min-height:48px!important;padding:2px 45px!important;overflow:hidden!important;box-sizing:border-box!important;text-align:center!important}
#memberCard .print-sheet .card-top img{position:absolute!important;right:1px!important;top:3px!important;width:40px!important;height:40px!important;min-width:40px!important;max-width:40px!important;object-fit:contain!important;padding:2px!important;flex:0 0 40px!important}
#memberCard .print-sheet .card-top strong{display:block!important;font-size:8px!important;line-height:1.15!important;letter-spacing:0!important;overflow-wrap:anywhere!important}
#memberCard .print-sheet .card-top small{display:inline-block!important;margin-top:2px!important;padding:2px 3px!important;background:#f8fcf8!important;color:#075b35!important;font-size:6px!important;line-height:1.1!important;letter-spacing:0!important}
#memberCard .print-sheet .card-body{display:grid!important;flex:1 1 auto!important;grid-template-columns:52px minmax(0,1fr)!important;grid-template-rows:auto minmax(0,1fr)!important;gap:5px!important;align-items:start!important;width:100%!important;min-width:0!important;min-height:0!important;padding:6px 0!important;overflow:hidden!important}
#memberCard .print-sheet .card-photo{display:block!important;grid-column:1!important;grid-row:1!important;width:52px!important;height:64px!important;min-width:52px!important;max-width:52px!important;margin:0!important;object-fit:cover!important;border-radius:5px!important;background:#fff!important}
#memberCard .print-sheet .card-info{display:block!important;grid-column:2!important;grid-row:1!important;min-width:0!important;max-width:100%!important;margin:0!important;padding:0!important;overflow:visible!important;overflow-wrap:anywhere!important}
#memberCard .print-sheet .card-info h3{margin:0 0 4px!important;padding:0 0 3px!important;font-size:9px!important;line-height:1.15!important;overflow-wrap:anywhere!important;word-break:break-word!important}
#memberCard .print-sheet .card-info p{margin:2px 0!important;padding:1px 2px!important;font-size:6px!important;line-height:1.2!important;white-space:normal!important;overflow-wrap:anywhere!important;word-break:break-word!important}
#memberCard .print-sheet .card-info p b{font-size:6px!important}
#memberCard .print-sheet .qrcode{display:flex!important;grid-column:1 / -1!important;grid-row:2!important;justify-self:center!important;align-self:end!important;width:46px!important;height:46px!important;min-width:46px!important;max-width:46px!important;min-height:46px!important;max-height:46px!important;margin:3px 0 0!important;padding:3px!important;overflow:hidden!important;box-sizing:border-box!important;align-items:center!important;justify-content:center!important;background:#fff!important;border-radius:4px!important}
#memberCard .print-sheet .qrcode img{display:block!important;width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;object-fit:contain!important;image-rendering:pixelated!important}
#memberCard .print-sheet .card-bottom{display:block!important;position:relative!important;flex:0 0 22px!important;width:100%!important;height:22px!important;min-height:22px!important;margin:0!important;padding:5px 3px!important;overflow:hidden!important;text-align:center!important;font-size:6px!important;line-height:1.2!important;letter-spacing:.2px!important;overflow-wrap:anywhere!important}
#memberCard .print-sheet .member-card,#memberCard .print-sheet .member-card *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;forced-color-adjust:none!important}
@media screen{body{padding:18px!important;background:#eee!important}.print-sheet{height:277mm!important;margin:0 auto 18px!important;background:#fff!important}.print-sheet .member-card{box-shadow:0 8px 24px #0002!important}}
/* Impression groupée : jusqu'à 9 cartes par feuille A4, puis feuille suivante. */
.print-sheet{display:grid!important;grid-template-columns:repeat(3,206.93px)!important;grid-auto-rows:297.64px!important;align-content:center!important;justify-content:center!important;gap:4mm!important;width:100%!important;height:277mm!important;min-height:277mm!important;break-after:page!important;page-break-after:always!important}
.print-sheet:last-child{break-after:auto!important;page-break-after:auto!important}
@media screen{.print-sheet{display:grid!important;grid-template-columns:repeat(3,206.93px)!important;grid-auto-rows:297.64px!important;align-content:center!important;justify-content:center!important;gap:4mm!important}}

/* Carte membre modèle vert/blanc — conserver le format historique */
#memberCard .print-sheet .member-card{position:relative!important;isolation:isolate!important;display:flex!important;flex:0 0 206.93px!important;flex-direction:column!important;gap:0!important;width:206.93px!important;height:297.64px!important;min-width:206.93px!important;min-height:297.64px!important;max-width:206.93px!important;max-height:297.64px!important;margin:0 auto!important;padding:0!important;overflow:hidden!important;border-radius:0!important;background:#fafffc!important;color:#075b35!important;box-shadow:none!important}
#memberCard .print-sheet .member-card:before{content:""!important;position:absolute!important;z-index:-1!important;left:-14%!important;top:-15%!important;width:128%!important;height:49%!important;background:radial-gradient(ellipse at 50% 0%,#168b4f 0%,#08703b 67%,#075b35 100%)!important;border-bottom:5px solid #0b7844!important;border-radius:0 0 50% 50%/0 0 24% 24%!important;box-shadow:0 7px 0 #5ab884!important}
#memberCard .print-sheet .member-card:after{content:""!important;position:absolute!important;z-index:-1!important;inset:42% 0 0!important;background:linear-gradient(135deg,#fff 0%,#f8fffb 100%)!important}
#memberCard .print-sheet .card-top{position:relative!important;display:flex!important;flex-direction:column!important;flex:0 0 35%!important;align-items:center!important;justify-content:flex-start!important;gap:5px!important;width:100%!important;height:35%!important;min-height:0!important;padding:9px 5% 0!important;border:0!important;text-align:center!important;background:transparent!important}
#memberCard .print-sheet .card-heading{width:92%!important;display:flex!important;flex-direction:column!important;align-items:center!important;gap:2px!important}
#memberCard .print-sheet .card-heading strong{font-family:Georgia,'Times New Roman',serif!important;font-size:23px!important;font-weight:500!important;line-height:1.05!important;letter-spacing:.5px!important;color:#fff!important}
#memberCard .print-sheet .card-heading small{font-family:Arial,sans-serif!important;font-size:7.8px!important;font-weight:800!important;line-height:1.15!important;color:#fff!important;padding:2px 4px!important;border:1px solid #ffffff30!important;background:#086b3a!important}
#memberCard .print-sheet .card-top img{position:relative!important;top:auto!important;right:auto!important;width:24%!important;height:auto!important;aspect-ratio:1!important;min-width:0!important;max-width:50px!important;min-height:0!important;object-fit:cover!important;border-radius:50%!important;border:2px solid #fff!important;box-shadow:0 0 0 1px #075b35!important;margin-top:1px!important;padding:0!important}
#memberCard .print-sheet .card-body{position:relative!important;display:grid!important;flex:1 1 auto!important;grid-template-columns:27% minmax(0,1fr)!important;grid-template-rows:1fr!important;gap:4%!important;align-items:start!important;width:100%!important;min-height:0!important;padding:3% 4% 12%!important;overflow:hidden!important}
#memberCard .print-sheet .card-photo-frame{position:relative!important;grid-column:1!important;grid-row:1!important;width:100%!important;aspect-ratio:.72!important;border:1.5px solid #d8b653!important;border-radius:5px!important;background:#fff!important;box-shadow:0 2px 6px rgba(6,59,32,.14)!important;overflow:hidden!important;display:flex!important;align-items:center!important;justify-content:center!important;margin-top:5px!important}
#memberCard .print-sheet .card-photo{width:100%!important;height:100%!important;object-fit:cover!important;border:0!important;border-radius:0!important;background:#a8d4b7!important}
#memberCard .print-sheet .card-photo-frame:has(.card-photo[src="logo.jpeg"]) .card-photo{opacity:0!important}
#memberCard .print-sheet .card-photo[style*="display: none"]{display:none!important}
#memberCard .print-sheet .card-photo-placeholder{display:block!important;position:absolute!important;color:#fff!important;font-size:12px!important;font-weight:800!important;pointer-events:none!important}
#memberCard .print-sheet .card-photo-frame:not(:has(.card-photo[src="logo.jpeg"])) .card-photo-placeholder{display:none!important}
#memberCard .print-sheet .card-info{grid-column:2!important;grid-row:1!important;min-width:0!important;padding:0!important;color:#075b35!important;text-align:left!important}
#memberCard .print-sheet .card-info h3{font-size:10.5px!important;line-height:1.05!important;font-weight:900!important;color:#050505!important;border-bottom:2px dashed #111!important;padding:0 0 3px!important;margin:0 0 5px!important}
#memberCard .print-sheet .card-info p{font-size:6.1px!important;line-height:1.35!important;font-weight:700!important;margin:3px 0!important;padding:0!important;color:#075b35!important;white-space:normal!important;overflow-wrap:anywhere!important}
#memberCard .print-sheet .card-info p b{font-weight:500!important;text-decoration:underline!important;text-decoration-color:#aaa!important;text-underline-offset:1px!important}
#memberCard .print-sheet .card-body{grid-template-rows:minmax(0,1fr) auto!important;gap:3.5%!important}
#memberCard .print-sheet .card-info{grid-row:1 / span 2!important}
#memberCard .print-sheet .qrcode{display:flex!important;grid-column:1!important;grid-row:2!important;justify-self:center!important;align-self:start!important;width:46px!important;height:46px!important;min-width:46px!important;min-height:46px!important;margin:4px 0 0!important;padding:2px!important;background:#fff!important;border:1px solid #075b35!important;border-radius:2px!important;align-items:center!important;justify-content:center!important}
#memberCard .print-sheet .qrcode img{display:block!important;width:100%!important;height:100%!important;object-fit:contain!important}
#memberCard .print-sheet .card-photo-placeholder{display:block!important;position:absolute!important;color:#fff!important;font-size:7px!important;font-weight:800!important;pointer-events:none!important}
#memberCard .print-sheet .card-photo-frame:has(.card-photo[style*="display: block"]) .card-photo-placeholder{display:none!important}
#memberCard .print-sheet .card-top img{position:relative!important;inset:auto!important;display:block!important;margin:2px auto 0!important;width:25%!important;height:auto!important;max-width:50px!important;aspect-ratio:1!important;object-fit:cover!important;border:2px solid #fff!important;box-shadow:0 0 0 1px #075b35!important}
#memberCard .print-sheet .card-heading strong{-webkit-text-stroke:.25px #fff!important;text-shadow:1px 1px 0 #075b35,-1px -1px 0 #075b35!important}
#memberCard .print-sheet .card-heading small{background:transparent!important;border:1px solid #a6c77b!important;color:#fff!important}
#memberCard .print-sheet .card-bottom{position:absolute!important;left:4%!important;right:4%!important;bottom:3%!important;flex:0 0 auto!important;width:auto!important;height:auto!important;min-height:0!important;margin:0!important;padding:7px 3px!important;overflow:hidden!important;background:#076333!important;color:#fff!important;border:0!important;text-align:center!important;font-size:7px!important;line-height:1.2!important;font-weight:900!important;opacity:1!important}
#memberCard .print-sheet .card-bottom:after{content:""!important;display:block!important;border-bottom:1px solid #fff!important;margin:2px 4% 0!important}

/* Final corrections: logo centré, vraie photo uniquement, QR visible */
#memberCard .print-sheet .member-card{gap:0!important;background:#fbfffc!important;border-radius:0!important}
#memberCard .print-sheet .card-top{flex:0 0 35%!important;height:35%!important;min-height:0!important;display:flex!important;flex-direction:column!important;justify-content:flex-start!important;align-items:center!important;padding:8px 4% 0!important;gap:4px!important;background:transparent!important;border:0!important}
#memberCard .print-sheet .card-heading{width:100%!important;display:flex!important;flex-direction:column!important;align-items:center!important;gap:3px!important}
#memberCard .print-sheet .card-heading strong{font-family:Georgia,'Times New Roman',serif!important;font-size:23px!important;line-height:1.02!important;font-weight:500!important;color:#fff!important;white-space:nowrap!important}
#memberCard .print-sheet .card-heading small{display:block!important;width:92%!important;margin:0!important;padding:3px 2px!important;background:#086b3a!important;border:1px solid #ffffff30!important;color:#fff!important;font-family:Arial,sans-serif!important;font-size:7.5px!important;line-height:1.15!important;text-align:center!important}
#memberCard .print-sheet .card-top img{position:relative!important;top:auto!important;right:auto!important;display:block!important;width:50px!important;height:50px!important;min-width:50px!important;max-width:50px!important;min-height:50px!important;max-height:50px!important;margin:0 auto!important;padding:2px!important;object-fit:contain!important;border:2px solid #fff!important;border-radius:50%!important;box-shadow:0 0 0 1px #075b35!important;background:transparent!important}
#memberCard .print-sheet .card-body{flex:1 1 auto!important;display:grid!important;grid-template-columns:27% minmax(0,1fr)!important;grid-template-rows:auto minmax(0,1fr)!important;gap:4%!important;align-items:start!important;padding:3% 4% 14%!important;min-height:0!important;overflow:hidden!important}
#memberCard .print-sheet .card-photo-frame{position:relative!important;grid-column:1!important;grid-row:1!important;display:flex!important;align-items:center!important;justify-content:center!important;width:100%!important;height:auto!important;aspect-ratio:.72!important;margin:5px 0 0!important;padding:0!important;overflow:hidden!important;border:1.5px solid #d8b653!important;border-radius:5px!important;background:#fff!important;box-shadow:0 2px 6px rgba(6,59,32,.14)!important;}
#memberCard .print-sheet .card-photo{display:block!important;width:100%!important;height:100%!important;min-width:0!important;max-width:100%!important;object-fit:cover!important;margin:0!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important}
#memberCard .print-sheet .card-photo[style*="display: none"]{display:none!important}
#memberCard .print-sheet .card-info{grid-column:2!important;grid-row:1 / span 2!important;min-width:0!important;margin:0!important;padding:0!important;text-align:left!important;color:#075b35!important}
#memberCard .print-sheet .card-info h3{font-size:10.5px!important;line-height:1.05!important;font-weight:900!important;color:#050505!important;border-bottom:2px dashed #111!important;padding:0 0 3px!important;margin:0 0 5px!important}
#memberCard .print-sheet .card-info p{font-size:6.1px!important;line-height:1.28!important;font-weight:700!important;margin:3px 0!important;padding:0!important;color:#075b35!important;white-space:normal!important;overflow-wrap:anywhere!important;word-break:break-word!important}
#memberCard .print-sheet .card-info p b{font-weight:500!important;text-decoration:underline!important;text-underline-offset:1px!important}
#memberCard .print-sheet .qrcode{display:flex!important;grid-column:1!important;grid-row:2!important;justify-self:center!important;align-self:start!important;width:38px!important;height:38px!important;min-width:38px!important;max-width:38px!important;min-height:38px!important;max-height:38px!important;margin:5px 0 0!important;padding:2px!important;overflow:hidden!important;background:#fff!important;border:1px solid #075b35!important;border-radius:2px!important;align-items:center!important;justify-content:center!important}
#memberCard .print-sheet .qrcode img{display:block!important;width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;object-fit:contain!important}
#memberCard .print-sheet .card-bottom{position:absolute!important;left:4%!important;right:4%!important;bottom:3%!important;display:block!important;width:auto!important;height:auto!important;min-height:0!important;margin:0!important;padding:7px 3px!important;background:#076333!important;color:#fff!important;border:0!important;text-align:center!important;font-size:7px!important;line-height:1.2!important;font-weight:900!important;overflow-wrap:anywhere!important}

/* Print: même demi-cercle, logo officiel visible au centre */
#memberCard .print-sheet .member-card{isolation:isolate!important;background:#fbfcf8!important;position:relative!important}
#memberCard .print-sheet .member-card:before{content:""!important;position:absolute!important;z-index:0!important;left:-20%!important;top:-1%!important;width:140%!important;height:43%!important;background:linear-gradient(145deg,#087e48 0%,#006236 55%,#075b35 100%)!important;border:0!important;border-bottom:3px solid #0a7543!important;border-radius:0 0 50% 50%/0 0 100% 100%!important;box-shadow:0 4px 0 #fff,0 7px 0 #58b77d,0 10px 0 #fff,0 13px 0 #0b8150!important}
#memberCard .print-sheet .member-card:after{content:""!important;position:absolute!important;z-index:0!important;left:0!important;right:0!important;top:36%!important;bottom:0!important;background:#fbfcf8!important}
#memberCard .print-sheet .card-top{position:relative!important;z-index:3!important;display:flex!important;flex:0 0 37%!important;height:37%!important;min-height:37%!important;flex-direction:column!important;align-items:center!important;justify-content:flex-start!important;gap:3px!important;padding:9px 5% 0!important;overflow:visible!important;background:transparent!important}
#memberCard .print-sheet .card-heading{position:relative!important;z-index:2!important;width:92%!important;display:flex!important;flex-direction:column!important;align-items:center!important;gap:2px!important}
#memberCard .print-sheet .card-heading strong{font-size:22px!important;line-height:1.05!important;color:#fff!important}
#memberCard .print-sheet .card-heading small{font-size:7.4px!important;line-height:1.12!important;color:#fff!important;background:transparent!important;border:1px solid #b8d49c!important;padding:2px 4px!important}
#memberCard .print-sheet .card-top img.card-emblem{display:block!important;position:relative!important;z-index:4!important;inset:auto!important;flex:0 0 auto!important;width:18%!important;max-width:43px!important;min-width:0!important;height:auto!important;aspect-ratio:1!important;object-fit:contain!important;margin:2px auto 0!important;padding:1px!important;border:1.5px solid #fff!important;border-radius:50%!important;background:#fff!important;box-shadow:0 2px 5px rgba(0,0,0,.2)!important}
#memberCard .print-sheet .card-body{position:relative!important;z-index:2!important;display:grid!important;grid-template-columns:27% minmax(0,1fr)!important;grid-template-rows:minmax(0,1fr) auto!important;gap:3.5%!important;align-items:start!important;flex:1 1 auto!important;padding:3% 4% 12%!important;background:transparent!important}
#memberCard .print-sheet .card-photo-placeholder{display:none!important}
#memberCard .print-sheet .card-info{position:relative!important;z-index:2!important;grid-column:2!important;grid-row:1 / span 2!important}
#memberCard .print-sheet .qrcode{position:relative!important;z-index:2!important;display:flex!important;grid-column:1!important;grid-row:2!important;justify-self:center!important;align-self:start!important;width:38px!important;height:38px!important;min-width:38px!important;max-width:38px!important;min-height:38px!important;max-height:38px!important;margin:5px 0 0!important;padding:2px!important}

/* Carte basée sur l'image vierge originale : aucun élément graphique n'est recréé. */
#memberCard .print-sheet .member-card{position:relative!important;isolation:isolate!important;display:block!important;flex:0 0 206.93px!important;width:206.93px!important;height:297.64px!important;min-width:206.93px!important;min-height:297.64px!important;max-width:206.93px!important;max-height:297.64px!important;margin:0!important;padding:0!important;overflow:hidden!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;aspect-ratio:auto!important}
#memberCard .print-sheet .member-card:before,#memberCard .print-sheet .member-card:after{display:none!important;content:none!important}
#memberCard .print-sheet .card-background{position:absolute!important;inset:0!important;display:block!important;width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;object-fit:fill!important;margin:0!important;padding:0!important;border:0!important}
#memberCard .print-sheet .card-photo-frame{position:absolute!important;left:5.2%!important;top:40.1%!important;width:22.5%!important;height:20.1%!important;margin:0!important;padding:0!important;overflow:hidden!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important}
#memberCard .print-sheet .card-photo{display:block!important;width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;object-fit:cover!important;margin:0!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important}
#memberCard .print-sheet .card-photo[style*="display: none"]{display:none!important}
#memberCard .print-sheet .card-info{position:absolute!important;left:33.2%!important;top:39.5%!important;width:62.5%!important;height:47%!important;min-width:0!important;margin:0!important;padding:0!important;overflow:hidden!important;color:#075b35!important;text-align:left!important;background:transparent!important}
#memberCard .print-sheet .card-info h3{margin:0 0 5px!important;padding:0 0 3px!important;border-bottom:1px dashed #075b35!important;color:#111!important;font-size:9px!important;font-weight:900!important;line-height:1.15!important;overflow-wrap:anywhere!important;word-break:break-word!important}
#memberCard .print-sheet .card-info p{margin:3px 0!important;padding:0!important;color:#075b35!important;font-size:6.2px!important;font-weight:700!important;line-height:1.28!important;white-space:normal!important;overflow-wrap:anywhere!important;word-break:break-word!important}
#memberCard .print-sheet .card-info p b{font-size:6.2px!important;font-weight:700!important;text-decoration:none!important}
#memberCard .print-sheet .qrcode{position:absolute!important;left:8.2%!important;top:64%!important;display:flex!important;width:36px!important;height:36px!important;min-width:36px!important;max-width:36px!important;min-height:36px!important;max-height:36px!important;margin:0!important;padding:2px!important;overflow:hidden!important;align-items:center!important;justify-content:center!important;background:#fff!important;border:1px solid #075b35!important;border-radius:2px!important}
#memberCard .print-sheet .qrcode img{display:block!important;width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;object-fit:contain!important}
#memberCard .print-sheet .card-top,#memberCard .print-sheet .card-body,#memberCard .print-sheet .card-bottom{display:none!important}

/* CORRECTION FINALE PHOTO : masquer le cadre NATAL sur chaque carte imprimée */
#memberCard .print-sheet .member-card{position:relative!important;isolation:isolate!important}
#memberCard .print-sheet .card-background{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;object-fit:fill!important;z-index:0!important}
#memberCard .print-sheet .card-photo-cleanup{
 position:absolute!important;left:3.25%!important;top:38.45%!important;width:26.1%!important;height:28.7%!important;
 display:block!important;margin:0!important;padding:0!important;background:#fff!important;border:0!important;outline:0!important;
 border-radius:0!important;box-shadow:none!important;z-index:4!important;pointer-events:none!important;
}
#memberCard .print-sheet .card-photo-frame{
 position:absolute!important;left:3.25%!important;top:38.45%!important;width:26.1%!important;height:26%!important;
 display:block!important;margin:0!important;padding:0!important;box-sizing:border-box!important;overflow:hidden!important;
 background:transparent!important;border:0!important;outline:0!important;border-radius:0!important;box-shadow:none!important;z-index:5!important;
}
#memberCard .print-sheet .card-photo-frame .card-photo{
 display:block!important;width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;
 margin:0!important;padding:0!important;object-fit:cover!important;object-position:center!important;
 border:0!important;outline:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;transform:none!important;
}
#memberCard .print-sheet .card-info,#memberCard .print-sheet .qrcode{z-index:6!important}


#memberCard .print-sheet .qrcode{
 position:absolute!important;left:50%!important;right:auto!important;top:auto!important;bottom:14%!important;
 display:flex!important;justify-content:center!important;align-items:center!important;
 width:46px!important;height:46px!important;min-width:46px!important;min-height:46px!important;
 max-width:46px!important;max-height:46px!important;margin:0!important;padding:2px!important;
 transform:translateX(-50%)!important;z-index:7!important;box-sizing:border-box!important;
 background:#fff!important;border:1px solid #075b35!important;border-radius:3px!important;overflow:hidden!important;
}
#memberCard .print-sheet .qrcode img,
#memberCard .print-sheet .qrcode canvas{
 display:block!important;width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;
 object-fit:contain!important;image-rendering:pixelated!important;
}


/* QR CODE IMPRESSION : meme format et position que l'apercu ecran. */
#memberCard .print-sheet .qrcode{
 position:absolute!important;left:50%!important;right:auto!important;top:auto!important;bottom:11%!important;
 width:16px!important;height:16px!important;min-width:16px!important;min-height:16px!important;
 max-width:16px!important;max-height:16px!important;margin:0!important;padding:2px!important;
 transform:translateX(-50%)!important;z-index:7!important;box-sizing:border-box!important;
 display:flex!important;align-items:center!important;justify-content:center!important;
 background:#fff!important;border:1px solid #075b35!important;border-radius:3px!important;overflow:hidden!important;
}
#memberCard .print-sheet .qrcode img,#memberCard .print-sheet .qrcode canvas{
 display:block!important;width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;
 object-fit:contain!important;image-rendering:pixelated!important;
}

</style></head><body><main id="memberCard">${cards}</main><script>
window.addEventListener('load',()=>{const imgs=[...document.images];Promise.all(imgs.map(img=>img.complete?Promise.resolve():new Promise(resolve=>{img.addEventListener('load',resolve,{once:true});img.addEventListener('error',resolve,{once:true})}))).then(()=>setTimeout(()=>window.print(),700))});
window.addEventListener('afterprint',()=>window.close());
<\/script></body></html>`);

  w.document.close();
 }catch(error){w.close();alert('Impossible de préparer l’impression : '+(error?.message||String(error)));}
}
async function printAllMemberCards(){
 if(!isAdmin||!sb)return;
 const btn=$('printAllMemberCardsBtn');if(btn){btn.disabled=true;btn.textContent='Préparation des cartes…';}
 try{
  const mr=await sb.from('members').select('id,member_number,first_name,last_name,phone,status,membership_date,photo_url,commission_id,function_title,mission').eq('status','active').order('member_number',{ascending:true});
  if(mr.error)throw mr.error;
  const members=mr.data||[],ids=[...new Set(members.map(m=>m.commission_id).filter(Boolean))];
  let commissions=[];
  if(ids.length){const cr=await sb.from('commissions').select('id,name,description,responsible_member_id,successor_member_id').in('id',ids);if(cr.error)throw cr.error;commissions=cr.data||[];}
  const byId=new Map(commissions.map(c=>[c.id,c]));
  const leader=await sb.from('dahira_general_leadership').select('member_id,title,mission').maybeSingle();
  if(leader.error)throw leader.error;
  members.forEach(m=>{m.commissions=byId.get(m.commission_id)||null;m.isGeneralDieuwrigne=!!(leader.data?.member_id&&leader.data.member_id===m.id);if(m.isGeneralDieuwrigne){m.title=leader.data.title;m.leadershipMission=leader.data.mission;}});
  openMemberCardsPrint(members,'Cartes des membres actifs');
 }catch(err){alert('Impossible de préparer les cartes : '+(err?.message||String(err)));}
 finally{if(btn){btn.disabled=false;btn.textContent='🖨️ Imprimer toutes les cartes';}}
}
async function printSelectedMemberCard(){
 if(!currentCardMember){alert('Aucune carte sélectionnée.');return;}
 openMemberCardsPrint([currentCardMember],'Carte de '+currentCardMember.first_name+' '+currentCardMember.last_name);
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
 if($('memberFunctionTitle'))$('memberFunctionTitle').value=m.function_title||'';
 if($('memberMission'))$('memberMission').value=m.mission||'';
 if($('memberStatus')){$('memberStatus').value=m.status||'active';$('memberStatus').closest('label').classList.remove('hidden');}
 $('memberPhoto').value='';
 if(m.photo_url){$('photoPreview').src=m.photo_url;show('photoPreviewWrap');$('photoPreviewName').textContent='Photo actuelle — choisir un nouveau fichier pour la remplacer.';}
 const btn=$('memberForm').querySelector('button.primary');btn.textContent='Enregistrer les modifications';
 if(!$('cancelMemberEdit')){
   const c=document.createElement('button');c.type='button';c.id='cancelMemberEdit';c.className='secondary';c.textContent='Annuler';c.onclick=cancelEditMember;$('memberForm').appendChild(c);
 }
 $('members').scrollIntoView({behavior:'smooth'});
}
function cancelEditMember(){
 editingMemberId=null;$('memberForm').reset();$('memberForm').querySelector('h3').textContent='Ajouter un membre';$('memberForm').querySelector('button.primary').textContent='Créer le membre';if($('memberStatus')){$('memberStatus').value='active';$('memberStatus').closest('label').classList.add('hidden');}hide('photoPreviewWrap');msg('memberMessage','');
 const c=$('cancelMemberEdit');if(c)c.remove();
}
async function editMember(id){
 if(!sb||!isAdmin)return;
 const r=await sb.from('members').select('id,member_number,first_name,last_name,phone,email,status,membership_date,photo_url,commission_id,function_title,mission').eq('id',id).single();
 if(r.error){msg('memberMessage',r.error.message);return}
 startEditMember(r.data);
}
async function updateExistingMember(e){
 e.preventDefault();if(!editingMemberId)return addMember(e);
 const file=$('memberPhoto').files[0];
 if(file && file.size>5*1024*1024){msg('memberMessage','Photo trop lourde. Maximum 5 Mo.');return}
 if(file && !['image/jpeg','image/png','image/webp'].includes(file.type)){msg('memberMessage','Format photo non accepté. Utilise JPG, PNG ou WEBP.');return}
 const payload={first_name:$('memberFirstName').value.trim(),last_name:$('memberLastName').value.trim(),phone:$('memberPhone').value.trim()||null,email:$('memberEmail').value.trim()||null,commission_id:$('memberCommission')?.value||null,function_title:$('memberFunctionTitle')?.value.trim()||null,mission:$('memberMission')?.value.trim()||null,status:$('memberStatus')?.value==='inactive'?'inactive':'active'};
 const r=await sb.from('members').update(payload).eq('id',editingMemberId).select('member_number').single();
 if(r.error){msg('memberMessage',r.error.message);return}
 if(file){const ext=(file.name.split('.').pop()||'jpg').toLowerCase();const path=`${r.data.member_number}-${Date.now()}.${ext}`;const up=await sb.storage.from('member-photos').upload(path,file,{upsert:false,contentType:file.type});if(up.error){msg('memberMessage','Membre modifié, mais photo non enregistrée : '+up.error.message);return}const url=sb.storage.from('member-photos').getPublicUrl(path).data.publicUrl;const ur=await sb.from('members').update({photo_url:url}).eq('id',editingMemberId);if(ur.error){msg('memberMessage','Membre modifié, mais photo non enregistrée : '+ur.error.message);return}}
 msg('memberMessage','Membre '+r.data.member_number+' modifié avec succès.',true);cancelEditMember();await loadMembers();await loadCommissions();
}


async function viewMemberContributions(member){
  if(!sb||!isAdmin)return;
  const r=await sb.from('contributions')
    .select('id,member_id,amount,payment_month,payment_date,payment_method,category,status,reference,note,paid_at,members(member_number,first_name,last_name)')
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
    <td>${esc(contributionCategoryLabel(x.category))}</td>
    <td><strong>${esc(formatMoney(x.amount))}</strong></td>
    <td>${esc(contributionMethodLabel(x.payment_method))}</td>
    <td>${esc(x.payment_date?new Date(x.payment_date+'T00:00:00').toLocaleDateString('fr-FR'):'—')}</td>
    <td><button class="table-btn" data-action="print-receipt" data-id="${esc(x.id)}">🧾 Reçu</button></td>
  </tr>`).join('') : '<tr><td colspan="6">Aucune cotisation enregistrée pour ce membre.</td></tr>';

  openAccessibleModal('memberFinanceModal','.modal-close');
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



async function loadPaymentCategories(){
 const r=await sb.from('payment_categories').select('id,label,is_active,sort_order').order('sort_order').order('label');
 if(r.error){console.warn('Catégories indisponibles : '+r.error.message);return;}
 paymentCategories=r.data||[];
 const active=paymentCategories.filter(c=>c.is_active);
 ['paymentCategory','contributionCategory','memberPaymentCategory'].forEach(id=>{
  const el=$(id);if(!el)return;const selected=el.value;
  el.innerHTML=active.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.label)+'</option>').join('');
  if(active.some(c=>c.id===selected))el.value=selected;
 });
 const box=$('paymentCategoryRows');
 if(box&&isAdmin)box.innerHTML=paymentCategories.map(c=>'<div class="payment-category-row"><input type="text" maxlength="80" value="'+esc(c.label)+'" data-category-label="'+esc(c.id)+'"><span class="status-pill '+(c.is_active?'paid-pill':'unpaid-pill')+'">'+(c.is_active?'Active':'Désactivée')+'</span><button type="button" class="table-btn" data-category-toggle="'+esc(c.id)+'" data-active="'+(c.is_active?'true':'false')+'">'+(c.is_active?'Désactiver':'Réactiver')+'</button></div>').join('')||'<p>Aucune catégorie.</p>';
}
async function addPaymentCategory(e){
 e.preventDefault();if(!isAdmin)return;const label=$('newPaymentCategoryLabel').value.trim();if(!label)return;
 const id=label.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'').slice(0,48);
 if(!id||paymentCategories.some(c=>c.id===id)){alert('Nom invalide ou catégorie déjà existante.');return;}
 const r=await sb.from('payment_categories').insert({id,label,sort_order:paymentCategories.length*10+10,is_active:true});
 if(r.error){alert('Ajout impossible : '+r.error.message);return;}
 $('newPaymentCategoryLabel').value='';await loadPaymentCategories();
}
async function handlePaymentCategoryRename(e){
 const input=e.target.closest('[data-category-label]');if(!input||!isAdmin)return;
 const id=input.dataset.categoryLabel,label=input.value.trim(),old=paymentCategories.find(c=>c.id===id);
 if(!label||!old||old.label===label)return;
 const r=await sb.from('payment_categories').update({label}).eq('id',id);
 if(r.error){alert('Modification impossible : '+r.error.message);input.value=old.label;return;}
 await loadPaymentCategories();
}
async function handlePaymentCategoryAction(e){
 const b=e.target.closest('[data-category-toggle]');if(!b||!isAdmin)return;
 const r=await sb.from('payment_categories').update({is_active:b.dataset.active!=='true'}).eq('id',b.dataset.categoryToggle);
 if(r.error){alert('Mise à jour impossible : '+r.error.message);return;}await loadPaymentCategories();
}
function togglePaymentBeneficiary(){
 const other=$('memberPaymentFor')?.value==='other';
 $('memberPaymentBeneficiaryWrap')?.classList.toggle('hidden',!other);
 if(!other&&currentMemberRecord&&$('memberPaymentBeneficiary'))$('memberPaymentBeneficiary').value=currentMemberRecord.id;
}
async function loadMemberPaymentForm(member){
 renderDahiraWaveQr();
 if(!$('memberPaymentForm')||!member)return;
 const [b,c]=await Promise.all([sb.rpc('get_payment_beneficiaries'),sb.from('payment_categories').select('id,label').eq('is_active',true).order('sort_order')]);
 if(b.error){msg('memberPaymentMessage','Chargement des membres impossible : '+b.error.message);return;}
 if(c.error){msg('memberPaymentMessage','Chargement des catégories impossible : '+c.error.message);return;}
 paymentCategories=c.data||[];
 $('memberPaymentBeneficiary').innerHTML=(b.data||[]).map(m=>'<option value="'+esc(m.id)+'">'+esc(m.member_number)+' — '+esc(m.first_name)+' '+esc(m.last_name)+'</option>').join('');
 $('memberPaymentBeneficiary').value=member.id;
 $('memberPaymentCategory').innerHTML=(c.data||[]).map(x=>'<option value="'+esc(x.id)+'">'+esc(x.label)+'</option>').join('');
 const d=new Date();$('memberPaymentMonth').value=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
 $('memberPaymentFor').value='self';togglePaymentBeneficiary();
}
async function submitMemberPayment(e){
 e.preventDefault();if(!currentUser||!currentMemberRecord)return;
 const beneficiary=$('memberPaymentFor').value==='other'?$('memberPaymentBeneficiary').value:currentMemberRecord.id;
 const amount=Number($('memberPaymentAmount').value),month=$('memberPaymentMonth').value,category=$('memberPaymentCategory').value;
 if(!beneficiary||amount<=0||!month||!category){msg('memberPaymentMessage','Vérifie le bénéficiaire, le montant, le type et le mois.');return;}
 const r=await sb.rpc('submit_member_payment',{p_beneficiary_member_id:beneficiary,p_amount:amount,p_category:category,p_payment_month:month+'-01',p_reference:$('memberPaymentReference').value.trim()||null,p_note:$('memberPaymentNote').value.trim()||null});
 if(r.error){msg('memberPaymentMessage','Enregistrement impossible : '+r.error.message);return;}
 const chosen=$('memberPaymentBeneficiary').selectedOptions[0]?.textContent||'';
 msg('memberPaymentMessage','Demande enregistrée pour '+(beneficiary===currentMemberRecord.id?'votre compte':chosen)+'. Effectue le transfert Wave au 761 263 937. Le paiement reste en attente jusqu’à vérification.',true);
 $('memberPaymentForm').reset();await loadMemberPaymentForm(currentMemberRecord);await loadConnectedMemberDashboard(currentMemberRecord);
}

async function initPaymentTransactions(){
  if(!sb||!isAdmin)return;
  renderDahiraWaveQr();
  const d=new Date();
  if($("paymentMonth")) $("paymentMonth").value=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");
  await loadPaymentCategories();

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
  const category=$("paymentCategory").value;
  const reference=$("paymentReference").value.trim()||null;
  const payment_month=$("paymentMonth").value+"-01";
  const status="pending";
  const note=$("paymentNote").value.trim()||null;
  if(!member_id||!amount||!payment_month){alert("Remplis les champs obligatoires.");return;}

  const r=await sb.from("payment_transactions").insert({
    member_id,amount,payment_method,category,reference,payment_month,status,note
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
    .select("id,member_id,payer_member_id,payer_name,amount,payment_method,category,reference,payment_month,payment_date,status,note,created_at,confirmed_at,members!payment_transactions_member_id_fkey(member_number,first_name,last_name)")
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
      <td>${esc(x.payer_name||"—")}</td>
      <td>${esc(formatMoney(x.amount))}</td><td>${method}</td>
      <td>${esc(contributionCategoryLabel(x.category))}</td>
      <td>${esc(x.reference||"—")}</td><td>${esc(contributionMonthLabel(x.payment_month))}</td>
      <td>${status}</td>
      <td>${esc(x.payment_date?new Date(x.payment_date+"T00:00:00").toLocaleDateString("fr-FR"):"—")}</td>
      <td>
        ${x.status==="pending"?`<button class="table-btn" data-action="confirm-payment" data-id="${esc(x.id)}">✅ Confirmer</button>
        <button class="table-btn danger-btn" data-action="cancel-payment" data-id="${esc(x.id)}">❌ Annuler</button>`:""}
      </td>
    </tr>`;
  }).join(""):'<tr><td colspan="10">Aucune transaction.</td></tr>';
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
  box.innerHTML='<div class="loading">Chargement des commissions…</div>';
  try{
    const cr=await sb.from('commissions')
      .select('id,name,description,responsible_member_id,successor_member_id,is_active');
    if(cr.error){
      box.innerHTML='<div class="commission-error">Erreur Supabase : '+esc(cr.error.message)+'</div>';
      msg('commissionMessage','Chargement impossible : '+cr.error.message);
      return;
    }
    const mr=await sb.from('members')
      .select('id,member_number,first_name,last_name,status,commission_id')
      .order('first_name');
    const members=mr.error?[]:(mr.data||[]);
    const preferredOrder=['Audiovisuelle','Communication','Culturelle','Finance','Organisation','Relations externes','Relations extérieures et internationales','Santé'];
    const rows=(cr.data||[]).sort((a,b)=>{
      const ai=preferredOrder.indexOf(a.name),bi=preferredOrder.indexOf(b.name);
      if(ai<0&&bi<0)return a.name.localeCompare(b.name,'fr');
      if(ai<0)return 1;if(bi<0)return -1;return ai-bi;
    });
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
    box.innerHTML=rows.length?rows.map((c,index)=>{
      const roster=members.filter(m=>m.commission_id===c.id);
      const activeRoster=roster.filter(m=>m.status==='active');
      const inactiveRoster=roster.length-activeRoster.length;
      const president=members.find(m=>m.id===c.responsible_member_id);
      const vice=members.find(m=>m.id===c.successor_member_id);
      const rosterHtml=roster.length
        ? '<ul class="commission-roster-list">'+roster.map(m=>'<li><span>'+esc(m.first_name)+' '+esc(m.last_name)+'</span><small>'+esc(m.member_number||'')+(m.status==='active'?'':' · Inactif')+'</small></li>').join('')+'</ul>'
        : '<p class="commission-empty">Aucun membre affecté pour le moment.</p>';
      return '<article class="commission-card '+(c.is_active?'':'is-inactive')+'">'+
        '<div class="commission-card-heading"><span class="commission-index">'+String(index+1).padStart(2,'0')+'</span><div><h3>'+esc(c.name)+'</h3><span class="commission-status '+(c.is_active?'is-active':'')+'">'+(c.is_active?'Commission active':'Commission inactive')+'</span></div></div>'+
        '<label class="commission-description-label">Mission et responsabilités</label>'+
        '<textarea rows="3" maxlength="1000" aria-label="Description de '+esc(c.name)+'" data-commission-description="'+esc(c.id)+'" placeholder="Décris la mission et les activités de cette commission">'+esc(c.description||'')+'</textarea>'+
        '<div class="commission-leadership"><label>Dieuwrigne<select aria-label="Dieuwrigne de '+esc(c.name)+'" data-commission-responsible="'+esc(c.id)+'" '+(mr.error?'disabled':'')+'>'+memberOptions(c.responsible_member_id)+'</select></label><label>Adjoint Dieuwrigne<select aria-label="Adjoint Dieuwrigne de '+esc(c.name)+'" data-commission-successor="'+esc(c.id)+'" '+(mr.error?'disabled':'')+'>'+memberOptions(c.successor_member_id)+'</select></label></div>'+
        '<div class="commission-roster-heading"><strong>Membres affectés</strong><span>'+activeRoster.length+' actif(s)'+(inactiveRoster?' · '+inactiveRoster+' inactif(s)':'')+'</span></div>'+rosterHtml+
        '<div class="commission-card-actions"><button type="button" class="table-btn" data-action="update-commission-description" data-id="'+esc(c.id)+'">Enregistrer la mission</button><button type="button" class="table-btn" data-action="assign-commission" data-id="'+esc(c.id)+'" '+(mr.error?'disabled':'')+'>Enregistrer les responsables</button><button type="button" class="table-btn danger-btn" data-action="toggle-commission" data-id="'+esc(c.id)+'" data-active="'+String(c.is_active)+'">'+(c.is_active?'Désactiver':'Activer')+'</button></div>'+
      '</article>';
    }).join(''):'<div class="commission-empty">Aucune commission trouvée dans la base de données.</div>';
    if(mr.error)msg('commissionMessage','Les commissions sont affichées, mais les membres ne peuvent pas être chargés : '+mr.error.message);
    else msg('commissionMessage',rows.length+' commission(s) affichée(s), classées par ordre de fonctionnement. Les affectations existantes sont conservées.',true);
  }catch(err){
    box.innerHTML='<div class="commission-error">Erreur inattendue : '+esc(err?.message||String(err))+'</div>';
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
    msg('commissionMessage','Le Dieuwrigne et son adjoint doivent être deux membres différents.');
    return;
  }
  const r=await sb.from('commissions').update({
    responsible_member_id:responsible.value||null,
    successor_member_id:successor.value||null
  }).eq('id',id).select('id,responsible_member_id,successor_member_id').maybeSingle();
  if(r.error){msg('commissionMessage','Enregistrement impossible : '+r.error.message);return;}
  if(!r.data){msg('commissionMessage','Aucune modification enregistrée. Vérifie les droits administrateur sur cette commission.');return;}
  msg('commissionMessage','Dieuwrigne et adjoint Dieuwrigne enregistrés.',true);
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
  const commissionsResult=await sb.from('commissions').select('id,name').eq('is_active',true).order('name');
  const commissionOptions=(selected)=>'<option value="">Aucune commission</option>'+
    (commissionsResult.data||[]).map(c=>'<option value="'+esc(c.id)+'" '+(c.id===selected?'selected':'')+'>'+esc(c.name)+'</option>').join('');

  box.innerHTML = requests.length
    ? requests.map(x => `
        <tr>
          <td>${esc(x.first_name)} ${esc(x.last_name)}</td>
          <td>${esc(x.phone)}</td>
          <td>${esc(x.email || '—')}</td>
          <td>${x.status === 'pending'
            ? '<select class="request-commission-select" data-request-commission="'+esc(x.id)+'">'+commissionOptions(x.commission_id)+'</select><button class="table-btn" data-action="update-request-commission" data-id="'+esc(x.id)+'">Enregistrer</button>'
            : esc(x.commissions?.name || '—')}</td>
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
function formatPortalDate(value,withTime=true){
  if(!value)return '—';
  const d=new Date(value);
  if(Number.isNaN(d.getTime()))return '—';
  return d.toLocaleString('fr-FR',withTime?{dateStyle:'medium',timeStyle:'short'}:{dateStyle:'medium'});
}
function adminStatusToggle(label,published){
  return '<span class="status-pill '+(published?'paid-pill':'unpaid-pill')+'">'+(published?'Publié':'Brouillon')+'</span>';
}
async function loadPublicEvents(){
  const box=$('publicEventsGrid');if(!box||!sb)return;
  const r=await sb.from('dahira_events').select('id,title,description,starts_at,ends_at,location').eq('is_published',true).gte('starts_at',new Date(Date.now()-86400000).toISOString()).order('starts_at').limit(30);
  if(r.error){box.innerHTML='<div class="loading">Agenda temporairement indisponible.</div>';console.warn(r.error.message);return;}
  const rows=r.data||[];
  box.innerHTML=rows.length?rows.map(x=>'<article class="card event-card"><span class="tag">AGENDA DU DAHIRA</span><h3>'+esc(x.title)+'</h3><p class="event-date">'+esc(formatPortalDate(x.starts_at))+(x.ends_at?' – '+esc(formatPortalDate(x.ends_at)):'')+'</p>'+(x.location?'<p><b>Lieu :</b> '+esc(x.location)+'</p>':'')+'<p>'+esc(x.description||'')+'</p></article>').join(''):'<div class="loading">Aucune activité publiée pour le moment.</div>';
}
async function loadPublicGallery(){
  const box=$('publicGalleryGrid');if(!box||!sb)return;
  const r=await sb.from('dahira_gallery').select('id,title,description,image_url,event_date').eq('is_published',true).order('event_date',{ascending:false}).order('created_at',{ascending:false}).limit(60);
  if(r.error){box.innerHTML='<div class="loading">Galerie temporairement indisponible.</div>';console.warn(r.error.message);return;}
  const rows=r.data||[];
  box.innerHTML=rows.length?rows.map(x=>'<article class="card gallery-card"><img src="'+esc(x.image_url)+'" alt="'+esc(x.title)+'" loading="lazy"><div><h3>'+esc(x.title)+'</h3>'+(x.event_date?'<small>'+esc(formatPortalDate(x.event_date,false))+'</small>':'')+'<p>'+esc(x.description||'')+'</p></div></article>').join(''):'<div class="loading">Aucune photo publiée pour le moment.</div>';
}
async function loadMemberNotifications(){
  const box=$('memberNotificationsList');if(!box||!currentMemberRecord||!sb)return;
  const r=await sb.from('dahira_notifications').select('id,title,message,notification_type,created_at,expires_at').eq('is_published',true).order('created_at',{ascending:false}).limit(50);
  if(r.error){box.innerHTML='<p class="loading">Chargement des notifications impossible.</p>';console.warn(r.error.message);return;}
  const rows=(r.data||[]).filter(x=>!x.expires_at||new Date(x.expires_at)>new Date());
  const count=$('memberNotificationCount');if(count)count.textContent=rows.length+' message(s)';
  box.innerHTML=rows.length?rows.map(x=>'<article class="notification-item notification-'+esc(x.notification_type)+'"><div><span class="tag">'+esc(({information:'Information',rappel:'Rappel',convocation:'Convocation',important:'Important'})[x.notification_type]||'Information')+'</span><h4>'+esc(x.title)+'</h4><small>'+esc(formatPortalDate(x.created_at))+'</small></div><p>'+esc(x.message)+'</p></article>').join(''):'<p class="loading">Aucune notification pour le moment.</p>';
}
async function loadAdminEvents(){
  if(!sb||!isAdmin)return;const box=$('adminEventRows');if(!box)return;
  const r=await sb.from('dahira_events').select('*').order('starts_at',{ascending:false});
  if(r.error){box.innerHTML='<p class="loading">Erreur : '+esc(r.error.message)+'</p>';return;}
  const rows=r.data||[];
  box.innerHTML=rows.length?rows.map(x=>'<article class="admin-module-row"><div><h3>'+esc(x.title)+'</h3><p>'+esc(formatPortalDate(x.starts_at))+' · '+esc(x.location||'Lieu à préciser')+'</p><p>'+esc(x.description||'')+'</p>'+adminStatusToggle('',x.is_published)+'</div><div class="admin-module-actions"><button type="button" class="table-btn" data-action="toggle-event" data-id="'+esc(x.id)+'" data-published="'+String(x.is_published)+'">'+(x.is_published?'Masquer':'Publier')+'</button><button type="button" class="table-btn danger-btn" data-action="delete-event" data-id="'+esc(x.id)+'">Supprimer</button></div></article>').join(''):'<p class="loading">Aucune activité enregistrée.</p>';
}
async function loadAdminGallery(){
  if(!sb||!isAdmin)return;const box=$('adminGalleryRows');if(!box)return;
  const r=await sb.from('dahira_gallery').select('*').order('created_at',{ascending:false});
  if(r.error){box.innerHTML='<p class="loading">Erreur : '+esc(r.error.message)+'</p>';return;}
  const rows=r.data||[];
  box.innerHTML=rows.length?rows.map(x=>'<article class="admin-module-row gallery-admin-row"><img src="'+esc(x.image_url)+'" alt="'+esc(x.title)+'"><div><h3>'+esc(x.title)+'</h3><p>'+esc(x.description||'')+'</p>'+adminStatusToggle('',x.is_published)+'</div><div class="admin-module-actions"><button type="button" class="table-btn" data-action="toggle-gallery" data-id="'+esc(x.id)+'" data-published="'+String(x.is_published)+'">'+(x.is_published?'Masquer':'Publier')+'</button><button type="button" class="table-btn danger-btn" data-action="delete-gallery" data-id="'+esc(x.id)+'">Supprimer</button></div></article>').join(''):'<p class="loading">Aucune photo enregistrée.</p>';
}
async function loadAdminNotifications(){
  if(!sb||!isAdmin)return;const box=$('adminNotificationRows');if(!box)return;
  const r=await sb.from('dahira_notifications').select('id,title,message,notification_type,target_member_id,is_published,created_at').order('created_at',{ascending:false});
  if(r.error){box.innerHTML='<p class="loading">Erreur : '+esc(r.error.message)+'</p>';return;}
  const rows=r.data||[];
  box.innerHTML=rows.length?rows.map(x=>'<article class="admin-module-row"><div><h3>'+esc(x.title)+'</h3><p>'+esc(x.message)+'</p><small>'+esc(x.target_member_id?'Notification ciblée':'Tous les membres')+' · '+esc(formatPortalDate(x.created_at))+'</small>'+adminStatusToggle('',x.is_published)+'</div><div class="admin-module-actions"><button type="button" class="table-btn danger-btn" data-action="delete-notification" data-id="'+esc(x.id)+'">Supprimer</button></div></article>').join(''):'<p class="loading">Aucune notification envoyée.</p>';
}
async function createAdminEvent(e){
  e.preventDefault();if(!sb||!isAdmin)return;
  const title=$('eventTitle').value.trim(),starts=$('eventStartsAt').value,ends=$('eventEndsAt').value;
  if(!title||!starts){msg('eventMessage','Le titre et la date de début sont obligatoires.');return;}
  const startDate=new Date(starts),endDate=ends?new Date(ends):null;
  if(Number.isNaN(startDate.getTime())||(endDate&&endDate<startDate)){msg('eventMessage','Vérifie les dates de cette activité.');return;}
  const r=await sb.from('dahira_events').insert({title,description:$('eventDescription').value.trim(),starts_at:startDate.toISOString(),ends_at:endDate?endDate.toISOString():null,location:$('eventLocation').value.trim()||null,is_published:$('eventPublished').checked,created_by:currentUser.id});
  if(r.error){msg('eventMessage','Enregistrement impossible : '+r.error.message);return;}
  $('adminEventForm').reset();$('eventPublished').checked=true;msg('eventMessage','Activité enregistrée.',true);await loadAdminEvents();await loadPublicEvents();
}
async function createAdminGalleryItem(e){
  e.preventDefault();if(!sb||!isAdmin||!currentUser)return;
  const file=$('galleryImageFile')?.files?.[0]||null;
  const imageUrl=$('galleryImageUrl').value.trim();
  if(!file&&!imageUrl){msg('galleryMessage','Choisis une photo depuis ton téléphone ou ajoute un lien direct.');return;}
  if(file&&(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>8*1024*1024)){
    msg('galleryMessage','Format accepté : JPG, PNG ou WebP. Taille maximale : 8 Mo.');return;
  }
  if(!file&&imageUrl&&!/^https?:\/\//i.test(imageUrl)){msg('galleryMessage','Le lien doit commencer par https:// ou http://.');return;}
  const submit=$('gallerySubmitBtn');if(submit){submit.disabled=true;submit.textContent='Enregistrement…';}
  let uploadedPath=null,finalImageUrl=imageUrl;
  try{
    if(file){
      const safeName=file.name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]/g,'-').slice(-70);
      uploadedPath='gallery/'+currentUser.id+'/'+Date.now()+'-'+Math.random().toString(36).slice(2,9)+'-'+(safeName||'photo');
      const upload=await sb.storage.from('dahira-gallery').upload(uploadedPath,file,{upsert:false,contentType:file.type,cacheControl:'3600'});
      if(upload.error)throw upload.error;
      finalImageUrl=sb.storage.from('dahira-gallery').getPublicUrl(uploadedPath).data.publicUrl;
    }
    const r=await sb.from('dahira_gallery').insert({title:$('galleryTitle').value.trim(),description:$('galleryDescription').value.trim(),image_url:finalImageUrl,event_date:$('galleryEventDate').value||null,is_published:$('galleryPublished').checked,created_by:currentUser.id}).select('id').single();
    if(r.error)throw r.error;
    $('adminGalleryForm').reset();$('galleryPublished').checked=true;
    if(galleryPreviewUrl){URL.revokeObjectURL(galleryPreviewUrl);galleryPreviewUrl=null;}const preview=$('galleryImagePreview');if(preview){preview.removeAttribute('src');preview.classList.add('hidden');}
    msg('galleryMessage','Photo ajoutée à la galerie.',true);await loadAdminGallery();await loadPublicGallery();
  }catch(err){
    if(uploadedPath)await sb.storage.from('dahira-gallery').remove([uploadedPath]);
    msg('galleryMessage','Ajout impossible : '+(err?.message||String(err)));
  }finally{
    if(submit){submit.disabled=false;submit.textContent='Ajouter à la galerie';}
  }
}
async function createAdminNotification(e){
  e.preventDefault();if(!sb||!isAdmin)return;
  const title=$('notificationTitle').value.trim(),message=$('notificationMessage').value.trim();
  if(!title||!message){msg('notificationMessageStatus','Le titre et le message sont obligatoires.');return;}
  const target=$('notificationTarget').value||null,expiry=$('notificationExpires').value;
  const r=await sb.from('dahira_notifications').insert({title,message,notification_type:$('notificationType').value,target_member_id:target,is_published:true,expires_at:expiry?new Date(expiry).toISOString():null,created_by:currentUser.id});
  if(r.error){msg('notificationMessageStatus','Envoi impossible : '+r.error.message);return;}
  $('adminNotificationForm').reset();msg('notificationMessageStatus','Notification envoyée.',true);await loadAdminNotifications();
}
async function initPortalAdminModules(){
  if(!sb||!isAdmin)return;
  const select=$('notificationTarget');if(select){
    const r=await sb.from('members').select('id,member_number,first_name,last_name').eq('status','active').order('first_name');
    if(!r.error)select.innerHTML='<option value="">Tous les membres actifs</option>'+(r.data||[]).map(m=>'<option value="'+esc(m.id)+'">'+esc(m.member_number)+' — '+esc(m.first_name)+' '+esc(m.last_name)+'</option>').join('');
  }
  await Promise.all([loadAdminEvents(),loadAdminGallery(),loadAdminNotifications()]);
}
async function handlePortalAdminAction(button){
  if(!sb||!isAdmin)return;const id=button.dataset.id,action=button.dataset.action;
  if(action==='toggle-event'||action==='toggle-gallery'){
    const table=action==='toggle-event'?'dahira_events':'dahira_gallery';
    const r=await sb.from(table).update({is_published:button.dataset.published!=='true',updated_at:new Date().toISOString()}).eq('id',id);
    if(r.error){alert('Modification impossible : '+r.error.message);return;}
    if(table==='dahira_events'){await loadAdminEvents();await loadPublicEvents();}else{await loadAdminGallery();await loadPublicGallery();}
  }else if(action==='delete-event'||action==='delete-gallery'||action==='delete-notification'){
    if(!confirm('Supprimer définitivement cet élément ?'))return;
    const table=action==='delete-event'?'dahira_events':action==='delete-gallery'?'dahira_gallery':'dahira_notifications';
    const r=await sb.from(table).delete().eq('id',id).select('id').maybeSingle();
    if(r.error||!r.data){alert('Suppression impossible : '+(r.error?.message||'aucune ligne supprimée'));return;}
    if(table==='dahira_events'){await loadAdminEvents();await loadPublicEvents();}
    if(table==='dahira_gallery'){await loadAdminGallery();await loadPublicGallery();}
    if(table==='dahira_notifications')await loadAdminNotifications();
  }
}

async function loadPublicCommissions(){
  const select=$('requestCommission');
  if(!select||!sb)return;
  select.disabled=true;
  const r=await sb.from('commissions')
    .select('id,name')
    .eq('is_active',true)
    .order('name');
  if(r.error){
    select.innerHTML='<option value="">Commissions indisponibles — réessaie plus tard</option>';
    msg('membershipRequestMessage','Impossible de charger les commissions : '+r.error.message);
    return;
  }
  const rows=r.data||[];
  if(rows.length){
    select.innerHTML='<option value="">Choisir une commission *</option>'+
      rows.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.name)+'</option>').join('');
    select.disabled=false;
  }else{
    select.innerHTML='<option value="">Aucune commission active disponible</option>';
    msg('membershipRequestMessage','Aucune commission active disponible dans la base.');
  }
}

async function loadGeneralLeadership(){
  const publicName=$('generalLeaderPublicName');
  if(!sb)return;
  const result=await sb.from('dahira_general_leadership')
    .select('display_name,title,mission')
    .eq('id',1)
    .maybeSingle();
  if(result.error){
    if(publicName)publicName.textContent='Information momentanément indisponible';
    console.warn('Chargement de la direction générale impossible :',result.error.message);
    return;
  }
  if(publicName)publicName.textContent=result.data?.display_name||'Fonction à désigner';
  const publicMission=$('generalLeaderPublicMission');
  if(publicMission)publicMission.textContent=result.data?.mission||GENERAL_DIEUWRIGNE_MISSION;
  if(isAdmin){
    if($('generalLeaderTitle'))$('generalLeaderTitle').value=result.data?.title||'Dieuwrigne Général du Dahira';
    if($('generalLeaderMission'))$('generalLeaderMission').value=result.data?.mission||GENERAL_DIEUWRIGNE_MISSION;
  }
  const select=$('generalLeaderMember');
  if(!isAdmin||!select)return;
  const members=await sb.from('members')
    .select('id,member_number,first_name,last_name')
    .eq('status','active')
    .order('last_name',{ascending:true})
    .order('first_name',{ascending:true});
  if(members.error){
    select.innerHTML='<option value="">Impossible de charger les membres actifs</option>';
    msg('generalLeaderMessage','Chargement des membres impossible : '+members.error.message);
    return;
  }
  const current=await sb.from('dahira_general_leadership').select('member_id').eq('id',1).maybeSingle();
  const selectedId=current.data?.member_id||'';
  select.innerHTML='<option value="">Choisir un membre actif</option>'+
    (members.data||[]).map(m=>'<option value="'+esc(m.id)+'" '+(m.id===selectedId?'selected':'')+'>'+esc(m.member_number||'')+' — '+esc((m.first_name||'')+' '+(m.last_name||''))+'</option>').join('');
}
async function saveGeneralLeadership(e){
  e.preventDefault();
  if(!sb||!isAdmin)return;
  const select=$('generalLeaderMember');
  const memberId=select?.value;
  if(!memberId){msg('generalLeaderMessage','Choisis un membre actif.');return;}
  const member=await sb.from('members').select('id,first_name,last_name,status').eq('id',memberId).eq('status','active').maybeSingle();
  if(member.error||!member.data){msg('generalLeaderMessage','Ce membre est introuvable ou n’est plus actif. Actualise la liste.');return;}
  const displayName=[member.data.first_name,member.data.last_name].filter(Boolean).join(' ').trim();
  const title=$('generalLeaderTitle')?.value.trim()||'Dieuwrigne Général du Dahira';
  const mission=$('generalLeaderMission')?.value.trim()||GENERAL_DIEUWRIGNE_MISSION;
  if(title.length>120||mission.length>1000){msg('generalLeaderMessage','La fonction doit faire 120 caractères maximum et la mission 1 000 caractères maximum.');return;}
  const saved=await sb.from('dahira_general_leadership').upsert({
    id:1,member_id:member.data.id,display_name:displayName,title,mission,updated_at:new Date().toISOString()
  },{onConflict:'id'});
  if(saved.error){msg('generalLeaderMessage','Enregistrement impossible : '+saved.error.message);return;}
  msg('generalLeaderMessage','Dieuwrigne Général enregistré avec succès.',true);
  await loadGeneralLeadership();
}
async function loadPublicCommissionDirectory(){
  const box=$('publicCommissionGrid');
  if(!box||!sb)return;
  box.innerHTML='<div class="loading">Chargement des commissions…</div>';
  const r=await sb.from('commissions')
    .select('id,name,description,is_active,responsible_member_id,successor_member_id')
    .eq('is_active',true)
    .order('name');
  if(r.error){
    box.innerHTML='<div class="loading">Les commissions ne peuvent pas être chargées pour le moment. Réessaie ultérieurement.</div>';
    console.warn('Annuaire public des commissions indisponible :',r.error.message);
    return;
  }
  const rows=r.data||[];
  const preferredOrder=['Audiovisuelle','Communication','Culturelle','Finance','Organisation','Relations externes','Relations extérieures et internationales','Santé'];
  rows.sort((a,b)=>{
    const ai=preferredOrder.indexOf(a.name),bi=preferredOrder.indexOf(b.name);
    if(ai<0&&bi<0)return a.name.localeCompare(b.name,'fr');
    if(ai<0)return 1;
    if(bi<0)return -1;
    return ai-bi;
  });

  // Charger uniquement les personnes désignées comme responsables, sans exposer l'annuaire complet.
  const leaderIds=[...new Set(rows.flatMap(c=>[c.responsible_member_id,c.successor_member_id]).filter(Boolean))];
  let leadersById=new Map();
  if(isAdmin&&leaderIds.length){
    const leadersResult=await sb.from('members')
      .select('id,first_name,last_name,status')
      .in('id',leaderIds)
      .eq('status','active');
    if(leadersResult.error){
      console.warn('Noms des responsables des commissions indisponibles :',leadersResult.error.message);
    }else{
      leadersById=new Map((leadersResult.data||[]).map(m=>[m.id,m]));
    }
  }

  const leaderName=(id)=>{
    if(!isAdmin)return 'Réservé à l’administration';
    if(!id)return 'Non désigné';
    const member=leadersById.get(id);
    return member?esc((member.first_name||'')+' '+(member.last_name||'')).trim():'Non renseigné';
  };
  box.innerHTML=rows.length?rows.map((c,index)=>
    '<article class="commission-card public-commission-card">'+
      '<div class="commission-card-heading"><span class="commission-index">'+String(index+1).padStart(2,'0')+'</span><div><h3>'+esc(c.name)+'</h3><span class="commission-status is-active">Commission active</span></div></div>'+
      '<p class="public-commission-description">'+esc(c.description||'La mission de cette commission sera précisée par l’administration.')+'</p>'+
      '<div class="public-commission-leadership">'+
        '<div><span>Dieuwrigne</span><strong>'+leaderName(c.responsible_member_id)+'</strong></div>'+
        '<div><span>Adjoint Dieuwrigne</span><strong>'+leaderName(c.successor_member_id)+'</strong></div>'+
      '</div>'+
    '</article>'
  ).join(''):'<div class="loading">Aucune commission active publiée pour le moment.</div>';
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
  button.textContent = 'Vérification…';

  try {
    const r = await sb.rpc('submit_membership_request', {
      p_first_name: first_name,
      p_last_name: last_name,
      p_phone: phone,
      p_email: email,
      p_note: note,
      p_commission_id: commission_id
    });

    if (r.error) {
      console.error('Soumission de demande impossible :', r.error);
      msg('membershipRequestMessage', 'La demande n’a pas pu être vérifiée ou envoyée. Réessaie plus tard ou contacte l’administration.');
      return;
    }

    switch (r.data) {
      case 'already_pending':
        msg('membershipRequestMessage', 'Tu as déjà envoyé une demande d’adhésion avec cet e-mail ou ce numéro. Merci de patienter pendant son traitement par l’administration.');
        break;
      case 'already_member':
        msg('membershipRequestMessage', 'Tu es déjà membre de la Daara Jazbul Quluub – Cellule Dakar. Tu n’as pas besoin de faire une nouvelle demande.', true);
        break;
      case 'invalid_commission':
        msg('membershipRequestMessage', 'La commission choisie n’est plus disponible. Actualise la page et choisis une commission active.');
        break;
      case 'invalid':
        msg('membershipRequestMessage', 'Vérifie les informations saisies puis réessaie.');
        break;
      case 'submitted':
        msg('membershipRequestMessage', 'Demande envoyée avec succès. Elle sera examinée par l’administrateur.', true);
        e.target.reset();
        break;
      default:
        msg('membershipRequestMessage', 'Réponse inattendue. Contacte l’administration si le problème persiste.');
    }
  } catch (err) {
    console.error('Erreur inattendue lors de la demande :', err);
    msg('membershipRequestMessage', 'Une erreur est survenue. Réessaie plus tard.');
  } finally {
    button.disabled = false;
    button.textContent = 'Envoyer ma demande';
  }
}
async function updateMembershipRequestCommission(id){
  if(!sb||!isAdmin)return;
  const select=[...document.querySelectorAll('[data-request-commission]')].find(el=>el.dataset.requestCommission===id);
  if(!select){alert('Sélecteur de commission introuvable.');return;}
  const commissionId=select.value||null;
  if(commissionId){
    const valid=await sb.from('commissions').select('id').eq('id',commissionId).eq('is_active',true).maybeSingle();
    if(valid.error||!valid.data){alert('La commission choisie est introuvable ou inactive.');return;}
  }
  const saved=await sb.from('membership_requests').update({commission_id:commissionId}).eq('id',id).eq('status','pending').select('id').maybeSingle();
  if(saved.error||!saved.data){alert('Modification impossible : '+(saved.error?.message||'la demande n’est plus en attente.'));return;}
  alert('Commission de la demande mise à jour.');
  await loadMembershipRequests();
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
  if(['toggle-event','toggle-gallery','delete-event','delete-gallery','delete-notification'].includes(button.dataset.action)){await handlePortalAdminAction(button);return;}
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
        .select('id,member_number,first_name,last_name,phone,email,status,membership_date,photo_url,commission_id,function_title,mission')
        .eq('id', id).maybeSingle();
      if (r.error || !r.data) { alert("Membre introuvable."); return; }
      if(r.data.commission_id){
        const commissionResult=await sb.from('commissions')
          .select('name,description,responsible_member_id,successor_member_id')
          .eq('id',r.data.commission_id)
          .maybeSingle();
        r.data.commissions=commissionResult.data||null;
      }
      const leadership=await getGeneralLeadershipForMember(r.data.id).catch(error=>{
        console.warn('Lecture direction générale impossible',error);
        return false;
      });
      r.data.isGeneralDieuwrigne=!!leadership;
      if(leadership){r.data.title=leadership.title;r.data.leadershipMission=leadership.mission;}
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
    case 'update-request-commission': updateMembershipRequestCommission(id); break;
    case 'approve-request': approveMembershipRequest(id); break;
    case 'reject-request': rejectMembershipRequest(id); break;
  }
});

// Démarrer l'application après le chargement du DOM.
// Sans cet appel, les boutons (dont « Connexion ») ne reçoivent aucun gestionnaire.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    void init().catch(error => {
      console.error('Initialisation du portail impossible :', error);
      const message = document.getElementById('authMessage');
      if (message) {
        message.textContent = "Le portail rencontre un problème de chargement. Actualise la page puis réessaie.";
        message.style.color = '#a52d2d';
      }
    });
  }, { once: true });
} else {
  void init().catch(error => {
    console.error('Initialisation du portail impossible :', error);
    const message = document.getElementById('authMessage');
    if (message) {
      message.textContent = "Le portail rencontre un problème de chargement. Actualise la page puis réessaie.";
      message.style.color = '#a52d2d';
    }
  });
}
