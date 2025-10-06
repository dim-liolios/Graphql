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
        
        console.log('Login attempt:', { username, password })
        // TODO: Implement actual login logic
        
        this.showError('Login functionality will be implemented next!')
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
    Get DOM elements
    Set up initial state (if any)
    Call initialization
init() method's job:
    Set up behavior (the interactions)
    Attach event listeners
    Configure how the class responds to user actions

*/