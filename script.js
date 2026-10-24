// 1. IMPORT FIREBASE
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 2. KONFIGURASI CLOUDINARY (SUDAH SESUAI PUNYAMU)
const CLOUD_NAME = "tpiqfmqy"; 
const UPLOAD_PRESET = "tikvid_preset"; 

// 3. KONFIGURASI FIREBASE (WAJIB DIGANTI DENGAN PUNYAMU!)
// Jika belum punya, buat project di console.firebase.google.com, aktifkan Firestore.
const firebaseConfig = {
  apiKey: "AIzaSy...", // <--- GANTI DENGAN API KEY KAMU
  authDomain: "myflix-xxxxx.firebaseapp.com",
  projectId: "myflix-xxxxx",
  storageBucket: "myflix-xxxxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// STATE GLOBAL
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
// FUNGSI UI (Didaftarkan ke window agar bisa dipanggil HTML)
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
    loadFeedFromFirestore();
  } else if (tab === 'profile') {
    document.getElementById('screen-profile').classList.add('active');
    document.querySelectorAll('.nav-item')[4].classList.add('active');
  }
};

// ============================================================
// AMBIL FEED DARI FIRESTORE
// ============================================================
async function loadFeedFromFirestore() {
  const container = document.getElementById('feedContainer');
  const empty = document.getElementById('emptyFeed');
  
  Array.from(container.children).forEach(c => { 
      if (c.id !== 'emptyFeed' && !c.classList.contains('feed-top-bar')) c.remove(); 
  });

  try {
    window.showLoader('Mengambil video...');
    const q = query(collection(db, "videos"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      empty.style.display = 'flex';
      window.hideLoader();
      return;
    }
    empty.style.display = 'none';

    snapshot.forEach((doc) => {
      const videoData = doc.data();
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
    window.hideLoader();
  } catch (error) {
    console.error("Gagal load feed:", error);
    window.showToast('Gagal memuat video dari server.');
    window.hideLoader();
    empty.style.display = 'flex';
  }
}

// ============================================================
// UPLOAD KE CLOUDINARY & SIMPAN KE FIRESTORE
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
  formData.append('context', `caption=${title}|alt=${desc}`);

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

        await addDoc(collection(db, "videos"), {
          title: title,
          desc: title + (desc ? ' ' + desc : ''),
          videoUrl: videoUrl,
          createdAt: serverTimestamp()
        });

        state.videoBlob = null;
        state.videoURL = null;
        window.hideLoader();
        window.showToast('Video berhasil diposting! 🎉');
        window.switchTab('home'); 
      } else {
        window.hideLoader();
        window.showToast('Gagal upload: ' + xhr.responseText);
      }
    };
    xhr.send(formData);
  } catch (err) {
    window.hideLoader();
    window.showToast('Error: ' + err.message);
  }
};

// ============================================================
// KAMERA & GALERI
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

// FUNGSI INTERNAL (Tidak perlu window.)
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

// JALANKAN SAAT HALAMAN DIMUAT
window.addEventListener('load', () => {
  window.switchTab('home');
});
