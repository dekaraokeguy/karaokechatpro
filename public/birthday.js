"use strict";

// =========================
// 🎂 BIRTHDAY MODE SYSTEM
// =========================

let birthdayFileUrl = null;

// OPEN MODAL
function openBirthdayMode(){
  document.getElementById("birthdayModal").classList.add("show");
}

// CLOSE MODAL
function closeBirthdayMode(){
  document.getElementById("birthdayModal").classList.remove("show");
}

// UPLOAD IMAGE (optional)
document.addEventListener("DOMContentLoaded", () => {
  const photoInput = document.getElementById("bdayPhoto");

  if(photoInput){
    photoInput.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if(!file) return;

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/upload", {
        method:"POST",
        body:formData
      });

      const data = await res.json();
      birthdayFileUrl = data.url;
    });
  }
});

// SEND WISH
function sendBirthdayWish(){

  const from = window.userName;
  const birthday_person = document.getElementById("bdayPerson").value;
  const message = document.getElementById("bdayMessage").value;
  const song = document.getElementById("bdaySong").value;

  if(!birthday_person || !message) return;

  window.socket.emit("birthday_wish", {
    from_nickname: from,
    birthday_person,
    message,
    song_request: song,
    photo_url: birthdayFileUrl || ""
  });

  closeBirthdayMode();

  document.getElementById("bdayPerson").value = "";
  document.getElementById("bdayMessage").value = "";
  document.getElementById("bdaySong").value = "";
  birthdayFileUrl = null;
}

// MAKE GLOBAL
window.openBirthdayMode = openBirthdayMode;
window.closeBirthdayMode = closeBirthdayMode;
window.sendBirthdayWish = sendBirthdayWish;