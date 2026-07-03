"use strict";

const socket = window.socket;

console.log("✅ voting loaded");
console.log("🔥 SOCKET EXISTS:", typeof socket);

// =========================
// 🌍 GLOBALS
// =========================

window.contestants = [];
window.leaderboard = [];
window.votedFor = null;
window.votingOpen = false;
window.leaderboardVisible = false;

window.votedContestants =
JSON.parse(
  localStorage.getItem(
    "votedContestants"
  ) || "[]"
);
// =========================
// 🎤 RENDER CONTESTANTS
// =========================

window.renderContestants = function () {

  const contestantList =
    document.getElementById("contestantList");

  if (!contestantList) {
    console.error("❌ contestantList not found");
    return;
  }

  contestantList.innerHTML = "";

  if (!window.contestants.length) {

    contestantList.innerHTML =
      "<div style='padding:20px;text-align:center;'>No contestants yet</div>";

    return;
  }
window.voteSelections =
window.voteSelections || {};
  window.contestants.forEach(name => {

    const row =
      document.createElement("div");

    row.className =
      "leaderboardRow";

    // Singer name
    row.innerHTML = `
      <div style="
        font-weight:bold;
        color:white;
        flex:1;
      ">
        🎤 ${name}
      </div>
    `;

    // Vote dropdown
    const select =
  document.createElement("select");

select.id = "vote_" + name;

select.onchange = () => {

  window.voteSelections[name] =
    Number(select.value);

};

select.style.padding = "8px";
select.style.borderRadius = "10px";
select.style.marginRight = "10px";

select.style.background = "#101820";
select.style.color = "#00ffcc";
select.style.fontWeight = "bold";
select.style.border = "1px solid #00ffcc";

const placeholder =
  document.createElement("option");

placeholder.value = "";

placeholder.textContent =
  "Select Score";

placeholder.selected = true;

select.appendChild(
  placeholder
);

for(let i = 1; i <= 20; i++){

  const option =
    document.createElement("option");

  option.value = i;
  option.textContent = i;

  select.appendChild(option);

}

    row.appendChild(select);

    // Vote button
    const voteBtn =
      document.createElement("button");

    voteBtn.className = "voteBtn";
    voteBtn.textContent = "Vote";

    voteBtn.onclick = () => {

  if(!window.votingOpen){
    alert("Voting is currently closed.");
    return;
  }

  if(window.votedContestants.includes(name)){
  alert("You already voted for " + name);
  return;
}

const success =
  submitVote(name);

if(!success){
  return;
}

window.votedContestants.push(name);

localStorage.setItem(
  "votedContestants",
  JSON.stringify(window.votedContestants)
);

voteBtn.disabled = true;
select.disabled = true;

voteBtn.style.opacity = "0.5";
voteBtn.style.cursor = "not-allowed";

select.style.opacity = "0.5";
select.style.background = "#555";
select.style.color = "#bbb";
select.style.border = "1px solid #777";
};

    row.appendChild(voteBtn);
if(window.votedContestants.includes(name)){

  voteBtn.disabled = true;
  select.disabled = true;

  voteBtn.style.opacity = "0.5";
  voteBtn.style.cursor = "not-allowed";

  select.style.opacity = "0.5";
  select.style.background = "#555";
  select.style.color = "#bbb";
  select.style.border = "1px solid #777";
}
    contestantList.appendChild(row);
  });

};

// =========================
// 🏆 CONTESTANTS UPDATE
// =========================

socket.on(
  "contestants update",
  (list) => {
console.count("CONTESTANTS UPDATE RECEIVED");
    window.contestants = list || [];

    console.log(
      "🏆 Contestants Updated:",
      window.contestants
    );

    window.renderContestants();
  }
);

// =========================
// 🗳️ VOTING STATE
// =========================

