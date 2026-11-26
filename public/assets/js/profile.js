/* Grand Sirenis Locker App · Perfil de usuario · Edición de datos de sesión.
   Solo se permite editar el nombre. Username y rol son de solo lectura. */
(() => {
  'use strict';

  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const ICON = (name, cls = '') => `<svg class="icon ${cls}" aria-hidden="true" focusable="false"><use href="assets/icons/lucide-sprite.svg#${name}"></use></svg>`;
  const csrfMeta = document.querySelector('meta[name="csrf-token"]');
  const csrf = csrfMeta ? csrfMeta.content : '';
  const API = 'api.php';
  const API_TIMEOUT = 8000;
  const channel = ('BroadcastChannel' in window) ? new BroadcastChannel('sirenis-locker') : null;

  let container = null;
  let currentUser = null;
  let nameInputEl = null;

  if (channel) {
    channel.addEventListener('message', e => {
      const msg = e.data || {};
      if (msg.type !== 'user' || !msg.name || !currentUser || !nameInputEl) return;
      currentUser.name = msg.name;
      nameInputEl.value = msg.name;
    });
  }

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

  async function loadProfile() {
    const res = await fetchJson('profile', { headers: { 'X-CSRF-Token': csrf } });
    if (!res.ok || !res.data) {
      notify('No se pudo cargar el perfil.', true);
      return null;
    }
    currentUser = res.data.user;
    return currentUser;
  }

  async function saveProfile(name) {
    const res = await fetchJson('profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrf
      },
      body: JSON.stringify({ name })
    });
    if (res.ok) {
      currentUser = res.data.user;
      notify('Perfil actualizado.');
      return true;
    }
    notify(res.data?.message || 'No se pudo actualizar el perfil.', true);
    return false;
  }

  function template(user) {
    return `
    <section class="settings-page-content">
      <div class="page-head">
        <div>
          <span class="kicker">Mi perfil</span>
          <h1 tabindex="-1">Datos de usuario</h1>
          <p class="subtext">Edita tu nombre de usuario. El nombre de usuario y el rol son de solo lectura.</p>
        </div>
      </div>

      <section class="settings-section">
        <div class="settings-section-head">
          <span class="settings-section-icon" aria-hidden="true">${ICON('user')}</span>
          <div>
            <h2>Información de la cuenta</h2>
            <p>Datos de tu sesión actual en el sistema.</p>
          </div>
        </div>
        <div class="settings-section-body">
          <div class="profile-fields">
            <div class="form-item">
              <label for="profileName">Nombre y apellidos</label>
              <input id="profileName" name="name" type="text" value="${esc(user.name)}" required maxlength="120">
              <span class="form-hint">Se usa en firmas de movimientos y asignaciones.</span>
            </div>
            <div class="form-item">
              <label>Nombre de usuario</label>
              <input type="text" value="${esc(user.username)}" readonly>
              <span class="form-hint">No se puede modificar.</span>
            </div>
            <div class="form-item">
              <label>Rol</label>
              <input type="text" value="${esc(user.role)}" readonly>
              <span class="form-hint">Define tus permisos en el sistema.</span>
            </div>
          </div>
          <div class="profile-actions">
            <button type="button" class="btn btn-primary" id="profileSave">${ICON('check')}<span class="btn-label">Guardar cambios</span></button>
          </div>
        </div>
      </section>

      <section class="settings-section">
        <div class="settings-section-head">
          <span class="settings-section-icon" aria-hidden="true">${ICON('shield-check')}</span>
          <div>
            <h2>Seguridad de la sesión</h2>
            <p>Tu sesión es HttpOnly y SameSite=Lax. Los datos sensibles no se almacenan en el navegador.</p>
          </div>
        </div>
        <div class="settings-section-body">
          <div class="settings-note info">
            ${ICON('lock')} La contraseña nunca se almacena en el frontend. Para cambiarla, contacta al administrador.
          </div>
          <div class="settings-note info">
            ${ICON('info')} Cerrar sesión elimina los borradores locales para proteger tu privacidad en equipos compartidos.
          </div>
        </div>
      </section>
      <section class="settings-section">
        <div class="settings-section-head">
          <span class="settings-section-icon" aria-hidden="true">${ICON('key')}</span>
          <div>
            <h2>Cambiar contraseña</h2>
            <p>Modifica tu contraseña actual. Se revocarán todas las sesiones activas.</p>
          </div>
        </div>
        <div class="settings-section-body">
          <div class="settings-field">
            <label for="changeCurrentPassword">Contraseña actual</label>
            <input type="password" id="changeCurrentPassword" placeholder="Escribe tu contraseña actual" maxlength="512" required>
          </div>
          <div class="settings-field">
            <label for="changeNewPassword">Nueva contraseña</label>
            <input type="password" id="changeNewPassword" placeholder="Escribe la nueva contraseña" maxlength="512" required>
          </div>
          <div class="settings-field">
            <label for="changeConfirmPassword">Confirmar nueva contraseña</label>
            <input type="password" id="changeConfirmPassword" placeholder="Confirma la nueva contraseña" maxlength="512" required>
          </div>
          <div class="settings-action">
            <button type="button" class="btn btn-primary" id="changePasswordBtn">${ICON('rotate')}<span class="btn-label">Cambiar contraseña</span></button>
          </div>
        </div>
      </section>
    </section>
    `;
  }

  async function mount(el) {
    container = el;
    const user = await loadProfile();
    if (!user) {
      container.innerHTML = '<div class="error-splash"><h2>No se pudo cargar el perfil</h2><p>Comprueba la conexión con el servidor local e inténtalo de nuevo.</p></div>';
      return;
    }
    container.innerHTML = template(user);
    container.querySelector('h1')?.focus({ preventScroll: true });

    const nameInput = container.querySelector('#profileName');
    nameInputEl = nameInput;
    const saveBtn = container.querySelector('#profileSave');
    const saveLabel = saveBtn?.querySelector('.btn-label');
    if (!nameInput || !saveBtn || !saveLabel) return;

    saveBtn.addEventListener('click', async () => {
      const name = nameInput.value.trim();
      if (!name) {
        notify('El nombre no puede estar vacío.', true);
        nameInput.focus();
        return;
      }
      saveBtn.disabled = true;
      saveLabel.textContent = 'Guardando…';
      nameInput.disabled = true;
      try {
        const ok = await saveProfile(name);
        if (ok) {
          nameInput.value = currentUser.name;
          if (window.App && typeof window.App.updateUser === 'function') {
            window.App.updateUser(currentUser);
          }
        }
      } catch (err) {
        notify('Error al guardar el perfil.', true);
      } finally {
        nameInput.disabled = false;
        saveBtn.disabled = false;
        saveLabel.textContent = 'Guardar cambios';
      }
    });
  }

  // Change password form
  const changePasswordBtn = container.querySelector('#changePasswordBtn');
  if (changePasswordBtn) {
    changePasswordBtn.addEventListener('click', async () => {
      const current = document.getElementById('changeCurrentPassword')?.value || '';
      const newPass = document.getElementById('changeNewPassword')?.value || '';
      const confirm = document.getElementById('changeConfirmPassword')?.value || '';
      if (!current || !newPass || !confirm) {
        notify('Completa todos los campos.', true);
        return;
      }
      if (newPass !== confirm) {
        notify('Las contraseñas nuevas no coinciden.', true);
        return;
      }
      const res = await fetchJson('profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrf
        },
        body: JSON.stringify({ action: 'change-password', current_password: current, new_password: newPass, confirm_password: confirm })
      });
      if (res.ok && res.data?.ok) {
        notify(res.data.message || 'Contraseña actualizada.', false);
        setTimeout(() => { window.location.reload(); }, 1500);
      } else {
        notify(res.data?.message || 'Error al cambiar contraseña.', true);
      }
    });
  }

  function unmount() {
    container = null;
    currentUser = null;
    nameInputEl = null;
  }

  window.Profile = { mount, unmount };
})();