<template>
    <div class="discover-container">
      <h2>Discover People</h2>
      <div v-if="filteredSuggestedUsers.length">
        <div
          v-for="user in filteredSuggestedUsers"
          :key="user.id"
          class="user-card"
        >
          <img :src="user.photoURL || '/default-profile.png'" alt="Profile" />
          <div class="user-info">
            <strong>{{ user.name }}</strong>
            <button @click="sendInvitation(user.id)">Connect</button>
          </div>
        </div>
      </div>
      <div v-else class="empty-message">No suggestions found</div>
    </div>
  </template>
  
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
  
  <style scoped>
  .discover-container {
    padding: 20px;
    max-width: 600px;
    margin: auto;
  }
  
  h2 {
    font-size: 1.8rem;
    margin-bottom: 20px;
    text-align: center;
    color: #333;
  }
  
  .user-card {
    display: flex;
    align-items: center;
    background: #f9f9f9;
    padding: 12px;
    border-radius: 10px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.1);
    margin-bottom: 1rem;
    transition: transform 0.2s ease;
  }
  
  .user-card:hover {
    transform: translateY(-3px);
  }
  
  img {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    object-fit: cover;
  }
  
  .user-info {
    display: flex;
    flex-direction: column;
    margin-left: 15px;
    flex: 1;
  }
  
  .user-info strong {
    font-size: 1.1rem;
    margin-bottom: 6px;
    color: #222;
  }
  
  .user-info button {
    background-color: #007bff;
    color: white;
    border: none;
    padding: 6px 12px;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.2s;
    font-size: 0.9rem;
  }
  
  .user-info button:hover {
    background-color: #0056b3;
  }
  
  .empty-message {
    text-align: center;
    color: #888;
    margin-top: 40px;
    font-style: italic;
  }
  </style>
  