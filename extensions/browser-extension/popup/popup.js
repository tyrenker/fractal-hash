/**
 * Popup script for Fractal-Hash browser extension.
 *
 * Uses the bundled FractalHash library (lib/fractal-hash.min.js) to render
 * a fractal representing the current page's hostname / TLS certificate.
 *
 * Build first: run `./build.sh` from the extensions/browser-extension/ directory.
 */

/* global FractalHash, chrome */

const img          = document.getElementById('fractal-img');
const loading      = document.getElementById('loading');
const hostnameEl   = document.getElementById('hostname');
const fingerprintEl = document.getElementById('fingerprint');
const noHttpsEl    = document.getElementById('no-https');

async function render(input) {
  // FractalHash is the IIFE global exported by lib/fractal-hash.min.js
  const dataUrl = await FractalHash.fractalHash(input, {
    size: 128,
    format: 'canvas',
    background: 'dark',
  });
  loading.style.display = 'none';
  img.src = dataUrl;
  img.style.display = 'block';
}

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url) return;

  let hostname;
  try {
    const url = new URL(tab.url);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      loading.style.display = 'none';
      noHttpsEl.style.display = 'block';
      return;
    }
    hostname = url.hostname;
  } catch {
    loading.style.display = 'none';
    noHttpsEl.style.display = 'block';
    return;
  }

  hostnameEl.textContent = hostname;
  fingerprintEl.textContent = hostname;
  fingerprintEl.title = hostname;

  await render(hostname);
}

// Load the bundled library then initialise
const script = document.createElement('script');
script.src = '../lib/fractal-hash.min.js';
script.onload = () => init().catch(console.error);
script.onerror = () => {
  loading.style.display = 'none';
  noHttpsEl.textContent = 'Build error: run ./build.sh first.';
  noHttpsEl.style.display = 'block';
};
document.head.appendChild(script);
