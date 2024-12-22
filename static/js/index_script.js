let isElectron;

// Detect if running in Electron or a web environment
(function detectEnvironment() {
    isElectron = typeof window !== 'undefined' && window.process && window.process.versions.electron;
    console.log("Operating Environment", isElectron);
})();

document.addEventListener("DOMContentLoaded", function() {
    // Set the hidden input field for isElectron
    const isElectronInput = document.getElementById("isElectron");
    if (isElectronInput) {
        isElectronInput.value = isElectron; // Set the hidden field to true/false
    }

    // Attach the function to the login form submission
    const loginForm = document.getElementById("login-form");
    if (loginForm) {
        loginForm.addEventListener("submit", function(event) {
            // No encryption needed, send raw password
            // You can perform additional checks here if needed before submitting the form
        });
    }
});


