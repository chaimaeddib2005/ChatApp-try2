<template>
    <div class="group-details">
      <!-- Delete Confirmation Modal -->
      <div v-if="showDeleteConfirmation" class="modal-overlay">
        <div class="modal-content">
          <h3>Confirm Removal</h3>
          <p>Are you sure you want to remove this member from the group?</p>
          <div class="modal-actions">
            <button @click="confirmRemoveMember" class="confirm-btn">Remove</button>
            <button @click="cancelRemoveMember" class="cancel-btn">Cancel</button>
          </div>
        </div>
      </div>
  
      <!-- Group Header -->
      <div class="group-header">
        <div class="group-photo">
          <img v-if="group.photoURL" :src="group.photoURL" alt="Group photo" />
          <div v-else class="photo-placeholder">
            <i class="fas fa-users"></i>
          </div>
        </div>
        <div class="group-info">
          <h1>{{ group.name }}</h1>
          <p>{{ group.description }}</p>
          <div class="admin-badge" v-if="isAdmin">
            <i class="fas fa-crown"></i> Admin
          </div>
        </div>
      </div>
  
      <!-- Members Section -->
      <div class="section">
        <h2>Members ({{ group.members?.length || 0 }})</h2>
        <div class="members-list">
          <div v-for="member in membersInfo" :key="member.uid" class="member-card">
            <div class="member-info">
              <img :src="member.photoURL || 'default-user.jpg'" alt="Member photo" class="member-photo" />
              <span>{{ member.name }}</span>
              <span v-if="member.uid === group.admin" class="admin-tag">Admin</span>
            </div>
            <button 
              v-if="isAdmin && member.uid !== currentUser.uid && member.uid !== group.admin"
              @click="initiateRemoveMember(member.uid)"
              class="remove-btn"
            >
              Remove
            </button>
          </div>
        </div>
      </div>
  
      <!-- Add Members Section (Admin Only) -->
      <div class="section" v-if="isAdmin && availableContacts.length > 0">
        <h2>Add Members</h2>
        <div class="contacts-list">
          <div v-for="contact in availableContacts" :key="contact.uid" class="contact-card">
            <div class="contact-info">
              <img :src="contact.photoURL || 'default-user.jpg'" alt="Contact photo" class="contact-photo" />
              <span>{{ contact.name }}</span>
            </div>
            <button @click="addMemberToGroup(contact.uid)" class="add-btn">
              Add to Group
            </button>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted, computed } from 'vue';
  import { useRoute } from 'vue-router';
  import { doc, getDoc, updateDoc, arrayRemove, arrayUnion } from 'firebase/firestore';
  import { db } from '../firebase';
  import { getAuth } from 'firebase/auth';
  
  const route = useRoute();
  const auth = getAuth();
  const groupId = route.params.id;
  const currentUser = auth.currentUser;
  
  const group = ref({});
  const membersInfo = ref([]);
  const contactsInfo = ref([]);
  const memberToRemove = ref(null);
  const showDeleteConfirmation = ref(false);
  
  // Computed properties
  const isAdmin = computed(() => {
    return group.value.admin === currentUser?.uid;
  });
  
  const availableContacts = computed(() => {
    if (!group.value.members || !contactsInfo.value.length) return [];
    return contactsInfo.value.filter(
      contact => !group.value.members.includes(contact.uid)
    );
  });
  
  // Fetch group data
  async function fetchGroupData() {
    try {
      const groupDoc = await getDoc(doc(db, 'groups', groupId));
      if (groupDoc.exists()) {
        group.value = { id: groupDoc.id, ...groupDoc.data() };
        await fetchMembersInfo();
        if (isAdmin.value) {
          await fetchContactsInfo();
        }
      }
    } catch (error) {
      console.error("Error fetching group data:", error);
    }
  }
  
  // Fetch members information
  async function fetchMembersInfo() {
    if (!group.value.members) return;
    
    try {
      const memberPromises = group.value.members.map(async (memberId) => {
        const memberDoc = await getDoc(doc(db, 'users', memberId));
        return memberDoc.exists() ? { uid: memberId, ...memberDoc.data() } : null;
      });
      
      membersInfo.value = (await Promise.all(memberPromises)).filter(Boolean);
    } catch (error) {
      console.error("Error fetching members info:", error);
    }
  }
  
  // Fetch admin's contacts information
  async function fetchContactsInfo() {
    try {
      const adminDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (adminDoc.exists() && adminDoc.data().contacts) {
        const contactPromises = adminDoc.data().contacts.map(async (contactId) => {
          const contactDoc = await getDoc(doc(db, 'users', contactId));
          return contactDoc.exists() ? { uid: contactId, ...contactDoc.data() } : null;
        });
        
        contactsInfo.value = (await Promise.all(contactPromises)).filter(Boolean);
      }
    } catch (error) {
      console.error("Error fetching contacts info:", error);
    }
  }
  
  // Member removal functions
  function initiateRemoveMember(memberId) {
    memberToRemove.value = memberId;
    showDeleteConfirmation.value = true;
  }
  
  function cancelRemoveMember() {
    memberToRemove.value = null;
    showDeleteConfirmation.value = false;
  }
  
  async function confirmRemoveMember() {
    if (!memberToRemove.value) return;
    
    try {
      // Remove member from group
      await updateDoc(doc(db, 'groups', groupId), {
        members: arrayRemove(memberToRemove.value)
      });
      
      // Remove group from user's groups list
      await updateDoc(doc(db, 'users', memberToRemove.value), {
        groups: arrayRemove(groupId)
      });
      
      // Update local state
      group.value.members = group.value.members.filter(id => id !== memberToRemove.value);
      membersInfo.value = membersInfo.value.filter(member => member.uid !== memberToRemove.value);
      
      showDeleteConfirmation.value = false;
      memberToRemove.value = null;
    } catch (error) {
      console.error("Error removing member:", error);
    }
  }
  
  // Add member to group
  async function addMemberToGroup(userId) {
    try {
      // Add user to group members
      await updateDoc(doc(db, 'groups', groupId), {
        members: arrayUnion(userId)
      });
      
      // Add group to user's groups list
      await updateDoc(doc(db, 'users', userId), {
        groups: arrayUnion(groupId)
      });
      
      // Update local state
      group.value.members.push(userId);
      
      // Fetch new member info and add to members list
      const newMemberDoc = await getDoc(doc(db, 'users', userId));
      if (newMemberDoc.exists()) {
        membersInfo.value.push({ uid: userId, ...newMemberDoc.data() });
      }
    } catch (error) {
      console.error("Error adding member:", error);
    }
  }
  
  onMounted(() => {
    fetchGroupData();
  });
  </script>
  
  <style scoped>
  .group-details {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
    color: #333;
  }
  
  .group-header {
    display: flex;
    align-items: center;
    gap: 20px;
    margin-bottom: 30px;
    padding-bottom: 20px;
    border-bottom: 1px solid #eee;
  }
  
  .group-photo {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    background-color: #f5f5f5;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  
  .group-photo img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  .photo-placeholder {
    font-size: 40px;
    color: #999;
  }
  
  .group-info {
    flex: 1;
  }
  
  .group-info h1 {
    margin: 0;
    font-size: 24px;
    color: #2c3e50;
  }
  
  .group-info p {
    margin: 5px 0 0;
    color: #666;
  }
  
  .admin-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    margin-top: 10px;
    padding: 5px 10px;
    background-color: #ffeaa7;
    border-radius: 20px;
    font-size: 14px;
    color: #f39c12;
  }
  
  .section {
    margin-bottom: 30px;
  }
  
  .section h2 {
    font-size: 18px;
    margin-bottom: 15px;
    color: #2c3e50;
    border-bottom: 1px solid #eee;
    padding-bottom: 8px;
  }
  
  .members-list,
  .contacts-list {
    display: grid;
    gap: 10px;
  }
  
  .member-card,
  .contact-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 15px;
    background-color: #fff;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  }
  
  .member-info,
  .contact-info {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  
  .member-photo,
  .contact-photo {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    object-fit: cover;
    background-color: #f5f5f5;
  }
  
  .admin-tag {
    font-size: 12px;
    padding: 2px 8px;
    background-color: #f1c40f;
    color: white;
    border-radius: 10px;
    margin-left: 5px;
  }
  
  .remove-btn,
  .add-btn {
    padding: 5px 12px;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .remove-btn {
    background-color: #ff6b6b;
    color: white;
  }
  
  .remove-btn:hover {
    background-color: #ff5252;
  }
  
  .add-btn {
    background-color: #4CAF50;
    color: white;
  }
  
  .add-btn:hover {
    background-color: #3e8e41;
  }
  
  /* Modal styles */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }
  
  .modal-content {
    background-color: white;
    padding: 25px;
    border-radius: 8px;
    max-width: 400px;
    width: 90%;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
  }
  
  .modal-content h3 {
    margin-top: 0;
    color: #2c3e50;
  }
  
  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 20px;
  }
  
  .confirm-btn,
  .cancel-btn {
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
  }
  
  .confirm-btn {
    background-color: #ff6b6b;
    color: white;
  }
  
  .confirm-btn:hover {
    background-color: #ff5252;
  }
  
  .cancel-btn {
    background-color: #ecf0f1;
    color: #7f8c8d;
  }
  
  .cancel-btn:hover {
    background-color: #dde1e2;
  }
  </style>