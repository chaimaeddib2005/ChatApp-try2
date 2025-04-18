<script setup>
import { ref, onMounted } from 'vue'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/firebase'
import UserProfile from '@/components/UserProfile.vue'

const userData = ref(null)
const authReady = ref(false)

onMounted(() => {
  const auth = getAuth()

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      const userRef = doc(db, 'users', user.uid)
      const snapshot = await getDoc(userRef)
      if (snapshot.exists()) {
        userData.value = { ...snapshot.data(), email: user.email }
      }
    }
    authReady.value = true
  })
})
</script>

<template>
  <div class="profile-page" v-if="authReady">
    <UserProfile v-if="userData" :user="userData" />
    <p v-else>Loading user data...</p>
  </div>
</template>