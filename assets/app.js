(function(){
'use strict';
var F=window.FAIAS;
function $(s,r){return (r||document).querySelector(s)}
function $$(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}
if(!F){document.body.innerHTML='<p style="padding:2rem;font-family:sans-serif">Data file not found: data/index.js</p>';return}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}

/* ---------- data helpers (all counts computed) ---------- */
var AX=['Severity','Likelihood','Detectability','Recoverability','Novelty'];
var byId={},order={},claimBy={},DOM={};
F.irqs.forEach(function(q,i){byId[q.id]=q;order[q.id]=i});
F.claims.forEach(function(c){claimBy[c.id]=c});
F.domains.forEach(function(d){DOM[d.code]=d});
var nSub=F.domains.reduce(function(a,d){return a+d.subdomains.length},0);
var stars=[1,2,3,4,5].map(function(n){return F.irqs.filter(function(q){return q.star===n}).length});
var shortId=function(id){return id.replace('IRQ-','')};
var root8=F.root.slice(0,8)+'…'+F.root.slice(-8);
var readme=F.library.filter(function(l){return l.slug==='readme'})[0];
var themes=[];F.claims.forEach(function(c){if(themes.indexOf(c.theme)<0)themes.push(c.theme)});
var STATUS=['In scope','Reviewing','Reviewed','Not applicable'];
var APPL=[['G','Generative'],['A','Agentic'],['P','Predictive']];
var CRIT=['Critical','High','Medium'];

/* ---------- storage (try/catch; memory fallback) ---------- */
var KEY='faias.notes.v1',mem={},lsOK=true;
try{var raw=localStorage.getItem(KEY);mem=raw?(JSON.parse(raw)||{}):{}}catch(e){lsOK=false;mem={}}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(mem))}catch(e){lsOK=false}}
function getNote(id){return mem[id]||{status:'',note:''}}
function setNote(id,patch){
  var n=Object.assign({status:'',note:''},mem[id],patch);n.t=new Date().toISOString();
  if(!n.status&&!n.note.trim())delete mem[id];else mem[id]=n;
  persist();marks();
}
function marked(){return Object.keys(mem).sort(function(a,b){return order[a]-order[b]})}
function marks(){
  $$('[data-irq]').forEach(function(a){a.classList.toggle('has',!!mem[a.getAttribute('data-irq')])});
  var c=$('#notecount');if(c)c.textContent=marked().length;
}

/* ---------- theme ---------- */
var root=document.documentElement,themeBtn=$('#theme');
try{var sv=localStorage.getItem('faias.theme');if(sv)root.setAttribute('data-theme',sv)}catch(e){}
function isDark(){var t=root.getAttribute('data-theme');return t?t==='dark':matchMedia('(prefers-color-scheme: dark)').matches}
function themeLabel(){themeBtn.textContent=isDark()?'Light':'Dark';themeBtn.setAttribute('aria-label',isDark()?'Switch to light theme':'Switch to dark theme')}
themeBtn.addEventListener('click',function(){var n=isDark()?'light':'dark';root.setAttribute('data-theme',n);try{localStorage.setItem('faias.theme',n)}catch(e){}themeLabel()});
themeLabel();matchMedia('(prefers-color-scheme: dark)').addEventListener('change',themeLabel);
$('#ver').textContent='v'+F.version;$('#repo').href=F.repo;

/* ---------- script injection ---------- */
var pend={};
function inject(src){return pend[src]||(pend[src]=new Promise(function(res,rej){var s=document.createElement('script');s.src=src;s.onload=res;s.onerror=function(){delete pend[src];rej(new Error(src))};document.head.appendChild(s)}))}
function getIrq(id){var w=window.FAIAS_IRQ;return w&&w[id]?Promise.resolve(w[id]):inject('data/irq/'+id+'.js').then(function(){return window.FAIAS_IRQ[id]})}
function getDoc(s){var w=window.FAIAS_DOC;return w&&w[s]?Promise.resolve(w[s]):inject('data/doc/'+s+'.js').then(function(){return window.FAIAS_DOC[s]})}
function clean(html){ /* wrap tables, neutralise links that point into the source repository */
  var d=document.createElement('div');d.innerHTML=html;
  $$('table',d).forEach(function(t){var w=document.createElement('div');w.className='tw';t.parentNode.insertBefore(w,t);w.appendChild(t)});
  $$('a[href]',d).forEach(function(a){if(!/^https?:/i.test(a.getAttribute('href'))){var s=document.createElement('span');s.className='xref';s.innerHTML=a.innerHTML;a.parentNode.replaceChild(s,a)}else{a.target='_blank';a.rel='noopener'}});
  return d.innerHTML;
}

/* ---------- small renderers ---------- */
function starChip(n){return '<span class="st s'+n+'" title="Testing Confidence ★'+n+'">★'+n+'</span>'}
function appl(q){
  var on=APPL.filter(function(a){return q[a[0]]}).map(function(a){return a[1]}).join(', ');
  return '<span class="ap"><span class="sr">Applies to '+on+'</span>'+APPL.map(function(a){return '<b class="'+(q[a[0]]?'on':'off')+'" aria-hidden="true" title="'+a[1]+'">'+a[0]+'</b>'}).join('')+'</span>';
}
/* ---------- identity: nine domain marks and the risk pentagon ----------
   Marks are built from circle, square, triangle and arc. --a = domain colour, --b = partner colour, ink = structure.
   The marks are a site device, not part of the standard. */
