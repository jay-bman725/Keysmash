const { ipcRenderer } = require('electron');

// DOM Elements
const textInput = document.getElementById('textInput');
const delaySlider = document.getElementById('delaySlider');
const delayValue = document.getElementById('delayValue');
const loopCheckbox = document.getElementById('loopCheckbox');
const hotkeyInput = document.getElementById('hotkeyInput');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const saveBtn = document.getElementById('saveBtn');
const generateLoremBtn = document.getElementById('generateLoremBtn');
const charCount = document.getElementById('charCount');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const currentHotkey = document.getElementById('currentHotkey');
const historyList = document.getElementById('historyList');

// Lorem Ipsum text variations
const loremTexts = [
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.",
    "Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt.",
    "At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident.",
    "Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet ut et voluptates repudiandae sint et molestiae non recusandae. Itaque earum rerum hic tenetur a sapiente delectus.",
    "Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus id quod maxime placeat facere possimus, omnis voluptas assumenda est, omnis dolor repellendus."
];

let isTyping = false;
let settings = {};

// Initialize the app
async function init() {
    await loadSettings();
    setupEventListeners();
    updateUI();
}

// Load settings from main process
async function loadSettings() {
    try {
        settings = await ipcRenderer.invoke('get-settings');
        
        textInput.value = settings.text || loremTexts[0];
        delaySlider.value = settings.delay || 50;
        delayValue.textContent = `${settings.delay || 50}ms`;
        loopCheckbox.checked = settings.loop || false;
        hotkeyInput.value = settings.hotkey || 'Ctrl+Shift+T';
        currentHotkey.textContent = settings.hotkey || 'Ctrl+Shift+T';
        
        updateCharCount();
        updateHistory();
    } catch (error) {
        console.error('Failed to load settings:', error);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Text input
    textInput.addEventListener('input', updateCharCount);
    
    // Delay slider
    delaySlider.addEventListener('input', (e) => {
        delayValue.textContent = `${e.target.value}ms`;
    });
    
    // Buttons
    startBtn.addEventListener('click', startTyping);
    stopBtn.addEventListener('click', stopTyping);
    saveBtn.addEventListener('click', saveSettings);
    generateLoremBtn.addEventListener('click', generateLorem);
    
    // Hotkey input (placeholder for future hotkey recording)
    hotkeyInput.addEventListener('click', () => {
        // This would open a hotkey recording dialog in a full implementation
        alert('Hotkey customization will be available in a future version!');
    });
    
    // Listen for typing status changes from main process
    ipcRenderer.on('typing-status-changed', (event, typing) => {
        isTyping = typing;
        updateTypingStatus();
    });
    
    // Listen for clipboard notification
    ipcRenderer.on('show-clipboard-notification', (event, text, charCount) => {
        showClipboardNotification(text, charCount);
    });
    
    // Listen for individual character clipboard updates
    ipcRenderer.on('clipboard-char-ready', (event, char, currentChar, totalChars) => {
        updateClipboardProgress(char, currentChar, totalChars);
    });
    
    // Listen for update notifications from main process
    ipcRenderer.on('update-available', (event, updateInfo) => {
        showUpdateModal(updateInfo);
    });
}

// Update System Functions
function showUpdateModal(updateInfo) {
    const modal = document.getElementById('updateModal');
    const newVersionSpan = document.getElementById('newVersion');
    const currentVersionSpan = document.getElementById('currentVersion');
    const changelogContent = document.getElementById('changelogContent');
    const downloadBtn = document.getElementById('downloadUpdateBtn');
    const remindLaterBtn = document.getElementById('remindLaterBtn');
    const closeBtn = document.getElementById('closeUpdateModal');
    
    // Populate modal content
    newVersionSpan.textContent = updateInfo.newVersion;
    currentVersionSpan.textContent = updateInfo.currentVersion;
    
    // Parse and display changelog
    changelogContent.innerHTML = parseMarkdown(updateInfo.changelog);
    
    // Set up event listeners
    downloadBtn.onclick = () => {
        ipcRenderer.invoke('open-release-url', updateInfo.newVersion);
        hideUpdateModal();
    };
    
    remindLaterBtn.onclick = hideUpdateModal;
    closeBtn.onclick = hideUpdateModal;
    
    // Close modal when clicking overlay
    modal.onclick = (e) => {
        if (e.target === modal) {
            hideUpdateModal();
        }
    };
    
    // Keyboard support
    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            hideUpdateModal();
        } else if (e.key === 'Enter') {
            ipcRenderer.invoke('open-release-url', updateInfo.newVersion);
            hideUpdateModal();
        }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    // Remove event listener when modal is hidden
    modal.addEventListener('hide', () => {
        document.removeEventListener('keydown', handleKeyDown);
    });
    
    // Show modal
    modal.style.display = 'flex';
    
    // Focus the download button for better accessibility
    setTimeout(() => {
        downloadBtn.focus();
    }, 100);
}

