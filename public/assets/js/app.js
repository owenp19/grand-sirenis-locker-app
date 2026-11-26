/* Grand Sirenis Locker App · UI offline-ready, datos siempre desde PHP/MySQL, sin dependencias de CDN. */
(() => {
'use strict';
const STATUSES=['Disponible','Asignado','Sin llave','Dañado','Bloqueado','Ocupado','Revisión'];
const PAGES={
  dashboard:{title:'Panel de control'},
  lockers:{title:'Inventario de lockers'},
  people:{title:'Colaboradores'},
  history:{title:'Bitácora de movimientos'},
  issues:{title:'Incidencias'},
  settings:{title:'Configuración'},
  profile:{title:'Mi perfil'},
  offboarding:{title:'Salida de personal'}
};
const RANGES=[7,14,30];
const TYPE_META={
  'Asignación':['plus','assign'],
  'Liberación':['key-round','release'],
  'Traslado':['arrow-right-left','transfer'],
  'Estado físico':['wrench','status'],
  'Corrección':['pencil','edit'],
  'Validación':['shield-check','check']
};
const el=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=v=>String(v??'').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
const now=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const localKey=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
const fmtDate=v=>{if(!v)return '—';const d=new Date(String(v).slice(0,10)+'T12:00:00');return Number.isNaN(+d)?esc(v):new Intl.DateTimeFormat('es-CO',{dateStyle:'medium'}).format(d)};
const fmtTime=v=>{if(!v)return '—';const d=new Date(String(v));return Number.isNaN(+d)?esc(v):new Intl.DateTimeFormat('es-CO',{dateStyle:'medium',timeStyle:'short'}).format(d)};
const fmtClock=v=>{if(!v)return '—';const d=new Date(String(v));return Number.isNaN(+d)?'—':new Intl.DateTimeFormat('es-CO',{hour:'2-digit',minute:'2-digit'}).format(d)};
const fmtDay=d=>new Intl.DateTimeFormat('es-CO',{day:'2-digit',month:'short'}).format(d);
const nfmt=v=>new Intl.NumberFormat('es-CO').format(v);
const compare=(a,b)=>{const aa=a.id.split('-').map(Number),bb=b.id.split('-').map(Number);return aa[0]-bb[0]||aa[1]-bb[1]};
const csrf=document.querySelector('meta[name="csrf-token"]')?.content||'';
const initialPage=(location.hash||'').slice(1);
const S={lockers:[],movements:[],user:{name:'Responsable',role:'operador',isAdmin:false},page:PAGES[initialPage]?initialPage:'dashboard',filter:'',block:'',search:'',pageNum:1,historySearch:'',loaded:false,installPrompt:null,searchTimer:null,lastFocus:null,activityRange:14,serverTime:'',loadedAt:0,activeTab:'inventario',_lastPage:null,serverStatus:'checking'};
let timer;
const API_TIMEOUT=8000;
const STATUS_TIMEOUT=6000;
const channel=('BroadcastChannel' in window)?new BroadcastChannel('sirenis-locker'):null;
function broadcast(msg){if(channel)channel.postMessage(msg)}
function notify(msg,error=false){const x=el('toast');x.textContent=msg;x.classList.toggle('error',error);x.classList.add('show');clearTimeout(timer);timer=setTimeout(()=>x.classList.remove('show'),4100)}
function connection(state){el('connectionBar').hidden=!state}
function announce(text){const region=el('viewStatus');if(!region)return;region.textContent='';setTimeout(()=>{region.textContent=text},40)}
async function request(resource,body){const opts={credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}};
  if(body){opts.method='POST';opts.headers['Content-Type']='application/json';opts.headers['X-CSRF-Token']=csrf;opts.body=JSON.stringify(body)}
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),API_TIMEOUT);opts.signal=controller.signal;
  let res;
  try{res=await fetch(`api.php?resource=${encodeURIComponent(resource)}`,opts)}
  catch(e){connection(true);throw Error(e.name==='AbortError'?'El servidor local no responde. Comprueba que PHP y MySQL estén encendidos.':'No hay conexión con PHP/MySQL. Comprueba que el servidor esté encendido.')}
  finally{clearTimeout(timeout)}
  if(res.status===401){window.location.href='login.php';throw Error('Sesión finalizada. Vuelve a iniciar sesión.')}
  let d;try{d=await res.json()}catch(_){connection(true);throw Error('El servidor local no devolvió una respuesta válida.')}
  if(!res.ok || !d.ok)throw Error(d.message||'No se pudo realizar la operación.');
  connection(false);return d;
}
async function load(refresh=true){const d=await request('bootstrap');S.lockers=d.lockers;S.movements=d.movements;S.user=d.user;S.serverTime=d.serverTime||'';S.loadedAt=Date.now();S.loaded=true;if(refresh){render();playViewEnter()}}
function playViewEnter(){const view=el('view');if(!view)return;view.classList.remove('view-enter');void view.offsetWidth;view.classList.add('view-enter');clearTimeout(playViewEnter.timer);playViewEnter.timer=setTimeout(()=>view.classList.remove('view-enter'),1200)}
function applyUser(user,emit=true){if(!user||!user.name)return;S.user.name=user.name;const n=el('topbarUserName');if(n)n.textContent=user.name;const i=el('topbarUserInitial');if(i)i.textContent=String(user.name).trim().charAt(0).toUpperCase()||'?';if(emit)broadcast({type:'user',name:user.name})}
window.App={updateUser(user){applyUser(user,true)}};
function count(){const c=Object.fromEntries(STATUSES.map(x=>[x,0]));S.lockers.forEach(l=>c[l.status]=(c[l.status]||0)+1);return {total:S.lockers.length,...c}}
function get(id){return S.lockers.find(l=>l.id===id)}
function available(){return S.lockers.filter(l=>l.status==='Disponible'&&!String(l.name).trim()).sort(compare)}
function allocated(){return S.lockers.filter(l=>l.status==='Asignado').sort(compare)}
function blocks(){return [...new Set(S.lockers.map(l=>Number(l.block)))].sort((a,b)=>a-b)}
function issues(){const r=[];
  for(const l of S.lockers){
    if(l.status==='Revisión')r.push({id:l.id,kind:'Estado contradictorio',text:`Origen: ${l.originalStatus||'sin dato'}. Nombre: ${l.name||'no registrado'}. Validar antes de asignar.`});
    if(l.status==='Disponible'&&String(l.name).trim())r.push({id:l.id,kind:'Titular en locker disponible',text:`Figura como disponible y aún tiene a ${l.name}.`});
    if(l.status==='Asignado'&&!String(l.name).trim())r.push({id:l.id,kind:'Asignación incompleta',text:'El locker figura asignado sin colaborador identificable.'});
    if(norm(l.name)==='ocupado')r.push({id:l.id,kind:'Titular sin identificar',text:'En el archivo original figura la palabra «Ocupado» como nombre.'});
    if(Number(l.dateInvalid))r.push({id:l.id,kind:'Fecha no validada',text:`Fecha original: ${l.dateRaw||'sin dato'}. Conservar para verificar con documento.`});
  }
  const names=new Map();for(const l of allocated()){const k=norm(l.name);if(!k)continue;if(!names.has(k))names.set(k,[]);names.get(k).push(l.id)}
  for(const [name,ids] of names){if(ids.length>1)r.push({id:ids[0],kind:'Posible duplicado',text:`${name} figura en los lockers ${ids.join(' y ')}. Comprueba si corresponde a la misma persona.`})}
  return r;
}
function badge(s){return `<span class="pill ${esc(norm(s).replaceAll(' ','-'))}">${esc(s)}</span>`}
const icon=(name,cls='')=>`<svg class="icon ${cls}" aria-hidden="true" focusable="false"><use href="assets/icons/lucide-sprite.svg#${name}"></use></svg>`;
const button=(action,label,cls='btn',id='',iconName='')=>`<button type="button" class="${cls}" data-action="${action}" ${id?`data-id="${esc(id)}"`:''}>${iconName?icon(iconName):''}${label}</button>`;
function pageHeader(title,kicker,desc,actions=''){return `<div class="page-head"><div><span class="kicker">${esc(kicker)}</span><h1 tabindex="-1">${esc(title)}</h1><p class="subtext">${esc(desc)}</p></div><div class="actions">${actions}</div></div>`}

