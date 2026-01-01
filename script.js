// ==UserScript==
// @name         MilkyWayIdle - Fullscreen IDE Chat (摸牛助手)
// @namespace    https://www.milkywayidle.com/
// @version      0.8.0
// @description  IDE layout: left channel list, right content, fixed bottom input, unread highlight. Uses MUI aria-controls to bind tab->tabpanel; reads only that panel; waits for TabPanel_hidden removal.
// @match        https://milkywayidle.com/*
// @match        https://www.milkywayidle.com/*
// @match        https://milkywayidlecn.com/*
// @match        https://www.milkywayidlecn.com/*
// @run-at       document-idle
// @grant        GM_addStyle
// ==/UserScript==

(() => {
  'use strict';

  const CFG = {
    // ids
    overlayId: 'mw-ide-overlay',
    toggleBtnId: 'mw-ide-toggle',
    topbarId: 'mw-ide-topbar',
    layoutId: 'mw-ide-layout',
    sidebarId: 'mw-ide-sidebar',
    chanListId: 'mw-ide-chanlist',
    mainId: 'mw-ide-main',
    bodyId: 'mw-ide-body',
    footerId: 'mw-ide-footer',

    // site selectors (hash classes may change; keep "contains" selectors)
    chatPanelSel: '[class*="GamePage_chatPanel"]',
    tabPanelSel: 'div[class*="TabPanel_tabPanel"]',
    tabHiddenClassPart: 'TabPanel_hidden',
    msgSel: 'div[class*="ChatMessage_chatMessage"]',

    // behavior
    maxLinesPerChannel: 3000,
    autoScroll: true,

    hotkey: { altKey: true, key: 'i' },

    waitPanelVisibleTimeoutMs: 2500,
    waitPollMs: 30,
  };

  GM_addStyle(`
    #${CFG.toggleBtnId}{
      position: fixed; right: 14px; bottom: 14px; z-index: 999999;
      padding: 8px 10px; border-radius: 10px;
      border: 1px solid rgba(255,255,255,.18);
      background: rgba(15,17,26,.95); color: #cfd6e6;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "JetBrains Mono", monospace;
      font-size: 12px; cursor: pointer; user-select: none;
      box-shadow: 0 8px 22px rgba(0,0,0,.35);
    }
    #${CFG.toggleBtnId}:hover{ border-color: rgba(255,255,255,.28); }

    #${CFG.overlayId}{
      position: fixed; inset: 0; z-index: 1000000;
      background: #0f111a; color: #cfd6e6;
      display: none; flex-direction: column;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "JetBrains Mono", monospace;
    }

    /* topbar */
    #${CFG.topbarId}{
      display:flex; align-items:center; gap:10px;
      padding: 10px 12px;
      border-bottom: 1px solid rgba(255,255,255,.10);
      background: #0b0e14;
    }
    #${CFG.topbarId} .title{
      flex:1; font-size: 13px; letter-spacing: .3px; opacity: .95;
      white-space: nowrap; overflow:hidden; text-overflow: ellipsis;
    }
    #${CFG.topbarId} .btn{
      padding: 6px 10px; border-radius: 8px;
      border: 1px solid rgba(255,255,255,.14);
      background: transparent; color: #cfd6e6; font-size: 12px; cursor: pointer;
    }
    #${CFG.topbarId} .btn:hover{ border-color: rgba(255,255,255,.25); }

    /* layout: sidebar + main */
    #${CFG.layoutId}{
      flex: 1;
      display: grid;
      grid-template-columns: 260px 1fr;
      min-height: 0; /* allow children to scroll */
    }

    /* sidebar */
    #${CFG.sidebarId}{
      border-right: 1px solid rgba(255,255,255,.10);
      background: #0b0e14;
      min-height: 0;
      display:flex;
      flex-direction: column;
    }
    #${CFG.sidebarId} .sidebarHeader{
      padding: 10px 12px;
      border-bottom: 1px solid rgba(255,255,255,.08);
      display:flex;
      align-items:center;
      gap:10px;
    }
    #${CFG.sidebarId} .sidebarHeader .label{
      font-size: 12px;
      opacity: .85;
    }
    #${CFG.sidebarId} .sidebarHeader input{
      flex: 1;
      background: rgba(255,255,255,.06);
      border: 1px solid rgba(255,255,255,.10);
      border-radius: 8px;
      padding: 6px 8px;
      color: #cfd6e6;
      outline: none;
      font-size: 12px;
      font-family: inherit;
    }

    #${CFG.chanListId}{
      padding: 8px 6px;
      overflow: auto;
      min-height: 0;
    }

    .mw-chan{
      display:flex;
      align-items:center;
      gap:10px;
      padding: 6px 10px;
      border-radius: 8px;
      cursor: pointer;
      user-select: none;
      opacity: .88;
    }
    .mw-chan:hover{ background: rgba(255,255,255,.06); opacity: 1; }
    .mw-chan.active{
      background: rgba(255,255,255,.10);
      opacity: 1;
      outline: 1px solid rgba(255,255,255,.14);
    }
    .mw-chan .dot{
      width: 8px; height: 8px; border-radius: 999px;
      background: rgba(255,255,255,.25);
      flex: 0 0 auto;
    }
    .mw-chan.unread .dot{ background: rgba(120,200,255,.95); }

    .mw-chan .name{
      flex: 1;
      font-size: 12px;
      overflow:hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .mw-chan .badges{
      display:flex; align-items:center; gap:6px; flex: 0 0 auto;
      font-size: 11px;
      opacity: .9;
    }
    .mw-badge{
      padding: 1px 6px;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,.16);
      background: rgba(255,255,255,.06);
    }
    .mw-badge.unread{
      border-color: rgba(120,200,255,.55);
      background: rgba(120,200,255,.15);
    }

    /* main */
    #${CFG.mainId}{
      display:flex;
      flex-direction: column;
      min-height: 0;
      background: #0f111a;
    }

    #${CFG.bodyId}{
      flex: 1;
      overflow: auto;
      padding: 12px 16px;
      font-size: 12px;
      line-height: 1.55;
      white-space: pre-wrap;
      word-break: break-word;
      min-height: 0;
    }
    .mw-ide-line{ padding: 1px 0; }
    .mw-ide-ts{ opacity: .65; }
    .mw-ide-name{ opacity: .90; }
    .mw-ide-sys{ opacity: .80; }

    /* footer fixed in overlay */
    #${CFG.footerId}{
      border-top: 1px solid rgba(255,255,255,.10);
      background: #0b0e14;
      padding: 10px 12px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    #${CFG.footerId} .hint{
      font-size: 11px;
      opacity: .70;
      white-space: nowrap;
    }
    #${CFG.footerId} .inputHost{
      flex: 1;
      min-width: 200px;
    }
    #${CFG.footerId} .inputHost textarea,
    #${CFG.footerId} .inputHost input,
    #${CFG.footerId} .inputHost [contenteditable="true"]{
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "JetBrains Mono", monospace !important;
    }
  `);

  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

  const esc = s => String(s ?? '')
    .replaceAll('&','&amp;').replaceAll('<','&lt;')
    .replaceAll('>','&gt;').replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');

  function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

  const state = {
    enabled: false,
    chatPanel: null,

    // channel -> { lines: [], sigSet: Set, sigQueue: [], unread: number }
    channels: new Map(),
    knownChannels: new Set(),
    activeChannel: 'default',

    // restore original UI
    chatPanelOriginalStyle: null,
    inputMoved: false,
    inputRestore: null,

    // bind tab -> channel name
    tabInfoByChannel: new Map(), // channel -> { tabBtn }

    // observe only the ACTIVE panel
    activePanelObserver: null,

    // sidebar search
    filterText: '',
  };

  function ensureChannel(name) {
    const ch = (name && name.trim()) ? name.trim() : 'default';
    if (!state.channels.has(ch)) {
      state.channels.set(ch, { lines: [], sigSet: new Set(), sigQueue: [], unread: 0 });
      state.knownChannels.add(ch);
    }
    return ch;
  }

  /* ======= MUI Tabs: stable channel name + badge number ======= */
  function getTabButtons(panel) {
    return $$('button[role="tab"]', panel);
  }

  function getTabName(tabButton) {
    const badge = tabButton.querySelector('.MuiBadge-root');
    if (!badge) return 'default';

    for (const n of badge.childNodes) {
      if (n.nodeType === Node.TEXT_NODE) {
        const t = n.textContent.trim();
        if (t) return t;
      }
    }
    const raw = (badge.textContent || '').trim();
    return raw.replace(/\s*\d+\s*$/, '').trim() || 'default';
  }

  function getTabUnreadBadge(tabButton) {
    const badge = tabButton.querySelector('.MuiBadge-badge');
    if (!badge) return 0;
    const v = parseInt((badge.textContent || '').trim(), 10);
    return Number.isFinite(v) ? v : 0;
  }

  function isPanelHidden(panelEl) {
    const cls = panelEl?.className || '';
    return cls.includes(CFG.tabHiddenClassPart);
  }

  function getTabPanelForTabButton(chatPanel, tabBtn) {
    const id = tabBtn.getAttribute('aria-controls');
    if (id) {
      const el = document.getElementById(id) || $('#' + CSS.escape(id), chatPanel);
      if (el) return el;
    }

    const tabs = getTabButtons(chatPanel);
    const idx = tabs.indexOf(tabBtn);
    if (idx >= 0) {
      const panels = $$(CFG.tabPanelSel, chatPanel);
      if (panels[idx]) return panels[idx];
    }

    const panels = $$(CFG.tabPanelSel, chatPanel);
    return panels.find(p => !isPanelHidden(p)) || panels[0] || null;
  }

  function syncTabBindings(chatPanel) {
    state.tabInfoByChannel.clear();
    const tabs = getTabButtons(chatPanel);
    for (const t of tabs) {
      const name = ensureChannel(getTabName(t));
      state.tabInfoByChannel.set(name, { tabBtn: t });
    }
  }

  function getSelectedChannel(chatPanel) {
    const tabs = getTabButtons(chatPanel);
    const selected = tabs.find(t => t.getAttribute('aria-selected') === 'true') || tabs[0];
    return ensureChannel(selected ? getTabName(selected) : 'default');
  }

  /* ======= Message ingestion (ONLY from a specific TabPanel) ======= */
  function parseMessage(node) {
    const ts = node.querySelector('[class*="timestamp"]')?.textContent?.trim() || '';
    const isSystem = (node.className || '').includes('system');
    const name = node.querySelector('[class*="name"]')?.textContent?.trim() || '';

    const clone = node.cloneNode(true);
    clone.querySelector('[class*="timestamp"]')?.remove();
    clone.querySelector('[class*="name"]')?.remove();
    const text = clone.textContent.trim().replace(/\s+/g,' ');

    return { ts, name, text, isSystem };
  }

  function signature(m) {
    return `${m.isSystem?'S':'U'}|${m.ts}|${m.name}|${m.text}`;
  }

  function formatLine(m) {
    if (m.isSystem || !m.name) {
      return `<div class="mw-ide-line mw-ide-sys"><span class="mw-ide-ts">${esc(m.ts)}</span> ${esc(m.text)}</div>`;
    }
    return `<div class="mw-ide-line"><span class="mw-ide-ts">${esc(m.ts)}</span> <span class="mw-ide-name">${esc(m.name)}</span>: ${esc(m.text)}</div>`;
  }

  function storeLine(channel, m) {
    const ch = ensureChannel(channel);
    const store = state.channels.get(ch);
    const sig = signature(m);
    if (store.sigSet.has(sig)) return false;

    store.sigSet.add(sig);
    store.sigQueue.push(sig);
    store.lines.push(formatLine(m));

    while (store.lines.length > CFG.maxLinesPerChannel) {
      store.lines.shift();
      const old = store.sigQueue.shift();
      if (old) store.sigSet.delete(old);
    }
    while (store.sigQueue.length > CFG.maxLinesPerChannel * 2) {
      const old = store.sigQueue.shift();
      if (old) store.sigSet.delete(old);
    }
    return true;
  }

  function bumpUnreadIfNeeded(channelName) {
    const ch = ensureChannel(channelName);
    if (ch === state.activeChannel) return;
    const store = state.channels.get(ch);
    store.unread += 1;
  }

  function clearUnread(channelName) {
    const ch = ensureChannel(channelName);
    const store = state.channels.get(ch);
    store.unread = 0;
  }

  function ingestFromPanel(panelEl, channelName) {
    if (!panelEl) return;

    const msgNodes = $$(CFG.msgSel, panelEl);
    let changed = false;

    for (const n of msgNodes) {
      const m = parseMessage(n);
      if (!m.text) continue;
      if (storeLine(channelName, m)) {
        changed = true;
        bumpUnreadIfNeeded(channelName);
      }
    }

    if (state.enabled) {
      renderSidebar(); // refresh unread badges
      if (changed && state.activeChannel === channelName) renderBody();
    }
  }

  /* ======= Switching: click original tab and wait until its panel is NOT hidden ======= */
  async function waitUntilPanelVisible(getPanelFn) {
    const start = Date.now();
    while (Date.now() - start < CFG.waitPanelVisibleTimeoutMs) {
      const p = getPanelFn();
      if (p && !isPanelHidden(p)) return p;
      await sleep(CFG.waitPollMs);
    }
    return getPanelFn();
  }

  function attachActivePanelObserver(panelEl, channelName) {
    if (state.activePanelObserver) {
      try { state.activePanelObserver.disconnect(); } catch {}
      state.activePanelObserver = null;
    }
    if (!panelEl) return;

    state.activePanelObserver = new MutationObserver(() => {
      ingestFromPanel(panelEl, channelName);
    });
    state.activePanelObserver.observe(panelEl, { subtree: true, childList: true });
  }

  async function switchToChannel(channelName) {
    const chatPanel = state.chatPanel;
    if (!chatPanel) return;

    syncTabBindings(chatPanel);

    const info = state.tabInfoByChannel.get(channelName);
    if (!info?.tabBtn) {
      state.activeChannel = ensureChannel(channelName);
      clearUnread(channelName);
      renderSidebar();
      renderBody();
      return;
    }

    const tabBtn = info.tabBtn;
    tabBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

    const panelEl = await waitUntilPanelVisible(() => getTabPanelForTabButton(chatPanel, tabBtn));

    state.activeChannel = ensureChannel(channelName);
    clearUnread(channelName);

    // ingest only that panel; then observe
    ingestFromPanel(panelEl, channelName);
    attachActivePanelObserver(panelEl, channelName);

    renderSidebar();
    renderBody();
  }

  /* ======= Move/restore original UI only when overlay enabled ======= */
  function applyOffscreen(panel) {
    if (!panel) return;
    if (state.chatPanelOriginalStyle === null) {
      state.chatPanelOriginalStyle = panel.getAttribute('style'); // may be null
    }
    panel.style.position = 'fixed';
    panel.style.left = '-100000px';
    panel.style.top = '0';
    panel.style.width = '900px';
    panel.style.height = '700px';
    panel.style.opacity = '0.001';
    panel.style.pointerEvents = 'none';
  }

  function restoreChatPanel(panel) {
    if (!panel) return;
    if (state.chatPanelOriginalStyle === null) return;
    const old = state.chatPanelOriginalStyle;
    if (old === null) panel.removeAttribute('style');
    else panel.setAttribute('style', old);
    state.chatPanelOriginalStyle = null;
  }

  function findInputContainer(panel) {
    const input =
      panel.querySelector('textarea') ||
      panel.querySelector('input[type="text"]') ||
      panel.querySelector('[contenteditable="true"]');
    if (!input) return null;

    return (
      input.closest('form') ||
      input.closest('[class*="Chat"]') ||
      input.closest('[class*="chat"]') ||
      input.parentElement
    );
  }

  function moveInputIntoOverlay(panel) {
    if (state.inputMoved) return;
    const host = $('#'+CFG.footerId)?.querySelector('.inputHost');
    if (!host || !panel) return;

    const container = findInputContainer(panel);
    if (!container) return;

    state.inputRestore = {
      node: container,
      parent: container.parentElement,
      nextSibling: container.nextSibling,
    };
    host.appendChild(container);
    state.inputMoved = true;
  }

  function restoreInputBack() {
    if (!state.inputMoved || !state.inputRestore) return;
    const { node, parent, nextSibling } = state.inputRestore;
    try { if (parent) parent.insertBefore(node, nextSibling); } catch {}
    state.inputMoved = false;
    state.inputRestore = null;
  }

  /* ======= Overlay UI (IDE layout) ======= */
  function createUI() {
    if ($('#'+CFG.overlayId)) return;

    document.body.insertAdjacentHTML('beforeend', `
      <div id="${CFG.toggleBtnId}">IDE Chat: OFF (Alt+I)</div>
      <div id="${CFG.overlayId}">
        <div id="${CFG.topbarId}">
          <div class="title">MilkyWayIdle • IDE Chat View</div>
          <button class="btn" data-action="toggle-scroll">AutoScroll: ON</button>
          <button class="btn" data-action="exit">Exit</button>
        </div>

        <div id="${CFG.layoutId}">
          <aside id="${CFG.sidebarId}">
            <div class="sidebarHeader">
              <div class="label">Channels</div>
              <input id="mw-ide-filter" placeholder="filter…" />
            </div>
            <div id="${CFG.chanListId}"></div>
          </aside>

          <main id="${CFG.mainId}">
            <div id="${CFG.bodyId}"></div>
            <div id="${CFG.footerId}">
              <div class="hint">Alt+I toggle</div>
              <div class="inputHost"></div>
            </div>
          </main>
        </div>
      </div>
    `);

    $('#'+CFG.toggleBtnId).addEventListener('click', () => toggleOverlay());

    $('#'+CFG.overlayId).addEventListener('click', (e) => {
      const btn = e.target?.closest('button[data-action]');
      if (!btn) return;
      const a = btn.getAttribute('data-action');
      if (a === 'exit') toggleOverlay(false);
      if (a === 'toggle-scroll') {
        CFG.autoScroll = !CFG.autoScroll;
        btn.textContent = `AutoScroll: ${CFG.autoScroll ? 'ON' : 'OFF'}`;
      }
    });

    const filter = $('#mw-ide-filter');
    filter.addEventListener('input', () => {
      state.filterText = (filter.value || '').trim().toLowerCase();
      renderSidebar();
    });
  }

  function setToggleText() {
    const b = $('#'+CFG.toggleBtnId);
    if (b) b.textContent = `IDE Chat: ${state.enabled ? 'ON' : 'OFF'} (Alt+I)`;
  }

  function renderSidebar() {
    const list = $('#'+CFG.chanListId);
    if (!list) return;

    // refresh bindings to read site badge counts (optional)
    syncTabBindings(state.chatPanel);

    const filter = state.filterText;
    const channels = Array.from(state.knownChannels)
      .filter(ch => !filter || ch.toLowerCase().includes(filter))
      .sort((a,b) => a.localeCompare(b));

    list.innerHTML = '';

    for (const ch of channels) {
      const store = state.channels.get(ch) || { unread: 0 };
      const isActive = (ch === state.activeChannel);

      // also show site-provided unread badge if available
      let siteBadge = 0;
      const info = state.tabInfoByChannel.get(ch);
      if (info?.tabBtn) siteBadge = getTabUnreadBadge(info.tabBtn);

      const row = document.createElement('div');
      row.className = 'mw-chan' + (isActive ? ' active' : '') + ((store.unread > 0 || siteBadge > 0) ? ' unread' : '');
      row.innerHTML = `
        <div class="dot"></div>
        <div class="name" title="${esc(ch)}">${esc(ch)}</div>
        <div class="badges">
          ${store.unread > 0 ? `<span class="mw-badge unread">${store.unread}</span>` : ''}
          ${siteBadge > 0 ? `<span class="mw-badge">${siteBadge}</span>` : ''}
        </div>
      `;

      row.addEventListener('click', () => switchToChannel(ch));
      list.appendChild(row);
    }
  }

  function renderBody() {
    const body = $('#'+CFG.bodyId);
    if (!body) return;
    const store = state.channels.get(state.activeChannel);
    body.innerHTML = store?.lines.join('') || '';
    if (CFG.autoScroll) body.scrollTop = body.scrollHeight;
  }

  function showOverlay(show) {
    const overlay = $('#'+CFG.overlayId);
    overlay.style.display = show ? 'flex' : 'none';
    document.body.style.overflow = show ? 'hidden' : '';
  }

  async function toggleOverlay(force) {
    const next = (typeof force === 'boolean') ? force : !state.enabled;
    state.enabled = next;

    setToggleText();
    showOverlay(next);

    if (next) {
      // Enable
      syncTabBindings(state.chatPanel);
      applyOffscreen(state.chatPanel);
      moveInputIntoOverlay(state.chatPanel);

      // lock to selected channel only
      const selectedChannel = getSelectedChannel(state.chatPanel);
      state.activeChannel = ensureChannel(selectedChannel);
      clearUnread(selectedChannel);

      const selectedTabBtn = state.tabInfoByChannel.get(selectedChannel)?.tabBtn;
      const selectedPanel = selectedTabBtn ? getTabPanelForTabButton(state.chatPanel, selectedTabBtn) : null;

      ingestFromPanel(selectedPanel, selectedChannel);
      attachActivePanelObserver(selectedPanel, selectedChannel);

      renderSidebar();
      renderBody();
    } else {
      // Disable
      restoreInputBack();
      restoreChatPanel(state.chatPanel);

      if (state.activePanelObserver) {
        try { state.activePanelObserver.disconnect(); } catch {}
        state.activePanelObserver = null;
      }
    }
  }

  /* ======= Bootstrap ======= */
  async function waitForChatPanel() {
    return new Promise((resolve) => {
      const t = setInterval(() => {
        const p = $(CFG.chatPanelSel);
        if (p) { clearInterval(t); resolve(p); }
      }, 300);
    });
  }

  async function main() {
    createUI();
    setToggleText();

    window.addEventListener('keydown', (e) => {
      if (e.altKey && (e.key || '').toLowerCase() === 'i') {
        e.preventDefault();
        toggleOverlay();
      }
    });

    const chatPanel = await waitForChatPanel();
    state.chatPanel = chatPanel;

    // init known channels
    syncTabBindings(chatPanel);

    // Update channel list when tabs list changes (e.g., channels appear/disappear)
    new MutationObserver(() => {
      if (!state.chatPanel) return;
      syncTabBindings(state.chatPanel);
      if (state.enabled) renderSidebar();
    }).observe(chatPanel, { subtree: true, childList: true, attributes: true });

    console.log('[MW IDE Chat] v0.8.0 loaded (IDE layout + unread highlight)');
  }

  main();
})();
