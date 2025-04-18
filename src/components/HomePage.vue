<template>
    <div>
      <NavBar @search="onSearch" />
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
  