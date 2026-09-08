(() => {
  const KEY = 'oab-aprova-gemini-api-key-v1';
  const MODEL = 'gemini-3.5-flash';
  const API = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

  const clean = (v, max = 12000) => String(v ?? '').trim().slice(0, max);
  const apiKey = () => sessionStorage.getItem(KEY) || '';

  function isConnected() {
    return Boolean(apiKey());
  }

  function disconnect() {
    sessionStorage.removeItem(KEY);
    window.dispatchEvent(new CustomEvent('oab-gemini-status', { detail: { connected: false } }));
  }

  function modal() {
    let root = document.getElementById('oabGeminiModal');
    if (root) return root;
    root = document.createElement('div');
    root.id = 'oabGeminiModal';
    root.style.cssText = 'position:fixed;inset:0;background:#091522a8;z-index:99999;display:none;align-items:center;justify-content:center;padding:20px';
    root.innerHTML = `
      <div style="width:min(520px,100%);background:#fffdf8;border-radius:20px;padding:22px;border:1px solid #ded5c3;box-shadow:0 24px 80px #0004;font-family:Inter,system-ui,sans-serif;color:#162033">
        <div style="font-size:11px;font-weight:900;letter-spacing:.08em;color:#6b7786;text-transform:uppercase">Professor IA • sua própria conta</div>
        <h2 style="margin:7px 0 8px;font-size:22px">Conectar Gemini</h2>
        <p style="font-size:13px;line-height:1.5;color:#596779;margin:0 0 14px">Cole uma chave da Gemini API criada no Google AI Studio. Ela fica somente nesta aba do navegador (sessionStorage), não é gravada no banco do OAB APROVA.</p>
        <input id="oabGeminiKeyInput" type="password" autocomplete="off" placeholder="Cole sua GEMINI_API_KEY" style="width:100%;border:1px solid #d8ccb5;border-radius:12px;padding:12px;font:inherit;outline:none">
        <div id="oabGeminiModalError" style="min-height:18px;color:#9b3d37;font-size:12px;margin-top:7px"></div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px;flex-wrap:wrap">
          <button type="button" data-gemini-cancel style="border:1px solid #d8ccb5;background:#fff;border-radius:11px;padding:10px 13px;font-weight:800;cursor:pointer">Cancelar</button>
          <button type="button" data-gemini-connect style="border:0;background:#17324d;color:#fff;border-radius:11px;padding:10px 13px;font-weight:800;cursor:pointer">Conectar</button>
        </div>
      </div>`;
    document.body.appendChild(root);
    return root;
  }

  function connect() {
    return new Promise((resolve) => {
      const root = modal();
      const input = root.querySelector('#oabGeminiKeyInput');
      const error = root.querySelector('#oabGeminiModalError');
      root.style.display = 'flex';
      input.value = '';
      error.textContent = '';
      setTimeout(() => input.focus(), 20);

      const finish = (value) => {
        root.style.display = 'none';
        root.querySelector('[data-gemini-connect]').onclick = null;
        root.querySelector('[data-gemini-cancel]').onclick = null;
        resolve(value);
      };

      root.querySelector('[data-gemini-cancel]').onclick = () => finish(false);
      root.querySelector('[data-gemini-connect]').onclick = async () => {
        const key = input.value.trim();
        if (key.length < 20) {
          error.textContent = 'Chave inválida ou incompleta.';
          return;
        }
        sessionStorage.setItem(KEY, key);
        try {
          await generate({
            system: 'Responda somente OK.',
            prompt: 'Teste de conexão. Responda somente OK.',
            maxOutputTokens: 16
          });
          window.dispatchEvent(new CustomEvent('oab-gemini-status', { detail: { connected: true } }));
          finish(true);
        } catch (err) {
          sessionStorage.removeItem(KEY);
          error.textContent = err?.message || 'Não foi possível validar a chave.';
        }
      };
    });
  }

  async function generate({ system = '', prompt = '', json = false, maxOutputTokens = 1800, temperature = 0.15 } = {}) {
    const key = apiKey();
    if (!key) throw new Error('Gemini não conectado.');
    const body = {
      contents: [{ role: 'user', parts: [{ text: clean(prompt) }] }],
      generationConfig: {
        temperature,
        maxOutputTokens,
        ...(json ? { responseMimeType: 'application/json' } : {})
      }
    };
    if (clean(system)) body.system_instruction = { parts: [{ text: clean(system, 8000) }] };

    const response = await fetch(API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': key
      },
      body: JSON.stringify(body)
    });

    let data = null;
    try { data = await response.json(); } catch { data = null; }
    if (!response.ok) {
      const message = data?.error?.message || `Gemini respondeu HTTP ${response.status}.`;
      if (response.status === 400 || response.status === 401 || response.status === 403) disconnect();
      throw new Error(message);
    }

    const text = (data?.candidates || [])
      .flatMap(c => c?.content?.parts || [])
      .map(p => p?.text || '')
      .join('')
      .trim();
    if (!text) throw new Error('Gemini não retornou conteúdo.');
    return text;
  }

  window.OABGemini = { MODEL, isConnected, connect, disconnect, generate };
})();