var ACCENT={DAT:'blue',MOD:'red',AGT:'yellow',HUM:'red',SEC:'yellow',TPR:'blue',RES:'yellow',CON:'blue',GOV:'red'};
var PARTNER={blue:'red',red:'yellow',yellow:'blue'};
var K='var(--ink)';
function govMark(){var s='';for(var r=0;r<3;r++)for(var c=0;c<3;c++){var x=4+c*20,y=4+r*20;s+=(r===1&&c===1)?'<circle cx="32" cy="32" r="10" fill="var(--a)"/>':'<rect x="'+x+'" y="'+y+'" width="16" height="16" fill="'+((r===0&&c===2)?'var(--b)':K)+'"/>'}return s}
var MARKS={
 DAT:'<rect x="4" y="4" width="40" height="40" fill="var(--a)"/><circle cx="42" cy="42" r="18" fill="'+K+'"/><rect x="4" y="48" width="12" height="12" fill="var(--b)"/>',
 MOD:'<circle cx="32" cy="32" r="28" fill="var(--a)"/><circle cx="32" cy="32" r="17" fill="'+K+'"/><circle cx="32" cy="32" r="7" fill="var(--b)"/>',
 AGT:'<path d="M6 6 58 32 6 58Z" fill="var(--a)"/><circle cx="22" cy="32" r="8" fill="'+K+'"/><rect x="46" y="4" width="12" height="12" fill="var(--b)"/>',
 HUM:'<circle cx="32" cy="18" r="13" fill="'+K+'"/><path d="M4 60A28 28 0 0 1 60 60Z" fill="var(--a)"/><rect x="48" y="4" width="12" height="12" fill="var(--b)"/>',
 SEC:'<path d="M10 6H54V30A22 24 0 0 1 10 30Z" fill="var(--a)"/><path d="M32 6H54V30A22 24 0 0 1 32 54Z" fill="'+K+'"/><circle cx="32" cy="24" r="6" fill="var(--b)"/>',
 TPR:'<circle cx="24" cy="32" r="20" fill="var(--a)"/><circle cx="42" cy="32" r="20" fill="none" stroke="'+K+'" stroke-width="4"/><circle cx="42" cy="32" r="6" fill="var(--b)"/>',
 RES:'<path d="M4 60A28 28 0 0 1 60 60Z" fill="var(--a)"/><path d="M16 60A16 16 0 0 1 48 60Z" fill="'+K+'"/><path d="M26 60A6 6 0 0 1 38 60Z" fill="var(--b)"/>',
 CON:'<path d="M4 4H60L4 60Z" fill="var(--a)"/><path d="M60 8V60H8Z" fill="'+K+'"/><circle cx="32" cy="32" r="9" fill="var(--b)"/>',
 GOV:govMark()
};
function acc(code){var a=ACCENT[code]||'blue';return '--a:var(--'+a+');--b:var(--'+PARTNER[a]+');--at:var(--'+a+'-t)'}
function mark(code,size){size=size||20;return '<svg class="dm" viewBox="0 0 64 64" width="'+size+'" height="'+size+'" style="'+acc(code)+'" aria-hidden="true" focusable="false">'+(MARKS[code]||'')+'</svg>'}
function riskLabel(q){return 'Risk profile: '+AX.map(function(a){return a+' '+q.risk[a]+' of 4'}).join(', ')}
function radar(q,o){ /* five axes, 1-4 each, drawn as a pentagon on a 4-ring grid */
  o=o||{};var size=o.size||64,lab=!!o.labels,c=size/2,r=c-(lab?6:4);
  function pts(f){return AX.map(function(a,i){var an=-Math.PI/2+i*2*Math.PI/5,v=f(q.risk[a]);return [c+r*v*Math.cos(an),c+r*v*Math.sin(an)]})}
  function P(a){return a.map(function(p){return p[0].toFixed(1)+','+p[1].toFixed(1)}).join(' ')}
  var vb=lab?'-132 -28 '+(size+264)+' '+(size+52):'0 0 '+size+' '+size;
  var s='<svg class="pent'+(lab?' big':'')+'" viewBox="'+vb+'"'+(lab?'':' width="'+size+'" height="'+size+'"')+' style="'+acc(q.domain)+'" role="img" aria-label="'+riskLabel(q)+'"><title>'+riskLabel(q)+'</title>';
  [1,2,3,4].forEach(function(k){s+='<polygon points="'+P(pts(function(){return k/4}))+'" fill="none" stroke="'+(k===4?K:'var(--line2)')+'" stroke-width="'+(k===4?(lab?1.6:1):1)+'"/>'});
  if(lab)pts(function(){return 1}).forEach(function(p){s+='<line x1="'+c+'" y1="'+c+'" x2="'+p[0].toFixed(1)+'" y2="'+p[1].toFixed(1)+'" stroke="var(--line2)"/>'});
  s+='<polygon points="'+P(pts(function(v){return v/4}))+'" fill="var(--a)" fill-opacity=".45" stroke="'+K+'" stroke-width="'+(lab?2.2:1.4)+'" stroke-linejoin="round"/>';
  if(lab){
    pts(function(v){return v/4}).forEach(function(p){s+='<circle cx="'+p[0].toFixed(1)+'" cy="'+p[1].toFixed(1)+'" r="3.6" fill="'+K+'"/>'});
    pts(function(){return 1.13}).forEach(function(p,i){var cos=Math.cos(-Math.PI/2+i*2*Math.PI/5),an=Math.abs(cos)<.2?'middle':(cos>0?'start':'end');
      s+='<text x="'+p[0].toFixed(1)+'" y="'+(p[1]+4).toFixed(1)+'" text-anchor="'+an+'" font-family="Jost, sans-serif" font-weight="500" font-size="15" letter-spacing=".04em" fill="var(--muted)">'+AX[i].toUpperCase()+' '+q.risk[AX[i]]+'</text>'});
  }
  return s+'</svg>';
}
function rk(q){return radar(q,{size:24})}
function critChip(c){return '<span class="chip k-'+c+'">'+c+'</span>'}
function foot(){return '<footer class="foot pg wide">FAIAS v'+esc(F.version)+' · © 2026 Wonder Attah · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a> · manifest root '+root8+' · <a href="'+esc(F.repo)+'" target="_blank" rel="noopener">Repository</a><br>A rendering of FAIAS v'+esc(F.version)+'. The signed text is in the <a href="'+esc(F.repo)+'" target="_blank" rel="noopener">repository</a>.</footer>'}
function scrollToEl(el,off){if(!el)return;var y=el.getBoundingClientRect().top+window.pageYOffset-(off==null?110:off);window.scrollTo({top:Math.max(0,y),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})}
function tocHtml(items,title){ /* items: [id, label, num] */
  return '<details class="toc ap1" open><summary>'+(title||'On this page')+'</summary>'+items.map(function(i){return '<a href="#" data-s="'+i[0]+'">'+(i[2]!=null?'<b>'+i[2]+'</b>':'')+'<span>'+esc(i[1])+'</span></a>'}).join('')+'</details>';
}

/* ---------- nav ---------- */
function buildNav(){
  var h='<div class="ns"><input id="ns" type="search" placeholder="Search questions" aria-label="Search questions by id, title or question" autocomplete="off"><kbd aria-hidden="true">/</kbd></div><div id="nsr" hidden></div><div id="tree">';
  h+='<a href="#/reference" data-r="reference">Overview</a><a href="#/explorer" data-r="explorer" class="top-l">Explorer <span class="cnt">'+F.irqs.length+'</span></a><p class="nl">Domains</p>';
  F.domains.forEach(function(d){
    var qs=F.irqs.filter(function(q){return q.domain===d.code});
    h+='<details class="nd" data-d="'+d.code+'"><summary>'+mark(d.code,16)+esc(d.name)+'<span class="dn">'+qs.length+'</span></summary><div class="in"><a class="all" href="#/explorer?d='+d.code+'">Open in explorer</a>';
    d.subdomains.forEach(function(sd){
      h+='<details class="sd"><summary>'+esc(sd)+'</summary><div class="in">';
      qs.filter(function(q){return q.subdomain===sd}).forEach(function(q){h+='<a class="ni" data-irq="'+q.id+'" href="#/irq/'+q.id+'"><b>'+shortId(q.id)+'</b><span>'+esc(q.title)+'</span><i class="mk"></i></a>'});
      h+='</div></details>';
    });
    h+='</div></details>';
  });
  h+='<p class="nl">Reference</p><a href="#/claims" data-r="claims">Claims <span class="cnt">'+F.claims.length+'</span></a><a href="#/library" data-r="library">Library <span class="cnt">'+F.library.length+'</span></a><a href="#/notes" data-r="notes" class="top-l">My notes <span class="cnt" id="notecount">0</span></a></div>';
  $('#nav').innerHTML=h;
  var inp=$('#ns'),res=$('#nsr'),tree=$('#tree');
  inp.addEventListener('input',function(){
    var t=inp.value.trim().toLowerCase();
    if(!t){res.hidden=true;tree.hidden=false;return}
    var toks=t.split(/\s+/),hits=F.irqs.filter(function(q){var s=(q.id+' '+q.title+' '+q.question).toLowerCase();return toks.every(function(k){return s.indexOf(k)>=0})});
    tree.hidden=true;res.hidden=false;
    res.innerHTML=(hits.length?hits.slice(0,30).map(function(q){return '<a class="ni" data-irq="'+q.id+'" href="#/irq/'+q.id+'"><b>'+shortId(q.id)+'</b><span>'+esc(q.title)+'</span><i class="mk"></i></a>'}).join(''):'<div class="none">No matching question.</div>')+(hits.length>30?'<div class="more">'+hits.length+' matches. <a href="#/explorer?q='+encodeURIComponent(inp.value.trim())+'">Show all in explorer</a></div>':'');
    marks();
  });
  inp.addEventListener('keydown',function(e){
    if(e.key==='Enter'&&inp.value.trim()){location.hash='#/explorer?q='+encodeURIComponent(inp.value.trim());inp.value='';inp.dispatchEvent(new Event('input'))}
    if(e.key==='Escape'){inp.value='';inp.dispatchEvent(new Event('input'));inp.blur()}
  });
  document.addEventListener('keydown',function(e){if(e.key==='/'&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)){e.preventDefault();document.body.classList.add('navopen');inp.focus()}});
  marks();
}
function navActive(route,id){
  $$('#nav a.on').forEach(function(a){a.classList.remove('on')});
  var el=null;
  if(route==='irq'){
    el=$('#tree a[data-irq="'+id+'"]');
    if(el){var p=el.parentNode;while(p&&p.id!=='tree'){if(p.tagName==='DETAILS')p.open=true;p=p.parentNode}}
  }else el=$('#nav a[data-r="'+route+'"]');
  if(el){el.classList.add('on');var n=$('#nav');var r=el.getBoundingClientRect(),nr=n.getBoundingClientRect();if(r.top<nr.top+60||r.bottom>nr.bottom-20)n.scrollTop+=r.top-nr.top-nr.height/3}
}

