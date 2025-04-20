<template>
  <div class="container">
    <button @click="goBackToChatList" id="gobackbut">Back to Chat List</button>
    <div class="chat-header">
      <div class="user-info">
        <img 
          v-if="otherUserPfp" 
          :src="otherUserPfp" 
          alt="Profile picture" 
          class="profile-picture"
        >
        <div v-else class="profile-placeholder">
          {{ otherUsername.charAt(0) }}
        </div>
        <h3>{{ otherUsername }}</h3>
      </div>
      <small v-if="otherUserId" class="status-indicator">
        {{ otherUserStatus || 'offline' }}
        <span v-if="isOtherUserTyping"> (typing...)</span>
      </small>
    </div>
   

    <div v-if="showDeleteModal" class="modal-overlay">
    <div class="modal">
      <h3>Delete Message</h3>
      <p>Are you sure you want to delete this message?</p>
      <div class="modal-actions">
        <button @click="confirmDelete" class="confirm-btn">Delete</button>
        <button @click="cancelDelete" class="cancel-btn">Cancel</button>
      </div>
      </div>
      </div>
    
    <ul ref="messagesContainer">
      <li
        v-for="msg in messageList"
        :key="msg.id"
        :class="msg.sender === currentUser?.uid ? 'sent' : 'received'"
        @mouseover="hoveredMessage = msg.id"
          @mouseleave="hoveredMessage = null"
      >
        <div v-if="isImageMessage(msg.message)">
          <img :src="msg.message" alt="Image" class="chat-image" />
        </div>
        <div v-else>
          {{ msg.message }}
        </div>
        <small class="timestamp">{{ formatTimestamp(msg.timestamp) }}</small>
        <button 
        v-if="msg.sender === currentUser?.uid && hoveredMessage === msg.id"
        @click.stop="deleteMessage(msg.id)"
        class="delete-button"
      >
        <i class="fas fa-trash"></i>
      </button>

      </li>
    </ul>
    <div class="input-area">
      <input 
        type="text" 
        v-model="newMessage"
        @input="handleTyping"
        @keyup.enter="sendCombinedMessage"
      >
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
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { getDatabase, ref as dbRef, set, onDisconnect, onValue} from 'firebase/database';
import { useRoute } from 'vue-router';
import { getAuth } from 'firebase/auth';
import { useRouter } from 'vue-router';
import {
  doc,
  getDoc,
  onSnapshot,
  addDoc,
  updateDoc,
  arrayUnion,
  collection,
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../firebase';

const router = useRouter();
const route = useRoute();
const chatId = route.params.chatId;
const auth = getAuth();
const currentUser = auth.currentUser;

// Refs
const newMessage = ref('');
const messageList = ref([]);
const previewUrl = ref('');
const fileInput = ref(null);
const otherUserStatus = ref('offline');
const otherUsername = ref('');
const otherUserPfp = ref(''); // Add this with your other refs
const isOtherUserTyping = ref(false);
const messagesContainer = ref(null);
const hoveredMessage = ref(null);
const showDeleteModal = ref(false);
const messageToDelete = ref(null);
let typingTimeout = null;
let otherUserId = null;
let unsubscribeStatus = null;
let unsubscribeTyping = null;
let chatUnsub = null;


const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
};

const goBackToChatList = () => {
  router.push('/home/contacts');
};


const deleteMessage = (messageId) => {
messageToDelete.value = messageId;
showDeleteModal.value = true;
};


const confirmDelete = async () => {
if (!messageToDelete.value) return;

try {
  const chatRef = doc(db, 'chats', chatId);
  const chatDoc = await getDoc(chatRef);
  
  if (chatDoc.exists()) {
    const currentMessages = chatDoc.data().messages || [];
    const updatedMessages = currentMessages.filter(id => id !== messageToDelete.value);
    
    await updateDoc(chatRef, {
      messages: updatedMessages
    });
    
    await deleteDoc(doc(db, 'chatMessages', messageToDelete.value));
    
    
  }
} catch (error) {
  console.error('Error deleting message:', error);
} finally {
  cancelDelete();
}
};

const cancelDelete = () => {
showDeleteModal.value = false;
messageToDelete.value = null;
};