/* ── Indicadores y gráficos ─────────────────────────────────────────────── */
function statCard(label,value,iconName,description,tone,pct=null,small=''){
  const progress=pct===null?'':`<progress class="stat-progress" max="100" value="${Math.max(0,Math.min(100,Math.round(pct)))}" aria-label="${esc(label)}: ${Math.round(pct)}%"></progress>`;
  return `<article class="stat tone-${tone}"><div class="stat-top"><span class="stat-label">${esc(label)}</span><span class="stat-icon tone-${tone}" aria-hidden="true">${icon(iconName)}</span></div><div class="stat-num">${value}${small?`<small>${esc(small)}</small>`:''}</div>${progress}<div class="stat-desc">${esc(description)}</div></article>`;
}
function donutChart(){
  const c=count();
  const groups=[
    {label:'Asignados',val:c.Asignado,cls:'is-assigned',legend:'legend-0',filter:'Asignado'},
    {label:'Disponibles',val:c.Disponible,cls:'is-available',legend:'legend-1',filter:'Disponible'},
    {label:'Sin llave',val:c['Sin llave'],cls:'is-nokey',legend:'legend-2',filter:'Sin llave'},
    {label:'Otros estados',val:c.Dañado+c.Bloqueado+c.Ocupado+c.Revisión,cls:'is-other',legend:'legend-3',filter:''}
  ];
  const r=69,C=2*Math.PI*r,total=c.total||1,occupancy=c.total?Math.round(c.Asignado/c.total*100):0;
  let offset=0;
  const segments=groups.map(g=>{if(!g.val)return '';const span=g.val/total*C;const seg=`<circle class="donut-seg ${g.cls}" cx="100" cy="100" r="${r}" fill="none" stroke-dasharray="${span.toFixed(3)} ${(C-span).toFixed(3)}" stroke-dashoffset="${(-offset).toFixed(3)}" transform="rotate(-90 100 100)"><title>${esc(g.label)}: ${g.val} (${Math.round(g.val/total*100)}%)</title></circle>`;offset+=span;return seg}).join('');
  const label=groups.map(g=>`${g.label}: ${g.val}`).join(', ');
  const rows=groups.map(g=>{
    const row=`<span class="legend-dot ${g.legend}" aria-hidden="true"></span><span>${esc(g.label)}</span><span class="legend-value">${nfmt(g.val)}</span><span class="legend-pct">${c.total?Math.round(g.val/c.total*100):0}%</span>`;
    return g.filter
      ? `<button type="button" class="legend-row" data-action="filterStatus" data-id="${esc(g.filter)}" aria-label="Ver ${esc(g.label)}: ${g.val} lockers">${row}</button>`
      : `<button type="button" class="legend-row" data-action="viewIssues" aria-label="Revisar otros estados: ${g.val} lockers">${row}</button>`;
  }).join('');
  return `<div class="donut-layout"><div class="donut-figure"><svg class="donut" viewBox="0 0 200 200" role="img" aria-label="Ocupación del inventario: ${occupancy}%. ${label}. Total: ${c.total} lockers."><circle class="donut-track" cx="100" cy="100" r="${r}" fill="none" stroke-width="18"/>${segments}<text x="100" y="98" text-anchor="middle" class="donut-center-strong">${occupancy}%</text><text x="100" y="119" text-anchor="middle" class="donut-center-caption">OCUPACIÓN</text></svg><p class="donut-foot"><b>${nfmt(c.Asignado)}</b> de ${nfmt(c.total)} lockers asignados</p></div><div class="legend" role="group" aria-label="Distribución por estado">${rows}</div></div>`;
}
function activitySeries(days){
  const base=new Date();base.setHours(12,0,0,0);
  const list=[];
  for(let i=days-1;i>=0;i--){const d=new Date(base);d.setDate(d.getDate()-i);list.push({date:d,count:0})}
  const index=new Map(list.map((b,i)=>[localKey(b.date),i]));
  for(const m of S.movements){const i=index.get(String(m.at||'').slice(0,10));if(i!==undefined)list[i].count++}
  return list;
}
function previousTotal(days){
  const base=new Date();base.setHours(12,0,0,0);
  const keys=new Set();
  for(let i=days*2-1;i>=days;i--){const d=new Date(base);d.setDate(d.getDate()-i);keys.add(localKey(d))}
  return S.movements.filter(m=>keys.has(String(m.at||'').slice(0,10))).length;
}
function trendTag(current,previous){
  let cls='is-flat',name='trending-up',text='Sin cambios';
  if(current===0&&previous===0){cls='is-flat';name='activity';text='Sin movimientos'}
  else if(previous===0){cls='is-up';name='trending-up';text='Nuevo'}
  else{const delta=Math.round((current-previous)/previous*100);if(delta>0){cls='is-up';name='trending-up';text=`+${delta}%`}else if(delta<0){cls='is-down';name='trending-down';text=`${delta}%`}else{text='0%'}}
  return `<span class="trend ${cls}">${icon(name)}${text}</span>`;
}
function emptyActivity(days){
  return `<div class="empty"><span class="empty-icon">${icon('activity')}</span>No hay movimientos registrados en los últimos ${days} días.<br>La bitácora se construye con las operaciones reales del sistema.</div>`;
}
function activityChart(){
  const days=S.activityRange;
  const series=activitySeries(days);
  const total=series.reduce((a,b)=>a+b.count,0);
  const previous=previousTotal(days);
  const peak=series.reduce((a,b)=>b.count>a.count?b:a,series[0]||{count:0});
  const note=S.movements.length>=500?' · base: últimos 500 movimientos':'';
  const tabs=`<div class="segmented" role="group" aria-label="Rango de actividad">${RANGES.map(n=>`<button type="button" data-action="activityRange" data-id="${n}" aria-pressed="${n===days}">${n} días</button>`).join('')}</div>`;
  const head=`<div class="panel-head"><div class="panel-heading"><span class="panel-icon" aria-hidden="true">${icon('activity')}</span><div><h2>Actividad operativa</h2><p>Movimientos registrados por día${esc(note)}</p></div></div><div class="panel-tools">${tabs}</div></div>`;
  if(!total){
    return `<section class="panel">${head}<div class="panel-body">${emptyActivity(days)}<div class="chart-summary"><span>Periodo: <b>${days} días</b></span>${trendTag(0,previous)}<span>Comparado con los ${days} días anteriores.</span></div></div></section>`;
  }
  const W=720,H=250,pl=38,pr=16,pt=18,pb=32,iw=W-pl-pr,ih=H-pt-pb;
  const top=Math.max(1,...series.map(b=>b.count));
  const step=Math.max(1,Math.ceil(top/4)),maxV=step*4;
  const x=i=>pl+(series.length===1?iw/2:(i*iw)/(series.length-1));
  const y=v=>pt+ih-(v/maxV)*ih;
  const pts=series.map((b,i)=>[x(i),y(b.count)]);
  const line=pts.map((p,i)=>`${i?'L':'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const area=`${line} L${x(series.length-1).toFixed(1)} ${(pt+ih).toFixed(1)} L${x(0).toFixed(1)} ${(pt+ih).toFixed(1)} Z`;
  const grid=[0,1,2,3,4].map(n=>{const gy=y(n*step);return `<line class="activity-grid" x1="${pl}" y1="${gy.toFixed(1)}" x2="${W-pr}" y2="${gy.toFixed(1)}"></line><text class="activity-axis" x="${pl-8}" y="${(gy+3.5).toFixed(1)}" text-anchor="end">${n*step}</text>`}).join('');
  const tickEvery=Math.max(1,Math.ceil(series.length/5));
  const xAxis=series.map((b,i)=>`${i%tickEvery===0||i===series.length-1?`<text class="activity-axis" x="${x(i).toFixed(1)}" y="${H-10}" text-anchor="middle">${esc(fmtDay(b.date))}</text>`:''}`).join('');
  const hits=series.map((b,i)=>{const x0=i===0?pl:(x(i-1)+x(i))/2;const x1=i===series.length-1?W-pr:(x(i)+x(i+1))/2;return `<rect class="activity-hit" x="${x0.toFixed(1)}" y="${pt}" width="${Math.max(1,x1-x0).toFixed(1)}" height="${ih}" data-chart-day="${localKey(b.date)}" data-label="${esc(fmtDay(b.date))}" data-value="${b.count}"></rect>`}).join('');
  const dots=series.map((b,i)=>b.count?`<circle class="activity-dot" cx="${x(i).toFixed(1)}" cy="${y(b.count).toFixed(1)}" r="3.4"></circle>`:'').join('');
  const aria=`Actividad de los últimos ${days} días: ${total} movimientos. ${series.map(b=>`${fmtDay(b.date)}: ${b.count}`).join('. ')}.`;
  return `<section class="panel">${head}<div class="panel-body"><div class="chart-stage"><div class="chart-tip" aria-hidden="true"></div><svg class="activity-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(aria)}"><defs><linearGradient id="activity-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#A5832E" stop-opacity="0.3"></stop><stop offset="100%" stop-color="#A5832E" stop-opacity="0"></stop></linearGradient></defs>${grid}${xAxis}<path class="activity-area" d="${area}"></path><path class="activity-line" d="${line}"></path>${hits}${dots}</svg></div><div class="chart-summary"><span><b>${nfmt(total)}</b> movimientos en ${days} días</span>${trendTag(total,previous)}<span>Promedio <b>${(total/days).toFixed(1)}</b>/día</span><span>Día con más actividad: <b>${esc(fmtDay(peak.date))}</b> (${peak.count})</span></div></div></section>`;
}
function blockChart(){
  const list=blocks();
  if(!list.length)return `<div class="empty"><span class="empty-icon">${icon('boxes')}</span>No hay bloques registrados.</div>`;
  return `<div class="block-list" role="list" aria-label="Ocupación por bloque">${list.map(b=>{
    const ls=S.lockers.filter(l=>Number(l.block)===b);
    const assigned=ls.filter(l=>l.status==='Asignado').length;
    const avail=ls.filter(l=>l.status==='Disponible').length;
    const other=ls.length-assigned-avail;
    const pct=v=>ls.length?v/ls.length*100:0;
    const a=pct(assigned),v=pct(avail),o=pct(other);
    const bar=`<svg class="block-bar" viewBox="0 0 100 9" preserveAspectRatio="none" aria-hidden="true" focusable="false"><title>Bloque ${b}: ${assigned} asignados, ${avail} disponibles, ${other} en otros estados</title><rect class="bar-assigned" x="0" y="0" width="${a.toFixed(2)}" height="9"></rect><rect class="bar-available" x="${a.toFixed(2)}" y="0" width="${v.toFixed(2)}" height="9"></rect><rect class="bar-other" x="${(a+v).toFixed(2)}" y="0" width="${o.toFixed(2)}" height="9"></rect></svg>`;
    return `<button type="button" class="block-btn" data-action="block" data-id="${b}" role="listitem" aria-label="Bloque ${b}: ${assigned} asignados, ${avail} disponibles, ${other} en otros estados. Filtrar inventario."><span class="block-row"><span class="block-label">Bloque ${b}</span><span class="block-track" aria-hidden="true">${bar}</span><span class="block-metrics"><b>${assigned}</b>/${ls.length}</span><span class="block-pct">${Math.round(a)}%</span></span></button>`;
  }).join('')}</div><p class="block-caption">Azul: asignados · Verde: disponibles · Ocre: requieren atención. Selecciona un bloque para filtrar el inventario.</p>`;
}
function feed(){
  if(!S.movements.length)return `<div class="empty"><span class="empty-icon">${icon('history')}</span>Aún no hay movimientos registrados en MySQL.<br>La bitácora se construye con las operaciones reales del sistema.<div class="empty-action">${button('assign','Registrar primera asignación','btn btn-sm','','plus')}</div></div>`;
  return `<div class="feed">${S.movements.slice(0,5).map(e=>{const meta=TYPE_META[e.type]||['history',''];
    return `<article class="feed-item"><span class="feed-icon tone-${meta[1]}" aria-hidden="true">${icon(meta[0])}</span><div class="feed-copy"><b>${esc(e.type)} · ${esc(e.locker)}</b><p>${esc(e.person||e.description||'Movimiento registrado')}</p></div><time class="feed-time" datetime="${esc(e.at)}">${fmtTime(e.at)}</time></article>`}).join('')}</div>`;
}

/* ── Vista principal ─────────────────────────────────────────────────────── */
function dashboardHero(actions){
  const hour=new Date().getHours();
  const greet=hour<12?'Buenos días':hour<19?'Buenas tardes':'Buenas noches';
  const first=String(S.user.name||'Responsable').split(' ')[0];
  return `<section class="dash-hero"><div class="dash-hero-copy"><span class="dash-hero-kicker">${esc(greet)}, ${esc(first)}</span><h1 tabindex="-1">Panel de control</h1><p>Supervisa la ocupación, la actividad y las operaciones del inventario en tiempo real.</p></div><div class="dash-hero-actions">${actions}</div></section>`;
}
function dashboard(){
  const c=count();
  const attention=c['Sin llave']+c.Dañado+c.Bloqueado+c.Ocupado+c.Revisión;
  const list=blocks();
  const pct=v=>c.total?v/c.total*100:0;
  const occupancy=c.total?Math.round(c.Asignado/c.total*100):0;
  const issueList=issues();
  const updated=S.serverTime?fmtClock(S.serverTime):fmtClock(new Date().toISOString());
  const actions=`<button type="button" class="btn" data-action="refresh">${icon('refresh-cw')} Actualizar</button>${button('assign','Asignar locker','btn btn-primary','','plus')}${S.user.isAdmin?button('exportBackup','Respaldo JSON','btn','','download'):''}`;
  return `${dashboardHero(actions)}
  <div class="dash-meta"><span><strong>${nfmt(c.total)}</strong> lockers</span><span><strong>${list.length}</strong> bloques</span><span>Ocupación <strong>${occupancy}%</strong></span><span class="dash-meta-live"><span class="status-dot" aria-hidden="true"></span>Datos desde MySQL · ${esc(updated)}</span></div>
  <section class="stats" aria-label="Indicadores del inventario">
    ${statCard('Total de lockers',nfmt(c.total),'boxes','Inventario completo','blue')}
    ${statCard('Asignados',nfmt(c.Asignado),'users',`${occupancy}% del inventario`,'blue',pct(c.Asignado))}
    ${statCard('Disponibles',nfmt(c.Disponible),'key-round','Listos para asignar','teal',pct(c.Disponible))}
    ${statCard('Ocupación',occupancy,'gauge','Asignados sobre el total','gold',null,'%')}
    ${statCard('Requieren atención',nfmt(attention),'triangle-alert','No asignables por ahora','amber',pct(attention))}
    ${statCard('Movimientos',nfmt(S.movements.length),'history',S.movements.length>=500?'Últimos 500 registros':'Registrados en la bitácora','navy')}
  </section>
  <div class="dash-grid">
    <section class="panel"><div class="panel-head"><div class="panel-heading"><span class="panel-icon" aria-hidden="true">${icon('chart-column')}</span><div><h2>Ocupación del inventario</h2><p>Distribución real por estado</p></div></div>${button('viewLockers','Ver inventario','btn btn-sm','','boxes')}</div><div class="panel-body">${donutChart()}</div></section>
    ${activityChart()}
  </div>
  <div class="dash-grid-split">
    <section class="panel"><div class="panel-head"><div class="panel-heading"><span class="panel-icon" aria-hidden="true">${icon('boxes')}</span><div><h2>Ocupación por bloque</h2><p>${list.length} bloques · según inventario</p></div></div><span class="pill">${c.total} unidades</span></div><div class="panel-body">${blockChart()}</div></section>
    <div class="dash-stack">
      <section class="panel"><div class="panel-head"><div class="panel-heading"><span class="panel-icon" aria-hidden="true">${icon('sparkles')}</span><div><h2>Acciones rápidas</h2><p>Gestión cotidiana en pocos pasos</p></div></div></div><div class="panel-body"><div class="quick-grid">
        <button type="button" class="quick-card" data-action="assign"><span class="quick-icon" aria-hidden="true">${icon('plus')}</span><span class="quick-copy"><b>Asignar locker</b><small>Nuevo colaborador</small></span>${icon('arrow-up-right','quick-arrow')}</button>
        <button type="button" class="quick-card" data-action="release"><span class="quick-icon" aria-hidden="true">${icon('key-round')}</span><span class="quick-copy"><b>Liberar locker</b><small>Salida o renuncia</small></span>${icon('arrow-up-right','quick-arrow')}</button>
        <button type="button" class="quick-card" data-action="transfer"><span class="quick-icon" aria-hidden="true">${icon('arrow-right-left')}</span><span class="quick-copy"><b>Trasladar persona</b><small>Cambio de casillero</small></span>${icon('arrow-up-right','quick-arrow')}</button>
        <button type="button" class="quick-card" data-action="status"><span class="quick-icon" aria-hidden="true">${icon('wrench')}</span><span class="quick-copy"><b>Estado físico</b><small>Daños, llaves o bloqueo</small></span>${icon('arrow-up-right','quick-arrow')}</button>
        <button type="button" class="quick-card quick-card--wide" data-action="viewAvailable"><span class="quick-icon" aria-hidden="true">${icon('search')}</span><span class="quick-copy"><b>Ver disponibilidad</b><small>${nfmt(c.Disponible)} lockers libres</small></span>${icon('arrow-up-right','quick-arrow')}</button>
      </div>${issueList.length?`<div class="notice">${icon('triangle-alert')} <strong>${issueList.length} incidencias de datos</strong> detectadas. ${button('viewIssues','Revisar','btn btn-sm','','arrow-right')}</div>`:`<div class="notice success">${icon('circle-check')} Datos sin incidencias detectadas.</div>`}</div></section>
      <section class="panel"><div class="panel-head"><div class="panel-heading"><span class="panel-icon" aria-hidden="true">${icon('history')}</span><div><h2>Movimientos recientes</h2><p>Últimas operaciones con responsable</p></div></div>${button('viewHistory','Ver todos','btn btn-sm','','arrow-right')}</div><div class="panel-body panel-body-flush">${feed()}</div></section>
    </div>
  </div>`;
}
function filterControls(type='lockers'){
  const list=blocks();
  const search=type==='history'?S.historySearch:S.search;
  const placeholder=type==='history'?'Buscar locker, fecha, movimiento…':type==='people'?'Buscar colaborador, departamento…':'Buscar locker, colaborador, departamento…';
  const clear=`<button type="button" class="search-clear" data-action="clearSearch" aria-label="Limpiar búsqueda"${String(search).trim()?'':' hidden'}>${icon('x')}</button>`;
  return `<div class="table-tools"><div class="search-wrap"><span aria-hidden="true">${icon('search')}</span><input type="search" id="${type==='history'?'historySearch':'searchInput'}" value="${esc(search)}" autocomplete="off" placeholder="${placeholder}" aria-label="Buscar">${clear}</div>${type==='lockers'?`<select class="filter-select" id="blockFilter" aria-label="Filtrar bloque"><option value="">Todos los bloques</option>${list.map(b=>`<option value="${b}" ${String(S.block)===String(b)?'selected':''}>Bloque ${b}</option>`).join('')}</select><select class="filter-select" id="statusFilter" aria-label="Filtrar estado"><option value="">Todos los estados</option>${STATUSES.map(s=>`<option ${S.filter===s?'selected':''} value="${esc(s)}">${esc(s)}</option>`).join('')}</select>`:''}</div>`;
}
function pager(total,per){const pages=Math.max(1,Math.ceil(total/per));S.pageNum=Math.min(S.pageNum,pages);return `<div class="pagination"><span>${nfmt(total)} resultados · Página ${S.pageNum} de ${pages}</span><div class="actions"><button class="btn btn-sm" data-action="prev" ${S.pageNum===1?'disabled':''}>${icon('chevron-left')} Anterior</button><button class="btn btn-sm" data-action="next" ${S.pageNum===pages?'disabled':''}>Siguiente ${icon('chevron-right')}</button></div></div>`}
function tableLockers(noHeader=false){
  const list=S.lockers.filter(l=>(!S.filter||l.status===S.filter)&&(!S.block||String(l.block)===String(S.block))&&(!S.search||norm([l.id,l.name,l.department,l.supervisor].join(' ')).includes(norm(S.search)))).sort(compare);
  const per=16;S.pageNum=Math.min(S.pageNum,Math.max(1,Math.ceil(list.length/per)));
  const show=list.slice((S.pageNum-1)*per,S.pageNum*per);
  const head=noHeader?'':`${pageHeader('Inventario de lockers','Control de casilleros','Consulta disponibilidad y administra los 13 bloques.',button('exportInventory','Descargar CSV','btn','','download')+button('assign','Asignar locker','btn btn-primary','','plus'))}`;
  return `${head}${filterControls()}<section class="table-wrap"><div class="table-scroll"><table><caption class="sr-only">Inventario de lockers</caption><thead><tr><th scope="col">Locker</th><th scope="col">Estado</th><th scope="col">Colaborador</th><th scope="col">Departamento</th><th scope="col">Fecha de entrega</th><th scope="col">Acción</th></tr></thead><tbody>${show.length?show.map(l=>`<tr><td data-label="Locker"><strong>${esc(l.id)}</strong></td><td data-label="Estado">${badge(l.status)}</td><td data-label="Colaborador">${l.name?esc(l.name):'<span class="muted">Sin asignar</span>'}</td><td data-label="Departamento">${esc(l.department||'—')}</td><td data-label="Fecha de entrega">${fmtDate(l.date||'')}</td><td data-label="Acción">${button('detail','Gestionar','table-btn',l.id,'arrow-right')}</td></tr>`).join(''):`<tr><td colspan="6"><div class="empty"><span class="empty-icon">${icon('box')}</span>No hay lockers con estos filtros.</div></td></tr>`}</tbody></table></div>${pager(list.length,per)}</section>`;
}
function tablePeople(noHeader=false){
  const list=allocated().filter(l=>!S.search||norm([l.id,l.name,l.department,l.supervisor].join(' ')).includes(norm(S.search)));
  const per=16;S.pageNum=Math.min(S.pageNum,Math.max(1,Math.ceil(list.length/per)));
  const show=list.slice((S.pageNum-1)*per,S.pageNum*per);
  const head=noHeader?'':`${pageHeader('Colaboradores','Personal asignado','Consulta rápidamente el locker de cada colaborador.',button('assign','Nueva asignación','btn btn-primary','','plus'))}${filterControls('people')}`;
  return `${head}<section class="table-wrap"><div class="table-scroll"><table><caption class="sr-only">Colaboradores con locker asignado</caption><thead><tr><th scope="col">Colaborador</th><th scope="col">Departamento</th><th scope="col">Jefe inmediato</th><th scope="col">Locker</th><th scope="col">Acción</th></tr></thead><tbody>${show.length?show.map(l=>`<tr><td data-label="Colaborador"><strong>${esc(l.name||'Pendiente')}</strong></td><td data-label="Departamento">${esc(l.department||'—')}</td><td data-label="Jefe inmediato">${esc(l.supervisor||'—')}</td><td data-label="Locker"><strong>${esc(l.id)}</strong></td><td data-label="Acción">${button('detail','Gestionar','table-btn',l.id,'arrow-right')}</td></tr>`).join(''):`<tr><td colspan="5"><div class="empty"><span class="empty-icon">${icon('users')}</span>No se encontraron colaboradores.</div></td></tr>`}</tbody></table></div>${pager(list.length,per)}</section>`;
}
function lockersManagement(){
  const active=S.activeTab==='inventario'?'inventario':'colaboradores';
  const tabs=[{key:'inventario',label:'Inventario',icon:'boxes'},{key:'colaboradores',label:'Colaboradores',icon:'users'}];
  const tabHtml=tabs.map(t=>`<button type="button" class="gestion-tab${active===t.key?' is-active':''}" data-action="gestionTab" data-id="${t.key}">${icon(t.icon)} ${t.label}</button>`).join('');
  const total=S.lockers.length;
  const free=S.lockers.filter(l=>l.status==='Disponible').length;
  const busy=total-free;
  return `<div class="lockers-page">
    <header class="page-hero page-hero--navy lockers-hero">
      <div class="page-hero-copy">
        <span class="kicker">Control de casilleros</span>
        <h1 tabindex="-1">Gestión de lockers</h1>
        <p class="subtext">Administra el inventario de lockers y los colaboradores asignados desde una sola sección.</p>
        <div class="page-hero-chips">
          <span class="page-chip">${icon('boxes')} ${nfmt(total)} lockers</span>
          <span class="page-chip page-chip--success">${icon('circle-check')} ${nfmt(free)} disponibles</span>
          <span class="page-chip page-chip--warn">${icon('users')} ${nfmt(busy)} no disponibles</span>
        </div>
      </div>
      <div class="page-hero-actions">${button('exportInventory','Descargar CSV','btn','','download')}${button('assign','Asignar locker','btn btn-primary','','plus')}</div>
    </header>
    <div class="gestion-tabs" role="tablist" aria-label="Sección de gestión">${tabHtml}</div>
    ${active==='inventario'?tableLockers(true):tablePeople(true)}
  </div>`;
}
function movementsPage(){
  const filtered=S.movements.filter(e=>!S.historySearch||norm([e.type,e.locker,e.person,e.description,e.by,e.at].join(' ')).includes(norm(S.historySearch)));
  const per=45;S.pageNum=Math.min(S.pageNum,Math.max(1,Math.ceil(filtered.length/per)));
  const show=filtered.slice((S.pageNum-1)*per,S.pageNum*per);
  const typeIcons={'Asignación':'user-plus','Liberación':'user','Traslado':'arrow-right','Estado físico':'wrench','Corrección':'pencil','Validación':'check'};
  return `<div class="history-page">
    <header class="page-hero page-hero--navy history-hero">
      <div class="page-hero-copy">
        <span class="kicker">Trazabilidad</span>
        <h1 tabindex="-1">Bitácora de movimientos</h1>
        <p class="subtext">Cada movimiento nuevo queda almacenado en MySQL con su responsable y fecha.</p>
        <div class="page-hero-chips">
          <span class="page-chip">${icon('history')} ${nfmt(S.movements.length)} registros</span>
          <span class="page-chip">${icon('search')} ${nfmt(filtered.length)} coincidencias</span>
          <span class="page-chip">${icon('clock')} Más recientes primero</span>
        </div>
      </div>
      <div class="page-hero-actions">${button('exportHistory','Exportar historial','btn btn-primary','','download')}</div>
    </header>
    <section class="page-toolbar">${filterControls('history')}</section>
    <section class="history-panel">
      <div class="panel-head">
        <div class="panel-heading">
          <span class="panel-icon" aria-hidden="true">${icon('history')}</span>
          <div><h2>Actividad registrada</h2><p>${nfmt(filtered.length)} movimientos coinciden con la búsqueda actual.</p></div>
        </div>
      </div>
      ${show.length?`<div class="history-list">${show.map(e=>`<article class="history-item"><span class="history-item-icon" aria-hidden="true">${icon(typeIcons[e.type]||'history')}</span><div class="history-item-body"><div class="history-item-top"><h3>${esc(e.type)}</h3><span class="history-locker">${esc(e.locker)}</span></div><p>${esc(e.description)}</p><small>${icon('clock')} ${fmtTime(e.at)} <span class="history-dot" aria-hidden="true"></span> Responsable: ${esc(e.by)}</small></div></article>`).join('')}</div>`:`<div class="empty"><span class="empty-icon">${icon('history')}</span>No hay movimientos que coincidan con esta búsqueda.<br>Los registros históricos previos al sistema no se inventan.</div>`}${pager(filtered.length,per)}
    </section>
    <p class="subtext history-note">Vista de hasta 500 movimientos recientes. La exportación CSV incluye hasta 50 000 registros, del más reciente al más antiguo.</p>
  </div>`;
}
function issuesPage(){
  const list=issues();
  return `${pageHeader('Incidencias','Calidad de datos','Revisa casos dudosos antes de permitir una nueva asignación.',button('viewLockers','Ver inventario','btn','','boxes'))}<section class="table-wrap"><div class="panel-head"><div><h2>${list.length} observaciones activas</h2><p>Inconsistencias heredadas del documento o detectadas en los registros</p></div></div>${list.length?list.map(i=>`<div class="issue-item"><div class="issue-icon" aria-hidden="true">${icon('triangle-alert')}</div><div><b>${esc(i.kind)} · Locker ${esc(i.id)}</b><p>${esc(i.text)}</p></div>${button('detail','Revisar','btn btn-sm',i.id,'arrow-right')}</div>`).join(''):'<div class="empty"><span class="empty-icon">' + icon('circle-check') + '</span>No hay incidencias detectadas.</div>'}</section>`;
}
function settingsView(){
  if(!window.Settings) return '<div class="error-splash"><h2>Configuración no disponible</h2><p>El módulo de configuración no se cargó.</p></div>';
  return window.Settings.template();
}
function profileView(){
  if(!window.Profile) return '<div class="error-splash"><h2>Perfil no disponible</h2><p>El módulo de perfil no se cargó.</p></div>';
  return '<div class="profile-loading">Cargando perfil…</div>';
}
function offboardingView(){
  return `<section class="offboarding-page">
    <header class="offboarding-hero">
      <div class="offboarding-hero-copy">
        <span class="kicker">Proceso administrativo</span>
        <h1 tabindex="-1">Salida de personal</h1>
        <p class="subtext">Libera los lockers de un colaborador que deja la empresa. La operación queda registrada en el historial y no elimina movimientos anteriores.</p>
      </div>
      <span class="offboarding-hero-badge" aria-hidden="true">${icon('user','icon-lg')}<small>Recursos humanos</small></span>
    </header>

    <ol class="offboarding-steps" aria-label="Pasos del proceso">
      <li class="is-active"><span class="offboarding-step-num">1</span><span class="offboarding-step-copy"><strong>Buscar</strong><small>Localiza al colaborador</small></span></li>
      <li><span class="offboarding-step-num">2</span><span class="offboarding-step-copy"><strong>Revisar</strong><small>Verifica sus lockers</small></span></li>
      <li><span class="offboarding-step-num">3</span><span class="offboarding-step-copy"><strong>Confirmar</strong><small>Libera y genera informe</small></span></li>
    </ol>

    <section class="offboarding-card">
      <header class="offboarding-card-head">
        <span class="offboarding-card-icon tone-gold" aria-hidden="true">${icon('search')}</span>
        <div>
          <h2>Buscar colaborador</h2>
          <p>Escribe el nombre completo o parte de él. La búsqueda ignora acentos y mayúsculas.</p>
        </div>
      </header>
      <div class="offboarding-card-body">
        <div class="offboarding-search">
          <label class="offboarding-label" for="offboardingQuery">Nombre del colaborador</label>
          <div class="offboarding-search-row">
            <div class="search-wrap offboarding-search-field">
              ${icon('search')}
              <input id="offboardingQuery" type="search" placeholder="Ej. María Fernanda López" autocomplete="off">
            </div>
            <button type="button" class="btn btn-primary" data-action="offboarding-search">${icon('search')} Buscar</button>
          </div>
        </div>
        <div class="results-list hidden" id="offboardingResults"></div>
      </div>
    </section>

    <section class="offboarding-card offboarding-preview hidden" id="offboardingPreview">
      <header class="offboarding-card-head">
        <span class="offboarding-card-icon tone-teal" aria-hidden="true">${icon('check')}</span>
        <div>
          <h2>Lockers encontrados</h2>
          <p>Revisa la información del colaborador antes de continuar.</p>
        </div>
      </header>
      <div class="offboarding-card-body">
        <div class="offboarding-person">
          <span class="offboarding-avatar" aria-hidden="true">${icon('user')}</span>
          <div class="offboarding-person-copy">
            <strong id="offboardingPersonName"></strong>
            <span>Colaborador seleccionado</span>
          </div>
          <span class="offboarding-count">Lockers <b id="offboardingLockerCount">0</b></span>
        </div>
      </div>
    </section>

    <section class="offboarding-card offboarding-process hidden" id="offboardingProcess">
      <header class="offboarding-card-head">
        <span class="offboarding-card-icon tone-amber" aria-hidden="true">${icon('triangle-alert')}</span>
        <div>
          <h2>Confirmar liberación</h2>
          <p>Esta acción deja los lockers disponibles y no se puede deshacer.</p>
        </div>
      </header>
      <div class="offboarding-card-body">
        <input type="hidden" id="offboardingLockerIds" value="">
        <div class="offboarding-warning">¿Seguro que deseas liberar los lockers de <strong id="offboardingPersonName2"></strong>?</div>
        <div class="offboarding-summary">
          <div class="offboarding-summary-item"><span>Proceso</span><strong>Salida de personal</strong></div>
          <div class="offboarding-summary-item"><span>Lockers a liberar</span><strong id="offboardingLockerCount2">0</strong></div>
        </div>
        <div class="offboarding-actions">
          <button type="button" class="btn btn-primary" data-action="offboarding-confirm">${icon('check')} Confirmar liberación</button>
          <button type="button" class="btn" data-action="offboarding-cancel">Cancelar</button>
        </div>
      </div>
    </section>

    <section class="offboarding-result hidden" id="offboardingResult"></section>
  </section>`;
}
function render(){
  if(!S.loaded)return;
  document.querySelectorAll('[data-page]').forEach(n=>{
    const active=n.dataset.page===S.page||(n.dataset.page==='lockers'&&(S.page==='lockers'||S.page==='people'));
    n.classList.toggle('active',active);
    if(active)n.setAttribute('aria-current','page');else n.removeAttribute('aria-current');
  });
  const issueCount=issues().length;
  const issueBadge=el('issueBadge');if(issueBadge)issueBadge.textContent=issueCount||'';
  const notifBadge=el('notifBadge');
  if(notifBadge){notifBadge.textContent=issueCount||'';notifBadge.hidden=!issueCount}
  const notifBtn=el('notifBtn');
  if(notifBtn)notifBtn.setAttribute('aria-label',issueCount?`${issueCount} incidencias de datos. Revisar.`:'Sin incidencias de datos');
  const prevPage = S._lastPage;
  if (prevPage === 'settings' && window.Settings) window.Settings.unmount();
  if (prevPage === 'profile' && window.Profile) window.Profile.unmount();
  el('view').innerHTML = S.page === 'dashboard' ? dashboard()
    : (S.page === 'lockers' || S.page === 'people') ? lockersManagement()
    : S.page === 'history' ? movementsPage()
    : S.page === 'issues' ? issuesPage()
    : S.page === 'settings' ? settingsView()
    : S.page === 'profile' ? profileView()
    : S.page === 'offboarding' ? offboardingView() : issuesPage();
  el('view').setAttribute('aria-busy','false');
  const meta = PAGES[S.page] || PAGES.dashboard;
  const title = el('topbarTitle'); if (title) title.textContent = meta.title;
  document.title = `${meta.title} · Grand Sirenis Locker App`;
  if (S.page === 'settings' && window.Settings) {
    window.Settings.mount(el('view'), (S.user && S.user.name) ? S.user.name : '');
  }
  if (S.page === 'profile' && window.Profile) {
    window.Profile.mount(el('view'));
  }
  S._lastPage = S.page;

  /* Indicador de estado del servidor en sidebar (comprobación real, no solo navigator.onLine) */
  updateServerStatusIndicator();
}
function go(page,push=true,opts={}){
  if(!PAGES[page])return;
  S.page=page;S.search='';S.historySearch='';S.filter='';S.block='';S.pageNum=1;
  if(page==='lockers')S.activeTab='inventario';
  if(page==='people')S.activeTab='colaboradores';
  if(opts.filter)S.filter=opts.filter;
  if(opts.block)S.block=opts.block;
  if(push&&location.hash!==`#${page}`)history.pushState({page},'',`#${page}`);
  render();
  window.scrollTo({top:0,behavior:'auto'});
  playViewEnter();
  el('view').querySelector('h1')?.focus({preventScroll:true});
  announce(`Vista: ${PAGES[page].title}`);
}
function opt(value,label,selected){return `<option value="${esc(value)}" ${String(value)===String(selected)?'selected':''}>${esc(label)}</option>`}
function select(values,selected='',empty='Selecciona una opción'){return `<option value="" ${!selected?'selected':''} disabled>${esc(empty)}</option>`+values.map(x=>Array.isArray(x)?opt(x[0],x[1],selected):opt(x,x,selected)).join('')}
function item(label,name,kind='text',value='',extra='',full=false){const required=extra.includes('required');return `<div class="form-item ${full?'full':''}"><label for="f_${esc(name)}">${esc(label)} ${required?'<span class="required">*</span>':''}</label>${kind==='textarea'?`<textarea id="f_${esc(name)}" name="${esc(name)}" ${extra} placeholder="Observaciones, novedades o aclaraciones…">${esc(value)}</textarea>`:kind==='select'?`<select id="f_${esc(name)}" name="${esc(name)}" ${extra}>${value}</select>`:`<input id="f_${esc(name)}" name="${esc(name)}" type="${kind}" ${extra} value="${esc(value)}">`}</div>`}
const today=()=>item('Fecha','date','date',now(),'required');
const by=()=>item('Responsable del movimiento','by','text',S.user.name,'maxlength="120" required');
const notes=(required=false)=>item('Observaciones / motivo','notes','textarea','','maxlength="1500" '+(required?'required':''),true);
function modal(title,content,formAction='',submitText='Guardar cambios',danger=false){
  S.lastFocus=document.activeElement;
  const buttons=formAction?`<button type="button" class="btn" data-action="close">Cancelar</button><button type="submit" form="operationForm" class="btn ${danger?'btn-danger':'btn-primary'}">${esc(submitText)}</button>`:`<button type="button" class="btn btn-navy" data-action="close">Cerrar</button>`;
  el('modalRoot').innerHTML=`<div class="modal-backdrop" id="overlay"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle"><header class="modal-head"><h2 id="modalTitle">${esc(title)}</h2><button type="button" class="modal-close" data-action="close" aria-label="Cerrar">${icon('x')}</button></header>${formAction?`<form id="operationForm" data-resource="${formAction}"><div class="modal-body">${content}</div></form>`:`<div class="modal-body">${content}</div>`}<footer class="modal-foot">${buttons}</footer></section></div>`;
  const focus=el('modalRoot').querySelector('input:not([type=hidden]),select,textarea,button');focus?.focus();
  document.body.classList.add('modal-open');
  announce(title);
}
function close(){
  el('modalRoot').innerHTML='';
  document.body.classList.remove('modal-open');
  if(S.lastFocus&&document.contains(S.lastFocus))S.lastFocus.focus();
  else el('view').querySelector('h1')?.focus({preventScroll:true});
  S.lastFocus=null;
}
function openAssign(id=''){const opts=available();if(!opts.length){notify('No hay lockers disponibles confirmados.',true);return}const lockers=[['auto','Asignación automática (primero disponible)'],...opts.map(l=>[l.id,`Locker ${l.id} · Bloque ${l.block}`])];
  modal('Asignar un locker',`<div class="form-note">El sistema solo permite asignar casilleros confirmados como disponibles. Puedes seleccionar uno o usar asignación automática.</div><div class="form-grid">${item('Locker disponible','locker','select',select(lockers,id||'auto'),'required')}${today()}${item('Nombre y apellidos','name','text','','required maxlength="160"',true)}${item('Departamento','department','text','','required maxlength="120"')}${item('Jefe inmediato','supervisor','text','','maxlength="160"')}${item('Condición física','condition','select',select(['Bueno','Regular','Malo'],'Bueno'),'required')}${by()}${notes()}</div>`, 'assign','Confirmar asignación');
}
function openRelease(id=''){const a=allocated();if(!a.length){notify('No hay casilleros asignados para liberar.',true);return}const id0=id||a[0].id;const statuses=[['Disponible','Disponible · llave entregada'],['Sin llave','Sin llave'],['Dañado','Dañado'],['Bloqueado','Mantener bloqueado']];
  modal('Liberar locker',`<div class="form-note warn">Al confirmar se retira la asignación del colaborador. El casillero queda disponible solo si está en buen estado y tiene llave. No se controla ninguna cerradura física.</div><div class="form-grid">${item('Locker asignado','locker','select',select(a.map(l=>[l.id,`${l.id} · ${l.name}`]),id0),'required')}${today()}${item('Motivo de salida','reason','select',select(['Salida del hotel','Renuncia','Fin de contrato','Cambio de locker','Otro'],'Salida del hotel'),'required')}${item('Estado al devolver','outcome','select',select(statuses,'Disponible'),'required')}${by()}${notes()}</div>`, 'release','Liberar y registrar',true);
}
function openTransfer(id=''){const a=allocated(),free=available();if(!a.length||!free.length){notify('Necesitas al menos un locker asignado y otro disponible.',true);return}modal('Trasladar colaborador',`<div class="form-note">El cambio conserva los datos del colaborador y registra origen, destino y estado final del locker anterior.</div><div class="form-grid">${item('Locker de origen','source','select',select(a.map(l=>[l.id,`${l.id} · ${l.name}`]),id||a[0].id),'required')}${item('Locker de destino','target','select',select(free.map(l=>[l.id,l.id]),free[0].id),'required')}${item('Estado del locker anterior','oldOutcome','select',select(['Disponible','Sin llave','Dañado','Bloqueado'],'Disponible'),'required')}${today()}${by()}${notes()}</div>`, 'transfer','Confirmar traslado')}
function openStatus(id=''){const list=S.lockers.filter(l=>l.status!=='Asignado').sort(compare);if(!list.length){notify('No hay lockers sin asignación.',true);return}modal('Cambiar estado físico',`<div class="form-note warn">Un locker asignado no se puede poner en «Disponible» desde aquí. Primero debes liberarlo. Los datos contradictorios requieren validación.</div><div class="form-grid">${item('Locker','locker','select',select(list.map(l=>[l.id,`${l.id} · ${l.status}`]),id||list[0].id),'required')}${item('Nuevo estado','status','select',select(['Disponible','Sin llave','Dañado','Bloqueado','Ocupado','Revisión'],'Bloqueado'),'required')}${by()}${notes(true)}</div>`, 'status','Actualizar estado')}
function openEdit(id){const l=get(id);if(!l||l.status!=='Asignado')return;modal(`Editar asignación · ${l.id}`,`<div class="form-note">Cada corrección se guarda en la bitácora, con sus datos anteriores y nuevos.</div><input type="hidden" name="locker" value="${esc(l.id)}"><div class="form-grid">${item('Nombre y apellidos','name','text',l.name,'required maxlength="160"',true)}${item('Departamento','department','text',l.department,'required maxlength="120"')}${item('Jefe inmediato','supervisor','text',l.supervisor,'maxlength="160"')}${item('Fecha de entrega verificada','date','date',l.date||now(),'required')}${item('Condición física','condition','select',select(['Bueno','Regular','Malo'],l.condition||'Bueno'),'required')}${by()}${notes(true)}</div>`, 'edit','Guardar corrección')}
function openReconcile(id){const l=get(id);if(!l||l.status==='Asignado')return;const options=['Disponible','Asignado','Sin llave','Dañado','Bloqueado','Ocupado','Revisión'];modal(`Verificar · ${id}`,`<div class="form-note warn">Estado de origen: ${esc(l.originalStatus||'no disponible')} · Titular registrado: ${esc(l.name||'sin nombre')}. Antes de marcar disponible, verifica físicamente la llave y la entrega.</div><input type="hidden" name="locker" value="${esc(l.id)}"><div class="form-grid">${item('Estado confirmado','status','select',select(options,l.status),'required')}${by()}${notes(true)}</div>`, 'reconcile','Confirmar validación')}
function openDetail(id){
  const l=get(id);if(!l)return;
  const labels=[['Código',l.id],['Bloque',l.block],['Estado operativo',l.status],['Colaborador',l.name||'Sin asignar'],['Departamento',l.department||'—'],['Jefe inmediato',l.supervisor||'—'],['Condición',l.condition||'—'],['Fecha de entrega',l.date?fmtDate(l.date):(l.dateRaw||'—')],['Entregado por',l.deliveredBy||'—'],['Antiguo titular',l.previousOwner||'—'],['Estado original',l.originalStatus||'—'],['Observaciones',l.reason||'—']];
  const actions=[];
  if(l.status==='Disponible'&&!l.name)actions.push(button('assign','Asignar','btn btn-primary',id,'plus'));
  if(l.status==='Asignado'){actions.push(button('edit','Editar','btn',id,'pencil'),button('release','Liberar','btn btn-primary',id,'key-round'),button('transfer','Trasladar','btn',id,'arrow-right-left'))}
  else{actions.push(button('reconcile','Verificar','btn',id,'shield-check'),button('status','Estado físico','btn btn-primary',id,'wrench'))}
  modal(`Locker ${id}`,`<div class="detail-grid">${labels.map(([a,b])=>`<div class="detail"><div class="detail-label">${esc(a)}</div><div class="detail-value">${esc(b)}</div></div>`).join('')}</div><div class="form-note detail-note">La información original se mantiene en la base de datos. Las nuevas operaciones quedan registradas.</div><div class="detail-actions">${actions.join('')}</div>`);
}
function exportData(type){window.location.href=`api.php?resource=export&type=${encodeURIComponent(type)}`}
async function submit(form){
  if(!form.reportValidity())return;
  const resource=form.dataset.resource;
  const payload=Object.fromEntries(new FormData(form).entries());
  const submitButton=el('modalRoot').querySelector('button[type=submit]');
  if(submitButton){submitButton.disabled=true;submitButton.textContent='Guardando…'}
  form.setAttribute('aria-busy','true');
  try{const result=await request(resource,payload);await load(false);broadcast({type:'data'});close();render();notify(result.message)}
  catch(e){notify(e.message,true);if(submitButton){submitButton.disabled=false;submitButton.textContent='Volver a intentar'}}
  finally{form.removeAttribute('aria-busy')}
}
async function refreshDashboard(){
  const btn=document.querySelector('[data-action="refresh"]');
  if(btn){btn.disabled=true;btn.setAttribute('aria-busy','true')}
  try{await load(false);render();notify('Datos actualizados desde MySQL.')}
  catch(e){notify(e.message,true)}
  finally{const next=document.querySelector('[data-action="refresh"]');if(next){next.disabled=false;next.removeAttribute('aria-busy')}}
}
function handle(action,id=''){
  if(action==='close'){close();return}if(action==='assign'){openAssign(id);return}if(action==='release'){openRelease(id);return}if(action==='transfer'){openTransfer(id);return}if(action==='status'){openStatus(id);return}if(action==='edit'){openEdit(id);return}if(action==='reconcile'){openReconcile(id);return}if(action==='detail'){openDetail(id);return}if(action==='offboarding-search'){offboardingSearch();return}if(action==='offboarding-confirm'){offboardingConfirm();return}if(action==='offboarding-cancel'){offboardingCancel();return}
  if(action==='block'){go('lockers',true,{block:id});return}
  if(action==='filterStatus'){go('lockers',true,{filter:id});return}
  if(action==='viewAvailable'){go('lockers',true,{filter:'Disponible'});return}
  if(action==='activityRange'){const n=Number(id);if(RANGES.includes(n)&&n!==S.activityRange){S.activityRange=n;render();document.querySelector(`[data-action="activityRange"][data-id="${n}"]`)?.focus({preventScroll:true})}return}
  if(action==='refresh'){refreshDashboard();return}
  if(action==='gestionTab'){S.activeTab=id;S.page=id==='inventario'?'lockers':'people';if(location.hash!==`#${S.page}`)history.pushState({},'',`#${S.page}`);render();el('view').querySelector('h1')?.focus({preventScroll:true});announce(`Vista: ${id==='inventario'?'Inventario':'Colaboradores'}`);return}
  if(action==='viewLockers'){go('lockers');return}if(action==='viewHistory'){go('history');return}if(action==='viewIssues'){go('issues');return}
  if(action==='exportInventory'){exportData('inventory');return}if(action==='exportHistory'){exportData('history');return}if(action==='exportBackup'){exportData('backup');return}
  if(action==='prev'){S.pageNum=Math.max(1,S.pageNum-1);render();return}if(action==='next'){S.pageNum++;render();return}
  if(action==='clearSearch'){S.search='';S.historySearch='';S.pageNum=1;render();(el('searchInput')||el('historySearch'))?.focus();return}
  if(action==='install'&&S.installPrompt){const event=S.installPrompt;S.installPrompt=null;event.prompt();return}
  if(action==='logout'){document.querySelector('form[action="logout.php"]')?.submit();return}
}

// Funciones del módulo de salida de personal

function offboardingSearch(){
  const query = el('offboardingQuery')?.value.trim() || '';
  if(!query){ notify('Ingresa un nombre para buscar.',true); return; }
  const formData = new FormData(); formData.append('q', query);
  request('offboarding', formData).then(result => {
    if(!result.ok){ notify(result.message||'Error en la búsqueda.',true); return; }
    const results = result.results || [];
    const list = el('offboardingResults');
    if(!list)return;
    let html = '';
    results.forEach(r => {
      const name = r.display_name || r.username || '';
      html += `<div class="result-item" data-username="${r.username}">${esc(name)}</div>`;
    });
    list.innerHTML = html || '<div class="no-results">No se encontraron colaboradores.</div>';
    list.classList.remove('hidden');
    if(results.length>0){ list.querySelectorAll('.result-item')[0]?.classList.add('highlight'); }
    S.pageNum = 1;
  }).catch(e=>{ notify(e.message||'Error inesperado.',true); });
}

function offboardingConfirm(){
  const personName = el('offboardingPersonName2')?.textContent || '';
  const lockerCount = el('offboardingLockerCount2')?.textContent || '0';
  if(!personName){ notify('No hay colaborador seleccionado.',true); return; }
  if(!confirm(`¿Seguro deseas liberar los lockers de ${personName}? Se liberarán ${lockerCount} lockers y la acción no se puede deshacer.`)){ return; }
  const lockerIdsInput = el('offboardingLockerIds');
  const lockerIds = lockerIdsInput ? lockerIdsInput.value : '';
  if(!lockerIds){ notify('No hay lockers seleccionados para liberar.',true); return; }
  const formData = new FormData(); formData.append('action','process'); formData.append('lockerIds', lockerIds);
  formData.append('reason', el('offboardingReason')?.value || ''); formData.append('notes', el('offboardingNotes')?.value || '');
  formData.append('outcome', 'Disponible'); formData.append('date', nowYYYYMMDD());
  request('offboarding', formData).then(result => {
    if(result.ok){
      notify(result.message||'Operación completada.',false);
      go('dashboard'); render();
    }else{ notify(result.message||'Error en la confirmación.',true); }
  }).catch(e=>{ notify(e.message||'Error inesperado.',true); });
}

function offboardingCancel(){
  close(); render(); notify('Operación cancelada.');
}

/** Cambiar contraseña desde el perfil.
 *  - Verifica la contraseña actual.
 *  - Confirma la nueva contraseña.
 *  - Haz hash con password_hash.
 *  - Revoca sesiones anteriores.
 */
function changePassword(){
  const current = el('password_current')?.value || '';
  const newPass = el('password_new')?.value || '';
  const confirm = el('password_confirm')?.value || '';
  if(!current || !newPass || !confirm) { notify('Completa todos los campos.',true); return; }
  if(newPass !== confirm) { notify('Las contraseñas nuevas no coinciden.',true); return; }
  // Enviar a API: acción change-password con current/新password
  fetch('api.php?resource=profile&action=change-password', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
    body: JSON.stringify({ current_password: current, new_password: newPass, confirm_password: confirm })
  })
  .then(r => r.ok ? r.json() : { ok: false, message: 'Error de red' })
  .then(data => {
    if(data.ok){
      notify(data.message||'Contraseña actualizada.',false);
      // Recargar página para reflejar el nuevo estado
      setTimeout(()=>{ window.location.reload(); }, 1500);
    }else{
      notify(data.message||'Error al cambiar contraseña.',true);
    }
  })
  .catch(e => { notify(e.message||'Error inesperado.',true); });
}

