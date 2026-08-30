// STATE MANAGEMENT
let loops = [];
const STORAGE_KEY = 'loop_app_loops';

// Guided Questionnaire Questions
const GUIDED_QUESTIONS = [
  {
    icon: 'message-square',
    title: "Is there a message, email, or text you've been putting off replying to?",
    hint: "Even a 2-minute reply can hang in your head for days. Write it down to get it out."
  },
  {
    icon: 'users',
    title: "Do you owe someone an apology, or have a difficult conversation you are postponing?",
    hint: "Relational friction takes a massive cognitive toll. Acknowledging it is the first step."
  },
  {
    icon: 'help-circle',
    title: "What decision have you been putting off, waiting for the 'perfect' moment?",
    hint: "Deciding not to decide is still a decision—and it stays active in your brain's background memory."
  },
  {
    icon: 'check-square',
    title: "Is there a task, chore, or project that is 90% done but still hanging over you?",
    hint: "Unfinished physical spaces or half-done tasks drain focus. Write it down here."
  },
  {
    icon: 'alert-circle',
    title: "What is a minor annoyance you've been tolerating instead of fixing?",
    hint: "A squeaky door, a broken subscription link, or a messy drawer. Capture the friction."
  }
];

let guidedIndex = 0;
let activeDetailsLoopId = null;
let activeQuickNoteLoopId = null;
let activeScope = 'personal';
let folders = [];
let activeFolderId = 'all';
const STORAGE_FOLDERS_KEY = 'loop_app_folders';

// Card Writer State
let cardAttachments = [];
let mediaRecorder = null;
let audioChunks = [];
let audioStartTime = 0;
let audioTimerInterval = null;

// Anxiety Checker State (Elo Ranking System)
let activeAnxietyLoops = [];
let anxietyMatches = [];
let currentMatchIndex = 0;
let totalMatches = 0;

// Standard Emojis for Picker
const EMOJIS = [
  '🧠', '💭', '📝', '✉️', '📞', '💬', '🤝', '🙏', '🤷', '🤔',
  '⏳', '📅', '🚀', '🎯', '💡', '⚠️', '🔥', '🛑', '💔', '🩹',
  '🏠', '💼', '🛒', '💵', '🩺', '🧹', '🛠️', '🚗', '✈️', '🎨'
];

// INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
  // Load loops from LocalStorage
  loadLoops();
  loadFolders();

  // Initialize Workspace Scope
  activeScope = localStorage.getItem('loop_active_scope') || 'personal';
  document.body.className = 'scope-' + activeScope;

  // Initialize Lucide Icons
  lucide.createIcons();

  // Setup Event Listeners
  setupNavigation();
  setupCardWriter();
  setupGuidedTour();
  setupAllLoopsDashboard();
  setupAnxietyChecker();
  setupModals(); // Setup new timeline & archive modals
  setupScopeSelector();
  updateScopeTogglesUI();
  setupFoldersSidebar();
  renderFoldersSidebar();
  
  // Initialize Visual Layout Builder
  initDesignMode();
});

// LOAD AND SAVE SYSTEM
function loadLoops() {
  const data = localStorage.getItem(STORAGE_KEY);
  if (data) {
    try {
      loops = JSON.parse(data);
    } catch (e) {
      console.error("Error loading loops", e);
      loops = [];
    }
  } else {
    loops = [];
  }
}

function loadFolders() {
  const data = localStorage.getItem(STORAGE_FOLDERS_KEY);
  if (data) {
    try {
      folders = JSON.parse(data);
    } catch (e) {
      console.error("Error loading folders", e);
      folders = [];
    }
  } else {
    folders = [];
  }
}

function saveFolders() {
  localStorage.setItem(STORAGE_FOLDERS_KEY, JSON.stringify(folders));
  renderFoldersSidebar();
  populateFolderSelects();
}

function saveLoops() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(loops));
  renderDashboard();
  renderFoldersSidebar();
}

// NAVIGATION SYSTEM (SPA ROUTING)
function showView(viewId) {
  // Hide all views
  const views = document.querySelectorAll('.view');
  views.forEach(v => {
    v.classList.remove('active');
    v.style.display = 'none'; // Fully hide inactive views so they don't occupy layout space
  });

  // Show selected view
  const targetView = document.getElementById(viewId);
  if (targetView) {
    targetView.style.display = 'block'; // Reset to block display
    // Force reflow
    targetView.offsetHeight;
    targetView.classList.add('active');
  }

  // Handle specific view initializations
  if (viewId === 'all-loops-screen') {
    renderDashboard();
  } else if (viewId === 'anxiety-screen') {
    initAnxietyView();
  }
}

function setupNavigation() {
  // Welcome page -> Path Choice
  document.getElementById('btn-clear-loops').addEventListener('click', () => {
    showView('path-screen');
  });

  // Path Choice -> Guided
  document.getElementById('path-guided').addEventListener('click', () => {
    guidedIndex = 0;
    document.getElementById('guided-textarea').value = '';
    renderGuidedQuestion();
    showView('guided-screen');
  });

  // Path Choice -> Direct Card Writer
  document.getElementById('path-direct').addEventListener('click', () => {
    showView('writer-screen');
  });

  // Back from Path Choice to Welcome
  document.querySelector('.btn-back-welcome').addEventListener('click', () => {
    showView('welcome-screen');
  });

  // Logo clicks always return to the starting Welcome screen
  document.querySelectorAll('.clickable-logo').forEach(logo => {
    logo.addEventListener('click', () => {
      showView('welcome-screen');
    });
  });

  // Bottom Navigation in Dashboard
  document.getElementById('btn-nav-write').addEventListener('click', () => {
    showView('writer-screen');
  });

  document.getElementById('btn-nav-anxiety').addEventListener('click', () => {
    showView('anxiety-screen');
  });

  // Top header button to Dashboard
  document.getElementById('btn-go-all-loops').addEventListener('click', () => {
    showView('all-loops-screen');
  });

  // Back to Dashboard from Anxiety Screen
  document.querySelectorAll('.btn-back-loops').forEach(btn => {
    btn.addEventListener('click', () => {
      showView('all-loops-screen');
    });
  });
}

// PATH 1: GUIDED QUESTIONNAIRE
function renderGuidedQuestion() {
  const q = GUIDED_QUESTIONS[guidedIndex];
  const total = GUIDED_QUESTIONS.length;
  
  // Update progress bar & counters
  const progressPercent = ((guidedIndex + 1) / total) * 100;
  document.getElementById('guided-progress').style.width = `${progressPercent}%`;
  document.getElementById('guided-step-counter').innerText = `Step ${guidedIndex + 1} of ${total}`;

  // Update question contents
  const qIcon = document.getElementById('q-icon');
  qIcon.setAttribute('data-lucide', q.icon);
  document.getElementById('q-title').innerText = q.title;
  document.getElementById('q-hint').innerText = q.hint;
  
  // Re-create icons since elements changed dynamically
  lucide.createIcons();

  // Clear inputs
  document.getElementById('guided-textarea').value = '';
  document.getElementById('guided-textarea').focus();

  // Update button label
  const btnNext = document.getElementById('btn-guided-next');
  if (guidedIndex === total - 1) {
    btnNext.querySelector('span').innerText = 'Finish & See Loops';
  } else {
    btnNext.querySelector('span').innerText = 'Capture & Next';
  }
}

