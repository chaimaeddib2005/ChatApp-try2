<template>
  <div>
    <NavBar/>
    <div class="create-group">
      <h1>Create a New Group</h1>
    
      <div class="group-photo-section">
        <div class="photo-preview" @click="triggerFileInput">
          <img v-if="groupPhotoPreview" :src="groupPhotoPreview" alt="Group preview" class="preview-image" />
          <div v-else class="photo-placeholder">
            <i class="fas fa-camera"></i>
            <span>Add Group Photo</span>
          </div>
          <input 
            type="file" 
            ref="fileInput" 
            @change="handleFileChange" 
            accept="image/*" 
            style="display: none"
          />
        </div>
      </div>

      <div class="form-group">
        <label for="groupName">Group Name:</label>
        <input type="text" id="groupName" v-model="groupName" required />
      </div>
      
      <div class="form-group">
        <label for="groupDescription">Description:</label>
        <textarea id="groupDescription" v-model="groupDescription" required></textarea>
      </div>
      
      <div class="form-group">
        <label>Members:</label>
        <div class="members-list">
          <div v-for="user in contactsList" :key="user.uid" class="user-to-group">
            <UserToGroup
              :user="user.uid"
              :selected="selectedMembers.includes(user.uid)"
              @user-selected="toggleMemberSelection"
            />
          </div>
        </div>
      </div>
      
      <button @click="createGroup" class="submit-button" :disabled="isUploading">
        {{ isUploading ? 'Creating...' : 'Create Group' }}
      </button>
    </div>
  </div>
</template>

<script>
import UserToGroup from './UserToGroup.vue';
import NavBar from './NavBar.vue'
import { db, storage } from '../firebase';
import {
  addDoc,
  collection,
  serverTimestamp,
  updateDoc,
  doc,
  getDoc,
  arrayUnion
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

export default {
  name: 'CreateGroup',
  components: { UserToGroup, NavBar },
  data() {
    return {
      groupName: '',
      groupDescription: '',
      currentUser: {
        uid: '',
        Contacts: {}  // Changed from contacts to Contacts with capital C
      },
      contactsList: [], // New property to store processed contacts
      selectedMembers: [],
      groupPhoto: null,
      groupPhotoPreview: null,
      isUploading: false
    };
  },
  async created(){
    await this.getCurrentUser();
    await this.processContacts();},
  async mounted() {
  
   
  },
  methods: {
    triggerFileInput() {
      this.$refs.fileInput.click();
    },
    
    handleFileChange(event) {
      const file = event.target.files[0];
      if (file) {
        this.groupPhoto = file;
        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => {
          this.groupPhotoPreview = e.target.result;
        };
        reader.readAsDataURL(file);
      }
    },
    
    async uploadGroupPhoto(file, groupId) {
      try {
        const photoRef = storageRef(storage, `groupPhotos/${groupId}`);
        const snapshot = await uploadBytes(photoRef, file);
        return await getDownloadURL(snapshot.ref);
      } catch (error) {
        console.error("Error uploading group photo:", error);
        return null;
      }
    },

    async convertToBase64(file) {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve(e.target.result);
        };
        reader.readAsDataURL(file);
      });
    },

    toggleMemberSelection(user) {
  // Now user is an object with a uid property
  const userId = user.uid;
  const index = this.selectedMembers.indexOf(userId);
  if (index > -1) {
    this.selectedMembers.splice(index, 1);
  } else {
    this.selectedMembers.push(userId);
  }
},

    async getCurrentUser() {
      const auth = getAuth();
      const user = auth.currentUser;

      if (user) {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          this.currentUser = {
            uid: user.uid,
            ...userSnap.data()
          };
          
          // Process the contacts map
          await this.processContacts();
        }
      }
    },
    async processContacts() {
  // Get the contacts map from current user
  const contactsMap = this.currentUser.Contacts || {};
 
  
  // Make sure we're only processing actual string IDs
  const contactIds = Object.keys(contactsMap);
 
  
  // Fetch user data for each contact
  const contactPromises = contactIds.map(async (contactId) => {
    try {
      const contactRef = doc(db, 'users', contactId);
      const contactSnap = await getDoc(contactRef);
      
      if (contactSnap.exists()) {
        return {
          uid: contactId,
          chatId: contactsMap[contactId], // Store the chat ID 
          ...contactSnap.data()
        };
      }
    } catch (error) {
      console.error(`Error fetching contact ${contactId}:`, error);
    }
    return null;
  });
  
  // Store the processed contacts as an array
  this.contactsList = (await Promise.all(contactPromises)).filter(Boolean);
  console.log("These are the contacs",this.contactsList.length);
},

    async createGroup() {
      if (!this.groupName || !this.groupDescription) return;
      if (this.isUploading) return;
      if (!this.currentUser.uid) {
        alert("Please sign in to create a group");
        return;
      }

      this.isUploading = true;

      try {
        // Include current user as a member
        const allMembers = [...this.selectedMembers, this.currentUser.uid];

        // First create the group with basic info
        const groupData = {
          name: this.groupName,
          description: this.groupDescription,
          members: allMembers,
          admin: this.currentUser.uid,
          messages: [],
          createdAt: serverTimestamp(),
          isGroup: true
        };

        // Add group to Firestore and get reference
        const groupRef = await addDoc(collection(db, 'groups'), groupData);
        const groupId = groupRef.id;

        // Handle group photo upload if exists
        if (this.groupPhoto) {
          // Store base64 version for immediate display
          const base64Image = await this.convertToBase64(this.groupPhoto);
          
          // Upload to storage and get URL
          const storageUrl = await this.uploadGroupPhoto(this.groupPhoto, groupId);
          
          // Update the group with both versions
          await updateDoc(groupRef, {
            photoURL: storageUrl || base64Image,
            photoBase64: base64Image
          });
        }

        // Add group to each member's groups array
        const updatePromises = allMembers.map(async (memberId) => {
          const memberRef = doc(db, 'users', memberId);
          await updateDoc(memberRef, {
            groups: arrayUnion(groupId)
          });
        });

        await Promise.all(updatePromises);

        // Reset form
        this.resetForm();

        // Emit event and notify user
        this.$emit('group-created', groupId);
        alert('Group created successfully!');
      } catch (error) {
        console.error('Error creating group:', error);
        alert('Failed to create group. Please try again.');
      } finally {
        this.isUploading = false;
      }
    },

    resetForm() {
      this.groupName = '';
      this.groupDescription = '';
      this.selectedMembers = [];
      this.groupPhoto = null;
      this.groupPhotoPreview = null;
      if (this.$refs.fileInput) {
        this.$refs.fileInput.value = '';
      }
    }
  }
};
</script>