async function fetchOtherUserData() {
  try {
    const chatDoc = await getDoc(doc(db, 'chats', chatId));
    if (chatDoc.exists()) {
      const chatData = chatDoc.data();
      otherUserId = chatData.user1 === currentUser?.uid ? chatData.user2 : chatData.user1;
      
      const userDoc = await getDoc(doc(db, 'users', otherUserId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        otherUsername.value = userData.name;
        otherUserPfp.value = userData.pfp; // Assuming 'pfp' is the field name
        console.log('Fetched user data:', { 
          name: otherUsername.value, 
          pfp: otherUserPfp.value 
        });
      }
    }
  } catch (error) {
    console.error("Error fetching other user data:", error);
  }
}

const setupPresence = async () => {
  const rtdb = getDatabase();
  const user = currentUser;
  if (!user) return;

  try {
    const chatDoc = await getDoc(doc(db, 'chats', chatId));
    if (!chatDoc.exists()) return;

    const chatData = chatDoc.data();
    otherUserId = chatData.user1 === user.uid ? chatData.user2 : chatData.user1;

    // Current user's status
    const userStatusRef = dbRef(rtdb, `status/${user.uid}`);
    const userStatusConnectedRef = dbRef(rtdb, '.info/connected');
    
    // Other user's references
    const otherUserStatusRef = dbRef(rtdb, `status/${otherUserId}`);
    const otherUserTypingRef = dbRef(rtdb, `status/${otherUserId}/typing`);

    // Connection state
    onValue(userStatusConnectedRef, (snap) => {
      if (snap.val() === true) {
        set(userStatusRef, {
          state: 'online',
          last_changed: serverTimestamp(),
        }).catch(e => console.error("Error setting status:", e));

        onDisconnect(userStatusRef).set({
          state: 'offline',
          last_changed: serverTimestamp(),
        });
      }
    });

    // Other user's status
    unsubscribeStatus = onValue(otherUserStatusRef, (snapshot) => {
      const status = snapshot.val();
      otherUserStatus.value = status?.state || 'offline';
    }, (error) => {
      console.error("Status listener error:", error);
    });

    // Typing status
    unsubscribeTyping = onValue(otherUserTypingRef, (snapshot) => {
      isOtherUserTyping.value = snapshot.val() || false;
    }, (error) => {
      console.error("Typing listener error:", error);
    });

  } catch (error) {
    console.error("Error setting up presence:", error);
  }
};

const handleTyping = () => {
  if (!currentUser || !otherUserId) return;
  
  const rtdb = getDatabase();
  const typingRef = dbRef(rtdb, `status/${currentUser.uid}/typing`);
  
  set(typingRef, true).catch(e => console.error("Error setting typing:", e));
  
  if (typingTimeout) clearTimeout(typingTimeout);
  
  typingTimeout = setTimeout(() => {
    set(typingRef, false).catch(e => console.error("Error clearing typing:", e));
  }, 3000);
};

const cancelImage = () => {
  previewUrl.value = '';
  // Clear the file input as well
  if (fileInput.value) {
    fileInput.value.value = '';
  }
};

function isImageMessage(message) {
  return typeof message === 'string' &&
    (message.startsWith('data:image') || /\.(jpeg|jpg|gif|png)$/i.test(message));
}

function formatTimestamp(ts) {
  if (!ts) return '';

  let date;
  
  if (ts?.toDate) {
    date = ts.toDate();
  } else if (ts?.seconds) {
    date = new Date(ts.seconds * 1000);
  } else if (ts instanceof Date) {
    date = ts;
  } else {
    console.warn("Unknown timestamp format:", ts);
    return '';
  }

  return date.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}

async function loadMessagesByIds(ids) {
  const messages = [];
  try {
    if (!chatId) {
      console.error("No chatId provided");
      return;
    }

    const chatDoc = await getDoc(doc(db, 'chats', chatId));
    if (!chatDoc.exists()) {
      console.error("Chat doesn't exist");
      return;
    }

    for (const id of ids) {
      try {
        if (!id || typeof id !== 'string') {
          console.warn("Invalid message ID:", id);
          continue;
        }

        const messageDoc = await getDoc(doc(db, 'chatMessages', id));
        if (messageDoc.exists()) {
          const messageData = messageDoc.data();
          messages.push({
            id: messageDoc.id,
            ...messageData,
            timestamp: messageData.timestamp?.toDate?.() || new Date()
          });
        }
      } catch (error) {
        console.error(`Error loading message ${id}:`, error);
      }
    }

    messages.sort((a, b) => a.timestamp - b.timestamp);
    messageList.value = messages;
    scrollToBottom(); 
  } catch (error) {
    console.error("Error loading messages:", error);
  }
}

async function sendCombinedMessage() {
  const text = newMessage.value.trim();
  const image = previewUrl.value;

  if (!text && !image) return;

  try {
    const chatRef = doc(db, 'chats', chatId);
    const chatDoc = await getDoc(chatRef);
    if (!chatDoc.exists()) return;

    const chatData = chatDoc.data();
    const senderId = currentUser.uid;
    const receiverId = chatData.user1 === senderId ? chatData.user2 : chatData.user1;
    const messageData = {
      sender: currentUser?.uid,
      receiver: receiverId,
      message: image || text,
      timestamp: serverTimestamp(),
      chatId: chatId
    };

    const newMsgRef = await addDoc(collection(db, 'chatMessages'), messageData);
    await updateDoc(doc(db, 'chats', chatId), {
      messages: arrayUnion(newMsgRef.id),
      lastUpdated: serverTimestamp()
    });

    newMessage.value = '';
    previewUrl.value = '';
    
    if (currentUser) {
      const rtdb = getDatabase();
      const typingRef = dbRef(rtdb, `status/${currentUser.uid}/typing`);
      set(typingRef, false).catch(e => console.error("Error clearing typing:", e));
    }
  } catch (error) {
    console.error('Error sending message:', error);
  }
  scrollToBottom();
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

onMounted(async () => {
  try {
    await setupPresence();
    await fetchOtherUserData();
    console.log('User data fetched');
    const chatRef = doc(db, 'chats', chatId);
    chatUnsub = onSnapshot(chatRef, (chatSnap) => {
      if (chatSnap.exists()) {
        const chatData = chatSnap.data();
        const messageIds = chatData.messages || [];
        loadMessagesByIds(messageIds);
      } else {
        console.warn('Chat document does not exist');
        messageList.value = [];
      }
    }, (error) => {
      console.error("Chat listener error:", error);
    });
    scrollToBottom();
  } catch (error) {
    console.error("Error initializing chat:", error);
  }
});

onBeforeUnmount(() => {
  if (chatUnsub) chatUnsub();
  
  if (unsubscribeStatus && typeof unsubscribeStatus === 'function') {
    try {
      unsubscribeStatus();
    } catch (e) {
      console.warn("Error unsubscribing status:", e);
    }
  }
  
  if (unsubscribeTyping && typeof unsubscribeTyping === 'function') {
    try {
      unsubscribeTyping();
    } catch (e) {
      console.warn("Error unsubscribing typing:", e);
    }
  }
  
  if (typingTimeout) clearTimeout(typingTimeout);
  
  if (currentUser) {
    const rtdb = getDatabase();
    const userStatusRef = dbRef(rtdb, `status/${currentUser.uid}`);
    set(userStatusRef, {
      state: 'offline',
      last_changed: serverTimestamp(),
    }).catch(e => console.warn("Error setting offline status:", e));
  }
});
</script>

<style scoped>
.container {
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f9f5ee; /* Warm ivory background */
  font-family: 'Amiri', serif;
}

#gobackbut {
  width: 150px;
  height: 35px;
  border-radius: 20px;
  background-color: #8b3a3a; /* Moroccan red */
  color: #f5e0c7; /* Light beige */
  border: none;
  margin: 10px;
  cursor: pointer;
  box-shadow: 0 2px 5px rgba(139, 90, 43, 0.3);
  transition: all 0.3s ease;
}

#gobackbut:hover {
  background-color: #a56a37;
  transform: translateY(-2px);
}