/* ---------- views ---------- */
var token=0;
function setView(name,main,aside){document.body.setAttribute('data-view',name);$('#main').innerHTML=main;$('#aside').innerHTML=aside||'';}

function distHtml(){var max=Math.max.apply(null,stars);return '<div class="dist">'+stars.map(function(n,i){var s=i+1;return '<b>★'+s+'</b><div class="tr'+(n?'':' z')+'"><i style="width:'+(n/max*100)+'%;background:var(--s'+Math.min(s,4)+')"></i></div><span class="n">'+n+'</span>'}).join('')+'</div>'}
function viewRefHome(){
  var rd=F.library.filter(function(l){return l.slug==='readme'})[0];
  var main='<div class="pg wide"><p class="eyebrow">v'+esc(F.version)+' · signed '+esc(F.signed)+' · CC BY 4.0</p><h1 id="h-top">'+esc(rd?rd.title:'FAIAS')+'</h1>'
   +'<div class="lead" id="lead"></div>'
   +'<dl class="stats">'+[['Domains',F.domains.length],['Subdomains',nSub],['Questions',F.irqs.length],['Claims',F.claims.length],['Library documents',F.library.length]].map(function(s){return '<div><dt>'+s[0]+'</dt><dd>'+s[1]+'</dd></div>'}).join('')+'</dl>'
   +'<section class="sec" id="h-map"><h2>Question map</h2><p class="sub">One square per question, shaded by Testing Confidence (★1 light, ★4 dark).</p><div class="map">'
   +F.domains.map(function(d){var qs=F.irqs.filter(function(q){return q.domain===d.code});return '<div class="mrow"><div class="dn">'+mark(d.code,28)+'<a href="#/explorer?d='+d.code+'">'+esc(d.name)+'</a><small>'+esc(d.range)+' · '+qs.length+' questions</small></div><div class="cells">'+qs.map(function(q){return '<a class="cell s'+q.star+'" href="#/irq/'+q.id+'" title="'+esc(q.id+' · '+q.title+' · ★'+q.star)+'" aria-label="'+esc(q.id+' '+q.title+', Testing Confidence star '+q.star)+'">'+q.star+'</a>'}).join('')+'</div></div>'}).join('')
   +'</div></section>'
   +'<section class="sec" id="h-dist"><h2>Testing Confidence</h2><p class="sub">Number of test procedures at each rating.</p>'+distHtml()+'</section>'
   +'<section class="sec" id="h-go"><h2>Go to</h2><div class="links"><a href="#/explorer">Explorer<span>'+F.irqs.length+' questions</span></a><a href="#/claims">Claims<span>'+F.claims.length+' in '+themes.length+' themes</span></a><a href="#/library">Library<span>'+F.library.length+' documents</span></a><a href="#/notes">My notes<span>stored in this browser</span></a></div></section></div>'+foot();
  var aside=tocHtml([['h-top','Overview'],['h-map','Question map'],['h-dist','Testing Confidence'],['h-go','Go to']])
   +'<div class="ap1"><h4>Release</h4><dl class="kv"><dt>Version</dt><dd>'+esc(F.version)+'</dd><dt>Signed</dt><dd>'+esc(F.signed)+'</dd><dt>Files</dt><dd>'+F.files+'</dd><dt>Root</dt><dd>'+esc(F.root)+'</dd></dl></div>';
  setView('home',main,aside);
  getDoc('readme').then(function(d){
    if(!$('#lead'))return;var t=document.createElement('div');t.innerHTML=d.html;
    var h2=$('h2',t),p=h2&&h2.nextElementSibling;if(p&&p.tagName==='P')$('#lead').innerHTML='<p>'+p.innerHTML+'</p>';
  }).catch(function(){});
}

/* ---------- story: the walk and the journeys ---------- */
var trail=[],lazy={},lazyObs=null;
try{trail=(JSON.parse(sessionStorage.getItem('faias.trail')||'[]')||[]).filter(function(i){return byId[i]})}catch(e){}
function saveTrail(){try{sessionStorage.setItem('faias.trail',JSON.stringify(trail))}catch(e){}}
/* Starting questions first: the walk opens on one of F.starters, and "Another question" offers the starters not yet
   visited before it draws from all questions. */
function randomId(not){
  var pool=(F.starters||[]).filter(function(i){return byId[i]&&i!==not&&trail.indexOf(i)<0});
  if(!pool.length)pool=F.irqs.map(function(q){return q.id}).filter(function(i){return i!==not});
  return pool[Math.floor(Math.random()*pool.length)]||F.irqs[0].id;
}
var famBy={};F.regFamilies.forEach(function(f){famBy[f.key]=f});
function secOf(dt,n){var s=dt.canvas.filter(function(c){return c.n===n})[0];return s?clean(s.html):''}
function scaleHtml(n){return '<span class="scale" role="img" aria-label="'+n+' of 4 used levels filled; level 5 unused">'+[1,2,3,4].map(function(k){return '<i class="'+(k<=n?'f':'')+'"></i>'}).join('')+'<i class="x" title="★5 is not assigned to any test"></i></span>'}
function scenesHtml(list){
  return '<div class="sw"><div class="scenes"><nav class="rail" aria-label="Steps"><ol>'+list.map(function(s){return '<li><a href="#" data-s="'+s.id+'">'+esc(s.label)+'</a></li>'}).join('')+'</ol></nav><div class="col">'
   +list.map(function(s,i){return '<section class="scene" id="'+s.id+'"'+(s.lazy?' data-lazy':'')+'><p class="sno">'+String(i+1).padStart(2,'0')+'</p><h2>'+esc(s.label)+'</h2><div class="sbody">'+s.body+'</div></section>'}).join('')+'</div></div></div>';
}
function bindRail(){
  var rail=$('.rail');if(!rail)return;var links=$$('a[data-s]',rail);
  rail.addEventListener('click',function(e){var a=e.target.closest('a[data-s]');if(!a)return;e.preventDefault();scrollToEl(document.getElementById(a.dataset.s),matchMedia('(max-width:900px)').matches?150:120)});
  if(!('IntersectionObserver' in window))return;
  if(sectionObs)sectionObs.disconnect();
  function mark(i){links.forEach(function(a,j){var li=a.parentNode;li.classList.toggle('done',j<i);li.classList.toggle('on',j===i)});if(matchMedia('(max-width:900px)').matches){var o=$('ol',rail);o.scrollLeft=links[i].parentNode.offsetLeft-24}}
  mark(0);
  sectionObs=new IntersectionObserver(function(es){es.forEach(function(en){if(en.isIntersecting){var i=links.findIndex(function(a){return a.dataset.s===en.target.id});if(i>=0)mark(i)}})},{rootMargin:'-150px 0px -65% 0px'});
  links.forEach(function(a){var el=document.getElementById(a.dataset.s);if(el)sectionObs.observe(el)});
}
function lazyInit(){
  if(lazyObs){lazyObs.disconnect();lazyObs=null}
  function run(el){var f=lazy[el.id];if(f){delete lazy[el.id];f(el)}}
  var els=$$('[data-lazy]');
  if(!('IntersectionObserver' in window)){els.forEach(run);return}
  lazyObs=new IntersectionObserver(function(es){es.forEach(function(en){if(en.isIntersecting){lazyObs.unobserve(en.target);run(en.target)}})},{rootMargin:'900px 0px'});
  els.forEach(function(el){lazyObs.observe(el)});
}
function trailHtml(cur){return '<div class="trail"><div class="sw"><span class="lab">Trail</span><ol id="tl">'+trail.map(function(id,i){return '<li'+(id===cur?' class="cur"':'')+'><a href="#/walk/'+id+'" title="'+esc(byId[id].title)+'"><b>'+(i+1)+'</b>'+mark(byId[id].domain,14)+shortId(id)+'</a></li>'}).join('')+'</ol><button class="btn" type="button" data-act="tclear" data-cur="'+cur+'">Clear</button></div></div>'}
function tail(extra){return '<div class="sw">'+(extra||'')+foot()+'</div>'}

