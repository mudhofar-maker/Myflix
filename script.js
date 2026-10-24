// ============================================================
// 1. IMPORT FIREBASE (Realtime Database)
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, push, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// ============================================================
// 2. KONFIGURASI (Cloudinary & Firebase)
// ============================================================
const CLOUD_NAME = "tpiqfmqy"; 
const UPLOAD_PRESET = "tikvid_preset"; 

const firebaseConfig = {
  apiKey: "AIzaSyAac2M5yW5TGkaH0lvMwbZz8ZLhQOAjgEU",
  authDomain: "gen-lang-client-0767458981.firebaseapp.com",
  // PENTING: Pastikan URL ini persis sama dengan yang ada di Firebase Console (menu Realtime Database)
  databaseURL: "https://gen-lang-client-0767458981-default-rtdb.asia-southeast1.firebasedatabase.app", 
  projectId: "gen-lang-client-0767458981",
  storageBucket: "gen-lang-client-0767458981.firebasestorage.app",
  messagingSenderId: "641921193770",
  appId: "1:641921193770:web:19a736bcbdc0151cee3053"
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ============================================================
// 3. STATE GLOBAL
// ============================================================
const state = {
  currentTab: 'home',
  camStream: null,
  camFacing: 'environment',
  mediaRecorder: null,
  recordedChunks: [],
  isRecording: false,
  videoBlob: null,
  videoURL: null,
};

// ============================================================
// 4. FUNGSI UI (Didaftarkan ke window agar bisa dipanggil HTML)
// ============================================================
window.showToast = function(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast show';
  setTimeout(() => el.classList.remove('show'), 2500);
};

window.showLoader = function(msg) { 
  document.getElementById('loaderText').textContent = msg; 
  document.getElementById('loader').classList.add('show'); 
};

window.hideLoader = function() { 
  document.getElementById('loader').classList.remove('show'); 
};

window.closeModal = function(id) { 
  document.getElementById(id).classList.remove('show'); 
};

window.switchTab = function(tab) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  
  if (tab === 'home') {
    document.getElementById('screen-home').classList.add('active');
    document.querySelectorAll('.nav-item')[0].classList.add('active');
    loadFeedFromRealtimeDB();
  } else if (tab === 'profile') {
    document.getElementById('screen-profile').classList.add('active');
    document.querySelectorAll('.nav-item')[4].classList.add('active');
  }
};

// ============================================================
// 5. AMBIL FEED DARI REALTIME DATABASE
// ============================================================
function loadFeedFromRealtimeDB() {
  const container = document.getElementById('feedContainer');
  const empty = document.getElementById('emptyFeed');
  
  // Bersihkan video lama
  Array.from(container.children).forEach(c => { 
      if (c.id !== 'emptyFeed' && !c.classList.contains('feed-top-bar')) c.remove(); 
  });

  window.showLoader('Mengambil video...');
  
  // Mendengarkan data secara real-time
  onValue(ref(db, 'videos'), (snapshot) => {
    const data = snapshot.val();
    window.hideLoader();
    
    if (!data) {
      empty.style.display = 'flex';
      return;
    }
    empty.style.display = 'none';

    // Konversi object ke array dan urutkan dari yang terbaru
    const videos = Object.values(data).sort((a, b) => b.createdAt - a.createdAt);

    videos.forEach(videoData => {
      const card = document.createElement('div');
      card.className = 'video-card';
      
      const vid = document.createElement('video');
      vid.src = videoData.videoUrl;
      vid.loop = true;
      vid.playsInline = true;
      vid.muted = true; 
      
      const volBtn = document.createElement('button');
      volBtn.className = 'volume-btn';
      volBtn.innerHTML = '🔇';
      const toggleVolume = (e) => {
        if(e) e.stopPropagation();
        vid.muted = !vid.muted;
        volBtn.innerHTML = vid.muted ? '🔇' : '🔊';
      };
      volBtn.onclick = toggleVolume;
      vid.onclick = toggleVolume;

      const info = document.createElement('div');
      info.className = 'video-info';
      info.innerHTML = `<div class="username">@user_cloudinary</div><div class="desc">${videoData.desc || videoData.title}</div>`;

      const actions = document.createElement('div');
      actions.className = 'side-actions';
      actions.innerHTML = `
        <div class="action-btn-side"><span class="icon">❤️</span>12K</div>
        <div class="action-btn-side"><span class="icon">💬</span>345</div>
        <div class="action-btn-side"><span class="icon">↗️</span>Share</div>
      `;

      card.appendChild(vid);
      card.appendChild(volBtn);
      card.appendChild(info);
      card.appendChild(actions);
      container.appendChild(card);

      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) { vid.play().catch(e=>{}); } 
          else { vid.pause(); vid.muted = true; volBtn.innerHTML = '🔇'; }
        });
      }, { threshold: 0.6 });
      observer.observe(card);
    });
  }, (error) => {
    console.error("Gagal load feed:", error);
    window.hideLoader();
    window.showToast('Gagal memuat video. Cek Rules Database.');
  });
}

