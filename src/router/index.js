import { createRouter, createWebHistory } from 'vue-router';
import { getAuth } from 'firebase/auth';
import LoginPage from '@/components/LoginPage.vue';
import RegisterPage from '@/components/RegisterPage.vue';
import WelcomingPage from '@/components/WelcomingPage.vue';
import ChatView from '@/components/ChatView.vue'; 
import ProfilePage from '@/components/ProfilePage.vue';
import GroupChatView from '@/components/ChatGroupe.vue';
import CreateGroup from '@/components/CreateGroup.vue';
import GroupInfos from '@/components/GroupeInfos';

const routes = [
  {
    path:'/GroupInfos/:groupId',
    component:GroupInfos,
    name: 'GroupInfos'
  },
  {
    path:'/CreateGroup',
    component: CreateGroup,
    name:'CreateGroup',
  },
  {
    path:'/chat/:groupId',
    name: 'GroupChatView',
    component: GroupChatView,
    props:true
  },
  {
    path:'/ProfileView',
    name:'ProfileView',
    component: ProfilePage,
    meta: { requiresAuth: true }
  },
  { path: '/',name: 'Welcoming', component: WelcomingPage },
  { path: '/register', name: 'RegisterPage',component: RegisterPage, },
  { path: '/login', component:LoginPage },
  {
    path: '/chat/:chatId',
    name: 'ChatView',
    component: ChatView,
    props: true 
  },
  {
    path: '/home',
    name : 'Home',
    component: () => import('@/components/HomePage.vue'),
    meta: { requiresAuth: true,hasBackground: true },
    children: [
      {
        path: 'discover',
        component: () => import('@/components/DiscoverList.vue'),
        meta: { hasBackground: false }
      },
      {
        path: 'contacts',
        component: () => import('@/components/ContactsList.vue'),
        meta: { hasBackground: false }
      },
      {
        path: 'groups',
        component: () => import('@/components/GroupsList.vue'),
        meta: { hasBackground: false }

      }
    ]
  }
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
  scrollBehavior() {
    return { top: 0 };
  },
});

// 🚨 Global auth guard
router.beforeEach((to, from, next) => {
  const auth = getAuth();
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);

  // Watch for changes in the auth state
  auth.onAuthStateChanged(user => {
    if (requiresAuth && !user) {
      next('/'); // Redirect to the welcome page if not authenticated
    } else {
      next(); // Proceed if authenticated
    }
  });
});

export default router;