function viewWalk(id){
  if(!id||!byId[id]){id=randomId();history.replaceState(null,'','#/walk/'+id)}
  if(trail.indexOf(id)<0){trail.push(id);saveTrail()}
  var q=byId[id],d=DOM[q.domain],my=++token;
  var hero='<div class="sw hero walk"><div class="hq"><p class="eyebrow hm">'+mark(q.domain,30)+'<span>'+esc(d.name)+' / '+esc(q.subdomain)+' · '+q.id+'</span></p><h1 class="kq">'+esc(q.question)+'</h1>'
   +'<dl class="facts"><div><dt>Title</dt><dd>'+esc(q.title)+'</dd></div><div><dt>Testing Confidence</dt><dd>'+starChip(q.star)+'</dd></div><div><dt>Applies to</dt><dd>'+appl(q)+'</dd></div></dl>'
   +'<div class="acts"><button class="btn pri big2" type="button" data-act="random" data-cur="'+id+'">Another question</button><a class="btn big2" href="#/irq/'+id+'">Open full entry</a></div></div>'
   +'<figure class="hp">'+radar(q,{size:180,labels:true})+'<figcaption>Risk Weighting Profile (5 Axes, 1–4)</figcaption></figure></div>';
  setView('walk',trailHtml(id)+hero+'<div id="sc"><div class="sw"><p class="loading">Loading…</p></div></div>'+tail(),'');
  var c=$('#tl .cur');if(c)$('#tl').scrollLeft=c.offsetLeft-20;
  getIrq(id).then(function(dt){
    if(my!==token)return;
    var fams=(q.regs||[]).map(function(k){return famBy[k]}).filter(Boolean);
    var list=[
     {id:'sc-fail',label:'How it fails',body:'<div class="prose">'+secOf(dt,4)+secOf(dt,6)+'</div>'},
     {id:'sc-miss',label:'Why an expert may miss it',body:'<div class="prose">'+secOf(dt,7)+'</div>'},
     {id:'sc-test',label:'How you would test it',body:'<div class="th"><span class="big">★'+q.star+' '+scaleHtml(q.star)+'</span><p class="method"><span class="mono" style="font-size:13px">'+esc(q.tp)+'</span> · '+esc(q.tpTitle)+'<br>'+esc(q.method)+'</p></div><div class="prose">'+secOf(dt,11)+'</div><button class="btn" type="button" data-act="proc">Show the full test procedure</button><div class="prose" id="proc" hidden style="margin-top:22px">'+clean(dt.procedure)+'</div>'},
     {id:'sc-reg',label:'What regulation says',body:(q.regSilence?'<p class="silence"><small>Where regulation is silent</small>'+esc(q.regSilence)+'</p>':'')+(fams.length?'<div class="regs"><span>Cited in the Regulatory Basis</span>'+fams.map(function(f){return '<span class="chip">'+esc(f.label)+'</span>'}).join('')+'</div>':'')+'<div class="prose">'+secOf(dt,17)+'</div>'},
     {id:'sc-claims',label:'What it supports',body:q.claims.map(function(c){var cl=claimBy[c];return cl?'<article class="cl2"><h3><span class="id">'+c+'</span><a href="#/claims/'+c+'">'+esc(cl.title)+'</a> '+critChip(cl.criticality)+'</h3><p>'+esc(cl.statement)+'</p></article>':''}).join('')},
     {id:'sc-next',label:'Where next',body:q.related.map(function(r){var o=byId[r];return o?'<a class="nx1" href="#/walk/'+r+'"><span class="id">'+r+' · ★'+o.star+'</span><strong>'+esc(o.title)+'</strong><span class="q">'+esc(o.question)+'</span></a>':''}).join('')+'<div class="acts"><button class="btn pri" type="button" data-act="random" data-cur="'+id+'">Another question</button><a class="btn" href="#/irq/'+id+'">Open full entry</a></div>'}
    ];
    $('#sc').innerHTML=scenesHtml(list);bindRail();
  }).catch(function(){if(my===token)$('#sc').innerHTML='<div class="sw"><p class="loading">The canvas file for '+esc(id)+' could not be loaded.</p></div>'});
}

