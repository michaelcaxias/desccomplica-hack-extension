(function () {
    const TARGET_URL_PART = 'assertions-corrections';
    const GRAPHQL_URL_PART = 'graphql';

    // Store correct IDs (decoded and reversed)
    let correctAssertionIds = new Set();

    // Store ALL GraphQL question data indexed by assertion id for later lookup
    // Map<assertionId (string), { text: string, position: number }>
    let assertionDataMap = new Map();

    // Store assertions grouped by question for position-based matching
    // Array of { assertions: [{ id: string, position: number, text: string }] }
    let questionGroups = [];

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

    // ── Helper: extract assertion contents from either format ──
    function getAssertionContents(assertion) {
        // Format 1: assertionsByQuestionIdList → contentsByAssertionIdList (array)
        if (assertion.contentsByAssertionIdList && assertion.contentsByAssertionIdList.length > 0) {
            return assertion.contentsByAssertionIdList;
        }
        // Format 2: assertionsByQuestionId.nodes → contentsByAssertionId.nodes
        if (assertion.contentsByAssertionId && assertion.contentsByAssertionId.nodes && assertion.contentsByAssertionId.nodes.length > 0) {
            return assertion.contentsByAssertionId.nodes;
        }
        return [];
    }

    // ── Helper: extract question text from either format ──
    function getQuestionText(questionData) {
        // Format 1: contentsByQuestionIdList (array)
        if (questionData.contentsByQuestionIdList && questionData.contentsByQuestionIdList.length > 0) {
            const qContent = questionData.contentsByQuestionIdList[0];
            if (qContent.textByTextId && qContent.textByTextId.body) return qContent.textByTextId.body;
        }
        // Format 2: contentsByQuestionId.nodes
        if (questionData.contentsByQuestionId && questionData.contentsByQuestionId.nodes && questionData.contentsByQuestionId.nodes.length > 0) {
            const qContent = questionData.contentsByQuestionId.nodes[0];
            if (qContent.textByTextId && qContent.textByTextId.body) return qContent.textByTextId.body;
        }
        return '';
    }

    // ── Helper: extract assertions array from either format ──
    function getAssertions(questionData) {
        // Format 1: assertionsByQuestionIdList (array)
        if (questionData.assertionsByQuestionIdList && Array.isArray(questionData.assertionsByQuestionIdList)) {
            return questionData.assertionsByQuestionIdList;
        }
        // Format 2: assertionsByQuestionId.nodes
        if (questionData.assertionsByQuestionId && questionData.assertionsByQuestionId.nodes && Array.isArray(questionData.assertionsByQuestionId.nodes)) {
            return questionData.assertionsByQuestionId.nodes;
        }
        return [];
    }

    // ── Store a single question's data ──
    function storeQuestion(questionData) {
        const assertions = getAssertions(questionData);
        if (assertions.length === 0) return;

        const questionText = getQuestionText(questionData);
        const group = { assertions: [], questionText: questionText };

        for (let assertion of assertions) {
            const assertionId = String(assertion.id);
            let text = '';

            const contents = getAssertionContents(assertion);
            if (contents.length > 0) {
                const content = contents[0];
                if (content.textByTextId && content.textByTextId.body) {
                    text = content.textByTextId.body;
                    assertionDataMap.set(assertionId, {
                        text: text,
                        position: assertion.position
                    });
                }
            }

            group.assertions.push({
                id: assertionId,
                position: assertion.position,
                text: text
            });
        }

        group.assertions.sort((a, b) => a.position - b.position);
        questionGroups.push(group);
    }

    // ── Store GraphQL question data (no DOM check here) ──
    function processGraphQL(data) {
        if (!data || !data.data) return;

        let questionsProcessed = 0;

        // Format 1: Single question — data.questionById
        if (data.data.questionById) {
            storeQuestion(data.data.questionById);
            questionsProcessed++;
        }

        // Format 2: Review list — data.allLists.nodes[].listItemsByListId.nodes[].questionByQuestionId
        if (data.data.allLists && data.data.allLists.nodes) {
            for (let list of data.data.allLists.nodes) {
                if (!list.listItemsByListId || !list.listItemsByListId.nodes) continue;
                for (let listItem of list.listItemsByListId.nodes) {
                    if (listItem.questionByQuestionId) {
                        storeQuestion(listItem.questionByQuestionId);
                        questionsProcessed++;
                    }
                }
            }
        }

        if (questionsProcessed > 0) {
            console.log(`[Descomplica Extension] Processed ${questionsProcessed} questions. Total assertions: ${assertionDataMap.size}, Question groups: ${questionGroups.length}`);
            updateBadge();
        }
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
        const selectors = document.querySelectorAll('select.selector');

        if (alternatives.length === 0 && selectors.length === 0) {
            showToast('Nenhuma alternativa encontrada na página atual.', 'warn');
            console.log('[Descomplica Extension] No .question__alternative or .selector elements found on current view.');
            return;
        }

        console.log(`[Descomplica Extension] Detect: ${alternatives.length} alternatives, ${selectors.length} selects on page, ${correctAssertionIds.size} correct IDs stored, ${assertionDataMap.size} assertion texts stored, ${questionGroups.length} question groups.`);

        let found = false;

        // ── Case 1: .question__alternative elements ──
        if (alternatives.length > 0) {
            // Clear previous highlights
            alternatives.forEach(alt => {
                alt.style.removeProperty('border');
                alt.style.removeProperty('background-color');
                alt.style.removeProperty('box-shadow');
            });

            // Helper: extract words for fuzzy question-text matching
            const extractWords = (str) => {
                const cleaned = str
                    .replace(/\\[a-zA-Z]+(\{[^}]*\})?/g, ' ')
                    .replace(/[{}\\]/g, ' ');
                return (cleaned.match(/[a-zA-ZÀ-ÿ]{3,}/g) || []).map(w => w.toLowerCase());
            };

            const pageText = normalize(document.body.innerText).toLowerCase();

            // Score each group to find the one matching the current page
            let bestGroup = null;
            let bestScore = -1;

            for (let group of questionGroups) {
                if (group.assertions.length !== alternatives.length) continue;

                // Must have at least one correct assertion
                const correctInGroup = group.assertions.filter(a => correctAssertionIds.has(a.id));
                if (correctInGroup.length === 0) continue;

                let score = 0;

                // Score method 1: Count how many assertions text-match an alternative
                let textMatches = 0;
                for (let assertion of group.assertions) {
                    const aText = normalize(stripHtml(assertion.text));
                    if (!aText || aText.length < 2) continue;
                    for (let alt of alternatives) {
                        const altText = normalize(alt.innerText);
                        if (altText.includes(aText) || aText.includes(altText)) {
                            textMatches++;
                            break;
                        }
                    }
                }
                score += textMatches * 10; // Weight text matches heavily

                // Score method 2: Question-text word matching
                if (group.questionText) {
                    const qWords = extractWords(normalize(stripHtml(group.questionText)));
                    if (qWords.length >= 3) {
                        const wordMatches = qWords.filter(w => pageText.includes(w)).length;
                        score += (wordMatches / qWords.length) * 50; // Up to 50 points for question text
                    }
                }

                // Score method 3: Check if assertion IDs are in the DOM
                for (let assertion of group.assertions) {
                    for (let alt of alternatives) {
                        if (alt.outerHTML.includes(assertion.id)) {
                            score += 100; // Very strong signal
                        }
                    }
                }

                console.log(`[Descomplica Extension] Group score: ${score.toFixed(1)} (${textMatches} text matches, question: "${(group.questionText ? normalize(stripHtml(group.questionText)).substring(0, 50) : 'N/A')}...")`);

                if (score > bestScore) {
                    bestScore = score;
                    bestGroup = group;
                }
            }

            if (bestGroup && bestScore > 0) {
                console.log(`[Descomplica Extension] Best group selected with score ${bestScore.toFixed(1)}`);

                const correctInGroup = bestGroup.assertions.filter(a => correctAssertionIds.has(a.id));

                for (let correct of correctInGroup) {
                    // Try text match first (most precise)
                    const targetText = normalize(stripHtml(correct.text));
                    let matched = false;

                    if (targetText) {
                        // Find the BEST matching alternative (highest similarity)
                        let bestAlt = null;
                        let bestSimilarity = 0;

                        for (let alt of alternatives) {
                            const altText = normalize(alt.innerText);
                            if (altText.includes(targetText) || targetText.includes(altText)) {
                                // Score by length similarity (1.0 = exact match)
                                const similarity = Math.min(altText.length, targetText.length) / Math.max(altText.length, targetText.length);
                                if (similarity > bestSimilarity) {
                                    bestSimilarity = similarity;
                                    bestAlt = alt;
                                }
                            }
                        }

                        // Only accept if similarity is high enough (reject bad substring matches)
                        if (bestAlt && bestSimilarity >= 0.4) {
                            console.log(`%c[Descomplica Extension] ✔ CORRECT ANSWER (text match, similarity ${bestSimilarity.toFixed(2)}):`, 'color: #00e676; font-size: 16px; font-weight: bold;', normalize(bestAlt.innerText));
                            bestAlt.style.border = '3px solid #00e676';
                            bestAlt.style.backgroundColor = 'rgba(0, 230, 118, 0.12)';
                            bestAlt.style.boxShadow = '0 0 12px rgba(0, 230, 118, 0.3)';
                            found = true;
                            matched = true;
                            bestAlt.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            bestAlt.click();
                        } else if (bestAlt) {
                            console.log(`[Descomplica Extension] Rejected text match (similarity ${bestSimilarity.toFixed(2)} < 0.4): "${normalize(bestAlt.innerText)}" — falling back to position.`);
                        }
                    }

                    // Fallback to position if text match failed
                    if (!matched) {
                        const idx = correct.position;
                        if (idx >= 0 && idx < alternatives.length) {
                            const alt = alternatives[idx];
                            console.log(`%c[Descomplica Extension] ✔ CORRECT ANSWER (position ${idx}):`, 'color: #00e676; font-size: 16px; font-weight: bold;', alt.innerText.trim().substring(0, 80));
                            alt.style.border = '3px solid #00e676';
                            alt.style.backgroundColor = 'rgba(0, 230, 118, 0.12)';
                            alt.style.boxShadow = '0 0 12px rgba(0, 230, 118, 0.3)';
                            found = true;
                        }
                    }
                }
            }
        }

        // ── Case 2: select.selector elements (ID-based match via option value) ──
        if (selectors.length > 0) {
            // Clear previous highlights on selects
            selectors.forEach(sel => {
                sel.style.removeProperty('border');
                sel.style.removeProperty('background-color');
                sel.style.removeProperty('box-shadow');
            });

            for (let sel of selectors) {
                const options = sel.querySelectorAll('option');
                for (let opt of options) {
                    const optValue = opt.value;
                    if (optValue && correctAssertionIds.has(optValue)) {
                        console.log('%c[Descomplica Extension] ✔ CORRECT SELECT OPTION:', 'color: #00e676; font-size: 16px; font-weight: bold;', `ID: ${optValue} — "${opt.textContent.trim()}"`);
                        // Auto-select the correct option
                        sel.value = optValue;
                        sel.dispatchEvent(new Event('change', { bubbles: true }));
                        // Visual feedback on the select
                        sel.style.border = '3px solid #00e676';
                        sel.style.backgroundColor = 'rgba(0, 230, 118, 0.12)';
                        sel.style.boxShadow = '0 0 12px rgba(0, 230, 118, 0.3)';
                        found = true;
                    }
                }
            }
        }

        if (found) {
            showToast('Resposta(s) correta(s) encontrada(s)!', 'success');
        } else {
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
        if (document.body && window.location.hostname.includes('aulas.descomplica.com.br')) {
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

