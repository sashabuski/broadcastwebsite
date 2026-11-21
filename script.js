
// =================================
// SASHA.FM DOWNLOAD SYSTEM
// =================================

// Cloudflare Worker URL
const WORKER_URL = "https://sasha-download-api.sashabuskin12.workers.dev/api/download";

// Elements
const passwordInput = document.getElementById("password");
const downloadButton = document.getElementById("download-button");
const statusMessage = document.getElementById("status");

// State
let downloadUrl = null;
let typingTimer;
let requestNumber = 0;

// Hide download button initially
downloadButton.classList.remove("visible");

// =================================
// AUTOMATIC PASSWORD VERIFICATION
// =================================

passwordInput.addEventListener("input", () => {

    clearTimeout(typingTimer);

    // Invalidate previous requests immediately
    requestNumber++;

    // Hide button until password is verified again
    downloadButton.classList.remove("visible");

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
