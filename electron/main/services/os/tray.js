import { app, Menu, Tray } from 'electron'
import icon from '../../../../resources/icon.png?asset'

let tray = null

/**
 * 创建系统托盘
 * @param {import('electron').BrowserWindow} mainWindow
 * @returns {Tray}
 */
export function createTray(mainWindow) {
  if (tray) return tray

  tray = new Tray(icon)

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示窗口',
      click: () => {
        mainWindow.show()
        mainWindow.focus()
      }
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.quit()
      }
    }
  ])

  tray.setToolTip(app.name)
  tray.setContextMenu(contextMenu)

  tray.on('click', () => {
    mainWindow.show()
    mainWindow.focus()
  })

  return tray
}

/**
 * 销毁托盘（退出前调用）
 */
export function destroyTray() {
  if (tray) {
    tray.destroy()
    tray = null
  }
}
