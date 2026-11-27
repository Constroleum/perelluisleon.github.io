/* Catálogo PDF para galerías, en es/ca/en/fr, con la identidad de la web.
   Uso (en la raíz del sitio):  node _tools/catalogo.js
   Lee obras, precios y textos de app.js + data.js (los mismos que la web) y deja en _catalogo/:
     catalogo-<lang>.html  (fuente)   y   Pere-Lluis-Leon-Catalogo-<LANG>.pdf
   Incluye solo las obras disponibles. Necesita Microsoft Edge o Google Chrome para crear el PDF.
   _catalogo/ no se publica en la web (GitHub Pages ignora las carpetas que empiezan por _). */
const fs=require('fs'),path=require('path'),{execFileSync}=require('child_process');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'_catalogo');
const src=fs.readFileSync(path.join(ROOT,'app.js'),'utf8');
const D=new Function("const e=s=>String(s).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));"+
 src.slice(src.indexOf('const C='),src.indexOf('const $=s=>'))+';return {C,pr,S,BIO,STMT,EXK,EXD,COLS,cl,money,dmx}')();
const {C,pr,S,BIO,STMT,EXK,EXD,COLS,cl,money,dmx}=D;
const W=new Function('window',fs.readFileSync(path.join(ROOT,'data.js'),'utf8')+';return window.WORKS')({});
const DIM=JSON.parse(fs.readFileSync(path.join(ROOT,'img/dims.json'),'utf8'));
const e=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const file=p=>'file:///'+path.join(ROOT,p).replace(/\\/g,'/').replace(/ /g,'%20').replace(/,/g,'%2C');
const YEAR=new Date().getFullYear(),LOC={es:'es-ES',ca:'ca-ES',en:'en-GB',fr:'fr-FR'};

const L={
 es:{cat:'Catálogo de obra',artist:'El artista',avail:'Obras disponibles',works:'obras',dim:'Dimensiones',tech:'Técnica',series:'Serie',ref:'Referencia',exh:'Exposiciones seleccionadas',prices:'Lista de precios',pnote:'Precios de estudio en euros, por obra. El envío asegurado se presupuesta aparte según el destino. Precios válidos salvo venta previa.',title:'Obra',pr:'Precio',contact:'Contacto',hd:'Imágenes en alta resolución, fichas técnicas y visitas al estudio, bajo petición.',web:'Catálogo completo y compra en línea',studio:'Estudio',orig:'Todas las obras son originales únicos, firmados por el artista.'},
 ca:{cat:'Catàleg d’obra',artist:'L’artista',avail:'Obres disponibles',works:'obres',dim:'Dimensions',tech:'Tècnica',series:'Sèrie',ref:'Referència',exh:'Exposicions seleccionades',prices:'Llista de preus',pnote:'Preus d’estudi en euros, per obra. L’enviament assegurat es pressuposta a part segons la destinació. Preus vàlids excepte venda prèvia.',title:'Obra',pr:'Preu',contact:'Contacte',hd:'Imatges en alta resolució, fitxes tècniques i visites a l’estudi, sota petició.',web:'Catàleg complet i compra en línia',studio:'Estudi',orig:'Totes les obres són originals únics, signats per l’artista.'},
 en:{cat:'Catalogue of works',artist:'The artist',avail:'Available works',works:'works',dim:'Dimensions',tech:'Medium',series:'Series',ref:'Reference',exh:'Selected exhibitions',prices:'Price list',pnote:'Studio prices in euros, per work. Insured shipping is quoted separately depending on the destination. Prices valid subject to prior sale.',title:'Work',pr:'Price',contact:'Contact',hd:'High-resolution images, technical sheets and studio visits on request.',web:'Full catalogue and online purchase',studio:'Studio',orig:'Every work is a one-of-a-kind original, signed by the artist.'},
 fr:{cat:'Catalogue des œuvres',artist:'L’artiste',avail:'Œuvres disponibles',works:'œuvres',dim:'Dimensions',tech:'Technique',series:'Série',ref:'Référence',exh:'Expositions sélectionnées',prices:'Liste des prix',pnote:'Prix d’atelier en euros, par œuvre. La livraison assurée fait l’objet d’un devis séparé selon la destination. Prix valables sauf vente préalable.',title:'Œuvre',pr:'Prix',contact:'Contact',hd:'Images en haute résolution, fiches techniques et visites d’atelier sur demande.',web:'Catalogue complet et achat en ligne',studio:'Atelier',orig:'Toutes les œuvres sont des originaux uniques, signés par l’artiste.'}};

