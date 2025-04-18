import { ref } from 'vue'
import { auth, db } from '@/firebase'
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider,
  signInAnonymously,
  signOut,
  onAuthStateChanged
} from 'firebase/auth'

import {
  doc,
  setDoc,
  getDoc
} from 'firebase/firestore'


// Reactive user and auth loading states
const user = ref(null)
const authLoading = ref(true)

const getUserData = async (firebaseUser) => {
  if (!firebaseUser) return null
  
  const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
  if (userDoc.exists()) {
    return { 
      ...firebaseUser,
      ...userDoc.data() 
    }
  }
  return firebaseUser
}

// Modifiez le onAuthStateChanged pour inclure les données Firestore
onAuthStateChanged(auth, async (currentUser) => {
  if (currentUser) {
    user.value = await getUserData(currentUser)
  } else {
    user.value = null
  }
  authLoading.value = false
})


const register = async (email, password, name) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password)
  const newUser = userCredential.user

  // Save to Firestore with name
  await setDoc(doc(db, 'users', newUser.uid), {
    uid: newUser.uid,
    email: newUser.email,
    name: name || '',
    photoURL: '',
    role: 'normal'
  })

  await sendEmailVerification(newUser)

  // ✅ Sign out to prevent login until verification
  await signOut(auth)

  return userCredential
}

// Login with email/password
const login = (email, password) => signInWithEmailAndPassword(auth, email, password)

// Reset password
const resetPassword = (email) => sendPasswordResetEmail(auth, email)

// Google login and Firestore user creation
const googleLogin = async () => {
  const provider = new GoogleAuthProvider()
  const userCredential = await signInWithPopup(auth, provider)
  const googleUser = userCredential.user

  const userDocRef = doc(db, 'users', googleUser.uid)
  const userSnap = await getDoc(userDocRef)

  if (!userSnap.exists()) {
    await setDoc(userDocRef, {
      uid: googleUser.uid,
      email: googleUser.email,
      name: '',
      photoURL: '',
      role: 'normal'
    })
  }

  return userCredential
}

// Anonymous login (you can also add Firestore write here if needed)
const anonymousLogin = () => signInAnonymously(auth)

// Logout function without router
const logout = () => signOut(auth)

const getCurrentUser = () => user.value 

// Export composable
export const useAuth = () => {
  return {
    user,
    authLoading,
    register,
    login,
    resetPassword,
    googleLogin,
    anonymousLogin,
    logout,
    getCurrentUser
  }
}