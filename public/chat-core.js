"use strict";

// =========================
// 🌍 GLOBAL CHAT STATE
// =========================
window.userName = "";
window.uploadedImageUrl = null;
// =========================
// 🔌 SOCKET
// =========================

window.socket = io({
  transports: ["polling", "websocket"], // 🔥 polling FIRST
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000
});// =========================
// 📦 DOM
// =========================

window.messages = document.getElementById("messages");
window.preview = document.getElementById("preview");
window.text = document.getElementById("text");
window.reactionPanel = document.getElementById("reactionPanel");
window.emojiPanel = document.getElementById("emojiPanel");
window.stickerPanel = document.getElementById("stickerPanel");

window.votePopup = document.getElementById("votePopup");
window.leaderboardPopup = document.getElementById("leaderboardPopup");

window.openVoteBtn =
  document.getElementById("dropdownVoteBtn");

window.openLeaderboardBtn =
  document.getElementById("dropdownLeaderboardBtn");

window.closeVotePopupBtn =
  document.getElementById("closeVotePopupBtn");

window.closeLeaderboardBtn =
  document.getElementById("closeLeaderboardBtn");

window.contestantList =
  document.getElementById("contestantList");

window.leaderboardList =
  document.getElementById("leaderboardList");


// =========================
// 🌍 GLOBAL CLICK HANDLER
// =========================

document.addEventListener("DOMContentLoaded", () => {

  // =========================
// 🔥 MENU ELEMENTS
// =========================
const moreFeaturesBtn =
  document.getElementById("moreFeaturesBtn");

const menuDropdown =
  document.getElementById("menuDropdown");

// =========================
// 🔥 MENU TOGGLE
// =========================
if(moreFeaturesBtn && menuDropdown){

  moreFeaturesBtn.onclick = (e)=>{

    e.stopPropagation();

    if(menuDropdown.style.display === "block"){

      menuDropdown.style.display = "none";

    }else{

      menuDropdown.style.display = "block";

    }

  };

}

  // =========================
  // 🔥 CLICK OUTSIDE TO CLOSE
  // =========================
  document.addEventListener("click", (e) => {

  // 🔽 CLOSE MENU
  if(
  menuDropdown &&
  moreFeaturesBtn &&
  menuDropdown.style.display === "block" &&
  !menuDropdown.contains(e.target) &&
  !moreFeaturesBtn.contains(e.target)
){
  menuDropdown.style.display = "none";
}

  // ❤️ CLOSE REACTION PANEL
  if(
    window.reactionPanel &&
    window.reactionPanel.style.display === "flex" &&
    !window.reactionPanel.contains(e.target) &&
    !e.target.closest(".btn-hearts")
  ){
    window.reactionPanel.style.display = "none";
  }

});


}); // ⬅️ THIS MUST BE LAST
/* =========================
   🎨 BACKGROUND THEMES
========================= */

function setTheme(theme){

  localStorage.setItem(
    "karaokeTheme",
    theme
  );

  applyTheme(theme);
}

function applyTheme(theme){

  const root =
    document.documentElement;

  root.classList.remove(
    "theme-neon",
    "theme-business",
    "theme-modern"
  );

  if(theme === "business"){
    root.classList.add(
      "theme-business"
    );
  }
  else if(theme === "modern"){
    root.classList.add(
      "theme-modern"
    );
  }
  else{
    root.classList.add(
      "theme-neon"
    );
  }
}

