// ===== Config rápida =====
const TOTAL=100; 
const ADMIN_EMAILS=[
  'hijodenewton3.14@gmail.com'
];
const ADMIN_PIN = '3266'; // Cambia este PIN para abrir el login de admin

// ===== Estado =====
const state={numbers:{}, prizes:{p1:"",p2:"",p3:""}, requests:{}, backend:'local', fb:{app:null,db:null,auth:null,ref:null}, user:null, isAdmin:false, adminGate:false, isAdminUI:false};
const el={grid:by('grid'), list:by('list'), available:by('available'), taken:by('taken'), alias:by('alias'), search:by('search'), p1:by('p1'), p2:by('p2'), p3:by('p3'), tpl:by('tplItem'), tplReq:by('tplReq'), email:by('email'), password:by('password'), btnLogin:by('btnLogin'), btnGoogle:by('btnGoogle'), btnLogout:by('btnLogout'), authBox:by('authBox'), userBox:by('userBox'), userName:by('userName'), userEmail:by('userEmail'), userPhoto:by('userPhoto'), btnEnable:by('btnEnable'), cfg:by('cfg'), btnQuick:by('btnQuick'), btnExport:by('btnExport'), reqList:by('reqList'), reqCount:by('reqCount'), authArea:by('authArea'), btnAdminGate:by('btnAdminGate')};
function by(id){return document.getElementById(id)}

// ===== Local storage =====
function build(){const n={};for(let i=1;i<=TOTAL;i++) n[i]=null;return {numbers:n,prizes:{...state.prizes},requests:{}}}
function load(){try{const x=localStorage.getItem('rifa_approval_v1');return x?JSON.parse(x):null}catch(e){return null}}
function save(){try{localStorage.setItem('rifa_approval_v1',JSON.stringify({numbers:state.numbers,prizes:state.prizes,requests:state.requests}))}catch(e){}}

function apply(snap,{silent}={}){state.numbers=snap.numbers||{};state.prizes=snap.prizes||{p1:"",p2:"",p3:""};state.requests=snap.requests||{};render(); if(!silent && state.backend==='local') save();}

// ===== Arranque con restauración de modo admin y Firebase auto =====
function init(){
  const x=load();
  apply(x||build(),{silent:true});
  try{ state.adminGate = localStorage.getItem('rifa_admin_gate')==='1'; state.isAdminUI = localStorage.getItem('rifa_admin_ui')==='1'; if(state.adminGate){ document.getElementById('authArea').style.display=''; } }catch(e){}
  render();
  try{ enableFb(true); }catch(e){}
}

// ===== Notificaciones =====
function beep(){
  try{
    const Ctx = window.AudioContext || window.webkitAudioContext; if(!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type='sine'; o.frequency.value=880; o.connect(g); g.connect(ctx.destination);
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime+0.01);
    o.start();
    setTimeout(()=>{ g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime+0.15); o.stop(ctx.currentTime+0.2); ctx.close(); }, 180);
  }catch(e){}
}
function setTitleCount(){
  const c = Object.keys(state.requests||{}).length;
  const base = 'Rifa 100 Números — Amaruki (Aprobación por Admin)';
  document.title = c>0 ? `(${c}) ${base}` : base;
  el.reqCount.textContent = c;
}

