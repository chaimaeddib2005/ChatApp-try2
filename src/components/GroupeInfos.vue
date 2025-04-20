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
            <img :src="contact.photoURL || 'default.jpg'" alt="Contact photo" class="contact-photo" />
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
  color: #5a3e36; /* Moroccan tea brown text */
  background-color: #f8f4e9; /* Light paper base */
  background-image: 
    /* Paper texture */
    url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 0.08 0"/></filter><rect width="100%" height="100%" filter="url(%23noise)"/></svg>'),
    /* Tea stains */
    radial-gradient(ellipse at 20% 30%, rgba(203, 173, 143, 0.2) 0%, transparent 40%),
    radial-gradient(ellipse at 80% 70%, rgba(190, 156, 120, 0.2) 0%, transparent 40%),
    radial-gradient(ellipse at 40% 60%, rgba(210, 180, 140, 0.15) 0%, transparent 40%);
  min-height: 100vh;
  box-shadow: inset 0 0 30px rgba(139, 90, 43, 0.1);
}

.back-button {
  position: absolute;
  top: 20px;
  left: 20px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #8b3a3a; /* Moroccan brown */
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 5px rgba(139, 58, 58, 0.3);
  transition: all 0.2s ease;
  z-index: 10;
  border: none;
}

.back-button:hover {
  background-color: #a56a37; /* Darker brown */
  transform: translateX(-2px);
}

.group-header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 30px;
  margin-top: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid #d4c9b8; /* Light Moroccan gold border */
}

.group-photo {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background-color: #f0e6d6; /* Tea cream */
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
  cursor: pointer;
  border: 3px solid #c9b18b; /* Moroccan gold */
  box-shadow: 0 4px 10px rgba(139, 90, 43, 0.2);
}

.group-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-placeholder {
  font-size: 40px;
  color: #8b5a2b; /* Moroccan tea brown */
}

.edit-photo-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: rgba(139, 58, 58, 0.8); /* Semi-transparent Moroccan brown */
  color: white;
  padding: 8px;
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
  font-size: 28px;
  color: #8b3a3a; /* Moroccan brown */
  display: inline-block;
  font-weight: 600;
}

.group-info p {
  margin: 10px 0 0;
  color: #5a3e36; /* Moroccan tea brown */
  white-space: pre-wrap;
  line-height: 1.5;
}

.edit-icon {
  margin-left: 10px;
  color: #8b5a2b; /* Moroccan gold */
  cursor: pointer;
  font-size: 18px;
  transition: all 0.2s;
}

.edit-icon:hover {
  color: #8b3a3a; /* Moroccan brown */
  transform: scale(1.1);
}

.edit-field {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
}

.edit-field input,
.edit-field textarea {
  flex: 1;
  padding: 10px;
  border: 1px solid #d4c9b8; /* Light Moroccan gold */
  border-radius: 8px;
  font-size: inherit;
  background-color: #f9f5f0; /* Light tea cream */
  color: #5a3e36; /* Moroccan tea brown */
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
  font-size: 18px;
  padding: 5px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.save-edit-btn {
  color: #2ecc71;
  background-color: rgba(46, 204, 113, 0.1);
}

.cancel-edit-btn {
  color: #e74c3c;
  background-color: rgba(231, 76, 60, 0.1);
}

.admin-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-top: 15px;
  padding: 6px 12px;
  background-color: #f1c40f; /* Gold */
  border-radius: 20px;
  font-size: 14px;
  color: #5a3e36; /* Moroccan tea brown */
  font-weight: 600;
}

.section {
  margin-bottom: 30px;
  background-color: rgba(249, 245, 240, 0.8); /* Semi-transparent tea cream */
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(139, 90, 43, 0.1);
  border: 1px solid #e0d7c7;
}

.section h2 {
  font-size: 20px;
  margin-bottom: 15px;
  color: #8b3a3a; /* Moroccan brown */
  padding-bottom: 8px;
  border-bottom: 1px solid #d4c9b8; /* Light Moroccan gold */
}

.members-list,
.contacts-list {
  display: grid;
  gap: 12px;
}

.member-card,
.contact-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background-color: #f9f5f0; /* Tea cream */
  border-radius: 10px;
  box-shadow: 0 2px 5px rgba(139, 90, 43, 0.1);
  border: 1px solid #e0d7c7;
  transition: transform 0.2s;
}

.member-card:hover,
.contact-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(139, 90, 43, 0.15);
}

.member-info,
.contact-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.member-photo,
.contact-photo {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  object-fit: cover;
  background-color: #f0e6d6; /* Light tea cream */
  border: 2px solid #c9b18b; /* Moroccan gold */
}

.admin-tag {
  font-size: 12px;
  padding: 3px 10px;
  background-color: #8b3a3a; /* Moroccan brown */
  color: white;
  border-radius: 10px;
  margin-left: 8px;
  font-weight: 500;
}

.remove-btn,
.add-btn {
  padding: 6px 14px;
  border: none;
  border-radius: 20px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
}

.remove-btn {
  background-color: #8b3a3a; /* Moroccan brown */
  color: white;
}

.remove-btn:hover {
  background-color: #a56a37; /* Darker brown */
  transform: translateY(-2px);
}

.add-btn {
  background-color: #c9b18b; /* Moroccan gold */
  color: #5a3e36; /* Moroccan tea brown */
}

.add-btn:hover {
  background-color: #d4c9b8; /* Lighter gold */
  transform: translateY(-2px);
}

.no-contacts {
  text-align: center;
  padding: 15px;
  color: #8b5a2b; /* Moroccan tea brown */
  font-style: italic;
}

/* Modal styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(90, 62, 54, 0.7); /* Semi-transparent Moroccan tea brown */
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background-color: #f9f5f0; /* Tea cream */
  padding: 25px;
  border-radius: 12px;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 4px 20px rgba(90, 62, 54, 0.3);
  border: 1px solid #d4c9b8;
}

.modal-content h3 {
  margin-top: 0;
  color: #8b3a3a; /* Moroccan brown */
  font-size: 22px;
}

.modal-content p {
  color: #5a3e36; /* Moroccan tea brown */
  margin-bottom: 20px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}

.confirm-btn,
.cancel-btn {
  padding: 8px 20px;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.confirm-btn {
  background-color: #8b3a3a; /* Moroccan brown */
  color: white;
}

.confirm-btn:hover {
  background-color: #a56a37; /* Darker brown */
  transform: translateY(-2px);
}

.cancel-btn {
  background-color: #f0e6d6; /* Light tea cream */
  color: #5a3e36; /* Moroccan tea brown */
  border: 1px solid #d4c9b8;
}

.cancel-btn:hover {
  background-color: #e6d9c2; /* Slightly darker tea cream */
  transform: translateY(-2px);
}

/* Message styles */
.message {
  padding: 12px 16px;
  border-radius: 8px;
  margin: 20px 0;
  text-align: center;
  font-weight: 500;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
}

.message.success {
  background-color: rgba(139, 195, 74, 0.2); /* Light green */
  color: #5a3e36; /* Moroccan tea brown */
  border: 1px solid #8bc34a;
}

.message.error {
  background-color: rgba(239, 83, 80, 0.2); /* Light red */
  color: #5a3e36; /* Moroccan tea brown */
  border: 1px solid #ef5350;
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
  
  .group-photo {
    width: 100px;
    height: 100px;
  }
}
</style>