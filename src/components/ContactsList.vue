<template style="background-color:#f0e6d6">
  <div class="contacts-container">
    <h2 class="section-title">Chats</h2>
    <div
      v-for="contact in filteredContacts"
      :key="contact.id"
      class="contact"
      @click="goToChat(contact.chatId)"
    >
      <img :src="contact.photoURL || '/moroccan-tea-default.jpg'" alt="Profile" class="profile-img" />
      <div class="contact-info">
        <strong>{{ contact.name }}</strong>
        <p>{{ contact.lastMessage || 'No messages yet' }}</p>
      </div>
    </div>
  </div>
</template>

<script>
/* Script remains exactly the same */
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

        let lastMessage = '';
        const messagesQuery = query(
          collection(db, 'chats', chatId, 'messages'),
          orderBy('timestamp', 'desc'),
          limit(1)
        );
        const messageSnap = await getDocs(messagesQuery);

        if (!messageSnap.empty) {
          const data = messageSnap.docs[0].data();
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
  width: 100%;
  margin: 0 auto;
  background: #f9f5ee; /* Warm ivory background */
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center; /* Center children horizontally */
}

.contacts-container h2 {
  color: #8b3a3a; /* Moroccan red */
  font-family: 'Amiri', serif;
  text-align: center;
  margin-bottom: 2rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid #d4a762; /* Gold accent */
  font-size: 1.8rem;
  width: 100%; /* Make heading take full width */
}

.contact {
  display: flex;
  align-items: center;
  padding: 1.25rem;
  background: rgba(255, 255, 255, 0.9); /* Semi-transparent white */
  border-radius: 12px;
  box-shadow: 0 3px 10px rgba(139, 58, 58, 0.1);
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  cursor: pointer;
  margin-bottom: 1rem;
  border-left: 4px solid transparent;
  backdrop-filter: blur(5px);
  width: 80%; /* Reduced from 100% */
  max-width: 500px; /* Maximum width for larger screens */
}

.contact:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 15px rgba(139, 58, 58, 0.2);
  border-left-color: #d4a762; /* Gold accent */
  background: white;
}

.profile-img {
  width: 55px;
  height: 55px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #d4a762; /* Gold border */
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  margin-right: 1.25rem;
  transition: transform 0.3s ease;
}

.contact:hover .profile-img {
  transform: scale(1.05);
}

.contact-info {
  flex: 1;
  min-width: 0;
  padding-right: 1rem;
}

.contact-info strong {
  color: #5c4d3a; /* Dark brown */
  font-weight: 700;
  font-size: 1.1rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
  margin-bottom: 0.25rem;
  font-family: 'Amiri', serif;
}

.contact-info p {
  color: #7a6b58; /* Medium brown */
  font-size: 0.95rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 0;
  line-height: 1.4;
}

/* Unread message indicator */
.contact.unread {
  position: relative;
}

.contact.unread::after {
  content: '';
  position: absolute;
  top: 50%;
  right: 1.5rem;
  transform: translateY(-50%);
  width: 10px;
  height: 10px;
  background: #3a8b3a; /* Mint green */
  border-radius: 50%;
}

@media (max-width: 768px) {
  .contacts-container {
    padding: 1rem;
  }
  
  .contacts-container h2 {
    font-size: 1.5rem;
    margin-bottom: 1.5rem;
  }
  
  .contact {
    width: 90%; /* Slightly wider on tablets */
    padding: 1rem;
  }
  
  .profile-img {
    width: 48px;
    height: 48px;
    margin-right: 1rem;
  }
}

@media (max-width: 480px) {
  .contacts-container {
    padding: 0.75rem;
  }
  
  .contact {
    width: 95%; /* Nearly full width on mobile */
    max-width: none; /* Remove max-width restriction */
  }
  
  .contact-info strong {
    font-size: 1rem;
  }
  
  .contact-info p {
    font-size: 0.85rem;
  }
}
</style>