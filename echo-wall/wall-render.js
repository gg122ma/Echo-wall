/**
 * Echo Wall — Wall Page Rendering Logic
 * Handles displaying notes, filters, add note modal, and note detail modal.
 */

let currentJurusan = '';
let currentAliran = '';
let currentSesi = '';

/** Parse URL query params */
function getQueryParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    jurusan: params.get('jurusan') || '',
    aliran: params.get('aliran') || '',
    sesi: params.get('sesi') || ''
  };
}

/** Render the wall page */
function renderWall() {
  const params = getQueryParams();
  currentJurusan = params.jurusan;
  currentAliran = params.aliran;
  currentSesi = params.sesi;

  // Set wall header
  const t = I18n.t.bind(I18n);
  document.getElementById('wall-title').textContent =
    `${t('register.' + currentJurusan, currentJurusan)} — ${t('register.' + currentAliran, currentAliran)}`;
  document.getElementById('wall-meta').textContent = currentSesi || '';

  // Redirect if no params
  if (!currentJurusan || !currentAliran || !currentSesi) {
    window.location.href = 'explore.html';
    return;
  }

  // Redirect if not logged in
  if (!Auth.isLoggedIn()) {
    window.location.href = 'login.html';
    return;
  }

  renderNotes();
  setupFilters();
  setupAddNote();
}

/** Render notes to the grid */
function renderNotes() {
  const t = I18n.t.bind(I18n);
  const filterKat = document.getElementById('filter-kategori')?.value || '';
  const sortBy = document.getElementById('filter-sort')?.value || 'hot';

  let notes = Notes.getByFilter(currentJurusan, currentAliran, currentSesi);

  if (filterKat) {
    notes = notes.filter(n => n.kategori === filterKat);
  }

  notes = Notes.sortBy(notes, sortBy);

  const grid = document.getElementById('notes-grid');
  const empty = document.getElementById('no-notes');
  grid.innerHTML = '';

  if (notes.length === 0) {
    grid.classList.add('hidden');
    empty.classList.remove('hidden');
  } else {
    grid.classList.remove('hidden');
    empty.classList.add('hidden');
    notes.forEach(note => {
      grid.appendChild(createNoteCard(note));
    });
  }
}

/** Create a single note card element */
function createNoteCard(note) {
  const t = I18n.t.bind(I18n);
  const card = document.createElement('div');
  card.className = 'note-card note-fly-in';
  card.style.transform = `rotate(${note.rotation}deg)`;
  card.dataset.noteId = note.id;

  const author = note.isAnonymous
    ? (note.namaSamaran || t('wall.anonymous_name'))
    : note.userId || '?';

  const timeAgo = getTimeAgo(note.createdAt);
  const catClass = 'cat-' + note.kategori;
  const catLabel = t('wall.categories.' + note.kategori, note.kategori);

  const session = Auth.getSession();
  const isBookmarked = session && Bookmarks.isBookmarked(note.id, session.id);
  const userVote = session ? Votes.getUserVote(note.id, session.id) : null;

  card.innerHTML = `
    <div class="note-pin"></div>
    <div class="note-content">${escapeHtml(note.konten)}</div>
    <div class="note-meta">
      <div class="flex gap-1 items-center">
        <span class="note-category-badge ${catClass}">${catLabel}</span>
      </div>
      <div class="flex gap-1 items-center">
        <span class="note-votes">▲${note.upvotes} ▼${note.downvotes}</span>
        <button class="note-bookmark-btn ${isBookmarked ? 'bookmarked' : ''}" data-note-id="${note.id}" title="${t('note_detail.bookmark')}">
          ${isBookmarked ? '★' : '☆'}
        </button>
      </div>
    </div>
    <div class="text-xs text-muted" style="margin-top:4px;">${author} · ${timeAgo}</div>
  `;

  // Click to open detail
  card.addEventListener('click', (e) => {
    if (e.target.closest('.note-bookmark-btn')) return;
    openNoteDetail(note.id);
  });

  // Bookmark
  const bmBtn = card.querySelector('.note-bookmark-btn');
  bmBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!session) {
      App.showToast(t('common.error', 'Please login first.'));
      return;
    }
    const nowBookmarked = Bookmarks.toggle(note.id, session.id);
    bmBtn.textContent = nowBookmarked ? '★' : '☆';
    bmBtn.classList.toggle('bookmarked', nowBookmarked);
  });

  return card;
}

