/**
 * Echo Wall — Bookmarks Module
 * Manages user bookmarks via localStorage.
 */
const Bookmarks = {
  STORAGE_KEY: 'ew-bookmarks',

  /** Get all bookmarks */
  getAll() {
    return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
  },

  /** Save bookmarks */
  save(bookmarks) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(bookmarks));
  },

  /** Check if user bookmarked a note */
  isBookmarked(noteId, userId) {
    return this.getAll().some(b => b.noteId === noteId && b.userId === userId);
  },

  /** Toggle bookmark */
  toggle(noteId, userId) {
    const all = this.getAll();
    const idx = all.findIndex(b => b.noteId === noteId && b.userId === userId);

    if (idx >= 0) {
      // Remove
      all.splice(idx, 1);
    } else {
      // Add
      all.push({
        noteId,
        userId,
        createdAt: new Date().toISOString()
      });
    }

    this.save(all);
    return idx < 0; // true if now bookmarked, false if removed
  },

  /** Get user's bookmarked note IDs */
  getByUser(userId) {
    return this.getAll()
      .filter(b => b.userId === userId)
      .map(b => b.noteId);
  }
};
