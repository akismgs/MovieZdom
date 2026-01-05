// public/js/main.js

document.addEventListener('DOMContentLoaded', () => {
  const registerForm = document.querySelector('#registerForm');

  if (registerForm) {
    registerForm.addEventListener('submit', function(e) {
      const password = document.getElementById('password').value;
      const repeatPassword = document.getElementById('repeatPassword').value;
      const username = document.getElementById('username').value;

      // 1. Έλεγχος αν οι κωδικοί ταιριάζουν
      if (password !== repeatPassword) {
        e.preventDefault(); // Σταματάει την αποστολή της φόρμας
        alert('Οι κωδικοί δεν ταιριάζουν!');
        return;
      }

      // 2. Έλεγχος μήκους κωδικού
      if (password.length < 6) {
        e.preventDefault();
        alert('Ο κωδικός πρέπει να είναι τουλάχιστον 6 χαρακτήρες!');
        return;
      }

      // 3. Έλεγχος για κενά στο username
      if (username.trim().length < 3) {
        e.preventDefault();
        alert('Το username πρέπει να είναι τουλάχιστον 3 χαρακτήρες!');
        return;
      }
      
      console.log('Το validation πέτυχε! Στέλνουμε τα δεδομένα στον server...');
    });
  }
});