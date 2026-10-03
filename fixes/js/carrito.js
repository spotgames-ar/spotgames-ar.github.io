// Sin DOM ni dependencias. El almacenamiento es una dependencia opcional.
export const MAX_CANTIDAD = 999;
export const MAX_URL = 8000;
export const CLAVE_CARRITO = 'spot-fixes.carrito.v1';
export const CATEGORIAS = ['Joysticks y analógicos', 'Conectores y puertos', 'Chips e integrados', 'Fuentes', 'Pantallas y táctiles', 'Flex y cables', 'Membranas', 'Láseres y lectoras', 'Refrigeración', 'Mecánica', 'Insumos', 'Accesorios', 'Otros repuestos'];
const pesos = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
export const moneda = valor => pesos.format(valor);
export const normalizar = texto => String(texto).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const cantidadValida = n => Number.isSafeInteger(n) && n > 0 && n <= MAX_CANTIDAD;
const linea = valor => String(valor ?? '').replace(/[\r\n\t]+/g, ' ').trim();

export function validarCatalogo(data) {
  if (!data || !/^\d{4}-\d{2}-\d{2}$/.test(data.actualizado) || !Array.isArray(data.productos)) throw new Error('Catálogo inválido.');
  const ids = new Set();
  for (const p of data.productos) {
    if (!p || typeof p.id !== 'string' || !/^[\w-]{1,64}$/.test(p.id) || ids.has(p.id) ||
      typeof p.nombre !== 'string' || !p.nombre.trim() || p.nombre.length > 180 ||
      !CATEGORIAS.includes(p.categoria) || !['Nuevo', 'Usado', 'Reacondicionado', null].includes(p.estado) ||
      !['disponible', 'consultar', 'agotado'].includes(p.stock) ||
      !(p.precio === null || (Number.isSafeInteger(p.precio) && p.precio >= 0 && p.precio <= 1_000_000_000)) ||
      !Array.isArray(p.fotos)) throw new Error('Revisá los datos de un producto.');
    ids.add(p.id);
  }
  return data;
}

export function sanearCarrito(items, productos) {
  if (!Array.isArray(items)) return [];
  const resultado = new Map();
  for (const item of items) {
    if (!item || !cantidadValida(item.cantidad)) continue;
    const producto = productos.find(p => p.id === item.id);
    if (!producto || producto.stock === 'agotado') continue;
    resultado.set(item.id, Math.min(MAX_CANTIDAD, (resultado.get(item.id) || 0) + item.cantidad));
  }
  return [...resultado].map(([id, cantidad]) => ({ id, cantidad }));
}

export function agregar(items, productos, id, cantidad = 1) {
  const limpio = sanearCarrito(items, productos);
  const p = productos.find(p => p.id === id);
  if (!p || p.stock === 'agotado' || !cantidadValida(cantidad)) return limpio;
  const actual = limpio.find(i => i.id === id);
  if (actual) actual.cantidad = Math.min(MAX_CANTIDAD, actual.cantidad + cantidad);
  else limpio.push({ id, cantidad });
  return limpio;
}

export function cambiarCantidad(items, productos, id, cantidad) {
  const limpio = sanearCarrito(items, productos);
  if (cantidad === 0) return limpio.filter(i => i.id !== id);
  if (!cantidadValida(cantidad)) return limpio;
  return limpio.map(i => i.id === id ? { id, cantidad } : i);
}

export function resumen(items, productos) {
  const lineas = sanearCarrito(items, productos).map(i => {
    const producto = productos.find(p => p.id === i.id);
    return { ...i, producto, subtotal: producto.precio === null ? null : producto.precio * i.cantidad };
  });
  return {
    lineas,
    cantidad: lineas.reduce((n, i) => n + i.cantidad, 0),
    total: lineas.reduce((n, i) => n + (i.subtotal ?? 0), 0),
    sinPrecio: lineas.filter(i => i.subtotal === null).reduce((n, i) => n + i.cantidad, 0),
    conPrecio: lineas.some(i => i.subtotal !== null)
  };
}

