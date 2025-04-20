<template>
  <nav class="navbar">
    <input
      v-model="searchKeyword"
      type="text"
      placeholder="Search..."
      @input="applyFilters"
      class="search-input"
    />
    <div class="nav-links">
      <router-link
        :to="'/home/discover'"
        :class="{ active: $route.path.includes('/home/discover') }"
      >
        Discover
      </router-link>
      <router-link
        :to="'/home/contacts'"
        :class="{ active: $route.path.includes('/home/contacts') }"
      >
        Chats
      </router-link>
      <router-link
        :to="'/home/groups'"
        :class="{ active: $route.path.includes('/home/groups') }"
      >
        Groups
      </router-link>
      <div class="notification-box" ref="dropdownRef">
        <button @click="toggleInvitationsBox" class="invite-button">
          <i class="fas fa-bell"></i>
          <span v-if="received.length || pending.length" class="badge">
            {{ received.length + pending.length }}
          </span>
        </button>
        <div v-if="showInvitations" class="invitation-dropdown">
          <h4>Received Invitations</h4>
          <div v-if="received.length">
            <div v-for="user in received" :key="user.uid" class="invitation-item">
              <span>{{ user.name }}</span>
              <div>
                <button @click="acceptInvitation(user)" class="accept-btn">Accept</button>
                <button @click="declineInvitation(user)" class="decline-btn">Decline</button>
              </div>
            </div>
          </div>
          <div v-else class="empty-state">No invitations</div>

          <h4>Pending Sent Invitations</h4>
          <div v-if="pending.length">
            <div v-for="user in pending" :key="user.uid" class="invitation-item">
              <span>{{ user.name }}</span>
              <button class="decline-btn" @click="cancelInvitation(user)">Cancel</button>
            </div>
          </div>
          <div v-else class="empty-state">No pending invitations</div>
        </div>
      </div>
      <router-link to="/ProfileView" class="profile-link">
        <img :src="userPhotoURL || defaultProfileImage" alt="Profile" class="nav-profile" />
      </router-link>
      <button @click="logoutUser" class="logout-btn">Logout</button>
    </div>
  </nav>
</template>


<style scoped>
  /* Moroccan Tea Theme Navbar */
  .navbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 30px;
    background: linear-gradient(to right, #8b3a3a, #a04a4a);
    color: #f0e6d8;
    box-shadow: 0 4px 15px rgba(139, 58, 58, 0.3);
    border-bottom: 1px solid #d4a762;
  }
  
  .search-input {
    padding: 8px 15px;
    border-radius: 20px;
    border: 1px solid #d4a762;
    background: rgba(255, 253, 245, 0.9);
    width: 40%;
    max-width: 400px;
    font-family: 'Amiri', sans-serif;
    color: #5c4d3a;
    transition: all 0.3s ease;
  }
  
  .search-input:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(212, 167, 98, 0.5);
  }
  
  .search-input::placeholder {
    color: #a08b70;
  }
  
  .nav-links {
    display: flex;
    gap: 20px;
    align-items: center;
  }
  
  .nav-links a {
    color: #f0e6d8;
    text-decoration: none;
    font-weight: 600;
    padding: 8px 15px;
    border-radius: 5px;
    transition: all 0.3s ease;
    font-family: 'Amiri', sans-serif;
    position: relative;
  }
  
  .nav-links a.active {
    background-color: rgba(212, 167, 98, 0.3);
  }
  
  .nav-links a.active::after {
    content: '';
    position: absolute;
    bottom: -5px;
    left: 15px;
    right: 15px;
    height: 2px;
    background: #d4a762;
  }
  
  .nav-links a:hover:not(.active) {
    background-color: rgba(212, 167, 98, 0.2);
  }
  
  .nav-profile {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 2px solid #d4a762;
    transition: transform 0.3s ease;
  }
  
  .nav-profile:hover {
    transform: scale(1.1);
  }
  
  .notification-box {
    position: relative;
  }
  
  .invite-button {
    background: transparent;
    border: none;
    color: #f0e6d8;
    font-size: 1.3rem;
    cursor: pointer;
    padding: 5px;
    position: relative;
    transition: transform 0.3s ease;
  }
  
  .invite-button:hover {
    transform: scale(1.1);
  }
  
  .badge {
    background: #3a8b3a;
    border-radius: 50%;
    padding: 3px 7px;
    font-size: 12px;
    color: white;
    position: absolute;
    top: -5px;
    right: -5px;
    font-weight: bold;
  }
  
  .invitation-dropdown {
    position: absolute;
    top: 45px;
    right: 0;
    background: #faf6f0;
    color: #5c4d3a;
    width: 280px;
    border-radius: 8px;
    padding: 15px;
    box-shadow: 0 5px 20px rgba(139, 58, 58, 0.3);
    z-index: 1000;
    border: 1px solid #d4a762;
  }
  
  .invitation-dropdown h4 {
    color: #8b3a3a;
    margin: 10px 0 5px;
    padding-bottom: 5px;
    border-bottom: 1px dashed #d4a762;
    font-family: 'Amiri', sans-serif;
  }
  
  .invitation-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px solid rgba(212, 167, 98, 0.3);
  }
  
  .invitation-item:last-child {
    border-bottom: none;
  }
  
  .accept-btn {
    background: #3a8b3a;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 5px 10px;
    cursor: pointer;
    transition: background 0.3s ease;
    margin-right: 5px;
  }
  
  .accept-btn:hover {
    background: #2d6d2d;
  }
  
  .decline-btn {
    background: #8b3a3a;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 5px 10px;
    cursor: pointer;
    transition: background 0.3s ease;
  }
  
  .decline-btn:hover {
    background: #6d2d2d;
  }
  
  .empty-state {
    color: #a08b70;
    font-style: italic;
    padding: 5px 0;
  }
  
  .logout-btn {
    background: transparent;
    color: #f0e6d8;
    border: 1px solid #d4a762;
    border-radius: 5px;
    padding: 8px 15px;
    cursor: pointer;
    transition: all 0.3s ease;
    font-family: 'Amiri', sans-serif;
  }
  
  .logout-btn:hover {
    background: rgba(212, 167, 98, 0.2);
  }
  
  @media (max-width: 768px) {
    .navbar {
      padding: 10px 15px;
      flex-direction: column;
      gap: 10px;
    }
    
    .search-input {
      width: 100%;
      max-width: none;
    }
    
    .nav-links {
      width: 100%;
      justify-content: space-between;
      gap: 10px;
    }
    
    .invitation-dropdown {
      right: -50px;
    }
  }
