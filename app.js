'use strict';
/* Horarios May — PWA. Ve el horario por curso y por profe; carga un Excel para actualizarlo. */

// ---------- datos ----------
const DEFAULT = window.HORARIO_DEFAULT;
function loadData(){
  try{ const s = localStorage.getItem('horario_data'); if(s) return JSON.parse(s); }catch(e){}
  return DEFAULT;
}
let D = loadData();
const usingCustom = () => !!localStorage.getItem('horario_data');

// ---------- identidad del profe (ajustes) ----------
const DEF_SETTINGS = { nombre:'May', especialidad:'Especialista de Matemáticas · 3.º y 4.º', profe:'May', vacaciones:'', refA:'2025-09-08', tema:'claro' };
let SET = (()=>{ try{ return Object.assign({}, DEF_SETTINGS, JSON.parse(localStorage.getItem('settings')||'{}')); }catch(e){ return Object.assign({}, DEF_SETTINGS); } })();
const saveSet = () => { try{ localStorage.setItem('settings', JSON.stringify(SET)); }catch(e){} };
function applyTheme(){ try{ document.documentElement.setAttribute('data-theme', SET.tema==='oscuro'?'dark':''); }catch(e){} }
applyTheme();
function meProfe(){ return (SET.profe && D.prof[SET.profe]) ? SET.profe : ((D.profesores && D.profesores[0]) || null); }

const AREA = {
  LENGUA:{name:'Lengua',short:'Lengua',bg:'#f4e3c4',ink:'#79541a'},
  MATE:{name:'Matemáticas',short:'Mate',bg:'#d2e0f1',ink:'#294f7e'},
  INGLES:{name:'Inglés',short:'Inglés',bg:'#f5d9cf',ink:'#8c3e27'},
  CCNN:{name:'Ciencias de la Naturaleza',short:'CC.NN',bg:'#cde6e0',ink:'#1e5f54'},
  CCSS:{name:'Ciencias Sociales',short:'CC.SS',bg:'#e1d5eb',ink:'#573874'},
  EF:{name:'Educación Física',short:'E.F.',bg:'#d7e7cd',ink:'#3f6930'},
  ARTS:{name:'Ed. Plástica y Visual',short:'Plást.',bg:'#f0d8e8',ink:'#883a70'},
  MUSICA:{name:'Música',short:'Música',bg:'#e7e7c4',ink:'#67671f'},
  VC:{name:'Valores Cívicos y Éticos',short:'Valores',bg:'#e4daef',ink:'#5d4883'},
  MAE:{name:'Religión / Atención Educativa',short:'Relig.',bg:'#e7e2d8',ink:'#5c5344'},
  DEXEN:{name:'Descubrimiento y Exploración del Entorno',short:'Entorno',bg:'#dce7db',ink:'#456049'},
  COMRE:{name:'Comunicación y Representación',short:'Comun.',bg:'#f3d8dd',ink:'#893a49'},
  CREAR:{name:'Crecimiento en Armonía',short:'Crecim.',bg:'#ebe2cf',ink:'#6c5934'},
  CRRLEX:{name:'Inglés · Comunicación (Infantil)',short:'Inglés',bg:'#f6e2d2',ink:'#894e23'},
};
const DIA_L = {L:'Lunes',M:'Martes',X:'Miércoles',J:'Jueves',V:'Viernes'};
const ar = code => AREA[code] || {name:code, short:code, bg:'#e9e7df', ink:'#4a4a4a'};

const CLIP_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05 12.25 20.24a5.5 5.5 0 0 1-7.78-7.78l8.49-8.49a3.5 3.5 0 0 1 4.95 4.95l-8.49 8.49a1.5 1.5 0 0 1-2.12-2.12l7.78-7.78"/></svg>';

// ---------- estado ----------
const st = {tab:'inicio', mode:'aula', sel:'INF3', wk:'A'};
st.wk = weekLetter(new Date());   // abre el horario en la semana (A/B) que toca
st.weekMon = mondayOf(new Date());   // lunes de la semana que se está viendo (navegable)

