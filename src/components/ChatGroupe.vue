<template>
  <div class="whole">
  <div class="chat-container">
    <!-- Header Section -->
    <div class="chat-header">
      <button class="back-button" @click="goBack">
        <i class="fas fa-arrow-left"></i>
      </button>
      
      <div class="group-info">
        <img :src="groupData?.photoURL || 'default.jpg'" alt="Group Photo" class="group-photo" />
        <span class="group-name">{{ groupData?.name || 'Group Chat' }}</span>
      </div>
      
      <button class="info-button" @click="showGroupInfo">
        <i class="fas fa-info-circle" @click="GoToInfos"></i>
      </button>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteConfirmation" class="delete-confirmation-modal">
      <div class="modal-content">
        <p>Are you sure you want to delete this message?</p>
        <div class="modal-buttons">
          <button @click="confirmDelete" class="confirm-button">Delete</button>
          <button @click="cancelDelete" class="cancel-button">Cancel</button>
        </div>
      </div>
    </div>

    <!-- Messages Container -->
    <div class="messages-container">
      <ul>
        <li
          v-for="msg in messageList"
          :key="msg.id"
          :class="[
            msg.sender === currentUser?.uid ? 'sent' : 'received',
            { 'with-sender-info': msg.sender !== currentUser?.uid && isGroupChat }
          ]"
          @mouseenter="hoveredMessageId = msg.id"
          @mouseleave="hoveredMessageId = null"
        >
          <!-- Show delete button if current user is sender or admin -->
          <button
            v-if="(msg.sender === currentUser?.uid || isCurrentUserAdmin) && hoveredMessageId === msg.id"
            @click="initiateDelete(msg.id)"
            class="delete-button"
          >
            <i class="fas fa-trash"></i>
          </button>

          <!-- Show sender info only in group chats and for received messages -->
          <div 
            v-if="msg.sender !== currentUser?.uid && isGroupChat" 
            class="sender-info"
          >
            <img 
              :src="msg.senderInfo?.photoURL || 'default-avatar.jpg'" 
              alt="Sender" 
              class="sender-avatar" 
            />
            <span class="sender-name">{{ msg.senderInfo?.name || 'Unknown' }}</span>
          </div>

          <div v-if="isImageMessage(msg.message)">
            <img :src="msg.message" alt="Image" class="chat-image" />
          </div>
          <div v-else class="message-text">
            {{ msg.message }}
          </div>
          <small class="timestamp">{{ formatTimestamp(msg.timestamp) }}</small>
        </li>
        <div ref="bottomAnchor"></div>
      </ul>
    </div>

    <!-- Input Area -->
    <div class="input-area">
      <input 
        type="text" 
        v-model="newMessage" 
        @keyup.enter="sendCombinedMessage" 
        placeholder="Type a message..." 
      />
      <button @click.prevent="sendCombinedMessage" class="send-button">
        <i class="fas fa-paper-plane"></i>
      </button>

      <div @drop.prevent="onDrop" @dragover.prevent class="file-upload-container">
        <input
          type="file"
          ref="fileInput"
          accept="image/*"
          @change="onFileChange"
          style="display: none"
        />
        <div v-if="previewUrl" class="image-preview">
          <img :src="previewUrl" alt="Preview" class="chat-image" />
          <button @click="cancelImage" class="cancel-preview-button">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <button @click="$refs.fileInput.click()" class="upload-button">
          <i class="fas fa-image"></i>
        </button>
      </div>
    </div>
  </div>
