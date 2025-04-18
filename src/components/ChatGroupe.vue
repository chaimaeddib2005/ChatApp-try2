<template>
    <div class="container">
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
  
      <ul>
        <li
          v-for="msg in messageList"
          :key="msg.id"
          :class="msg.sender === currentUser?.uid ? 'sent' : 'received'"
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
  
          <!-- Show sender name for received messages in group chat -->
          <div 
            v-if="msg.sender !== currentUser?.uid && isGroupChat" 
            class="sender-name-top"
          >
            {{ msg.senderInfo?.name || 'Unknown' }}
          </div>
  
          <div v-if="isImageMessage(msg.message)">
            <img :src="msg.message" alt="Image" class="chat-image" />
          </div>
          <div v-else>
            {{ msg.message }}
          </div>
          <small class="timestamp">{{ formatTimestamp(msg.timestamp) }}</small>
        </li>
        <div ref="bottomAnchor"></div>
      </ul>
  
      <div class="input-area">
        <input type="text" v-model="newMessage" @keyup.enter="sendCombinedMessage" />
        <button @click.prevent="sendCombinedMessage">
          <i class="fas fa-paper-plane"></i>
        </button>
  
        <div @drop.prevent="onDrop" @dragover.prevent>
          <input
            type="file"
            ref="fileInput"
            accept="image/*"
            @change="onFileChange"
            style="display: none"
          />
          <div v-if="previewUrl" class="image-preview">
            <img :src="previewUrl" alt="Preview" class="chat-image" />
            <button @click="cancelImage" class="cancel-button">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <button @click="$refs.fileInput.click()" class="icon-button">
            <i class="fas fa-image"></i>
          </button>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
  import { useRoute } from 'vue-router';
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
  
  const isGroupChat = computed(() => {
    return groupData.value?.isGroup || false;
  });
  
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
  
        // Always fetch sender info for group chats
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
  .container {
    width: 100%;
    max-width: 600px;
    margin: 40px auto;
    padding: 20px;
    display: flex;
    flex-direction: column;
    background-color: #ffffff;
    border-radius: 16px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    position: relative;
  }
  
  h2 {
    text-align: center;
    font-size: 1.5rem;
    margin-bottom: 16px;
    color: #333;
  }
  
  ul {
    flex: 1;
    overflow-y: auto;
    padding: 0 10px;
    margin-bottom: 20px;
    max-height: 400px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  
  .image-preview {
    position: relative;
    margin-top: 10px;
    text-align: center;
  }
  
  .cancel-button {
    position: absolute;
    top: -10px;
    right: -10px;
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
  }
  
  .cancel-button:hover {
    background-color: #cc0000;
  }
  
  .cancel-button i {
    font-size: 12px;
  }
  
  .image-preview img {
    max-width: 120px;
    border-radius: 12px;
    border: 1px solid #ccc;
  }
  
  /* Message bubble */
  li {
    list-style: none;
    max-width: 75%;
    padding: 10px 14px;
    border-radius: 20px;
    position: relative;
    word-wrap: break-word;
    line-height: 1.5;
    font-size: 0.95rem;
    transition: background-color 0.2s;
  }
  
  .sent {
    align-self: flex-end;
    background-color: #4caf50;
    color: #fff;
    border-bottom-right-radius: 4px;
    margin-top: 8px;
  }
  
  .received {
    align-self: flex-start;
    background-color: #f0f0f0;
    color: #333;
    border-bottom-left-radius: 4px;
    margin-top: 8px;
  }
  
  /* Sender name above message (WhatsApp style) */
  .sender-name-top {
    font-size: 0.75rem;
    font-weight: bold;
    color: #666;
    margin-bottom: 4px;
    margin-left: 4px;
  }
  
  .chat-image {
    max-width: 100%;
    border-radius: 10px;
    margin-top: 6px;
  }
  
  .timestamp {
    display: block;
    font-size: 0.7rem;
    margin-top: 4px;
    opacity: 0.7;
    text-align: right;
  }
  
  .input-area {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: auto;
    padding-top: 10px;
    border-top: 1px solid #eee;
  }
  
  input[type="text"] {
    flex: 1;
    padding: 10px 14px;
    font-size: 16px;
    border: 1px solid #ccc;
    border-radius: 20px;
    outline: none;
    transition: border-color 0.2s;
  }
  
  input[type="text"]:focus {
    border-color: #4caf50;
  }
  
  button {
    background-color: #4caf50;
    color: #fff;
    border: none;
    border-radius: 50%;
    width: 42px;
    height: 42px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.2s ease-in-out;
  }
  
  button:hover {
    background-color: #43a047;
  }
  
  button i {
    font-size: 18px;
  }
  
  .icon-button {
    background-color: #2196f3;
    margin-left: 4px;
  }
  
  .icon-button:hover {
    background-color: #1e88e5;
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
  }
  
  .delete-button:hover {
    background-color: #cc0000;
  }
  
  .delete-button i {
    font-size: 12px;
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
    background-color: white;
    padding: 20px;
    border-radius: 10px;
    width: 300px;
    text-align: center;
  }
  
  .modal-buttons {
    display: flex;
    justify-content: center;
    gap: 10px;
    margin-top: 20px;
  }
  
  .confirm-button {
    background-color: #ff4444;
  }
  
  .confirm-button:hover {
    background-color: #cc0000;
  }
  
  .modal-buttons .cancel-button {
    background-color: #6c757d;
    border-radius: 20px;
    width: auto;
    padding: 0 15px;
  }
  
  .modal-buttons .cancel-button:hover {
    background-color: #5a6268;
  }
  </style>