// ---------- utilidades ----------
const $  = (s,r=document) => r.querySelector(s);
const el = (t,c,h) => { const e=document.createElement(t); if(c)e.className=c; if(h!=null)e.innerHTML=h; return e; };
const list = () => st.mode==='aula' ? D.aulas : D.profesores;
function sesDur(){ const o={}; D.sesiones.forEach(s=>{ if(s.recreo)return; const p=t=>{const[a,b]=t.split(':').map(Number);return a*60+b}; o[s.id]=p(s.fin)-p(s.ini); }); return o; }
const todayIdx = () => { const g=new Date().getDay(); return (g>=1&&g<=5) ? g-1 : -1; };
// fecha / semana A–B (alusión temporal)
function parseISO(s){ const [Y,M,Dp]=String(s||'').split('-').map(Number); return new Date(Y||2025,(M||1)-1,Dp||1); }
function isoOf(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function mondayOf(d){ const x=new Date(d.getFullYear(),d.getMonth(),d.getDate()); const wd=(x.getDay()+6)%7; x.setDate(x.getDate()-wd); return x; }
function addDays(d,n){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }
function weekLetter(date){ const ref=mondayOf(parseISO(SET.refA||'2025-09-08')); const m=mondayOf(date); const wks=Math.round((m-ref)/604800000); return (((wks%2)+2)%2)===0 ? 'A' : 'B'; }
function weekRangeOf(mon){ const fri=new Date(mon); fri.setDate(mon.getDate()+4); const mo0=mon.toLocaleDateString('es-ES',{month:'short'}).replace('.',''); const mo1=fri.toLocaleDateString('es-ES',{month:'short'}).replace('.',''); return mo0===mo1 ? (mon.getDate()+'–'+fri.getDate()+' '+mo1) : (mon.getDate()+' '+mo0+'–'+fri.getDate()+' '+mo1); }
const cap = s => s ? s.charAt(0).toUpperCase()+s.slice(1) : s;
function profHours(name){ if(!D.prof[name])return 0; const durs=sesDur(); let mins=0; ['A','B'].forEach(w=>{ for(const k in D.prof[name][w]){ const sid=+k.split('-')[1]; mins+=durs[sid]||0; } }); return mins/2/60; }
const fmtH = h => (Math.round(h*100)/100).toString().replace('.',',');
const tutorOf     = a    => (D.tutores && D.tutores[a]) || null;
const aulaOfTutor = name => Object.keys(D.tutores||{}).find(a => D.tutores[a]===name);
function classesToday(name){ const t=todayIdx(); if(t<0)return null; const box=D.prof[name]; if(!box)return []; const res=[]; D.sesiones.forEach(s=>{ if(s.recreo)return; const e=box.A[t+'-'+s.id]; if(e)res.push({s,e}); }); return res; }
function hasQuincenal(mode,sel){
  const box = (mode==='aula'?D.aula:D.prof)[sel]; if(!box) return false;
  const keys = new Set([...Object.keys(box.A), ...Object.keys(box.B)]);
  for(const k of keys){ const A=box.A[k], B=box.B[k];
    if((!!A)!==(!!B)) return true;
    if(A&&B&&(A.ar!==B.ar || (mode==='aula'?A.pr!==B.pr:A.au!==B.au))) return true; }
  return false;
}

// ---------- grid ----------
function cellFor(mode,sel,wk,d,sid){
  const k = d+'-'+sid;
  if(mode==='aula'){
    const box=D.aula[sel]; if(!box)return null;
    const c=box[wk][k], A=box.A[k], B=box.B[k];
    const q = A&&B&&(A.ar!==B.ar||A.pr!==B.pr);
    return c ? {ar:c.ar, who:c.pr, q, A, B} : null;
  } else {
    const box=D.prof[sel]; if(!box)return {free:true};
    const c=box[wk][k], A=box.A[k], B=box.B[k];
    const q = (!!A!==!!B) || (A&&B&&(A.ar!==B.ar||A.au!==B.au));
    return c ? {ar:c.ar, who:c.au, q, A, B} : {free:true, q};
  }
}
function buildGrid(mode,sel,wk){
  const isThisWeek = isoOf(st.weekMon)===isoOf(mondayOf(new Date()));
  const today = isThisWeek ? todayIdx() : -1;
  const marks = cellMarkKeys(st.weekMon);
  const tbl = el('table','grid fade');
  let h='<thead><tr><th class="corner"></th>';
  D.dias.forEach((d,i)=> h+='<th class="'+(i===today?'is-today':'')+'">'+d+'</th>');
  h+='</tr></thead><tbody>';
  D.sesiones.forEach((s,i)=>{
    if(s.recreo){
      h+='<tr><td class="tcol">'+s.ini+'</td><td class="recwrap" colspan="5"><div class="recreo">'+
         '<span class="rl">R E C R E O</span><span class="rt">'+s.ini+'–'+s.fin+'</span></div></td></tr>';
      return;
    }
    if(i>0) h+='<tr><td></td><td class="gap" colspan="5"></td></tr>';
    h+='<tr><td class="tcol">'+s.ini+'<br><span class="to">'+s.fin+'</span></td>';
    D.dias.forEach((dn,d)=>{
      const c = cellFor(mode,sel,wk,d,s.id);
      const isT = d===today ? ' is-today' : '';
      if(!c || c.free){ h+='<td class="cell free'+isT+'"><span class="cs">·</span></td>'; return; }
      const a = ar(c.ar);
      const cellAula = mode==='aula' ? sel : c.who;
      const marked = marks.has(c.ar+'|'+d+'|'+cellAula);
      h+='<td class="cell'+isT+(marked?' has-mark':'')+'" style="background:'+a.bg+';color:'+a.ink+'" data-d="'+d+'" data-s="'+s.id+'" '+
         'tabindex="0" role="button" aria-label="'+a.name+', '+c.who+(marked?', con examen o tarea marcada':'')+'">'+
         '<span class="cs">'+a.short+'</span><span class="cw">'+c.who+'</span>'+
         (c.q?'<span class="qq">A/B</span>':'')+
         (marked?'<span class="exdot" aria-hidden="true">📝</span>':'')+'</td>';
    });
    h+='</tr>';
  });
  h+='</tbody>'; tbl.innerHTML=h;
  tbl.querySelectorAll('.cell:not(.free)').forEach(td=>{
    const open = () => openSheet(mode,sel,wk,+td.dataset.d,+td.dataset.s);
    td.onclick = open;
    td.onkeydown = e => { if(e.key==='Enter'||e.key===' '){ e.preventDefault(); open(); } };
  });
  return tbl;
}
function footNote(){
  return el('footer','foot',
    '<div class="fr"><span class="fs"></span><div><b>El recreo</b> (patio) es de 11:45 a 12:15, visible cada día.</div></div>'+
    '<div style="margin-top:8px"><b>Casillas con A/B</b> = quincenales: la asignatura alterna cada semana.</div>');
}

// ---------- detalle (bottom sheet) ----------
function openSheet(mode,sel,wk,d,sid){
  const s = D.sesiones.find(x=>x.id===sid);
  const c = cellFor(mode,sel,wk,d,sid); const a = ar(c.ar);
  let html = '<div class="sh-day">'+DIA_L[D.dias[d]]+'</div><div class="sh-time">'+s.ini+' – '+s.fin+'</div>';
  if(c.q){
    html += '<div class="sh-q">QUINCENAL · alterna cada semana</div>';
    const mk = (lbl,cc) => {
      if(!cc) return '<div class="sh-card"><div class="sh-dot" style="background:#f0eee7;color:#999">'+lbl+
        '</div><div><div class="sh-t1">Libre</div><div class="sh-t2">sin clase esta semana</div></div></div>';
      const ax = ar(cc.ar); const who = mode==='aula' ? 'con '+cc.pr : 'en '+cc.au;
      return '<div class="sh-card"><div class="sh-dot" style="background:'+ax.bg+';color:'+ax.ink+'">'+lbl+
        '</div><div><div class="sh-t1">'+ax.name+'</div><div class="sh-t2">'+who+'</div></div></div>';
    };
    html += mk('A',c.A)+mk('B',c.B);
  } else {
    let who;
    if(mode==='aula') who = 'con '+c.who+(tutorOf(sel)===c.who?' (tutor/a)':'');
    else              who = 'en '+c.who+(tutorOf(c.who)===sel?' (tu tutoría)':'');
    html += '<div class="sh-card"><div class="sh-dot" style="background:'+a.bg+';color:'+a.ink+'">'+a.short.slice(0,3)+
      '</div><div><div class="sh-t1">'+a.name+'</div><div class="sh-t2">'+who+'</div></div></div>';
  }
  const exAula = mode==='aula' ? sel : c.who;
  const mine = AG.filter(it=>it.ref && it.ref.ar===c.ar && it.ref.d===d && it.ref.aula===exAula && keyDate(it)>=startToday()).sort((x,y)=>keyDate(x)-keyDate(y));
  if(mine.length){ html += '<div class="sh-marks">';
    mine.forEach(it=>{ const tp=TIPOS[it.tipo]||TIPOS.nota; html += '<div class="sh-mark" data-id="'+it.id+'" role="button" tabindex="0"><span class="e">'+tp.emoji+'</span><div class="m"><b>'+escapeHtml(it.titulo)+'</b><span class="d">'+fechaCorta(it)+'</span></div></div>'; });
    html += '</div>'; }
  html += '<button class="btn primary block" id="shAdd">📝 Añadir examen o tarea aquí</button>';
  openBottom(html, true);
  const _b=$('#sheetBody');
  const ab=$('#shAdd',_b); if(ab) ab.onclick=()=>openForm({tipo:'examen', titulo:a.name+' · '+exAula, ref:{ar:c.ar, d:d, aula:exAula}});
  _b.querySelectorAll('.sh-mark').forEach(m=>{ const it=AG.find(x=>x.id===m.dataset.id); if(!it)return; const open=()=>openForm(it); m.onclick=open; m.onkeydown=e=>{ if(e.key==='Enter'){ open(); } }; });
}
function openBottom(html, withClose){
  $('#sheetBody').innerHTML = html;
  const cl = $('#sheetClose'); if(cl) cl.style.display = withClose ? '' : 'none';
  $('#scrim').classList.add('on'); $('#sheet').classList.add('on');
}
function closeSheet(){ if(_tmrId){clearInterval(_tmrId);_tmrId=null;} $('#scrim').classList.remove('on'); $('#sheet').classList.remove('on'); }
let _tmrId=null;

// ---------- vistas ----------
function render(){
  const app = $('#app'); app.innerHTML='';
  if(st.tab==='inicio')        renderInicio(app);
  else if(st.tab==='horario')  renderGeneral(app);
  else if(st.tab==='agenda')   renderAgenda(app);
  else if(st.tab==='clase')    renderClase(app);
  else                         renderMas(app);
  window.scrollTo(0,0);
}

function renderInicio(app){
  const me = meProfe();
  const nombre = SET.nombre || me || 'Profe';
  const head = el('header','app-hd');
  head.innerHTML =
    '<div class="hi">¡Hola, '+escapeHtml(nombre)+'! 👋</div>'+
    '<div class="role">'+(SET.especialidad?escapeHtml(SET.especialidad)+' ':'')+'<span class="edit" id="edId">✏️ editar</span></div>'+
    '<div class="sp-chips">'+chipHoy()+vacacChip()+'</div>';
  app.appendChild(head);
  $('#edId',head).onclick = openIdentity;
  app.appendChild(el('div','sp-banner', fraseDelDia()));
  app.appendChild(el('div','sp-sec','De un vistazo'));
  const wrap = el('div','sp-wrap'); app.appendChild(wrap);
  wrap.appendChild(cardAhora(me));
  const px = proximos();
  wrap.appendChild(cardExamen(px.examen));
  if(px.otro) wrap.appendChild(cardTarea(px.otro));
  const t = todayIdx();
  app.appendChild(el('div','sp-sec', t>=0 ? 'Tus clases de hoy' : 'Tus clases del lunes'));
  app.appendChild(listaHoy(me));
}
function toMin(h){ const [a,b]=h.split(':').map(Number); return a*60+b; }
function fraseDelDia(){ const f=['Hoy va a ser un buen día ✨','Vas a hacerlo genial 💪','Un día más, ¡sonríe! 😊','¡A por el día! 🌟','Paso a paso se llega lejos 🌱']; return f[(new Date().getDate())%f.length]; }
function chipHoy(){ const d=new Date(); const dl=['domingo','lunes','martes','miércoles','jueves','viernes','sábado'][d.getDay()]; const mo=d.toLocaleDateString('es-ES',{month:'short'}).replace('.',''); return '<span class="sp-pill">'+cap(dl)+' '+d.getDate()+' '+mo+' · Sem. '+weekLetter(d)+'</span>'; }
function daysUntil(f){ if(!f)return null; const [Y,M,Dp]=f.split('-').map(Number); const dt=new Date(Y,M-1,Dp); const n=new Date(); const t0=new Date(n.getFullYear(),n.getMonth(),n.getDate()); return Math.round((dt-t0)/86400000); }
function vacacChip(){ if(!SET.vacaciones)return ''; const n=daysUntil(SET.vacaciones); if(n==null||n<0)return ''; return '<span class="sp-pill sun">🏖️ '+(n===0?'¡hoy vacaciones!':(n+' días para las vacaciones'))+'</span>'; }
function mondayFirst(me){ const box=me?D.prof[me]:null; if(!box)return ''; for(const s of D.sesiones){ if(s.recreo)continue; const e=box.A['0-'+s.id]; if(e){ return ar(e.ar).short+' · '+e.au+' · '+s.ini; } } return ''; }
function cardAhora(me){
  const c=el('div','card now'); const t=todayIdx(); const box=me?D.prof[me]:null;
  let k='Ahora', ttl='', sub='', next='';
  if(t<0){ k='Fin de semana'; ttl='¡A descansar! ☺'; const mf=mondayFirst(me); sub = mf?('El lunes empiezas con '+mf):'Nos vemos el lunes'; }
  else if(!box){ ttl='Sin horario'; sub='Cárgalo en «Más» → Horario'; }
  else{
    const d=new Date(); const nowM=d.getHours()*60+d.getMinutes();
    const blocks=D.sesiones.map(s=>({s,ini:toMin(s.ini),fin:toMin(s.fin),rec:s.recreo,e:s.recreo?null:box.A[t+'-'+s.id]}));
    const cur=blocks.find(b=>nowM>=b.ini&&nowM<b.fin);
    const up=blocks.filter(b=>b.ini>nowM&&(b.rec||b.e));
    if(cur){ if(cur.rec){ ttl='🍎 Recreo'; sub='Hasta las '+cur.s.fin; } else if(cur.e){ ttl=ar(cur.e.ar).name; sub=cur.e.au+' · termina a las '+cur.s.fin; } else { ttl='Rato libre'; sub='Ahora no tienes clase'; } }
    else if(nowM<blocks[0].ini){ k='Hoy'; ttl='¡Buenos días!'; sub='Empiezas a las '+D.sesiones[0].ini; }
    else { k='Hoy'; ttl='¡Jornada terminada! ✓'; sub='Buen trabajo'; }
    const nx=up[0];
    if(nx){ next = nx.rec ? ('Luego → 🍎 Recreo · '+nx.s.ini) : ('Luego → '+ar(nx.e.ar).short+' · '+nx.e.au+' · '+nx.s.ini); }
  }
  c.innerHTML='<div class="hdrow"><div class="emoji">📘</div><div><div class="k">'+k+'</div><div class="ttl">'+escapeHtml(ttl)+'</div><div class="sub2">'+escapeHtml(sub)+'</div></div></div>'+(next?'<div class="next">'+escapeHtml(next)+'</div>':'');
  return c;
}
function startToday(){ const n=new Date(); return new Date(n.getFullYear(),n.getMonth(),n.getDate()).getTime(); }
function proximos(){ const t0=startToday(); const up=AG.filter(i=>keyDate(i)>=t0).sort((a,b)=>keyDate(a)-keyDate(b)); return { examen:up.find(i=>i.tipo==='examen')||null, otro:up.find(i=>i.tipo!=='examen')||null }; }
function fechaCorta(it){ const [Y,M,Dp]=it.fecha.split('-').map(Number); const dt=new Date(Y,M-1,Dp); let s=dt.toLocaleDateString('es-ES',{weekday:'short',day:'numeric',month:'short'}); if(it.hora)s+=' · '+it.hora; return s; }
function cardExamen(ex){
  if(!ex){ const c=el('div','card'); c.innerHTML='<div class="hdrow"><div class="emoji" style="background:var(--coral-bg)">📝</div><div><div class="k" style="color:var(--brand)">Próximo examen</div><div class="ttl">Sin exámenes marcados</div><div class="sub2">Márcalos en Agenda</div></div></div>'; return c; }
  const c=el('div','card exam tap'); const d=daysUntil(ex.fecha);
  const num = d>=1?d:'!'; const lab = d>=1?(d===1?'DÍA':'DÍAS'):'HOY';
  c.innerHTML='<div class="hdrow"><div class="emoji">📝</div><div><div class="k">Próximo examen</div><div class="ttl">'+escapeHtml(ex.titulo)+'</div><div class="sub2">'+fechaCorta(ex)+'</div></div><div class="cd"><b>'+num+'</b><span>'+lab+'</span></div></div>';
  c.onclick=()=>setTab('agenda'); return c;
}
function cardTarea(it){ const tp=TIPOS[it.tipo]||TIPOS.nota; const c=el('div','card task tap'); const d=daysUntil(it.fecha); const when=d<=0?'hoy':(d===1?'mañana':'en '+d+' días');
  c.innerHTML='<div class="hdrow"><div class="emoji">'+tp.emoji+'</div><div><div class="ttl">'+escapeHtml(it.titulo)+'</div><div class="sub2">'+tp.label+' · '+fechaCorta(it)+'</div></div><div class="when">'+when+'</div></div>';
  c.onclick=()=>setTab('agenda'); return c;
}
function listaHoy(me){ const wrap=el('div','today-list'); const t=todayIdx(); const day=t>=0?t:0; const box=me?D.prof[me]:null;
  if(!box){ wrap.appendChild(el('div','empty','Carga tu horario en «Más» para ver tus clases.')); return wrap; }
  const has=D.sesiones.some(s=>!s.recreo&&box.A[day+'-'+s.id]);
  if(!has){ wrap.appendChild(el('div','empty', t>=0?'Hoy no tienes clase 🎉':'Sin clases asignadas.')); return wrap; }
  D.sesiones.forEach(s=>{ if(s.recreo){ wrap.appendChild(el('div','tl rec','<span class="h">'+s.ini+'</span><span class="n">🍎 Recreo</span>')); return; } const e=box.A[day+'-'+s.id]; if(!e)return; const a=ar(e.ar); wrap.appendChild(el('div','tl','<span class="h">'+s.ini+'</span><span class="sw" style="background:'+a.bg+'"></span><span class="n">'+a.short+' · '+e.au+'</span>')); });
  return wrap;
}
/* ==================== Módulo "Mi clase" (Fase 3.3) ==================== */
const DEF_CLASE = { grupos:[], alumnos:{}, asig:{}, deberes:{}, salidas:{} };
let CL = (()=>{ try{ return Object.assign({}, DEF_CLASE, JSON.parse(localStorage.getItem('clase_data')||'{}')); }catch(e){ return JSON.parse(JSON.stringify(DEF_CLASE)); } })();
const saveCL = () => { try{ localStorage.setItem('clase_data', JSON.stringify(CL)); }catch(e){} };
st.claseView = 'alumnos';   // alumnos | deberes | salidas
st.alumno = null;           // id del alumno abierto (pantalla de detalle)
function clGrupo(){ if(!CL.grupos.length) return null; if(!CL.grupos.includes(st.grupo)) st.grupo = CL.grupos[0]; return st.grupo; }
const alumnosDe = g => (CL.alumnos[g] = CL.alumnos[g] || []);
const asigDe    = g => (CL.asig[g]    = CL.asig[g]    || []);
const deberesDe = g => (CL.deberes[g] = CL.deberes[g] || []);
const salidasDe = g => (CL.salidas[g] = CL.salidas[g] || []);
const findAl = (g,id) => alumnosDe(g).find(a=>a.id===id);
const nid = p => p+Date.now().toString(36)+Math.floor(Math.random()*1e4).toString(36);
function nnum(v){ v=String(v==null?'':v).trim().replace(',','.'); if(v==='')return null; const n=parseFloat(v); return isFinite(n)?n:null; }
function mediaNotas(o){ const xs=['ex','t1','t2','gen'].map(k=>nnum(o&&o[k])).filter(n=>n!=null); if(!xs.length)return null; return Math.round(xs.reduce((a,b)=>a+b,0)/xs.length*100)/100; }
function fmtNota(n){ return n==null?'—':String(n).replace('.',','); }
function cumpleDias(iso){ if(!iso)return null; const p=String(iso).split('-').map(Number); const m=p[1],d=p[2]; if(!m||!d)return null; const n=new Date(); const t0=new Date(n.getFullYear(),n.getMonth(),n.getDate()); let nx=new Date(t0.getFullYear(),m-1,d); if(nx<t0)nx=new Date(t0.getFullYear()+1,m-1,d); return Math.round((nx-t0)/86400000); }
function cumpleTxt(iso){ if(!iso)return ''; const p=String(iso).split('-').map(Number); const dt=new Date(2000,(p[1]||1)-1,p[2]||1); const s=dt.toLocaleDateString('es-ES',{day:'numeric',month:'short'}).replace('.',''); const dd=cumpleDias(iso); return '🎂 '+s+(dd!=null&&dd<=14?(dd===0?' · ¡hoy!':' · en '+dd+' d'):''); }
function fechaCortaISO(iso){ if(!iso)return ''; const p=String(iso).split('-').map(Number); const dt=new Date(p[0],(p[1]||1)-1,p[2]||1); return dt.toLocaleDateString('es-ES',{weekday:'short',day:'numeric',month:'short'}); }
function inicial(nombre){ return (String(nombre||'?').trim().charAt(0)||'?').toUpperCase(); }
function waShare(texto){ try{ window.open('https://wa.me/?text='+encodeURIComponent(texto),'_blank'); }catch(e){} }

function renderClase(app){
  const g = clGrupo();
  if(g && st.alumno){ const al=findAl(g,st.alumno); if(al){ renderAlumnoDetail(app,g,al); return; } st.alumno=null; }

  const head = el('header','app-hd',
    '<div class="brandrow"><h1 class="title">Mi <em>clase</em></h1>'+(g?'<span class="yr">'+escapeHtml(g)+'</span>':'')+'</div>'+
    '<p class="sub">Tus alumnos, sus notas y el día a día del aula.</p>');
  app.appendChild(head);

  if(!CL.grupos.length){
    const em=el('div','empty','Aún no tienes ningún grupo.<br>Crea el tuyo (por ejemplo «3.º A») para empezar.');
    const b=el('button','btn primary block','＋ Crear mi primer grupo'); b.onclick=()=>gForm();
    em.appendChild(b); app.appendChild(em); return;
  }

  // selector de grupo
  const picker=el('div','picker'); app.appendChild(picker);
  CL.grupos.forEach(x=>{ const b=el('button','chip'); b.textContent=x; b.setAttribute('aria-pressed', x===g);
    b.onclick=()=>{ st.grupo=x; st.alumno=null; render(); }; picker.appendChild(b); });
  const addG=el('button','chip add','＋'); addG.setAttribute('aria-label','Nuevo grupo'); addG.onclick=()=>gForm(); picker.appendChild(addG);

  // sub-pestañas
  const seg=el('div','seg clseg','<button data-v="alumnos" aria-selected="'+(st.claseView==='alumnos')+'">👦 Alumnos</button>'+
    '<button data-v="deberes" aria-selected="'+(st.claseView==='deberes')+'">📚 Deberes</button>'+
    '<button data-v="salidas" aria-selected="'+(st.claseView==='salidas')+'">🚌 Salidas</button>');
  app.appendChild(seg);
  seg.querySelectorAll('button').forEach(b=>b.onclick=()=>{ st.claseView=b.dataset.v; render(); });

  if(st.claseView==='alumnos')      renderAlumnos(app,g);
  else if(st.claseView==='deberes') renderDeberes(app,g);
  else                              renderSalidas(app,g);
}

function renderAlumnos(app,g){
  const arr=alumnosDe(g);
  const add=el('button','cl-add','＋ Añadir alumno'); add.onclick=()=>alForm(g,null); app.appendChild(add);
  if(!arr.length){ app.appendChild(el('div','empty','Sin alumnos todavía.<br>Toca «Añadir alumno» para empezar tu lista.')); return; }
  const wrap=el('div','al-list'); app.appendChild(wrap);
  arr.slice().sort((a,b)=>a.nombre.localeCompare(b.nombre,'es')).forEach(al=>{
    const dd=cumpleDias(al.cumple);
    const sub=[ al.cumple?cumpleTxt(al.cumple):'', (al.faltas&&al.faltas.length)?('🚪 '+al.faltas.length+' falta'+(al.faltas.length>1?'s':'')):'' ].filter(Boolean).join(' · ');
    const c=el('div','al-card'+(dd===0?' bday':''),
      '<div class="al-av">'+escapeHtml(inicial(al.nombre))+'</div>'+
      '<div class="al-body"><div class="al-name">'+escapeHtml(al.nombre)+'</div>'+(sub?'<div class="al-sub">'+sub+'</div>':'')+'</div>'+
      '<div class="al-cnt">'+
        '<button class="al-pm pos" aria-label="Sumar positivo">👍<b>'+(al.pos||0)+'</b></button>'+
        '<button class="al-pm neg" aria-label="Sumar negativo">👎<b>'+(al.neg||0)+'</b></button>'+
      '</div>');
    const pos=c.querySelector('.al-pm.pos'), neg=c.querySelector('.al-pm.neg');
    pos.onclick=e=>{ e.stopPropagation(); al.pos=(al.pos||0)+1; saveCL(); pos.querySelector('b').textContent=al.pos; bump(pos); };
    neg.onclick=e=>{ e.stopPropagation(); al.neg=(al.neg||0)+1; saveCL(); neg.querySelector('b').textContent=al.neg; bump(neg); };
    c.onclick=()=>{ st.alumno=al.id; render(); };
    wrap.appendChild(c);
  });
  app.appendChild(el('footer','foot','<div><b>Toca 👍 o 👎</b> para sumar un positivo o un negativo al instante. Toca al alumno para ver sus notas, faltas y tutoría.</div>'));
}
function bump(node){ node.classList.remove('bumped'); void node.offsetWidth; node.classList.add('bumped'); }

function renderAlumnoDetail(app,g,al){
  const back=el('button','cl-back','‹ '+escapeHtml(g)); back.onclick=()=>{ st.alumno=null; render(); };
  app.appendChild(back);
  const head=el('header','app-hd',
    '<div class="al-hero"><div class="al-av big">'+escapeHtml(inicial(al.nombre))+'</div>'+
    '<div><h1 class="who-name">'+escapeHtml(al.nombre)+'</h1><p class="who-meta">'+(al.cumple?cumpleTxt(al.cumple):'Sin cumpleaños anotado')+'</p></div></div>');
  app.appendChild(head);
  const wrap=el('div','cl-detail'); app.appendChild(wrap);

  // Comportamiento
  wrap.appendChild(el('div','sp-sec','Comportamiento'));
  const stats=el('div','cl-stats');
  stats.appendChild(statTile('pos','👍','Positivos',al.pos||0,()=>{al.pos=(al.pos||0)+1;},()=>{al.pos=Math.max(0,(al.pos||0)-1);}));
  stats.appendChild(statTile('neg','👎','Negativos',al.neg||0,()=>{al.neg=(al.neg||0)+1;},()=>{al.neg=Math.max(0,(al.neg||0)-1);}));
  wrap.appendChild(stats);
  // Faltas
  const faltas=(al.faltas=al.faltas||[]);
  const fcard=el('div','mas-card');
  const hoy=isoOf(new Date()); const yaHoy=faltas.includes(hoy);
  fcard.innerHTML='<div class="cl-row"><span class="ic">🚪</span><b>Faltas de asistencia</b><span class="cl-badge">'+faltas.length+'</span></div>';
  const fbtn=el('button','btn ghost block', yaHoy?'✓ Falta marcada hoy (quitar)':'Marcar falta de hoy');
  fbtn.onclick=()=>{ const i=faltas.indexOf(hoy); if(i>=0)faltas.splice(i,1); else faltas.push(hoy); saveCL(); render(); };
  fcard.appendChild(fbtn);
  if(faltas.length){ const fl=el('div','cl-faltas'); faltas.slice().sort().reverse().forEach(f=>{ const t=el('span','cl-ftag',fechaCortaISO(f)+' ✕'); t.onclick=()=>{ const i=faltas.indexOf(f); if(i>=0)faltas.splice(i,1); saveCL(); render(); }; fl.appendChild(t); }); fcard.appendChild(fl); }
  wrap.appendChild(fcard);

  // Cuaderno de notas
  wrap.appendChild(el('div','sp-sec','Cuaderno de notas'));
  const asigs=asigDe(g);
  if(!asigs.length){ wrap.appendChild(el('div','cl-hint','Añade una asignatura para empezar a poner notas (examen, 1.º y 2.º trimestre y general).')); }
  al.notas=al.notas||{};
  asigs.forEach(as=>{
    const o=(al.notas[as]=al.notas[as]||{ex:'',t1:'',t2:'',gen:''});
    const nc=el('div','cl-note');
    nc.innerHTML='<div class="cl-note-h"><b>'+escapeHtml(as)+'</b><span class="cl-media">media <em>'+fmtNota(mediaNotas(o))+'</em></span></div>';
    const row=el('div','cl-grades');
    [['ex','Examen'],['t1','1.º trim'],['t2','2.º trim'],['gen','General']].forEach(([k,lbl])=>{
      const f=el('label','cl-grade','<span>'+lbl+'</span>');
      const inp=el('input'); inp.type='text'; inp.inputMode='decimal'; inp.value=o[k]||''; inp.placeholder='–';
      inp.oninput=()=>{ o[k]=inp.value; saveCL(); nc.querySelector('.cl-media em').textContent=fmtNota(mediaNotas(o)); };
      f.appendChild(inp); row.appendChild(f);
    });
    nc.appendChild(row);
    const del=el('button','cl-note-del','Quitar asignatura'); del.onclick=()=>{ const i=asigs.indexOf(as); if(i>=0)asigs.splice(i,1); alumnosDe(g).forEach(a=>{ if(a.notas)delete a.notas[as]; }); saveCL(); render(); };
    nc.appendChild(del);
    wrap.appendChild(nc);
  });
  if(asigs.length) wrap.appendChild(el('div','cl-subhint','Escribe la nota a mano: vale un número entero o con decimales (8 · 8,5 · 7,25). Lo que no sea un número (p. ej. «NP») se guarda, pero no cuenta para la media.'));
  const addAs=el('button','btn ghost block','＋ Añadir asignatura'); addAs.onclick=()=>asigForm(g); wrap.appendChild(addAs);

  // Tutoría
  wrap.appendChild(el('div','sp-sec','Tutoría con la familia'));
  const tut=al.tutoria||{};
  const tc=el('div','mas-card');
  if(tut.fecha||tut.fam||tut.acuerdos||tut.prox){
    tc.innerHTML='<div class="cl-tut">'+
      (tut.fam?'<div><span>Familia:</span> '+escapeHtml(tut.fam)+'</div>':'')+
      (tut.fecha?'<div><span>Última reunión:</span> '+fechaCortaISO(tut.fecha)+'</div>':'')+
      (tut.acuerdos?'<div><span>Acuerdos:</span> '+escapeHtml(tut.acuerdos)+'</div>':'')+
      (tut.prox?'<div><span>Próxima cita:</span> '+fechaCortaISO(tut.prox)+'</div>':'')+'</div>';
  } else tc.innerHTML='<div class="cl-hint" style="margin:0">Sin tutorías registradas todavía.</div>';
  const tb=el('button','btn ghost block',(tut.fecha||tut.fam)?'Editar tutoría':'Registrar tutoría'); tb.onclick=()=>tutForm(g,al); tc.appendChild(tb);
  wrap.appendChild(tc);

  // Observaciones
  wrap.appendChild(el('div','sp-sec','Observaciones'));
  const oc=el('div','mas-card');
  const ta=el('textarea','cl-obs'); ta.rows=3; ta.placeholder='Notas sobre el alumno (alergias, apoyos, lo que quieras recordar)…'; ta.value=al.obs||'';
  ta.oninput=()=>{ al.obs=ta.value; saveCL(); };
  oc.appendChild(ta); wrap.appendChild(oc);

  // acciones
  const acts=el('div','cl-detail-acts');
  const edit=el('button','btn ghost','Editar datos'); edit.onclick=()=>alForm(g,al);
  const del=el('button','btn danger','Borrar alumno'); del.onclick=()=>{ if(confirm('¿Borrar a '+al.nombre+' y todos sus datos?')){ CL.alumnos[g]=alumnosDe(g).filter(a=>a.id!==al.id); saveCL(); st.alumno=null; render(); } };
  acts.appendChild(edit); acts.appendChild(del); wrap.appendChild(acts);
}
function statTile(cls,emoji,label,val,inc,dec){
  const t=el('div','cl-stat '+cls,'<div class="cl-stat-top">'+emoji+' '+label+'</div>');
  const row=el('div','cl-stat-row');
  const bm=el('button','cl-step','−'); const num=el('span','cl-num',String(val)); const bp=el('button','cl-step','＋');
  bm.onclick=()=>{ dec(); saveCL(); num.textContent=String(cls==='pos'?(findAlCur().pos||0):(findAlCur().neg||0)); };
  bp.onclick=()=>{ inc(); saveCL(); num.textContent=String(cls==='pos'?(findAlCur().pos||0):(findAlCur().neg||0)); bump(t); };
  row.appendChild(bm); row.appendChild(num); row.appendChild(bp); t.appendChild(row); return t;
}
function findAlCur(){ return findAl(st.grupo, st.alumno)||{}; }

function renderDeberes(app,g){
  const arr=deberesDe(g);
  const add=el('button','cl-add','＋ Poner deberes'); add.onclick=()=>debForm(g,null); app.appendChild(add);
  if(!arr.length){ app.appendChild(el('div','empty','Sin deberes anotados.<br>Anótalos y compártelos con las familias por WhatsApp.')); return; }
  const t0=startToday();
  const wrap=el('div','ag-list'); app.appendChild(wrap);
  arr.slice().sort((a,b)=>(a.fecha||'').localeCompare(b.fecha||'')).forEach(it=>{
    const venc = it.fecha && new Date(it.fecha+'T23:59').getTime()<t0;
    const c=el('div','ag-card'+(it.hecho?' done':''),
      '<div class="ag-emoji" style="background:var(--sky-bg)">📚</div>'+
      '<div class="ag-cbody"><div class="ag-t">'+escapeHtml(it.titulo)+'</div>'+
        '<div class="ag-meta">'+(it.asig?'<span class="ag-chip" style="background:var(--sky-bg);color:#2f5686">'+escapeHtml(it.asig)+'</span> ':'')+
        (it.fecha?('Para el '+fechaCortaISO(it.fecha)):'Sin fecha')+(venc&&!it.hecho?' · vencido':'')+'</div></div>'+
      '<div class="ag-acts"><button class="ag-ic wa" aria-label="Compartir por WhatsApp">📲</button></div>');
    c.querySelector('.wa').onclick=e=>{ e.stopPropagation(); waShare('📚 Deberes '+g+(it.asig?' · '+it.asig:'')+':\n'+it.titulo+(it.fecha?'\nPara el '+fechaCortaISO(it.fecha):'')); };
    c.onclick=()=>debForm(g,it);
    wrap.appendChild(c);
  });
}
function renderSalidas(app,g){
  const arr=salidasDe(g);
  const add=el('button','cl-add','＋ Nueva salida'); add.onclick=()=>salForm(g,null); app.appendChild(add);
  if(!arr.length){ app.appendChild(el('div','empty','Sin salidas ni excursiones.<br>Anótalas con fecha, lugar y coste; avisa a las familias por WhatsApp.')); return; }
  const wrap=el('div','ag-list'); app.appendChild(wrap);
  arr.slice().sort((a,b)=>(a.fecha||'').localeCompare(b.fecha||'')).forEach(it=>{
    const meta=[ it.fecha?fechaCortaISO(it.fecha):'Sin fecha', it.lugar?('📍 '+it.lugar):'', (it.coste!=null&&it.coste!=='')?('💶 '+it.coste+' €'):'' ].filter(Boolean).join(' · ');
    const c=el('div','ag-card',
      '<div class="ag-emoji" style="background:var(--mint-bg)">🚌</div>'+
      '<div class="ag-cbody"><div class="ag-t">'+escapeHtml(it.titulo)+'</div><div class="ag-meta">'+escapeHtml(meta)+'</div>'+
      (it.nota?'<div class="ag-d">'+escapeHtml(it.nota)+'</div>':'')+'</div>'+
      '<div class="ag-acts"><button class="ag-ic wa" aria-label="Avisar por WhatsApp">📲</button></div>');
    c.querySelector('.wa').onclick=e=>{ e.stopPropagation(); waShare('🚌 Salida '+g+': '+it.titulo+(it.fecha?'\n🗓️ '+fechaCortaISO(it.fecha):'')+(it.lugar?'\n📍 '+it.lugar:'')+((it.coste!=null&&it.coste!=='')?'\n💶 '+it.coste+' €':'')+(it.nota?'\n'+it.nota:'')); };
    c.onclick=()=>salForm(g,it);
    wrap.appendChild(c);
  });
}

// ---------- formularios de Mi clase ----------
function gForm(){
  openBottom('<div class="form-h">Nuevo grupo</div>'+
    '<label class="fl">Nombre del grupo<input id="g_n" type="text" placeholder="Ej.: 3.º A" autocomplete="off"></label>'+
    '<div class="form-actions"><button class="btn ghost" id="g_c">Cancelar</button><button class="btn primary" id="g_ok">Crear</button></div>', false);
  const b=$('#sheetBody'); const inp=$('#g_n',b); setTimeout(()=>inp.focus(),60);
  $('#g_c',b).onclick=closeSheet;
  $('#g_ok',b).onclick=()=>{ const n=inp.value.trim(); if(!n){ inp.focus(); return; } if(!CL.grupos.includes(n))CL.grupos.push(n); st.grupo=n; st.alumno=null; st.claseView='alumnos'; saveCL(); closeSheet(); render(); };
}
function alForm(g,al){
  const it=Object.assign({nombre:'',cumple:''}, al||{});
  openBottom('<div class="form-h">'+(al?'Editar alumno':'Nuevo alumno')+'</div>'+
    '<label class="fl">Nombre y apellidos<input id="a_n" type="text" value="'+escapeHtml(it.nombre)+'" placeholder="Ej.: Lucía Martín" autocomplete="off"></label>'+
    '<label class="fl">Cumpleaños <span class="opt">(opcional)</span><input id="a_c" type="date" value="'+(it.cumple||'')+'"></label>'+
    '<div class="form-actions">'+(al?'<button class="btn danger" id="a_del">Borrar</button>':'')+'<button class="btn ghost" id="a_can">Cancelar</button><button class="btn primary" id="a_ok">Guardar</button></div>', false);
  const b=$('#sheetBody'); const inp=$('#a_n',b); if(!al)setTimeout(()=>inp.focus(),60);
  $('#a_can',b).onclick=closeSheet;
  const del=$('#a_del',b); if(del)del.onclick=()=>{ CL.alumnos[g]=alumnosDe(g).filter(a=>a.id!==al.id); saveCL(); if(st.alumno===al.id)st.alumno=null; closeSheet(); render(); };
  $('#a_ok',b).onclick=()=>{ const n=inp.value.trim(); if(!n){ inp.focus(); return; } const cumple=$('#a_c',b).value;
    if(al){ al.nombre=n; al.cumple=cumple; } else { alumnosDe(g).push({id:nid('a'),nombre:n,cumple,pos:0,neg:0,faltas:[],notas:{},tutoria:{},obs:''}); }
    saveCL(); closeSheet(); render(); };
}
function asigForm(g){
  openBottom('<div class="form-h">Nueva asignatura</div>'+
    '<label class="fl">Nombre<input id="as_n" type="text" placeholder="Ej.: Matemáticas" autocomplete="off"></label>'+
    '<div class="form-actions"><button class="btn ghost" id="as_c">Cancelar</button><button class="btn primary" id="as_ok">Añadir</button></div>', false);
  const b=$('#sheetBody'); const inp=$('#as_n',b); setTimeout(()=>inp.focus(),60);
  $('#as_c',b).onclick=closeSheet;
  $('#as_ok',b).onclick=()=>{ const n=inp.value.trim(); if(!n){ inp.focus(); return; } const a=asigDe(g); if(!a.includes(n))a.push(n); saveCL(); closeSheet(); render(); };
}
function debForm(g,it){
  const d=Object.assign({asig:'',titulo:'',fecha:''}, it||{});
  const asigs=asigDe(g);
  const opts='<option value="">— sin asignatura —</option>'+asigs.map(a=>'<option value="'+escapeHtml(a)+'"'+(a===d.asig?' selected':'')+'>'+escapeHtml(a)+'</option>').join('');
  openBottom('<div class="form-h">'+(it?'Editar deberes':'Poner deberes')+'</div>'+
    '<label class="fl">Asignatura <span class="opt">(opcional)</span><select id="d_as">'+opts+'</select></label>'+
    '<label class="fl">¿Qué hay que hacer?<textarea id="d_t" rows="2" placeholder="Ej.: Página 45, ejercicios 1 a 4">'+escapeHtml(d.titulo)+'</textarea></label>'+
    '<label class="fl">Para el día <span class="opt">(opcional)</span><input id="d_f" type="date" value="'+(d.fecha||'')+'"></label>'+
    (it?'<label class="chk"><input id="d_h" type="checkbox"'+(d.hecho?' checked':'')+'> Ya está hecho / corregido</label>':'')+
    '<div class="form-actions">'+(it?'<button class="btn danger" id="d_del">Borrar</button>':'')+'<button class="btn ghost" id="d_c">Cancelar</button><button class="btn primary" id="d_ok">Guardar</button></div>', false);
  const b=$('#sheetBody');
  $('#d_c',b).onclick=closeSheet;
  const del=$('#d_del',b); if(del)del.onclick=()=>{ CL.deberes[g]=deberesDe(g).filter(x=>x.id!==it.id); saveCL(); closeSheet(); render(); };
  $('#d_ok',b).onclick=()=>{ const t=$('#d_t',b).value.trim(); if(!t){ $('#d_t',b).focus(); return; } const asig=$('#d_as',b).value, fecha=$('#d_f',b).value;
    if(it){ it.asig=asig; it.titulo=t; it.fecha=fecha; it.hecho=$('#d_h',b).checked; } else { deberesDe(g).push({id:nid('d'),asig,titulo:t,fecha,hecho:false}); }
    saveCL(); closeSheet(); render(); };
}
function salForm(g,it){
  const s=Object.assign({titulo:'',fecha:'',lugar:'',coste:'',nota:''}, it||{});
  openBottom('<div class="form-h">'+(it?'Editar salida':'Nueva salida')+'</div>'+
    '<label class="fl">Nombre de la salida<input id="s_t" type="text" value="'+escapeHtml(s.titulo)+'" placeholder="Ej.: Museo de Ciencias" autocomplete="off"></label>'+
    '<div class="frow"><label class="fl">Fecha<input id="s_f" type="date" value="'+(s.fecha||'')+'"></label>'+
      '<label class="fl">Coste € <span class="opt">(opc.)</span><input id="s_c" type="text" inputmode="decimal" value="'+escapeHtml(s.coste)+'" placeholder="0"></label></div>'+
    '<label class="fl">Lugar <span class="opt">(opcional)</span><input id="s_l" type="text" value="'+escapeHtml(s.lugar)+'" placeholder="Ej.: Alcobendas" autocomplete="off"></label>'+
    '<label class="fl">Notas / autorización <span class="opt">(opcional)</span><textarea id="s_n" rows="2" placeholder="Ej.: entregar autorización firmada antes del viernes">'+escapeHtml(s.nota)+'</textarea></label>'+
    '<div class="form-actions">'+(it?'<button class="btn danger" id="s_del">Borrar</button>':'')+'<button class="btn ghost" id="s_can">Cancelar</button><button class="btn primary" id="s_ok">Guardar</button></div>', false);
  const b=$('#sheetBody');
  $('#s_can',b).onclick=closeSheet;
  const del=$('#s_del',b); if(del)del.onclick=()=>{ CL.salidas[g]=salidasDe(g).filter(x=>x.id!==it.id); saveCL(); closeSheet(); render(); };
  $('#s_ok',b).onclick=()=>{ const t=$('#s_t',b).value.trim(); if(!t){ $('#s_t',b).focus(); return; }
    const rec={titulo:t,fecha:$('#s_f',b).value,lugar:$('#s_l',b).value.trim(),coste:$('#s_c',b).value.trim(),nota:$('#s_n',b).value.trim()};
    if(it){ Object.assign(it,rec); } else { salidasDe(g).push(Object.assign({id:nid('s')},rec)); }
    saveCL(); closeSheet(); render(); };
}
function tutForm(g,al){
  const t=Object.assign({fam:'',fecha:'',acuerdos:'',prox:''}, al.tutoria||{});
  openBottom('<div class="form-h">Tutoría con la familia</div>'+
    '<label class="fl">Familia / con quién<input id="t_fam" type="text" value="'+escapeHtml(t.fam)+'" placeholder="Ej.: madre de Lucía" autocomplete="off"></label>'+
    '<label class="fl">Fecha de la reunión<input id="t_f" type="date" value="'+(t.fecha||'')+'"></label>'+
    '<label class="fl">Acuerdos<textarea id="t_ac" rows="2" placeholder="Lo que se habló y se acordó…">'+escapeHtml(t.acuerdos)+'</textarea></label>'+
    '<label class="fl">Próxima cita <span class="opt">(opcional)</span><input id="t_p" type="date" value="'+(t.prox||'')+'"></label>'+
    '<div class="form-actions"><button class="btn ghost" id="t_c">Cancelar</button><button class="btn primary" id="t_ok">Guardar</button></div>', false);
  const b=$('#sheetBody');
  $('#t_c',b).onclick=closeSheet;
  $('#t_ok',b).onclick=()=>{ al.tutoria={fam:$('#t_fam',b).value.trim(),fecha:$('#t_f',b).value,acuerdos:$('#t_ac',b).value.trim(),prox:$('#t_p',b).value};
    saveCL(); closeSheet(); render(); };
}
function renderMas(app){
  app.appendChild(el('header','app-hd','<div class="brandrow"><h1 class="title">Más <em>opciones</em></h1></div>'));
  const wrap=el('div','mas-wrap'); app.appendChild(wrap);
  wrap.appendChild(el('div','mas-sec','Tu perfil'));
  const idc=el('div','mas-card');
  idc.innerHTML='<div class="mas-id"><div class="mas-av">'+escapeHtml((SET.nombre||'P').charAt(0).toUpperCase())+'</div><div><div class="n">'+escapeHtml(SET.nombre||'Profe')+'</div><div class="r">'+escapeHtml(SET.especialidad||'')+'</div></div></div>';
  const idb=el('button','btn ghost block','Editar mi identidad'); idb.onclick=openIdentity; idc.appendChild(idb);
  wrap.appendChild(idc);
  wrap.appendChild(el('div','mas-sec','Horario'));
  const lc=el('div','mas-card'); const box=el('div','load'); lc.appendChild(box); wrap.appendChild(lc); buildLoad(box);
  wrap.appendChild(el('div','mas-sec','Herramientas de aula'));
  const hc=el('div','mas-card');
  hc.appendChild(masRow('⏱️','Temporizador de aula',openTimer));
  hc.appendChild(masRow('🎲','Elegir alumno al azar (sorteos)',openRandom));
  hc.appendChild(masRow('💾','Copia de seguridad',openBackup));
  wrap.appendChild(hc);
  wrap.appendChild(el('div','mas-sec','Apariencia'));
  const ac=el('div','mas-card');
  const dk=el('div','mas-row tap','<span class="ic">'+(SET.tema==='oscuro'?'🌙':'☀️')+'</span>Modo oscuro<span class="sw-toggle'+(SET.tema==='oscuro'?' on':'')+'" id="dkSw" role="switch" aria-checked="'+(SET.tema==='oscuro')+'"></span>');
  dk.onclick=()=>{ SET.tema = (SET.tema==='oscuro')?'claro':'oscuro'; saveSet(); applyTheme(); render(); };
  dk.setAttribute('role','button'); dk.setAttribute('tabindex','0'); dk.onkeydown=e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); dk.onclick(); } };
  ac.appendChild(dk); wrap.appendChild(ac);
}
function masRow(ic,label,onclick){ const r=el('div','mas-row tap','<span class="ic">'+ic+'</span>'+escapeHtml(label)+'<span class="chev">›</span>'); r.onclick=onclick; r.setAttribute('role','button'); r.setAttribute('tabindex','0'); r.onkeydown=e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); onclick(); } }; return r; }

