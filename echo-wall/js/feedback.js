/**
 * Echo Wall — Feedback Module
 * Manages user feedback via localStorage.
 */
const Feedback = {
  STORAGE_KEY: 'ew-feedbacks',

  /** Get all feedbacks */
  getAll() {
    return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
  },

  /** Save feedbacks */
  save(feedbacks) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(feedbacks));
  },

  /** Submit feedback */
  submit(data) {
    const feedbacks = this.getAll();
    feedbacks.push({
      id: 'fb-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      nama: data.nama || '',
      rating: parseInt(data.rating, 10) || 0,
      pilihan: data.pilihan || [],
      cadangan: data.cadangan || '',
      userId: data.userId || '',
      createdAt: new Date().toISOString()
    });
    this.save(feedbacks);
  },

  /** Get average rating */
  getAvgRating() {
    const fb = this.getAll();
    if (fb.length === 0) return 0;
    const total = fb.reduce((sum, f) => sum + f.rating, 0);
    return Math.round((total / fb.length) * 10) / 10;
  },

  /** Get most popular option */
  getTopOption() {
    const fb = this.getAll();
    if (fb.length === 0) return '';
    const counts = {};
    fb.forEach(f => {
      (f.pilihan || []).forEach(opt => {
        counts[opt] = (counts[opt] || 0) + 1;
      });
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
  }
};
