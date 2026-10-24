import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, push, onValue, update, get, child, set } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const CLOUD_NAME = "tpiqfmqy"; 
const UPLOAD_PRESET = "tikvid_preset"; 

const firebaseConfig = {
  apiKey: "AIzaSyAac2M5yW5TGkaH0lvMwbZz8ZLhQOAjgEU",
  authDomain: "gen-lang-client-0767458981.firebaseapp.com",
  databaseURL: "https://gen-lang-client-0767458981-default-rtdb.asia-southeast1.firebasedatabase.app", 
  projectId: "gen-lang-client-0767458981",
  storageBucket: "gen-lang-client-0767458981.firebasestorage.app",
  messagingSenderId: "641921193770",
  appId: "1:641921193770:web:19a736bcbdc0151cee3053"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const state = {
  camStream: null, camFacing: 'environment', mediaRecorder: null, recordedChunks: [], isRecording: false, videoBlob: null, videoURL: null, liveStream: null, currentVideoId: null,
  profile: { name: 'user_cloudinary', bio: 'Halo, saya pengguna baru TikVid!', avatar: 'https://i.pravatar.cc/150?img=11' },
  friends: [], currentMusic: null
};

const MUSIC_CATALOG = [
  { id: 'none', name: 'Suara Asli', url: null },
  { id: 'viral-funk', name: 'Viral Funk (Upbeat)', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
  { id: 'chill', name: 'Chill Beat', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
];

// ============================================================
// UI & NAVIGASI
// ============================================================
window.showToast = function(msg) { const el = document.getElementById('toast'); el.textContent = msg; el.className = 'toast show'; setTimeout(() => el.classList.remove('show'), 2500); };
window.showLoader = function(msg) { document.getElementById('loaderText').textContent = msg; document.getElementById('loader').classList.add('show'); };
window.hideLoader = function() { document.getElementById('loader').classList.remove('show'); };
window.closeModal = function(id) { document.getElementById(id).classList.remove('show'); };

window.switchTab = function(tab) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (tab === 'home') { document.getElementById('screen-home').classList.add('active'); document.querySelectorAll('.nav-item')[0].classList.add('active'); loadFeed(); }
  else if (tab === 'friends') { document.getElementById('screen-friends').classList.add('active'); document.querySelectorAll('.nav-item')[1].classList.add('active'); loadFriends(); }
  else if (tab === 'profile') { document.getElementById('screen-profile').classList.add('active'); document.querySelectorAll('.nav-item')[4].classList.add('active'); loadProfile(); }
};

// ============================================================
// PROFIL (GANTI FOTO & DATA)
// ============================================================
function loadProfile() {
  document.getElementById('profileAvatar').src = state.profile.avatar;
  document.getElementById('profileName').textContent = '@' + state.profile.name;
  document.getElementById('profileBio').textContent = state.profile.bio;
}

window.openEditProfile = function() {
  document.getElementById('editName').value = state.profile.name;
  document.getElementById('editBio').value = state.profile.bio;
  document.getElementById('editAvatarPreview').src = state.profile.avatar;
  document.getElementById('editProfileModal').classList.add('show');
};

let tempAvatarBase64 = null;
window.previewAvatar = function(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    tempAvatarBase64 = e.target.result;
    document.getElementById('editAvatarPreview').src = tempAvatarBase64;
  };
  reader.readAsDataURL(file);
};

window.saveProfile = function() {
  state.profile.name = document.getElementById('editName').value.trim() || 'user';
  state.profile.bio = document.getElementById('editBio').value.trim();
  if (tempAvatarBase64) state.profile.avatar = tempAvatarBase64;
  
  loadProfile();
  window.closeModal('editProfileModal');
  window.showToast('Profil berhasil diperbarui!');
  tempAvatarBase64 = null;
};

// ============================================================
// TEMAN (CARI & IKUTI)
// ============================================================
function loadFriends() {
  const mockFriends = [
    { id: 1, name: 'Budi Santoso', username: '@budi', avatar: '🧑', followed: false },
    { id: 2, name: 'Siti Aminah', username: '@siti', avatar: '👩', followed: true },
    { id: 3, name: 'Andi Wijaya', username: '@andi', avatar: '👨', followed: false },
  ];
  const list = document.getElementById('friendList');
  list.innerHTML = '';
  mockFriends.forEach(f => {
    list.innerHTML += `
      <div class="friend-item">
        <div class="friend-info">
          <div class="friend-avatar">${f.avatar}</div>
          <div>
            <div class="friend-name">${f.name}</div>
            <div class="friend-username">${f.username}</div>
          </div>
        </div>
        <button class="btn-follow ${f.followed ? 'followed' : ''}" onclick="toggleFollow(this)">${f.followed ? 'Mengikuti' : 'Ikuti'}</button>
      </div>
    `;
  });
}

window.searchFriends = function() { window.showToast('Fitur pencarian sedang dikembangkan.'); };
window.toggleFollow = function(btn) {
  if (btn.classList.contains('followed')) {
    btn.classList.remove('followed'); btn.textContent = 'Ikuti'; window.showToast('Berhenti mengikuti.');
  } else {
    btn.classList.add('followed'); btn.textContent = 'Mengikuti'; window.showToast('Berhasil mengikuti!');
  }
};

// ============================================================
// MUSIK (KATALOG)
// ============================================================
window.openMusicModal = function() {
  const list = document.getElementById('musicList');
  list.innerHTML = '';
  MUSIC_CATALOG.forEach(track => {
    list.innerHTML += `
      <div style="padding: 12px; border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center; cursor: pointer;" onclick="selectMusic('${track.id}')">
        <span>🎵 ${track.name}</span>
        ${state.currentMusic && state.currentMusic.id === track.id ? '<span style="color:var(--primary);">✔</span>' : ''}
      </div>
    `;
  });
  document.getElementById('musicModal').classList.add('show');
};

window.selectMusic = function(id) {
  state.currentMusic = MUSIC_CATALOG.find(m => m.id === id);
  window.closeModal('musicModal');
  window.showToast('Musik dipilih: ' + state.currentMusic.name);
};

// ============================================================
// FEED & INTERAKSI (SAMA SEPERTI SEBELUMNYA + MUSIK)
// ============================================================
function loadFeed() {
  const container = document.getElementById('feedContainer');
  const empty = document.getElementById('emptyFeed');
  Array.from(container.children).forEach(c => { if (c.id !== 'emptyFeed' && !c.classList.contains('feed-top-bar')) c.remove(); });
  window.showLoader('Mengambil video...');
  
  onValue(ref(db, 'videos'), (snapshot) => {
    const data = snapshot.val();
    window.hideLoader();
    if (!data) { empty.style.display = 'flex'; return; }
    empty.style.display = 'none';

    const videos = Object.keys(data).map(key => ({ id: key, ...data[key] })).sort((a, b) => b.createdAt - a.createdAt);
    videos.forEach(videoData => {
      const card = document.createElement('div');
      card.className = 'video-card';
      
      const vid = document.createElement('video');
      vid.src = videoData.videoUrl; vid.loop = true; vid.playsInline = true; vid.muted = true; 
      
      let musicAudio = null;
      if (videoData.musicUrl) {
        musicAudio = new Audio(videoData.musicUrl);
        musicAudio.loop = true;
      }

      const volBtn = document.createElement('button');
      volBtn.className = 'volume-btn'; volBtn.innerHTML = '🔇';
      const toggleVolume = (e) => { 
        if(e) e.stopPropagation(); 
        vid.muted = !vid.muted; 
        volBtn.innerHTML = vid.muted ? '🔇' : '🔊';
        if (musicAudio) { vid.muted ? musicAudio.pause() : musicAudio.play(); }
      };
      volBtn.onclick = toggleVolume; vid.onclick = toggleVolume;

      const info = document.createElement('div');
      info.className = 'video-info';
      info.innerHTML = `<div class="username">@${state.profile.name}</div><div class="desc">${videoData.desc || videoData.title}</div><div class="music" style="font-size:12px; margin-top:5px;">🎵 ${videoData.musicName || 'Suara Asli'}</div>`;

      const actions = document.createElement('div');
      actions.className = 'side-actions';
      
      const likeBtn = document.createElement('div');
      likeBtn.className = 'action-btn-side';
      likeBtn.innerHTML = `<span class="icon">❤️</span><span>${videoData.likes || 0}</span>`;
      likeBtn.onclick = async (e) => { e.stopPropagation(); likeBtn.querySelector('.icon').style.color = '#fe2c55'; await update(ref(db, 'videos/' + videoData.id), { likes: (videoData.likes || 0) + 1 }); };

      const commentBtn = document.createElement('div');
      commentBtn.className = 'action-btn-side';
      commentBtn.innerHTML = `<span class="icon">💬</span><span>${videoData.comments ? Object.keys(videoData.comments).length : 0}</span>`;
      commentBtn.onclick = (e) => { e.stopPropagation(); openCommentModal(videoData.id); };

      const shareBtn = document.createElement('div');
      shareBtn.className = 'action-btn-side';
      shareBtn.innerHTML = `<span class="icon">↗️</span>Share`;
      shareBtn.onclick = (e) => { e.stopPropagation(); if (navigator.share) { navigator.share({ title: 'TikVid', text: 'Lihat video keren ini!', url: window.location.href }); } else { navigator.clipboard.writeText(window.location.href); window.showToast('Link disalin!'); } };

      actions.appendChild(likeBtn); actions.appendChild(commentBtn); actions.appendChild(shareBtn);
      card.appendChild(vid); card.appendChild(volBtn); card.appendChild(info); card.appendChild(actions);
      container.appendChild(card);

      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) { vid.play().catch(e=>{}); if(musicAudio && !vid.muted) musicAudio.play(); } 
          else { vid.pause(); vid.muted = true; volBtn.innerHTML = '🔇'; if(musicAudio) musicAudio.pause(); }
        });
      }, { threshold: 0.6 });
      observer.observe(card);
    });
  });
}

