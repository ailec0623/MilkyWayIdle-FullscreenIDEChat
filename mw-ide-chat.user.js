// ==UserScript==
// @name         MilkyWayIdle - Fullscreen IDE Chat
// @name:zh-CN   MilkyWayIdle - 全屏 IDE 聊天
// @namespace    https://github.com/ailec0623/MilkyWayIdle-FullscreenIDEChat
// @version      0.20.0
// @description  Fullscreen IDE-style chat for MilkyWayIdle: channel tree, aligned log view, unread tracking, pause-follow mode, local input (no draft loss), adjustable font size, drag-to-reorder channels, improved message layout, click username to mention, double-click message to copy, cross-platform hotkeys, configurable game link highlighting, configurable auto image display, paste image upload to tupian.li, auto-jump to bottom when sending messages in paused state, fixed image display for chat-img format links, Excel mode with integrated chat display.
// @description:zh-CN  为 MilkyWayIdle 提供全屏 IDE 风格聊天界面：频道列表、日志对齐、未读提示、暂停跟随、本地输入（不丢草稿）、可调节字体大小、拖拽排序频道、改进消息布局、点击用户名快速@、双击消息复制、跨平台快捷键、可配置游戏链接高亮、可配置自动图片显示、粘贴图片上传到图床、暂停状态下发送消息自动跳转到底部、修复chat-img格式链接的图片显示问题、Excel模式集成聊天室显示。
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
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @require      https://mirrors.sustech.edu.cn/cdnjs/ajax/libs/jquery/3.4.0/jquery.min.js#sha512=Pa4Jto+LuCGBHy2/POQEbTh0reuoiEXQWXGn8S7aRlhcwpVkO8+4uoZVSOqUjdCsE+77oygfu2Tl+7qGHGIWsw==
// @require      https://mirrors.sustech.edu.cn/cdnjs/ajax/libs/spectrum/1.8.0/spectrum.min.js#sha512=Bx3FZ9S4XKYq5P1Yxfqp36JifotqAAAl5eotNaGWE1zSSLifBZlbKExLh2NKHA4CTlqHap7xdFzo39W+CTKrWQ==
// @require      https://mirrors.sustech.edu.cn/cdnjs/ajax/libs/localforage/1.10.0/localforage.min.js#sha512=+BMamP0e7wn39JGL8nKAZ3yAQT2dL5oaXWr4ZYlTGkKOaoXM/Yj7c4oy50Ngz5yoUutAG17flueD4F6QpTlPng==
// @require      https://mirrors.sustech.edu.cn/cdnjs/ajax/libs/echarts/5.3.0/echarts.min.js#sha512=dvHO84j/D1YX7AWkAPC/qwRTfEgWRHhI3n7J5EAqMwm4r426sTkcOs6OmqCtmkg0QXNKtiFa67Tp77JWCRRINg==
// @require      https://greasyfork.org/scripts/424901-nga-script-resource/code/NGA-Script-Resource.js?version=1268947
// ==/UserScript==


