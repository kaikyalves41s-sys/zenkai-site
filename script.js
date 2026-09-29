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
  var GAMES_DOC_REF = null;   // documento antigo (só leitura, usado na migração)
  var GAMES_COL = null;       // coleção nova: um documento por jogo
  try {
    if (typeof firebase !== 'undefined' && firebaseConfig.apiKey !== 'SUA_API_KEY') {
      firebase.initializeApp(firebaseConfig);
      db = firebase.firestore();
      auth = firebase.auth();
      GAMES_DOC_REF = db.collection('zenkai').doc('games');
      GAMES_COL = db.collection('games');
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
  var sortMode = 'default';
  var regionFilter = '';
  var NEW_DAYS = 7; // por quantos dias o selo "Novo" aparece

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
  var gameModalTitle      = document.getElementById('gameModalTitle');
  var gameSaveBtn         = document.getElementById('gameSaveBtn');
  var editingGameId       = null;
  var editingKeepCover    = false;
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
  var authBox                  = document.getElementById('authBox');
  var verifyEmail              = document.getElementById('verifyEmail');
  var verifyMsg                = document.getElementById('verifyMsg');
  var verifyCheckBtn           = document.getElementById('verifyCheckBtn');
  var verifyResendBtn          = document.getElementById('verifyResendBtn');
  var verifyLogoutBtn          = document.getElementById('verifyLogoutBtn');
  var adminPanelBtn            = document.getElementById('adminPanelBtn');
  var adminModalOverlay        = document.getElementById('adminModalOverlay');
  var admUsersList             = document.getElementById('admUsersList');
  var admHistoryList           = document.getElementById('admHistoryList');
  var admHelp                  = document.getElementById('admHelp');
  var closeAdminBtn            = document.getElementById('closeAdminBtn');
  var admReportsList           = document.getElementById('admReportsList');
  var admRequestsList          = document.getElementById('admRequestsList');
  var admCountReports          = document.getElementById('admCountReports');
  var admCountRequests         = document.getElementById('admCountRequests');
  var adminDot                 = document.getElementById('adminDot');
  var sortSelect               = document.getElementById('sortSelect');
  var regionSelect             = document.getElementById('regionSelect');
  var requestBtn               = document.getElementById('requestBtn');
  var requestModalOverlay      = document.getElementById('requestModalOverlay');
  var requestForm              = document.getElementById('requestForm');
  var requestNameInput         = document.getElementById('requestName');
  var requestNoteInput         = document.getElementById('requestNote');
  var closeRequestBtn          = document.getElementById('closeRequestBtn');
  var dupHint                  = document.getElementById('dupHint');
  var admUsersTools            = document.getElementById('admUsersTools');
  var admUserSearch            = document.getElementById('admUserSearch');
  var admHistoryFilters        = document.getElementById('admHistoryFilters');
  var admHistUser              = document.getElementById('admHistUser');
  var admHistAction            = document.getElementById('admHistAction');

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
  ICON_PATHS.flag = '<path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/>';
  ICON_PATHS.edit = '<path d="M4 20h4l10.5-10.5a2.1 2.1 0 00-3-3L5 17z"/><path d="M13.5 8.5l3 3"/>';
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

  // Contas bloqueadas pelo painel ficam na coleção "blocked" (o servidor também nega a leitura pelas regras)
  function checkBlocked(uid) {
    if (!db) return Promise.resolve(false);
    return db.collection('blocked').doc(uid).get()
      .then(function(doc) { return doc.exists; })
      .catch(function() { return false; });
  }
  function blockedSignOut() {
    if (!auth) return;
    auth.signOut().then(function() {
      loginError.style.color = '';
      loginError.textContent = 'Esta conta foi bloqueada. Fale com um administrador.';
    });
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
        .then(function(cred) { sendVerification(cred.user); })
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

  // ====== Jogos na nuvem: um documento por jogo (coleção "games") ======
  var LEGACY_BASE_TIME = 1600000000000; // mantém a ordem dos jogos antigos na migração

  function cacheGamesLocal() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(games));
    } catch (e) {
      console.error(e);
      showToast('Erro ao salvar localmente (talvez imagens muito grandes)', true);
    }
  }
  function saveGames() { cacheGamesLocal(); }

  function gameToDoc(g) {
    return {
      name: g.name || '',
      version: g.version || '',
      cover: g.cover || '',
      password: g.password || '',
      featured: !!g.featured,
      links: g.links || [],
      createdAt: g.createdAt || Date.now(),
      updatedAt: Date.now(),
      updatedBy: currentUser ? (currentUser.email || '') : ''
    };
  }

  function cloudError(e) {
    console.error('Erro ao salvar na nuvem:', e);
    showToast('Salvo neste aparelho, mas falhou ao sincronizar com a nuvem (' + (e && e.code ? e.code : 'erro') + ')', true);
  }

  function saveGame(game) {
    cacheGamesLocal();
    if (GAMES_COL && game) GAMES_COL.doc(game.id).set(gameToDoc(game)).catch(cloudError);
  }

  function deleteGameDoc(id) {
    cacheGamesLocal();
    if (GAMES_COL) GAMES_COL.doc(id).delete().catch(cloudError);
  }

  // Grava/apaga vários documentos em lotes (limite do Firestore: 500 por lote)
  function batchWrite(ops) {
    if (!db || !ops.length) return Promise.resolve();
    var chunks = [];
    for (var i = 0; i < ops.length; i += 400) chunks.push(ops.slice(i, i + 400));
    return chunks.reduce(function(chain, chunk) {
      return chain.then(function() {
        var b = db.batch();
        chunk.forEach(function(op) {
          if (op.del) b.delete(GAMES_COL.doc(op.id)); else b.set(GAMES_COL.doc(op.id), op.data);
        });
        return b.commit();
      });
    }, Promise.resolve());
  }

  function saveManyGames(list, removeIds) {
    cacheGamesLocal();
    if (!GAMES_COL) return;
    var ops = (removeIds || []).map(function(id) { return { del: true, id: id }; });
    list.forEach(function(g) { ops.push({ id: g.id, data: gameToDoc(g) }); });
    batchWrite(ops).catch(cloudError);
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
      games = DEFAULT_GAMES.map(function(g, i) {
        return {
          id: generateId(),
          name: g.name,
          version: g.version || '',
          cover: g.cover || '',
          password: g.password || '',
          featured: !!g.featured,
          createdAt: LEGACY_BASE_TIME + i,
          links: g.links.slice()
        };
      });
    }

    if (onReady) onReady();

    // 2) Busca a versão da nuvem, que é a fonte de verdade entre dispositivos
    if (GAMES_COL) {
      function applyCloud(list) {
        games = list;
        cacheGamesLocal();
        if (onReady) onReady();
      }
      GAMES_COL.get().then(function(snap) {
        if (!snap.empty) {
          var list = [];
          snap.forEach(function(doc) { var g = doc.data(); g.id = doc.id; list.push(g); });
          list.sort(function(a, b) { return (a.createdAt || 0) - (b.createdAt || 0); });
          applyCloud(list);
          return;
        }
        // Coleção nova vazia: tenta o documento antigo (migração automática feita por um admin)
        return GAMES_DOC_REF.get().then(function(doc) {
          if (doc.exists && Array.isArray(doc.data().list)) {
            var legacy = doc.data().list.map(function(g, i) {
              if (!g.id) g.id = generateId();
              if (!g.createdAt) g.createdAt = LEGACY_BASE_TIME + i;
              return g;
            });
            applyCloud(legacy);
            if (isAdmin) {
              saveManyGames(legacy, []);
              showToast('Jogos migrados para o novo formato (' + legacy.length + ')');
            }
          } else if (isAdmin) {
            // Nada em lugar nenhum: envia o que temos agora (local/padrão)
            saveManyGames(games, []);
          }
        });
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
    html +=     '<img src="' + safeCover + '" alt="Capa de ' + safeName + '" ' +
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
  function openImportModal() {
    importModalOverlay.classList.add('active');
    importJsonTextarea.value = '';
    replaceAllCheckbox.checked = false;
    setTimeout(function() { importJsonTextarea.focus(); }, 100);
  }
  function closeImportModal() { importModalOverlay.classList.remove('active'); }

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

  sortSelect.addEventListener('change', function() { sortMode = this.value; renderGames(searchInput.value); });
  regionSelect.addEventListener('change', function() { regionFilter = this.value; renderGames(searchInput.value); });

  searchInput.addEventListener('input', function(e) { renderGames(e.target.value); });
  clearSearchBtn.addEventListener('click', function() {
    searchInput.value = ''; renderGames(''); searchInput.focus();
  });

  // ====== Verificação de email ======
  // Admins entram sempre (evita trancar contas antigas); os demais precisam confirmar o email.
  function setVerifyMsg(text, ok) {
    verifyMsg.style.color = ok ? '#8aff9a' : '';
    verifyMsg.textContent = text;
  }

  function startResendCooldown() {
    var left = 60;
    clearInterval(startResendCooldown._t);
    verifyResendBtn.disabled = true;
    verifyResendBtn.textContent = 'Reenviar em ' + left + 's';
    startResendCooldown._t = setInterval(function() {
      left--;
      if (left <= 0) {
        clearInterval(startResendCooldown._t);
        verifyResendBtn.disabled = false;
        verifyResendBtn.textContent = 'Reenviar email';
      } else {
        verifyResendBtn.textContent = 'Reenviar em ' + left + 's';
      }
    }, 1000);
  }

  function sendVerification(user) {
    return user.sendEmailVerification()
      .then(function() { setVerifyMsg('Email enviado! Olhe também a caixa de spam.', true); startResendCooldown(); })
      .catch(function(err) { setVerifyMsg(authErrorMessage(err)); });
  }

  function showVerifyScreen(user) {
    showAuthScreen();
    verifyEmail.textContent = user.email || '';
    authBox.classList.add('is-verify');
  }

  function registerUser(user) {
    // Guarda o email no Firestore para o painel de admin conseguir listar as contas
    if (!db) return;
    db.collection('users').doc(user.uid).set({
      email: user.email || '',
      createdAt: Date.parse(user.metadata && user.metadata.creationTime) || Date.now(),
      lastLogin: Date.now()
    }, { merge: true }).catch(function(e) { console.warn('Não registrou usuário:', e); });
  }

  function handleUser(user) {
    currentUser = user;
    if (userEmailLabel) userEmailLabel.textContent = user.email || '';
    var fresh = user.emailVerified ? Promise.resolve() :
      user.reload().then(function() { return user.emailVerified ? user.getIdToken(true) : null; }).catch(function() {});
    return fresh.then(function() { return Promise.all([checkAdminStatus(user.uid), checkBlocked(user.uid)]); }).then(function(res) {
      var admin = res[0];
      if (res[1] && !admin) { blockedSignOut(); return; }
      if (!admin && !user.emailVerified) { showVerifyScreen(user); return; }
      isAdmin = admin;
      authBox.classList.remove('is-verify');
      setAdminUIVisible(isAdmin);
      showAppScreen();
      registerUser(user);
      if (isAdmin) refreshAdminBadge();
      loadFavorites(function() {
        loadGames(function() { renderGames(searchInput.value); });
      });
    });
  }

  verifyCheckBtn.addEventListener('click', function() {
    var u = auth && auth.currentUser;
    if (!u) return;
    setVerifyMsg('');
    handleUser(u).then(function() {
      if (!u.emailVerified && !isAdmin) setVerifyMsg('Ainda não confirmado. Clique no link do email e tente de novo.');
    });
  });
  verifyResendBtn.addEventListener('click', function() { if (auth && auth.currentUser) sendVerification(auth.currentUser); });
  verifyLogoutBtn.addEventListener('click', function() { if (auth) auth.signOut(); });

  // ====== Reportar link quebrado ======
  function reportedKey() { return 'zenkai_reported_' + (currentUser ? currentUser.uid : 'local'); }
  function getReported() { try { return JSON.parse(localStorage.getItem(reportedKey()) || '[]'); } catch (e) { return []; } }
  function isReported(gameId, url) { return getReported().indexOf(gameId + '|' + url) !== -1; }
  function markReported(gameId, url) {
    var l = getReported(); l.push(gameId + '|' + url);
    try { localStorage.setItem(reportedKey(), JSON.stringify(l)); } catch (e) {}
  }

  function reportLink(game, link, btn) {
    if (!link) return;
    if (!db || !currentUser) { showToast('Reporte indisponível no momento', true); return; }
    if (isReported(game.id, link.url)) { showToast('Você já avisou sobre este link. Obrigado!'); return; }
    if (!confirm('Avisar os administradores que este link está quebrado?\n\n' + (link.label || 'Link'))) return;
    db.collection('reports').add({
      gameId: game.id, gameName: game.name || '', linkLabel: link.label || 'Link', linkUrl: link.url,
      uid: currentUser.uid, email: currentUser.email || '', at: Date.now()
    }).then(function() {
      markReported(game.id, link.url);
      if (btn) btn.classList.add('is-reported');
      showToast('Obrigado! Avisamos os administradores.');
      refreshAdminBadge();
    }).catch(function(e) {
      showToast('Não foi possível enviar o aviso (' + (e && e.code ? e.code : 'erro') + ')', true);
    });
  }

  // ====== Pedir um jogo ======
  function openRequestModal(prefill) {
    requestNameInput.value = prefill || '';
    requestNoteInput.value = '';
    requestModalOverlay.classList.add('active');
    setTimeout(function() { (prefill ? requestNoteInput : requestNameInput).focus(); }, 100);
  }
  function closeRequestModal() { requestModalOverlay.classList.remove('active'); }

  requestBtn.addEventListener('click', function() { openRequestModal(''); });
  closeRequestBtn.addEventListener('click', closeRequestModal);
  requestModalOverlay.addEventListener('click', function(e) { if (e.target === requestModalOverlay) closeRequestModal(); });
  document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeRequestModal(); });

  requestForm.addEventListener('submit', function(e) {
    e.preventDefault();
    var name = requestNameInput.value.trim();
    var note = requestNoteInput.value.trim();
    if (!name) return;
    if (!db || !currentUser) { showToast('Pedidos indisponíveis no momento', true); return; }
    var exists = games.some(function(g) { return (g.name || '').trim().toLowerCase() === name.toLowerCase(); });
    if (exists) { showToast('Esse jogo já está na coleção', true); return; }
    var last = parseInt(localStorage.getItem('zenkai_last_request') || '0', 10);
    if (Date.now() - last < 30000) { showToast('Aguarde alguns segundos para fazer outro pedido', true); return; }
    db.collection('requests').add({
      name: name, note: note, uid: currentUser.uid, email: currentUser.email || '', at: Date.now()
    }).then(function() {
      try { localStorage.setItem('zenkai_last_request', String(Date.now())); } catch (err) {}
      closeRequestModal();
      showToast('Pedido enviado! Obrigado.');
      refreshAdminBadge();
    }).catch(function(err) {
      showToast('Não foi possível enviar o pedido (' + (err && err.code ? err.code : 'erro') + ')', true);
    });
  });

  // ====== Caixa de entrada do admin (reportes + pedidos) ======
  var inbox = { reports: [], requests: [] };
  var shownGroups = { reports: [], requests: [] };

  function fetchInbox() {
    return Promise.all(['reports', 'requests'].map(function(c) {
      return db.collection(c).orderBy('at', 'desc').limit(300).get().then(function(snap) {
        var l = [];
        snap.forEach(function(d) { var r = d.data(); r._id = d.id; l.push(r); });
        return l;
      });
    })).then(function(res) {
      inbox.reports = res[0]; inbox.requests = res[1];
      updateInboxCounts();
    });
  }

  // Junta avisos iguais (mesmo jogo + link, ou mesmo nome de jogo) numa linha só
  function groupInbox(list, keyFn) {
    var map = {}, out = [];
    list.forEach(function(r) {
      var k = keyFn(r);
      if (!map[k]) { map[k] = { first: r, ids: [], uids: {}, people: 0, notes: [], last: r.at }; out.push(map[k]); }
      var g = map[k];
      g.ids.push(r._id);
      if (!g.uids[r.uid]) { g.uids[r.uid] = 1; g.people++; }
      if (r.note && g.notes.indexOf(r.note) === -1) g.notes.push(r.note);
      if (r.at > g.last) g.last = r.at;
    });
    return out;
  }
  function reportGroups()  { return groupInbox(inbox.reports,  function(r) { return r.gameId + '|' + r.linkUrl; }); }
  function requestGroups() { return groupInbox(inbox.requests, function(r) { return (r.name || '').trim().toLowerCase(); }); }

  function updateInboxCounts() {
    var nr = reportGroups().length, nq = requestGroups().length;
    admCountReports.textContent = nr || '';
    admCountRequests.textContent = nq || '';
    adminDot.style.display = (nr + nq) ? 'block' : 'none';
  }
  function refreshAdminBadge() {
    if (!isAdmin || !db) return;
    fetchInbox().catch(function(e) { console.warn('Não carregou reportes/pedidos:', e); });
  }
  function fmtWhen(t) {
    return new Date(t).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }
  function peopleLabel(g) { return g.people + (g.people === 1 ? ' pessoa' : ' pessoas'); }

  function renderReports() {
    var groups = shownGroups.reports = reportGroups();
    if (!groups.length) { admReportsList.innerHTML = '<p class="help-text">Nenhum link reportado.</p>'; return; }
    admReportsList.innerHTML = groups.map(function(g, i) {
      var r = g.first;
      var exists = games.some(function(x) { return x.id === r.gameId; });
      return '<div class="adm-row col"><div class="adm-what"><b>' + escapeHtml(r.gameName) + '</b> — ' + escapeHtml(r.linkLabel) +
             '<br><span class="adm-date">' + escapeHtml(truncateUrl(r.linkUrl)) + '</span>' +
             '<br><span class="adm-date">' + peopleLabel(g) + ' avisou · último em ' + escapeHtml(fmtWhen(g.last)) + '</span></div>' +
             '<div class="adm-actions">' +
             (exists ? '<button type="button" class="btn-secondary adm-btn" data-rep-open="' + i + '">Ver jogo</button>' : '') +
             '<button type="button" class="btn-save adm-btn" data-rep-done="' + i + '">Resolvido</button></div></div>';
    }).join('');
  }

  function renderRequests() {
    var groups = shownGroups.requests = requestGroups();
    if (!groups.length) { admRequestsList.innerHTML = '<p class="help-text">Nenhum pedido no momento.</p>'; return; }
    admRequestsList.innerHTML = groups.map(function(g, i) {
      var r = g.first;
      return '<div class="adm-row col"><div class="adm-what"><b>' + escapeHtml(r.name) + '</b>' +
             (g.notes.length ? '<br>' + escapeHtml(g.notes.slice(0, 2).join(' · ')) : '') +
             '<br><span class="adm-date">' + peopleLabel(g) + ' · ' + escapeHtml(r.email || '') + ' · ' + escapeHtml(fmtWhen(g.last)) + '</span></div>' +
             '<div class="adm-actions">' +
             '<button type="button" class="btn-secondary adm-btn" data-req-add="' + i + '">Adicionar</button>' +
             '<button type="button" class="btn-save adm-btn" data-req-done="' + i + '">Concluído</button></div></div>';
    }).join('');
  }

  function resolveGroup(kind, idx) {
    var g = shownGroups[kind][idx];
    if (!g || !isAdmin) return;
    var col = kind === 'reports' ? 'reports' : 'requests';
    Promise.all(g.ids.map(function(id) { return db.collection(col).doc(id).delete(); })).then(function() {
      var gone = {}; g.ids.forEach(function(id) { gone[id] = 1; });
      inbox[col] = inbox[col].filter(function(r) { return !gone[r._id]; });
      logHistory(kind === 'reports' ? 'report_done' : 'request_done',
        { game: kind === 'reports' ? g.first.gameName : g.first.name, detail: kind === 'reports' ? g.first.linkLabel : '' });
      updateInboxCounts();
      if (kind === 'reports') renderReports(); else renderRequests();
      showToast('Marcado como concluído');
    }).catch(function(e) {
      showToast('Não foi possível concluir (' + (e && e.code ? e.code : 'erro') + ')', true);
    });
  }

  admReportsList.addEventListener('click', function(e) {
    var o = e.target.closest('[data-rep-open]'), d = e.target.closest('[data-rep-done]');
    if (o) {
      var g = shownGroups.reports[parseInt(o.getAttribute('data-rep-open'), 10)];
      if (g) { adminModalOverlay.classList.remove('active'); openDetails(g.first.gameId); }
    } else if (d) resolveGroup('reports', parseInt(d.getAttribute('data-rep-done'), 10));
  });
  admRequestsList.addEventListener('click', function(e) {
    var a = e.target.closest('[data-req-add]'), d = e.target.closest('[data-req-done]');
    if (a) {
      var g = shownGroups.requests[parseInt(a.getAttribute('data-req-add'), 10)];
      if (g) { adminModalOverlay.classList.remove('active'); openModal(); gameNameInput.value = g.first.name; }
    } else if (d) resolveGroup('requests', parseInt(d.getAttribute('data-req-done'), 10));
  });

  // ====== Histórico de alterações ======
  function logHistory(action, extra) {
    if (!db || !currentUser) return;
    var rec = { action: action, uid: currentUser.uid, email: currentUser.email || '', at: Date.now() };
    for (var k in extra) if (extra[k] !== undefined && extra[k] !== null) rec[k] = String(extra[k]);
    db.collection('history').add(rec).catch(function(e) { console.error('Histórico não salvo:', e); });
  }

  var ACTION_LABELS = {
    add: 'adicionou', remove: 'removeu', import: 'importou', feature: 'destacou',
    unfeature: 'tirou dos destaques', cover: 'trocou a capa de', edit: 'editou',
    promote: 'promoveu a admin', demote: 'removeu de admin',
    report_done: 'resolveu o reporte de', request_done: 'concluiu o pedido de', block: 'bloqueou a conta', unblock: 'desbloqueou a conta'
  };

  var HISTORY_KEEP_DAYS = 90;   // registros mais velhos que isso são apagados automaticamente
  var histAll = [];

  // Apaga registros antigos (no máximo uma vez a cada 12 h por aparelho). Falhar aqui nunca trava o painel.
  function purgeOldHistory() {
    var last = parseInt(localStorage.getItem('zenkai_hist_purge') || '0', 10);
    if (Date.now() - last < 12 * 3600000) return Promise.resolve(0);
    var cutoff = Date.now() - HISTORY_KEEP_DAYS * 86400000;
    var total = 0;
    function round(n) {
      return db.collection('history').where('at', '<', cutoff).limit(400).get().then(function(snap) {
        if (snap.empty) return;
        var b = db.batch();
        snap.forEach(function(d) { b.delete(d.ref); });
        return b.commit().then(function() {
          total += snap.size;
          if (snap.size === 400 && n < 5) return round(n + 1);
        });
      });
    }
    return round(0).then(function() {
      try { localStorage.setItem('zenkai_hist_purge', String(Date.now())); } catch (e) {}
      return total;
    }).catch(function(e) { console.warn('Limpeza do histórico falhou:', e); return 0; });
  }

  function fillSelect(sel, items, allLabel) {
    var cur = sel.value;
    sel.innerHTML = '<option value="">' + allLabel + '</option>' + items.map(function(i) {
      return '<option value="' + escapeAttr(i.v) + '">' + escapeHtml(i.l) + '</option>';
    }).join('');
    sel.value = cur;
  }

  function fillHistoryFilters() {
    var people = {}, acts = {};
    histAll.forEach(function(r) { if (r.email) people[r.email] = 1; if (r.action) acts[r.action] = 1; });
    fillSelect(admHistUser, Object.keys(people).sort().map(function(e) { return { v: e, l: e }; }), 'Todas as pessoas');
    fillSelect(admHistAction, Object.keys(acts).map(function(a) {
      var l = ACTION_LABELS[a] || a;
      return { v: a, l: l.charAt(0).toUpperCase() + l.slice(1) };
    }).sort(function(x, y) { return x.l.localeCompare(y.l, 'pt-BR'); }), 'Todas as ações');
  }

  function renderHistory() {
    var u = admHistUser.value, a = admHistAction.value;
    var list = histAll.filter(function(r) { return (!u || r.email === u) && (!a || r.action === a); });
    if (!histAll.length) { admHistoryList.innerHTML = '<p class="help-text">Nenhuma alteração registrada ainda.</p>'; return; }
    var html = '<p class="help-text" style="margin:0;">Mostrando ' + list.length + ' de ' + histAll.length + ' registros</p>';
    if (!list.length) html += '<p class="help-text">Nenhum registro com esses filtros.</p>';
    list.forEach(function(r) {
      var target = r.game || r.detail || '';
      var extra = (r.game && r.detail) ? ' <span class="adm-date">(' + escapeHtml(r.detail) + ')</span>' : '';
      html += '<div class="adm-row hist"><div class="adm-what"><b>' + escapeHtml(r.email) + '</b> ' +
              escapeHtml(ACTION_LABELS[r.action] || r.action) + ' <b>' + escapeHtml(target) + '</b>' + extra +
              '</div><span class="adm-date">' + escapeHtml(fmtWhen(r.at)) + '</span></div>';
    });
    admHistoryList.innerHTML = html;
  }

  function loadHistory() {
    admHistoryList.innerHTML = '<p class="help-text">Carregando...</p>';
    purgeOldHistory().then(function(n) {
      if (n) showToast(n + ' registros antigos apagados do histórico');
      return db.collection('history').orderBy('at', 'desc').limit(300).get();
    }).then(function(snap) {
      histAll = [];
      snap.forEach(function(doc) { histAll.push(doc.data()); });
      fillHistoryFilters();
      renderHistory();
    }).catch(function(e) {
      admHistoryList.innerHTML = '<p class="help-text">Não foi possível ler o histórico (' + escapeHtml(e && e.code ? e.code : 'erro') + '). Confira as regras do Firestore.</p>';
    });
  }

  // ====== Painel de administradores ======
  var admUsersCache = [];

  function fmtDate(t) { return new Date(t).toLocaleDateString('pt-BR'); }

  function loadAdminUsers() {
    admUsersList.innerHTML = '<p class="help-text">Carregando...</p>';
    Promise.all([
      db.collection('users').get(),
      db.collection('admins').get(),
      db.collection('blocked').get().catch(function() { return null; })
    ]).then(function(res) {
      var adminIds = {}, blockedIds = {};
      res[1].forEach(function(d) { adminIds[d.id] = true; });
      if (res[2]) res[2].forEach(function(d) { blockedIds[d.id] = d.data().email || ''; });
      var users = [];
      res[0].forEach(function(d) {
        var x = d.data();
        users.push({ uid: d.id, email: x.email || d.id, createdAt: x.createdAt || 0, lastLogin: x.lastLogin || 0,
                     admin: !!adminIds[d.id], blocked: blockedIds.hasOwnProperty(d.id) });
      });
      Object.keys(adminIds).forEach(function(id) {
        if (!users.some(function(u) { return u.uid === id; })) users.push({ uid: id, email: 'Admin sem email registrado (' + id.slice(0, 6) + '…)', createdAt: 0, lastLogin: 0, admin: true, blocked: false });
      });
      Object.keys(blockedIds).forEach(function(id) {
        if (!users.some(function(u) { return u.uid === id; })) users.push({ uid: id, email: blockedIds[id] || id, createdAt: 0, lastLogin: 0, admin: false, blocked: true });
      });
      // admins primeiro, depois bloqueadas, depois as mais recentes (facilita achar spam novo)
      users.sort(function(a, b) {
        return (b.admin - a.admin) || (b.blocked - a.blocked) || ((b.createdAt || 0) - (a.createdAt || 0)) || a.email.localeCompare(b.email);
      });
      admUsersCache = users;
      renderAdminUsers();
    }).catch(function(e) {
      admUsersList.innerHTML = '<p class="help-text">Não foi possível ler as contas (' + escapeHtml(e && e.code ? e.code : 'erro') + '). Confira as regras do Firestore.</p>';
    });
  }

  function renderAdminUsers() {
    var q = (admUserSearch.value || '').trim().toLowerCase();
    var list = admUsersCache.filter(function(u) { return !q || u.email.toLowerCase().indexOf(q) !== -1; });
    var html = '';
    list.forEach(function(u) {
      var me = currentUser && u.uid === currentUser.uid;
      var dates = [];
      if (u.createdAt) dates.push('criada em ' + fmtDate(u.createdAt));
      if (u.lastLogin) dates.push('último acesso ' + fmtWhen(u.lastLogin));
      var btns = '';
      if (!me) {
        btns += '<button type="button" class="btn-secondary adm-btn" data-adm-uid="' + escapeAttr(u.uid) + '" data-adm-email="' + escapeAttr(u.email) + '" data-adm-admin="' + (u.admin ? '1' : '0') + '">' +
                (u.admin ? 'Remover admin' : 'Promover') + '</button>';
        if (!u.admin) {
          btns += '<button type="button" class="' + (u.blocked ? 'btn-secondary' : 'btn-danger') + ' adm-btn" data-blk-uid="' + escapeAttr(u.uid) + '" data-blk-email="' + escapeAttr(u.email) + '" data-blk-state="' + (u.blocked ? '1' : '0') + '">' +
                  (u.blocked ? 'Desbloquear' : 'Bloquear') + '</button>';
        }
      }
      html += '<div class="adm-row col"><div class="adm-what"><b>' + escapeHtml(u.email) + '</b> ' +
              (me ? '<span class="adm-date">você</span> ' : '') +
              (u.admin ? '<span class="admin-pill" style="display:inline-flex;">ADMIN</span>' : '') +
              (u.blocked ? '<span class="blocked-pill">BLOQUEADA</span>' : '') +
              (dates.length ? '<br><span class="adm-date">' + escapeHtml(dates.join(' · ')) + '</span>' : '') +
              '</div>' + (btns ? '<div class="adm-actions">' + btns + '</div>' : '') + '</div>';
    });
    admUsersList.innerHTML = html || '<p class="help-text">' + (q ? 'Nenhuma conta encontrada.' : 'Nenhuma conta registrada ainda.') + '</p>';
  }

  // Remove avisos e pedidos que uma conta bloqueada deixou na caixa de entrada
  function purgeUserContent(uid) {
    ['reports', 'requests'].forEach(function(col) {
      db.collection(col).where('uid', '==', uid).limit(400).get().then(function(snap) {
        if (snap.empty) return;
        var b = db.batch();
        snap.forEach(function(d) { b.delete(d.ref); });
        return b.commit().then(function() { refreshAdminBadge(); });
      }).catch(function(e) { console.warn('Não limpou ' + col + ' da conta bloqueada:', e); });
    });
  }

  function setUserBlocked(uid, email, block) {
    if (!isAdmin) return;
    var msg = block ? 'Bloquear ' + email + '?\n\nA conta deixa de ver a coleção e de enviar avisos ou pedidos. Os avisos e pedidos que ela já enviou serão apagados.'
                    : 'Desbloquear ' + email + '?';
    if (!confirm(msg)) return;
    var ref = db.collection('blocked').doc(uid);
    var p = block ? ref.set({ email: email, by: currentUser.email || '', at: Date.now() }) : ref.delete();
    p.then(function() {
      logHistory(block ? 'block' : 'unblock', { detail: email });
      if (block) purgeUserContent(uid);
      showToast(block ? 'Conta bloqueada' : 'Conta desbloqueada');
      loadAdminUsers();
    }).catch(function(e) {
      showToast('Não foi possível alterar (' + (e && e.code ? e.code : 'erro') + ')', true);
    });
  }

  function setUserAdmin(uid, email, makeAdmin) {
    if (!isAdmin) return;
    var msg = makeAdmin ? 'Promover ' + email + ' a administrador?\nEssa pessoa poderá adicionar, remover e editar jogos e promover outros admins.'
                        : 'Remover o acesso de administrador de ' + email + '?';
    if (!confirm(msg)) return;
    var ref = db.collection('admins').doc(uid);
    var p = makeAdmin ? ref.set({ email: email, promotedBy: currentUser.email || '', at: Date.now() }) : ref.delete();
    p.then(function() {
      logHistory(makeAdmin ? 'promote' : 'demote', { detail: email });
      showToast(makeAdmin ? 'Administrador adicionado' : 'Administrador removido');
      loadAdminUsers();
    }).catch(function(e) {
      showToast('Não foi possível alterar (' + (e && e.code ? e.code : 'erro') + ')', true);
    });
  }

  var ADM_HELP = {
    admins: 'Contas que já entraram no site. Promover dá acesso de admin. Bloquear impede a conta de ver a coleção e apaga os avisos e pedidos dela.',
    reports: 'Links que os usuários marcaram como quebrados. Corrija o link no jogo e clique em Resolvido.',
    requests: 'Jogos que os usuários pediram. "Adicionar" abre o formulário já com o nome; depois marque como concluído.',
    history: 'Últimas alterações feitas pelos admins. Registros com mais de ' + HISTORY_KEEP_DAYS + ' dias são apagados automaticamente.'
  };
  function showAdmTab(tab) {
    var tabs = document.querySelectorAll('.adm-tab');
    for (var i = 0; i < tabs.length; i++) tabs[i].classList.toggle('active', tabs[i].getAttribute('data-adm-tab') === tab);
    var lists = { admins: admUsersList, history: admHistoryList, reports: admReportsList, requests: admRequestsList };
    for (var k in lists) lists[k].style.display = k === tab ? '' : 'none';
    admUsersTools.style.display = tab === 'admins' ? '' : 'none';
    admHistoryFilters.style.display = tab === 'history' ? 'flex' : 'none';
    admHelp.textContent = ADM_HELP[tab];
    admHelp.style.display = ADM_HELP[tab] ? '' : 'none';
    if (tab === 'admins') loadAdminUsers();
    else if (tab === 'history') loadHistory();
    else {
      var box = lists[tab];
      box.innerHTML = '<p class="help-text">Carregando...</p>';
      fetchInbox().then(function() { if (tab === 'reports') renderReports(); else renderRequests(); })
        .catch(function(e) {
          box.innerHTML = '<p class="help-text">Não foi possível ler (' + escapeHtml(e && e.code ? e.code : 'erro') + '). Confira as regras do Firestore.</p>';
        });
    }
  }
  admUserSearch.addEventListener('input', renderAdminUsers);
  admHistUser.addEventListener('change', renderHistory);
  admHistAction.addEventListener('change', renderHistory);

  adminPanelBtn.addEventListener('click', function() {
    if (!isAdmin || !db) return;
    adminModalOverlay.classList.add('active');
    showAdmTab('admins');
  });
  closeAdminBtn.addEventListener('click', function() { adminModalOverlay.classList.remove('active'); });
  adminModalOverlay.addEventListener('click', function(e) { if (e.target === adminModalOverlay) adminModalOverlay.classList.remove('active'); });
  document.addEventListener('keydown', function(e) { if (e.key === 'Escape') adminModalOverlay.classList.remove('active'); });
  var admTabEls = document.querySelectorAll('.adm-tab');
  for (var ati = 0; ati < admTabEls.length; ati++) {
    admTabEls[ati].addEventListener('click', function() { showAdmTab(this.getAttribute('data-adm-tab')); });
  }
  admUsersList.addEventListener('click', function(e) {
    var blk = e.target.closest('[data-blk-uid]');
    if (blk) { setUserBlocked(blk.getAttribute('data-blk-uid'), blk.getAttribute('data-blk-email'), blk.getAttribute('data-blk-state') !== '1'); return; }
    var b = e.target.closest('[data-adm-uid]');
    if (!b) return;
    setUserAdmin(b.getAttribute('data-adm-uid'), b.getAttribute('data-adm-email'), b.getAttribute('data-adm-admin') !== '1');
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

})();