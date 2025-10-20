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
            const user = await this.fetchUserBasicInfo(token)
            if (!user) return
            document.getElementById('username').textContent = user.login
            document.getElementById('email').textContent = user.email

            // SECTION 2 (xp):
            // //getting all XP transactions to filter them based on object type and date:
            // const allXPTransactions = await this.fetchUserTransactions(token, user.id)
            // const allXPObjectIds = [...new Set(allXPTransactions.map(tx => tx.objectId))]
            // const allXPObjectsInfo = await this.fetchObjectsInfo(token, allXPObjectIds)
            // const objectTypeMap = {}
            //  allXPObjectsInfo.forEach(obj => {
            //     objectTypeMap[obj.id] = obj.type
            // })
            // // filtering transactions including "project" and "module" types for any date,
            // // "exercise" type only if date is 2024-10-29 and "piscine" type only if date is 2025-07-17
            // const exerciseDate = '2024-10-29'
            // const piscineDate = '2025-07-17'
            // const validTypes = ["project", "module"]
            // const filteredXP = allXPTransactions.filter(tx => {
            //     const type = objectTypeMap[tx.objectId] || 'unavailable'
            //     const txDate = tx.createdAt ? tx.createdAt.slice(0, 10) : ''
            //     return (
            //         validTypes.includes(type) ||
            //         (type === "exercise" && txDate === exerciseDate) ||
            //         (type === "piscine" && txDate === piscineDate)
            //     )
            // })
            // // sum XP in bytes for filtered transactions:
            // const xpAmountBytes = filteredXP.reduce((sum, tx) => sum + tx.amount, 0)
            // document.getElementById('xp').textContent = Math.round(xpAmountBytes / 1000) + ' KB'

            const xpTransactions = await this.fetchUserXP(token, user.id)
            console.log(xpTransactions)
            const xpAmountBytes = xpTransactions.reduce((sum, tx) => sum + tx.amount, 0)
            document.getElementById('xp').textContent = Math.round(xpAmountBytes / 1000) + ' KB'



            // SECTION 3 (progress):

            
            // SECTION 4 (SVG Graph 1):
            const pass = progress.filter(p => p.grade === 1).length
            const fail = progress.filter(p => p.grade === 0).length
            this.drawProjectPieChart(pass, fail)

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
    
    async fetchUserXP(token, userId) {
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
                                _and: [
                                    {
                                        _or: [
                                            { object: { type: { _in: ["project", "module"] } } }
                                            { _and: [
                                                { object: { type: { _eq: "exercise" } } }
                                                { createdAt: { _like: "2024-10-29%" } }
                                            ]}
                                            { _and: [
                                                { object: { type: { _eq: "piscine" } } }
                                                { createdAt: { _like: "2025-07-17%" } }
                                            ]}
                                        ]
                                    }
                                ]
                            }
                        ) {
                            amount
                            objectId
                            createdAt
                            object { type }
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
        return data.data.transaction
    }

    async fetchUserBasicInfo(token) {
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

    async fetchUserXPamount(token, userId) {
        const response = await fetch('https://graphql-wi3q.onrender.com/api/graphql-engine/v1/graphql', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query: `
                    query {
                        transaction(where: { userId: { _eq: ${userId} }, type: { _eq: "xp" } }) {
                            amount
                            objectId
                        }
                    }
                `
            })
        })
        const data = await response.json()
        if (data.errors || !data.data || !data.data.transaction) {
            console.error('XP amount query error:', data.errors || data)
            return 0
        }
        // Sum ALL XP transactions (including bonuses)
        return data.data.transaction.reduce((sum, tx) => sum + tx.amount, 0)
    }

    async fetchUserProgress(token, userId) {
        const response = await fetch('https://graphql-wi3q.onrender.com/api/graphql-engine/v1/graphql', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query: `
                    query {
                        progress(where: { userId: { _eq: ${userId} } }) {
                            grade
                            objectId
                        }
                    }
                `
            })
        })
        const data = await response.json()
        if (data.errors || !data.data || !data.data.progress) {
            console.error('Progress query error:', data.errors || data)
            return []
        }
        return data.data.progress
    }

    async fetchObjectsInfo(token, objectIds) {
        if (!objectIds.length) return []
        const response = await fetch('https://graphql-wi3q.onrender.com/api/graphql-engine/v1/graphql', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query: `
                    query {
                        object(where: { id: { _in: [${objectIds.join(',')}] } }) {
                            id
                            type
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

    async fetchUserTransactions(token, userId) {
        const response = await fetch('https://graphql-wi3q.onrender.com/api/graphql-engine/v1/graphql', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query: `
                    query {
                        transaction(where: { userId: { _eq: ${userId} }, type: { _eq: "xp" } }) {
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
            console.error('Transaction query error:', data.errors || data)
            return []
        }
        return data.data.transaction // <-- return the whole transaction, not just amount
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

/* notes:





*/