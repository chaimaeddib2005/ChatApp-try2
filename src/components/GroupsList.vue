<template>
    <div class="contacts-container">
      <h2>Groups</h2>
      <div
        v-for="group in filteredGroups"
        :key="group.id"
        class="contact"
        @click="goToGroup(group.id)"
      >
        <img :src="group.photoURL || '/default-group.png'" alt="Group" class="profile-img" />
        <div class="contact-info">
          <strong>{{ group.name }}</strong>
          <p>{{ group.lastMessage || 'No messages yet' }}</p>
        </div>
      </div>
    </div>
  </template>
  
  <script>
  import { db } from '../firebase';
  import {
    doc,
    getDoc
  } from 'firebase/firestore';
  import { getAuth, onAuthStateChanged } from 'firebase/auth';
  
  export default {
    name: 'GroupList',
    props: {
      searchQuery: String,
    },
    data() {
      return {
        groups: [],
        userReady: false,
      };
    },
    async created() {
      const auth = getAuth();
      onAuthStateChanged(auth, async (user) => {
        if (user) {
          await this.fetchGroups(user.uid);
          this.userReady = true;
        }
      });
    },
    computed: {
      filteredGroups() {
        if (!this.searchQuery) return this.groups;
        return this.groups.filter(group =>
          group.name.toLowerCase().includes(this.searchQuery.toLowerCase())
        );
      },
    },
    methods: {
      async fetchGroups(userId) {
        const userDoc = await getDoc(doc(db, 'users', userId));
        const userData = userDoc.data();
        const groupIds = userData?.Groups || [];
  
        const groupDataArray = await Promise.all(groupIds.map(async (groupId) => {
          const groupDoc = await getDoc(doc(db, 'groups', groupId));
          if (!groupDoc.exists()) return null;
  
          const group = groupDoc.data();
  
          // Fetch the last message if exists
          let lastMessage = '';
          const messages = group.messages || [];
  
          if (messages.length > 0) {
            const lastMessageId = messages[messages.length - 1];
            const lastMessageDoc = await getDoc(doc(db, 'group_messages', lastMessageId));
            if (lastMessageDoc.exists()) {
              const msgData = lastMessageDoc.data();
              lastMessage = msgData.message || '';
            }
          }
  
          return {
            id: groupId,
            name: group.name || 'Unnamed Group',
            photoURL: group.photoURL || '',
            lastMessage,
          };
        }));
  
        this.groups = groupDataArray.filter(Boolean); // remove any nulls
      },
  
      goToGroup(groupId) {
        this.$router.push({ name: 'GroupChatView', params: { groupId } });
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