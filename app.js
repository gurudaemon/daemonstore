class DaemonStore {
    constructor() {
        this.cart = [];
        this.currentTrack = null;
        this.audio = new Audio();
        this.isPlaying = false;
        this.currentFilter = 'all';
        this.currentTag = null;
        this.modalItem = null;
        this.customerData = { name: '', email: '', whatsapp: '' };
        this.pendingPaymentItems = null;
        this.autoplayStarted = false;
        this.leadCaptured = false;
        this.currentPlaylist = [];
        this.currentTrackIndex = 0;
        this.shuffleMode = false;
        this.allTracks = [];
        this.audioContextUnlocked = false;
        this.currentBook = null;
        this.currentVideo = null;
        this.currentText = null;
        this.init();
    }

    init() {
        this.buildAllTracks();
        this.loadConfig();
        this.setupAudio();
        this.renderCatalog();
        this.renderBooks();
        this.renderVideos();
        this.renderTexts();
        this.updateStats();
        this.setupEvents();
        this.loadCustomerData();
        this.setupImageFallbacks();
        this.setupAutoplay();
        this.setupLeadCapture();
        this.setupAudioUnlock();
        this.setupParticles();
    }

    buildAllTracks() {
        this.allTracks = [];
        CATALOG.forEach(item => {
            if (item.tracksList && item.tracksList.length > 0) {
                item.tracksList.forEach((track, idx) => {
                    this.allTracks.push({ itemId: item.id, item: item, trackIndex: idx, track: track });
                });
            }
        });
    }

    // ===== PARTICLES BACKGROUND =====
    setupParticles() {
        const container = document.getElementById('particles');
        if (!container) return;
        for (let i = 0; i < 30; i++) {
            const p = document.createElement('div');
            p.className = 'particle';
            p.style.left = Math.random() * 100 + '%';
            p.style.top = Math.random() * 100 + '%';
            p.style.animationDelay = Math.random() * 20 + 's';
            p.style.animationDuration = (15 + Math.random() * 20) + 's';
            container.appendChild(p);
        }
    }

    // ===== DESBLOQUEIO DE ÁUDIO =====
    setupAudioUnlock() {
        const unlock = () => {
            if (this.audioContextUnlocked) return;
            this.audioContextUnlocked = true;
            if (this.audio.muted) {
                this.audio.muted = false;
                document.getElementById('vol-btn').textContent = '🔊';
                this.showToast('🔊 Som ativado!');
            }
            document.removeEventListener('click', unlock);
            document.removeEventListener('touchstart', unlock);
            document.removeEventListener('keydown', unlock);
            document.removeEventListener('scroll', unlock);
            const banner = document.getElementById('audio-unlock-banner');
            if (banner) banner.style.display = 'none';
        };
        document.addEventListener('click', unlock);
        document.addEventListener('touchstart', unlock);
        document.addEventListener('keydown', unlock);
        document.addEventListener('scroll', unlock);
    }

    // ===== AUTOPLAY — COMEÇA MUDO =====
    setupAutoplay() {
        setTimeout(() => { this.tryAutoplayMuted(); }, 800);
    }

    tryAutoplayMuted() {
        if (this.allTracks.length === 0) return;
        const randomEntry = this.allTracks[Math.floor(Math.random() * this.allTracks.length)];
        this.loadPlaylist(randomEntry.item, randomEntry.trackIndex, false);
        this.audio.muted = true;
        document.getElementById('vol-btn').textContent = '🔇';
        this.audio.play().then(() => {
            this.isPlaying = true;
            document.getElementById('play-btn').textContent = '⏸';
            this.renderCatalog();
            this.renderPlaylistInModal();
            this.showAudioUnlockBanner(randomEntry.item.title + ' — ' + randomEntry.track.title);
        }).catch(() => {
            this.isPlaying = false;
            document.getElementById('play-btn').textContent = '▶';
        });
    }

    showAudioUnlockBanner(trackName) {
        let banner = document.getElementById('audio-unlock-banner');
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'audio-unlock-banner';
            banner.innerHTML = `<span>▶ Tocando: <strong>${trackName}</strong></span><span style="opacity:0.8">— Clique, toque ou role a página para ativar o som</span><button onclick="this.parentElement.style.display='none'">×</button>`;
            banner.style.cssText = `position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,rgba(192,192,200,0.15),rgba(192,192,200,0.05));border:1px solid rgba(192,192,200,0.2);color:#e8e8f0;padding:0.75rem 1.5rem;border-radius:100px;font-size:0.85rem;z-index:3000;display:flex;align-items:center;gap:0.75rem;backdrop-filter:blur(10px);animation:slideUp 0.5s ease-out;white-space:nowrap;`;
            document.body.appendChild(banner);
        } else {
            banner.querySelector('strong').textContent = trackName;
            banner.style.display = 'flex';
        }
    }

    setupLeadCapture() {
        setTimeout(() => {
            if (!localStorage.getItem('daemon_lead')) {
                document.getElementById('lead-modal').classList.add('active');
            }
        }, 8000);
    }

    setupImageFallbacks() {
        document.addEventListener('error', (e) => {
            const t = e.target;
            if (t.tagName === 'IMG') this.handleImageError(t);
        }, true);
    }

    handleImageError(img) {
        if (img.dataset.fallbackApplied) return;
        img.dataset.fallbackApplied = 'true';
        const src = img.getAttribute('src') || '';
        if (src.includes('assets/covers/')) {
            const item = CATALOG.find(i => i.coverUrl === src);
            if (item) { img.src = this.generateCoverSVG(item); return; }
        }
        if (src.includes('assets/logo.png')) {
            img.style.display = 'none';
            const tl = document.getElementById('nav-text-logo');
            if (tl) tl.style.display = 'flex';
            return;
        }
        img.src = this.generateGenericPlaceholder(img.alt || 'Image');
    }

    generateCoverSVG(item) {
        let base, accent;
        const g = item.genre.toLowerCase();
        if (g.includes('metal')) { base = '#1a1a2e'; accent = '#e94560'; }
        else if (g.includes('rap')) { base = '#0f0f1a'; accent = '#f39c12'; }
        else if (g.includes('eletrônica') || g.includes('eletronica') || g.includes('psytrance')) { base = '#0a0a1a'; accent = '#00d2ff'; }
        else if (g.includes('drum') || g.includes('phonk')) { base = '#1a0a1a'; accent = '#ff006e'; }
        else { base = '#0f0f12'; accent = '#c0c0c8'; }
        const typeLabel = { album: 'ÁLBUM', ep: 'EP', single: 'SINGLE' }[item.type];
        const initials = item.title.split(' ').map(w => w[0]).join('').substring(0, 3).toUpperCase();
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><defs><linearGradient id="g${item.id}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:${base};stop-opacity:1"/><stop offset="100%" style="stop-color:${this.adjustColor(base, 40)};stop-opacity:1"/></linearGradient></defs><rect width="400" height="400" fill="url(#g${item.id})"/><text x="200" y="180" font-family="Orbitron,sans-serif" font-size="72" font-weight="900" fill="${accent}" text-anchor="middle">${initials}</text><text x="200" y="240" font-family="Rajdhani,sans-serif" font-size="18" font-weight="600" fill="#9090a0" text-anchor="middle" letter-spacing="4">${typeLabel}</text><text x="200" y="340" font-family="Inter,sans-serif" font-size="14" fill="#505060" text-anchor="middle">${item.year}</text></svg>`;
        return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
    }

    generateGenericPlaceholder(alt) {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="#141418"/><text x="200" y="200" font-family="Inter,sans-serif" font-size="16" fill="#505060" text-anchor="middle">${alt}</text></svg>`;
        return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
    }

    adjustColor(hex, amount) {
        const num = parseInt(hex.replace('#', ''), 16);
        const r = Math.min(255, Math.max(0, (num >> 16) + amount));
        const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
        const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
        return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
    }

    loadConfig() {
        if (!window.CONFIG) return;
        document.getElementById('page-title').textContent = CONFIG.studioName + ' | Loja Oficial';
        document.getElementById('hero-subtitle').textContent = CONFIG.tagline;
        document.getElementById('contact-email').textContent = CONFIG.email;
        document.getElementById('contact-email').href = 'mailto:' + CONFIG.email;
        if (CONFIG.demoMode) document.getElementById('demo-banner').style.display = 'flex';
    }

    loadCustomerData() {
        const saved = localStorage.getItem('daemon_customer');
        if (saved) {
            this.customerData = JSON.parse(saved);
            document.getElementById('cust-name').value = this.customerData.name || '';
            document.getElementById('cust-email').value = this.customerData.email || '';
            document.getElementById('cust-whatsapp').value = this.customerData.whatsapp || '';
        }
    }

    // ===== ENVIA EMAIL COM O PEDIDO =====
    notifyOrder(items, metodo) {
        const itemsText = items.map(i => `${i.title} (${i.genre}) — R$ ${(i.price/100).toFixed(2)}`).join('\n');
        const total = items.reduce((sum, i) => sum + i.price, 0);
        const totalFormatted = `R$ ${(total/100).toFixed(2).replace('.', ',')}`;
        document.getElementById('form-nome').value = this.customerData.name || 'Não identificado';
        document.getElementById('form-email').value = this.customerData.email || 'Não informado';
        document.getElementById('form-whatsapp').value = this.customerData.whatsapp || 'Não informado';
        document.getElementById('form-itens').value = itemsText;
        document.getElementById('form-total').value = totalFormatted;
        document.getElementById('form-metodo').value = metodo;
        const form = document.getElementById('order-form');
        const formData = new FormData(form);
        fetch(form.action, { method: 'POST', body: formData, headers: { 'Accept': 'application/json' } })
            .then(response => {
                if (response.ok) {
                    console.log('%c✅ PEDIDO ENVIADO', 'color:#00d4aa;font-size:14px;font-weight:bold');
                } else {
                    console.log('%c⚠️ FormSubmit respondeu, verifique ativação', 'color:#f59e0b;font-size:12px');
                }
            }).catch(err => {
                console.log('%c❌ Erro ao enviar email. Backup local...', 'color:#ef4444;font-size:12px');
                this.saveOrderBackup(items, metodo, totalFormatted);
            });
        this.saveOrderBackup(items, metodo, totalFormatted);
    }

    saveOrderBackup(items, metodo, total) {
        const order = { nome: this.customerData.name, email: this.customerData.email, whatsapp: this.customerData.whatsapp, itens: items.map(i => i.title), total: total, metodo: metodo, data: new Date().toISOString() };
        let orders = JSON.parse(localStorage.getItem('daemon_orders') || '[]');
        orders.push(order);
        localStorage.setItem('daemon_orders', JSON.stringify(orders));
    }

    saveCustomerData() {
        localStorage.setItem('daemon_customer', JSON.stringify(this.customerData));
    }

    saveLead() {
        const name = document.getElementById('lead-name').value.trim();
        const email = document.getElementById('lead-email').value.trim();
        const whatsapp = document.getElementById('lead-whatsapp').value.trim();
        if (!name || !email) { this.showToast('Preencha nome e email', 'error'); return; }
        if (!email.includes('@') || !email.includes('.')) { this.showToast('Email inválido', 'error'); return; }
        const lead = { name, email, whatsapp, date: new Date().toISOString() };
        let leads = JSON.parse(localStorage.getItem('daemon_leads') || '[]');
        leads.push(lead);
        localStorage.setItem('daemon_leads', JSON.stringify(leads));
        localStorage.setItem('daemon_lead', 'true');
        this.customerData = { name, email, whatsapp };
        this.saveCustomerData();
        this.closeModal('lead-modal');
        this.showToast('Obrigado! Você receberá novidades.');
        this.sendLeadToFormSubmit(lead);
    }

    sendLeadToFormSubmit(lead) {
        document.getElementById('lead-form-nome').value = lead.name;
        document.getElementById('lead-form-email').value = lead.email;
        document.getElementById('lead-form-whatsapp').value = lead.whatsapp || 'Não informado';
        document.getElementById('lead-form-data').value = lead.date;
        const form = document.getElementById('lead-submit-form');
        const formData = new FormData(form);
        fetch(form.action, { method: 'POST', body: formData, headers: { 'Accept': 'application/json' } })
            .then(r => { if (r.ok) console.log('%c✅ LEAD ENVIADO', 'color:#00d4aa;font-weight:bold'); })
            .catch(e => console.log('Lead backup local'));
    }

    exportLeads() {
        const leads = JSON.parse(localStorage.getItem('daemon_leads') || '[]');
        if (leads.length === 0) { this.showToast('Nenhum lead capturado', 'error'); return; }
        const csv = 'Nome,Email,WhatsApp,Data\n' + leads.map(l => `"${l.name}","${l.email}","${l.whatsapp || ''}","${l.date}"`).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'leads-daemon-studio.csv'; a.click();
        URL.revokeObjectURL(url);
        this.showToast(leads.length + ' leads exportados!');
    }

    updateStats() {
        document.getElementById('stat-albums').textContent = CATALOG.filter(i => i.type === 'album').length;
        document.getElementById('stat-eps').textContent = CATALOG.filter(i => i.type === 'ep').length;
        document.getElementById('stat-singles').textContent = CATALOG.filter(i => i.type === 'single').length;
        document.getElementById('stat-tracks').textContent = CATALOG.reduce((sum, i) => sum + i.tracks, 0);
        if (window.BOOKS) document.getElementById('stat-books').textContent = BOOKS.length;
        if (window.VIDEOS) document.getElementById('stat-videos').textContent = VIDEOS.length;
    }

    // ===== CATALOGO MUSICAL =====
    renderCatalog() {
        const grid = document.getElementById('catalog-grid');
        const items = this.getFiltered();
        if (items.length === 0) { grid.innerHTML = ''; document.getElementById('empty-state').style.display = 'block'; return; }
        document.getElementById('empty-state').style.display = 'none';
        grid.innerHTML = items.map(item => this.createCard(item)).join('');
        requestAnimationFrame(() => {
            grid.querySelectorAll('img').forEach(img => { if (img.complete && img.naturalWidth === 0) this.handleImageError(img); });
        });
    }

    getFiltered() {
        let items = [...CATALOG];
        if (this.currentFilter !== 'all' && ['album','ep','single'].includes(this.currentFilter)) {
            items = items.filter(i => i.type === this.currentFilter);
        }
        if (this.currentTag) items = items.filter(i => i.tags.includes(this.currentTag));
        const search = document.getElementById('search-input').value.toLowerCase().trim();
        if (search) {
            items = items.filter(i => i.title.toLowerCase().includes(search) || i.genre.toLowerCase().includes(search) || i.tags.some(t => t.includes(search)));
        }
        return items;
    }

    createCard(item) {
        const price = 'R$ ' + (item.price / 100).toFixed(2).replace('.', ',');
        const typeLabel = { album: 'Álbum', ep: 'EP', single: 'Single' }[item.type];
        const inCart = this.cart.some(c => c.id === item.id);
        const isPlaying = this.currentTrack === item.id && this.isPlaying;
        return `<div class="music-card" onclick="app.openProduct(${item.id})"><div class="music-cover"><img src="${item.coverUrl}" alt="${item.title}" loading="lazy" onerror="app.handleImageError(this)"><div class="music-overlay"><button class="music-play" onclick="event.stopPropagation(); app.playItem(${item.id})">${isPlaying ? '⏸' : '▶'}</button></div><div class="music-type-tag">${typeLabel}</div></div><div class="music-info"><div class="music-title">${item.title}</div><div class="music-meta"><span>${item.genre}</span><span>${item.tracks} faixa${item.tracks > 1 ? 's' : ''}</span><span>${item.year}</span></div><div class="music-desc">${item.description}</div><div class="music-footer"><div class="music-price">${price}</div><button class="music-btn" onclick="event.stopPropagation(); app.addToCart(${item.id})">${inCart ? '✓ Adicionado' : '+ Carrinho'}</button></div></div></div>`;
    }

    setType(type) { this.currentFilter = type; this.currentTag = null; this.updatePills(); this.renderCatalog(); }
    setTag(tag) { this.currentTag = tag; this.currentFilter = 'all'; this.updatePills(); this.renderCatalog(); }
    updatePills() {
        document.querySelectorAll('.pill').forEach(pill => {
            const filter = pill.dataset.filter;
            let active = false;
            if (['album','ep','single','all'].includes(filter)) active = this.currentFilter === filter && !this.currentTag;
            else active = this.currentTag === filter;
            pill.classList.toggle('active', active);
        });
    }
    filter() { this.renderCatalog(); }

    // ===== LIVROS =====
    renderBooks() {
        if (!window.BOOKS) return;
        const grid = document.getElementById('books-grid');
        if (!grid) return;
        grid.innerHTML = BOOKS.map(book => this.createBookCard(book)).join('');
    }

    createBookCard(book) {
        const statusLabels = { disponivel: 'Disponível', 'pre-venda': 'Pré-venda', gratuito: 'Gratuito' };
        const statusClass = book.status;
        const price = book.price === 0 ? 'Gratuito' : 'R$ ' + (book.price / 100).toFixed(2).replace('.', ',');
        return `<div class="book-card" onclick="app.openBook(${book.id})"><div class="book-cover"><img src="${book.coverUrl}" alt="${book.title}" loading="lazy" onerror="app.handleImageError(this)"><div class="book-status ${statusClass}">${statusLabels[book.status] || book.status}</div></div><div class="book-info"><div class="book-title">${book.title}</div><div class="book-subtitle">${book.subtitle || ''}</div><div class="book-meta"><span>${book.year}</span>${book.pages ? `<span>• ${book.pages} pág</span>` : ''}</div><div class="book-footer"><div class="book-price">${price}</div><span class="book-cta">Ver detalhes →</span></div></div></div>`;
    }

    openBook(id) {
        if (!window.BOOKS) return;
        const book = BOOKS.find(b => b.id === id);
        if (!book) return;
        this.currentBook = book;
        document.getElementById('book-modal-cover').innerHTML = `<img src="${book.coverUrl}" alt="${book.title}" onerror="app.handleImageError(this)" style="width:100%;height:100%;object-fit:cover;border-radius:12px;">`;
        document.getElementById('book-modal-tag').textContent = book.status === 'gratuito' ? 'Gratuito' : (book.status === 'pre-venda' ? 'Pré-venda' : 'Livro');
        document.getElementById('book-modal-title').textContent = book.title;
        document.getElementById('book-modal-meta').textContent = (book.subtitle ? book.subtitle + ' • ' : '') + book.year + (book.pages ? ' • ' + book.pages + ' páginas' : '');
        document.getElementById('book-modal-synopsis').textContent = book.synopsis || '(sinopse em breve)';
        document.getElementById('book-modal-quote').textContent = book.quote || '';
        document.getElementById('book-modal-quote').style.display = book.quote ? 'block' : 'none';
        const price = book.price === 0 ? 'Gratuito' : 'R$ ' + (book.price / 100).toFixed(2).replace('.', ',');
        document.getElementById('book-modal-price').textContent = price;
        const buyBtn = document.getElementById('book-modal-buy');
        const previewBtn = document.getElementById('book-modal-preview');
        if (book.status === 'gratuito') {
            buyBtn.textContent = 'Baixar Grátis';
            buyBtn.onclick = () => this.downloadBook(book);
        } else if (book.status === 'pre-venda') {
            buyBtn.textContent = 'Reservar Pré-venda';
            buyBtn.onclick = () => this.reserveBook(book);
        } else {
            buyBtn.textContent = 'Comprar';
            buyBtn.onclick = () => this.buyBook(book);
        }
        previewBtn.style.display = book.previewText ? 'flex' : 'none';
        const extras = document.getElementById('book-modal-status');
        extras.innerHTML = book.extras ? book.extras.map(e => `<div class="book-extra"><span class="book-extra-label">${e.label}</span><span class="book-extra-value">${e.value}</span></div>`).join('') : '';
        document.getElementById('book-modal').classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    buyBook(book) {
        if (!book) book = this.currentBook;
        if (!book) return;
        this.notifyOrder([{ title: book.title, genre: 'Livro', price: book.price, tracks: 0, coverUrl: book.coverUrl }], 'compra_livro');
        if (book.buyLink) window.open(book.buyLink, '_blank');
        else this.showToast('Link de compra em breve', 'error');
    }

    reserveBook(book) {
        if (!book) book = this.currentBook;
        this.showToast('Pré-vada reservada! Entraremos em contato.');
        this.notifyOrder([{ title: '[PRÉ-VENDA] ' + book.title, genre: 'Livro', price: 0, tracks: 0, coverUrl: book.coverUrl }], 'pre_venda_livro');
    }

    downloadBook(book) {
        if (!book) book = this.currentBook;
        this.showToast('Download iniciado!');
    }

    previewBook() {
        if (!this.currentBook || !this.currentBook.previewText) return;
        const modal = document.getElementById('text-modal');
        document.getElementById('text-modal-tag').textContent = 'Trecho';
        document.getElementById('text-modal-title').textContent = this.currentBook.title;
        document.getElementById('text-modal-meta').textContent = 'Daemon Studio';
        document.getElementById('text-modal-content').innerHTML = '<p style="white-space:pre-wrap;line-height:1.8;">' + this.currentBook.previewText.replace(/\n/g, '<br>') + '</p>';
        document.getElementById('book-modal').classList.remove('active');
        modal.classList.add('active');
    }

    // ===== VÍDEOS / AUDIOVISUAL =====
    renderVideos() {
        if (!window.VIDEOS) return;
        const grid = document.getElementById('cinema-grid');
        if (!grid) return;
        grid.innerHTML = VIDEOS.map(video => this.createVideoCard(video)).join('');
    }

    createVideoCard(video) {
        const typeLabels = { documentario: 'Documentário', clipe: 'Clipe', ensaio: 'Ensaio', lyric: 'Lyric Video', live: 'Live', curta: 'Curta' };
        return `<div class="cinema-card" onclick="app.openVideo(${video.id})"><div class="cinema-thumb"><img src="${video.thumbnail}" alt="${video.title}" loading="lazy" onerror="app.handleImageError(this)"><div class="cinema-play">▶</div><div class="cinema-duration">${video.duration}</div></div><div class="cinema-info"><div class="cinema-type">${typeLabels[video.type] || video.type}</div><div class="cinema-title">${video.title || 'Título em breve'}</div><div class="cinema-meta"><span>${video.year}</span></div></div></div>`;
    }

    openVideo(id) {
        if (!window.VIDEOS) return;
        const video = VIDEOS.find(v => v.id === id);
        if (!video) return;
        this.currentVideo = video;
        const typeLabels = { documentario: 'Documentário', clipe: 'Clipe', ensaio: 'Ensaio', lyric: 'Lyric Video', live: 'Live', curta: 'Curta' };
        document.getElementById('cinema-modal-tag').textContent = typeLabels[video.type] || video.type;
        document.getElementById('cinema-modal-title').textContent = video.title || 'Título em breve';
        document.getElementById('cinema-modal-meta').textContent = (video.year ? video.year + ' • ' : '') + (video.duration || '');
        document.getElementById('cinema-modal-desc').textContent = video.description || '(descrição em breve)';
        const placeholder = document.getElementById('cinema-placeholder');
        const iframe = document.getElementById('cinema-iframe');
        placeholder.style.display = 'flex';
        iframe.style.display = 'none';
        iframe.src = '';
        placeholder.onclick = () => {
            if (video.youtubeId) {
                iframe.src = 'https://www.youtube.com/embed/' + video.youtubeId + '?autoplay=1';
                iframe.style.display = 'block';
                placeholder.style.display = 'none';
            } else {
                this.showToast('Link do YouTube em breve', 'error');
            }
        };
        const ytBtn = document.getElementById('cinema-modal-youtube');
        if (video.youtubeId) { ytBtn.href = 'https://youtube.com/watch?v=' + video.youtubeId; ytBtn.style.display = 'inline-flex'; }
        else { ytBtn.style.display = 'none'; }
        document.getElementById('cinema-modal').classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    shareCinema() {
        if (!this.currentVideo) return;
        const url = this.currentVideo.youtubeId ? 'https://youtube.com/watch?v=' + this.currentVideo.youtubeId : window.location.href;
        navigator.clipboard.writeText(url).then(() => this.showToast('Link copiado!'));
    }

    // ===== TEXTOS / ESCRITOS =====
    renderTexts() {
        if (!window.TEXTS) return;
        const grid = document.getElementById('texts-grid');
        if (!grid) return;
        grid.innerHTML = TEXTS.map(text => this.createTextCard(text)).join('');
    }

    createTextCard(text) {
        const typeLabels = { manifesto: 'Manifesto', cronica: 'Crônica', poesia: 'Poesia', letra: 'Letra', ensaio: 'Ensaio' };
        const preview = text.content ? text.content.substring(0, 120).replace(/\n/g, ' ') + '...' : '(em breve)';
        return `<div class="text-card" onclick="app.openText(${text.id})"><div class="text-card-type">${typeLabels[text.type] || text.type}</div><div class="text-card-title">${text.title || 'Título em breve'}</div><div class="text-card-preview">${preview}</div><div class="text-card-meta"><span>${text.date}</span></div></div>`;
    }

    openText(id) {
        if (!window.TEXTS) return;
        const text = TEXTS.find(t => t.id === id);
        if (!text) return;
        this.currentText = text;
        const typeLabels = { manifesto: 'Manifesto', cronica: 'Crônica', poesia: 'Poesia', letra: 'Letra', ensaio: 'Ensaio' };
        document.getElementById('text-modal-tag').textContent = typeLabels[text.type] || text.type;
        document.getElementById('text-modal-title').textContent = text.title || 'Título em breve';
        document.getElementById('text-modal-meta').textContent = 'D.T. Shen' + (text.date ? ' • ' + text.date : '');
        const content = text.content ? text.content.replace(/\n/g, '<br>') : '<p style="color:var(--text-muted)">(conteúdo em breve)</p>';
        document.getElementById('text-modal-content').innerHTML = '<p style="line-height:1.8;font-size:1rem;">' + content + '</p>';
        document.getElementById('text-modal').classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    shareText() {
        if (!this.currentText) return;
        navigator.clipboard.writeText(window.location.href + '#textos').then(() => this.showToast('Link copiado!'));
    }

    // ===== PRODUCT MODAL (MUSICA) =====
    openProduct(id) {
        const item = CATALOG.find(i => i.id === id);
        if (!item) return;
        this.modalItem = item;
        const coverImg = document.getElementById('modal-cover');
        coverImg.src = item.coverUrl; coverImg.alt = item.title; coverImg.dataset.fallbackApplied = '';
        document.getElementById('modal-title').textContent = item.title;
        document.getElementById('modal-type').textContent = { album: 'Álbum', ep: 'EP', single: 'Single' }[item.type];
        document.getElementById('modal-genre').textContent = item.genre;
        document.getElementById('modal-tracks').textContent = item.tracks + ' faixa' + (item.tracks > 1 ? 's' : '');
        document.getElementById('modal-year').textContent = item.year;
        document.getElementById('modal-desc').textContent = item.description;
        document.getElementById('modal-price').textContent = 'R$ ' + (item.price / 100).toFixed(2).replace('.', ',');
        document.getElementById('modal-tags').innerHTML = item.tags.map(t => `<span class="product-tag">${t}</span>`).join('');
        const isPlaying = this.currentTrack === item.id && this.isPlaying;
        document.getElementById('modal-play-icon').textContent = isPlaying ? '⏸' : '▶';
        const inCart = this.cart.some(c => c.id === item.id);
        const cartBtn = document.getElementById('modal-cart-btn');
        cartBtn.textContent = inCart ? '✓ No Carrinho' : '+ Carrinho';
        cartBtn.disabled = inCart; cartBtn.style.opacity = inCart ? '0.5' : '1';
        this.renderPlaylistInModal();
        document.getElementById('product-modal').classList.add('active');
        document.body.style.overflow = 'hidden';
        setTimeout(() => { if (coverImg.complete && coverImg.naturalWidth === 0) this.handleImageError(coverImg); }, 100);
    }

    addModalToCart() {
        if (!this.modalItem) return;
        this.addToCart(this.modalItem.id);
        const inCart = this.cart.some(c => c.id === this.modalItem.id);
        const cartBtn = document.getElementById('modal-cart-btn');
        cartBtn.textContent = inCart ? '✓ No Carrinho' : '+ Carrinho';
        cartBtn.disabled = inCart; cartBtn.style.opacity = inCart ? '0.5' : '1';
    }

    closeModal(id) {
        document.getElementById(id).classList.remove('active');
        document.body.style.overflow = '';
        if (id === 'cinema-modal') {
            document.getElementById('cinema-iframe').src = '';
            document.getElementById('cinema-iframe').style.display = 'none';
            document.getElementById('cinema-placeholder').style.display = 'flex';
        }
    }

    buyItem() {
        if (!this.modalItem) return;
        const item = this.modalItem;
        this.notifyOrder([item], 'compra_direta');
        if (item.paymentLink && item.paymentLink !== 'https://mpago.la/XXXXXXX') {
            window.open(item.paymentLink, '_blank');
            this.showToast('Redirecionando para pagamento...');
        } else {
            this.pendingPaymentItems = [item];
            this.showPaymentModal([item]);
        }
    }

    openCustomerForm() {
        if (this.cart.length === 0) { this.showToast('Adicione itens ao carrinho primeiro', 'error'); return; }
        this.toggleCart();
        const summary = document.getElementById('form-summary');
        const total = this.cart.reduce((sum, item) => sum + item.price, 0);
        summary.innerHTML = `<div class="form-summary-items">${this.cart.map(item => `<div class="form-summary-item"><img src="${item.coverUrl}" alt="${item.title}" onerror="app.handleImageError(this)"><div><div class="form-sum-title">${item.title}</div><div class="form-sum-meta">${item.genre} • ${item.tracks} faixas</div></div><div class="form-sum-price">R$ ${(item.price/100).toFixed(2).replace('.', ',')}</div></div>`).join('')}</div><div class="form-summary-total"><span>Total</span><span>R$ ${(total/100).toFixed(2).replace('.', ',')}</span></div>`;
        document.getElementById('customer-modal').classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    closeCustomerForm() {
        document.getElementById('customer-modal').classList.remove('active');
        document.body.style.overflow = '';
    }

    validateAndProceed() {
        const name = document.getElementById('cust-name').value.trim();
        const email = document.getElementById('cust-email').value.trim();
        const whatsapp = document.getElementById('cust-whatsapp').value.trim();
        if (!name || !email) { this.showToast('Preencha nome e email', 'error'); return; }
        if (!email.includes('@') || !email.includes('.')) { this.showToast('Email inválido', 'error'); return; }
        this.customerData = { name, email, whatsapp };
        this.saveCustomerData();
        this.closeCustomerForm();
        this.pendingPaymentItems = [...this.cart];
        this.notifyOrder(this.cart, 'carrinho');
        this.showPaymentModal(this.cart);
    }

    showPaymentModal(items) {
        const total = items.reduce((sum, i) => sum + i.price, 0);
        const totalFormatted = 'R$ ' + (total/100).toFixed(2).replace('.', ',');
        document.getElementById('checkout-items-list').innerHTML = items.map(item => `<div class="checkout-item"><img src="${item.coverUrl}" alt="${item.title}" onerror="app.handleImageError(this)"><div class="checkout-item-info"><div class="checkout-item-title">${item.title}</div><div class="checkout-item-meta">${item.genre} • ${item.tracks || 0} faixas</div></div><div class="checkout-item-price">R$ ${(item.price/100).toFixed(2).replace('.', ',')}</div></div>`).join('');
        document.getElementById('checkout-total').textContent = totalFormatted;
        const pixSection = document.getElementById('checkout-pix');
        if (CONFIG.pixKey) {
            pixSection.style.display = 'flex';
            const pixPayload = this.generatePixPayload(total, items);
            document.getElementById('pix-payload').textContent = pixPayload;
            document.getElementById('pix-qr').src = 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=' + encodeURIComponent(pixPayload);
        } else pixSection.style.display = 'none';
        const mpSection = document.getElementById('checkout-mercadopago');
        if (CONFIG.mercadoPagoEnabled) {
            mpSection.style.display = 'flex';
            const mpLink = items.find(i => i.mercadoPagoLink && i.mercadoPagoLink !== 'https://mpago.la/XXXXXXX')?.mercadoPagoLink;
            if (mpLink) { mpSection.href = mpLink; mpSection.onclick = null; }
            else { mpSection.href = '#'; mpSection.onclick = (e) => { e.preventDefault(); this.showToast('Link MP não configurado. Use Pix.', 'error'); }; }
        } else mpSection.style.display = 'none';
        const stripeSection = document.getElementById('checkout-stripe');
        if (CONFIG.stripeEnabled) {
            stripeSection.style.display = 'flex';
            const stripeLink = items.find(i => i.stripeLink)?.stripeLink;
            if (stripeLink) { stripeSection.href = stripeLink; stripeSection.onclick = null; }
            else { stripeSection.href = '#'; stripeSection.onclick = (e) => { e.preventDefault(); this.showToast('Link Stripe não configurado. Use Pix.', 'error'); }; }
        } else stripeSection.style.display = 'none';
        const whatsappSection = document.getElementById('checkout-whatsapp');
        if (CONFIG.whatsappNumber) {
            whatsappSection.style.display = 'flex';
            const msg = this.generateWhatsAppMessage(items, total);
            whatsappSection.href = 'https://wa.me/' + CONFIG.whatsappNumber + '?text=' + encodeURIComponent(msg);
        } else whatsappSection.style.display = 'none';
        const emailBody = this.generateEmailBody(items, total);
        document.getElementById('checkout-email').href = 'mailto:' + CONFIG.email + '?subject=' + encodeURIComponent('Pedido Daemon Studio - ' + this.customerData.name) + '&body=' + encodeURIComponent(emailBody);
        document.getElementById('checkout-modal').classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    copyPixCode() {
        const code = document.getElementById('pix-payload').textContent;
        navigator.clipboard.writeText(code).then(() => this.showToast('Código Pix copiado!')).catch(() => {
            const ta = document.createElement('textarea'); ta.value = code; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
            this.showToast('Código Pix copiado!');
        });
    }

    generatePixPayload(totalCents, items) {
        if (!CONFIG.pixKey) return '';
        const amount = (totalCents / 100).toFixed(2);
        const merchantName = (CONFIG.pixMerchantName || 'D.T. Shen').substring(0, 25);
        const merchantCity = (CONFIG.pixMerchantCity || 'SAO PAULO').substring(0, 15);
        const payload = [];
        payload.push(this.emvField('00', '01'));
        payload.push(this.emvField('01', '11'));
        const gui = this.emvField('00', 'br.gov.bcb.pix');
        const key = this.emvField('01', CONFIG.pixKey);
        payload.push(this.emvField('26', gui + key));
        payload.push(this.emvField('52', '0000'));
        payload.push(this.emvField('53', '986'));
        payload.push(this.emvField('54', amount));
        payload.push(this.emvField('58', 'BR'));
        payload.push(this.emvField('59', merchantName));
        payload.push(this.emvField('60', merchantCity));
        const reference = this.emvField('05', '***');
        payload.push(this.emvField('62', reference));
        let payloadStr = payload.join('');
        const crc = this.calculateCRC16(payloadStr + '6304');
        payloadStr += '6304' + crc;
        return payloadStr;
    }

    emvField(id, value) { const len = value.length.toString().padStart(2, '0'); return id + len + value; }

    calculateCRC16(str) {
        let crc = 0xFFFF;
        for (let i = 0; i < str.length; i++) {
            crc ^= str.charCodeAt(i) << 8;
            for (let j = 0; j < 8; j++) crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xFFFF : (crc << 1) & 0xFFFF;
        }
        return crc.toString(16).toUpperCase().padStart(4, '0');
    }

    generateWhatsAppMessage(items, total) {
        const itemsList = items.map(i => `• ${i.title} (${i.genre}) - R$ ${(i.price/100).toFixed(2)}`).join('\n');
        const totalFormatted = 'R$ ' + (total/100).toFixed(2).replace('.', ',');
        let msg = `Olá! Quero comprar do Daemon Studio.\n\n*ITENS:*\n${itemsList}\n\n*TOTAL: ${totalFormatted}*\n\n`;
        if (this.customerData.name) msg += `*Cliente:* ${this.customerData.name}\n*Email:* ${this.customerData.email}\n*WhatsApp:* ${this.customerData.whatsapp}\n\n`;
        msg += `Como faço o pagamento?`;
        return msg;
    }

    generateEmailBody(items, total) {
        const itemsList = items.map(i => `- ${i.title} (${i.genre}, ${i.tracks || 0} faixas) - R$ ${(i.price/100).toFixed(2)}`).join('\n');
        const totalFormatted = 'R$ ' + (total/100).toFixed(2).replace('.', ',');
        let body = `Novo pedido!\n\n`;
        if (this.customerData.name) { body += `Cliente: ${this.customerData.name}\nEmail: ${this.customerData.email}\nWhatsApp: ${this.customerData.whatsapp}\n\n`; }
        body += `ITENS:\n${itemsList}\n\nTOTAL: ${totalFormatted}\n\n(Aguardando pagamento para enviar os arquivos)`;
        return body;
    }

    // ===== AUDIO PLAYER =====
    setupAudio() {
        this.audio.addEventListener('timeupdate', () => this.updateProgress());
        this.audio.addEventListener('ended', () => this.onTrackEnd());
        this.audio.addEventListener('loadedmetadata', () => this.updateDuration());
        this.audio.volume = 0.5;
        this.currentPlaylist = [];
        this.currentTrackIndex = 0;
    }

    playItem(id) {
        const item = CATALOG.find(i => i.id === id);
        if (!item || !item.tracksList) return;
        if (this.currentTrack === id && this.isPlaying) { this.pause(); return; }
        if (this.currentTrack === id && !this.isPlaying) { this.play(); return; }
        this.loadPlaylist(item, 0);
        if (!this.audioContextUnlocked) {
            this.audioContextUnlocked = true;
            this.audio.muted = false;
            document.getElementById('vol-btn').textContent = '🔊';
            const banner = document.getElementById('audio-unlock-banner');
            if (banner) banner.style.display = 'none';
        }
        this.play();
    }

    loadPlaylist(item, trackIndex = 0, autoplay = false) {
        this.currentTrack = item.id;
        this.modalItem = item;
        this.currentPlaylist = item.tracksList;
        this.currentTrackIndex = trackIndex;
        const track = item.tracksList[trackIndex];
        this.audio.src = track.file;
        const thumb = document.getElementById('player-thumb');
        thumb.src = item.coverUrl; thumb.dataset.fallbackApplied = '';
        setTimeout(() => { if (thumb.complete && thumb.naturalWidth === 0) this.handleImageError(thumb); }, 100);
        document.getElementById('player-title').textContent = item.title + ' — ' + track.title;
        document.getElementById('player-artist').textContent = 'Faixa ' + track.num + ' de ' + item.tracksList.length + ' • ' + item.genre;
        document.getElementById('player-bar').classList.add('active');
        this.renderPlaylistInModal();
        if (autoplay) this.play();
    }

    renderPlaylistInModal() {
        const container = document.getElementById('modal-playlist');
        if (!container || !this.modalItem || !this.modalItem.tracksList) return;
        container.innerHTML = this.modalItem.tracksList.map((track, idx) => `<div class="playlist-track ${this.currentTrack === this.modalItem.id && this.currentTrackIndex === idx ? 'playing' : ''}" onclick="app.playPlaylistTrack(${idx})"><span class="track-num">${track.num}</span><span class="track-title">${track.title}</span><span class="track-status">${this.currentTrack === this.modalItem.id && this.currentTrackIndex === idx && this.isPlaying ? '⏸' : '▶'}</span></div>`).join('');
    }

    playPlaylistTrack(index) {
        if (!this.modalItem || !this.modalItem.tracksList) return;
        if (this.currentTrack === this.modalItem.id && this.currentTrackIndex === index) { this.togglePlay(); }
        else { this.loadPlaylist(this.modalItem, index, true); }
    }

    onTrackEnd() {
        if (this.shuffleMode && this.allTracks.length > 0) {
            const nextEntry = this.allTracks[Math.floor(Math.random() * this.allTracks.length)];
            this.loadPlaylist(nextEntry.item, nextEntry.trackIndex, true);
            return;
        }
        if (this.currentPlaylist.length > 0 && this.currentTrackIndex < this.currentPlaylist.length - 1) {
            this.currentTrackIndex++;
            const track = this.currentPlaylist[this.currentTrackIndex];
            this.audio.src = track.file;
            const item = CATALOG.find(i => i.id === this.currentTrack);
            document.getElementById('player-title').textContent = item.title + ' — ' + track.title;
            document.getElementById('player-artist').textContent = 'Faixa ' + track.num + ' de ' + this.currentPlaylist.length + ' • ' + item.genre;
            this.play(); this.renderPlaylistInModal();
        } else {
            this.isPlaying = false;
            document.getElementById('play-btn').textContent = '▶';
            this.renderCatalog();
        }
    }

    toggleShuffle() {
        this.shuffleMode = !this.shuffleMode;
        const btn = document.getElementById('shuffle-btn');
        if (btn) btn.classList.toggle('active', this.shuffleMode);
        this.showToast(this.shuffleMode ? '🔀 Shuffle global ativado' : '🔀 Shuffle desativado');
    }

    next() {
        if (this.shuffleMode && this.allTracks.length > 0) {
            const nextEntry = this.allTracks[Math.floor(Math.random() * this.allTracks.length)];
            this.loadPlaylist(nextEntry.item, nextEntry.trackIndex, true);
            return;
        }
        if (this.currentPlaylist.length > 0 && this.currentTrackIndex < this.currentPlaylist.length - 1) {
            this.playPlaylistTrack(this.currentTrackIndex + 1); return;
        }
        const idx = CATALOG.findIndex(i => i.id === this.currentTrack);
        if (idx < CATALOG.length - 1) {
            const nextItem = CATALOG[idx + 1];
            if (nextItem.tracksList && nextItem.tracksList.length > 0) { this.loadPlaylist(nextItem, 0, true); }
        }
    }

    prev() {
        if (this.shuffleMode && this.allTracks.length > 0) {
            const prevEntry = this.allTracks[Math.floor(Math.random() * this.allTracks.length)];
            this.loadPlaylist(prevEntry.item, prevEntry.trackIndex, true);
            return;
        }
        if (this.currentPlaylist.length > 0 && this.currentTrackIndex > 0) {
            this.playPlaylistTrack(this.currentTrackIndex - 1);
        } else {
            const idx = CATALOG.findIndex(i => i.id === this.currentTrack);
            if (idx > 0) {
                const prevItem = CATALOG[idx - 1];
                if (prevItem.tracksList && prevItem.tracksList.length > 0) { this.loadPlaylist(prevItem, prevItem.tracksList.length - 1, true); }
            }
        }
    }

    play() {
        this.audio.play().then(() => {
            this.isPlaying = true;
            document.getElementById('play-btn').textContent = '⏸';
            this.renderCatalog(); this.renderPlaylistInModal();
            if (this.modalItem) document.getElementById('modal-play-icon').textContent = '⏸';
        }).catch(() => { this.isPlaying = false; document.getElementById('play-btn').textContent = '▶'; });
    }

    pause() {
        this.audio.pause();
        this.isPlaying = false;
        document.getElementById('play-btn').textContent = '▶';
        this.renderCatalog(); this.renderPlaylistInModal();
        if (this.modalItem) document.getElementById('modal-play-icon').textContent = '▶';
    }

    togglePlay() { if (this.isPlaying) this.pause(); else if (this.currentTrack) this.play(); }
    toggleModalPlay() { if (!this.modalItem) return; this.playItem(this.modalItem.id); }

    updateProgress() {
        const pct = (this.audio.currentTime / this.audio.duration) * 100;
        document.getElementById('progress-fill').style.width = (pct || 0) + '%';
        document.getElementById('time-current').textContent = this.formatTime(this.audio.currentTime);
    }
    updateDuration() { document.getElementById('time-total').textContent = this.formatTime(this.audio.duration || 0); }
    seek(e) {
        const rect = e.currentTarget.getBoundingClientRect();
        const pct = (e.clientX - rect.left) / rect.width;
        this.audio.currentTime = pct * this.audio.duration;
    }
    setVolume(v) { this.audio.volume = v / 100; }
    toggleMute() { this.audio.muted = !this.audio.muted; document.getElementById('vol-btn').textContent = this.audio.muted ? '🔇' : '🔊'; }
    closePlayer() { this.pause(); this.currentTrack = null; document.getElementById('player-bar').classList.remove('active'); }
    formatTime(s) { if (!s || isNaN(s)) return '0:00'; const m = Math.floor(s / 60); const sec = Math.floor(s % 60); return m + ':' + sec.toString().padStart(2, '0'); }

    // ===== CARRINHO =====
    addToCart(id) {
        const item = CATALOG.find(i => i.id === id);
        if (!item || this.cart.some(c => c.id === id)) return;
        this.cart.push(item);
        this.updateCartUI(); this.renderCatalog();
        this.showToast('"' + item.title + '" adicionado ao carrinho');
    }
    removeFromCart(id) { this.cart = this.cart.filter(c => c.id !== id); this.updateCartUI(); this.renderCatalog(); }
    updateCartUI() {
        const count = document.getElementById('cart-count');
        const items = document.getElementById('cart-items');
        const total = document.getElementById('cart-total');
        count.textContent = this.cart.length;
        count.style.display = this.cart.length > 0 ? 'flex' : 'none';
        if (this.cart.length === 0) {
            items.innerHTML = '<div class="cart-empty"><div style="font-size:2.5rem;margin-bottom:0.5rem;">🛒</div><p>Seu carrinho está vazio</p></div>';
            total.textContent = 'R$ 0,00';
        } else {
            items.innerHTML = this.cart.map(item => `<div class="cart-item"><img src="${item.coverUrl}" alt="${item.title}" onerror="app.handleImageError(this)"><div class="cart-item-info"><div class="cart-item-title">${item.title}</div><div class="cart-item-meta">${item.genre} • ${item.tracks} faixas</div></div><div class="cart-item-price">R$ ${(item.price/100).toFixed(2).replace('.', ',')}</div><button class="cart-item-remove" onclick="app.removeFromCart(${item.id})">×</button></div>`).join('');
            total.textContent = 'R$ ' + (this.cart.reduce((a, b) => a + b.price, 0) / 100).toFixed(2).replace('.', ',');
        }
    }
    toggleCart() {
        const modal = document.getElementById('cart-modal');
        modal.classList.toggle('active');
        document.body.style.overflow = modal.classList.contains('active') ? 'hidden' : '';
    }

    showToast(msg, type = 'success') {
        const toast = document.getElementById('toast');
        toast.textContent = msg;
        toast.className = 'toast ' + type;
        requestAnimationFrame(() => toast.classList.add('active'));
        setTimeout(() => toast.classList.remove('active'), 3000);
    }

    scrollTo(id) { document.getElementById(id).scrollIntoView({ behavior: 'smooth' }); }

    setupEvents() {
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active'));
                document.body.style.overflow = '';
                document.getElementById('cinema-iframe').src = '';
                document.getElementById('cinema-iframe').style.display = 'none';
                document.getElementById('cinema-placeholder').style.display = 'flex';
            }
        });
        window.addEventListener('scroll', () => {
            const nav = document.getElementById('navbar');
            nav.style.background = window.scrollY > 50 ? 'rgba(8, 8, 10, 0.95)' : 'rgba(8, 8, 10, 0.85)';
        });
    }
}

const app = new DaemonStore();
