(function() {
  'use strict';

  // v1 ZENKAI: identidade visual samurai, paleta vermelho sangue.
  var STORAGE_KEY = 'zenkai_v1';

  // ====== Configuração da nuvem (Firebase Firestore) ======
  // Substitua pelos valores do SEU projeto Firebase (veja o passo a passo que te enviei).
  var firebaseConfig = {
    apiKey: "AIzaSyCNFhMtJZb_oUr4WDwoSSQiceoIp1oRV08",
    authDomain: "zenkai-jogos.firebaseapp.com",
    projectId: "zenkai-jogos",
    storageBucket: "zenkai-jogos.firebasestorage.app",
    messagingSenderId: "621160284301",
    appId: "1:621160284301:web:d547ffe57d9f9f19f2a2c4"
  };

  var db = null;
  var auth = null;
  var GAMES_DOC_REF = null;
  try {
    if (typeof firebase !== 'undefined' && firebaseConfig.apiKey !== 'SUA_API_KEY') {
      firebase.initializeApp(firebaseConfig);
      db = firebase.firestore();
      auth = firebase.auth();
      GAMES_DOC_REF = db.collection('zenkai').doc('games');
    } else {
      console.warn('Firebase não configurado ainda: os jogos vão ficar só neste navegador (localStorage).');
    }
  } catch (e) {
    console.error('Erro ao iniciar Firebase:', e);
  }

  // ====== Estado de autenticação ======
  var currentUser = null;
  var isAdmin = false;

  // ====== Favoritos pessoais (cada usuário logado tem os seus) ======
  var FAVORITES_STORAGE_PREFIX = 'zenkai_favs_';
  var favorites = [];

  var DEFAULT_GAMES = [
    {
      name: "Spider-Man 1", version: "CUSA02299 – USA", featured: true,
      cover: "https://cdn.jsdelivr.net/gh/kaikyalves41s-sys/capas-jogos@main/spiderman1.jpg.webp", password: "SuperPSX",
      links: [
        { label: "Game (6.72+)", url: "https://mocha.my/share/EsWQelf72VAXYYJ_1gqEdQVbcfLgmTQY" },
        { label: "Update v1.19 (6.72+)", url: "https://mocha.my/share/7EFEw6FCxcXvxpM0hKFJMyWrUfMe48Gr" },
        { label: "Update v1.19 (60fps)", url: "https://mocha.my/share/9ctBLSur2ffnkdEAWJETtL7zKnGBO6Je" },
        { label: "Update v1.19 (Fix 5.05)", url: "https://mocha.my/share/pb3Uav7sHA5xLXYyo5Fnx-t4CN87N4zU" },
        { label: "Update v1.19 (Fix 5.05)(60fps)", url: "https://mocha.my/share/YkJZ8TfATz8rUvxmPcfbpEKl1nfCcWh1" },
        { label: "DLC (1+2+3) + Preorder", url: "https://mocha.my/share/kpJVQobKwnQyLu3al-B6AfNnyCeqeFhE" }
      ]
    },
    {
      name: "Spider-Man: Miles Morales", version: "CUSA17722 – USA",
      cover: "https://cdn.jsdelivr.net/gh/kaikyalves41s-sys/capas-jogos@main/miles.jpg.jpg", password: "SuperPSX",
      links: [
        { label: "Game (7.50+)", url: "https://mocha.my/share/xfTt_eksNVHGkweRxY8Zs96E1T9_rppD" },
        { label: "Update v1.14- (5.05+)", url: "https://mocha.my/share/t-iEQtlkGUMTaU5fEgJLWqpoznr0sL3" },
        { label: "Update v1.14 (Fix 5.05-7.02)", url: "https://mocha.my/share/u3de88C7wtPG0-9lFIl2YuVxAW-VmXyw" }
      ]
    },
    {
      name: "God of War Ragnarok", version: "CUSA34384 – USA", featured: true,
      cover: "https://cdn.jsdelivr.net/gh/kaikyalves41s-sys/capas-jogos@main/gow.jpg.jpg", password: "SuperPSX",
      links: [
        { label: "Game (9.00+)", url: "https://mocha.my/share/HozAFQsobEgD5rj8zy1xNKIlDkm4XDLh" },
        { label: "Update v6.00 + All DLC", url: "https://mocha.my/share/CpfSYH8pjIDFmRQ93Nnj4t2szNaoc_u6" }
      ]
    },
    {
      name: "Infamous Second Son", version: "CUSA00004 – EUR",
      cover: "https://cdn.jsdelivr.net/gh/kaikyalves41s-sys/capas-jogos@main/infamous.jpg.jpg", password: "SuperPSX",
      links: [
        { label: "Game (v1.07)", url: "https://mocha.my/share/s4N5ELclOkUwMZfJrmQEbFV8xqulzF6E" },
        { label: "DLC", url: "https://mocha.my/share/xW_nkX5gxQqIu7GXCcqiRfveoMovET20" }
      ]
    },
    {
      name: "Shadow of The Colossus", version: "CUSA08809 – EUR",
      cover: "https://cdn.jsdelivr.net/gh/kaikyalves41s-sys/capas-jogos@main/shadow.jpg.jpg", password: "SuperPSX",
      links: [
        { label: "Game (5.05+)", url: "https://mocha.my/share/TkvpO1-qPAPwozIHB_tZhsJ8RfuNIzC" },
        { label: "Update v1.01", url: "https://mocha.my/share/d-OdF2xRJcfxYiAazZVmtie1BtWnTDZY" },
        { label: "DLC", url: "https://mocha.my/share/xvdGkdsaKc98m9OwGUS1uzbWYwiWZraC" }
      ]
    },
    {
      name: "The Last of Us Remastered", version: "CUSA00556 – EUR",
      cover: "https://cdn.jsdelivr.net/gh/kaikyalves41s-sys/capas-jogos@main/tlou1.jpg.jpg", password: "SuperPSX",
      links: [
        { label: "Game", url: "https://fortyfile.com/3cf102ec99a9e3caac8d2a53503c66fb08de952b67c2d3ba" },
        { label: "Update v1.11", url: "https://mocha.my/share/Lo3f00jy0tynALzgOkNZfpX-11xGQF8M" },
        { label: "ALL DLCs", url: "https://mocha.my/share/2YwLXzlZ7rzQAHXVayD0s9F9sRwLFcDd" }
      ]
    },
    {
      name: "The Last of Us Part 2", version: "CUSA07820 – USA", featured: true,
      cover: "https://cdn.jsdelivr.net/gh/kaikyalves41s-sys/capas-jogos@main/tlou2.jpg.jpg", password: "SuperPSX",
      links: [
        { label: "Game (7.00+)", url: "https://mocha.my/share/VO5HvJnI0ujqulnD4ATpZdLN2sFGKB8u" },
        { label: "Update v1.09 (7.50+)", url: "https://mocha.my/share/5pBBUIJVPTubkMeySASH7clA161eVU-I" },
        { label: "Update v1.09 (Fix 5.05-6.72)", url: "https://mocha.my/share/5pBBUIJVPTubkMeySASH7clA161eVU-I" },
        { label: "Pre-Order DLC & Bonus", url: "https://mocha.my/share/3so1J1wZ4Zan5JPJWYF9b8fgDmCPefQV" }
      ]
    },
    {
      name: "The Witcher 3 Wild Hunt", version: "CUSA05725 – USA",
      cover: "https://cdn.jsdelivr.net/gh/kaikyalves41s-sys/capas-jogos@main/witcher3.jpg.webp", password: "",
      links: [
        { label: "Complete Edition", url: "https://romsfun.com/download/the-witcher-3-wild-hunt-complete-edition-4131-226330" }
      ]
    },
    {
      name: "Horizon Zero Dawn Complete Edition", version: "CUSA01967 – USA",
      cover: "https://cdn.jsdelivr.net/gh/kaikyalves41s-sys/capas-jogos@main/horizon.jpg.webp", password: "SuperPSX",
      links: [
        { label: "Game", url: "https://mocha.my/share/A0qbJtqepMtP9TjiC9M_2ymboTUS8Kdu" },
        { label: "Update 1.54 (7.55+)", url: "https://mocha.my/share/cBtU7g-KUc4cy20xHDsc9kp5RIRBUqtp" },
        { label: "Update 1.54 (Fix 5.05-7.02)(Including Spa/Lat Audio Pack)", url: "https://mocha.my/share/tZEWnbpqv_yw_ztID8K6v-jwQfilXZpt" },
        { label: "All DLC Collector's Pack", url: "https://mocha.my/share/qUlSJsBJrVmMalCZ8UaI0oV9VclVDond" }
      ]
    }
  ];

  var games = [];
  var currentCoverGameId = null;
  var pendingCoverData = null;
  var featuredIndex = 0;
  var activeTab = 'destaque';

  var carouselsContainer  = document.getElementById('carouselsContainer');
  var counter             = document.getElementById('counter');
  var modalOverlay        = document.getElementById('modalOverlay');
  var detailsModalOverlay = document.getElementById('detailsModalOverlay');
  var detailsModal        = document.getElementById('detailsModal');
  var importModalOverlay  = document.getElementById('importModalOverlay');
  var coverModalOverlay   = document.getElementById('coverModalOverlay');
  var openModalBtn        = document.getElementById('openModalBtn');
  var closeModalBtn       = document.getElementById('closeModalBtn');
  var closeImportBtn      = document.getElementById('closeImportBtn');
  var confirmImportBtn    = document.getElementById('confirmImportBtn');
  var closeCoverBtn       = document.getElementById('closeCoverBtn');
  var saveCoverBtn        = document.getElementById('saveCoverBtn');
  var removeCoverBtn      = document.getElementById('removeCoverBtn');
  var exportBtn           = document.getElementById('exportBtn');
  var importBtn           = document.getElementById('importBtn');
  var gameForm            = document.getElementById('gameForm');
  var searchInput         = document.getElementById('searchInput');
  var clearSearchBtn      = document.getElementById('clearSearchBtn');
  var toast               = document.getElementById('toast');

  var gameNameInput       = document.getElementById('gameName');
  var gameVersionInput    = document.getElementById('gameVersion');
  var gameCoverInput      = document.getElementById('gameCover');
  var gamePasswordInput   = document.getElementById('gamePassword');
  var gameLinksInput      = document.getElementById('gameLinks');
  var gameFeaturedInput   = document.getElementById('gameFeatured');
  var navLinksEls         = document.querySelectorAll('.nav-link');

  var importJsonTextarea  = document.getElementById('importJson');
  var replaceAllCheckbox  = document.getElementById('replaceAll');

  var coverGameName       = document.getElementById('coverGameName');
  var coverUrlInput       = document.getElementById('coverUrlInput');
  var coverFileInput      = document.getElementById('coverFileInput');
  var coverPreview        = document.getElementById('coverPreview');

  var authOverlay             = document.getElementById('authOverlay');
  var authTabs                = document.querySelectorAll('.auth-tab');
  var loginForm                = document.getElementById('loginForm');
  var signupForm               = document.getElementById('signupForm');
  var loginEmailInput          = document.getElementById('loginEmail');
  var loginPasswordInput       = document.getElementById('loginPassword');
  var loginError               = document.getElementById('loginError');
  var signupEmailInput         = document.getElementById('signupEmail');
  var signupPasswordInput      = document.getElementById('signupPassword');
  var signupPasswordConfirmInput = document.getElementById('signupPasswordConfirm');
  var signupError              = document.getElementById('signupError');
  var forgotPasswordBtn        = document.getElementById('forgotPasswordBtn');
  var userEmailLabel           = document.getElementById('userEmailLabel');
  var adminPill                = document.getElementById('adminPill');
  var logoutBtn                = document.getElementById('logoutBtn');

  function generateId() {
    return 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2, 11);
  }
  function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    var div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
  }
  function escapeAttr(text) {
    return escapeHtml(text).replace(/"/g, '&quot;');
  }
  var ICON_PATHS = {
    star: '<polygon points="12 2.5 14.6 8.6 21.3 9.3 16.4 13.8 17.8 20.4 12 17 6.2 20.4 7.6 13.8 2.7 9.3 9.4 8.6"/>',
    grid: '<rect x="3" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5"/>',
    camera: '<path d="M4 8.2h3.2L9 6h6l1.8 2.2H20V19H4z"/><circle cx="12" cy="13.4" r="3.2"/>',
    trash: '<path d="M4 7h16"/><path d="M9.5 7V4.3h5V7"/><path d="M6.2 7l0.9 12.7h9.8L17.8 7"/><line x1="10" y1="11" x2="10" y2="16.5"/><line x1="14" y1="11" x2="14" y2="16.5"/>',
    disc: '<circle cx="12" cy="12" r="8.6"/><circle cx="12" cy="12" r="2.2"/>',
    folder: '<path d="M3.5 6.8a1.6 1.6 0 011.6-1.6h4l1.7 2h9.1a1.6 1.6 0 011.6 1.6v9a1.6 1.6 0 01-1.6 1.6h-15a1.6 1.6 0 01-1.6-1.6z"/>',
    copy: '<rect x="9.2" y="9.2" width="10.8" height="10.8" rx="2"/><path d="M5.2 14.8V6a1.8 1.8 0 011.8-1.8h8.8"/>',
    arrowUpRight: '<line x1="7" y1="17" x2="17" y2="7"/><polyline points="8.5 7 17 7 17 15.5"/>',
    key: '<circle cx="8" cy="15.2" r="3.3"/><path d="M10.4 12.8L19.6 3.6"/><path d="M16.2 6.2l2.7 2.7"/><path d="M13.7 8.7l2.3 2.3"/>',
    controller: '<rect x="2.5" y="8" width="19" height="9.5" rx="4.5"/><line x1="7" y1="10.5" x2="7" y2="14.5"/><line x1="5" y1="12.5" x2="9" y2="12.5"/><circle cx="16.2" cy="11.2" r="1"/><circle cx="18.2" cy="13.6" r="1"/>',
    search: '<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    check: '<polyline points="20 6.5 9.5 17 4.5 12.2"/>',
    alert: '<path d="M12 3.2l9.5 17H2.5z"/><line x1="12" y1="9.5" x2="12" y2="14"/><line x1="12" y1="16.8" x2="12" y2="16.9"/>',
    heart: '<path d="M12 20.5c-.3 0-.6-.1-.8-.3C7.8 17 3 12.9 3 8.8 3 6 5.2 3.8 8 3.8c1.5 0 2.9.7 3.8 1.8.9-1.1 2.3-1.8 3.8-1.8 2.8 0 5 2.2 5 5 0 4.1-4.8 8.2-8.2 11.4-.2.2-.5.3-.8.3z"/>'
  };
  function icon(name, size) {
    size = size || 16;
    var p = ICON_PATHS[name];
    if (!p) return '';
    return '<svg class="i" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
  }
  function truncateUrl(url) {
    if (!url) return '';
    var clean = url.replace(/^https?:\/\//, '');
    if (clean.length > 50) clean = clean.slice(0, 48) + '...';
    return clean;
  }
  function showToast(msg, isError) {
    toast.innerHTML = icon(isError ? 'alert' : 'check', 16) + '<span>' + escapeHtml(msg) + '</span>';
    toast.style.borderColor = isError ? 'rgba(239,68,68,0.45)' : 'rgba(225,29,46,0.4)';
    toast.style.color = isError ? '#ff9a9a' : '#fff';
    toast.classList.add('show');
    if (toast._t) clearTimeout(toast._t);
    toast._t = setTimeout(function() { toast.classList.remove('show'); }, 2800);
  }

  var FALLBACK_COVER = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="480" viewBox="0 0 400 480">' +
    '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0" stop-color="#2a0a10"/><stop offset="1" stop-color="#0a0a0a"/>' +
    '</linearGradient></defs>' +
    '<rect width="400" height="480" fill="url(#g)"/>' +
    '<text x="200" y="270" font-family="Arial" font-size="120" text-anchor="middle">⚔️</text>' +
    '</svg>'
  );

  // ====== Autenticação (login / cadastro / admin) ======
  function authErrorMessage(err) {
    var code = err && err.code;
    var map = {
      'auth/invalid-email': 'Email inválido.',
      'auth/user-disabled': 'Esta conta foi desativada.',
      'auth/user-not-found': 'Usuário não encontrado.',
      'auth/wrong-password': 'Senha incorreta.',
      'auth/invalid-credential': 'Email ou senha incorretos.',
      'auth/email-already-in-use': 'Este email já está cadastrado.',
      'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres.',
      'auth/too-many-requests': 'Muitas tentativas. Tente novamente em instantes.',
      'auth/network-request-failed': 'Falha de conexão. Verifique sua internet.'
    };
    return map[code] || ('Erro ao autenticar' + (err && err.message ? ': ' + err.message : '.'));
  }

  function setAdminUIVisible(admin) {
    document.body.classList.toggle('is-admin', admin);
    if (adminPill) adminPill.style.display = admin ? 'inline-flex' : 'none';
    var adminOnlyEls = document.querySelectorAll('[data-admin-only]');
    for (var i = 0; i < adminOnlyEls.length; i++) {
      adminOnlyEls[i].style.display = admin ? '' : 'none';
    }
  }

  function checkAdminStatus(uid) {
    if (!db) return Promise.resolve(false);
    return db.collection('admins').doc(uid).get()
      .then(function(doc) { return doc.exists; })
      .catch(function() { return false; });
  }

  function showAppScreen() { document.body.classList.add('authenticated'); }
  function showAuthScreen() {
    document.body.classList.remove('authenticated');
    setAdminUIVisible(false);
  }

  if (authTabs && authTabs.length) {
    for (var at = 0; at < authTabs.length; at++) {
      authTabs[at].addEventListener('click', function() {
        for (var t = 0; t < authTabs.length; t++) authTabs[t].classList.remove('active');
        this.classList.add('active');
        var target = this.getAttribute('data-auth-tab');
        loginForm.style.display = target === 'login' ? 'flex' : 'none';
        signupForm.style.display = target === 'signup' ? 'flex' : 'none';
        loginError.textContent = '';
        signupError.textContent = '';
      });
    }
  }

  if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
      e.preventDefault();
      loginError.textContent = '';
      if (!auth) { loginError.textContent = 'Login indisponível: Firebase não configurado.'; return; }
      auth.signInWithEmailAndPassword(loginEmailInput.value.trim(), loginPasswordInput.value)
        .catch(function(err) { loginError.textContent = authErrorMessage(err); });
    });
  }

  if (signupForm) {
    signupForm.addEventListener('submit', function(e) {
      e.preventDefault();
      signupError.textContent = '';
      if (!auth) { signupError.textContent = 'Cadastro indisponível: Firebase não configurado.'; return; }
      var pass = signupPasswordInput.value;
      var confirm = signupPasswordConfirmInput.value;
      if (pass !== confirm) { signupError.textContent = 'As senhas não coincidem.'; return; }
      auth.createUserWithEmailAndPassword(signupEmailInput.value.trim(), pass)
        .catch(function(err) { signupError.textContent = authErrorMessage(err); });
    });
  }

  if (forgotPasswordBtn) {
    forgotPasswordBtn.addEventListener('click', function() {
      var email = (loginEmailInput.value || '').trim();
      if (!email) { loginError.textContent = 'Digite seu email acima e clique de novo.'; return; }
      if (!auth) return;
      auth.sendPasswordResetEmail(email)
        .then(function() { loginError.style.color = '#8aff9a'; loginError.textContent = 'Email de redefinição enviado!'; })
        .catch(function(err) { loginError.style.color = ''; loginError.textContent = authErrorMessage(err); });
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', function() {
      if (auth) auth.signOut();
    });
  }

  function saveGames() {
    // Cache local instantâneo (funciona offline e evita tela vazia ao abrir)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(games));
    } catch (e) {
      console.error(e);
      showToast('Erro ao salvar localmente (talvez imagens muito grandes)', true);
    }
    // Fonte de verdade: nuvem (Firestore), acessível de qualquer dispositivo
    if (GAMES_DOC_REF) {
      GAMES_DOC_REF.set({ list: games, updatedAt: Date.now() }).catch(function(e) {
        console.error('Erro ao salvar na nuvem:', e);
        showToast('Salvo neste aparelho, mas falhou ao sincronizar com a nuvem', true);
      });
    }
  }

  function loadGames(onReady) {
    // 1) Carrega o cache local instantaneamente, para a tela nunca ficar vazia
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) games = parsed;
      }
    } catch (e) {
      console.error('loadGames (cache local) erro:', e);
    }

    if (games.length === 0) {
      games = DEFAULT_GAMES.map(function(g) {
        return {
          id: generateId(),
          name: g.name,
          version: g.version || '',
          cover: g.cover || '',
          password: g.password || '',
          featured: !!g.featured,
          links: g.links.slice()
        };
      });
    }

    if (onReady) onReady();

    // 2) Busca a versão da nuvem, que é a fonte de verdade entre dispositivos
    if (GAMES_DOC_REF) {
      GAMES_DOC_REF.get().then(function(doc) {
        if (doc.exists && Array.isArray(doc.data().list)) {
          games = doc.data().list;
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify(games)); } catch (e) {}
          if (onReady) onReady();
        } else {
          // Ainda não existe nada na nuvem: envia o que temos agora (local/padrão)
          saveGames();
        }
      }).catch(function(e) {
        console.error('Erro ao carregar da nuvem:', e);
        showToast('Sem conexão com a nuvem — mostrando dados salvos neste aparelho', true);
      });
    }
  }

  function favKey() {
    return FAVORITES_STORAGE_PREFIX + (currentUser ? currentUser.uid : 'local');
  }

  function isFavorite(id) {
    return favorites.indexOf(id) !== -1;
  }

  function loadFavorites(onReady) {
    favorites = [];
    try {
      var raw = localStorage.getItem(favKey());
      if (raw) {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) favorites = parsed;
      }
    } catch (e) {
      console.error('loadFavorites (cache local) erro:', e);
    }

    if (onReady) onReady();

    if (db && currentUser) {
      db.collection('favorites').doc(currentUser.uid).get().then(function(doc) {
        if (doc.exists && Array.isArray(doc.data().list)) {
          favorites = doc.data().list;
          try { localStorage.setItem(favKey(), JSON.stringify(favorites)); } catch (e) {}
          if (onReady) onReady();
        }
      }).catch(function(e) {
        console.error('Erro ao carregar favoritos da nuvem:', e);
        showToast('Não consegui ler os favoritos da nuvem (' + (e && e.code ? e.code : 'erro') + ')', true);
      });
    }
  }

  function saveFavorites() {
    try { localStorage.setItem(favKey(), JSON.stringify(favorites)); } catch (e) {}
    if (db && currentUser) {
      db.collection('favorites').doc(currentUser.uid).set({ list: favorites, updatedAt: Date.now() })
        .catch(function(e) {
          console.error('Erro ao salvar favoritos na nuvem:', e);
          showToast('Favorito NÃO sincronizou com a nuvem (' + (e && e.code ? e.code : 'erro') + ')', true);
        });
    }
  }

  function toggleFavorite(id) {
    var idx = favorites.indexOf(id);
    if (idx === -1) { favorites.push(id); saveFavorites(); return true; }
    favorites.splice(idx, 1);
    saveFavorites();
    return false;
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
    html +=     '<img src="' + safeCover + '" alt="Capa de ' + safeName + '" ' +
                     'onerror="this.onerror=null;this.src=\'' + FALLBACK_COVER + '\'">';
    if (isAdmin) html +=     '<div class="overlay-cover">' + icon('camera', 22) + '<span>Trocar capa</span></div>';
    if (game.featured) html += '<span class="card-badge card-badge-featured">' + icon('star', 12) + '<span>Destaque</span></span>';
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

    if (games.length === 0) counter.textContent = '';
    else if (term) counter.textContent = filtered.length + ' de ' + games.length + ' jogos';
    else counter.textContent = games.length + (games.length === 1 ? ' jogo salvo' : ' jogos salvos');

    if (filtered.length === 0) {
      if (games.length === 0) {
        carouselsContainer.innerHTML = '<div class="empty-state">' + icon('controller', 46) + '<h2>Nenhum jogo salvo ainda</h2><p>Clique em "Adicionar jogo" para começar.</p></div>';
      } else {
        carouselsContainer.innerHTML = '<div class="empty-state">' + icon('search', 46) + '<h2>Nenhum resultado para "' + escapeHtml(filter) + '"</h2><p>Tente outro termo.</p></div>';
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
        html +=     '<div class="cf-cover">';
        html +=       '<img src="' + safeCover + '" alt="' + safeName + '" ' +
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
    html +=     '<h2 class="carousel-title">' + icon('grid', 18) + '<span>' + (term ? 'Resultados' : 'Sua coleção') + '</span> <span class="count-pill">' + colecaoList.length + '</span></h2>';
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
        saveGames();
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
        games = games.filter(function(g) { return g.id !== id; });
        saveGames();
        renderGames(searchInput.value);
        showToast('Jogo removido');
      });
    }
  }

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
    html += '<span>' + (game.links ? game.links.length : 0) +
            ((game.links && game.links.length === 1) ? ' link disponível' : ' links disponíveis') + '</span>';
    html += '</div>';

    html += '<div class="links-list">';
    if (game.links && game.links.length) {
      game.links.forEach(function(link) {
        var safeLabel = escapeHtml(link.label || 'Link');
        var safeUrl = escapeAttr(link.url);
        var shortUrl = escapeHtml(truncateUrl(link.url));
        html += '<div class="link-item">' +
                  '<div class="info">' +
                    '<div class="label">' + safeLabel + '</div>' +
                    '<div class="url" title="' + safeUrl + '">' + shortUrl + '</div>' +
                  '</div>' +
                  '<div class="actions">' +
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
        saveGames();
        detailsModalOverlay.classList.remove('active');
        renderGames(searchInput.value);
        showToast(g.featured ? 'Adicionado aos destaques!' : 'Removido dos destaques');
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
    if (file.size > 2 * 1024 * 1024) {
      showToast('Imagem muito grande (máx 2MB)', true);
      return;
    }
    var reader = new FileReader();
    reader.onload = function(e) {
      pendingCoverData = e.target.result;
      coverPreview.src = pendingCoverData;
      coverPreview.style.display = 'block';
      coverUrlInput.value = '';
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
    saveGames();
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
    saveGames();
    renderGames(searchInput.value);
    closeCoverModal();
    showToast('Capa removida');
  });

  closeCoverBtn.addEventListener('click', closeCoverModal);
  coverModalOverlay.addEventListener('click', function(e) {
    if (e.target === coverModalOverlay) closeCoverModal();
  });

  function openModal() {
    modalOverlay.classList.add('active');
    gameForm.reset();
    setTimeout(function() { gameNameInput.focus(); }, 100);
  }
  function closeModal() { modalOverlay.classList.remove('active'); gameForm.reset(); }
  function openImportModal() {
    importModalOverlay.classList.add('active');
    importJsonTextarea.value = '';
    replaceAllCheckbox.checked = false;
    setTimeout(function() { importJsonTextarea.focus(); }, 100);
  }
  function closeImportModal() { importModalOverlay.classList.remove('active'); }

  function looksLikeNewUrl(str) {
    return /^https?:\/\//i.test(str) || /^www\./i.test(str) || /^data:/i.test(str) || /^capas\//i.test(str);
  }

  function findSeparatorIndex(line) {
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
        links: links
      });
    });
    if (validos.length === 0) { showToast('Nenhum jogo válido encontrado', true); return; }
    if (replaceAllCheckbox.checked) games = validos;
    else games = games.concat(validos);
    saveGames();
    renderGames(searchInput.value);
    closeImportModal();
    showToast(validos.length + ' jogos importados' + (invalidos ? ' (' + invalidos + ' ignorados)' : ''));
  }

  openModalBtn.addEventListener('click', openModal);
  closeModalBtn.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', function(e) { if (e.target === modalOverlay) closeModal(); });

  importBtn.addEventListener('click', openImportModal);
  closeImportBtn.addEventListener('click', closeImportModal);
  importModalOverlay.addEventListener('click', function(e) { if (e.target === importModalOverlay) closeImportModal(); });
  confirmImportBtn.addEventListener('click', importGames);

  detailsModalOverlay.addEventListener('click', function(e) {
    if (e.target === detailsModalOverlay) detailsModalOverlay.classList.remove('active');
  });

  exportBtn.addEventListener('click', exportGames);

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      if (modalOverlay.classList.contains('active')) closeModal();
      if (importModalOverlay.classList.contains('active')) closeImportModal();
      if (detailsModalOverlay.classList.contains('active')) detailsModalOverlay.classList.remove('active');
      if (coverModalOverlay.classList.contains('active')) closeCoverModal();
    }
  });

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

    games.push({
      id: generateId(),
      name: name, version: version, cover: cover, password: password, links: links,
      featured: gameFeaturedInput ? gameFeaturedInput.checked : false
    });
    saveGames();
    renderGames(searchInput.value);
    closeModal();
    showToast('Jogo adicionado' + (gameFeaturedInput && gameFeaturedInput.checked ? ' aos destaques' : ''));
  });

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
        currentUser = user;
        if (userEmailLabel) userEmailLabel.textContent = user.email || '';
        checkAdminStatus(user.uid).then(function(admin) {
          isAdmin = admin;
          setAdminUIVisible(isAdmin);
          showAppScreen();
          loadFavorites(function() {
            loadGames(function() { renderGames(searchInput.value); });
          });
        });
      } else {
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

})();