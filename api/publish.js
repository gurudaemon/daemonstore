/* API serverless — publica alterações do admin no GitHub.
   O token fica apenas no servidor (variável de ambiente GH_TOKEN da Vercel). */
const REPO_OWNER = 'gurudaemon';
const REPO_NAME = 'daemonstore';
const BRANCH = 'main';
const ADMIN_EMAIL = 'daemonprod5@gmail.com';
const ADMIN_PASS_SHA256 = 'cab5ad19ed6709094cc78475e24497ec86e878c8a455d9dab6eb17429982a69c';

const crypto = require('crypto');

function json(res, status, body) {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(body));
}

const ghHeaders = () => ({
    'Authorization': 'Bearer ' + process.env.GH_TOKEN,
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'daemonstore-admin'
});

async function ghGetSha(path) {
    const r = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}?ref=${BRANCH}`, { headers: ghHeaders() });
    if (r.status === 404) return null;
    if (!r.ok) throw new Error('GitHub GET ' + path + ' → ' + r.status);
    return (await r.json()).sha;
}

async function ghPutFile(path, contentB64, message) {
    const sha = await ghGetSha(path);
    const body = { message, content: contentB64, branch: BRANCH };
    if (sha) body.sha = sha;
    const r = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`, {
        method: 'PUT', headers: { ...ghHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    if (!r.ok) {
        const detail = r.status === 403 ? 'token sem permissão de escrita' : r.status === 401 ? 'token inválido' : 'erro';
        throw new Error('GitHub PUT ' + path + ' → ' + r.status + ' (' + detail + ')');
    }
}

module.exports = async (req, res) => {
    if (req.method !== 'POST') return json(res, 405, { error: 'Método não permitido' });

    let body = '';
    req.on('data', c => { body += c; if (body.length > 60 * 1024 * 1024) req.destroy(); });
    req.on('end', async () => {
        try {
            const data = JSON.parse(body);
            const email = String(data.email || '').trim().toLowerCase();
            const pass = String(data.pass || '');
            if (email !== ADMIN_EMAIL) return json(res, 401, { error: 'Credenciais inválidas' });
            const hash = crypto.createHash('sha256').update(pass).digest('hex');
            // aceita senha em texto (hasheia aqui) ou hash direto
            if (hash !== ADMIN_PASS_SHA256 && pass !== ADMIN_PASS_SHA256) return json(res, 401, { error: 'Credenciais inválidas' });

            if (!process.env.GH_TOKEN) return json(res, 500, { error: 'Servidor sem GH_TOKEN configurado' });

            const files = Array.isArray(data.files) ? data.files : [];
            if (files.length === 0) return json(res, 400, { error: 'Nenhum arquivo para publicar' });
            for (const f of files) {
                if (!/^[\w.\-\/]+$/.test(f.path) || f.path.includes('..')) return json(res, 400, { error: 'Caminho inválido: ' + f.path });
            }

            const results = [];
            for (const f of files) {
                try {
                    await ghPutFile(f.path, f.content, f.message || ('admin: atualiza ' + f.path));
                    results.push({ path: f.path, ok: true });
                } catch (e) {
                    results.push({ path: f.path, ok: false, error: e.message });
                }
            }
            const allOk = results.every(r => r.ok);
            return json(res, allOk ? 200 : 207, { ok: allOk, results });
        } catch (e) {
            return json(res, 500, { error: e.message });
        }
    });
};