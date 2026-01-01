// ==UserScript==
// @name         MilkyWayIdle - Fullscreen IDE Chat
// @name:zh-CN   MilkyWayIdle - 全屏 IDE 聊天
// @namespace    https://github.com/ailec0623/MilkyWayIdle-FullscreenIDEChat
// @version      0.11.0
// @description  Fullscreen IDE-style chat for MilkyWayIdle: channel tree, aligned log view, unread tracking, pause-follow mode, local input (no draft loss), adjustable font size, drag-to-reorder channels.
// @description:zh-CN  为 MilkyWayIdle 提供全屏 IDE 风格聊天界面：频道列表、日志对齐、未读提示、暂停跟随、本地输入（不丢草稿）、可调节字体大小、拖拽排序频道。
// @author       400BadRequest
// @copyright    2025, 400BadRequest
// @license      MIT
//
// @homepageURL  https://github.com/ailec0623/MilkyWayIdle-FullscreenIDEChat
// @supportURL   https://github.com/ailec0623/MilkyWayIdle-FullscreenIDEChat/issues
//
// @updateURL    https://raw.githubusercontent.com/ailec0623/MilkyWayIdle-FullscreenIDEChat/main/mw-ide-chat.user.js
// @downloadURL  https://raw.githubusercontent.com/ailec0623/MilkyWayIdle-FullscreenIDEChat/main/mw-ide-chat.user.js
//
// @match        https://milkywayidle.com/*
// @match        https://www.milkywayidle.com/*
// @match        https://milkywayidlecn.com/*
// @match        https://www.milkywayidlecn.com/*
// @run-at       document-idle
//
// @grant        GM_addStyle
// ==/UserScript==


