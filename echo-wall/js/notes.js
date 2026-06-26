/**
 * Echo Wall — Notes Module
 * Manages note CRUD operations via localStorage.
 */
const Notes = {
  STORAGE_KEY: 'ew-notes',

  /** Get all notes */
  getAll() {
    return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
  },

  /** Save notes array */
  save(notes) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(notes));
  },

  /** Get a single note by ID */
  getById(id) {
    return this.getAll().find(n => n.id === id);
  },

  /** Filter notes by jurusan, aliran, sesi */
  getByFilter(jurusan, aliran, sesi) {
    let notes = this.getAll();

    if (jurusan) {
      notes = notes.filter(n => n.jurusan === jurusan);
    }
    if (aliran) {
      notes = notes.filter(n => n.aliran === aliran);
    }
    if (sesi) {
      notes = notes.filter(n => n.sesi === sesi);
    }

    return notes;
  },

  /** Filter by category */
  getByCategory(category) {
    return this.getAll().filter(n => n.kategori === category);
  },

  /** Sort notes */
  sortBy(notes, sortBy) {
    const sorted = [...notes];
    if (sortBy === 'hot') {
      sorted.sort((a, b) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes));
    } else if (sortBy === 'new') {
      sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    return sorted;
  },

  /** Generate a random position on the cork board (percentage) */
  randomPosition(existingNotes, isMobile) {
    let attempts = 0;
    const maxAttempts = 50;

    while (attempts < maxAttempts) {
      const x = Math.random() * 80 + 5; // 5% - 85%
      const y = Math.random() * 80 + 5;
      const rotation = (Math.random() - 0.5) * 10; // -5 to +5 degrees

      // Simple collision check
      const overlaps = existingNotes.some(n => {
        const dx = Math.abs(n.posX - x);
        const dy = Math.abs(n.posY - y);
        return dx < 12 && dy < 12;
      });

      if (!overlaps) {
        return { posX: x, posY: y, rotation: Math.round(rotation * 10) / 10 };
      }
      attempts++;
    }

    // Fallback: random position even if overlapping
    return {
      posX: Math.random() * 80 + 5,
      posY: Math.random() * 80 + 5,
      rotation: (Math.random() - 0.5) * 10
    };
  },

  /** Create a new note */
  create(data) {
    const notes = this.getAll();
    const existing = notes.filter(n => !n.isHidden);

    const pos = this.randomPosition(existing, data.isMobile);

    const note = {
      id: 'note-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      userId: data.userId || '',
      konten: data.konten.trim(),
      kategori: data.kategori || 'akademik',
      jurusan: data.jurusan || '',
      aliran: data.aliran || '',
      sesi: data.sesi || '',
      isAnonymous: data.isAnonymous || false,
      namaSamaran: data.namaSamaran || '',
      anonymousIcon: data.anonymousIcon || '📝',
      upvotes: 0,
      downvotes: 0,
      isHidden: false,
      isPinned: false,
      posX: pos.posX,
      posY: pos.posY,
      rotation: pos.rotation,
      createdAt: new Date().toISOString(),
      comments: []
    };

    notes.push(note);
    this.save(notes);
    return note;
  },

  /** Delete a note */
  delete(id) {
    const notes = this.getAll().filter(n => n.id !== id);
    this.save(notes);
  },

  /** Hide a note */
  hide(id) {
    const notes = this.getAll();
    const note = notes.find(n => n.id === id);
    if (note) {
      note.isHidden = true;
      this.save(notes);
    }
  },

  /** Toggle pin */
  togglePin(id) {
    const notes = this.getAll();
    const note = notes.find(n => n.id === id);
    if (note) {
      note.isPinned = !note.isPinned;
      this.save(notes);
    }
  },

  /** Get stats */
  getStats() {
    const notes = this.getAll();
    return {
      total: notes.filter(n => !n.isHidden).length,
      today: notes.filter(n => {
        const d = new Date(n.createdAt);
        const now = new Date();
        return d.toDateString() === now.toDateString();
      }).length
    };
  }
};
