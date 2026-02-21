document.addEventListener('DOMContentLoaded', async () => {
    const radioButtons = document.querySelectorAll('input[name="engine"]');
    const autoConfirmBox = document.getElementById('auto-confirm');
    const warning = document.getElementById('reload-warning');

    // Recupera configurações correntes gravadas na memótia local (Service Worker)
    const { version, autoConfirm } = await chrome.storage.local.get(['version', 'autoConfirm']);

    // Marca o rádio correspondente (por default, nossa V2)
    const selectedRadio = document.getElementById(version || 'v2');
    if (selectedRadio) {
        selectedRadio.checked = true;
    }

    // Marca o checkbox Auto-Confirmar se previamente gravado
    if (autoConfirm) {
        autoConfirmBox.checked = true;
    }

    // Escuta a ação em todos input radios listados para mudar contexto
    for (const radio of radioButtons) {
        radio.addEventListener('change', async (e) => {
            const newVersion = e.target.value;
            // Só avisa a Service Worker para injetar outro bloco na página principal
            await chrome.storage.local.set({ version: newVersion });

            // Exibe mensagem simpática exigindo o F5 do browser do usuário
            warning.style.display = 'block';
        });
    }

    // Escuta a ação expecífica de Auto-Confirm do checkbox da V2
    if (autoConfirmBox) {
        autoConfirmBox.addEventListener('change', async (e) => {
            await chrome.storage.local.set({ autoConfirm: e.target.checked });
            warning.style.display = 'block';
        });
    }
});