</div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getAuth } from 'firebase/auth';
import {
  doc,
  getDoc,
  onSnapshot,
  addDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  collection,
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../firebase';

const router = useRouter();
const bottomAnchor = ref(null);
const route = useRoute();
const groupId = route.params.groupId;
const auth = getAuth();
const currentUser = auth.currentUser;

const newMessage = ref('');
const messageList = ref([]);
const previewUrl = ref('');
const fileInput = ref(null);
const hoveredMessageId = ref(null);
const messageToDelete = ref(null);
const showDeleteConfirmation = ref(false);
const groupData = ref(null);

// Computed property to determine if this is a group chat
const isGroupChat = computed(() => {
  return groupData.value?.isGroup || false;
});

function GoToInfos(groupId) {
  router.push({ name: 'GroupInfos', params:groupId });
}

function goBack() {
  router.go(-1); // Go back to previous page
}

function showGroupInfo() {
  // Implement group info display logic here
  console.log("Show group info for:", groupData.value);
  // You might want to show a modal or navigate to a group info page
}

function scrollToBottom() {
  if (bottomAnchor.value) {
    bottomAnchor.value.scrollIntoView({ behavior: 'smooth' });
  }
}

const isCurrentUserAdmin = computed(() => {
  return groupData.value?.admin === currentUser?.uid;
});

function isImageMessage(message) {
  return typeof message === 'string' &&
    (message.startsWith('data:image') || /\.(jpeg|jpg|gif|png)$/i.test(message));
}

function formatTimestamp(ts) {
  if (!ts) return '';
  const date = ts.toDate();
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Load messages and sender info
async function loadMessagesByIds(ids) {
  const messages = [];

  for (const id of ids) {
    const messageDoc = await getDoc(doc(db, 'groupe_messages', id));
    if (messageDoc.exists()) {
      const messageData = messageDoc.data();
      let senderInfo = null;

      // Only fetch sender info for group chats or if sender is not current user
      if (isGroupChat.value || messageData.sender !== currentUser?.uid) {
        const senderDoc = await getDoc(doc(db, 'users', messageData.sender));
        if (senderDoc.exists()) {
          senderInfo = senderDoc.data();
        }
      }

      messages.push({
        id: messageDoc.id,
        ...messageData,
        senderInfo
      });
    }
  }

  messages.sort((a, b) => a.timestamp?.toMillis() - b.timestamp?.toMillis());
  messageList.value = messages;
  scrollToBottom();
}

const cancelImage = () => {
  previewUrl.value = '';
  if (fileInput.value) {
    fileInput.value.value = '';
  }
};

async function sendCombinedMessage() {
  const text = newMessage.value.trim();
  const image = previewUrl.value;

  if (!text && !image) return;

  try {
    const groupRef = doc(db, 'groups', groupId);
    const groupDoc = await getDoc(groupRef);
    if (!groupDoc.exists()) {
      console.error('Group not found');
      return;
    }

    const messageData = {
      sender: currentUser?.uid,
      message: image || text,
      timestamp: serverTimestamp()
    };

    const newMsgRef = await addDoc(collection(db, 'groupe_messages'), messageData);
    await updateDoc(groupRef, {
      messages: arrayUnion(newMsgRef.id)
    });

    newMessage.value = '';
    previewUrl.value = '';
  } catch (error) {
    console.error('Error sending message:', error);
  }
}

const onDrop = (e) => {
  const file = e.dataTransfer.files[0];
  if (file) convertToBase64(file);
};

const onFileChange = (e) => {
  const file = e.target.files[0];
  if (file) convertToBase64(file);
};

const convertToBase64 = (file) => {
  const reader = new FileReader();
  reader.onload = () => {
    previewUrl.value = reader.result;
  };
  reader.readAsDataURL(file);
};

// Delete message functionality
const initiateDelete = (messageId) => {
  messageToDelete.value = messageId;
  showDeleteConfirmation.value = true;
};

const cancelDelete = () => {
  showDeleteConfirmation.value = false;
  messageToDelete.value = null;
};

const confirmDelete = async () => {
  if (!messageToDelete.value) return;

  try {
    // Delete from groupe_messages collection
    await deleteDoc(doc(db, 'groupe_messages', messageToDelete.value));

    // Remove from group's messages array
    const groupRef = doc(db, 'groups', groupId);
    await updateDoc(groupRef, {
      messages: arrayRemove(messageToDelete.value)
    });

    // Update local state
    messageList.value = messageList.value.filter(msg => msg.id !== messageToDelete.value);
  } catch (error) {
    console.error('Error deleting message:', error);
  } finally {
    showDeleteConfirmation.value = false;
    messageToDelete.value = null;
  }
};

let groupUnsub = null;
onMounted(async () => {
  const groupRef = doc(db, 'groups', groupId);
  groupUnsub = onSnapshot(groupRef, (groupSnap) => {
    if (groupSnap.exists()) {
      groupData.value = groupSnap.data();
      const messageIds = groupData.value.messages || [];
      loadMessagesByIds(messageIds);
    } else {
      console.warn('Group does not exist');
      messageList.value = [];
    }
  });
});

onBeforeUnmount(() => {
  if (groupUnsub) groupUnsub();
});
</script>

<style scoped>
.chat-container {
  
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #cbb58e; /* Warm ivory background */
  position: relative;
  border: 1px solid #d4c9b8;
  border-radius: 500px;
  box-shadow: 0 4px 20px rgba(90, 62, 54, 0.1);
}

/* Header Styles */
.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background-color: #8b3a3a; /* Moroccan red */
  color: white;
  box-shadow: 0 2px 5px rgba(90, 62, 54, 0.1);
  z-index: 10;
  position: sticky;
  top: 0;

}

.back-button, .info-button {
  background: transparent;
  border: none;
  color: white;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  transition: background-color 0.3s;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-button:hover, .info-button:hover {
  background-color: rgba(255,255,255,0.2);
}

.group-info {
  display: flex;
  align-items: center;
  flex: 1;
  margin: 0 16px;
  overflow: hidden;
  min-width: 0;
}

.group-photo {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  margin-right: 12px;
  border: 2px solid #d4a762; /* Gold accent */
}

.group-name {
  font-weight: 500;
  font-size: 1.1rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: 'Amiri', serif;
}

/* Messages Container */
.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: rgba(255, 255, 255, 0.9); /* Semi-transparent white */
  backdrop-filter: blur(5px);
}

ul {
  list-style-type: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* Message bubble */
li {
  max-width: 75%;
  padding: 12px 16px;
  border-radius: 20px;
  position: relative;
  word-wrap: break-word;
  line-height: 1.5;
  font-size: 0.95rem;
  transition: all 0.3s ease;
  box-shadow: 0 3px 10px rgba(139, 58, 58, 0.1);
}

.sent {
  align-self: flex-end;
  background-color: #8b3a3a; /* Moroccan red */
  color: white;
  border-bottom-right-radius: 4px;
  margin-top: 8px;
}

.received {
  align-self: flex-start;
  background-color: #f9f5f0; /* Tea cream */
  color: #5a3e36; /* Moroccan tea brown */
  border-bottom-left-radius: 4px;
  margin-top: 8px;
  border: 1px solid #d4c9b8;
}

.with-sender-info {
  padding-top: 36px;
}

/* Sender info styles */
.sender-info {
  position: absolute;
  top: 8px;
  left: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.sender-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid #d4a762; /* Gold accent */
}

.sender-name {
  font-size: 0.75rem;
  font-weight: bold;
  color: #8b5a2b;
  font-family: 'Amiri', serif;
}

.message-text {
  margin-top: 4px;
}

.chat-image {
  max-width: 100%;
  max-height: 300px;
  border-radius: 10px;
  margin-top: 6px;
  object-fit: contain;
  border: 1px solid #d4a762;
}

.timestamp {
  display: block;
  font-size: 0.7rem;
  margin-top: 4px;
  opacity: 0.7;
  text-align: right;
  color: inherit;
}

/* Input Area */
.input-area {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background-color: #f0e6d6;
  border-top: 1px solid #d4c9b8;
  position: sticky;
  bottom: 0;
}

input[type="text"] {
  flex: 1;
  padding: 12px 16px;
  font-size: 16px;
  border: 1px solid #d4c9b8;
  border-radius: 20px;
  outline: none;
  transition: all 0.3s ease;
  background-color: #f9f5f0;
  font-family: 'Amiri', serif;
}

input[type="text"]:focus {
  border-color: #8b5a2b;
  box-shadow: 0 0 0 2px rgba(139, 90, 43, 0.2);
}

.send-button, .upload-button {
  background-color: #8b3a3a;
  color: white;
  border: none;
  border-radius: 50%;
  width: 42px;
  height: 42px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  box-shadow: 0 2px 5px rgba(139, 90, 43, 0.3);
}

.send-button:hover, .upload-button:hover {
  background-color: #a56a37;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(139, 90, 43, 0.4);
}

.file-upload-container {
  position: relative;
  display: flex;
  align-items: center;
}
.whole{
  background-color: #f6ebd8;
}
.image-preview {
  position: relative;
  margin-right: 10px;
}

.cancel-preview-button {
  position: absolute;
  top: -8px;
  right: -8px;
  background-color: #ff4444;
  color: white;
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  font-size: 12px;
}

.cancel-preview-button:hover {
  background-color: #cc0000;
}

/* Delete button styles */
.delete-button {
  position: absolute;
  top: -8px;
  right: -8px;
  background-color: #ff4444;
  color: white;
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  z-index: 1;
  font-size: 12px;
  transition: all 0.3s ease;
}

.delete-button:hover {
  background-color: #cc0000;
  transform: scale(1.1);
}

/* Delete confirmation modal */
.delete-confirmation-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background-color: #f9f5f0;
  padding: 20px;
  border-radius: 10px;
  width: 300px;
  text-align: center;
  box-shadow: 0 4px 20px rgba(90, 62, 54, 0.2);
  border: 1px solid #e0d7c7;
}

.modal-content p {
  color: #5a3e36;
  margin-bottom: 20px;
  font-family: 'Amiri', serif;
}

.modal-buttons {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 20px;
}

.confirm-button {
  background-color: #8b3a3a;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 5px rgba(139, 90, 43, 0.3);
  font-family: 'Amiri', serif;
}

.confirm-button:hover {
  background-color: #a56a37;
  transform: translateY(-2px);
}

.cancel-button {
  background-color: #f0e6d6;
  color: #5a3e36;
  border: 1px solid #d4c9b8;
  padding: 8px 16px;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: 'Amiri', serif;
}

.cancel-button:hover {
  background-color: #e6d9c2;
  transform: translateY(-2px);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .group-name {
    font-size: 1rem;
  }
  
  input[type="text"] {
    padding: 10px 14px;
    font-size: 15px;
  }
}

@media (max-width: 480px) {
  .chat-header {
    padding: 10px 12px;
  }
  
  .group-photo {
    width: 36px;
    height: 36px;
  }
  
  li {
    padding: 10px 14px;
    font-size: 0.9rem;
  }
  
  .send-button, .upload-button {
    width: 38px;
    height: 38px;
  }
}
</style>