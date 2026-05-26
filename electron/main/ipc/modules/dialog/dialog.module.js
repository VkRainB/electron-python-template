import { createRequire } from 'node:module'
import { z } from 'zod'

const _nodeRequire = createRequire(import.meta.url)
const { dialog, BrowserWindow } = _nodeRequire('electron')

const selectDirSchema = z
  .object({
    title: z.string().optional(),
    defaultPath: z.string().optional()
  })
  .optional()

/**
 * @type {import('../core/ipc-router.js').IpcModule}
 */
export default {
  name: 'dialog',
  handlers: [
    {
      channel: 'dialog:select-directory',
      schema: selectDirSchema,
      handler: async (ctx) => {
        const options = ctx.validatedPayload || {}
        const win = BrowserWindow.fromWebContents(ctx.event.sender)
        const result = await dialog.showOpenDialog(win, {
          properties: ['openDirectory', 'createDirectory'],
          title: options.title || '选择文件夹',
          defaultPath: options.defaultPath
        })
        if (result.canceled) return { canceled: true, path: null }
        return { canceled: false, path: result.filePaths[0] || null }
      }
    }
  ]
}
