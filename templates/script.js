// ===== DOM Elements =====
const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const settingsModal = document.getElementById('settingsModal');
const helpModal = document.getElementById('helpModal');
const sidebar = document.querySelector('.sidebar');
const tempSlider = document.getElementById('tempSlider');
const tempValue = document.getElementById('tempValue');
const lengthSlider = document.getElementById('lengthSlider');
const lengthValue = document.getElementById('lengthValue');
const historyList = document.getElementById('historyList');
const gpuText = document.getElementById('gpuText');
 
// ===== State =====
let chatHistory = [];
let currentChatId = null;
let isLoading = false;
let settings = { temperature: 0.7, maxLength: 500, theme: 'auto' };
 
// ===== Init =====
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    loadChatHistory();
    checkStatus();
    setupEventListeners();
    newChat();
    loadFileList();
    injectUploadUI();
});
 
// ===== Inject Upload UI into Sidebar =====
function injectUploadUI() {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;
 
    const uploadSection = document.createElement('div');
    uploadSection.style.cssText = 'padding:12px 16px; border-top: 1px solid rgba(255,255,255,0.1);';
    uploadSection.innerHTML = `
        <p style="font-size:11px;color:rgba(255,255,255,0.5);text-transform:uppercase;font-weight:600;margin-bottom:8px;">📄 Documents</p>
        <label for="fileUpload" style="
            display:block;
            background:rgba(99,102,241,0.2);
            border:1px dashed rgba(99,102,241,0.6);
            color:white;
            padding:10px;
            border-radius:8px;
            cursor:pointer;
            font-size:12px;
            text-align:center;
            transition:all 0.3s;
        " onmouseover="this.style.background='rgba(99,102,241,0.4)'" onmouseout="this.style.background='rgba(99,102,241,0.2)'">
            ⬆️ Upload PDF / TXT
        </label>
        <input type="file" id="fileUpload" accept=".pdf,.txt" style="display:none" onchange="handleFileUpload(event)">
        <div id="uploadStatus" style="font-size:11px;margin-top:6px;color:rgba(255,255,255,0.6);"></div>
        <div id="fileList" style="margin-top:8px;"></div>
    `;
    sidebar.appendChild(uploadSection);
}
 
// ===== File Upload Handler =====
async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
 
    const statusEl = document.getElementById('uploadStatus');
    statusEl.textContent = `⏳ Uploading ${file.name}...`;
    statusEl.style.color = 'rgba(255,200,0,0.9)';
 
    const formData = new FormData();
    formData.append('file', file);
 
    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });
 
        const data = await response.json();
 
        if (response.ok) {
            statusEl.textContent = `✅ ${data.message}`;
            statusEl.style.color = 'rgba(16,185,129,0.9)';
            loadFileList();
            // Add system message in chat
            addMessageToUI(`📄 New document uploaded: "${file.name}" — You can now ask questions about it!`, false);
        } else {
            statusEl.textContent = `❌ ${data.detail}`;
            statusEl.style.color = 'rgba(239,68,68,0.9)';
        }
    } catch (err) {
        statusEl.textContent = `❌ Upload failed: ${err.message}`;
        statusEl.style.color = 'rgba(239,68,68,0.9)';
    }
 
    // Reset input
    event.target.value = '';
    setTimeout(() => { statusEl.textContent = ''; }, 4000);
}
 
// ===== Load File List =====
async function loadFileList() {
    const fileListEl = document.getElementById('fileList');
    if (!fileListEl) return;
 
    try {
        const response = await fetch('/files');
        const data = await response.json();
 
        if (data.files.length === 0) {
            fileListEl.innerHTML = '<p style="font-size:11px;color:rgba(255,255,255,0.3);text-align:center;">No documents yet</p>';
            return;
        }
 
        fileListEl.innerHTML = data.files.map(f => `
            <div style="
                display:flex;justify-content:space-between;align-items:center;
                background:rgba(255,255,255,0.05);
                border-radius:6px;padding:6px 8px;margin-bottom:4px;
            ">
                <span style="font-size:11px;color:rgba(255,255,255,0.7);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:160px;">
                    ${f.type === '.pdf' ? '📄' : '📝'} ${f.name}
                </span>
                <span style="display:flex;gap:4px;align-items:center;">
                    <span style="font-size:10px;color:rgba(255,255,255,0.3);">${f.size_kb}KB</span>
                    <button onclick="deleteFile('${f.name}')" style="
                        background:rgba(239,68,68,0.2);border:none;color:rgba(239,68,68,0.8);
                        cursor:pointer;border-radius:4px;padding:2px 6px;font-size:11px;
                    ">✕</button>
                </span>
            </div>
        `).join('');
    } catch (err) {
        console.error('File list error:', err);
    }
}
 
