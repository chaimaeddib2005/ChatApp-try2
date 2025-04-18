<template>
    <div>
        <h2>Login</h2>
        
        <form @submit.prevent="handleLogin">
           <input v-model="email" type="email" placeholder="Email" /> 
           <input v-model="password" type="password" placeholder="Password"/>
           <p>
  Pas encore inscrit ?
  <router-link to="/register">Créer un compte</router-link>
</p>

           <button type="submit">Login</button>
           <p v-if="error">{{ error }}</p>
        
        </form> 
    </div>
</template>

<script setup>
// Les variables réactives sont un concept clé en Vue 3 — elles permettent à ton interface (UI) de réagir automatiquement quand les données changent.
// ref : créer des varibales réactifs
// useRouter() naviguer entre les pages

import { ref } from 'vue'
import { login } from '@/composables/AuthService'
import  { useRouter } from 'vue-router'


const email=ref('')
const password=ref('')
const error =ref('')
const router=useRouter() // pour passer à la page de chat


const handleLogin = async () => {
  error.value = '';

  try {
    await login(email.value, password.value);
    router.push('/home');
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      error.value = "Aucun compte associé à cette adresse email.";
    } else if (err.code === 'auth/wrong-password') {
      error.value = "Mot de passe incorrect.";
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
  border-color: #4f46e5; /* Indigo */
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.2);
}

button {
  background-color: #4f46e5;
  color: white;
  padding: 0.75rem;
  border: none;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

button:hover {
  background-color: #4338ca;
}

p {
  font-size: 0.9rem;
  text-align: center;
}

p a {
  color: #4f46e5;
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