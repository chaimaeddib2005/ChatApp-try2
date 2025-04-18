<template>
    <nav class="navbar">
      <input
        v-model="searchKeyword"
        type="text"
        placeholder="Search contacts..."
        @input="applyFilters"
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
        <div class="notification-box">
          <button @click="toggleInvitationsBox">
            📩
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
                  <button @click="acceptInvitation(user)">Accept</button>
                  <button @click="declineInvitation(user)" class="decline-btn">Decline</button>
                </div>
              </div>
            </div>
            <div v-else>No invitations</div>
  
            <h4>Pending Sent Invitations</h4>
            <div v-if="pending.length">
              <div v-for="user in pending" :key="user.uid" class="invitation-item">
                <span>{{ user.name }}</span>
                <button class="decline-btn" @click="cancelInvitation(user)">Cancel</button>
              </div>
            </div>
            <div v-else>No pending invitations</div>
          </div>
        </div>
        <router-link to="/ProfileView">
          <img :src="userPhotoURL || defaultProfileImage" alt="Profile" class="nav-profile" />
        </router-link>
        <button @click="logoutUser">Logout</button>
      </div>
    </nav>
  </template>
  
  <script>
  import { useAuth } from '@/composables/useAuth'
  import {watch,nextTick } from 'vue'
  import { db } from '@/firebase';
  import {
    doc,
    getDoc,
    updateDoc,
    arrayRemove,
    setDoc,
    addDoc,
    collection,
    serverTimestamp
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
          this.$router.push('/');
        } catch (error) {
          console.error('Logout error:', error);
        }
      },
      toggleInvitationsBox() {
        this.showInvitations = !this.showInvitations;
      },
      async loadInvitations() {
        if (!this.currentUser || !this.currentUseruid){
            console.warn("Skipping loadInvitions: currentuser is not ready");
            return;
        }
        const userRef = doc(db, 'users', this.currentUser.uid);
        const userSnap = await getDoc(userRef);
        const userData = userSnap.data();
  
        this.pending = await Promise.all(
          (userData.sentInvitations || []).map(async (uid) => {
            const u = await getDoc(doc(db, 'users', uid));
            return { uid, ...u.data() };
          })
        );
  
        this.received = await Promise.all(
          (userData.invitations || []).map(async (uid) => {
            const u = await getDoc(doc(db, 'users', uid));
            return { uid, ...u.data() };
          })
        );
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
  
        await setDoc(doc(db, "chats", chatID), {
          user1: sender.uid,
          user2: this.currentUser.uid,
          messages: [],
          lastUpdated: serverTimestamp(),
        });
  
        await addDoc(collection(db, "messages"), {
          chatId: chatID,
          sender: "system",
          content: `${this.currentUser.name} accepted your invitation. You can now chat.`,
          timestamp: serverTimestamp(),
        });
  
        this.loadInvitations();
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
  
          this.loadInvitations();
        } catch (error) {
          console.error("Error declining invitation:", error);
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
  
          this.loadInvitations();
        } catch (error) {
          console.error("Error canceling invitation:", error);
        }
      },
    },
    mounted() {
  const { user } = useAuth();

  watch(
    () => user.value?.uid,
    async (uid) => {
      if (uid) {
        this.currentUser = user.value;
        await nextTick();
        this.loadInvitations();
      }
    },
    { immediate: true }
  );
}
  };
  </script>
  
  <style scoped>
  .navbar {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    padding: 10px 20px;
    background: #333;
    color: white;
  }
  
  .navbar input {
    padding: 6px 10px;
    border-radius: 8px;
    border: none;
    width: 60%;
    max-width: 300px;
  }
  
  .nav-links {
    display: flex;
    gap: 10px;
    align-items: center;
  }
  
  .nav-links a {
    color: white;
    text-decoration: none;
    font-weight: bold;
    padding: 5px 10px;
    border-radius: 6px;
    transition: background 0.2s;
  }
  
  .nav-links a.active {
    background-color: #555;
  }
  
  .nav-profile {
    width: 32px;
    height: 32px;
    border-radius: 50%;
  }
  
  .notification-box {
    position: relative;
  }
  
  .notification-box .badge {
    background: red;
    border-radius: 50%;
    padding: 2px 6px;
    font-size: 12px;
    color: white;
    position: absolute;
    top: -5px;
    right: -10px;
  }
  
  .invitation-dropdown {
    position: absolute;
    top: 40px;
    right: 0;
    background: white;
    color: black;
    width: 250px;
    border-radius: 8px;
    padding: 10px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    z-index: 999;
  }
  
  .invitation-item {
    display: flex;
    justify-content: space-between;
    padding: 5px 0;
  }
  
  .pending-status {
    color: gray;
    font-style: italic;
  }
  
  .decline-btn {
    margin-left: 5px;
    background: transparent;
    color: red;
    border: 1px solid red;
    border-radius: 4px;
    padding: 2px 6px;
    cursor: pointer;
    transition: background 0.2s;
  }
  
  .decline-btn:hover {
    background: rgba(255, 0, 0, 0.1);
  }
  </style>
  