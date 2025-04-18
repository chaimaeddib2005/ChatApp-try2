<template>
  <div class="contacts-container">
    <h2>Chats</h2>
    <div
      v-for="contact in filteredContacts"
      :key="contact.id"
      class="contact"
      @click="goToChat(contact.chatId)"
    >
      <img :src="contact.photoURL || '/default-profile.png'" alt="Profile" class="profile-img" />
      <div class="contact-info">
        <strong>{{ contact.name }}</strong>
        <p>{{ contact.lastMessage || 'No messages yet' }}</p>
      </div>
    </div>
  </div>
</template>

<script>
import { db } from '../firebase'
import { doc, getDoc, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

export default {
  name: 'ContactsList',
  props: {
    searchQuery: String,
  },
  data() {
    return {
      contacts: [],
      userReady: false,
    };
  },
  async created() {
    const auth = getAuth();
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        await this.fetchContacts(user.uid);
        this.userReady = true;
      }
    });
  },
  computed: {
    filteredContacts() {
      if (!this.searchQuery) return this.contacts;
      return this.contacts.filter(contact =>
        contact.name.toLowerCase().includes(this.searchQuery.toLowerCase())
      );
    },
  },
  methods: {
    async fetchContacts(userId) {
      const userDoc = await getDoc(doc(db, 'users', userId));
      const contactsMap = userDoc.data()?.Contacts || {};

      const contactsArray = await Promise.all(Object.entries(contactsMap).map(async ([contactId, chatId]) => {
        const contactDoc = await getDoc(doc(db, 'users', contactId));
        const contactData = contactDoc.data();

        // Fetch latest message from chatMessages collection
        let lastMessage = '';
        const messagesQuery = query(
  collection(db, 'chats', chatId, 'messages'),
  orderBy('timestamp', 'desc'),
  limit(1)
);
const messageSnap = await getDocs(messagesQuery);

console.log(`Chat ID: ${chatId}`);
console.log('Message snapshot:', messageSnap.docs.map(doc => doc.data()));

if (!messageSnap.empty) {
  const data = messageSnap.docs[0].data();
  console.log('Fetched message data:', data);
  lastMessage = data.message || data.text || '';
}


        return {
          id: contactId,
          name: contactData.name || 'Unknown',
          photoURL: contactData.photoURL || '',
          lastMessage,
          chatId,
        };
      }));

      this.contacts = contactsArray;
    },
    goToChat(chatId) {
      this.$router.push({ name: 'ChatView', params: { chatId } });
    },
  },
};
</script>

<style scoped>
.contacts-container {
  padding: 1.5rem;
  max-width: 600px;
  margin: auto;
  text-align: left;
}

.contact {
  display: flex;
  align-items: center;
  padding: 10px;
  margin-bottom: 1rem;
  background: #f9f9f9;
  border-radius: 10px;
  transition: background 0.2s ease;
  cursor: pointer;
}

.contact:hover {
  background-color: #ececec;
}

.profile-img {
  width: 45px;
  height: 45px;
  border-radius: 50%;
  margin-right: 15px;
}

.contact-info p {
  color: #666;
  font-size: 0.9rem;
  margin: 0;
}
</style>
