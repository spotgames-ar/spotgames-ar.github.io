// Contrato público del mensaje; no guarda datos personales.
export const VERSION_PEDIDO=1;
export function telefonoArgentino(valor){
  const texto=String(valor??'').trim();
  if(!/^\+?[\d\s().-]+$/.test(texto))return null;
  const digitos=texto.replace(/\D/g,'');
  return digitos.length>=8&&digitos.length<=13&&(!texto.startsWith('+')||texto.startsWith('+54'))?digitos:null;
}
export function nuevoNumero(){const alfabeto='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';return 'W-'+Array.from(crypto.getRandomValues(new Uint8Array(7)),n=>alfabeto[n%32]).join('');}
export function cabeceraPedido(numero){
  if(!/^W-[A-Z0-9]{4,32}$/.test(numero))throw Error('Número de pedido inválido');
  return `Pedido ${numero} · v1`;
}
export function leerPedido(texto,catalogo){
  if(typeof texto!=='string'||texto.length>100000)throw Error('Mensaje demasiado largo');
  const cab=texto.match(/^Pedido (W-[A-Z0-9]{4,32}) · v(\d+)\s*$/m);
  if(!cab||cab[2]!=='1')throw Error('Pegá un pedido completo de la web con encabezado Pedido W-… · v1.');
  const productos=new Map(catalogo.map(p=>[p.id,p])),lineas=[],ids=new Set();
  for(const linea of texto.split(/\r?\n/)){
    if(!/^[^\n]*[×x] [^\n]*\[[\w-]+\]/.test(linea))continue;
    const m=linea.match(/^(\d+) × (.+) \[([\w-]{1,64})\] — /);
    if(!m||Number(m[1])<1||Number(m[1])>999||ids.has(m[3]))throw Error('Renglón inválido o código repetido: revisá el mensaje completo.');
    ids.add(m[3]);const p=productos.get(m[3]);
    lineas.push({codigo:m[3],nombre:p?.nombre||m[2],solicitada:Number(m[1]),entregada:Number(m[1]),precio:p?.precio??null,revision:'pendiente',enCaja:false});
  }
  if(!lineas.length)throw Error('El mensaje no contiene productos.');
  return {version:1,numero:cab[1],lineas};
}
export function totalArmado(lineas){return lineas.reduce((n,l)=>n+(l.revision==='pendiente'?0:l.entregada*(l.precio??0)),0);}
export function inventario(lineas){return lineas.filter(l=>l.revision!=='pendiente'&&l.entregada>0&&l.enCaja).map(l=>`${l.codigo}\t${l.entregada}`).join('\n');}

// Comparación por código; no modifica el armado ni el mensaje recibido.
export function cambiosPedido(guardado,nuevo){
  const antes=new Map(guardado.lineas.map(l=>[l.codigo,l.solicitada]));
  const despues=new Map(nuevo.lineas.map(l=>[l.codigo,l.solicitada]));
  return [...new Set([...antes.keys(),...despues.keys()])].filter(c=>antes.get(c)!==despues.get(c)).map(c=>`${c}: ${antes.get(c)||0} → ${despues.get(c)||0} unidades`);
}

// El cliente se usa en memoria para el comprobante; nunca se agrega al guardado.
export function clienteDelMensaje(texto){
  const campo=patron=>(String(texto).match(patron)?.[1]||'').replace(/\.$/,'').trim();
  const nombre=campo(/^Nombre(?: \/ local)?: ([^\r\n]{1,81})$/m);
  const telefono=telefonoArgentino(campo(/^Tel[eé]fono: ([^\r\n]{1,30})$/m));
  return {nombre,telefono:telefono||''};
}
export function fechaComprobante(fecha){return new Intl.DateTimeFormat('es-AR',{dateStyle:'short',timeStyle:'short',hourCycle:'h23',timeZone:'America/Argentina/Buenos_Aires'}).format(new Date(fecha));}