function setupGuidedTour() {
  const textarea = document.getElementById('guided-textarea');
  const btnNext = document.getElementById('btn-guided-next');
  const btnSkip = document.getElementById('btn-guided-skip');

  const handleNext = () => {
    const textVal = textarea.value.trim();
    if (textVal) {
      // Create and save loop
      const newLoop = {
        id: 'loop_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        text: textVal,
        priority: 'medium', // Default to medium for guided entries
        createdAt: new Date().toISOString(),
        status: 'open',
        attachments: [],
        elo: 1000, // Base Elo for anxiety checker
        deadline: '',
        milestones: [],
        quickNote: '',
        scope: 'personal'
      };
      loops.push(newLoop);
      saveLoops();
    }

    // Go to next or finish
    if (guidedIndex < GUIDED_QUESTIONS.length - 1) {
      guidedIndex++;
      renderGuidedQuestion();
    } else {
      // Completed questionnaire, go to board
      showView('all-loops-screen');
    }
  };

  btnNext.addEventListener('click', handleNext);
  btnSkip.addEventListener('click', () => {
    if (guidedIndex < GUIDED_QUESTIONS.length - 1) {
      guidedIndex++;
      renderGuidedQuestion();
    } else {
      showView('all-loops-screen');
    }
  });
}

// PATH 2: CARD WRITER
function setupCardWriter() {
  const textarea = document.getElementById('card-note-text');
  const prioritySelect = document.getElementById('card-priority');
  const btnSend = document.getElementById('btn-send-card');
  const activeCard = document.getElementById('active-card');
  
  // Emoji Picker Logic
  const btnEmoji = document.getElementById('btn-emoji');
  const emojiPicker = document.getElementById('emoji-picker');
  const btnCloseEmoji = document.getElementById('btn-close-emoji');
  const emojiList = emojiPicker.querySelector('.emoji-list');

  // Generate Emojis in grid
  EMOJIS.forEach(emoji => {
    const item = document.createElement('span');
    item.className = 'emoji-item';
    item.innerText = emoji;
    item.addEventListener('click', () => {
      const startPos = textarea.selectionStart;
      const endPos = textarea.selectionEnd;
      const text = textarea.value;
      textarea.value = text.substring(0, startPos) + emoji + text.substring(endPos);
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = startPos + emoji.length;
      emojiPicker.classList.add('hidden');
    });
    emojiList.appendChild(item);
  });

  btnEmoji.addEventListener('click', (e) => {
    e.stopPropagation();
    emojiPicker.classList.toggle('hidden');
  });

  btnCloseEmoji.addEventListener('click', (e) => {
    e.stopPropagation();
    emojiPicker.classList.add('hidden');
  });

  document.addEventListener('click', (e) => {
    if (!emojiPicker.contains(e.target) && e.target !== btnEmoji) {
      emojiPicker.classList.add('hidden');
    }
  });

  // Attachments UI & Input Triggers
  const btnImage = document.getElementById('btn-attach-image');
  const inputImage = document.getElementById('input-image');
  const btnVideo = document.getElementById('btn-attach-video');
  const inputVideo = document.getElementById('input-video');

  btnImage.addEventListener('click', () => inputImage.click());
  btnVideo.addEventListener('click', () => inputVideo.click());

  inputImage.addEventListener('change', (e) => handleFileSelect(e, 'image'));
  inputVideo.addEventListener('change', (e) => handleFileSelect(e, 'video'));

  // Audio Recording Controls
  const btnAudio = document.getElementById('btn-record-audio');
  const audioPanel = document.getElementById('audio-recording-panel');
  const btnAudioCancel = document.getElementById('btn-audio-cancel');
  const btnAudioStop = document.getElementById('btn-audio-stop');
  const timerSpan = document.getElementById('recording-timer');

  btnAudio.addEventListener('click', startAudioRecording);
  btnAudioCancel.addEventListener('click', cancelAudioRecording);
  btnAudioStop.addEventListener('click', stopAudioRecording);

  // Send Note (Close current, slide right, open blank from left)
  btnSend.addEventListener('click', () => {
    const textVal = textarea.value.trim();
    if (!textVal && cardAttachments.length === 0) {
      // Shake animation to indicate empty
      activeCard.style.animation = 'shake 0.3s ease-in-out';
      setTimeout(() => { activeCard.style.animation = ''; }, 300);
      return;
    }

    // 1. Create loop item object
    const deadlineVal = document.getElementById('card-deadline').value || '';
    const scopeVal = document.getElementById('card-scope').value || 'personal';
    const folderVal = document.getElementById('card-folder').value || 'none';
    const newLoop = {
      id: 'loop_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      text: textVal,
      priority: prioritySelect.value,
      createdAt: new Date().toISOString(),
      status: 'open',
      attachments: [...cardAttachments],
      elo: 1000,
      deadline: deadlineVal,
      milestones: [],
      quickNote: '',
      scope: scopeVal,
      folderId: folderVal === 'none' ? undefined : folderVal
    };

    // 2. Add to local state and save
    loops.push(newLoop);
    saveLoops();

    // 3. Trigger Slide Animations
    activeCard.classList.add('slide-out-right');
    
    // Wait for the slide out animation to finish
    setTimeout(() => {
      // Reset card content & state
      textarea.value = '';
      prioritySelect.value = 'high';
      document.getElementById('card-deadline').value = '';
      document.getElementById('card-scope').value = activeScope;
      document.getElementById('card-folder').value = activeFolderId === 'all' || activeFolderId === 'uncategorized' ? 'none' : activeFolderId;
      cardAttachments = [];
      renderAttachmentsPreviews();

      // Reposition card offscreen left and slide in
      activeCard.classList.remove('slide-out-right');
      activeCard.classList.add('slide-in-left');
      
      setTimeout(() => {
        activeCard.classList.remove('slide-in-left');
      }, 500);

    }, 500);
  });
}

// ATTACHMENTS HELPERS
function handleFileSelect(e, type) {
  const file = e.target.files[0];
  if (!file) return;

  // Cap size at 4MB to prevent LocalStorage limits
  if (file.size > 4 * 1024 * 1024) {
    alert("Attachment is too large. Please select a file smaller than 4MB.");
    return;
  }

  const reader = new FileReader();
  reader.onload = function(evt) {
    cardAttachments.push({
      type: type,
      dataUrl: evt.target.result,
      name: file.name
    });
    renderAttachmentsPreviews();
  };
  reader.readAsDataURL(file);

  // Clear inputs
  e.target.value = '';
}

function renderAttachmentsPreviews() {
  const container = document.getElementById('attachment-previews');
  container.innerHTML = '';

  cardAttachments.forEach((att, idx) => {
    const item = document.createElement('div');
    item.className = 'preview-item';

    if (att.type === 'image') {
      const img = document.createElement('img');
      img.src = att.dataUrl;
      item.appendChild(img);
    } else if (att.type === 'video') {
      const vid = document.createElement('video');
      vid.src = att.dataUrl;
      vid.muted = true;
      item.appendChild(vid);
    } else if (att.type === 'audio') {
      const icon = document.createElement('i');
      icon.setAttribute('data-lucide', 'music');
      item.appendChild(icon);
      
      const span = document.createElement('span');
      span.className = 'preview-name';
      span.innerText = att.name || 'Audio note';
      item.appendChild(span);
    }

    // Delete Button
    const delBtn = document.createElement('button');
    delBtn.className = 'remove-preview-btn';
    delBtn.innerHTML = '&times;';
    delBtn.addEventListener('click', () => {
      cardAttachments.splice(idx, 1);
      renderAttachmentsPreviews();
    });
    item.appendChild(delBtn);

    container.appendChild(item);
  });

  lucide.createIcons();
}

