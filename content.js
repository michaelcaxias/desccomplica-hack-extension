const script = document.createElement('script');
script.src = chrome.runtime.getURL('injected.js');
(document.head || document.documentElement).appendChild(script);
console.log('[Descomplica Extension] Injected script loaded.');