var JOUR=[{k:'confidence',t:'Gaining confidence'},{k:'regulator',t:'What regulation says'},{k:'experts',t:'Why experts may miss it'},{k:'fails',t:'How it fails: failure chains'}];
var CONF=[['Review hierarchy','assurance-model','1. Review Hierarchy: Outcome-First Structure'],['Evidence levels','assurance-model','5. Evidence Levels: L1–L5 Worth Scale'],['Testing confidence','assurance-model','6. Testing Confidence Scale: ★1–★5 with Defined Anchors'],['Claims and opinion','assurance-architecture','LAYER 2: Assurance Claims & Opinion'],['Review confidence','assurance-architecture','FINAL LAYER: Review Confidence']];
function groups(f){return F.domains.map(function(d){return {d:d,ids:F.irqs.filter(function(q){return q.domain===d.code&&f(q)}).map(function(q){return q.id})}}).filter(function(g){return g.ids.length})}
function stepsOf(k){return k==='confidence'?CONF.map(function(c){return c[0]}):k==='regulator'?['Regulations cited','Where regulation is silent']:groups(k==='experts'?function(q){return q.risk.Novelty===4}:function(){return true}).map(function(g){return g.d.name})}
function viewJourneys(){
  setView('journeys','<div class="sw"><div class="hero sm"><p class="eyebrow">Journeys</p><h1 class="kq">Journeys</h1></div><div class="jl">'+JOUR.map(function(j,i){return '<a href="#/journey/'+j.k+'"><span class="jn">'+(i+1)+'</span><span class="jt">'+esc(j.t)+'</span><span class="js">'+esc(stepsOf(j.k).join(' · '))+'</span></a>'}).join('')+'</div></div>'+tail(),'');
}
var fidx={},fgs=[];
function paintFail(code){
  var g=fgs.filter(function(x){return x.d.code===code})[0],id=g.ids[fidx[code]],q=byId[id];
  return getIrq(id).then(function(dt){var el=$('#f-'+code+' .xb');if(!el)return;
    el.innerHTML='<p class="eyebrow">'+id+' · '+esc(q.subdomain)+'</p><h3>'+esc(q.title)+'</h3><p class="exq">'+esc(q.question)+'</p><div class="prose">'+secOf(dt,6)+'</div><div class="more2"><button class="btn" type="button" data-act="cycle" data-d="'+code+'">Another in this domain</button><a class="btn" href="#/walk/'+id+'">Walk from here</a><a class="btn" href="#/irq/'+id+'">Open full entry</a></div>'});
}
function viewJourney(k){
  var ki=JOUR.map(function(j){return j.k}).indexOf(k);
  if(ki<0){location.hash='#/journeys';return}
  var j=JOUR[ki],nj=JOUR[(ki+1)%JOUR.length],my=++token;
  var hero='<div class="sw hero sm"><p class="eyebrow">Journey '+(ki+1)+' of '+JOUR.length+'</p><h1 class="kq">'+esc(j.t)+'</h1></div>';
  var end=tail('<div class="nj"><a class="btn pri" href="#/journey/'+nj.k+'">Next journey: '+esc(nj.t)+'</a></div>');
  function finish(list){if(my!==token)return;setView('journey',hero+scenesHtml(list)+end,'');bindRail();lazyInit()}
  setView('journey',hero+'<div class="sw"><p class="loading">Loading…</p></div>'+end,'');
  if(k==='confidence'){
    Promise.all([getDoc('assurance-model'),getDoc('assurance-architecture')]).then(function(ds){
      var docs={'assurance-model':ds[0],'assurance-architecture':ds[1]};
      finish(CONF.map(function(c,n){
        var s=docs[c[1]].sections.filter(function(x){return x.h===c[2]})[0],t=F.library.filter(function(l){return l.slug===c[1]})[0].title;
        return {id:'j'+n,label:c[0],body:'<p class="eyebrow">'+esc(c[2])+' · '+esc(t)+'</p>'+(s?'<div class="clip prose">'+clean(s.html)+'</div><button class="btn" type="button" data-act="clip">Read the full section</button>':'<p class="loading">Section not found in the data.</p>')+(n===2?'<h3 style="margin-top:40px">Test procedures by rating ('+F.irqs.length+')</h3>'+distHtml():'')};
      }));
    }).catch(function(){if(my===token)$('.loading').textContent='The documents could not be loaded.'});
  }else if(k==='regulator'){
    var mx=Math.max.apply(null,F.regFamilies.map(function(f){return f.irqs.length})),sil=F.irqs.filter(function(q){return q.regSilence});
    finish([{id:'r0',label:'Regulations cited',body:F.regFamilies.slice().sort(function(a,b){return b.irqs.length-a.irqs.length}).map(function(f){return '<button class="fam" type="button" data-act="fam" aria-expanded="false"><span class="fl2">'+esc(f.label)+'</span><span class="fb"><i style="width:'+(f.irqs.length/mx*100)+'%"></i></span><span class="fs">Cited in the Regulatory Basis of '+f.irqs.length+' questions</span></button><div class="famlist" hidden>'+f.irqs.map(function(i){return '<a class="tag" href="#/walk/'+i+'" title="'+esc(byId[i].title)+'">'+shortId(i)+'</a>'}).join('')+'</div>'}).join('')},
      {id:'r1',label:'Where regulation is silent',body:'<p class="eyebrow">'+sil.length+' questions</p>'+sil.map(function(q){return '<blockquote class="sil"><p>'+esc(q.regSilence)+'</p><footer><a href="#/walk/'+q.id+'">'+q.id+'</a> · '+esc(q.title)+'</footer></blockquote>'}).join('')}]);
  }else if(k==='experts'){
    var gs=groups(function(q){return q.risk.Novelty===4});
    gs.forEach(function(g){lazy['x-'+g.d.code]=function(el){Promise.all(g.ids.map(function(i){return getIrq(i)})).then(function(dts){if(my!==token)return;
      $('.xb',el).innerHTML=g.ids.map(function(id,n){var q=byId[id];return '<article class="ex"><h3><a href="#/walk/'+id+'">'+shortId(id)+'</a> '+esc(q.title)+'</h3><p class="exq">'+esc(q.question)+'</p><div class="prose">'+secOf(dts[n],7)+'</div></article>'}).join('')}).catch(function(){$('.xb',el).textContent='Could not load.'})}});
    finish(gs.map(function(g){return {id:'x-'+g.d.code,label:g.d.name,lazy:true,body:'<p class="eyebrow hm">'+mark(g.d.code,22)+'<span>Novelty 4 · '+g.ids.length+' questions</span></p><div class="xb"><p class="loading">Loading…</p></div>'}}));
  }else{
    fgs=groups(function(){return true});
    fgs.forEach(function(g){var bs=-1;fidx[g.d.code]=0;g.ids.forEach(function(i,n){var s=AX.reduce(function(a,x){return a+byId[i].risk[x]},0);if(s>bs){bs=s;fidx[g.d.code]=n}});lazy['f-'+g.d.code]=function(){paintFail(g.d.code)}});
    finish(fgs.map(function(g){return {id:'f-'+g.d.code,label:g.d.name,lazy:true,body:'<p class="eyebrow hm">'+mark(g.d.code,22)+'<span>'+esc(g.d.range)+' · '+g.ids.length+' questions</span></p><div class="xb"><p class="loading">Loading…</p></div>'}}));
  }
}
$('#main').addEventListener('click',function(e){
  var b=e.target.closest('[data-act]');if(!b)return;var a=b.dataset.act;
  if(a==='random')location.hash='#/walk/'+randomId(b.dataset.cur);
  else if(a==='tclear'){trail=[b.dataset.cur];saveTrail();viewWalk(b.dataset.cur)}
  else if(a==='proc'){var el=$('#proc');el.hidden=!el.hidden;b.textContent=el.hidden?'Show the full test procedure':'Hide the full test procedure'}
  else if(a==='clip'){b.previousElementSibling.classList.add('open');b.remove()}
  else if(a==='fam'){var l=b.nextElementSibling;l.hidden=!l.hidden;b.setAttribute('aria-expanded',String(!l.hidden))}
  else if(a==='cycle'){fidx[b.dataset.d]=(fidx[b.dataset.d]+1)%fgs.filter(function(x){return x.d.code===b.dataset.d})[0].ids.length;paintFail(b.dataset.d)}
});