// ============================================================
// FITUR KOMENTAR
// ============================================================
window.openCommentModal = function(videoId) {
  state.currentVideoId = videoId;
  const list = document.getElementById('commentList');
  list.innerHTML = '<div style="text-align:center; color:#666;">Memuat...</div>';
  document.getElementById('commentModal').classList.add('show');

  onValue(ref(db, 'videos/' + videoId + '/comments'), (snapshot) => {
    const data = snapshot.val();
    list.innerHTML = '';
    if (!data) { list.innerHTML = '<div style="text-align:center; color:#666;">Belum ada komentar.</div>'; return; }
    Object.values(data).forEach(c => {
      list.innerHTML += `<div style="display:flex; gap:10px; margin-bottom:15px;"><div style="width:30px; height:30px; background:#444; border-radius:50%; display:flex; align-items:center; justify-content:center;">👤</div><div><div style="font-size:12px; color:#aaa;">@user</div><div style="font-size:14px;">${c.text}</div></div></div>`;
    });
  });
};

window.sendComment = async function() {
  const input = document.getElementById('commentInput');
  const text = input.value.trim();
  if (!text) return;
  await push(ref(db, 'videos/' + state.currentVideoId + '/comments'), { text: text, createdAt: Date.now() });
  input.value = '';
  window.showToast('Komentar terkirim!');
};