<style scoped>
.create-group {
  max-width: 600px;
  margin: 2rem auto;
  padding: 2rem;
  background-color: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

h1 {
  text-align: center;
  color: #d37a14;
  margin-bottom: 2rem;
  font-size: 2rem;
  font-weight: 600;
}

.form-group {
  margin-bottom: 1.8rem;
}

label {
  display: block;
  margin-bottom: 0.6rem;
  font-weight: 500;
  color: #333;
  font-size: 0.95rem;
}

input[type="text"],
textarea {
  width: 100%;
  padding: 0.85rem;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.3s ease;
  background-color: #f9fafc;
}

input[type="text"]:focus,
textarea:focus {
  border-color: #d37a14;
  outline: none;
  box-shadow: 0 0 0 3px rgba(26, 115, 232, 0.2);
  background-color: #fff;
}

textarea {
  min-height: 120px;
  resize: vertical;
  line-height: 1.5;
}

.members-list {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #e8eaed;
  border-radius: 8px;
  padding: 0.8rem;
  background-color: #f9fafc;
}

.user-to-group {
  margin-bottom: 0.8rem;
}

.submit-button {
  width: 100%;
  padding: 0.9rem;
  background-color: #d69317;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  letter-spacing: 0.5px;
  box-shadow: 0 2px 5px rgba(233, 170, 10, 0.3);
}

.submit-button:hover {
  background-color: #d37a14;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(238, 207, 8, 0.4);
}

.submit-button:active {
  transform: translateY(1px);
  box-shadow: 0 1px 3px rgba(26, 115, 232, 0.4);
}

.submit-button:disabled {
  background-color: #b8c2cc;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* Group photo styles */
.group-photo-section {
  display: flex;
  justify-content: center;
  margin-bottom: 2rem;
}

.photo-preview {
  width: 140px;
  height: 140px;
  border-radius: 50%;
  background-color: #f5f7fa;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  overflow: hidden;
  border: 2px dashed #c0c8d1;
  transition: all 0.3s ease;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
}

.photo-preview:hover {
  border-color: #d37a14;
  background-color: #edf2fc;
  transform: scale(1.03);
}

.photo-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #e19e10;
}

.photo-placeholder i {
  font-size: 2.2rem;
  margin-bottom: 0.8rem;
  color: #d37a14;
}

.photo-placeholder span {
  font-size: 0.9rem;
  font-weight: 500;
}

.preview-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>