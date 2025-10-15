class LoginManager {
    constructor() {
        this.loginForm = document.getElementById('login-form')
        this.errorMessage = document.getElementById('error-message')
        this.init()
    }

    init() {
        this.loginForm.addEventListener('submit', this.handleLogin.bind(this))
        // the bind(this) refers to all "this" handleLogin() method has, 
        // in our case we set which instance's showError() to call
    }

    async handleLogin(event) {
        event.preventDefault()
        
        const username = document.getElementById('username').value
        const password = document.getElementById('password').value
        
        try {
            const loginSuccessful = await this.attemptLogin(username, password)
            
            if (loginSuccessful) {
                this.hideError()
                this.switchToProfile()
                new ProfileManager()
            } else {
                this.showError('Invalid username or password')
            }
        } catch (error) {
            this.showError('Login failed. Please try again.')
        }
    }

    async attemptLogin(username, password) {
        const credentials = btoa(`${username}:${password}`)
        // btoa: Binary to ASCII (so btoa("john:secret123") results in: "am9objpzZWNyZXQxMjM=")

        const response = await fetch('https://graphql-wi3q.onrender.com/api/auth/signin', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
        })

        if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.message || 'Login failed')
        }
        
        const token = await response.text()
        localStorage.setItem('jwt_token', token)
        // localStorage: browser storage (like a simple database) that persists data even after closing the browser
        // Key-value storage accessible from any page on the same domain
    
    return true
    }
    
    switchToProfile() {
        document.getElementById('login-section').classList.add('hidden')
        document.getElementById('profile-section').classList.remove('hidden')
    }

    showError(message) {
        this.errorMessage.textContent = message;
        this.errorMessage.classList.remove('hidden')
    }

    hideError() {
        this.errorMessage.classList.add('hidden')
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new LoginManager()
})


/* notes:

What .bind(this) does:
    - Sets the value of "this" inside the handleLogin method
    - Ensures "this.showError()" calls the showError method from the correct LoginManager instance
    - Links the method call to the specific object that should handle it

Constructor's job:
    - Get DOM elements
    - Set up initial state (if any)
    - Call initialization
init() method's job:
    - Set up behavior (the interactions)
    - Attach event listeners
    - Configure how the class responds to user actions

Timeline of method calls:
    - Constructor runs → calls init() immediately
    - init() runs → sets up event listener (doesn't call handleLogin yet)
    - User submits form → browser calls handleLogin
    - handleLogin runs → calls showError
    - showError updates the DOM to display the error message

Base64 Encoding:
    - text encoding scheme that converts binary data (or any text) into a string using only 64 safe characters
    - it is safe for transmission - only uses characters that won't break URLs, emails, HTTP headers
    - it is NOT encryption or security - it's just encoding for safe transmission. Anyone can decode it!

JWT (JSON Web Token):
    - it is a secure way to transmit information between parties as a JSON object. It's digitally signed so you can verify it's authentic
    - it has 3 parts separated by dots: header.payload.signature
        header: metadata about the token (algorithm, type)
        payload: the actual data (claims) like user ID, roles, expiration
        signature: verifies the token wasn't tampered with (server creates it using header, payload, and a secret key)
                   only the server can validate it
    - server doesn't need to store session data (stateless authentication)

*/