/* Header - Matches group chat style */
.chat-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 16px;
  background-color: #8b3a3a; /* Moroccan red */
  color: #f5e0c7; /* Light beige text */
  box-shadow: 0 2px 5px rgba(90, 62, 54, 0.1);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.profile-picture {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #d4a762; /* Gold accent */
}

.profile-placeholder {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #8b3a3a;
  color: #f5e0c7;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  border: 2px solid #d4a762;
}

.status-indicator {
  color: #c7a374; /* Gold text */
  font-size: 0.8rem;
}

/* Messages area */
ul {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: transparent;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* Message bubbles */
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
  color: #f5e0c7;
  border-bottom-right-radius: 4px;
}

.received {
  align-self: flex-start;
  background-color: #f0e6d6; /* Light tea color */
  color: #5a3e36; /* Dark brown */
  border: 1px solid #d4c9b8;
  border-bottom-left-radius: 4px;
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

/* Input area */
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

button {
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

button:hover {
  background-color: #a56a37;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(139, 90, 43, 0.4);
}

.icon-button {
  margin-left: 4px;
}

.image-preview {
  position: relative;
  margin-right: 10px;
}

.cancel-button {
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

.cancel-button:hover {
  background-color: #cc0000;
}

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

/* Modal styles */
.modal-overlay {
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

.modal {
  background-color: #f9f5f0;
  padding: 20px;
  border-radius: 10px;
  width: 300px;
  text-align: center;
  box-shadow: 0 4px 20px rgba(90, 62, 54, 0.2);
  border: 1px solid #e0d7c7;
}

.modal h3 {
  color: #5a3e36;
  margin-bottom: 15px;
  font-family: 'Amiri', serif;
}

.modal p {
  color: #5a3e36;
  margin-bottom: 20px;
  font-family: 'Amiri', serif;
}

.modal-actions {
  display: flex;
  justify-content: center;
  gap: 10px;
}

.confirm-btn {
  background-color: #8b3a3a;
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 5px rgba(139, 90, 43, 0.3);
  font-family: 'Amiri', serif;
}

.confirm-btn:hover {
  background-color: #a56a37;
  transform: translateY(-2px);
}

.cancel-btn {
  background-color: #f0e6d6;
  color: #5a3e36;
  border: 1px solid #d4c9b8;
  padding: 8px 16px;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: 'Amiri', serif;
}

.cancel-btn:hover {
  background-color: #e6d9c2;
  transform: translateY(-2px);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .container {
    margin: 0 auto;
    border-radius: 0;
  }
  
  input[type="text"] {
    padding: 10px 14px;
  }
}

@media (max-width: 480px) {
  .chat-header {
    padding: 10px 12px;
  }
  
  .profile-picture, .profile-placeholder {
    width: 36px;
    height: 36px;
  }
  
  li {
    padding: 10px 14px;
    font-size: 0.9rem;
  }
  
  button {
    width: 38px;
    height: 38px;
  }
}
</style>