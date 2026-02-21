const script = document.createElement('script');
script.src = chrome.runtime.getURL('v1/injected.js');
(document.head || document.documentElement).appendChild(script);
console.log('[Descomplica Extension] Injected V1 script loaded.');
