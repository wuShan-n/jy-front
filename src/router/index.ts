import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'

const routes: Array<RouteRecordRaw> = [
    {
        path: '/',
        name: 'Home',
        component: () => import('@/views/Home.vue'),
        redirect: '/chat'
    },
    {
        path: '/chat',
        name: 'Chat',
        component: () => import('@/views/ChatView.vue'),
        children: [
            {
                path: ':sessionId?',
                name: 'ChatSession',
                component: () => import('@/views/ChatView.vue'),
                props: true
            }
        ]
    },
    {
        path: '/sessions',
        name: 'Sessions',
        component: () => import('@/views/SessionList.vue')
    },
    {
        path: '/:pathMatch(.*)*',
        name: 'NotFound',
        redirect: '/chat'
    }
]

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes
})

// 路由守卫：可以在这里添加认证逻辑
router.beforeEach((to, from, next) => {
    // 如果需要认证，可以在这里检查
    // const isAuthenticated = localStorage.getItem('token')
    // if (to.meta.requiresAuth && !isAuthenticated) {
    //   next('/login')
    // } else {
    //   next()
    // }
    next()
})

export default router