// ---------- Herramienta: temporizador de aula ----------
function fmtClock(s){ s=Math.max(0,s|0); return Math.floor(s/60)+':'+pad2(s%60); }
function openTimer(){
  let left=5*60, running=false;
  openBottom('<div class="form-h">Temporizador</div>'+
    '<div class="tmr-display" id="tmr">'+fmtClock(left)+'</div>'+
    '<div class="tmr-presets" id="tpre">'+[1,3,5,10].map(m=>'<button type="button" data-m="'+m+'">'+m+' min</button>').join('')+'</div>'+
    '<div class="form-actions"><button class="btn ghost" id="treset">Reiniciar</button><button class="btn primary" id="tgo">▶ Empezar</button></div>', false);
  const b=$('#sheetBody'); const disp=$('#tmr',b); const go=$('#tgo',b);
  function stop(){ running=false; if(_tmrId){clearInterval(_tmrId);_tmrId=null;} go.textContent='▶ Empezar'; }
  function tick(){ left--; disp.textContent=fmtClock(left); if(left<=0){ left=0; stop(); disp.classList.add('done'); disp.textContent='¡Tiempo!'; try{ navigator.vibrate&&navigator.vibrate([200,100,200]); }catch(e){} } }
  b.querySelectorAll('#tpre button').forEach(x=>x.onclick=()=>{ stop(); left=(+x.dataset.m)*60; disp.classList.remove('done'); disp.textContent=fmtClock(left); });
  go.onclick=()=>{ if(running){ stop(); } else { if(left<=0)return; running=true; go.textContent='⏸ Pausar'; disp.classList.remove('done'); _tmrId=setInterval(tick,1000); } };
  $('#treset',b).onclick=()=>{ stop(); left=5*60; disp.classList.remove('done'); disp.textContent=fmtClock(left); };
}

