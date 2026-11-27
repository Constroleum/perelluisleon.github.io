/* ═══ Pagos de perelluisleon.art con Stripe Checkout — Cloudflare Worker ═══
   Rutas:
     POST /checkout  → crea una sesión de Stripe Checkout y devuelve { url }
     POST /webhook   → Stripe avisa de un pago completado; la obra se marca como vendida (KV)
     GET  /sold      → lista de obras vendidas desde el último build (compatibilidad)
     GET  /state     → { sold:[ids], prices:{id:precio} } — la web actualiza precios y vendidas al cargar
     /admin          → panel de gestión (usuario y contraseña): precios y obras vendidas. En admin.perelluisleon.art también en /
   Precios, envío y obras vendidas se leen de https://perelluisleon.art/catalog.json (lo genera build.js).
   El navegador solo envía ids: el precio SIEMPRE se calcula aquí.
   Secretos (wrangler secret put …): STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, ADMIN_USER, ADMIN_PASS, RESEND_API_KEY (opcional: emails)
   Variables (wrangler.toml): SITE, ALLOWED_ORIGINS, MAIL_FROM, MAIL_ADMIN
   KV SOLD (necesario para el panel): claves <id> = vendida · price:<id> = precio cambiado en el panel · mail:<sesión> · fail:<ip>
   Emails: al completarse el pago se envía la confirmación al comprador (en su idioma) y un aviso de venta a MAIL_ADMIN,
   a través de Resend (https://resend.com). Sin RESEND_API_KEY no se envía nada y todo lo demás funciona igual. */

const LOCALE={es:'es',ca:'es',en:'en',fr:'fr'};
const T={
 es:{ship:'Envío asegurado',desc:'Pintura original firmada · acrílico sobre lienzo',sold:'Esta obra ya se ha vendido',bad:'Pedido no válido'},
 ca:{ship:'Enviament assegurat',desc:'Pintura original signada · acrílic sobre tela',sold:'Aquesta obra ja s’ha venut',bad:'Comanda no vàlida'},
 en:{ship:'Insured shipping',desc:'Signed original painting · acrylic on canvas',sold:'This work has already been sold',bad:'Invalid order'},
 fr:{ship:'Livraison assurée',desc:'Peinture originale signée · acrylique sur toile',sold:'Cette œuvre a déjà été vendue',bad:'Commande non valide'}};

export default {
 async fetch(req,env,ctx){
  const url=new URL(req.url),origin=req.headers.get('Origin')||'';
  const allowed=(env.ALLOWED_ORIGINS||env.SITE).split(',').map(s=>s.trim());
  const cors={'Access-Control-Allow-Origin':allowed.includes(origin)?origin:allowed[0],'Access-Control-Allow-Methods':'POST, GET, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Vary':'Origin'};
  const json=(o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{...cors,'Content-Type':'application/json'}});
  try{
   if(url.pathname.startsWith('/admin')||(url.hostname.startsWith('admin.')&&url.pathname==='/'))return admin(req,env,url);
   if(req.method==='OPTIONS')return new Response(null,{headers:cors});
   if(url.pathname==='/checkout'&&req.method==='POST'){if(!allowed.includes(origin))return json({error:'origin'},403);return json(...await checkout(req,env))}
   if(url.pathname==='/webhook'&&req.method==='POST')return webhook(req,env,ctx);
   if(url.pathname==='/sold'&&req.method==='GET')return json({sold:await soldList(env)});
   if(url.pathname==='/state'&&req.method==='GET'){const k=await kv(env);return json({sold:Object.keys(k.sold),prices:k.prices})}
   return json({error:'not found'},404);
  }catch(err){console.error(err);return json({error:'server'},500)}
 }
};

