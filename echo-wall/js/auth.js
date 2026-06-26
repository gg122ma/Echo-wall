/**
 * Echo Wall — Authentication Module
 * Manages user registration, login, logout, and session via localStorage.
 */
const Auth = {
  STORAGE_KEY_USERS: 'ew-users',
  STORAGE_KEY_SESSION: 'ew-session',

  /** Get all registered users */
  getUsers() {
    return JSON.parse(localStorage.getItem(this.STORAGE_KEY_USERS) || '[]');
  },

  /** Save users array */
  saveUsers(users) {
    localStorage.setItem(this.STORAGE_KEY_USERS, JSON.stringify(users));
  },

  /** Get current session */
  getSession() {
    return JSON.parse(localStorage.getItem(this.STORAGE_KEY_SESSION) || 'null');
  },

  /** Save session */
  saveSession(user) {
    localStorage.setItem(this.STORAGE_KEY_SESSION, JSON.stringify(user));
  },

  /** Clear session */
  clearSession() {
    localStorage.removeItem(this.STORAGE_KEY_SESSION);
  },

  /** Check if user is logged in */
  isLoggedIn() {
    return !!this.getSession();
  },

  /** Register a new user */
  register(username, password, jurusan, aliran, sesi) {
    const users = this.getUsers();

    // Validate
    if (!username || !password) {
      return { success: false, error: 'Username and password are required.' };
    }
    if (password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' };
    }
    if (!jurusan || !aliran || !sesi) {
      return { success: false, error: 'Please select your faculty, stream, and session.' };
    }

    // Check duplicate
    if (users.find(u => u.username === username)) {
      return { success: false, error: 'Username already taken.' };
    }

    // Create user
    const newUser = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      username,
      password, // NOTE: In production, hash this!
      jurusan,
      aliran,
      sesi,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    this.saveUsers(users);

    // Auto-login after register
    this.login(username, password);

    return { success: true, user: newUser };
  },

  /** Login with username and password */
  login(username, password) {
    const users = this.getUsers();
    const user = users.find(u => u.username === username && u.password === password);

    if (!user) {
      return { success: false, error: I18n.t('auth.login_error', 'Invalid credentials.') };
    }

    this.saveSession({
      id: user.id,
      username: user.username,
      jurusan: user.jurusan,
      aliran: user.aliran,
      sesi: user.sesi
    });

    return { success: true, user: this.getSession() };
  },

  /** Logout current user */
  logout() {
    this.clearSession();
    // Redirect to login or home
    const currentPath = window.location.pathname;
    if (currentPath.includes('wall.html') || currentPath.includes('profile.html') || currentPath.includes('feedback.html')) {
      window.location.href = 'login.html';
    }
  },

  /** Get current user object (with full info) */
  getCurrentUser() {
    const session = this.getSession();
    if (!session) return null;

    const users = this.getUsers();
    return users.find(u => u.id === session.id) || session;
  },

  /** Check if current user is admin (username === 'admin') */
  isAdmin() {
    const session = this.getSession();
    return session && session.username === 'admin';
  }
};
