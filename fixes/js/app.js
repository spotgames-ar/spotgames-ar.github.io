import { validarCatalogo, crearCarrito, resumen, moneda, mensajePedido, enlaceWhatsApp, evaluarMayorista, MAX_CANTIDAD } from './carrito.js';
import { filtrar, modelosDisponibles, mensajeServicio, paginar } from './catalogo.js';
import { iniciarNavegacion } from './navegacion.js';
import { iniciarMedia } from './media.js';

const $ = s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc = value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon = name=>`<svg class="brand-icon" aria-hidden="true"><use href="#icon-${name}"/></svg>`;
const pathSeguro=p=>typeof p==='string'&&/^assets\/[\w./-]+\.(webp|avif|jpg|png)$/.test(p)&&!p.includes('..');
const enlaceML = url=>typeof url==='string'&&/^https:\/\/(?:[a-z0-9-]+\.)?mercadolibre\.com\.ar\//i.test(url);
const fotos = p=>(p.fotos||[]).filter(f=>pathSeguro(f.src));
const foto = (p,cls='')=>{const f=fotos(p)[0];return f?`<img class="${cls}" src="${esc(f.src)}" ${pathSeguro(f.pequena)?`srcset="${esc(f.pequena)} 400w, ${esc(f.src)} 800w" sizes="(max-width:599px) 115px, 300px"`:''} alt="${esc(f.alt||p.nombre)}" width="800" height="800" loading="lazy">`:'<span class="sin-foto"><svg viewBox="0 0 48 48" aria-hidden="true"><rect x="13" y="13" width="22" height="22" rx="3"/><path d="M19 5v8m10-8v8M19 35v8m10-8v8M5 19h8m-8 10h8m22-10h8m-8 10h8"/></svg><span>Foto pendiente</span></span>';};
let cfg, data, productos=[], carrito, toastTimer, paginaActual=1;
let ultimoFoco=new WeakMap();
function abrirDialogo(dialog){ultimoFoco.set(dialog,document.activeElement);dialog.showModal();document.body.classList.add('modal-open');dialog.querySelector('button')?.focus();}
$$('dialog').forEach(dialog=>{
  dialog.addEventListener('close',()=>{if(!$('dialog[open]'))document.body.classList.remove('modal-open');ultimoFoco.get(dialog)?.focus({preventScroll:true});});
  dialog.addEventListener('keydown',e=>{if(e.key!=='Tab')return;const focus=[...dialog.querySelectorAll('a[href],button:not(:disabled),input,select,textarea,[tabindex="0"]')].filter(x=>x.getClientRects().length);if(!focus.length)return;if(e.shiftKey&&document.activeElement===focus[0]){e.preventDefault();focus.at(-1).focus();}else if(!e.shiftKey&&document.activeElement===focus.at(-1)){e.preventDefault();focus[0].focus();}});
  dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();});
});
$$('[data-cerrar]').forEach(b=>b.addEventListener('click',()=>document.getElementById(b.dataset.cerrar).close()));
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),2600);}
function invalidate(){ $('#pedido-preparado').hidden=true;$('#pedido-enlace').removeAttribute('href'); }
function qtyControl(id,n,scope){return `<div class="quantity"><button type="button" data-qty="-1" data-id="${esc(id)}" data-scope="${scope}" aria-label="Restar una unidad de ${esc(id)}">−</button><input type="number" inputmode="numeric" min="1" max="${MAX_CANTIDAD}" step="1" value="${n}" data-q="${esc(id)}" data-scope="${scope}" aria-label="Cantidad de ${esc(id)}"><button type="button" data-qty="1" data-id="${esc(id)}" data-scope="${scope}" aria-label="Sumar una unidad de ${esc(id)}">+</button></div>`;}
function validarCantidad(input){const n=Number(input.value);const ok=Number.isSafeInteger(n)&&n>=1&&n<=MAX_CANTIDAD;input.setCustomValidity(ok?'':`Indicá una cantidad entera entre 1 y ${MAX_CANTIDAD}.`);return ok?n:null;}
function actualizarResumen(r){
  $('#contador').textContent=r.cantidad;$('#abrir-carrito').setAttribute('aria-label',`Mi pedido, ${r.cantidad} unidades`);
  $('#cart-summary').innerHTML=`<div class="cart-totals"><div><span>Total de referencia</span><strong>${r.conPrecio?moneda(r.total):'A confirmar'}</strong></div><p class="fineprint">${r.sinPrecio?`${r.sinPrecio} unidades sin precio, fuera del total. `:''}${r.cantidad} unidades en el pedido.</p></div>`;
  const mayor=evaluarMayorista(carrito.items,productos,data.mayorista);
  $('#cart-summary').insertAdjacentHTML('beforeend',`<aside class="wholesale-cart ${mayor.aplica?'eligible':''}"><strong>${mayor.aplica?'Tu pedido alcanza una condición mayorista.':'También cotizamos por mayor.'}</strong><p>${mayor.aplica?(mayor.porMonto?'Supera o alcanza el monto mínimo.':'Incluye 5 o más unidades del mismo código.'):'Desde 5 unidades del mismo artículo o '+moneda(data.mayorista.umbralMonto)+' de pedido.'} El total usa Venta Local. Confirmamos la cotización mayorista por WhatsApp.</p></aside>`);
  $('#storage-note').textContent=carrito.persistente?'El pedido se conserva en este dispositivo.':'El pedido funciona en memoria; este navegador no permite guardarlo al recargar.';
}
function actualizarCarrito(){
  invalidate();const r=resumen(carrito.items,productos);
  $('#cart-items').innerHTML=r.lineas.length?r.lineas.map(i=>`<article class="cart-row">${foto(i.producto)}<div><p class="code">${esc(i.id)}</p><h3>${esc(i.producto.nombre)}</h3><div class="cart-row-controls">${qtyControl(i.id,i.cantidad,'cart')}<button class="text-button" type="button" data-quitar="${esc(i.id)}" aria-label="Quitar ${esc(i.producto.nombre)}">Quitar</button></div><p class="cart-price">${i.subtotal===null?'Precio a confirmar':`${moneda(i.producto.precio)} c/u · ${moneda(i.subtotal)}`}</p></div></article>`).join(''):`<div class="cart-empty"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16v14H4zM8 7V3h8v4"/></svg><h3>Tu próximo pedido empieza acá.</h3><p>Buscá por código o modelo y agregá las cantidades que necesitás.</p><button class="button secondary" type="button" id="seguir-buscando">Buscar repuestos</button></div>`;
  $('#pedido-form').hidden=!r.lineas.length;
  actualizarResumen(r);
  $('#seguir-buscando')?.addEventListener('click',()=>{$('#carrito').close();$('#catalogo').scrollIntoView();$('#buscar').focus({preventScroll:true});});
}
function agregar(id,n=1){const antes=resumen(carrito.items,productos).cantidad;carrito.agregar(id,n);actualizarCarrito();const cambio=resumen(carrito.items,productos).cantidad-antes;toast(cambio?`${cambio} ${cambio===1?'unidad agregada':'unidades agregadas'} · ${id}`:`Máximo ${MAX_CANTIDAD} unidades por código.`);$('#abrir-carrito').classList.remove('pulse');requestAnimationFrame(()=>$('#abrir-carrito').classList.add('pulse'));}
function mostrarProductos(reiniciar=true){
  if(reiniciar)paginaActual=1;
  const lista=filtrar(productos,{buscar:$('#buscar').value,consola:$('#consola').value,modelo:$('#modelo').value,categoria:$('#categoria').value});
  const page=paginar(lista,{pagina:paginaActual,orden:$('#orden').value});paginaActual=page.pagina;
  $('#productos').innerHTML=page.items.map(p=>`<article class="product"><button class="product-picture" type="button" data-ficha="${esc(p.id)}" aria-label="Ver ficha de ${esc(p.nombre)}">${foto(p)}<span class="photo-action">VER FICHA ↗</span></button><div class="product-body"><p class="code">${esc(p.id)}</p><h3><button type="button" data-ficha="${esc(p.id)}">${esc(p.nombre)}</button></h3><p class="model-line">${esc(p.modelos.join(' / '))}</p><div class="product-price"><span class="price-kind">Venta local · ARS</span><span class="${p.precio===null?'price-null':'price-real'}">${p.precio===null?'Consultar precio':moneda(p.precio)}</span><span class="stock-note">${{disponible:'Disponible',consultar:'Stock a confirmar',agotado:'Agotado'}[p.stock]}</span></div><div class="product-actions">${qtyControl(p.id,1,'card')}<button class="button primary" type="button" data-agregar="${esc(p.id)}" ${p.stock==='agotado'?'disabled':''} aria-label="Agregar ${esc(p.nombre)} al pedido">${p.stock==='agotado'?'Agotado':'Agregar'} <span aria-hidden="true">+</span></button></div></div></article>`).join('');
  $('#resultados').textContent=`${page.total} ${page.total===1?'artículo':'artículos'}${page.total?' · mostrando '+page.desde+'–'+page.hasta:''}`;
  $('#paginacion').hidden=page.paginas<2;$('#pagina-actual').textContent=`Página ${page.pagina} de ${page.paginas}`;
  $('#pagina-anterior').disabled=page.pagina===1;$('#pagina-siguiente').disabled=page.pagina===page.paginas;
  $('#sin-resultados').hidden=lista.length>0;
}
let fichaProducto,indiceFoto=0;
function mostrarFoto(n){const fs=fotos(fichaProducto);if(!fs.length)return;indiceFoto=(n+fs.length)%fs.length;$('#ficha-foto').src=fs[indiceFoto].src;$('#ficha-foto').alt=fs[indiceFoto].alt||fichaProducto.nombre;$('#ficha-contador').textContent=`Foto ${indiceFoto+1} de ${fs.length}`;}
function abrirFicha(id){
  const p=productos.find(p=>p.id===id);if(!p)return;fichaProducto=p;indiceFoto=0;const fs=fotos(p),f=p.ficha||{};
  const mensaje=`Hola, Spot Fixes! Desde la página web quiero consultar el repuesto ${p.nombre} [${p.id}]. Mi equipo / revisión: … ¿Me ayudan a confirmar compatibilidad, presentación y disponibilidad?`;
  $('#ficha-contenido').innerHTML=`<div class="ficha-layout"><div class="ficha-gallery" role="group" aria-label="Fotos del repuesto"><div class="ficha-main-image">${fs.length?`<img id="ficha-foto" src="${esc(fs[0].src)}" alt="${esc(fs[0].alt)}" width="800" height="800" loading="lazy">`:'<p>Foto a confirmar</p>'}</div><div class="ficha-gallery-bar" ${fs.length?'':'hidden'}><span id="ficha-contador" role="status">Foto 1 de ${fs.length}</span><div ${fs.length>1?'':'hidden'}><button class="icon-button" type="button" data-foto="-1" aria-label="Foto anterior">←</button><button class="icon-button" type="button" data-foto="1" aria-label="Foto siguiente">→</button></div></div><p class="fineprint">Las fotos ayudan a identificar la pieza. Confirmá unidades por envase y presentación al cotizar.</p></div><div class="ficha-info"><p class="eyebrow">${esc(p.categoria)}</p><p class="code">${esc(p.id)}</p><h2 id="ficha-title">${esc(p.nombre)}</h2><p class="description">${esc(p.descripcion)}</p><dl class="specs">${[['Compatible con',p.modelos.join(' · ')],['Revisión',f.revision||'A confirmar'],['Presentación',f.incluye||'A confirmar'],['Condición',p.estado||'A confirmar al cotizar'],['Garantía',f.garantia||'A confirmar al cotizar']].map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl><div class="ficha-purchase"><p class="price-kind">Venta local · ARS</p><p class="price-null">${p.precio===null?'Precio a consultar':moneda(p.precio)}</p>${qtyControl(p.id,1,'ficha')}<button class="button primary" data-ficha-agregar="${esc(p.id)}" type="button" ${p.stock==='agotado'?'disabled':''}>${p.stock==='agotado'?'Agotado':'Agregar al pedido'} +</button><a class="text-link" href="${esc(enlaceWhatsApp(cfg.telefono,mensaje).url)}" target="_blank" rel="noopener noreferrer">${icon('whatsapp')} Confirmar compatibilidad</a>${enlaceML(p.ml_url)?`<a class="text-link" href="${esc(p.ml_url)}" target="_blank" rel="noopener noreferrer">${icon('mercadopago')} Ver en MercadoLibre</a>`:''}</div></div></div>`;
  abrirDialogo($('#ficha'));
}
document.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b||!carrito)return;
  if(b.dataset.ficha)abrirFicha(b.dataset.ficha);
  if(b.dataset.foto)mostrarFoto(indiceFoto+Number(b.dataset.foto));
  if(b.dataset.qty){const input=b.parentElement.querySelector('input');const current=Number(input.value);const n=Math.min(MAX_CANTIDAD,Math.max(1,(Number.isSafeInteger(current)?current:1)+Number(b.dataset.qty)));input.value=n;input.setCustomValidity('');if(b.dataset.scope==='cart'){const id=b.dataset.id;carrito.cambiar(id,n);actualizarCarrito();$(`#cart-items [data-id="${id}"][data-qty="${b.dataset.qty}"]`)?.focus();}}
  const id=b.dataset.agregar||b.dataset.fichaAgregar;
  if(id){const input=b.parentElement.querySelector('input[data-q]');const n=validarCantidad(input);if(n===null){input.reportValidity();return;}if(b.dataset.fichaAgregar)$('#ficha').close();agregar(id,n);}
  if(b.dataset.quitar){carrito.quitar(b.dataset.quitar);actualizarCarrito();$('#carrito .icon-button').focus();}
});
document.addEventListener('input',e=>{const input=e.target;if(!input.matches('input[data-q]'))return;const n=validarCantidad(input);if(input.dataset.scope==='cart'){invalidate();if(n!==null){carrito.cambiar(input.dataset.q,n);actualizarResumen(resumen(carrito.items,productos));}}});