// AUDIO RECORDING CORE IMPLEMENTATION
async function startAudioRecording() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert("Audio recording is not supported on this browser.");
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        audioChunks.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      // Stop stream tracks
      stream.getTracks().forEach(track => track.stop());
      
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      
      // Check size limit
      if (audioBlob.size > 4 * 1024 * 1024) {
        alert("Recorded audio note is too long (over 4MB limit).");
        return;
      }

      const reader = new FileReader();
      reader.onload = function(e) {
        cardAttachments.push({
          type: 'audio',
          dataUrl: e.target.result,
          name: `Audio note (${new Date().toLocaleTimeString([], {minute: '2-digit', second:'2-digit'})})`
        });
        renderAttachmentsPreviews();
      };
      reader.readAsDataURL(audioBlob);
    };

    // UI Updates
    document.getElementById('audio-recording-panel').classList.remove('hidden');
    audioChunks = [];
    mediaRecorder.start();
    
    // Timer
    audioStartTime = Date.now();
    updateAudioTimer();
    audioTimerInterval = setInterval(updateAudioTimer, 1000);

  } catch (err) {
    console.error("Microphone access denied or error", err);
    alert("Could not access microphone. Please check permissions.");
  }
}

function updateAudioTimer() {
  const elapsed = Math.floor((Date.now() - audioStartTime) / 1000);
  const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
  const seconds = (elapsed % 60).toString().padStart(2, '0');
  document.getElementById('recording-timer').innerText = `${minutes}:${seconds}`;
}

function stopAudioRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
  clearInterval(audioTimerInterval);
  document.getElementById('audio-recording-panel').classList.add('hidden');
}

function cancelAudioRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.onstop = null; // Ignore save
    mediaRecorder.stop();
  }
  clearInterval(audioTimerInterval);
  document.getElementById('audio-recording-panel').classList.add('hidden');
}

// ALL LOOPS DASHBOARD
function renderDashboard() {
  // Clear lists
  const priorities = ['urgent', 'high', 'medium', 'low'];
  priorities.forEach(p => {
    document.getElementById(`cards-${p}`).innerHTML = '';
    document.getElementById(`count-${p}`).innerText = '0';
  });

  const openLoopsInSpace = loops.filter(l => l.status === 'open' && (l.scope || 'personal') === activeScope);
  const closedLoopsInSpace = loops.filter(l => l.status === 'closed' && (l.scope || 'personal') === activeScope);

  // Further filter open loops for the board columns based on selected folder
  let openLoops = openLoopsInSpace;
  if (activeFolderId === 'uncategorized') {
    openLoops = openLoopsInSpace.filter(l => !l.folderId || l.folderId === 'none');
  } else if (activeFolderId !== 'all') {
    openLoops = openLoopsInSpace.filter(l => l.folderId === activeFolderId);
  }

  // Stats (Total count in the active space)
  document.getElementById('open-loops-count').innerText = openLoopsInSpace.length;
  document.getElementById('closed-loops-count').innerText = closedLoopsInSpace.length;

  const priorityCounts = { urgent: 0, high: 0, medium: 0, low: 0 };

  openLoops.forEach(loop => {
    priorityCounts[loop.priority]++;
    
    const cardEl = createDashboardCardElement(loop);
    document.getElementById(`cards-${loop.priority}`).appendChild(cardEl);
  });

  // Update counts on headers
  priorities.forEach(p => {
    document.getElementById(`count-${p}`).innerText = priorityCounts[p];
  });

  lucide.createIcons();
}