socket.on(
  "voting state",
  (state) => {
console.log(
  "🗳️ VOTING STATE RECEIVED:",
  state
);
console.count("VOTING STATE RECEIVED");
    window.votingOpen =
      state.enabled;
window.lastVotingState =
  state.enabled;
    console.log(
      "🗳️ Voting State:",
      state
    );

    console.log(
      "🗳️ votingOpen =",
      window.votingOpen
    );

    const allSelects =
      document.querySelectorAll(
        "#contestantList select"
      );

    const allButtons =
      document.querySelectorAll(
        "#contestantList .voteBtn"
      );

    allSelects.forEach(select => {

  const singer =
    select.id.replace("vote_","");

  if(
    window.votedContestants.includes(singer)
  ){

    select.disabled = true;

    select.style.opacity = "0.5";
    select.style.background = "#555";
    select.style.color = "#bbb";
    select.style.border = "1px solid #777";

    return;

  }

  select.disabled = !window.votingOpen;

  if(window.votingOpen){

    select.style.opacity = "1";
    select.style.background = "#101820";
    select.style.color = "#00ffcc";
    select.style.border = "1px solid #00ffcc";

  }else{

    select.style.opacity = "0.5";
    select.style.background = "#555";
    select.style.color = "#bbb";
    select.style.border = "1px solid #777";

  }

});

    allButtons.forEach(btn => {

  const row =
    btn.closest(".leaderboardRow");

  if(!row) return;

  const singer =
    row.querySelector("div")
      ?.textContent
      ?.replace("🎤","")
      ?.trim();

  if(
    singer &&
    window.votedContestants.includes(singer)
  ){

    btn.disabled = true;

    btn.style.opacity = "0.5";
    btn.style.cursor = "not-allowed";

    return;

  }

  btn.disabled = !window.votingOpen;

  btn.style.opacity =
    window.votingOpen ? "1" : "0.5";

  btn.style.cursor =
    window.votingOpen ? "pointer" : "not-allowed";

});
allSelects.forEach(select => {

  if(!window.votingOpen){

    select.style.opacity = "0.5";
    select.style.background = "#555";
    select.style.color = "#bbb";

  } else {

    select.style.opacity = "1";
    select.style.background = "";
    select.style.color = "";

  }

});

allButtons.forEach(btn => {

  if(!window.votingOpen){

    btn.style.opacity = "0.5";
    btn.style.cursor = "not-allowed";

  } else {

    btn.style.opacity = "1";
    btn.style.cursor = "pointer";

  }

});
    // =========================
    // 🟢 VOTING OPEN
    // =========================

    if(state.enabled){

      const notice =
        document.createElement("div");

      notice.innerHTML =
        "🗳️ People's Choice Voting is NOW OPEN!";

      notice.style.position =
        "fixed";

      notice.style.top =
        "100px";

      notice.style.left =
        "50%";

      notice.style.transform =
        "translateX(-50%)";

      notice.style.background =
        "#00ffcc";

      notice.style.color =
        "#000";

      notice.style.padding =
        "15px 25px";

      notice.style.borderRadius =
        "15px";

      notice.style.fontWeight =
        "bold";

      notice.style.zIndex =
        "999999";

      notice.style.boxShadow =
        "0 0 20px rgba(0,255,200,.6)";

      document.body.appendChild(
        notice
      );

      setTimeout(()=>{

        notice.remove();

      },4000);

    }

    // =========================
    // 🔴 VOTING CLOSED
    // =========================

    if(!state.enabled){

      const notice =
        document.createElement("div");

      notice.innerHTML =
        "🔒 People's Choice Voting is now CLOSED!";

      notice.style.position =
        "fixed";

      notice.style.top =
        "100px";

      notice.style.left =
        "50%";

      notice.style.transform =
        "translateX(-50%)";

      notice.style.background =
        "#ff4444";

      notice.style.color =
        "#ffffff";

      notice.style.padding =
        "15px 25px";

      notice.style.borderRadius =
        "15px";

      notice.style.fontWeight =
        "bold";

      notice.style.zIndex =
        "999999";

      notice.style.boxShadow =
        "0 0 20px rgba(255,0,0,.6)";

      document.body.appendChild(
        notice
      );

      setTimeout(()=>{

        notice.remove();

      },4000);

    }

  }
);
// =========================
// 🗳️ SUBMIT VOTE
// =========================