$('#ficha').addEventListener('keydown',e=>{if(e.target.closest('.ficha-gallery')&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();mostrarFoto(indiceFoto+(e.key==='ArrowRight'?1:-1));}});
$('#abrir-carrito').addEventListener('click',()=>abrirDialogo($('#carrito')));
$('#pedido-form').addEventListener('input',invalidate);
$('#pedido-form').addEventListener('submit',e=>{e.preventDefault();const invalid=$$('#cart-items input[data-q]').find(el=>validarCantidad(el)===null);if(invalid){invalid.reportValidity();return;}const opts=Object.fromEntries(new FormData(e.target));const msg=mensajePedido(carrito.items,productos,{...opts,actualizado:data.actualizado,listaPrecio:data.listaPrecio,mayorista:data.mayorista});if(!msg)return;const {url}=enlaceWhatsApp(cfg.telefono,msg);$('#pedido-texto').textContent=msg;$('#pedido-enlace').hidden=!url;if(url)$('#pedido-enlace').href=url;$('#pedido-largo').hidden=!!url;$('#pedido-preparado').hidden=false;$('#pedido-texto').focus();});
$('#copiar-pedido').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('#pedido-texto').textContent);$('#copiar-pedido').textContent='Detalle copiado';}catch{$('#pedido-texto').focus();$('#copiar-pedido').textContent='Seleccioná el detalle y copialo manualmente';}});
$('#consulta-taller').addEventListener('input',()=>{$('#consulta-preparada').hidden=true;$('#consulta-enlace').removeAttribute('href');});
$('#consulta-taller').addEventListener('submit',e=>{e.preventDefault();const msg=mensajeServicio(Object.fromEntries(new FormData(e.target)));if(!msg||!cfg)return;$('#consulta-texto').textContent=msg;$('#consulta-enlace').href=enlaceWhatsApp(cfg.telefono,msg).url;$('#consulta-preparada').hidden=false;$('#consulta-enlace').focus();});
function setOptions(select,values,label){select.innerHTML=`<option value="">${label}</option>`+values.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');}
async function iniciar(){
  iniciarNavegacion();iniciarMedia();
  try{
    const responses=await Promise.all(['data/config.json','data/productos.json','data/iconos.json'].map(url=>fetch(url).then(r=>{if(!r.ok)throw Error('No se pudo cargar '+url);return r.json();})));
    [cfg,data]=responses;validarCatalogo(data);productos=data.productos;
    if(productos.some(p=>!p.id.startsWith('SF-')||!Array.isArray(p.modelos)||!p.modelos.length||typeof p.consola!=='string'))throw Error('Revisá los modelos y códigos del catálogo.');
    $('#iconos').innerHTML=`<svg xmlns="http://www.w3.org/2000/svg"><defs>${Object.entries(responses[2]).map(([name,ico])=>`<symbol id="icon-${esc(name)}" viewBox="0 0 24 24">${ico.paths.map(d=>`<path d="${esc(d)}"/>`).join('')}</symbol>`).join('')}</defs></svg>`;
    fetch('data/clientes.json').then(r=>{if(!r.ok)throw Error('Clientes no disponibles');return r.json();}).then(({clientes=[]})=>{
      $('#clientes-lista').innerHTML=clientes.map(c=>`<li><a class="client-card" href="${esc(c.url)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(c.nombre)} · sitio oficial"><span class="client-logo ${c.fondo==='claro'?'client-logo-light':''}">${pathSeguro(c.logo)?`<img src="${esc(c.logo)}" alt="" width="220" height="110" loading="lazy" decoding="async">`:esc(c.nombre)}</span><span class="client-name">${esc(c.nombre)} <span aria-hidden="true">↗</span></span></a></li>`).join('')+'<li class="client-more"><a class="client-card" href="#contacto"><span class="client-plus" aria-hidden="true">+</span><strong>Y muchos más.</strong><span>Tu taller también tiene lugar.</span></a></li>';
      $('#clientes').hidden=!clientes.length;
    }).catch(()=>{$('#clientes').hidden=true;});
    const mensajes={mayorista:'Hola, Spot Fixes! Desde la página web quiero una cotización mayorista por cantidad o monto. Artículos / códigos: … Cantidades: …',general:'Hola, Spot Fixes! Les escribo desde la página web. Soy del gremio y quiero hacer una consulta.',identificar:'Hola, Spot Fixes! Desde la página web necesito identificar un repuesto. Consola / modelo: … Revisión / código de pieza: … Les puedo mandar una foto.',lista:'Hola, Spot Fixes! Desde la página web quiero pedir la lista para el gremio. Mi local / service: …',ml:'Hola, Spot Fixes! Desde la página web quiero pedir el enlace de MercadoLibre de un repuesto. Código / modelo: …'};
    $$('[data-wa],[data-lista]').forEach(a=>{a.href=a.hasAttribute('data-lista')&&/^https:\/\//.test(cfg.listaGremio||'')?cfg.listaGremio:enlaceWhatsApp(cfg.telefono,mensajes[a.dataset.wa||'lista']).url;a.target='_blank';a.rel='noopener noreferrer';if(a.hasAttribute('data-lista')&&cfg.listaGremio)a.innerHTML=`Lista para el gremio <span aria-hidden="true">↗</span>`;});
    if(enlaceML(cfg.mercadolibre))$$('[data-wa="ml"]').forEach(a=>{a.href=cfg.mercadolibre;a.textContent='Ver nuestra tienda.';});
    $$('[data-telefono]').forEach(el=>el.textContent=cfg.telefonoVisible);
    $$('[data-instagram]').forEach(el=>{if(/^https:\/\/(www\.)?instagram\.com\//.test(cfg.instagram||''))el.href=cfg.instagram;});
    $$('[data-horarios]').forEach(el=>el.textContent=cfg.horarios);
    $('#referencia').textContent=`Precios de Venta Local en pesos argentinos. Actualizados el ${new Intl.DateTimeFormat('es-AR',{dateStyle:'long',timeZone:'UTC'}).format(new Date(data.actualizado+'T12:00:00Z'))}. Disponibilidad a confirmar.`;
    setOptions($('#consola'),[...new Set(productos.map(p=>p.consola))],'Todas las consolas');setOptions($('#modelo'),modelosDisponibles(productos),'Todos los modelos');setOptions($('#categoria'),[...new Set(productos.map(p=>p.categoria))],'Todos los repuestos');
    $('#consola').addEventListener('change',()=>{setOptions($('#modelo'),modelosDisponibles(productos,$('#consola').value),'Todos los modelos');mostrarProductos();});
    ['#modelo','#categoria','#orden'].forEach(s=>$(s).addEventListener('change',mostrarProductos));$('#buscar').addEventListener('input',mostrarProductos);$('#filtros').addEventListener('submit',e=>e.preventDefault());
    $('#limpiar').addEventListener('click',()=>{$('#filtros').reset();setOptions($('#modelo'),modelosDisponibles(productos),'Todos los modelos');mostrarProductos();$('#buscar').focus();});
    for(const [selector,salto] of [['#pagina-anterior',-1],['#pagina-siguiente',1]])$(selector).addEventListener('click',()=>{paginaActual+=salto;mostrarProductos(false);$('#resultados').focus({preventScroll:true});$('#filtros').scrollIntoView({block:'start'});});
    carrito=crearCarrito(productos,()=>localStorage);mostrarProductos();actualizarCarrito();$('#abrir-carrito').disabled=false;
  }catch(error){console.error(error);$('#resultados').textContent='No pudimos cargar el catálogo. Podés consultarnos por WhatsApp.';$('#sin-resultados').hidden=false;$$('[data-wa],[data-lista]').forEach(a=>{a.href='https://wa.me/5491122998385?text=Hola!%20Les%20escribo%20desde%20la%20web%20de%20Spot%20Fixes.';});}
}
iniciar();