// ===== Render =====
function render(){ renderCounts(); renderGrid(); renderList(); renderReqs(); el.p1.value=state.prizes.p1||''; el.p2.value=state.prizes.p2||''; el.p3.value=state.prizes.p3||''; setTitleCount(); toggleAdminSections(); }
function renderCounts(){const t=Object.values(state.numbers).filter(v=>v).length; el.taken.textContent=t; el.available.textContent=TOTAL-t;}
function isPending(no){ return !!Object.values(state.requests).find(r=>r.no===no); }
function renderGrid(){ el.grid.innerHTML=''; const term=(el.search.value||'').toLowerCase(); for(let i=1;i<=TOTAL;i++){const v=state.numbers[i]; const pending=isPending(i); const d=document.createElement('div'); d.className='num '+(v?'taken':(pending?'pending':'available')); const aliasMini=v? v.alias : (pending? 'Pendiente' : ''); d.innerHTML=`${i}<div class=\"alias-mini\">${aliasMini}</div>`; if(term){const m=(''+i).includes(term)|| (v&&v.alias.toLowerCase().includes(term)); d.style.opacity=m?1:.35;} d.onclick=()=>onNumber(i); el.grid.appendChild(d);} }
function renderList(){ el.list.innerHTML=''; const frag=document.createDocumentFragment(); Object.entries(state.numbers).filter(([n,v])=>v).sort((a,b)=>a[0]-b[0]).forEach(([no,obj])=>{ const node=el.tpl.content.firstElementChild.cloneNode(true); node.querySelector('.no').textContent=no; node.querySelector('.alias').textContent=obj.alias; node.querySelector('.uid').textContent=(obj.uid||'admin').slice(0,6); const btn=node.querySelector('.btnFree'); btn.disabled=!state.isAdminUI; btn.onclick=()=>{ if(!state.isAdminUI){alert('Solo el admin puede liberar.');return;} release(parseInt(no)); }; frag.appendChild(node); }); el.list.appendChild(frag); }
function renderReqs(){ el.reqList.innerHTML=''; const entries=Object.entries(state.requests).sort((a,b)=>a[1].ts-b[1].ts); const frag=document.createDocumentFragment(); for(const [id,r] of entries){ const node=el.tplReq.content.firstElementChild.cloneNode(true); node.querySelector('.no').textContent=r.no; node.querySelector('.alias').textContent=r.alias; node.querySelector('.client').textContent=(r.clientId||'usr').slice(0,6); const btnA=node.querySelector('.btnApprove'); const btnR=node.querySelector('.btnReject'); const canAdmin = state.isAdminUI; btnA.disabled=!canAdmin; btnR.disabled=!canAdmin; btnA.onclick=()=>approveReq(id); btnR.onclick=()=>rejectReq(id); frag.appendChild(node);} el.reqList.appendChild(frag); }

// ===== Flujo usuario (solicitud) =====
el.btnQuick.onclick=()=>{ const a=(el.alias.value||'').trim(); if(!a){alert('Escribe tu alias.'); return;} alert('Toca en la cuadrícula el número que quieres solicitar.'); };
function onNumber(no){ const cur=state.numbers[no]; if(cur){ alert('Ese número ya está reservado.'); return; } if(isPending(no)){ alert('Ese número ya tiene una solicitud pendiente.'); return; } const a=(el.alias.value||'').trim(); if(!a){ alert('Escribe tu alias.'); el.alias.focus(); return;} createRequest(no,a); }
function createRequest(no,alias){ const id='req_'+Date.now()+"_"+Math.random().toString(36).slice(2,7); const req={id,no,alias,ts:Date.now(),clientId:getClientId()}; state.requests[id]=req; render(); if(state.backend==='firebase') setRequest(id,req); else save(); alert(`Solicitud enviada para el número #${no}. Espera aprobación del admin.`); }

// ===== Flujo admin (versión anterior estable) =====
async function approveReq(id){ const r=state.requests[id]; if(!r) return; if(!state.isAdminUI){ alert('Solo el admin puede aprobar.'); return; }
  if(state.numbers[r.no]){ delete state.requests[id]; persistRequests(); render(); return; }
  const obj={alias:r.alias, uid: state.user? state.user.uid : 'admin'};
  // Optimista en UI
  state.numbers[r.no]=obj; delete state.requests[id]; render();
  if(state.backend==='firebase'){
    if(!state.isAdmin){ alert('Debes iniciar sesión como admin para escribir en la base de datos.'); return; }
    try{ await fbUpdate({[`numbers/${r.no}`]: obj, [`requests/${id}`]: null}); }
    catch(e){ alert('No pude guardar en Firebase (approve): '+(e.message||e)); }
  } else save(); }
