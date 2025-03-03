document.addEventListener("DOMContentLoaded", function() {
    const loginForm = document.getElementById("login-form");
    if (loginForm) {
        loginForm.addEventListener("submit", function(event) {
            event.preventDefault();  // Prevent default form submission

            const formData = new FormData(loginForm);
            const data = new URLSearchParams(formData);

            fetch('/login', {
                method: 'POST',
                body: data
            })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    alert(data.error);  // Display error message
                } else {
                    // Store the username in sessionStorage
                    sessionStorage.setItem('username', data.username);
                    
                    // Set sessionStorage with session data
                    const sessionData = data.session_data;
                    for (const key in sessionData) {
                        if (sessionData.hasOwnProperty(key)) {
                            const value = sessionData[key];
                            if (Array.isArray(value)) {
                                sessionStorage.setItem(key, JSON.stringify(value));
                            } else if (typeof value === 'object' && value !== null) {
                                sessionStorage.setItem(key, JSON.stringify(value));
                            } else {
                                sessionStorage.setItem(key, value);
                            }
                        }
                    }
                    
                    // Redirect based on the is_admin flag
                    if (data.is_admin) {
                        window.location.href = '/admin';
                    } else {
                        window.location.href = '/dashboard';
                    }
                }
            })
            .catch(error => console.error('Error:', error));
        });
    }
});
