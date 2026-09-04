/* Admin — Daemon Studio. Edição sem deploy: publica via GitHub API → Vercel. */
const ADMIN_EMAIL = 'daemonprod5@gmail.com';
const ADMIN_PASS_SHA256 = 'cab5ad19ed6709094cc78475e24497ec86e878c8a455d9dab6eb17429982a69c';
const REPO_OWNER = 'gurudaemon';
const REPO_NAME = 'daemonstore';
const REPO_BRANCH = 'main';

const DATA_SOURCES = {
    music:  { arr: () => window.CATALOG, file: 'catalog.js',      varName: 'CATALOG', label: 'Música',  titleKey: 'title', metaKey: 'genre' },
    books:  { arr: () => window.BOOKS,   file: 'books-data.js',  varName: 'BOOKS',   label: 'Livros',  titleKey: 'title', metaKey: 'year' },
    videos: { arr: () => window.VIDEOS,  file: 'videos-data.js', varName: 'VIDEOS',  label: 'Vídeos',  titleKey: 'title', metaKey: 'type' }
};

class DaemonAdmin {
    constructor() {
        this.tab = 'music';
        this.editingIndex = null;
        this.session = sessionStorage.getItem('ds-admin-session') === '1';
        this.token = localStorage.getItem('ds-gh-token') || '';
        this.edits = this.loadEdits();
        if (this.session) this.showPanel();
    }

    // ===== LOGIN =====
    async login() {
        const email = document.getElementById('login-email').value.trim().toLowerCase();
        const pass = document.getElementById('login-pass').value;
        const err = document.getElementById('login-err');
        if (email !== ADMIN_EMAIL) { err.textContent = 'Email ou senha incorretos.'; return; }
        const hash = await this.sha256(pass);
        if (hash !== ADMIN_PASS_SHA256) { err.textContent = 'Email ou senha incorretos.'; return; }
        sessionStorage.setItem('ds-admin-session', '1');
        sessionStorage.setItem('ds-admin-pass', pass);
        this.session = true;
        this.showPanel();
    }

    logout() { sessionStorage.removeItem('ds-admin-session'); location.reload(); }

    sha256(str) {
        return crypto.subtle.digest('SHA-256', new TextEncoder().encode(str)).then(b =>
            Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join('')
        );
    }

    showPanel() {
        // sessão antiga sem senha salva → força novo login
        if (!sessionStorage.getItem('ds-admin-pass')) { this.logout(); return; }
        document.getElementById('login-box').style.display = 'none';
        document.getElementById('panel').style.display = 'block';
        document.getElementById('gh-status').textContent = '🔓 Publicação via servidor';
        this.renderList();
        this.updateDirtyInfo();
    }

    // ===== EDIÇÕES LOCAIS =====
    loadEdits() {
        try { return JSON.parse(localStorage.getItem('ds-admin-edits') || '{}'); }
        catch { return {}; }
    }
    persistEdits() { localStorage.setItem('ds-admin-edits', JSON.stringify(this.edits)); this.updateDirtyInfo(); }
    updateDirtyInfo() {
        const tabs = Object.keys(DATA_SOURCES).filter(t => this.edits[t]);
        document.getElementById('dirty-info').textContent = tabs.length
            ? '⚠ Alterações não publicadas: ' + tabs.map(t => DATA_SOURCES[t].label).join(', ')
            : 'Nenhuma alteração não publicada';
    }

    current() { return DATA_SOURCES[this.tab]; }
    data() {
        const src = this.current();
        if (this.edits[this.tab]) return this.edits[this.tab];
        this.edits[this.tab] = JSON.parse(JSON.stringify(src.arr() || []));
        return this.edits[this.tab];
    }

    setTab(tab) {
        this.tab = tab;
        this.editingIndex = null;
        document.getElementById('editor-panel').style.display = 'none';
        document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
        this.renderList();
    }

    renderList() {
        const src = this.current();
        const data = this.data();
        document.getElementById('list-title').textContent = src.label + ' (' + data.length + ')';
        document.getElementById('item-list').innerHTML = data.map((item, i) =>
            `<div class="item-row ${i === this.editingIndex ? 'sel' : ''}" onclick="admin.selectItem(${i})">
                <span>${this.esc(String(item[src.titleKey] || '(sem título)'))}</span>
                <small>${this.esc(String(item[src.metaKey] || ''))}</small>
            </div>`).join('') || '<div class="hint">Nenhum item. Clique em + Novo.</div>';
    }

    esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

    selectItem(i) {
        this.editingIndex = i;
        const item = this.data()[i];
        document.getElementById('editor-panel').style.display = 'block';
        document.getElementById('edit-title').textContent = 'Editar: ' + (item.title || 'item');
        document.getElementById('json-editor').value = JSON.stringify(item, null, 4);
        this.renderList();
    }

    saveItem() {
        try {
            const parsed = JSON.parse(document.getElementById('json-editor').value);
            this.data()[this.editingIndex] = parsed;
            this.persistEdits();
            this.renderList();
            document.getElementById('edit-title').textContent = 'Editar: ' + (parsed.title || 'item');
            this.toast('✅ Salvo localmente. Publique para ir ao ar.');
        } catch (e) { this.toast('❌ JSON inválido: ' + e.message); }
    }

    revertItem() { this.selectItem(this.editingIndex); this.toast('↩ Revertido'); }

