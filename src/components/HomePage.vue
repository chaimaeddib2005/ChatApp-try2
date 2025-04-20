<template>
  <div class="moroccan-chat-theme">
    <NavBar @search="onSearch" />
    
    <div v-if="$route.meta.hasBackground" class="fullscreen-background">
      <h1 class="app-title"> كَاسْ داتايْ</h1>
      <p class="app-motto">Conversations start here.</p>
    </div>

    <router-view :searchQuery="searchQuery" />
  </div>
</template>


<script>
import NavBar from '@/components/NavBar.vue'

export default {
  components: {
    NavBar
  },
  data() {
    return {
      searchQuery: ''
    }
  },
  methods: {
    onSearch(query) {
      this.searchQuery = query
    }
  }
}
</script>
<style scoped>

.moroccan-chat-theme {
  font-family: 'Amiri', 'Noto Sans Arabic', sans-serif;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
 
}

/* Background only shows when home-background class is present */
.home-background {
  background: #f9f5ee; /* Fallback color */
}

.home-background ,.fullscreen-background {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-image: url('~@/assets/atay.jpeg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-color: rgba(0, 0, 0, 0.3);
  background-blend-mode: multiply;
  padding: 20px;
  text-align: center;
}

.app-title {
  font-size: 4.5rem;
  color: #f5e0c7; /* soft latte beige */
  text-shadow: 2px 2px 6px rgba(0, 0, 0, 0.5); /* darker brown shadow */
  margin: 0 0 1rem 0;
  letter-spacing: 2px;
  font-weight: 700;
}

.app-motto {
  font-size: 1.8rem;
  color: #c7a374;
  text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.5); /* softer brown shadow */
  margin: 0;
  font-weight: 500;
  max-width: 80%;
  line-height: 1.4;
}

@media (max-width: 768px) {
  .app-title {
    font-size: 3.2rem;
  }
  .app-motto {
    font-size: 1.3rem;
  }
}

@media (max-width: 480px) {
  .app-title {
    font-size: 2.5rem;
  }
  .app-motto {
    font-size: 1.1rem;
  }
}
</style>