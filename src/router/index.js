import { createRouter, createWebHistory } from 'vue-router';
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
  },
  { path: '/',name: 'Welcoming', component: WelcomingPage },
  
  { path: '/register', name: 'RegisterPage',component: RegisterPage,},
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
    children: [
      {
        path: 'discover',
        component: () => import('@/components/DiscoverList.vue')
      },
      {
        path: 'contacts',
        component: () => import('@/components/ContactsList.vue')
      },
      {
        path: 'groups',
        component: () => import('@/components/GroupsList.vue')
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

import { getAuth } from 'firebase/auth';

router.beforeEach((to, from, next) => {
  const hasVisited = localStorage.getItem('hasVisited');
  const auth = getAuth();
  const user = auth.currentUser;

  if (!hasVisited && to.name !== 'Welcoming') {
    localStorage.setItem('hasVisited', true);
    return next({ name: 'Welcoming' });
  }

  if (to.name === 'Welcoming' && user) {
    // if already logged in, skip the welcoming page
    return next({ name: 'Home' });
  }

  next();
});
export default router;
