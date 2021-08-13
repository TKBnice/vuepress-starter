module.exports = {
	title: 'TKBnice的博客',
	description: '系统性学习，打造完善的知识体系',
	// head: [['link', { rel: 'icon', href: '/logo.png' }]],
	themeConfig: {
		smoothScroll: true,
		logo: '/logo.jpg',
		nav: [
			{ text: '首页', link: '/' },
			{ text: '文章目录', link: '/blog/' },
			{ text: 'Guide', link: '/guide/' },
			{ text: 'External', link: 'https://google.com' }
		],
		sidebar: [
			{
				title: '文章目录', // 必要的
				path: '/blog/', // 可选的, 标题的跳转链接，应为绝对路径且必须存在
				collapsable: false, // 可选的, 默认值是 true,
				sidebarDepth: 1 // 可选的, 默认值是 1
			},
			{
				title: 'Tree 树形组件',
				path: '/blog/tree' // 可选的, 标题的跳转链接，应为绝对路径且必须存在
			},
			{
				title: 'guide',
				path: '/guide/' // 可选的, 标题的跳转链接，应为绝对路径且必须存在
			},
			{
				title: 'html',
				path: '/blog/html/' // 可选的, 标题的跳转链接，应为绝对路径且必须存在
			},
			{
				title: 'css',
				path: '/blog/css/' // 可选的, 标题的跳转链接，应为绝对路径且必须存在
			},
			{
				title: 'js',
				path: '/blog/js/' // 可选的, 标题的跳转链接，应为绝对路径且必须存在
			}
		],
		sidebarDepth: 2,
		lastUpdated: 'Last Updated',
		searchMaxSuggestoins: 10,
		serviceWorker: {
			updatePopup: {
				message: '有新的内容.',
				buttonText: '更新'
			}
		},
		editLinks: true,
		editLinkText: '在 GitHub 上编辑此页 ！'
	}
}