export function mensajePedido(items, productos, opciones = {}) {
  const r = resumen(items, productos);
  if (!r.lineas.length) return '';
  const entrega = opciones.entrega === 'envio' ? 'Envío a coordinar' : 'Retiro en el local';
  const pago = { efectivo: 'Efectivo', transferencia: 'Transferencia', mercado_pago: 'Mercado Pago' }[opciones.pago] || 'A coordinar';
  const nombre = linea(opciones.nombre).slice(0, 80);
  return [
    'Hola, Spot Fixes! Quiero cotizar este pedido para el gremio (desde la web):',
    ...(r.lineas.some(i => i.producto.ejemplo) ? ['CATÁLOGO DE EJEMPLO: confirmar productos y disponibilidad.'] : []),
    '',
    ...r.lineas.map(i => `${i.cantidad} × ${linea(i.producto.nombre)} [${i.id}] — ${i.subtotal === null ? 'precio a confirmar' : `${moneda(i.producto.precio)} c/u · subtotal ${moneda(i.subtotal)}`}${i.producto.stock === 'consultar' ? ' · stock a consultar' : ''}`),
    '',
    `Total de referencia: ${r.conPrecio ? moneda(r.total) : 'a confirmar'}.`,
    ...(opciones.listaPrecio ? [`Lista: ${linea(opciones.listaPrecio)} · pesos argentinos (ARS).`] : []),
    ...(opciones.mayorista && evaluarMayorista(items,productos,opciones.mayorista).aplica ? ['Solicito cotización mayorista: el pedido alcanza una condición por cantidad o monto. El total mostrado arriba usa Venta Local, sin descuento aplicado.'] : []),
    ...(r.sinPrecio ? [`${r.sinPrecio} ${r.sinPrecio === 1 ? 'unidad sin precio, fuera' : 'unidades sin precio, fuera'} del total.`] : []),
    `Entrega: ${entrega}.`, `Pago preferido: ${pago}.`,
    ...(nombre ? [`Nombre / local: ${nombre}.`] : []),
    ...(linea(opciones.nota) ? [`Localidad / comentario: ${linea(opciones.nota).slice(0, 300)}.`] : []),
    `Los precios son de referencia y se confirman por WhatsApp. Actualizado el ${linea(opciones.actualizado)}.`,
    'Sujeto a disponibilidad. Este mensaje no reserva ni realiza un pago.'
  ].join('\n');
}

// Sólo identifica el umbral comercial: no aplica descuentos ni cambia Venta Local.
export function evaluarMayorista(items, productos, {umbralCantidad=5,umbralMonto=500000}={}) {
  const r=resumen(items,productos);
  const codigos=r.lineas.filter(i=>i.cantidad>=umbralCantidad).map(i=>i.id);
  const porMonto=r.total>=umbralMonto;
  return {aplica:porMonto||codigos.length>0,porMonto,codigos,restante:Math.max(0,umbralMonto-r.total)};
}

export function enlaceWhatsApp(telefono, mensaje) {
  if (!/^\d{8,15}$/.test(telefono)) throw new Error('Teléfono inválido.');
  const url = `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`;
  return { url: url.length <= MAX_URL ? url : null, largo: url.length, mensaje };
}

export function crearCarrito(productos, obtenerStorage = () => null) {
  let items = [];
  let persistente = false;
  let storage;
  try {
    storage = obtenerStorage();
    const guardado = storage?.getItem(CLAVE_CARRITO);
    if (guardado) {
      try { items = sanearCarrito(JSON.parse(guardado), productos); } catch { items = []; }
    }
    if (storage) { storage.setItem(CLAVE_CARRITO, JSON.stringify(items)); persistente = true; }
  } catch { persistente = false; }
  const guardar = siguiente => {
    items = siguiente;
    try { if (storage) { storage.setItem(CLAVE_CARRITO, JSON.stringify(items)); persistente = true; } }
    catch { persistente = false; }
    return items.map(i => ({ ...i }));
  };
  return {
    get items() { return items.map(i => ({ ...i })); },
    get persistente() { return persistente; },
    agregar(id, cantidad) { return guardar(agregar(items, productos, id, cantidad)); },
    cambiar(id, cantidad) { return guardar(cambiarCantidad(items, productos, id, cantidad)); },
    quitar(id) { return guardar(cambiarCantidad(items, productos, id, 0)); }
  };
}
