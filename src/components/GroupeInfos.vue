<template>
  <div class="group-details">
    <!-- Back Button -->
    <div class="back-button" @click="goBack">
      <i class="fas fa-arrow-left"></i>
    </div>
    
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
      <div class="group-photo" @click="isAdmin && triggerFileInput()">
        <input 
          type="file" 
          ref="fileInput" 
          @change="handleFileChange" 
          accept="image/*" 
          style="display: none"
        />
        <img v-if="group.photoURL" :src="group.photoURL" alt="Group photo" />
        <div v-else class="photo-placeholder">
          <i class="fas fa-users"></i>
        </div>
        <div v-if="isAdmin" class="edit-photo-overlay">
          <i class="fas fa-camera"></i> Change Photo
        </div>
      </div>
      <div class="group-info">
        <div v-if="!editingName">
          <h1>{{ group.name }}</h1>
          <i v-if="isAdmin" class="fas fa-edit edit-icon" @click="startEditing('name')"></i>
        </div>
        <div v-else class="edit-field">
          <input v-model="editedName" type="text" ref="nameInput" />
          <button @click="saveGroupInfo('name')" class="save-edit-btn">
            <i class="fas fa-check"></i>
          </button>
          <button @click="cancelEditing('name')" class="cancel-edit-btn">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div v-if="!editingDescription">
          <p>{{ group.description }}</p>
          <i v-if="isAdmin" class="fas fa-edit edit-icon" @click="startEditing('description')"></i>
        </div>
        <div v-else class="edit-field">
          <textarea v-model="editedDescription" ref="descriptionInput"></textarea>
          <button @click="saveGroupInfo('description')" class="save-edit-btn">
            <i class="fas fa-check"></i>
          </button>
          <button @click="cancelEditing('description')" class="cancel-edit-btn">
            <i class="fas fa-times"></i>
          </button>
        </div>

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
      <h2>Add From Your Contacts</h2>
      <div class="contacts-list">
        <div v-for="contact in availableContacts" :key="contact.uid" class="contact-card">
          <div class="contact-info">
            <img :src="contact.photoURL || 'default-user.jpg'" alt="Contact photo" class="contact-photo" />
            <span>{{ contact.name || contact.email || 'Unknown User' }}</span>
          </div>
          <button @click="addMemberToGroup(contact.uid)" class="add-btn">
            Add to Group
          </button>
        </div>
      </div>
      <div v-if="availableContacts.length === 0" class="no-contacts">
        All your contacts are already in this group.
      </div>
    </div>

    <!-- Success/Error Messages -->
    <div v-if="message" class="message" :class="messageType">
      {{ message }}
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { doc, getDoc, updateDoc, arrayRemove, arrayUnion } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../firebase';

const route = useRoute();
const router = useRouter();
const auth = getAuth();

const groupId = route.params.groupId;
const currentUser = auth.currentUser;

const group = ref({});
const membersInfo = ref([]);
const contactsInfo = ref([]);
const memberToRemove = ref(null);
const showDeleteConfirmation = ref(false);
const fileInput = ref(null);

// Editing states
const editingName = ref(false);
const editingDescription = ref(false);
const editedName = ref('');
const editedDescription = ref('');

// Messages
const message = ref('');
const messageType = ref('');

// Photo upload
const isUploadingPhoto = ref(false);

// Back button function
function goBack() {
  router.back();
}

// Computed properties
const isAdmin = computed(() => {
  return group.value.admin === currentUser?.uid;
});

const availableContacts = computed(() => {
  if (!group.value.members || !contactsInfo.value.length) return [];
  
  // Filter out contacts that are already in the group
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
      editedName.value = group.value.name;
      editedDescription.value = group.value.description;
      await fetchMembersInfo();
      if (isAdmin.value) {
        await fetchContactsInfo();
      }
    }
  } catch (error) {
    console.error("Error fetching group data:", error);
    showMessage('Error loading group data', 'error');
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
    showMessage('Error loading members', 'error');
  }
}

// Fetch admin's contacts information - UPDATED to handle contacts as a map
async function fetchContactsInfo() {
  try {
    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
    
    if (userDoc.exists()) {
      // Check both possible contact field names (Contacts or contacts)
      const contactsMap = userDoc.data().Contacts || userDoc.data().contacts || {};
      const contactIds = Object.keys(contactsMap);
      
      if (contactIds.length > 0) {
        // Get info for each contact ID
        const contactPromises = contactIds.map(async (contactId) => {
          const contactDoc = await getDoc(doc(db, 'users', contactId));
          if (contactDoc.exists()) {
            return { 
              uid: contactId, 
              chatId: contactsMap[contactId], // Store the chat ID if needed later
              ...contactDoc.data() 
            };
          }
          return null;
        });
        
        contactsInfo.value = (await Promise.all(contactPromises)).filter(Boolean);
      }
    }
  } catch (error) {
    console.error("Error fetching contacts info:", error);
    showMessage('Error loading contacts', 'error');
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
    showMessage('Member removed successfully', 'success');
  } catch (error) {
    console.error("Error removing member:", error);
    showMessage('Error removing member', 'error');
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
    if (!group.value.members) {
      group.value.members = [];
    }
    group.value.members.push(userId);
    
    // Find the contact in contactsInfo and move them to membersInfo
    const contactIndex = contactsInfo.value.findIndex(c => c.uid === userId);
    if (contactIndex !== -1) {
      const contact = contactsInfo.value[contactIndex];
      membersInfo.value.push(contact);
      contactsInfo.value.splice(contactIndex, 1);
    }
    
    showMessage('Member added successfully', 'success');
  } catch (error) {
    console.error("Error adding member:", error);
    showMessage('Error adding member', 'error');
  }
}

