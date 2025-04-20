<template>
  <div>
    <!-- Animated background blobs -->
    <div class="background-blobs">
      <span></span>
      <span></span>
      <span></span>
    </div>

    <!-- Login form card -->
    <div class="login-container">
      <div class="login-card">
        <h2>Login</h2>

        <form @submit.prevent="handleLogin">
          <input v-model="email" type="email" placeholder="Email" />
          <input v-model="password" type="password" placeholder="Password" />

          <button type="submit">Login</button>

          <p v-if="error" style="color: red; margin-top: 10px;">{{ error }}</p>

          <p class="register-link">
            Pas encore inscrit ?
            <router-link to="/register">Créer un compte</router-link>
          </p>
        </form>
      </div>
    </div>
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
body {
  margin: 0;
  padding: 0;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: linear-gradient(135deg, #fef9f8, #f4f0ed); /* soft background */
  color: #333;
}

/* Center container */
.login-container {
  width: 100%;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Card */
.login-card {
  background-color: #fff;
  padding: 40px;
  border-radius: 24px;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.15);
  max-width: 400px;
  width: 90%;
  text-align: center;
}

/* Title */
.login-card h2 {
  margin-bottom: 25px;
  font-size: 28px;
  color: #772f2f;
}

/* Form */
.login-card form {
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* Inputs */
.login-card input {
  width: 100%;
  max-width: 300px;
  padding: 12px 15px;
  margin: 10px 0;
  border: 1px solid #ccc;
  border-radius: 12px;
  font-size: 16px;
  transition: border-color 0.3s ease;
}

.login-card input:focus {
  outline: none;
  border-color: #772f2f;
}

/* Button */
.login-card button {
  width: 100%;
  max-width: 300px;
  background-color: #772f2f;
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 12px;
  font-size: 16px;
  cursor: pointer;
  margin-top: 15px;
  transition: background-color 0.3s ease;
}

.login-card button:hover {
  background-color: #5c2323;
}

/* Error */
.login-card p[style] {
  margin: 8px 0;
  font-size: 14px;
  color: red;
}

/* Link */
.register-link {
  margin-top: 20px;
  font-size: 14px;
}

.register-link a {
  color: #772f2f;
  font-weight: bold;
  text-decoration: none;
}

.register-link a:hover {
  text-decoration: underline;
}

/* Blobs animation */
.background-blobs {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  z-index: 0; /* behind everything */
}

.background-blobs span {
  position: absolute;
  display: block;
  width: 40px;
  height: 40px;
  background: #e5c4b2; /* soft reddish-beige */
  opacity: 0.3;
  border-radius: 50%;
  animation: float 20s infinite;
  bottom: -150px;
}

.background-blobs span:nth-child(1) {
  left: 10%;
  width: 60px;
  height: 60px;
  animation-delay: 0s;
}

.background-blobs span:nth-child(2) {
  left: 50%;
  width: 100px;
  height: 100px;
  animation-delay: 5s;
}

.background-blobs span:nth-child(3) {
  left: 80%;
  width: 50px;
  height: 50px;
  animation-delay: 2s;
}

@keyframes float {
  0% {
    transform: translateY(0) scale(1);
    opacity: 0.3;
  }
  50% {
    transform: translateY(-300px) scale(1.2);
    opacity: 0.5;
  }
  100% {
    transform: translateY(-600px) scale(1);
    opacity: 0;
  }
}

/* Make sure login card appears above blobs */
.login-container {
  position: relative;
  z-index: 1;
}

</style>