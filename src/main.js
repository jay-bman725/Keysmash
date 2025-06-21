const { app, BrowserWindow, globalShortcut, ipcMain, Menu, clipboard, shell } = require('electron');
const path = require('path');
const Store = require('electron-store');
const { exec } = require('child_process');
const https = require('https');
const fs = require('fs');

// Update system configuration
const UPDATE_CONFIG = {
  versionUrl: 'https://raw.githubusercontent.com/jay-bman725/Keysmash/refs/heads/main/version',
  changelogUrl: 'https://raw.githubusercontent.com/jay-bman725/Keysmash/refs/heads/main/CHANGELOG.md',
  releaseBaseUrl: 'https://github.com/jay-bman725/Keysmash/releases/tag/v'
};

// Update system variables
let updateCheckInterval = null;
let lastUpdateCheck = 0;

// Try to require robotjs, but fall back to clipboard method if it fails
let robot;
let useRobotjs = false;
try {
  robot = require('robotjs');
  useRobotjs = true;
  console.log('Using robotjs for typing');
} catch (error) {
  console.log('robotjs not available, using clipboard auto-paste method');
  useRobotjs = false;
}

// Initialize electron-store for persistent settings
const store = new Store();

let mainWindow;
let isTyping = false;
let currentTypingInterval;
let clipboardTimeouts = []; // Track all clipboard-related timeouts
let keyPressListener = null; // Global key press listener

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 600,
    minHeight: 400,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    titleBarStyle: 'default',
    show: false
  });

  // Load the app
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App event handlers
app.whenReady().then(() => {
  createWindow();
  
  // Register global hotkeys
  registerGlobalShortcuts();
  
  // Create menu
  createMenu();

  // Start update checking system
  startUpdateChecking();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  // Unregister all shortcuts
  globalShortcut.unregisterAll();
  
  // Stop update checking
  stopUpdateChecking();
  
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  // Unregister all shortcuts
  globalShortcut.unregisterAll();
  
  // Stop update checking
  stopUpdateChecking();
});

// Global shortcuts
function registerGlobalShortcuts() {
  // Default hotkey: Ctrl+Shift+T (Cmd+Shift+T on Mac)
  const defaultHotkey = process.platform === 'darwin' ? 'Cmd+Shift+T' : 'Ctrl+Shift+T';
  const hotkey = store.get('hotkey', defaultHotkey);
  
  try {
    globalShortcut.register(hotkey, () => {
      console.log('Global shortcut triggered. Current typing status:', isTyping);
      if (isTyping) {
        console.log('Stopping typing...');
        stopTyping();
      } else {
        console.log('Starting typing...');
        startTyping();
      }
    });
  } catch (error) {
    console.error('Failed to register global shortcut:', error);
  }
}