/** Setup filter dropdowns */
function setupFilters() {
  const katFilter = document.getElementById('filter-kategori');
  const sortFilter = document.getElementById('filter-sort');

  if (katFilter) katFilter.addEventListener('change', renderNotes);
  if (sortFilter) sortFilter.addEventListener('change', renderNotes);
}

/** Setup add note modal */
function setupAddNote() {
  const fab = document.getElementById('fab-add');
  if (!fab) return;

  fab.addEventListener('click', () => {
    if (!Auth.isLoggedIn()) {
      App.showToast(I18n.t('common.error', 'Please login first.'));
      window.location.href = 'login.html';
      return;
    }
    App.openModal('modal-add-note');
  });

  // Character counter
  const konten = document.getElementById('note-konten');
  const charCount = document.getElementById('char-count');
  if (konten) {
    konten.addEventListener('input', () => {
      charCount.textContent = konten.value.length;
    });
  }

  // Toggle anon name field
  const anonCheck = document.getElementById('note-anonim');
  const anonGroup = document.getElementById('anon-name-group');
  if (anonCheck && anonGroup) {
    anonCheck.addEventListener('change', () => {
      anonGroup.style.display = anonCheck.checked ? 'block' : 'none';
    });
  }

  // Submit
  document.getElementById('btn-submit-note').addEventListener('click', () => {
    const session = Auth.getSession();
    const kategori = document.getElementById('note-kategori').value;
    const kontenVal = document.getElementById('note-konten').value.trim();
    const isAnon = document.getElementById('note-anonim').checked;
    const namaSamaran = document.getElementById('note-nama-samaran').value.trim();

    if (!kontenVal) {
      App.showToast(I18n.t('common.error', 'Please enter some content.'));
      return;
    }

    const note = Notes.create({
      userId: session.username,
      konten: kontenVal,
      kategori,
      jurusan: currentJurusan,
      aliran: currentAliran,
      sesi: currentSesi,
      isAnonymous: isAnon,
      namaSamaran: namaSamaran || (isAnon ? getRandomEmoji() : ''),
      anonymousIcon: isAnon ? getRandomEmoji() : ''
    });

    // Reset form
    konten.value = '';
    charCount.textContent = '0';
    anonCheck.checked = false;
    anonGroup.style.display = 'none';

    App.closeModal('modal-add-note');
    renderNotes();
    App.showToast(I18n.t('common.success', 'Note added!'));
  });
}

