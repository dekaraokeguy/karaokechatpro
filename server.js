require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const compression = require("compression");
const { v4: uuidv4 } = require("uuid");
const cloudinary = require("cloudinary").v2;

const Filter = require("bad-words");
const profanityFilter = new Filter();

const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use(compression());
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json({
  limit:"50mb"
}));
app.use(express.urlencoded({
  extended:true,
  limit:"50mb"
}));
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});
const server = http.createServer(app);

const io = new Server(server, {
  transports: ["websocket", "polling"],

  maxHttpBufferSize:
    50 * 1024 * 1024,

  cors: {
    origin: "*"
  },

  pingTimeout: 60000,
  pingInterval: 25000
});
// Railway/Proxy compatibility
app.set("trust proxy", 1);
/* =========================
   CLOUDINARY
========================= */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});
const ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD ||
  "karaoke123";
/* =========================
   DIRECTORIES
========================= */
const uploadDir = path.join(__dirname, "public/uploads");
const stickerDir = path.join(__dirname, "public/stickers");

[uploadDir, stickerDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

app.use("/uploads", express.static(uploadDir));
app.use(
  "/stickers",
  express.static(stickerDir)
);
/* =========================
   MULTER
========================= */
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      cb(null, uuidv4() + path.extname(file.originalname));
    }
  }),
  limits: { fileSize: 150 * 1024 * 1024 }
});

/* =========================
   STATE
========================= */
let messages = [];
let typingUsers = new Map();
let viewers = {};
let nowSinging = null;

let rateLimitMap = {};
let muteList = {};
let spamTracker = {};
let warningCount = {};

let overlaySettings = {
  chatFontSize:18,
chatFontFamily:
"system-ui",
overlayFontFamily:
"Arial, sans-serif",
  fontColor:"#ffffff",
  bubbleRadius:20,
  opacity:0.75,

  spotlightEnabled:true,
  pinEnabled:true
};
let performanceAccess = {
  allowDownload: false,
  allowBrowse: false,
  allowRecording: false
};
let spotlight = "";
let pinnedMessage = "";
/* =========================
   🎂 BIRTHDAY MODE STATE
========================= */

let birthdayMode = {
  enabled: true,
  cinematic: true
};
let birthdayDuration = 15000;
/* =========================
   VOTING SYSTEM
========================= */

let votingState = {
  enabled: false,
  mode: "none",
  revealScores: false,
  currentRound: 1,
  locked: false,
  isGrandFinal: false
};
// Contestants are added ONLY by the admin.
let contestants = [];
let peopleVotes = {};

let judgeVotes = {};

let voteRegistry = {};

let leaderboard = [];

// 🏆 ROUND HISTORY
let roundWinners = [];

// 🏆 GRAND FINALISTS
let grandFinalists = [];
/* =========================
   CLEANUP LOOP
========================= */
setInterval(() => {
  const now = Date.now();

  for (const id in muteList) {
    if (muteList[id] < now) delete muteList[id];
  }

  for (const id in rateLimitMap) {
    if (now - rateLimitMap[id].last > 60000) {
      delete rateLimitMap[id];
    }
  }

  for (const id in spamTracker) {
    spamTracker[id].count = 0;
  }
}, 60000);
/* =========================
   VOTING HELPERS
========================= */

function isValidContestant(name){
  return contestants.includes(name);
}

function updateLeaderboard(){

  leaderboard = contestants.map(name => {

    const votes = peopleVotes[name] || [];

    const total =
      votes.reduce((a,b)=>a+b,0);

    return {
      name,
      total,
      votes: votes.length
    };
  });

  leaderboard.sort((a,b)=>b.total-a.total);

  io.emit("leaderboard update", leaderboard);
}
function debugLeaderboard(){

  console.log(
    "🏆 CURRENT LEADERBOARD"
  );

  console.table(
    leaderboard
  );

}
/* =========================
   ROUTES
========================= */
app.get("/", (req, res) =>
  res.sendFile(path.join(__dirname, "public/chat.html"))
);
app.get("/control", (req, res) => {
  res.sendFile(
    path.join(__dirname, "public/control.html")
  );
});

app.get("/performances", (req, res) => {
  res.sendFile(
    path.join(__dirname, "public/performances.html")
  );
});
app.get("/overlay", (req, res) => {
  res.sendFile(
    path.join(__dirname, "public/overlay.html")
  );
});
app.post("/admin-login", (req, res) => {

  const password =
    req.body.password;

  if(password === ADMIN_PASSWORD){

    return res.json({
      success: true
    });

  }

  res.status(401).json({
    success: false
  });

});
app.get("/stickers", (req, res) => {
  fs.readdir(stickerDir, (err, files) => {
    if (err) return res.json([]);
    res.json(files);
  });
});


