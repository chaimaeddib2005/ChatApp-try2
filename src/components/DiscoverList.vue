<template>
  <div class="discover-container">
    <h2>Discover People</h2>
    <div v-if="filteredSuggestedUsers.length" class="users-grid">
      <div
        v-for="user in filteredSuggestedUsers"
        :key="user.id"
        class="user-card"
      >
        <img 
          :src="user.photoURL || '/default-profile.png'" 
          alt="Profile" 
          class="profile-img"
        />
        <div class="user-info">
          <strong>{{ user.name }}</strong>
          <button @click="sendInvitation(user.id)" class="connect-button">
            Connect
          </button>
        </div>
      </div>
    </div>
    <div v-else class="empty-message">
      <p>No suggestions found</p>
    </div>
  </div>
</template>

<style scoped>
.discover-container {
  padding: 1.5rem;
  width: 100%;
  margin: 0 auto;
  
  background-size: cover;
  background-position: center;
  background: #f9f5ee;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  font-family: 'Amiri', 'Noto Sans Arabic', sans-serif;
}

.discover-container h2 {
  color: #8b3a3a; /* Soft beige */
  font-family: 'Amiri', serif;
  text-align: center;
  margin-bottom: 2rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid #c9b18b; /* Gold accent */
  font-size: 1.8rem;
  width: 100%;
  text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.5);
}

.users-grid {
  width: 100%;
  max-width: 600px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.user-card {
  display: flex;
  align-items: center;
  padding: 1.25rem;
  background: rgba(249, 245, 233, 0.85); /* Tea-stained paper */
  border-radius: 12px;
  box-shadow: 0 3px 10px rgba(90, 62, 54, 0.2);
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  backdrop-filter: blur(5px);
  width: 80%;
  border-left: 4px solid transparent;
  border: 1px solid #c9b18b; /* Gold border */
}

.user-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 15px rgba(90, 62, 54, 0.3);
  border-left-color: #c9b18b;
  background: rgba(255, 255, 255, 0.9);
}

.profile-img {
  width: 55px;
  height: 55px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #c9b18b;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  margin-right: 1.25rem;
  transition: transform 0.3s ease;
}

.user-card:hover .profile-img {
  transform: scale(1.05);
}

.user-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.user-info strong {
  color: #5a3e36; /* Dark brown */
  font-weight: 700;
  font-size: 1.1rem;
  font-family: 'Amiri', serif;
}

.connect-button {
  background-color: #8b3a3a; /* Terracotta */
  color: #f5e0c7;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: 'Amiri', serif;
  box-shadow: 0 2px 5px rgba(139, 90, 43, 0.3);
  align-self: flex-start;
}

.connect-button:hover {
  background-color: #a56a37;
  transform: translateY(-2px);
}

.empty-message {
  color: #f5e0c7;
  text-align: center;
  margin-top: 2rem;
  font-size: 1.2rem;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .discover-container {
    padding: 1rem;
  }
  
  .discover-container h2 {
    font-size: 1.5rem;
  }
  
  .user-card {
    width: 90%;
    padding: 1rem;
  }
  
  .profile-img {
    width: 48px;
    height: 48px;
  }
}

@media (max-width: 480px) {
  .discover-container {
    padding: 0.75rem;
  }
  
  .user-card {
    width: 95%;
    flex-direction: column;
    text-align: center;
  }
  
  .profile-img {
    margin-right: 0;
    margin-bottom: 1rem;
  }
  
  .connect-button {
    align-self: center;
  }
}
</style>
  
  <script>
  import { db } from '../firebase';
  import { getAuth ,onAuthStateChanged} from 'firebase/auth';
  import { collection, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
  
  export default {
    name: 'DiscoverList',
    props: {
      searchQuery: {
        type: String,
        default: '',
      },
    },
    data() {
      return {
        suggestedUsers: [],
        currentUserId: null,
        sentInvites: [],
        contacts: {},
      };
    },
    computed: {
      filteredSuggestedUsers() {
        const query = this.searchQuery.toLowerCase();
        return this.suggestedUsers.filter(user =>
          user.name.toLowerCase().includes(query) &&
          !user.invited &&
          !user.isContact
        );
      },
    },

async created() {
  const auth = getAuth();

  onAuthStateChanged(auth, async (user) => {
    if (!user) return;
    this.currentUserId = user.uid;

    const currentUserDoc = await getDoc(doc(db, 'users', this.currentUserId));
    const currentUserData = currentUserDoc.data();
    this.contacts = currentUserData.Contacts || {};
    this.sentInvites = currentUserData.sentInvitations || [];

    const usersSnap = await getDocs(collection(db, 'users'));
    this.suggestedUsers = usersSnap.docs
      .filter(doc => doc.id !== this.currentUserId)
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || 'Unnamed',
          photoURL: data.photoURL || '',
          invited: this.sentInvites.includes(doc.id),
          isContact: Object.prototype.hasOwnProperty.call(this.contacts, doc.id),
        };
      });
  });
},
    methods: {
      async sendInvitation(toUserId) {
        const senderRef = doc(db, 'users', this.currentUserId);
        const receiverRef = doc(db, 'users', toUserId);
  
        const [senderSnap, receiverSnap] = await Promise.all([
          getDoc(senderRef),
          getDoc(receiverRef)
        ]);
  
        const senderData = senderSnap.data();
        const receiverData = receiverSnap.data();
  
        const senderInvites = senderData.sentInvitations || [];
        const receiverInvites = receiverData.invitations || [];
  
        if (!receiverInvites.includes(this.currentUserId)) {
          await updateDoc(receiverRef, {
            invitations: [...receiverInvites, this.currentUserId],
          });
        }
  
        if (!senderInvites.includes(toUserId)) {
          const updatedInvites = [...senderInvites, toUserId];
          await updateDoc(senderRef, {
            sentInvitations: updatedInvites,
          });
  
          const user = this.suggestedUsers.find(u => u.id === toUserId);
          if (user) user.invited = true;
          this.sentInvites = updatedInvites;
        }
      },
    },
  };
  </script>
  
  