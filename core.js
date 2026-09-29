'use strict';
// ZENKAI — configuração do Firebase/App Check, estado do app, referências aos elementos e funções de apoio.
// (Arquivo carregado pelo index.html; compartilha funções e variáveis com os outros arquivos de js/.)

// ==================== Configuração do Firebase (com App Check) e variáveis de estado do app ====================

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

// ====== Firebase App Check ======
// Cole aqui a "chave do site" (pública) do reCAPTCHA Enterprise criada para o ZENKAI (reCAPTCHA Enterprise / Fraud Defense).
// Enquanto estiver como 'COLE_A_CHAVE_DO_SITE_AQUI' o App Check fica desligado e o site funciona como antes.
var APPCHECK_SITE_KEY = '6Ldt1dQtAAAAAHkMuFjEv6CdAw0vt1Z2inxsHFnI';
var APPCHECK_ATIVO = !!APPCHECK_SITE_KEY && APPCHECK_SITE_KEY.indexOf('COLE_') !== 0;

var db = null;
var auth = null;
var GAMES_DOC_REF = null;   // documento antigo (só leitura, usado na migração)
var GAMES_COL = null;       // coleção nova: um documento por jogo
try {
  if (typeof firebase !== 'undefined' && firebaseConfig.apiKey !== 'SUA_API_KEY') {
    firebase.initializeApp(firebaseConfig);

  // App Check: faz o Firebase aceitar chamadas só vindas do SEU site (veja APPCHECK_SITE_KEY acima).
  if (APPCHECK_ATIVO && typeof firebase.appCheck === 'function') {
    // Testando no seu computador: usa um token de depuração (o console do navegador mostra o token
    // na primeira vez; cadastre-o em Firebase > App Check > Apps > Gerenciar tokens de depuração).
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
      self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    }
    firebase.appCheck().activate(
      new firebase.appCheck.ReCaptchaEnterpriseProvider(APPCHECK_SITE_KEY),
      true
    );
  }

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

var games = [];
var currentCoverGameId = null;
var pendingCoverData = null;
var featuredIndex = 0;
var activeTab = 'destaque';
var sortMode = 'default';
var regionFilter = '';
var NEW_DAYS = 7; // por quantos dias o selo "Novo" aparece

// ==================== Jogos de exemplo, usados só quando não há nada salvo (nuvem nem aparelho) ====================

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

// ==================== Referências aos elementos do index.html ====================

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

// ==================== Funções de apoio: ids, escape de HTML, ícones, aviso (toast), datas ====================

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

function fmtWhen(t) {
  return new Date(t).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}
function fmtDate(t) { return new Date(t).toLocaleDateString('pt-BR'); }
