chrome.runtime.onInstalled.addListener(async () => {
    // Configura V2 por padrão caso não tenha nada no Local Storage
    const data = await chrome.storage.local.get('version');
    const version = data.version || 'v2';

    if (!data.version) {
        await chrome.storage.local.set({ version });
    }

    updateContentScripts(version);
});

// Fica escutando as mudanças causadas quando o usuário clica no menu (popup)
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.version) {
        updateContentScripts(changes.version.newValue);
    }
});

async function updateContentScripts(version) {
    // Limpa todas os scipts correntes de interceptação registradas antes
    try {
        const scripts = await chrome.scripting.getRegisteredContentScripts();
        const ids = scripts.map(s => s.id);
        if (ids.length > 0) {
            await chrome.scripting.unregisterContentScripts({ ids });
        }
    } catch (e) {
        console.error("Erro ao apagar scripts:", e);
    }

    // Registra V1 - Roda em modo ISOLATED e escuta API Network (DOM Lifecycle Inicial)
    if (version === 'v1') {
        try {
            await chrome.scripting.registerContentScripts([{
                id: "v1-scripts",
                matches: ["*://aulas.descomplica.com.br/*"],
                js: ["v1/content.js"],
                runAt: "document_start",
                world: "ISOLATED"
            }]);
            console.log("V1 (Network Request Interceptor) Aplicado");
        } catch (e) { console.error('Erro ao injetar V1:', e); }

        // Registra V2 - Roda no MAIN Object Context com Mutation Observer & Vue Factory (DOM Lifecycle Final)
    } else if (version === 'v2') {
        try {
            await chrome.scripting.registerContentScripts([{
                id: "v2-scripts",
                matches: ["*://aulas.descomplica.com.br/*"],
                js: [
                    "v2/enums/StrategyType.js",
                    "v2/strategies/QuestionStrategy.js",
                    "v2/strategies/RevisionQuestionStrategy.js",
                    "v2/strategies/ObjectiveTriviaStrategy.js",
                    "v2/strategies/ClozeQuestionStrategy.js",
                    "v2/factories/StrategyFactory.js",
                    "v2/content.js"
                ],
                css: ["v2/styles.css"],
                runAt: "document_end",
                world: "MAIN"
            },
            {
                id: "v2-bridge",
                matches: ["*://aulas.descomplica.com.br/*"],
                js: ["v2/isolated_bridge.js"],
                runAt: "document_start",
                world: "ISOLATED"
            }]);
            console.log("V2 (Vue Strategy Monkey Patch) Aplicado");
        } catch (e) { console.error('Erro ao injetar V2:', e); }
    }

    // Se "off", nós simplismente não registramos nenhum script (apenas deixamos desregistrado e limpo em memória).
}
