/* BabyKids Studio · Fotolibro horizontal de hojas flexibles, reutilizable.
 * Para otro cliente, cambia ALBUM y las imágenes de assets/img.
 * Librería: StPageFlip 2.0.7. */
(() => {
  'use strict';
  const ALBUM = {
    nombre: 'Mayerli Tobar',
    portada: 'assets/img/portada.webp',
    fotos: Array.from({length: 10}, (_, i) =>
      `assets/img/foto-${String(i + 1).padStart(2, '0')}.webp`)
  };

  const $ = id => document.getElementById(id);
  const host = $('book');
  const prev = $('prev'), next = $('next');
  const counter = $('pageLabel'), number = $('pageNumber'), progress = $('progressLine');
  const tip = $('tip'), music = $('music'), musicLabel = $('musicLabel');
  const soundtrack = $('soundtrack'), error = $('loadError');
  let audioContext = null, lastPaperSound = 0;

  function unlockSound() {
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      if (!audioContext) audioContext = new Audio();
      if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
    } catch (_) { /* navegador sin audio sintetizado */ }
  }

  function paperSound() {
    if (!audioContext || audioContext.state !== 'running') return;
    const now = performance.now();
    if (now - lastPaperSound < 400) return;
    lastPaperSound = now;
    const duration = .38, sampleCount = Math.floor(audioContext.sampleRate * duration);
    const buffer = audioContext.createBuffer(1, sampleCount, audioContext.sampleRate);
    const samples = buffer.getChannelData(0);
    let smooth = 0;
    for (let i = 0; i < sampleCount; i++) {
      const t = i / sampleCount;
      smooth = .42 * smooth + .58 * (Math.random() * 2 - 1);
      samples[i] = smooth * Math.pow(Math.sin(Math.PI * t), 1.2);
    }
    const source = audioContext.createBufferSource();
    const filter = audioContext.createBiquadFilter();
    const gain = audioContext.createGain();
    source.buffer = buffer; filter.type = 'bandpass'; filter.frequency.value = 1300; filter.Q.value = .55;
    gain.gain.value = .045;
    source.connect(filter); filter.connect(gain); gain.connect(audioContext.destination);
    source.start(); source.stop(audioContext.currentTime + duration);
  }

  function createPage(type, image, i) {
    const page = document.createElement('div');
    page.className = `book-page ${type === 'cover' ? 'book-cover' : type === 'back' ? 'book-back' : 'book-photo'}`;
    if (type !== 'photo') page.dataset.density = 'hard';
    if (type === 'cover') {
      page.innerHTML = `<div class="cover-art">
        <img class="cover-image" src="${image}" alt="Mayerli, fotografía completa de portada" draggable="false" fetchpriority="high">
        <span class="cover-outline" aria-hidden="true"></span>
        <div class="cover-banner"><span>BABYKIDS STUDIO</span><strong>MAYERLI TOBAR</strong><small>ÁLBUM FOTOGRÁFICO DIGITAL</small></div>
      </div>`;
    } else if (type === 'back') {
      page.innerHTML = `<div class="back-art"><span class="back-mark">B✧K</span><strong>Mayerli Tobar</strong><span>UNA CREACIÓN DE BABYKIDS STUDIO</span></div>`;
    } else {
      page.innerHTML = `<div class="photo-art">
        <img class="photo-blur" src="${image}" alt="" aria-hidden="true" loading="lazy">
        <img class="photo-main" src="${image}" alt="Fotografía ${i} de Mayerli Tobar" loading="eager" draggable="false">
        <span class="photo-outline" aria-hidden="true"></span>
      </div>`;
    }
    return page;
  }

  host.appendChild(createPage('cover', ALBUM.portada, 0));
  ALBUM.fotos.forEach((image, i) => host.appendChild(createPage('photo', image, i + 1)));
  host.appendChild(createPage('back', null, 11));

  if (!window.St || !window.St.PageFlip) {
    error.hidden = false;
    prev.disabled = next.disabled = true;
    return;
  }

  // Cada página mantiene una proporción horizontal ~ 1.4:1, como las fotos originales.
  const album = new St.PageFlip(host, {
    width: 560, height: 400,
    size: 'stretch',
    minWidth: 200, maxWidth: 700,
    minHeight: 143, maxHeight: 500,
    showCover: true,
    usePortrait: true,
    autoSize: true,
    drawShadow: true,
    maxShadowOpacity: .62,
    flippingTime: 1550,
    mobileScrollSupport: true,
    clickEventForward: true,
    useMouseEvents: true
  });
  album.loadFromHTML(host.querySelectorAll('.book-page'));
  const total = album.getPageCount();
  const smallScreen = () => window.matchMedia('(max-width: 720px)').matches;

  function updateCounter() {
    const index = album.getCurrentPageIndex();
    const portrait = typeof album.getOrientation === 'function'
      ? album.getOrientation() === 'portrait' : smallScreen();
    let label = 'PORTADA', count = 0;
    if (index >= total - 1) {
      label = 'CONTRAPORTADA'; count = 6;
    } else if (index !== 0) {
      const first = portrait ? index : (index % 2 === 0 ? index - 1 : index);
      label = portrait ? `FOTO ${String(index).padStart(2, '0')}`
        : `PÁGINAS ${String(first).padStart(2, '0')}–${String(first + 1).padStart(2, '0')}`;
      count = Math.ceil(index / 2);
    }
    counter.textContent = label;
    number.textContent = `${String(count).padStart(2, '0')} / 06`;
    progress.style.width = `${Math.round(count / 6 * 100)}%`;
    prev.disabled = index === 0;
    next.disabled = index >= total - 1;
    tip.textContent = index === 0 ? 'TOCA LA PORTADA PARA ABRIR TU ÁLBUM'
      : index >= total - 1 ? 'FIN DEL ÁLBUM · GRACIAS POR VISITARNOS'
      : 'ARRASTRA UNA ESQUINA O UTILIZA LAS FLECHAS';
  }

  // Sonido en el giro real, después de que se completa el cambio de página.
  album.on('flip', () => { paperSound(); updateCounter(); });
  album.on('changeOrientation', updateCounter);
  [host, prev, next].forEach(el => el.addEventListener('pointerdown', unlockSound, {passive: true}));
  document.addEventListener('keydown', event => {
    if (event.target.closest('input,textarea,select')) return;
    if (event.key === 'ArrowRight') { unlockSound(); event.preventDefault(); album.flipNext('bottom'); }
    if (event.key === 'ArrowLeft') { unlockSound(); event.preventDefault(); album.flipPrev('bottom'); }
  });
  next.addEventListener('click', () => album.flipNext('bottom'));
  prev.addEventListener('click', () => album.flipPrev('bottom'));

  music.addEventListener('click', async () => {
    if (!soundtrack.paused) {
      soundtrack.pause(); musicLabel.textContent = 'Activar música';
      music.setAttribute('aria-pressed', 'false'); return;
    }
    try {
      soundtrack.volume = .33; await soundtrack.play();
      musicLabel.textContent = 'Pausar música'; music.setAttribute('aria-pressed', 'true');
    } catch (e) { musicLabel.textContent = 'Toca para escuchar'; console.warn('Audio:', e); }
  });
  $('fullscreen').addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else document.documentElement.requestFullscreen?.().catch(() => {});
  });
  
  updateCounter();

  // Centrar la portada y la contraportada
  // cuando el libro se encuentra cerrado.

  const bookFrame = document.getElementById('bookFrame');
  const bookStage = document.querySelector('.showcase');

  function centrarLibroCerrado() {

    bookFrame.style.transform = '';

    if (window.innerWidth <= 720) return;

    const pagina = album.getCurrentPageIndex();

    if (pagina !== 0 && pagina !== total - 1) {
      return;
    }

    requestAnimationFrame(() => {

      const hoja = host.querySelector(
        pagina === 0 ? '.book-cover' : '.book-back'
      );

      if (!hoja) return;

      const posicionHoja = hoja.getBoundingClientRect();
      const posicionArea = bookStage.getBoundingClientRect();

      if (posicionHoja.width === 0) return;

      const centroArea =
        posicionArea.left + posicionArea.width / 2;

      const centroHoja =
        posicionHoja.left + posicionHoja.width / 2;

      const desplazamiento = centroArea - centroHoja;

      bookFrame.style.transform =
        `translateX(${desplazamiento}px)`;
    });
  }

  album.on('flip', () => {
    requestAnimationFrame(centrarLibroCerrado);
  });

  album.on('changeOrientation', () => {
    requestAnimationFrame(centrarLibroCerrado);
  });

  window.addEventListener('resize', centrarLibroCerrado);

  requestAnimationFrame(centrarLibroCerrado);
  
/* =========================================
   BABYKIDS STUDIO - MAYERLI 3D
   CENTRADO AUTOMATICO EN PANTALLA COMPLETA
========================================= */

document.addEventListener('fullscreenchange', () => {

    const marco = document.getElementById('bookFrame');

    // Evitar desplazamientos durante el ajuste
    marco.style.transition = 'none';
    marco.style.transform = 'none';

    // Esperar a que el navegador cambie de tamaño
    setTimeout(() => {

        centrarLibroCerrado();

        // Restaurar las transiciones normales
        setTimeout(() => {
            marco.style.transition = '';
        }, 350);

    }, 150);

});

})();

