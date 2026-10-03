import { normalizar } from './carrito.js';
export function filtrar(productos, { buscar = '', consola = '', modelo = '', categoria = '' } = {}) {
  const palabras = normalizar(buscar).split(/\s+/).filter(Boolean);
  return productos.filter(p => (!consola || p.consola === consola) && (!modelo || p.modelos.includes(modelo)) && (!categoria || p.categoria === categoria) && palabras.every(s => normalizar([p.id,p.nombre,p.categoria,p.consola,...p.modelos,p.descripcion].join(' ')).includes(s)));
}
export const modelosDisponibles = (productos, consola = '') => [...new Set(productos.filter(p=>!consola || p.consola === consola).flatMap(p=>p.modelos))].sort((a,b)=>a.localeCompare(b,'es',{numeric:true}));
export function paginar(productos,{pagina=1,tamano=24,orden='destacados'}={}) {
  const ordenados=[...productos].sort((a,b)=>{
    if(orden==='precio-asc'||orden==='precio-desc') {
      if(a.precio===null&&b.precio!==null)return 1;
      if(b.precio===null&&a.precio!==null)return -1;
      if(a.precio!==null&&b.precio!==null&&a.precio!==b.precio)return (a.precio-b.precio)*(orden==='precio-desc'?-1:1);
    }
    if(orden==='destacados') {
      const destacados=Number(Boolean(b.destacado))-Number(Boolean(a.destacado));
      if(destacados)return destacados;
      const fotos=Number(b.fotos.length>0)-Number(a.fotos.length>0);if(fotos)return fotos;
      const accesorios=Number(a.categoria==='Accesorios')-Number(b.categoria==='Accesorios');if(accesorios)return accesorios;
    }
    return a.nombre.localeCompare(b.nombre,'es',{numeric:true})||a.id.localeCompare(b.id);
  });
  const paginas=Math.max(1,Math.ceil(ordenados.length/tamano));
  pagina=Math.max(1,Math.min(paginas,Number.isInteger(pagina)?pagina:1));
  const inicio=(pagina-1)*tamano;
  return {items:ordenados.slice(inicio,inicio+tamano),pagina,paginas,total:ordenados.length,desde:ordenados.length?inicio+1:0,hasta:Math.min(inicio+tamano,ordenados.length)};
}
export function mensajeServicio({local='',equipo='',falla=''}={}) {
  const limpiar = (s,max) => String(s).replace(/[\u0000-\u001f\u007f]+/g,' ').trim().slice(0,max);
  equipo=limpiar(equipo,100);falla=limpiar(falla,700);local=limpiar(local,80);
  if(!equipo || !falla) return '';
  return ['Hola, Spot Fixes! Les escribo desde la página web por un trabajo para el gremio.',...(local?[`Local / service: ${local}`]:[]),`Equipo / modelo: ${equipo}`,`Falla y pruebas realizadas: ${falla}`,'Quiero consultar si pueden tomar la reparación y coordinar las condiciones.'].join('\n');
}
