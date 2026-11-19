import { callGasApi } from '../api.js';
import { CONFIG } from '../config.js';
import { ExamAntiCheat } from '../antiCheat.js';

export async function renderExamView(user, onExamFinished) {
  const root = document.getElementById('app-root');
  root.innerHTML = `<div class="min-h-screen flex items-center justify-center bg-white"><p class="text-brand font-bold animate-pulse">Memuat lembar soal terenkripsi...</p></div>`;

  const res = await callGasApi('startExam');
  if (!res.ok) {
    alert(res.message);
    return onExamFinished(null);
  }

  const questions = res.questions;
  const localKey = `ans_${user.exam.idUjian}_${user.nisn}`;
  const doubtKey = `dbt_${user.exam.idUjian}_${user.nisn}`;
  let answers = { ...res.savedAnswers, ...JSON.parse(localStorage.getItem(localKey) || '{}') };
  let doubts = JSON.parse(localStorage.getItem(doubtKey) || '{}');
  let currentIdx = 0;
  let remainingSec = res.remainingSec;

  // Anti-curang 3 kali pelanggaran
  const antiCheat = new ExamAntiCheat({
    idUjian: user.exam.idUjian,
    nisn: user.nisn,
    maxViolations: user.exam.batasPelanggaran,
    onWarn: (cnt, max) => {
      document.getElementById('viol-msg').textContent = `Tercatat: Pelanggaran ke-${cnt} dari ${max} batas maksimal`;
      document.getElementById('modal-viol').classList.remove('hidden');
    },
    onLock: (cnt) => finalizeSubmit(true, cnt)
  });
  antiCheat.start();

  // Sync batch setiap 90 detik + jitter acak (strategi 500 siswa serentak)
  const syncTimer = setInterval(() => {
    setTimeout(() => callGasApi('syncBatchAnswers', { answers }).catch(() => {}), Math.random() * 8000);
  }, CONFIG.BATCH_SYNC_MS);

  // Timer mundur server
  const clockTimer = setInterval(() => {
    remainingSec -= 1;
    const el = document.getElementById('exam-timer');
    if (el) {
      const h = String(Math.floor(remainingSec / 3600)).padStart(2, '0');
      const m = String(Math.floor((remainingSec % 3600) / 60)).padStart(2, '0');
      const s = String(remainingSec % 60).padStart(2, '0');
      el.textContent = `${h}:${m}:${s}`;
    }
    if (remainingSec <= 0) finalizeSubmit(false, antiCheat.count);
  }, 1000);

  async function finalizeSubmit(lockedByViolation, violations) {
    clearInterval(syncTimer);
    clearInterval(clockTimer);
    antiCheat.stop();
    root.innerHTML = `<div class="min-h-screen flex items-center justify-center bg-white"><p class="text-brand font-bold">Mengirim jawaban & menghitung skor...</p></div>`;
    const subRes = await callGasApi('submitExam', { answers, lockedByViolation, violations });
    localStorage.removeItem(localKey);
    localStorage.removeItem(doubtKey);
    onExamFinished(subRes);
  }

  function renderScreen() {
    const q = questions[currentIdx];
    const isLast = currentIdx === questions.length - 1;
    const imgHtml = q.gambarId
      ? `<img src="https://drive.google.com/uc?export=view&id=${q.gambarId}" class="my-4 max-h-60 mx-auto rounded-xl border border-slate-200 object-contain" />`
      : '';

    const stripHtml = questions.map((item, idx) => {
      const isAct = idx === currentIdx;
      const isDbt = doubts[item.idSoal];
      const isAns = Boolean(answers[item.idSoal]);
      let cls = 'bg-slate-100 text-slate-600';
      if (isDbt) cls = 'bg-amber-400 text-white';
      else if (isAns) cls = 'bg-brand text-white';
      if (isAct) cls += ' ring-2 ring-offset-2 ring-brand font-extrabold';
      return `<button onclick="window._jumpQ(${idx})" class="w-10 h-10 shrink-0 rounded-xl text-sm font-bold ${cls}">${idx + 1}</button>`;
    }).join('');

    const inputArea = q.tipe === 'PG'
      ? `<div class="space-y-3 mt-5">${q.opsi.map((opt, oIdx) => {
          const labelHuruf = ['A', 'B', 'C', 'D'][oIdx];
          const selected = answers[q.idSoal] === opt.key;
          return `<button onclick="window._pickOpt('${q.idSoal}', '${opt.key}')"
            class="w-full min-h-[56px] p-4 rounded-2xl border text-left flex items-center gap-3.5 transition ${selected ? 'bg-brand-light border-brand text-brand font-bold' : 'bg-white border-slate-200 text-slate-800'}">
            <span class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-extrabold shrink-0 ${selected ? 'bg-brand text-white' : 'bg-slate-100 text-slate-600'}">${labelHuruf}</span>
            <span class="text-base leading-snug">${opt.text}</span>
          </button>`;
        }).join('')}</div>`
      : `<div class="mt-5 bg-slate-50 p-4 rounded-2xl border border-slate-200">
          <label class="block text-xs font-bold text-slate-600 mb-2">Tulis Jawaban Singkat Anda:</label>
          <input type="text" value="${answers[q.idSoal] || ''}" oninput="window._typeAns('${q.idSoal}', this.value)"
            placeholder="Ketik jawaban singkat..." class="w-full h-12 px-4 rounded-xl bg-white border border-slate-300 focus:border-brand focus:outline-none text-base font-bold" />
        </div>`;

    root.innerHTML = `
      <div class="min-h-screen bg-white flex flex-col select-none">
        <header class="bg-brand text-white px-4 py-3 flex items-center justify-between sticky top-0 z-20">
          <div>
            <p class="text-[11px] font-bold uppercase text-blue-200">${user.exam.namaMapel}</p>
            <h1 class="text-base font-extrabold">Soal ${currentIdx + 1} dari ${questions.length}</h1>
          </div>
          <div class="bg-white text-brand px-3.5 py-1.5 rounded-full font-mono font-extrabold text-sm">⏱ <span id="exam-timer">--:--:--</span></div>
        </header>
        <nav class="bg-slate-50 border-b border-slate-200 px-3 py-2.5 flex gap-2 overflow-x-auto">${stripHtml}</nav>
        <main class="flex-1 px-4 py-5 pb-28 max-w-2xl w-full mx-auto">
          <div class="flex justify-between items-center mb-3">
            <span class="px-2.5 py-1 rounded-md bg-brand-light text-brand text-xs font-bold">${q.tipe === 'PG' ? 'Pilihan Ganda' : 'Isian Singkat'}</span>
            <span class="text-xs text-slate-400 font-semibold">Bobot: ${q.bobot} Poin</span>
          </div>
          <p class="text-base md:text-lg font-medium text-slate-900 leading-relaxed">${q.pertanyaan}</p>
          ${imgHtml}
          ${inputArea}
        </main>
        <footer class="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 px-4 py-3 z-20">
          <div class="max-w-2xl mx-auto flex gap-2.5">
            <button onclick="window._prevQ()" ${currentIdx === 0 ? 'disabled' : ''} class="h-12 min-w-[48px] px-4 rounded-xl bg-slate-100 font-bold disabled:opacity-40">←</button>
            <button onclick="window._toggleDoubt('${q.idSoal}')" class="h-12 flex-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 font-bold text-sm">⚑ Ragu-ragu</button>
            <button onclick="${isLast ? 'window._openConfirm()' : 'window._nextQ()'}" class="h-12 flex-[1.4] rounded-xl ${isLast ? 'bg-emerald-600' : 'bg-brand'} text-white font-bold text-base">
              ${isLast ? 'Selesai & Kirim ✓' : 'Lanjut →'}
            </button>
          </div>
        </footer>
      </div>

      <!-- Modal Konfirmasi Kirim Jawaban -->
      <div id="modal-confirm" class="hidden fixed inset-0 z-50 bg-slate-900/70 flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl max-w-md w-full p-6">
          <h3 class="text-lg font-extrabold text-slate-900">Konfirmasi Pengiriman Ujian</h3>
          <div id="confirm-summary" class="grid grid-cols-3 gap-2 my-4 text-center"></div>
          <div class="flex gap-2.5 mt-5">
            <button onclick="document.getElementById('modal-confirm').classList.add('hidden')" class="flex-1 h-12 rounded-xl border border-slate-300 font-bold text-sm">Periksa Lagi</button>
            <button id="btn-final-send" class="flex-1 h-12 rounded-xl bg-brand text-white font-bold text-sm">Kirim Sekarang</button>
          </div>
        </div>
      </div>

      <!-- Modal Peringatan Pelanggaran -->
      <div id="modal-viol" class="hidden fixed inset-0 z-50 bg-slate-900/90 flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl max-w-md w-full p-6 text-center">
          <h3 class="text-xl font-extrabold text-red-600">Peringatan Pelanggaran!</h3>
          <p id="viol-msg" class="font-bold text-slate-800 my-4"></p>
          <p class="text-xs text-red-700 bg-red-50 p-3 rounded-xl mb-4">Pada pelanggaran ke-3, ujian otomatis terkunci dan dikirim ke server.</p>
          <button onclick="document.getElementById('modal-viol').classList.add('hidden')" class="w-full h-12 bg-brand text-white font-bold rounded-xl">Kembali ke Ujian</button>
        </div>
      </div>`;
  }

  window._jumpQ = (idx) => { currentIdx = idx; renderScreen(); };
  window._prevQ = () => { if (currentIdx > 0) { currentIdx--; renderScreen(); } };
  window._nextQ = () => { if (currentIdx < questions.length - 1) { currentIdx++; renderScreen(); } };
  window._pickOpt = (id, key) => { answers[id] = key; localStorage.setItem(localKey, JSON.stringify(answers)); renderScreen(); };
  window._typeAns = (id, val) => { answers[id] = val; localStorage.setItem(localKey, JSON.stringify(answers)); };
  window._toggleDoubt = (id) => { doubts[id] = !doubts[id]; localStorage.setItem(doubtKey, JSON.stringify(doubts)); renderScreen(); };
  window._openConfirm = () => {
    const dijawab = questions.filter(q => Boolean(answers[q.idSoal])).length;
    const ragu = questions.filter(q => Boolean(doubts[q.idSoal])).length;
    const kosong = questions.length - dijawab;
    document.getElementById('confirm-summary').innerHTML = `
      <div class="p-3 rounded-xl bg-emerald-50 text-emerald-700"><p class="text-xl font-extrabold">${dijawab}</p><p class="text-xs">Dijawab</p></div>
      <div class="p-3 rounded-xl bg-slate-100 text-slate-700"><p class="text-xl font-extrabold">${kosong}</p><p class="text-xs">Kosong</p></div>
      <div class="p-3 rounded-xl bg-amber-50 text-amber-700"><p class="text-xl font-extrabold">${ragu}</p><p class="text-xs">Ragu</p></div>`;
    document.getElementById('modal-confirm').classList.remove('hidden');
    document.getElementById('btn-final-send').onclick = () => finalizeSubmit(false, antiCheat.count);
  };

  renderScreen();
}