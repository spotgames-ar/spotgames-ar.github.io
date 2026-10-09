const normalizar=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function relacionados(producto,productos,reglas){
  if(!producto||!reglas)return [];
  const texto=p=>normalizar(p.nombre+' '+p.categoria);
  const familiaTexto=p=>reglas.modo==='fixes'?normalizar(p.nombre):texto(p);
  const familias=p=>reglas.familias.filter(f=>new RegExp(f.patron,'i').test(familiaTexto(p))&&(!f.excluir||!new RegExp(f.excluir,'i').test(familiaTexto(p)))).map(f=>f.id);
  const origen=familias(producto),destinos=new Set(origen.flatMap(id=>reglas.familias.find(f=>f.id===id).complementos));
  const sistemas=p=>reglas.modo==='fixes'?p.modelos||[]:reglas.sistemas.filter(s=>new RegExp(s.patron,'i').test(normalizar(p.plataforma+' '+p.nombre))).map(s=>s.id);
  const compatibles=p=>sistemas(producto).some(s=>sistemas(p).includes(s));
  const elegibles=productos.filter(p=>p.id!==producto.id&&p.stock==='disponible');
  const principales=elegibles.filter(p=>compatibles(p)&&familias(p).some(f=>destinos.has(f)));
  const relleno=reglas.relleno?elegibles.filter(p=>new RegExp(reglas.relleno,'i').test(texto(p))):[];
  return [...new Map([...principales,...relleno].map(p=>[p.id,p])).values()].slice(0,8);
}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function htmlRelacionados(p,productos,reglas){
  const lista=relacionados(p,productos,reglas);if(!lista.length)return '';
  return `<section class="related-section"><h3>Esto te puede servir</h3><p>Confirmá modelo y revisión antes de elegir.</p><div class="related-row">${lista.map(r=>`<button class="related-card" type="button" data-related="${esc(r.id)}">${r.fotos[0]&&/^assets\/[\w./-]+\.webp$/.test(r.fotos[0].src)&&!r.fotos[0].src.includes('..')?`<img src="${esc(r.fotos[0].src)}" alt="" loading="lazy" width="120" height="100">`:'<span class="related-placeholder">Foto pendiente</span>'}<strong>${esc(r.nombre)}</strong><span>${esc(r.id)}</span><span>${r.precio===null?'Consultar':new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0}).format(r.precio)}</span></button>`).join('')}</div></section>`;
}
export function iniciarRelacionados({productos,reglas,abrirFicha}){
  const dialog=document.createElement('dialog');dialog.className='related-dialog';dialog.setAttribute('aria-label','Producto agregado al pedido');document.body.append(dialog);
  let origen;
  dialog.addEventListener('close',()=>{if(!document.querySelector('dialog[open]'))document.body.classList.remove('modal-open');origen?.focus({preventScroll:true});});
  dialog.addEventListener('keydown',e=>{if(e.key!=='Tab')return;const f=[...dialog.querySelectorAll('button')];if(e.shiftKey&&document.activeElement===f[0]){e.preventDefault();f.at(-1).focus();}else if(!e.shiftKey&&document.activeElement===f.at(-1)){e.preventDefault();f[0].focus();}});
  document.addEventListener('click',e=>{const b=e.target.closest('[data-related]');if(!b)return;document.querySelectorAll('dialog[open]').forEach(d=>d.close());abrirFicha(b.dataset.related);});
  return p=>{const html=htmlRelacionados(p,productos,reglas);if(!html)return;origen=document.activeElement;dialog.innerHTML='<button class="button secondary" type="button" data-continuar>Seguir eligiendo ×</button><h2>Agregado a tu pedido.</h2>'+html;dialog.querySelector('[data-continuar]').onclick=()=>dialog.close();dialog.showModal();document.body.classList.add('modal-open');dialog.querySelector('button').focus();};
}