document.addEventListener(
  "DOMContentLoaded",
  ()=>{

    const btn =
      document.getElementById(
        "themeBtnDropdown"
      );

    const panel =
      document.getElementById(
        "themePanel"
      );

    if(btn && panel){

      btn.onclick = ()=>{

        panel.style.display =
          panel.style.display === "block"
            ? "none"
            : "block";
      };
    }

    applyTheme(
      localStorage.getItem(
        "karaokeTheme"
      ) || "neon"
    );

  }
);
console.log("✅ chat-core loaded");
window.toggleEmoji = toggleEmoji;
window.toggleStickers = toggleStickers;
console.log(
  "🧩 STICKER PANEL:",
  window.stickerPanel
);
async function loadStickers(){

  if(!window.stickerPanel) return;

  try{

    const res = await fetch("/stickers");

    const stickers = await res.json();

    window.stickerPanel.innerHTML = "";

    stickers.forEach(file => {

      const img = document.createElement("img");

      img.src =
        window.location.origin +
        "/stickers/" + file;

      img.style.width = "70px";
      img.style.height = "70px";
      img.style.objectFit = "contain";
      img.style.cursor = "pointer";
      img.style.margin = "4px";

      img.onclick = ()=>{

        const stickerPath =
          "/stickers/" + file;

        if(typeof sendSticker === "function"){

          sendSticker(stickerPath);

        }else{

          socket.emit(
            "chat message",
            {
              name: window.userName,
              image: stickerPath,
              message: ""
            }
          );

        }

        window.stickerPanel.style.display =
          "none";
      };

      window.stickerPanel.appendChild(img);

    });

    console.log(
      "✅ Stickers Loaded:",
      stickers.length
    );

  }catch(err){

    console.error(
      "❌ Sticker Load Error:",
      err
    );

  }

}

loadStickers();
/* =========================
   🚪 LOGOUT BUTTON
========================= */

const logoutBtn =
  document.getElementById("logoutBtn");

if(logoutBtn){

  logoutBtn.addEventListener("click", () => {

    // 🔌 disconnect socket
    if(window.socket){
      window.socket.disconnect();
    }

    // 🧹 clear username
    localStorage.removeItem("karaokeUsername");

    // 🔥 hide chat
    const chatContainer =
      document.getElementById("chatContainer");

    if(chatContainer){
      chatContainer.style.display = "none";
    }

    // 🔥 show login
    const login =
      document.getElementById("login");

    if(login){
      login.style.display = "flex";
    }

    // 🔥 clear text
    if(window.text){
      window.text.value = "";
    }

    // 🔥 optional reload
    location.reload();

  });

}
// =========================
// 🌍 EXPORT GLOBAL FUNCTIONS
// =========================

function toggleEmoji(){

  if(window.emojiPanel.style.display === "flex"){

    window.emojiPanel.style.display = "none";

  }else{

    window.emojiPanel.style.display = "flex";

    if(window.stickerPanel){
      window.stickerPanel.style.display = "none";
    }

  }

}

function toggleStickers(){

  if(!window.stickerPanel) return;

  if(window.stickerPanel.style.display === "flex"){

    window.stickerPanel.style.display = "none";

  }else{

    window.stickerPanel.style.display = "flex";

    if(window.emojiPanel){
      window.emojiPanel.style.display = "none";
    }

  }

}

window.toggleEmoji = toggleEmoji;
window.toggleStickers = toggleStickers;

console.log(
  "🧩 STICKER PANEL:",
  window.stickerPanel
);

console.log("✅ chat-core loaded");

// =========================
// 🎂 BIRTHDAY RECEIVE (ADD HERE ONLY)
// =========================
window.socket.on("birthday_wish", (data) => {

  const msg = document.createElement("div");
  msg.className = "message";

  msg.innerHTML = `
    <div style="font-weight:bold;color:#ff66ff;">
      🎂 ${data.birthday_person}
    </div>

    <div>${data.message}</div>

    ${data.song_request ? `<div>🎵 ${data.song_request}</div>` : ""}

    ${data.photo_url ? `<img src="${data.photo_url}" style="max-width:100%;border-radius:10px;">` : ""}
    
    <div style="font-size:12px;opacity:0.7;margin-top:5px;">
      from ${data.from_nickname}
    </div>
  `;

  if (window.messages) {
    window.messages.appendChild(msg);
    window.messages.scrollTop = window.messages.scrollHeight;
  }

});