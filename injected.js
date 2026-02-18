(function () {
    const TARGET_URL_PART = 'assertions-corrections';
    const GRAPHQL_URL_PART = 'graphql';

    // Store correct IDs (decoded and reversed)
    let correctAssertionIds = new Set();

    // Store ALL GraphQL question data indexed by assertion id for later lookup
    // Map<assertionId (string), { text: string, position: number }>
    let assertionDataMap = new Map();

    // ── Process assertions-corrections response ──
    function processAssertions(data) {
        if (!data || !Array.isArray(data)) return;

        console.log('[Descomplica Extension] Processing assertions...', data);

        const correctAssertions = data.filter(item => item.correct);

        correctAssertions.forEach(item => {
            try {
                const decoded = atob(item.id);
                const reversed = decoded.split('').reverse().join('');
                if (reversed) {
                    correctAssertionIds.add(reversed);
                }
            } catch (e) {
                console.error('[Descomplica Extension] Error decoding ID:', item.id, e);
            }
        });

        console.log('[Descomplica Extension] Stored Correct IDs:', Array.from(correctAssertionIds));
        updateBadge();
    }

    // ── Store GraphQL question data (no DOM check here) ──
    function processGraphQL(data) {
        if (!data || !data.data || !data.data.questionById) return;

        const questionData = data.data.questionById;
        const assertions = questionData.assertionsByQuestionIdList;

        if (!assertions || !Array.isArray(assertions)) return;

        console.log('[Descomplica Extension] Storing GraphQL question data...');

        for (let assertion of assertions) {
            const assertionId = String(assertion.id);

            if (assertion.contentsByAssertionIdList && assertion.contentsByAssertionIdList.length > 0) {
                const content = assertion.contentsByAssertionIdList[0];
                if (content.textByTextId && content.textByTextId.body) {
                    assertionDataMap.set(assertionId, {
                        text: content.textByTextId.body,
                        position: assertion.position
                    });
                }
            }
        }

        console.log(`[Descomplica Extension] Total stored assertions: ${assertionDataMap.size}`);
        console.log(`[Descomplica Extension] Stored assertions: ${assertionDataMap}`);
        updateBadge();
    }

    // ── Helpers ──
    const stripHtml = (html) => {
        let tmp = document.createElement('DIV');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    };

    // Collapse all whitespace, strip invisible unicode, and NFC-normalize
    const normalize = (str) => str
        .normalize('NFC')
        .replace(/[\u00a0\u200b\u200c\u200d\u2060\ufeff]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    // ── On-demand detection: scan current DOM ──
    function detectOnPage() {
        const alternatives = document.querySelectorAll('.question__alternative');
        if (alternatives.length === 0) {
            showToast('Nenhuma alternativa encontrada na página atual.', 'warn');
            console.log('[Descomplica Extension] No .question__alternative elements found on current view.');
            return;
        }

        console.log(`[Descomplica Extension] Detect: ${alternatives.length} alternatives on page, ${correctAssertionIds.size} correct IDs stored, ${assertionDataMap.size} assertion texts stored.`);

        // Clear previous highlights
        alternatives.forEach(alt => {
            alt.style.removeProperty('border');
            alt.style.removeProperty('background-color');
            alt.style.removeProperty('box-shadow');
        });

        let found = false;

        for (let [assertionId, info] of assertionDataMap.entries()) {
            if (!correctAssertionIds.has(assertionId)) continue;

            const targetText = normalize(stripHtml(info.text));
            if (!targetText) continue;

            for (let alt of alternatives) {
                const altText = normalize(alt.innerText);

                // Debug: find first difference
                if (altText.length > 10 && targetText.length > 10 && altText.substring(0, 10) === targetText.substring(0, 10)) {
                    for (let i = 0; i < Math.max(altText.length, targetText.length); i++) {
                        if (altText[i] !== targetText[i]) {
                            console.log(`[Descomplica Extension] DIFF at pos ${i}: alt='${altText[i]}' (${altText.charCodeAt(i)}) vs target='${targetText[i]}' (${targetText.charCodeAt(i)})`);
                            console.log(`[Descomplica Extension] Context: alt[...${altText.substring(Math.max(0, i - 5), i + 5)}...] target[...${targetText.substring(Math.max(0, i - 5), i + 5)}...]`);
                            break;
                        }
                    }
                }

                if (altText.includes(targetText) || targetText.includes(altText)) {
                    console.log('%c[Descomplica Extension] ✔ CORRECT ANSWER:', 'color: #00e676; font-size: 16px; font-weight: bold;', altText);
                    alt.style.border = '3px solid #00e676';
                    alt.style.backgroundColor = 'rgba(0, 230, 118, 0.12)';
                    alt.style.boxShadow = '0 0 12px rgba(0, 230, 118, 0.3)';
                    showToast('Resposta correta encontrada!', 'success');
                    found = true;
                }
            }
        }

        if (!found) {
            showToast('Nenhuma correspondência encontrada na tela atual.', 'info');
            console.log('[Descomplica Extension] No match found on current view.');
        }
    }

    // ── Floating UI ──
    function updateBadge() {
        const badge = document.getElementById('dsc-ext-badge');
        if (badge) {
            badge.textContent = correctAssertionIds.size;
            badge.style.display = correctAssertionIds.size > 0 ? 'flex' : 'none';
        }
    }

    function showToast(message, type) {
        const existing = document.getElementById('dsc-ext-toast');
        if (existing) existing.remove();

        const colors = {
            success: 'linear-gradient(135deg, #00e676, #00c853)',
            warn: 'linear-gradient(135deg, #ffa726, #ff9100)',
            info: 'linear-gradient(135deg, #42a5f5, #1e88e5)'
        };

        const toast = document.createElement('div');
        toast.id = 'dsc-ext-toast';
        toast.textContent = message;
        Object.assign(toast.style, {
            position: 'fixed',
            bottom: '80px',
            right: '20px',
            zIndex: '2147483647',
            background: colors[type] || colors.info,
            color: '#fff',
            padding: '12px 20px',
            borderRadius: '10px',
            fontSize: '14px',
            fontFamily: "'Segoe UI', Arial, sans-serif",
            fontWeight: '600',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            opacity: '0',
            transform: 'translateY(10px)',
            transition: 'all 0.3s ease'
        });

        document.body.appendChild(toast);
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        });

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    function createUI() {
        const container = document.createElement('div');
        container.id = 'dsc-ext-container';
        Object.assign(container.style, {
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            zIndex: '2147483646',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: '8px',
            fontFamily: "'Segoe UI', Arial, sans-serif"
        });

        // Main button
        const btn = document.createElement('button');
        btn.id = 'dsc-ext-btn';
        btn.innerHTML = '🔍';
        Object.assign(btn.style, {
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            border: 'none',
            background: 'linear-gradient(135deg, #7c4dff, #536dfe)',
            color: '#fff',
            fontSize: '22px',
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(124, 77, 255, 0.4)',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative'
        });

        btn.addEventListener('mouseenter', () => {
            btn.style.transform = 'scale(1.1)';
            btn.style.boxShadow = '0 6px 24px rgba(124, 77, 255, 0.6)';
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'scale(1)';
            btn.style.boxShadow = '0 4px 16px rgba(124, 77, 255, 0.4)';
        });
        btn.addEventListener('click', () => {
            detectOnPage();
        });

        // Badge (count of stored correct IDs)
        const badge = document.createElement('span');
        badge.id = 'dsc-ext-badge';
        Object.assign(badge.style, {
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            background: '#ff1744',
            color: '#fff',
            fontSize: '11px',
            fontWeight: '700',
            display: 'none',
            alignItems: 'center',
            justifyContent: 'center'
        });
        badge.textContent = '0';
        btn.appendChild(badge);

        // Status label
        const label = document.createElement('span');
        label.id = 'dsc-ext-label';
        label.textContent = 'Detectar Resposta';
        Object.assign(label.style, {
            background: 'rgba(0,0,0,0.75)',
            color: '#fff',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '11px',
            opacity: '0',
            transition: 'opacity 0.2s ease',
            pointerEvents: 'none'
        });

        btn.addEventListener('mouseenter', () => { label.style.opacity = '1'; });
        btn.addEventListener('mouseleave', () => { label.style.opacity = '0'; });

        container.appendChild(label);
        container.appendChild(btn);
        document.body.appendChild(container);
    }

    // Wait for body to be available
    function initUI() {
        if (document.body) {
            createUI();
        } else {
            const observer = new MutationObserver(() => {
                if (document.body) {
                    observer.disconnect();
                    createUI();
                }
            });
            observer.observe(document.documentElement, { childList: true });
        }
    }

    // ── Intercept Fetch API ──
    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
        const response = await originalFetch.apply(this, args);
        const url = args[0] instanceof Request ? args[0].url : args[0];

        if (url) {
            if (url.includes(TARGET_URL_PART)) {
                const clone = response.clone();
                clone.json().then(json => {
                    if (json && json.data) processAssertions(json.data);
                }).catch(err => console.error('[Descomplica Extension] Error (fetch assertions):', err));
            } else if (url.includes(GRAPHQL_URL_PART)) {
                const clone = response.clone();
                clone.json().then(json => {
                    processGraphQL(json);
                }).catch(err => console.error('[Descomplica Extension] Error (fetch graphql):', err));
            }
        }

        return response;
    };

    // ── Intercept XMLHttpRequest ──
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method, url) {
        this._url = url;
        return originalOpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function (body) {
        this.addEventListener('load', function () {
            if (this._url) {
                if (this._url.includes(TARGET_URL_PART)) {
                    try {
                        const json = JSON.parse(this.responseText);
                        if (json && json.data) processAssertions(json.data);
                    } catch (err) {
                        console.error('[Descomplica Extension] Error (XHR assertions):', err);
                    }
                } else if (this._url.includes(GRAPHQL_URL_PART)) {
                    try {
                        const json = JSON.parse(this.responseText);
                        processGraphQL(json);
                    } catch (err) {
                        console.error('[Descomplica Extension] Error (XHR graphql):', err);
                    }
                }
            }
        });
        return originalSend.apply(this, arguments);
    };

    // ── Init ──
    initUI();
    console.log('[Descomplica Extension] Interceptor active.');
})();

