import { callGasApi } from '../api.js';
import { renderExamView } from './examView.js';

export async function renderStudentPortal(user) {
  const root = document.getElementById('app-root');
  root.innerHTML = `<div class="min-h-screen flex items-center justify-center"><p class="text-brand font-bold">Memuat portal siswa...</p></div>`;

  const res = await callGasApi('getStudentDashboard');
  const { stats, riwayat, pengumuman, activeExam } = res;

  function showDashboard() {
    root.innerHTML = `
      <div class="min-h-screen bg-[#F3F6FC] pb-24">
        <header class="bg-brand text-white px-5 pt-6 pb-8 rounded-b-3xl shadow-md">
          <div class="max-w-xl mx-auto flex items-center justify-between">
            <div>
              <span class="px-2.5 py-0.5 rounded-full bg-white/15 text-xs font-semibold">Kelas ${user.kelas}</span>
              <h1 class="text-2xl font-extrabold mt-1">Halo, ${user.nama}!</h1>
              <p class="text-xs text-blue-200">NISN: ${user.nisn} • SMPN 12 Singkawang</p>
            </div>
            <button onclick="localStorage.clear();window.location.reload()" class="px-3 py-1.5 rounded-xl bg-white/15 text-xs font-bold">Keluar</button>
          </div>
        </header>

        <main class="max-w-xl mx-auto px-4 -mt-5 space-y-4">
          <!-- Kartu Ujian Aktif -->
          ${activeExam ? `
          <div class="bg-white rounded-2xl p-5 shadow-md border border-slate-100">
            <div class="flex justify-between items-center mb-2">
              <span class="text-xs font-extrabold text-emerald-600">● UJIAN BERLANGSUNG</span>
              <span class="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">Aktif</span>
            </div>
            <h2 class="text-lg font-extrabold text-slate-900">${activeExam.judul}</h2>
            <p class="text-xs text-slate-500 mt-0.5">${activeExam.namaMapel} • Durasi ${activeExam.durasi} Menit • KKM ${activeExam.kkm}</p>
            <button id="btn-prep-exam" class="w-full h-12 mt-4 bg-brand hover:bg-brand-dark text-white font-bold rounded-xl text-sm shadow">
              Mulai Kerjakan Ujian →
            </button>
          </div>` : ''}

          <!-- Ringkasan Performa -->
          <div class="grid grid-cols-3 gap-3">
            <div class="bg-white p-4 rounded-2xl shadow-sm"><p class="text-xs text-slate-500">Ujian Diikuti</p><p class="text-2xl font-extrabold mt-1">${stats.diikuti}</p></div>
            <div class="bg-white p-4 rounded-2xl shadow-sm"><p class="text-xs text-slate-500">Rata-rata</p><p class="text-2xl font-extrabold text-brand mt-1">${stats.rataRata}</p></div>
            <div class="bg-white p-4 rounded-2xl shadow-sm"><p class="text-xs text-slate-500">Tuntas KKM</p><p class="text-2xl font-extrabold text-emerald-600 mt-1">${stats.tuntas}</p></div>
          </div>

          <!-- Riwayat & Nilai Dirilis -->
          <div class="bg-white rounded-2xl p-5 shadow-sm">
            <h3 class="font-extrabold text-slate-900 text-sm mb-3">Riwayat & Hasil Ujian</h3>
            <div class="space-y-2.5">
              ${riwayat.length === 0 ? '<p class="text-xs text-slate-400">Belum ada riwayat ujian.</p>' : riwayat.map(r => `
                <div class="p-3.5 rounded-xl bg-slate-50 flex items-center justify-between">
                  <div>
                    <p class="font-bold text-sm text-slate-800">${r.judul || r.idUjian}</p>
                    <p class="text-xs text-slate-500">${r.mapel} • Status: ${r.status}</p>
                  </div>
                  <div class="text-right">
                    ${r.isReleased
                      ? `<span class="text-lg font-extrabold ${r.nilai >= r.kkm ? 'text-emerald-600' : 'text-red-600'}">${r.nilai}</span><p class="text-[10px] font-bold">${r.nilai >= r.kkm ? 'TUNTAS' : 'REMEDIAL'}</p>`
                      : `<span class="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 text-xs font-bold">Menunggu Rilis</span>`}
                  </div>
                </div>`).join('')}
            </div>
          </div>

          <!-- Pengumuman -->
          ${pengumuman.map(p => `
            <div class="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <p class="text-xs font-bold text-amber-800">📢 ${p.judul} (${p.tanggal})</p>
              <p class="text-xs text-amber-900 mt-1">${p.isi}</p>
            </div>`).join('')}
        </main>
      </div>`;

    const prepBtn = document.getElementById('btn-prep-exam');
    if (prepBtn) prepBtn.onclick = showPrepScreen;
  }

  function showPrepScreen() {
    root.innerHTML = `
      <div class="min-h-screen bg-[#F3F6FC] p-4 flex items-center justify-center">
        <div class="bg-white max-w-md w-full rounded-2xl p-6 shadow-lg">
          <span class="px-2.5 py-1 rounded-md bg-brand-light text-brand text-xs font-bold">Tata Tertib & Pakta Integritas</span>
          <h2 class="text-xl font-extrabold text-slate-900 mt-2">${activeExam.judul}</h2>
          <ul class="mt-4 space-y-2.5 text-xs text-slate-600 bg-slate-50 p-4 rounded-xl">
            <li>• Dilarang berpindah tab atau keluar dari browser selama ujian berlangsung.</li>
            <li>• <strong>Batas Pelanggaran: ${activeExam.batasPelanggaran} Kali.</strong> Pada pelanggaran ke-3, ujian otomatis dikirim dengan status <strong>TERKUNCI</strong>.</li>
            <li>• Jawaban tersimpan otomatis ke perangkat dan dikirim berkala ke server.</li>
          </ul>
          <label class="flex items-center gap-2.5 mt-4 text-xs font-semibold text-slate-800 cursor-pointer">
            <input id="chk-agree" type="checkbox" class="w-5 h-5 rounded text-brand" />
            <span>Saya sudah membaca dan memahami seluruh aturan ujian dengan jujur.</span>
          </label>
          <button id="btn-launch-exam" class="w-full h-12 mt-5 bg-brand text-white font-bold rounded-xl text-sm">Mulai Mengerjakan Ujian →</button>
        </div>
      </div>`;
    document.getElementById('btn-launch-exam').onclick = () => {
      if (!document.getElementById('chk-agree').checked) return alert('Centang pernyataan pakta integritas terlebih dahulu.');
      renderExamView(user, (result) => {
        if (!result) return showDashboard();
        showResultScreen(result);
      });
    };
  }

  function showResultScreen(result) {
    root.innerHTML = `
      <div class="min-h-screen bg-[#F3F6FC] p-4 flex items-center justify-center">
        <div class="bg-white max-w-md w-full rounded-2xl p-6 shadow-lg text-center">
          <div class="bg-brand text-white rounded-2xl p-6 mb-5">
            <p class="text-xs uppercase tracking-wider text-blue-200">${activeExam.namaMapel}</p>
            <p class="text-5xl font-extrabold my-3">${result.showScore ? result.nilai : 'TERKIRIM'}</p>
            <span class="px-3 py-1 rounded-full bg-white text-brand text-xs font-extrabold">
              ${result.showScore ? (result.nilai >= result.kkm ? '✓ TUNTAS KKM (' + result.kkm + ')' : 'BELUM TUNTAS KKM (' + result.kkm + ')') : 'Menunggu Rilis Nilai Guru'}
            </span>
          </div>
          ${result.showScore ? `<div class="grid grid-cols-2 gap-3 mb-5">
            <div class="p-3 rounded-xl bg-emerald-50 text-emerald-700 font-bold">Benar: ${result.benar}</div>
            <div class="p-3 rounded-xl bg-red-50 text-red-700 font-bold">Salah: ${result.salah}</div>
          </div>` : ''}
          <button onclick="window.location.reload()" class="w-full h-12 bg-brand text-white font-bold rounded-xl text-sm">Kembali ke Dashboard Utama</button>
        </div>
      </div>`;
  }

  showDashboard();
}