window.submitVote = function (name) {

  const select =
    document.getElementById(
      "vote_" + name
    );

  if (!select) {
    return false;
  }

  if (!select.value) {

    alert(
      "Please select a score first."
    );

    return false;
  }

  const score =
    Number(select.value);

  socket.emit(
    "submit people vote",
    {
      contestant:name,
      score:score
    }
  );

 alert(
  `✅ Vote submitted for ${name} (${score} points)`
);

return true;

};
  
// =========================
// 🏆 LEADERBOARD UPDATE
// =========================

socket.on(
  "leaderboard update",
  (data) => {
console.count("LEADERBOARD UPDATE RECEIVED");
    window.leaderboard =
      data || [];

    window.leaderboard.sort(
      (a,b)=>b.total-a.total
    );

    console.log(
      "🏆 Leaderboard Updated:",
      window.leaderboard
    );

    window.renderLeaderboard();
  }
);

// =========================
// 🏆 WINNER REVEAL
// =========================

socket.on(
  "scores revealed",
  (data)=>{

    console.log(
      "🏆 SCORES REVEALED:",
      data
    );

    if(!data) return;

    if(!data.winner) return;

    const winnerPopup =
      document.getElementById(
        "winnerPopup"
      );

    const winnerTitle =
      document.getElementById(
        "winnerTitle"
      );

    const winnerScore =
      document.getElementById(
        "winnerScore"
      );

    if(!winnerPopup) return;
console.log(
  "🏆 winnerPopup found:",
  winnerPopup
);
console.log(
  winnerTitle,
  winnerScore
);
    winnerTitle.innerHTML =
      "🥇 " +
      data.winner.name;

    winnerScore.innerHTML =
      "⭐ " +
      data.winner.total +
      " points";

    winnerPopup.classList.add("show");
winnerPopup.style.display = "flex";
winnerPopup.style.visibility =
  "visible";

winnerPopup.style.pointerEvents =
  "auto";
  }
);

// =========================
// 🏆 RENDER LEADERBOARD
// =========================

window.renderLeaderboard =
function () {
  const leaderboardList =
    document.getElementById(
      "leaderboardList"
    );

  if(!leaderboardList)
    return;

  leaderboardList.innerHTML =
    "";

  if (
    !window.leaderboard ||
    !window.leaderboard.length
  ) {

    leaderboardList.innerHTML =
      "<div style='padding:20px;text-align:center;'>No scores yet</div>";

    return;
  }

  window.leaderboard.forEach(
  (row, index) => {

    let medal = "";

    if(index === 0){
      medal = "🥇";
    }
    else if(index === 1){
      medal = "🥈";
    }
    else if(index === 2){
      medal = "🥉";
    }

    const div =
      document.createElement("div");

    div.className =
      "leaderboardRow";

    div.innerHTML = `
      <div style="
        font-weight:bold;
        flex:1;
        color:white;
        font-size:18px;
      ">
        ${medal}
        #${index + 1}
        🎤 ${row.name}
      </div>

      <div style="
        color:#ffd700;
        font-weight:bold;
        font-size:20px;
        text-shadow:
          0 0 10px rgba(255,215,0,.8);
      ">
        ⭐ ${row.total}
      </div>
    `;

    leaderboardList.appendChild(div);

  }
);

};
// =========================
// ♻ ROUND RESET
// =========================

socket.on("round reset", ()=>{

  console.log(
    "♻ ROUND RESET RECEIVED"
  );

  window.votedContestants = [];

  window.voteSelections = {};

  localStorage.removeItem(
    "votedContestants"
  );

  Object.keys(localStorage)
    .forEach(key=>{

      if(
        key.startsWith("score_")
      ){
        localStorage.removeItem(key);
      }

    });

  renderContestants();

});