function exhib(l){
 const K=EXK[l],f=new Intl.DateTimeFormat(LOC[l],{month:'long',year:'numeric'});
 return EXD.map(x=>{const nm=x[2][0]==='@'?K[x[2].slice(1)]:x[2],ds=[x[3],x[4]&&K[x[4]]].filter(Boolean).join(' — ');let d='';
  if(/^\d{4}$/.test(x[0]))d=x[0];else if(x[0]){d=f.format(new Date(x[0]+'T12:00:00'))}
  return `<li><span>${e(d)}</span><div><b>${e(nm)}</b>${ds?`<small>${e(ds)}</small>`:''}</div></li>`}).join('');
}

const CSS=`@font-face{font-family:B;src:url(${file('fonts/bricolage.woff2')}) format('woff2');font-weight:200 800}
@font-face{font-family:H;src:url(${file('fonts/hanken.woff2')}) format('woff2');font-weight:100 900}
@page{size:A4;margin:0}
*{box-sizing:border-box;margin:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font:10.5pt/1.55 H,sans-serif;color:#10213A}
h1,h2,h3,.b{font-family:B,sans-serif;letter-spacing:-.02em;line-height:1.05}
.pg{width:210mm;height:297mm;position:relative;overflow:hidden;page-break-after:always;padding:18mm 18mm 20mm}
.dk{background:#10213A;color:#F4EEE1}.lt{background:#F4EEE1}
.k{font-size:8pt;letter-spacing:.28em;text-transform:uppercase;color:#D4AF5A;font-weight:600}.lt .k{color:#8A6A22}
.ft{position:absolute;left:18mm;right:18mm;bottom:10mm;display:flex;justify-content:space-between;font-size:7.5pt;letter-spacing:.18em;text-transform:uppercase;color:#6B7C95;border-top:.4pt solid #C9C2B2;padding-top:3mm}
.dk .ft{border-color:#27436A;color:#A9B8CE}
.cv{display:flex;flex-direction:column;justify-content:space-between}
.cv .top{display:flex;justify-content:space-between;align-items:center}.cv .top img{height:14mm}
.cv .hero{width:100%;height:118mm;object-fit:cover;display:block}
.cv h1{font-size:46pt;font-weight:700;margin:6mm 0 3mm}.cv .sub{font-size:13pt;color:#D7DEE8}
.cv .line{display:flex;justify-content:space-between;font-size:9pt;letter-spacing:.2em;text-transform:uppercase;color:#A9B8CE;border-top:.4pt solid #27436A;padding-top:4mm}
.ar{display:grid;grid-template-columns:70mm 1fr;gap:10mm;align-items:start}
.ar img{width:70mm;height:auto;display:block}
.ar h2{font-size:26pt;margin:2mm 0 5mm}.ar .lead{font:500 12.5pt/1.4 B,sans-serif;margin-bottom:5mm}
.ar p{margin-bottom:3.2mm}.q{margin-top:6mm;padding-top:5mm;border-top:.4pt solid #C9C2B2;font-style:italic;color:#33496B}.q .sig{font-style:normal;color:#8A6A22;margin-top:2mm;font-size:9pt;letter-spacing:.15em;text-transform:uppercase}
.dv{display:flex;flex-direction:column;justify-content:flex-end;gap:5mm}.dv img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.35}
.dv .in{position:relative;padding-bottom:10mm}.dv h2{font-size:42pt;font-weight:700}.dv p{font-size:12pt;color:#D7DEE8}
.wk{display:flex;flex-direction:column;gap:9mm;height:250mm}
.w{flex:1;display:grid;grid-template-columns:110mm 1fr;gap:8mm;align-items:center;min-height:0;border-bottom:.4pt solid #C9C2B2;padding-bottom:9mm}.w:last-child{border:0;padding-bottom:0}
.w .im{height:112mm;display:flex;align-items:center;justify-content:center}.w .im img{max-width:110mm;max-height:112mm;width:auto;height:auto;display:block;box-shadow:0 1.5mm 4mm rgba(16,33,58,.22)}
.w h3{font-size:19pt;font-weight:700;margin:1.5mm 0 3mm}.w .d{color:#33496B;margin-bottom:5mm}
.w dl{display:grid;grid-template-columns:auto 1fr;gap:1.4mm 4mm;font-size:9pt}.w dt{color:#6B7C95;letter-spacing:.08em;text-transform:uppercase;font-size:7.5pt;padding-top:.6mm}
.h2{font-size:24pt;margin:2mm 0 7mm}
.ex{list-style:none;padding:0;columns:2;column-gap:10mm;font-size:9pt}.ex li{break-inside:avoid;display:grid;grid-template-columns:24mm 1fr;gap:3mm;padding:2.2mm 0;border-bottom:.4pt solid #DAD3C3}.ex span{color:#8A6A22}.ex small{display:block;color:#6B7C95}
table{width:100%;border-collapse:collapse;font-size:9pt}th{text-align:left;font-size:7.5pt;letter-spacing:.14em;text-transform:uppercase;color:#6B7C95;font-weight:600;padding:0 0 2mm;border-bottom:.6pt solid #10213A}
td{padding:1.6mm 0;border-bottom:.4pt solid #DAD3C3}td.r,th.r{text-align:right}td.s{color:#6B7C95}
.nt{font-size:8.5pt;color:#33496B;margin-top:5mm}
.bk{display:flex;flex-direction:column;justify-content:center;gap:9mm}.bk img{height:20mm;width:auto;align-self:flex-start}
.bk h2{font-size:36pt;font-weight:700}.bk dl{display:grid;grid-template-columns:34mm 1fr;gap:3mm 6mm;font-size:12pt}.bk dt{color:#A9B8CE;font-size:8pt;letter-spacing:.2em;text-transform:uppercase;padding-top:1.4mm}.bk dd{margin:0}.bk a{color:#D4AF5A;text-decoration:none}
.bk .hd{color:#D7DEE8;max-width:120mm}`;