// Menu
function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Show/Hide Window',
          accelerator: 'CmdOrCtrl+H',
          click: () => {
            if (mainWindow.isVisible()) {
              mainWindow.hide();
            } else {
              mainWindow.show();
            }
          }
        },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
        { type: 'separator' },
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Check for Updates',
          click: () => {
            checkForUpdates();
          }
        },
        { type: 'separator' },
        {
          label: 'About',
          click: () => {
            const packageJson = require('../package.json');
            shell.openExternal(`https://github.com/jay-bman725/Keysmash`);
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC handlers
ipcMain.handle('get-settings', () => {
  return {
    text: store.get('text', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.'),
    delay: store.get('delay', 50),
    loop: store.get('loop', false),
    hotkey: store.get('hotkey', process.platform === 'darwin' ? 'Cmd+Shift+T' : 'Ctrl+Shift+T'),
    history: store.get('history', [])
  };
});

ipcMain.handle('save-settings', (event, settings) => {
  store.set('text', settings.text);
  store.set('delay', settings.delay);
  store.set('loop', settings.loop);
  store.set('hotkey', settings.hotkey);
  
  // Update global shortcut
  globalShortcut.unregisterAll();
  registerGlobalShortcuts();
  
  return true;
});

ipcMain.handle('save-to-history', (event, text) => {
  const history = store.get('history', []);
  if (!history.includes(text)) {
    history.unshift(text);
    // Keep only last 10 items
    if (history.length > 10) {
      history.pop();
    }
    store.set('history', history);
  }
  return history;
});

ipcMain.handle('start-typing', () => {
  startTyping();
});

ipcMain.handle('stop-typing', () => {
  stopTyping();
});

ipcMain.handle('get-typing-status', () => {
  return isTyping;
});

// Update system IPC handlers
ipcMain.handle('check-for-updates', async () => {
  return await checkForUpdates();
});

ipcMain.handle('open-release-url', (event, version) => {
  const releaseUrl = `${UPDATE_CONFIG.releaseBaseUrl}${version}`;
  shell.openExternal(releaseUrl);
});

// Typing functions
function startTyping() {
  if (isTyping) return;
  
  const text = store.get('text', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.');
  const delay = store.get('delay', 50);
  const loop = store.get('loop', false);
  
  if (!text.trim()) return;
  
  isTyping = true;
  
  // Start monitoring for key presses
  startKeyMonitoring();
  
  // Notify renderer
  if (mainWindow) {
    mainWindow.webContents.send('typing-status-changed', true);
  }
  
  if (useRobotjs) {
    // Use robotjs method
    // Hide the window to prevent typing into it
    if (mainWindow && mainWindow.isVisible()) {
      mainWindow.hide();
    }
    
    // Small delay before starting to type (gives user time to focus target window)
    setTimeout(() => {
      typeTextWithRobot(text, delay, loop);
    }, 500);
  } else {
    // Use clipboard method - also start alternative key monitoring
    startClipboardKeyMonitoring();
    typeTextWithClipboard(text, delay, loop);
  }
}

function typeTextWithRobot(text, delay, loop) {
  let charIndex = 0;
  
  const typeChar = () => {
    if (!isTyping) return;
    
    if (charIndex < text.length) {
      const char = text[charIndex];
      try {
        robot.typeString(char);
      } catch (error) {
        console.error('Error typing character:', error);
        stopTyping();
        return;
      }
      charIndex++;
      
      currentTypingInterval = setTimeout(typeChar, delay);
    } else {
      // Finished typing the text
      if (loop) {
        // If looping, restart from beginning
        charIndex = 0;
        currentTypingInterval = setTimeout(typeChar, delay);
      } else {
        // Not looping, stop typing
        stopTyping();
      }
    }
  };
  
  typeChar();
}

// Helper function to simulate paste command
function simulatePaste() {
  return new Promise((resolve, reject) => {
    let command;
    
    if (process.platform === 'darwin') {
      // macOS - use AppleScript to simulate Cmd+V
      command = 'osascript -e "tell application \\"System Events\\" to keystroke \\"v\\" using command down"';
    } else if (process.platform === 'win32') {
      // Windows - use PowerShell to simulate Ctrl+V
      command = 'powershell -command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait(\\"^v\\")"';
    } else {
      // Linux - use xdotool to simulate Ctrl+V
      command = 'xdotool key ctrl+v';
    }
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error('Error simulating paste:', error);
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

function typeTextWithClipboard(text, delay, loop) {
  // Store original clipboard content
  const originalClipboard = clipboard.readText();
  
  // Split text into individual characters
  const characters = text.split('');
  let charIndex = 0;
  
  // Show notification to user
  if (mainWindow) {
    mainWindow.webContents.send('show-clipboard-notification', text, characters.length);
    // Hide window so it doesn't interfere with pasting
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    }
  }
  
  const typeNextChar = async () => {
    if (!isTyping) {
      // Restore original clipboard
      clipboard.writeText(originalClipboard);
      return;
    }
    
    if (charIndex < characters.length) {
      const currentChar = characters[charIndex];
      
      try {
        // Copy current character to clipboard
        clipboard.writeText(currentChar);
        
        // Notify renderer about current character
        if (mainWindow) {
          mainWindow.webContents.send('clipboard-char-ready', currentChar, charIndex + 1, characters.length);
        }
        
        // Wait a brief moment for clipboard to update
        const clipboardTimeout = setTimeout(async () => {
          if (!isTyping) return; // Check again after the timeout
          
          try {
            // Automatically paste the character
            await simulatePaste();
            
            charIndex++;
            
            // Wait for delay before next character
            currentTypingInterval = setTimeout(typeNextChar, delay);
          } catch (error) {
            console.error('Failed to paste character:', error);
            // Continue to next character even if paste failed
            charIndex++;
            currentTypingInterval = setTimeout(typeNextChar, delay);
          }
        }, 50); // Small delay to ensure clipboard is updated
        
        // Track this timeout so we can clear it if needed
        clipboardTimeouts.push(clipboardTimeout);
        
      } catch (error) {
        console.error('Failed to copy character to clipboard:', error);
        charIndex++;
        currentTypingInterval = setTimeout(typeNextChar, delay);
      }
    } else {
      // Finished typing all characters
      if (loop) {
        // If looping, restart from beginning
        charIndex = 0;
        currentTypingInterval = setTimeout(typeNextChar, delay * 2); // Slightly longer pause between loops
      } else {
        // Not looping, stop typing
        const restoreTimeout = setTimeout(() => {
          // Restore original clipboard after delay
          clipboard.writeText(originalClipboard);
          stopTyping();
        }, 1000);
        
        // Track this timeout too
        clipboardTimeouts.push(restoreTimeout);
      }
    }
  };
  
  // Start typing after a short delay to allow user to focus target window
  const initialTimeout = setTimeout(typeNextChar, 1500); // Longer delay for clipboard method
  clipboardTimeouts.push(initialTimeout);
}

function stopTyping() {
  isTyping = false;
  
  // Stop key monitoring
  stopKeyMonitoring();
  stopClipboardKeyMonitoring();
  
  if (currentTypingInterval) {
    clearTimeout(currentTypingInterval);
    currentTypingInterval = null;
  }
  
  // Clear all clipboard-related timeouts
  clipboardTimeouts.forEach(timeout => {
    clearTimeout(timeout);
  });
  clipboardTimeouts = [];
  
  // Notify renderer
  if (mainWindow) {
    mainWindow.webContents.send('typing-status-changed', false);
  }
}

// Global key monitoring functions
function startKeyMonitoring() {
  if (keyPressListener) return;
  
  // Register escape key as a universal stop key for both methods
  try {
    globalShortcut.register('Escape', () => {
      if (isTyping) {
        console.log('Escape key pressed during typing, stopping...');
        stopTypingAndShowWindow();
      }
    });
  } catch (error) {
    console.error('Failed to register escape key:', error);
  }
  
  if (useRobotjs) {
    // For robotjs, also monitor mouse movement as an indicator of user activity
    keyPressListener = setInterval(() => {
      if (!isTyping) {
        stopKeyMonitoring();
        return;
      }
      
      try {
        const mouse = robot.getMousePos();
        if (!startKeyMonitoring.lastMousePos) {
          startKeyMonitoring.lastMousePos = mouse;
          return;
        }
        
        const mouseMoved = Math.abs(mouse.x - startKeyMonitoring.lastMousePos.x) > 30 || 
                          Math.abs(mouse.y - startKeyMonitoring.lastMousePos.y) > 30;
        
        if (mouseMoved) {
          console.log('Mouse movement detected during typing, stopping...');
          stopTypingAndShowWindow();
          return;
        }
        
        startKeyMonitoring.lastMousePos = mouse;
        
      } catch (error) {
        // Ignore errors
      }
    }, 200); // Check every 200ms
  }
}

function stopKeyMonitoring() {
  if (keyPressListener) {
    clearInterval(keyPressListener);
    keyPressListener = null;
    startKeyMonitoring.lastMousePos = null;
  }
  
  // Unregister escape key and re-register main shortcuts
  try {
    globalShortcut.unregister('Escape');
  } catch (error) {
    // Ignore error
  }
}

function stopTypingAndShowWindow() {
  stopTyping();
  
  // Show the main window
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }
}

// Alternative key monitoring for clipboard method (when robotjs is not available)
function startClipboardKeyMonitoring() {
  if (useRobotjs) return; // Only use this when robotjs is not available
  
  try {
    // Register only specific interrupt keys that won't interfere with normal typing/pasting
    // Avoid registering Cmd+V/Ctrl+V since that's what we use for pasting
    const interruptKeys = [
      'CmdOrCtrl+C', // Copy - user might want to copy something
      'CmdOrCtrl+X', // Cut
      'CmdOrCtrl+Z', // Undo
      'CmdOrCtrl+A', // Select all
      'CmdOrCtrl+S', // Save
      'CmdOrCtrl+N', // New
      'CmdOrCtrl+O', // Open
      'CmdOrCtrl+W', // Close window
      'CmdOrCtrl+Tab', // Switch apps
      'Alt+Tab', // Switch windows (Windows/Linux)
      'Cmd+Tab', // Switch apps (Mac)
      'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'
    ];
    
    interruptKeys.forEach(key => {
      try {
        globalShortcut.register(key, () => {
          if (isTyping) {
            console.log(`Interrupt key ${key} pressed during clipboard typing, stopping...`);
            stopTypingAndShowWindow();
          }
        });
      } catch (error) {
        // Some keys might already be registered, ignore errors
        console.log(`Could not register ${key} - may already be in use`);
      }
    });
    
  } catch (error) {
    console.error('Failed to start clipboard key monitoring:', error);
  }
}

function stopClipboardKeyMonitoring() {
  if (useRobotjs) return;
  
  // Unregister all shortcuts and re-register our main hotkey
  globalShortcut.unregisterAll();
  registerGlobalShortcuts();
}

// Update System Functions
function startUpdateChecking() {
  // Check for updates immediately
  setTimeout(checkForUpdates, 5000); // 5 second delay after startup
  
  // Check every 30 minutes (30 * 60 * 1000 ms)
  updateCheckInterval = setInterval(checkForUpdates, 30 * 60 * 1000);
}

function stopUpdateChecking() {
  if (updateCheckInterval) {
    clearInterval(updateCheckInterval);
    updateCheckInterval = null;
  }
}

async function checkForUpdates() {
  try {
    const currentTime = Date.now();
    
    // Prevent too frequent checks (minimum 5 minutes between checks)
    if (currentTime - lastUpdateCheck < 5 * 60 * 1000) {
      return null;
    }
    
    lastUpdateCheck = currentTime;
    
    console.log('Checking for updates...');
    
    // Get current version from package.json
    const packageJson = require('../package.json');
    const currentVersion = packageJson.version;
    
    // Fetch remote version
    const remoteVersion = await fetchRemoteVersion();
    
    if (!remoteVersion) {
      console.log('Could not fetch remote version');
      return null;
    }
    
    console.log(`Current version: ${currentVersion}, Remote version: ${remoteVersion}`);
    
    // Compare versions
    if (compareVersions(remoteVersion, currentVersion) > 0) {
      console.log('Update available!');
      
      // Fetch changelog
      const changelog = await fetchChangelog();
      
      const updateInfo = {
        available: true,
        currentVersion,
        newVersion: remoteVersion,
        changelog: changelog || 'Changelog not available',
        releaseUrl: `${UPDATE_CONFIG.releaseBaseUrl}${remoteVersion}`
      };
      
      // Notify renderer if window exists
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-available', updateInfo);
      }
      
      return updateInfo;
    } else {
      console.log('No updates available');
      return { available: false, currentVersion, newVersion: remoteVersion };
    }
    
  } catch (error) {
    console.error('Error checking for updates:', error);
    return null;
  }
}

function fetchRemoteVersion() {
  return new Promise((resolve) => {
    https.get(UPDATE_CONFIG.versionUrl, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const version = data.trim();
          resolve(version);
        } catch (error) {
          console.error('Error parsing remote version:', error);
          resolve(null);
        }
      });
    }).on('error', (error) => {
      console.error('Error fetching remote version:', error);
      resolve(null);
    });
  });
}

