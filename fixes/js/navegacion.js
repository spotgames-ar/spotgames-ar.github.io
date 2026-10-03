export function iniciarNavegacion() {
  const boton = document.querySelector('#abrir-menu');
  const nav = document.querySelector('#navegacion');
  const ancho = matchMedia('(min-width: 900px)');
  function cerrar(devolverFoco = false) {
    boton.setAttribute('aria-expanded', 'false');
    nav.classList.remove('abierto');
    if (devolverFoco) boton.focus();
  }
  boton.addEventListener('click', () => {
    const abierto = boton.getAttribute('aria-expanded') !== 'true';
    boton.setAttribute('aria-expanded', String(abierto));
    nav.classList.toggle('abierto', abierto);
  });
  nav.addEventListener('click', e => {
    const link = e.target.closest('a[href^="#"]');
    if (!link || ancho.matches) return;
    cerrar();
    const seccion = document.querySelector(link.getAttribute('href'));
    seccion?.setAttribute('tabindex', '-1');
    seccion?.focus({ preventScroll: true });
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && boton.getAttribute('aria-expanded') === 'true') cerrar(true);
  });
  document.addEventListener('click', e => {
    if (!e.target.closest('.header')) cerrar();
  });
  document.querySelector('.header').addEventListener('focusout', e => {
    if (e.relatedTarget && !e.currentTarget.contains(e.relatedTarget)) cerrar();
  });
  document.querySelector('#abrir-carrito').addEventListener('click', () => cerrar());
  ancho.addEventListener('change', () => cerrar());
}