async function rejectReq(id){ if(!state.isAdminUI){ alert('Solo el admin puede rechazar.'); return; } if(!state.requests[id]) return; delete state.requests[id]; render(); if(state.backend==='firebase'){ if(!state.isAdmin){ alert('Debes iniciar sesión como admin para escribir en la base de datos.'); return; } try{ await fbUpdate({[`requests/${id}`]: null}); }catch(e){ alert('No pude guardar en Firebase (reject): '+(e.message||e)); } } else save(); }

async function release(no){ if(!state.isAdminUI){ alert('Solo el admin puede liberar.'); return; } const cur=state.numbers[no]; if(!cur) return; state.numbers[no]=null; render(); if(state.backend==='firebase'){ if(!state.isAdmin){ alert('Debes iniciar sesión como admin para escribir en la base de datos.'); return; } try{ await fbUpdate({[`numbers/${no}`]: null}); }catch(e){ alert('No pude guardar en Firebase (release): '+(e.message||e)); } } else save(); }

function persistRequests(){ if(state.backend==='firebase'){} else save(); }

function getClientId(){ try{ let id=localStorage.getItem('rifa_client_id'); if(!id){ id='c_'+Math.random().toString(36).slice(2,10); localStorage.setItem('rifa_client_id',id);} return id; }catch(e){ return 'client'; } }

// CSV
el.btnExport.onclick=()=>{ const rows=[["numero","alias","uid"],...Object.entries(state.numbers).filter(([n,v])=>v).map(([n,v])=>[n,v.alias,v.uid||'admin'])]; const csv=rows.map(r=>r.map(x=>`"${(x+"").replaceAll('"','\"')}"`).join(',')).join('\n'); const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='rifa.csv'; a.click(); URL.revokeObjectURL(url); };

// Search
el.search.addEventListener('input',()=>{renderGrid();renderList();});

// ===== Admin Gate (PIN) =====
el.btnAdminGate.onclick=()=>{ const p=prompt('PIN de administrador:'); if(p===ADMIN_PIN){ state.adminGate=true; state.isAdminUI=true; try{ localStorage.setItem('rifa_admin_gate','1'); localStorage.setItem('rifa_admin_ui','1'); }catch(e){} document.getElementById('authArea').style.display=''; toggleAdminSections(); } else if(p){ alert('PIN incorrecto'); } };

// ===== Firebase =====
el.btnEnable.onclick=()=>enableFb(false);
async function enableFb(silent){ if(state.backend==='firebase' && state.fb.app) return state.fb.app; try{ const cfg=JSON.parse(el.cfg.value.trim()); await ensureFb(); const app=firebase.initializeApp(cfg); const db=firebase.database(); const auth=firebase.auth(); const ref=db.ref('rifa100/default'); state.backend='firebase'; state.fb={app,db,auth,ref}; // init if empty
    ref.child('snapshot').get().then(s=>{ if(!s.exists()) ref.child('snapshot').set(build()); });
    ref.child('snapshot').on('value',s=>{ if(s.exists()) apply(s.val(),{silent:true}); render(); });
    // requests realtime con notificación
    ref.child('snapshot/requests').on('value',s=>{ 
      const prev = new Set(Object.keys(state.requests||{}));
      const next = s.exists()? s.val(): {};
      state.requests = next || {};
      const nowIds = new Set(Object.keys(state.requests));
      let newCount = 0; nowIds.forEach(id=>{ if(!prev.has(id)) newCount++; });
      renderReqs(); renderGrid(); setTitleCount();
      if(state.isAdminUI && state.isAdmin && newCount>0){ beep(); }
    });
    auth.onAuthStateChanged(u=>{ state.user=u||null; const email=(u?.email||'').toLowerCase(); state.isAdmin = !!(u && ADMIN_EMAILS.includes(email)); updateAuthUI(); if(u && !el.alias.value){ el.alias.value=u.displayName|| (u.email?u.email.split('@')[0]:''); } if(state.isAdminUI){ toggleAdminSections(); } });
    if(!silent) alert('Firebase habilitado. Inicia sesión solo si eres admin.');
    return app;
}catch(e){ if(!silent) alert('No se pudo habilitar Firebase. Revisa el JSON.\n'+e); throw e; } }

