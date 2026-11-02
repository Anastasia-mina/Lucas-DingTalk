/* 署名 Lucas · 禁止二改、二传及商用。 */
import { defaults, normalize, resolveMode, validTime, escapeHTML as esc, preview } from './model.js';
import { icon, logo } from './icons.js';

const KEY = 'dingtalk_tavern';
const $ = selector => document.querySelector(selector);
const context = () => window.SillyTavern?.getContext();
const routes = { characters:['#rightNavHolder','角色管理'], api:['#sys-settings-button','API 连接'], world:['#WI-SP-button','世界书'], persona:['#persona-management-button','用户设定'], backgrounds:['#backgrounds-button','背景'], extensions:['#extensions-settings-button','扩展'], settings:['#user-settings-button','酒馆设置'], generation:['#ai-config-button','生成设置'], formatting:['#advanced-formatting-button','文本格式'] };
const skins = [ ['kindle-paper','kindle_paper'], ['x-tavern','x_tavern'], ['bluebird-mobile','bluebird_mobile'], ['claude-mobile-ui','claude_mobile_ui'], ['ins-frame-skin','ins_frame_skin'], ['ph-frame-skin','ph_frame_skin'] ];
const modeLabels = { time:'按时间切换', system:'跟随系统', light:'浅色', dark:'深色' };
let settings, root, panel, dialog, controller, media, timer, observer, refreshTimer, mounted = false, starting = false, busy = false;
let recent = [], search = '', filter = 'all', contacts = false, requestId = 0, lastFocus, disposers = [], suspended = [], styles = new Map();
const button = (action,label,name,extra='') => `<button type="button" class="dt-icon" data-dt-action="${action}" aria-label="${esc(label)}" title="${esc(label)}" ${extra}>${icon(name)}</button>`;
const save = () => context().saveSettingsDebounced();
const avatar = (person,cls='') => `<img class="dt-avatar ${cls}" src="${esc(person.avatar)}" alt="${esc(person.name)}" loading="lazy">`;
function people() {
    const c = context();
    return [...(c.characters || []).map((ch,id) => ({ id:String(id), key:ch.avatar, name:ch.name || '未命名角色', avatar:c.getThumbnailUrl('avatar',ch.avatar), description:preview(ch.first_mes || ch.description), kind:'character' })),
        ...(c.groups || []).map(g => ({ id:String(g.id), key:`group:${g.id}`, name:g.name || '群聊', avatar:g.avatar_url && !String(g.avatar_url).startsWith('data:') ? g.avatar_url : '/img/ai4.png', description:`${g.members?.length || 0} 位成员`, kind:'group' }))];
}
function current() { const c = context(); return people().find(p => c.groupId ? p.kind === 'group' && p.id === String(c.groupId) : p.kind === 'character' && p.id === String(c.characterId)); }
function records() {
    const all = people();
    return recent.filter(r => r && typeof r.file_name === 'string').map(r => ({ record:r, person:all.find(p => r.group ? p.kind === 'group' && p.id === String(r.group) : p.key === r.avatar) })).filter(r => r.person);
}
function rows() {
    const all = people(), seen = new Set();
    const list = records().filter(({person}) => { if (seen.has(person.key)) return false; seen.add(person.key); return true; });
    for (const person of all) if (!seen.has(person.key)) list.push({person});
    return list.filter(({person,record}) => (!search || `${person.name} ${record?.mes || person.description}`.toLowerCase().includes(search.toLowerCase())) && (filter !== 'group' || person.kind === 'group') && (filter !== 'pinned' || settings.pinned.includes(person.key)))
        .sort((a,b) => Number(settings.pinned.includes(b.person.key)) - Number(settings.pinned.includes(a.person.key)));
}
function timeLabel(value) {
    const m = context().timestampToMoment(value); if (!m.isValid()) return '';
    return m.isSame(new Date(),'day') ? m.format('HH:mm') : m.format('MM/DD');
}
function renderList() {
    if (!mounted) return;
    const active = current();
    $('#dt-list-title').textContent = contacts ? '通讯录' : '消息';
    $('#dt-list').innerHTML = rows().map(({person,record}) => `<button type="button" class="dt-row ${active?.key === person.key ? 'dt-selected' : ''}" data-dt-person="${esc(person.key)}" ${active?.key === person.key ? 'aria-current="true"' : ''}>${avatar(person)}<span class="dt-row-body"><span class="dt-row-top"><strong>${esc(person.name)}</strong><time>${record ? esc(timeLabel(record.last_mes)) : ''}</time></span><span class="dt-row-preview">${settings.pinned.includes(person.key) ? '<span class="dt-pin-label">置顶</span>' : ''}${esc(contacts ? person.description : preview(record?.mes || person.description) || '开始聊天')}</span></span></button>`).join('') || `<div class="dt-list-empty">${icon('search')}<p>${filter === 'pinned' ? '还没有置顶的会话' : filter === 'group' ? '还没有群聊' : '没有找到相关会话'}</p><button data-dt-action="characters" type="button">管理角色</button></div>`;
    root.querySelectorAll('[data-dt-filter]').forEach(b => b.setAttribute('aria-selected',String(b.dataset.dtFilter === filter)));
    root.querySelectorAll('[data-dt-action="messages"],[data-dt-action="contacts"]').forEach(b => b.classList.toggle('dt-nav-active',(b.dataset.dtAction === 'contacts') === contacts));
}
function sync() {
    if (!mounted) return;
    const p = current();
    document.body.classList.toggle('dt-has-chat',Boolean(p));
    const generating = context().streamingProcessor && !context().streamingProcessor.isFinished;
    $('#dt-chat-title').textContent = p?.name || '钉钉';
    $('#dt-chat-subtitle').textContent = p ? generating ? '正在输入…' : p.kind === 'group' ? p.description : '角色对话' : '让沟通更简单';
    $('#dt-chat-avatar').innerHTML = p ? avatar(p) : logo;
    $('#dt-connection').textContent = 'API 设置';
    $('#dt-empty').hidden = Boolean(p);
    renderList();
}
async function loadRecent() {
    if (!mounted || !settings.enabled) return;
    const id = ++requestId;
    try {
        const response = await fetch('/api/chats/recent',{ method:'POST', headers:context().getRequestHeaders(), body:JSON.stringify({max:100}), signal:controller.signal });
        if (!response.ok) throw Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (mounted && id === requestId) { recent = Array.isArray(data) ? data : []; $('#dt-list-error').hidden = true; renderList(); }
    } catch (error) { if (error.name !== 'AbortError' && mounted) { $('#dt-list-error').hidden = false; console.warn('[DingTalk theme] 最近会话读取失败',error.message); } }
}
function closeDrawers() {
    document.querySelectorAll('#top-settings-holder > .drawer:has(> .drawer-content.openDrawer) > .drawer-toggle').forEach(el => window.jQuery(el).trigger('click'));
    document.body.classList.remove('dt-native-open');
}
function native(action) {
    dialog.close(); closeDrawers();
    if (action === 'history') { if (!current()) return window.toastr?.info('请先选择一位角色。'); window.jQuery('#option_select_chat').trigger('click'); return; }
    const route = routes[action]; if (!route) return;
    document.body.classList.add('dt-native-open');
    $('#dt-native-title').textContent = route[1];
    window.jQuery(`${route[0]} > .drawer-toggle`).trigger('click');
}
async function openPerson(key,record) {
    if (busy) return;
    const p = people().find(p => p.key === key); if (!p) return;
    if ($('#curEditTextarea') || (context().streamingProcessor && !context().streamingProcessor.isFinished)) return window.toastr?.info('请先完成消息编辑或停止生成，再切换会话。');
    busy = true; root.setAttribute('aria-busy','true'); dialog.close(); closeDrawers();
    try {
        if (p.kind === 'group') { const {openGroupById} = await import('/scripts/group-chats.js'); await openGroupById(p.id); if (record) await context().openGroupChat(p.id,record.file_name.replace(/\.jsonl$/,'')); }
        else { await context().selectCharacterById(Number(p.id),{switchMenu:false}); if (record && context().getCurrentChatId() !== record.file_name.replace(/\.jsonl$/,'')) await context().openCharacterChat(record.file_name.replace(/\.jsonl$/,'')); }
        if (current()?.key !== key) throw Error('切换失败');
        document.body.classList.add('dt-mobile-chat'); sync(); $('#send_textarea')?.focus();
    } catch (error) { console.warn('[DingTalk theme]',error); window.toastr?.error('会话暂时无法打开，请重试。'); }
    finally { busy = false; root.removeAttribute('aria-busy'); }
}
async function suspendSkins() {
    for (const [name,key] of skins) {
        if (context().extensionSettings[key]?.enabled !== true) continue;
        if (context().extensionSettings.disabledExtensions?.includes(`third-party/${name}`)) continue;
        try { const module = await import(`/scripts/extensions/third-party/${name}/index.js`); if (module.onDisable) { module.onDisable(); if (!suspended.includes(module)) suspended.push(module); } } catch (error) { console.warn('[DingTalk theme] 旧主题暂停失败',name,error); }
    }
    for (const link of document.querySelectorAll('link[rel="stylesheet"]')) if (skins.some(([name]) => link.href.includes(`/third-party/${name}/`))) { if (!styles.has(link)) styles.set(link,link.disabled); link.disabled = true; }
}
function restoreSkins() { for (const [link,disabled] of styles) link.disabled = disabled; styles.clear(); suspended.splice(0).forEach(module => module.onEnable?.()); }
function apply() {
    if (!mounted) return;
    const theme = resolveMode(settings,new Date(),media.matches);
    document.body.dataset.dtTheme = theme;
    $('#dt-theme-toggle').innerHTML = icon(theme === 'dark' ? 'sun' : 'moon');
    $('#dt-theme-toggle').setAttribute('aria-label',`切换到${theme === 'dark' ? '白天' : '夜晚'}模式`);
    $('#dt-theme-toggle').title = $('#dt-theme-toggle').getAttribute('aria-label');
    const caption = $('#dt-mode-caption');
    if (caption) caption.textContent = `${modeLabels[settings.mode]} · ${theme === 'dark' ? '夜晚' : '白天'}`;
    dialog.querySelectorAll('[data-dt-mode]').forEach(b => b.setAttribute('aria-pressed',String(b.dataset.dtMode === settings.mode)));
}
function showDialog(type) {
    lastFocus = document.activeElement;
    const header = title => `<header><h2>${title}</h2>${button('close','关闭窗口','close')}</header>`;
    if (type === 'appearance') {
        dialog.innerHTML = `${header('外观与布局')}<p class="dt-dialog-intro">熟悉的聊天界面，白天夜晚都舒服。</p><div class="dt-theme-previews"><button type="button" data-dt-mode="light" class="dt-preview-light"><i><b></b><em></em></i><span>${icon('sun')}浅色</span></button><button type="button" data-dt-mode="dark" class="dt-preview-dark"><i><b></b><em></em></i><span>${icon('moon')}深色</span></button></div><div class="dt-auto-options"><button type="button" data-dt-mode="time">${icon('history')}按时间切换</button><button type="button" data-dt-mode="system">${icon('settings')}跟随系统</button></div><div class="dt-schedule"><label>白天开始<input type="time" id="dt-day" value="${esc(settings.day)}"></label><label>夜晚开始<input type="time" id="dt-night" value="${esc(settings.night)}"></label></div><p id="dt-mode-caption"></p><p class="dt-note">按本机时间自动切换。点击侧栏的太阳或月亮，可立即切换并固定当前外观。</p><div class="dt-dialog-footer"><button type="button" data-dt-action="restore">恢复原来的界面</button><button type="button" class="dt-primary" data-dt-action="close">完成</button></div>`;
        apply();
    } else if (type === 'history') {
        dialog.innerHTML = `${header('聊天记录')}<div class="dt-history-list">${records().map(({person,record},index) => `<button type="button" data-dt-record="${index}">${avatar(person)}<span><strong>${esc(person.name)}</strong><small>${esc(record.file_name.replace(/\.jsonl$/,''))}</small><p>${esc(preview(record.mes))}</p></span><time>${esc(timeLabel(record.last_mes))}</time></button>`).join('') || '<p class="dt-note">暂时没有聊天记录。</p>'}</div>`;
    } else {
        dialog.innerHTML = `${header('工作台')}<p class="dt-dialog-intro">常用工具</p><div class="dt-tools-grid">${Object.entries(routes).map(([key,[,label]]) => `<button type="button" data-dt-action="${key}">${icon(({characters:'contacts',world:'book',extensions:'apps',api:'link'})[key] || 'settings')}<span>${label}</span></button>`).join('')}<button type="button" data-dt-action="appearance">${icon('sun')}<span>外观与布局</span></button><button type="button" data-dt-action="history-list">${icon('history')}<span>聊天记录</span></button></div>`;
    }
    if (type === 'appearance' || type === 'tools') dialog.insertAdjacentHTML('beforeend', '<p class="dt-attribution">署名 <strong>Lucas</strong><br>禁止二改、二传及商用</p>');
    dialog.showModal();
}
async function setEnabled(enabled) {
    settings.enabled = enabled; save();
    if (enabled) { await suspendSkins(); document.body.classList.add('dt-enabled'); root.hidden = false; apply(); sync(); void loadRecent(); }
    else { dialog.close(); closeDrawers(); root.hidden = true; document.body.classList.remove('dt-enabled','dt-has-chat','dt-mobile-chat'); restoreSkins(); }
}
function handleClick(event) {
    const target = event.target.closest('[data-dt-action],[data-dt-person],[data-dt-filter],[data-dt-mode],[data-dt-record]');
    if (!target || ![root,panel,dialog].some(el => el.contains(target))) return;
    if (target.dataset.dtPerson) { const record = records().find(r => r.person.key === target.dataset.dtPerson)?.record; void openPerson(target.dataset.dtPerson,record); return; }
    if (target.dataset.dtRecord) { const entry = records()[Number(target.dataset.dtRecord)]; if (entry) void openPerson(entry.person.key,entry.record); return; }
    if (target.dataset.dtFilter) { filter = target.dataset.dtFilter; renderList(); return; }
    if (target.dataset.dtMode) { settings.mode = target.dataset.dtMode; save(); apply(); return; }
    const action = target.dataset.dtAction;
    if (routes[action] || action === 'history') { native(action); return; }
    switch (action) {
        case 'messages': contacts = false; document.body.classList.remove('dt-mobile-chat'); renderList(); break;
        case 'contacts': contacts = true; filter = 'all'; document.body.classList.remove('dt-mobile-chat'); renderList(); break;
        case 'tools': showDialog('tools'); break;
        case 'appearance': showDialog('appearance'); break;
        case 'theme': settings.mode = resolveMode(settings,new Date(),media.matches) === 'dark' ? 'light' : 'dark'; save(); apply(); break;
        case 'history-list': showDialog('history'); void loadRecent(); break;
        case 'close': dialog.close(); break;
        case 'close-native': closeDrawers(); break;
        case 'back': document.body.classList.remove('dt-mobile-chat'); break;
        case 'restore': void setEnabled(false); break;
        case 'enable': void setEnabled(true); break;
        case 'retry': void loadRecent(); break;
        case 'latest': $('#chat').scrollTo({top:$('#chat').scrollHeight,behavior:'smooth'}); break;
        case 'pin': { const p = current(); if (!p) return; const i = settings.pinned.indexOf(p.key); if (i < 0) settings.pinned.push(p.key); else settings.pinned.splice(i,1); save(); renderList(); window.toastr?.info(i < 0 ? '已置顶会话' : '已取消置顶'); break; }
    }
}
function viewport() { document.body.style.setProperty('--dt-height',`${window.visualViewport?.height || innerHeight}px`); document.body.style.setProperty('--dt-top',`${window.visualViewport?.offsetTop || 0}px`); }
async function mount() {
    if (mounted || starting || !context() || !$('#extensions_settings')) return;
    starting = true;
    try {
        settings = normalize(context().extensionSettings[KEY]); context().extensionSettings[KEY] = settings;
        controller = new AbortController(); const { signal } = controller;
        media = matchMedia('(prefers-color-scheme: dark)');
        root = document.createElement('div'); root.id = 'dt-root'; root.hidden = true;
        root.innerHTML = `<aside id="dt-rail"><button type="button" class="dt-my-avatar" data-dt-action="persona" aria-label="用户设定">${esc((context().name1 || '我').slice(0,1))}</button><nav aria-label="主导航">${[['messages','消息','message'],['contacts','通讯录','contacts'],['tools','工作台','apps'],['world','世界书','book'],['history-list','记录','history']].map(([action,label,name]) => `<button type="button" class="dt-nav ${action === 'messages' ? 'dt-nav-active' : ''}" data-dt-action="${action}">${icon(name)}<span>${label}</span></button>`).join('')}</nav><div class="dt-rail-bottom"><button id="dt-theme-toggle" class="dt-icon" type="button" data-dt-action="theme" aria-label="切换日夜模式">${icon('moon')}</button>${button('appearance','外观与布局','settings')}${button('tools','更多工具','more')}</div></aside>
        <aside id="dt-conversations" aria-label="会话列表"><div class="dt-search-row"><label>${icon('search')}<input type="search" id="dt-search" placeholder="搜索" aria-label="搜索会话" autocomplete="off"></label>${button('characters','选择或新建角色','plus')}</div><div class="dt-list-heading"><h1 id="dt-list-title">消息</h1>${button('history-list','全部聊天记录','history')}</div><div class="dt-filters" role="tablist" aria-label="会话分类"><button type="button" role="tab" data-dt-filter="all" aria-selected="true">全部</button><button type="button" role="tab" data-dt-filter="pinned" aria-selected="false">置顶</button><button type="button" role="tab" data-dt-filter="group" aria-selected="false">群聊</button></div><div id="dt-list-error" hidden>读取聊天记录失败 <button type="button" data-dt-action="retry">重试</button></div><div id="dt-list"></div><footer><span class="dt-local-dot"></span>本地酒馆<button type="button" data-dt-action="api" id="dt-connection">连接 API</button></footer></aside>
        <header id="dt-chat-header">${button('back','返回会话列表','back')}<span id="dt-chat-avatar"></span><div class="dt-header-name"><strong id="dt-chat-title">钉钉</strong><span id="dt-chat-subtitle">让沟通更简单</span></div><div class="dt-header-actions">${button('history-list','查看聊天记录','search')}${button('pin','置顶或取消置顶当前会话','pin')}${button('characters','聊天详情与角色管理','more')}</div></header>
        <section id="dt-empty"><div class="dt-empty-logo">${logo}</div><h2>让沟通更简单</h2><p>选择左侧会话，开始今天的故事</p><button type="button" class="dt-primary" data-dt-action="characters">选择角色</button><span>每一段对话，都值得认真回应</span></section>
        <aside id="dt-utilities" aria-label="聊天工具">${button('characters','角色资料','contacts')}${button('history','管理当前聊天文件','folder')}${button('world','世界书','book')}${button('extensions','扩展工具','apps')}<span></span>${button('latest','回到最新消息','arrow')}</aside>
        <div id="dt-native-bar"><strong id="dt-native-title">酒馆工具</strong>${button('close-native','收起酒馆面板','close')}</div>`;
        dialog = document.createElement('dialog'); dialog.id = 'dt-dialog'; dialog.setAttribute('aria-label','钉钉美化设置');
        // apply() can run while another dialog is shown, so its caption is optional.
        panel = document.createElement('div'); panel.id = 'dt-extension-settings'; panel.innerHTML = '<div class="inline-drawer"><div class="inline-drawer-toggle inline-drawer-header"><b>钉钉 · 桌面聊天美化</b><div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div></div><div class="inline-drawer-content"><p>三栏聊天界面，支持日夜模式。</p><p class="dt-attribution">署名 <strong>Lucas</strong><br>禁止二改、二传及商用</p><button type="button" class="menu_button" data-dt-action="enable">启用钉钉美化</button><button type="button" class="menu_button" data-dt-action="appearance">外观与布局</button><button type="button" class="menu_button" data-dt-action="restore">恢复原来的界面</button></div></div>';
        document.body.append(root,dialog); $('#extensions_settings').prepend(panel);
        mounted = true;
        for (const surface of [root,panel,dialog]) surface.addEventListener('click',handleClick,{signal,capture:true});
        $('#dt-search').addEventListener('input',event => { search = event.target.value; renderList(); },{signal});
        dialog.addEventListener('close',() => lastFocus?.isConnected && lastFocus.focus(),{signal});
        dialog.addEventListener('click',event => { if (event.target !== dialog) return; const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); },{signal});
        dialog.addEventListener('change',event => { if (!['dt-day','dt-night'].includes(event.target.id)) return; const day = $('#dt-day').value, night = $('#dt-night').value; if (!validTime(day) || !validTime(night) || day === night) { window.toastr?.info('请设置两个不同的开始时间。'); event.target.value = settings[event.target.id === 'dt-day' ? 'day' : 'night']; return; } settings.day = day; settings.night = night; save(); apply(); },{signal});
        document.addEventListener('keydown',event => { if (event.key === 'Escape') closeDrawers(); if (settings.enabled && event.altKey && event.shiftKey && event.key.toLowerCase() === 'd') { event.preventDefault(); showDialog('appearance'); } },{signal});
        const c = context();
        for (const name of ['CHAT_CHANGED','CHARACTER_EDITED','CHARACTER_DELETED','CHARACTER_CREATED','GROUP_UPDATED','GENERATION_STARTED','GENERATION_ENDED','CONNECTION_STATUS_CHANGED','MESSAGE_RECEIVED','MESSAGE_SENT']) { const type = c.eventTypes[name]; if (!type) continue; const handler = () => { sync(); if (name === 'CHAT_CHANGED') void loadRecent(); }; c.eventSource.on(type,handler); disposers.push(() => c.eventSource.removeListener(type,handler)); }
        observer = new MutationObserver(() => { clearTimeout(refreshTimer); refreshTimer = setTimeout(sync,160); }); observer.observe($('#chat'),{childList:true});
        media.addEventListener('change',apply,{signal});
        window.addEventListener('focus',apply,{signal}); document.addEventListener('visibilitychange',apply,{signal});
        window.addEventListener('resize',viewport,{signal}); window.visualViewport?.addEventListener('resize',viewport,{signal}); window.visualViewport?.addEventListener('scroll',viewport,{signal});
        viewport(); timer = setInterval(() => { apply(); sync(); },15000);
        if (settings.enabled) { await suspendSkins(); document.body.classList.add('dt-enabled'); root.hidden = false; }
        apply(); sync(); void loadRecent();
    } finally { starting = false; }
}
export function onDisable() {
    if (!mounted) return;
    controller.abort(); clearInterval(timer); clearTimeout(refreshTimer); observer.disconnect(); disposers.splice(0).forEach(fn => fn());
    closeDrawers(); dialog.close(); root.remove(); panel.remove(); dialog.remove();
    document.body.classList.remove('dt-enabled','dt-has-chat','dt-mobile-chat','dt-native-open'); delete document.body.dataset.dtTheme;
    document.body.style.removeProperty('--dt-height'); document.body.style.removeProperty('--dt-top'); mounted = false; restoreSkins();
}
export function onEnable() { return mount(); }
const c = context();
if (c?.eventTypes.APP_READY) c.eventSource.once(c.eventTypes.APP_READY,() => setTimeout(async () => { if (mounted) { if (settings.enabled) await suspendSkins(); sync(); void loadRecent(); } else await mount(); },0));
if (document.readyState === 'complete') setTimeout(() => void mount(),0);
else window.addEventListener('load',() => setTimeout(() => void mount(),0),{once:true});
