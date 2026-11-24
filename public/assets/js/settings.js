/* Grand Sirenis Locker App · Configuración · Modo sin conexión, borradores y sincronización.
   Datos sensibles: ninguno. Sin contraseñas, tokens ni credenciales en IndexedDB. */
(() => {
  'use strict';

  const ICON = (name, cls = '') => `<svg class="icon ${cls}" aria-hidden="true" focusable="false"><use href="assets/icons/lucide-sprite.svg#${name}"></use></svg>`;
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const csrfMeta = document.querySelector('meta[name="csrf-token"]');
const csrf = csrfMeta ? csrfMeta.content : '';
  const API = 'api.php';
  const API_TIMEOUT = 8000;
  const channel = ('BroadcastChannel' in window) ? new BroadcastChannel('sirenis-locker') : null;

  function broadcastDrafts() {
    if (channel) channel.postMessage({ type: 'drafts' });
  }

  if (channel) {
    channel.addEventListener('message', e => {
      const msg = e.data || {};
      if (msg.type === 'drafts') { loadDrafts().catch(() => {}); return; }
      if (msg.type === 'serverStatus') { connectionState = msg.status; render(); return; }
      if (msg.type === 'data') { checkConnection().catch(() => {}); }
    });
  }

  /* ── IndexedDB: borradores locales (solo datos operativos, sin datos personales) ── */
  const DB_NAME = 'locker_drafts';
  const STORE_NAME = 'drafts';
  const DB_VERSION = 1;
  let idb = null;

  function idbOpen() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
          store.createIndex('user', 'user', { unique: false });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function idbGetDrafts(user) {
    if (!idb) idb = await idbOpen();
    return new Promise((resolve, reject) => {
      const tx = idb.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('user');
      const req = index.getAll(IDBKeyRange.only(user));
      req.onsuccess = () => resolve(req.result.filter(d => d.user === user).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      req.onerror = () => reject(req.error);
    });
  }

  async function idbAddDraft(draft) {
    if (!idb) idb = await idbOpen();
    return new Promise((resolve, reject) => {
      const tx = idb.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.add(draft);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function idbRemoveDraft(id) {
    if (!idb) idb = await idbOpen();
    return new Promise((resolve, reject) => {
      const tx = idb.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async function idbClearAll() {
    if (!idb) idb = await idbOpen();
    return new Promise((resolve, reject) => {
      const tx = idb.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  /* ── Estado de conexión ── */
  // Estados: 'checking', 'connected', 'no-server', 'no-mysql'
  let connectionState = 'checking';
  let serverLockers = []; // snapshot del servidor para detección de conflictos
  let serverTime = '';

  async function fetchJson(resource, opts = {}) {
    const headers = { Accept: 'application/json', ...opts.headers };
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), API_TIMEOUT);
    let res;
    try {
      res = await fetch(`${API}?resource=${encodeURIComponent(resource)}`, {
        credentials: 'same-origin',
        cache: 'no-store',
        headers,
        signal: controller.signal,
        ...opts
      });
    } catch (_) {
      return { ok: false, error: 'network' };
    } finally {
      clearTimeout(timeout);
    }
    if (res.status === 401) { window.location.href = 'login.php'; return { ok: false, error: 'auth' }; }
    let d;
    try { d = await res.json(); } catch (_) { return { ok: false, error: 'invalid' }; }
    return { ok: res.ok && d.ok, status: res.status, data: d };
  }

  async function checkConnection() {
    // Paso 1: ¿Está disponible PHP?
    const ping = await fetchJson('ping', { headers: { 'X-CSRF-Token': csrf } });
    if (ping.error === 'network' || !ping.ok) {
      connectionState = 'no-server';
      return;
    }
    // Paso 2: ¿Está disponible MySQL?
    const boot = await fetchJson('bootstrap', { headers: { 'X-CSRF-Token': csrf } });
    if (boot.error === 'network') {
      connectionState = 'no-server';
      return;
    }
    if (!boot.ok && boot.status === 503) {
      connectionState = 'no-mysql';
      return;
    }
    if (!boot.ok) {
      connectionState = 'no-server';
      return;
    }
    connectionState = 'connected';
    serverLockers = boot.data.lockers || [];
    serverTime = boot.data.serverTime || '';
  }

  /* ── Borradores ── */
  let currentUser = null;
  let offlineEnabled = false;
  let drafts = [];
  let syncStatus = 'idle'; // idle, syncing, conflict, done
  let syncConflicts = [];
  let syncResultsData = [];
  let persistentStorage = 'checking';
  let container = null;
  let checkTimer = null;

  function handleOffline() {
    connectionState = 'no-server';
    render();
  }

  function handleVisibilityChange() {
    if (document.hidden) {
      if (checkTimer) clearInterval(checkTimer);
      checkTimer = null;
      return;
    }
    if (!checkTimer && container) checkTimer = setInterval(checkConnection, 30000);
    checkConnection().catch(() => {});
  }

  async function handleDraftsClick(e) {
    const btn = e.target.closest('[data-action="deleteDraft"]');
    if (!btn) return;
    const id = Number(btn.dataset.id);
    if (!confirm('¿Eliminar este borrador? No se podrá recuperar.')) return;
    try {
      await removeDraft(id);
      broadcastDrafts();
      notify('Borrador eliminado.');
    } catch (err) {
      notify('No se pudo eliminar el borrador.', true);
    }
  }

  async function requestPersistentStorage() {
    if (!navigator.storage || !navigator.storage.persist) {
      persistentStorage = 'unavailable';
      render();
      return false;
    }
    try {
      const already = await navigator.storage.persisted();
      const granted = already || await navigator.storage.persist();
      persistentStorage = granted ? 'active' : 'denied';
    } catch (_) {
      persistentStorage = 'unavailable';
    }
    render();
    return persistentStorage === 'active';
  }

  function getDraftTypeLabel(type) {
    return type === 'status_proposal' ? 'Propuesta de estado físico' : 'Observación operativa';
  }
  function getDraftTypeIcon(type) {
    return type === 'status_proposal' ? 'wrench' : 'activity';
  }

  async function loadDrafts() {
    if (!currentUser) return [];
    drafts = await idbGetDrafts(currentUser);
    render();
    return drafts;
  }

  function createDraftObj(type, lockerId, proposedStatus, notes) {
    return {
      user: currentUser,
      type,
      lockerId: String(lockerId).trim(),
      proposedStatus: type === 'status_proposal' ? String(proposedStatus).trim() : '',
      notes: String(notes).trim(),
      createdAt: new Date().toISOString(),
      status: 'pending' // NO SINCRONIZADOS
    };
  }

  async function addDraft(type, lockerId, proposedStatus, notes) {
    const draft = createDraftObj(type, lockerId, proposedStatus, notes);
    await idbAddDraft(draft);
    await loadDrafts();
    return draft;
  }

  async function removeDraft(id) {
    await idbRemoveDraft(id);
    await loadDrafts();
  }

  async function clearAllDrafts() {
    await idbClearAll();
    drafts = [];
    render();
  }

  /* ── Renderizado ── */
  function connectionDotClass(state) {
    switch (state) {
      case 'connected': return 'online';
      case 'no-mysql': return 'warning';
      case 'no-server': return 'offline';
      default: return 'offline';
    }
  }
  function connectionText(state) {
    switch (state) {
      case 'connected': return 'Conectado al servidor';
      case 'no-mysql': return 'Servidor PHP disponible, MySQL no responde';
      case 'no-server': return 'Sin acceso al servidor';
      default: return 'Comprobando…';
    }
  }
  function connectionDetail(state) {
    switch (state) {
      case 'connected': return 'PHP y MySQL están disponibles. Los cambios se aplican inmediatamente.';
      case 'no-mysql': return 'PHP responde, pero la base de datos MySQL no está disponible. No se pueden aplicar cambios.';
      case 'no-server': return 'No se puede contactar con el servidor local. Usa borradores offline.';
      default: return 'Verificando la conexión…';
    }
  }

  function render() {
    if (!container) return;

    const connDot = container.querySelector('#settingsConnDot');
    const connStatus = container.querySelector('#settingsConnStatus');
    const connDetail = container.querySelector('#settingsConnDetail');
    const connDetailRow = container.querySelector('#settingsConnDetailRow');
    const connInternet = container.querySelector('#connInternet');
    const connPhp = container.querySelector('#connPhp');
    const connMysql = container.querySelector('#connMysql');

    if (connDot) {
      connDot.className = `connection-dot ${connectionDotClass(connectionState)}`;
      connDot.setAttribute('aria-label', connectionText(connectionState));
    }
    if (connStatus) connStatus.textContent = connectionText(connectionState);
    if (connDetail) connDetail.textContent = connectionDetail(connectionState);

    const isConnected = connectionState === 'connected';
    if (connDetailRow) connDetailRow.classList.toggle('is-hidden', !isConnected);
    if (connInternet) connInternet.textContent = navigator.onLine ? 'Disponible' : 'No disponible';
    if (connPhp) connPhp.textContent = connectionState === 'no-server' ? 'No disponible' : 'Disponible';
    if (connMysql) connMysql.textContent = connectionState === 'no-mysql' ? 'No disponible' : connectionState === 'connected' ? 'Disponible' : '—';

    const storageText = container.querySelector('#storagePersistenceText');
    if (storageText) {
      const labels = { checking: 'comprobando…', active: 'activado', denied: 'no concedido', unavailable: 'no disponible' };
      storageText.textContent = 'Almacenamiento persistente: ' + (labels[persistentStorage] || 'comprobando…');
    }

    // Toggle offline
    const toggle = container.querySelector('#offlineToggle');
    if (toggle) {
      toggle.checked = offlineEnabled;
      toggle.disabled = false;
    }

    // Sincronización
    const syncStatusEl = container.querySelector('#syncStatus');
    const syncDot = container.querySelector('#syncStatus .connection-dot');
    const syncText = container.querySelector('#syncStatusText');
    const syncBtn = container.querySelector('#syncBtn');
    const reviewBtn = container.querySelector('#reviewBtn');
    const syncConflictNotice = container.querySelector('#syncConflictNotice');
    const syncResults = container.querySelector('#syncResults');

    if (syncStatusEl) {
      syncStatusEl.className = `sync-status ${syncStatus}`;
      if (syncDot) syncDot.className = `connection-dot ${syncStatus === 'syncing' ? 'syncing' : syncStatus === 'done' ? 'online' : syncStatus === 'conflict' ? 'warning' : 'offline'}`;
      const labels = { idle: 'Sin cambios pendientes', syncing: 'Sincronizando…', conflict: 'Conflicto detectado – revisa antes de aplicar', done: 'Sincronización completada' };
      if (syncText) syncText.textContent = labels[syncStatus];
    }
    if (syncBtn) {
      syncBtn.disabled = syncStatus === 'syncing' || drafts.length === 0 || !isConnected;
      syncBtn.textContent = syncStatus === 'syncing' ? 'Sincronizando…' : 'Sincronizar ahora';
    }
    if (reviewBtn) reviewBtn.disabled = drafts.length === 0;
    if (syncConflictNotice) syncConflictNotice.classList.toggle('is-hidden', syncConflicts.length === 0);
    if (syncResults) {
      syncResults.innerHTML = syncResultsData.map(r => `<div class="settings-note ${r.ok ? 'success' : 'warn'}">${ICON(r.ok ? 'check' : 'triangle-alert')} ${esc(r.message)}</div>`).join('');
    }

    // Borradores
    const draftCount = container.querySelector('#draftCount');
    const draftList = container.querySelector('#draftList');
    const draftsEmpty = container.querySelector('#draftsEmpty');

    if (draftCount) draftCount.textContent = `${drafts.length} borrador${drafts.length !== 1 ? 'es' : ''} pendiente${drafts.length !== 1 ? 's' : ''}`;
    if (draftsEmpty) draftsEmpty.classList.toggle('is-hidden', drafts.length > 0);
    if (draftList) {
      draftList.innerHTML = drafts.map(d => `
        <div class="draft-item ${d.status}">
          <span class="draft-icon">${ICON(getDraftTypeIcon(d.type))}</span>
          <div class="draft-copy">
            <strong>${esc(getDraftTypeLabel(d.type))} · Locker ${esc(d.lockerId)}</strong>
            ${d.proposedStatus ? `<p>Estado propuesto: <strong>${esc(d.proposedStatus)}</strong></p>` : ''}
            ${d.notes ? `<p>${esc(d.notes)}</p>` : ''}
          </div>
          <div class="draft-meta">
            <span class="draft-badge ${d.status}">${d.status === 'pending' ? 'NO SINCRONIZADO' : 'Sincronizado'}</span>
            <span class="draft-time">${new Date(d.createdAt).toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div class="draft-actions">
            <button type="button" class="btn btn-sm btn-danger" data-action="deleteDraft" data-id="${d.id}">${ICON('x')} Eliminar</button>
          </div>
        </div>
      `).join('');
    }
  }

  /* ── Sincronización ── */
  async function syncDrafts() {
    if (!navigator.locks || !navigator.locks.request) {
      await performSync();
      return;
    }
    await navigator.locks.request('locker-drafts-sync', { ifAvailable: true }, async lock => {
      if (!lock) {
        notify('Ya hay una sincronización en curso en otra pestaña.', true);
        return;
      }
      await performSync();
    });
  }

  async function performSync() {
    if (connectionState !== 'connected') {
      notify('No hay conexión con el servidor. No se puede sincronizar.', true);
      return;
    }
    if (drafts.length === 0) return;

    syncStatus = 'syncing';
    syncConflicts = [];
    syncResultsData = [];
    render();

    const results = [];
    for (const draft of drafts) {
      if (draft.status !== 'pending') continue;

      // Buscar el locker actual en el servidor para detectar conflictos
      const current = serverLockers.find(l => l.id === draft.lockerId);
      let conflict = false;
      let conflictMsg = '';

      if (draft.type === 'status_proposal' && current) {
        if (current.status !== 'Disponible' && current.status !== 'Sin llave' && current.status !== 'Dañado' && current.status !== 'Bloqueado' && current.status !== 'Ocupado' && current.status !== 'Revisión') {
          conflict = true;
          conflictMsg = `El locker ${draft.lockerId} tiene estado "${current.status}" en el servidor.`;
        } else if (current.status === draft.proposedStatus) {
          conflict = true;
          conflictMsg = `El locker ${draft.lockerId} ya tiene el estado "${draft.proposedStatus}" en el servidor.`;
        }
      }

      if (conflict) {
        syncConflicts.push({ draft, message: conflictMsg });
        results.push({ id: draft.id, ok: false, conflict: true, message: conflictMsg });
        continue;
      }

      // Aplicar cambio según tipo
      if (draft.type === 'status_proposal') {
        try {
          const res = await fetchJson('status', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': csrf
            },
            body: JSON.stringify({
              locker: draft.lockerId,
              status: draft.proposedStatus,
              notes: `Borrador offline: ${draft.notes || 'Actualización de estado físico sin cambios de asignación.'}`,
              by: currentUser
            })
          });
          if (res.ok) {
            await idbRemoveDraft(draft.id);
            results.push({ id: draft.id, ok: true, message: `Locker ${draft.lockerId} actualizado a ${draft.proposedStatus}.` });
          } else {
            results.push({ id: draft.id, ok: false, message: res.data?.message || 'Error al actualizar.' });
          }
        } catch (e) {
          results.push({ id: draft.id, ok: false, message: 'Error de red al sincronizar.' });
        }
      } else {
        // Observación: solo se guarda localmente, no hay endpoint de servidor
        results.push({ id: draft.id, ok: true, message: 'Observación guardada localmente.' });
      }
    }

    await loadDrafts(); // recargar después de eliminar sincronizados
    broadcastDrafts();
    syncResultsData = results;
    syncStatus = syncConflicts.length ? 'conflict' : 'done';
    render();

    const msg = results.filter(r => r.ok).length + ' de ' + results.length + ' cambios procesados.';
    notify(msg, syncConflicts.length > 0);
  }

  /* ── Montaje / desmontaje ── */
  function notify(msg, error = false) {
    const toast = document.getElementById('toast');
    if (toast) {
      toast.textContent = msg;
      toast.classList.toggle('error', error);
      toast.classList.add('show');
      clearTimeout(notify.timer);
      notify.timer = setTimeout(() => toast.classList.remove('show'), 4100);
    }
  }

  async function mount(el, user) {
    container = el;
    currentUser = user;
    offlineEnabled = false;

    await idbOpen();
    await loadDrafts();
    await checkConnection();
    requestPersistentStorage().catch(() => {});
    render();

    // Eventos
    const form = container.querySelector('#draftForm');
    const typeBtns = container.querySelectorAll('.draft-type-btn');
    const lockerInput = container.querySelector('#draftLocker');
    const statusField = container.querySelector('#draftStatusField');
    const statusSelect = container.querySelector('#draftStatus');
    const typeInput = container.querySelector('input[name="draftType"]');
    const toggle = container.querySelector('#offlineToggle');
    const syncBtn = container.querySelector('#syncBtn');
    const reviewBtn = container.querySelector('#reviewBtn');

    // Selección de tipo de borrador
    typeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        typeBtns.forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        const type = btn.dataset.draftType;
        typeInput.value = type;
        if (type === 'status_proposal') {
          statusField.classList.remove('is-hidden');
          statusSelect.required = true;
          lockerInput.placeholder = 'Ej: B03-12';
        } else {
          statusField.classList.add('is-hidden');
          statusSelect.required = false;
          lockerInput.placeholder = 'Ej: B03-12';
        }
      });
    });

    // Toggle modo offline
    toggle.addEventListener('change', () => {
      offlineEnabled = toggle.checked;
      render();
    });

    // Crear borrador
    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const type = typeInput.value;
      const lockerId = lockerInput.value.trim();
      const proposedStatus = statusSelect ? statusSelect.value : '';
      const notes = container.querySelector('#draftNotes').value.trim();
      try {
        await addDraft(type, lockerId, proposedStatus, notes);
        broadcastDrafts();
        form.reset();
        statusField.classList.add('is-hidden');
        typeBtns[0].classList.add('is-active');
        typeBtns[1].classList.remove('is-active');
        typeInput.value = 'observation';
        notify('Borrador guardado localmente (NO SINCRONIZADO).');
      } catch (err) {
        notify('No se pudo guardar el borrador.', true);
      }
    });

    // Eliminar borrador (delegación)
    container.addEventListener('click', handleDraftsClick);

    // Sincronizar
    syncBtn.addEventListener('click', () => syncDrafts());

    // Revisar borradores (scroll a la lista)
    reviewBtn.addEventListener('click', () => {
      const list = container.querySelector('#draftList');
      if (list) list.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    // Revisar conexión periódicamente
    if (!document.hidden) checkTimer = setInterval(checkConnection, 30000);
    window.addEventListener('online', checkConnection);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibilityChange);
  }

  function unmount() {
    if (checkTimer) clearInterval(checkTimer);
    checkTimer = null;
    window.removeEventListener('online', checkConnection);
    window.removeEventListener('offline', handleOffline);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    if (container) container.removeEventListener('click', handleDraftsClick);
    container = null;
    currentUser = null;
    syncResultsData = [];
    persistentStorage = 'checking';
  }

  /* ── Template HTML ── */
  function template() {
    return `
    <section class="settings-page-content">
      <div class="page-head">
        <div>
          <span class="kicker">Configuración</span>
          <h1 tabindex="-1">Modo sin conexión y borradores</h1>
          <p class="subtext">Prepara cambios sin acceso al servidor y súbelos cuando vuelvas la conexión. Los borradores son privados de tu sesión.</p>
        </div>
      </div>

      <!-- Estado del servidor -->
      <section class="settings-section">
        <div class="settings-section-head">
          <span class="settings-section-icon" aria-hidden="true">${ICON('database')}</span>
          <div>
            <h2>Estado del servidor</h2>
            <p>Conexión con PHP y MySQL en esta computadora.</p>
          </div>
        </div>
        <div class="settings-section-body">
          <div class="connection-state">
            <span class="connection-dot" id="settingsConnDot"></span>
            <div class="connection-info">
              <strong id="settingsConnStatus">Comprobando…</strong>
              <span id="settingsConnDetail">Verificando la conexión con el servidor local.</span>
            </div>
          </div>
          <div class="connection-state is-hidden" id="settingsConnDetailRow">
            <span class="connection-dot"></span>
            <div class="connection-info">
              <strong>Internet:</strong> <span id="connInternet">—</span><br>
              <strong>Servidor PHP:</strong> <span id="connPhp">—</span><br>
              <strong>Base de datos MySQL:</strong> <span id="connMysql">—</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Preferencia offline -->
      <section class="settings-section">
        <div class="settings-section-head">
          <span class="settings-section-icon" aria-hidden="true">${ICON('triangle-alert')}</span>
          <div>
            <h2>Preparar cambios sin conexión</h2>
            <p>Crea observaciones y propuestas de estado sin acceso al servidor. Se sincronizan al volver la conexión.</p>
          </div>
        </div>
        <div class="settings-section-body">
          <div class="preference-row">
            <div class="preference-info">
              <strong>Habilitar borradores offline</strong>
              <span>Cuando esté activo, se pueden crear borradores que se guardan localmente y se sincronizan más tarde.</span>
            </div>
            <label class="preference-toggle">
              <input type="checkbox" id="offlineToggle" aria-label="Habilitar borradores offline">
              <span class="preference-slider"></span>
            </label>
          </div>
          <div class="settings-note warn">
            ${ICON('triangle-alert')} Los borradores solo incluyen observaciones operativas y propuestas de estado físico. No permiten asignaciones definitivas, liberaciones, traslados ni cambios de usuario o permisos.
          </div>
          <p class="settings-hint" id="storagePersistenceText">Almacenamiento persistente: comprobando…</p>
        </div>
      </section>

      <!-- Borradores -->
      <section class="settings-section">
        <div class="settings-section-head">
          <span class="settings-section-icon" aria-hidden="true">${ICON('pencil')}</span>
          <div>
            <h2>Borradores pendientes</h2>
            <p>Cambios preparados sin sincronizar (NO SINCRONIZADOS).</p>
          </div>
        </div>
        <div class="settings-section-body">
          <div class="draft-form">
            <div class="draft-type-selector">
              <button type="button" class="draft-type-btn is-active" data-draft-type="observation">${ICON('activity')} Observación</button>
              <button type="button" class="draft-type-btn" data-draft-type="status_proposal">${ICON('wrench')} Estado físico</button>
            </div>
            <form id="draftForm">
              <input type="hidden" name="draftType" value="observation">
              <div class="form-item">
                <label for="draftLocker">Locker</label>
                <input id="draftLocker" name="lockerId" type="text" placeholder="Ej: B03-12" required maxlength="12">
              </div>
              <div id="draftStatusField" class="is-hidden">
                <label for="draftStatus">Estado físico propuesto</label>
                <select id="draftStatus" name="proposedStatus" required>
                  <option value="">Selecciona un estado</option>
                  <option value="Disponible">Disponible</option>
                  <option value="Sin llave">Sin llave</option>
                  <option value="Dañado">Dañado</option>
                  <option value="Bloqueado">Bloqueado</option>
                  <option value="Ocupado">Ocupado</option>
                  <option value="Revisión">Revisión</option>
                </select>
              </div>
              <div class="form-item full">
                <label for="draftNotes">Observaciones</label>
                <textarea id="draftNotes" name="notes" rows="3" placeholder="Solo notas operativas. No incluyas nombres, departamentos ni datos personales." maxlength="500"></textarea>
              </div>
              <button type="submit" class="btn btn-primary" id="draftSubmit">${ICON('check')} Guardar borrador</button>
            </form>
          </div>

          <div class="drafts-header">
            <strong>Borradores guardados</strong>
            <span class="draft-count" id="draftCount">0 borradores</span>
          </div>
          <div class="draft-list" id="draftList"></div>
          <div class="drafts-empty is-hidden" id="draftsEmpty">
            <span class="empty-icon" aria-hidden="true">${ICON('circle-check')}</span>
            <p>No hay borradores pendientes.</p>
          </div>
        </div>
      </section>

      <!-- Sincronización -->
      <section class="settings-section">
        <div class="settings-section-head">
          <span class="settings-section-icon" aria-hidden="true">${ICON('refresh-cw')}</span>
          <div>
            <h2>Sincronización</h2>
            <p>Revisa y aplica los borradores pendientes cuando el servidor esté disponible.</p>
          </div>
        </div>
        <div class="settings-section-body">
          <div class="sync-section">
            <div class="sync-status idle" id="syncStatus">
              <span class="connection-dot"></span>
              <span id="syncStatusText">Sincronización pendiente</span>
            </div>
            <div class="settings-note info is-hidden" id="syncConflictNotice">
              ${ICON('triangle-alert')} Se detectó un conflicto: el estado del locker en el servidor cambió desde que creaste este borrador. Revisa antes de aplicar.
            </div>
            <div class="sync-actions">
              <button type="button" class="btn btn-primary" id="syncBtn">${ICON('refresh-cw')} Sincronizar ahora</button>
              <button type="button" class="btn btn-ghost" id="reviewBtn">Revisar borradores</button>
            </div>
            <div id="syncResults" class="sync-results"></div>
          </div>
        </div>
      </section>

      <!-- Seguridad -->
      <section class="settings-section">
        <div class="settings-section-head">
          <span class="settings-section-icon" aria-hidden="true">${ICON('shield-check')}</span>
          <div>
            <h2>Seguridad y privacidad</h2>
            <p>Cómo se protegen tus borradores en este equipo.</p>
          </div>
        </div>
        <div class="settings-section-body">
          <div class="settings-note info">
            ${ICON('lock')} Los borradores se almacenan solo en este navegador (IndexedDB). No se envían al servidor hasta que tú los sincronizas manualmente.
          </div>
          <div class="settings-note info">
            ${ICON('user')} Los borradores están vinculados a tu sesión de usuario. Al cerrar sesión, los borradores locales se borran para que otro usuario no pueda consultarlos.
          </div>
          <div class="settings-note info">
            ${ICON('info')} No se guardan contraseñas, tokens de sesión ni credenciales. Los borradores solo contienen: código de locker, tipo de cambio, notas operativas y fecha. No se incluyen nombres de colaboradores ni datos personales.
          </div>
        </div>
      </section>
    </section>
    `;
  }

  /* ── Exportación global para app.js ── */
  window.Settings = { mount, unmount, template };
})();