function createDashboardCardElement(loop) {
  const card = document.createElement('div');
  card.className = 'loop-item-card';
  card.setAttribute('draggable', 'true');
  card.setAttribute('data-id', loop.id);

  // Card Drag & Drop Listeners
  card.addEventListener('dragstart', handleDragStart);
  card.addEventListener('dragend', handleDragEnd);

  // Card Click opens details/journey modal (only when not in builder mode)
  card.addEventListener('click', (e) => {
    if (document.body.classList.contains('design-mode-active')) return;
    if (e.target.closest('.mini-action-btn')) return; // skip modal if clicking status buttons
    openDetailsModal(loop.id);
  });

  // Time formatted
  const timeStr = new Date(loop.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Deadline Formatting
  let deadlineHTML = '';
  if (loop.deadline) {
    const formattedDeadline = formatDeadlineDate(loop.deadline);
    const isOverdue = new Date(loop.deadline).setHours(23, 59, 59, 999) < Date.now();
    deadlineHTML = `
      <div class="card-deadline-badge ${isOverdue ? 'overdue' : ''}">
        <i data-lucide="calendar"></i>
        <span>Due ${formattedDeadline}</span>
      </div>
    `;
  }

  // Compile attachments HTML
  let attachmentsHTML = '';
  if (loop.attachments && loop.attachments.length > 0) {
    loop.attachments.forEach(att => {
      if (att.type === 'image') {
        attachmentsHTML += `<div class="loop-item-media"><img src="${att.dataUrl}"></div>`;
      } else if (att.type === 'video') {
        attachmentsHTML += `<div class="loop-item-media"><video src="${att.dataUrl}" controls></video></div>`;
      } else if (att.type === 'audio') {
        attachmentsHTML += `<div class="loop-item-media"><audio src="${att.dataUrl}" controls></audio></div>`;
      }
    });
  }

  // Determine core card body text (displays the latest evolutionary update if present)
  let cardBodyHTML = `<p class="loop-text-body">${escapeHTML(loop.text)}</p>`;
  if (loop.milestones && loop.milestones.length > 0) {
    // Find chronologically latest milestone
    const sortedMilestones = [...loop.milestones].sort((a, b) => new Date(b.date) - new Date(a.date));
    const latestMilestone = sortedMilestones[0];
    cardBodyHTML = `
      <div class="loop-text-evolution">
        <span class="evolution-marker"><i data-lucide="chevrons-right"></i> Current Step</span>
        <p class="loop-text-body current-evolution">${escapeHTML(latestMilestone.text)}</p>
        <span class="evolution-origin">Orig: ${escapeHTML(loop.text)}</span>
      </div>
    `;
  }

  card.innerHTML = `
    <div class="loop-item-header">
      <span class="loop-item-time">${timeStr}</span>
    </div>
    ${cardBodyHTML}
    ${deadlineHTML}
    ${attachmentsHTML}
    <div class="loop-item-actions">
      <span class="priority-badge badge-${loop.priority}">${loop.priority}</span>
      <div class="item-action-btns">
        <button class="mini-action-btn quick-note" title="Quick Note">
          <i data-lucide="notebook"></i>
        </button>
        <button class="mini-action-btn check-done" title="Close Loop">
          <i data-lucide="check-circle-2"></i>
        </button>
        <button class="mini-action-btn delete-trash" title="Delete Loop">
          <i data-lucide="trash-2"></i>
        </button>
      </div>
    </div>
  `;

  // Action listeners
  card.querySelector('.quick-note').addEventListener('click', (e) => {
    e.stopPropagation();
    openQuickNoteModal(loop.id);
  });

  card.querySelector('.check-done').addEventListener('click', (e) => {
    e.stopPropagation();
    closeLoop(loop.id);
  });

  card.querySelector('.delete-trash').addEventListener('click', (e) => {
    e.stopPropagation();
    deleteLoop(loop.id);
  });

  return card;
}

function setupAllLoopsDashboard() {
  const columns = document.querySelectorAll('.priority-column');
  
  columns.forEach(col => {
    col.addEventListener('dragover', handleDragOver);
    col.addEventListener('drop', handleDrop);
  });
}

// Drag & Drop Functionality
let draggedCardId = null;

function handleDragStart(e) {
  draggedCardId = this.getAttribute('data-id');
  this.style.opacity = '0.4';
}

function handleDragEnd(e) {
  this.style.opacity = '1';
  draggedCardId = null;
}

function handleDragOver(e) {
  e.preventDefault();
}

function handleDrop(e) {
  e.preventDefault();
  if (!draggedCardId) return;

  // Determine priority column dragged into
  const targetCol = e.currentTarget;
  let newPriority = '';
  if (targetCol.classList.contains('urgent-col')) newPriority = 'urgent';
  else if (targetCol.classList.contains('high-col')) newPriority = 'high';
  else if (targetCol.classList.contains('medium-col')) newPriority = 'medium';
  else if (targetCol.classList.contains('low-col')) newPriority = 'low';

  // Update priority of dragged loop
  const loopIdx = loops.findIndex(l => l.id === draggedCardId);
  if (loopIdx !== -1 && loops[loopIdx].priority !== newPriority) {
    loops[loopIdx].priority = newPriority;
    saveLoops();
  }
}

// Actions Core
function closeLoop(id) {
  const loopIdx = loops.findIndex(l => l.id === id);
  if (loopIdx !== -1) {
    // Elegant fade out
    const cardEl = document.querySelector(`.loop-item-card[data-id="${id}"]`);
    if (cardEl) {
      cardEl.style.transform = 'scale(0.8)';
      cardEl.style.opacity = '0';
      setTimeout(() => {
        loops[loopIdx].status = 'closed';
        saveLoops();
      }, 300);
    } else {
      loops[loopIdx].status = 'closed';
      saveLoops();
    }
  }
}

function deleteLoop(id) {
  const confirmDelete = confirm("Are you sure you want to permanently delete this open loop?");
  if (confirmDelete) {
    loops = loops.filter(l => l.id !== id);
    saveLoops();
  }
}

// ANXIETY CHECKER
function setupAnxietyChecker() {
  document.getElementById('btn-start-anxiety').addEventListener('click', startAnxietyEvaluation);
  document.getElementById('btn-anxiety-go-write').addEventListener('click', () => showView('writer-screen'));
  document.getElementById('btn-re-evaluate').addEventListener('click', startAnxietyEvaluation);

  // Match Button Actions
  document.getElementById('comp-card-a').addEventListener('click', () => handleAnxietyChoice('A'));
  document.getElementById('comp-card-b').addEventListener('click', () => handleAnxietyChoice('B'));
  document.getElementById('btn-skip-comparison').addEventListener('click', () => handleAnxietyChoice('neutral'));
}

function initAnxietyView() {
  // Show intro or empty state
  let activeLoops = loops.filter(l => l.status === 'open' && (l.scope || 'personal') === activeScope);
  if (activeFolderId === 'uncategorized') {
    activeLoops = activeLoops.filter(l => !l.folderId || l.folderId === 'none');
  } else if (activeFolderId !== 'all') {
    activeLoops = activeLoops.filter(l => l.folderId === activeFolderId);
  }
  
  if (activeLoops.length === 0) {
    showAnxietyState('anxiety-empty');
  } else {
    showAnxietyState('anxiety-setup');
  }
}

function showAnxietyState(stateId) {
  const states = ['anxiety-setup', 'anxiety-empty', 'anxiety-comparison', 'anxiety-results'];
  states.forEach(s => {
    const el = document.getElementById(s);
    if (s === stateId) {
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  });
}

function startAnxietyEvaluation() {
  const activeAnxietyLoopsInSpace = loops.filter(l => l.status === 'open' && (l.scope || 'personal') === activeScope);
  activeAnxietyLoops = activeAnxietyLoopsInSpace;
  if (activeFolderId === 'uncategorized') {
    activeAnxietyLoops = activeAnxietyLoopsInSpace.filter(l => !l.folderId || l.folderId === 'none');
  } else if (activeFolderId !== 'all') {
    activeAnxietyLoops = activeAnxietyLoopsInSpace.filter(l => l.folderId === activeFolderId);
  }
  
  if (activeAnxietyLoops.length === 0) {
    showAnxietyState('anxiety-empty');
    return;
  }

  if (activeAnxietyLoops.length === 1) {
    // Single loop doesn't need pairwise comparison
    displayAnxietyResults();
    return;
  }

  // Reset Elo scores for comparison if they don't exist
  activeAnxietyLoops.forEach(l => {
    if (l.elo === undefined) l.elo = 1000;
  });

  // Generate Matchups
  anxietyMatches = generateMatchups(activeAnxietyLoops);
  currentMatchIndex = 0;
  totalMatches = anxietyMatches.length;

  showAnxietyState('anxiety-comparison');
  displayCurrentMatch();
}

function generateMatchups(itemList) {
  const matches = [];
  const N = itemList.length;
  
  // We want to run a sensible number of comparisons.
  // If small count, compare all pairs (N*(N-1)/2).
  // If large, pick random pairs (approx 3 * N comparisons).
  if (N <= 5) {
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        matches.push({ itemA: itemList[i], itemB: itemList[j] });
      }
    }
  } else {
    // Generate 3 * N pairs with similar Elos if possible
    // First sort by Elo to match close items
    itemList.sort((a,b) => b.elo - a.elo);
    
    // Local pairings (neighbor comparisons)
    for (let i = 0; i < N - 1; i++) {
      matches.push({ itemA: itemList[i], itemB: itemList[i+1] });
    }
    
    // Random pairings to balance
    const matchLimit = Math.min(N * 3, 20);
    while (matches.length < matchLimit) {
      const idxA = Math.floor(Math.random() * N);
      let idxB = Math.floor(Math.random() * N);
      while (idxB === idxA) {
        idxB = Math.floor(Math.random() * N);
      }
      
      // Avoid duplicate matchups
      const duplicate = matches.some(m => 
        (m.itemA.id === itemList[idxA].id && m.itemB.id === itemList[idxB].id) ||
        (m.itemA.id === itemList[idxB].id && m.itemB.id === itemList[idxA].id)
      );

      if (!duplicate) {
        matches.push({ itemA: itemList[idxA], itemB: itemList[idxB] });
      }
    }
  }

  // Shuffle matches so it doesn't feel sequential
  return matches.sort(() => Math.random() - 0.5);
}

function displayCurrentMatch() {
  const match = anxietyMatches[currentMatchIndex];
  const itemA = match.itemA;
  const itemB = match.itemB;

  // Update progress UI
  const progressPercent = (currentMatchIndex / totalMatches) * 100;
  document.getElementById('comp-progress-fill').style.width = `${progressPercent}%`;
  document.getElementById('comp-progress-text').innerText = `Match ${currentMatchIndex + 1} of ${totalMatches}`;

  // Card A render
  document.getElementById('comp-card-a-text').innerText = itemA.text;
  renderMatchCardMedia('comp-card-a-media', itemA);

  // Card B render
  document.getElementById('comp-card-b-text').innerText = itemB.text;
  renderMatchCardMedia('comp-card-b-media', itemB);

  lucide.createIcons();
}

function renderMatchCardMedia(containerId, item) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  
  if (item.attachments && item.attachments.length > 0) {
    const first = item.attachments[0];
    if (first.type === 'image') {
      container.innerHTML = `<img src="${first.dataUrl}">`;
    } else if (first.type === 'video') {
      container.innerHTML = `<video src="${first.dataUrl}" muted></video>`;
    } else if (first.type === 'audio') {
      container.innerHTML = `<i data-lucide="mic"></i>`;
    }
  }
}