// ---------- Herramienta: elegir alumno al azar ----------
function openRandom(){
  const g=clGrupo(); const arr=g?alumnosDe(g):[];
  if(!arr.length){ openBottom('<div class="form-h">Elegir alumno al azar</div><div class="cl-hint" style="margin:0 0 14px">Primero añade tus alumnos en la pestaña «Clase».</div><div class="form-actions"><button class="btn primary" id="rc">Entendido</button></div>', false); $('#rc',$('#sheetBody')).onclick=closeSheet; return; }
  const pick=()=>arr[Math.floor(Math.random()*arr.length)].nombre;
  openBottom('<div class="form-h">Alumno al azar <span class="opt" style="font-weight:700;color:#b3aaa1">· '+escapeHtml(g)+'</span></div><div class="rnd-name" id="rn">'+escapeHtml(pick())+'</div><div class="form-actions"><button class="btn ghost" id="rcl">Cerrar</button><button class="btn primary" id="rag">🎲 Otra vez</button></div>', false);
  const b=$('#sheetBody'); $('#rcl',b).onclick=closeSheet;
  $('#rag',b).onclick=()=>{ const n=$('#rn',b); n.textContent=pick(); bump(n); };
}

// ---------- Herramienta: copia de seguridad (exportar / importar) ----------
const BK_KEYS=['horario_data','settings','agenda_items','clase_data'];
function appBackup(){ const o={_app:'Super Profe',_v:1}; BK_KEYS.forEach(k=>{ const v=localStorage.getItem(k); if(v!=null)o[k]=v; }); return o; }
function bkStatus(b,msg,kind){ const s=$('#bk_st',b); if(!s)return; s.hidden=false; s.textContent=msg; s.className='status '+(kind||''); }
function openBackup(){
  openBottom('<div class="form-h">Copia de seguridad</div>'+
    '<div class="cl-hint">Tus datos (horario, agenda y clase) se guardan solo en este móvil. Haz una copia para no perderlos si cambias de teléfono o borras la app.</div>'+
    '<button class="btn primary block" id="bk_exp">💾 Guardar copia (descargar)</button>'+
    '<label class="btn ghost block imp">📂 Restaurar una copia<input id="bk_imp" type="file" accept=".json,application/json" hidden></label>'+
    '<div class="status" id="bk_st" hidden></div>'+
    '<div class="form-actions" style="margin-top:14px"><button class="btn ghost" id="bk_cl">Cerrar</button></div>', false);
  const b=$('#sheetBody');
  $('#bk_cl',b).onclick=closeSheet;
  $('#bk_exp',b).onclick=()=>{ try{
    const blob=new Blob([JSON.stringify(appBackup(),null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download='SuperProfe-copia.json'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),2000); bkStatus(b,'✓ Copia descargada. Guárdala en un lugar seguro (Drive, correo…).','ok');
  }catch(e){ bkStatus(b,'✗ No se pudo crear la copia.','err'); } };
  $('#bk_imp',b).onchange=async e=>{ const f=e.target.files[0]; if(!f)return; try{
    const o=JSON.parse(await f.text()); if(!o||o._app!=='Super Profe') throw 0;
    BK_KEYS.forEach(k=>{ if(o[k]!=null)localStorage.setItem(k,o[k]); });
    bkStatus(b,'✓ Copia restaurada. Recargando…','ok'); setTimeout(()=>location.reload(),700);
  }catch(err){ bkStatus(b,'✗ Ese archivo no es una copia válida de Super Profe.','err'); } };
}
function openIdentity(){
  const ops=(D.profesores||[]).map(p=>'<option value="'+escapeHtml(p)+'"'+(p===SET.profe?' selected':'')+'>'+escapeHtml(p)+'</option>').join('');
  const curWk=weekLetter(new Date());
  const html='<div class="form-h">Tu identidad</div>'+
    '<label class="fl">Tu nombre<input id="i_nom" type="text" value="'+escapeHtml(SET.nombre)+'" placeholder="Tu nombre"></label>'+
    '<label class="fl">Especialidad o rol<input id="i_esp" type="text" value="'+escapeHtml(SET.especialidad)+'" placeholder="Ej.: Tutora de 3.º"></label>'+
    '<label class="fl">¿Qué profe eres? <span class="opt">(para tu horario)</span><select id="i_pro">'+ops+'</select></label>'+
    '<label class="fl">Próximas vacaciones <span class="opt">(opcional)</span><input id="i_vac" type="date" value="'+(SET.vacaciones||'')+'"></label>'+
    '<div class="fl">¿Qué semana es esta? <span class="opt">(para el A/B del horario)</span></div>'+
    '<div class="tchips" id="i_wk">'+
      '<button type="button" class="tchip" data-wk="A" aria-pressed="'+(curWk==='A')+'" style="--cb:var(--sky-bg);--ci:#2f5686">Semana A</button>'+
      '<button type="button" class="tchip" data-wk="B" aria-pressed="'+(curWk==='B')+'" style="--cb:var(--sky-bg);--ci:#2f5686">Semana B</button>'+
    '</div>'+
    '<div class="form-actions"><button class="btn ghost" id="i_can">Cancelar</button><button class="btn primary" id="i_ok">Guardar</button></div>';
  openBottom(html,false);
  const b=$('#sheetBody');
  let selWk=curWk;
  b.querySelectorAll('#i_wk .tchip').forEach(btn=>btn.onclick=()=>{ selWk=btn.dataset.wk; b.querySelectorAll('#i_wk .tchip').forEach(x=>x.setAttribute('aria-pressed', x===btn)); });
  $('#i_can',b).onclick=closeSheet;
  $('#i_ok',b).onclick=()=>{ SET.nombre=$('#i_nom',b).value.trim()||'Profe'; SET.especialidad=$('#i_esp',b).value.trim(); SET.profe=$('#i_pro',b).value; SET.vacaciones=$('#i_vac',b).value;
    const mo=mondayOf(new Date()); if(selWk==='B') mo.setDate(mo.getDate()-7); SET.refA=isoOf(mo);
    saveSet(); closeSheet(); render(); };
}

function renderGeneral(app){
  const head = el('header','app-hd');
  head.innerHTML =
    '<div class="brandrow"><h1 class="title">Horario <em>general</em></h1><span class="yr">CURSO 2025·26</span></div>'+
    '<p class="sub" id="centro"></p>'+
    '<div class="seg" role="tablist" aria-label="Ver por">'+
      '<button role="tab" data-mode="aula" aria-selected="'+(st.mode==='aula')+'">Por curso</button>'+
      '<button role="tab" data-mode="prof" aria-selected="'+(st.mode==='prof')+'">Por profe</button>'+
    '</div>';
  app.appendChild(head);
  $('#centro',head).textContent = (D.centro||'').replace(' — curso 2025-2026','');

  const picker = el('div','picker'); picker.setAttribute('role','tablist'); picker.setAttribute('aria-label','Elegir'); app.appendChild(picker);
  const who = el('div','who-hd','<div><h2 class="who-name" id="whoName"></h2><p class="who-meta" id="whoMeta"></p></div>');
  app.appendChild(who);
  const wknav = el('div','wknav'); app.appendChild(wknav);
  const gridwrap = el('div','gridwrap'); app.appendChild(gridwrap);
  const tools = el('div','tools','<button class="tbtn" id="legBtn" aria-expanded="false"><span class="dot"></span>Asignaturas y colores</button>'); app.appendChild(tools);
  const legend = el('div','legend'); legend.innerHTML='<div class="legend-inner" id="legendInner"></div>'; app.appendChild(legend);
  app.appendChild(footNote());

  if(!list().includes(st.sel)) st.sel = list()[0];

  const drawPicker = () => {
    picker.innerHTML='';
    list().forEach(x=>{ const b=el('button','chip'); b.textContent=x; b.setAttribute('aria-pressed', x===st.sel);
      b.onclick=()=>{ st.sel=x; refresh(); }; picker.appendChild(b); });
    const cur=[...picker.children].find(c=>c.getAttribute('aria-pressed')==='true'); if(cur)cur.scrollIntoView({inline:'center',block:'nearest'});
  };
  const drawWho = () => {
    $('#whoName',who).textContent = st.sel;
    const m = $('#whoMeta',who);
    if(st.mode==='aula') m.innerHTML = 'Tutor/a: <b>'+(tutorOf(st.sel)||'—')+'</b> · 22,5 h lectivas';
    else { const au=aulaOfTutor(st.sel); m.innerHTML = (au?'Tutor/a de <b>'+au+'</b> · ':'Profesor/a · ')+fmtH(profHours(st.sel))+' h/sem'; }
  };
  const drawNav = () => {
    st.wk = weekLetter(st.weekMon);
    const q = hasQuincenal(st.mode,st.sel);
    const isThis = isoOf(st.weekMon)===isoOf(mondayOf(new Date()));
    let sub = isThis ? 'Esta semana' : '';
    if(q) sub += (sub?' · ':'')+'Semana '+st.wk;
    wknav.innerHTML =
      '<button class="wkn-arrow" id="wkPrev" aria-label="Semana anterior">‹</button>'+
      '<div class="wkn-mid"><div class="wkn-range">📅 '+weekRangeOf(st.weekMon)+'</div>'+
        '<div class="wkn-sub">'+(sub?'<span>'+sub+'</span>':'')+(!isThis?'<button class="wkn-hoy" id="wkHoy">Hoy ⟲</button>':'')+'</div></div>'+
      '<button class="wkn-arrow" id="wkNext" aria-label="Semana siguiente">›</button>';
    $('#wkPrev',wknav).onclick=()=>{ st.weekMon=addDays(st.weekMon,-7); drawNav(); drawGrid(); };
    $('#wkNext',wknav).onclick=()=>{ st.weekMon=addDays(st.weekMon,7);  drawNav(); drawGrid(); };
    const hoy=$('#wkHoy',wknav); if(hoy) hoy.onclick=()=>{ st.weekMon=mondayOf(new Date()); drawNav(); drawGrid(); };
  };
  const drawGrid = () => { gridwrap.innerHTML=''; gridwrap.appendChild(buildGrid(st.mode,st.sel,st.wk)); };
  const refresh = () => { drawPicker(); drawWho(); drawNav(); drawGrid(); };

  head.querySelectorAll('.seg button').forEach(b=>b.onclick=()=>{
    head.querySelectorAll('.seg button').forEach(x=>x.setAttribute('aria-selected', x===b));
    st.mode=b.dataset.mode; st.sel=list()[0]; refresh();
  });
  const legBtn=$('#legBtn',tools);
  legBtn.onclick=()=>{ const o=legend.classList.toggle('open'); legBtn.setAttribute('aria-expanded',o); if(o)drawLegend(); };
  function drawLegend(){
    const codes=new Set();
    D.aulas.forEach(a=>['A','B'].forEach(w=>Object.values(D.aula[a][w]).forEach(v=>codes.add(v.ar))));
    let h='<h3>Asignaturas del centro</h3>';
    [...codes].sort((x,y)=>ar(x).name.localeCompare(ar(y).name)).forEach(code=>{ const a=ar(code);
      h+='<div class="legrow"><span class="legsw" style="background:'+a.bg+'"></span><div><b>'+a.name+'</b> <span>('+code+')</span></div></div>'; });
    $('#legendInner',legend).innerHTML=h;
  }
  refresh();
}

function buildLoad(box){
  box.innerHTML =
    '<label class="drop" id="drop" tabindex="0" role="button" aria-label="Agregar archivo">'+
      '<input type="file" id="file" accept=".xlsx,.xls,.json" hidden>'+
      '<span class="clip">'+CLIP_SVG+'</span>'+
      '<span class="drop-t">Agregar archivo</span>'+
      '<span class="drop-s">Toca para elegir el Excel (.xlsx) del horario del centro</span>'+
    '</label>'+
    '<div class="status" id="status" hidden></div>'+
    '<div class="loadinfo">'+
      '<div class="li"><b>1.</b> En el ordenador, genera el horario (archivo Excel).</div>'+
      '<div class="li"><b>2.</b> Envíatelo al móvil (WhatsApp, correo, Drive…).</div>'+
      '<div class="li"><b>3.</b> Ábrelo aquí con <b>Agregar archivo</b>.</div>'+
    '</div>'+
    (usingCustom() ? '<button class="btn ghost block" id="reset">Volver al horario original</button>' : '');
  const file = $('#file',box);
  const drop = $('#drop',box);
  drop.onkeydown = e => { if(e.key==='Enter'||e.key===' '){ e.preventDefault(); file.click(); } };
  file.onchange = e => { if(e.target.files[0]) handleFile(e.target.files[0]); };
  const rb = $('#reset',box); if(rb) rb.onclick = resetData;
  if(usingCustom()) setStatus('Horario cargado: '+D.aulas.length+' aulas.', 'ok');
}
function setStatus(msg,kind){ const s=$('#status'); if(!s)return; s.hidden=false; s.textContent=msg; s.className='status '+(kind||''); }

// ---------- importar Excel / JSON ----------
const _t = v => v==null ? '' : String(v);
function parseAulaCell(raw){
  const v = _t(raw).trim();
  if(!v || v==='—' || v==='-') return {free:true};
  if(v.indexOf('RECREO')>=0 || v.indexOf('🍎')>=0) return {recreo:true};
  if(/^A\s*:/.test(v)){
    let A=null, B=null;
    v.split('\n').forEach(ln=>{ const m=ln.match(/^([AB])\s*:\s*(\S+)\s*\(([^)]*)\)/); if(m){ const o={ar:m[2].trim(),pr:m[3].trim()}; if(m[1]==='A')A=o; else B=o; } });
    return {A,B};
  }
  const area = v.split('\n')[0].trim();
  const m = v.match(/\(([^)]*)\)/);
  const o = {ar:area, pr:m?m[1].trim():''};
  return {A:o, B:Object.assign({},o)};
}
function buildFromWorkbook(wb){
  const byIni = {'9:00':1,'10:00':2,'11:00':3,'12:15':5,'13:15':6};
  const aula = {}, aulas = [];
  wb.SheetNames.forEach(sn=>{
    const ws = wb.Sheets[sn];
    const a1 = _t(ws['A1'] && ws['A1'].v);
    if(!/^AULA\s/i.test(a1)) return;
    const name = sn.trim();
    const range = XLSX.utils.decode_range(ws['!ref']);
    let headRow=-1; const dayCols={};
    for(let r=range.s.r; r<=range.e.r; r++){
      const c0 = ws[XLSX.utils.encode_cell({r,c:0})];
      if(c0 && _t(c0.v).toUpperCase()==='HORA'){ headRow=r;
        for(let c=1;c<=range.e.c;c++){ const cc=ws[XLSX.utils.encode_cell({r,c})]; const idx=['L','M','X','J','V'].indexOf(_t(cc&&cc.v).trim().toUpperCase()); if(idx>=0)dayCols[idx]=c; }
        break; }
    }
    if(headRow<0) return;
    const box = {A:{}, B:{}};
    for(let r=headRow+1; r<=range.e.r; r++){
      const c0 = ws[XLSX.utils.encode_cell({r,c:0})];
      const ini = _t(c0&&c0.v).split('-')[0].trim();
      const sid = byIni[ini]; if(!sid) continue;
      for(let d=0; d<5; d++){ const col=dayCols[d]; if(col==null) continue;
        const cell = ws[XLSX.utils.encode_cell({r,c:col})];
        const p = parseAulaCell(cell && cell.v);
        if(p.free || p.recreo) continue;
        const key = d+'-'+sid;
        if(p.A) box.A[key]=p.A;
        if(p.B) box.B[key]=p.B;
      }
    }
    aula[name]=box; aulas.push(name);
  });
  if(!aulas.length) throw new Error('No encontré hojas de aula (la celda A1 debe empezar por "AULA …"). ¿Es el Excel de horarios?');
  const CAN=['INF3','INF4','INF5','1º','2º','3º','4º','5º','6º'];
  aulas.sort((x,y)=>{ const ix=CAN.indexOf(x), iy=CAN.indexOf(y); if(ix<0&&iy<0)return x.localeCompare(y,'es'); if(ix<0)return 1; if(iy<0)return -1; return ix-iy; });

  const prof={}, profset=new Set(), count={};
  aulas.forEach(a=>{ count[a]={};
    ['A','B'].forEach(w=>{ const box=aula[a][w]; for(const k in box){ const e=box[k]; const pr=e.pr; if(!pr)continue;
      profset.add(pr); if(!prof[pr])prof[pr]={A:{},B:{}}; prof[pr][w][k]={au:a, ar:e.ar};
      if(w==='A') count[a][pr]=(count[a][pr]||0)+1; } }); });
  // Tutor/a: el Excel no lo guarda. Respetamos el tutor conocido del centro; si el aula
  // es nueva (otro centro), lo estimamos por quién imparte más sesiones en ella.
  const tutores={};
  aulas.forEach(a=>{
    if(DEFAULT.tutores && DEFAULT.tutores[a]){ tutores[a]=DEFAULT.tutores[a]; return; }
    let best=null,bn=-1; for(const pr in count[a]){ if(count[a][pr]>bn){ bn=count[a][pr]; best=pr; } }
    if(best) tutores[a]=best;
  });
  // Orden de profes: respeta el orden conocido del centro y añade los nuevos al final.
  const known = (DEFAULT.profesores||[]).filter(p=>profset.has(p));
  const extra = [...profset].filter(p=>!known.includes(p)).sort((x,y)=>x.localeCompare(y,'es'));
  const profesores = known.concat(extra);

  let centro = DEFAULT.centro;
  const idx = wb.Sheets['ÍNDICE'] || wb.Sheets['INDICE'];
  if(idx && idx['A1']) centro = _t(idx['A1'].v);

  return {centro, dias:DEFAULT.dias, sesiones:DEFAULT.sesiones, sesid:DEFAULT.sesid, aulas, profesores, tutores, aula, prof};
}
function validData(x){ return x && x.aula && x.prof && Array.isArray(x.aulas) && x.aulas.length && Array.isArray(x.sesiones); }

