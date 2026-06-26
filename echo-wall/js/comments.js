/**
 * Echo Wall — Comments Module
 * Manages comments and nested replies via localStorage.
 */
const Comments = {
  STORAGE_KEY: 'ew-comments',

  /** Get all comments */
  getAll() {
    return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
  },

  /** Save comments */
  save(comments) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(comments));
  },

  /** Get comments for a note (top-level only) */
  getByNoteId(noteId) {
    return this.getAll()
      .filter(c => c.noteId === noteId && c.parentId === null)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  /** Get replies for a comment */
  getReplies(parentId) {
    return this.getAll()
      .filter(c => c.parentId === parentId)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  },

  /** Add a comment or reply */
  add(data) {
    const comments = this.getAll();
    const comment = {
      id: 'cmt-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      noteId: data.noteId,
      parentId: data.parentId || null,
      userId: data.userId || '',
      konten: data.konten.trim(),
      isAnonymous: data.isAnonymous || false,
      namaSamaran: data.namaSamaran || '',
      anonymousIcon: data.anonymousIcon || '💬',
      createdAt: new Date().toISOString()
    };

    comments.push(comment);
    this.save(comments);
    return comment;
  },

  /** Delete a comment and all its replies */
  delete(commentId) {
    const comments = this.getAll().filter(c => c.id !== commentId);
    this.save(comments);
  },

  /** Get total comment count for a note */
  getCount(noteId) {
    return this.getAll().filter(c => c.noteId === noteId).length;
  }
};
