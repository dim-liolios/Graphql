class ProfileManager {
    constructor() {
        this.logoutButton = document.getElementById('logout-button')
        this.init()
    }

    init() {
        this.logoutButton.addEventListener('click', this.handleLogout.bind(this))
        this.loadUserData()
    }

    handleLogout(event) {
        event.preventDefault()
        this.logout()
        console.log('Logout clicked')

        this.switchToLogin()
    }

    logout() {
        localStorage.removeItem('jwt_token')
        if (this.logoutButton) {
            this.logoutButton.classList.add('hidden');
        }
    }

    async loadUserData() {
        const token = localStorage.getItem('jwt_token')
        
        if (!token) {
            console.error('No token found')
            this.switchToLogin()
            return
        }
        
        try {
            const response = await fetch('https://((DOMAIN))/api/graphql-engine/v1/graphql', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`, // this is the JWT
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    query: `
                    query {
                        user {
                            id
                            login
                            email
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

    displayUserData(user) {
        document.getElementById('username').textContent = user.login
        document.getElementById('email').textContent = user.email
        document.getElementById('total-up').textContent = user.totalUp
        document.getElementById('total-down').textContent = user.totalDown
    }

    switchToLogin() {
        document.getElementById('profile-section').classList.add('hidden')
        document.getElementById('login-section').classList.remove('hidden')
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ProfileManager()
})

/* notes:





*/