</style>


<script>
import { useAuth } from '@/composables/useAuth';
import { watch, nextTick } from 'vue';
import { db } from '@/firebase';
import {
  doc,
  getDoc,
  updateDoc,
  arrayRemove,
  setDoc,
  addDoc,
  collection,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';

export default {
  name: 'NavBar',
  data() {
    return {
      searchKeyword: '',
      currentUser: null,
      showInvitations: false,
      received: [],
      pending: [],
      unsubscribeInvitations: null,
    };
  },
  computed: {
    userPhotoURL() {
      return this.currentUser?.photoURL || this.currentUser?.auth?.photoURL || this.defaultProfileImage;
    },
    defaultProfileImage() {
      return '/default.jpg';
    }
  },
  methods: {
    applyFilters() {
      this.$emit('search', this.searchKeyword);
    },
    async logoutUser() {
      const { logout } = useAuth();
      try {
        await logout();
        this.currentUser = null;
        this.$router.replace('/'); // Redirect to the welcome page
        this.$router.go(0); // Force a page reload to reset the auth state
      } catch (error) {
        console.error('Logout error:', error);
      }
    },
    toggleInvitationsBox() {
      this.showInvitations = !this.showInvitations;
    },
    setupRealtimeInvitationsListener(uid) {
      const userDocRef = doc(db, 'users', uid);

      if (this.unsubscribeInvitations) {
        this.unsubscribeInvitations();
      }

      this.unsubscribeInvitations = onSnapshot(userDocRef, async (docSnap) => {
        if (!docSnap.exists()) return;

        const data = docSnap.data();
        const receivedUIDs = data.invitations || [];
        const sentUIDs = data.sentInvitations || [];

        this.received = await Promise.all(
          receivedUIDs.map(async (uid) => {
            const snap = await getDoc(doc(db, 'users', uid));
            return { uid, ...snap.data() };
          })
        );

        this.pending = await Promise.all(
          sentUIDs.map(async (uid) => {
            const snap = await getDoc(doc(db, 'users', uid));
            return { uid, ...snap.data() };
          })
        );
      });
    },
    async acceptInvitation(sender) {
      const currentUserRef = doc(db, 'users', this.currentUser.uid);
      const senderRef = doc(db, 'users', sender.uid);
      const chatID = [this.currentUser.uid, sender.uid].sort().join('_');

      await updateDoc(currentUserRef, {
        [`Contacts.${sender.uid}`]: chatID,
        invitations: arrayRemove(sender.uid),
      });

      await updateDoc(senderRef, {
        [`Contacts.${this.currentUser.uid}`]: chatID,
        sentInvitations: arrayRemove(this.currentUser.uid),
      });

      await setDoc(doc(db, 'chats', chatID), {
        user1: sender.uid,
        user2: this.currentUser.uid,
        messages: [],
        lastUpdated: serverTimestamp(),
      });

      await addDoc(collection(db, 'messages'), {
        chatId: chatID,
        sender: 'system',
        content: `${this.currentUser.name} accepted your invitation. You can now chat.`,
        timestamp: serverTimestamp(),
      });
    },
    async declineInvitation(sender) {
      const currentUserRef = doc(db, 'users', this.currentUser.uid);
      const senderRef = doc(db, 'users', sender.uid);

      try {
        await updateDoc(currentUserRef, {
          invitations: arrayRemove(sender.uid),
        });

        await updateDoc(senderRef, {
          sentInvitations: arrayRemove(this.currentUser.uid),
        });
      } catch (error) {
        console.error('Error declining invitation:', error);
      }
    },
    async cancelInvitation(recipient) {
      const currentUserRef = doc(db, 'users', this.currentUser.uid);
      const recipientRef = doc(db, 'users', recipient.uid);

      try {
        await updateDoc(currentUserRef, {
          sentInvitations: arrayRemove(recipient.uid),
        });

        await updateDoc(recipientRef, {
          invitations: arrayRemove(this.currentUser.uid),
        });
      } catch (error) {
        console.error('Error canceling invitation:', error);
      }
    },
    handleClickOutside(event) {
      const dropdown = this.$refs.dropdownRef;
      if (dropdown && !dropdown.contains(event.target)) {
        this.showInvitations = false;
      }
    }
  },
  mounted() {
    const { user } = useAuth();

    watch(
      () => user.value?.uid,
      async (uid) => {
        if (uid) {
          this.currentUser = user.value;
          await nextTick();
          this.setupRealtimeInvitationsListener(uid);
        }
      },
      { immediate: true }
    );

    document.addEventListener('click', this.handleClickOutside);
  },
  beforeUnmount() {
    document.removeEventListener('click', this.handleClickOutside);
    if (this.unsubscribeInvitations) this.unsubscribeInvitations();
  }
};
</script>