async function handleFile(file){
  setStatus('Leyendo «'+file.name+'»…');
  try{
    let nd;
    if(/\.json$/i.test(file.name)){
      nd = JSON.parse(await file.text());
      if(!validData(nd)) throw new Error('El JSON no tiene el formato de horario esperado.');
    } else {
      if(typeof XLSX==='undefined') throw new Error('No se pudo cargar el lector de Excel.');
      nd = buildFromWorkbook(XLSX.read(await file.arrayBuffer(), {type:'array'}));
      if(!validData(nd)) throw new Error('No pude leer el horario del Excel.');
    }
    localStorage.setItem('horario_data', JSON.stringify(nd));
    D = nd; st.sel = D.aulas[0];
    render(); // reconstruye la pestaña Cargar (con botón de reset)
    setStatus('✓ Horario cargado: '+nd.aulas.length+' aulas y '+nd.profesores.length+' profesores. Míralo en «General» o «Mi horario».', 'ok');
  }catch(err){
    setStatus('✗ '+(err && err.message || 'No se pudo leer el archivo.'), 'err');
  }
}
function resetData(){ localStorage.removeItem('horario_data'); D=DEFAULT; st.sel=D.aulas[0]; render(); setStatus('✓ Horario original restaurado.', 'ok'); }

// ---------- agenda (notas, exámenes, tareas, citas, actividades) ----------
const TIPOS = {
  examen:   {label:'Examen',    emoji:'📝', bg:'#fbe0d8', ink:'#a4402c'},
  tarea:    {label:'Tarea',     emoji:'✅', bg:'#dbe6f4', ink:'#2f5686'},
  nota:     {label:'Nota',      emoji:'🗒️', bg:'#f6eccb', ink:'#7a5a17'},
  cita:     {label:'Cita',      emoji:'📌', bg:'#d6ebe4', ink:'#1f5f52'},
  actividad:{label:'Actividad', emoji:'🎨', bg:'#e7dff0', ink:'#5a3f83'},
};
const TIPO_ORDER = ['examen','tarea','nota','cita','actividad'];
let AG = (()=>{ try{ return JSON.parse(localStorage.getItem('agenda_items')||'[]'); }catch(e){ return []; } })();
const saveAgenda = () => { try{ localStorage.setItem('agenda_items', JSON.stringify(AG)); }catch(e){} };
const escapeHtml = s => String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const pad2 = n => String(n).padStart(2,'0');
const keyDate = it => new Date(it.fecha+'T'+(it.hora||'00:00')).getTime();
// casillas del horario con un examen/tarea marcado, por área+día+aula.
// Si se pasa el lunes de la semana vista, solo cuenta lo que cae ESA semana (L-V); si no, todo lo futuro.
function cellMarkKeys(weekMon){
  let lo=-Infinity, hi=Infinity; const t0=startToday();
  if(weekMon){ lo=weekMon.getTime(); const fri=addDays(weekMon,4); hi=new Date(fri.getFullYear(),fri.getMonth(),fri.getDate(),23,59,59).getTime(); }
  const s=new Set();
  AG.forEach(it=>{ if(!it.ref)return; const k=keyDate(it); if(k<lo||k>hi)return; if(!weekMon && k<t0)return; s.add(it.ref.ar+'|'+it.ref.d+'|'+it.ref.aula); });
  return s;
}
function diaRelativo(fecha){
  const [Y,M,D]=fecha.split('-').map(Number); const dt=new Date(Y,M-1,D);
  const n=new Date(); const t0=new Date(n.getFullYear(),n.getMonth(),n.getDate());
  const diff=Math.round((dt-t0)/86400000);
  if(diff===0)return 'Hoy'; if(diff===1)return 'Mañana'; if(diff===-1)return 'Ayer';
  const s=dt.toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'});
  return s.charAt(0).toUpperCase()+s.slice(1);
}

