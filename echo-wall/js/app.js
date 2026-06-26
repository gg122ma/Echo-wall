/**
 * Echo Wall — Main App Module
 * Shared UI: navbar, theme, toast, navigation guards.
 */
const App = {
  /** Show a toast notification */
  showToast(message, duration = 3000) {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-out');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  /** Open a modal */
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
    }
  },

  /** Close a modal */
  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
    }
  },

  /** Close all modals */
  closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
  },

  /** Build the navbar HTML */
  buildNavbar(currentPage) {
    const session = Auth.getSession();
    const t = I18n.t.bind(I18n);

    let links = `
      <li><a href="index.html" data-i18n="nav.home" class="${currentPage === 'index' ? 'active' : ''}">${t('nav.home')}</a></li>
      <li><a href="explore.html" data-i18n="nav.explore" class="${currentPage === 'explore' ? 'active' : ''}">${t('nav.explore')}</a></li>
    `;

    if (session) {
      links += `
        <li><a href="wall.html" data-i18n="nav.wall" class="${currentPage === 'wall' ? 'active' : ''}">${t('nav.wall')}</a></li>
        <li><a href="feedback.html" data-i18n="nav.feedback" class="${currentPage === 'feedback' ? 'active' : ''}">${t('nav.feedback')}</a></li>
        <li><a href="profile.html" data-i18n="nav.profile" class="${currentPage === 'profile' ? 'active' : ''}">${t('nav.profile')}</a></li>
      `;
      if (Auth.isAdmin()) {
        links += `<li><a href="admin.html" data-i18n="nav.admin" class="${currentPage === 'admin' ? 'active' : ''}">${t('nav.admin')}</a></li>`;
      }
    }

    let authLinks = '';
    if (session) {
      authLinks = `
        <span class="text-sm text-muted">${session.username}</span>
        <button class="btn btn-sm btn-secondary" id="btn-logout">${t('nav.logout')}</button>
      `;
    } else {
      authLinks = `
        <a href="login.html" class="btn btn-sm btn-primary" data-i18n="nav.login">${t('nav.login')}</a>
        <a href="register.html" class="btn btn-sm btn-secondary" data-i18n="nav.register">${t('nav.register')}</a>
      `;
    }

    return `
      <nav class="navbar">
        <a href="index.html" class="navbar-brand"><span class="gradient-text">${t('nav.logo')}</span></a>
        <ul class="navbar-links">${links}</ul>
        <div class="navbar-actions">
          <div class="lang-switcher">
            <button data-lang="ms" onclick="I18n.load('ms')">BM</button>
            <button data-lang="en" onclick="I18n.load('en')">EN</button>
            <button data-lang="zh" onclick="I18n.load('zh')">中文</button>
          </div>
          <button class="theme-toggle" id="btn-theme" title="Toggle theme">🌓</button>
          ${authLinks}
        </div>
      </nav>
    `;
  },

  /** Initialize shared UI on the page */
  init() {
    // Inject navbar
    const navTarget = document.getElementById('nav-target');
    if (navTarget) {
      navTarget.innerHTML = this.buildNavbar(this.getCurrentPage());
    }

    // Theme toggle
    const themeBtn = document.getElementById('btn-theme');
    if (themeBtn) {
      const savedTheme = localStorage.getItem('ew-theme') || 'light';
      document.documentElement.setAttribute('data-theme', savedTheme);
      themeBtn.textContent = savedTheme === 'dark' ? '☀️' : '🌓';

      themeBtn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('ew-theme', next);
        themeBtn.textContent = next === 'dark' ? '☀️' : '🌓';
      });
    }

    // Close modals on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.classList.remove('active');
        }
      });
    });

    // Logout button
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        Auth.logout();
        I18n.showToast(I18n.t('common.success', 'Logged out.'));
        window.location.href = 'login.html';
      });
    }

    // Re-apply i18n after navbar is injected
    I18n.apply();
  },

  /** Detect current page name from filename */
  getCurrentPage() {
    return window.location.pathname.split('/').pop() || 'index.html';
  }
};
