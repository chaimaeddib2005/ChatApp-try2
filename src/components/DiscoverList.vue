<template>
    <div>
      <h2>Discover People</h2>
      <div v-for="user in filteredSuggestedUsers" :key="user.id" class="user-card">
        <img :src="user.photoURL || '/default-profile.png'" alt="Profile" />
        <strong>{{ user.name }}</strong>
        <button v-if="!user.invited && !user.isContact" @click="sendInvitation(user.id)">Connect</button>
        <span v-else-if="user.invited">Invitation Sent</span>
        <span v-else-if="user.isContact">Already a Contact</span>
      </div>
    </div>
  </template>
  
  <script>
  import { db } from '../firebase';
  import { getAuth } from 'firebase/auth';
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
        return this.suggestedUsers.filter(user => user.name.toLowerCase().includes(query));
      },
    },
    async created() {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      this.currentUserId = currentUser.uid;
  
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
        })
        
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
    const receiverInvites = receiverData.Invitations || [];

   
    if (!receiverInvites.includes(this.currentUserId)) {
      await updateDoc(receiverRef, {
        Invitations: [...receiverInvites, this.currentUserId],
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
  .user-card {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 1rem;
  }
  img {
    width: 40px;
    height: 40px;
    border-radius: 50%;
  }
  </style>
  