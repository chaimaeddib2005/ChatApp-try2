<template>
    <div v-if="userData">
      <img :src="userData.photoURL || 'default.jpg'" alt="User Photo" />
      <p>{{ userData.name }}</p>
      <button :style="buttonStyle" @click="toggleSelection">
        {{ selected ? 'Remove from Group' : 'Add to Group' }}
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
    computed: {
      buttonStyle() {
        return {
          backgroundColor: this.selected ? 'red' : 'green',
          color: 'white',
          padding: '5px 10px',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer'
        };
      }
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