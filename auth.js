'use strict';
// ZENKAI — login, cadastro, verificação de email e controle de quem é admin/bloqueado.
// (Arquivo carregado pelo index.html; compartilha funções e variáveis com os outros arquivos de js/.)

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

(function() {
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
})();

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