/* explorer */
var FS={d:[],a:[],s:[],k:[],c:'',q:'',sort:'id',dir:1};
function readParams(qs){
  FS={d:[],a:[],s:[],k:[],c:'',q:'',sort:'id',dir:1};
  new URLSearchParams(qs||'').forEach(function(v,k){
    if(['d','a','s','k'].indexOf(k)>=0)FS[k]=v.split(',').filter(Boolean);
    else if(k==='c'||k==='q')FS[k]=v;else if(k==='sort')FS.sort=v;else if(k==='dir')FS.dir=v==='desc'?-1:1;
  });
}
function writeParams(){
  var p=new URLSearchParams();
  ['d','a','s','k'].forEach(function(k){if(FS[k].length)p.set(k,FS[k].join(','))});
  if(FS.c)p.set('c',FS.c);if(FS.q)p.set('q',FS.q);if(FS.sort!=='id'||FS.dir<0){p.set('sort',FS.sort);p.set('dir',FS.dir<0?'desc':'asc')}
  var s=p.toString();history.replaceState(null,'','#/explorer'+(s?'?'+s:''));
}
function filtered(){
  var toks=FS.q.toLowerCase().split(/\s+/).filter(Boolean);
  var r=F.irqs.filter(function(q){
    if(FS.d.length&&FS.d.indexOf(q.domain)<0)return false;
    if(FS.a.length&&!FS.a.some(function(x){return q[x]}))return false;
    if(FS.s.length&&FS.s.indexOf(String(q.star))<0)return false;
    if(FS.c&&q.claims.indexOf(FS.c)<0)return false;
    if(FS.k.length&&!q.claims.some(function(c){return claimBy[c]&&FS.k.indexOf(claimBy[c].criticality)>=0}))return false;
    if(toks.length){var h=(q.id+' '+q.title+' '+q.question).toLowerCase();if(!toks.every(function(t){return h.indexOf(t)>=0}))return false}
    return true;
  });
  var sum=function(q){return AX.reduce(function(a,x){return a+q.risk[x]},0)};
  var key={id:function(a,b){return order[a.id]-order[b.id]},title:function(a,b){return a.title.localeCompare(b.title)},star:function(a,b){return a.star-b.star||order[a.id]-order[b.id]},risk:function(a,b){return sum(a)-sum(b)||order[a.id]-order[b.id]}}[FS.sort]||function(){return 0};
  return r.sort(function(a,b){return key(a,b)*FS.dir});
}
function chipGroup(k,items){return items.map(function(i){return '<button type="button" class="chip" data-k="'+k+'" data-v="'+esc(i[0])+'" aria-pressed="false">'+i[1]+'</button>'}).join('')}
function rowHtml(q){
  return '<tr data-href="#/irq/'+q.id+'"><td class="cid"><a href="#/irq/'+q.id+'" data-irq="'+q.id+'">'+shortId(q.id)+'</a> <i class="mk"></i></td><td class="cti"><a href="#/irq/'+q.id+'" tabindex="-1">'+esc(q.title)+'</a><small>'+esc(q.subdomain)+'</small></td><td class="cap">'+appl(q)+'</td><td class="cst">'+starChip(q.star)+'</td><td class="crk">'+rk(q)+'</td><td class="ccl">'+q.claims.map(function(c){return esc(c)}).join(' ')+'</td></tr>';
}
function viewExplorer(qs){
  readParams(qs);
  var cols=[['id','ID'],['title','Question'],null,['star','★'],['risk','Risk'],null];
  var main='<div class="pg wide"><p class="eyebrow">Explorer</p><h1>All questions</h1>'
   +'<div class="fbar" role="group" aria-label="Filters">'
   +'<div class="frow"><span class="fl">Domain</span>'+chipGroup('d',F.domains.map(function(d){return [d.code,esc(d.name)]}))+'</div>'
   +'<div class="frow"><span class="fl">Applies to</span>'+chipGroup('a',APPL.map(function(a){return [a[0],a[1]]}))+'</div>'
   +'<div class="frow"><span class="fl">Rating</span>'+chipGroup('s',[1,2,3,4].map(function(n){return [String(n),'★'+n]}))+'</div>'
   +'<div class="frow"><span class="fl">Claim criticality</span>'+chipGroup('k',CRIT.map(function(c){return [c,c]}))+'</div>'
   +'<div class="frow"><label for="fc">Claim</label><select class="fin" id="fc"><option value="">Any claim</option>'+F.claims.map(function(c){return '<option value="'+c.id+'">'+c.id+' · '+esc(c.title)+'</option>'}).join('')+'</select></div>'
   +'<div class="frow"><label for="fq">Search</label><input class="fin" id="fq" type="search" placeholder="Id, title or question" autocomplete="off"><select class="fin" id="fsort" aria-label="Sort by"><option value="id">Sort: order</option><option value="title">Sort: title</option><option value="star">Sort: ★</option><option value="risk">Sort: risk</option></select></div></div>'
   +'<div class="count"><span><b id="cnt"></b> questions shown</span><button class="btn" id="reset" type="button">Reset filters</button></div>'
   +'<div class="tw rt"><table class="tbl"><thead><tr>'+cols.map(function(c,i){return c?'<th scope="col" data-sk="'+c[0]+'"><button type="button">'+c[1]+'<span aria-hidden="true" class="ar"></span></button></th>':'<th scope="col">'+(i===2?'Applies':'Claims')+'</th>'}).join('')+'</tr></thead><tbody id="tb"></tbody></table></div><div class="empty" id="none" hidden>No question matches these filters.</div></div>'+foot();
  setView('explorer',main,'<div id="xa"></div>');
  $('#fq').value=FS.q;$('#fc').value=FS.c;$('#fsort').value=FS.sort;
  function paint(){
    var r=filtered();
    $('#cnt').textContent=r.length+' of '+F.irqs.length;
    $('#tb').innerHTML=r.map(rowHtml).join('');$('#none').hidden=r.length>0;
    $$('.chip[data-k]').forEach(function(b){b.setAttribute('aria-pressed',FS[b.dataset.k].indexOf(b.dataset.v)>=0)});
    $$('th[data-sk]').forEach(function(t){var on=t.dataset.sk===FS.sort;t.setAttribute('aria-sort',on?(FS.dir>0?'ascending':'descending'):'none');$('.ar',t).textContent=on?(FS.dir>0?'↑':'↓'):''});
    var cs=[1,2,3,4].map(function(n){return r.filter(function(q){return q.star===n}).length}),mx=Math.max.apply(null,cs.concat([1]));
    var act=[];FS.d.forEach(function(x){act.push(DOM[x].name)});FS.a.forEach(function(x){act.push(APPL.filter(function(a){return a[0]===x})[0][1])});FS.s.forEach(function(x){act.push('★'+x)});FS.k.forEach(function(x){act.push(x+' claims')});if(FS.c)act.push(FS.c);if(FS.q)act.push('“'+FS.q+'”');
    $('#xa').innerHTML='<div class="ap1"><h4>Result</h4><div class="big">'+r.length+'<span style="font-size:15px;color:var(--muted);font-family:var(--font)">of '+F.irqs.length+'</span></div></div>'
      +'<div class="ap1"><h4>Rating in result</h4><div class="dist" style="grid-template-columns:34px 1fr 30px">'+cs.map(function(n,i){return '<b>★'+(i+1)+'</b><div class="tr'+(n?'':' z')+'"><i style="width:'+(n/mx*100)+'%;background:var(--s'+(i+1)+')"></i></div><span class="n">'+n+'</span>'}).join('')+'</div></div>'
      +'<div class="ap1"><h4>Active filters</h4>'+(act.length?'<div style="display:flex;flex-wrap:wrap;gap:5px">'+act.map(function(a){return '<span class="chip">'+esc(a)+'</span>'}).join('')+'</div>':'<p style="font-size:14px;color:var(--muted);margin:0">None.</p>')+'</div>'
      +'<div class="ap1"><h4>Filters combine</h4><p style="font-size:13.5px;color:var(--muted);margin:0">Values inside one group match any; groups are combined with and.</p></div>';
    marks();writeParams();
  }
  $('.fbar').addEventListener('click',function(e){var b=e.target.closest('.chip[data-k]');if(!b)return;var a=FS[b.dataset.k],i=a.indexOf(b.dataset.v);i<0?a.push(b.dataset.v):a.splice(i,1);paint()});
  $('#fq').addEventListener('input',function(e){FS.q=e.target.value;paint()});
  $('#fc').addEventListener('change',function(e){FS.c=e.target.value;paint()});
  $('#fsort').addEventListener('change',function(e){FS.sort=e.target.value;FS.dir=1;paint()});
  $('#reset').addEventListener('click',function(){var s=FS.sort,d=FS.dir;readParams('');FS.sort=s;FS.dir=d;$('#fq').value='';$('#fc').value='';paint()});
  $('thead').addEventListener('click',function(e){var t=e.target.closest('th[data-sk]');if(!t)return;if(FS.sort===t.dataset.sk)FS.dir*=-1;else{FS.sort=t.dataset.sk;FS.dir=t.dataset.sk==='star'||t.dataset.sk==='risk'?-1:1}$('#fsort').value=FS.sort;paint()});
  $('#tb').addEventListener('click',function(e){var tr=e.target.closest('tr');if(tr&&!e.target.closest('a'))location.hash=tr.dataset.href});
  paint();
}

