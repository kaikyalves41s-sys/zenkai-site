'use strict';
// ZENKAI — reportes e pedidos, histórico de alterações e painel de administração.
// (Arquivo carregado pelo index.html; compartilha funções e variáveis com os outros arquivos de js/.)

// ==================== Avisar link quebrado e pedir um jogo (usuários comuns) ====================

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

// ==================== Caixa de entrada do admin: reportes de links e pedidos de jogos ====================

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

// ==================== Histórico de alterações feitas pelos admins ====================

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

// ==================== Painel de administração: contas, promover admin, bloquear ====================

// ====== Painel de administradores ======
var admUsersCache = [];


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
(function() {
var admTabEls = document.querySelectorAll('.adm-tab');
for (var ati = 0; ati < admTabEls.length; ati++) {
  admTabEls[ati].addEventListener('click', function() { showAdmTab(this.getAttribute('data-adm-tab')); });
}
})();
admUsersList.addEventListener('click', function(e) {
  var blk = e.target.closest('[data-blk-uid]');
  if (blk) { setUserBlocked(blk.getAttribute('data-blk-uid'), blk.getAttribute('data-blk-email'), blk.getAttribute('data-blk-state') !== '1'); return; }
  var b = e.target.closest('[data-adm-uid]');
  if (!b) return;
  setUserAdmin(b.getAttribute('data-adm-uid'), b.getAttribute('data-adm-email'), b.getAttribute('data-adm-admin') !== '1');
});
