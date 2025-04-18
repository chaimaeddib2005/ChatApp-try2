<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { messaging, getToken, onMessage } from './firebase'

onMounted(async () => {
  const permission = await Notification.requestPermission()
  if (permission === "granted") {
    const token = await getToken(messaging, {
      vapidKey: "BPtupQDzM2xzY7TZNaCDVgXL3KBk7qjQLFT-KlhMh0wnqjqBZ2br-_l1dpYCZlPZ99FgEcRzZkfuIj7GxJIuoaI"  // depuis Firebase > Cloud Messaging
    })
    console.log("🔐 Token FCM :", token)
    // 🔄 Tu peux envoyer ce token à Firestore ou le copier pour test
  }

  onMessage(messaging, payload => {
    console.log("📥 Notification reçue (foreground) :", payload)
    alert("Notification : " + payload.notification.title)
  })
})
</script>