function catalog(l){
 const T=L[l],Sl=S[l],B=BIO[l],q=STMT[l],av=W.filter(w=>!w.s);let n=1;
 const foot=()=>`<div class="ft"><span>Pere Lluís León · ${e(T.cat)} ${YEAR}</span><span>${n++}</span></div>`;
 const pages=[];
 /* Portada */
 pages.push(`<section class="pg dk cv"><div class="top"><img src="${file('img/logo.png')}" alt=""><span class="k">${e(T.cat)} · ${YEAR}</span></div><div><img class="hero" src="${file('img/f/laberint-musical.jpg')}" alt=""><h1>Pere Lluís León</h1><p class="sub">${e(B.lead)}</p></div><div class="line"><span>${av.length} ${e(T.avail.toLowerCase())}</span><span>perelluisleon.art</span></div></section>`); n++;
 /* El artista */
 pages.push(`<section class="pg lt"><div class="ar"><img src="${file('img/perfil.jpg')}" alt=""><div><p class="k">${e(T.artist)}</p><h2>${e(B.h)}</h2><p class="lead">${e(q[0])}</p>${B.ps.slice(0,3).map(p=>`<p>${e(p)}</p>`).join('')}<div class="q"><p>${e(q[2])}</p><p class="sig">${e(q[3])}</p></div></div></div>${foot()}</section>`);
 /* Obras por colección */
 for(const c of COLS){
  const ws=av.filter(w=>w.c===c[0]);if(!ws.length)continue;
  pages.push(`<section class="pg dk dv"><img src="${file('img/f/'+(ws.find(w=>w.id===c[2])||ws[0]).id+'.jpg')}" alt=""><div class="in"><p class="k">${e(T.avail)}</p><h2>${e(c[1](l))}</h2><p>${ws.length} ${e(T.works)} · ${e(Sl.tech)}</p></div>${foot()}</section>`);
  for(let i=0;i<ws.length;i+=2){
   pages.push(`<section class="pg lt"><div class="wk">${ws.slice(i,i+2).map(w=>`<article class="w"><div class="im"><img src="${file('img/f/'+w.id+'.jpg')}" alt=""></div><div><p class="k">${e(cl(w.c,l))}</p><h3>${e(w.t)}</h3>${w.d&&w.d[l]?`<p class="d">${e(w.d[l])}</p>`:''}<dl><dt>${e(T.dim)}</dt><dd>${e(dmx(w))}</dd><dt>${e(T.tech)}</dt><dd>${e(Sl.tech)}</dd><dt>${e(T.series)}</dt><dd>${e(cl(w.c,l))}</dd><dt>${e(T.ref)}</dt><dd>PLL-${e(w.id)}</dd></dl></div></article>`).join('')}</div>${foot()}</section>`);
  }
 }
 /* Exposiciones */
 pages.push(`<section class="pg lt"><p class="k">Pere Lluís León</p><h2 class="h2">${e(T.exh)}</h2><ul class="ex">${exhib(l)}</ul>${foot()}</section>`);
 /* Lista de precios (puede ocupar dos páginas) */
 const rows=COLS.flatMap(c=>av.filter(w=>w.c===c[0]));
 for(let i=0;i<rows.length;i+=28){
  pages.push(`<section class="pg lt"><p class="k">Pere Lluís León · ${YEAR}</p><h2 class="h2">${e(T.prices)}</h2><table><thead><tr><th>${e(T.title)}</th><th>${e(T.series)}</th><th>${e(T.dim)}</th><th>${e(T.ref)}</th><th class="r">${e(T.pr)}</th></tr></thead><tbody>${rows.slice(i,i+28).map(w=>`<tr><td><b>${e(w.t)}</b></td><td class="s">${e(cl(w.c,l))}</td><td class="s">${e(dmx(w))}</td><td class="s">PLL-${e(w.id)}</td><td class="r">${e(money(l,pr(w)))}</td></tr>`).join('')}</tbody></table>${i+28>=rows.length?`<p class="nt">${e(T.pnote)} ${e(T.orig)}</p>`:''}${foot()}</section>`);
 }
 /* Contraportada */
 pages.push(`<section class="pg dk bk"><img src="${file('img/logo.png')}" alt=""><h2>Pere Lluís León</h2><dl><dt>${e(T.contact)}</dt><dd><a href="mailto:${e(C.email)}">${e(C.email)}</a></dd><dt>${e(Sl.tel)}</dt><dd>+34 93 751 20 87</dd><dt>${e(T.studio)}</dt><dd>Premià de Mar, Barcelona</dd><dt>Web</dt><dd><a href="https://perelluisleon.art">perelluisleon.art</a></dd><dt>Instagram</dt><dd>@perelluisleon</dd></dl><p class="hd">${e(T.hd)} ${e(T.web)}: perelluisleon.art</p></section>`);
 return `<!doctype html><html lang="${l}"><head><meta charset="utf-8"><title>Pere Lluís León — ${e(T.cat)} ${YEAR}</title><style>${CSS}</style></head><body>${pages.join('\n')}</body></html>`;
}