/* detail */
var sectionObs=null;
function viewIrq(id){
  var q=byId[id],my=++token;
  if(!q){setView('irq','<div class="pg"><h1>Not found</h1><p>No question with id '+esc(id)+'.</p><p><a href="#/explorer">Open explorer</a></p></div>'+foot(),'');return}
  var d=DOM[q.domain],i=order[id],pv=F.irqs[i-1],nx=F.irqs[i+1];
  var lede='<div class="pg lede"><p class="crumbs"><a href="#/explorer?d='+q.domain+'">'+esc(d.name)+'</a> / '+esc(q.subdomain)+'</p><p class="eyebrow hm">'+mark(q.domain,26)+'<span>'+esc(q.id)+'</span></p><h1>'+esc(q.title)+'</h1><p class="q">'+esc(q.question)+'</p>'
   +'<div class="meta">'+appl(q)+''+APPL.filter(function(a){return q[a[0]]}).map(function(a){return '<span class="chip">'+a[1]+'</span>'}).join('')+'</div>'
   +'<div class="acts" style="margin-top:14px"><a class="btn pri" href="#/walk/'+q.id+'">Walk from here</a></div><dl class="obj"><dt>Objective</dt><dd>'+esc(q.objective)+'</dd></dl></div>';
  var body='<div class="pg body" id="bodyc"><div class="loading">Loading canvas and test procedure…</div></div>';
  var pn='<div class="pg pn">'+(pv?'<a href="#/irq/'+pv.id+'"><small>Previous · '+esc(pv.id)+'</small>'+esc(pv.title)+'</a>':'<span></span>')+(nx?'<a class="nx" href="#/irq/'+nx.id+'"><small>Next · '+esc(nx.id)+'</small>'+esc(nx.title)+'</a>':'')+'</div>';
  var nt=getNote(id);
  var aside='<div class="ap1"><h4>Testing Confidence</h4><div class="big">★'+q.star+' <span class="scale" role="img" aria-label="'+q.star+' of 4 used levels filled; level 5 unused">'+[1,2,3,4].map(function(n){return '<i class="'+(n<=q.star?'f':'')+'"></i>'}).join('')+'<i class="x" title="★5 is not assigned to any test"></i></span></div><p class="method"><span class="mono" style="font-size:12.5px">'+esc(q.tp)+'</span> · '+esc(q.tpTitle)+'<br>'+esc(q.method)+'</p></div>'
   +'<div class="ap1"><h4>Risk profile</h4><div class="apent">'+radar(q,{size:64})+'</div><div class="axis">'+AX.map(function(a){var v=q.risk[a];return '<span>'+a+'</span><span class="seg" aria-hidden="true">'+[1,2,3,4].map(function(n){return '<i class="'+(n<=v?'f':'')+'"></i>'}).join('')+'</span><b>'+v+'/4</b>'}).join('')+'</div></div>'
   +'<div class="ap1"><h4>Supports claims</h4><div class="cl1">'+q.claims.map(function(c){var cl=claimBy[c];return cl?'<a href="#/claims/'+c+'"><b>'+c+'</b>'+esc(cl.title)+'<em class="k-'+cl.criticality+'" style="border:0">'+cl.criticality+'</em></a>':''}).join('')+'</div></div>'
   +'<div class="ap1"><h4>Related questions</h4><div class="rel">'+(q.related.length?q.related.map(function(r){return byId[r]?'<a href="#/irq/'+r+'"><b>'+shortId(r)+'</b><span>'+esc(byId[r].title)+'</span></a>':''}).join(''):'<span style="color:var(--muted)">None listed.</span>')+'</div></div>'
   +'<div class="ap1 nt"><h4>My note</h4><label class="sr" for="nst">Status</label><select id="nst"><option value="">No status</option>'+STATUS.map(function(s){return '<option'+(nt.status===s?' selected':'')+'>'+s+'</option>'}).join('')+'</select><label class="sr" for="nnt">Note</label><textarea id="nnt" placeholder="Private note">'+esc(nt.note)+'</textarea><p>'+(lsOK?'Stored in this browser only. Nothing is sent anywhere.':'Browser storage is unavailable; notes last for this visit only.')+'</p></div>'
   +'<div id="tocslot"></div>';
  setView('irq',lede+body+pn+foot(),aside);
  $('#nst').addEventListener('change',function(e){setNote(id,{status:e.target.value})});
  $('#nnt').addEventListener('input',function(e){setNote(id,{note:e.target.value})});
  getIrq(id).then(function(dt){
    if(my!==token)return;
    var secs=dt.canvas.map(function(s){return '<section id="s-'+s.n+'"><h2 class="sh"><span class="sn">'+String(s.n).padStart(2,'0')+'</span>'+esc(s.title)+'</h2><div class="prose">'+clean(s.html)+'</div></section>'}).join('');
    secs+='<section id="s-tp"><h2 class="sh"><span class="sn">TP</span>Test procedure · '+esc(q.tp)+'</h2><div class="prose">'+clean(dt.procedure)+'</div></section>';
    $('#bodyc').innerHTML=secs;
    var items=dt.canvas.map(function(s){return ['s-'+s.n,s.title,String(s.n).padStart(2,'0')]}).concat([['s-tp','Test procedure','TP']]);
    $('#tocslot').innerHTML=tocHtml(items);bindToc(items.map(function(i){return i[0]}));
  }).catch(function(){if(my===token)$('#bodyc').innerHTML='<p class="loading">The canvas file for '+esc(id)+' could not be loaded.</p>'});
}
function bindToc(ids){
  var toc=$('.toc');if(!toc)return;
  if(matchMedia('(max-width:1180px)').matches)toc.open=false;
  toc.addEventListener('click',function(e){var a=e.target.closest('a[data-s]');if(!a)return;e.preventDefault();scrollToEl(document.getElementById(a.dataset.s),70)});
  if(sectionObs)sectionObs.disconnect();
  if(!('IntersectionObserver' in window))return;
  sectionObs=new IntersectionObserver(function(es){es.forEach(function(en){if(en.isIntersecting){$$('.toc a.on').forEach(function(a){a.classList.remove('on')});var a=$('.toc a[data-s="'+en.target.id+'"]');if(a){a.classList.add('on')}}})},{rootMargin:'-70px 0px -70% 0px'});
  ids.forEach(function(i){var el=document.getElementById(i);if(el)sectionObs.observe(el)});
}

/* claims */
var CK=[];
function viewClaims(sel){
  var main='<div class="pg wide"><p class="eyebrow">Claims</p><h1>Assurance claims</h1><div class="fbar"><div class="frow"><span class="fl">Criticality</span>'+chipGroup('k',CRIT.map(function(c){return [c,c]}))+'<span style="margin-left:auto;font-size:14px;color:var(--muted)"><b class="mono" id="ccnt" style="color:var(--ink)"></b> claims shown</span></div></div><div class="pg" style="padding:0" id="clist"></div></div>'+foot();
  var aside='<div id="ctoc"></div>';
  setView('claims',main,aside);
  function paint(){
    var shown=F.claims.filter(function(c){return !CK.length||CK.indexOf(c.criticality)>=0});
    $('#ccnt').textContent=shown.length+' of '+F.claims.length;
    $$('.chip[data-k]').forEach(function(b){b.setAttribute('aria-pressed',CK.indexOf(b.dataset.v)>=0)});
    var h='',items=[];
    themes.forEach(function(t,ti){
      var cs=shown.filter(function(c){return c.theme===t});if(!cs.length)return;
      items.push(['th-'+ti,t.replace(/^Theme \d+ — /,''),t.match(/\d+/)[0]]);
      h+='<h2 class="theme-h" id="th-'+ti+'">'+esc(t)+'</h2>'+cs.map(function(c){
        return '<article class="claim" id="'+c.id+'"><h3><span class="id">'+c.id+'</span>'+esc(c.title)+' '+critChip(c.criticality)+'</h3><p class="st1">'+esc(c.statement)+'</p><div class="chips"><span class="tag" title="Lenses">'+c.lenses.join(' · ')+'</span>'+c.irqs.map(function(i){return '<a class="tag" href="#/irq/'+i+'" title="'+esc(byId[i]?byId[i].title:i)+'">'+shortId(i)+'</a>'}).join('')+'</div><details><summary>Full entry</summary><div class="prose">'+c.html+'</div></details></article>';
      }).join('');
    });
    $('#clist').innerHTML=h;
    $('#ctoc').innerHTML=tocHtml(items,'Themes');bindToc(items.map(function(i){return i[0]}));
    if(sel){var el=document.getElementById(sel);if(el){el.classList.add('flash');scrollToEl(el,window.innerHeight/3)}}
  }
  $('.fbar').addEventListener('click',function(e){var b=e.target.closest('.chip[data-k]');if(!b)return;var i=CK.indexOf(b.dataset.v);i<0?CK.push(b.dataset.v):CK.splice(i,1);sel=null;paint()});
  paint();
}

