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
        localStorage.removeItem('jwt_token')
        if (this.logoutButton) {
            this.logoutButton.classList.add('hidden');
        }
        
        this.switchToLogin()
    }

    async loadUserData() {
        const token = localStorage.getItem('jwt_token')
        
        if (!token) {
            console.error('No token found')
            this.switchToLogin()
            return
        }
        
        try {
            // SECTION 1 (user info):
            const user = await this.s1FetchUserBasicInfo(token)
            if (!user) return
            document.getElementById('username').textContent = user.login
            document.getElementById('email').textContent = user.email

            // SECTION 2 (xp):

            const objectsForXP = await this.s2FetchSpecificObjects(token, user.id)
            console.log('Objects included in XP calculation:')
            objectsForXP.forEach(obj => {
                console.log(`ID: ${obj.id}, Name: ${obj.name}, Type: ${obj.type}, CreatedAt: ${obj.createdAt}`)
            })

            // getting the ids of the exercises/projects that are taken into account for xp in the platform:
            const objectIds = (await this.s2FetchSpecificObjects(token, user.id)).map(obj => obj.id)

            // getting the total xp for these objects:
            const totalxp = await this.s2FetchObjectsXPamount(token, user.id, objectIds)

            // sum XP in bytes for filtered transactions:
            const xpAmountBytes = totalxp.reduce((sum, tx) => sum + tx.amount, 0)
            document.getElementById('xp').textContent = Math.round(xpAmountBytes / 1000) + ' KB'


            // SECTION 3 (skills):
            const skillObjects = await this.s2FetchSpecificObjects(token)
            const skillsList = document.getElementById('skills')
            // skillsList.innerHTML = '' // Clear previous content

            skillObjects.forEach(obj => {
                const li = document.createElement('li')
                li.textContent = typeof obj.attrs === 'string' ? obj.attrs : JSON.stringify(obj.attrs)
                skillsList.appendChild(li)
            })

            // SECTION 4 (SVG Graph 1):
            // const pass = progress.filter(p => p.grade === 1).length
            // const fail = progress.filter(p => p.grade === 0).length
            // this.drawProjectPieChart(pass, fail)

            // SECTION 5 (SVG Graph 2):


        } catch (error) {
            console.error('Failed to load user data:', error)
        }
    }

    switchToLogin() {
        const loginSection = document.getElementById('login-section')
        const profileSection = document.getElementById('profile-section')

        profileSection.classList.remove('active')
        profileSection.classList.add('hidden')

        loginSection.classList.remove('hidden')
        loginSection.classList.add('active')
    }

//                            HELPER FUNCTIONS FOR DATA FETCHING AND UI UPDATES
// ------------------------------------------------------------------------------------------------------------

// SECTION 1(user info):

    async s1FetchUserBasicInfo(token) {
        const response = await fetch('https://graphql-wi3q.onrender.com/api/graphql-engine/v1/graphql', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
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
        if (data.errors || !data.data || !data.data.user || !data.data.user.length) {
            console.error('User query error:', data.errors || data)
            return null
        }
        return data.data.user[0]
    }

// SECTION 2 (xp):

    async s2FetchSpecificObjects(token, userId) {
        const response = await fetch('https://graphql-wi3q.onrender.com/api/graphql-engine/v1/graphql', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query: `
                query {
                    object(
                        where: {
                            _or: [
                                { 
                                    type: { _eq: "project" },
                                    progress: { 
                                        userId: { _eq: ${userId} },
                                        grade: { _gte: 1 }
                                    }
                                },
                                { type: { _eq: "module" } },
                                { _and: [
                                    { type: { _eq: "exercise" } },
                                    { createdAt: { _gte: "2024-10-29T00:00:00", _lt: "2024-10-30T00:00:00" } }
                                ]},
                                { _and: [
                                    { type: { _eq: "piscine" } },
                                    { createdAt: { _gte: "2025-07-17T00:00:00", _lt: "2025-07-18T00:00:00" } }
                                ]}
                            ]
                        }
                    ) {
                        id
                        name
                        type
                        attrs
                        createdAt
                    }
                }
                `
            })
        })
        const data = await response.json()
        if (data.errors || !data.data || !data.data.object) {
            console.error('Object info query error:', data.errors || data)
            return []
        }
        return data.data.object
    }

    async s2FetchObjectsXPamount(token, userId, objectIds) {
        const response = await fetch('https://graphql-wi3q.onrender.com/api/graphql-engine/v1/graphql', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query: `
                    query {
                    transaction(
                        where: {
                        userId: { _eq: ${userId} }
                        type: { _eq: "xp" }
                        objectId: { _in: [${objectIds.join(',')}] }
                        }
                    ) {
                        amount
                        objectId
                        createdAt
                    }
                    }
                `
            })
        })
        const data = await response.json()
        if (data.errors || !data.data || !data.data.transaction) {
            console.error('XP amount query error:', data.errors || data)
            return []
        }
        // Sum ALL XP transactions
        return data.data.transaction
    }

// SECTION 3 (skills):




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

/* notes:





*/