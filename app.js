// Main application logic
class App {
    constructor() {
        this.currentUser = null
        this.jwtToken = null
        this.init()
    }

    init() {
        // Check if user is already logged in (token in localStorage)
        this.checkExistingLogin()
    }

    checkExistingLogin() {
        const token = localStorage.getItem('jwt_token')
        if (token) {
            // TODO: Validate token and auto-login
            console.log('Found existing token:', token)
        }
    }

    switchToProfile() {
        document.getElementById('login-section').classList.add('hidden')
        document.getElementById('profile-section').classList.remove('hidden')
    }

    switchToLogin() {
        document.getElementById('profile-section').classList.add('hidden')
        document.getElementById('login-section').classList.remove('hidden')
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App()
})