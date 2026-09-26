const cfg=window.DJQ_CONFIG;
const sb=supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_PUBLISHABLE_KEY);
const $=id=>document.getElementById(id);
let members=[], editing=null;

function msg(el,t,ok=false){$(el).textContent=t;$(el).style.color=ok?"#087443":"#b42318"}
function publicVerifyUrl(id){return location.origin+location.pathname+"?verify="+encodeURIComponent(id)}

async function start(){
 const {data:{session}}=await sb.auth.getSession();
 if(session) await showApp(); else showLogin();
 $('loginForm').onsubmit=login;
 $('logoutBtn').onclick=async()=>{await sb.auth.signOut();location.reload()};
 $('photo').onchange=previewPhoto;
 $('memberForm').onsubmit=saveMember;
 $('cancelEdit').onclick=resetForm;
 $('closeModal').onclick=()=>$('cardModal').classList.add('hidden');
 const p=new URLSearchParams(location.search); if(p.get('verify')) await showVerification(p.get('verify'));
}
function showLogin(){ $('loginSection').classList.remove('hidden');$('appSection').classList.add('hidden');$('logoutBtn').classList.add('hidden')}
async function login(e){e.preventDefault();msg('loginMsg','Connexion...');const {error}=await sb.auth.signInWithPassword({email:$('email').value,password:$('password').value});if(error){msg('loginMsg',error.message);return}await showApp()}
async function showApp(){ $('loginSection').classList.add('hidden');$('appSection').classList.remove('hidden');$('logoutBtn').classList.remove('hidden');await loadMembers()}
async function loadMembers(){const {data,error}=await sb.from('members').select('*').order('created_at',{ascending:false});if(error){msg('formMsg',error.message);return}members=data||[];$('totalCount').textContent=members.length;$('activeCount').textContent=members.filter(x=>x.status==='active').length;renderMembers()}
function renderMembers(){
 $('membersList').innerHTML=members.map(m=>`
 <div class="member">
  <div class="memberInfo">
   <img class="avatar" src="${m.photo_url||'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2258%22 height=%2258%22%3E%3Crect width=%22100%25%22 height=%22100%25%22 fill=%22%23e7efe9%22/%3E%3C/svg%3E'}">
   <div><b>${esc(m.member_number)}</b><br>${esc(m.first_name)} ${esc(m.last_name)}<br><small>${esc(m.phone||'')}</small> <span class="tag ${m.status==='active'?'':'off'}">${m.status==='active'?'Actif':'Inactif'}</span></div>
  </div>
  <div class="memberBtns"><button class="secondary" onclick="editMember('${m.id}')">Modifier</button><button class="primary" onclick="showCard('${m.id}')">Voir carte</button></div>
 </div>`).join('')||'<p>Aucun membre.</p>'
}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function previewPhoto(e){const f=e.target.files[0];if(!f){$('photoPreviewWrap').classList.add('hidden');return}if(f.size>5*1024*1024){msg('formMsg','Photo trop lourde : maximum 5 Mo.');e.target.value='';return}const u=URL.createObjectURL(f);$('photoPreview').src=u;$('photoPreviewWrap').classList.remove('hidden')}
function editMember(id){const m=members.find(x=>x.id===id);if(!m)return;editing=m;$('memberId').value=m.id;$('firstName').value=m.first_name||'';$('lastName').value=m.last_name||'';$('phone').value=m.phone||'';$('memberEmail').value=m.email||'';$('status').value=m.status||'active';$('formTitle').textContent='Modifier le membre '+m.member_number;$('cancelEdit').classList.remove('hidden');$('saveBtn').textContent='Enregistrer les modifications';if(m.photo_url){$('photoPreview').src=m.photo_url;$('photoPreviewWrap').classList.remove('hidden')}window.scrollTo({top:0,behavior:'smooth'})}
function resetForm(){editing=null;$('memberForm').reset();$('memberId').value='';$('formTitle').textContent='Ajouter un membre';$('cancelEdit').classList.add('hidden');$('saveBtn').textContent='Enregistrer';$('photoPreviewWrap').classList.add('hidden');msg('formMsg','')}
async function uploadPhoto(file,memberId){
 const ext=(file.name.split('.').pop()||'jpg').toLowerCase();const path=memberId+'-'+Date.now()+'.'+ext;
 const {error}=await sb.storage.from('member-photos').upload(path,file,{upsert:true,contentType:file.type});if(error)throw error;
 const {data}=sb.storage.from('member-photos').getPublicUrl(path);return data.publicUrl;
}
async function saveMember(e){
 e.preventDefault();msg('formMsg','Enregistrement...');
 try{
  const payload={first_name:$('firstName').value.trim(),last_name:$('lastName').value.trim(),phone:$('phone').value.trim()||null,email:$('memberEmail').value.trim()||null,status:$('status').value};
  let id;
  if(editing){const {data,error}=await sb.from('members').update(payload).eq('id',editing.id).select().single();if(error)throw error;id=data.id}
  else {const {data,error}=await sb.from('members').insert(payload).select().single();if(error)throw error;id=data.id}
  const file=$('photo').files[0];if(file){const url=await uploadPhoto(file,id);const {error}=await sb.from('members').update({photo_url:url}).eq('id',id);if(error)throw error}
  msg('formMsg',editing?'Membre modifié avec succès.':'Membre ajouté avec succès.',true);resetForm();await loadMembers()
 }catch(err){msg('formMsg',err.message||String(err))}
}
async function showCard(id){
 const m=members.find(x=>x.id===id);if(!m)return;
 $('cardArea').innerHTML=`<div class="card"><div class="cardHead"><img src="logo.jpeg" onerror="this.style.display='none'"><div><b>DAARA JAZBUL QULUB</b><br><small>CARTE DE MEMBRE</small></div></div><div class="cardBody"><img class="cardPhoto" src="${m.photo_url||''}" alt="Photo membre"><div><p><b>${esc(m.first_name)} ${esc(m.last_name)}</b></p><p>N° membre : <b>${esc(m.member_number)}</b></p><p>Adhésion : ${esc(m.membership_date||'')}</p><p>Statut : <b>${m.status==='active'?'ACTIF':'INACTIF'}</b></p></div><div class="qr"><div id="qrBox"></div><small>Scanner pour vérifier</small></div></div></div>`;
 $('cardModal').classList.remove('hidden');
 new QRCode($('qrBox'),{text:publicVerifyUrl(m.id),width:110,height:110});
}
async function showVerification(id){
 const {data,error}=await sb.from('members').select('id,member_number,first_name,last_name,photo_url,status,membership_date').eq('id',id).single();
 if(error||!data){document.body.innerHTML='<main class="container"><section class="panel"><h1>Membre introuvable</h1></section></main>';return}
 document.body.innerHTML=`<main class="container"><section class="panel"><div class="hero"><img src="logo.jpeg" class="heroLogo"><div><h1>Vérification du membre</h1><p>Daara Jazbul Qulub</p></div></div><div class="card"><div class="cardBody"><img class="cardPhoto" src="${data.photo_url||''}"><div><h2>${esc(data.first_name)} ${esc(data.last_name)}</h2><p>N° membre : <b>${esc(data.member_number)}</b></p><p>Date d'adhésion : ${esc(data.membership_date||'')}</p><p>Statut : <b>${data.status==='active'?'ACTIF':'INACTIF'}</b></p><div class="verify">${data.status==='active'?'✓ MEMBRE ACTIF':'Membre inactif'}</div></div></div></div></section></main>`;
}
start();