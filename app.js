'use strict';
/* Super Profe — PWA. Ve el horario por curso y por profe; carga un Excel para actualizarlo. */

// ---------- datos ----------
const DEFAULT = window.HORARIO_DEFAULT;
function loadData(){
  try{ const s = localStorage.getItem('horario_data'); if(s){ const d=JSON.parse(s); if(validData(d)) return d; } }catch(e){}
  return DEFAULT;
}
let D = loadData();
const usingCustom = () => { try{ const s=localStorage.getItem('horario_data'); return !!s && validData(JSON.parse(s)); }catch(e){ return false; } };

// ---------- identidad del profe (ajustes) ----------
const DEF_SETTINGS = { nombre:'May', especialidad:'Especialista de Matemáticas · 3.º y 4.º', profe:'May', vacaciones:'', refA:'2025-09-08', tema:'claro' };
let SET = (()=>{ try{ return Object.assign({}, DEF_SETTINGS, JSON.parse(localStorage.getItem('settings')||'{}')); }catch(e){ return Object.assign({}, DEF_SETTINGS); } })();
const saveSet = () => { try{ localStorage.setItem('settings', JSON.stringify(SET)); }catch(e){} };
function applyTheme(){ try{ const dark=SET.tema==='oscuro'; document.documentElement.setAttribute('data-theme', dark?'dark':''); const m=document.querySelector('meta[name="theme-color"]'); if(m)m.content=dark?'#191715':'#FBF7F1'; }catch(e){} }
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
      if(!c || c.free){ const fq=!!(c&&c.q); h+='<td class="cell free'+isT+(fq?' has-q':'')+'"><span class="cs">·</span>'+(fq?'<span class="qq">A/B</span>':'')+'</td>'; return; }
      const a = ar(c.ar);
      const cellAula = mode==='aula' ? sel : c.who;
      const marked = marks.has(c.ar+'|'+d+'|'+cellAula);
      h+='<td class="cell'+isT+(marked?' has-mark':'')+'" style="background:'+a.bg+';color:'+a.ink+'" data-d="'+d+'" data-s="'+s.id+'" '+
         'tabindex="0" role="button" aria-label="'+escapeHtml(a.name)+', '+escapeHtml(c.who)+(marked?', con examen o tarea marcada':'')+'">'+
         '<span class="cs">'+escapeHtml(a.short)+'</span><span class="cw">'+escapeHtml(c.who)+'</span>'+
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
        '</div><div><div class="sh-t1">'+escapeHtml(ax.name)+'</div><div class="sh-t2">'+escapeHtml(who)+'</div></div></div>';
    };
    html += mk('A',c.A)+mk('B',c.B);
  } else {
    let who;
    if(mode==='aula') who = 'con '+c.who+(tutorOf(sel)===c.who?' (tutor/a)':'');
    else              who = 'en '+c.who+(tutorOf(c.who)===sel?' (tu tutoría)':'');
    html += '<div class="sh-card"><div class="sh-dot" style="background:'+a.bg+';color:'+a.ink+'">'+escapeHtml(a.short.slice(0,3))+
      '</div><div><div class="sh-t1">'+escapeHtml(a.name)+'</div><div class="sh-t2">'+escapeHtml(who)+'</div></div></div>';
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
  const sb=$('#sheetBody'); sb.innerHTML = html; st.sheetDirty=false;
  sb.oninput=()=>{ st.sheetDirty=true; }; sb.onchange=()=>{ st.sheetDirty=true; };
  const cl = $('#sheetClose'); if(cl) cl.style.display = withClose ? '' : 'none';
  $('#scrim').classList.add('on'); $('#sheet').classList.add('on');
}
function closeSheet(){ st.sheetDirty=false; if(_tmrId){clearInterval(_tmrId);_tmrId=null;} $('#scrim').classList.remove('on'); $('#sheet').classList.remove('on'); }
function tryCloseSheet(){ if(st.sheetDirty && !confirm('¿Cerrar sin guardar? Se perderá lo que has escrito.'))return; closeSheet(); }
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
  if(SET.profe && D.prof && !D.prof[SET.profe]) app.appendChild(el('div','sp-note','⚠️ Tu horario cambió y «'+escapeHtml(SET.profe)+'» ya no aparece. Ve a «Más → Editar mi identidad» para elegir tu nombre.'));
  if(pinLegacy()){ const nb=el('div','sp-note','🔒 Novedad: los documentos de recogida ahora se guardan cifrados de verdad. Toca aquí e introduce tu PIN una vez para activarlo.'); nb.style.cursor='pointer'; nb.setAttribute('role','button'); nb.setAttribute('tabindex','0'); nb.onclick=()=>openPinGate(render); nb.onkeydown=e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); nb.onclick(); } }; app.appendChild(nb); }
  app.appendChild(el('div','sp-sec','De un vistazo'));
  const wrap = el('div','sp-wrap'); app.appendChild(wrap);
  wrap.appendChild(cardAhora(me));
  const px = proximos();
  wrap.appendChild(cardExamen(px.examen));
  if(px.otro) wrap.appendChild(cardTarea(px.otro));
  const bd = cumpleAlertas(); if(bd.length) wrap.appendChild(cardCumple(bd));
  const t = todayIdx();
  app.appendChild(el('div','sp-sec', t>=0 ? 'Tus clases de hoy' : 'Tus clases del lunes'));
  app.appendChild(listaHoy(me));
}
function toMin(h){ const [a,b]=h.split(':').map(Number); return a*60+b; }
function fraseDelDia(){ const f=['Hoy va a ser un buen día ✨','Vas a hacerlo genial 💪','Un día más, ¡sonríe! 😊','¡A por el día! 🌟','Paso a paso se llega lejos 🌱']; return f[(new Date().getDate())%f.length]; }
function chipHoy(){ const d=new Date(); const dl=['domingo','lunes','martes','miércoles','jueves','viernes','sábado'][d.getDay()]; const mo=d.toLocaleDateString('es-ES',{month:'short'}).replace('.',''); return '<span class="sp-pill">'+cap(dl)+' '+d.getDate()+' '+mo+' · Sem. '+weekLetter(d)+'</span>'; }
function daysUntil(f){ if(!f)return null; const [Y,M,Dp]=f.split('-').map(Number); const dt=new Date(Y,M-1,Dp); const n=new Date(); const t0=new Date(n.getFullYear(),n.getMonth(),n.getDate()); return Math.round((dt-t0)/86400000); }
function vacacChip(){ if(!SET.vacaciones)return ''; const n=daysUntil(SET.vacaciones); if(n==null||n<0)return ''; return '<span class="sp-pill sun">🏖️ '+(n===0?'¡hoy vacaciones!':(n+' días para las vacaciones'))+'</span>'; }
function mondayFirst(me,wk){ wk=wk||'A'; const box=me?D.prof[me]:null; if(!box)return ''; for(const s of D.sesiones){ if(s.recreo)continue; const e=box[wk]['0-'+s.id]; if(e){ return ar(e.ar).short+' · '+e.au+' · '+s.ini; } } return ''; }
function cardAhora(me){
  const c=el('div','card now'); const t=todayIdx(); const box=me?D.prof[me]:null;
  let k='Ahora', ttl='', sub='', next='';
  if(t<0){ k='Fin de semana'; ttl='¡A descansar! ☺'; const mf=mondayFirst(me, weekLetter(addDays(mondayOf(new Date()),7))); sub = mf?('El lunes empiezas con '+mf):'Nos vemos el lunes'; }
  else if(!box){ ttl='Sin horario'; sub='Cárgalo en «Más» → Horario'; }
  else{
    const wk=weekLetter(new Date());
    const d=new Date(); const nowM=d.getHours()*60+d.getMinutes();
    const blocks=D.sesiones.map(s=>({s,ini:toMin(s.ini),fin:toMin(s.fin),rec:s.recreo,e:s.recreo?null:box[wk][t+'-'+s.id]}));
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
function cardCumple(lista){
  const n=lista[0], dd=n.dd, mas=lista.length-1;
  const c=el('div','card bday-card tap');
  const num=dd===0?'🎉':dd, lab=dd===0?'HOY':(dd===1?'MAÑANA':'DÍAS');
  const sub=(dd<=1?'¡Prepara la fiesta! 🎉':'Cumple pronto')+' · '+escapeHtml(n.grupo)+(mas>0?(' · +'+mas+' esta semana'):'');
  c.innerHTML='<div class="hdrow"><div class="emoji" style="background:#ffe1ef">🎂</div><div><div class="k" style="color:#c0417f">Cumpleaños</div><div class="ttl">'+escapeHtml(n.nombre)+'</div><div class="sub2">'+sub+'</div></div><div class="cd bday"><b>'+num+'</b><span>'+lab+'</span></div></div>';
  c.onclick=()=>{ st.grupo=n.grupo; st.alumno=n.id; st.claseView='alumnos'; setTab('clase'); };
  return c;
}
function listaHoy(me){ const wrap=el('div','today-list'); const t=todayIdx(); const day=t>=0?t:0; const box=me?D.prof[me]:null;
  if(!box){ wrap.appendChild(el('div','empty','Carga tu horario en «Más» para ver tus clases.')); return wrap; }
  const wk=weekLetter(t>=0 ? new Date() : addDays(mondayOf(new Date()),7));
  const has=D.sesiones.some(s=>!s.recreo&&box[wk][day+'-'+s.id]);
  if(!has){ wrap.appendChild(el('div','empty', t>=0?'Hoy no tienes clase 🎉':'Sin clases asignadas.')); return wrap; }
  D.sesiones.forEach(s=>{ if(s.recreo){ wrap.appendChild(el('div','tl rec','<span class="h">'+s.ini+'</span><span class="n">🍎 Recreo</span>')); return; } const e=box[wk][day+'-'+s.id]; if(!e)return; const a=ar(e.ar); wrap.appendChild(el('div','tl','<span class="h">'+s.ini+'</span><span class="sw" style="background:'+a.bg+'"></span><span class="n">'+escapeHtml(a.short)+' · '+escapeHtml(e.au)+'</span>')); });
  return wrap;
}
/* ==================== Módulo "Mi clase" (Fase 3.3) ==================== */
const DEF_CLASE = { grupos:[], alumnos:{}, asig:{}, deberes:{}, salidas:{} };
let CL = (()=>{ try{ return Object.assign({}, DEF_CLASE, JSON.parse(localStorage.getItem('clase_data')||'{}')); }catch(e){ return JSON.parse(JSON.stringify(DEF_CLASE)); } })();
let _saveWarnT=0;
function saveCL(){ try{ localStorage.setItem('clase_data', clSerialize()); return true; }
  catch(e){ const now=Date.now(); if(now-_saveWarnT>1500){ _saveWarnT=now; alert('No se ha podido guardar: el almacenamiento del móvil está lleno. Borra alguna foto del DNI para hacer sitio.'); } return false; } }
st.claseView = 'alumnos';   // alumnos | deberes | salidas
st.alumno = null;           // id del alumno abierto (pantalla de detalle)
st.docsUnlocked = false;    // PIN de documentos desbloqueado en esta sesión
st.cryptoKey = null;        // clave AES-GCM derivada del PIN (solo en memoria, esta sesión)
st.evalTab = '1';           // pestaña de evaluación activa en el cuaderno (1|2|3|final)
function clGrupo(){ if(!CL.grupos.length) return null; if(!CL.grupos.includes(st.grupo)) st.grupo = CL.grupos[0]; return st.grupo; }
const alumnosDe = g => (CL.alumnos[g] = CL.alumnos[g] || []);
const asigDe    = g => (CL.asig[g]    = CL.asig[g]    || []);
const deberesDe = g => (CL.deberes[g] = CL.deberes[g] || []);
const salidasDe = g => (CL.salidas[g] = CL.salidas[g] || []);
const findAl = (g,id) => alumnosDe(g).find(a=>a.id===id);
const nid = p => p+Date.now().toString(36)+Math.floor(Math.random()*1e4).toString(36);
function nnum(v){ v=String(v==null?'':v).trim().replace(',','.'); if(v==='')return null; const n=parseFloat(v); return isFinite(n)?n:null; }
function fmtNota(n){ return n==null?'—':String(n).replace('.',','); }
// ---- cuaderno de notas v2: evaluaciones + baremos ponderados ----
const BAREMOS_DEF = [ {nombre:'Exámenes',peso:70}, {nombre:'Trabajos',peso:20}, {nombre:'Comportamiento',peso:10} ];
function baremosDe(g,as){ CL.baremos=CL.baremos||{}; CL.baremos[g]=CL.baremos[g]||{}; if(!CL.baremos[g][as])CL.baremos[g][as]=BAREMOS_DEF.map(b=>({id:nid('b'),nombre:b.nombre,peso:b.peso})); return CL.baremos[g][as]; }
function notaAsig(al,g,as){ al.notas=al.notas||{}; let na=al.notas[as];
  if(na && !na.ev){ // migración del modelo viejo {ex,t1,t2,gen} sin perder números
    const viejo=['ex','t1','t2','gen'].map(k=>na[k]).filter(v=>v!=null && String(v).trim()!==''); na={ev:{}}; al.notas[as]=na;
    if(viejo.length){ const bid=baremosDe(g,as)[0].id; na.ev['1']={}; na.ev['1'][bid]=viejo.map(String); } }
  if(!na){ na={ev:{}}; al.notas[as]=na; } na.ev=na.ev||{}; return na; }
function gradesOf(na,ev,bid){ na.ev[ev]=na.ev[ev]||{}; na.ev[ev][bid]=na.ev[ev][bid]||[]; return na.ev[ev][bid]; }
function mediaLista(arr){ const xs=(arr||[]).map(nnum).filter(n=>n!=null); if(!xs.length)return null; return Math.round(xs.reduce((a,b)=>a+b,0)/xs.length*100)/100; }
function notaEval(al,g,as,ev){ const bars=baremosDe(g,as), na=notaAsig(al,g,as); let sw=0,acc=0;
  bars.forEach(b=>{ const m=mediaLista(gradesOf(na,ev,b.id)); const p=Number(b.peso)||0; if(m!=null&&p>0){ acc+=m*p; sw+=p; } });
  return sw>0 ? Math.round(acc/sw*100)/100 : null; }
function notaFinal(al,g,as){ const xs=['1','2','3'].map(ev=>notaEval(al,g,as,ev)).filter(n=>n!=null); if(!xs.length)return null; return Math.round(xs.reduce((a,b)=>a+b,0)/xs.length*100)/100; }
function cumpleDias(iso){ if(!iso)return null; const p=String(iso).split('-').map(Number); const m=p[1],d=p[2]; if(!m||!d)return null; const n=new Date(); const t0=new Date(n.getFullYear(),n.getMonth(),n.getDate()); const leap=y=>(y%4===0&&y%100!==0)||y%400===0; const mk=y=>new Date(y,m-1,(m===2&&d===29&&!leap(y))?28:d); let nx=mk(t0.getFullYear()); if(nx<t0)nx=mk(t0.getFullYear()+1); return Math.round((nx-t0)/86400000); }
function cumpleTxt(iso){ if(!iso)return ''; const p=String(iso).split('-').map(Number); const dt=new Date(2000,(p[1]||1)-1,p[2]||1); const s=dt.toLocaleDateString('es-ES',{day:'numeric',month:'short'}).replace('.',''); const dd=cumpleDias(iso); return '🎂 '+s+(dd!=null&&dd<=14?(dd===0?' · ¡hoy!':' · en '+dd+' d'):''); }
function fechaCortaISO(iso){ if(!iso)return ''; const p=String(iso).split('-').map(Number); const dt=new Date(p[0],(p[1]||1)-1,p[2]||1); return dt.toLocaleDateString('es-ES',{weekday:'short',day:'numeric',month:'short'}); }
function inicial(nombre){ return (String(nombre||'?').trim().charAt(0)||'?').toUpperCase(); }
function waShare(texto){ try{ window.open('https://wa.me/?text='+encodeURIComponent(texto),'_blank'); }catch(e){} }

// ---------- cumpleaños próximos (alerta en Inicio: 1 semana antes + día antes) ----------
function cumpleAlertas(){
  const out=[];
  (CL.grupos||[]).forEach(g=>{ alumnosDe(g).forEach(al=>{ const dd=cumpleDias(al.cumple); if(dd!=null && dd<=7){ out.push({nombre:al.nombre, grupo:g, id:al.id, dd:dd}); } }); });
  return out.sort((a,b)=>a.dd-b.dd);
}
// ---------- foto del DNI: comprimir para no llenar el móvil ----------
function comprimirFoto(file){
  return new Promise((res,rej)=>{
    if(!file){ res(''); return; }
    const fr=new FileReader();
    fr.onerror=()=>rej(fr.error||new Error('lectura'));
    fr.onload=()=>{ const img=new Image();
      img.onerror=()=>rej(new Error('imagen'));
      img.onload=()=>{ const M=900; let w=img.naturalWidth||img.width, h=img.naturalHeight||img.height;
        if(w>M||h>M){ const r=Math.min(M/w,M/h); w=Math.round(w*r); h=Math.round(h*r); }
        const cv=document.createElement('canvas'); cv.width=w; cv.height=h;
        cv.getContext('2d').drawImage(img,0,0,w,h);
        try{ res(cv.toDataURL('image/jpeg',0.6)); }catch(e){ rej(e); } };
      img.src=fr.result; };
    fr.readAsDataURL(file);
  });
}
// serializa la clase SIN el texto plano de los documentos de recogida cuando hay PIN
// (a disco solo va la versión cifrada `recEnc`; el texto plano vive solo en memoria)
function clSerialize(){ const strip=pinV2(); return JSON.stringify(CL, (k,v)=> (strip && k==='recogida') ? undefined : v); }
const saveCLsafe = saveCL;   // alias: ambos avisan si el móvil está lleno

// ---------- PIN + cifrado REAL de los documentos de recogida ----------
// Clave AES-GCM derivada del PIN con PBKDF2. Los familiares/DNI/fotos se guardan cifrados
// (`al.recEnc`); su texto plano (`al.recogida`) solo existe en memoria mientras está desbloqueado.
const PIN_CHK='superprofe-ok';
async function sha256(txt){ const b=new TextEncoder().encode(String(txt)); const h=await crypto.subtle.digest('SHA-256',b); return Array.from(new Uint8Array(h)).map(x=>x.toString(16).padStart(2,'0')).join(''); }
const hasCrypto = () => !!(window.crypto && window.crypto.subtle);
function pinIsSet(){ return !!SET.pinDocs; }
function pinV2(){ return !!SET.pinDocs && typeof SET.pinDocs==='object' && SET.pinDocs.v===2; }
function pinLegacy(){ return typeof SET.pinDocs==='string' && SET.pinDocs.length>0; }
function _b64enc(buf){ const b=new Uint8Array(buf); let s=''; const C=0x8000; for(let i=0;i<b.length;i+=C) s+=String.fromCharCode.apply(null,b.subarray(i,i+C)); return btoa(s); }
function _b64dec(str){ const bin=atob(str); const b=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) b[i]=bin.charCodeAt(i); return b; }
async function deriveKey(pin,salt,iter){ const base=await crypto.subtle.importKey('raw', new TextEncoder().encode(String(pin)), 'PBKDF2', false, ['deriveKey']); return crypto.subtle.deriveKey({name:'PBKDF2', salt, iterations:iter, hash:'SHA-256'}, base, {name:'AES-GCM', length:256}, false, ['encrypt','decrypt']); }
async function aesEncrypt(key,plainStr){ const iv=crypto.getRandomValues(new Uint8Array(12)); const ct=await crypto.subtle.encrypt({name:'AES-GCM', iv}, key, new TextEncoder().encode(plainStr)); return {iv:_b64enc(iv), ct:_b64enc(ct)}; }
async function aesDecrypt(key,obj){ const pt=await crypto.subtle.decrypt({name:'AES-GCM', iv:_b64dec(obj.iv)}, key, _b64dec(obj.ct)); return new TextDecoder().decode(pt); }
async function encryptRecogida(al){ if(!pinV2()||!st.cryptoKey)return; al.recEnc=await aesEncrypt(st.cryptoKey, JSON.stringify(al.recogida||[])); }
async function decryptAllRecogida(){ if(!st.cryptoKey)return; for(const g of (CL.grupos||[])) for(const al of alumnosDe(g)){ if(al.recEnc){ try{ al.recogida=JSON.parse(await aesDecrypt(st.cryptoKey, al.recEnc)); }catch(e){ al.recogida=Array.isArray(al.recogida)?al.recogida:[]; } } else if(!Array.isArray(al.recogida)) al.recogida=[]; } }
async function setNewPin(pin){
  if(!hasCrypto()) return false;
  const salt=crypto.getRandomValues(new Uint8Array(16)); const iter=150000;
  const key=await deriveKey(pin,salt,iter); const check=await aesEncrypt(key,PIN_CHK);
  const prevPin=SET.pinDocs, prevKey=st.cryptoKey, wasV2=pinV2();
  st.cryptoKey=key; SET.pinDocs={v:2, salt:_b64enc(salt), iter, check};
  for(const g of (CL.grupos||[])) for(const al of alumnosDe(g)){ if(!Array.isArray(al.recogida)) al.recogida=[]; await encryptRecogida(al); }
  // primero los DATOS cifrados a disco; el flag del PIN solo se persiste si los datos se guardaron
  if(!saveCLsafe()){
    SET.pinDocs=prevPin; st.cryptoKey=prevKey;
    for(const g of (CL.grupos||[])) for(const al of alumnosDe(g)){ if(wasV2 && prevKey){ await encryptRecogida(al); } else { delete al.recEnc; } }
    return false;
  }
  saveSet(); st.docsUnlocked=true; return true;
}
async function verifyAndUnlock(pin){
  if(pinV2()){
    const p=SET.pinDocs; let key; try{ key=await deriveKey(pin,_b64dec(p.salt),p.iter||150000); const dec=await aesDecrypt(key,p.check); if(dec!==PIN_CHK) return false; }catch(e){ return false; }
    st.cryptoKey=key; st.docsUnlocked=true; await decryptAllRecogida(); return true;
  }
  // legacy: devuelve true (migrado), false (PIN malo) o 'quota' (PIN correcto, no se pudo guardar)
  if(pinLegacy()){ try{ const h=await sha256(pin); if(h!==SET.pinDocs) return false; return (await setNewPin(pin)) ? true : 'quota'; }catch(e){ return false; } }
  return false;
}
async function removePin(){
  const prevPin=SET.pinDocs, prevKey=st.cryptoKey;
  for(const g of (CL.grupos||[])) for(const al of alumnosDe(g)){ if(!Array.isArray(al.recogida)) al.recogida=[]; delete al.recEnc; }
  SET.pinDocs=''; st.cryptoKey=null;
  // primero clase_data EN CLARO a disco; el flag solo si se guardó bien
  if(!saveCLsafe()){
    SET.pinDocs=prevPin; st.cryptoKey=prevKey;
    if(prevKey) for(const g of (CL.grupos||[])) for(const al of alumnosDe(g)) await encryptRecogida(al);
    return false;
  }
  saveSet(); st.docsUnlocked=true; return true;
}
function openPinGate(onOk){
  openBottom('<div class="form-h">🔒 Zona protegida</div>'+
    '<p class="cl-hint" style="margin:.1rem 0 .7rem">Introduce el PIN para ver los documentos de recogida (se guardan cifrados en tu móvil).</p>'+
    '<label class="fl">PIN<input id="pin_i" type="password" inputmode="numeric" maxlength="8" autocomplete="off" placeholder="••••"></label>'+
    '<div class="pin-err" id="pin_err"></div>'+
    '<div class="form-actions"><button class="btn ghost" id="pin_c">Cancelar</button><button class="btn primary" id="pin_ok">Entrar</button></div>', false);
  const b=$('#sheetBody'); const inp=$('#pin_i',b); setTimeout(()=>inp.focus(),60);
  $('#pin_c',b).onclick=closeSheet;
  const go=async()=>{ const ok=$('#pin_ok',b); if(ok.disabled)return; ok.disabled=true; let good=false; try{ good=await verifyAndUnlock(inp.value); }catch(e){}
    if(good===true){ closeSheet(); onOk&&onOk(); }
    else { $('#pin_err',b).textContent = good==='quota' ? 'El PIN es correcto, pero no se pudo activar el cifrado: el almacenamiento está lleno. Libera espacio e inténtalo otra vez.' : 'PIN incorrecto.'; if(good!=='quota')inp.value=''; inp.focus(); ok.disabled=false; } };
  $('#pin_ok',b).onclick=go; inp.onkeydown=e=>{ if(e.key==='Enter'){ e.preventDefault(); go(); } };
}
function openPinSet(onDone){
  if(!hasCrypto()){ alert('Este navegador no permite el cifrado seguro (hace falta una conexión segura, https).'); return; }
  const tiene=pinIsSet();
  openBottom('<div class="form-h">'+(tiene?'Cambiar o quitar PIN':'Proteger con PIN')+'</div>'+
    '<p class="cl-hint" style="margin:.1rem 0 .7rem">Un PIN de 4 dígitos <b>cifra</b> los documentos de recogida (DNI y fotos) en tu móvil: solo se ven con el PIN. ⚠️ Si lo olvidas, no se podrán recuperar.</p>'+
    (tiene?'<label class="fl">PIN actual<input id="p_old" type="password" inputmode="numeric" maxlength="8" autocomplete="off"></label>':'')+
    '<label class="fl">Nuevo PIN (4 dígitos)<input id="p_new" type="password" inputmode="numeric" maxlength="8" autocomplete="off" placeholder="••••"></label>'+
    '<div class="pin-err" id="p_err"></div>'+
    '<div class="form-actions">'+(tiene?'<button class="btn danger" id="p_del">Quitar PIN</button>':'')+'<button class="btn ghost" id="p_c">Cancelar</button><button class="btn primary" id="p_ok">Guardar</button></div>', false);
  const b=$('#sheetBody'); $('#p_c',b).onclick=closeSheet; const err=m=>{ $('#p_err',b).textContent=m; };
  const chkOld=async()=>{ if(!tiene)return true; const ok=await verifyAndUnlock($('#p_old',b).value); if(ok!==true && ok!=='quota'){ err('El PIN actual no es correcto.'); return false; } return true; };
  const del=$('#p_del',b); if(del)del.onclick=async()=>{ if(!confirm('¿Quitar el PIN? Los documentos dejarán de estar cifrados.'))return; if(!(await chkOld()))return; if(await removePin()){ closeSheet(); onDone&&onDone(); } };
  $('#p_ok',b).onclick=async()=>{ if(!(await chkOld()))return; const nv=$('#p_new',b).value.trim(); if(!/^\d{4,8}$/.test(nv)){ err('El PIN debe tener entre 4 y 8 dígitos.'); return; } if(await setNewPin(nv)){ closeSheet(); onDone&&onDone(); } };
}
function openFoto(src){ openBottom('<div class="form-h">Foto del DNI</div><img class="doc-full" src="'+src+'" alt="DNI"><div class="form-actions"><button class="btn ghost" id="f_c">Cerrar</button></div>', true); $('#f_c',$('#sheetBody')).onclick=closeSheet; }

function renderClase(app){
  const g = clGrupo();
  if(g && st.alumno){ const al=findAl(g,st.alumno); if(al){ renderAlumnoDetail(app,g,al); return; } st.alumno=null; }

  const head = el('header','app-hd',
    '<div class="brandrow"><h1 class="title">Mi <em>clase</em></h1>'+(g?'<button class="yr yr-btn" id="grpEdit" aria-label="Editar grupo">'+escapeHtml(g)+' ⚙</button>':'')+'</div>'+
    '<p class="sub">Tus alumnos, sus notas y el día a día del aula.</p>');
  app.appendChild(head);
  const geb=$('#grpEdit',head); if(geb)geb.onclick=()=>groupEditForm(g);

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
    const sub=[ al.cumple?cumpleTxt(al.cumple):'', (al.faltas&&al.faltas.length)?('🚪 '+al.faltas.length+' falta'+(al.faltas.length>1?'s':'')):'', (al.alergias&&al.alergias.trim())?'⚠️ alergias':'' ].filter(Boolean).join(' · ');
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
  if(asigDe(g).length){ const imp=el('button','imp-notas','⬆ Importar notas desde Excel'); imp.onclick=()=>importNotasForm(g); app.appendChild(imp); }
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

  // campos nuevos (migración suave para alumnos antiguos)
  al.alergias=al.alergias||''; al.sitFam=al.sitFam||'sin'; al.sitFamNota=al.sitFamNota||''; al.faltas=al.faltas||[]; al.recogida=al.recogida||[]; al.obs=al.obs||'';

  // Aviso de alergias (rojo, bien visible para un sustituto)
  if(al.alergias.trim()) wrap.appendChild(el('div','al-alert','<span class="ic">⚠️</span><div><b>Alergias</b><span>'+escapeHtml(al.alergias)+'</span></div>'));

  // Comportamiento
  wrap.appendChild(el('div','sp-sec','Comportamiento'));
  const stats=el('div','cl-stats');
  stats.appendChild(statTile('pos','👍','Positivos',al.pos||0,()=>{al.pos=(al.pos||0)+1;},()=>{al.pos=Math.max(0,(al.pos||0)-1);}));
  stats.appendChild(statTile('neg','👎','Negativos',al.neg||0,()=>{al.neg=(al.neg||0)+1;},()=>{al.neg=Math.max(0,(al.neg||0)-1);}));
  wrap.appendChild(stats);

  // Datos del alumno: alergias + situación familiar
  wrap.appendChild(el('div','sp-sec','Datos del alumno'));
  const dc=el('div','mas-card');
  const laA=el('label','fl','Alergias <span class="opt">(si tiene)</span>');
  const inA=el('input'); inA.type='text'; inA.value=al.alergias; inA.placeholder='Ej.: frutos secos, lactosa…';
  inA.oninput=()=>{ al.alergias=inA.value; saveCL(); };
  laA.appendChild(inA); dc.appendChild(laA);
  const laS=el('label','fl','Situación familiar');
  const selS=el('select'); selS.innerHTML='<option value="sin">Sin observaciones</option><option value="particular">Situación particular</option>'; selS.value=al.sitFam;
  laS.appendChild(selS); dc.appendChild(laS);
  const noteW=el('label','fl'+(al.sitFam==='particular'?'':' hide'),'Nota <span class="opt">(privada, solo para el profe)</span>');
  const inN=el('textarea'); inN.rows=2; inN.value=al.sitFamNota; inN.placeholder='Detalle de la situación particular…';
  inN.oninput=()=>{ al.sitFamNota=inN.value; saveCL(); };
  noteW.appendChild(inN); dc.appendChild(noteW);
  selS.onchange=()=>{ al.sitFam=selS.value; saveCL(); noteW.classList.toggle('hide', selS.value!=='particular'); };
  wrap.appendChild(dc);

  // Cuaderno de notas (v2: evaluaciones + baremos ponderados)
  renderCuaderno(wrap,al,g);

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

  // Autorizaciones (faltas de asistencia + documentos de recogida con PIN)
  wrap.appendChild(el('div','sp-sec','Autorizaciones'));
  const faltas=al.faltas;
  const fcard=el('div','mas-card');
  const hoy=isoOf(new Date()); const yaHoy=faltas.includes(hoy);
  fcard.innerHTML='<div class="cl-row"><span class="ic">🚪</span><b>Faltas de asistencia</b><span class="cl-badge">'+faltas.length+'</span></div>';
  const fbtn=el('button','btn ghost block', yaHoy?'✓ Falta marcada hoy (quitar)':'Marcar falta de hoy');
  fbtn.onclick=()=>{ const i=faltas.indexOf(hoy); if(i>=0)faltas.splice(i,1); else faltas.push(hoy); saveCL(); render(); };
  fcard.appendChild(fbtn);
  if(faltas.length){ const fl=el('div','cl-faltas'); faltas.slice().sort().reverse().forEach(f=>{ const t=el('span','cl-ftag',fechaCortaISO(f)+' ✕'); t.onclick=()=>{ const i=faltas.indexOf(f); if(i>=0)faltas.splice(i,1); saveCL(); render(); }; fl.appendChild(t); }); fcard.appendChild(fl); }
  wrap.appendChild(fcard);
  // Documentos de recogida (protegidos por PIN)
  const dcard=el('div','mas-card');
  dcard.innerHTML='<div class="cl-row"><span class="ic">🪪</span><b>Quién puede recoger al niño</b>'+(SET.pinDocs?'<span class="cl-badge lock">🔒</span>':'')+'</div>';
  wrap.appendChild(dcard);
  const pintaDocs=()=>{
    Array.from(dcard.querySelectorAll('.docbody')).forEach(n=>n.remove());
    const body=el('div','docbody'); dcard.appendChild(body);
    const rec=al.recogida;
    if(!rec.length) body.appendChild(el('div','cl-hint','Nadie anotado todavía. Añade a los familiares autorizados con su DNI (y foto opcional).'));
    rec.forEach(r=>{
      const it=el('div','doc-item',
        (r.foto?'<img class="doc-th" src="'+r.foto+'" alt="DNI">':'<div class="doc-th none">🪪</div>')+
        '<div class="doc-b"><b>'+escapeHtml(r.nombre||'—')+'</b><span>'+escapeHtml([r.parentesco,r.dni].filter(Boolean).join(' · '))+'</span></div>'+
        '<button class="doc-x" aria-label="Editar familiar">✎</button>');
      it.querySelector('.doc-x').onclick=()=>recForm(g,al,r,pintaDocs);
      const th=it.querySelector('.doc-th'); if(r.foto&&th) th.onclick=()=>openFoto(r.foto);
      body.appendChild(it);
    });
    const add=el('button','btn ghost block','＋ Añadir familiar'); add.onclick=()=>recForm(g,al,null,pintaDocs); body.appendChild(add);
    const pinb=el('button','btn ghost block', SET.pinDocs?'🔒 Cambiar o quitar PIN':'🔒 Proteger con PIN'); pinb.onclick=()=>openPinSet(render); body.appendChild(pinb);
  };
  if(!SET.pinDocs || st.docsUnlocked){ pintaDocs(); }
  else { const lb=el('button','btn ghost block','🔓 Ver documentos (PIN)'); lb.onclick=()=>openPinGate(render); dcard.appendChild(lb); }

  // Observaciones
  wrap.appendChild(el('div','sp-sec','Observaciones'));
  const oc=el('div','mas-card');
  const ta=el('textarea','cl-obs'); ta.rows=3; ta.placeholder='Para recordar o para poner en contexto a un sustituto (apoyos, carácter, lo que convenga saber)…'; ta.value=al.obs||'';
  ta.oninput=()=>{ al.obs=ta.value; saveCL(); };
  oc.appendChild(ta); wrap.appendChild(oc);

  // acciones
  const acts=el('div','cl-detail-acts');
  const edit=el('button','btn ghost','Editar datos'); edit.onclick=()=>alForm(g,al);
  const del=el('button','btn danger','Borrar alumno'); del.onclick=()=>{ if(confirm('¿Borrar a '+al.nombre+' y todos sus datos?')){ CL.alumnos[g]=alumnosDe(g).filter(a=>a.id!==al.id); saveCL(); st.alumno=null; render(); } };
  acts.appendChild(edit); acts.appendChild(del); wrap.appendChild(acts);
}
function renderCuaderno(wrap,al,g){
  wrap.appendChild(el('div','sp-sec','Cuaderno de notas'));
  const asigs=asigDe(g);
  if(!asigs.length){ wrap.appendChild(el('div','cl-hint','Añade una asignatura para puntuar por evaluaciones y baremos (exámenes, trabajos, comportamiento…).')); }
  else{
    if(!st.evalTab) st.evalTab='1';
    const seg=el('div','seg evseg');
    [['1','1ª'],['2','2ª'],['3','3ª'],['final','Final']].forEach(([v,lbl])=>{ const b=el('button'); b.textContent=lbl; b.dataset.v=v; b.setAttribute('aria-selected', v===st.evalTab); b.onclick=()=>{ st.evalTab=v; render(); }; seg.appendChild(b); });
    wrap.appendChild(seg);
    asigs.forEach(as=>{ const card=el('div','cl-note'); if(st.evalTab==='final') fillFinalCard(card,al,g,as); else fillEvalCard(card,al,g,as,st.evalTab); wrap.appendChild(card); });
    wrap.appendChild(el('div','cl-subhint', st.evalTab==='final'
      ? 'La nota final es la media de las tres evaluaciones (solo cuenta las que ya tienen nota).'
      : 'Los % son TUYOS: toca un «%» o el botón ⚙ para cambiarlos, poner 0 en lo que no valores, o dejar solo exámenes. Pon varias notas por categoría (5, 6, 9…) y la media sale sola.'));
  }
  const addAs=el('button','btn ghost block','＋ Añadir asignatura'); addAs.onclick=()=>asigForm(g); wrap.appendChild(addAs);
}
function fillEvalCard(card,al,g,as,ev){
  const bars=baremosDe(g,as), na=notaAsig(al,g,as);
  const evNum={'1':'1ª','2':'2ª','3':'3ª'}[ev]||ev;
  const head=el('div','cl-note-h','<b>'+escapeHtml(as)+'</b><span class="cl-media">'+evNum+' eval. <em>'+fmtNota(notaEval(al,g,as,ev))+'</em></span>');
  card.appendChild(head);
  const updEval=()=>{ head.querySelector('.cl-media em').textContent=fmtNota(notaEval(al,g,as,ev)); };
  bars.forEach(b=>{
    const grades=gradesOf(na,ev,b.id);
    const bx=el('div','bar');
    const bh=el('div','bar-h','<span class="bar-n">'+escapeHtml(b.nombre)+'</span><button class="bar-p" title="Cambiar el %">'+(Number(b.peso)||0)+'%</button><span class="bar-m"></span>');
    bx.appendChild(bh);
    bh.querySelector('.bar-p').onclick=()=>baremoForm(g,as);
    const upd=()=>{ bh.querySelector('.bar-m').textContent='media '+fmtNota(mediaLista(grades)); };
    const chips=el('div','bar-notes');
    const addWrap=el('span','noteadd');
    const inp=el('input'); inp.type='text'; inp.inputMode='decimal'; inp.placeholder='＋ nota'; inp.setAttribute('aria-label','Añadir nota a '+b.nombre);
    const redraw=()=>{ [...chips.querySelectorAll('.notechip')].forEach(n=>n.remove()); grades.forEach((val,idx)=>{ const t=el('span','notechip', escapeHtml(String(val))+' ✕'); t.onclick=()=>{ grades.splice(idx,1); saveCL(); redraw(); upd(); updEval(); }; chips.insertBefore(t,addWrap); }); };
    const commit=()=>{ const v=inp.value.trim(); if(v==='')return; const nv=nnum(v); if(nv==null||nv<0||nv>10){ inp.classList.add('bad'); return; } inp.classList.remove('bad'); grades.push(v); saveCL(); redraw(); upd(); updEval(); inp.value=''; inp.focus(); };
    inp.onkeydown=e=>{ if(e.key==='Enter'){ e.preventDefault(); commit(); } };
    inp.onblur=commit;
    addWrap.appendChild(inp); chips.appendChild(addWrap);
    redraw(); upd(); bx.appendChild(chips); card.appendChild(bx);
  });
  const eb=el('button','btn ghost block bar-edit','⚙ Poner mis % (baremos)'); eb.onclick=()=>baremoForm(g,as); card.appendChild(eb);
  const acts=el('div','cl-note-acts');
  const del=el('button','cl-note-del','Quitar asignatura'); del.onclick=()=>{ if(!confirm('¿Quitar «'+as+'» y todas sus notas?'))return; const i=asigDe(g).indexOf(as); if(i>=0)asigDe(g).splice(i,1); alumnosDe(g).forEach(a=>{ if(a.notas)delete a.notas[as]; }); if(CL.baremos&&CL.baremos[g])delete CL.baremos[g][as]; saveCL(); render(); };
  acts.appendChild(del); card.appendChild(acts);
}
function fillFinalCard(card,al,g,as){
  const e1=notaEval(al,g,as,'1'),e2=notaEval(al,g,as,'2'),e3=notaEval(al,g,as,'3'),fin=notaFinal(al,g,as);
  card.appendChild(el('div','cl-note-h','<b>'+escapeHtml(as)+'</b><span class="cl-media">final <em>'+fmtNota(fin)+'</em></span>'));
  const rows=el('div','fin-rows');
  [['1ª evaluación',e1],['2ª evaluación',e2],['3ª evaluación',e3]].forEach(([lbl,v])=>{ rows.appendChild(el('div','fin-row','<span>'+lbl+'</span>'+(v==null?'<b class="fin-pend">pendiente</b>':'<b>'+fmtNota(v)+'</b>'))); });
  rows.appendChild(el('div','fin-row total','<span>Nota final del curso</span><b>'+fmtNota(fin)+'</b>'));
  card.appendChild(rows);
}
function baremoForm(g,as){
  const bars=baremosDe(g,as).map(b=>({id:b.id,nombre:b.nombre,peso:b.peso}));
  const sumaDe=()=>bars.reduce((a,b)=>a+(Number(b.peso)||0),0);
  const sumTxt=s=> s===100 ? '✓ Suman 100%' : (s<100 ? ('Suman '+s+'% · faltan '+(100-s)+' para 100') : ('Suman '+s+'% · te pasas '+(s-100)+' — no puede pasar de 100'));
  const sumCls=s=> s===100 ? 'ok' : (s>100 ? 'bad' : 'warn');
  const draw=()=>{ const rows=bars.map((b,i)=>'<div class="brow" data-i="'+i+'"><input class="bnombre" value="'+escapeHtml(String(b.nombre))+'" placeholder="Categoría (Exámenes, Libreta…)" autocomplete="off"><input class="bpeso" inputmode="numeric" value="'+escapeHtml(String(b.peso))+'"><span class="bpct">%</span><button class="bdel" aria-label="Quitar categoría">✕</button></div>').join('');
    const s=sumaDe();
    return '<div class="form-h">Baremos · '+escapeHtml(as)+'</div>'+
      '<p class="cl-hint" style="margin:.1rem 0 .5rem">Añade las categorías que quieras (＋) y ponles el nombre que uses (exámenes, trabajos, libreta, actitud…). El % de cada una lo pones <b>tú</b> (0 en lo que no valores). <b>Tienen que sumar exactamente 100 y no pueden pasarse.</b> Cada nota de la evaluación = media de cada categoría × su %.</p>'+
      '<div class="bsum '+sumCls(s)+'" id="bsum">'+sumTxt(s)+'</div>'+
      '<div id="brows">'+rows+'</div>'+
      '<button class="btn ghost block" id="badd">＋ Añadir categoría</button>'+
      '<div class="form-actions"><button class="btn ghost" id="bcan">Cancelar</button><button class="btn primary" id="bok">Guardar</button></div>'; };
  const updSum=()=>{ const e=$('#bsum',$('#sheetBody')); if(!e)return; const s=sumaDe(); e.textContent=sumTxt(s); e.className='bsum '+sumCls(s); };
  const wire=()=>{ const b=$('#sheetBody');
    b.querySelectorAll('.brow').forEach(row=>{ const i=+row.dataset.i;
      row.querySelector('.bnombre').oninput=e=>{ bars[i].nombre=e.target.value; };
      row.querySelector('.bpeso').oninput=e=>{ bars[i].peso=e.target.value; updSum(); };
      row.querySelector('.bdel').onclick=()=>{ bars.splice(i,1); openBottom(draw(),false); wire(); }; });
    $('#badd',b).onclick=()=>{ bars.push({id:nid('b'),nombre:'',peso:0}); openBottom(draw(),false); wire(); const rr=$('#brows',b); if(rr){ const last=rr.querySelector('.brow:last-child .bnombre'); if(last)last.focus(); } };
    $('#bcan',b).onclick=closeSheet;
    $('#bok',b).onclick=()=>{ const clean=bars.filter(x=>String(x.nombre).trim()!=='').map(x=>({id:x.id||nid('b'),nombre:String(x.nombre).trim(),peso:Math.max(0,Number(x.peso)||0)}));
      if(!clean.length){ alert('Deja al menos una categoría (por ejemplo «Exámenes»).'); return; }
      const s=clean.reduce((a,x)=>a+x.peso,0);
      if(s>100){ alert('Los % no pueden pasar de 100.\nAhora suman '+s+'% — quita '+(s-100)+'.'); return; }
      if(s<100){ alert('Los % tienen que sumar 100.\nAhora suman '+s+'% — te faltan '+(100-s)+'.'); return; }
      const keep=new Set(clean.map(x=>x.id)); const removed=baremosDe(g,as).map(bb=>bb.id).filter(id=>!keep.has(id));
      if(removed.length){ let n=0; alumnosDe(g).forEach(a=>{ const na=a.notas&&a.notas[as]; if(na&&na.ev)['1','2','3'].forEach(ev=>{ if(na.ev[ev])removed.forEach(id=>{ if(na.ev[ev][id])n+=na.ev[ev][id].length; }); }); });
        if(n>0 && !confirm('Vas a quitar categoría(s) con '+n+' nota(s) puestas. Esas notas se borrarán. ¿Continuar?')) return;
        alumnosDe(g).forEach(a=>{ const na=a.notas&&a.notas[as]; if(na&&na.ev)['1','2','3'].forEach(ev=>{ if(na.ev[ev])removed.forEach(id=>{ delete na.ev[ev][id]; }); }); }); }
      CL.baremos=CL.baremos||{}; CL.baremos[g]=CL.baremos[g]||{}; CL.baremos[g][as]=clean; saveCL(); closeSheet(); render(); }; };
  openBottom(draw(),false); wire();
}
// ---- importar notas desde Excel (todos los alumnos de golpe) ----
function normNom(s){ return String(s==null?'':s).trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[.,;:]/g,' ').replace(/\s+/g,' ').trim(); }
function tokKey(s){ return normNom(s).split(' ').filter(Boolean).sort().join(' '); }
function analizarImport(g,rows){
  const als=alumnosDe(g), byExact={}, byTok={}, ambE={}, ambT={};
  als.forEach(a=>{ const ne=normNom(a.nombre); if(ne){ if(byExact[ne]!==undefined)ambE[ne]=true; byExact[ne]=a; } const tk=tokKey(a.nombre); if(tk){ if(byTok[tk]!==undefined)ambT[tk]=true; byTok[tk]=a; } });
  const matched=[], unmatched=[], ambiguous=[]; let ignored=0, outrange=0;
  (rows||[]).forEach(r=>{ if(!r||!r.length)return; const nom=r[0];
    let notas=r.slice(1).map(nnum).filter(n=>n!=null); const before=notas.length; notas=notas.filter(n=>n>=0&&n<=10); outrange+=before-notas.length;
    const ne=normNom(nom), tk=tokKey(nom);
    // prioridad: nombre EXACTO único gana siempre; los tokens solo deciden si no hay exacto
    let al=null;
    if(ne && byExact[ne]!==undefined){
      if(ambE[ne]){ if(String(nom==null?'':nom).trim()!=='')ambiguous.push(String(nom).trim()); return; }
      al=byExact[ne];
    } else if(tk && byTok[tk]!==undefined){
      if(ambT[tk]){ if(String(nom==null?'':nom).trim()!=='')ambiguous.push(String(nom).trim()); return; }
      al=byTok[tk];
    }
    if(al){ if(notas.length)matched.push({al,notas}); else ignored++; }
    else if(notas.length && String(nom==null?'':nom).trim()!=='') unmatched.push(String(nom).trim());
    else ignored++; });
  return {matched, unmatched, ambiguous, ignored, outrange};
}
function importPreviewHtml(p){
  if(!p.matched.length && !p.unmatched.length && !(p.ambiguous&&p.ambiguous.length)) return '<div class="im-err">No se han encontrado notas. Revisa que la 1ª columna sean nombres y las siguientes, notas.</div>';
  const nN=p.matched.reduce((a,m)=>a+m.notas.length,0); let h='';
  if(p.matched.length) h+='<div class="im-ok">✓ '+p.matched.length+' alumno'+(p.matched.length>1?'s':'')+' · '+nN+' nota'+(nN>1?'s':'')+' a importar</div>';
  if(p.ambiguous&&p.ambiguous.length) h+='<div class="im-warn">⚠️ Nombres repetidos, se omiten para no mezclar notas ('+p.ambiguous.length+'): '+p.ambiguous.map(escapeHtml).join(', ')+'</div>';
  if(p.unmatched.length) h+='<div class="im-warn">⚠️ Sin coincidencia ('+p.unmatched.length+'): '+p.unmatched.map(escapeHtml).join(', ')+'</div>';
  if(p.outrange) h+='<div class="im-warn">⚠️ '+p.outrange+' valor(es) fuera de 0–10 descartados (¿una columna de fechas o de faltas?).</div>';
  return h;
}
function importNotasForm(g){
  const asigs=asigDe(g);
  if(!asigs.length){ alert('Primero añade alguna asignatura para poder importar sus notas.'); return; }
  if(!alumnosDe(g).length){ alert('Primero añade a los alumnos: las notas se emparejan por su nombre.'); return; }
  const barOptions=as=>baremosDe(g,as).map(b=>'<option value="'+b.id+'">'+escapeHtml(b.nombre)+'</option>').join('');
  openBottom('<div class="form-h">Importar notas desde Excel</div>'+
    '<p class="cl-hint" style="margin:.1rem 0 .6rem"><b>Columna A:</b> nombre del alumno. <b>Siguientes columnas:</b> las notas (una por examen/trabajo). Se añaden a la categoría elegida, buscando a cada alumno por su nombre.</p>'+
    '<label class="fl">Asignatura<select id="im_as">'+asigs.map(a=>'<option value="'+escapeHtml(a)+'">'+escapeHtml(a)+'</option>').join('')+'</select></label>'+
    '<label class="fl">Evaluación<select id="im_ev"><option value="1">1ª evaluación</option><option value="2">2ª evaluación</option><option value="3">3ª evaluación</option></select></label>'+
    '<label class="fl">Categoría (baremo)<select id="im_bar">'+barOptions(asigs[0])+'</select></label>'+
    '<label class="fl">Archivo Excel<input id="im_file" type="file" accept=".xlsx,.xls,.csv"></label>'+
    '<div class="im-prev" id="im_prev"></div>'+
    '<div class="form-actions"><button class="btn ghost" id="im_c">Cancelar</button><button class="btn primary" id="im_ok" disabled>Importar</button></div>', false);
  const b=$('#sheetBody'); const asSel=$('#im_as',b), barSel=$('#im_bar',b), prev=$('#im_prev',b), okBtn=$('#im_ok',b); let parsed=null;
  asSel.onchange=()=>{ barSel.innerHTML=barOptions(asSel.value); };
  $('#im_c',b).onclick=closeSheet;
  $('#im_file',b).onchange=async e=>{ const f=e.target.files&&e.target.files[0]; if(!f)return;
    prev.innerHTML='<div class="im-info">Leyendo…</div>'; okBtn.disabled=true;
    try{ await ensureXLSX(); const wb=XLSX.read(await f.arrayBuffer(),{type:'array'}); const ws=wb.Sheets[wb.SheetNames[0]];
      const rows=XLSX.utils.sheet_to_json(ws,{header:1,blankrows:false});
      parsed=analizarImport(g,rows); prev.innerHTML=importPreviewHtml(parsed); okBtn.disabled=parsed.matched.length===0;
    }catch(err){ parsed=null; prev.innerHTML='<div class="im-err">No se pudo leer el archivo. Guárdalo como Excel (.xlsx) e inténtalo otra vez.</div>'; okBtn.disabled=true; } };
  okBtn.onclick=()=>{ if(!parsed||!parsed.matched.length)return; const ev=$('#im_ev',b).value, bid=barSel.value, as=asSel.value;
    const total=parsed.matched.reduce((a,m)=>a+m.notas.length,0);
    if(!confirm('Se AÑADIRÁN '+total+' nota(s) a la categoría elegida (se suman a las que ya haya, no las reemplazan). ¿Importar?'))return;
    let nN=0; parsed.matched.forEach(m=>{ const na=notaAsig(m.al,g,as); const arr=gradesOf(na,ev,bid); m.notas.forEach(v=>{ arr.push(String(v).replace('.',',')); nN++; }); });
    if(saveCLsafe()){ closeSheet(); render(); alert('✓ Importadas '+nN+' nota(s) a '+parsed.matched.length+' alumno(s).'+(parsed.unmatched.length?'\n\n⚠️ No se encontraron: '+parsed.unmatched.join(', '):'')); } };
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
        '<div class="ag-meta">'+(it.asig?'<span class="ag-chip" style="background:var(--sky-bg);color:var(--sky-ink)">'+escapeHtml(it.asig)+'</span> ':'')+
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
function groupEditForm(g){
  openBottom('<div class="form-h">Grupo · '+escapeHtml(g)+'</div>'+
    '<label class="fl">Nombre del grupo<input id="ge_n" type="text" value="'+escapeHtml(g)+'" autocomplete="off"></label>'+
    '<div class="form-actions"><button class="btn danger" id="ge_del">Borrar grupo</button><button class="btn ghost" id="ge_c">Cancelar</button><button class="btn primary" id="ge_ok">Guardar</button></div>', false);
  const b=$('#sheetBody'); $('#ge_c',b).onclick=closeSheet;
  $('#ge_del',b).onclick=()=>{ if(!confirm('¿Borrar el grupo «'+g+'» con TODOS sus alumnos, notas, deberes y salidas? No se puede deshacer.'))return;
    CL.grupos=CL.grupos.filter(x=>x!==g); ['alumnos','asig','deberes','salidas','baremos'].forEach(kk=>{ if(CL[kk])delete CL[kk][g]; });
    st.grupo=CL.grupos[0]||null; st.alumno=null; saveCL(); closeSheet(); render(); };
  $('#ge_ok',b).onclick=()=>{ const nv=$('#ge_n',b).value.trim(); if(!nv){ $('#ge_n',b).focus(); return; } if(nv===g){ closeSheet(); return; }
    if(CL.grupos.includes(nv)){ alert('Ya existe un grupo con ese nombre.'); return; }
    CL.grupos=CL.grupos.map(x=>x===g?nv:x);
    ['alumnos','asig','deberes','salidas','baremos'].forEach(kk=>{ if(CL[kk]&&CL[kk][g]!=null){ CL[kk][nv]=CL[kk][g]; delete CL[kk][g]; } });
    if(st.grupo===g)st.grupo=nv; saveCL(); closeSheet(); render(); };
}
function alForm(g,al){
  const it=Object.assign({nombre:'',cumple:'',alergias:''}, al||{});
  openBottom('<div class="form-h">'+(al?'Editar alumno':'Nuevo alumno')+'</div>'+
    '<label class="fl">Nombre y apellidos<input id="a_n" type="text" value="'+escapeHtml(it.nombre)+'" placeholder="Ej.: Lucía Martín" autocomplete="off"></label>'+
    '<label class="fl">Cumpleaños <span class="opt">(opcional)</span><input id="a_c" type="date" value="'+(it.cumple||'')+'"></label>'+
    '<label class="fl">Alergias <span class="opt">(si tiene)</span><input id="a_al" type="text" value="'+escapeHtml(it.alergias||'')+'" placeholder="Ej.: frutos secos" autocomplete="off"></label>'+
    '<div class="form-actions">'+(al?'<button class="btn danger" id="a_del">Borrar</button>':'')+'<button class="btn ghost" id="a_can">Cancelar</button><button class="btn primary" id="a_ok">Guardar</button></div>', false);
  const b=$('#sheetBody'); const inp=$('#a_n',b); if(!al)setTimeout(()=>inp.focus(),60);
  $('#a_can',b).onclick=closeSheet;
  const del=$('#a_del',b); if(del)del.onclick=()=>{ if(!confirm('¿Borrar a '+al.nombre+' y todos sus datos (notas, faltas, tutoría, autorizaciones)?'))return; CL.alumnos[g]=alumnosDe(g).filter(a=>a.id!==al.id); saveCL(); if(st.alumno===al.id)st.alumno=null; closeSheet(); render(); };
  $('#a_ok',b).onclick=()=>{ const n=inp.value.trim(); if(!n){ inp.focus(); return; } const cumple=$('#a_c',b).value; const alg=$('#a_al',b).value.trim();
    if(al){ al.nombre=n; al.cumple=cumple; al.alergias=alg; } else { alumnosDe(g).push({id:nid('a'),nombre:n,cumple,alergias:alg,pos:0,neg:0,faltas:[],recogida:[],sitFam:'sin',sitFamNota:'',notas:{},tutoria:{},obs:''}); }
    saveCL(); closeSheet(); render(); };
}
function recForm(g,al,item,after){
  const it=Object.assign({nombre:'',parentesco:'',dni:'',foto:''}, item||{});
  openBottom('<div class="form-h">'+(item?'Editar familiar':'Familiar autorizado')+'</div>'+
    '<label class="fl">Nombre<input id="r_n" type="text" value="'+escapeHtml(it.nombre)+'" placeholder="Ej.: Ana Martín" autocomplete="off"></label>'+
    '<label class="fl">Parentesco <span class="opt">(opcional)</span><input id="r_p" type="text" value="'+escapeHtml(it.parentesco)+'" placeholder="Madre, abuelo, tía…" autocomplete="off"></label>'+
    '<label class="fl">DNI <span class="opt">(opcional)</span><input id="r_d" type="text" value="'+escapeHtml(it.dni)+'" placeholder="00000000A" autocomplete="off"></label>'+
    '<label class="fl">Foto del DNI <span class="opt">(opcional)</span><input id="r_f" type="file" accept="image/*"></label>'+
    '<div id="r_prev">'+(it.foto?'<img class="doc-prev" src="'+it.foto+'" alt="DNI">':'')+'</div>'+
    '<div class="form-actions">'+(item?'<button class="btn danger" id="r_del">Borrar</button>':'')+'<button class="btn ghost" id="r_c">Cancelar</button><button class="btn primary" id="r_ok">Guardar</button></div>', false);
  const b=$('#sheetBody'); let foto=it.foto;
  $('#r_c',b).onclick=closeSheet;
  $('#r_f',b).onchange=async e=>{ const f=e.target.files&&e.target.files[0]; if(!f)return; try{ foto=await comprimirFoto(f); $('#r_prev',b).innerHTML='<img class="doc-prev" src="'+foto+'" alt="DNI">'; }catch(err){ alert('No se pudo procesar la foto. Prueba con otra.'); } };
  const del=$('#r_del',b); if(del)del.onclick=async()=>{ if(!confirm('¿Borrar a este familiar autorizado (y su foto del DNI)?'))return;
    if(del.disabled)return; del.disabled=true;
    try{
      const bak=JSON.stringify(al.recogida||[]);
      const i=al.recogida.findIndex(x=>x.id===item.id); if(i>=0)al.recogida.splice(i,1);
      await encryptRecogida(al);
      if(!saveCLsafe()){ al.recogida=JSON.parse(bak); await encryptRecogida(al); return; }
      closeSheet(); after&&after();
    } finally { del.disabled=false; } };
  const okB=$('#r_ok',b);
  okB.onclick=async()=>{ const n=$('#r_n',b).value.trim(); if(!n){ $('#r_n',b).focus(); return; }
    if(okB.disabled)return; okB.disabled=true;
    try{
      const rec={id:item?item.id:nid('r'), nombre:n, parentesco:$('#r_p',b).value.trim(), dni:$('#r_d',b).value.trim(), foto:foto||''};
      const bak=JSON.stringify(al.recogida||[]);
      // siempre por id sobre el array VIGENTE (un revert anterior pudo reemplazar los objetos)
      const cur=item ? al.recogida.find(x=>x.id===rec.id) : null;
      if(cur){ Object.assign(cur,rec); } else { al.recogida.push(rec); }
      await encryptRecogida(al);
      if(!saveCLsafe()){ al.recogida=JSON.parse(bak); await encryptRecogida(al); return; }
      closeSheet(); after&&after();
    } finally { okB.disabled=false; } };
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
  const del=$('#d_del',b); if(del)del.onclick=()=>{ if(!confirm('¿Borrar estos deberes?'))return; CL.deberes[g]=deberesDe(g).filter(x=>x.id!==it.id); saveCL(); closeSheet(); render(); };
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
  const del=$('#s_del',b); if(del)del.onclick=()=>{ if(!confirm('¿Borrar esta salida?'))return; CL.salidas[g]=salidasDe(g).filter(x=>x.id!==it.id); saveCL(); closeSheet(); render(); };
  $('#s_ok',b).onclick=()=>{ const t=$('#s_t',b).value.trim(); if(!t){ $('#s_t',b).focus(); return; }
    const cst=nnum($('#s_c',b).value); const rec={titulo:t,fecha:$('#s_f',b).value,lugar:$('#s_l',b).value.trim(),coste:cst==null?'':String(cst).replace('.',','),nota:$('#s_n',b).value.trim()};
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
  let total=5*60, endAt=0, running=false;
  openBottom('<div class="form-h">Temporizador</div>'+
    '<div class="tmr-display" id="tmr">'+fmtClock(total)+'</div>'+
    '<div class="tmr-presets" id="tpre">'+[1,3,5,10].map(m=>'<button type="button" data-m="'+m+'">'+m+' min</button>').join('')+'</div>'+
    '<div class="form-actions"><button class="btn ghost" id="treset">Reiniciar</button><button class="btn primary" id="tgo">▶ Empezar</button></div>', false);
  const b=$('#sheetBody'); const disp=$('#tmr',b); const go=$('#tgo',b);
  // cuenta contra un instante objetivo (Date.now): no se desvía aunque se apague la pantalla
  const remaining=()=> running ? Math.max(0, Math.round((endAt-Date.now())/1000)) : total;
  const stop=()=>{ running=false; if(_tmrId){clearInterval(_tmrId);_tmrId=null;} go.textContent='▶ Empezar'; };
  const tick=()=>{ const r=remaining(); disp.textContent=fmtClock(r); if(r<=0){ stop(); disp.classList.add('done'); disp.textContent='¡Tiempo!'; try{ navigator.vibrate&&navigator.vibrate([200,100,200]); }catch(e){} } };
  b.querySelectorAll('#tpre button').forEach(x=>x.onclick=()=>{ stop(); total=(+x.dataset.m)*60; disp.classList.remove('done'); disp.textContent=fmtClock(total); });
  go.onclick=()=>{ if(running){ total=remaining(); stop(); disp.textContent=fmtClock(total); } else { if(total<=0)return; endAt=Date.now()+total*1000; running=true; go.textContent='⏸ Pausar'; disp.classList.remove('done'); _tmrId=setInterval(tick,250); } };
  $('#treset',b).onclick=()=>{ stop(); total=5*60; disp.classList.remove('done'); disp.textContent=fmtClock(total); };
}

// ---------- Herramienta: elegir alumno al azar ----------
function openRandom(){
  const g=clGrupo(); const arr=g?alumnosDe(g):[];
  if(!arr.length){ openBottom('<div class="form-h">Elegir alumno al azar</div><div class="cl-hint" style="margin:0 0 14px">Primero añade tus alumnos en la pestaña «Clase».</div><div class="form-actions"><button class="btn primary" id="rc">Entendido</button></div>', false); $('#rc',$('#sheetBody')).onclick=closeSheet; return; }
  // no repite hasta agotar la lista (bolsa) y excluye a los que faltan hoy
  const hoy=isoOf(new Date());
  const pool=arr.filter(a=>!(a.faltas&&a.faltas.includes(hoy)));
  const src=pool.length?pool:arr;
  let bag=[];
  const pick=()=>{ if(!bag.length)bag=src.map(a=>a.nombre); return bag.splice(Math.floor(Math.random()*bag.length),1)[0]; };
  const nExcl=arr.length-src.length;
  openBottom('<div class="form-h">Alumno al azar <span class="opt" style="font-weight:700;color:#b3aaa1">· '+escapeHtml(g)+'</span></div><div class="rnd-name" id="rn">'+escapeHtml(pick())+'</div>'+(nExcl>0?'<p class="cl-hint" style="margin:0 0 12px">Se excluyen '+nExcl+' que faltan hoy.</p>':'')+'<div class="form-actions"><button class="btn ghost" id="rcl">Cerrar</button><button class="btn primary" id="rag">🎲 Otra vez</button></div>', false);
  const b=$('#sheetBody'); $('#rcl',b).onclick=closeSheet;
  $('#rag',b).onclick=()=>{ const n=$('#rn',b); n.textContent=pick(); bump(n); };
}

// ---------- Herramienta: copia de seguridad (exportar / importar) ----------
const BK_KEYS=['horario_data','settings','agenda_items','clase_data'];
const BK_VER=1;
function appBackup(){ const o={_app:'Super Profe',_v:BK_VER}; BK_KEYS.forEach(k=>{ const v=localStorage.getItem(k); if(v!=null)o[k]=v; }); return o; }
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
  $('#bk_imp',b).onchange=async e=>{ const f=e.target.files[0]; if(!f)return; let o;
    try{ o=JSON.parse(await f.text()); }catch(err){ bkStatus(b,'✗ Ese archivo no es una copia válida de Super Profe.','err'); e.target.value=''; return; }
    if(!o || o._app!=='Super Profe'){ bkStatus(b,'✗ Ese archivo no es una copia de Super Profe.','err'); e.target.value=''; return; }
    if(typeof o._v==='number' && o._v>BK_VER){ bkStatus(b,'✗ La copia es de una versión más nueva de la app. Actualízala antes de restaurar.','err'); e.target.value=''; return; }
    for(const k of BK_KEYS){ if(o[k]!=null && typeof o[k]!=='string'){ bkStatus(b,'✗ La copia está dañada (campo «'+k+'»).','err'); e.target.value=''; return; } }
    if(!BK_KEYS.some(k=>o[k]!=null)){ bkStatus(b,'✗ La copia no contiene datos.','err'); e.target.value=''; return; }
    if(!confirm('Vas a REEMPLAZAR todos los datos actuales (horario, agenda, notas y alumnos) por los de la copia.\n\nEsto no se puede deshacer. Si quieres conservar lo de ahora, pulsa Cancelar y descarga antes una copia.\n\n¿Restaurar?')){ e.target.value=''; return; }
    try{ BK_KEYS.forEach(k=>{ if(o[k]!=null)localStorage.setItem(k,o[k]); });
      bkStatus(b,'✓ Copia restaurada. Recargando…','ok'); setTimeout(()=>location.reload(),700);
    }catch(err){ bkStatus(b,'✗ No se pudo restaurar (¿almacenamiento lleno?).','err'); e.target.value=''; } };
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
      '<button type="button" class="tchip" data-wk="A" aria-pressed="'+(curWk==='A')+'" style="--cb:var(--sky-bg);--ci:var(--sky-ink)">Semana A</button>'+
      '<button type="button" class="tchip" data-wk="B" aria-pressed="'+(curWk==='B')+'" style="--cb:var(--sky-bg);--ci:var(--sky-ink)">Semana B</button>'+
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
    if(st.mode==='aula') m.innerHTML = 'Tutor/a: <b>'+escapeHtml(tutorOf(st.sel)||'—')+'</b> · 22,5 h lectivas';
    else { const au=aulaOfTutor(st.sel); m.innerHTML = (au?'Tutor/a de <b>'+escapeHtml(au)+'</b> · ':'Profesor/a · ')+fmtH(profHours(st.sel))+' h/sem'; }
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
      h+='<div class="legrow"><span class="legsw" style="background:'+a.bg+'"></span><div><b>'+escapeHtml(a.name)+'</b> <span>('+escapeHtml(code)+')</span></div></div>'; });
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
  const rb = $('#reset',box); if(rb) rb.onclick = ()=>{ if(confirm('¿Volver al horario original? Se quitará el Excel que cargaste. (Tus notas y alumnos no se tocan.)')) resetData(); };
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
      const ini = _t(c0&&c0.v).split('-')[0].trim().replace(/^0(\d)/,'$1');
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

