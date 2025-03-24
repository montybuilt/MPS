console.log("SCRIPT VERSION: RIGHT FUCKING NOW!");

// Define the login handler function separately
function handleLoginSubmit(event) {
    event.preventDefault(); // Prevent default form submission
    console.log("Form submitted");

    const formData = new FormData(event.target);
    const data = new URLSearchParams(formData);
    console.log("Sending login request");

    fetch('/login', {
        method: 'POST',
        body: data
    })
    .then(response => {
        console.log("Raw response:", response);
        return response.json();
    })
    .then(data => {
        console.log("Parsed response:", data);
        if (data.error) {
            console.log("Error received:", data.error);
            alert(data.error);
        } else {
            console.log("Login successful, processing data");
            sessionStorage.setItem('username', data.username);
            console.log("Username set:", sessionStorage.getItem('username'));

            sessionStorage.setItem("is_admin", data.is_admin);
            console.log("is_admin set:", sessionStorage.getItem("is_admin"));

            const sessionData = data.session_data;
            console.log("session_data:", sessionData);
            for (const key in sessionData) {
                if (sessionData.hasOwnProperty(key)) {
                    const value = sessionData[key];
                    const storedValue = Array.isArray(value) || (typeof value === 'object' && value !== null)
                        ? JSON.stringify(value)
                        : value;
                    sessionStorage.setItem(key, storedValue);
                    console.log(`Set ${key}:`, sessionStorage.getItem(key));
                }
            }

            console.log("Redirecting, is_admin:", data.is_admin);
            if (data.is_admin) {
                console.log("Going to /admin");
                window.location.href = '/admin';
            } else {
                console.log("Going to /dashboard");
                window.location.href = '/dashboard';
            }
        }
    })
    .catch(error => console.error('Fetch error:', error));
}

// Attach the listener after defining the form
const loginForm = document.getElementById("login-form");
if (loginForm) {
    console.log("Login form found, attaching listener");
    loginForm.addEventListener("submit", handleLoginSubmit);
} else {
    console.log("Login form not found");
}