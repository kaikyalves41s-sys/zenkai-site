'use strict';
// ZENKAI — busca/ordenação, tecla Esc, inicialização do app e registro do service worker (PWA).
// (Arquivo carregado pelo index.html; compartilha funções e variáveis com os outros arquivos de js/.)

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    if (modalOverlay.classList.contains('active')) closeModal();
    if (importModalOverlay.classList.contains('active')) closeImportModal();
    if (detailsModalOverlay.classList.contains('active')) detailsModalOverlay.classList.remove('active');
    if (coverModalOverlay.classList.contains('active')) closeCoverModal();
  }
});

sortSelect.addEventListener('change', function() { sortMode = this.value; renderGames(searchInput.value); });
regionSelect.addEventListener('change', function() { regionFilter = this.value; renderGames(searchInput.value); });

searchInput.addEventListener('input', function(e) { renderGames(e.target.value); });
clearSearchBtn.addEventListener('click', function() {
  searchInput.value = ''; renderGames(''); searchInput.focus();
});

function init() {
  if (!auth) {
    // Sem Firebase Auth configurado: libera o app sem login (modo antigo)
    showAppScreen();
    loadFavorites(function() {
      loadGames(function() { renderGames(searchInput.value); });
    });
    return;
  }
  auth.onAuthStateChanged(function(user) {
    if (user) {
      handleUser(user);
    } else {
      authBox.classList.remove('is-verify');
      currentUser = null;
      isAdmin = false;
      games = [];
      favorites = [];
      showAuthScreen();
    }
  });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();

// ====== PWA: registra o service worker para permitir instalar o app ======
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('sw.js').catch(function(err) {
      console.warn('Falha ao registrar o service worker:', err);
    });
  });
}