// Edit group info functions
function startEditing(field) {
  if (field === 'name') {
    editingName.value = true;
    nextTick(() => {
      // Focus code could be added here if needed
    });
  } else if (field === 'description') {
    editingDescription.value = true;
    nextTick(() => {
      // Focus code could be added here if needed
    });
  }
}

function cancelEditing(field) {
  if (field === 'name') {
    editingName.value = false;
    editedName.value = group.value.name;
  } else if (field === 'description') {
    editingDescription.value = false;
    editedDescription.value = group.value.description;
  }
}

async function saveGroupInfo(field) {
  try {
    if (field === 'name' && editedName.value.trim() !== group.value.name) {
      await updateDoc(doc(db, 'groups', groupId), {
        name: editedName.value.trim()
      });
      group.value.name = editedName.value.trim();
      editingName.value = false;
      showMessage('Group name updated', 'success');
    } else if (field === 'description' && editedDescription.value.trim() !== group.value.description) {
      await updateDoc(doc(db, 'groups', groupId), {
        description: editedDescription.value.trim()
      });
      group.value.description = editedDescription.value.trim();
      editingDescription.value = false;
      showMessage('Description updated', 'success');
    } else {
      cancelEditing(field);
    }
  } catch (error) {
    console.error(`Error updating ${field}:`, error);
    showMessage(`Error updating ${field}`, 'error');
  }
}

// Photo upload functions
function triggerFileInput() {
  fileInput.value.click();
}

function handleFileChange(event) {
  const file = event.target.files[0];
  if (file) {
    uploadGroupPhoto(file);
  }
}

async function uploadGroupPhoto(file) {
  if (!file) return;

  isUploadingPhoto.value = true;
  try {
    // Convert to base64 for preview and database storage
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64Image = e.target.result;

      // Update the UI immediately
      group.value.photoURL = base64Image;

      // Save the base64 string to Firestore
      await updateDoc(doc(db, 'groups', groupId), {
        photoURL: base64Image
      });

      showMessage('Group photo updated', 'success');
    };
    reader.readAsDataURL(file);
  } catch (error) {
    console.error("Error handling group photo:", error);
    showMessage('Error updating group photo', 'error');
  } finally {
    isUploadingPhoto.value = false;
  }
}

// Message display
function showMessage(msg, type) {
  message.value = msg;
  messageType.value = type;
  setTimeout(() => {
    message.value = '';
  }, 3000);
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
  position: relative;
}

.back-button {
  position: absolute;
  top: 20px;
  left: 20px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #f8f9fa;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
  transition: all 0.2s ease;
  z-index: 10;
}

.back-button:hover {
  background-color: #e9ecef;
  transform: translateX(-2px);
}

.back-button i {
  font-size: 18px;
  color: #495057;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 30px;
  margin-top: 30px;
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
  position: relative;
  cursor: pointer;
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

.edit-photo-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: rgba(0, 0, 0, 0.6);
  color: white;
  padding: 5px;
  font-size: 12px;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
}

.group-info {
  flex: 1;
  position: relative;
}

.group-info h1 {
  margin: 0;
  font-size: 24px;
  color: #2c3e50;
  display: inline-block;
}

.group-info p {
  margin: 5px 0 0;
  color: #666;
  white-space: pre-wrap;
}

.edit-icon {
  margin-left: 10px;
  color: #7f8c8d;
  cursor: pointer;
  font-size: 16px;
}

.edit-icon:hover {
  color: #3498db;
}

.edit-field {
  display: flex;
  align-items: center;
  gap: 10px;
}

.edit-field input,
.edit-field textarea {
  flex: 1;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: inherit;
}

.edit-field textarea {
  min-height: 80px;
  resize: vertical;
}

.save-edit-btn,
.cancel-edit-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  padding: 5px;
}

.save-edit-btn {
  color: #2ecc71;
}

.cancel-edit-btn {
  color: #e74c3c;
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

.no-contacts {
  text-align: center;
  padding: 15px;
  color: #7f8c8d;
  font-style: italic;
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

/* Message styles */
.message {
  padding: 10px 15px;
  border-radius: 4px;
  margin-top: 20px;
  text-align: center;
}

.message.success {
  background-color: #d4edda;
  color: #155724;
}

.message.error {
  background-color: #f8d7da;
  color: #721c24;
}

@media (max-width: 600px) {
  .group-header {
    flex-direction: column;
    text-align: center;
    margin-top: 50px;
  }
  
  .group-info {
    text-align: center;
  }
  
  .edit-icon {
    margin-left: 5px;
  }
}
</style>