/** Open note detail modal */
function openNoteDetail(noteId) {
  const note = Notes.getById(noteId);
  if (!note) return;

  const t = I18n.t.bind(I18n);
  const session = Auth.getSession();
  const body = document.getElementById('note-detail-body');
  const userVote = session ? Votes.getUserVote(noteId, session.id) : null;
  const counts = Votes.getCount(noteId);
  const isBookmarked = session ? Bookmarks.isBookmarked(noteId, session.id) : false;
  const comments = Comments.getByNoteId(noteId);

  const author = note.isAnonymous
    ? (note.namaSamaran || t('wall.anonymous_name'))
    : note.userId;

  body.innerHTML = `
    <div class="note-detail-content">${escapeHtml(note.konten)}</div>
    <div class="text-sm text-muted mb-3">
      ${author} · ${getTimeAgo(note.createdAt)}
    </div>

    <!-- Vote Section -->
    <div class="vote-section">
      <button class="vote-btn ${userVote === 'up' ? 'voted-up' : ''}" id="btn-upvote" data-note-id="${noteId}">
        ▲ ${t('note_detail.upvote')}
      </button>
      <span class="vote-count" id="vote-count">${counts.up - counts.down}</span>
      <button class="vote-btn ${userVote === 'down' ? 'voted-down' : ''}" id="btn-downvote" data-note-id="${noteId}">
        ▼ ${t('note_detail.downvote')}
      </button>
      <div style="flex:1;"></div>
      <button class="btn btn-sm btn-secondary" id="btn-bookmark" data-note-id="${noteId}">
        ${isBookmarked ? '★ ' + t('note_detail.unbookmark') : '☆ ' + t('note_detail.bookmark')}
      </button>
    </div>

    <!-- Comments -->
    <div class="comments-section">
      <h4>${t('note_detail.comments')} (${comments.length})</h4>

      <!-- Add comment form -->
      <div class="comment-form">
        <input type="text" class="form-input" id="comment-input"
               data-i18n-placeholder="note_detail.add_comment"
               placeholder="${t('note_detail.add_comment')}">
        <button class="btn btn-sm btn-primary" id="btn-post-comment">${t('note_detail.post_comment')}</button>
      </div>

      <!-- Comments list -->
      <div id="comments-list" style="margin-top: 0.75rem;"></div>
    </div>
  `;

  // Vote handlers
  document.getElementById('btn-upvote').addEventListener('click', () => handleVote(noteId, 'up'));
  document.getElementById('btn-downvote').addEventListener('click', () => handleVote(noteId, 'down'));

  // Bookmark handler
  document.getElementById('btn-bookmark').addEventListener('click', () => handleBookmark(noteId));

  // Post comment handler
  document.getElementById('btn-post-comment').addEventListener('click', () => {
    const input = document.getElementById('comment-input');
    const konten = input.value.trim();
    if (!konten) return;

    Comments.add({
      noteId,
      userId: session?.id || '',
      konten,
      isAnonymous: true,
      anonymousIcon: '💬'
    });

    input.value = '';
    renderComments(noteId);
    App.showToast(t('common.success', 'Comment added!'));
  });

  App.openModal('modal-note-detail');
}

/** Handle voting */
function handleVote(noteId, direction) {
  const t = I18n.t.bind(I18n);
  const session = Auth.getSession();
  if (!session) {
    App.showToast(t('common.error', 'Please login first.'));
    return;
  }

  if (Votes.hasVoted(noteId, session.id)) {
    App.showToast(t('common.error', 'You already voted on this note.'));
    return;
  }

  Votes.submit(noteId, session.id, direction);

  // Refresh detail modal
  openNoteDetail(noteId);
  renderNotes();
}

/** Handle bookmarking */
function handleBookmark(noteId) {
  const t = I18n.t.bind(I18n);
  const session = Auth.getSession();
  if (!session) {
    App.showToast(t('common.error', 'Please login first.'));
    return;
  }

  const nowBookmarked = Bookmarks.toggle(noteId, session.id);
  const btn = document.getElementById('btn-bookmark');
  btn.textContent = (nowBookmarked ? '★ ' : '☆ ') + t(nowBookmarked ? 'note_detail.bookmark' : 'note_detail.unbookmark');
}

/** Render comments list */
function renderComments(noteId) {
  const t = I18n.t.bind(I18n);
  const list = document.getElementById('comments-list');
  if (!list) return;

  const comments = Comments.getByNoteId(noteId);

  if (comments.length === 0) {
    list.innerHTML = `<p class="text-sm text-muted">${t('note_detail.no_comments')}</p>`;
    return;
  }

  list.innerHTML = comments.map(c => renderCommentItem(c)).join('');
}

