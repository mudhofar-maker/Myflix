let currentUser = localStorage.getItem('tikvid_username') || 'kreator_tamu';
let currentWhatsApp = localStorage.getItem('tikvid_wa') || '';
let currentBio = localStorage.getItem('tikvid_bio') || 'Buat akun dengan nomor WhatsApp Anda dan mulai berbagi video.';
let currentAvatar = localStorage.getItem('tikvid_avatar') || '';
let currentShopLink = localStorage.getItem('tikvid_shoplink') || 'https://shopee.co.id';
let activeTab = 'foryou';
let activeShareVideoUrl = window.location.href;

let dbProfile;
function initProfileDB() {
  return new Promise((resolve) => {
    const request = indexedDB.open('TikVidAccountDB', 1);
    request.onerror = () => { loadProfileFallback(); resolve(); };
    request.onupgradeneeded = (e) => {
      dbProfile = e.target.result;
      if (!dbProfile.objectStoreNames.contains('user_profile')) {
        dbProfile.createObjectStore('user_profile', { keyPath: 'id' });
      }
    };
    request.onsuccess = (e) => {
      dbProfile = e.target.result;
      getProfileFromDB((savedUser) => {
        if (savedUser) {
          currentUser = savedUser.username;
          currentWhatsApp = savedUser.whatsapp;
          currentBio = savedUser.bio;
          currentAvatar = savedUser.avatar;
          currentShopLink = savedUser.shopLink;
        } else {
          loadProfileFallback();
        }
        updateProfileUI();
        resolve();
      });
    };
  });
}

function getProfileFromDB(callback) {
  if (!dbProfile) { callback(null); return; }
  try {
    const tx = dbProfile.transaction(['user_profile'], 'readonly');
    const store = tx.objectStore('user_profile');
    const req = store.get('current_account');
    req.onsuccess = () => callback(req.result || null);
    req.onerror = () => callback(null);
  } catch (e) { callback(null); }
}

function saveProfileToDB(profileObj) {
  if (!dbProfile) return;
  try {
    const tx = dbProfile.transaction(['user_profile'], 'readwrite');
    const store = tx.objectStore('user_profile');
    store.put({ id: 'current_account', ...profileObj });
  } catch (e) {}
}

function loadProfileFallback() {
  currentUser = localStorage.getItem('tikvid_username') || 'kreator_tamu';
  currentWhatsApp = localStorage.getItem('tikvid_wa') || '';
  currentBio = localStorage.getItem('tikvid_bio') || 'Buat akun dengan nomor WhatsApp Anda...';
  currentAvatar = localStorage.getItem('tikvid_avatar') || '';
  currentShopLink = localStorage.getItem('tikvid_shoplink') || 'https://shopee.co.id';
}

initProfileDB();

function updateProfileUI() {
  document.getElementById('currentUsername').textContent = currentUser;
  const navImg = document.getElementById('navProfileAvatar');
  if (currentAvatar) {
    navImg.src = currentAvatar;
    navImg.style.display = 'block';
  } else {
    navImg.style.display = 'none';
  }
}

