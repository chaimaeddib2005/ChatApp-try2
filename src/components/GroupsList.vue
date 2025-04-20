<template>
  <div class="contacts-container">
    <div style="display:grid;grid-template-columns:1fr 1fr">
      <h2 class="section-title">Groups</h2>
      <div><button @click="goToCreateGroup" class="moroccan-button">Create new group</button></div>
    </div>
    <div
      v-for="group in filteredGroups"
      :key="group.id"
      class="contact"
      @click="goToGroup(group.id)"
    >
      <img :src="group.photoURL || '/moroccan-tea-default.jpg'" alt="Group" class="profile-img" />
      <div class="contact-info">
        <strong>{{ group.name }}</strong>
      </div>
    </div>
  </div>
</template>

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

.section-title {
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

.moroccan-button {
  padding: 8px 16px;
  background-color: #8b3a3a; /* Moroccan red */
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s ease;
  box-shadow: 0 2px 5px rgba(139, 90, 43, 0.3);
  justify-self: end;
  font-family: 'Amiri', serif;
}

.moroccan-button:hover {
  background-color: #a56a37;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(139, 90, 43, 0.4);
}

@media (max-width: 768px) {
  .contacts-container {
    padding: 1rem;
  }
  
  .section-title {
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
  
  .moroccan-button {
    padding: 6px 12px;
    font-size: 0.9rem;
  }
}
</style>
 
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
      console.log("groupes",this.groups.length);
      if (!this.searchQuery) return this.groups;
      
      return this.groups.filter(group =>
        group.name.toLowerCase().includes(this.searchQuery.toLowerCase())
      );
    },
  },
  methods: {
      goToCreateGroup(){
    
      this.$router.push({ name: 'CreateGroup' })
    },
    async fetchGroups(userId) {
      const userDoc = await getDoc(doc(db, 'users', userId));
      const userData = userDoc.data();
      console.log(userData?.groups)
      const groupIds = userData?.groups || [];

      const groupDataArray = await Promise.all(groupIds.map(async (groupId) => {
        const groupDoc = await getDoc(doc(db, 'groups', groupId));
        if (!groupDoc.exists()) return null;

        const group = groupDoc.data();

        // Fetch the last message if exists
     

        return {
          id: groupId,
          name: group.name || 'Unnamed Group',
          photoURL: group.photoURL || '',
        
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

