import { createApp } from 'vue';
import App from './App.vue';
import router from './router';

const app = createApp(App);
app.use(router);
app.mount('#app');


import { onMounted } from 'vue';
import { onMessage } from '@/firebase';
import { useNotification } from '@vueuse/core';

export default {
  setup() {
    const { show } = useNotification();
    
    onMounted(() => {
      // Listen for messages while app is in foreground
      onMessage((payload) => {
        console.log('Message received in foreground:', payload);
        
        show({
          title: payload.notification?.title || 'New message',
          body: payload.notification?.body || 'You have a new notification',
          icon: payload.notification?.icon
        });
        
        // You can also update your in-app notifications state here
      });
    });
  }
}