// ===== Delete File =====
async function deleteFile(filename) {
    if (!confirm(`Delete "${filename}"?`)) return;
 
    try {
        const response = await fetch(`/files/${encodeURIComponent(filename)}`, { method: 'DELETE' });
        if (response.ok) {
            loadFileList();
            addMessageToUI(`🗑️ "${filename}" deleted and index updated.`, false);
        }
    } catch (err) {
        console.error('Delete error:', err);
    }
}
 
// ===== Settings =====
function loadSettings() {
    const saved = localStorage.getItem('loki-settings');
    if (saved) {
        settings = JSON.parse(saved);
        if (tempSlider) { tempSlider.value = settings.temperature; tempValue.textContent = settings.temperature; }
        if (lengthSlider) { lengthSlider.value = settings.maxLength; lengthValue.textContent = settings.maxLength; }
    }
}
 
function saveSettings() { localStorage.setItem('loki-settings', JSON.stringify(settings)); }
 
if (tempSlider) tempSlider.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    tempValue.textContent = value.toFixed(1);
    settings.temperature = value;
    saveSettings();
});
 
if (lengthSlider) lengthSlider.addEventListener('input', (e) => {
    const value = parseInt(e.target.value);
    lengthValue.textContent = value;
    settings.maxLength = value;
    saveSettings();
});
 
// ===== Chat History =====
function loadChatHistory() {
    const saved = localStorage.getItem('loki-chat-history');
    if (saved) { chatHistory = JSON.parse(saved); updateHistoryUI(); }
}
 
function saveChatHistory() {
    localStorage.setItem('loki-chat-history', JSON.stringify(chatHistory));
    updateHistoryUI();
}
 
function updateHistoryUI() {
    if (!historyList) return;
    if (chatHistory.length === 0) {
        historyList.innerHTML = '<p class="empty-history">No chats yet</p>';
        return;
    }
    historyList.innerHTML = chatHistory.map((chat, index) => `
        <div class="history-item" onclick="loadChat(${index})" title="${chat.title}">${chat.title}</div>
    `).join('');
}
 
function newChat() {
    currentChatId = Date.now();
    const newChatObj = { id: currentChatId, title: `Chat - ${new Date().toLocaleTimeString()}`, messages: [] };
    chatHistory.unshift(newChatObj);
    saveChatHistory();
    clearChatMessages();
}
 
function loadChat(index) {
    const chat = chatHistory[index];
    currentChatId = chat.id;
    clearChatMessages();
    chat.messages.forEach(msg => addMessageToUI(msg.content, msg.role === 'user'));
    closeSidebar();
}
 
function clearChat() {
    if (confirm('Clear this chat?')) clearChatMessages();
}
 
function clearChatMessages() {
    chatMessages.innerHTML = `
        <div class="welcome-container">
            <div class="welcome-icon">🔮</div>
            <h2>Welcome to Loki AI</h2>
            <p>Your local, GPU-accelerated AI assistant</p>
            <div class="features-grid">
                <div class="feature"><span class="feature-icon">⚡</span><span>Llama 3.3 70B</span></div>
                <div class="feature"><span class="feature-icon">🔒</span><span>Private RAG</span></div>
                <div class="feature"><span class="feature-icon">📄</span><span>PDF Upload</span></div>
                <div class="feature"><span class="feature-icon">⚙️</span><span>Customizable</span></div>
            </div>
        </div>`;
}
 