function hideUpdateModal() {
    const modal = document.getElementById('updateModal');
    modal.style.display = 'none';
    
    // Trigger hide event for cleanup
    modal.dispatchEvent(new Event('hide'));
}

function parseMarkdown(markdown) {
    if (!markdown) return '<p>No changelog available.</p>';
    
    // Simple markdown parser for basic formatting
    let html = markdown
        // Headers
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        // Bold
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Code blocks
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        // Lists
        .replace(/^\- (.*$)/gim, '<li>$1</li>')
        .replace(/^\* (.*$)/gim, '<li>$1</li>')
        // Line breaks
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');
    
    // Wrap in paragraphs and fix lists
    html = '<p>' + html + '</p>';
    html = html.replace(/<p><li>/g, '<ul><li>');
    html = html.replace(/<\/li><\/p>/g, '</li></ul>');
    html = html.replace(/<\/li><br><li>/g, '</li><li>');
    
    // Clean up empty paragraphs
    html = html.replace(/<p><\/p>/g, '');
    html = html.replace(/<p><br><\/p>/g, '');
    
    return html;
}

// Manual update check function (can be called from menu or button)
async function checkForUpdates() {
    try {
        const updateInfo = await ipcRenderer.invoke('check-for-updates');
        
        if (updateInfo && updateInfo.available) {
            showUpdateModal(updateInfo);
        } else if (updateInfo && !updateInfo.available) {
            // Could show a "no updates available" notification
            console.log('No updates available');
        }
    } catch (error) {
        console.error('Failed to check for updates:', error);
    }
}

// Update character count
function updateCharCount() {
    const count = textInput.value.length;
    charCount.textContent = `${count} character${count !== 1 ? 's' : ''}`;
}

// Generate Lorem Ipsum
function generateLorem() {
    const randomText = loremTexts[Math.floor(Math.random() * loremTexts.length)];
    textInput.value = randomText;
    updateCharCount();
}

// Start typing
async function startTyping() {
    if (!textInput.value.trim()) {
        alert('Please enter some text to type!');
        return;
    }
    
    try {
        // Save current text to history
        await ipcRenderer.invoke('save-to-history', textInput.value);
        updateHistory();
        
        // Start typing
        await ipcRenderer.invoke('start-typing');
    } catch (error) {
        console.error('Failed to start typing:', error);
        alert('Failed to start typing. Please try again.');
    }
}

// Stop typing
async function stopTyping() {
    try {
        await ipcRenderer.invoke('stop-typing');
    } catch (error) {
        console.error('Failed to stop typing:', error);
    }
}

// Save settings
async function saveSettings() {
    const newSettings = {
        text: textInput.value,
        delay: parseInt(delaySlider.value),
        loop: loopCheckbox.checked,
        hotkey: hotkeyInput.value
    };
    
    try {
        await ipcRenderer.invoke('save-settings', newSettings);
        settings = { ...settings, ...newSettings };
        currentHotkey.textContent = newSettings.hotkey;
        
        // Show success feedback
        const originalText = saveBtn.textContent;
        saveBtn.textContent = '✅ Saved!';
        saveBtn.disabled = true;
        
        setTimeout(() => {
            saveBtn.innerHTML = '<span class="btn-icon">💾</span>Save Settings';
            saveBtn.disabled = false;
        }, 2000);
        
    } catch (error) {
        console.error('Failed to save settings:', error);
        alert('Failed to save settings. Please try again.');
    }
}

// Update typing status UI
function updateTypingStatus() {
    if (isTyping) {
        statusDot.classList.add('typing');
        statusText.textContent = 'Typing...';
        startBtn.disabled = true;
        stopBtn.disabled = false;
    } else {
        statusDot.classList.remove('typing');
        statusText.textContent = 'Ready';
        startBtn.disabled = false;
        stopBtn.disabled = true;
    }
}

