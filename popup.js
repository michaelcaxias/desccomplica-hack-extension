document.addEventListener('DOMContentLoaded', async () => {
    const radioButtons = document.querySelectorAll('input[name="engine"]');
    const warning = document.getElementById('reload-warning');

    // Recupera configurações correntes gravadas na memótia local (Service Worker)
    const { version } = await chrome.storage.local.get('version');

    // Marca o rádio correspondente (por default, nossa V2)
    const selectedRadio = document.getElementById(version || 'v2');
    if (selectedRadio) {
        selectedRadio.checked = true;
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
});
