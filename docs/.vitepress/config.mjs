import { defineConfig } from 'vitepress'

export default defineConfig({
  lang: 'zh-CN',
  title: 'Electron + Vue + Python',
  description: '三端通信脚手架的完整介绍：Electron 主进程、Vue 渲染端、Python 后端',
  base: '/electron-python-template/',
  lastUpdated: true,
  cleanUrls: true,

  head: [
    ['meta', { name: 'theme-color', content: '#3c8772' }]
  ],

  themeConfig: {
    nav: [
      { text: '指南', link: '/guide/' },
      { text: '配置', link: '/guide/config' }
    ],

    sidebar: [
      {
        text: '指南',
        items: [
          { text: '项目介绍', link: '/guide/' },
          { text: '快速开始', link: '/guide/quick-start' },
          { text: '架构总览', link: '/guide/architecture' },
          { text: '目录结构', link: '/guide/structure' }
        ]
      },
      {
        text: 'Electron 主进程',
        items: [
          { text: '主进程入口', link: '/guide/main-process' },
          { text: 'IPC 系统', link: '/guide/ipc' },
          { text: 'Python 服务管理', link: '/guide/python-service' },
          { text: 'Bridge 反向通信', link: '/guide/electron-bridge' },
          { text: '通信通道', link: '/guide/communication' }
        ]
      },
      {
        text: 'Vue 渲染端',
        items: [
          { text: '目录结构', link: '/guide/web-structure' },
          { text: 'API 调用', link: '/guide/web-api' },
          { text: '状态管理', link: '/guide/stores' }
        ]
      },
      {
        text: 'Python 后端',
        items: [
          { text: '路由与中间件', link: '/guide/python-server' },
          { text: 'Bridge API', link: '/guide/python-bridge' },
          { text: 'Presenter 业务层', link: '/guide/presenter' },
          { text: '守护进程', link: '/guide/daemon' },
          { text: '守护与生命周期', link: '/guide/lifecycle' }
        ]
      },
      {
        text: '配置',
        items: [
          { text: '应用配置', link: '/guide/config' },
          { text: 'Electron Builder 配置', link: '/guide/electron-builder-config' },
          { text: 'Python 打包配置', link: '/guide/python-build-config' }
        ]
      },
      {
        text: '开发',
        items: [
          { text: '开发流程', link: '/guide/development' },
          { text: '使用流程', link: '/guide/usage' },
          { text: '打包发布', link: '/guide/build' },
          { text: '常见问题', link: '/guide/faq' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com' }
    ],

    footer: {
      message: '基于 MIT 协议发布',
      copyright: 'Copyright (c) Electron Python Template'
    },

    outline: {
      label: '本页大纲',
      level: [2, 3]
    },

    docFooter: {
      prev: '上一篇',
      next: '下一篇'
    },

    lastUpdatedText: '最后更新',
    returnToTopLabel: '返回顶部',
    sidebarMenuLabel: '菜单',
    darkModeSwitchLabel: '主题',
    lightModeSwitchTitle: '切换到浅色模式',
    darkModeSwitchTitle: '切换到深色模式'
  }
})
