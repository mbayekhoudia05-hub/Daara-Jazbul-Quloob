let sb=null,currentUser=null,isAdmin=false,signupMode=false;
const $=id=>document.getElementById(id), show=id=>$(id).classList.remove('hidden'), hide=id=>$(id).classList.add('hidden');
function openAuth(){show('authModal')} function closeAuth(){hide('authModal')}
function setAdminUI(){if(isAdmin){show('admin');show('members');show('membersNav')}else{hide('admin');hide('members');hide('membersNav')}}
function msg(id,t,ok=false){$(id).textContent=t;$(id).style.color=ok?'#08733a':'#a52d2d'}
async function init(){
 const c=window.DJQ_CONFIG;
 $('loginBtn').onclick=openAuth;$('logoutBtn').onclick=async()=>{await sb.auth.signOut();location.reload()};
 $('switchAuth').onclick=()=>{signupMode=!signupMode;$('authTitle').textContent=signupMode?'Créer un compte gratuit':'Connexion';$('authSubmit').textContent=signupMode?'Créer mon compte':'Se connecter';$('switchAuth').textContent=signupMode?'J’ai déjà un compte':'Créer un compte gratuit'};
 if(c.SUPABASE_PUBLISHABLE_KEY.startsWith('COLLER_')){loadDemo();return}
 sb=window.supabase.createClient(c.SUPABASE_URL,c.SUPABASE_PUBLISHABLE_KEY);$('authForm').onsubmit=auth;
 $('contentForm').onsubmit=publish;
 $('memberForm').onsubmit=addMember;
 const s=await sb.auth.getSession();if(s.data.session)await setUser(s.data.session.user);
 sb.auth.onAuthStateChange((_e,s)=>setUser(s?.user||null));load();
}
async function setUser(u){currentUser=u;if(!u){isAdmin=false;setAdminUI();hide('logoutBtn');show('loginBtn');return}hide('loginBtn');show('logoutBtn');const r=await sb.from('profiles').select('role').eq('id',u.id).maybeSingle();isAdmin=r.data?.role==='admin';setAdminUI();if(isAdmin)await loadMembers()}
async function auth(e){e.preventDefault();const email=$('email').value,password=$('password').value;const r=signupMode?await sb.auth.signUp({email,password}):await sb.auth.signInWithPassword({email,password});if(r.error)return msg('authMessage',r.error.message);msg('authMessage',signupMode?'Compte créé.':'Connexion réussie.',true);if(!signupMode)setTimeout(closeAuth,500)}
async function load(){if(!sb)return;const r=await sb.from('contents').select('*').eq('published',true).order('created_at',{ascending:false});if(!r.error)render(r.data||[])}
function render(rows){$('contentGrid').innerHTML='';$('announcementGrid').innerHTML='';if(!rows.length)$('contentGrid').innerHTML='<div class="loading">Aucun contenu publié.</div>';for(const x of rows){const icon={khasside:'📖',audio:'🎧',video:'🎥',cours:'📚',annonce:'📢'}[x.type]||'📄';const h='<article class="card"><span class="tag">'+icon+' '+esc(x.type)+'</span><h3>'+esc(x.title)+'</h3><p>'+esc(x.description||'')+'</p>'+(x.external_url?'<a target="_blank" rel="noopener" href="'+esc(x.external_url)+'">Ouvrir →</a>':'')+'</article>';if(x.type==='annonce')$('announcementGrid').insertAdjacentHTML('beforeend',h);else $('contentGrid').insertAdjacentHTML('beforeend',h)}}
async function publish(e){e.preventDefault();if(!isAdmin)return;const r=await sb.from('contents').insert({type:$('type').value,title:$('title').value,description:$('description').value,external_url:$('external_url').value||null,published:true,created_by:currentUser.id});if(r.error)return msg('formMessage',r.error.message);msg('formMessage','Contenu publié.',true);e.target.reset();load()}
function loadDemo(){render([{type:'khasside',title:'Khassaïdes',description:'Les khassaïdes du Dahira seront disponibles ici.'},{type:'audio',title:'Audios',description:'Les récitations seront disponibles ici.'},{type:'video',title:'Vidéos',description:'Les vidéos du Dahira seront disponibles ici.'},{type:'cours',title:'Cours',description:'Les enseignements seront disponibles ici.'}])}
function esc(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
addEventListener('DOMContentLoaded',init);

async function loadMembers(){
 if(!sb||!isAdmin)return;
 const r=await sb.from('members').select('id,member_number,first_name,last_name,phone,status,membership_date').order('created_at',{ascending:false});
 if(r.error){msg('memberMessage',r.error.message);return}
 const rows=r.data||[];
 $('totalMemberCount').textContent=rows.length;
 $('memberCount').textContent=rows.filter(x=>x.status==='active').length;
 $('memberRows').innerHTML=rows.length?rows.map(x=>`<tr><td><strong>${esc(x.member_number)}</strong></td><td>${esc(x.first_name)} ${esc(x.last_name)}</td><td>${esc(x.phone||'—')}</td><td>${esc(x.membership_date||'—')}</td><td><span class="status ${x.status==='active'?'active':'inactive'}">${x.status==='active'?'Actif':'Inactif'}</span></td></tr>`).join(''):'<tr><td colspan="5">Aucun membre.</td></tr>';
}
async function addMember(e){
 e.preventDefault();
 if(!isAdmin)return;
 const r=await sb.from('members').insert({first_name:$('memberFirstName').value.trim(),last_name:$('memberLastName').value.trim(),phone:$('memberPhone').value.trim()||null,email:$('memberEmail').value.trim()||null}).select('member_number').single();
 if(r.error){msg('memberMessage',r.error.message);return}
 msg('memberMessage','Membre créé : '+r.data.member_number,true);
 e.target.reset();
 await loadMembers();
}
