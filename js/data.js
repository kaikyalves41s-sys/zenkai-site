'use strict';
// ZENKAI — jogos e favoritos: leitura/gravação na nuvem (Firestore) e cache no aparelho.
// (Arquivo carregado pelo index.html; compartilha funções e variáveis com os outros arquivos de js/.)

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
