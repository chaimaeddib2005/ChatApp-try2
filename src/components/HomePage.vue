<template>
  <div class="moroccan-chat-theme">
    <NavBar @search="onSearch" />

    <div v-if="route.meta.hasBackground" class="fullscreen-background">
      <h1 class="app-title">كَاسْ داتايْ</h1>
      <p class="app-motto">the simplicity of a chat, the warmth of the moment.</p>
    </div>

    <router-view :searchQuery="searchQuery" />
  </div>
</template>
<script setup>
import { onMounted, ref } from 'vue'
import { getToken, onMessage } from 'firebase/messaging'
import { getAuth } from 'firebase/auth'
import { db, initMessaging } from '../firebase'
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  serverTimestamp,
  getDoc,
  getDocs
} from 'firebase/firestore'
import NavBar from '@/components/NavBar.vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const messages = ref([])
const auth = getAuth()
const searchQuery = ref('')
const userGroupLinks = ref([]) // [{ groupId, messageIds }]

const onSearch = (query) => {
  searchQuery.value = query
}

const handleNotificationRedirect = (groupId) => {
  window.focus()
  router.push(`/chat/${groupId}`)
}

onMounted(async () => {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    console.warn('🚫 Notifications refusées')
    return
  }

  const messaging = await initMessaging()
  if (!messaging) {
    console.warn('🔥 Messaging non supporté')
    return
  }

  const token = await getToken(messaging, {
    vapidKey: 'BPtupQDzM2xzY7TZNaCDVgXL3KBk7qjQLFT-KlhMh0wnqjqBZ2br-_l1dpYCZlPZ99FgEcRzZkfuIj7GxJIuoaI'
  })

  const currentUser = auth.currentUser
  if (token && currentUser) {
    await setDoc(doc(db, 'tokens', currentUser.uid), {
      token,
      updatedAt: serverTimestamp()
    })
    console.log('✅ Token enregistré dans Firestore')
  }

  onMessage(messaging, (payload) => {
    const { title, body } = payload.notification
    const notification = new Notification(title, { body })
    notification.onclick = () => window.focus()
  })

  const currentUserId = currentUser?.uid
  if (!currentUserId) return

  // 📥 Charger tous les groupes et leurs messages
  try {
    const groupSnap = await getDocs(collection(db, 'groups'))
    groupSnap.forEach(groupDoc => {
      const data = groupDoc.data()
      if (data.members && data.members.includes(currentUserId)) {
        userGroupLinks.value.push({
          groupId: groupDoc.id,
          messageIds: data.messages || []
        })
      }
    })
    console.log('✅ Groupes utilisateur chargés:', userGroupLinks.value)
  } catch (e) {
    console.warn('⚠️ Erreur chargement groupes:', e)
  }

  let firstLoadPrivate = true
  let firstLoadGroup = true

  // 🔁 Private messages
  onSnapshot(collection(db, 'chatMessages'), (snapshot) => {
    snapshot.docChanges().forEach(async (change) => {
      const message = { id: change.doc.id, ...change.doc.data() }

      if (change.type === 'added' && message.receiver === currentUserId) {
        if (firstLoadPrivate) return
        messages.value.push(message)

        let senderName = 'Quelqu’un'
        try {
          const senderDoc = await getDoc(doc(db, 'users', message.sender))
          if (senderDoc.exists()) {
            senderName = senderDoc.data().name || senderName
          }
        } catch (e) {
          console.warn('Erreur nom utilisateur (privé):', e)
        }

        const notification = new Notification('📩 Nouveau message', {
          body: `${senderName}: ${message.message}`
        })
        notification.onclick = () => router.push(`/chat/${message.chatId}`)
      }
    })
    firstLoadPrivate = false
  })

  // 🔁 Group messages (based on group.messageIds)
  onSnapshot(collection(db, 'groupe_messages'), (snapshot) => {
    snapshot.docChanges().forEach(async (change) => {
      const message = { id: change.doc.id, ...change.doc.data() }

      const matchedGroup = userGroupLinks.value.find(g =>
        g.messageIds.includes(message.id)
      )

      if (change.type === 'added' && matchedGroup) {
        if (firstLoadGroup) return
        messages.value.push(message)

        let senderName = 'Quelqu’un'
        try {
          const senderDoc = await getDoc(doc(db, 'users', message.sender))
          if (senderDoc.exists()) {
            senderName = senderDoc.data().name || senderName
          }
        } catch (e) {
          console.warn('Erreur nom utilisateur (groupe):', e)
        }

        const notification = new Notification('📢 Message de groupe', {
          body: `${senderName}: ${message.message}`
        })
        notification.onclick = () => handleNotificationRedirect(matchedGroup.groupId)
      }
    })
    firstLoadGroup = false
  })
})
</script>

<style scoped>
.moroccan-chat-theme {
  font-family: 'Amiri', 'Noto Sans Arabic', sans-serif;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.home-background,
.fullscreen-background {
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
  color: #f5e0c7;
  text-shadow: 2px 2px 6px rgba(0, 0, 0, 0.5);
  margin: 0 0 1rem 0;
  letter-spacing: 2px;
  font-weight: 700;
}

.app-motto {
  font-size: 1.8rem;
  color: #c7a374;
  text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.5);
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
