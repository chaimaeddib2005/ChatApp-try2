<template>
    <div>
      <h2>Sign Up</h2>
  
      <form @submit.prevent="handleSignUp">
        <input v-model="name" type="text" placeholder="Name" />
        <input v-model="email" type="email" placeholder="Email" />
        <input v-model="password" type="password" placeholder="Password" />
        <button type="submit">Register</button>
  
        <p v-if="error">{{ error }}</p>
        <p>
          Déjà inscrit ?
          <router-link to="/login">Connectez-vous ici</router-link>
        </p>
      </form>
    </div>
  </template>
  
  <script setup>
  import { ref } from 'vue';
  import { signUp } from '@/composables/AuthService';
  import { auth, db } from '@/firebase';
  import { doc, setDoc } from 'firebase/firestore';
  import { useRouter } from 'vue-router';
  
  const name = ref('');
  const email = ref('');
  const password = ref('');
  const error = ref('');
  const router = useRouter();
  
  const handleSignUp = async () => {
    error.value = '';
  
    if (!email.value.toLowerCase().endsWith('@um6p.ma')) {
      error.value = 'Vous devez utiliser une adresse @um6p.ma';
      return;
    }
  
    if (password.value.length < 6) {
      error.value = 'Mot de passe trop court';
      return;
    }
  
    try {
      await signUp(email.value, password.value);
      const user = auth.currentUser;
  
      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        uid: user.uid,
        name: name.value, 
        photoURL: user.photoURL || "",
        state: "offline",
        sentInvitations : [],
        Groups: [],
        invitations: [],
        Contacts: {}
      });
  
      router.push('/home');
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        error.value = "Aucun compte associé à cette adresse email.";
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        error.value = "Email ou mot de passe incorrect.";
      } else if (err.code === 'auth/invalid-email') {
        error.value = "Adresse email invalide.";
      } else {
        error.value = err.message;
      }
    }
  };
  </script>
  
  <style scoped>
  div {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-top: 100px;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  }
  
  h2 {
    font-size: 2rem;
    margin-bottom: 1rem;
    color: #4a4a4a;
  }
  
  form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 2rem;
    border: 1px solid #ddd;
    border-radius: 12px;
    box-shadow: 0 8px 20px rgba(0,0,0,0.05);
    background-color: #fff;
    width: 300px;
  }
  
  input {
    padding: 0.75rem;
    border: 1px solid #ccc;
    border-radius: 8px;
    font-size: 1rem;
    transition: border 0.3s ease;
  }
  
  input:focus {
    outline: none;
    border-color: #10b981;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
  }
  
  button {
    background-color: #576afc;
    color: white;
    padding: 0.75rem;
    border: none;
    border-radius: 8px;
    font-weight: bold;
    cursor: pointer;
    transition: background-color 0.3s ease;
  }
  
  button:hover {
    background-color: #0a19c6;
  }
  
  p {
    font-size: 0.9rem;
    text-align: center;
  }
  
  p a {
    color: #10b981;
    text-decoration: none;
    font-weight: 500;
  }
  
  p a:hover {
    text-decoration: underline;
  }
  
  p[v-if] {
    color: red;
    font-weight: bold;
    margin-top: 0.5rem;
  }
  </style>