const defaultVideos = [
  { id: 1, user: 'cinematic_vlog', wa: '08123456789', bio: 'Pecinta alam & videografi perjalanan.', avatar: '', shopLink: 'https://shopee.co.id', caption: 'Dokumenter perjalanan alam terbuka berdurasi panjang 🌲✨', hashtags: ['longvideo', 'vlog', 'alam'], music: '♪ Cinematic Journey - LongChill', likes: 245000, comments: 4120, shares: 1520, bookmarks: 9800, durationLabel: '03:45', videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4' },
  { id: 2, user: 'tech_insight', wa: '08987654321', bio: 'Berbagi wawasan teknologi dan pemrograman web masa depan.', avatar: '', shopLink: 'https://tokopedia.com', caption: 'Pembahasan mendalam mengenai arsitektur web masa depan 💻', hashtags: ['tech', 'coding', 'education'], music: '♪ Tech Ambient - FutureSound', likes: 182000, comments: 3010, shares: 920, bookmarks: 6400, durationLabel: '05:12', videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4' }
];

let videos = [];
let currentSelectedMusic = '♪ Lofi Long Session - ChillBeats';

let db;
function initIndexedDB() {
  return new Promise((resolve) => {
    const request = indexedDB.open('TikVidWhatsAppDB', 1);
    request.onerror = () => { loadVideosFallback(); resolve(); };
    request.onupgradeneeded = (e) => {
      db = e.target.result;
      if (!db.objectStoreNames.contains('videos')) {
        db.createObjectStore('videos', { keyPath: 'id' });
      }
    };
    request.onsuccess = (e) => {
      db = e.target.result;
      getAllVideosFromDB((storedVideos) => {
        if (storedVideos && storedVideos.length > 0) {
          videos = storedVideos;
        } else {
          videos = [...defaultVideos];
          saveAllVideosToDB(videos);
        }
        renderFeed(videos);
        resolve();
      });
    };
  });
}

function getAllVideosFromDB(callback) {
  if (!db) { callback(null); return; }
  try {
    const transaction = db.transaction(['videos'], 'readonly');
    const store = transaction.objectStore('videos');
    const request = store.getAll();
    request.onsuccess = () => {
      const result = request.result.sort((a, b) => b.id - a.id);
      callback(result.length ? result : null);
    };
    request.onerror = () => callback(null);
  } catch (e) { callback(null); }
}

function saveVideoToDB(videoObj) {
  if (!db) return;
  try {
    const transaction = db.transaction(['videos'], 'readwrite');
    const store = transaction.objectStore('videos');
    store.put(videoObj);
  } catch (e) {}
}

function saveAllVideosToDB(list) {
  if (!db) return;
  try {
    const transaction = db.transaction(['videos'], 'readwrite');
    const store = transaction.objectStore('videos');
    list.forEach(v => store.put(v));
  } catch (e) {}
}

function loadVideosFallback() {
  const saved = localStorage.getItem('tikvid_wa_videos');
  videos = saved ? JSON.parse(saved) : [...defaultVideos];
  renderFeed(videos);
}

const sampleComments = [
  { user: 'pengunjung', text: 'Keren banget videonya! 👍', time: '1j', likes: 120 }
];

async function fetchViralMusicAPI() {
  const musicListEl = document.getElementById('musicList');
  musicListEl.innerHTML = `<div class="comment-item" style="padding: 14px; text-align:center; opacity:0.6;">Memuat musik viral...</div>`;

  const fallbackViralTracks = [
    { name: 'Lofi Long Session - ChillBeats', artist: 'Chill Guy' },
    { name: 'Cinematic Journey - LongChill', artist: 'Dreamer Sound' },
    { name: 'Tech Ambient - FutureSound', artist: 'CyberWave' },
    { name: 'DJ Remix Viral - Full Bass', artist: 'SoundTrending' },
    { name: 'Akustik Santai Sore Hari', artist: 'Indie Session' }
  ];

  try {
    const response = await fetch('https://api.jamendo.com/v3.0/tracks/?client_id=5997230b&format=json&limit=15&boost=popularity');
    const data = await response.json();
    
    if (data && data.results && data.results.length > 0) {
      musicListEl.innerHTML = '';
      data.results.forEach(track => {
        const item = document.createElement('div');
        item.className = 'comment-item';
        item.style.cssText = 'cursor:pointer; padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: space-between;';
        item.dataset.music = `♪ ${track.name} - ${track.artist_name}`;
        item.innerHTML = `<div><div style="font-weight: 600; font-size: 14px;">🎵 ${track.name}</div><div style="font-size: 12px; opacity: 0.6;">Artist: ${track.artist_name}</div></div><div style="font-size: 12px; color: #25f4ee;">Gunakan</div>`;
        musicListEl.appendChild(item);
      });
      return;
    }
  } catch (err) {}

  musicListEl.innerHTML = '';
  fallbackViralTracks.forEach(track => {
    const item = document.createElement('div');
    item.className = 'comment-item';
    item.style.cssText = 'cursor:pointer; padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: space-between;';
    item.dataset.music = `♪ ${track.name} - ${track.artist}`;
    item.innerHTML = `<div><div style="font-weight: 600; font-size: 14px;">🎵 ${track.name}</div><div style="font-size: 12px; opacity: 0.6;">Artist: ${track.artist}</div></div><div style="font-size: 12px; color: #25f4ee;">Gunakan</div>`;
    musicListEl.appendChild(item);
  });
}

function formatCount(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove('show'), 1800);
}

const feed = document.getElementById('feed');
const state = [];

function initStates() {
  state.length = 0;
  videos.forEach(() => {
    state.push({ liked: false, bookmarked: false, followed: false, likes: 120, bookmarks: 45, comments: [...sampleComments] });
  });
}

function renderFeed(list) {
  feed.innerHTML = '';
  let filteredList = list;
  if (activeTab === 'following') {
    filteredList = list.filter((_, idx) => state[idx] && state[idx].followed);
    if (filteredList.length === 0) {
      feed.innerHTML = `<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; text-align:center; padding:20px; opacity:0.7;">
        <div style="font-size:40px; margin-bottom:10px;">👥</div>
        <div style="font-size:16px; font-weight:bold;">Belum Mengikuti Siapapun</div>
        <div style="font-size:13px; margin-top:6px;">Gunakan menu Teman untuk mengikuti kreator lain!</div>
      </div>`;
      return;
    }
  }

  filteredList.forEach((v, idx) => {
    const slide = document.createElement('div');
    slide.className = 'video-slide';
    slide.dataset.idx = idx;

    let avatarHtml = `<div class="avatar" style="background:#ff2d55">${v.user[0].toUpperCase()}</div>`;
    if (v.avatar) {
      avatarHtml = `<div class="avatar"><img src="${v.avatar}" alt="" /></div>`;
    }

    const isFollowed = state[idx] && state[idx].followed;

    slide.innerHTML = `
      <video src="${v.videoUrl}" loop playsinline controls></video>
      <div class="play-indicator" id="playInd-${idx}">▶</div>
      
      <div class="shop-cart-btn" data-action="shop" data-link="${v.shopLink || 'https://shopee.co.id'}" data-title="${v.user}">🛒</div>

      <div class="sidebar">
        <div class="avatar-wrap">
          ${avatarHtml}
          <div class="follow-btn ${isFollowed ? 'followed' : ''}" data-action="follow" data-idx="${idx}">${isFollowed ? '✓' : '+'}</div>
        </div>
        <div class="action like-btn" data-action="like" data-idx="${idx}">
          <div class="icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </div>
          <div class="count" id="likeCount-${idx}">${formatCount(v.likes)}</div>
        </div>
        <div class="action comment-btn" data-action="comment" data-idx="${idx}">
          <div class="icon">💬</div>
          <div class="count">${formatCount(v.comments)}</div>
        </div>
        <div class="action bookmark-btn" data-action="bookmark" data-idx="${idx}">
          <div class="icon">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="white">
              <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
            </svg>
          </div>
          <div class="count" id="bookmarkCount-${idx}">${formatCount(v.bookmarks)}</div>
        </div>
        <div class="action share-btn" data-action="share" data-idx="${idx}" data-url="${v.videoUrl}" data-caption="${v.caption}">
          <div class="icon">↗</div>
          <div class="count">${formatCount(v.shares)}</div>
        </div>
      </div>
      <div class="bottom-info">
        <div class="username">
          @${v.user} ${v.wa ? `(WA: ${v.wa})` : ''}
          <span class="long-badge">⏳ ${v.durationLabel || '02:00'}</span>
        </div>
        <div class="user-bio">${v.bio || ''}</div>
        <div class="caption">${v.caption} ${(v.hashtags || []).map(h => `<span class="hashtag">#${h}</span>`).join(' ')}</div>
        <div class="music">
          <span>🎵</span>
          <div class="marquee"><span>${v.music} &nbsp;&nbsp;&nbsp; </span></div>
        </div>
      </div>
      <div class="progress-bar" id="progressBar-${idx}"><div class="progress" id="progress-${idx}"></div></div>
    `;
    feed.appendChild(slide);
  });

  setupVideoInteractions();
}

initIndexedDB().then(() => initStates());

function setupVideoInteractions() {
  const slides = document.querySelectorAll('.video-slide');
  slides.forEach((slide, idx) => {
    const vid = slide.querySelector('video');
    const progressBar = slide.querySelector(`#progress-${idx}`);
    const progressContainer = slide.querySelector(`#progressBar-${idx}`);
    const playInd = slide.querySelector(`#playInd-${idx}`);
    if (!vid) return;

    vid.addEventListener('timeupdate', () => {
      if (vid.duration) {
        const pct = (vid.currentTime / vid.duration) * 100;
        if (progressBar) progressBar.style.width = pct + '%';
      }
    });

    progressContainer.addEventListener('click', (e) => {
      const rect = progressContainer.getBoundingClientRect();
      vid.currentTime = ((e.clientX - rect.left) / rect.width) * vid.duration;
    });

    vid.addEventListener('click', () => {
      if (vid.paused) { vid.play(); playInd.textContent = '▶'; }
      else { vid.pause(); playInd.textContent = '⏸'; }
      playInd.classList.add('show');
      setTimeout(() => playInd.classList.remove('show'), 500);
    });
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const vid = entry.target.querySelector('video');
      if (!vid) return;
      if (entry.isIntersecting) vid.play().catch(() => {});
      else vid.pause();
    });
  }, { threshold: 0.6 });
  slides.forEach(s => observer.observe(s));
}