async function catalog(env){
 const r=await fetch(env.SITE+'/catalog.json',{cf:{cacheTtl:60,cacheEverything:true}});
 if(!r.ok)throw new Error('catalog '+r.status);return r.json();
}
/* Estado guardado en el KV: obras vendidas (con sus datos) y precios cambiados desde el panel */
async function kv(env){
 const o={sold:{},prices:{}};if(!env.SOLD)return o;let cursor;
 do{const l=await env.SOLD.list(cursor?{cursor}:{});
  for(const k of l.keys){const n=k.name;if(n.startsWith('price:')){const v=Number(k.metadata&&k.metadata.p);if(v>0)o.prices[n.slice(6)]=v}else if(!/^(mail|fail):/.test(n))o.sold[n]=k.metadata||{}}
  cursor=l.list_complete?null:l.cursor}while(cursor);
 return o;
}
async function soldList(env){return Object.keys((await kv(env)).sold)}
function zoneShipping(cat,c){
 if(c==='ES')return cat.shipping.ES;
 if(c==='GB')return cat.shipping.GB;
 if(cat.eu.includes(c))return cat.shipping.EU;
 if(cat.other.includes(c))return cat.shipping.OTHER;
 return null;
}

async function checkout(req,env){
 const body=await req.json().catch(()=>({}));
 const lang=T[body.lang]?body.lang:'es',tx=T[lang],cu=body.customer||{};
 const ids=[...new Set(Array.isArray(body.items)?body.items.map(String):[])];
 if(!ids.length||ids.length>20)return [{error:tx.bad},400];
 const cat=await catalog(env),st=await kv(env),sold=new Set(Object.keys(st.sold));
 const items=[];
 for(const id of ids){const w=cat.items[id];if(!w)return [{error:tx.bad},400];if(w.sold||sold.has(id))return [{error:tx.sold+': '+w.t},409];items.push([id,{...w,price:st.prices[id]||w.price}])}
 const country=String(cu.country||'').toUpperCase(),ship=zoneShipping(cat,country);
 if(ship==null)return [{error:tx.bad},400];

 const p=new URLSearchParams();
 p.set('mode','payment');p.set('locale',LOCALE[lang]);
 items.forEach(([id,w],i)=>{const k=`line_items[${i}]`;
  p.set(`${k}[quantity]`,'1');p.set(`${k}[price_data][currency]`,'eur');p.set(`${k}[price_data][unit_amount]`,String(Math.round(w.price*100)));
  p.set(`${k}[price_data][product_data][name]`,w.t);p.set(`${k}[price_data][product_data][description]`,`${w.size} · ${tx.desc}`);
  p.set(`${k}[price_data][product_data][images][0]`,w.img);p.set(`${k}[price_data][product_data][metadata][id]`,id)});
 p.set('shipping_address_collection[allowed_countries][0]',country);
 p.set('shipping_options[0][shipping_rate_data][type]','fixed_amount');
 p.set('shipping_options[0][shipping_rate_data][display_name]',tx.ship);
 p.set('shipping_options[0][shipping_rate_data][fixed_amount][amount]',String(ship*100));
 p.set('shipping_options[0][shipping_rate_data][fixed_amount][currency]','eur');
 p.set('phone_number_collection[enabled]','true');
 p.set('billing_address_collection','auto');
 if(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cu.email||''))p.set('customer_email',cu.email);
 const meta={items:ids.join(','),lang,country,message:String(cu.message||'').slice(0,480)};
 for(const [k,v] of Object.entries(meta)){p.set(`metadata[${k}]`,v);p.set(`payment_intent_data[metadata][${k}]`,v)}
 p.set('payment_intent_data[description]','Pere Lluís León — '+items.map(x=>x[1].t).join(', '));
 p.set('success_url',env.SITE+cat.thanks[lang]+'?session_id={CHECKOUT_SESSION_ID}');
 p.set('cancel_url',`${env.SITE}/${lang}/?pago=cancelado`);
 p.set('expires_at',String(Math.floor(Date.now()/1000)+40*60)); // la sesión caduca en 40 min (Stripe exige un mínimo de 30)

 const r=await fetch('https://api.stripe.com/v1/checkout/sessions',{method:'POST',headers:{Authorization:'Bearer '+env.STRIPE_SECRET_KEY,'Content-Type':'application/x-www-form-urlencoded'},body:p});
 const s=await r.json();
 if(!r.ok){const er=s.error||{};console.error('stripe',er.type,er.code,er.param,er.message);
  /* Solo el tipo y el código del error (nunca datos de la cuenta), para diagnosticar desde la web */
  const why=er.type==='authentication_error'?'clave de Stripe no válida':[er.code,er.param].filter(Boolean).join(' ')||er.type||'';
  return [{error:'stripe'+(why?': '+why:'')},502]}
 return [{url:s.url},200];
}

