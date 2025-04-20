<template>
    <div class="ghibli-pastel-layout">
      <!-- Floating decorative shapes -->
      <div class="floating-circle" v-for="n in 4" :key="'circle-'+n"></div>
      <div class="floating-triangle" v-for="n in 4" :key="'triangle-'+n"></div>
      
      <div class="content-container">
        <div class="header-section">
          <h1 class="main-title">
            <span class="title-text">Welcome to <span class="arabic-flow"> كَاسْ داتايْ
            </span></span>
            <span class="title-decoration"></span>
          </h1>
          <p class="subtitle">Fast, secure, and made for real talk.</p>
        </div>
        
        <div class="welcome-actions">
          <router-link to="/login">
            <button class="ghibli-btn primary">
              <i class="fas fa-lock btn-icon"></i>
              <span class="btn-text">Login</span>
            </button>
          </router-link>
          
          <router-link to="/register">
            <button class="ghibli-btn secondary">
              <i class="fas fa-user-plus btn-icon"></i>
              <span class="btn-text">Sign Up</span>
            </button>
          </router-link>
          
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  </script>
  
  <style scoped>
    @import url('https://fonts.googleapis.com/css2?family=Lateef&display=swap');
  .ghibli-pastel-layout {
    min-height: 100vh;
    background: linear-gradient(135deg, #f8f5ff 0%, #f0f9ff 100%); /* Original light purple gradient */
    padding: 2rem;
    position: relative;
    overflow: hidden;
    font-family: 'Nunito Sans', 'Helvetica Neue', sans-serif;
  }
  
  .content-container {
    max-width: 500px;
    margin: 0 auto;
    position: relative;
    z-index: 2;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  
  .header-section {
    text-align: center;
    margin: 2rem 0 3rem;
  }
  
  .main-title {
    font-size: 2.5rem;
    color: #5a4a42;
    margin-bottom: 0.5rem;
    position: relative;
    display: inline-block;
  }
  
  .title-text {
    position: relative;
    z-index: 2;
  }
  .arabic-flow{
    font-family: 'Lateef', serif;
  }
  .title-decoration {
    position: absolute;
    bottom: 5px;
    left: 0;
    width: 100%;
    height: 12px;
    background: linear-gradient(90deg, 
      rgba(161, 93, 29, 0.4) 0%, 
      rgba(249,213,110,0.4) 50%, 
      rgba(233, 218, 182, 0.4) 100%);
    z-index: 1;
    border-radius: 6px;
  }
  
  .subtitle {
    font-size: 1.2rem;
    color: #8b9bab;
    font-weight: 300;
  }
  
  .welcome-actions {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    width: 100%;
    max-width: 300px;
  }
  .welcome-actions >>> a {
  text-decoration: none;
}
  
  .ghibli-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
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
}
.ghibli-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(255,255,255,0.1);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.ghibli-btn:hover::before {
  opacity: 1;
}

/* Updated Button Colors */
.ghibli-btn.primary {
  background: linear-gradient(to right, #8b3a3a,#a04a4a);  
  color: white;
  box-shadow: 0 4px 12px rgba(139, 108, 179, 0.3);
}
.ghibli-btn.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(139, 108, 179, 0.4);
}

.ghibli-btn.secondary {
  background-color: rgba(233, 228, 167, 0.9); /* Soft blue */
  color: #5a4a42; /* Dark brown text */
  box-shadow: 0 4px 12px rgba(167, 210, 233, 0.3);
}

.ghibli-btn.secondary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(167, 210, 233, 0.4);
}

.ghibli-btn.guest {
  background-color: rgba(255, 255, 255, 0.9); /* White */
  color: #5a4a42; /* Dark brown text */
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
.ghibli-btn.guest:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
}

.btn-icon {
  font-size: 1.2rem;
}
  
  .floating-circle {
    position: absolute;
    border-radius: 50%;
    background: rgba(226, 206, 175, 0.6); /* Pastel purple */
    animation: floatCircle 10s linear infinite;
    z-index: 1;
  }
  
  .floating-circle:nth-child(1) {
    width: 120px;
    height: 120px;
    top: 10%;
    left: 5%;
    animation-delay: 0s;
  }
  
  .floating-circle:nth-child(2) {
    width: 80px;
    height: 80px;
    top: 60%;
    left: 80%;
    animation-delay: 3s;
  }
  
  .floating-circle:nth-child(3) {
    width: 100px;
    height: 100px;
    top: 40%;
    left: 20%;
    animation-delay: 6s;
  }
  
  .floating-circle:nth-child(4) {
    width: 90px;
    height: 90px;
    top: 20%;
    left: 70%;
    animation-delay: 9s;
  }
  
  .floating-triangle {
    position: absolute;
    width: 0;
    height: 0;
    border-left: 40px solid transparent;
    border-right: 40px solid transparent;
    border-bottom: 70px solid rgba(255, 210, 147, 0.6); /* Pastel yellow */
    animation: floatTriangle 12s linear infinite;
    z-index: 1;
  }
  
  .floating-triangle:nth-child(1) {
    top: 15%;
    left: 20%;
    animation-delay: 2s;
  }
  
  .floating-triangle:nth-child(2) {
    top: 55%;
    left: 50%;
    animation-delay: 5s;
  }
  
  .floating-triangle:nth-child(3) {
    top: 80%;
    left: 10%;
    animation-delay: 8s;
  }
  
  .floating-triangle:nth-child(4) {
    top: 30%;
    left: 75%;
    animation-delay: 11s;
  }
  
  @keyframes floatCircle {
    0% {
      transform: translateY(0) translateX(0);
      opacity: 0.1;
    }
    50% {
      transform: translateY(-100px) translateX(20px);
      opacity: 0.3;
    }
    100% {
      transform: translateY(-200px) translateX(0);
      opacity: 0;
    }
  }
  
  @keyframes floatTriangle {
    0% {
      transform: translateY(0) translateX(0);
      opacity: 0.1;
    }
    50% {
      transform: translateY(-150px) translateX(30px);
      opacity: 0.3;
    }
    100% {
      transform: translateY(-300px) translateX(0);
      opacity: 0;
    }
  }
  
  @media (max-width: 768px) {
    .main-title {
      font-size: 2rem;
    }
    
    .subtitle {
      font-size: 1.1rem;
    }
    
    .ghibli-btn {
      padding: 14px 20px;
      font-size: 1rem;
    }
  }
  .arabic-flow {
  writing-mode: horizontal-tb;  /* Par défaut, mais avec RTL */
  text-transform: none;         /* Garder la casse originale */
  font-weight: 500;
  text-shadow: 0 2px 3px rgba(0, 0, 0, 0.1); /* Légère ombre pour le relief */
  font-family: 'Amiri', serif;
}
  </style>