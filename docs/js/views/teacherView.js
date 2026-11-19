import { callGasApi } from '../api.js';
import { CONFIG } from '../config.js';

export async function renderTeacherPortal(user) {
  const root = document.getElementById('app-root');
  const dash = await callGasApi('getTeacherDashboard');
  let activeTab = 'dashboard';
  let monitorInterval = null;

  function renderLayout(contentHtml) {
    if (monitorInterval) clearInterval(monitorInterval);
    root.innerHTML = `
      <div class="min-h-screen bg-[#F3F6FC] flex flex-col md:flex-row">
        <aside class="w-full md:w-64 bg-white border-b md:border-r border-slate-200 p-4 flex md:flex-col justify-between">
          <div>
            <div class="mb-6 hidden md:block">
              <p class="font-extrabold text-brand text-base">SMPN 12 Singkawang</p>
              <p class="text-xs text-slate-500">${user.nama}</p>
            </div>
            <nav class="flex md:flex-col gap-1.5 text-xs font-bold overflow-x-auto">
              ${['dashboard:Dashboard', 'banksoal:Bank Soal', 'ujian:Buat Ujian', 'monitor:Pemantauan', 'laporan:Laporan'].map(t => {
                const [id, lbl] = t.split(':');
                return `<button onclick="window._gTab('${id}')" class="px-3.5 py-2.5 rounded-xl text-left whitespace-nowrap ${activeTab === id ? 'bg-brand text-white' : 'text-slate-600 hover:bg-slate-100'}">${lbl}</button>`;
              }).join('')}
            </nav>
          </div>
          <button onclick="localStorage.clear();window.location.reload()" class="px-3.5 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50">Keluar</button>
        </aside>
        <main class="flex-1 p-5 md:p-8 max-w-6xl">${contentHtml}</main>
      </div>`;
  }

  window._gTab = async (tab) => {
    activeTab = tab;
    if (tab === 'dashboard') {
      renderLayout(`
        <div class="bg-brand text-white rounded-2xl p-6 mb-6">
          <h1 class="text-2xl font-extrabold">Selamat datang kembali, ${user.nama}!</h1>
          <p class="text-xs text-blue-200 mt-1">NIP: ${user.nip} • Mapel Diampu: ${dash.mapping.map(m => m.namaMapel).join(', ') || '-'}</p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="bg-white p-5 rounded-2xl shadow-sm"><p class="text-xs text-slate-500">Total Bank Soal</p><p class="text-3xl font-extrabold mt-1">${dash.totalSoal} Butir</p></div>
          <div class="bg-white p-5 rounded-2xl shadow-sm"><p class="text-xs text-slate-500">Paket Ujian Anda</p><p class="text-3xl font-extrabold text-brand mt-1">${dash.ujianList.length} Sesi</p></div>
          <div class="bg-white p-5 rounded-2xl shadow-sm"><p class="text-xs text-slate-500">Rombel Binaan</p><p class="text-3xl font-extrabold text-emerald-600 mt-1">${[...new Set(dash.mapping.flatMap(m => m.kelas))].length} Kelas</p></div>
        </div>`);
    } else if (tab === 'banksoal') {
      const firstMapel = (dash.mapping[0] || {}).idMapel || '';
      const qRes = await callGasApi('getQuestions', { idMapel: firstMapel });
      renderLayout(`
        <div class="flex justify-between items-center mb-5">
          <h2 class="text-xl font-extrabold">Bank Soal & Editor Live Preview HP</h2>
          <button onclick="document.getElementById('editor-box').classList.toggle('hidden')" class="px-4 py-2.5 rounded-xl bg-brand text-white text-xs font-bold">+ Tambah / Edit Soal</button>
        </div>
        <!-- Form Editor + Live Preview Ponsel (Referensi: form_soal_dengan_live_preview.jpg) -->
        <div id="editor-box" class="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-white p-6 rounded-2xl shadow-sm mb-6">
          <form id="form-soal" class="lg:col-span-2 space-y-3 text-xs">
            <div class="grid grid-cols-2 gap-3">
              <div><label class="font-bold">Mata Pelajaran</label>
                <select id="s-mapel" class="w-full h-10 px-3 rounded-xl bg-slate-100 mt-1">${dash.mapping.map(m => `<option value="${m.idMapel}">${m.namaMapel}</option>`).join('')}</select>
              </div>
              <div><label class="font-bold">Tipe Soal</label>
                <select id="s-tipe" onchange="window._syncPreview()" class="w-full h-10 px-3 rounded-xl bg-slate-100 mt-1"><option value="PG">Pilihan Ganda (A-D)</option><option value="Isian">Isian Singkat</option></select>
              </div>
            </div>
            <div><label class="font-bold">Pertanyaan Soal</label>
              <textarea id="s-tanya" oninput="window._syncPreview()" rows="3" required class="w-full p-3 rounded-xl bg-slate-100 mt-1" placeholder="Tulis pertanyaan..."></textarea>
            </div>
            <div id="pg-fields" class="grid grid-cols-2 gap-2.5">
              <input id="s-a" oninput="window._syncPreview()" placeholder="Opsi A" class="h-10 px-3 rounded-xl bg-slate-100" />
              <input id="s-b" oninput="window._syncPreview()" placeholder="Opsi B" class="h-10 px-3 rounded-xl bg-slate-100" />
              <input id="s-c" oninput="window._syncPreview()" placeholder="Opsi C" class="h-10 px-3 rounded-xl bg-slate-100" />
              <input id="s-d" oninput="window._syncPreview()" placeholder="Opsi D" class="h-10 px-3 rounded-xl bg-slate-100" />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div><label class="font-bold">Kunci Jawaban (PG: A/B/C/D | Isian: teks)</label><input id="s-kunci" required class="w-full h-10 px-3 rounded-xl bg-slate-100 mt-1" /></div>
              <div><label class="font-bold">Bobot Skor</label><input id="s-bobot" type="number" value="2" class="w-full h-10 px-3 rounded-xl bg-slate-100 mt-1" /></div>
            </div>
            <button type="submit" class="px-5 h-11 rounded-xl bg-brand text-white font-bold">Simpan Butir Soal</button>
          </form>
          <!-- Bingkai Pratinjau Ponsel Siswa -->
          <div class="border-4 border-slate-800 rounded-3xl p-4 bg-white shadow-inner">
            <div class="bg-brand text-white text-[10px] font-bold px-3 py-1.5 rounded-xl mb-3 flex justify-between"><span>PRATINJAU HP SISWA</span><span>01:29:43</span></div>
            <p id="prev-tanya" class="text-sm font-semibold text-slate-800 mb-3">Pratinjau teks soal akan tampil di sini...</p>
            <div id="prev-opsi" class="space-y-2 text-xs"></div>
          </div>
        </div>
        <!-- Daftar Soal -->
        <div class="bg-white rounded-2xl p-5 shadow-sm overflow-x-auto">
          <table class="w-full text-xs text-left">
            <thead><tr class="border-b text-slate-400"><th class="py-2">Pertanyaan</th><th>Tipe</th><th>Kunci</th><th>Bobot</th><th>Aksi</th></tr></thead>
            <tbody>${(qRes.questions || []).map(q => `
              <tr class="border-b">
                <td class="py-3 font-medium">${q.pertanyaan}</td><td>${q.tipe}</td><td class="font-bold text-brand">${q.kunci}</td><td>${q.bobot}</td>
                <td><button onclick="window._delSoal('${q.idSoal}')" class="text-red-600 font-bold">Hapus</button></td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>`);

      window._syncPreview = () => {
        document.getElementById('prev-tanya').textContent = document.getElementById('s-tanya').value || 'Pratinjau teks soal...';
        const isPg = document.getElementById('s-tipe').value === 'PG';
        document.getElementById('pg-fields').classList.toggle('hidden', !isPg);
        document.getElementById('prev-opsi').innerHTML = isPg
          ? ['a', 'b', 'c', 'd'].map((k, i) => `<div class="p-2.5 rounded-xl border border-slate-200"><strong>${['A','B','C','D'][i]}.</strong> ${document.getElementById('s-' + k).value || '...'}</div>`).join('')
          : `<div class="p-2.5 rounded-xl bg-slate-100 text-slate-500">[Kolom Input Isian Singkat]</div>`;
      };
      window._delSoal = async (id) => { await callGasApi('deleteQuestion', { idSoal: id }); window._gTab('banksoal'); };
      document.getElementById('form-soal').onsubmit = async (e) => {
        e.preventDefault();
        await callGasApi('saveQuestion', {
          idMapel: document.getElementById('s-mapel').value, tipe: document.getElementById('s-tipe').value,
          pertanyaan: document.getElementById('s-tanya').value, a: document.getElementById('s-a').value,
          b: document.getElementById('s-b').value, c: document.getElementById('s-c').value,
          d: document.getElementById('s-d').value, kunci: document.getElementById('s-kunci').value,
          bobot: document.getElementById('s-bobot').value
        });
        alert('Soal berhasil disimpan!');
        window._gTab('banksoal');
      };
    } else if (tab === 'ujian') {
      renderLayout(`
        <h2 class="text-xl font-extrabold mb-4">Buat Jadwal Ujian & Token</h2>
        <form id="form-ujian" class="bg-white p-6 rounded-2xl shadow-sm space-y-4 max-w-2xl text-xs">
          <div><label class="font-bold">Mata Pelajaran (KKM otomatis disalin dari master)</label>
            <select id="u-mapel" class="w-full h-11 px-3 rounded-xl bg-slate-100 mt-1">${dash.mapping.map(m => `<option value="${m.idMapel}">${m.namaMapel} (KKM: ${m.kkm})</option>`).join('')}</select>
          </div>
          <div><label class="font-bold">Target Kelas Binaan (pisahkan koma jika lebih dari satu)</label>
            <input id="u-kelas" value="${(dash.mapping[0]?.kelas || []).join(', ')}" required class="w-full h-11 px-3 rounded-xl bg-slate-100 mt-1" />
          </div>
          <div><label class="font-bold">Judul Ujian</label><input id="u-judul" required placeholder="PTS Ganjil Matematika" class="w-full h-11 px-3 rounded-xl bg-slate-100 mt-1" /></div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="font-bold">Waktu Mulai</label><input id="u-mulai" type="datetime-local" required class="w-full h-11 px-3 rounded-xl bg-slate-100 mt-1" /></div>
            <div><label class="font-bold">Waktu Selesai</label><input id="u-selesai" type="datetime-local" required class="w-full h-11 px-3 rounded-xl bg-slate-100 mt-1" /></div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="font-bold">Durasi (Menit)</label><input id="u-durasi" type="number" value="90" class="w-full h-11 px-3 rounded-xl bg-slate-100 mt-1" /></div>
            <div><label class="font-bold">Mode Rilis Nilai</label>
              <select id="u-rilis" class="w-full h-11 px-3 rounded-xl bg-slate-100 mt-1"><option value="Manual">Manual oleh Guru</option><option value="Langsung">Langsung Setelah Submit</option></select>
            </div>
          </div>
          <button type="submit" class="px-6 h-12 rounded-xl bg-brand text-white font-bold text-sm">Simpan & Terbitkan Ujian</button>
        </form>`);
      document.getElementById('form-ujian').onsubmit = async (e) => {
        e.preventDefault();
        const res = await callGasApi('createExam', {
          idMapel: document.getElementById('u-mapel').value,
          kelasList: document.getElementById('u-kelas').value.split(',').map(s => s.trim()).filter(Boolean),
          judul: document.getElementById('u-judul').value,
          mulai: new Date(document.getElementById('u-mulai').value).toISOString(),
          selesai: new Date(document.getElementById('u-selesai').value).toISOString(),
          durasi: document.getElementById('u-durasi').value,
          modeRilis: document.getElementById('u-rilis').value
        });
        alert('Ujian diterbitkan! Token: ' + res.created.map(c => `${c.kelas}: ${c.token}`).join(' | '));
        window._gTab('monitor');
      };
    } else if (tab === 'monitor') {
      const latestDash = await callGasApi('getTeacherDashboard');
      const uList = latestDash.ujianList || [];
      renderLayout(`
        <div class="flex flex-wrap justify-between items-center gap-3 mb-5">
          <h2 class="text-xl font-extrabold">Pemantauan Ujian Real-Time</h2>
          <div class="flex gap-2">
            <select id="mon-ujian" class="h-10 px-3 rounded-xl bg-white border text-xs font-bold">${uList.map(u => `<option value="${u.idUjian}">${u.judul} (${u.kelas}) • Token: ${u.token}</option>`).join('')}</select>
            <button id="btn-rilis-nilai" class="px-4 h-10 rounded-xl bg-emerald-600 text-white text-xs font-bold">Rilis Nilai Ujian</button>
          </div>
        </div>
        <div id="mon-table" class="bg-white rounded-2xl p-5 shadow-sm text-xs">Memuat data siswa...</div>`);

      const loadMon = async () => {
        const idU = document.getElementById('mon-ujian')?.value;
        if (!idU) return;
        const mRes = await callGasApi('getLiveMonitor', { idUjian: idU });
        document.getElementById('mon-table').innerHTML = `
          <table class="w-full text-left">
            <thead><tr class="border-b text-slate-400"><th class="py-2">NISN</th><th>Nama Siswa</th><th>Status</th><th>Dijawab</th><th>Pelanggaran</th><th>Aksi</th></tr></thead>
            <tbody>${(mRes.monitorList || []).map(s => `
              <tr class="border-b">
                <td class="py-3 font-mono">${s.nisn}</td><td class="font-bold">${s.nama}</td>
                <td><span class="px-2 py-0.5 rounded-full font-bold ${s.status === 'Terkunci-Pelanggaran' ? 'bg-red-100 text-red-700' : 'bg-blue-50 text-brand'}">${s.status}</span></td>
                <td>${s.dijawab} soal</td><td>${s.pelanggaran}/3</td>
                <td>${s.status === 'Terkunci-Pelanggaran' ? `<button onclick="window._reopen('${s.nisn}','${idU}')" class="px-3 py-1 rounded-lg bg-amber-500 text-white font-bold">Buka Kembali</button>` : '-'}</td>
              </tr>`).join('')}
            </tbody>
          </table>`;
      };
      window._reopen = async (nisn, idUjian) => { await callGasApi('reopenExam', { nisn, idUjian }); loadMon(); };
      document.getElementById('btn-rilis-nilai').onclick = async () => {
        await callGasApi('releaseGrades', { idUjian: document.getElementById('mon-ujian').value });
        alert('Nilai resmi dirilis ke layar siswa!');
      };
      document.getElementById('mon-ujian').onchange = loadMon;
      loadMon();
      monitorInterval = setInterval(loadMon, CONFIG.MONITOR_POLL_MS);
    } else if (tab === 'laporan') {
      const uList = dash.ujianList || [];
      renderLayout(`
        <h2 class="text-xl font-extrabold mb-4">Laporan & Ekspor Asesmen</h2>
        <div class="bg-white p-5 rounded-2xl shadow-sm mb-5 flex flex-wrap gap-3 items-center text-xs">
          <select id="rep-ujian" class="h-10 px-3 rounded-xl bg-slate-100 font-bold">${uList.map(u => `<option value="${u.idUjian}">${u.judul} (${u.kelas})</option>`).join('')}</select>
          <button onclick="window._loadRep('JSON')" class="px-4 h-10 rounded-xl bg-slate-800 text-white font-bold">Pratinjau Data</button>
          <button onclick="window._loadRep('CSV')" class="px-4 h-10 rounded-xl bg-emerald-600 text-white font-bold">Unduh CSV / Excel</button>
          <button onclick="window._loadRep('PDF')" class="px-4 h-10 rounded-xl bg-brand text-white font-bold">Cetak PDF Ber-Kop Resmi</button>
        </div>
        <div id="rep-preview" class="bg-white p-5 rounded-2xl shadow-sm text-xs">Pilih ujian dan klik Pratinjau atau Unduh.</div>`);

      window._loadRep = async (fmt) => {
        const idUjian = document.getElementById('rep-ujian').value;
        const rRes = await callGasApi('generateReport', { idUjian, format: fmt });
        if (fmt === 'PDF' && rRes.downloadUrl) window.open(rRes.downloadUrl, '_blank');
        if (fmt === 'CSV') {
          const csv = 'No,NISN,Nama,Kelas,Nilai,Keterangan\n' + rRes.rows.map(r => `${r.no},${r.nisn},"${r.nama}",${r.kelas},${r.nilai},${r.statusKkm}`).join('\n');
          const a = document.createElement('a');
          a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
          a.download = `Rekap_CBT_${idUjian}.csv`;
          a.click();
        }
        document.getElementById('rep-preview').innerHTML = `
          <table class="w-full text-left">
            <thead><tr class="border-b"><th class="py-2">No</th><th>NISN</th><th>Nama</th><th>Nilai</th><th>Status KKM</th></tr></thead>
            <tbody>${(rRes.rows || []).map(r => `<tr class="border-b"><td class="py-2">${r.no}</td><td>${r.nisn}</td><td class="font-bold">${r.nama}</td><td class="font-extrabold">${r.nilai}</td><td>${r.statusKkm}</td></tr>`).join('')}</tbody>
          </table>`;
      };
    }
  };

  window._gTab('dashboard');
}