function handleAnxietyChoice(winnerCode) {
  const match = anxietyMatches[currentMatchIndex];
  const itemA = match.itemA;
  const itemB = match.itemB;

  // Calculate Elo adjustment
  const K = 32;
  const eloA = itemA.elo || 1000;
  const eloB = itemB.elo || 1000;

  const expectedA = 1 / (1 + Math.pow(10, (eloB - eloA) / 400));
  const expectedB = 1 / (1 + Math.pow(10, (eloA - eloB) / 400));

  let outcomeA, outcomeB;
  if (winnerCode === 'A') {
    outcomeA = 1; outcomeB = 0;
  } else if (winnerCode === 'B') {
    outcomeA = 0; outcomeB = 1;
  } else {
    // Draw / Neutral
    outcomeA = 0.5; outcomeB = 0.5;
  }

  // Adjust Elo ratings
  const newEloA = Math.round(eloA + K * (outcomeA - expectedA));
  const newEloB = Math.round(eloB + K * (outcomeB - expectedB));

  // Write back to original loops structure
  const idxA = loops.findIndex(l => l.id === itemA.id);
  const idxB = loops.findIndex(l => l.id === itemB.id);

  if (idxA !== -1) loops[idxA].elo = newEloA;
  if (idxB !== -1) loops[idxB].elo = newEloB;

  saveLoops(); // Persist changes

  // Next match
  currentMatchIndex++;
  if (currentMatchIndex < totalMatches) {
    displayCurrentMatch();
  } else {
    displayAnxietyResults();
  }
}

function displayAnxietyResults() {
  const listContainer = document.getElementById('anxiety-ranking-list');
  listContainer.innerHTML = '';

  const activeLoops = loops.filter(l => l.status === 'open');
  
  // Sort by Elo descending (highest Elo = highest anxiety)
  activeLoops.sort((a, b) => (b.elo || 1000) - (a.elo || 1000));

  activeLoops.forEach((loop, index) => {
    const rankEl = document.createElement('div');
    rankEl.className = 'rank-item';

    // Descriptions based on ranking severity
    let threatLevel = '';
    let percentage = '';
    if (index === 0) {
      threatLevel = '🔴 Critical Energy Drain';
      percentage = 'Draining ~85% of battery';
    } else if (index === 1) {
      threatLevel = '🟠 High Tension Loop';
      percentage = 'Draining ~60% of battery';
    } else if (index === 2) {
      threatLevel = '🟡 Moderate Cognitive Load';
      percentage = 'Draining ~40% of battery';
    } else {
      threatLevel = '🟢 Minor Open Loop';
      percentage = 'Draining ~15% of battery';
    }

    rankEl.innerHTML = `
      <div class="rank-badge">${index + 1}</div>
      <div class="rank-text-content">
        <p>${escapeHTML(loop.text)}</p>
        <div class="rank-meta">
          <span class="rank-prio">${threatLevel}</span>
          <span>&bull;</span>
          <span>${percentage}</span>
        </div>
      </div>
    `;
    listContainer.appendChild(rankEl);
  });

  showAnxietyState('anxiety-results');
  lucide.createIcons();
}

// UTILITY FUNCTIONS
function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

// ==========================================================================
// VISUAL LAYOUT BUILDER & ARTBOARD IMPLEMENTATION
// ==========================================================================

