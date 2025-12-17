import { app, BrowserWindow, ipcMain } from 'electron'
import { join, dirname } from 'path'
import { format } from 'url'
import { isDev } from './utils/environment'
// Use new modular IPC handlers
import { registerAllHandlers } from './ipc/handlers'
import { registerSimplifiedHandlers } from './ipc/simplifiedHandlers'
import { registerDiscoveryHandlers } from './ipc/discoveryHandlers'

// Remote debugging is enabled via Playwright's electron.launch() automatically

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
      nodeIntegration: process.env.TEST_MODE === 'true',
      contextIsolation: process.env.TEST_MODE !== 'true',
      preload: join(__dirname, 'preload.js'),
      zoomFactor: 1.0
    },
    titleBarStyle: 'default',
    show: false,
    title: 'My MCP Manager'
  })

  console.log('[Main] WebPreferences:', {
    nodeIntegration: process.env.TEST_MODE === 'true',
    contextIsolation: process.env.TEST_MODE !== 'true',
    testMode: process.env.TEST_MODE
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
    // Try to use the VITE_PORT environment variable, or scan for running dev server
    const vitePort = process.env.VITE_PORT || '5175'
    const devUrl = `http://localhost:${vitePort}`
    console.log(`[Main] Loading development URL: ${devUrl}`)
    mainWindow.loadURL(devUrl)
    mainWindow.webContents.openDevTools()
  } else {
    // In production, files should be loaded from within the ASAR archive
    console.log('[Main] __dirname:', __dirname)
    console.log('[Main] process.resourcesPath:', process.resourcesPath)
    console.log('[Main] App path:', app.getAppPath())

    // Determine the correct path for the renderer files
    const appPath = app.getAppPath()
    // The renderer is always at dist/renderer/index.html relative to app root
    const rendererPath = join(appPath, 'dist/renderer/index.html')
    console.log('[Main] Trying to load renderer from:', rendererPath)

    mainWindow.loadFile(rendererPath).catch(async error => {
      console.error('[Main] Primary path failed:', error)
      
      // Fallback paths if the primary doesn't work
      const fallbackPaths = [
        join(__dirname, '../../../renderer/index.html'), // Relative from main.js
        join(__dirname, '../../renderer/index.html'), // Alternative relative path
        join(process.resourcesPath, 'app.asar/dist/renderer/index.html'), // Direct ASAR path
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
            console.error('[Main] Fallback path failed:', fallbackPath, (fallbackError as Error).message)
          }
        }
      }
      
      if (!loaded) {
        console.error('[Main] All paths failed. App structure may be incorrect.')
        // As a last resort, try to load a simple HTML page to show we can load files
        const simpleHtml = `
          <html>
            <head><title>MCP Configuration Manager - Loading Error</title></head>
            <body>
              <h1>Loading Error</h1>
              <p>Could not load the application interface.</p>
              <p>App path: ${app.getAppPath()}</p>
              <p>Resource path: ${process.resourcesPath}</p>
              <p>__dirname: ${__dirname}</p>
            </body>
          </html>
        `
        mainWindow?.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(simpleHtml)}`)
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
app.whenReady().then(async () => {
  createWindow()

  // Register all modular IPC handlers
  registerAllHandlers()

  // Register simplified handlers
  registerSimplifiedHandlers()

  // Register discovery handlers (separate from InstallationHandler until migration complete)
  registerDiscoveryHandlers()

  // Prefetch metrics for all installed servers on startup (if enabled)
  // Bug-022 fix: This is now disabled by default to prevent OAuth triggers
  setTimeout(async () => {
    try {
      // Check settings to see if prefetch is enabled
      const { join } = await import('path')
      const fs = await import('fs-extra')
      const settingsPath = join(app.getPath('userData'), 'app-settings.json')

      let prefetchEnabled = false // Default to disabled
      if (await fs.pathExists(settingsPath)) {
        const settings = await fs.readJson(settingsPath)
        prefetchEnabled = settings?.sync?.prefetchMetricsOnStartup === true
      }

      if (!prefetchEnabled) {
        console.log('[Main] Metrics prefetch disabled (settings.sync.prefetchMetricsOnStartup = false)')
        console.log('[Main] To enable, go to Settings > Sync > "Prefetch metrics on startup"')
        return
      }

      console.log('[Main] Starting metrics prefetch for all installed servers...')
      const { container } = await import('./container')
      const metricsService = container.getMetricsService()
      await (metricsService as any).prefetchMetricsForAllServers()
      console.log('[Main] Metrics prefetch complete')
    } catch (error) {
      console.error('[Main] Failed to prefetch metrics:', error)
    }
  }, 5000) // Delay by 5 seconds to let the app fully initialize

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
