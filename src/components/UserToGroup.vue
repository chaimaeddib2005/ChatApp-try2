<template>
  <div v-if="userData" class="user-item">
    <div class="user-info">
      <img 
        :src="userData.photoURL || 'default.jpg'" 
        alt="User Photo" 
        class="user-avatar"
      />
      <p class="user-name">{{ userData.name }}</p>
    </div>
    <button 
      class="selection-button" 
      :class="{ 'selected': selected }"
      @click="toggleSelection"
    >
      {{ selected ? 'Remove' : 'Add' }}
    </button>
  </div>
</template>

<script>
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default {
  name: 'UserToGroup',
  props: {
    user: {
      type: String, // UID of the user
      required: true
    },
    selected: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      userData: null // to store fetched user info
    };
  },
  methods: {
    toggleSelection() {
      this.$emit('user-selected', {
        uid: this.user // passing the user ID which is expected in the parent
      });
    },
    async fetchUserData() {
      try {
        const userRef = doc(db, 'users', this.user);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          this.userData = userSnap.data();
        } else {
          console.warn(`User document not found for UID: ${this.user}`);
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
      }
    }
  },
  mounted() {
    this.fetchUserData();
  }
};
</script>

<style scoped>
.user-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.6rem 0.8rem;
  border-radius: 8px;
  background-color: #f9fafc;
  margin-bottom: 0.5rem;
  transition: all 0.2s ease;
}

.user-item:hover {
  background-color: #edf2fc;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid #e8eaed;
}

.user-name {
  font-size: 0.95rem;
  font-weight: 500;
  color: #333;
  margin: 0;
}

.selection-button {
  padding: 0.4rem 0.8rem;
  border: none;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 70px;
  text-align: center;
  background-color: #1a73e8;
  color: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
}

.selection-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.15);
}

.selection-button:active {
  transform: translateY(1px);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.selection-button.selected {
  background-color: #ea4335;
}
</style>