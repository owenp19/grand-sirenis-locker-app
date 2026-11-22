/* Grand Sirenis Locker App · UI offline-ready, datos siempre desde PHP/MySQL, sin dependencias de CDN. */
(() => {
'use strict';
const STATUSES=['Disponible','Asignado','Sin llave','Dañado','Bloqueado','Ocupado','Revisión'];
const PAGES={
  dashboard:{title:'Panel de control'},
  lockers:{title:'Inventario de lockers'},
  people:{title:'Colaboradores'},
  history:{title:'Bitácora de movimientos'},
  issues:{title:'Incidencias'}
};
const el=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=v=>String(v??'').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
const now=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const fmtDate=v=>{if(!v)return '—';const d=new Date(String(v).slice(0,10)+'T12:00:00');return Number.isNaN(+d)?esc(v):new Intl.DateTimeFormat('es-CO',{dateStyle:'medium'}).format(d)};
const fmtTime=v=>{if(!v)return '—';const d=new Date(String(v));return Number.isNaN(+d)?esc(v):new Intl.DateTimeFormat('es-CO',{dateStyle:'medium',timeStyle:'short'}).format(d)};
const nfmt=v=>new Intl.NumberFormat('es-CO').format(v);
const compare=(a,b)=>{const aa=a.id.split('-').map(Number),bb=b.id.split('-').map(Number);return aa[0]-bb[0]||aa[1]-bb[1]};
const csrf=document.querySelector('meta[name="csrf-token"]')?.content||'';
const initialPage=(location.hash||'').slice(1);
const S={lockers:[],movements:[],user:{name:'Responsable',role:'operador',isAdmin:false},page:PAGES[initialPage]?initialPage:'dashboard',filter:'',block:'',search:'',pageNum:1,historySearch:'',loaded:false,installPrompt:null,searchTimer:null,lastFocus:null};
let timer;
function notify(msg,error=false){const x=el('toast');x.textContent=msg;x.classList.toggle('error',error);x.classList.add('show');clearTimeout(timer);timer=setTimeout(()=>x.classList.remove('show'),4100)}
function connection(state){el('connectionBar').hidden=!state}
function announce(text){const region=el('viewStatus');if(!region)return;region.textContent='';setTimeout(()=>{region.textContent=text},40)}
async function request(resource,body){const opts={credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}};
  if(body){opts.method='POST';opts.headers['Content-Type']='application/json';opts.headers['X-CSRF-Token']=csrf;opts.body=JSON.stringify(body)}
  let res;
  try{res=await fetch(`api.php?resource=${encodeURIComponent(resource)}`,opts)}catch(_){connection(true);throw Error('No hay conexión con PHP/MySQL. Comprueba que el servidor esté encendido.')}
  if(res.status===401){window.location.href='login.php';throw Error('Sesión finalizada. Vuelve a iniciar sesión.')}
  let d;try{d=await res.json()}catch(_){connection(true);throw Error('El servidor local no devolvió una respuesta válida.')}
  if(!res.ok || !d.ok)throw Error(d.message||'No se pudo realizar la operación.');
  connection(false);return d;
}
async function load(refresh=true){const d=await request('bootstrap');S.lockers=d.lockers;S.movements=d.movements;S.user=d.user;S.loaded=true;if(refresh)render()}
function count(){const c=Object.fromEntries(STATUSES.map(x=>[x,0]));S.lockers.forEach(l=>c[l.status]=(c[l.status]||0)+1);return {total:S.lockers.length,...c}}
function get(id){return S.lockers.find(l=>l.id===id)}
function available(){return S.lockers.filter(l=>l.status==='Disponible'&&!String(l.name).trim()).sort(compare)}
function allocated(){return S.lockers.filter(l=>l.status==='Asignado').sort(compare)}
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
function statCard(label,num,iconName,description,tone,pct=null){const progress=pct===null?'':`<progress class="stat-progress" max="100" value="${Math.max(0,Math.min(100,Math.round(pct)))}" aria-label="${esc(label)}: ${Math.round(pct)}%"></progress>`;return `<article class="stat tone-${tone}"><div class="stat-top"><span>${esc(label)}</span><span class="stat-icon tone-${tone}">${icon(iconName)}</span></div><div class="stat-num">${nfmt(num)}</div>${progress}<div class="stat-desc">${esc(description)}</div></article>`}
function donutChart(){
  const c=count();
  const groups=[
    {label:'Asignados',val:c.Asignado,cls:'is-assigned'},
    {label:'Disponibles',val:c.Disponible,cls:'is-available'},
    {label:'Sin llave',val:c['Sin llave'],cls:'is-nokey'},
    {label:'Otros estados',val:c.Dañado+c.Bloqueado+c.Ocupado+c.Revisión,cls:'is-other'}
  ];
  const r=69,C=2*Math.PI*r,total=c.total||1;
  let offset=0;
  const segments=groups.map(g=>{if(!g.val)return '';const span=g.val/total*C;const seg=`<circle class="donut-seg ${g.cls}" cx="100" cy="100" r="${r}" fill="none" stroke-dasharray="${span.toFixed(3)} ${(C-span).toFixed(3)}" stroke-dashoffset="${(-offset).toFixed(3)}" transform="rotate(-90 100 100)"><title>${esc(g.label)}: ${g.val}</title></circle>`;offset+=span;return seg}).join('');
  const label=groups.map(g=>`${g.label}: ${g.val}`).join(', ');
  return `<div class="donut-layout"><svg class="donut" viewBox="0 0 200 200" role="img" aria-label="Distribución de lockers. ${label}"><circle cx="100" cy="100" r="69" fill="none" stroke="#efe9dc" stroke-width="18"/>${segments}<text x="100" y="99" text-anchor="middle" class="donut-center-strong">${c.total}</text><text x="100" y="120" text-anchor="middle" class="donut-center-caption">LOCKERS</text></svg><div class="legend">${groups.map((g,index)=>`<div class="legend-item"><span class="legend-dot legend-${index}" aria-hidden="true"></span>${esc(g.label)}<span class="legend-value">${g.val}<small>${c.total?Math.round(g.val/c.total*100):0}%</small></span></div>`).join('')}<div class="notice success">${c.total?Math.round(c.Asignado/c.total*100):0}% del inventario asignado.</div></div></div>`;
}
function blockChart(){
  const blocks=[...new Set(S.lockers.map(l=>Number(l.block)))].sort((a,b)=>a-b);
  return `<div class="block-list" role="list" aria-label="Ocupación por bloque">${blocks.map(b=>{
    const ls=S.lockers.filter(l=>Number(l.block)===b);
    const assigned=ls.filter(l=>l.status==='Asignado').length;
    const avail=ls.filter(l=>l.status==='Disponible').length;
    const other=ls.length-assigned-avail;
    const pct=v=>v/ls.length*100;
    const a=pct(assigned),v=pct(avail),o=pct(other);
    const bar=`<svg class="block-bar" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true" focusable="false"><rect class="bar-assigned" x="0" y="0" width="${a.toFixed(2)}" height="10"></rect><rect class="bar-available" x="${a.toFixed(2)}" y="0" width="${v.toFixed(2)}" height="10"></rect><rect class="bar-other" x="${(a+v).toFixed(2)}" y="0" width="${o.toFixed(2)}" height="10"></rect></svg>`;
    return `<button type="button" class="block-btn" data-action="block" data-id="${b}" role="listitem" aria-label="Bloque ${b}, ${assigned} asignados, ${avail} disponibles, ${other} restantes"><div class="block-row"><span class="block-label">Bloque ${b}</span><span class="bar-track" aria-hidden="true">${bar}</span><span class="block-metrics">${assigned}/${ls.length}</span></div></button>`;
  }).join('')}</div><p class="subtext block-caption">Azul: asignados · Verde: disponibles · Ocre: requieren atención. Toca un bloque para filtrar.</p>`;
}
function recentEvents(){if(!S.movements.length)return `<div class="empty"><span class="empty-icon">${icon('history')}</span>Los movimientos nuevos aparecerán aquí.<br>El Excel no permite reconstruir una bitácora histórica completa.</div>`;return `<div class="recent-list">${S.movements.slice(0,4).map(e=>`<div class="recent-item"><div class="recent-icon" aria-hidden="true">${icon('history')}</div><div><b>${esc(e.type)} · ${esc(e.locker)}</b><p>${esc(e.person||e.description||'Movimiento registrado')}</p><time>${fmtTime(e.at)} · ${esc(e.by)}</time></div></div>`).join('')}</div>`}
function dashboard(){
  const c=count();
  const attention=c['Sin llave']+c.Dañado+c.Bloqueado+c.Ocupado+c.Revisión;
  const blocks=[...new Set(S.lockers.map(l=>Number(l.block)))].length;
  const pct=v=>c.total?v/c.total*100:0;
  return `${pageHeader('Panel de control','CENTRO OPERATIVO','Estado del inventario, ocupación por bloque y actividad reciente.',S.user.isAdmin?button('exportBackup','Respaldo JSON','btn','','download'):'')}
  <div class="dash-meta"><span><strong>${nfmt(c.total)}</strong> lockers</span><span><strong>${blocks}</strong> bloques</span><span class="dash-meta-live"><span class="status-dot" aria-hidden="true"></span>Datos desde MySQL</span></div>
  <section class="stats" aria-label="Indicadores del inventario">${statCard('Total de lockers',c.total,'boxes','Inventario completo','blue')}${statCard('Asignados',c.Asignado,'users',`${Math.round(pct(c.Asignado))}% del total`,'blue',pct(c.Asignado))}${statCard('Disponibles',c.Disponible,'check','Listos para asignar','teal',pct(c.Disponible))}${statCard('Requieren atención',attention,'triangle-alert','No asignables por ahora','amber',pct(attention))}</section>
  <div class="dashboard-grid"><section class="panel"><div class="panel-head"><div><h2>Distribución de lockers</h2><p>Estado general actualizado desde MySQL</p></div>${button('viewLockers','Ver inventario','btn btn-sm','','boxes')}</div><div class="panel-body">${donutChart()}</div></section><section class="panel"><div class="panel-head"><div><h2>Ocupación por bloques</h2><p>${blocks} bloques · según inventario</p></div><span class="pill">${c.total} unidades</span></div><div class="panel-body">${blockChart()}</div></section></div>
  <div class="activity-split"><section class="panel"><div class="panel-head"><div><h2>Acciones rápidas</h2><p>Gestión cotidiana en pocos pasos</p></div></div><div class="panel-body"><div class="quick-grid"><button class="quick-card" data-action="assign"><span class="quick-icon" aria-hidden="true">${icon('plus')}</span><span><b>Asignar locker</b><small>Nuevo colaborador</small></span></button><button class="quick-card" data-action="release"><span class="quick-icon" aria-hidden="true">${icon('key-round')}</span><span><b>Liberar locker</b><small>Salida o renuncia</small></span></button><button class="quick-card" data-action="transfer"><span class="quick-icon" aria-hidden="true">${icon('arrow-right-left')}</span><span><b>Trasladar persona</b><small>Cambio de casillero</small></span></button><button class="quick-card" data-action="status"><span class="quick-icon" aria-hidden="true">${icon('wrench')}</span><span><b>Estado físico</b><small>Daños, llaves o bloqueo</small></span></button></div>${issues().length?`<div class="notice">${icon('triangle-alert')} <strong>${issues().length} incidencias de datos</strong> detectadas. ${button('viewIssues','Revisar','btn btn-sm','','arrow-right')}</div>`:`<div class="notice success">${icon('check')} Datos sin incidencias detectadas.</div>`}</div></section><section class="panel"><div class="panel-head"><div><h2>Movimientos recientes</h2><p>Acciones con registro de responsable</p></div>${button('viewHistory','Ver todos','btn btn-sm','','history')}</div><div class="panel-body">${recentEvents()}</div></section></div>`;
}
function filterControls(type='lockers'){
  const blocks=[...new Set(S.lockers.map(x=>Number(x.block)))].sort((a,b)=>a-b);
  const search=type==='history'?S.historySearch:S.search;
  const placeholder=type==='history'?'Buscar locker, fecha, movimiento…':type==='people'?'Buscar colaborador, departamento…':'Buscar locker, colaborador, departamento…';
  const clear=`<button type="button" class="search-clear" data-action="clearSearch" aria-label="Limpiar búsqueda"${String(search).trim()?'':' hidden'}>${icon('x')}</button>`;
  return `<div class="table-tools"><div class="search-wrap"><span aria-hidden="true">${icon('search')}</span><input type="search" id="${type==='history'?'historySearch':'searchInput'}" value="${esc(search)}" autocomplete="off" placeholder="${placeholder}" aria-label="Buscar">${clear}</div>${type==='lockers'?`<select class="filter-select" id="blockFilter" aria-label="Filtrar bloque"><option value="">Todos los bloques</option>${blocks.map(b=>`<option value="${b}" ${String(S.block)===String(b)?'selected':''}>Bloque ${b}</option>`).join('')}</select><select class="filter-select" id="statusFilter" aria-label="Filtrar estado"><option value="">Todos los estados</option>${STATUSES.map(s=>`<option ${S.filter===s?'selected':''} value="${esc(s)}">${esc(s)}</option>`).join('')}</select>`:''}</div>`;
}
function pager(total,per){const count=Math.max(1,Math.ceil(total/per));S.pageNum=Math.min(S.pageNum,count);return `<div class="pagination"><span>${nfmt(total)} resultados · Página ${S.pageNum} de ${count}</span><div class="actions"><button class="btn btn-sm" data-action="prev" ${S.pageNum===1?'disabled':''}>${icon('chevron-left')} Anterior</button><button class="btn btn-sm" data-action="next" ${S.pageNum===count?'disabled':''}>Siguiente ${icon('chevron-right')}</button></div></div>`}
function tableLockers(){
  const list=S.lockers.filter(l=>(!S.filter||l.status===S.filter)&&(!S.block||String(l.block)===String(S.block))&&(!S.search||norm([l.id,l.name,l.department,l.supervisor].join(' ')).includes(norm(S.search)))).sort(compare);
  const per=16;S.pageNum=Math.min(S.pageNum,Math.max(1,Math.ceil(list.length/per)));
  const show=list.slice((S.pageNum-1)*per,S.pageNum*per);
  return `${pageHeader('Inventario de lockers','CONTROL DE CASILLEROS','Consulta disponibilidad y administra los 13 bloques.',button('exportInventory','Descargar CSV','btn','','download')+button('assign','Asignar locker','btn btn-primary','','plus'))}${filterControls()}<section class="table-wrap"><div class="table-scroll"><table><caption class="sr-only">Inventario de lockers</caption><thead><tr><th scope="col">Locker</th><th scope="col">Estado</th><th scope="col">Colaborador</th><th scope="col">Departamento</th><th scope="col">Fecha de entrega</th><th scope="col">Acción</th></tr></thead><tbody>${show.length?show.map(l=>`<tr><td data-label="Locker"><strong>${esc(l.id)}</strong></td><td data-label="Estado">${badge(l.status)}</td><td data-label="Colaborador">${l.name?esc(l.name):'<span class="muted">Sin asignar</span>'}</td><td data-label="Departamento">${esc(l.department||'—')}</td><td data-label="Fecha de entrega">${fmtDate(l.date||'')}</td><td data-label="Acción">${button('detail','Gestionar','table-btn',l.id,'arrow-right')}</td></tr>`).join(''):`<tr><td colspan="6"><div class="empty"><span class="empty-icon">${icon('box')}</span>No hay lockers con estos filtros.</div></td></tr>`}</tbody></table></div>${pager(list.length,per)}</section>`;
}
function tablePeople(){
  const list=allocated().filter(l=>!S.search||norm([l.id,l.name,l.department,l.supervisor].join(' ')).includes(norm(S.search)));
  const per=16;S.pageNum=Math.min(S.pageNum,Math.max(1,Math.ceil(list.length/per)));
  const show=list.slice((S.pageNum-1)*per,S.pageNum*per);
  return `${pageHeader('Colaboradores','PERSONAL ASIGNADO','Consulta rápidamente el locker de cada colaborador.',button('assign','Nueva asignación','btn btn-primary','','plus'))}${filterControls('people')}<section class="table-wrap"><div class="table-scroll"><table><caption class="sr-only">Colaboradores con locker asignado</caption><thead><tr><th scope="col">Colaborador</th><th scope="col">Departamento</th><th scope="col">Jefe inmediato</th><th scope="col">Locker</th><th scope="col">Acción</th></tr></thead><tbody>${show.length?show.map(l=>`<tr><td data-label="Colaborador"><strong>${esc(l.name||'Pendiente')}</strong></td><td data-label="Departamento">${esc(l.department||'—')}</td><td data-label="Jefe inmediato">${esc(l.supervisor||'—')}</td><td data-label="Locker"><strong>${esc(l.id)}</strong></td><td data-label="Acción">${button('detail','Gestionar','table-btn',l.id,'arrow-right')}</td></tr>`).join(''):`<tr><td colspan="5"><div class="empty"><span class="empty-icon">${icon('users')}</span>No se encontraron colaboradores.</div></td></tr>`}</tbody></table></div>${pager(list.length,per)}</section>`;
}
function movementsPage(){
  const filtered=S.movements.filter(e=>!S.historySearch||norm([e.type,e.locker,e.person,e.description,e.by,e.at].join(' ')).includes(norm(S.historySearch)));
  const per=45;S.pageNum=Math.min(S.pageNum,Math.max(1,Math.ceil(filtered.length/per)));
  const show=filtered.slice((S.pageNum-1)*per,S.pageNum*per);
  return `${pageHeader('Bitácora de movimientos','TRAZABILIDAD','Cada movimiento nuevo queda almacenado en MySQL.',button('exportHistory','Exportar historial','btn','','download'))}${filterControls('history')}<section class="table-wrap">${show.length?`<div class="history-list">${show.map(e=>`<article class="history-item"><h3>${esc(e.type)} · ${esc(e.locker)}</h3><p>${esc(e.description)}</p><small>${fmtTime(e.at)} · Responsable de sesión: ${esc(e.by)}</small></article>`).join('')}</div>`:`<div class="empty"><span class="empty-icon">${icon('history')}</span>No hay movimientos que coincidan con esta búsqueda.<br>Los registros históricos previos al sistema no se inventan.</div>`}${pager(filtered.length,per)}</section><p class="subtext history-note">Vista de hasta 500 movimientos recientes. La exportación CSV incluye hasta 50 000 registros, del más reciente al más antiguo.</p>`;
}
function issuesPage(){
  const list=issues();
  return `${pageHeader('Incidencias','CALIDAD DE DATOS','Revisa casos dudosos antes de permitir una nueva asignación.',button('viewLockers','Ver inventario','btn','','boxes'))}<section class="table-wrap"><div class="panel-head"><div><h2>${list.length} observaciones activas</h2><p>Inconsistencias heredadas del documento o detectadas en los registros</p></div></div>${list.length?list.map(i=>`<div class="issue-item"><div class="issue-icon" aria-hidden="true">${icon('triangle-alert')}</div><div><b>${esc(i.kind)} · Locker ${esc(i.id)}</b><p>${esc(i.text)}</p></div>${button('detail','Revisar','btn btn-sm',i.id,'arrow-right')}</div>`).join(''):'<div class="empty"><span class="empty-icon">' + icon('check') + '</span>No hay incidencias detectadas.</div>'}</section>`;
}
function render(){
  if(!S.loaded)return;
  document.querySelectorAll('[data-page]').forEach(n=>{
    const active=n.dataset.page===S.page;
    n.classList.toggle('active',active);
    if(active)n.setAttribute('aria-current','page');else n.removeAttribute('aria-current');
  });
  el('issueBadge').textContent=issues().length||'';
  el('view').innerHTML=S.page==='dashboard'?dashboard():S.page==='lockers'?tableLockers():S.page==='people'?tablePeople():S.page==='history'?movementsPage():issuesPage();
  el('view').setAttribute('aria-busy','false');
  const meta=PAGES[S.page]||PAGES.dashboard;
  const title=el('topbarTitle');if(title)title.textContent=meta.title;
  document.title=`${meta.title} · Grand Sirenis Locker App`;
}
function go(page,push=true){
  if(!PAGES[page])return;
  S.page=page;S.search='';S.historySearch='';S.filter='';S.block='';S.pageNum=1;
  if(push&&location.hash!==`#${page}`)history.pushState({page},'',`#${page}`);
  render();
  window.scrollTo({top:0,behavior:'auto'});
  const view=el('view');
  view.classList.remove('view-enter');void view.offsetWidth;view.classList.add('view-enter');
  setTimeout(()=>view.classList.remove('view-enter'),620);
  view.querySelector('h1')?.focus({preventScroll:true});
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
  try{const result=await request(resource,payload);await load(false);close();render();notify(result.message)}
  catch(e){notify(e.message,true);if(submitButton){submitButton.disabled=false;submitButton.textContent='Volver a intentar'}}
  finally{form.removeAttribute('aria-busy')}
}
function handle(action,id=''){
  if(action==='close'){close();return}if(action==='assign'){openAssign(id);return}if(action==='release'){openRelease(id);return}if(action==='transfer'){openTransfer(id);return}if(action==='status'){openStatus(id);return}if(action==='edit'){openEdit(id);return}if(action==='reconcile'){openReconcile(id);return}if(action==='detail'){openDetail(id);return}
  if(action==='block'){go('lockers');S.block=id;render();el('view').querySelector('h1')?.focus({preventScroll:true});return}
  if(action==='viewLockers'){go('lockers');return}if(action==='viewHistory'){go('history');return}if(action==='viewIssues'){go('issues');return}
  if(action==='exportInventory'){exportData('inventory');return}if(action==='exportHistory'){exportData('history');return}if(action==='exportBackup'){exportData('backup');return}
  if(action==='prev'){S.pageNum=Math.max(1,S.pageNum-1);render();return}if(action==='next'){S.pageNum++;render();return}
  if(action==='clearSearch'){S.search='';S.historySearch='';S.pageNum=1;render();(el('searchInput')||el('historySearch'))?.focus();return}
  if(action==='install'&&S.installPrompt){const event=S.installPrompt;S.installPrompt=null;event.prompt();return}
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
window.addEventListener('offline',()=>connection(true));window.addEventListener('online',()=>connection(false));
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();S.installPrompt=e});
if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}))}
load().catch(e=>{el('view').setAttribute('aria-busy','false');el('view').innerHTML=`<div class="error-splash"><h2>No se pudieron cargar los lockers</h2><p>${esc(e.message)}</p><button class="btn btn-primary" id="retry">${icon('refresh-cw')} Reintentar conexión</button><p><small>Comprueba Apache/PHP y MySQL. No se han modificado registros.</small></p></div>`;el('retry')?.addEventListener('click',()=>window.location.reload())});
})();