/* =========================
   LIST PERFORMANCES (ADD HERE)
========================= */
app.get("/list-performances", async (req, res) => {
  try {
    const results = await cloudinary.search
      .expression("resource_type:video")
      .sort_by("created_at", "desc")
      .max_results(50)
      .execute();

    const files = results.resources.map(file => ({
  name: file.public_id,
  title: file.public_id,
  path: file.secure_url,
  thumbnail: file.secure_url.replace(".mp4",".jpg"),
  resource_type: file.resource_type,
  time: file.created_at
}));

    res.json(files);

  } catch (err) {
    console.error("❌ Cloudinary fetch error:", err);
    res.json([]);
  }
});
app.post("/upload", upload.single("image"), async (req, res) => {

  try {

    const result =
      await cloudinary.uploader.upload(
        req.file.path,
        {
          quality: "auto",
          fetch_format: "auto"
        }
      );

    fs.unlinkSync(req.file.path);

    res.json({
      imageUrl: result.secure_url
    });

  } catch {

    res.status(500).json({
      error: "Upload failed"
    });

  }

});
/* =========================
   VIDEO UPLOAD (OBS -> CLOUDINARY)
========================= */
app.post("/upload-video", upload.single("video"), async (req, res) => {
  try {
    const result = await cloudinary.uploader.upload(req.file.path, {
      resource_type: "video"
    });

    // delete local file after upload
    fs.unlinkSync(req.file.path);

    // 🔥 notify all clients instantly
    io.emit("new performance");

    res.json({
      videoUrl: result.secure_url
    });

  } catch (err) {
    console.error("❌ Video upload failed:", err);
    res.status(500).json({ error: "Video upload failed" });
  }
});
/* =========================
   SOCKET.IO
========================= */
io.on("connection", (socket) => {
socket.on("start grand final", () => {

  contestants = [...grandFinalists];

  peopleVotes = {};
  judgeVotes = {};
  voteRegistry = {};
  leaderboard = [];

  votingState.isGrandFinal = true;

  votingState.enabled = false;
  votingState.locked = false;
  votingState.revealScores = false;

  updateLeaderboard();

io.emit(
  "contestants update",
  contestants
);

  io.emit("round reset");

  io.emit(
    "voting state",
    votingState
  );

});
const clientIp =
  socket.handshake.headers["x-forwarded-for"] ||
  socket.handshake.address;
 // 🔥 ADD THIS BLOCK
  socket.on("request settings", () => {
    socket.emit("settings update", overlaySettings);
  });


  socket.emit("message history", messages.slice(-50));
  socket.emit("settings update", overlaySettings);
  socket.emit("performance access", performanceAccess);
socket.emit("spotlight update", spotlight);
socket.emit("pin update", pinnedMessage);
socket.emit("birthday mode update", birthdayMode);
socket.emit(
  "contestants update",
  contestants
);

socket.emit(
  "voting state",
  votingState
);

updateLeaderboard();
  /* =========================
     JOIN
  ========================= */
  socket.on("join", (name) => {
    if (!name) return;
    socket.username = name;
    typingUsers.delete(socket.id);
io.emit("typing users", Array.from(typingUsers.values()));
  });

  /* =========================
     TYPING
  ========================= */
  socket.on("typing", (name) => {
  if (!socket.username) return;

  typingUsers.set(socket.id, socket.username);

  io.emit("typing users", Array.from(typingUsers.values()));
});

  /* =========================
     SETTINGS (FIXED LOCATION)
  ========================= */
  socket.on("settings update", (s) => {
    overlaySettings = { ...overlaySettings, ...s };
    io.emit("settings update", overlaySettings);
  });

  socket.on("performance access update", (data) => {
    performanceAccess = { ...performanceAccess, ...data };
    io.emit("performance access", performanceAccess);
  });
socket.on("hearts", (count)=>{
  console.log("🔥 SERVER RECEIVED HEARTS:", count);
  io.emit("hearts", count || 20);
});
// ❤️ REACTION EMOJIS (FIX)
socket.on("reaction", (emoji) => {

  if(typeof emoji !== "string") return;

  console.log("🔥 SERVER REACTION:", emoji);

  // ✅ ONLY SEND THE SELECTED EMOJI
  io.emit("reaction", emoji);

}); 

// 🎂 SEND BIRTHDAY WISH
socket.on("birthday_wish", (data) => {
console.log(
  "🎂 SERVER PHOTO URL:",
  data?.photo_url?.length
);

  if (!data || !data.birthday_person) return;

  const payload = {
  id: uuidv4(),
  type: "birthday",

  from_nickname:
    data.from_nickname || "Guest",

  birthday_person:
    data.birthday_person,

  message:
    data.message || "",

  song_request:
    data.song_request || "",

  photo_url:
    data.photo_url || "",

  // 🔥 KEEP USER SETTINGS
  duration: birthdayDuration,

  bg:
    data.bg || "gradient",

  font:
    data.font || "sans-serif",

  time:
    Date.now()
};

  // save into chat history
  messages.push(payload);

const birthdayChatMessage = {
  id: uuidv4(),
  name: data.from_nickname || "Birthday Wish",
  message:
    "🎂 Birthday wish for " +
    data.birthday_person,
  image: data.photo_url || "",
  duration: birthdayDuration
};

messages.push(birthdayChatMessage);

if(messages.length > 150){
  messages.shift();
}

io.emit(
  "chat message",
  birthdayChatMessage
);

io.emit(
  "birthday_wish",
  payload
);

});

// 🎬 TOGGLE CINEMATIC MODE
socket.on("birthday mode update", (data) => {

  console.log(
    "🎂 SERVER RECEIVED BIRTHDAY UPDATE:",
    data
  );

  birthdayMode = {
    ...birthdayMode,
    ...data
  };

  console.log(
    "🎂 SERVER SENDING:",
    birthdayMode
  );

  io.emit(
    "birthday mode update",
    birthdayMode
  );

});
socket.on("birthday duration update",(ms)=>{

  birthdayDuration =
    Number(ms) || 15000;

  console.log(
    "🎂 BIRTHDAY DURATION UPDATED:",
    birthdayDuration
  );

});
socket.on("clear birthday",()=>{

  io.emit("clear birthday");

});
 /* =========================
     CONTROL PANEL EVENTS (MISSING FIX)
  ========================= */

  socket.on("clear chat", () => {
  messages = [];
  io.emit("clear chat");
});
console.log("🎤 CONTROL PANEL CONNECTED");

socket.on("spotlight singer", (name) => {

  console.log("🎤 SERVER RECEIVED SPOTLIGHT:", name);

  if (typeof name !== "string") return;

  spotlight = name.trim();

  io.emit("spotlight update", spotlight);

});socket.on("spotlight timed",(data)=>{

  if(!data || !data.name) return;

  spotlight = data.name;

  io.emit("spotlight timed",{
    name:data.name,
    time:Number(data.time) || 10
  });

});
socket.on("clear spotlight", () => {
  spotlight = "";
  io.emit("spotlight update", "");
});

socket.on("pin message", (msg) => {
  if (typeof msg !== "string") return;

  pinnedMessage = msg.trim();
  io.emit("pin update", pinnedMessage);
});

socket.on("clear pin", () => {
  pinnedMessage = "";
  io.emit("pin update", "");
});

socket.on("overlay layout", (layout) => {
  io.emit("overlay layout", layout);
});
/* =========================
   VOTING SYSTEM
========================= */

// START VOTING
socket.on("start voting",(data)=>{

  console.log(
    "🟢 START VOTING RECEIVED:",
    data
  );

  // 🔥 Always begin with a clean round
  peopleVotes = {};
  judgeVotes = {};
  voteRegistry = {};
  leaderboard = [];

  votingState.enabled = true;
  votingState.mode = data.mode || "people";

  votingState.locked = false;
  votingState.revealScores = false;

  updateLeaderboard();

  io.emit("round reset");

  io.emit(
    "leaderboard update",
    leaderboard
  );

  io.emit(
    "voting state",
    votingState
  );

});
// REVEAL SCORES
console.log(
  "🏆 REVEAL CLICKED"
);

console.log(
  "🏆 LEADERBOARD:",
  leaderboard
);
// REVEAL SCORES
socket.on("reveal scores",()=>{

  console.log(
    "🏆 REVEAL CLICKED"
  );

  updateLeaderboard();

  console.log(
    "🏆 LEADERBOARD AT REVEAL:",
    leaderboard
  );

  votingState.revealScores = true;
  votingState.locked = true;

  const winner =
    leaderboard.length > 0
      ? leaderboard[0]
      : null;
if (winner) {

  roundWinners.push({

    round: votingState.currentRound,

    name: winner.name,

    score: winner.total,

    votes: winner.votes

  });

  if (!grandFinalists.includes(winner.name)) {
    grandFinalists.push(winner.name);
  }

}
  io.emit(
    "scores revealed",
    {
      winner,
      leaderboard
    }
  );
io.emit(
  "round winners update",
  roundWinners
);

io.emit(
  "grand finalists update",
  grandFinalists
);
});
// RESET SCORES ONLY
socket.on("reset voting",()=>{

  votingState.currentRound++;

  peopleVotes = {};
  judgeVotes = {};
  voteRegistry = {};
  leaderboard = [];

  votingState.enabled = false;
  votingState.locked = false;
  votingState.revealScores = false;
votingState.isGrandFinal = false;
  updateLeaderboard();

  io.emit("round reset");

  io.emit(
    "leaderboard update",
    leaderboard
  );

  io.emit(
    "contestants update",
    contestants
  );

  io.emit(
    "voting state",
    votingState
  );
io.emit(
  "round winners update",
  roundWinners
);

io.emit(
  "grand finalists update",
  grandFinalists
);});
// START A COMPLETELY NEW ROUND
socket.on("new round",()=>{

  votingState.currentRound++;

  contestants = [];

  peopleVotes = {};
  judgeVotes = {};
  voteRegistry = {};
  leaderboard = [];

  votingState.enabled = false;
  votingState.locked = false;
  votingState.revealScores = false;
votingState.isGrandFinal = false;
  io.emit(
    "contestants update",
    contestants
  );

  io.emit(
    "leaderboard update",
    leaderboard
  );

  io.emit("round reset");

  io.emit(
    "voting state",
    votingState
  );

});
// ADD CONTESTANT
socket.on("add contestant",(name)=>{

       name = String(name || "").trim();

  if(!name) return;

  if(
    contestants.some(
      c => c.toLowerCase() === name.toLowerCase()
    )
  ){
    return;
  }

  contestants.push(name);

  updateLeaderboard();

  io.emit(
    "contestants update",
    contestants
  );

});
// SUBMIT PEOPLE VOTE
socket.on("submit people vote", (data) => {

  if (!votingState.enabled) return;

  if (votingState.mode !== "people") return;

  if (votingState.locked) return;

  if (!socket.username) return;

  const contestant =
    String(data.contestant || "").trim();

  const score =
    Number(data.score);

  if (!isValidContestant(contestant)) return;

  if (isNaN(score)) return;

  if (score < 1 || score > 20) return;

const voterKey =
  socket.id + "_" +
  votingState.currentRound;

voteRegistry[voterKey] =
  voteRegistry[voterKey] || [];

if(
  voteRegistry[voterKey]
    .includes(contestant)
){
  return;
}

voteRegistry[voterKey]
  .push(contestant);

if (!peopleVotes[contestant]) {
  peopleVotes[contestant] = [];
}

peopleVotes[contestant]
  .push(score);
console.log(
  "🗳️ VOTE ACCEPTED:",
  contestant,
  score
);

console.log(
  "🗳️ ALL VOTES:",
  peopleVotes[contestant]
);

console.log(
  "🗳️ TOTAL:",
  peopleVotes[contestant]
    .reduce((a,b)=>a+b,0)
);

updateLeaderboard();

debugLeaderboard();
});
  /* =========================
     CHAT MESSAGE (CLEAN)
  ========================= */
  socket.on("chat message", (data) => {

    if (!data || typeof data !== "object") return;

    let msg = typeof data.message === "string" ? data.message : "";

    if (!msg.trim() && !data.image && !data.audio) return;

    try {
      msg = profanityFilter.clean(msg);
    } catch {}

    const now = Date.now();
    const id = socket.id;

    // RATE LIMIT
    rateLimitMap[id] = rateLimitMap[id] || { last: 0 };
    if (now - rateLimitMap[id].last < 800) return;
    rateLimitMap[id].last = now;

    // MUTE CHECK
    if (muteList[id] && muteList[id] > now) return;

    // SAFE BYTE CHECK (FIXED)
    if (Buffer.byteLength(msg, "utf8") > 5000) return;

    const finalMsg = {
  ...data,
  id: uuidv4(),   // 🔥 ADD THIS LINE
  message: msg
};

    messages.push(finalMsg);
    if (messages.length > 150) messages.shift();

    io.emit("chat message", finalMsg);
  });

  /* =========================
     VIEWERS
  ========================= */
  socket.on("watch video", (videoId) => {
    if (socket.currentVideo === videoId) return;

    if (socket.currentVideo && viewers[socket.currentVideo]) {
      viewers[socket.currentVideo]--;
    }

    socket.currentVideo = videoId;

    if (!viewers[videoId]) viewers[videoId] = 0;
    viewers[videoId]++;

    io.emit("viewer count", {
      videoId,
      count: viewers[videoId]
    });
  });
socket.on("disconnect", () => {
  typingUsers.delete(socket.id);
  io.emit("typing users", Array.from(typingUsers.values()));
});
  /* =========================
     DISCONNECT
  ========================= */
  socket.on("stop typing", () => {
  typingUsers.delete(socket.id);
  io.emit("typing users", Array.from(typingUsers.values()));
});

});

/* =========================
   START SERVER
========================= */
const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port " + PORT);
});