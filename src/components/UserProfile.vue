<template>
  <div class="pastel-reported-discussions" v-if="user">
    <!-- Go Back Button -->
    <button @click="goBackToHome" class="go-back-btn">
      <i class="fas fa-arrow-left"></i> Go Back to Home
    </button>

    <h2 class="section-header">Profile Info</h2>

    <!-- Image Upload & Preview -->
    <div class="upload-box" @dragover.prevent @drop.prevent="onDrop">
      <input type="file" ref="fileInput" @change="onFileChange" hidden />
      <img
        :src="previewUrl || user.photoURL || defaultPhoto"
        alt="Profile Picture"
        class="avatar"
        @click="triggerFileInput"
      />
      <p class="upload-text">Click or drag image here to upload</p>
    </div>

    <div class="form-group">
      <label class="form-label"><strong>Name:</strong></label>
      <input v-model="editableUser.name" class="form-input" />
    </div>

    <div class="form-group">
      <label class="form-label"><strong>Email:</strong></label>
      <input v-model="editableUser.email" class="form-input" />
    </div>

    <button @click="saveProfileChanges" class="save-btn">
      <i class="fas fa-save"></i> Save Changes
    </button>

    <h3 class="subsection-header">Change Password</h3>
    <div class="form-group">
      <input type="password" v-model="currentPassword" placeholder="Current Password" class="form-input" />
    </div>
    <div class="form-group">
      <input type="password" v-model="newPassword" placeholder="New Password" class="form-input" />
    </div>
    <button @click="changePassword" class="password-btn">
      <i class="fas fa-key"></i> Update Password
    </button>

    <h3 class="subsection-header">Delete Account</h3>
    <button @click="deleteAccount" class="delete-btn">
      <i class="fas fa-trash-alt"></i> Delete My Account
    </button>

    <!-- Success/Error Messages -->
    <p v-if="success" ref="messageBox" class="message success">
      <i class="fas fa-check-circle"></i> {{ success }}
    </p>
    <p v-if="error" ref="messageBox" class="message error">
      <i class="fas fa-exclamation-circle"></i> {{ error }}
    </p>
  </div>
</template>

