import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { isDev } from './utils/environment'
import { setupIpcHandlers } from './ipc/handlers'
import { registerSimplifiedHandlers } from './ipc/simplifiedHandlers'

let mainWindow: BrowserWindow | null = null

const createWindow = (): void => {
  console.log('[Main] Creating window...')
  console.log('[Main] __dirname:', __dirname)
  console.log('[Main] isDev():', isDev())
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js'),
      zoomFactor: 1.0
    },
    titleBarStyle: 'default',
    show: false,
    title: 'MCP Configuration Manager'
  })

  // Add error handling for renderer loading
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('[Main] Failed to load renderer:', errorCode, errorDescription, validatedURL)
  })

  mainWindow.webContents.on('crashed', (event, killed) => {
    console.error('[Main] Renderer crashed:', killed)
  })

  // Load the renderer
  if (isDev()) {
    console.log('[Main] Loading development URL: http://localhost:5175')
    mainWindow.loadURL('http://localhost:5175')
    mainWindow.webContents.openDevTools()
  } else {
    // In production, when packaged with electron-builder, files are in the asar archive
    // The renderer files should be directly accessible from __dirname/../renderer/
    const rendererPath = join(__dirname, '../renderer/index.html')
    console.log('[Main] Loading production file:', rendererPath)
    console.log('[Main] __dirname contents:', __dirname)
    
    mainWindow.loadFile(rendererPath).catch(async error => {
      console.error('[Main] Failed to load renderer file:', error)
      console.error('[Main] Current working directory:', process.cwd())
      console.error('[Main] Resource path:', process.resourcesPath)
      
      // Try multiple fallback paths for different packaging scenarios
      const fallbackPaths = [
        join(process.resourcesPath, 'app/dist/renderer/index.html'),
        join(__dirname, '../../dist/renderer/index.html'),
        join(__dirname, '../dist/renderer/index.html'),
        join(process.resourcesPath, 'app.asar/dist/renderer/index.html')
      ]
      
      let loaded = false
      for (const fallbackPath of fallbackPaths) {
        if (!loaded) {
          console.log('[Main] Trying fallback path:', fallbackPath)
          try {
            await mainWindow?.loadFile(fallbackPath)
            console.log('[Main] Successfully loaded from:', fallbackPath)
            loaded = true
            break
          } catch (fallbackError) {
            console.error('[Main] Fallback path failed:', fallbackPath, fallbackError)
          }
        }
      }
      
      if (!loaded) {
        console.error('[Main] All fallback paths failed')
      }
    })
  }

  mainWindow.once('ready-to-show', () => {
    console.log('[Main] Window ready to show')
    mainWindow?.show()
  })

  mainWindow.on('closed', () => {
    console.log('[Main] Window closed')
    mainWindow = null
  })
}

// App event handlers
app.whenReady().then(() => {
  createWindow()
  
  // Setup IPC handlers
  setupIpcHandlers()
  
  // Register simplified handlers
  registerSimplifiedHandlers()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// IPC handlers are now handled in setupIpcHandlers()
