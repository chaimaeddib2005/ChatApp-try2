<template>
    <div>
      <form @submit.prevent="handleSubmit">
        <div class="input">
          <label>Email</label>
          <input v-model="email" type="email" required class="input-field" />
        </div>
  
        <div class="input">
          <label>Password</label>
          <input v-model="password" type="password" required class="input-field" />
        </div>
  
        <div v-if="!isLogin" class="input">
          <label>Name</label>
          <input v-model="name" type="text" required class="input-field" />
        </div>
  
        <button type="submit" :disabled="loading" class="auth-button register-btn">
          {{ isLogin ? 'Login' : 'Register' }}
        </button>
  
        <button
          v-if="isLogin"
          type="button"
          @click="handleResetPassword"
          :disabled="loading"
          class="auth-button reset-btn"
        >
          Forgot password?
        </button>
  
        <p v-if="error" class="message error">{{ error }}</p>
        <p v-if="success" class="message success">{{ success }}</p>
      </form>
  
      <button @click="handleGoogleLogin" :disabled="loading" class="auth-button google-btn">
        Sign in with Google
      </button>
      <button @click="handleAnonymousLogin" :disabled="loading" class="auth-button guest-btn">
        Continue as Guest
      </button>
    </div>
  </template>
  
  <script setup>

import { ref } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useRouter } from 'vue-router' // Make sure this import exists
import { getAuth, sendEmailVerification, defineProps, defineEmits } from 'firebase/auth'

const props = defineProps({
  isLogin: { type: Boolean, required: true }
})

const emit = defineEmits(['auth-success'])

// Initialize router properly
const router = useRouter() // This line is crucial

const email = ref('')
const password = ref('')
const name = ref('')
const error = ref('')
const success = ref('')
const loading = ref(false)

const { login, register, resetPassword, googleLogin, anonymousLogin } = useAuth()
  
  
const handleSubmit = async () => {
  error.value = ''
  success.value = ''
  loading.value = true
  try {
    if (props.isLogin) {
      await login(email.value, password.value)
      const currentUser = getAuth().currentUser

      if (!currentUser?.emailVerified) {
        await sendEmailVerification(currentUser)
        throw new Error('Email not verified. A new verification email has been sent.')
      }

      // Use the router instance we created above
      router.push('/') // Changed from emit('auth-success')
    } else {
      await register(email.value, password.value, name.value)
      success.value = 'Registration successful. A verification email has been sent. Please verify your email before logging in.'

      setTimeout(() => {
        router.push('/login') // Use the router instance
        loading.value = false
      }, 3000)
    }
  } catch (err) {
    error.value = cleanFirebaseError(err.message)
    loading.value = false
  }
}
  
  const handleResetPassword = async () => {
    error.value = ''
    success.value = ''
    loading.value = true
    try {
      await resetPassword(email.value)
      success.value = 'Password reset email sent!'
    } catch (err) {
      error.value = cleanFirebaseError(err.message)
    } finally {
      loading.value = false
    }
  }
  
  const handleGoogleLogin = async () => {
    error.value = ''
    success.value = ''
    loading.value = true
    try {
        await googleLogin()
        router.push('/')
    } catch (err) {
      const code = err.code || ''
      if (code === 'auth/popup-closed-by-user') {
        emit('switch-to-register')
      } else {
        error.value = cleanFirebaseError(code || err.message)
      }
    } finally {
      loading.value = false
    }
  }
  
  
  const handleAnonymousLogin = async () => {
    error.value = ''
    success.value = ''
    loading.value = true
    try {
        await anonymousLogin()
        router.push({ name: 'Home', query: { guest: 'true' } })
    } catch (err) {
      error.value = cleanFirebaseError(err.message)
    } finally {
      loading.value = false
    }
  }
  
  function cleanFirebaseError(message) {
    const map = {
      'auth/invalid-email': 'Invalid email address.',
      'auth/user-disabled': 'This account has been disabled.',
      'auth/user-not-found': 'No account found with this email.',
      'auth/wrong-password': 'Incorrect password.',
      'auth/email-already-in-use': 'Email is already in use.',
      'auth/weak-password': 'Password should be at least 6 characters.',
      'auth/popup-closed-by-user': 'Google sign-in was cancelled.',
      'auth/popup-blocked': 'Popup blocked. Please allow popups for this site.',
      'auth/network-request-failed': 'Network error. Please try again.',
      'auth/too-many-requests': 'Too many attempts. Please wait and try again later.',
    }
  
    for (const [code, friendlyMessage] of Object.entries(map)) {
      if (message.includes(code)) return friendlyMessage
    }
  
    return message.replace(/^Firebase:|\(auth.*?\)\.?/gi, '').trim() || 'An unexpected error occurred.'
  }
  </script>
  
  <style scoped>
  form {
    margin: 10px;
  }
  label {
    width: 100px;
    font-weight: bold;
    display: inline-block;
  }
  .input {
    margin: 5px;
  }
  .input-field {
    padding: 8px;
    width: 100%;
    border-radius: 4px;
    border: 1px solid #ccc;
  }
  .auth-button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    width: 100%;
    padding: 16px 24px;
    border: none;
    border-radius: 12px;
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);
    position: relative;
    overflow: hidden;
    margin: 12px 0;
  }
  
  .auth-button:hover {
    transform: translateY(-2px);
  }
  
  .register-btn {
    background-color: #7e57c2;
    color: white;
    box-shadow: 0 4px 12px rgba(126, 87, 194, 0.3);
  }
  
  .register-btn:hover {
    box-shadow: 0 6px 16px rgba(126, 87, 194, 0.4);
  }
  
  .reset-btn {
    background-color: #f5f5f5;
    color: #5a4a42;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }
  
  .reset-btn:hover {
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
    background-color: #eeeeee;
  }
  
  .google-btn {
    background-color: white;
    color: #5a4a42;
    border: 1px solid #e0e0e0;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }
  
  .google-btn:hover {
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
    background-color: #f8f8f8;
  }
  
  .guest-btn {
    background-color: #f5f5f5;
    color: #5a4a42;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }
  
  .guest-btn:hover {
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
    background-color: #eeeeee;
  }
  
  .message {
    margin: 10px 0;
    padding: 8px;
    border-radius: 6px;
  }
  
  .success {
    background-color: #e6ffed;
    color: #256029;
    border: 1px solid #b2f5ea;
  }
  
  .error {
    background-color: #ffe6e6;
    color: #990000;
    border: 1px solid #f5b2b2;
  }
  </style>