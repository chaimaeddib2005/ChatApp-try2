<template>
    <div class="create-group">
      <h1>Create a New Group</h1>
      <form @submit.prevent="createGroup">
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
            <div v-for="user in currentUser.contacts" :key="user.uid" class="user-to-group">
              <UserToGroup
                :user="user"
                :selected="SelectedMembers.includes(user.uid)"
                @UserSelected="UserSelected"
              />
            </div>
          </div>
        </div>
        
        <button type="submit" class="submit-button">Create Group</button>
      </form>
    </div>
  </template>
  
  <script>
  import UserToGroup from './UserToGroup.vue';
  import { db, storage } from '../firebase';
  import {
    addDoc,
    collection,
    serverTimestamp,
    updateDoc,
    doc,
    arrayUnion
  } from 'firebase/firestore';
  import { getAuth,getDoc } from 'firebase/auth';
  import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
  
  export default {
    name: 'CreateGroup',
    components: { UserToGroup },
    data() {
      return {
        groupName: '',
        groupDescription: '',
        currentUser: {},
        SelectedMembers: [],
        groupPhoto: null,
        groupPhotoPreview: null,
        isUploading: false
      };
    },
    mounted() {
      this.getCurrentUser();
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
      
      async uploadGroupPhoto(groupId) {
        if (!this.groupPhoto) return null;
        
        try {
            const photoRef = storageRef(storage, `groupPhotos/${groupId}`);
          const snapshot = await uploadBytes(photoRef, this.groupPhoto);
          return await getDownloadURL(snapshot.ref);
        } catch (error) {
          console.error("Error uploading group photo:", error);
          return null;
        }
      },
  
      UserSelected(user) {
        const index = this.SelectedMembers.indexOf(user.uid);
        if (index > -1) {
          this.SelectedMembers.splice(index, 1);
        } else {
          this.SelectedMembers.push(user.uid);
        }
      },
  
      async createGroup() {
        if (!this.groupName || !this.groupDescription) return;
        if (this.isUploading) return;
        
        this.isUploading = true;
        
        try {
          const groupData = {
            name: this.groupName,
            description: this.groupDescription,
            members: [...this.SelectedMembers, this.currentUser.uid],
            admin: this.currentUser.uid,
            messages: [],
            createdAt: serverTimestamp()
          };
  
          // First create the group to get the ID
          const docRef = await addDoc(collection(db, 'groups'), groupData);
          const groupId = docRef.id;
  
          // Upload photo if exists
          if (this.groupPhoto) {
            const photoURL = await this.uploadGroupPhoto(groupId);
            if (photoURL) {
              await updateDoc(doc(db, 'groups', groupId), {
                photoURL: photoURL
              });
            }
          }
  
          // Update all members' groups list
          const usersToUpdate = [...this.SelectedMembers, this.currentUser.uid];
          const userPromises = usersToUpdate.map(uid => {
            const userRef = doc(db, 'users', uid);
            return updateDoc(userRef, {
              groups: arrayUnion(groupId)
            });
          });
  
          await Promise.all(userPromises);
  
          // Reset form
          this.groupName = '';
          this.groupDescription = '';
          this.SelectedMembers = [];
          this.groupPhoto = null;
          this.groupPhotoPreview = null;
  
          this.$emit('group-created', groupId);
          alert('Group created successfully!');
        } catch (e) {
          console.error('Error creating group:', e);
          alert('Failed to create group. Please try again.');
        } finally {
          this.isUploading = false;
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
          } else {
            console.error('User document not found!');
          }
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
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
  
  h1 {
    text-align: center;
    color: #2c3e50;
    margin-bottom: 2rem;
    font-size: 1.8rem;
  }
  
  .form-group {
    margin-bottom: 1.5rem;
  }
  
  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 600;
    color: #2c3e50;
  }
  
  input[type="text"],
  textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 1rem;
    transition: border-color 0.3s;
  }
  
  input[type="text"]:focus,
  textarea:focus {
    border-color: #4a89dc;
    outline: none;
    box-shadow: 0 0 0 2px rgba(74, 137, 220, 0.2);
  }
  
  textarea {
    min-height: 100px;
    resize: vertical;
  }
  
  .members-list {
    max-height: 300px;
    overflow-y: auto;
    border: 1px solid #eee;
    border-radius: 6px;
    padding: 0.5rem;
  }
  
  .user-to-group {
    margin-bottom: 0.5rem;
  }
  
  .submit-button {
    width: 100%;
    padding: 0.75rem;
    background-color: #4a89dc;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.3s;
  }
  
  .submit-button:hover {
    background-color: #3a70c2;
  }
  
  .submit-button:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }
  
  /* Group photo styles */
  .group-photo-section {
    display: flex;
    justify-content: center;
    margin-bottom: 1.5rem;
  }
  
  .photo-preview {
    width: 120px;
    height: 120px;
    border-radius: 50%;
    background-color: #f5f7fa;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    overflow: hidden;
    border: 2px dashed #ccc;
    transition: all 0.3s;
  }
  
  .photo-preview:hover {
    border-color: #4a89dc;
    background-color: #ebf0f7;
  }
  
  .photo-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    color: #7f8c8d;
  }
  
  .photo-placeholder i {
    font-size: 2rem;
    margin-bottom: 0.5rem;
  }
  
  .photo-placeholder span {
    font-size: 0.8rem;
  }
  
  .preview-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  </style>