/** Cerrar sesión forzada (revoca todas las sesiones del usuario). */
function forceLogout(){
  if(!confirm('¿Seguro deseas cerrar sesión y revocar todas las sesiones activas?')){ return; }
  fetch('api.php?resource=users&action=force-logout', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
    body: JSON.stringify({})
  })
  .then(r => r.ok ? r.json() : { ok: false, message: 'Error de red' })
  .then(data => {
    if(data.ok){
      notify(data.message||'Sesiones revocadas.',false);
      window.location.href = 'login.php';
    }else{
      notify(data.message||'Error al cerrar sesión.',true);
    }
  })
  .catch(e => { notify(e.message||'Error inesperado.',true); });
}
document.addEventListener('click',e=>{const nav=e.target.closest('[data-page]');if(nav){go(nav.dataset.page);return}const b=e.target.closest('[data-action]');if(b){handle(b.dataset.action,b.dataset.id||'');return}if(e.target.id==='overlay')close()});
document.addEventListener('input',e=>{
  const t=e.target;
  if(t.id!=='searchInput'&&t.id!=='historySearch')return;
  const key=t.id==='historySearch'?'historySearch':'search';
  const caret=t.selectionStart;
  S[key]=t.value;S.pageNum=1;
  clearTimeout(S.searchTimer);
  S.searchTimer=setTimeout(()=>{
    render();
    const next=el(t.id);
    if(next){next.focus();if(caret!==null)next.setSelectionRange(caret,caret)}
  },110);
});
document.addEventListener('change',e=>{if(e.target.id==='blockFilter'){S.block=e.target.value;S.pageNum=1;render()}if(e.target.id==='statusFilter'){S.filter=e.target.value;S.pageNum=1;render()}});
document.addEventListener('submit',e=>{if(e.target.id==='operationForm'){e.preventDefault();submit(e.target)}});
/* Tooltip de los gráficos: solo presentación; los datos están en el aria-label. */
document.addEventListener('pointermove',e=>{
  const hit=e.target.closest?.('[data-chart-day]');
  if(!hit)return;
  const stage=hit.closest('.chart-stage');
  const tip=stage?.querySelector('.chart-tip');
  if(!tip)return;
  const r=stage.getBoundingClientRect();
  const n=Number(hit.dataset.value||0);
  tip.innerHTML=`<b>${esc(hit.dataset.label)}</b> · ${n} ${n===1?'movimiento':'movimientos'}`;
  tip.style.setProperty('--tip-x',`${(e.clientX-r.left).toFixed(1)}px`);
  tip.style.setProperty('--tip-y',`${(e.clientY-r.top).toFixed(1)}px`);
  tip.classList.add('is-on');
});
document.addEventListener('pointerout',e=>{
  const hit=e.target.closest?.('[data-chart-day]');
  if(!hit)return;
  if(hit.contains(e.relatedTarget))return;
  hit.closest('.chart-stage')?.querySelector('.chart-tip')?.classList.remove('is-on');
});
window.addEventListener('scroll',()=>{document.querySelectorAll('.chart-tip.is-on').forEach(t=>t.classList.remove('is-on'))},{passive:true});
document.addEventListener('keydown',e=>{
  const root=el('modalRoot');
  const open=!!root.innerHTML;
  if(e.key==='Escape'&&open){close();return}
  if(e.key!=='Tab'||!open)return;
  const focusable=[...root.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(n=>n.offsetParent!==null);
  if(!focusable.length)return;
  const first=focusable[0],last=focusable[focusable.length-1];
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
  else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
});
function syncFromUrl(){
  const key=(location.hash||'').slice(1);
  if(!key){if(S.page!=='dashboard')go('dashboard',false);return}
  if(!PAGES[key]||key===S.page)return; // anclas internas como #view no cambian de vista
  go(key,false);
}
window.addEventListener('popstate',syncFromUrl);
window.addEventListener('hashchange',syncFromUrl);
window.addEventListener('offline',()=>{connection(true);S.serverStatus='no-server';updateServerStatusIndicator();});
window.addEventListener('online',()=>{connection(false);checkServerStatus();});
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();S.installPrompt=e});
if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}))}