/* library */
function viewLibrary(slug){
  if(!slug){
    var groups=[];F.library.forEach(function(l){if(groups.indexOf(l.group)<0)groups.push(l.group)});
    setView('library','<div class="pg wide"><p class="eyebrow">Library</p><h1>Documents</h1>'+groups.map(function(g,gi){return '<section class="sec" id="g-'+gi+'"><h2>'+esc(g)+'</h2><div class="lib">'+F.library.filter(function(l){return l.group===g}).map(function(l){return '<a href="#/library/'+l.slug+'"><span>'+esc(l.title)+'</span><small>'+esc(l.source)+'</small></a>'}).join('')+'</div></section>'}).join('')+'</div>'+foot(),
      tocHtml(groups.map(function(g,i){return ['g-'+i,g]}),'Groups'));
    bindToc(groups.map(function(g,i){return 'g-'+i}));return;
  }
  var meta=F.library.filter(function(l){return l.slug===slug})[0],my=++token;
  if(!meta){setView('library','<div class="pg"><h1>Not found</h1><p><a href="#/library">Back to library</a></p></div>'+foot(),'');return}
  setView('library','<div class="pg"><p class="crumbs"><a href="#/library">Library</a> / '+esc(meta.group)+'</p><p class="eyebrow">'+esc(meta.source)+'</p><div id="doc" class="prose"><div class="loading">Loading…</div></div></div>'+foot(),'<div id="dtoc"></div>');
  getDoc(slug).then(function(d){
    if(my!==token)return;$('#doc').innerHTML=clean(d.html);
    var items=[];$$('#doc h2, #doc h3').forEach(function(h,i){h.id='h-'+i;if(h.tagName==='H2')items.push(['h-'+i,h.textContent.replace(/^\d+\.\s*/,'')])});
    $('#dtoc').innerHTML=tocHtml(items);bindToc(items.map(function(i){return i[0]}));
  }).catch(function(){if(my===token)$('#doc').innerHTML='<p class="loading">This document could not be loaded.</p>'});
}

/* notes */
var NF='';
function download(name,type,text){var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:type}));a.download=name;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},500)}
function viewNotes(){
  var ids=marked().filter(function(i){return byId[i]&&(!NF||mem[i].status===NF)});
  var counts={};marked().forEach(function(i){var s=mem[i].status||'No status';counts[s]=(counts[s]||0)+1});
  var main='<div class="pg wide"><p class="eyebrow">My notes</p><h1>Marked questions</h1><p class="lead" style="margin-top:10px">'+(lsOK?'Stored in this browser only. Nothing is sent anywhere.':'Browser storage is unavailable; notes last for this visit only.')+'</p>'
   +'<div class="fbar"><div class="frow"><span class="fl">Status</span>'+STATUS.map(function(s){return '<button type="button" class="chip" data-st="'+s+'" aria-pressed="'+(NF===s)+'">'+s+'</button>'}).join('')+'</div><div class="frow"><span class="fl">Export</span><button class="btn" id="xj" type="button">JSON</button><button class="btn" id="xm" type="button">Markdown</button><button class="btn" id="xc" type="button" style="margin-left:auto">Clear all notes</button></div></div>'
   +(ids.length?'<div class="tw rt"><table class="tbl nrow"><thead><tr><th>ID</th><th>Question</th><th>Status</th><th>Note</th></tr></thead><tbody>'+ids.map(function(i){var q=byId[i],n=mem[i];return '<tr data-href="#/irq/'+i+'"><td class="cid"><a href="#/irq/'+i+'">'+shortId(i)+'</a></td><td class="cti"><a href="#/irq/'+i+'" tabindex="-1">'+esc(q.title)+'</a></td><td>'+(n.status?'<span class="chip">'+esc(n.status)+'</span>':'')+'</td><td class="nt1">'+esc((n.note||'').slice(0,160))+'</td></tr>'}).join('')+'</tbody></table></div>':'<div class="empty">No marked questions yet. Open a question and set a status or write a note.</div>')+'</div>'+foot();
  var aside='<div class="ap1"><h4>Marked</h4><div class="big">'+marked().length+'</div></div><div class="ap1"><h4>By status</h4><dl class="kv">'+Object.keys(counts).map(function(k){return '<dt>'+esc(k)+'</dt><dd>'+counts[k]+'</dd>'}).join('')+'</dl></div>';
  setView('notes',main,aside);
  $$('.chip[data-st]').forEach(function(b){b.addEventListener('click',function(){NF=NF===b.dataset.st?'':b.dataset.st;viewNotes()})});
  $('#xj').addEventListener('click',function(){download('faias-notes.json','application/json',JSON.stringify({standard:'FAIAS',version:F.version,exported:new Date().toISOString(),notes:mem},null,2))});
  $('#xm').addEventListener('click',function(){download('faias-notes.md','text/markdown',marked().filter(function(i){return byId[i]}).reduce(function(a,i){var n=mem[i];return a+'## '+i+' — '+byId[i].title+'\n\nStatus: '+(n.status||'none')+'\n\n'+(n.note||'')+'\n\n'},'# FAIAS working notes (v'+F.version+')\n\n'))});
  $('#xc').addEventListener('click',function(){if(marked().length&&confirm('Delete all notes stored in this browser?')){mem={};persist();marks();viewNotes()}});
  var tb=$('tbody');if(tb)tb.addEventListener('click',function(e){var tr=e.target.closest('tr');if(tr&&!e.target.closest('a'))location.hash=tr.dataset.href});
}

/* ---------- router ---------- */
function route(){
  document.body.classList.remove('navopen');$('#menu').setAttribute('aria-expanded','false');
  var h=location.hash.replace(/^#/,'')||'/',qi=h.indexOf('?'),qs=qi>=0?h.slice(qi+1):'',path=(qi>=0?h.slice(0,qi):h).split('/').filter(Boolean),r=path[0]||'walk';
  token++;lazy={};
  if(sectionObs){sectionObs.disconnect();sectionObs=null}
  var story=r==='walk'||r==='journeys'||r==='journey'||!/^(reference|explorer|irq|claims|library|notes)$/.test(r);
  if(story&&['walk','journeys','journey'].indexOf(r)<0)r='walk';
  document.body.setAttribute('data-mode',story?'story':'ref');
  $$('.tabs a').forEach(function(a){a.classList.toggle('on',a.dataset.t===(story?(r==='walk'?'walk':'journeys'):'reference'))});
  var rid=null;
  if(r==='walk')viewWalk(path[1]);
  else if(r==='journeys')viewJourneys();
  else if(r==='journey')viewJourney(path[1]);
  else if(r==='reference')viewRefHome();
  else if(r==='explorer')viewExplorer(qs);
  else if(r==='irq'){rid=path[1];viewIrq(rid)}
  else if(r==='claims')viewClaims(path[1]);
  else if(r==='library')viewLibrary(path[1]);
  else if(r==='notes')viewNotes();
  document.title='FAIAS'+(r==='irq'&&byId[rid]?' · '+rid:'');
  if(!story)navActive(r,rid);
  if(!(r==='claims'&&path[1]))window.scrollTo(0,0);
  if(r==='reference'){bindToc(['h-top','h-map','h-dist','h-go'])}
  marks();
}
$('#menu').addEventListener('click',function(){var o=document.body.classList.toggle('navopen');this.setAttribute('aria-expanded',o)});
document.addEventListener('click',function(e){if(document.body.classList.contains('navopen')&&!e.target.closest('#nav')&&!e.target.closest('#menu'))document.body.classList.remove('navopen')});
window.addEventListener('hashchange',route);
buildNav();route();
})();