/* Verificación de la firma de Stripe (cabecera Stripe-Signature: t=…,v1=…) */
async function verify(payload,header,secret){
 const parts=Object.fromEntries(String(header).split(',').map(x=>x.split('=')).filter(x=>x.length===2&&x[0]!=='v1'));
 const sigs=String(header).split(',').filter(x=>x.startsWith('v1=')).map(x=>x.slice(3));
 if(!parts.t||!sigs.length||Math.abs(Date.now()/1000-Number(parts.t))>300)return false;
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const mac=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(parts.t+'.'+payload));
 const hex=[...new Uint8Array(mac)].map(b=>b.toString(16).padStart(2,'0')).join('');
 return sigs.some(s=>s.length===hex.length&&[...s].reduce((a,c,i)=>a|(c.charCodeAt(0)^hex.charCodeAt(i)),0)===0);
}
async function webhook(req,env,ctx){
 const payload=await req.text();
 if(!env.STRIPE_WEBHOOK_SECRET||!await verify(payload,req.headers.get('Stripe-Signature'),env.STRIPE_WEBHOOK_SECRET))return new Response('bad signature',{status:400});
 const ev=JSON.parse(payload);
 if((ev.type==='checkout.session.completed'||ev.type==='checkout.session.async_payment_succeeded')&&ev.data.object.payment_status==='paid'){
  const s=ev.data.object,ids=String(s.metadata&&s.metadata.items||'').split(',').filter(Boolean);
  const info={src:'stripe',session:s.id,email:(s.customer_details&&s.customer_details.email)||'',at:new Date().toISOString()};
  if(env.SOLD)await Promise.all(ids.map(id=>env.SOLD.put(id,JSON.stringify(info),{metadata:info})));
  console.log('Vendidas:',ids.join(', '),s.id);
  /* Los emails se envían después de responder a Stripe: un fallo del correo nunca hace que Stripe repita el aviso */
  if(env.RESEND_API_KEY)ctx.waitUntil(mails(env,s,ids).catch(err=>console.error('mail',err&&err.message)));
 }
 return new Response('ok');
}