function fetchChangelog() {
  return new Promise((resolve) => {
    https.get(UPDATE_CONFIG.changelogUrl, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve(data);
      });
    }).on('error', (error) => {
      console.error('Error fetching changelog:', error);
      resolve(null);
    });
  });
}

function compareVersions(version1, version2) {
  const v1parts = version1.split('.').map(Number);
  const v2parts = version2.split('.').map(Number);
  
  const maxLength = Math.max(v1parts.length, v2parts.length);
  
  for (let i = 0; i < maxLength; i++) {
    const v1part = v1parts[i] || 0;
    const v2part = v2parts[i] || 0;
    
    if (v1part > v2part) return 1;
    if (v1part < v2part) return -1;
  }
  
  return 0;
}

// Periodically check for updates
function startUpdateCheck() {
  if (updateCheckInterval) return;
  
  updateCheckInterval = setInterval(async () => {
    const currentVersion = app.getVersion();
    try {
      await checkForUpdate(currentVersion);
    } catch (error) {
      console.error('Error during update check:', error);
    }
  }, 3600000); // Check every hour
}

function stopUpdateCheck() {
  if (updateCheckInterval) {
    clearInterval(updateCheckInterval);
    updateCheckInterval = null;
  }
}

// Start update checks on app ready
app.on('ready', () => {
  startUpdateCheck();
});

// Stop update checks on app quit
app.on('will-quit', () => {
  stopUpdateCheck();
});