// ===== Messages =====
function addMessageToUI(content, isUser) {
    const welcome = chatMessages.querySelector('.welcome-container');
    if (welcome) welcome.remove();
 
    const group = document.createElement('div');
    group.className = `message-group ${isUser ? 'user' : 'bot'}`;
 
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.textContent = content;
 
    group.appendChild(bubble);
    chatMessages.appendChild(group);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}
 
function addLoadingIndicator() {
    const group = document.createElement('div');
    group.className = 'message-group bot';
    group.id = 'loadingMsg';
    group.innerHTML = '<div class="loading-bubble"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>';
    chatMessages.appendChild(group);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}
 
function removeLoadingIndicator() {
    const loading = document.getElementById('loadingMsg');
    if (loading) loading.remove();
}
 
// ===== Send Message =====
async function sendMessage() {
    const message = messageInput.value.trim();
    if (!message || isLoading) return;
 
    isLoading = true;
    sendBtn.disabled = true;
    addMessageToUI(message, true);
 
    const currentChat = chatHistory.find(c => c.id === currentChatId);
    if (currentChat) {
        currentChat.messages.push({ role: 'user', content: message });
        if (currentChat.messages.length === 1) {
            currentChat.title = message.substring(0, 30) + (message.length > 30 ? '...' : '');
        }
        saveChatHistory();
    }
 
    messageInput.value = '';
    messageInput.style.height = 'auto';
    addLoadingIndicator();
 
    try {
        const response = await fetch('/ask', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question: message, temperature: settings.temperature, max_length: settings.maxLength })
        });
 
        removeLoadingIndicator();
 
        if (!response.ok) {
            const error = await response.json();
            addMessageToUI(`❌ Error: ${error.detail}`, false);
        } else {
            const data = await response.json();
            addMessageToUI(data.answer, false);
            if (currentChat) {
                currentChat.messages.push({ role: 'bot', content: data.answer });
                saveChatHistory();
            }
        }
    } catch (error) {
        removeLoadingIndicator();
        addMessageToUI(`❌ Connection error: ${error.message}`, false);
    } finally {
        isLoading = false;
        sendBtn.disabled = false;
        messageInput.focus();
    }
}
 
// ===== Status Check =====
async function checkStatus() {
    try {
        const response = await fetch('/status');
        const data = await response.json();
        if (gpuText) {
            gpuText.textContent = data.status === 'healthy'
                ? `✅ ${data.model?.split('-').slice(0,2).join(' ') || 'Groq'}`
                : '❌ Error';
        }
    } catch (error) {
        if (gpuText) gpuText.textContent = '❓ Offline';
    }
}
 
// ===== Keyboard =====
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'k') { e.preventDefault(); newChat(); }
    if (e.ctrlKey && e.key === 'l') { e.preventDefault(); clearChat(); }
});
 
function handleKeyPress(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
}
 
messageInput.addEventListener('input', () => {
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
});
 
// ===== Sidebar & Modals =====
function toggleSidebar() { sidebar.classList.toggle('active'); }
function closeSidebar() { sidebar.classList.remove('active'); }
function toggleSettings() { settingsModal.classList.toggle('active'); }
function toggleHelp() { helpModal.classList.toggle('active'); }
 
document.addEventListener('click', (e) => {
    if (!e.target.closest('.modal-content') && !e.target.closest('.settings-btn') && !e.target.closest('.help-btn')) {
        settingsModal.classList.remove('active');
        helpModal.classList.remove('active');
    }
});
 
function downloadChat() {
    const currentChat = chatHistory.find(c => c.id === currentChatId);
    if (!currentChat || currentChat.messages.length === 0) { alert('No messages to download'); return; }
    const content = currentChat.messages.map(msg => `${msg.role.toUpperCase()}: ${msg.content}`).join('\n\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${currentChat.title}.txt`; a.click();
}
 
function attachFile() {
    document.getElementById('fileUpload')?.click();
}
 
function toggleVoice() { alert('Voice input coming soon!'); }
function changeTheme(theme) { settings.theme = theme; saveSettings(); }
 
function setupEventListeners() {
    if (sendBtn) sendBtn.addEventListener('click', sendMessage);
    if (messageInput) messageInput.addEventListener('keypress', handleKeyPress);
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', (e) => e.target.closest('.modal').classList.remove('active'));
    });
}