function initDesignMode() {
  const btnToggle = document.getElementById('btn-toggle-design');
  const panel = document.getElementById('design-panel');
  const btnClosePanel = document.getElementById('btn-close-design-panel');
  const btnModeStandard = document.getElementById('btn-mode-standard');
  const btnModeArtboard = document.getElementById('btn-mode-artboard');
  const btnReset = document.getElementById('btn-reset-layout');
  const btnCopyCss = document.getElementById('btn-copy-css');
  const cssOutput = document.getElementById('design-css-output');
  const appContainer = document.getElementById('main-app-container');

  let isDesignModeActive = false;
  let layoutData = JSON.parse(localStorage.getItem('loop_custom_layout')) || {};
  let textData = JSON.parse(localStorage.getItem('loop_custom_texts')) || {};

  // Make the Designer Panel itself draggable via its header!
  makeDesignPanelDraggable();

  // Apply saved layout and text on load
  applySavedLayoutAndTexts();

  // Toggle Panel
  btnToggle.addEventListener('click', () => {
    panel.classList.toggle('hidden');
    isDesignModeActive = !panel.classList.contains('hidden');
    toggleDesignModeState(isDesignModeActive);
  });

  btnClosePanel.addEventListener('click', () => {
    panel.classList.add('hidden');
    isDesignModeActive = false;
    toggleDesignModeState(false);
  });

  // Switch Workspace Modes
  btnModeStandard.addEventListener('click', () => {
    btnModeStandard.classList.add('active');
    btnModeArtboard.classList.remove('active');
    appContainer.classList.remove('artboard-view-active');
    
    // Restore layout displays
    showView('welcome-screen');
  });

  btnModeArtboard.addEventListener('click', () => {
    btnModeArtboard.classList.add('active');
    btnModeStandard.classList.remove('active');
    appContainer.classList.add('artboard-view-active');
    
    // Show all views side-by-side
    const views = document.querySelectorAll('.view');
    views.forEach(v => {
      v.style.display = 'flex';
    });
  });

  // Reset Layout & Text content back to defaults
  btnReset.addEventListener('click', () => {
    if (confirm("Reset all visual repositionings, sizes, and edited text back to defaults?")) {
      localStorage.removeItem('loop_custom_layout');
      localStorage.removeItem('loop_custom_texts');
      layoutData = {};
      textData = {};
      
      document.querySelectorAll('[data-design-el]').forEach(el => {
        el.style.transform = '';
        el.style.width = '';
        el.style.height = '';
      });

      window.location.reload();
    }
  });

  // Copy CSS code
  btnCopyCss.addEventListener('click', () => {
    cssOutput.select();
    document.execCommand('copy');
    alert("CSS layout styles copied to clipboard! Paste these into style.css to make them permanent.");
  });

  // Toggle design mode states
  function toggleDesignModeState(active) {
    if (active) {
      document.body.classList.add('design-mode-active');
      makeElementsDraggableAndResizable();
      makeTextsEditable(true);
      generateCSSOutput();
    } else {
      document.body.classList.remove('design-mode-active');
      makeTextsEditable(false);
    }
  }

  // Make the design panel itself draggable
  function makeDesignPanelDraggable() {
    const header = panel.querySelector('.design-panel-header');
    header.style.cursor = 'move';
    
    header.addEventListener('pointerdown', (e) => {
      if (e.target.classList.contains('close-panel-btn')) return;
      
      e.preventDefault();
      const rect = panel.getBoundingClientRect();
      const startX = e.clientX;
      const startY = e.clientY;
      const startLeft = rect.left;
      const startTop = rect.top;
      
      const onPointerMove = (moveEvent) => {
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        panel.style.left = `${startLeft + dx}px`;
        panel.style.top = `${startTop + dy}px`;
      };
      
      const onPointerUp = () => {
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
      };
      
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    });
  }

  // Apply layout and text content
  function applySavedLayoutAndTexts() {
    // Apply layouts
    for (const key in layoutData) {
      const el = document.querySelector(`[data-design-el="${key}"]`);
      if (el) {
        const styles = layoutData[key];
        if (styles.transform) el.style.transform = styles.transform;
        if (styles.width) el.style.width = styles.width;
        if (styles.height) el.style.height = styles.height;
      }
    }

    // Apply texts
    for (const id in textData) {
      const el = document.getElementById(id) || document.querySelector(`[data-design-el="${id}"]`) || getElementByTextHash(id);
      if (el) {
        el.innerText = textData[id];
      }
    }
  }

  // Setup drag & resize pointer handlers
  function makeElementsDraggableAndResizable() {
    const designEls = document.querySelectorAll('[data-design-el]');
    
    designEls.forEach(el => {
      // Append resize handle if it doesn't exist
      if (!el.querySelector('.design-resize-handle')) {
        const handle = document.createElement('div');
        handle.className = 'design-resize-handle';
        el.appendChild(handle);

        // Setup resize pointer events
        handle.addEventListener('pointerdown', (e) => {
          e.stopPropagation();
          e.preventDefault();

          const rect = el.getBoundingClientRect();
          const startWidth = rect.width;
          const startHeight = rect.height;
          const startX = e.clientX;
          const startY = e.clientY;

          const onPointerMove = (moveEvent) => {
            const newWidth = Math.max(50, startWidth + (moveEvent.clientX - startX));
            const newHeight = Math.max(30, startHeight + (moveEvent.clientY - startY));
            el.style.width = `${newWidth}px`;
            el.style.height = `${newHeight}px`;
            
            const key = el.getAttribute('data-design-el');
            if (!layoutData[key]) layoutData[key] = {};
            layoutData[key].width = `${newWidth}px`;
            layoutData[key].height = `${newHeight}px`;
            generateCSSOutput();
          };

          const onPointerUp = () => {
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
            localStorage.setItem('loop_custom_layout', JSON.stringify(layoutData));
          };

          window.addEventListener('pointermove', onPointerMove);
          window.addEventListener('pointerup', onPointerUp);
        });
      }

      // Drag pointer events (repositioning using transform translate)
      el.addEventListener('pointerdown', (e) => {
        if (!isDesignModeActive) return;
        
        // Skip drag only if focusing inside editable text tags, select, or textareas
        if (e.target.classList.contains('design-resize-handle') || e.target.closest('select') || e.target.closest('textarea') || e.target.contentEditable === "true") {
          return;
        }

        e.stopPropagation();
        
        // Prevent click/navigation only if we are clicking on non-text elements
        if (!e.target.hasAttribute('contenteditable') && e.target.getAttribute('contenteditable') !== 'true') {
          e.preventDefault();
        }
        
        el.classList.add('is-dragging');

        // Extract existing translate values
        let currentX = 0;
        let currentY = 0;
        const transformStr = el.style.transform || '';
        const match = transformStr.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/);
        if (match) {
          currentX = parseFloat(match[1]);
          currentY = parseFloat(match[2]);
        }

        const startX = e.clientX;
        const startY = e.clientY;

        const onPointerMove = (moveEvent) => {
          const deltaX = moveEvent.clientX - startX;
          const deltaY = moveEvent.clientY - startY;
          
          const newX = currentX + deltaX;
          const newY = currentY + deltaY;
          
          el.style.transform = `translate(${newX}px, ${newY}px)`;

          const key = el.getAttribute('data-design-el');
          if (!layoutData[key]) layoutData[key] = {};
          layoutData[key].transform = `translate(${newX}px, ${newY}px)`;
          
          generateCSSOutput();
        };

        const onPointerUp = () => {
          el.classList.remove('is-dragging');
          window.removeEventListener('pointermove', onPointerMove);
          window.removeEventListener('pointerup', onPointerUp);
          localStorage.setItem('loop_custom_layout', JSON.stringify(layoutData));
        };

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
      });
    });
  }

  // Text Editable toggle helper
  function makeTextsEditable(editable) {
    const textSelectors = 'h1, h2, h3, p, blockquote, .btn, span:not(.lucide):not(.rec-dot):not(.rank-badge)';
    const designEls = document.querySelectorAll('[data-design-el]');
    
    designEls.forEach(el => {
      const tags = el.querySelectorAll(textSelectors);
      tags.forEach(tag => {
        if (tag.closest('select') || tag.closest('textarea') || tag.closest('.media-toolbar') || tag.closest('.mini-action-btn')) return;
        
        tag.contentEditable = editable ? "true" : "false";

        if (editable) {
          tag.addEventListener('blur', () => {
            const key = getUniqueTextId(tag, el);
            textData[key] = tag.innerText.trim();
            localStorage.setItem('loop_custom_texts', JSON.stringify(textData));
          });
        }
      });
    });
  }

  function getUniqueTextId(tag, parentEl) {
    const parentKey = parentEl.getAttribute('data-design-el');
    const tagName = tag.tagName.toLowerCase();
    const tagClass = tag.className.split(' ')[0] || '';
    return `${parentKey}_${tagName}_${tagClass}`.replace(/[^a-zA-Z0-9_]/g, '_');
  }

  function getElementByTextHash(hash) {
    const parts = hash.split('_');
    const parentKey = parts[0];
    const parent = document.querySelector(`[data-design-el="${parentKey}"]`);
    if (!parent) return null;

    const tagName = parts[1];
    const className = parts[2];
    
    if (className) {
      return parent.querySelector(`${tagName}.${className}`);
    }
    return parent.querySelector(tagName);
  }

  // Generate copyable CSS output using transform translate
  function generateCSSOutput() {
    let cssString = '/* Paste this CSS into style.css to save layout permanently */\n\n';
    
    for (const key in layoutData) {
      const styles = layoutData[key];
      cssString += `[data-design-el="${key}"] {\n`;
      if (styles.transform) cssString += `  transform: ${styles.transform};\n`;
      if (styles.width) cssString += `  width: ${styles.width};\n`;
      if (styles.height) cssString += `  height: ${styles.height};\n`;
      cssString += `}\n\n`;
    }

    cssOutput.value = cssString;
  }
}

// ==========================================================================
// LOOP JOURNEY & ARCHIVE DRAWER CODE
// ==========================================================================

function formatDeadlineDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function setupModals() {
  const detailsModal = document.getElementById('details-modal');
  const archiveModal = document.getElementById('archive-modal');
  const quickNoteModal = document.getElementById('quick-note-modal');
  const quickNoteTextarea = document.getElementById('quick-note-textarea');
  const saveStatus = document.getElementById('quick-note-save-status');
  
  // Close triggers
  document.getElementById('btn-close-details').addEventListener('click', () => {
    detailsModal.classList.add('hidden');
    activeDetailsLoopId = null;
  });
  
  document.getElementById('btn-close-archive').addEventListener('click', () => {
    archiveModal.classList.add('hidden');
  });

  document.getElementById('btn-close-quick-note').addEventListener('click', () => {
    quickNoteModal.classList.add('hidden');
    activeQuickNoteLoopId = null;
  });

  document.getElementById('btn-save-quick-note').addEventListener('click', () => {
    quickNoteModal.classList.add('hidden');
    activeQuickNoteLoopId = null;
  });

  // Click outside to close modals
  window.addEventListener('click', (e) => {
    if (e.target === detailsModal) {
      detailsModal.classList.add('hidden');
      activeDetailsLoopId = null;
    }
    if (e.target === archiveModal) {
      archiveModal.classList.add('hidden');
    }
    if (e.target === quickNoteModal) {
      quickNoteModal.classList.add('hidden');
      activeQuickNoteLoopId = null;
    }
  });

  // Auto-save typing input in scratchpad
  let autoSaveTimeout = null;
  quickNoteTextarea.addEventListener('input', () => {
    if (!activeQuickNoteLoopId) return;

    saveStatus.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Saving to memory...';
    saveStatus.className = 'save-status saving';
    lucide.createIcons();

    clearTimeout(autoSaveTimeout);
    autoSaveTimeout = setTimeout(() => {
      const loop = loops.find(l => l.id === activeQuickNoteLoopId);
      if (loop) {
        loop.quickNote = quickNoteTextarea.value;
        saveLoops(); // Persist changes immediately
        
        saveStatus.innerHTML = '<i data-lucide="check-check"></i> Auto-saved to memory';
        saveStatus.className = 'save-status saved';
        lucide.createIcons();
      }
    }, 450); // 450ms debounce to avoid spamming saves on every keypress
  });

  // Archive Trigger Button
  document.getElementById('btn-show-archive').addEventListener('click', openArchiveModal);

  // Add Milestone Progress Update
  document.getElementById('btn-add-milestone').addEventListener('click', () => {
    if (!activeDetailsLoopId) return;
    const input = document.getElementById('input-milestone-text');
    const textVal = input.value.trim();
    if (!textVal) return;

    const loop = loops.find(l => l.id === activeDetailsLoopId);
    if (loop) {
      loop.milestones = loop.milestones || [];
      loop.milestones.push({
        text: textVal,
        date: new Date().toISOString()
      });
      saveLoops(); // Persist and re-render dashboard
      renderJourneyTimeline(loop); // Re-render local timeline
      input.value = '';
    }
  });

  // Save changes from Details Drawer
  document.getElementById('btn-details-save').addEventListener('click', () => {
    if (!activeDetailsLoopId) return;
    const loop = loops.find(l => l.id === activeDetailsLoopId);
    if (loop) {
      loop.text = document.getElementById('details-loop-text').value.trim();
      loop.priority = document.getElementById('details-priority').value;
      loop.scope = document.getElementById('details-scope').value;
      const folderVal = document.getElementById('details-folder').value;
      loop.folderId = folderVal === 'none' ? undefined : folderVal;
      loop.deadline = document.getElementById('details-deadline').value || '';
      saveLoops();
      detailsModal.classList.add('hidden');
      activeDetailsLoopId = null;
    }
  });

  // Close Loop from Details Drawer
  document.getElementById('btn-details-complete').addEventListener('click', () => {
    if (!activeDetailsLoopId) return;
    closeLoop(activeDetailsLoopId);
    detailsModal.classList.add('hidden');
    activeDetailsLoopId = null;
  });

  // Delete Loop from Details Drawer
  document.getElementById('btn-details-delete').addEventListener('click', () => {
    if (!activeDetailsLoopId) return;
    
    if (confirm("Are you sure you want to permanently delete this open loop?")) {
      loops = loops.filter(l => l.id !== activeDetailsLoopId);
      saveLoops();
      detailsModal.classList.add('hidden');
      activeDetailsLoopId = null;
    }
  });
}

function openDetailsModal(loopId) {
  activeDetailsLoopId = loopId;
  const loop = loops.find(l => l.id === loopId);
  if (!loop) return;

  // Set field values
  document.getElementById('details-loop-text').value = loop.text;
  document.getElementById('details-priority').value = loop.priority;
  document.getElementById('details-scope').value = loop.scope || 'personal';
  document.getElementById('details-folder').value = loop.folderId || 'none';
  document.getElementById('details-deadline').value = loop.deadline || '';
  document.getElementById('input-milestone-text').value = '';

  // Render Timeline
  renderJourneyTimeline(loop);

  // Show Modal
  document.getElementById('details-modal').classList.remove('hidden');
  lucide.createIcons();
}

function renderJourneyTimeline(loop) {
  const container = document.getElementById('details-timeline-list');
  container.innerHTML = '';

  const milestones = loop.milestones || [];

  if (milestones.length === 0) {
    container.innerHTML = `<div class="timeline-empty">No milestones logged yet. Write your progress update below to start this loop's journey.</div>`;
    return;
  }

  // Sort milestones chronologically
  milestones.sort((a, b) => new Date(a.date) - new Date(b.date));

  milestones.forEach(m => {
    const item = document.createElement('div');
    item.className = 'timeline-item';
    
    const formattedDate = new Date(m.date).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    item.innerHTML = `
      <div class="timeline-dot"></div>
      <div class="timeline-content">
        <span class="timeline-date">${formattedDate}</span>
        <p class="timeline-text">${escapeHTML(m.text)}</p>
      </div>
    `;
    container.appendChild(item);
  });
  
  // Auto-scroll timeline to bottom
  container.scrollTop = container.scrollHeight;
}

function openArchiveModal() {
  const modal = document.getElementById('archive-modal');
  renderArchiveList();
  modal.classList.remove('hidden');
  lucide.createIcons();
}

function renderArchiveList() {
  const container = document.getElementById('archive-list-container');
  container.innerHTML = '';

  const closedLoops = loops.filter(l => l.status === 'closed' && (l.scope || 'personal') === activeScope);

  if (closedLoops.length === 0) {
    container.innerHTML = `<div class="archive-empty">No closed loops in your archive yet. Go close some active loops!</div>`;
    return;
  }

  closedLoops.forEach(loop => {
    const item = document.createElement('div');
    item.className = 'archive-item';
    item.setAttribute('data-id', loop.id);

    const closedDateStr = loop.createdAt ? new Date(loop.createdAt).toLocaleDateString() : 'Unknown';

    item.innerHTML = `
      <div class="archive-item-content">
        <p>${escapeHTML(loop.text)}</p>
        <span class="archive-item-meta">Created: ${closedDateStr}</span>
      </div>
      <div class="archive-actions">
        <button class="btn secondary-btn btn-reopen" title="Reopen Loop">
          <i data-lucide="refresh-cw"></i>
          <span>Reopen</span>
        </button>
        <button class="btn text-btn danger-text btn-delete-perm" title="Delete permanently">
          <i data-lucide="trash-2"></i>
        </button>
      </div>
    `;

    // Reopen listener
    item.querySelector('.btn-reopen').addEventListener('click', () => {
      reopenLoop(loop.id);
    });

    // Delete permanently listener
    item.querySelector('.btn-delete-perm').addEventListener('click', () => {
      deleteLoopPermanently(loop.id);
    });

    container.appendChild(item);
  });

  lucide.createIcons();
}

function reopenLoop(id) {
  const loop = loops.find(l => l.id === id);
  if (loop) {
    loop.status = 'open';
    loop.milestones = loop.milestones || [];
    loop.milestones.push({
      text: "Loop reopened and returned to active board",
      date: new Date().toISOString()
    });
    saveLoops();
    renderArchiveList(); // Update archive modal
  }
}

function deleteLoopPermanently(id) {
  if (confirm("Are you sure you want to permanently delete this closed loop from history? This cannot be undone.")) {
    loops = loops.filter(l => l.id !== id);
    saveLoops();
    renderArchiveList(); // Update archive modal
  }
}

function openQuickNoteModal(loopId) {
  activeQuickNoteLoopId = loopId;
  const loop = loops.find(l => l.id === loopId);
  if (!loop) return;

  // Set field values
  document.getElementById('quick-note-loop-ref').innerText = loop.text;
  document.getElementById('quick-note-textarea').value = loop.quickNote || '';

  // Reset status text
  const saveStatus = document.getElementById('quick-note-save-status');
  saveStatus.innerHTML = '<i data-lucide="check-check"></i> Auto-saved to memory';
  saveStatus.className = 'save-status saved';

  // Show Modal
  document.getElementById('quick-note-modal').classList.remove('hidden');
  document.getElementById('quick-note-textarea').focus();
  lucide.createIcons();
}

