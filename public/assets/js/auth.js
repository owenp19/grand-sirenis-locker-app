/* LockerFlow · Interacciones de formularios sin dependencias ni peticiones externas. */
(() => {
  'use strict';
  document.querySelectorAll('[data-toggle-password]').forEach((button) => {
    const target = document.getElementById(button.dataset.togglePassword);
    if (!target) return;
    button.addEventListener('click', () => {
      const show = target.type === 'password';
      target.type = show ? 'text' : 'password';
      button.textContent = show ? 'Ocultar' : 'Mostrar';
      button.setAttribute('aria-pressed', String(show));
      button.setAttribute('aria-label', show ? 'Ocultar contraseña' : 'Mostrar contraseña');
    });
  });
  const password = document.getElementById('password');
  const confirmation = document.getElementById('password_confirm');
  const feedback = document.getElementById('password-match');
  if (password && confirmation && feedback) {
    const compare = () => {
      const typed = confirmation.value.length > 0;
      const same = password.value === confirmation.value;
      feedback.textContent = typed ? (same ? '✓ Las contraseñas coinciden' : 'Las contraseñas no coinciden') : '';
      feedback.style.color = typed ? (same ? 'var(--teal)' : 'var(--red)') : '';
      confirmation.setCustomValidity(typed && !same ? 'Las contraseñas no coinciden' : '');
    };
    password.addEventListener('input', compare);
    confirmation.addEventListener('input', compare);
  }
})();
