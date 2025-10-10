class ProfileManager {
    constructor() {
        this.logoutButton = document.getElementById('logout-button')
        this.init()
    }

    init() {
        this.logoutButton.addEventListener('click', this.handleLogout.bind(this))
        this.logoutButton.classList.remove('hidden')
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
            const response = await fetch('https://platform.zone01.gr/api/graphql-engine/v1/graphql', {
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
            console.log('Full response:', data) // this log will show us the available fields to ask for in our query
            this.displayUserData(data.data.user)
            
        } catch (error) {
            console.error('Failed to load user data:', error)
            console.log('GraphQL errors:', data.errors)  // same for this log, we can see the availabe fields
        }
    }

    displayUserData(user) {
        document.getElementById('username').textContent = user.login
        document.getElementById('email').textContent = user.email
    }

    switchToLogin() {
        document.getElementById('profile-section').classList.add('hidden')
        document.getElementById('login-section').classList.remove('hidden')
    }

    drawXPChart(xpArray) {
        const svg = document.getElementById('xp-chart')
        svg.innerHTML = ''
        if (!xpArray.length) return

        const barWidth = 40
        const maxHeight = 250
        const maxXP = Math.max(...xpArray)

        xpArray.forEach((xp, i) => {
            const barHeight = (xp / maxXP) * maxHeight
            const x = 50 + i * (barWidth + 10)
            const y = 280 - barHeight

            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
            rect.setAttribute('x', x)
            rect.setAttribute('y', y)
            rect.setAttribute('width', barWidth)
            rect.setAttribute('height', barHeight)
            rect.setAttribute('fill', '#667eea')
            svg.appendChild(rect)
        })
    }

    drawProjectPieChart(pass, fail) {
        const svg = document.getElementById('project-chart');
        svg.innerHTML = '';
        const total = pass + fail;
        if (total === 0) return;

        const cx = 200, cy = 150, r = 100;
        const passAngle = (pass / total) * 2 * Math.PI;

        // Pass slice
        const x1 = cx + r * Math.cos(0)
        const y1 = cy + r * Math.sin(0)
        const x2 = cx + r * Math.cos(passAngle)
        const y2 = cy + r * Math.sin(passAngle)
        const largeArcFlag = pass > fail ? 1 : 0
        const pathPass = document.createElementNS('http://www.w3.org/2000/svg', 'path')
        pathPass.setAttribute('d',
            `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${largeArcFlag},1 ${x2},${y2} Z`
        )
        pathPass.setAttribute('fill', '#4caf50')
        svg.appendChild(pathPass)

        // Fail slice
        const x3 = cx + r * Math.cos(passAngle)
        const y3 = cy + r * Math.sin(passAngle)
        const x4 = cx + r * Math.cos(2 * Math.PI)
        const y4 = cy + r * Math.sin(2 * Math.PI)
        const pathFail = document.createElementNS('http://www.w3.org/2000/svg', 'path')
        pathFail.setAttribute('d',
            `M${cx},${cy} L${x3},${y3} A${r},${r} 0 ${largeArcFlag ? 0 : 1},1 ${x4},${y4} Z`
        )
        pathFail.setAttribute('fill', '#ff4757')
        svg.appendChild(pathFail)
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ProfileManager()
})

/* notes:





*/