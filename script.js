
// =================================
// SASHA.FM DOWNLOAD SYSTEM
// =================================

// Cloudflare Worker URL
const WORKER_URL = "https://sasha-download-api.sashabuskin12.workers.dev/api/download";

// Elements
const passwordInput = document.getElementById("password");
const downloadButton = document.getElementById("download-button");
const statusMessage = document.getElementById("status");
//const logo = document.querySelector(".logo");
const radioPlayer = document.querySelector(".radio-player");
// State
let downloadUrl = null;
let typingTimer;
let requestNumber = 0;

// Hide download button initially
downloadButton.classList.remove("visible");
radioPlayer.classList.remove("visible");
//logo.classList.remove("visible");
radioPlayer.classList.remove("visible");
// =================================
// AUTOMATIC PASSWORD VERIFICATION
// =================================

passwordInput.addEventListener("input", () => {

    clearTimeout(typingTimer);

    // Invalidate previous requests immediately
    requestNumber++;

    // Hide button until password is verified again
    downloadButton.classList.remove("visible");
radioPlayer.classList.remove("visible");
    // Clear previous download link
    downloadUrl = null;

    // Clear status
    statusMessage.textContent = "";

    const password = passwordInput.value;

    if (!password) return;

    const currentRequest = requestNumber;

    // Wait until user stops typing
    typingTimer = setTimeout(async () => {

        try {

            const response = await fetch(WORKER_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ password })
            });

            const data = await response.json();

            // Ignore outdated responses
            if (currentRequest !== requestNumber) return;

            if (response.ok && data.downloadUrl) {

                // Correct password
                downloadUrl = data.downloadUrl;

                // Reveal download button
                downloadButton.classList.add("visible");
//logo.classList.add("visible");
radioPlayer.classList.add("visible");
            } else {

                // Incorrect password
              //  statusMessage.textContent = "INCORRECT PASSWORD";

            }

        } catch (error) {

            if (currentRequest === requestNumber) {
                statusMessage.textContent = "CONNECTION ERROR";
            }

        }

    }, 500);

});

// =================================
// DOWNLOAD BUTTON
// =================================

downloadButton.addEventListener("click", () => {

    if (!downloadUrl) return;

    window.location.href = downloadUrl;

});

// =================================
// ENTER KEY
// =================================

passwordInput.addEventListener("keydown", (event) => {

    if (event.key === "Enter" && downloadUrl) {
        downloadButton.click();
    }

});

 
// =================================
// SASHA.FM RADIO PLAYER
// =================================

const LIVEKIT_WORKER_URL = "https://sasha-download-api.sashabuskin12.workers.dev";

const powerButton = document.getElementById("power-button");
const volumeSlider = document.getElementById("volume-slider");
const liveStatus = document.getElementById("live-status");
const liveText = document.getElementById("live-text");
const playerStatus = document.getElementById("player-status");

let radioRoom = null;
let audioElements = new Set();
let isConnecting = false;

// =================================
// PLAYER STATUS
// =================================

function setPlayerStatus(message) {
    playerStatus.textContent = message;
}

function setLiveStatus(isLive) {
    liveStatus.classList.toggle("is-live", isLive);
    liveText.textContent = isLive ? "LIVE" : "OFFLINE";
}

function setPowerState(isOn) {
    powerButton.classList.toggle("active", isOn);
    document.querySelector(".logo").classList.toggle("active", isOn);
}

// =================================
// BROADCAST STATUS CHECK
// =================================

async function checkBroadcastStatus() {

    try {

        const response = await fetch(
            `${LIVEKIT_WORKER_URL}/status`
        );

        if (!response.ok) {
            throw new Error("Status check failed");
        }

        const data = await response.json();

        setLiveStatus(data.broadcasting);

        return data.broadcasting;

    } catch (error) {

        setLiveStatus(false);

        return false;
    }
}

// Check status every 5 seconds
checkBroadcastStatus();
setInterval(checkBroadcastStatus, 5000);

// =================================
// AUDIO TRACK HANDLING
// =================================

function handleTrackSubscribed(track) {

    if (track.kind !== LivekitClient.Track.Kind.Audio) return;

    const audioElement = track.attach();

    audioElement.volume = volumeSlider.value / 100;
    audioElement.autoplay = true;

    document.body.appendChild(audioElement);

    audioElements.add(audioElement);

    setPlayerStatus("CONNECTED - RECEIVING AUDIO");
}

function handleTrackUnsubscribed(track) {

    const elements = track.detach();

    elements.forEach(element => {
        audioElements.delete(element);
        element.remove();
    });
}

// =================================
// SASHA.FM EQUALISER
// =================================

const equaliserCanvas = document.getElementById("equaliser");
const equaliserContext = equaliserCanvas.getContext("2d");

const BAR_COUNT = 18;
const SEGMENT_COUNT = 7;

