"use strict";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function header() {
    return ` <div class="titleName">'Learn WebGPU Fundamentals' Tutorial Code </div>
  <div class="subtitle">Follow along the <a href="https://webgpufundamentals.org/">WebGPU Fundamentals</a> articles</div>`;
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function guiContainer() {
    return '<div id="guiContainer"></div>';
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function navigationButtons() {
    let baseURL = '';
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        baseURL = ''; // Set the base URL to empty string for localhost
    }
    else {
        baseURL = 'https://www.craftlinks.art';
    }
    return `<a href = "${baseURL}/pages/fundamentals-uniforms.html" class="button">Fundamentals - Uniforms </a>
  <a href = "${baseURL}/pages/fundamentals-storage_buffers.html" class="button">Fundamentals - Storage Buffers </a>`;
}
