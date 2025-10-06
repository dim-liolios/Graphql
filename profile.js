class ProfileManager {
    constructor() {
        this.logoutBtn = document.getElementById('logout-btn')
        this.init()
    }

    init() {
        this.logoutBtn.addEventListener('click', this.handleLogout.bind(this))
    }

    handleLogout() {
        console.log('Logout clicked')
        // TODO: Implement logout logic
        
        // For now, just switch back to login
        this.switchToLogin()
    }

    switchToLogin() {
        document.getElementById('profile-section').classList.add('hidden')
        document.getElementById('login-section').classList.remove('hidden')
    }

    loadUserData() {
        // TODO: Implement GraphQL queries to load user data
        console.log('Loading user data...')
    }
}


document.addEventListener('DOMContentLoaded', () => {
    new ProfileManager()
});