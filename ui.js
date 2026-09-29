'use strict';
// ZENKAI — tudo o que aparece na tela para o usuário: cards, carrosséis, detalhes, capas, formulário de jogo, importar/exportar.
// (Arquivo carregado pelo index.html; compartilha funções e variáveis com os outros arquivos de js/.)

// ==================== Montagem da tela: cards dos jogos, seções Destaque/Coleção/Favoritos ====================

// Região vem do campo "versão" (ex.: "CUSA07820 – USA")
function getRegion(game) {
  var m = /\b(USA|EUR)\b/i.exec(game.version || '');
  return m ? m[1].toUpperCase() : '';
}
// createdAt já é salvo em cada jogo; jogos antigos têm data de 2020 e nunca ganham o selo
function isNewGame(game) {
  return !!game.createdAt && (Date.now() - game.createdAt) < NEW_DAYS * 86400000;
}
function sortGames(list) {
  var arr = list.slice();
  if (sortMode === 'recent') arr.sort(function(a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
  else if (sortMode === 'az') arr.sort(function(a, b) { return (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' }); });
  else if (sortMode === 'za') arr.sort(function(a, b) { return (b.name || '').localeCompare(a.name || '', 'pt-BR', { sensitivity: 'base' }); });
  return arr;
}

function buildGameCardHtml(game) {
  var coverUrl = (game.cover && game.cover.trim()) ? game.cover : FALLBACK_COVER;
  var safeName = escapeHtml(game.name);
  var safeCover = escapeAttr(coverUrl);
  var qtdLinks = game.links ? game.links.length : 0;
  var fav = isFavorite(game.id);

  var html = '';
  html += '<div class="game-card" data-id="' + escapeAttr(game.id) + '">';
  html +=   '<div class="card-cover"' + (isAdmin ? ' data-cover-for="' + escapeAttr(game.id) + '" title="Clique para trocar a capa"' : '') + '>';
  html +=     '<img src="' + safeCover + '" alt="Capa de ' + safeName + '" loading="lazy" decoding="async" ' +
                   'onerror="this.onerror=null;this.src=\'' + FALLBACK_COVER + '\'">';
  if (isAdmin) html +=     '<div class="overlay-cover">' + icon('camera', 22) + '<span>Trocar capa</span></div>';
  if (game.featured) html += '<span class="card-badge card-badge-featured">' + icon('star', 12) + '<span>Destaque</span></span>';
  if (isNewGame(game)) html += '<span class="card-badge card-badge-new">Novo</span>';
  html +=     '<span class="card-badge">' + icon('folder', 12) + qtdLinks + (qtdLinks === 1 ? ' link' : ' links') + '</span>';
  html +=   '</div>';
  html +=   '<div class="card-info">';
  html +=     '<h3 title="' + safeName + '">' + safeName + '</h3>';
  if (game.version) html += '<div class="card-meta">' + icon('disc', 13) + escapeHtml(game.version) + '</div>';
  html +=     '<div class="card-actions">';
  html +=       '<button class="btn-open" data-id="' + escapeAttr(game.id) + '">' + icon('folder', 15) + '<span>Ver links</span></button>';
  html +=       '<button class="btn-fav' + (fav ? ' is-active' : '') + '" data-id="' + escapeAttr(game.id) + '" title="' + (fav ? 'Remover dos favoritos' : 'Adicionar aos favoritos') + '">' + icon('heart', 15) + '</button>';
  if (isAdmin) {
    html +=       '<button class="btn-star' + (game.featured ? ' is-active' : '') + '" data-id="' + escapeAttr(game.id) + '" title="' + (game.featured ? 'Remover dos destaques' : 'Adicionar aos destaques') + '">' + icon('star', 15) + '</button>';
    html +=       '<button class="btn-delete" data-id="' + escapeAttr(game.id) + '" title="Remover">' + icon('trash', 15) + '</button>';
  }
  html +=     '</div>';
  html +=   '</div>';
  html += '</div>';
  return html;
}

function renderGames(filter) {
  filter = filter || '';
  var term = filter.trim().toLowerCase();
  var filtered = games;
  if (term) {
    filtered = games.filter(function(g) {
      return g.name.toLowerCase().indexOf(term) !== -1;
    });
  }
  if (regionFilter) filtered = filtered.filter(function(g) { return getRegion(g) === regionFilter; });
  filtered = sortGames(filtered);

  if (games.length === 0) counter.textContent = '';
  else if (term || regionFilter) counter.textContent = filtered.length + ' de ' + games.length + ' jogos';
  else counter.textContent = games.length + (games.length === 1 ? ' jogo salvo' : ' jogos salvos');

  if (filtered.length === 0) {
    if (games.length === 0) {
      carouselsContainer.innerHTML = '<div class="empty-state">' + icon('controller', 46) + '<h2>Nenhum jogo salvo ainda</h2><p>Clique em "Adicionar jogo" para começar.</p></div>';
    } else {
      var noMsg = term ? 'Nenhum resultado para "' + escapeHtml(filter.trim()) + '"' : 'Nenhum jogo nessa região';
      carouselsContainer.innerHTML = '<div class="empty-state">' + icon('search', 46) + '<h2>' + noMsg + '</h2><p>' +
        (term ? 'Tente outro termo ou peça esse jogo.' : 'Tente outra região.') + '</p>' +
        (term ? '<button type="button" class="btn-save" id="requestFromSearch">Pedir este jogo</button>' : '') + '</div>';
      var rfs = document.getElementById('requestFromSearch');
      if (rfs) rfs.addEventListener('click', function() { openRequestModal(filter.trim()); });
    }
    return;
  }

  var destaqueList = filtered.filter(function(g) { return !!g.featured; });
  var colecaoList  = filtered;

  if (featuredIndex >= destaqueList.length) featuredIndex = 0;
  if (featuredIndex < 0) featuredIndex = 0;

  var html = '';

  html += '<section class="featured-section tab-section" id="destaqueSection">';
  html +=   '<div class="section-title-row">';
  html +=     '<h2 class="section-title">' + icon('star', 18) + '<span>Destaque</span></h2>';
  if (destaqueList.length > 0) html += '<span class="featured-hint">Arraste para o lado ou clique nas capas</span>';
  html +=   '</div>';

  if (destaqueList.length > 0) {
    html +=   '<div class="coverflow-wrapper">';
    html +=     '<button class="coverflow-arrow left" data-cf-dir="-1" aria-label="Anterior">‹</button>';
    html +=     '<div class="coverflow" id="coverflow">';

    destaqueList.forEach(function(game, idx) {
      var coverUrl = (game.cover && game.cover.trim()) ? game.cover : FALLBACK_COVER;
      var safeName = escapeHtml(game.name);
      var safeCover = escapeAttr(coverUrl);
      var qtdLinks = game.links ? game.links.length : 0;

      html += '<div class="cf-item" data-id="' + escapeAttr(game.id) + '" data-index="' + idx + '">';
      html +=   '<div class="cf-card">';
      if (isNewGame(game)) html += '<span class="card-badge card-badge-new">Novo</span>';
      html +=     '<div class="cf-cover">';
      // As 4 primeiras capas do destaque carregam já; as outras só quando chegam perto da tela.
        html +=       '<img src="' + safeCover + '" alt="' + safeName + '"' + (idx < 4 ? '' : ' loading="lazy" decoding="async"') + ' ' +
                        'onerror="this.onerror=null;this.src=\'' + FALLBACK_COVER + '\'">';
      html +=     '</div>';
      html +=   '</div>';
      html +=   '<div class="cf-title">' + safeName + '</div>';
      html +=   '<div class="cf-meta">' + qtdLinks + (qtdLinks === 1 ? ' link' : ' links') + '</div>';
      html += '</div>';
    });

    html +=     '</div>';
    html +=     '<button class="coverflow-arrow right" data-cf-dir="1" aria-label="Próximo">›</button>';
    html +=   '</div>';
    if (destaqueList.length > 1) {
      html += '<div class="cf-dots" id="cfDots">';
      destaqueList.forEach(function(game, idx) {
        html += '<button class="cf-dot" data-idx="' + idx + '" aria-label="Ir para ' + escapeAttr(game.name) + '"></button>';
      });
      html += '</div>';
    }
  } else {
    html += '<div class="empty-state" style="padding:2.5rem 1.5rem;">' + icon('star', 36) +
            '<h2 style="font-size:1.05rem;">Nenhum jogo em destaque</h2>' +
            '<p>Clique na estrela de um jogo na sua coleção para destacá-lo aqui.</p></div>';
  }
  html += '</section>';

  html += '<section class="carousel-section tab-section" id="colecaoSection">';
  html +=   '<div class="carousel-header">';
  html +=     '<h2 class="carousel-title">' + icon('grid', 18) + '<span>' + (term || regionFilter ? 'Resultados' : 'Sua coleção') + '</span> <span class="count-pill">' + colecaoList.length + '</span></h2>';
  if (colecaoList.length > 0) {
    html +=     '<div class="carousel-nav">';
    html +=       '<button class="nav-arrow" data-dir="prev" data-target="main">‹</button>';
    html +=       '<button class="nav-arrow" data-dir="next" data-target="main">›</button>';
    html +=     '</div>';
  }
  html +=   '</div>';

  if (colecaoList.length > 0) {
    html +=   '<div class="carousel" id="carousel-main">';
    colecaoList.forEach(function(game) { html += buildGameCardHtml(game); });
    html +=   '</div>';
  } else {
    html += '<div class="empty-state" style="padding:2.5rem 1.5rem;">' + icon('grid', 36) +
            '<h2 style="font-size:1.05rem;">Nenhum jogo na coleção</h2>' +
            '<p>Todos os seus jogos estão em destaque no momento.</p></div>';
  }
  html += '</section>';

  var favoritosList = filtered.filter(function(g) { return isFavorite(g.id); });

  html += '<section class="carousel-section tab-section" id="favoritosSection">';
  html +=   '<div class="carousel-header">';
  html +=     '<h2 class="carousel-title">' + icon('heart', 18) + '<span>Favoritos</span> <span class="count-pill">' + favoritosList.length + '</span></h2>';
  if (favoritosList.length > 0) {
    html +=     '<div class="carousel-nav">';
    html +=       '<button class="nav-arrow" data-dir="prev" data-target="favoritos">‹</button>';
    html +=       '<button class="nav-arrow" data-dir="next" data-target="favoritos">›</button>';
    html +=     '</div>';
  }
  html +=   '</div>';

  if (favoritosList.length > 0) {
    html +=   '<div class="carousel" id="carousel-favoritos">';
    favoritosList.forEach(function(game) { html += buildGameCardHtml(game); });
    html +=   '</div>';
  } else {
    html += '<div class="empty-state" style="padding:2.5rem 1.5rem;">' + icon('heart', 36) +
            '<h2 style="font-size:1.05rem;">Nenhum favorito ainda</h2>' +
            '<p>Clique no coração de um jogo para guardá-lo aqui.</p></div>';
  }
  html += '</section>';

  carouselsContainer.innerHTML = html;

  setupCoverflow(destaqueList);
  setupCarousel();
  applyActiveTab();

  var coverDivs = carouselsContainer.querySelectorAll('[data-cover-for]');
  for (var c = 0; c < coverDivs.length; c++) {
    coverDivs[c].addEventListener('click', function(e) {
      e.stopPropagation();
      openCoverModal(this.getAttribute('data-cover-for'));
    });
  }

  var openBtns = carouselsContainer.querySelectorAll('.btn-open');
  for (var i = 0; i < openBtns.length; i++) {
    openBtns[i].addEventListener('click', function(e) {
      e.stopPropagation();
      openDetails(this.getAttribute('data-id'));
    });
  }

  var cards = carouselsContainer.querySelectorAll('.game-card');
  for (var k = 0; k < cards.length; k++) {
    cards[k].addEventListener('click', function() {
      openDetails(this.getAttribute('data-id'));
    });
  }

  var starBtns = carouselsContainer.querySelectorAll('.btn-star');
  for (var st = 0; st < starBtns.length; st++) {
    starBtns[st].addEventListener('click', function(e) {
      e.stopPropagation();
      if (!isAdmin) return;
      var id = this.getAttribute('data-id');
      var game = null;
      for (var g = 0; g < games.length; g++) if (games[g].id === id) { game = games[g]; break; }
      if (!game) return;
      game.featured = !game.featured;
      logHistory(game.featured ? 'feature' : 'unfeature', { game: game.name, gameId: game.id });
      saveGame(game);
      renderGames(searchInput.value);
      showToast(game.featured ? 'Adicionado aos destaques!' : 'Removido dos destaques');
    });
  }

  var favBtns = carouselsContainer.querySelectorAll('.btn-fav');
  for (var f = 0; f < favBtns.length; f++) {
    favBtns[f].addEventListener('click', function(e) {
      e.stopPropagation();
      var id = this.getAttribute('data-id');
      var nowFav = toggleFavorite(id);
      renderGames(searchInput.value);
      showToast(nowFav ? 'Adicionado aos favoritos!' : 'Removido dos favoritos');
    });
  }

  var delBtns = carouselsContainer.querySelectorAll('.btn-delete');
  for (var j = 0; j < delBtns.length; j++) {
    delBtns[j].addEventListener('click', function(e) {
      e.stopPropagation();
      if (!isAdmin) return;
      var id = this.getAttribute('data-id');
      if (!confirm('Remover este jogo?')) return;
      var removed = games.filter(function(g) { return g.id === id; })[0];
      games = games.filter(function(g) { return g.id !== id; });
      if (removed) logHistory('remove', { game: removed.name, gameId: removed.id, detail: (removed.links ? removed.links.length : 0) + ' links' });
      deleteGameDoc(id);
      renderGames(searchInput.value);
      showToast('Jogo removido');
    });
  }
}

// ==================== Coverflow do Destaque, carrosséis da Coleção/Favoritos e troca de abas ====================

function setupCoverflow(lista) {
  var cf = document.getElementById('coverflow');
  if (!cf) return;

  var items = cf.querySelectorAll('.cf-item');
  if (items.length === 0) return;

  var dotsWrap = document.getElementById('cfDots');
  var dots = dotsWrap ? dotsWrap.querySelectorAll('.cf-dot') : [];

  function getSpacing() {
    var w = window.innerWidth;
    var spacing = w * 0.169 - 26;
    if (spacing < 40) spacing = 40;
    if (spacing > 160) spacing = 160;
    return spacing;
  }

  function update() {
    var items = cf.querySelectorAll('.cf-item');
    var center = featuredIndex;

    items.forEach(function(item, idx) {
      var offset = idx - center;
      var absOffset = Math.abs(offset);
      item.classList.remove('is-center');
      item.style.transform = '';
      item.style.opacity = '';
      item.style.zIndex = '';
      item.style.pointerEvents = '';

      if (absOffset > 3) {
        item.style.opacity = '0';
        item.style.pointerEvents = 'none';
        item.style.transform = 'translateX(' + (offset * 40) + 'px) scale(0.4)';
        return;
      }

      var spacing = getSpacing();
      var translateX = offset * spacing;
      var scale = absOffset === 0 ? 1 : (absOffset === 1 ? 0.75 : 0.55);
      var rotateY = offset === 0 ? 0 : (offset > 0 ? -22 : 22);
      var opacity = absOffset === 0 ? 1 : (absOffset === 1 ? 0.85 : 0.45);
      var z = 100 - absOffset;

      item.style.transform = 'translateX(' + translateX + 'px) translateZ(' + (absOffset === 0 ? 80 : 0) + 'px) scale(' + scale + ') rotateY(' + rotateY + 'deg)';
      item.style.opacity = opacity;
      item.style.zIndex = z;
      item.style.pointerEvents = 'auto';

      if (absOffset === 0) item.classList.add('is-center');
    });

    for (var d = 0; d < dots.length; d++) {
      dots[d].classList.toggle('active', d === center);
    }
  }

  function goTo(idx) {
    if (idx < 0) idx = 0;
    if (idx >= items.length) idx = items.length - 1;
    featuredIndex = idx;
    update();
  }

  for (var dd = 0; dd < dots.length; dd++) {
    dots[dd].addEventListener('click', function() {
      goTo(parseInt(this.getAttribute('data-idx'), 10));
    });
  }

  items.forEach(function(item, idx) {
    item.addEventListener('click', function(e) {
      e.stopPropagation();
      if (idx === featuredIndex) {
        openDetails(item.getAttribute('data-id'));
      } else {
        goTo(idx);
      }
    });
  });

  var leftArrow = document.querySelector('.coverflow-arrow.left');
  var rightArrow = document.querySelector('.coverflow-arrow.right');
  if (leftArrow) leftArrow.addEventListener('click', function() { goTo(featuredIndex - 1); });
  if (rightArrow) rightArrow.addEventListener('click', function() { goTo(featuredIndex + 1); });

  var startX = 0, currentX = 0, isDragging = false, moved = false;
  var track = cf;

  function onDown(e) {
    isDragging = true;
    moved = false;
    startX = (e.touches ? e.touches[0].clientX : e.clientX);
    currentX = startX;
    track.style.transition = 'none';
  }
  function onMove(e) {
    if (!isDragging) return;
    currentX = (e.touches ? e.touches[0].clientX : e.clientX);
    var diff = currentX - startX;
    if (Math.abs(diff) > 8) moved = true;
  }
  function onUp() {
    if (!isDragging) return;
    isDragging = false;
    track.style.transition = '';
    var diff = currentX - startX;
    if (diff < -50) goTo(featuredIndex + 1);
    else if (diff > 50) goTo(featuredIndex - 1);
  }

  track.addEventListener('mousedown', onDown);
  track.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
  track.addEventListener('touchstart', onDown, { passive: true });
  track.addEventListener('touchmove', onMove, { passive: true });
  track.addEventListener('touchend', onUp);

  track.addEventListener('click', function(e) {
    if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; }
  }, true);

  document.addEventListener('keydown', function(e) {
    if (e.key === 'ArrowLeft') goTo(featuredIndex - 1);
    if (e.key === 'ArrowRight') goTo(featuredIndex + 1);
  });

  update();
  window.addEventListener('resize', update);
}

function setupCarousel() {
  var navArrows = carouselsContainer.querySelectorAll('.nav-arrow');
  for (var n = 0; n < navArrows.length; n++) {
    navArrows[n].addEventListener('click', function() {
      var carousel = document.getElementById('carousel-' + this.getAttribute('data-target'));
      if (!carousel) return;
      var dir = this.getAttribute('data-dir');
      var scrollAmount = Math.max(carousel.clientWidth * 0.8, 300);
      carousel.scrollBy({ left: dir === 'next' ? scrollAmount : -scrollAmount, behavior: 'smooth' });
    });
  }

  var carouselEls = carouselsContainer.querySelectorAll('.carousel');
  for (var ce = 0; ce < carouselEls.length; ce++) {
    setupSingleCarouselBehavior(carouselEls[ce]);
  }
}

function setupSingleCarouselBehavior(carousel) {
  var target = carousel.id.replace('carousel-', '');

  function updateArrows() {
    var prevBtn = carouselsContainer.querySelector('.nav-arrow[data-dir="prev"][data-target="' + target + '"]');
    var nextBtn = carouselsContainer.querySelector('.nav-arrow[data-dir="next"][data-target="' + target + '"]');
    if (!prevBtn || !nextBtn) return;
    var atStart = carousel.scrollLeft <= 5;
    var atEnd = carousel.scrollLeft + carousel.clientWidth >= carousel.scrollWidth - 5;
    prevBtn.disabled = atStart;
    nextBtn.disabled = atEnd;
  }
  carousel.addEventListener('scroll', updateArrows);
  window.addEventListener('resize', updateArrows);
  setTimeout(updateArrows, 100);

  var isDown = false, startX = 0, scrollStart = 0, moved = false;
  carousel.addEventListener('mousedown', function(e) {
    isDown = true; moved = false;
    startX = e.pageX;
    scrollStart = carousel.scrollLeft;
    carousel.style.cursor = 'grabbing';
  });
  carousel.addEventListener('mouseleave', function() {
    isDown = false; carousel.style.cursor = '';
  });
  carousel.addEventListener('mouseup', function() {
    isDown = false; carousel.style.cursor = '';
  });
  carousel.addEventListener('mousemove', function(e) {
    if (!isDown) return;
    e.preventDefault();
    var walk = (e.pageX - startX);
    if (Math.abs(walk) > 5) moved = true;
    carousel.scrollLeft = scrollStart - walk;
  });
  carousel.addEventListener('click', function(e) {
    if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; }
  }, true);
}

function applyActiveTab() {
  var destaqueSection = document.getElementById('destaqueSection');
  var colecaoSection  = document.getElementById('colecaoSection');
  var favoritosSection = document.getElementById('favoritosSection');
  if (destaqueSection) destaqueSection.classList.toggle('tab-hidden', activeTab !== 'destaque');
  if (colecaoSection)  colecaoSection.classList.toggle('tab-hidden', activeTab !== 'colecao');
  if (favoritosSection) favoritosSection.classList.toggle('tab-hidden', activeTab !== 'favoritos');
  for (var i = 0; i < navLinksEls.length; i++) {
    navLinksEls[i].classList.toggle('active', navLinksEls[i].getAttribute('data-nav') === activeTab);
  }
}

(function() {
for (var navI = 0; navI < navLinksEls.length; navI++) {
  navLinksEls[navI].addEventListener('click', function(e) {
    e.preventDefault();
    var target = this.getAttribute('data-nav');
    if (target !== 'destaque' && target !== 'colecao' && target !== 'favoritos') return;
    activeTab = target;
    applyActiveTab();
    setTimeout(function() { window.dispatchEvent(new Event('resize')); }, 0);
  });
}
})();

// ==================== Janela com os links de um jogo ====================

function openDetails(id) {
  var game = null;
  for (var i = 0; i < games.length; i++) if (games[i].id === id) { game = games[i]; break; }
  if (!game) return;

  var safeName = escapeHtml(game.name);
  var safeVersion = game.version ? escapeHtml(game.version) : '';
  var safePassword = game.password ? escapeHtml(game.password) : '';

  var html = '';
  html += '<h2>' + safeName + '</h2>';
  html += '<div class="modal-subtitle">';
  if (safeVersion) html += '<span class="badge">' + icon('disc', 13) + safeVersion + '</span>';
  if (isNewGame(game)) html += '<span class="badge badge-new">Novo</span>';
  html += '<span>' + (game.links ? game.links.length : 0) +
          ((game.links && game.links.length === 1) ? ' link disponível' : ' links disponíveis') + '</span>';
  html += '</div>';

  html += '<div class="links-list">';
  if (game.links && game.links.length) {
    game.links.forEach(function(link, li) {
      var safeLabel = escapeHtml(link.label || 'Link');
      var safeUrl = escapeAttr(link.url);
      var shortUrl = escapeHtml(truncateUrl(link.url));
      html += '<div class="link-item">' +
                '<div class="info">' +
                  '<div class="label">' + safeLabel + '</div>' +
                  '<div class="url" title="' + safeUrl + '">' + shortUrl + '</div>' +
                '</div>' +
                '<div class="actions">' +
                  '<button class="icon-btn report' + (isReported(game.id, link.url) ? ' is-reported' : '') + '" data-report="' + li + '" title="Avisar link quebrado">' + icon('flag', 15) + '</button>' +
                  '<button class="icon-btn" data-copy="' + safeUrl + '" title="Copiar link">' + icon('copy', 15) + '</button>' +
                  '<a class="icon-btn go" href="' + safeUrl + '" target="_blank" rel="noopener" title="Abrir link">' + icon('arrowUpRight', 15) + '</a>' +
                '</div>' +
              '</div>';
    });
  } else {
    html += '<p style="color:#8a8a96;text-align:center;padding:1rem;">Nenhum link cadastrado.</p>';
  }
  html += '</div>';

  if (safePassword) {
    html += '<div class="password-box">' +
              '<span class="lbl">' + icon('key', 13) + 'Senha</span>' +
              '<div style="display:flex;gap:0.5rem;align-items:center;">' +
                '<span class="val">' + safePassword + '</span>' +
                '<button class="icon-btn" data-copy="' + escapeAttr(game.password) + '" title="Copiar senha">' + icon('copy', 15) + '</button>' +
              '</div>' +
            '</div>';
  }

  var favLabel = isFavorite(game.id) ? 'Remover dos favoritos' : 'Adicionar aos favoritos';
  var featureLabel = game.featured ? 'Remover dos destaques' : 'Adicionar aos destaques';
  html += '<div class="modal-actions">';
  html +=   '<button type="button" class="btn-secondary" data-toggle-fav="' + escapeAttr(game.id) + '">' + icon('heart', 15) + '<span>' + favLabel + '</span></button>';
  if (isAdmin) {
    html +=   '<button type="button" class="btn-secondary" data-toggle-feature="' + escapeAttr(game.id) + '">' + icon('star', 15) + '<span>' + featureLabel + '</span></button>';
    html +=   '<button type="button" class="btn-secondary" data-edit-game="' + escapeAttr(game.id) + '">' + icon('edit', 15) + '<span>Editar</span></button>';
    html +=   '<button type="button" class="btn-secondary" data-edit-cover="' + escapeAttr(game.id) + '">' + icon('camera', 15) + '<span>Trocar capa</span></button>';
  }
  html +=   '<button type="button" class="btn-secondary" id="closeDetailsBtn">Fechar</button>';
  html += '</div>';

  detailsModal.innerHTML = html;
  detailsModalOverlay.classList.add('active');

  document.getElementById('closeDetailsBtn').addEventListener('click', function() {
    detailsModalOverlay.classList.remove('active');
  });
  var editCoverBtn = detailsModal.querySelector('[data-edit-cover]');
  if (editCoverBtn) {
    editCoverBtn.addEventListener('click', function() {
      if (!isAdmin) return;
      detailsModalOverlay.classList.remove('active');
      openCoverModal(this.getAttribute('data-edit-cover'));
    });
  }
  var editGameBtn = detailsModal.querySelector('[data-edit-game]');
  if (editGameBtn) {
    editGameBtn.addEventListener('click', function() {
      if (!isAdmin) return;
      detailsModalOverlay.classList.remove('active');
      openEditModal(this.getAttribute('data-edit-game'));
    });
  }
  var toggleFavBtn = detailsModal.querySelector('[data-toggle-fav]');
  if (toggleFavBtn) {
    toggleFavBtn.addEventListener('click', function() {
      var fid = this.getAttribute('data-toggle-fav');
      var nowFav = toggleFavorite(fid);
      detailsModalOverlay.classList.remove('active');
      renderGames(searchInput.value);
      showToast(nowFav ? 'Adicionado aos favoritos!' : 'Removido dos favoritos');
    });
  }
  var toggleFeatureBtn = detailsModal.querySelector('[data-toggle-feature]');
  if (toggleFeatureBtn) {
    toggleFeatureBtn.addEventListener('click', function() {
      if (!isAdmin) return;
      var fid = this.getAttribute('data-toggle-feature');
      var g = null;
      for (var gi = 0; gi < games.length; gi++) if (games[gi].id === fid) { g = games[gi]; break; }
      if (!g) return;
      g.featured = !g.featured;
      logHistory(g.featured ? 'feature' : 'unfeature', { game: g.name, gameId: g.id });
      saveGame(g);
      detailsModalOverlay.classList.remove('active');
      renderGames(searchInput.value);
      showToast(g.featured ? 'Adicionado aos destaques!' : 'Removido dos destaques');
    });
  }

  var reportBtns = detailsModal.querySelectorAll('[data-report]');
  for (var rb = 0; rb < reportBtns.length; rb++) {
    reportBtns[rb].addEventListener('click', function() {
      reportLink(game, game.links[parseInt(this.getAttribute('data-report'), 10)], this);
    });
  }

  var copyBtns = detailsModal.querySelectorAll('[data-copy]');
  for (var c = 0; c < copyBtns.length; c++) {
    copyBtns[c].addEventListener('click', function() {
      var text = this.getAttribute('data-copy');
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function(){ showToast('Copiado!'); })
          .catch(function(){ showToast('Copiado: ' + text); });
      } else {
        showToast('Copiado: ' + text);
      }
    });
  }
}

detailsModalOverlay.addEventListener('click', function(e) {
  if (e.target === detailsModalOverlay) detailsModalOverlay.classList.remove('active');
});

// ==================== Janela de trocar a capa de um jogo (admin) ====================

function openCoverModal(id) {
  var game = null;
  for (var i = 0; i < games.length; i++) if (games[i].id === id) { game = games[i]; break; }
  if (!game) return;

  currentCoverGameId = id;
  pendingCoverData = null;

  coverGameName.innerHTML = icon('camera', 14) + escapeHtml(game.name);
  coverUrlInput.value = (game.cover && game.cover.indexOf('data:') !== 0) ? game.cover : '';
  coverFileInput.value = '';
  coverPreview.src = '';
  coverPreview.style.display = 'none';

  if (game.cover) {
    coverPreview.src = game.cover;
    coverPreview.style.display = 'block';
    coverPreview.onerror = function() { this.style.display = 'none'; };
  }

  coverModalOverlay.classList.add('active');
}

function closeCoverModal() {
  coverModalOverlay.classList.remove('active');
  currentCoverGameId = null;
  pendingCoverData = null;
  coverFileInput.value = '';
  coverUrlInput.value = '';
  coverPreview.src = '';
  coverPreview.style.display = 'none';
}

coverUrlInput.addEventListener('input', function() {
  var v = this.value.trim();
  if (v) {
    coverPreview.src = v;
    coverPreview.style.display = 'block';
    coverPreview.onerror = function() { this.style.display = 'none'; };
  } else {
    coverPreview.style.display = 'none';
  }
  pendingCoverData = null;
});

coverFileInput.addEventListener('change', function() {
  var file = this.files && this.files[0];
  if (!file) return;
  if (!file.type.match(/^image\//)) {
    showToast('Escolha um arquivo de imagem', true);
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    showToast('Imagem muito grande (máx 10MB)', true);
    return;
  }
  // Reduz e comprime a capa (máx. 800px, JPEG) para o documento do jogo ficar leve
  var reader = new FileReader();
  reader.onload = function(e) {
    var img = new Image();
    img.onload = function() {
      var max = 800, w = img.width, h = img.height;
      var k = Math.min(1, max / Math.max(w, h));
      var cv = document.createElement('canvas');
      cv.width = Math.round(w * k); cv.height = Math.round(h * k);
      var ctx = cv.getContext('2d');
      ctx.fillStyle = '#0a0a0b';
      ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.drawImage(img, 0, 0, cv.width, cv.height);
      pendingCoverData = cv.toDataURL('image/jpeg', 0.82);
      coverPreview.src = pendingCoverData;
      coverPreview.style.display = 'block';
      coverUrlInput.value = '';
    };
    img.onerror = function() { showToast('Não foi possível ler essa imagem', true); };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
});

saveCoverBtn.addEventListener('click', function() {
  if (!isAdmin) return;
  if (!currentCoverGameId) return;
  var game = null;
  for (var i = 0; i < games.length; i++) if (games[i].id === currentCoverGameId) { game = games[i]; break; }
  if (!game) return;

  var novaCapa = '';
  if (pendingCoverData) novaCapa = pendingCoverData;
  else if (coverUrlInput.value.trim()) novaCapa = coverUrlInput.value.trim();

  game.cover = novaCapa;
  logHistory('cover', { game: game.name, gameId: game.id });
  saveGame(game);
  renderGames(searchInput.value);
  closeCoverModal();
  showToast('Capa atualizada!');
});

removeCoverBtn.addEventListener('click', function() {
  if (!isAdmin) return;
  if (!currentCoverGameId) return;
  var game = null;
  for (var i = 0; i < games.length; i++) if (games[i].id === currentCoverGameId) { game = games[i]; break; }
  if (!game) return;
  game.cover = '';
  logHistory('cover', { game: game.name, gameId: game.id, detail: 'removeu' });
  saveGame(game);
  renderGames(searchInput.value);
  closeCoverModal();
  showToast('Capa removida');
});

closeCoverBtn.addEventListener('click', closeCoverModal);
coverModalOverlay.addEventListener('click', function(e) {
  if (e.target === coverModalOverlay) closeCoverModal();
});

// ==================== Janela de adicionar/editar jogo, detecção de duplicados e leitura dos links digitados ====================

var editingGameId       = null;
var editingKeepCover    = false;

function setGameModalMode(editing) {
  gameModalTitle.textContent = editing ? 'Editar jogo' : 'Novo jogo';
  gameSaveBtn.textContent = editing ? 'Salvar alterações' : 'Salvar';
  gameCoverInput.placeholder = 'Ex: capas/tlou2.jpg  ou  https://...';
  if (dupHint) dupHint.textContent = '';
}
function openModal() {
  editingGameId = null;
  editingKeepCover = false;
  modalOverlay.classList.add('active');
  gameForm.reset();
  setGameModalMode(false);
  setTimeout(function() { gameNameInput.focus(); }, 100);
}
function openEditModal(id) {
  var game = null;
  for (var i = 0; i < games.length; i++) if (games[i].id === id) { game = games[i]; break; }
  if (!game) return;
  editingGameId = id;
  modalOverlay.classList.add('active');
  gameForm.reset();
  setGameModalMode(true);
  gameNameInput.value = game.name || '';
  gameVersionInput.value = game.version || '';
  gamePasswordInput.value = game.password || '';
  gameFeaturedInput.checked = !!game.featured;
  gameLinksInput.value = (game.links || []).map(function(l) { return (l.label || 'Link') + ' ⇒ ' + l.url; }).join('\n');
  // Capa enviada do computador (data:) é enorme para mostrar no campo: deixa vazio e mantém a atual
  editingKeepCover = !!(game.cover && game.cover.indexOf('data:') === 0);
  gameCoverInput.value = editingKeepCover ? '' : (game.cover || '');
  if (editingKeepCover) gameCoverInput.placeholder = 'Capa enviada do computador — deixe vazio para manter';
  setTimeout(function() { gameNameInput.focus(); }, 100);
}
function closeModal() {
  modalOverlay.classList.remove('active');
  gameForm.reset();
  editingGameId = null;
  editingKeepCover = false;
  setGameModalMode(false);
}

// Ignora acentos, maiúsculas e pontuação: "Spider-Man 1" e "spider man 1" são o mesmo nome
function normName(n) {
  var r = String(n || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  return r || String(n || '').trim().toLowerCase();
}
function findDuplicate(name, ignoreId) {
  var n = normName(name);
  if (!n) return null;
  for (var i = 0; i < games.length; i++) {
    if (games[i].id !== ignoreId && normName(games[i].name) === n) return games[i];
  }
  return null;
}
function dupLabel(g) { return g.name + (g.version ? ' (' + g.version + ')' : ''); }
// Ao editar, só avisa se o nome foi mudado para um que já existe
function duplicateForForm(name) {
  if (editingGameId) {
    var cur = null;
    for (var i = 0; i < games.length; i++) if (games[i].id === editingGameId) { cur = games[i]; break; }
    if (cur && normName(cur.name) === normName(name)) return null;
  }
  return findDuplicate(name, editingGameId);
}
gameNameInput.addEventListener('input', function() {
  var d = this.value.trim() ? duplicateForForm(this.value) : null;
  dupHint.textContent = d ? 'Atenção: já existe "' + dupLabel(d) + '" na coleção.' : '';
});

function looksLikeNewUrl(str) {
  return /^https?:\/\//i.test(str) || /^www\./i.test(str) || /^data:/i.test(str) || /^capas\//i.test(str);
}

function findSeparatorIndex(line) {
  var arrow = line.indexOf('⇒');
  if (arrow !== -1) return { index: arrow, length: 1 };
  // Símbolos claros de separação (nome ⇒ link, nome -> link, nome => link, travessão, pipe)
  var symbolMatch = line.match(/⇒|=>|->|—|–|\|/);
  if (symbolMatch) return { index: symbolMatch.index, length: symbolMatch[0].length };

  // ":" como separador, exceto quando faz parte do protocolo "http://" ou "https://"
  var colonIdx = line.indexOf(':');
  while (colonIdx !== -1) {
    if (line.slice(colonIdx, colonIdx + 3) !== '://') {
      return { index: colonIdx, length: 1 };
    }
    colonIdx = line.indexOf(':', colonIdx + 1);
  }

  // " - " (hífen isolado com espaço nos dois lados) como separador
  var dashIdx = line.indexOf(' - ');
  if (dashIdx !== -1) return { index: dashIdx, length: 3 };

  return null;
}

function parseLinks(text) {
  var lines = text.split(/\r?\n/);
  var result = [];
  var counter = 0;
  lines.forEach(function(rawLine) {
    var line = rawLine.trim();
    if (!line) return;
    var label, url;
    var sep = findSeparatorIndex(line);
    if (sep) {
      label = line.slice(0, sep.index).trim();
      url = line.slice(sep.index + sep.length).trim();
      if (!label) { counter++; label = 'Link ' + counter; }
    } else if (result.length > 0 && !looksLikeNewUrl(line)) {
      // Não tem nome ⇒ link nem parece o início de um link novo:
      // é a continuação de um link que quebrou em mais de uma linha.
      result[result.length - 1].url += line;
      return;
    } else {
      counter++;
      label = 'Link ' + counter;
      url = line;
    }
    if (!url) return;
    if (!/^https?:\/\//i.test(url) && url.indexOf('data:') !== 0) {
      if (!/^capas\//i.test(url)) url = 'https://' + url;
    }
    result.push({ label: label || 'Link', url: url });
  });
  return result;
}

openModalBtn.addEventListener('click', openModal);
closeModalBtn.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', function(e) { if (e.target === modalOverlay) closeModal(); });

gameForm.addEventListener('submit', function(e) {
  e.preventDefault();
  if (!isAdmin) { showToast('Apenas administradores podem adicionar jogos', true); return; }
  var name = gameNameInput.value.trim();
  var version = gameVersionInput.value.trim();
  var cover = gameCoverInput.value.trim();
  var password = gamePasswordInput.value.trim();
  var linksText = gameLinksInput.value.trim();

  if (!name || !linksText) { showToast('Preencha o nome e ao menos um link', true); return; }
  var links = parseLinks(linksText);
  if (links.length === 0) { showToast('Nenhum link válido encontrado', true); return; }
  var dupGame = duplicateForForm(name);
  if (dupGame && !confirm('Já existe um jogo com esse nome:\n\n' + dupLabel(dupGame) + '\n\nSalvar mesmo assim?')) return;

  if (editingGameId) {
    var target = null;
    for (var ei = 0; ei < games.length; ei++) if (games[ei].id === editingGameId) { target = games[ei]; break; }
    if (!target) { showToast('Jogo não encontrado (talvez tenha sido removido)', true); closeModal(); return; }
    var newCover = (!cover && editingKeepCover) ? target.cover : cover;
    var newFeatured = gameFeaturedInput.checked;
    var changes = [];
    if (target.name !== name) changes.push('nome (era "' + target.name + '")');
    if ((target.version || '') !== version) changes.push('versão');
    if ((target.cover || '') !== newCover) changes.push('capa');
    if ((target.password || '') !== password) changes.push('senha');
    if (JSON.stringify(target.links || []) !== JSON.stringify(links)) changes.push('links');
    if (!!target.featured !== newFeatured) changes.push('destaque');
    if (changes.length === 0) { closeModal(); showToast('Nada foi alterado'); return; }
    var editedId = target.id;
    target.name = name; target.version = version; target.cover = newCover;
    target.password = password; target.links = links; target.featured = newFeatured;
    logHistory('edit', { game: name, gameId: editedId, detail: changes.join(', ') });
    saveGame(target);
    renderGames(searchInput.value);
    closeModal();
    showToast('Jogo atualizado');
    return;
  }

  games.push({
    id: generateId(),
    name: name, version: version, cover: cover, password: password, links: links,
    featured: gameFeaturedInput ? gameFeaturedInput.checked : false,
    createdAt: Date.now()
  });
  saveGame(games[games.length - 1]);
  renderGames(searchInput.value);
  logHistory('add', { game: name, gameId: games[games.length - 1].id });
  closeModal();
  showToast('Jogo adicionado' + (gameFeaturedInput && gameFeaturedInput.checked ? ' aos destaques' : ''));
});

// ==================== Exportar backup (JSON) e importar jogos (admin) ====================

function openImportModal() {
  importModalOverlay.classList.add('active');
  importJsonTextarea.value = '';
  replaceAllCheckbox.checked = false;
  setTimeout(function() { importJsonTextarea.focus(); }, 100);
}
function closeImportModal() { importModalOverlay.classList.remove('active'); }

function exportGames() {
  if (games.length === 0) { showToast('Nada para exportar', true); return; }
  var data = JSON.stringify(games, null, 2);
  var blob = new Blob([data], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'zenkai-' + new Date().toISOString().slice(0,10) + '.json';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Backup baixado!');
}

function importGames() {
  if (!isAdmin) { showToast('Apenas administradores podem importar jogos', true); return; }
  var raw = importJsonTextarea.value.trim();
  if (!raw) { showToast('Cole um JSON primeiro', true); return; }
  var parsed;
  try { parsed = JSON.parse(raw); }
  catch (err) { showToast('JSON inválido: ' + err.message, true); return; }
  if (!Array.isArray(parsed)) { showToast('O JSON precisa ser um array', true); return; }

  var validos = [], invalidos = 0;
  parsed.forEach(function(item) {
    if (!item || typeof item !== 'object' || !item.name) { invalidos++; return; }
    var links = [];
    if (Array.isArray(item.links)) {
      item.links.forEach(function(l) {
        if (!l || !l.url) return;
        var u = String(l.url).trim();
        if (!/^https?:\/\//i.test(u) && u.indexOf('data:') !== 0 && !/^capas\//i.test(u)) u = 'https://' + u;
        links.push({ label: String(l.label || 'Link').trim(), url: u });
      });
    }
    if (links.length === 0) { invalidos++; return; }
    validos.push({
      id: generateId(),
      name: String(item.name).trim(),
      version: item.version ? String(item.version).trim() : '',
      cover: item.cover ? String(item.cover).trim() : '',
      password: item.password ? String(item.password).trim() : '',
      featured: !!item.featured,
      createdAt: (typeof item.createdAt === 'number' && item.createdAt > 0) ? item.createdAt : Date.now() + validos.length,
      links: links
    });
  });
  if (validos.length === 0) { showToast('Nenhum jogo válido encontrado', true); return; }

  // Duplicados: nomes que já estão na coleção (a menos que ela seja substituída) ou que se repetem no arquivo
  var seen = {}, unicos = [], repetidos = [];
  if (!replaceAllCheckbox.checked) games.forEach(function(g) { seen[normName(g.name)] = true; });
  validos.forEach(function(g) {
    var k = normName(g.name);
    if (seen[k]) repetidos.push(g.name); else { seen[k] = true; unicos.push(g); }
  });
  var duplicados = repetidos.length;
  if (duplicados) {
    var lista = repetidos.slice(0, 8).join('\n') + (duplicados > 8 ? '\n… e mais ' + (duplicados - 8) : '');
    if (!confirm(duplicados + (duplicados === 1 ? ' jogo já existe' : ' jogos já existem') + ' (ou se repetem no arquivo):\n\n' + lista +
                 '\n\nOK = importar só os novos e pular esses\nCancelar = voltar sem importar')) return;
    validos = unicos;
    if (validos.length === 0) { showToast('Todos os jogos já estavam na coleção', true); return; }
  }
  var removeIds = replaceAllCheckbox.checked ? games.map(function(g) { return g.id; }) : [];
  if (replaceAllCheckbox.checked) games = validos;
  else games = games.concat(validos);
  saveManyGames(validos, removeIds);
  renderGames(searchInput.value);
  logHistory('import', { detail: validos.length + ' jogos' + (replaceAllCheckbox.checked ? ' (substituiu a coleção)' : '') });
  closeImportModal();
  showToast(validos.length + ' jogos importados' + ((invalidos || duplicados) ? ' (' + (invalidos + duplicados) + ' ignorados)' : ''));
}

importBtn.addEventListener('click', openImportModal);
closeImportBtn.addEventListener('click', closeImportModal);
importModalOverlay.addEventListener('click', function(e) { if (e.target === importModalOverlay) closeImportModal(); });
confirmImportBtn.addEventListener('click', importGames);
exportBtn.addEventListener('click', exportGames);