// carga el lector de Excel (950 KB) solo cuando hace falta, no en cada arranque
let _xlsxP=null;
function ensureXLSX(){ if(typeof XLSX!=='undefined')return Promise.resolve(); if(_xlsxP)return _xlsxP;
  _xlsxP=new Promise((res,rej)=>{ const s=document.createElement('script'); s.src='xlsx.full.min.js'; s.onload=()=>res(); s.onerror=()=>{ _xlsxP=null; rej(new Error('No se pudo cargar el lector de Excel.')); }; document.head.appendChild(s); });
  return _xlsxP; }
async function handleFile(file){
  setStatus('Leyendo «'+file.name+'»…');
  try{
    let nd;
    if(/\.json$/i.test(file.name)){
      nd = JSON.parse(await file.text());
      if(!validData(nd)) throw new Error('El JSON no tiene el formato de horario esperado.');
    } else {
      await ensureXLSX();
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
const escapeHtml = s => String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const pad2 = n => String(n).padStart(2,'0');
const keyDate = it => new Date(it.fecha+'T'+(it.hora||'00:00')).getTime();
// casillas del horario con un examen/tarea marcado, por área+día+aula.
// Si se pasa el lunes de la semana vista, solo cuenta lo que cae ESA semana (L-V); si no, todo lo futuro.
function cellMarkKeys(weekMon){
  let lo=-Infinity, hi=Infinity; const t0=startToday();
  if(weekMon){ lo=weekMon.getTime(); const fri=addDays(weekMon,4); hi=new Date(fri.getFullYear(),fri.getMonth(),fri.getDate(),23,59,59).getTime(); }
  const s=new Set();
  AG.forEach(it=>{ if(!it.ref)return; const k=keyDate(it); if(k<lo||k>hi)return; if(k<t0)return; s.add(it.ref.ar+'|'+it.ref.d+'|'+it.ref.aula); });
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
    '<p class="sub">Exámenes, tareas, notas, citas y actividades — con aviso el día antes (y 1 h antes si pones hora).</p>');
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
  app.appendChild(el('footer','foot','<div><b>Los avisos</b> se guardan en el Calendario del móvil: al tocar 📅 se abre para «añadir» y el teléfono te avisa el día antes (y 1 h antes si el evento tiene hora).</div>'));
}
function renderAgendaMes(app){
  if(!st.agMonth) st.agMonth=new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const y=st.agMonth.getFullYear(), m=st.agMonth.getMonth();
  const nav=el('div','wknav');
  nav.innerHTML='<button class="wkn-arrow" id="mPrev" aria-label="Mes anterior">‹</button>'+
    '<div class="wkn-mid"><div class="wkn-range">'+cap(MESES[m])+' '+y+'</div></div>'+
    '<button class="wkn-arrow" id="mNext" aria-label="Mes siguiente">›</button>';
  app.appendChild(nav);
  $('#mPrev',nav).onclick=()=>{ st.agDay=null; st.agMonth=new Date(y,m-1,1); render(); };
  $('#mNext',nav).onclick=()=>{ st.agDay=null; st.agMonth=new Date(y,m+1,1); render(); };
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
    '<label class="chk"><input id="f_avi" type="checkbox"'+(it.avisar?' checked':'')+'> Avísame el día antes (y 1 h antes si pones hora)</label>'+
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
  const del=$('#f_del',body); if(del)del.onclick=()=>{ if(!confirm('¿Borrar «'+it.titulo+'» de la agenda?'))return; AG=AG.filter(x=>x.id!==it.id); saveAgenda(); closeSheet(); render(); };
  $('#f_ok',body).onclick=()=>{
    const titulo=$('#f_tit',body).value.trim();
    const fecha=$('#f_fec',body).value;
    if(!titulo){ $('#f_tit',body).focus(); return; }
    if(!fecha){ $('#f_fec',body).focus(); return; }
    const rec={ id: it.id || ('e'+Date.now()+Math.floor(Math.random()*1000)),
      tipo, titulo, fecha, hora:$('#f_hor',body).value, detalle:$('#f_det',body).value.trim(), avisar:$('#f_avi',body).checked };
    if(it.ref){ const wd=(parseISO(fecha).getDay()+6)%7; if(wd<=4) rec.ref=Object.assign({},it.ref,{d:wd}); }
    if(it.id){ AG[AG.findIndex(x=>x.id===it.id)]=rec; } else { AG.push(rec); }
    saveAgenda(); closeSheet(); render();
    if(rec.avisar) downloadICS(rec);
  };
}

// ---------- recordatorios: archivo .ics para el calendario del móvil ----------
function icsFold(line){ const enc=new TextEncoder(); if(enc.encode(line).length<=75)return line; let out='',cur='',cb=0; for(const ch of line){ const b=enc.encode(ch).length; const lim=out?74:75; if(cb+b>lim){ out+=(out?'\r\n ':'')+cur; cur=ch; cb=b; } else { cur+=ch; cb+=b; } } out+=(out?'\r\n ':'')+cur; return out; }
function icsFor(it){
  const esc=s=>String(s==null?'':s).replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\n/g,'\\n');
  const n=new Date();
  const stamp=n.getUTCFullYear()+pad2(n.getUTCMonth()+1)+pad2(n.getUTCDate())+'T'+pad2(n.getUTCHours())+pad2(n.getUTCMinutes())+pad2(n.getUTCSeconds())+'Z';
  const [Y,M,D]=it.fecha.split('-').map(Number);
  const t=TIPOS[it.tipo]||TIPOS.nota;
  const summary=esc(t.emoji+' '+(it.titulo||t.label));
  const L=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Super Profe//Agenda//ES','CALSCALE:GREGORIAN','BEGIN:VEVENT','UID:'+(it.id||('e'+stamp))+'@super-profe','DTSTAMP:'+stamp];
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
  }catch(e){ alert('No se pudo crear el recordatorio en este dispositivo.'); }
}