const MESES=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
function renderAgenda(app){
  if(!st.agView) st.agView='lista';
  const prox=AG.filter(i=>keyDate(i)>=startToday());
  const head=el('header','app-hd',
    '<div class="brandrow"><h1 class="title">Mi <em>agenda</em></h1>'+(prox.length?'<span class="yr">'+prox.length+' PRÓX.</span>':'')+'</div>'+
    '<p class="sub">Exámenes, tareas, notas, citas y actividades — con aviso el día antes y 1 h antes.</p>');
  app.appendChild(head);
  const add=el('button','ag-new','＋ Nueva entrada'); add.onclick=()=>openForm(); app.appendChild(add);
  const seg=el('div','seg clseg','<button data-v="lista" aria-selected="'+(st.agView!=='mes')+'">🗓️ Lista</button><button data-v="mes" aria-selected="'+(st.agView==='mes')+'">📅 Mes</button>');
  app.appendChild(seg);
  seg.querySelectorAll('button').forEach(b=>b.onclick=()=>{ st.agView=b.dataset.v; render(); });
  if(st.agView==='mes') renderAgendaMes(app); else renderAgendaLista(app);
}
function wireAgCards(root){
  root.querySelectorAll('.ag-card').forEach(c=>{
    const it=AG.find(x=>x.id===c.dataset.id); if(!it)return;
    const cal=c.querySelector('.ag-ic.cal'); if(cal)cal.onclick=e=>{ e.stopPropagation(); downloadICS(it); };
    c.onclick=()=>openForm(it);
    c.onkeydown=e=>{ if(e.key==='Enter'){ openForm(it); } };
  });
}
function renderAgendaLista(app){
  const t0=startToday();
  const items=AG.slice().sort((a,b)=>keyDate(a)-keyDate(b));
  const prox=items.filter(i=>keyDate(i)>=t0);
  const pasados=items.filter(i=>keyDate(i)<t0).reverse();
  const wrap=el('div','ag-list'); app.appendChild(wrap);
  if(!items.length){ wrap.appendChild(el('div','ag-empty','Aún no hay nada anotado.<br>Toca «Nueva entrada» para tu primer examen, tarea o cita.')); return; }
  const section=(titulo, arr, past)=>{
    if(!arr.length)return;
    let cur=null, html='';
    arr.forEach(it=>{ if(it.fecha!==cur){ cur=it.fecha; html+='<div class="ag-day">'+diaRelativo(it.fecha)+'</div>'; } html+=agCard(it); });
    wrap.appendChild(el('div','ag-sec'+(past?' past':''), '<div class="ag-sec-h">'+titulo+'</div>'+html));
  };
  section('Próximos', prox, false);
  section('Pasados', pasados, true);
  wireAgCards(wrap);
  app.appendChild(el('footer','foot','<div><b>Los avisos</b> se guardan en el Calendario del móvil: al tocar 📅 se abre para «añadir» y el teléfono te avisa el día antes y 1 h antes.</div>'));
}
function renderAgendaMes(app){
  if(!st.agMonth) st.agMonth=new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const y=st.agMonth.getFullYear(), m=st.agMonth.getMonth();
  const nav=el('div','wknav');
  nav.innerHTML='<button class="wkn-arrow" id="mPrev" aria-label="Mes anterior">‹</button>'+
    '<div class="wkn-mid"><div class="wkn-range">'+cap(MESES[m])+' '+y+'</div></div>'+
    '<button class="wkn-arrow" id="mNext" aria-label="Mes siguiente">›</button>';
  app.appendChild(nav);
  $('#mPrev',nav).onclick=()=>{ st.agMonth=new Date(y,m-1,1); render(); };
  $('#mNext',nav).onclick=()=>{ st.agMonth=new Date(y,m+1,1); render(); };
  const byDay={}; AG.forEach(it=>{ (byDay[it.fecha]=byDay[it.fecha]||[]).push(it); });
  const wrap=el('div','mcal-wrap'); app.appendChild(wrap);
  const chead=el('div','mcal-head'); ['L','M','X','J','V','S','D'].forEach(d=>chead.appendChild(el('span',null,d))); wrap.appendChild(chead);
  const grid=el('div','mcal'); wrap.appendChild(grid);
  const lead=(new Date(y,m,1).getDay()+6)%7;
  const ndays=new Date(y,m+1,0).getDate();
  const todayIso=isoOf(new Date());
  for(let i=0;i<lead;i++) grid.appendChild(el('div','mcal-cell blank'));
  for(let dd=1; dd<=ndays; dd++){
    const iso=y+'-'+pad2(m+1)+'-'+pad2(dd);
    const evs=byDay[iso]||[];
    const cell=el('div','mcal-cell'+(iso===todayIso?' today':'')+(iso===st.agDay?' sel':''));
    let dots=''; evs.slice(0,4).forEach(it=>{ const tp=TIPOS[it.tipo]||TIPOS.nota; dots+='<span class="mcal-dot" style="background:'+tp.ink+'"></span>'; });
    cell.innerHTML='<span class="dn">'+dd+'</span>'+(dots?'<span class="mcal-dots">'+dots+'</span>':'');
    cell.onclick=()=>{ const was=st.agDay===iso; grid.querySelectorAll('.mcal-cell.sel').forEach(x=>x.classList.remove('sel')); st.agDay=was?null:iso; if(!was)cell.classList.add('sel'); paintDetail(); };
    grid.appendChild(cell);
  }
  const detail=el('div','mcal-day'); app.appendChild(detail);
  function paintDetail(){
    detail.innerHTML='';
    if(!st.agDay){ detail.appendChild(el('div','cl-hint','Toca un día para ver lo que tienes. Los puntitos de color son tus entradas.')); return; }
    const evs=(byDay[st.agDay]||[]).slice().sort((a,b)=>keyDate(a)-keyDate(b));
    const dh=el('div','mcal-day-h'); dh.textContent=cap(diaRelativo(st.agDay)); detail.appendChild(dh);
    if(evs.length){ const listx=el('div','ag-list'); listx.innerHTML=evs.map(agCard).join(''); detail.appendChild(listx); wireAgCards(listx); }
    else detail.appendChild(el('div','ag-empty','No tienes nada este día.'));
    const addDay=el('button','btn ghost block','＋ Añadir algo ese día'); addDay.onclick=()=>openForm({fecha:st.agDay}); detail.appendChild(addDay);
  }
  paintDetail();
}
function agCard(it){
  const t=TIPOS[it.tipo]||TIPOS.nota;
  const when = it.hora ? it.hora+' h' : 'Todo el día';
  return '<div class="ag-card" data-id="'+it.id+'" tabindex="0" role="button">'+
    '<div class="ag-emoji" style="background:'+t.bg+'">'+t.emoji+'</div>'+
    '<div class="ag-cbody"><div class="ag-t">'+escapeHtml(it.titulo)+'</div>'+
      '<div class="ag-meta"><span class="ag-chip" style="background:'+t.bg+';color:'+t.ink+'">'+t.label+'</span> '+when+(it.avisar?' · 🔔':'')+'</div>'+
      (it.detalle?'<div class="ag-d">'+escapeHtml(it.detalle)+'</div>':'')+
    '</div>'+
    '<div class="ag-acts">'+(it.avisar?'<button class="ag-ic cal" aria-label="Añadir al calendario">📅</button>':'')+'</div>'+
  '</div>';
}

