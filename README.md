<div align="center">
  <h1>⌨️ Keysmash</h1>
  <p><strong>Beautiful, customizable autotyper built with Electron</strong></p>
  <p>Type efficiently. Look professional. Work seamlessly across platforms.</p>

  <img src="https://img.shields.io/badge/version-1.0.0-brightgreen?style=for-the-badge">
  <img src="https://img.shields.io/badge/platform-Windows%20|%20macOS%20|%20Linux-blue?style=for-the-badge">
  <img src="https://img.shields.io/badge/built%20with-electron-9feaf9?style=for-the-badge&logo=electron&logoColor=black">
</div>

---

## ✨ Features

### 🎯 **Intelligent Typing System**
- **Dual-Mode Operation**: RobotJS for precision, clipboard fallback for compatibility
- **Cross-Platform**: Works seamlessly on Windows, macOS, and Linux
- **Smart Fallback**: Automatically adapts to system capabilities

### ⚡ **Advanced Controls**
- **Adjustable Speed**: Fine-tune typing delay from lightning-fast to deliberate
- **Loop Mode**: Auto-repeat functionality for continuous typing
- **Global Hotkeys**: Start/stop from anywhere with Ctrl+Shift+T (Cmd+Shift+T on Mac)
- **Smart Interruption**: Multiple ways to safely stop typing (Escape, shortcuts, mouse movement)

### 🎨 **Modern Interface**
- **Professional Design**: Clean, modern UI with gradient backgrounds
- **Real-Time Feedback**: Live status indicators and character counting
- **Responsive Layout**: Adapts to different window sizes
- **Accessibility**: Full keyboard navigation and screen reader support

### 📝 **Smart Text Management**
- **Text History**: Automatically saves your last 10 text entries
- **Lorem Ipsum Generator**: One-click placeholder text generation
- **Persistent Storage**: Settings and history survive app restarts
- **Multi-Line Support**: Handles complex text with formatting

### 🔄 **Auto-Update System**
- **Automatic Checking**: Checks for updates every 30 minutes
- **Beautiful Notifications**: Elegant update modal with changelog
- **Direct Downloads**: One-click access to latest releases
- **Version Management**: Semantic versioning with detailed release notes

---

## 🚀 Getting Started

### Option 1: Download Release (Recommended)

1. Visit the [Releases](https://github.com/jay-bman725/Keysmash/releases) page
2. Download the latest version for your platform:
   - **Windows**: `windows-Keysmash-v1.0.0-x64.exe` or `windows-Keysmash-v1.0.0-arm64.exe`
   - **macOS**: `macos-Keysmash-v1.0.0-x64.dmg` or `macos-Keysmash-v1.0.0-arm64.dmg`
   - **Linux**: `linux-Keysmash-v1.0.0.deb` or `linux-Keysmash-v1.0.0.AppImage`
3. Install and run!

### Option 2: Build from Source

#### 1. Clone the repository

```bash
git clone https://github.com/jay-bman725/Keysmash.git
cd Keysmash
```

#### 2. Install dependencies

```bash
npm install
```

#### 3. Run in development mode

```bash
npm start
```

---

## � Usage

### Basic Operation
1. **Enter your text** in the large text area
2. **Adjust typing speed** with the delay slider (10ms - 500ms)
3. **Enable loop mode** for continuous typing (optional)
4. **Click "Start Typing"** or use the global hotkey `Ctrl+Shift+T`
5. **Focus your target application** and watch Keysmash type for you!

### Global Hotkey
- **Start/Stop**: `Ctrl+Shift+T` (Windows/Linux) or `Cmd+Shift+T` (macOS)
- **Emergency Stop**: Press `Escape` or common shortcuts (`Ctrl+C`, `Ctrl+S`, etc.)

### Text History
- Access previously used text with one click
- Automatically saves unique entries
- Survives app restarts

---

## 📦 Building

### Build for current platform
```bash
npm run build
```

### Build for specific platforms
```bash
# macOS
npm run build:mac

# Windows
npm run build:win

# Linux
npm run build:linux
```

---

## 🧰 Tech Stack

### Core Technologies
- **[Electron](https://electronjs.org/)** - Cross-platform desktop framework
- **[Node.js](https://nodejs.org/)** - JavaScript runtime for system integration

### Key Dependencies
- **[robotjs](https://github.com/octalmage/robotjs)** - Direct keyboard simulation (when available)
- **[electron-store](https://github.com/sindresorhus/electron-store)** - Persistent settings storage
- **[electron-updater](https://github.com/electron-userland/electron-updater)** - Auto-update functionality

### System Integration
- **Native Clipboard API** - Fallback typing method for maximum compatibility
- **Global Shortcuts** - System-wide hotkey registration
- **Cross-Platform Commands** - OS-specific paste simulation (AppleScript, PowerShell, xdotool)

---

## ⚠️ Disclaimer

This project is for educational purposes only. Don’t use it to spam games, websites, or anything you don’t have permission for.

---

## 💬 Contributing

Open to contributions, feature suggestions, and UI mockups. Fork it, mod it, make it your own.

---

## 📄 License

MIT

---

<div align="center">
  <sub>Made with ❤️ by <a href="https://github.com/jay-bman725">Jay</a></sub>
</div>