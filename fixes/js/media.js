// Los archivos de video no tienen src hasta después de load y de estar visibles.
export function permitirMovimiento({ reducido = false, ahorro = false, pausado = false } = {}) {
  return !reducido && !ahorro && !pausado;
}

export function iniciarMedia() {
  // Partículas decorativas: una sola creación, sin bucle JS ni eventos de mouse.
  const particulas = document.querySelector('.ambiente-particulas');
  if (particulas && !particulas.childElementCount) {
    const fragmento = document.createDocumentFragment();
    for (let i = 0; i < 24; i++) {
      const pixel = document.createElement('i');
      pixel.style.cssText = `--x:${(i * 37 + 7) % 100}%;--y:${(i * 23 + 11) % 100}%;--viaje:${(i % 2 ? 1 : -1) * (24 + i % 5 * 12)}px;--duracion:${16 + i % 7 * 3}s;--demora:-${i * 2.7}s;--tamano:${i % 6 === 0 ? 5 : 2 + i % 3}px`;
      fragmento.append(pixel);
    }
    particulas.append(fragmento);
  }
  const preferencia = matchMedia('(prefers-reduced-motion: reduce)');
  const celular = matchMedia('(max-width: 599px)');
  const conexion = navigator.connection;
  const boton = document.querySelector('#movimiento');
  const videos = [...document.querySelectorAll('video[data-video]')];
  const visibles = new Set();
  let pausado = false, listo = false;
  const permitido = () => permitirMovimiento({ reducido: preferencia.matches, ahorro: conexion?.saveData, pausado });
  const estadoVisible = video => !video.dataset.estado || (video.dataset.estado === 'agregado'
    ? document.querySelector('#toast').classList.contains('show')
    : !document.querySelector('#pedido-preparado').hidden && document.querySelector('#carrito').open);
  function actualizar() {
    const activo = permitido();
    document.documentElement.classList.toggle('sin-movimiento', !activo);
    document.documentElement.classList.toggle('pagina-en-pausa', document.hidden);
    if (boton) {
      boton.textContent = activo ? 'Pausar movimiento' : 'Movimiento reducido';
      boton.setAttribute('aria-pressed', String(!activo));
      boton.disabled = preferencia.matches || Boolean(conexion?.saveData);
      boton.title = boton.disabled ? 'Se respeta la preferencia de tu dispositivo o el ahorro de datos.' : '';
    }
    for (const video of videos) {
      if (!activo) {
        video.pause(); video.hidden = true;
        if (video.hasAttribute('src')) { video.removeAttribute('src'); video.load(); }
        continue;
      }
      if (!listo || !visibles.has(video) || document.hidden || !estadoVisible(video)) { video.pause(); video.hidden = true; continue; }
      if (!video.hasAttribute('src')) {
        const nombre = celular.matches && video.dataset.mobile ? video.dataset.mobile : video.dataset.video;
        const formato = video.canPlayType('video/webm; codecs="vp9"') ? 'webm' : 'mp4';
        video.muted = true;
        video.src = `assets/video/${nombre}.${formato}`;
      }
      video.play().then(() => { if (permitido() && visibles.has(video) && !document.hidden && estadoVisible(video)) video.hidden = false; else video.pause(); }).catch(() => { video.hidden = true; });
    }
  }
  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    for (const e of entries) { const video = e.target.querySelector('video'); e.isIntersecting ? visibles.add(video) : visibles.delete(video); }
    actualizar();
  }, { threshold: .1 }) : null;
  videos.forEach(v => {
    v.addEventListener('error', () => { v.hidden = true; });
    if (observer) observer.observe(v.parentElement); // Sin IO: poster, sin descargar video.
  });
  boton?.addEventListener('click', () => { pausado = !pausado; actualizar(); });
  preferencia.addEventListener('change', actualizar);
  celular.addEventListener('change', () => {
    videos.filter(v => v.dataset.mobile).forEach(v => { v.pause(); v.hidden = true; v.removeAttribute('src'); v.load(); });
    actualizar();
  });
  conexion?.addEventListener('change', actualizar);
  document.addEventListener('visibilitychange', actualizar);
  const estados = new MutationObserver(actualizar);
  for (const selector of ['#toast', '#pedido-preparado', '#carrito']) {
    const elemento = document.querySelector(selector);
    if (elemento) estados.observe(elemento, { attributes: true, attributeFilter: ['class', 'hidden', 'open'] });
  }
  const despuesDeCarga = () => setTimeout(() => { listo = true; actualizar(); }, 2000);
  if (document.readyState === 'complete') despuesDeCarga();
  else window.addEventListener('load', despuesDeCarga, { once: true });
  actualizar();
}