function updateEqualiser(bands) {

    const ctx = equaliserContext;
    const width = equaliserCanvas.width;
    const height = equaliserCanvas.height;

    ctx.clearRect(0, 0, width, height);

    const horizontalGap = width * 0.018;
    const barWidth =
        (width - horizontalGap * (BAR_COUNT - 1)) / BAR_COUNT;

    const segmentHeight = height * 0.085;
    const verticalGap = height * 0.035;

    for (let i = 0; i < BAR_COUNT; i++) {

        let level = 0;

        // Average the incoming frequency bands.
        const start = Math.floor(i * bands.length / BAR_COUNT);

        const end = Math.min(
            bands.length,
            Math.max(start + 1, Math.ceil((i + 1) * bands.length / BAR_COUNT))
        );

        let total = 0;

        for (let j = start; j < end; j++) {
            total += bands[j];
        }

        level = Math.max(0, Math.min(1, total / (end - start)));

        // Calculate illuminated segments.
        const litSegments = Math.ceil(
            level * (SEGMENT_COUNT - 1)
        ) + 1;

        const x = i * (barWidth + horizontalGap);

        // Draw segments from bottom upwards.
        for (let j = 0; j < litSegments; j++) {

            const y = height -
                segmentHeight -
                j * (segmentHeight + verticalGap);

            const radius = 1.2;

            ctx.beginPath();
            ctx.roundRect(
                x,
                y,
                barWidth,
                segmentHeight,
                radius
            );

            // Subtle cyan glow.
            ctx.shadowColor = "#ffffff";
            ctx.shadowBlur = 2.5;
            ctx.fillStyle = "#ffffff";
            ctx.fill();

            // Crisp foreground.
            ctx.shadowBlur = 0;
            ctx.fillStyle = "#ffffff";
            ctx.fill();
        }
    }
}

// Draw an empty equaliser initially.
updateEqualiser(new Array(32).fill(0));

// =================================
// CONNECT TO RADIO
// =================================

async function connectToRadio() {

    if (isConnecting || radioRoom) return;

    isConnecting = true;
    powerButton.disabled = true;

    try {

        setPlayerStatus("CHECKING RADIO...");

        const broadcasting = await checkBroadcastStatus();

        if (!broadcasting) {
            setPlayerStatus("RADIO OFF");
            return;
        }

        setPlayerStatus("CONNECTING...");

        // Request listener token
        const tokenResponse = await fetch(
            `${LIVEKIT_WORKER_URL}/token`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    role: "listener"
                })
            }
        );

        if (!tokenResponse.ok) {
            throw new Error("Could not obtain listener token");
        }

        const credentials = await tokenResponse.json();

        // Create LiveKit room
        const room = new LivekitClient.Room();
 

        room.on(
    LivekitClient.RoomEvent.DataReceived,
    (payload, participant, kind, topic) => {
        if (topic !== "sasha-fm-equaliser") return;

        if (payload.length !== 32) return;

        const bands = Array.from(payload, value => value / 255);

        updateEqualiser(bands);
    }
);
        room
            .on(
                LivekitClient.RoomEvent.TrackSubscribed,
                handleTrackSubscribed
            )
            .on(
                LivekitClient.RoomEvent.TrackUnsubscribed,
                handleTrackUnsubscribed
            );

        radioRoom = room;

        await room.connect(
            credentials.serverUrl,
            credentials.token
        );

        // Handle audio tracks already available
        for (const participant of room.remoteParticipants.values()) {

            for (const publication of participant.trackPublications.values()) {

                if (publication.track) {
                    handleTrackSubscribed(publication.track);
                }
            }
        }

        await room.startAudio();

        setPowerState(true);
        setPlayerStatus("CONNECTED");

    } catch (error) {

        console.error("Radio connection error:", error);

        if (radioRoom) {
            await radioRoom.disconnect();
            radioRoom = null;
        }

        audioElements.forEach(element => element.remove());
        audioElements.clear();

        setPowerState(false);
        setPlayerStatus("CONNECTION FAILED");

    } finally {

        isConnecting = false;
        powerButton.disabled = false;
    }
}

// =================================
// DISCONNECT FROM RADIO
// =================================

async function disconnectFromRadio() {

    if (!radioRoom) return;

    const room = radioRoom;
    radioRoom = null;

    await room.disconnect();

    audioElements.forEach(element => element.remove());
    audioElements.clear();
updateEqualiser(new Array(32).fill(0));
    setPowerState(false);
    setPlayerStatus("RADIO OFFLINE");
}

// =================================
// POWER BUTTON
// =================================

powerButton.addEventListener("click", async () => {

    if (radioRoom) {
        await disconnectFromRadio();
    } else {
        await connectToRadio();
    }

});

// =================================
// VOLUME CONTROL
// =================================

volumeSlider.addEventListener("input", () => {

    const volume = volumeSlider.value / 100;

    audioElements.forEach(element => {
        element.volume = volume;
    });

});

const passwordDots = document.getElementById("password-dots");
const passwordBox = document.getElementById("password-box");

passwordInput.addEventListener("input", () => {

    passwordDots.innerHTML = "";

    for (let i = 0; i < passwordInput.value.length; i++) {
        const dot = document.createElement("span");
        dot.className = "password-dot";
        passwordDots.appendChild(dot);
    }

});

const passwordCursor = document.getElementById("password-cursor");

passwordInput.addEventListener("input", () => {
    passwordCursor.style.display = "block";
});