function setupScopeSelector() {
  document.querySelectorAll('.scope-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const btnEl = e.currentTarget;
      const newScope = btnEl.getAttribute('data-scope');
      switchScope(newScope);
    });
  });
}

function updateScopeTogglesUI() {
  document.querySelectorAll('.scope-btn').forEach(btn => {
    if (btn.getAttribute('data-scope') === activeScope) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  // Also sync the card scope input in Card Creator
  const cardScopeInput = document.getElementById('card-scope');
  if (cardScopeInput) {
    cardScopeInput.value = activeScope;
  }
}

function switchScope(newScope) {
  activeScope = newScope;
  localStorage.setItem('loop_active_scope', activeScope);
  document.body.className = 'scope-' + activeScope;
  activeFolderId = 'all'; // Default to show all loops in the new space
  updateScopeTogglesUI();
  renderFoldersSidebar();
  populateFolderSelects();
  renderDashboard();
  if (window.lucide) {
    lucide.createIcons();
  }
}

function setupFoldersSidebar() {
  // New folder button
  const btnAddFolder = document.getElementById('btn-add-folder');
  if (btnAddFolder) {
    btnAddFolder.addEventListener('click', () => {
      const name = prompt("Enter new folder name:");
      if (name && name.trim()) {
        const folderName = name.trim();
        // Check duplicates
        const exists = folders.some(f => f.scope === activeScope && f.name.toLowerCase() === folderName.toLowerCase());
        if (exists) {
          alert("A folder with this name already exists in this space.");
          return;
        }

        const newFolder = {
          id: 'folder_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
          name: folderName,
          scope: activeScope,
          createdAt: new Date().toISOString()
        };

        folders.push(newFolder);
        saveFolders();
        switchFolder(newFolder.id);
      }
    });
  }

  // Event listener delegation for sidebar items click
  const sidebar = document.getElementById('sidebar-folders');
  if (sidebar) {
    sidebar.addEventListener('click', (e) => {
      const folderBtn = e.target.closest('.folder-item');
      if (!folderBtn) return;
      
      // Skip if clicking edit/delete action button
      if (e.target.closest('.folder-action-btn')) return;

      const folderId = folderBtn.getAttribute('data-folder-id');
      switchFolder(folderId);
    });
  }
}

function renderFoldersSidebar() {
  const container = document.getElementById('custom-folders-list');
  if (!container) return;
  container.innerHTML = '';

  const activeOpenLoops = loops.filter(l => l.status === 'open' && (l.scope || 'personal') === activeScope);
  
  // Count static folders
  const countAll = activeOpenLoops.length;
  const countUncategorized = activeOpenLoops.filter(l => !l.folderId || l.folderId === 'none').length;

  document.getElementById('folder-count-all').innerText = countAll;
  document.getElementById('folder-count-uncategorized').innerText = countUncategorized;

  // Filter custom folders in current scope
  const activeFolders = folders.filter(f => f.scope === activeScope);

  // Render custom list
  activeFolders.forEach(f => {
    const folderLoopsCount = activeOpenLoops.filter(l => l.folderId === f.id).length;
    
    const btn = document.createElement('button');
    btn.className = `folder-item ${activeFolderId === f.id ? 'active' : ''}`;
    btn.setAttribute('data-folder-id', f.id);
    btn.innerHTML = `
      <i data-lucide="folder"></i>
      <span class="folder-name">${escapeHTML(f.name)}</span>
      <span class="folder-badge">${folderLoopsCount}</span>
      <div class="folder-actions-row">
        <button class="folder-action-btn btn-rename-folder" title="Rename Folder"><i data-lucide="edit-2"></i></button>
        <button class="folder-action-btn btn-delete-folder" title="Delete Folder"><i data-lucide="trash-2"></i></button>
      </div>
    `;

    // Rename action
    btn.querySelector('.btn-rename-folder').addEventListener('click', (e) => {
      e.stopPropagation();
      const newName = prompt("Rename folder to:", f.name);
      if (newName && newName.trim() && newName.trim() !== f.name) {
        const folderName = newName.trim();
        // Check duplicates
        const exists = folders.some(fol => fol.scope === activeScope && fol.id !== f.id && fol.name.toLowerCase() === folderName.toLowerCase());
        if (exists) {
          alert("A folder with this name already exists.");
          return;
        }
        f.name = folderName;
        saveFolders();
        if (activeFolderId === f.id) {
          switchFolder(f.id);
        }
      }
    });

    // Delete action
    btn.querySelector('.btn-delete-folder').addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm(`Are you sure you want to delete the folder "${f.name}"? Tasks inside it will not be deleted, they will simply be moved to Uncategorized.`)) {
        // Move loops inside it to uncategorized
        loops.forEach(l => {
          if (l.folderId === f.id) {
            delete l.folderId;
          }
        });
        
        // Remove folder
        folders = folders.filter(fol => fol.id !== f.id);
        
        // Save states
        saveFolders();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(loops)); // Save loops but don't call saveLoops to avoid loop cycle

        if (activeFolderId === f.id) {
          switchFolder('all');
        } else {
          renderDashboard();
        }
      }
    });

    container.appendChild(btn);
  });

  populateFolderSelects();

  if (window.lucide) {
    lucide.createIcons();
  }
}

function switchFolder(folderId) {
  activeFolderId = folderId;

  // Update active state in UI
  document.querySelectorAll('.folder-item').forEach(btn => {
    if (btn.getAttribute('data-folder-id') === folderId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Update Title text on board
  const titleEl = document.getElementById('current-folder-title');
  if (titleEl) {
    if (folderId === 'all') {
      titleEl.innerText = "Your Open Loops";
    } else if (folderId === 'uncategorized') {
      titleEl.innerText = "Uncategorized Loops";
    } else {
      const folder = folders.find(f => f.id === folderId);
      titleEl.innerText = folder ? `${folder.name} Loops` : "Your Open Loops";
    }
  }

  // Sync selectors value to match active folder (if it is a custom folder)
  const defaultFolderSelect = activeFolderId === 'all' || activeFolderId === 'uncategorized' ? 'none' : activeFolderId;
  const cardFolder = document.getElementById('card-folder');
  if (cardFolder) cardFolder.value = defaultFolderSelect;

  renderDashboard();
}

function populateFolderSelects() {
  const cardFolderSelect = document.getElementById('card-folder');
  const detailsFolderSelect = document.getElementById('details-folder');
  
  const activeFolders = folders.filter(f => f.scope === activeScope);

  const populate = (selectEl) => {
    if (!selectEl) return;
    const currentVal = selectEl.value;
    selectEl.innerHTML = '<option value="none">📁 No Folder</option>';
    activeFolders.forEach(f => {
      const opt = document.createElement('option');
      opt.value = f.id;
      opt.innerText = `📁 ${f.name}`;
      selectEl.appendChild(opt);
    });
    // Restore value if it still exists
    selectEl.value = currentVal;
  };

  populate(cardFolderSelect);
  populate(detailsFolderSelect);

  // Sync default selection in Card Creator to match active sidebar folder
  if (cardFolderSelect) {
    cardFolderSelect.value = activeFolderId === 'all' || activeFolderId === 'uncategorized' ? 'none' : activeFolderId;
  }
}