    addItem() {
        const data = this.data();
        const templates = {
            music: { id: Math.max(0, ...data.map(i => i.id || 0)) + 1, title: 'Novo single', type: 'single', tracks: 1, genre: '', year: new Date().getFullYear(), price: 290, coverUrl: 'assets/covers/NOVACAPA.webp', tracksList: [{ num: 1, title: 'Faixa 1', file: 'assets/audio/novoalbum/1.mp3' }], description: '', paymentLink: '', mercadoPagoLink: '', tags: ['autoral', 'single'] },
            books: { id: Math.max(0, ...data.map(i => i.id || 0)) + 1, title: 'Novo livro', subtitle: '', year: new Date().getFullYear(), status: 'disponivel', price: 4990, coverUrl: '', pages: 0, synopsis: '', quote: '', tags: [], buyLink: '', previewText: '', extras: [] },
            videos: { id: Math.max(0, ...data.map(i => i.id || 0)) + 1, title: 'Novo vídeo', type: 'documentario', duration: '', year: new Date().getFullYear(), thumbnail: 'https://img.youtube.com/vi/ID/maxresdefault.jpg', youtubeId: 'ID', description: '', tags: [] }
        };
        data.push(templates[this.tab]);
        this.persistEdits();
        this.selectItem(data.length - 1);
    }

    deleteItem() {
        if (this.editingIndex === null) return;
        if (!confirm('Excluir este item? (só vai ao ar depois de Publicar)')) return;
        this.data().splice(this.editingIndex, 1);
        this.persistEdits();
        this.editingIndex = null;
        document.getElementById('editor-panel').style.display = 'none';
        this.renderList();
    }

    toBase64(str) { return btoa(unescape(encodeURIComponent(str))); }

    ghFileContent(arr, src) {
        return `const ${src.varName} = ${JSON.stringify(arr, null, 4)};\n\nwindow.${src.varName} = ${src.varName};\n`;
    }

    // ===== PUBLICAÇÃO VIA SERVIDOR (serverless) =====
    async serverPublish(files) {
        const r = await fetch('/api/publish', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: ADMIN_EMAIL,
                pass: sessionStorage.getItem('ds-admin-pass') || '',
                files
            })
        });
        const out = await r.json().catch(() => ({}));
        if (!r.ok && !out.results) throw new Error(out.error || 'Erro ' + r.status);
        return out;
    }

    // ===== PUBLICAR =====
    async publish() {
        const tabs = Object.keys(DATA_SOURCES).filter(t => this.edits[t]);
        if (tabs.length === 0) { this.toast('Nada novo para publicar.'); return; }
        if (!confirm('Publicar ' + tabs.map(t => DATA_SOURCES[t].label).join(', ') + ' no site?')) return;
        this.toast('🚀 Publicando...');
        try {
            const files = tabs.map(t => {
                const src = DATA_SOURCES[t];
                return { path: src.file, content: this.toBase64(this.ghFileContent(this.edits[t], src)), message: 'admin: atualiza ' + src.label.toLowerCase() };
            });
            const out = await this.serverPublish(files);
            const failed = (out.results || []).filter(r => !r.ok);
            if (failed.length) { this.toast('❌ Falhou: ' + failed[0].error); return; }
            tabs.forEach(t => delete this.edits[t]);
            this.persistEdits();
            this.toast('✅ Publicado! O site atualiza em ~1 minuto (Vercel).');
        } catch (e) { this.toast('❌ ' + e.message); }
    }

    // ===== UPLOAD =====
    async uploadFile() {
        const fileInput = document.getElementById('up-file');
        const path = document.getElementById('up-path').value.trim().replace(/^\/+/, '');
        if (!fileInput.files[0] || !path) { this.toast('⚠ Escolha o arquivo e o caminho de destino.'); return; }
        if (!/^assets\/(audio|covers|about)\//.test(path)) { this.toast('⚠ Caminho deve começar com assets/audio/, assets/covers/ ou assets/about/.'); return; }
        if (fileInput.files[0].size > 40 * 1024 * 1024) { this.toast('❌ Arquivo muito grande (máx ~40MB).'); return; }
        this.toast('⬆ Enviando ' + path + ' ...');
        try {
            const bytes = new Uint8Array(await fileInput.files[0].arrayBuffer());
            let binary = '';
            for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
            const out = await this.serverPublish([{ path, content: btoa(binary), message: 'admin: envia ' + path }]);
            const failed = (out.results || []).filter(r => !r.ok);
            if (failed.length) { this.toast('❌ ' + failed[0].error); return; }
            this.toast('✅ Enviado! Disponível em /' + path);
        } catch (e) { this.toast('❌ ' + e.message); }
    }

    // settings
    openSettings() { document.getElementById('settings-box').style.display = 'flex'; document.getElementById('gh-token').value = this.token; }
    closeSettings() { document.getElementById('settings-box').style.display = 'none'; }
    saveSettings() { this.token = document.getElementById('gh-token').value.trim(); localStorage.setItem('ds-gh-token', this.token); document.getElementById('gh-status').textContent = this.token ? '🔑 Token OK' : '⚠ Sem token'; this.closeSettings(); this.toast('Token salvo neste navegador.'); }

    toast(msg) {
        const t = document.getElementById('toast');
        t.textContent = msg; t.style.display = 'block';
        clearTimeout(this._tt);
        this._tt = setTimeout(() => t.style.display = 'none', 5000);
    }
}

const admin = new DaemonAdmin();