function updateServerStatusIndicator(emit=true){
  const dot = el('serverStatusDot');
  const text = el('serverStatusText');
  if (!dot || !text) return;
  dot.className = 'status-dot ' + (S.serverStatus === 'connected' ? 'online' : S.serverStatus === 'no-mysql' ? 'warning' : 'offline');
  text.textContent = S.serverStatus === 'connected' ? 'Conectado al servidor'
    : S.serverStatus === 'no-mysql' ? 'PHP disponible, MySQL no responde'
    : 'Sin acceso al servidor';
  if(emit)broadcast({type:'serverStatus',status:S.serverStatus});
}

async function statusFetch(resource){
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),STATUS_TIMEOUT);
  try{
    return await fetch(`api.php?resource=${encodeURIComponent(resource)}`,{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json','X-CSRF-Token':csrf},signal:controller.signal});
  }catch(_){return null}finally{clearTimeout(timeout)}
}

async function checkServerStatus(){
  const ping=await statusFetch('ping');
  if(!ping||!ping.ok){S.serverStatus='no-server';updateServerStatusIndicator();return}
  const boot=await statusFetch('bootstrap');
  if(!boot){S.serverStatus='no-server';updateServerStatusIndicator();return}
  if(!boot.ok){S.serverStatus='no-mysql';updateServerStatusIndicator();return}
  S.serverStatus='connected';
  updateServerStatusIndicator();
}

let statusTimer=null;
function startStatusPolling(){if(statusTimer)return;statusTimer=setInterval(()=>{if(!document.hidden)checkServerStatus()},30000)}
function stopStatusPolling(){if(statusTimer){clearInterval(statusTimer);statusTimer=null}}
document.addEventListener('visibilitychange',()=>{if(document.hidden){stopStatusPolling();return}startStatusPolling();checkServerStatus()});

if(channel){
  channel.addEventListener('message',e=>{
    const msg=e.data||{};
    if(msg.type==='user'){applyUser({name:msg.name},false);return}
    if(msg.type==='serverStatus'){S.serverStatus=msg.status;updateServerStatusIndicator(false);return}
    if(msg.type==='data'){load(false).then(()=>render()).catch(()=>{})}
  });
}
startStatusPolling();
checkServerStatus();

load().catch(e=>{el('view').setAttribute('aria-busy','false');el('view').innerHTML=`<div class="error-splash"><h2>No se pudieron cargar los lockers</h2><p>${esc(e.message)}</p><button class="btn btn-primary" id="retry">${icon('refresh-cw')} Reintentar conexión</button><p><small>Comprueba Apache/PHP y MySQL. No se han modificado registros.</small></p></div>`;el('retry')?.addEventListener('click',()=>window.location.reload())});
})();
