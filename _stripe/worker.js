/* ═══ Pagos de perelluisleon.art con Stripe Checkout — Cloudflare Worker ═══
   Rutas:
     POST /checkout  → crea una sesión de Stripe Checkout y devuelve { url }
     POST /webhook   → Stripe avisa de un pago completado; la obra se marca como vendida (KV)
     GET  /sold      → lista de obras vendidas desde el último build (la web la usa para bloquear botones)
   Precios, envío y obras vendidas se leen de https://perelluisleon.art/catalog.json (lo genera build.js).
   El navegador solo envía ids: el precio SIEMPRE se calcula aquí.
   Secretos (wrangler secret put …): STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
   Variables (wrangler.toml): SITE, ALLOWED_ORIGINS
   KV opcional (recomendado): SOLD — evita vender dos veces la misma obra única. */

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
   if(req.method==='OPTIONS')return new Response(null,{headers:cors});
   if(url.pathname==='/checkout'&&req.method==='POST'){if(!allowed.includes(origin))return json({error:'origin'},403);return json(...await checkout(req,env))}
   if(url.pathname==='/webhook'&&req.method==='POST')return webhook(req,env);
   if(url.pathname==='/sold'&&req.method==='GET')return json({sold:await soldList(env)});
   return json({error:'not found'},404);
  }catch(err){console.error(err);return json({error:'server'},500)}
 }
};

async function catalog(env){
 const r=await fetch(env.SITE+'/catalog.json',{cf:{cacheTtl:60,cacheEverything:true}});
 if(!r.ok)throw new Error('catalog '+r.status);return r.json();
}
async function soldList(env){
 if(!env.SOLD)return [];
 const l=await env.SOLD.list();return l.keys.map(k=>k.name);
}
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
 const cat=await catalog(env),sold=new Set(await soldList(env));
 const items=[];
 for(const id of ids){const w=cat.items[id];if(!w)return [{error:tx.bad},400];if(w.sold||sold.has(id))return [{error:tx.sold+': '+w.t},409];items.push([id,w])}
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
async function webhook(req,env){
 const payload=await req.text();
 if(!env.STRIPE_WEBHOOK_SECRET||!await verify(payload,req.headers.get('Stripe-Signature'),env.STRIPE_WEBHOOK_SECRET))return new Response('bad signature',{status:400});
 const ev=JSON.parse(payload);
 if((ev.type==='checkout.session.completed'||ev.type==='checkout.session.async_payment_succeeded')&&ev.data.object.payment_status==='paid'){
  const s=ev.data.object,ids=String(s.metadata&&s.metadata.items||'').split(',').filter(Boolean);
  if(env.SOLD)await Promise.all(ids.map(id=>env.SOLD.put(id,JSON.stringify({session:s.id,email:s.customer_details&&s.customer_details.email,at:new Date().toISOString()}))));
  console.log('Vendidas:',ids.join(', '),s.id);
 }
 return new Response('ok');
}
