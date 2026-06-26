/**
 * Echo Wall — Voting Module
 * Manages upvote/downvote with duplicate prevention via localStorage.
 */
const Votes = {
  STORAGE_KEY: 'ew-votes',

  /** Get all votes */
  getAll() {
    return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
  },

  /** Save votes */
  save(votes) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(votes));
  },

  /** Check if user already voted on a note */
  hasVoted(noteId, userId) {
    return this.getAll().some(v => v.noteId === noteId && v.userId === userId);
  },

  /** Get vote count for a note */
  getCount(noteId) {
    const noteVotes = this.getAll().filter(v => v.noteId === noteId);
    return {
      up: noteVotes.filter(v => v.direction === 'up').length,
      down: noteVotes.filter(v => v.direction === 'down').length
    };
  },

  /** Get user's vote on a note */
  getUserVote(noteId, userId) {
    const vote = this.getAll().find(v => v.noteId === noteId && v.userId === userId);
    return vote ? vote.direction : null;
  },

  /** Submit a vote */
  submit(noteId, userId, direction) {
    const allVotes = this.getAll();

    // Remove existing vote from this user on this note
    const filtered = allVotes.filter(v => !(v.noteId === noteId && v.userId === userId));

    // Add new vote
    filtered.push({
      noteId,
      userId,
      direction,
      createdAt: new Date().toISOString()
    });

    this.save(filtered);

    // Update note vote counts
    const notes = Notes.getAll();
    const note = notes.find(n => n.id === noteId);
    if (note) {
      const counts = this.getCount(noteId);
      note.upvotes = counts.up;
      note.downvotes = counts.down;
      Notes.save(notes);
    }

    return { up: counts.up, down: counts.down };
  }
};