// ---------- navegación ----------
function setTab(tab){
  st.tab=tab;
  document.querySelectorAll('.nav button').forEach(b=>b.setAttribute('aria-current', b.dataset.tab===tab?'page':'false'));
  render();
}

// ---------- instalación (Android/Chrome + iPhone/Safari) ----------
let deferredPrompt=null;
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone===true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent||'') || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);
const installDismissed = () => { try{ return !!localStorage.getItem('installDismissed'); }catch(e){ return false; } };
function showInstall(v){ const b=$('#installBanner'); if(b) b.hidden = !v || isStandalone(); }
function showIOSHint(){ const b=$('#installBanner'); if(!b)return; const bt=$('#installBtn'); if(bt)bt.hidden=true; const tx=b.querySelector('.ib-tx'); if(tx)tx.innerHTML='<b>Instala Super Profe</b><span>Toca Compartir ⬆ y «Añadir a pantalla de inicio»</span>'; b.hidden=false; }
window.addEventListener('beforeinstallprompt', e=>{ e.preventDefault(); deferredPrompt=e; if(!installDismissed()) showInstall(true); });
window.addEventListener('appinstalled', ()=>{ deferredPrompt=null; showInstall(false); });

// ---------- init ----------
document.querySelectorAll('.nav button').forEach(b=> b.onclick=()=>setTab(b.dataset.tab));
$('#scrim').onclick = tryCloseSheet;
$('#sheetClose').onclick = tryCloseSheet;
document.addEventListener('keydown', e=>{ if(e.key==='Escape') tryCloseSheet(); });
// la tarjeta "Ahora" de Inicio se mantiene al día (cada minuto y al volver a la app)
setInterval(()=>{ if(st.tab==='inicio' && !$('#sheet').classList.contains('on')) render(); }, 60000);
document.addEventListener('visibilitychange', ()=>{ if(!document.hidden && st.tab==='inicio' && !$('#sheet').classList.contains('on')) render(); });
const ib=$('#installBtn'); if(ib) ib.onclick=async()=>{ if(!deferredPrompt)return; deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt=null; showInstall(false); };
const ic=$('#installClose'); if(ic) ic.onclick=()=>{ try{ localStorage.setItem('installDismissed','1'); }catch(e){} showInstall(false); };
if(isIOS() && !isStandalone() && !installDismissed()) showIOSHint();

setTab('inicio');

if('serviceWorker' in navigator){
  const hadController = !!navigator.serviceWorker.controller;
  let _reloading=false;
  navigator.serviceWorker.addEventListener('controllerchange', ()=>{
    if(!hadController || _reloading) return;                 // no recargar en la primera instalación
    const sh=$('#sheet'); if(sh && sh.classList.contains('on')) return;  // ni con un formulario abierto
    _reloading=true; location.reload();                     // recoge la versión nueva tras un despliegue
  });
  window.addEventListener('load', ()=> navigator.serviceWorker.register('./sw.js').catch(()=>{}));
}