<script setup>
import { ref, reactive, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import {
  getAuth,
  updatePassword,
  verifyBeforeUpdateEmail,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential
} from 'firebase/auth'
import { doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { db } from '@/firebase'
import { defineProps } from 'vue'

const props = defineProps({ user: Object })

const router = useRouter() // Vue Router instance
const auth = getAuth()
const userRef = doc(db, 'users', auth.currentUser.uid)

const editableUser = reactive({
  name: '',
  email: ''
})

const previewUrl = ref('')
const fileInput = ref(null)
const defaultPhoto = '/default.jpg'
const currentPassword = ref('')
const newPassword = ref('')
const success = ref('')
const error = ref('')
const messageBox = ref(null)

watch(
  () => props.user,
  (val) => {
    if (val) {
      editableUser.name = val.name || ''
      editableUser.email = val.email || ''
    }
  },
  { immediate: true }
)

const scrollToMessage = async () => {
  await nextTick()
  messageBox.value?.scrollIntoView({ behavior: 'smooth' })
}

const showSuccess = async (msg) => {
  success.value = msg
  error.value = ''
  await scrollToMessage()
}

const showError = async (msg) => {
  error.value = msg
  success.value = ''
  await scrollToMessage()
}

const triggerFileInput = () => fileInput.value?.click()

const onFileChange = (e) => {
  const file = e.target.files[0]
  if (file) convertToBase64(file)
}

const onDrop = (e) => {
  const file = e.dataTransfer.files[0]
  if (file) convertToBase64(file)
}

const convertToBase64 = (file) => {
  const reader = new FileReader()
  reader.onload = async () => {
    const base64Image = reader.result
    previewUrl.value = base64Image
    try {
      await updateDoc(userRef, { photoURL: base64Image })
      await showSuccess('Profile picture updated.')
    } catch (err) {
      await showError(err.message)
    }
  }
  reader.readAsDataURL(file)
}

const saveProfileChanges = async () => {
  const user = auth.currentUser
  try {
    await updateDoc(userRef, {
      name: editableUser.name
    })

    if (editableUser.email !== user.email) {
      await verifyBeforeUpdateEmail(user, editableUser.email, {
        url: window.location.origin
      })

      await showSuccess(
        'A verification email has been sent to your new email address. Please confirm it before logging in with the new email.'
      )
    } else {
      await showSuccess('Profile updated successfully.')
    }
  } catch (err) {
    await showError(err.message)
  }
}

const changePassword = async () => {
  try {
    const user = auth.currentUser
    const credential = EmailAuthProvider.credential(user.email, currentPassword.value)
    await reauthenticateWithCredential(user, credential)
    await updatePassword(user, newPassword.value)
    await showSuccess('Password updated!')
  } catch (err) {
    await showError(err.message)
  }
}

const deleteAccount = async () => {
  try {
    if (!confirm('Are you sure you want to permanently delete your account?')) return
    await deleteDoc(userRef)
    await deleteUser(auth.currentUser)
    localStorage.removeItem('hasVisited')
    await showSuccess('Your account has been deleted. Redirecting...')
    setTimeout(() => {
      window.location.href = '/'
    }, 2000)
  } catch (err) {
    await showError(err.message)
  }
}

// Go back to the home page
const goBackToHome = () => {
  router.push('/home') // Navigate to the home page
}
</script>

<style scoped>
.pastel-reported-discussions {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  background: #f9f5ee; /* Warm ivory background */
  min-height: 100vh;
  font-family: 'Amiri', 'Noto Sans Arabic', sans-serif;
}

.go-back-btn {
  background-color: #8b3a3a; /* Moroccan red */
  color: #f5e0c7;
  border: none;
  padding: 10px 15px;
  border-radius: 20px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 20px;
  box-shadow: 0 2px 5px rgba(139, 90, 43, 0.3);
  transition: all 0.3s ease;
}

.go-back-btn:hover {
  background-color: #a56a37;
  transform: translateY(-2px);
}

.section-header {
  color: #5a3e36; /* Dark brown */
  font-size: 1.5rem;
  margin-bottom: 1.5rem;
  position: relative;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #d4a762; /* Gold accent */
}

.subsection-header {
  color: #5a3e36;
  font-size: 1.2rem;
  margin: 1.5rem 0 1rem;
  position: relative;
  padding-bottom: 0.3rem;
  border-bottom: 1px solid #d4c9b8;
}

.upload-box {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(139, 90, 43, 0.1);
  border: 1px solid #d4a762;
  text-align: center;
  cursor: pointer;
  margin-bottom: 1.5rem;
  transition: all 0.3s ease;
  backdrop-filter: blur(5px);
}

.upload-box:hover {
  box-shadow: 0 4px 12px rgba(139, 90, 43, 0.2);
}

.avatar {
  width: 150px;
  height: 150px;
  object-fit: cover;
  border-radius: 50%;
  margin-bottom: 1rem;
  border: 3px solid #d4a762;
}

.upload-text {
  color: #8b5a2b;
  margin-top: 0.5rem;
}

.form-group {
  margin-bottom: 1.2rem;
}

.form-label {
  display: block;
  margin-bottom: 0.5rem;
  color: #5a3e36;
  font-weight: 500;
}

.form-input {
  width: 100%;
  padding: 0.8rem;
  border-radius: 6px;
  border: 1px solid #d4c9b8;
  background: #f9f5f0;
  color: #5a3e36;
  transition: all 0.2s ease;
  font-family: 'Amiri', serif;
}

.form-input:focus {
  outline: none;
  border-color: #8b5a2b;
  box-shadow: 0 0 0 2px rgba(139, 90, 43, 0.2);
}

.save-btn, .password-btn, .delete-btn {
  padding: 0.8rem 1.5rem;
  border-radius: 20px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin: 1rem 0;
  box-shadow: 0 2px 5px rgba(139, 90, 43, 0.2);
  font-family: 'Amiri', serif;
}

.save-btn {
  background-color: #8b3a3a;
  color: #f5e0c7;
  border: none;
}

.save-btn:hover {
  background-color: #a56a37;
  transform: translateY(-2px);
}

.password-btn {
  background-color: #c9b18b; /* Gold */
  color: #5a3e36;
  border: none;
}

.password-btn:hover {
  background-color: #d4a762;
  transform: translateY(-2px);
}

.delete-btn {
  background-color: #a52a2a; /* Darker red */
  color: #f5e0c7;
  border: none;
}

.delete-btn:hover {
  background-color: #8b0000;
  transform: translateY(-2px);
}

.message {
  margin-top: 1.5rem;
  padding: 1rem;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.success {
  background-color: rgba(166, 217, 166, 0.3);
  color: #256029;
  border: 1px solid #4caf50;
}

.error {
  background-color: rgba(255, 179, 179, 0.3);
  color: #990000;
  border: 1px solid #f44336;
}

@media (max-width: 600px) {
  .pastel-reported-discussions {
    padding: 1rem;
  }
  
  .avatar {
    width: 120px;
    height: 120px;
  }
  
  .section-header {
    font-size: 1.3rem;
  }
  
  .subsection-header {
    font-size: 1.1rem;
  }
}
</style>