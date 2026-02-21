// Este script roda em ISOLATED mode e atua como ponte de memória.
// O content.js principal da V2 roda em MAIN mode (no contexto da página para alcançar o Vue), e portanto, não tem acesso à API chrome.storage.
// Ele resolve isso gravando um dataset invisível na tag base do HTML.

chrome.storage.local.get('autoConfirm', (data) => {
    document.documentElement.dataset.descoAutoConfirm = data.autoConfirm === true ? 'true' : 'false';
});

chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.autoConfirm) {
        document.documentElement.dataset.descoAutoConfirm = changes.autoConfirm.newValue === true ? 'true' : 'false';
    }
});
