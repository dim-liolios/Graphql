class ProfileManager {
    constructor() {
        this.logoutBtn = document.getElementById('logout-btn')
        this.init()
    }

    init() {
        this.logoutBtn.addEventListener('click', this.handleLogout.bind(this))
        this.loadUserData()  // ← Call it when profile loads
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

    async loadUserData() {
        // Get the JWT token we stored during login
        const token = localStorage.getItem('jwt_token')
        
        if (!token) {
            console.error('No token found')
            this.switchToLogin()
            return
        }
        
        try {
            // Use JWT for GraphQL request
            const response = await fetch('https://((DOMAIN))/api/graphql-engine/v1/graphql', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,  // ← JWT used here!
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    query: `
                        query {
                            user {
                                id
                                login
                                email
                                totalUp
                                totalDown
                            }
                        }
                    `
                })
            })
            
            const data = await response.json()
            this.displayUserData(data.data.user)
            
        } catch (error) {
            console.error('Failed to load user data:', error)
        }
    }
}


document.addEventListener('DOMContentLoaded', () => {
    new ProfileManager()
});