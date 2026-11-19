import { callGasApi } from '../api.js';

export async function renderAdminPortal(user) {
  const root = document.getElementById('app-root');
  let activeTab = 'dashboard';

  function renderLayout(contentHtml) {
    root.innerHTML = `
      <div class="min-h-screen bg-[#F3F6FC] flex flex-col md:flex-row">
        <aside class="w-full md:w-64 bg-white border-b md:border-r border-slate-200 p-4 flex md:flex-col justify-between">
          <div>
            <div class="mb-6 hidden md:block">
              <p class="font-extrabold text-brand text-base">SMPN 12 Singkawang</p>
              <p class="text-xs text-slate-500">Administrator Utama</p>
            </div>
            <nav class="flex md:flex-col gap-1.5 text-xs font-bold overflow-x-auto">
              ${['dashboard:Dashboard', 'master:Data Master & Impor', 'pemetaan:Pemetaan Rombel', 'kop:Pengaturan Kop'].map(t => {
                const [id, lbl] = t.split(':');
                return `<button onclick="window._aTab('${id}')" class="px-3.5 py-2.5 rounded-xl text-left whitespace-nowrap ${activeTab === id ? 'bg-brand text-white' : 'text-slate-600 hover:bg-slate-100'}">${lbl}</button>`;
              }).join('')}
            </nav>
          </div>
          <button onclick="localStorage.clear();window.location.reload()" class="px-3.5 py-2 rounded-xl text-xs font-bold text-red-600">Keluar</button>
        </aside>
        <main class="flex-1 p-5 md:p-8 max-w-6xl">${contentHtml}</main>
      </div>`;
  }

  window._aTab = async (tab) => {
    activeTab = tab;
    const adm = await callGasApi('getAdminDashboard');

    if (tab === 'dashboard') {
      renderLayout(`
        <h1 class="text-2xl font-extrabold mb-4">Dashboard Administrator Sekolah</h1>
        ${adm.warnings.kopIncomplete ? `<div class="p-4 mb-3 rounded-2xl bg-amber-50 border border-amber-300 text-xs text-amber-900 font-bold">⚠️ Kop Sekolah Belum Lengkap! Segera isi NPSN dan unggah logo resmi di menu Pengaturan Kop.</div>` : ''}
        ${adm.warnings.unmappedGuruCount > 0 ? `<div class="p-4 mb-4 rounded-2xl bg-amber-50 border border-amber-300 text-xs text-amber-900 font-bold">⚠️ Terdapat ${adm.warnings.unmappedGuruCount} guru terdaftar yang belum memiliki pemetaan rombel kelas.</div>` : ''}
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="bg-white p-5 rounded-2xl shadow-sm"><p class="text-xs text-slate-500">Total Siswa Aktif</p><p class="text-3xl font-extrabold mt-1">${adm.stats.totalSiswa}</p></div>
          <div class="bg-white p-5 rounded-2xl shadow-sm"><p class="text-xs text-slate-500">Guru Terdaftar</p><p class="text-3xl font-extrabold text-brand mt-1">${adm.stats.totalGuru}</p></div>
          <div class="bg-white p-5 rounded-2xl shadow-sm"><p class="text-xs text-slate-500">Ujian Aktif</p><p class="text-3xl font-extrabold text-emerald-600 mt-1">${adm.stats.ujianAktif}</p></div>
        </div>`);
    } else if (tab === 'master') {
      renderLayout(`
        <h2 class="text-xl font-extrabold mb-4">Impor Data Massal (Mode Dry Run / Validasi Pra-Simpan)</h2>
        <div class="bg-white p-6 rounded-2xl shadow-sm text-xs space-y-4 max-w-2xl">
          <div><label class="font-bold">Jenis Data Master</label>
            <select id="imp-target" class="w-full h-11 px-3 rounded-xl bg-slate-100 mt-1">
              <option value="Kelas">Master Kelas (Kolom JSON: Nama_Kelas, Tingkat)</option>
              <option value="Mapel">Master Mapel & KKM (Kolom JSON: ID_Mapel, Nama_Mapel, KKM)</option>
              <option value="Guru">Data Guru (Kolom JSON: Nama, NIP, Email, WA)</option>
              <option value="Siswa">Data Siswa (Kolom JSON: NISN, Nama, Kelas)</option>
            </select>
          </div>
          <div><label class="font-bold">Tempel Data CSV (Baris pertama = Header Kolom)</label>
            <textarea id="imp-csv" rows="6" class="w-full p-3 rounded-xl bg-slate-100 font-mono mt-1" placeholder="NISN,Nama,Kelas&#10;0089271625,Aisyah Putri,VII-A"></textarea>
          </div>
          <div class="flex gap-3">
            <button onclick="window._runImport(true)" class="px-5 h-11 rounded-xl bg-amber-500 text-white font-bold">1. Uji Validasi (Dry Run)</button>
            <button onclick="window._runImport(false)" class="px-5 h-11 rounded-xl bg-brand text-white font-bold">2. Simpan Data Valid</button>
          </div>
          <div id="imp-result" class="p-4 rounded-xl bg-slate-50 hidden"></div>
        </div>`);

      window._runImport = async (dryRun) => {
        const lines = document.getElementById('imp-csv').value.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        const rows = lines.slice(1).map(l => {
          const vals = l.split(',');
          return Object.fromEntries(headers.map((h, i) => [h, (vals[i] || '').trim()]));
        });
        const res = await callGasApi('importBulkData', { target: document.getElementById('imp-target').value, rows, dryRun });
        const box = document.getElementById('imp-result');
        box.classList.remove('hidden');
        box.innerHTML = `<p class="font-bold text-emerald-700">✓ ${res.validCount} Baris Valid | ⚠️ ${res.errorCount} Baris Bermasalah (${dryRun ? 'Mode Dry Run' : 'Tersimpan'})</p>` +
          (res.errors || []).map(e => `<p class="text-red-600 mt-1">Baris ${e.baris} (${e.input}): ${e.alasan}</p>`).join('');
      };
    } else if (tab === 'pemetaan') {
      const mData = await callGasApi('getMasterData');
      renderLayout(`
        <h2 class="text-xl font-extrabold mb-4">Pemetaan Guru, Mapel, & Rombel Kelas</h2>
        <form id="form-map" class="bg-white p-6 rounded-2xl shadow-sm space-y-4 max-w-xl text-xs">
          <div><label class="font-bold">Pilih Guru</label>
            <select id="map-guru" class="w-full h-11 px-3 rounded-xl bg-slate-100 mt-1">${(mData.guru || []).map(g => `<option value="${g[0]}">${g[1]} (${g[2]})</option>`).join('')}</select>
          </div>
          <div><label class="font-bold">Mata Pelajaran</label>
            <select id="map-mapel" class="w-full h-11 px-3 rounded-xl bg-slate-100 mt-1">${(mData.mapel || []).map(m => `<option value="${m[0]}">${m[1]} (KKM ${m[2]})</option>`).join('')}</select>
          </div>
          <div><label class="font-bold">Rombel Kelas Diampu (pisahkan koma)</label>
            <input id="map-kelas" placeholder="VII-A, VII-B, VII-C" required class="w-full h-11 px-3 rounded-xl bg-slate-100 mt-1" />
          </div>
          <button type="submit" class="px-6 h-11 rounded-xl bg-brand text-white font-bold">Simpan Pemetaan</button>
        </form>`);
      document.getElementById('form-map').onsubmit = async (e) => {
        e.preventDefault();
        await callGasApi('saveMapping', {
          idGuru: document.getElementById('map-guru').value,
          idMapel: document.getElementById('map-mapel').value,
          kelasList: document.getElementById('map-kelas').value.split(',').map(s => s.trim()).filter(Boolean)
        });
        alert('Pemetaan guru berhasil disimpan!');
      };
    } else if (tab === 'kop') {
      const k = adm.kop || {};
      renderLayout(`
        <h2 class="text-xl font-extrabold mb-4">Pengaturan Kop Surat & Identitas Sekolah</h2>
        <form id="form-kop" class="bg-white p-6 rounded-2xl shadow-sm space-y-4 max-w-xl text-xs">
          <div><label class="font-bold">Nama Resmi Sekolah *</label><input id="k-nama" value="${k.namaSekolah || ''}" required class="w-full h-11 px-3 rounded-xl bg-slate-100 mt-1" /></div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="font-bold">NPSN *</label><input id="k-npsn" value="${k.npsn || ''}" required class="w-full h-11 px-3 rounded-xl bg-slate-100 mt-1" /></div>
            <div><label class="font-bold">Telepon *</label><input id="k-telp" value="${k.telepon || ''}" required class="w-full h-11 px-3 rounded-xl bg-slate-100 mt-1" /></div>
          </div>
          <div><label class="font-bold">Alamat Lengkap *</label><input id="k-alamat" value="${k.alamat || ''}" required class="w-full h-11 px-3 rounded-xl bg-slate-100 mt-1" /></div>
          <div><label class="font-bold">Email Resmi *</label><input id="k-email" value="${k.email || ''}" required class="w-full h-11 px-3 rounded-xl bg-slate-100 mt-1" /></div>
          <div><label class="font-bold">Unggah Logo Sekolah (PNG/JPG maks 500 KB)</label><input id="k-logo" type="file" accept="image/png,image/jpeg" class="mt-1 block" /></div>
          <button type="submit" class="px-6 h-12 rounded-xl bg-brand text-white font-bold">Simpan Perubahan Kop Surat</button>
        </form>`);
      document.getElementById('form-kop').onsubmit = async (e) => {
        e.preventDefault();
        const file = document.getElementById('k-logo').files[0];
        let logoBase64 = '';
        if (file) {
          logoBase64 = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(file); });
        }
        await callGasApi('saveKopSekolah', {
          namaSekolah: document.getElementById('k-nama').value, npsn: document.getElementById('k-npsn').value,
          telepon: document.getElementById('k-telp').value, alamat: document.getElementById('k-alamat').value,
          email: document.getElementById('k-email').value, idLogo: k.idLogo, logoBase64
        });
        alert('Kop surat berhasil diperbarui!');
        window._aTab('kop');
      };
    }
  };

  window._aTab('dashboard');
}