function openForm(item){
  const it = Object.assign({id:null,tipo:'examen',titulo:'',fecha:'',hora:'',detalle:'',avisar:true}, item||{});
  const chips = TIPO_ORDER.map(k=>'<button type="button" class="tchip" data-tipo="'+k+'" aria-pressed="'+(k===it.tipo)+'" style="--cb:'+TIPOS[k].bg+';--ci:'+TIPOS[k].ink+'">'+TIPOS[k].emoji+' '+TIPOS[k].label+'</button>').join('');
  const html =
    '<div class="form-h">'+(it.id?'Editar entrada':'Nueva entrada')+'</div>'+
    '<div class="tchips">'+chips+'</div>'+
    '<label class="fl">Título<input id="f_tit" type="text" placeholder="Ej.: Examen de Mates 5.º" value="'+escapeHtml(it.titulo)+'"></label>'+
    '<div class="frow"><label class="fl">Fecha<input id="f_fec" type="date" value="'+(it.fecha||'')+'"></label>'+
      '<label class="fl">Hora <span class="opt">(opcional)</span><input id="f_hor" type="time" value="'+(it.hora||'')+'"></label></div>'+
    '<label class="fl">Nota<textarea id="f_det" rows="2" placeholder="Detalles…">'+escapeHtml(it.detalle)+'</textarea></label>'+
    '<label class="chk"><input id="f_avi" type="checkbox"'+(it.avisar?' checked':'')+'> Avísame el día antes y 1 h antes</label>'+
    '<div class="form-actions">'+
      (it.id?'<button class="btn danger" id="f_del">Borrar</button>':'')+
      '<button class="btn ghost" id="f_can">Cancelar</button>'+
      '<button class="btn primary" id="f_ok">Guardar</button>'+
    '</div>';
  openBottom(html, false);
  const body=$('#sheetBody');
  let tipo=it.tipo;
  body.querySelectorAll('.tchip').forEach(b=>b.onclick=()=>{ tipo=b.dataset.tipo; body.querySelectorAll('.tchip').forEach(x=>x.setAttribute('aria-pressed', x===b)); });
  $('#f_can',body).onclick=closeSheet;
  const del=$('#f_del',body); if(del)del.onclick=()=>{ AG=AG.filter(x=>x.id!==it.id); saveAgenda(); closeSheet(); render(); };
  $('#f_ok',body).onclick=()=>{
    const titulo=$('#f_tit',body).value.trim();
    const fecha=$('#f_fec',body).value;
    if(!titulo){ $('#f_tit',body).focus(); return; }
    if(!fecha){ $('#f_fec',body).focus(); return; }
    const rec={ id: it.id || ('e'+Date.now()+Math.floor(Math.random()*1000)),
      tipo, titulo, fecha, hora:$('#f_hor',body).value, detalle:$('#f_det',body).value.trim(), avisar:$('#f_avi',body).checked };
    if(it.ref) rec.ref=it.ref;
    if(it.id){ AG[AG.findIndex(x=>x.id===it.id)]=rec; } else { AG.push(rec); }
    saveAgenda(); closeSheet(); render();
    if(rec.avisar) downloadICS(rec);
  };
}