function setNumber(no,obj){ return state.fb.ref.child(`snapshot/numbers/${no}`).set(obj); }
function setRequest(id,obj){ return state.fb.ref.child(`snapshot/requests/${id}`).set(obj); }
function delRequest(id){ return state.fb.ref.child(`snapshot/requests/${id}`).remove(); }
function fbUpdate(upd){ return state.fb.ref.child('snapshot').update(upd); }

function updateAuthUI(){ const u=state.user; const gate=state.adminGate; const area=document.getElementById('authArea'); area.style.display = gate? '' : 'none';
  if(u){ el.authBox.style.display='none'; el.userBox.style.display='flex'; el.userName.textContent=u.displayName|| (u.email?u.email.split('@')[0]:''); el.userEmail.textContent=u.email||''; el.userPhoto.src=u.photoURL||'data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"64\" height=\"64\"><rect width=\"100%\" height=\"100%\" fill=\"%23121a33\"/><text x=\"50%\" y=\"54%\" fill=\"white\" font-family=\"Arial\" font-size=\"22\" text-anchor=\"middle\">👤</text></svg>'; }
  else { el.authBox.style.display='block'; el.userBox.style.display='none'; }
  toggleAdminSections();
}
function toggleAdminSections(){ const sec=document.getElementById('reqSection'); if(sec){ sec.style.display = state.isAdminUI? '' : 'none'; } const sync=document.getElementById('syncSettings'); if(sync){ sync.style.display = state.isAdminUI? '' : 'none'; } }

// Auth buttons (sin registro público)
document.getElementById('btnLogin').onclick=async ()=>{ try{ if(!state.fb.app){ await enableFb(true); } await ensureFb(); if(!state.adminGate){ alert('Solo el admin puede iniciar sesión.'); return; } const email=el.email.value.trim().toLowerCase(); if(!ADMIN_EMAILS.includes(email)){ alert('Correo no autorizado como administrador.'); return;} await firebase.auth().signInWithEmailAndPassword(email, el.password.value); state.isAdminUI=true; try{ localStorage.setItem('rifa_admin_ui','1'); }catch(e){} toggleAdminSections(); }catch(e){ alert('Error al iniciar sesión: '+e.message);} };
document.getElementById('btnGoogle').onclick=async ()=>{ try{ if(!state.fb.app){ await enableFb(true); } await ensureFb(); if(!state.adminGate){ alert('Solo el admin puede iniciar sesión.'); return; } const provider=new firebase.auth.GoogleAuthProvider(); const cred=await firebase.auth().signInWithPopup(provider); const email=(cred.user?.email||'').toLowerCase(); if(!ADMIN_EMAILS.includes(email)){ await firebase.auth().signOut(); alert('Esa cuenta no está autorizada como administrador.'); return; } state.isAdminUI=true; try{ localStorage.setItem('rifa_admin_ui','1'); }catch(e){} toggleAdminSections(); }catch(e){ alert('Error con Google: '+e.message);} };
document.getElementById('btnLogout').onclick=async ()=>{ try{ await firebase.auth().signOut(); state.isAdmin=false; state.isAdminUI=false; try{ localStorage.removeItem('rifa_admin_ui'); localStorage.removeItem('rifa_admin_gate'); }catch(e){} toggleAdminSections(); setTitleCount(); }catch(e){ alert('Error al salir: '+e.message);} };

async function ensureFb(){ if(window.firebase) return; await loadScript('https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js'); await loadScript('https://www.gstatic.com/firebasejs/9.22.2/firebase-database-compat.js'); await loadScript('https://www.gstatic.com/firebasejs/9.22.2/firebase-auth-compat.js'); }
function loadScript(src){ return new Promise((res,rej)=>{ const s=document.createElement('script'); s.src=src; s.onload=res; s.onerror=rej; document.head.appendChild(s); }); }

function escapeHtml(str){ return str.replace(/[&<>"']/g, m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m])); }

// Boot
init();