// Update history display
async function updateHistory() {
    try {
        const history = settings.history || [];
        
        if (history.length === 0) {
            historyList.innerHTML = '<div class="history-empty">No history yet. Start typing to save your text!</div>';
            return;
        }
        
        historyList.innerHTML = history.map(text => {
            const preview = text.length > 100 ? text.substring(0, 100) + '...' : text;
            return `<div class="history-item" title="${text}" onclick="loadFromHistory('${text.replace(/'/g, "\\'")}')">${preview}</div>`;
        }).join('');
        
    } catch (error) {
        console.error('Failed to update history:', error);
    }
}

// Load text from history
function loadFromHistory(text) {
    textInput.value = text;
    updateCharCount();
}

// Update UI
function updateUI() {
    updateTypingStatus();
}

// Show clipboard notification
function showClipboardNotification(text, charCount) {
    // Remove any existing notification
    const existingNotification = document.getElementById('clipboard-notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.id = 'clipboard-notification';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 1000;
        max-width: 350px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        line-height: 1.4;
        transition: all 0.3s ease;
    `;
    
    notification.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 8px;">
            🤖 Auto-pasting characters one by one!
        </div>
        <div style="font-size: 12px; opacity: 0.9; margin-bottom: 8px;">
            ${charCount} characters to auto-paste • Click in your target application now
        </div>
        <div id="clipboard-progress" style="font-size: 11px; padding: 8px; background: rgba(255,255,255,0.2); border-radius: 4px;">
            <div style="margin-bottom: 4px;">Progress: <span id="char-counter">0</span>/${charCount} characters</div>
            <div style="font-weight: bold;">Current character: <span id="current-char">Starting in 1.5 seconds...</span></div>
        </div>
        <div style="font-size: 11px; margin-top: 8px; padding: 8px; background: rgba(255,255,255,0.15); border-radius: 4px; max-height: 60px; overflow: hidden;">
            "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"
        </div>
    `;
    
    document.body.appendChild(notification);
}

// Update clipboard progress
function updateClipboardProgress(char, currentChar, totalChars) {
    const notification = document.getElementById('clipboard-notification');
    if (!notification) return;
    
    const charCounter = document.getElementById('char-counter');
    const currentCharElement = document.getElementById('current-char');
    
    if (charCounter) {
        charCounter.textContent = currentChar;
    }
    
    if (currentCharElement) {
        // Show character in a readable way (handle special characters)
        let displayChar = char;
        if (char === ' ') {
            displayChar = '[SPACE]';
        } else if (char === '\n') {
            displayChar = '[ENTER]';
        } else if (char === '\t') {
            displayChar = '[TAB]';
        } else if (char.trim() === '') {
            displayChar = '[WHITESPACE]';
        } else {
            displayChar = `"${char}"`;
        }
        
        currentCharElement.textContent = displayChar;
        
        // Flash effect for new character
        currentCharElement.style.background = 'rgba(255,255,255,0.4)';
        setTimeout(() => {
            currentCharElement.style.background = 'transparent';
        }, 200);
    }
    
    // Update progress bar if we want to add one
    const progressPercent = (currentChar / totalChars) * 100;
    
    // If finished, update notification
    if (currentChar >= totalChars) {
        setTimeout(() => {
            if (notification) {
                notification.style.background = '#2196F3';
                const progressDiv = document.getElementById('clipboard-progress');
                if (progressDiv) {
                    progressDiv.innerHTML = '<div style="font-weight: bold;">✅ All characters auto-pasted! Typing complete.</div>';
                }
            }
        }, 500);
        
        // Remove notification after completion
        setTimeout(() => {
            if (notification && notification.parentNode) {
                notification.style.opacity = '0';
                notification.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }
        }, 3000);
    }
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Enter to start typing
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!isTyping) {
            startTyping();
        } else {
            stopTyping();
        }
    }
    
    // Ctrl/Cmd + S to save settings
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveSettings();
    }
    
    // Ctrl/Cmd + L to generate lorem ipsum
    if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
        e.preventDefault();
        generateLorem();
    }
});

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);

// Handle app focus/blur for better UX
window.addEventListener('focus', async () => {
    // Refresh typing status when window gains focus
    try {
        isTyping = await ipcRenderer.invoke('get-typing-status');
        updateTypingStatus();
    } catch (error) {
        console.error('Failed to get typing status:', error);
    }
});

// Make loadFromHistory globally accessible for onclick handlers
window.loadFromHistory = loadFromHistory;