(() => {
  'use strict';

  const CFG = {
    overlayId: 'mw-ide-overlay',
    toggleBtnId: 'mw-ide-toggle',
    topbarId: 'mw-ide-topbar',
    layoutId: 'mw-ide-layout',
    sidebarId: 'mw-ide-sidebar',
    chanListId: 'mw-ide-chanlist',
    mainId: 'mw-ide-main',
    bodyId: 'mw-ide-body',
    footerId: 'mw-ide-footer',

    // overlay input ids
    localInputId: 'mw-ide-local-input',
    sendBtnId: 'mw-ide-send',

    // site selectors
    chatPanelSel: '[class*="GamePage_chatPanel"]',
    tabPanelSel: 'div[class*="TabPanel_tabPanel"]',
    tabHiddenClassPart: 'TabPanel_hidden',
    msgSel: 'div[class*="ChatMessage_chatMessage"]',

    maxLinesPerChannel: 3000,
    autoScroll: true,

    hotkey: { altKey: true, key: 'i' },

    waitPanelVisibleTimeoutMs: 2500,
    waitPollMs: 30,

    // font size settings
    fontSizes: [10, 11, 12, 13, 14, 15, 16, 18, 20],
    defaultFontSize: 12,
    storageKey: 'mw-ide-chat-settings',

    // drag and drop settings
    dragPlaceholderClass: 'mw-chan-placeholder',
    dragGhostClass: 'mw-chan-dragging',
  };

  GM_addStyle(`
    :root {
      --mw-ide-font-size: ${getSetting('fontSize', CFG.defaultFontSize)}px;
    }

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
      font-size: var(--mw-ide-font-size);
    }

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
      position: relative;
    }
    #${CFG.topbarId} .btn:hover{ border-color: rgba(255,255,255,.25); }

    /* Font size dropdown */
    .font-size-dropdown {
      position: absolute;
      top: 100%;
      right: 0;
      background: #0b0e14;
      border: 1px solid rgba(255,255,255,.14);
      border-radius: 8px;
      padding: 4px 0;
      min-width: 80px;
      z-index: 1000;
      display: none;
      box-shadow: 0 4px 12px rgba(0,0,0,.3);
    }
    .font-size-dropdown.show {
      display: block;
    }
    .font-size-option {
      padding: 6px 12px;
      cursor: pointer;
      font-size: 12px;
      color: #cfd6e6;
    }
    .font-size-option:hover {
      background: rgba(255,255,255,.06);
    }
    .font-size-option.active {
      background: rgba(120,200,255,.15);
      color: #d7eaff;
    }

    #${CFG.layoutId}{
      flex: 1;
      display: grid;
      grid-template-columns: 260px 1fr;
      min-height: 0;
    }

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
    #${CFG.sidebarId} .reset-order-btn{
      background: rgba(255,255,255,.06);
      border: 1px solid rgba(255,255,255,.10);
      border-radius: 6px;
      padding: 4px 8px;
      color: #cfd6e6;
      cursor: pointer;
      font-size: 12px;
      opacity: .7;
    }
    #${CFG.sidebarId} .reset-order-btn:hover{
      opacity: 1;
      border-color: rgba(255,255,255,.20);
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
      transition: all 0.2s ease;
      position: relative;
    }
    .mw-chan:hover{ background: rgba(255,255,255,.06); opacity: 1; }
    .mw-chan.active{
      background: rgba(255,255,255,.10);
      opacity: 1;
      outline: 1px solid rgba(255,255,255,.14);
    }
    .mw-chan.dragging{
      opacity: 0.5;
      transform: rotate(2deg);
      z-index: 1000;
      box-shadow: 0 4px 12px rgba(0,0,0,.3);
    }
    .mw-chan-placeholder{
      height: 32px;
      margin: 2px 0;
      border: 2px dashed rgba(120,200,255,.4);
      border-radius: 8px;
      background: rgba(120,200,255,.08);
    }
    .mw-chan .dot{
      width: 8px; height: 8px; border-radius: 999px;
      background: rgba(255,255,255,.25);
      flex: 0 0 auto;
      position: relative;
    }
    .mw-chan .dot::before{
      content: '⋮⋮';
      position: absolute;
      left: -2px;
      top: -8px;
      font-size: 8px;
      color: rgba(255,255,255,.3);
      opacity: 0;
      transition: opacity 0.2s ease;
      pointer-events: none;
    }
    .mw-chan:hover .dot::before{
      opacity: 1;
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
      font-size: var(--mw-ide-font-size);
      line-height: 1.55;
      white-space: pre-wrap;
      word-break: break-word;
      min-height: 0;
    }
    .mw-ide-ts{ opacity: .65; }
    .mw-ide-name{ opacity: .90; }
    .mw-ide-sys{ opacity: .80; }

    /* ========= Footer + Local Input (bigger, IDE style) ========= */
    #${CFG.footerId}{
      border-top: 1px solid rgba(255,255,255,.10);
      background: #0b0e14;
      padding: 10px 12px;
      display: flex;
      align-items: flex-end;
      gap: 10px;
    }
    #${CFG.footerId} .hint{
      font-size: 11px;
      opacity: .55;
      white-space: nowrap;
      align-self: center;
    }
    #${CFG.footerId} .inputHost{
      flex: 1;
      min-width: 200px;
      display:flex;
      align-items:flex-end;
      gap: 8px;
    }

    /* Bigger textarea */
    #${CFG.localInputId}{
      flex: 1;
      min-height: 110px;
      max-height: 240px;
      resize: none;
      line-height: 1.45;
      padding: 12px 12px;

      background: #0f111a;
      color: #d7dce8;

      border-radius: 10px;
      border: 1px solid rgba(255,255,255,.14);
      outline: none;

      font-size: var(--mw-ide-font-size);
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "JetBrains Mono", monospace;
    }
    #${CFG.localInputId}:focus{
      border-color: rgba(120,200,255,.55);
      box-shadow: 0 0 0 1px rgba(120,200,255,.25);
    }

    /* Small IDE-ish send button (no blue) */
    #${CFG.sendBtnId}{
      width: 34px;
      height: 34px;
      min-width: 34px;
      border-radius: 8px;

      background: rgba(255,255,255,.06);
      border: 1px solid rgba(255,255,255,.14);
      color: #cfd6e6;

      display:flex;
      align-items:center;
      justify-content:center;
      cursor: pointer;
      user-select: none;
    }
    #${CFG.sendBtnId}:hover{
      background: rgba(255,255,255,.12);
      border-color: rgba(255,255,255,.30);
    }
    #${CFG.sendBtnId}:active{
      background: rgba(120,200,255,.18);
      border-color: rgba(120,200,255,.45);
    }

    /* ===== IDE message layout ===== */
    #mw-ide-body{
      font-variant-numeric: tabular-nums; /* 时间对齐更像 IDE */
    }

    .mw-ide-line{
      display: grid;
      grid-template-columns: minmax(0, 18ch) 100px 1fr; /* 时间 | 名字 | 内容 */
      column-gap: 1px;
      align-items: start;
      padding: calc(var(--mw-ide-font-size) * 0.08) 0; /* 动态调整行间距 */
    }

    .mw-ide-ts{
      white-space: nowrap;
    }

    .mw-ide-name{
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      opacity: .92;
    }

    .mw-ide-msg{
      white-space: pre-wrap;
      word-break: break-word;
    }

    /* 系统消息：名字列空出来更清爽 */
    .mw-ide-line.mw-ide-sys{
      grid-template-columns: 76px 1fr;
    }

    /* @mention highlight */
    .mw-mention{
      padding: 0 4px;
      border-radius: 6px;
      background: rgba(120,200,255,.16);
      border: 1px solid rgba(120,200,255,.22);
      color: #d7eaff;
    }

    /* ===== Pause + new messages bar ===== */
    #mw-ide-status{
      position: absolute;
      top: 10px;
      right: 12px;
      z-index: 2;
      font-size: 11px;
      opacity: .8;
      display: none;
      padding: 4px 8px;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,.14);
      background: rgba(11,14,20,.75);
    }

    #mw-ide-newbar{
      position: absolute;
      bottom: 130px; /* 让它浮在输入框上方：你输入时不挡 */
      left: 50%;
      transform: translateX(-50%);
      z-index: 3;

      display: none;
      align-items: center;
      gap: 10px;

      padding: 8px 12px;
      border-radius: 999px;
      border: 1px solid rgba(120,200,255,.30);
      background: rgba(11,14,20,.86);
      cursor: pointer;
      user-select: none;
      font-size: 12px;
    }

    #mw-ide-newbar:hover{
      border-color: rgba(120,200,255,.55);
      background: rgba(11,14,20,.92);
    }

  `);

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  const esc = s => String(s ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;').replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  // Settings management
  function loadSettings() {
    try {
      const stored = localStorage.getItem(CFG.storageKey);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  function saveSettings(settings) {
    try {
      localStorage.setItem(CFG.storageKey, JSON.stringify(settings));
    } catch {
      // ignore storage errors
    }
  }

  function getSetting(key, defaultValue) {
    const settings = loadSettings();
    return settings[key] !== undefined ? settings[key] : defaultValue;
  }

  function setSetting(key, value) {
    const settings = loadSettings();
    settings[key] = value;
    saveSettings(settings);
  }

  const state = {
    enabled: false,
    chatPanel: null,

    // channel -> { lines: [], sigSet: Set, sigQueue: [], unread: number }
    channels: new Map(),
    knownChannels: new Set(),
    activeChannel: 'default',

    // restore original UI
    chatPanelOriginalStyle: null,

    // tab bindings
    tabInfoByChannel: new Map(), // channel -> { tabBtn }

    // observe only the ACTIVE panel
    activePanelObserver: null,

    // sidebar search
    filterText: '',

    // incremental render
    renderedCount: new Map(), // channel -> number of rendered lines
    // scroll state
    isPaused: false,
    atBottom: true,
    activeNewWhilePaused: 0,

    // font size
    fontSize: getSetting('fontSize', CFG.defaultFontSize),

    // channel ordering
    channelOrder: getSetting('channelOrder', []),
    dragState: {
      isDragging: false,
      draggedChannel: null,
      placeholder: null,
    },
  };
  function readSelfIdFromPage() {
    // 1) 先锁定 Header 区域，避免撞到聊天消息里的 CharacterName_name__*
    const header =
      document.querySelector('[class*="Header_name__"]') ||
      document.querySelector('.Header_name__227rJ'); // 兼容你给的示例
    if (!header) return '';

    // 2) 在 header 内部找角色名节点（class 会变，但必包含 CharacterName_name__ 前缀）
    const nameEl = header.querySelector('[class*="CharacterName_name__"]');
    if (!nameEl) return '';

    // 3) 优先用 data-name（更稳定），否则取 span/textContent
    const dataName = (nameEl.getAttribute('data-name') || '').trim();
    if (dataName) return dataName;

    const spanText = (nameEl.querySelector('span')?.textContent || '').trim();
    if (spanText) return spanText;

    return (nameEl.textContent || '').trim();
  }

  function startSelfIdWatcher() {
    // 初次读取
    const v = readSelfIdFromPage();
    console.log('[MW IDE Chat] readSelfIdFromPage() =>', v);
    if (v) state.selfId = v;

    // 只观察 Header 区域即可（更轻，不会被聊天刷屏影响）
    const header =
      document.querySelector('[class*="Header_name__"]') ||
      document.querySelector('.Header_name__227rJ');

    if (!header) {
      // 如果 header 还没出现（React 延迟加载），退化成短轮询，出现后再切回 observer
      const t = setInterval(() => {
        const h =
          document.querySelector('[class*="Header_name__"]') ||
          document.querySelector('.Header_name__227rJ');
        if (!h) return;

        clearInterval(t);
        startSelfIdWatcher(); // 递归一次，走 observer 分支
      }, 300);
      return;
    }

    const obs = new MutationObserver(() => {
      const nv = readSelfIdFromPage();
      if (nv && nv !== state.selfId) {
        state.selfId = nv;

        // selfId变化时，重绘当前频道一次，让 @ 高亮重新生效
        if (state.enabled) renderBodyFull();
      }
    });

    obs.observe(header, { subtree: true, childList: true, attributes: true });
  }


  function highlightMentions(safeHtmlText) {
    const me = (state.selfId || '').trim();
    if (!me) return safeHtmlText;

    const escapedMe = me.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const re = new RegExp(`(^|[\\s>（(【\\[“"'，,。.!?;:])(@${escapedMe})(?=$|[^\\w\\u4e00-\\u9fa5-])`, 'g');

    return safeHtmlText.replace(re, (m, p1, tag) => {
      return `${p1}<span class="mw-mention">${tag}</span>`;
    });
  }

  function isNearBottom(el, thresholdPx = 80) {
    return (el.scrollHeight - el.scrollTop - el.clientHeight) <= thresholdPx;
  }

  function setPaused(paused) {
    state.isPaused = paused;
    const s = document.getElementById('mw-ide-status');
    if (s) s.style.display = paused ? 'block' : 'none';
  }

  function showNewBar(show, count = 0) {
    const bar = document.getElementById('mw-ide-newbar');
    const text = document.getElementById('mw-ide-newbar-text');
    if (!bar || !text) return;

    if (!show) {
      bar.style.display = 'none';
      return;
    }
    text.textContent = count > 0 ? `New messages (${count}) • click to jump` : `New messages • click to jump`;
    bar.style.display = 'flex';
  }

  function jumpToBottomAndResume() {
    const body = document.getElementById(CFG.bodyId);
    if (!body) return;
    body.scrollTop = body.scrollHeight;
    state.activeNewWhilePaused = 0;
    showNewBar(false);
    setPaused(false);
  }

  // Font size management
  function updateFontSize(newSize) {
    if (!CFG.fontSizes.includes(newSize)) return;
    
    state.fontSize = newSize;
    setSetting('fontSize', newSize);
    
    // Update CSS custom property
    document.documentElement.style.setProperty('--mw-ide-font-size', newSize + 'px');
    
    // Update button text
    updateFontSizeButton();
    
    // Update dropdown active state
    updateFontSizeDropdown();
  }

  function updateFontSizeButton() {
    const btn = document.querySelector('[data-action="font-size"]');
    if (btn) {
      const textSpan = btn.querySelector('.btn-text');
      if (textSpan) {
        textSpan.textContent = `Font: ${state.fontSize}px`;
      }
    }
  }

  function updateFontSizeDropdown() {
    const options = document.querySelectorAll('.font-size-option');
    options.forEach(option => {
      const size = parseInt(option.dataset.size);
      option.classList.toggle('active', size === state.fontSize);
    });
  }

  function createFontSizeDropdown() {
    const dropdown = document.createElement('div');
    dropdown.className = 'font-size-dropdown';
    dropdown.innerHTML = CFG.fontSizes.map(size => 
      `<div class="font-size-option" data-size="${size}">${size}px</div>`
    ).join('');
    
    dropdown.addEventListener('click', (e) => {
      const option = e.target.closest('.font-size-option');
      if (option) {
        const size = parseInt(option.dataset.size);
        updateFontSize(size);
        hideFontSizeDropdown();
      }
    });
    
    return dropdown;
  }

  function showFontSizeDropdown() {
    const dropdown = document.querySelector('.font-size-dropdown');
    if (dropdown) {
      dropdown.classList.add('show');
      updateFontSizeDropdown();
    }
  }

  function hideFontSizeDropdown() {
    const dropdown = document.querySelector('.font-size-dropdown');
    if (dropdown) {
      dropdown.classList.remove('show');
    }
  }

  function cycleFontSize() {
    const currentIndex = CFG.fontSizes.indexOf(state.fontSize);
    const nextIndex = (currentIndex + 1) % CFG.fontSizes.length;
    updateFontSize(CFG.fontSizes[nextIndex]);
  }

  // Channel ordering management
  function saveChannelOrder() {
    setSetting('channelOrder', state.channelOrder);
  }

  function getOrderedChannels(channels) {
    const ordered = [];
    const unordered = [];
    
    // 首先按照保存的顺序添加频道
    for (const channelName of state.channelOrder) {
      if (channels.includes(channelName)) {
        ordered.push(channelName);
      }
    }
    
    // 然后添加新的未排序的频道
    for (const channelName of channels) {
      if (!state.channelOrder.includes(channelName)) {
        unordered.push(channelName);
      }
    }
    
    // 按字母顺序排序新频道
    unordered.sort((a, b) => a.localeCompare(b));
    
    return [...ordered, ...unordered];
  }

  function updateChannelOrder(newOrder) {
    state.channelOrder = newOrder;
    saveChannelOrder();
  }

  function resetChannelOrder() {
    state.channelOrder = [];
    saveChannelOrder();
    renderSidebar();
  }

  // Drag and drop functionality
  function createPlaceholder() {
    const placeholder = document.createElement('div');
    placeholder.className = CFG.dragPlaceholderClass;
    return placeholder;
  }

  function handleDragStart(e, channelName) {
    state.dragState.isDragging = true;
    state.dragState.draggedChannel = channelName;
    
    const draggedElement = e.target.closest('.mw-chan');
    if (draggedElement) {
      draggedElement.classList.add('dragging');
      
      // 创建拖拽数据
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', channelName);
      
      // 创建占位符
      state.dragState.placeholder = createPlaceholder();
    }
  }

  function handleDragOver(e) {
    if (!state.dragState.isDragging) return;
    
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    const targetElement = e.target.closest('.mw-chan');
    const list = document.getElementById(CFG.chanListId);
    
    if (targetElement && targetElement !== state.dragState.placeholder) {
      const rect = targetElement.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      
      if (e.clientY < midY) {
        // 插入到目标元素之前
        list.insertBefore(state.dragState.placeholder, targetElement);
      } else {
        // 插入到目标元素之后
        list.insertBefore(state.dragState.placeholder, targetElement.nextSibling);
      }
    }
  }

  function handleDragEnd(e) {
    const draggedElement = e.target.closest('.mw-chan');
    if (draggedElement) {
      draggedElement.classList.remove('dragging');
    }
    
    // 清理占位符
    if (state.dragState.placeholder && state.dragState.placeholder.parentNode) {
      state.dragState.placeholder.parentNode.removeChild(state.dragState.placeholder);
    }
    
    state.dragState.isDragging = false;
    state.dragState.draggedChannel = null;
    state.dragState.placeholder = null;
  }

  function handleDrop(e) {
    if (!state.dragState.isDragging) return;
    
    e.preventDefault();
    
    const list = document.getElementById(CFG.chanListId);
    const placeholder = state.dragState.placeholder;
    
    if (placeholder && placeholder.parentNode) {
      // 获取新的排序
      const newOrder = [];
      const children = Array.from(list.children);
      
      for (const child of children) {
        if (child === placeholder) {
          newOrder.push(state.dragState.draggedChannel);
        } else if (child.classList.contains('mw-chan')) {
          const channelName = child.dataset.channel;
          if (channelName && channelName !== state.dragState.draggedChannel) {
            newOrder.push(channelName);
          }
        }
      }
      
      // 更新频道顺序
      updateChannelOrder(newOrder);
      
      // 重新渲染侧边栏
      renderSidebar();
    }
  }

  function ensureChannel(name) {
    const ch = (name && name.trim()) ? name.trim() : 'default';
    if (!state.channels.has(ch)) {
      state.channels.set(ch, { lines: [], sigSet: new Set(), sigQueue: [], unread: 0 });
      state.knownChannels.add(ch);
      state.renderedCount.set(ch, 0);
    }
    return ch;
  }

  /* ======= MUI Tabs helpers ======= */
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

  /* ======= Message ingestion ======= */
  function parseMessage(node) {
    const ts = node.querySelector('[class*="timestamp"]')?.textContent?.trim() || '';
    const isSystem = (node.className || '').includes('system');
    const name = node.querySelector('[class*="name"]')?.textContent?.trim() || '';

    const clone = node.cloneNode(true);
    clone.querySelector('[class*="timestamp"]')?.remove();
    clone.querySelector('[class*="name"]')?.remove();
    const text = clone.textContent.trim().replace(/\s+/g, ' ');

    return { ts, name, text, isSystem };
  }

  function signature(m) {
    return `${m.isSystem ? 'S' : 'U'}|${m.ts}|${m.name}|${m.text}`;
  }

  function formatLine(m) {
    if (m.isSystem || !m.name) {
      return `<div class="mw-ide-line"><span class="mw-ide-ts">${esc(m.ts)}</span><span class="mw-ide-name">System</span><span class="mw-ide-msg">${highlightMentions(esc(m.text))}</span></div>`;
    }

    return `<div class="mw-ide-line"><span class="mw-ide-ts">${esc(m.ts)}</span><span class="mw-ide-name">${esc(m.name)}</span><span class="mw-ide-msg">${highlightMentions(esc(m.text))}</span></div>`;

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
      // if we trimmed already-rendered lines, reset renderedCount conservatively
      const rc = state.renderedCount.get(ch) || 0;
      state.renderedCount.set(ch, Math.max(0, rc - 1));
    }
    while (store.sigQueue.length > CFG.maxLinesPerChannel * 2) {
      const old = store.sigQueue.shift();
      if (old) store.sigSet.delete(old);
    }
    return true;
  }

  function bumpUnreadIfNeeded(channelName) {
    const ch = ensureChannel(channelName);
    const store = state.channels.get(ch);

    if (ch !== state.activeChannel) {
      store.unread += 1;
      return;
    }

    // 当前频道：只有当用户不在底部（paused）才计未读
    if (!state.atBottom || state.isPaused) {
      store.unread += 1;
      state.activeNewWhilePaused += 1;
      showNewBar(true, state.activeNewWhilePaused);
    }
  }


  function clearUnread(channelName) {
    const ch = ensureChannel(channelName);
    state.channels.get(ch).unread = 0;
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
      // refresh sidebar badges, but only sidebar (doesn't touch input)
      renderSidebar();

      // only append new lines for current channel
      if (changed && state.activeChannel === channelName) {
        appendNewLinesForActiveChannel();
      }
    }
  }

  /* ======= Incremental rendering (only append new lines) ======= */
  function appendNewLinesForActiveChannel() {
    const body = $('#' + CFG.bodyId);
    if (!body) return;

    const ch = ensureChannel(state.activeChannel);
    const store = state.channels.get(ch);
    const already = state.renderedCount.get(ch) || 0;

    if (!store || store.lines.length <= already) return;

    const frag = document.createDocumentFragment();
    for (let i = already; i < store.lines.length; i++) {
      const tmp = document.createElement('div');
      tmp.innerHTML = store.lines[i];
      frag.appendChild(tmp.firstElementChild);
    }
    body.appendChild(frag);
    state.renderedCount.set(ch, store.lines.length);

    if (CFG.autoScroll && state.atBottom && !state.isPaused) {
      body.scrollTop = body.scrollHeight;
    }
  }

  function renderBodyFull() {
    const body = $('#' + CFG.bodyId);
    if (!body) return;

    const ch = ensureChannel(state.activeChannel);
    const store = state.channels.get(ch);
    body.innerHTML = store?.lines.join('') || '';
    state.renderedCount.set(ch, store?.lines.length || 0);

    if (CFG.autoScroll) body.scrollTop = body.scrollHeight;
  }

  /* ======= Switching ======= */
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
      try { state.activePanelObserver.disconnect(); } catch { }
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
      renderBodyFull();
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
    renderBodyFull(); // channel switch => full render once
    state.activeNewWhilePaused = 0;
    showNewBar(false);
    setPaused(false);

  }

  /* ======= Keep original chat panel alive but offscreen ======= */
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

  /* ======= Local input -> sync to original input on send ======= */
  function findOriginalInput() {
    if (!state.chatPanel) return null;
    return (
      state.chatPanel.querySelector('textarea') ||
      state.chatPanel.querySelector('input[type="text"]') ||
      state.chatPanel.querySelector('[contenteditable="true"]')
    );
  }

  function findOriginalSendButton() {
    if (!state.chatPanel) return null;

    // Try common button patterns in chat input area
    const candidates = $$('button', state.chatPanel).filter(b => {
      const t = (b.textContent || '').trim().toLowerCase();
      const aria = (b.getAttribute('aria-label') || '').toLowerCase();
      return t === 'send' || t === '发送' || aria.includes('send') || aria.includes('发送');
    });

    if (candidates[0]) return candidates[0];

    // fallback: last button near input container
    const input = findOriginalInput();
    if (!input) return null;
    const container = input.closest('form') || input.closest('[class*="Chat"]') || input.parentElement;
    if (!container) return null;
    const btns = $$('button', container);
    return btns[btns.length - 1] || null;
  }

  function setOriginalInputValue(inputEl, text) {
    if (!inputEl) return;

    if (inputEl.isContentEditable) {
      inputEl.textContent = text;
      inputEl.dispatchEvent(new InputEvent('input', { bubbles: true }));
      return;
    }

    // textarea / input
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(inputEl), 'value')?.set;
    if (setter) setter.call(inputEl, text);
    else inputEl.value = text;

    inputEl.dispatchEvent(new Event('input', { bubbles: true }));
    inputEl.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function doSend() {
    const local = $('#' + CFG.localInputId);
    if (!local) return;
    const text = (local.value || '').trimEnd();
    if (!text.trim()) return;

    const origInput = findOriginalInput();
    setOriginalInputValue(origInput, text);

    const sendBtn = findOriginalSendButton();
    if (sendBtn) {
      sendBtn.click();
    } else {
      // fallback: try form submit
      const form = origInput?.closest('form');
      if (form) form.requestSubmit?.();
    }

    // clear local input after send
    local.value = '';
  }

  /* ======= UI ======= */
  function createUI() {
    if ($('#' + CFG.overlayId)) return;

    document.body.insertAdjacentHTML('beforeend', `
      <div id="${CFG.toggleBtnId}">IDE Chat: OFF (Alt+I)</div>
      <div id="${CFG.overlayId}">
        <div id="${CFG.topbarId}">
          <div class="title">MilkyWayIdle • IDE Chat View</div>
          <button class="btn" data-action="font-size"><span class="btn-text">Font: ${state.fontSize}px</span></button>
          <button class="btn" data-action="toggle-scroll">AutoScroll: ON</button>
          <button class="btn" data-action="exit">Exit</button>
        </div>

        <div id="${CFG.layoutId}">
          <aside id="${CFG.sidebarId}">
            <div class="sidebarHeader">
              <div class="label">Channels</div>
              <input id="mw-ide-filter" placeholder="filter…" />
              <button class="reset-order-btn" title="Reset channel order">↻</button>
            </div>
            <div id="${CFG.chanListId}"></div>
          </aside>

          <main id="${CFG.mainId}" style="position:relative;">
            <div id="${CFG.bodyId}"></div>

            <div id="mw-ide-status">Paused</div>
            <div id="mw-ide-newbar"><span id="mw-ide-newbar-text">New messages</span></div>

            <div id="${CFG.footerId}">
              <div class="inputHost">
                <textarea id="${CFG.localInputId}" placeholder="Type a message…"></textarea>
                <button id="${CFG.sendBtnId}" title="Send">▶</button>
              </div>
            </div>
          </main>
        </div>
      </div>
    `);

    // Add font size dropdown to the font size button
    const fontBtn = document.querySelector('[data-action="font-size"]');
    if (fontBtn) {
      fontBtn.appendChild(createFontSizeDropdown());
      // 确保按钮文本是最新的
      updateFontSizeButton();
    }

    $('#' + CFG.toggleBtnId).addEventListener('click', () => toggleOverlay());

    $('#' + CFG.overlayId).addEventListener('click', (e) => {
      const btn = e.target?.closest('button[data-action]');
      if (!btn) return;
      const a = btn.getAttribute('data-action');
      if (a === 'exit') toggleOverlay(false);
      if (a === 'toggle-scroll') {
        CFG.autoScroll = !CFG.autoScroll;
        btn.textContent = `AutoScroll: ${CFG.autoScroll ? 'ON' : 'OFF'}`;
      }
      if (a === 'font-size') {
        e.stopPropagation();
        const dropdown = document.querySelector('.font-size-dropdown');
        if (dropdown && dropdown.classList.contains('show')) {
          hideFontSizeDropdown();
        } else {
          showFontSizeDropdown();
        }
      }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('[data-action="font-size"]')) {
        hideFontSizeDropdown();
      }
    });

    const filter = $('#mw-ide-filter');
    filter.addEventListener('input', () => {
      state.filterText = (filter.value || '').trim().toLowerCase();
      renderSidebar();
    });

    // 重置排序按钮事件
    const resetBtn = document.querySelector('.reset-order-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('Reset channel order to alphabetical?')) {
          resetChannelOrder();
        }
      });
    }

    $('#' + CFG.sendBtnId).addEventListener('click', () => doSend());

    // Enter to send (no newline supported)
    $('#' + CFG.localInputId).addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();   // 阻止 textarea 插入换行
        doSend();
      }
    });
  }

  function setToggleText() {
    const b = $('#' + CFG.toggleBtnId);
    if (b) b.textContent = `IDE Chat: ${state.enabled ? 'ON' : 'OFF'} (Alt+I)`;
  }

  function renderSidebar() {
    const list = $('#' + CFG.chanListId);
    if (!list) return;

    syncTabBindings(state.chatPanel);

    const filter = state.filterText;
    const allChannels = Array.from(state.knownChannels)
      .filter(ch => !filter || ch.toLowerCase().includes(filter));
    
    // 使用排序后的频道列表
    const channels = getOrderedChannels(allChannels);

    list.innerHTML = '';

    for (const ch of channels) {
      const store = state.channels.get(ch) || { unread: 0 };
      const isActive = (ch === state.activeChannel);

      let siteBadge = 0;
      const info = state.tabInfoByChannel.get(ch);
      if (info?.tabBtn) siteBadge = getTabUnreadBadge(info.tabBtn);

      const row = document.createElement('div');
      row.className = 'mw-chan' + (isActive ? ' active' : '') + ((store.unread > 0 || siteBadge > 0) ? ' unread' : '');
      row.draggable = true;
      row.dataset.channel = ch;
      row.innerHTML = `
        <div class="dot"></div>
        <div class="name" title="${esc(ch)}">${esc(ch)}</div>
        <div class="badges">
          ${store.unread > 0 ? `<span class="mw-badge unread">${store.unread}</span>` : ''}
          ${siteBadge > 0 ? `<span class="mw-badge">${siteBadge}</span>` : ''}
        </div>
      `;
      
      // 添加点击事件（防止拖拽时触发）
      row.addEventListener('click', (e) => {
        if (!state.dragState.isDragging) {
          switchToChannel(ch);
        }
      });
      
      // 添加拖拽事件
      row.addEventListener('dragstart', (e) => handleDragStart(e, ch));
      row.addEventListener('dragend', handleDragEnd);
      
      list.appendChild(row);
    }
    
    // 为列表添加拖拽事件
    list.addEventListener('dragover', handleDragOver);
    list.addEventListener('drop', handleDrop);
  }

  function showOverlay(show) {
    const overlay = $('#' + CFG.overlayId);
    overlay.style.display = show ? 'flex' : 'none';
    document.body.style.overflow = show ? 'hidden' : '';
  }

  async function toggleOverlay(force) {
    const next = (typeof force === 'boolean') ? force : !state.enabled;
    state.enabled = next;

    setToggleText();
    showOverlay(next);

    if (next) {
      syncTabBindings(state.chatPanel);
      applyOffscreen(state.chatPanel);

      const selectedChannel = getSelectedChannel(state.chatPanel);
      state.activeChannel = ensureChannel(selectedChannel);
      clearUnread(selectedChannel);

      const selectedTabBtn = state.tabInfoByChannel.get(selectedChannel)?.tabBtn;
      const selectedPanel = selectedTabBtn ? getTabPanelForTabButton(state.chatPanel, selectedTabBtn) : null;

      ingestFromPanel(selectedPanel, selectedChannel);
      attachActivePanelObserver(selectedPanel, selectedChannel);

      renderSidebar();
      renderBodyFull();

      const body = document.getElementById(CFG.bodyId);
      if (body && !body.__mwScrollBound) {
        body.__mwScrollBound = true;
        body.addEventListener('scroll', () => {
          const near = isNearBottom(body, 80);
          state.atBottom = near;

          if (near) {
            // 用户回到底部：自动恢复跟随并清掉浮条
            state.activeNewWhilePaused = 0;
            showNewBar(false);
            setPaused(false);
            clearUnread(state.activeChannel);
            renderSidebar();
          } else {
            // 用户往上翻：进入 paused
            state.atBottom = false;
            setPaused(true);
          }
        }, { passive: true });
      }

      // newbar click => jump bottom
      const nb = document.getElementById('mw-ide-newbar');
      if (nb && !nb.__mwBound) {
        nb.__mwBound = true;
        nb.addEventListener('click', () => jumpToBottomAndResume());
      }


      // focus local input
      setTimeout(() => $('#' + CFG.localInputId)?.focus(), 0);
    } else {
      restoreChatPanel(state.chatPanel);
      if (state.activePanelObserver) {
        try { state.activePanelObserver.disconnect(); } catch { }
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
    // Initialize font size
    updateFontSize(state.fontSize);
    
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
    startSelfIdWatcher();
    // init channels
    syncTabBindings(chatPanel);

    // update channels when tabs change
    new MutationObserver(() => {
      if (!state.chatPanel) return;
      syncTabBindings(state.chatPanel);
      if (state.enabled) renderSidebar();
    }).observe(chatPanel, { subtree: true, childList: true, attributes: true });

    console.log('[MW IDE Chat] v0.11.0 loaded (local input + incremental rendering + adjustable font size + drag-to-reorder channels)');
  }

  main();
})();