(() => {
  'use strict';

  // Platform detection for hotkeys
  const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform) || /Mac/.test(navigator.userAgent);
  const hotkeyText = isMac ? 'Cmd+I' : 'Alt+I';

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

    hotkey: isMac ? { metaKey: true, key: 'i' } : { altKey: true, key: 'i' },

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
      
      transition: opacity 0.3s ease, background-color 0.3s ease;
    }
    #${CFG.localInputId}:focus{
      border-color: rgba(120,200,255,.55);
      box-shadow: 0 0 0 1px rgba(120,200,255,.25);
    }
    #${CFG.localInputId}:disabled{
      background: rgba(15,17,26,.7);
      color: rgba(215,220,232,.6);
      cursor: not-allowed;
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
      
      transition: opacity 0.3s ease, background-color 0.3s ease;
    }
    #${CFG.sendBtnId}:hover{
      background: rgba(255,255,255,.12);
      border-color: rgba(255,255,255,.30);
    }
    #${CFG.sendBtnId}:active{
      background: rgba(120,200,255,.18);
      border-color: rgba(120,200,255,.45);
    }
    #${CFG.sendBtnId}:disabled{
      background: rgba(255,255,255,.03);
      border-color: rgba(255,255,255,.08);
      color: rgba(207,214,230,.4);
      cursor: not-allowed;
    }
    #${CFG.sendBtnId}:disabled:hover{
      background: rgba(255,255,255,.03);
      border-color: rgba(255,255,255,.08);
    }

    /* ===== IDE message layout ===== */
    #mw-ide-body{
      font-variant-numeric: tabular-nums; /* 时间对齐更像 IDE */
    }

    .mw-ide-line{
      display: flex;
      align-items: start;
      padding: calc(var(--mw-ide-font-size) * 0.08) 0; /* 动态调整行间距 */
      cursor: pointer;
      border-radius: 4px;
      margin: 1px 0;
      transition: background-color 0.2s ease;
    }
    .mw-ide-line:hover{
      background: rgba(255,255,255,.03);
    }

    .mw-ide-ts{
      opacity: .45;
      color: #8a9199;
      font-variant-numeric: tabular-nums;
      flex-shrink: 0; /* Prevent timestamp from shrinking */
      margin-right: 8px;
    }

    .mw-ide-name{
      opacity: .92;
      color: #7dd3fc;
      font-weight: 500;
      cursor: pointer;
      border-radius: 4px;
      padding: 1px 4px;
      margin: -1px 20px -1px -4px; /* Right margin to separate from message */
      transition: background-color 0.2s ease;
      position: relative;
      flex-shrink: 0; /* Prevent username from shrinking */
      white-space: nowrap; /* Prevent username from wrapping */
      min-width: 8em; /* Minimum width for username alignment */
      display: inline-block;
    }
    .mw-ide-name:hover{
      background: rgba(255,255,255,.08);
    }

    /* 为不同用户提供不同的颜色 */
    .mw-ide-name[data-user-hash="0"] { color: #7dd3fc; }   /* Sky Blue */
    .mw-ide-name[data-user-hash="1"] { color: #a78bfa; }   /* Violet */
    .mw-ide-name[data-user-hash="2"] { color: #fb7185; }   /* Rose */
    .mw-ide-name[data-user-hash="3"] { color: #fbbf24; }   /* Amber */
    .mw-ide-name[data-user-hash="4"] { color: #34d399; }   /* Emerald */
    .mw-ide-name[data-user-hash="5"] { color: #60a5fa; }   /* Blue */
    .mw-ide-name[data-user-hash="6"] { color: #f472b6; }   /* Pink */
    .mw-ide-name[data-user-hash="7"] { color: #a3a3a3; }   /* Gray */
    .mw-ide-name[data-user-hash="8"] { color: #f97316; }   /* Orange */
    .mw-ide-name[data-user-hash="9"] { color: #10b981; }   /* Green */
    .mw-ide-name[data-user-hash="10"] { color: #8b5cf6; }  /* Purple */
    .mw-ide-name[data-user-hash="11"] { color: #06b6d4; }  /* Cyan */
    .mw-ide-name[data-user-hash="12"] { color: #ef4444; }  /* Red */
    .mw-ide-name[data-user-hash="13"] { color: #84cc16; }  /* Lime */
    .mw-ide-name[data-user-hash="14"] { color: #f59e0b; }  /* Yellow */
    .mw-ide-name[data-user-hash="15"] { color: #ec4899; }  /* Fuchsia */
    .mw-ide-name[data-user-hash="16"] { color: #14b8a6; }  /* Teal */
    .mw-ide-name[data-user-hash="17"] { color: #f43f5e; }  /* Rose Red */
    .mw-ide-name[data-user-hash="18"] { color: #a855f7; }  /* Purple Light */
    .mw-ide-name[data-user-hash="19"] { color: #22d3ee; }  /* Cyan Light */
    .mw-ide-name[data-user-hash="20"] { color: #65a30d; }  /* Lime Dark */
    .mw-ide-name[data-user-hash="21"] { color: #dc2626; }  /* Red Dark */
    .mw-ide-name[data-user-hash="22"] { color: #0891b2; }  /* Sky Dark */
    .mw-ide-name[data-user-hash="23"] { color: #c026d3; }  /* Magenta */

    .mw-ide-header{
      display: flex;
      align-items: baseline;
      flex-shrink: 0; /* Prevent header from shrinking */
    }

    .mw-ide-msg{
      white-space: pre-wrap;
      word-break: break-word;
      flex: 1; /* Take remaining space */
      min-width: 0; /* Allow shrinking if needed */
    }

    /* 系统消息：使用相同的flex布局 */
    .mw-ide-line.mw-ide-sys{
      /* 继承父级的flex布局 */
    }
    .mw-ide-line.mw-ide-sys .mw-ide-name{
      color: #f59e0b;
      opacity: .8;
    }

    /* @mention highlight */
    .mw-mention{
      padding: 0 4px;
      border-radius: 6px;
      background: rgba(120,200,255,.16);
      border: 1px solid rgba(120,200,255,.22);
      color: #d7eaff;
    }

    /* Game link container adjustments */
    .mw-ide-msg .ChatMessage_linkContainer__18Kv3 {
      display: inline-block;
      vertical-align: baseline;
      margin: 0 2px;
    }
    
    /* Ensure game link icons scale with font size */
    .mw-ide-msg .Icon_icon__2LtL_ {
      width: calc(var(--mw-ide-font-size) * 1.2) !important;
      height: calc(var(--mw-ide-font-size) * 1.2) !important;
      vertical-align: middle;
    }
    
    /* Ensure game link elements stay inline */
    .mw-ide-msg .ChatMessage_linkContainer__18Kv3 * {
      vertical-align: middle;
    }

    /* Embedded image styles */
    .mw-image-container {
      display: block;
      margin: 8px 0;
      max-width: 100%;
    }
    
    .mw-image-link {
      display: inline-block;
      text-decoration: none;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,.2);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      max-width: 100%;
    }
    
    .mw-image-link:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0,0,0,.3);
    }
    
    .mw-embedded-image {
      max-width: 400px;
      max-height: 300px;
      width: auto;
      height: auto;
      display: block;
      border-radius: 8px;
      object-fit: contain;
    }
    
    .mw-image-fallback {
      color: #60a5fa;
      text-decoration: underline;
      font-size: calc(var(--mw-ide-font-size) * 0.9);
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

    /* User mention dropdown */
    .user-mention-dropdown {
      position: absolute;
      background: #0b0e14;
      border: 1px solid rgba(255,255,255,.14);
      border-radius: 8px;
      padding: 4px 0;
      min-width: 120px;
      z-index: 1000001;
      display: none;
      box-shadow: 0 4px 12px rgba(0,0,0,.3);
    }
    .user-mention-dropdown.show {
      display: block;
    }
    .user-mention-option {
      padding: 8px 12px;
      cursor: pointer;
      font-size: 12px;
      color: #cfd6e6;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .user-mention-option:hover {
      background: rgba(255,255,255,.06);
    }
    .user-mention-option .icon {
      opacity: .7;
    }

    /* Upload status styles */
    .upload-status {
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 10px 15px;
      background: #4caf50;
      color: #fff;
      border-radius: 4px;
      z-index: 10000;
      box-shadow: 0 2px 10px rgba(0,0,0,.2);
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "JetBrains Mono", monospace;
      font-size: 12px;
    }
    .upload-status.error {
      background: #f44336;
    }

  `);

  // Excel Mode CSS Styles
  GM_addStyle(`
    /* Excel Interface Styles */
    .hld__excel-div {
      display: none;
      position: absolute;
      left: 0;
      right: 0;
      z-index: 1000001;
      background: #fff;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      margin: 0;
      padding: 0;
    }

    .hld__excel-header {
      top: 0;
      border-bottom: 1px solid #bbbbbb;
      margin: 0;
      padding: 0;
    }

    .hld__excel-footer {
      bottom: 0;
      border-top: 1px solid #bbbbbb;
      height: 24px;
      display: flex !important;
      align-items: center;
      padding: 0 8px;
      margin: 0;
      white-space: nowrap !important;
      overflow: hidden;
      flex-wrap: nowrap !important;
    }

    .hld__excel-body {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      right: 0;
      background: #fff;
      overflow: auto;
      z-index: 1000001;
      padding: 0;
      margin: 0;
      border: none;
    }

    /* Ensure no gaps between header and body */
    .hld__excel-div.hld__excel-header + .hld__excel-div.hld__excel-body {
      margin-top: 0;
      padding-top: 0;
      border-top: none;
    }

    /* Excel Table Styles */
    .hld__excel-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 11px;
      background: #fff;
      margin: 0;
      padding: 0;
      border-top: none; /* Remove top border to connect with header */
    }

    .hld__excel-table td {
      border: 1px solid #d0d7de;
      border-top: 1px solid #d0d7de; /* Restore individual cell borders */
      padding: 4px 8px;
      text-align: left;
      vertical-align: middle;
      width: 64px;
      min-width: 64px;
      max-width: 64px;
      height: 20px;
      box-sizing: border-box;
      margin: 0;
    }

    /* First row cells should connect directly to header */
    .hld__excel-table tbody tr:first-child td {
      border-top: none;
    }

    .hld__excel-table .row-header {
      background: #f6f8fa;
      font-weight: normal;
      text-align: center;
      color: #24292f;
      width: 50px;
      min-width: 50px;
      position: sticky;
      left: 0;
      z-index: 5;
      border-right: 1px solid #e0e2e4;
      border-left: none;
    }

    .hld__excel-table tbody tr:hover {
      background: #f6f8fa;
    }

    .hld__excel-table td:hover:not(.row-header) {
      background: #e6f3ff;
      cursor: cell;
    }

    .hld__excel-table td.selected {
      background: #0078d4;
      color: white;
    }

    .hld__excel-table td:focus {
      outline: 2px solid #0078d4;
      outline-offset: -2px;
    }

    /* Chat-specific Excel styles */
    .hld__excel-table td[data-col="A"] {
      width: 120px !important;
      min-width: 120px !important;
      max-width: 120px !important;
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 11px;
      color: #333;
      font-weight: 500;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .hld__excel-table td[data-col="B"] {
      width: 100px !important;
      min-width: 100px !important;
      max-width: 100px !important;
      font-weight: 600;
      color: #0052cc;
      font-size: 11px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .hld__excel-table td[data-col="C"] {
      width: 300px !important;
      min-width: 300px !important;
      max-width: 300px !important;
      white-space: pre-wrap !important;
      word-break: break-word !important;
      line-height: 1.3;
      padding: 6px 8px;
      color: #222;
      font-size: 11px;
    }

    /* Header row styling */
    .hld__excel-table td[data-row="1"] {
      background: #f0f0f0 !important;
      font-weight: bold !important;
      text-align: center;
      border-bottom: 2px solid #ccc;
    }

    /* New message highlighting */
    .hld__excel-table td.new-message {
      background: #e6f3ff !important;
      animation: fadeHighlight 3s ease-out;
    }

    @keyframes fadeHighlight {
      0% { background: #b3d9ff !important; }
      100% { background: #e6f3ff !important; }
    }

    /* Tencent Theme Styles */
    .hld__excel-titlebar {
      height: 32px;
      background: #f8f9fa;
      border-bottom: 1px solid #e0e2e4;
      display: flex;
      align-items: center;
      padding: 0 8px;
      font-size: 12px;
      color: #333;
    }

    .hld__excel-titlebar-title {
      font-weight: 500;
      margin-right: 10px;
    }

    .hld__excel-titlebar-content {
      display: inline-block;
      background-size: contain;
      background-repeat: no-repeat;
      background-position: center;
    }

    .hld__excel-icon12 {
      width: 12px;
      height: 12px;
    }

    .hld__excel-icon16 {
      width: 16px;
      height: 16px;
    }

    .hld__excel-icon20 {
      width: 20px;
      height: 20px;
    }

    .hld__excel-icon24 {
      width: 24px;
      height: 24px;
    }

    .hld__excel-toolbar {
      height: 28px;
      background: #f4f4f4;
      border-bottom: 1px solid #e0e2e4;
      display: flex;
      align-items: center;
      padding: 0 8px;
      font-size: 12px;
      color: #333;
    }

    .hld__excel-titlebar-pick {
      position: relative;
      display: inline-block;
    }

    .hld__excel-titlebar-indication {
      position: absolute;
      bottom: -2px;
      left: 2px;
      right: 2px;
      height: 2px;
    }

    .hld__excel-formulabar {
      height: 25px;
      background: #fff;
      border-bottom: 1px solid #e0e2e4;
      display: flex;
      align-items: center;
    }

    .hld__excel-formulabar-coordinate {
      border-right: 1px solid #e0e2e4;
      color: #777;
      text-align: center;
      width: 50px;
      font-size: 12px;
      height: 25px;
      line-height: 25px;
      font-weight: 400;
      flex-shrink: 0;
    }

    .hld__excel-formulabar-input {
      flex: 1;
      border: none;
      outline: none;
      padding: 0 8px;
      font-size: 12px;
      height: 23px;
      line-height: 23px;
      background: transparent;
      color: #333;
    }

    .hld__excel-formulabar-input::placeholder {
      color: #999;
      font-style: italic;
    }

    .hld__excel-h4 {
      height: 20px;
      background: #f8f9fa;
      border-bottom: 1px solid #e0e2e4;
      display: flex;
      font-size: 11px;
      color: #666;
    }

    .hld__excel-sub {
      width: 50px;
      border-right: 1px solid #e0e2e4;
      background: #f0f0f0;
      flex-shrink: 0;
    }

    .hld__excel-column {
      min-width: 64px;
      flex: 0 0 64px;
      text-align: center;
      border-right: 1px solid #e0e2e4;
      line-height: 20px;
      background: #f8f9fa;
      box-sizing: border-box;
    }

    .hld__excel-sheet-tab {
      display: flex;
      align-items: flex-end;
      margin-left: 1px;
      height: 24px;
      position: relative;
    }

    /* 确保footer中的所有直接子元素不会换行 */
    .hld__excel-footer > * {
      display: inline-flex !important;
      flex-shrink: 0 !important;
      vertical-align: middle;
      white-space: nowrap !important;
    }

    /* 频道标签容器样式 */
    #excel-channel-tabs-container {
      display: inline-flex !important;
      align-items: center;
      flex-shrink: 0 !important;
      white-space: nowrap !important;
      margin-left: 20px;
    }

    /* 确保所有频道标签并排显示，无间隙 */
    #excel-channel-tabs-container .hld__excel-sheet-tab {
      display: inline-flex !important;
      align-items: center;
      margin-right: 0 !important;
      flex-shrink: 0 !important;
    }

    /* 确保footer中的sheet-tab不会换行，无间隙 */
    .hld__excel-footer .hld__excel-sheet-tab {
      position: relative;
      display: inline-flex !important;
      align-items: center;
      margin-left: 20px;
      margin-right: 0 !important;
      flex-shrink: 0 !important;
    }

    /* 确保f1元素也能正确排列 */
    .hld__excel-footer .hld__excel-f1 {
      position: relative;
      display: inline-flex !important;
      align-items: center;
      flex: 1;
      flex-shrink: 0 !important;
    }

    /* 确保footer中的icon元素不会换行 */
    .hld__excel-footer .hld__excel-icon24 {
      display: inline-block !important;
      flex-shrink: 0 !important;
      vertical-align: middle;
    }

    .hld__excel-footer .hld__excel-icon12 {
      display: inline-block !important;
      flex-shrink: 0 !important;
      vertical-align: middle;
    }

    .hld__excel-footer .hld__excel-footer-item {
      display: inline-block !important;
      flex-shrink: 0 !important;
      vertical-align: middle;
    }

    .hld__excel-sheet-name {
      display: flex;
      align-items: center;
      padding: 4px 8px;
      background: #fff;
      border: 1px solid #ccc;
      border-bottom: none;
      font-size: 12px;
      margin: 0;
      position: relative;
      top: 0;
    }

    .hld__excel-sheet-underblock {
      width: 100%;
      height: 2px;
      background: #fff;
      margin-top: 0;
      position: absolute;
      bottom: 0;
      left: 0;
    }

    .hld__excel-footer-item {
      margin: 0 5px;
      font-size: 12px;
      color: #666;
    }

    /* WPS/Office Theme Styles */
    .hld__excel-title {
      position: absolute;
      top: 6px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 12px;
      color: #333;
      font-weight: 500;
    }

    .hld__excel-h1 {
      height: 30px;
      background: #f3f5f8;
      border-bottom: 1px solid #c5cbd6;
      position: relative;
    }

    .hld__excel-h2 {
      height: 102px;
      background: #f4f4f4;
      position: relative;
    }

    .hld__excel-h3 {
      height: 44px;
      background: #e8e8e8;
      box-shadow: inset 0 3px 5px #d9d9d9;
      position: relative;
    }

    .hld__excel-img-h1-l1, 
    .hld__excel-img-h2-l1, 
    .hld__excel-img-f1-l1 {
      top: 0;
      left: 0;
    }

    .hld__excel-img-h1-r1, 
    .hld__excel-img-h2-r1, 
    .hld__excel-img-f1-r1 {
      top: 0;
      right: 0;
    }

    .hld__excel-img-h3-l1 {
      top: 12px;
      left: 0;
    }

    .hld__excel-img-h3-r1 {
      top: 8px;
      right: 0;
    }

    .hld__excel-fx {
      position: absolute;
      top: 12px;
      left: 253px;
      right: 45px;
      height: 24px;
      box-sizing: border-box;
      border: 1px solid #cccccc;
      border-radius: 4px;
      background: #ffffff;
      display: flex;
      align-items: center;
    }

    .hld__excel-fx-coordinate {
      width: 50px;
      text-align: center;
      font-size: 12px;
      color: #777;
      border-right: 1px solid #e0e2e4;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .hld__excel-fx-input {
      flex: 1;
      border: none;
      outline: none;
      padding: 0 8px;
      font-size: 12px;
      background: transparent;
      color: #333;
      height: 100%;
    }

    .hld__excel-fx-input::placeholder {
      color: #999;
      font-style: italic;
    }

    .hld__excel-f1 {
      height: 24px;
      background: #f4f4f4;
      border-top: 1px solid #c5cbd6;
      position: relative;
    }

    .hld__excel-f2 {
      height: 24px;
      background: #f4f4f4;
      position: relative;
    }

    .hld__excel-img-fl2, 
    .hld__excel-img-fr2 {
      position: absolute;
      top: 0;
    }

    .hld__excel-img-fl2 {
      left: 0;
    }

    .hld__excel-img-fr2 {
      right: 0;
    }

    /* Debug styles to make Excel elements more visible */
    .hld__excel-div.hld__excel-header {
      background: #f8f9fa !important;
    }

    .hld__excel-div.hld__excel-footer {
      background: #f4f4f4 !important;
    }
  `);

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  // DOM utilities
  const DOM = {
    get overlay() { return $('#' + CFG.overlayId); },
    get toggleBtn() { return $('#' + CFG.toggleBtnId); },
    get body() { return $('#' + CFG.bodyId); },
    get localInput() { return $('#' + CFG.localInputId); },
    get sendBtn() { return $('#' + CFG.sendBtnId); },
    get chanList() { return $('#' + CFG.chanListId); },
    get newBar() { return $('#mw-ide-newbar'); },
    get status() { return $('#mw-ide-status'); }
  };

  const esc = s => String(s ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;').replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  // Simple hash function for user name colors
  function getUserColorHash(name) {
    if (!name) return 0;
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      const char = name.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash) % 24; // 24 different colors
  }

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

    // feature toggles
    showImages: getSetting('showImages', true),
    showGameLinks: getSetting('showGameLinks', true),
    
    // Excel mode
    excelMode: false,
    excelTheme: 'tencent', // tencent, wps, office
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


  function processImageLinks(htmlContent) {
    // 如果图片显示被禁用，直接返回原内容
    if (!state.showImages || !htmlContent || typeof htmlContent !== 'string') {
      return htmlContent;
    }
    
    // Handle existing <a> tags with tupian.li image links (including truncated display text)
    // Only match actual image paths, not the main domain
    // This regex captures the href attribute and ensures there's a path after tupian.li/
    const linkRegex = /<a\s+[^>]*href=["'](https?:\/\/tupian\.li\/[^"']*?)["'][^>]*>([^<]*?)<\/a>/gi;
    
    let processedContent = htmlContent.replace(linkRegex, (match, fullUrl, displayText) => {
      // Skip if it's just the main domain (https://tupian.li/ or https://tupian.li)
      if (fullUrl.match(/^https?:\/\/tupian\.li\/?$/)) {
        return match; // Return original link unchanged
      }
      
      // Create image element with the full URL from href attribute
      // The displayText might be truncated with "..." but we use the full URL from href
      return `<div class="mw-image-container">
        <a href="${fullUrl}" target="_blank" rel="noreferrer noopener nofollow" class="mw-image-link">
          <img src="${fullUrl}" alt="Image" class="mw-embedded-image" loading="lazy" 
               onerror="this.style.display='none'; this.nextElementSibling.style.display='inline';" />
          <span class="mw-image-fallback" style="display:none;">${displayText}</span>
        </a>
      </div>`;
    });
    
    // Also handle <a> tags with class="chat-img" format (from other plugins)
    // This handles any attribute order: class before href or href before class
    const chatImgRegex = /<a\s+[^>]*class=["'][^"']*chat-img[^"']*["'][^>]*>.*?<\/a>/gi;
    
    processedContent = processedContent.replace(chatImgRegex, (match) => {
      // Extract href from the matched <a> tag
      const hrefMatch = match.match(/href=["'](https?:\/\/tupian\.li\/[^"']*?)["']/i);
      if (!hrefMatch) return match; // No href found, return original
      
      const fullUrl = hrefMatch[1];
      
      // Skip if it's just the main domain
      if (fullUrl.match(/^https?:\/\/tupian\.li\/?$/)) {
        return match; // Return original link unchanged
      }
      
      // Create image element with the full URL from href attribute
      return `<div class="mw-image-container">
        <a href="${fullUrl}" target="_blank" rel="noreferrer noopener nofollow" class="mw-image-link">
          <img src="${fullUrl}" alt="Image" class="mw-embedded-image" loading="lazy" 
               onerror="this.style.display='none'; this.nextElementSibling.style.display='inline';" />
          <span class="mw-image-fallback" style="display:none;">[图片]</span>
        </a>
      </div>`;
    });
    
    // Also handle plain text tupian.li image links (fallback for cases without <a> tags)
    if (processedContent === htmlContent) {
      // Only match URLs with actual paths, not just the main domain
      const plainLinkRegex = /(https?:\/\/tupian\.li\/[^\s<>"']*)/gi;
      processedContent = processedContent.replace(plainLinkRegex, (match, url) => {
        // Skip if it's just the main domain
        if (url.match(/^https?:\/\/tupian\.li\/?$/)) {
          return match; // Return original text unchanged
        }
        
        return `<div class="mw-image-container">
          <a href="${url}" target="_blank" rel="noreferrer noopener nofollow" class="mw-image-link">
            <img src="${url}" alt="Image" class="mw-embedded-image" loading="lazy" 
                 onerror="this.style.display='none'; this.nextElementSibling.style.display='inline';" />
            <span class="mw-image-fallback" style="display:none;">${url}</span>
          </a>
        </div>`;
      });
    }
    
    return processedContent;
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
    const s = DOM.status;
    if (s) s.style.display = paused ? 'block' : 'none';
  }

  function showNewBar(show, count = 0) {
    const bar = DOM.newBar;
    const text = $('#mw-ide-newbar-text');
    if (!bar || !text) return;

    if (!show) {
      bar.style.display = 'none';
      return;
    }
    text.textContent = count > 0 ? `New messages (${count}) • click to jump` : `New messages • click to jump`;
    bar.style.display = 'flex';
  }

  function jumpToBottomAndResume() {
    const body = DOM.body;
    if (!body) return;
    body.scrollTop = body.scrollHeight;
    state.activeNewWhilePaused = 0;
    showNewBar(false);
    setPaused(false);
    clearUnread(state.activeChannel);
    renderSidebar();
  }

  // Font size management
  const FontManager = {
    update(newSize) {
      if (!CFG.fontSizes.includes(newSize)) return;
      
      state.fontSize = newSize;
      setSetting('fontSize', newSize);
      document.documentElement.style.setProperty('--mw-ide-font-size', newSize + 'px');
      
      this.updateButton();
      this.updateDropdown();
    },

    updateButton() {
      const btn = document.querySelector('[data-action="font-size"] .btn-text');
      if (btn) btn.textContent = `Font: ${state.fontSize}px`;
    },

    updateDropdown() {
      document.querySelectorAll('.font-size-option').forEach(option => {
        const size = parseInt(option.dataset.size);
        option.classList.toggle('active', size === state.fontSize);
      });
    },

    createDropdown() {
      const dropdown = document.createElement('div');
      dropdown.className = 'font-size-dropdown';
      dropdown.innerHTML = CFG.fontSizes.map(size => 
        `<div class="font-size-option" data-size="${size}">${size}px</div>`
      ).join('');
      
      dropdown.addEventListener('click', (e) => {
        const option = e.target.closest('.font-size-option');
        if (option) {
          this.update(parseInt(option.dataset.size));
          this.hideDropdown();
        }
      });
      
      return dropdown;
    },

    showDropdown() {
      const dropdown = document.querySelector('.font-size-dropdown');
      if (dropdown) {
        dropdown.classList.add('show');
        this.updateDropdown();
      }
    },

    hideDropdown() {
      const dropdown = document.querySelector('.font-size-dropdown');
      if (dropdown) dropdown.classList.remove('show');
    },

    cycle() {
      const currentIndex = CFG.fontSizes.indexOf(state.fontSize);
      const nextIndex = (currentIndex + 1) % CFG.fontSizes.length;
      this.update(CFG.fontSizes[nextIndex]);
    }
  };

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

  // User mention functionality
  let currentMentionDropdown = null;

  function createUserMentionDropdown(userName, clickEvent) {
    // 移除现有的下拉菜单
    hideUserMentionDropdown();
    
    // 清理用户名用于显示
    const cleanUserName = cleanUserNameForMention(userName);
    const displayName = cleanUserName !== userName ? `${cleanUserName} (${userName})` : userName;
    
    const dropdown = document.createElement('div');
    dropdown.className = 'user-mention-dropdown show';
    dropdown.innerHTML = `
      <div class="user-mention-option" data-action="mention">
        <span class="icon">@</span>
        <span>Mention ${esc(displayName)}</span>
      </div>
      <div class="user-mention-option" data-action="private">
        <span class="icon">💬</span>
        <span>Private message</span>
      </div>
    `;
    
    // 定位下拉菜单
    const rect = clickEvent.target.getBoundingClientRect();
    const overlay = document.getElementById(CFG.overlayId);
    const overlayRect = overlay.getBoundingClientRect();
    
    // 相对于主界面的位置
    dropdown.style.left = (rect.left - overlayRect.left) + 'px';
    dropdown.style.top = (rect.bottom - overlayRect.top + 4) + 'px';
    
    // 添加点击事件
    dropdown.addEventListener('click', (e) => {
      const option = e.target.closest('.user-mention-option');
      if (!option) return;
      
      const action = option.dataset.action;
      if (action === 'mention') {
        mentionUser(userName);
      } else if (action === 'private') {
        mentionUser(userName, true);
      }
      
      hideUserMentionDropdown();
    });
    
    // 添加到主界面而不是body
    overlay.appendChild(dropdown);
    currentMentionDropdown = dropdown;
    
    // 点击外部关闭
    setTimeout(() => {
      document.addEventListener('click', hideUserMentionDropdown, { once: true });
    }, 0);
  }

  function hideUserMentionDropdown() {
    if (currentMentionDropdown) {
      currentMentionDropdown.remove();
      currentMentionDropdown = null;
    }
  }

  function mentionUser(userName, isPrivate = false) {
    const input = DOM.localInput;
    if (!input) return;
    
    // 清理用户名，去除角色标记后缀
    const cleanUserName = cleanUserNameForMention(userName);
    
    const currentValue = input.value;
    const prefix = isPrivate ? '/w ' : '@';
    const mentionText = `${prefix}${cleanUserName} `;
    
    // 如果输入框为空或者以空格结尾，直接添加
    if (!currentValue || currentValue.endsWith(' ')) {
      input.value = currentValue + mentionText;
    } else {
      // 否则先添加空格再添加提及
      input.value = currentValue + ' ' + mentionText;
    }
    
    // 聚焦到输入框并将光标移到末尾
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
    
    // 触发input事件以确保任何监听器都能收到通知
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // 清理用户名，去除角色标记后缀
  function cleanUserNameForMention(userName) {
    if (!userName) return userName;
    
    // 去除角色标记后缀，支持以下格式：
    // [GM], [ADMIN], [MOD], [VIP], [STAFF] 等大写字母组合
    // [*], [+], [~], [&], [@], [%] 等单个符号
    // [~&], [*+] 等多个符号组合
    // 示例：
    // "Alice[GM]" -> "Alice"
    // "Bob [ADMIN]" -> "Bob"  
    // "Charlie[MOD]" -> "Charlie"
    // "Dave[*]" -> "Dave"
    // "Eve[~&]" -> "Eve"
    // "Frank" -> "Frank" (无变化)
    return userName.replace(/\s*\[([A-Z]+|[*+~&@%!#$^-]+)\]\s*$/, '').trim();
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

  function formatTimestamp(rawTimestamp) {
    if (!rawTimestamp) return '';
    
    // Try to parse the timestamp and reformat it for better alignment
    try {
      // Handle different timestamp formats
      let timeStr = rawTimestamp.replace(/[\[\]]/g, ''); // Remove brackets
      
      // Check for date + time format: "12/29 5:16:02 PM"
      const dateTimeMatch = timeStr.match(/^(\d{1,2}\/\d{1,2})\s+(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)$/i);
      if (dateTimeMatch) {
        const date = dateTimeMatch[1];
        let hours = parseInt(dateTimeMatch[2]);
        const minutes = dateTimeMatch[3];
        const seconds = dateTimeMatch[4];
        const ampm = dateTimeMatch[5].toUpperCase();
        
        // Convert to 24-hour format
        if (ampm === 'PM' && hours !== 12) {
          hours += 12;
        } else if (ampm === 'AM' && hours === 12) {
          hours = 0;
        }
        
        const result = `[${date} ${hours.toString().padStart(2, '0')}:${minutes}:${seconds}]`;
        return result;
      }
      
      // Check for date + time format without seconds: "12/29 5:16 PM"
      const dateTimeNoSecondsMatch = timeStr.match(/^(\d{1,2}\/\d{1,2})\s+(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (dateTimeNoSecondsMatch) {
        const date = dateTimeNoSecondsMatch[1];
        let hours = parseInt(dateTimeNoSecondsMatch[2]);
        const minutes = dateTimeNoSecondsMatch[3];
        const ampm = dateTimeNoSecondsMatch[4].toUpperCase();
        
        // Convert to 24-hour format
        if (ampm === 'PM' && hours !== 12) {
          hours += 12;
        } else if (ampm === 'AM' && hours === 12) {
          hours = 0;
        }
        
        const result = `[${date} ${hours.toString().padStart(2, '0')}:${minutes}:00]`;
        return result;
      }
      
      // If it's already in 24-hour format (HH:MM:SS), keep it
      if (/^\d{1,2}:\d{2}:\d{2}$/.test(timeStr)) {
        const parts = timeStr.split(':');
        const hours = parts[0].padStart(2, '0');
        const result = `[${hours}:${parts[1]}:${parts[2]}]`;
        return result;
      }
      
      // If it's 12-hour format, convert to 24-hour for better alignment
      const match = timeStr.match(/^(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)$/i);
      if (match) {
        let hours = parseInt(match[1]);
        const minutes = match[2];
        const seconds = match[3];
        const ampm = match[4].toUpperCase();
        
        // Convert to 24-hour format
        if (ampm === 'PM' && hours !== 12) {
          hours += 12;
        } else if (ampm === 'AM' && hours === 12) {
          hours = 0;
        }
        
        const result = `[${hours.toString().padStart(2, '0')}:${minutes}:${seconds}]`;
        return result;
      }
      
      // Try to match format without seconds
      const matchNoSeconds = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (matchNoSeconds) {
        let hours = parseInt(matchNoSeconds[1]);
        const minutes = matchNoSeconds[2];
        const ampm = matchNoSeconds[3].toUpperCase();
        
        // Convert to 24-hour format
        if (ampm === 'PM' && hours !== 12) {
          hours += 12;
        } else if (ampm === 'AM' && hours === 12) {
          hours = 0;
        }
        
        const result = `[${hours.toString().padStart(2, '0')}:${minutes}:00]`;
        return result;
      }
      
      // Fallback: return original timestamp
      return rawTimestamp;
    } catch (e) {
      console.warn('[MW IDE Chat] Error formatting timestamp:', rawTimestamp, e);
      // If parsing fails, return original
      return rawTimestamp;
    }
  }

  /* ======= Message ingestion ======= */
  function parseMessage(node) {
    const rawTs = node.querySelector('[class*="timestamp"]')?.textContent?.trim() || '';
    const ts = formatTimestamp(rawTs);
    const isSystem = (node.className || '').includes('system');
    const name = node.querySelector('[class*="name"]')?.textContent?.trim() || '';

    const clone = node.cloneNode(true);
    clone.querySelector('[class*="timestamp"]')?.remove();
    clone.querySelector('[class*="name"]')?.remove();
    
    // Check if there are game links in the message
    const hasGameLinks = clone.querySelector('.ChatMessage_linkContainer__18Kv3');
    
    // Check if there are image links (chat-img class)
    const hasImageLinks = clone.querySelector('a.chat-img') || clone.querySelector('a[class*="chat-img"]');
    
    let text, htmlContent = null;
    
    if (hasGameLinks) {
      // Preserve HTML structure for game links
      htmlContent = clone.innerHTML.trim();
      // Also get text content for fallback
      text = clone.textContent.trim().replace(/\s+/g, ' ');
    } else {
      // No game links, just get text content
      text = clone.textContent.trim().replace(/\s+/g, ' ');
      
      // Check if there are any <a> tags (like tupian.li links) or image links
      if (clone.querySelector('a') || hasImageLinks) {
        htmlContent = clone.innerHTML.trim();
      }
    }
    
    // 移除消息开头的冒号和空格（通常在用户名后面）
    if (text.startsWith(': ')) {
      text = text.substring(2);
    } else if (text.startsWith(':')) {
      text = text.substring(1);
    }
    
    // 对于HTML内容，需要更仔细地处理": "前缀
    if (htmlContent) {
      // 如果HTML内容以": "开头（纯文本情况）
      if (htmlContent.startsWith(': ')) {
        htmlContent = htmlContent.substring(2);
      } else if (htmlContent.startsWith(':')) {
        htmlContent = htmlContent.substring(1);
      } else {
        // 如果HTML以标签开头，但文本内容有": "前缀，需要在第一个文本节点中移除
        // 这种情况通常发生在消息以物品链接等HTML元素开始时
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        
        // 查找第一个文本节点
        const walker = document.createTreeWalker(
          tempDiv,
          NodeFilter.SHOW_TEXT,
          null,
          false
        );
        
        const firstTextNode = walker.nextNode();
        if (firstTextNode && firstTextNode.textContent) {
          const originalText = firstTextNode.textContent;
          if (originalText.startsWith(': ')) {
            firstTextNode.textContent = originalText.substring(2);
            htmlContent = tempDiv.innerHTML;
          } else if (originalText.startsWith(':')) {
            firstTextNode.textContent = originalText.substring(1);
            htmlContent = tempDiv.innerHTML;
          }
        }
      }
    }

    return { ts, name, text, htmlContent, isSystem };
  }

  function signature(m) {
    return `${m.isSystem ? 'S' : 'U'}|${m.ts}|${m.name}|${m.text}`;
  }

  function formatLine(m) {
    // Determine the message content to display
    let messageContent;
    
    // 如果游戏链接被禁用，只使用纯文本内容
    if (!state.showGameLinks && m.htmlContent) {
      // 使用纯文本内容，但仍然处理图片链接和提及
      messageContent = processImageLinks(esc(m.text));
      messageContent = highlightMentions(messageContent);
    } else if (m.htmlContent) {
      // 正常处理HTML内容：先处理图片，再处理提及
      messageContent = processImageLinks(m.htmlContent);
      messageContent = highlightMentions(messageContent);
    } else {
      // 普通文本消息 - 先处理图片链接，再处理提及
      messageContent = processImageLinks(esc(m.text));
      messageContent = highlightMentions(messageContent);
    }
    
    if (m.isSystem || !m.name) {
      return `<div class="mw-ide-line mw-ide-sys"><div class="mw-ide-header"><span class="mw-ide-ts">${esc(m.ts)}</span><span class="mw-ide-name">System</span></div><span class="mw-ide-msg">${messageContent}</span></div>`;
    }
    
    const colorHash = getUserColorHash(m.name);
    return `<div class="mw-ide-line"><div class="mw-ide-header"><span class="mw-ide-ts">${esc(m.ts)}</span><span class="mw-ide-name clickable-username" data-user-hash="${colorHash}" data-username="${esc(m.name)}">${esc(m.name)}</span></div><span class="mw-ide-msg">${messageContent}</span></div>`;
  }

  function storeLine(channel, m) {
    const ch = ensureChannel(channel);
    const store = state.channels.get(ch);
    const sig = signature(m);
    if (store.sigSet.has(sig)) return false;

    store.sigSet.add(sig);
    store.sigQueue.push(sig);
    const formattedLine = formatLine(m);
    store.lines.push(formattedLine);

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
      
      // Allow messages with empty text if they have HTML content (like images)
      if (!m.text && !m.htmlContent) continue;
      
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
        
        // 如果在Excel模式下，也更新Excel聊天内容
        if (state.excelMode) {
          // 如果变化的频道是Excel模式下的活跃频道，更新内容
          if (channelName === excelChatState.activeExcelChannel) {
            updateExcelChatContent();
          } else {
            // 否则只更新频道标签状态（显示未读数）
            updateExcelChannelTabsStatus();
          }
        }
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

    // 确保用户名点击事件已绑定
    bindUsernameClickEvents(body);
    // 确保消息双击事件已绑定
    bindMessageDoubleClickEvents(body);

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

    // 确保用户名点击事件已绑定
    bindUsernameClickEvents(body);
    // 确保消息双击事件已绑定
    bindMessageDoubleClickEvents(body);

    if (CFG.autoScroll) body.scrollTop = body.scrollHeight;
  }

  // 绑定用户名点击事件
  function bindUsernameClickEvents(body) {
    if (!body || body.__mwUsernameBound) return;
    
    body.__mwUsernameBound = true;
    body.addEventListener('click', (e) => {
      const usernameEl = e.target.closest('.clickable-username');
      if (usernameEl) {
        e.preventDefault();
        e.stopPropagation();
        const userName = usernameEl.dataset.username;
        if (userName && userName !== 'System') {
          createUserMentionDropdown(userName, e);
        }
      }
    });
  }

  // 绑定消息双击事件
  function bindMessageDoubleClickEvents(body) {
    if (!body || body.__mwMessageDblClickBound) return;
    
    body.__mwMessageDblClickBound = true;
    body.addEventListener('dblclick', (e) => {
      const messageEl = e.target.closest('.mw-ide-line');
      if (messageEl) {
        const msgContentEl = messageEl.querySelector('.mw-ide-msg');
        if (msgContentEl) {
          e.preventDefault();
          e.stopPropagation();
          copyMessageToInput(msgContentEl.textContent);
        }
      }
    });
  }

  function copyMessageToInput(messageText) {
    const input = document.getElementById(CFG.localInputId);
    if (!input || !messageText) return;
    
    const trimmedText = messageText.trim();
    if (!trimmedText) return;
    
    // 将消息内容设置到输入框
    input.value = trimmedText;
    
    // 聚焦到输入框并将光标移到末尾
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
    
    // 触发input事件以确保任何监听器都能收到通知
    input.dispatchEvent(new Event('input', { bubbles: true }));
    
    // 显示一个简短的视觉反馈
    showCopyFeedback();
  }

  function showCopyFeedback() {
    // 创建一个临时的反馈提示
    const feedback = document.createElement('div');
    feedback.textContent = 'Message copied to input';
    feedback.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(120,200,255,.9);
      color: #0f111a;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 12px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "JetBrains Mono", monospace;
      z-index: 1000002;
      pointer-events: none;
      opacity: 1;
      transition: opacity 0.3s ease;
    `;
    
    const overlay = document.getElementById(CFG.overlayId);
    if (overlay) {
      overlay.appendChild(feedback);
      
      // 1.5秒后淡出并移除
      setTimeout(() => {
        feedback.style.opacity = '0';
        setTimeout(() => {
          if (feedback.parentNode) {
            feedback.parentNode.removeChild(feedback);
          }
        }, 300);
      }, 1500);
    }
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
      
      // 如果在Excel模式下，更新Excel聊天内容
      if (state.excelMode) {
        updateExcelChatContent();
      }
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

    // 如果在Excel模式下，更新Excel聊天内容
    if (state.excelMode) {
      updateExcelChatContent();
    }
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

  function uploadAndInsertImage(blob, inputElement) {
    // 保存原始状态
    const originalPlaceholder = inputElement.placeholder;
    const originalDisabled = inputElement.disabled;
    const sendBtn = DOM.sendBtn;
    const originalSendDisabled = sendBtn ? sendBtn.disabled : false;
    
    // 设置上传状态
    inputElement.placeholder = 'Uploading image...';
    inputElement.disabled = true;
    inputElement.style.opacity = '0.6';
    inputElement.style.cursor = 'not-allowed';
    
    // 禁用发送按钮
    if (sendBtn) {
      sendBtn.disabled = true;
      sendBtn.style.opacity = '0.6';
      sendBtn.style.cursor = 'not-allowed';
    }

    const statusDiv = document.createElement('div');
    statusDiv.className = 'upload-status';
    statusDiv.textContent = '正在上传图片...';
    document.body.appendChild(statusDiv);

    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    const formParts = [];

    function appendFile(name, file) {
      formParts.push(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"; filename="${file.name}"\r\nContent-Type: ${file.type}\r\n\r\n`);
      formParts.push(file);
      formParts.push('\r\n');
    }
    appendFile('file', blob);
    formParts.push(`--${boundary}--\r\n`);
    const bodyBlob = new Blob(formParts);

    function restoreInputState() {
      // 恢复输入框状态
      inputElement.placeholder = originalPlaceholder;
      inputElement.disabled = originalDisabled;
      inputElement.style.opacity = '';
      inputElement.style.cursor = '';
      
      // 恢复发送按钮状态
      if (sendBtn) {
        sendBtn.disabled = originalSendDisabled;
        sendBtn.style.opacity = '';
        sendBtn.style.cursor = '';
      }
    }

    GM_xmlhttpRequest({
      method: 'POST',
      url: 'https://tupian.li/api/v1/upload',
      data: bodyBlob,
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Accept': 'application/json'
      },
      binary: true,
      onload: function(response) {
        statusDiv.remove();
        restoreInputState();
        
        if (response.status === 200) {
          try {
            const result = JSON.parse(response.responseText);
            if (result.status) {
              const url = result.data.links.url;

              const currentValue = inputElement.value;
              const newValue = currentValue ? `${currentValue} ${url}` : url;

              inputElement.value = newValue;
              inputElement.dispatchEvent(new Event('input', { bubbles: true }));
              inputElement.focus();

              const successDiv = document.createElement('div');
              successDiv.className = 'upload-status';
              successDiv.textContent = '上传成功！';
              document.body.appendChild(successDiv);
              setTimeout(() => successDiv.remove(), 2000);
            } else {
              throw new Error(result.message || '上传失败');
            }
          } catch (e) {
            showUploadError('解析失败: ' + e.message);
          }
        } else {
          showUploadError('服务器错误: ' + response.status);
        }
      },
      onerror: function(error) {
        statusDiv.remove();
        restoreInputState();
        showUploadError('上传失败: ' + error.statusText);
      }
    });

    function showUploadError(message) {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'upload-status error';
      errorDiv.textContent = message;
      document.body.appendChild(errorDiv);
      setTimeout(() => errorDiv.remove(), 3000);
      console.error(message);
    }
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

    // 如果当前处于 Paused 状态，发送消息后自动跳转到底部
    if (state.isPaused) {
      console.log('[DEBUG] User sent message while paused, jumping to bottom');
      // 使用 setTimeout 确保消息已经被处理并显示
      setTimeout(() => {
        jumpToBottomAndResume();
      }, 100);
    }
  }

  function generateColumnLetters() {
    let capital = []
    let columnLetters = []
    for (let i=65;i<91;i++) capital.push(String.fromCharCode(i))
    Array('', 'A', 'B', 'C').forEach(n => capital.forEach(c => columnLetters.push(`${n}${c}`)))
    return columnLetters
  }

  function generateExcelTable(rows = 50, cols = 26) {
    const columnLetters = generateColumnLetters();
    
    // 只生成表格行，不包含表头（因为header中的h4已经是列标签了）
    let bodyHtml = '';
    for (let row = 1; row <= rows; row++) {
      bodyHtml += `<tr><td class="row-header">${row}</td>`;
      for (let col = 0; col < cols; col++) {
        bodyHtml += `<td contenteditable="true" data-row="${row}" data-col="${columnLetters[col]}"></td>`;
      }
      bodyHtml += '</tr>';
    }
    
    return `
      <table class="hld__excel-table">
        <tbody>${bodyHtml}</tbody>
      </table>
    `;
  }

  function toggleExcelMode(enabled) {
    if (enabled) {
      createExcelInterface();
    } else {
      removeExcelInterface();
    }
  }

  function createExcelInterface() {
    // Remove existing Excel elements
    removeExcelInterface();
    
    // 初始化Excel聊天状态
    excelChatState.activeExcelChannel = state.activeChannel;
    
    const columnLetters = generateColumnLetters();
    
    // Get the IDE overlay element
    const overlay = document.getElementById(CFG.overlayId);
    if (!overlay) {
      console.error('[Excel] IDE overlay not found');
      return;
    }
    
    if (state.excelTheme === 'tencent') {
      // 腾讯文档风格 - 插入到IDE overlay中
      overlay.insertAdjacentHTML('beforeend', `
        <div class="hld__excel-div hld__excel-header">
          <div class="hld__excel-titlebar">
            <div class="hld__excel-titlebar-content hld__excel-icon24" style="margin:2px 2px 2px 10px;background-image:url(${getExcelTheme(state.excelTheme, 'icon_1')});"></div>
            <div class="hld__excel-titlebar-content hld__excel-icon12" style="background-image:url(${getExcelTheme(state.excelTheme, 'icon_2')});"></div>
            <div style="height: 24px;border-right: 1px solid rgb(0, 0, 0);opacity: 0.06;margin: 0 12px;vertical-align: middle;"></div>
            <div class="hld__excel-titlebar-title">工作簿1</div>
            <div class="hld__excel-titlebar-content hld__excel-icon16" style="margin-left: 10px;background-image:url(${getExcelTheme(state.excelTheme, 'icon_3')});"></div>
            <div class="hld__excel-titlebar-content hld__excel-icon16" style="margin-left: 12px;background-image:url(${getExcelTheme(state.excelTheme, 'icon_4')});"></div>
            <div class="hld__excel-titlebar-content hld__excel-icon16" style="margin-left: 10px;background-image:url(${getExcelTheme(state.excelTheme, 'icon_5')});"></div>
            <div style="margin-left: 5px;font-size: 12px;line-height: 20px;height: 18px;;color: #000;opacity: 0.48;font-weight:400;">上次修改是在2小时前进行的</div>
            <div style="flex-grow: 1;"></div>
            <div style="height: 24px;border-right: 1px solid rgb(0, 0, 0);opacity: 0.06;margin: 0 12px;vertical-align: middle;"></div>
            <div style="width:28px;height:28px;border-radius: 4px;background: #e9e9e9;text-align: center;line-height: 32px;">🐟︎</div>
          </div>
          <div class="hld__excel-toolbar">
            ${Array.from({length: 4}, (_, i) => '<div class="hld__excel-titlebar-content hld__excel-icon20" style="margin:0 6px;background-image:url(' + getExcelTheme(state.excelTheme, "icon_"+(10+i)) + ');"></div>').join('')}
            <div style="height: 16px;border-right: 1px solid rgb(0, 0, 0);opacity: 0.06;margin: 0 4px;vertical-align: middle;"></div>
            <div class="hld__excel-titlebar-content hld__excel-icon20" style="margin-left: 8px;background-image:url(${getExcelTheme(state.excelTheme, 'icon_14')});"></div>
            <div style="padding: 0 2px;">插入</div>
            <div class="hld__excel-titlebar-content hld__excel-icon12" style="background-image:url(${getExcelTheme(state.excelTheme, 'icon_2')});"></div>
            <div style="height: 16px;border-right: 1px solid rgb(0, 0, 0);opacity: 0.06;margin: 0 8px;vertical-align: middle;"></div>
            <div style="padding: 0 30px 0 4px;">常规</div>
            <div class="hld__excel-titlebar-content hld__excel-icon12" style="background-image:url(${getExcelTheme(state.excelTheme, 'icon_2')});"></div>
            <div class="hld__excel-titlebar-content hld__excel-icon20" style="margin-left: 12px;background-image:url(${getExcelTheme(state.excelTheme, 'icon_15')});"></div>
            <div style="margin-left: 1px;">
                <div class="hld__excel-titlebar-content hld__excel-icon12" style="transform: rotate(180deg);background-image:url(${getExcelTheme(state.excelTheme, 'icon_2')});"></div>
                <div class="hld__excel-titlebar-content hld__excel-icon12" style="background-image:url(${getExcelTheme(state.excelTheme, 'icon_2')});"></div>
            </div>
            <div style="height: 16px;border-right: 1px solid #000;opacity: 0.06;margin: 0 4px;vertical-align: middle;"></div>
            <div style="padding: 0 4px 0 16px;">默认字体</div>
            <div class="hld__excel-titlebar-content hld__excel-icon12" style="background-image:url(${getExcelTheme(state.excelTheme, 'icon_2')});"></div>
            <div style="padding: 0 4px 0 13px;">10</div>
            <div class="hld__excel-titlebar-content hld__excel-icon12" style="background-image:url(${getExcelTheme(state.excelTheme, 'icon_2')});"></div>
            <div class="hld__excel-titlebar-content hld__excel-icon20" style="margin-left: 10px;background-image:url(${getExcelTheme(state.excelTheme, 'icon_16')});"></div>
            <div class="hld__excel-titlebar-pick">
                <div class="hld__excel-titlebar-content hld__excel-icon20" style="background-image:url(${getExcelTheme(state.excelTheme, 'icon_17')});"></div>
                <div class="hld__excel-titlebar-indication" style="background-color: #000;"></div>
            </div>
            <div class="hld__excel-titlebar-content hld__excel-icon12" style="margin-left: 4px;background-image:url(${getExcelTheme(state.excelTheme, 'icon_2')});"></div>
            <div class="hld__excel-titlebar-pick">
                <div class="hld__excel-titlebar-content hld__excel-icon20" style="background-image:url(${getExcelTheme(state.excelTheme, 'icon_18')});"></div>
                <div class="hld__excel-titlebar-indication" style="background-color: #8cddfa;"></div>
            </div>
            <div class="hld__excel-titlebar-content hld__excel-icon12" style="margin-left: 4px;background-image:url(${getExcelTheme(state.excelTheme, 'icon_2')});"></div>
            <div class="hld__excel-titlebar-content hld__excel-icon20" style="margin-left: 10px;background-image:url(${getExcelTheme(state.excelTheme, 'icon_19')});"></div>
            <div class="hld__excel-titlebar-content hld__excel-icon12" style="margin-left: 2px;background-image:url(${getExcelTheme(state.excelTheme, 'icon_2')});"></div>
            <div class="hld__excel-titlebar-content hld__excel-icon20" style="margin-left: 10px;background-image:url(${getExcelTheme(state.excelTheme, 'icon_20')});"></div>
            <div style="height: 16px;border-right: 1px solid #000;opacity: 0.06;margin: 0 10px;vertical-align: middle;"></div>
            ${Array.from({length: 4}, (_, i) => '<div class="hld__excel-titlebar-content hld__excel-icon20" style="background-image:url(' + getExcelTheme(state.excelTheme, "icon_"+(21+i)) + ');"></div><div class="hld__excel-titlebar-content hld__excel-icon12" style="margin-left: 2px;margin-right: '+ (i==3?'0':'10') +'px;background-image:url(' + getExcelTheme(state.excelTheme, "icon_2") + ');"></div>').join('')}
            <div style="height: 16px;border-right: 1px solid #000;opacity: 0.06;margin: 0 10px;vertical-align: middle;"></div>
            <div class="hld__excel-titlebar-content hld__excel-icon20" style="background-image:url(${getExcelTheme(state.excelTheme, 'icon_25')});"></div>
            <div class="hld__excel-titlebar-content hld__excel-icon12" style="margin-left: 4px;background-image:url(${getExcelTheme(state.excelTheme, 'icon_2')});"></div>
            <div style="height: 16px;border-right: 1px solid #000;opacity: 0.06;margin: 0 10px;vertical-align: middle;"></div>
            ${Array.from({length: 4}, (_, i) => '<div class="hld__excel-titlebar-content hld__excel-icon20" style="background-image:url(' + getExcelTheme(state.excelTheme, "icon_"+(26+i)) + ');"></div><div class="hld__excel-titlebar-content hld__excel-icon12" style="margin-left: 2px;margin-right: '+ (i==3?'0':'10') +'px;background-image:url(' + getExcelTheme(state.excelTheme, "icon_2") + ');"></div>').join('')}
            <div style="height: 16px;border-right: 1px solid #000;opacity: 0.06;margin: 0 10px;vertical-align: middle;"></div>
            <div class="hld__excel-titlebar-content hld__excel-icon20" style="margin-left: 10px;background-image:url(${getExcelTheme(state.excelTheme, 'icon_20')});"></div>
            <div style="flex-grow: 1;"></div>
          </div>
          <div class="hld__excel-formulabar">
            <div style="border-right: 1px solid #e0e2e4;color: #777;text-align: center;width: 50px;font-size: 12px;height: 25px;line-height: 25px;font-weight:400;">A1</div>
            <input type="text" class="hld__excel-formulabar-input" placeholder="输入消息并按回车发送..." />
          </div>
          <div class="hld__excel-h4">
            <div class="hld__excel-sub"><div></div></div>
            ${columnLetters.map(c => '<div class="hld__excel-column">'+c+'</div>').join('')}
          </div>
        </div>
        <div class="hld__excel-div hld__excel-body" style="top: 105px; bottom: 24px;">
          ${generateExcelTable()}
        </div>
        <div class="hld__excel-div hld__excel-footer">
          <div class="hld__excel-icon24" style="margin-left: 10px;background-image:url(${getExcelTheme(state.excelTheme, 'icon_33')});"></div><div class="hld__excel-icon24" style="margin-left: 10px;background-image:url(${getExcelTheme(state.excelTheme, 'icon_34')});"></div><div class="hld__excel-sheet-tab">
            <div class="hld__excel-sheet-name">
                <div>工作表1</div>
                <div class="hld__excel-icon12" style="margin-left: 4px;background-image:url(${getExcelTheme(state.excelTheme, 'icon_2')});"></div>
            </div>
            <div class="hld__excel-sheet-underblock"></div>
        </div><div id="excel-channel-tabs-container"></div><div style="flex-grow: 1;"></div><div class="hld__excel-icon24" style="margin-left: 10px;background-image:url(${getExcelTheme(state.excelTheme, 'icon_35')});"></div><div class="hld__excel-icon12" style="margin-left: 2px;background-image:url(${getExcelTheme(state.excelTheme, 'icon_2')});"></div><div style="height: 16px;border-right: 1px solid #000;opacity: 0.12;margin: 0 10px;vertical-align: middle;"></div><div class="hld__excel-icon24" style="background-image:url(${getExcelTheme(state.excelTheme, 'icon_36')});"></div><div class="hld__excel-footer-item" style="font-size: 20px;margin-left:20px;">-</div><div class="hld__excel-footer-item" style="font-weight: 400">100%</div><div class="hld__excel-footer-item" style="font-size: 20px;">+</div><div style="width:10px;"></div>
        </div>
      `);
    } else if (state.excelTheme === 'office') {
      // Office风格 - 插入到IDE overlay中
      overlay.insertAdjacentHTML('beforeend', `
        <div class="hld__excel-div hld__excel-header">
          <div class="hld__excel-h1">
            <div class="hld__excel-title">工作簿1 - Excel</div>
            <img class="hld__excel-img-h1-l1" src="${getExcelTheme(state.excelTheme, 'H_L_1')}">
            <img class="hld__excel-img-h1-r1" src="${getExcelTheme(state.excelTheme, 'H_R_1')}">
          </div>
          <div class="hld__excel-h2">
            <img class="hld__excel-img-h2-l1" src="${getExcelTheme(state.excelTheme, 'H_L_2')}">
            <img class="hld__excel-img-h2-r1" src="${getExcelTheme(state.excelTheme, 'H_R_2')}">
          </div>
          <div class="hld__excel-h3">
            <img class="hld__excel-img-h3-l1" src="${getExcelTheme(state.excelTheme, 'H_L_3')}">
            <img class="hld__excel-img-h3-r1" src="${getExcelTheme(state.excelTheme, 'H_R_3')}">
            <div class="hld__excel-fx">
              <div class="hld__excel-fx-coordinate">A1</div>
              <input type="text" class="hld__excel-fx-input" placeholder="输入消息并按回车发送..." />
            </div>
          </div>
          <div class="hld__excel-h4">
            <div class="hld__excel-sub"><div></div></div>
            ${columnLetters.map(c => '<div class="hld__excel-column">'+c+'</div>').join('')}
          </div>
        </div>
        <div class="hld__excel-div hld__excel-body" style="top: 221px; bottom: 24px;">
          ${generateExcelTable()}
        </div>
        <div class="hld__excel-div hld__excel-footer">
          <div class="hld__excel-f1">
            <img class="hld__excel-img-f1-l1" src="${getExcelTheme(state.excelTheme, 'F_L_1')}">
            <img class="hld__excel-img-f1-r1" src="${getExcelTheme(state.excelTheme, 'F_R_1')}">
          </div>
          <div id="excel-channel-tabs-container"></div>
        </div>
      `);
    } else {
      // WPS风格 (默认) - 插入到IDE overlay中
      overlay.insertAdjacentHTML('beforeend', `
        <div class="hld__excel-div hld__excel-header">
          <div class="hld__excel-h1">
            <div class="hld__excel-title">工作簿1 - Excel</div>
            <img class="hld__excel-img-h1-l1" src="${getExcelTheme(state.excelTheme, 'H_L_1')}">
            <img class="hld__excel-img-h1-r1" src="${getExcelTheme(state.excelTheme, 'H_R_1')}">
          </div>
          <div class="hld__excel-h2">
            <img class="hld__excel-img-h2-l1" src="${getExcelTheme(state.excelTheme, 'H_L_2')}">
            <img class="hld__excel-img-h2-r1" src="${getExcelTheme(state.excelTheme, 'H_R_2')}">
          </div>
          <div class="hld__excel-h3">
            <img class="hld__excel-img-h3-l1" src="${getExcelTheme(state.excelTheme, 'H_L_3')}">
            <img class="hld__excel-img-h3-r1" src="${getExcelTheme(state.excelTheme, 'H_R_3')}">
            <div class="hld__excel-fx">
              <div class="hld__excel-fx-coordinate">A1</div>
              <input type="text" class="hld__excel-fx-input" placeholder="输入消息并按回车发送..." />
            </div>
          </div>
          <div class="hld__excel-h4">
            <div class="hld__excel-sub"><div></div></div>
            ${columnLetters.map(c => '<div class="hld__excel-column">'+c+'</div>').join('')}
          </div>
        </div>
        <div class="hld__excel-div hld__excel-body" style="top: 196px; bottom: 24px;">
          ${generateExcelTable()}
        </div>
        <div class="hld__excel-div hld__excel-footer">
          <div class="hld__excel-f1">
            <img class="hld__excel-img-f1-l1" src="${getExcelTheme(state.excelTheme, 'F_L_1')}">
            <img class="hld__excel-img-f1-r1" src="${getExcelTheme(state.excelTheme, 'F_R_1')}">
          </div>
          <div class="hld__excel-f2">
            <img class="hld__excel-img-fl2" src="${getExcelTheme(state.excelTheme, 'F_L_2')}">
            <img class="hld__excel-img-fr2" src="${getExcelTheme(state.excelTheme, 'F_R_2')}">
          </div>
          <div id="excel-channel-tabs-container"></div>
        </div>
      `);
    }
    
    // 显示Excel元素并隐藏IDE内容
    const excelElements = document.querySelectorAll('.hld__excel-div');
    excelElements.forEach(el => {
      el.style.display = 'block';
    });
    
    // 隐藏IDE的主要内容
    const topbar = document.getElementById(CFG.topbarId);
    const layout = document.getElementById(CFG.layoutId);
    if (topbar) topbar.style.display = 'none';
    if (layout) layout.style.display = 'none';
    
    // 添加表格交互功能
    addExcelTableInteractions();
  }

  function addExcelTableInteractions() {
    const table = document.querySelector('.hld__excel-table');
    if (!table) return;
    
    let selectedCell = null;
    
    // 添加单元格点击事件
    table.addEventListener('click', (e) => {
      const cell = e.target.closest('td[contenteditable]');
      if (!cell) return;
      
      // 清除之前选中的单元格
      if (selectedCell) {
        selectedCell.classList.remove('selected');
      }
      
      // 选中当前单元格
      cell.classList.add('selected');
      selectedCell = cell;
      
      // 更新公式栏显示
      const row = cell.dataset.row;
      const col = cell.dataset.col;
      
      // 根据主题选择正确的坐标显示元素
      let coordinateElement;
      if (state.excelTheme === 'tencent') {
        coordinateElement = document.querySelector('.hld__excel-formulabar-coordinate');
      } else {
        // office 和 wps 主题使用 hld__excel-fx-coordinate
        coordinateElement = document.querySelector('.hld__excel-fx-coordinate');
      }
      
      if (coordinateElement) {
        coordinateElement.textContent = `${col}${row}`;
      }
      
      // 聚焦到单元格
      cell.focus();
    });
    
    // 添加键盘导航
    table.addEventListener('keydown', (e) => {
      if (!selectedCell) return;
      
      const currentRow = parseInt(selectedCell.dataset.row);
      const currentCol = selectedCell.dataset.col;
      const columnLetters = generateColumnLetters();
      const currentColIndex = columnLetters.indexOf(currentCol);
      
      let newRow = currentRow;
      let newColIndex = currentColIndex;
      
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          newRow = Math.max(1, currentRow - 1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          newRow = Math.min(50, currentRow + 1);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          newColIndex = Math.max(0, currentColIndex - 1);
          break;
        case 'ArrowRight':
          e.preventDefault();
          newColIndex = Math.min(25, currentColIndex + 1);
          break;
        case 'Tab':
          e.preventDefault();
          newColIndex = currentColIndex + 1;
          if (newColIndex > 25) {
            newColIndex = 0;
            newRow = Math.min(50, currentRow + 1);
          }
          break;
        case 'Enter':
          e.preventDefault();
          newRow = Math.min(50, currentRow + 1);
          break;
      }
      
      if (newRow !== currentRow || newColIndex !== currentColIndex) {
        const newCol = columnLetters[newColIndex];
        const newCell = table.querySelector(`td[data-row="${newRow}"][data-col="${newCol}"]`);
        if (newCell) {
          newCell.click();
        }
      }
    });
    
    // 初始化聊天室集成
    initializeChatInExcel();
    
    // 添加公式栏输入框事件监听
    setupFormulaBarInput();
    
    // 默认选中A1单元格
    const firstCell = table.querySelector('td[data-row="1"][data-col="A"]');
    if (firstCell) {
      firstCell.click();
    }
  }

  function setupFormulaBarInput() {
    // 根据主题选择正确的输入框
    let inputElement;
    if (state.excelTheme === 'tencent') {
      inputElement = document.querySelector('.hld__excel-formulabar-input');
    } else {
      // office 和 wps 主题使用 hld__excel-fx-input
      inputElement = document.querySelector('.hld__excel-fx-input');
    }
    
    if (!inputElement) return;
    
    // 监听回车键发送消息
    inputElement.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const message = inputElement.value.trim();
        if (message) {
          sendExcelMessage(message);
          inputElement.value = ''; // 清空输入框
        }
      }
    });
    
    // 监听Escape键清空输入框
    inputElement.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        inputElement.value = '';
        inputElement.blur(); // 失去焦点
      }
    });
  }

  function sendExcelMessage(message) {
    // 使用现有的发送消息逻辑
    const origInput = findOriginalInput();
    if (origInput) {
      setOriginalInputValue(origInput, message);
      
      const sendBtn = findOriginalSendButton();
      if (sendBtn) {
        sendBtn.click();
      } else {
        // fallback: try form submit
        const form = origInput?.closest('form');
        if (form) form.requestSubmit?.();
      }
    }
  }

  // Excel聊天室集成相关变量
  let excelChatState = {
    currentRow: 1,
    maxRows: 50,
    autoRefreshInterval: null,
    lastMessageCount: 0,
    activeExcelChannel: 'default' // Excel模式下的活跃频道
  };

  function initializeChatInExcel() {
    // 设置表头
    setupExcelChatHeaders();
    
    // 生成频道标签（初始化时强制重新生成）
    generateExcelChannelTabs(true);
    
    // 开始自动刷新聊天内容
    startExcelChatAutoRefresh();
    
    // 立即加载一次聊天内容
    updateExcelChatContent();
  }

  // 存储已生成的频道列表，用于检测变化
  let lastGeneratedChannels = [];

  function generateExcelChannelTabs(forceRegenerate = false) {
    const tabsContainer = document.getElementById('excel-channel-tabs-container');
    if (!tabsContainer) return;
    
    // 获取所有可用的频道
    const channels = Array.from(state.knownChannels);
    if (channels.length === 0) {
      channels.push('default');
    }
    
    // 检查频道列表是否发生变化
    const channelsChanged = forceRegenerate || 
      channels.length !== lastGeneratedChannels.length ||
      !channels.every(ch => lastGeneratedChannels.includes(ch));
    
    if (channelsChanged) {
      // 频道列表发生变化，需要重新生成所有标签
      console.log('[Excel] Channel list changed, regenerating tabs');
      lastGeneratedChannels = [...channels];
      
      // 清空现有标签
      tabsContainer.innerHTML = '';
      
      // 为每个频道创建独立的sheet-tab
      channels.forEach((channelName, index) => {
        const tab = document.createElement('div');
        tab.className = 'hld__excel-sheet-tab';
        tab.style.cursor = 'pointer';
        tab.dataset.channel = channelName; // 添加数据属性用于后续查找
        
        // 检查是否是当前活跃频道
        const isActive = channelName === excelChatState.activeExcelChannel;
        
        // 获取频道的未读消息数
        const store = state.channels.get(channelName);
        const unreadCount = store ? store.unread : 0;
        
        // 创建显示名称
        const displayName = unreadCount > 0 ? `${channelName} (${unreadCount})` : channelName;
        
        // 创建标签内容，使用原有的结构
        tab.innerHTML = `
          <div class="hld__excel-sheet-name" style="${isActive ? 'background: #fff; border-color: #999;' : 'background: #f0f0f0;'}">
            <div class="channel-display-name">${displayName}</div>
            <div class="hld__excel-icon12" style="margin-left: 4px;background-image:url(${getExcelTheme(state.excelTheme, 'icon_2')});"></div>
          </div>
          <div class="hld__excel-sheet-underblock"></div>
        `;
        
        // 添加点击事件
        tab.addEventListener('click', () => {
          switchExcelChannel(channelName);
        });
        
        tabsContainer.appendChild(tab);
      });
    } else {
      // 频道列表没有变化，只更新现有标签的状态
      updateExcelChannelTabsStatus();
    }
  }

  function updateExcelChannelTabsStatus() {
    const tabsContainer = document.getElementById('excel-channel-tabs-container');
    if (!tabsContainer) return;
    
    // 更新每个标签的状态
    const tabs = tabsContainer.querySelectorAll('.hld__excel-sheet-tab');
    tabs.forEach(tab => {
      const channelName = tab.dataset.channel;
      if (!channelName) return;
      
      const isActive = channelName === excelChatState.activeExcelChannel;
      const store = state.channels.get(channelName);
      const unreadCount = store ? store.unread : 0;
      
      // 创建显示名称
      const displayName = unreadCount > 0 ? `${channelName} (${unreadCount})` : channelName;
      
      // 更新显示名称
      const displayNameElement = tab.querySelector('.channel-display-name');
      if (displayNameElement) {
        displayNameElement.textContent = displayName;
      }
      
      // 更新活跃状态样式
      const sheetName = tab.querySelector('.hld__excel-sheet-name');
      if (sheetName) {
        sheetName.style.background = isActive ? '#fff' : '#f0f0f0';
        sheetName.style.borderColor = isActive ? '#999' : '#ccc';
      }
    });
  }

  function switchExcelChannel(channelName) {
    // 更新Excel模式下的活跃频道
    excelChatState.activeExcelChannel = channelName;
    
    // 同时更新主系统的活跃频道
    switchToChannel(channelName);
    
    // 只更新标签状态，不重新生成
    updateExcelChannelTabsStatus();
    
    // 立即更新聊天内容
    updateExcelChatContent();
  }

  function setupExcelChatHeaders() {
    const table = document.querySelector('.hld__excel-table');
    if (!table) return;
    
    // 设置A列为时间，B列为用户名，C列为消息
    const timeCell = table.querySelector('td[data-row="1"][data-col="A"]');
    const userCell = table.querySelector('td[data-row="1"][data-col="B"]');
    const messageCell = table.querySelector('td[data-row="1"][data-col="C"]');
    
    if (timeCell) {
      timeCell.textContent = '时间';
      timeCell.style.fontWeight = 'bold';
      timeCell.style.backgroundColor = '#f0f0f0';
      timeCell.contentEditable = 'false';
    }
    
    if (userCell) {
      userCell.textContent = '用户名';
      userCell.style.fontWeight = 'bold';
      userCell.style.backgroundColor = '#f0f0f0';
      userCell.contentEditable = 'false';
    }
    
    if (messageCell) {
      messageCell.textContent = '消息';
      messageCell.style.fontWeight = 'bold';
      messageCell.style.backgroundColor = '#f0f0f0';
      messageCell.contentEditable = 'false';
    }
    
    // 调整列宽
    adjustExcelColumnWidths();
  }

  function adjustExcelColumnWidths() {
    const table = document.querySelector('.hld__excel-table');
    if (!table) return;
    
    // 时间列 (A列) - 较窄
    const timeCells = table.querySelectorAll('td[data-col="A"]');
    timeCells.forEach(cell => {
      cell.style.width = '120px';
      cell.style.minWidth = '120px';
      cell.style.maxWidth = '120px';
    });
    
    // 用户名列 (B列) - 中等宽度
    const userCells = table.querySelectorAll('td[data-col="B"]');
    userCells.forEach(cell => {
      cell.style.width = '100px';
      cell.style.minWidth = '100px';
      cell.style.maxWidth = '100px';
    });
    
    // 消息列 (C列) - 较宽
    const messageCells = table.querySelectorAll('td[data-col="C"]');
    messageCells.forEach(cell => {
      cell.style.width = '300px';
      cell.style.minWidth = '300px';
      cell.style.maxWidth = '300px';
      cell.style.whiteSpace = 'pre-wrap';
      cell.style.wordBreak = 'break-word';
    });
  }

  function startExcelChatAutoRefresh() {
    // 清除现有的定时器
    if (excelChatState.autoRefreshInterval) {
      clearInterval(excelChatState.autoRefreshInterval);
    }
    
    // 每2秒刷新一次聊天内容
    excelChatState.autoRefreshInterval = setInterval(() => {
      updateExcelChatContent();
    }, 2000);
  }

  function stopExcelChatAutoRefresh() {
    if (excelChatState.autoRefreshInterval) {
      clearInterval(excelChatState.autoRefreshInterval);
      excelChatState.autoRefreshInterval = null;
    }
  }

  function updateExcelChatContent() {
    const table = document.querySelector('.hld__excel-table');
    if (!table) return;
    
    // 获取Excel模式下当前活跃频道的消息
    const ch = ensureChannel(excelChatState.activeExcelChannel);
    const store = state.channels.get(ch);
    if (!store || !store.lines.length) return;
    
    // 解析消息并填充到表格中
    const messages = parseMessagesForExcel(store.lines);
    fillExcelTable(messages);
    
    // 只更新频道标签状态（刷新未读数等），不重新生成
    updateExcelChannelTabsStatus();
  }

  function parseMessagesForExcel(lines) {
    const messages = [];
    
    lines.forEach(line => {
      // 解析HTML格式的消息行
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = line;
      
      const tsElement = tempDiv.querySelector('.mw-ide-ts');
      const nameElement = tempDiv.querySelector('.mw-ide-name');
      const msgElement = tempDiv.querySelector('.mw-ide-msg');
      
      if (tsElement && nameElement && msgElement) {
        const timestamp = tsElement.textContent.trim();
        const username = nameElement.textContent.trim();
        const message = msgElement.textContent.trim();
        
        messages.push({
          timestamp: timestamp,
          username: username,
          message: message
        });
      }
    });
    
    return messages;
  }

  function fillExcelTable(messages) {
    const table = document.querySelector('.hld__excel-table');
    if (!table) return;
    
    // 清除现有的聊天内容（保留表头）
    for (let row = 2; row <= excelChatState.maxRows; row++) {
      const timeCell = table.querySelector(`td[data-row="${row}"][data-col="A"]`);
      const userCell = table.querySelector(`td[data-row="${row}"][data-col="B"]`);
      const messageCell = table.querySelector(`td[data-row="${row}"][data-col="C"]`);
      
      if (timeCell) {
        timeCell.textContent = '';
        timeCell.style.backgroundColor = '';
        timeCell.contentEditable = 'true';
      }
      if (userCell) {
        userCell.textContent = '';
        userCell.style.backgroundColor = '';
        userCell.contentEditable = 'true';
      }
      if (messageCell) {
        messageCell.textContent = '';
        messageCell.style.backgroundColor = '';
        messageCell.contentEditable = 'true';
      }
    }
    
    // 填充最新的消息（最多49条，因为第1行是表头）
    const maxMessages = Math.min(messages.length, excelChatState.maxRows - 1);
    const startIndex = Math.max(0, messages.length - maxMessages);
    
    for (let i = 0; i < maxMessages; i++) {
      const message = messages[startIndex + i];
      const row = i + 2; // 从第2行开始（第1行是表头）
      
      const timeCell = table.querySelector(`td[data-row="${row}"][data-col="A"]`);
      const userCell = table.querySelector(`td[data-row="${row}"][data-col="B"]`);
      const messageCell = table.querySelector(`td[data-row="${row}"][data-col="C"]`);
      
      if (timeCell && userCell && messageCell) {
        timeCell.textContent = message.timestamp;
        timeCell.title = message.timestamp; // 添加title属性，鼠标悬停时显示完整时间戳
        timeCell.contentEditable = 'false';
        timeCell.style.backgroundColor = '#f9f9f9';
        
        userCell.textContent = message.username;
        userCell.title = message.username; // 添加title属性，鼠标悬停时显示完整用户名
        userCell.contentEditable = 'false';
        userCell.style.backgroundColor = '#f9f9f9';
        
        messageCell.textContent = message.message;
        messageCell.title = message.message; // 添加title属性，鼠标悬停时显示完整消息
        messageCell.contentEditable = 'false';
        messageCell.style.backgroundColor = '#f9f9f9';
        
        // 如果是新消息，高亮显示
        if (i >= maxMessages - (messages.length - excelChatState.lastMessageCount)) {
          timeCell.style.backgroundColor = '#e6f3ff';
          userCell.style.backgroundColor = '#e6f3ff';
          messageCell.style.backgroundColor = '#e6f3ff';
        }
      }
    }
    
    // 更新消息计数
    excelChatState.lastMessageCount = messages.length;
    
    // 自动滚动到最新消息
    scrollToLatestMessage();
  }

  function scrollToLatestMessage() {
    const table = document.querySelector('.hld__excel-table');
    const excelBody = document.querySelector('.hld__excel-div.hld__excel-body');
    if (!table || !excelBody) return;
    
    // 找到最后一条有内容的消息行
    let lastMessageRow = 1;
    for (let row = 2; row <= excelChatState.maxRows; row++) {
      const messageCell = table.querySelector(`td[data-row="${row}"][data-col="C"]`);
      if (messageCell && messageCell.textContent.trim()) {
        lastMessageRow = row;
      }
    }
    
    // 滚动到最后一条消息
    if (lastMessageRow > 1) {
      const lastCell = table.querySelector(`td[data-row="${lastMessageRow}"][data-col="A"]`);
      if (lastCell) {
        lastCell.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    }
  }

  function removeExcelInterface() {
    // 停止聊天自动刷新
    stopExcelChatAutoRefresh();
    
    const excelElements = document.querySelectorAll('.hld__excel-div');
    excelElements.forEach(el => {
      el.remove();
    });
    
    // 恢复IDE的主要内容
    const topbar = document.getElementById(CFG.topbarId);
    const layout = document.getElementById(CFG.layoutId);
    if (topbar) topbar.style.display = 'flex';
    if (layout) layout.style.display = 'grid';
  }

  /* ======= UI ======= */
  function createUI() {
    if ($('#' + CFG.overlayId)) return;

    document.body.insertAdjacentHTML('beforeend', `
      <div id="${CFG.toggleBtnId}">IDE Chat: OFF (${hotkeyText})</div>
      <div id="${CFG.overlayId}">
        <div id="${CFG.topbarId}">
          <div class="title">MilkyWayIdle • IDE Chat View</div>
          <button class="btn" data-action="font-size"><span class="btn-text">Font: ${state.fontSize}px</span></button>
          <button class="btn" data-action="toggle-images">Images: ${state.showImages ? 'ON' : 'OFF'}</button>
          <button class="btn" data-action="toggle-gamelinks">Game Links: ${state.showGameLinks ? 'ON' : 'OFF'}</button>
          <button class="btn" data-action="toggle-scroll">AutoScroll: ON</button>
          <button class="btn" data-action="excel-mode">Excel: ${state.excelMode ? 'ON' : 'OFF'}</button>
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
      fontBtn.appendChild(FontManager.createDropdown());
      // 确保按钮文本是最新的
      FontManager.updateButton();
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
      if (a === 'toggle-images') {
        state.showImages = !state.showImages;
        setSetting('showImages', state.showImages);
        btn.textContent = `Images: ${state.showImages ? 'ON' : 'OFF'}`;
        // 重新渲染当前频道以应用更改
        renderBodyFull();
      }
      if (a === 'toggle-gamelinks') {
        state.showGameLinks = !state.showGameLinks;
        setSetting('showGameLinks', state.showGameLinks);
        btn.textContent = `Game Links: ${state.showGameLinks ? 'ON' : 'OFF'}`;
        // 重新渲染当前频道以应用更改
        renderBodyFull();
      }
      if (a === 'excel-mode') {
        state.excelMode = !state.excelMode;
        btn.textContent = `Excel: ${state.excelMode ? 'ON' : 'OFF'}`;
        toggleExcelMode(state.excelMode);
      }
      if (a === 'font-size') {
        e.stopPropagation();
        const dropdown = document.querySelector('.font-size-dropdown');
        if (dropdown && dropdown.classList.contains('show')) {
          FontManager.hideDropdown();
        } else {
          FontManager.showDropdown();
        }
      }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('[data-action="font-size"]')) {
        FontManager.hideDropdown();
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

    // 添加粘贴图片功能
    $('#' + CFG.localInputId).addEventListener('paste', async (e) => {
      const items = e.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          e.preventDefault();
          const blob = items[i].getAsFile();
          if (blob) {
            await uploadAndInsertImage(blob, e.target);
          }
          break;
        }
      }
    });
  }

  function setToggleText() {
    const b = $('#' + CFG.toggleBtnId);
    if (b) b.textContent = `IDE Chat: ${state.enabled ? 'ON' : 'OFF'} (${hotkeyText})`;
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

      // newbar click => jump bottom (使用事件委托)
      const mainPanel = document.getElementById(CFG.mainId);
      if (mainPanel && !mainPanel.__mwNewbarBound) {
        mainPanel.__mwNewbarBound = true;
        mainPanel.addEventListener('click', (e) => {
          const newbar = e.target.closest('#mw-ide-newbar');
          if (newbar) {
            e.preventDefault();
            e.stopPropagation();
            jumpToBottomAndResume();
          }
        });
      }

      // 用户名点击事件现在在 bindUsernameClickEvents 中处理

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
    FontManager.update(state.fontSize);
    
    createUI();
    setToggleText();

    window.addEventListener('keydown', (e) => {
      // Check for the appropriate key combination based on platform
      const isHotkeyPressed = isMac 
        ? (e.metaKey && !e.altKey && !e.ctrlKey && (e.key || '').toLowerCase() === 'i')
        : (e.altKey && !e.metaKey && !e.ctrlKey && (e.key || '').toLowerCase() === 'i');
      
      if (isHotkeyPressed) {
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

    console.log('[MW IDE Chat] v0.18.0 loaded (fixed image display for chat-img format links)');
  }

  main();
})();