// ============================================================
// LIVE STREAMING
// ============================================================
window.openLive = async function() {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-live').classList.add('active');
  try {
    state.liveStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: true });
    const video = document.getElementById('livePreview');
    video.srcObject = state.liveStream; video.play();
    window.showToast('Live streaming dimulai! 🔴');
  } catch (err) { window.showToast('Gagal live: ' + err.message); window.switchTab('home'); }
};
window.stopLive = function() { if (state.liveStream) { state.liveStream.getTracks().forEach(t => t.stop()); state.liveStream = null; } window.switchTab('home'); window.showToast('Live berakhir.'); };

// ============================================================
// UPLOAD & KAMERA
// ============================================================
window.publishVideo = function() { document.getElementById('editVideo').pause(); document.getElementById('publishModal').classList.add('show'); };

window.confirmPublish = async function() {
  const title = document.getElementById('pubTitle').value.trim();
  const desc = document.getElementById('pubDesc').value.trim();
  if (!title) { window.showToast('Judul wajib diisi!'); return; }
  if (!state.videoBlob) { window.showToast('Tidak ada video.'); return; }

  window.closeModal('publishModal');
  window.showLoader('Mengupload video... 0%');

  const formData = new FormData();
  formData.append('file', state.videoBlob);
  formData.append('upload_preset', UPLOAD_PRESET);

  try {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`, true);
    xhr.upload.onprogress = (e) => {
      const percent = Math.round((e.loaded / e.total) * 100);
      document.getElementById('loaderText').textContent = `Mengupload video... ${percent}%`;
    };
    xhr.onload = async () => {
      if (xhr.status === 200) {
        const response = JSON.parse(xhr.responseText);
        await push(ref(db, 'videos'), {
          title: title, desc: title + (desc ? ' ' + desc : ''), videoUrl: response.secure_url,
          musicName: state.currentMusic ? state.currentMusic.name : 'Suara Asli',
          musicUrl: state.currentMusic ? state.currentMusic.url : null,
          createdAt: Date.now(), likes: 0, comments: {}
        });
        state.videoBlob = null; state.currentMusic = null;
        window.hideLoader(); window.showToast('Video berhasil diposting! 🎉'); window.switchTab('home'); 
      } else { window.hideLoader(); window.showToast('Gagal upload.'); }
    };
    xhr.send(formData);
  } catch (err) { window.hideLoader(); window.showToast('Error: ' + err.message); }
};

window.openCamera = async function() {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-camera').classList.add('active');
  try {
    if (state.camStream) state.camStream.getTracks().forEach(t => t.stop());
    state.camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: state.camFacing, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: true });
    const video = document.getElementById('camPreview');
    video.srcObject = state.camStream; video.muted = true; await video.play();
  } catch (err) { window.showToast('Gagal kamera: ' + err.message); window.switchTab('home'); }
};
window.stopCamera = function() { if (state.camStream) { state.camStream.getTracks().forEach(t => t.stop()); state.camStream = null; } if (state.mediaRecorder && state.mediaRecorder.state !== 'inactive') state.mediaRecorder.stop(); state.isRecording = false; document.getElementById('recBtn').classList.remove('recording'); };
window.toggleCameraFacing = async function() { if (state.isRecording) return; state.camFacing = state.camFacing === 'environment' ? 'user' : 'environment'; await window.openCamera(); };
window.toggleRecording = function() {
  const btn = document.getElementById('recBtn');
  if (state.isRecording) { if (state.mediaRecorder && state.mediaRecorder.state !== 'inactive') state.mediaRecorder.stop(); state.isRecording = false; btn.classList.remove('recording'); } 
  else { if (!state.camStream) return; state.recordedChunks = []; try { state.mediaRecorder = new MediaRecorder(state.camStream, { mimeType: 'video/webm;codecs=vp9,opus' }); } catch (e) { state.mediaRecorder = new MediaRecorder(state.camStream); } state.mediaRecorder.ondataavailable = e => { if (e.data.size > 0) state.recordedChunks.push(e.data); }; state.mediaRecorder.onstop = () => { handleNewVideo(new Blob(state.recordedChunks, { type: 'video/webm' })); }; state.mediaRecorder.start(); state.isRecording = true; btn.classList.add('recording'); }
};
window.pickFromGallery = function() { const input = document.getElementById('galleryInput'); input.value = ''; input.onchange = e => { const file = e.target.files[0]; if (file) handleNewVideo(file); }; input.click(); };
function handleNewVideo(blob) {
  window.stopCamera(); if (state.videoURL) URL.revokeObjectURL(state.videoURL);
  state.videoBlob = blob; state.videoURL = URL.createObjectURL(blob);
  const v = document.getElementById('editVideo'); v.src = state.videoURL; v.muted = false;
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-editor').classList.add('active'); v.play();
}

window.addEventListener('load', () => { window.switchTab('home'); loadProfile(); });
