// Solo códigos del catálogo: jamás texto libre, clientes, mensajes ni enlaces de WhatsApp.
const eventos=new Set(['ver_producto','agregar_carrito','enviar_pedido']);
export function eventoSeguro(nombre,codigos){
  if(!eventos.has(nombre))return null;
  const ids=[...new Set((Array.isArray(codigos)?codigos:[codigos]).filter(x=>typeof x==='string'&&/^(?:SF|G)-[A-Z0-9-]{1,60}$/.test(x)))];
  return ids.length?{nombre,items:ids.map(item_id=>({item_id}))}:null;
}
export function medir(nombre,codigos){document.dispatchEvent(new CustomEvent('spot:medir',{detail:eventoSeguro(nombre,codigos)}));}
export function habilitado(config,loc){return loc.hostname==='spotgames-ar.github.io'&&/^\/(tienda|fixes)\/(?:index.html)?$/.test(loc.pathname)&&!loc.search&&!loc.hash&&Boolean(config.ga4||config.clarity);}
export function iniciarRadar(config={}){
  if(!habilitado(config,location))return;
  const ga=/^G-[A-Z0-9]+$/.test(config.ga4||''),clarity=/^[a-z0-9]{5,20}$/.test(config.clarity||'');
  const cargar=src=>{const s=document.createElement('script');s.async=true;s.src=src;document.head.append(s);};
  const pagina=location.origin+location.pathname;
  let origen='';try{origen=new URL(document.referrer).origin;}catch{}
  if(ga){window.dataLayer=window.dataLayer||[];window.gtag=function(){window.dataLayer.push(arguments);};window.gtag('js',new Date());window.gtag('config',config.ga4,{send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false,page_location:pagina,page_referrer:origen,page_title:document.title});window.gtag('event','page_view',{page_location:pagina,page_referrer:origen,page_title:document.title});cargar('https://www.googletagmanager.com/gtag/js?id='+config.ga4);}
  if(clarity){window.clarity=window.clarity||function(){(window.clarity.q=window.clarity.q||[]).push(arguments);};cargar('https://www.clarity.ms/tag/'+config.clarity);}
  document.addEventListener('spot:medir',e=>{const d=e.detail;if(!d||!eventos.has(d.nombre))return;const safe=eventoSeguro(d.nombre,d.items?.map(i=>i.item_id));if(!safe)return;
    if(ga)window.gtag('event',safe.nombre,{items:safe.items,page_location:pagina,page_referrer:origen});
    if(clarity)for(const {item_id} of safe.items)window.clarity('event',safe.nombre+'_'+item_id);
  });
}
