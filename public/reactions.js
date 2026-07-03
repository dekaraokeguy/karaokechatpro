"use strict";

console.log("✅ reactions loaded");
window.sendReaction = function(emoji){
  const picker = window.reactionPanel;

  if(picker){
    picker.style.display = "none";
  }

  socket.emit("reaction", emoji);
}
// =========================
// ❤️ REACTION PICKER SYSTEM
// =========================


// 🔥 REACTION EMOJIS (EDIT THESE ONLY IF YOU WANT)
const reactionEmojis = ["❤️","🔥","😂","👏","😍","💯","🥳","👍"];

// BUILD PANEL
if(!window.reactionPanel){
  console.warn("window.reactionPanel missing");
} else {

window.reactionPanel.innerHTML = "";

reactionEmojis.forEach(e=>{
  const span = document.createElement("span");

  span.textContent = e;
  span.style.fontSize = "22px";
  span.style.cursor = "pointer";
  span.style.padding = "6px";

  span.onclick = () => {

    socket.emit("reaction", e);

    window.reactionPanel.style.display = "none";
  };

  window.reactionPanel.appendChild(span);
});

}
// TOGGLE PANEL
window.toggleReactions = function(){

  const btn = document.querySelector(".btn-hearts");

  if(window.reactionPanel.style.display === "flex"){
    window.reactionPanel.style.display = "none";
    return;
  }

  // close others
  window.emojiPanel.style.display = "none";
window.stickerPanel.style.display = "none";

  window.reactionPanel.style.display = "flex";
}
// =========================
// 🗳️ CONTESTANTS UPDATE
// =========================

socket.on("reaction", (emoji) => {

  const btn = document.querySelector(".btn-hearts");
  if (!btn) return;

  const rect = btn.getBoundingClientRect();
// 🔥 DYNAMIC COUNT (LIKE TIKTOK)
  const count = 4;

  for (let i = 0; i < count; i++) {

    setTimeout(() => {

      const el = document.createElement("div");
      el.textContent = emoji;

      // 🎯 START POSITION (SHIFTED LEFT ✅)
      const startX = rect.left + rect.width / 2 - 50;
      const startY = rect.top - 20;

      // 🎲 RANDOM CURVE
      const driftX = (Math.random() - 0.5) * 160;
      const driftMid = (Math.random() - 0.5) * 100;
      const rise = 400 + Math.random() * 200;

      const scaleStart = 0.5 + Math.random() * 0.3;
      const scaleMid = 1.0 + Math.random() * 0.4;

      el.style.position = "fixed";
      el.style.left = startX + "px";
      el.style.top = startY + "px";
      el.style.fontSize = (22 + Math.random() * 12) + "px";
      el.style.zIndex = "999999";
      el.style.pointerEvents = "none";
      el.style.opacity = "0";

      document.body.appendChild(el);

      requestAnimationFrame(() => {

        el.animate([
          // 🌱 SPAWN (slightly left, below, invisible)
          {
            transform: `translate(-20px, 20px) scale(${scaleStart})`,
            opacity: 0
          },

          // 🌿 FLOAT MID (curve)
          {
            transform: `translate(${driftMid}px, -${rise/2}px) scale(${scaleMid})`,
            opacity: 1
          },

          // 🍃 EXIT (fade out upward)
          {
            transform: `translate(${driftX}px, -${rise}px) scale(0.8)`,
            opacity: 0
          }

        ], {
          duration: 2600 + Math.random() * 600, // ✅ FIXED
          easing: "cubic-bezier(0.22, 1, 0.36, 1)", // 🎯 PUT IT HERE
          fill: "forwards"
        });

      });

      setTimeout(() => el.remove(), 3200);

    }, i * (60 + Math.random() * 40)); // 🎯 STAGGER (random timing)
  }
});
function createHeart(){
  return; // 🚫 DISABLED
}