function browser(){
 const c=[process.env.CHROME,`${process.env['ProgramFiles(x86)']}\\Microsoft\\Edge\\Application\\msedge.exe`,`${process.env.ProgramFiles}\\Microsoft\\Edge\\Application\\msedge.exe`,`${process.env.ProgramFiles}\\Google\\Chrome\\Application\\chrome.exe`,`${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome','/usr/bin/chromium'];
 return c.find(p=>p&&fs.existsSync(p));
}

fs.mkdirSync(OUT,{recursive:true});
const exe=browser();if(!exe)console.warn('⚠ No se encontró Edge ni Chrome: solo se generan los HTML (ábrelos e imprime a PDF).');
for(const l of ['es','ca','en','fr']){
 const h=path.join(OUT,`catalogo-${l}.html`),pdf=path.join(OUT,`Pere-Lluis-Leon-Catalogo-${l.toUpperCase()}.pdf`);
 fs.writeFileSync(h,catalog(l));
 if(exe){execFileSync(exe,['--headless=new','--disable-gpu','--no-pdf-header-footer','--allow-file-access-from-files','--virtual-time-budget=15000',`--print-to-pdf=${pdf}`,'file:///'+h.replace(/\\/g,'/')],{stdio:'ignore'});
  console.log(path.basename(pdf),(fs.statSync(pdf).size/1048576).toFixed(1)+' MB')}
}