/** Render a single comment with optional replies */
function renderCommentItem(comment) {
  const t = I18n.t.bind(I18n);
  const replies = Comments.getReplies(comment.id);
  const author = comment.isAnonymous
    ? (comment.namaSamaran || t('note_detail.anonymous_commenter'))
    : comment.userId || '?';

  let html = `
    <div class="comment-item">
      <div class="flex items-center gap-1">
        <span class="comment-author">${escapeHtml(author)}</span>
        <span class="comment-time">${getTimeAgo(comment.createdAt)}</span>
      </div>
      <div class="comment-body">${escapeHtml(comment.konten)}</div>
      <button class="comment-reply-btn" data-parent-id="${comment.id}">${t('note_detail.reply')}</button>
  `;

  // Reply form (hidden by default)
  html += `<div id="reply-form-${comment.id}" class="comment-form" style="display:none; margin-top: 0.5rem;">
    <input type="text" class="form-input" placeholder="${t('note_detail.replying_to')} ${author}...">
    <button class="btn btn-sm btn-primary" data-reply-to="${comment.id}">${t('note_detail.post_comment')}</button>
    <button class="btn btn-sm btn-secondary cancel-reply">✕</button>
  </div>`;

  // Replies
  if (replies.length > 0) {
    html += `<div class="comment-replies">${replies.map(r => renderCommentItem(r)).join('')}</div>`;
  }

  html += `</div>`;
  return html;
}

// Setup reply buttons (event delegation)
document.addEventListener('click', (e) => {
  const t = I18n.t.bind(I18n);

  // Reply button
  const replyBtn = e.target.closest('.comment-reply-btn');
  if (replyBtn) {
    const parentId = replyBtn.dataset.parentId;
    const form = document.getElementById('reply-form-' + parentId);
    if (form) {
      form.style.display = form.style.display === 'none' ? 'flex' : 'none';
    }
    return;
  }

  // Cancel reply
  const cancelBtn = e.target.closest('.cancel-reply');
  if (cancelBtn) {
    const form = cancelBtn.closest('.comment-form');
    if (form) form.style.display = 'none';
    return;
  }

  // Post reply
  const postReplyBtn = e.target.closest('[data-reply-to]');
  if (postReplyBtn) {
    const parentId = postReplyBtn.dataset.replyTo;
    const form = document.getElementById('reply-form-' + parentId);
    const input = form?.querySelector('input');
    if (input && input.value.trim()) {
      // Find the parent comment to get noteId
      const commentItem = form.closest('.comment-item');
      // We need to find the noteId from the modal body
      const noteId = document.getElementById('note-detail-body')?.dataset?.noteId;
      if (noteId) {
        const session = Auth.getSession();
        Comments.add({
          noteId,
          parentId,
          userId: session?.id || '',
          konten: input.value.trim(),
          isAnonymous: true,
          anonymousIcon: '💬'
        });
        input.value = '';
        form.style.display = 'none';
        const noteEl = document.getElementById('modal-note-detail');
        const nid = noteEl?.dataset?.noteId;
        if (nid) renderComments(nid);
      }
    }
    return;
  }
});

// Store noteId on modal body when opening detail
const origOpenNoteDetail = openNoteDetail;
openNoteDetail = function(noteId) {
  const body = document.getElementById('note-detail-body');
  if (body) body.dataset.noteId = noteId;
  origOpenNoteDetail(noteId);
};

/** Utility helpers */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function getTimeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(hours / 24);
  if (days > 0) return days + I18n.t('wall.days_ago', 'd');
  if (hours > 0) return hours + I18n.t('wall.hours_ago', 'h');
  return '<1h';
}

function getRandomEmoji() {
  const emojis = ['🦁', '🐯', '🐻', '🐼', '🐨', '🦊', '🐸', '🐵', '🦄', '🐲', '🌟', '⭐', '🔥', '💫', '🎯', '📚'];
  return emojis[Math.floor(Math.random() * emojis.length)];
}