// ============================================================
// 6. UPLOAD KE CLOUDINARY & SIMPAN KE REALTIME DB
// ============================================================
window.publishVideo = function() {
  const v = document.getElementById('editVideo');
  v.pause();
  document.getElementById('publishModal').classList.add('show');
};

window.confirmPublish = async function() {
  const title = document.getElementById('pubTitle').value.trim();
  const desc = document.getElementById('pubDesc').value.trim();
  if (!title) { window.showToast('Judul wajib diisi!'); return; }
  if (!state.videoBlob) { window.showToast('Tidak ada video untuk diupload.'); return; }

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
        const videoUrl = response.secure_url;

        // Simpan metadata ke Realtime Database
        await push(ref(db, 'videos'), {
          title: title,
          desc: title + (desc ? ' ' + desc : ''),
          videoUrl: videoUrl,
          createdAt: Date.now()
        });

        state.videoBlob = null;
        state.videoURL = null;
        window.hideLoader();
        window.showToast('Video berhasil diposting! 🎉');
        window.switchTab('home'); 
      } else {
        window.hideLoader();
        window.showToast('Gagal upload ke Cloudinary.');
      }
    };
    xhr.send(formData);
  } catch (err) {
    window.hideLoader();
    window.showToast('Error: ' + err.message);
  }
};

// ============================================================
// 7. KAMERA & GALERI
// ============================================================
window.openCamera = async function() {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-camera').classList.add('active');
  try {
    if (state.camStream) state.camStream.getTracks().forEach(t => t.stop());
    state.camStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: state.camFacing, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: true 
    });
    const video = document.getElementById('camPreview');
    video.srcObject = state.camStream;
    video.muted = true;
    await video.play();
  } catch (err) {
    window.showToast('Gagal kamera: ' + err.message);
    window.switchTab('home');
  }
};

window.stopCamera = function() {
  if (state.camStream) { state.camStream.getTracks().forEach(t => t.stop()); state.camStream = null; }
  if (state.mediaRecorder && state.mediaRecorder.state !== 'inactive') state.mediaRecorder.stop();
  state.isRecording = false;
  document.getElementById('recBtn').classList.remove('recording');
};

window.toggleCameraFacing = async function() {
  if (state.isRecording) return;
  state.camFacing = state.camFacing === 'environment' ? 'user' : 'environment';
  await window.openCamera();
};

window.toggleRecording = function() {
  const btn = document.getElementById('recBtn');
  if (state.isRecording) {
    if (state.mediaRecorder && state.mediaRecorder.state !== 'inactive') state.mediaRecorder.stop();
    state.isRecording = false;
    btn.classList.remove('recording');
  } else {
    if (!state.camStream) return;
    state.recordedChunks = [];
    const mime = 'video/webm;codecs=vp9,opus';
    try { state.mediaRecorder = new MediaRecorder(state.camStream, { mimeType: mime }); } 
    catch (e) { state.mediaRecorder = new MediaRecorder(state.camStream); }
    state.mediaRecorder.ondataavailable = e => { if (e.data.size > 0) state.recordedChunks.push(e.data); };
    state.mediaRecorder.onstop = () => {
      const blob = new Blob(state.recordedChunks, { type: 'video/webm' });
      handleNewVideo(blob);
    };
    state.mediaRecorder.start();
    state.isRecording = true;
    btn.classList.add('recording');
  }
};

window.pickFromGallery = function() {
  const input = document.getElementById('galleryInput');
  input.value = '';
  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    handleNewVideo(file);
  };
  input.click();
};

// ============================================================
// 8. FUNGSI INTERNAL & INISIALISASI
// ============================================================
function handleNewVideo(blob) {
  window.stopCamera();
  if (state.videoURL) URL.revokeObjectURL(state.videoURL);
  state.videoBlob = blob;
  state.videoURL = URL.createObjectURL(blob);
  const v = document.getElementById('editVideo');
  v.src = state.videoURL;
  v.muted = false;
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-editor').classList.add('active');
  v.play();
}

// Jalankan saat halaman dimuat
window.addEventListener('load', () => {
  window.switchTab('home');
});