const triggerAvatarUpload = document.getElementById('triggerAvatarUpload');
const avatarFileInput = document.getElementById('avatarFileInput');
const previewAvatarImg = document.getElementById('previewAvatarImg');
const avatarPlaceholderText = document.getElementById('avatarPlaceholderText');
let tempAvatarData = currentAvatar;

if (currentAvatar) {
  previewAvatarImg.src = currentAvatar;
  previewAvatarImg.style.display = 'block';
  avatarPlaceholderText.style.display = 'none';
}

triggerAvatarUpload.addEventListener('click', () => avatarFileInput.click());

avatarFileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      tempAvatarData = reader.result;
      previewAvatarImg.src = tempAvatarData;
      previewAvatarImg.style.display = 'block';
      avatarPlaceholderText.style.display = 'none';
      showToast('Foto profil dipilih');
    };
  }
});

document.addEventListener('click', (e) => {
  const tab = e.target.closest('.tab');
  if (tab) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    activeTab = tab.dataset.tab;
    renderFeed(videos);
    return;
  }

  if (e.target.closest('#liveBtn')) { openLiveStudio(); return; }
  if (e.target.closest('#searchBtn')) { document.getElementById('searchModal').classList.add('show'); return; }
  if (e.target.closest('#executeSearch')) { document.getElementById('searchModal').classList.remove('show'); showToast('Pencarian dijalankan'); return; }

  if (e.target.closest('#friendsNavBtn')) {
    openFriendsModal();
    return;
  }

  if (e.target.closest('#openAccountModal') || e.target.closest('#profileTabBtn')) {
    document.getElementById('accountInput').value = currentUser === 'kreator_tamu' ? '' : currentUser;
    document.getElementById('whatsappInput').value = currentWhatsApp;
    document.getElementById('bioInput').value = currentBio;
    document.getElementById('shopLinkInput').value = currentShopLink;
    tempAvatarData = currentAvatar;
    if (currentAvatar) {
      previewAvatarImg.src = currentAvatar;
      previewAvatarImg.style.display = 'block';
      avatarPlaceholderText.style.display = 'none';
    }
    document.getElementById('accountModal').classList.add('show');
    return;
  }

  if (e.target.closest('#saveAccountBtn')) {
    const newName = document.getElementById('accountInput').value.trim();
    const newWA = document.getElementById('whatsappInput').value.trim();
    const newBio = document.getElementById('bioInput').value.trim();
    const newShop = document.getElementById('shopLinkInput').value.trim();

    if (!newName || !newWA) {
      showToast('Harap isi Nama Akun dan Nomor WhatsApp!');
      return;
    }

    currentUser = newName;
    currentWhatsApp = newWA;
    currentBio = newBio;
    currentShopLink = newShop || 'https://shopee.co.id';
    currentAvatar = tempAvatarData;

    saveProfileToDB({
      username: currentUser,
      whatsapp: currentWhatsApp,
      bio: currentBio,
      avatar: currentAvatar,
      shopLink: currentShopLink
    });

    localStorage.setItem('tikvid_username', currentUser);
    localStorage.setItem('tikvid_wa', currentWhatsApp);
    localStorage.setItem('tikvid_bio', currentBio);
    localStorage.setItem('tikvid_shoplink', currentShopLink);
    localStorage.setItem('tikvid_avatar', currentAvatar);

    updateProfileUI();
    document.getElementById('accountModal').classList.remove('show');
    showToast(`Akun WA @${currentUser} berhasil disimpan permanen!`);
    renderFeed(videos);
    return;
  }

  const shopBtn = e.target.closest('[data-action="shop"]');
  if (shopBtn) {
    const link = shopBtn.dataset.link;
    const title = shopBtn.dataset.title;
    document.getElementById('shopModalTitle').textContent = `Toko Produk: @${title}`;
    document.getElementById('shopModalLink').href = link;
    document.getElementById('shopModal').classList.add('show');
    return;
  }

  if (e.target.closest('#shareWhatsApp')) {
    const text = encodeURIComponent(`Tonton video seru ini di TikVid: ${activeShareVideoUrl}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
    document.getElementById('shareModal').classList.remove('show');
    return;
  }
  if (e.target.closest('#shareFacebook')) {
    const url = encodeURIComponent(activeShareVideoUrl);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
    document.getElementById('shareModal').classList.remove('show');
    return;
  }
  if (e.target.closest('#shareTwitter')) {
    const text = encodeURIComponent(`Tonton video menarik ini di TikVid!`);
    const url = encodeURIComponent(activeShareVideoUrl);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
    document.getElementById('shareModal').classList.remove('show');
    return;
  }
  if (e.target.closest('#shareCopyLink')) {
    navigator.clipboard.writeText(activeShareVideoUrl).then(() => {
      showToast('Link berhasil disalin ke clipboard!');
      document.getElementById('shareModal').classList.remove('show');
    }).catch(() => {
      showToast('Gagal menyalin link');
    });
    return;
  }

  if (e.target.closest('#openMusicModal')) {
    document.getElementById('musicModal').classList.add('show');
    fetchViralMusicAPI();
    return;
  }

  const musicItem = e.target.closest('[data-music]');
  if (musicItem) {
    currentSelectedMusic = musicItem.dataset.music;
    document.getElementById('selectedMusicLabel').textContent = currentSelectedMusic;
    document.getElementById('musicModal').classList.remove('show');
    showToast(`Musik aktif: ${currentSelectedMusic}`);
    return;
  }

  const navItem = e.target.closest('.bottom-nav .nav-item[data-nav]');
  if (navItem && !e.target.closest('#profileTabBtn') && !e.target.closest('#friendsNavBtn')) {
    document.querySelectorAll('.bottom-nav .nav-item').forEach(i => i.classList.remove('active'));
    navItem.classList.add('active');
    showToast(`Menu: ${navItem.textContent.trim()}`);
    return;
  }

  const closeBtn = e.target.closest('[data-close]');
  if (closeBtn) {
    document.getElementById(closeBtn.dataset.close).classList.remove('show');
    return;
  }

  const actionEl = e.target.closest('[data-action]');
  if (actionEl) {
    const action = actionEl.dataset.action;
    const idx = parseInt(actionEl.dataset.idx);
    if (action === 'like') {
      state[idx].liked = !state[idx].liked;
      state[idx].likes += state[idx].liked ? 1 : -1;
      actionEl.classList.toggle('liked', state[idx].liked);
      document.getElementById(`likeCount-${idx}`).textContent = formatCount(state[idx].likes);
    } else if (action === 'bookmark') {
      state[idx].bookmarked = !state[idx].bookmarked;
      state[idx].bookmarks += state[idx].bookmarked ? 1 : -1;
      actionEl.classList.toggle('bookmarked', state[idx].bookmarked);
      document.getElementById(`bookmarkCount-${idx}`).textContent = formatCount(state[idx].bookmarks);
      showToast(state[idx].bookmarked ? 'Disimpan ke favorit' : 'Dihapus dari favorit');
    } else if (action === 'follow') {
      state[idx].followed = !state[idx].followed;
      actionEl.classList.toggle('followed', state[idx].followed);
      actionEl.textContent = state[idx].followed ? '✓' : '+';
      showToast(state[idx].followed ? `Mengikuti @${videos[idx].user}` : `Berhenti mengikuti @${videos[idx].user}`);
    } else if (action === 'comment') {
      openComments(idx);
    } else if (action === 'share') {
      activeShareVideoUrl = actionEl.dataset.url || window.location.href;
      document.getElementById('shareModal').classList.add('show');
    }
    return;
  }
});

function openFriendsModal() {
  const container = document.getElementById('friendsListContainer');
  container.innerHTML = '';
  
  videos.forEach((v, idx) => {
    const isFollowed = state[idx] && state[idx].followed;
    const item = document.createElement('div');
    item.className = 'comment-item';
    item.style.cssText = 'padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center;';
    item.innerHTML = `
      <div style="display: flex; gap: 10px; align-items: center;">
        <div class="comment-avatar" style="background:#ff2d55">${v.user[0].toUpperCase()}</div>
        <div>
          <div style="font-weight: bold; font-size: 14px;">@${v.user}</div>
          <div style="font-size: 11px; opacity: 0.6;">WA: ${v.wa || 'Terverifikasi'}</div>
        </div>
      </div>
      <button class="comment-send" data-action="follow" data-idx="${idx}" style="padding: 6px 14px; font-size: 12px; background: ${isFollowed ? '#2ecc71' : '#fe2c55'};">
        ${isFollowed ? 'Diikuti ✓' : '+ Tambah Teman'}
      </button>
    `;
    container.appendChild(item);
  });

  container.querySelectorAll('[data-action="follow"]').forEach(btn => {
    btn.addEventListener('click', (ev) => {
      const idx = parseInt(ev.currentTarget.dataset.idx);
      state[idx].followed = !state[idx].followed;
      showToast(state[idx].followed ? `Berhasil berteman dengan @${videos[idx].user}` : `Berhenti mengikuti @${videos[idx].user}`);
      openFriendsModal();
      renderFeed(videos);
    });
  });

  document.getElementById('friendsModal').classList.add('show');
}

function openComments(idx) {
  const modal = document.getElementById('commentsModal');
  const list = document.getElementById('commentsList');
  document.getElementById('commentsCount').textContent = `${state[idx].comments.length} Komentar`;
  list.innerHTML = '';
  state[idx].comments.forEach(c => {
    list.innerHTML += `<div class="comment-item"><div class="comment-avatar" style="background:#ff6b6b">${c.user[0]}</div><div class="comment-body"><div class="comment-user">@${c.user}</div><div class="comment-text">${c.text}</div></div></div>`;
  });
  modal.classList.add('show');
  modal.dataset.idx = idx;
}

document.getElementById('commentSend').addEventListener('click', () => {
  const input = document.getElementById('commentInput');
  const text = input.value.trim();
  if (!text) return;
  const modal = document.getElementById('commentsModal');
  const idx = parseInt(modal.dataset.idx);
  state[idx].comments.unshift({ user: currentUser, text: text });
  input.value = '';
  openComments(idx);
  showToast('Komentar terkirim');
});

let muted = true;
document.getElementById('muteIndicator').addEventListener('click', () => {
  muted = !muted;
  document.getElementById('muteIcon').textContent = muted ? '🔇' : '🔊';
  document.getElementById('muteText').textContent = muted ? 'Suara Mati' : 'Suara Aktif';
});

const cameraModal = document.getElementById('cameraModal');
const cameraVideo = document.getElementById('cameraVideo');
const openCameraBtn = document.getElementById('openCameraModal');
const closeCameraBtn = document.getElementById('closeCamera');
const switchCameraBtn = document.getElementById('switchCameraBtn');
const recordShutter = document.getElementById('recordShutter');
const uploadGalleryBtn = document.getElementById('uploadGalleryBtn');
const galleryInput = document.getElementById('galleryInput');
const liveBadge = document.getElementById('liveBadge');
const camModeToggleBtn = document.getElementById('camModeToggleBtn');
const recordingTimerEl = document.getElementById('recordingTimer');

let mediaStream = null;
let mediaRecorder = null;
let recordedChunks = [];
let isRecording = false;
let useFrontCamera = true;
let isLiveMode = false;
let timerInterval = null;
let secondsElapsed = 0;

async function startCamera(front) {
  if (mediaStream) mediaStream.getTracks().forEach(t => t.stop());
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: front ? 'user' : 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: true
    });
    cameraVideo.srcObject = mediaStream;
  } catch (err) {
    showToast('Akses kamera/mikrofon diblokir');
  }
}

openCameraBtn.addEventListener('click', async () => {
  if (!currentWhatsApp) {
    showToast('Silakan daftarkan nomor WhatsApp Anda terlebih dahulu di profil!');
    document.getElementById('accountModal').classList.add('show');
    return;
  }
  isLiveMode = false;
  liveBadge.style.display = 'none';
  camModeToggleBtn.textContent = 'Rekam Panjang';
  cameraModal.classList.add('show');
  await startCamera(useFrontCamera);
});

async function openLiveStudio() {
  if (!currentWhatsApp) {
    showToast('Silakan daftarkan nomor WhatsApp Anda terlebih dahulu di profil!');
    document.getElementById('accountModal').classList.add('show');
    return;
  }
  isLiveMode = true;
  liveBadge.style.display = 'block';
  camModeToggleBtn.textContent = 'LIVE Aktif';
  cameraModal.classList.add('show');
  await startCamera(useFrontCamera);
  showToast('Memulai Siaran LIVE Berdurasi Panjang...');
}

closeCameraBtn.addEventListener('click', () => {
  if (mediaStream) mediaStream.getTracks().forEach(t => t.stop());
  cameraModal.classList.remove('show');
  clearInterval(timerInterval);
  if (isRecording) { mediaRecorder.stop(); isRecording = false; recordShutter.classList.remove('recording'); }
});

switchCameraBtn.addEventListener('click', async () => {
  useFrontCamera = !useFrontCamera;
  await startCamera(useFrontCamera);
  showToast(useFrontCamera ? 'Kamera Depan' : 'Kamera Belakang');
});

recordShutter.addEventListener('click', () => {
  if (isLiveMode) { showToast('Siaran LIVE sedang berlangsung.'); return; }

  if (!isRecording) {
    recordedChunks = [];
    try {
      mediaRecorder = new MediaRecorder(mediaStream, { mimeType: 'video/webm;codecs=vp9,opus' });
    } catch(e) {
      mediaRecorder = new MediaRecorder(mediaStream);
    }
    mediaRecorder.ondataavailable = e => { if(e.data.size > 0) recordedChunks.push(e.data); };
    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => {
        const m = String(Math.floor(secondsElapsed / 60)).padStart(2, '0');
        const s = String(secondsElapsed % 60).padStart(2, '0');
        addNewLongVideoToDB(reader.result, `${m}:${s}`);
      };
    };
    mediaRecorder.start(1000);
    isRecording = true;
    recordShutter.classList.add('recording');
    secondsElapsed = 0;
    recordingTimerEl.textContent = '● 00:00';
    timerInterval = setInterval(() => {
      secondsElapsed++;
      const m = String(Math.floor(secondsElapsed / 60)).padStart(2, '0');
      const s = String(secondsElapsed % 60).padStart(2, '0');
      recordingTimerEl.textContent = `● ${m}:${s}`;
    }, 1000);
    showToast('Perekaman video panjang dimulai...');
  } else {
    mediaRecorder.stop();
    isRecording = false;
    clearInterval(timerInterval);
    recordShutter.classList.remove('recording');
    cameraModal.classList.remove('show');
    if (mediaStream) mediaStream.getTracks().forEach(t => t.stop());
    showToast('Video panjang berhasil disimpan!');
  }
});

uploadGalleryBtn.addEventListener('click', () => galleryInput.click());

galleryInput.addEventListener('change', (e) => {
  if (!currentWhatsApp) {
    showToast('Silakan daftarkan nomor WhatsApp Anda di profil terlebih dahulu.');
    return;
  }
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      const tempVideo = document.createElement('video');
      tempVideo.src = reader.result;
      tempVideo.onloadedmetadata = () => {
        const mins = String(Math.floor(tempVideo.duration / 60)).padStart(2, '0');
        const secs = String(Math.floor(tempVideo.duration % 60)).padStart(2, '0');
        addNewLongVideoToDB(reader.result, `${mins}:${secs}`);
        cameraModal.classList.remove('show');
        if (mediaStream) mediaStream.getTracks().forEach(t => t.stop());
        showToast('Video galeri berhasil diunggah!');
      };
    };
  }
});

function addNewLongVideoToDB(videoDataUrl, durationStr) {
  const newVid = {
    id: Date.now(),
    user: currentUser,
    wa: currentWhatsApp,
    bio: currentBio,
    avatar: currentAvatar,
    shopLink: currentShopLink,
    caption: `Video original baru dari @${currentUser} 🚀`,
    hashtags: ['longformat', 'whatsapp', 'fyp'],
    music: currentSelectedMusic,
    likes: 1, comments: 0, shares: 0, bookmarks: 0,
    durationLabel: durationStr || '02:30',
    videoUrl: videoDataUrl
  };

  videos.unshift(newVid);
  initStates();
  saveVideoToDB(newVid);
  renderFeed(videos);
}