/* ═══ Emails de confirmación (Resend) ═══ */
const M={
 es:{subj:'Confirmación de tu compra — Pere Lluís León',hi:n=>`Hola${n?' '+n:''},`,p1:'¡Muchas gracias por tu compra! Hemos recibido el pago de tu pedido:',ship:'Envío asegurado',tot:'Total pagado',addr:'Dirección de envío',p2:'Pere Lluís León te escribirá en los próximos días para coordinar el embalaje y el envío asegurado de tu obra. Cada pieza es un original único, firmado por el artista.',p3:'Si tienes cualquier duda, responde a este correo.',ref:'Referencia del pedido'},
 ca:{subj:'Confirmació de la teva compra — Pere Lluís León',hi:n=>`Hola${n?' '+n:''},`,p1:'Moltes gràcies per la teva compra! Hem rebut el pagament de la teva comanda:',ship:'Enviament assegurat',tot:'Total pagat',addr:'Adreça d’enviament',p2:'En Pere Lluís León t’escriurà els propers dies per coordinar l’embalatge i l’enviament assegurat de la teva obra. Cada peça és un original únic, signat per l’artista.',p3:'Si tens qualsevol dubte, respon aquest correu.',ref:'Referència de la comanda'},
 en:{subj:'Your purchase is confirmed — Pere Lluís León',hi:n=>`Hello${n?' '+n:''},`,p1:'Thank you very much for your purchase! We have received payment for your order:',ship:'Insured shipping',tot:'Total paid',addr:'Shipping address',p2:'Pere Lluís León will write to you in the coming days to arrange the packing and insured shipping of your work. Every piece is a one-of-a-kind original, signed by the artist.',p3:'If you have any questions, just reply to this email.',ref:'Order reference'},
 fr:{subj:'Confirmation de votre achat — Pere Lluís León',hi:n=>`Bonjour${n?' '+n:''},`,p1:'Merci beaucoup pour votre achat ! Nous avons bien reçu le paiement de votre commande :',ship:'Livraison assurée',tot:'Total payé',addr:'Adresse de livraison',p2:'Pere Lluís León vous écrira dans les prochains jours pour organiser l’emballage et la livraison assurée de votre œuvre. Chaque pièce est un original unique, signé par l’artiste.',p3:'Pour toute question, répondez simplement à cet e-mail.',ref:'Référence de la commande'}};
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const eur=(c,l)=>new Intl.NumberFormat({es:'es-ES',ca:'ca-ES',en:'en-GB',fr:'fr-FR'}[l]||'es-ES',{style:'currency',currency:'EUR',minimumFractionDigits:(c||0)%100?2:0,maximumFractionDigits:2,useGrouping:'always'}).format((c||0)/100);
async function send(env,o){
 const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json'},body:JSON.stringify(o)});
 if(!r.ok)throw new Error('resend '+r.status+' '+(await r.text()).slice(0,200));
}
async function mails(env,s,ids){
 /* Stripe puede repetir el aviso: con el KV, cada pedido se envía una sola vez */
 if(env.SOLD){if(await env.SOLD.get('mail:'+s.id))return;await env.SOLD.put('mail:'+s.id,'1',{expirationTtl:60*60*24*30})}
 const cat=await catalog(env),md=s.metadata||{},l=M[md.lang]?md.lang:'es',m=M[l];
 const cd=s.customer_details||{},sh=s.shipping_details||(s.collected_information&&s.collected_information.shipping_details)||{},a=sh.address||cd.address||{};
 const st=await kv(env),works=ids.map(id=>cat.items[id]&&{...cat.items[id],price:st.prices[id]||cat.items[id].price}).filter(Boolean),shipC=(s.total_details&&s.total_details.amount_shipping)||0;
 const addr=[sh.name||cd.name,a.line1,a.line2,[a.postal_code,a.city].filter(Boolean).join(' '),a.state,a.country].filter(Boolean);
 const first=String(cd.name||'').split(' ')[0];
 const row=w=>`<tr><td style="padding:12px 0;border-bottom:1px solid #27436A;width:88px"><img src="${esc(w.img)}" alt="" width="72" style="display:block;width:72px;height:auto"></td><td style="padding:12px 14px;border-bottom:1px solid #27436A"><b style="color:#F4EEE1">${esc(w.t)}</b><br><span style="color:#A9B8CE;font-size:13px">${esc(w.size)}</span></td><td style="padding:12px 0;border-bottom:1px solid #27436A;text-align:right;color:#F4EEE1;white-space:nowrap">${eur(w.price*100,l)}</td></tr>`;
 const html=`<!doctype html><html><body style="margin:0;background:#0A1628;font-family:Helvetica,Arial,sans-serif;color:#F4EEE1"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0A1628"><tr><td align="center" style="padding:32px 16px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#10213A;padding:32px">
<tr><td style="font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#D4AF5A;padding-bottom:6px">Pere Lluís León</td></tr>
<tr><td style="font-size:22px;padding-bottom:18px;color:#F4EEE1">${esc(m.subj.split(' — ')[0])}</td></tr>
<tr><td style="font-size:15px;line-height:1.6;color:#F4EEE1">${esc(m.hi(first))}<br><br>${esc(m.p1)}</td></tr>
<tr><td style="padding-top:12px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:15px">${works.map(row).join('')}
<tr><td></td><td style="padding:10px 14px;color:#A9B8CE">${esc(m.ship)}</td><td style="padding:10px 0;text-align:right;color:#A9B8CE">${eur(shipC,l)}</td></tr>
<tr><td></td><td style="padding:6px 14px;color:#D4AF5A;font-weight:bold">${esc(m.tot)}</td><td style="padding:6px 0;text-align:right;color:#D4AF5A;font-weight:bold">${eur(s.amount_total,l)}</td></tr></table></td></tr>
${addr.length?`<tr><td style="padding-top:22px;font-size:14px;line-height:1.6;color:#A9B8CE"><b style="color:#F4EEE1">${esc(m.addr)}</b><br>${addr.map(esc).join('<br>')}</td></tr>`:''}
<tr><td style="padding-top:22px;font-size:15px;line-height:1.6;color:#F4EEE1">${esc(m.p2)}<br><br>${esc(m.p3)}</td></tr>
<tr><td style="padding-top:26px;border-top:1px solid #27436A;font-size:12px;color:#A9B8CE;line-height:1.6">${esc(m.ref)}: ${esc(s.id.slice(-12).toUpperCase())}<br><a href="${esc(env.SITE)}" style="color:#D4AF5A">${esc(env.SITE.replace(/^https?:\/\//,''))}</a> · Premià de Mar, Barcelona</td></tr>
</table></td></tr></table></body></html>`;
 const admin=env.MAIL_ADMIN,from=env.MAIL_FROM||'Pere Lluís León <onboarding@resend.dev>',jobs=[];
 if(cd.email)jobs.push(send(env,{from,to:[cd.email],reply_to:admin?[admin]:undefined,subject:m.subj,html}));
 if(admin){
  const txt=[`Nueva venta: ${works.map(w=>w.t).join(', ')}`,'',...works.map(w=>`• ${w.t} (${w.size}) — ${eur(w.price*100,'es')}`),`Envío: ${eur(shipC,'es')}`,`Total: ${eur(s.amount_total,'es')}`,'',`Cliente: ${cd.name||''}`,`Email: ${cd.email||''}`,`Teléfono: ${cd.phone||''}`,`Idioma: ${l}`,'','Dirección de envío:',...addr,'',md.message?`Mensaje: ${md.message}`:'',`Stripe: https://dashboard.stripe.com/payments/${s.payment_intent||''}`].join('\n');
  jobs.push(send(env,{from,to:[admin],reply_to:cd.email?[cd.email]:undefined,subject:`Nueva venta — ${works.map(w=>w.t).join(', ')} (${eur(s.amount_total,'es')})`,text:txt}));
 }
 await Promise.all(jobs);
}