// ---------- recordatorios: archivo .ics para el calendario del móvil ----------
function icsFold(line){ if(line.length<=73)return line; let out=line.slice(0,73), rest=line.slice(73); while(rest.length>72){ out+='\r\n '+rest.slice(0,72); rest=rest.slice(72); } return out+'\r\n '+rest; }
function icsFor(it){
  const esc=s=>String(s==null?'':s).replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\n/g,'\\n');
  const n=new Date();
  const stamp=n.getUTCFullYear()+pad2(n.getUTCMonth()+1)+pad2(n.getUTCDate())+'T'+pad2(n.getUTCHours())+pad2(n.getUTCMinutes())+pad2(n.getUTCSeconds())+'Z';
  const [Y,M,D]=it.fecha.split('-').map(Number);
  const t=TIPOS[it.tipo]||TIPOS.nota;
  const summary=esc(t.emoji+' '+(it.titulo||t.label));
  const L=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Horarios May//Agenda//ES','CALSCALE:GREGORIAN','BEGIN:VEVENT','UID:'+(it.id||('e'+stamp))+'@horarios-may','DTSTAMP:'+stamp];
  let alarms=[];
  if(it.hora){
    const [h,mi]=it.hora.split(':').map(Number);
    const end=new Date(Y,M-1,D,h,mi); end.setHours(end.getHours()+1);
    L.push('DTSTART:'+Y+pad2(M)+pad2(D)+'T'+pad2(h)+pad2(mi)+'00');
    L.push('DTEND:'+end.getFullYear()+pad2(end.getMonth()+1)+pad2(end.getDate())+'T'+pad2(end.getHours())+pad2(end.getMinutes())+'00');
    if(it.avisar) alarms=['-P1D','-PT1H'];
  } else {
    const nd=new Date(Y,M-1,D); nd.setDate(nd.getDate()+1);
    L.push('DTSTART;VALUE=DATE:'+Y+pad2(M)+pad2(D));
    L.push('DTEND;VALUE=DATE:'+nd.getFullYear()+pad2(nd.getMonth()+1)+pad2(nd.getDate()));
    if(it.avisar) alarms=['-PT15H'];
  }
  L.push('SUMMARY:'+summary);
  if(it.detalle) L.push('DESCRIPTION:'+esc(it.detalle));
  alarms.forEach(tr=>L.push('BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:'+summary,'TRIGGER:'+tr,'END:VALARM'));
  L.push('END:VEVENT','END:VCALENDAR');
  return L.map(icsFold).join('\r\n')+'\r\n';
}
function downloadICS(it){
  try{
    const blob=new Blob([icsFor(it)], {type:'text/calendar;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url;
    a.download=(it.titulo||'evento').replace(/[^\wáéíóúñÁÉÍÓÚÑ\- ]+/g,'').trim().replace(/\s+/g,'_').slice(0,40)+'.ics';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),2000);
  }catch(e){}
}

// ---------- navegación ----------
function setTab(tab){
  st.tab=tab;
  document.querySelectorAll('.nav button').forEach(b=>b.setAttribute('aria-current', b.dataset.tab===tab?'page':'false'));
  render();
}

// ---------- instalación (Android/Chrome) ----------
let deferredPrompt=null;
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone===true;
function showInstall(v){ const b=$('#installBanner'); if(b) b.hidden = !v || isStandalone(); }
window.addEventListener('beforeinstallprompt', e=>{ e.preventDefault(); deferredPrompt=e; showInstall(true); });
window.addEventListener('appinstalled', ()=>{ deferredPrompt=null; showInstall(false); });

// ---------- init ----------
document.querySelectorAll('.nav button').forEach(b=> b.onclick=()=>setTab(b.dataset.tab));
$('#scrim').onclick = closeSheet;
$('#sheetClose').onclick = closeSheet;
document.addEventListener('keydown', e=>{ if(e.key==='Escape') closeSheet(); });
const ib=$('#installBtn'); if(ib) ib.onclick=async()=>{ if(!deferredPrompt)return; deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt=null; showInstall(false); };
const ic=$('#installClose'); if(ic) ic.onclick=()=>showInstall(false);

setTab('inicio');

if('serviceWorker' in navigator){
  window.addEventListener('load', ()=> navigator.serviceWorker.register('./sw.js').catch(()=>{}));
}