/* ═══ Panel de gestión ═══
   Acceso con usuario y contraseña (secretos ADMIN_USER y ADMIN_PASS). Tras 10 intentos fallidos, la IP queda bloqueada 15 minutos.
   GET /admin → página · GET /admin/api/state → obras y estado · POST /admin/api/price {id,price|null} · POST /admin/api/sold {id,sold} */
async function same(a,b){
 const h=async s=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(s))));
 const [x,y]=await Promise.all([h(a),h(b)]);let d=0;for(let i=0;i<x.length;i++)d|=x[i]^y[i];return d===0;
}
async function admin(req,env,url){
 const H={'Cache-Control':'no-store','X-Frame-Options':'DENY','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow'};
 const out=(b,s=200,t='application/json; charset=utf-8',x={})=>new Response(typeof b==='string'?b:JSON.stringify(b),{status:s,headers:{...H,'Content-Type':t,...x}});
 if(!env.ADMIN_USER||!env.ADMIN_PASS)return out('Falta configurar ADMIN_USER y ADMIN_PASS (ver LEEME.md).',503,'text/plain; charset=utf-8');
 if(!env.SOLD)return out('Falta el KV SOLD (ver LEEME.md).',503,'text/plain; charset=utf-8');
 const ip=req.headers.get('CF-Connecting-IP')||'?',fk='fail:'+ip,fails=Number(await env.SOLD.get(fk)||0);
 if(fails>=10)return out('Demasiados intentos. Vuelve a probar dentro de 15 minutos.',429,'text/plain; charset=utf-8');
 const deny=()=>out('Acceso restringido',401,'text/plain; charset=utf-8',{'WWW-Authenticate':'Basic realm="Panel Pere Lluis Leon", charset="UTF-8"'});
 const au=req.headers.get('Authorization')||'';
 if(!au.startsWith('Basic '))return deny();
 let user='',pass='';try{const d=new TextDecoder().decode(Uint8Array.from(atob(au.slice(6)),ch=>ch.charCodeAt(0)));const i=d.indexOf(':');user=d.slice(0,i);pass=d.slice(i+1)}catch(_){}
 const ok=(await same(user,env.ADMIN_USER))&(await same(pass,env.ADMIN_PASS));
 if(!ok){await env.SOLD.put(fk,String(fails+1),{expirationTtl:900});return deny()}
 const p=url.pathname.replace(/^\/admin/,'')||'/';
 if(req.method==='GET'&&p==='/'){const n=crypto.randomUUID().replace(/-/g,'');return out(adminPage(n,env),200,'text/html; charset=utf-8',{'Content-Security-Policy':`default-src 'none'; script-src 'nonce-${n}'; style-src 'nonce-${n}'; img-src ${env.SITE}; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`})}
 if(req.method==='GET'&&p==='/api/state'){
  const [cat,st]=await Promise.all([catalog(env),kv(env)]);
  return out({works:Object.entries(cat.items).map(([id,w])=>({id,t:w.t,size:w.size,base:w.price,fixedSold:!!w.sold,img:w.img.replace('/img/f/','/img/t/'),price:st.prices[id]||null,sold:st.sold[id]||null})),site:env.SITE});
 }
 if(req.method==='POST'&&p.startsWith('/api/')){
  if(req.headers.get('Origin')!==url.origin)return out({error:'origen'},403);
  const b=await req.json().catch(()=>({})),cat=await catalog(env),id=String(b.id||'');
  if(!cat.items[id])return out({error:'obra desconocida'},400);
  if(p==='/api/price'){
   if(b.price==null||b.price===''){await env.SOLD.delete('price:'+id);return out({ok:true})}
   const v=Math.round(Number(b.price));if(!(v>=1&&v<=1000000))return out({error:'precio no válido'},400);
   await env.SOLD.put('price:'+id,String(v),{metadata:{p:v}});return out({ok:true});
  }
  if(p==='/api/sold'){
   if(b.sold){const info={src:'manual',at:new Date().toISOString()};await env.SOLD.put(id,JSON.stringify(info),{metadata:info})}else await env.SOLD.delete(id);
   return out({ok:true});
  }
 }
 return out({error:'no encontrado'},404);
}
function adminPage(n,env){return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Panel · Pere Lluís León</title><style nonce="${n}">
:root{--bg:#0A1628;--p:#10213A;--c:#17304F;--l:#27436A;--i:#F4EEE1;--m:#A9B8CE;--g:#D4AF5A;--ok:#7FC8A9;--bad:#E8846B}
*{box-sizing:border-box;margin:0}body{font:15px/1.5 system-ui,-apple-system,Segoe UI,sans-serif;background:var(--bg);color:var(--i)}
header{position:sticky;top:0;z-index:2;display:flex;flex-wrap:wrap;gap:.8rem 1.2rem;align-items:center;justify-content:space-between;padding:1rem clamp(1rem,4vw,2.5rem);background:var(--p);border-bottom:1px solid var(--l)}
h1{font-size:1.05rem;font-weight:600;letter-spacing:.04em}h1 small{display:block;color:var(--g);font-size:.7rem;letter-spacing:.22em;text-transform:uppercase;font-weight:500}
.tools{display:flex;gap:.6rem;flex-wrap:wrap}input,select,button{font:inherit;color:inherit}
input[type=search],select{background:var(--c);border:1px solid var(--l);border-radius:4px;padding:.5rem .7rem}input[type=search]{width:min(260px,60vw)}
main{padding:1rem clamp(1rem,4vw,2.5rem) 4rem}.sum{color:var(--m);font-size:.85rem;margin:.4rem 0 1rem}
.row{display:grid;grid-template-columns:64px minmax(0,1fr) auto;gap:.6rem 1rem;align-items:center;padding:.8rem 0;border-bottom:1px solid var(--l)}
.row img{width:64px;height:64px;object-fit:contain;background:var(--p)}.t b{font-weight:600}.t small{display:block;color:var(--m)}
.st{font-size:.8rem;color:var(--m)}.st.s{color:var(--bad)}.st.a{color:var(--ok)}
.ctl{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;justify-content:flex-end}
.pr{display:flex;align-items:center;gap:.3rem}.pr input{width:6.5rem;background:var(--c);border:1px solid var(--l);border-radius:4px;padding:.45rem .6rem;text-align:right}
.pr input.ch{border-color:var(--g)}button{border:1px solid var(--l);background:var(--c);border-radius:4px;padding:.45rem .8rem;cursor:pointer}
button.g{background:var(--g);border-color:var(--g);color:var(--bg);font-weight:600}button:disabled{opacity:.35;cursor:default}
button.sold{border-color:var(--bad);color:var(--bad)}button.av{border-color:var(--ok);color:var(--ok)}
.lk{background:none;border:0;padding:0;color:var(--m);text-decoration:underline;font-size:.8rem}
#toast{position:fixed;left:50%;bottom:1.2rem;transform:translateX(-50%);background:var(--g);color:var(--bg);padding:.6rem 1rem;border-radius:4px;font-weight:600;opacity:0;transition:opacity .3s;pointer-events:none}#toast.on{opacity:1}#toast.err{background:var(--bad)}
@media(max-width:640px){.row{grid-template-columns:56px minmax(0,1fr)}.row img{width:56px;height:56px}.ctl{grid-column:1/-1;justify-content:flex-start}}
</style></head><body><header><h1><small>Panel de gestión</small>Pere Lluís León</h1><div class="tools"><input type="search" id="q" placeholder="Buscar obra…" aria-label="Buscar"><select id="f" aria-label="Filtro"><option value="all">Todas</option><option value="av">Disponibles</option><option value="sold">Vendidas</option><option value="pr">Con precio cambiado</option></select></div></header>
<main><p class="sum" id="sum">Cargando…</p><div id="list"></div></main><div id="toast" role="status"></div>
<script nonce="${n}">
const $=s=>document.querySelector(s),E=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const eur=v=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:0,useGrouping:'always'}).format(v);
const day=s=>s?new Date(s).toLocaleString('es-ES',{dateStyle:'medium',timeStyle:'short'}):'';
let W=[];
const toast=(m,err)=>{const t=$('#toast');t.textContent=m;t.className=err?'on err':'on';clearTimeout(toast.k);toast.k=setTimeout(()=>t.className=err?'err':'',2200)};
async function api(path,body){const r=await fetch('/admin/api/'+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,credentials:'same-origin'});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||r.status);return j}
function status(w){if(w.fixedSold)return '<span class="st s">Vendida (fijada en la web)</span>';if(w.sold)return w.sold.src==='stripe'?'<span class="st s">Vendida por la web · '+E(day(w.sold.at))+(w.sold.email?' · '+E(w.sold.email):'')+'</span>':'<span class="st s">Marcada como vendida'+(w.sold.at?' · '+E(day(w.sold.at)):'')+'</span>';return '<span class="st a">Disponible</span>'}
function draw(){
 const q=$('#q').value.trim().toLowerCase(),f=$('#f').value;
 const L=W.filter(w=>(!q||w.t.toLowerCase().includes(q)||w.id.includes(q))&&(f==='all'||(f==='av'&&!w.sold&&!w.fixedSold)||(f==='sold'&&(w.sold||w.fixedSold))||(f==='pr'&&w.price)));
 const ns=W.filter(w=>w.sold||w.fixedSold).length;$('#sum').textContent=W.length+' obras · '+(W.length-ns)+' disponibles · '+ns+' vendidas';
 $('#list').innerHTML=L.map(w=>'<div class="row" data-id="'+E(w.id)+'"><img src="'+E(w.img)+'" alt="" loading="lazy"><div class="t"><b>'+E(w.t)+'</b><small>'+E(w.size)+' · precio base '+eur(w.base)+'</small>'+status(w)+'</div><div class="ctl"><label class="pr"><input type="number" min="1" step="1" inputmode="numeric" value="'+(w.price||w.base)+'" aria-label="Precio de '+E(w.t)+'"> €</label><button class="g" data-save disabled>Guardar</button>'+(w.price?'<button class="lk" data-reset>Volver al precio base</button>':'')+(w.fixedSold?'':'<button class="'+(w.sold?'av':'sold')+'" data-sold>'+(w.sold?'Marcar disponible':'Marcar vendida')+'</button>')+'</div></div>').join('')||'<p class="sum">Ninguna obra coincide.</p>';
}
async function load(){try{W=(await api('state')).works;draw()}catch(e){$('#sum').textContent='No se pudo cargar: '+e.message}}
$('#q').addEventListener('input',draw);$('#f').addEventListener('change',draw);
$('#list').addEventListener('input',e=>{const r=e.target.closest('.row');if(!r||!e.target.matches('input'))return;const w=W.find(x=>x.id===r.dataset.id),v=Number(e.target.value),ch=v>0&&v!==(w.price||w.base);e.target.classList.toggle('ch',ch);r.querySelector('[data-save]').disabled=!ch});
$('#list').addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.matches('.pr input')){const b=e.target.closest('.row').querySelector('[data-save]');if(!b.disabled)b.click()}});
$('#list').addEventListener('click',async e=>{const b=e.target.closest('button');if(!b)return;const r=b.closest('.row'),w=W.find(x=>x.id===r.dataset.id);b.disabled=true;
 try{
  if(b.dataset.save!==undefined){const v=Math.round(Number(r.querySelector('input').value));await api('price',{id:w.id,price:v===w.base?null:v});w.price=v===w.base?null:v;toast('Precio guardado: '+w.t+' · '+eur(v))}
  else if(b.dataset.reset!==undefined){await api('price',{id:w.id,price:null});w.price=null;toast('Precio base restablecido: '+w.t)}
  else if(b.dataset.sold!==undefined){if(!w.sold&&!confirm('¿Marcar «'+w.t+'» como vendida? Dejará de poder comprarse en la web.'))return;if(w.sold&&w.sold.src==='stripe'&&!confirm('Esta obra se vendió por la web ('+(w.sold.email||'')+'). ¿Seguro que quieres volver a ponerla a la venta?'))return;await api('sold',{id:w.id,sold:!w.sold});w.sold=w.sold?null:{src:'manual',at:new Date().toISOString()};toast(w.sold?'Marcada como vendida: '+w.t:'Disponible de nuevo: '+w.t)}
  draw();
 }catch(err){toast('Error: '+err.message,true);b.disabled=false}
});
load();
</script></body></html>`}