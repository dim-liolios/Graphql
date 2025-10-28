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
            // SECTION 1 (user info): -----------------------------------------------------------------------
            const user = await this.s1FetchUserBasicInfo(token)
            if (!user) return

            const attrs = user.attrs || {}
            document.getElementById('first-name').textContent = attrs.firstName || ''
            document.getElementById('last-name').textContent = attrs.lastName || ''
            document.getElementById('date-of-birth').textContent = attrs.dateOfBirth
                ? new Date(attrs.dateOfBirth).toLocaleDateString('en-GB')
                : ''
            document.getElementById('place-of-birth').textContent = attrs.placeOfBirth || ''

            // SECTION 2 (xp): ------------------------------------------------------------------------------
            const totalxp = await this.s2FetchObjectsXPamount(token, user.id)
            // sum XP in bytes for filtered transactions:
            const xpAmountBytes = totalxp.reduce((sum, tx) => sum + tx.amount, 0)
            document.getElementById('xp').textContent = Math.round(xpAmountBytes / 1000) + ' KB'

            // SECTION 3 (latest audits): -------------------------------------------------------------------
            const audits = await this.s3FetchLatestAudits(token, user.id)
            const auditsContainer = document.getElementById('audits')
            auditsContainer.innerHTML = ''

            audits.forEach(audit => {
                const auditElement = document.createElement('div')
                auditElement.classList.add('audit')
                auditElement.innerHTML = `
                    <div class="audit-card">
                        <div class="audit-title">${audit.group.object.name}</div>
                        <div class="audit-meta">
                            <span class="audit-date">${new Date(audit.createdAt).toLocaleString()}</span>
                            <span class="audit-grade ${audit.grade === 1 ? 'passed' : ''}">
                                ${audit.grade === 1 ? 'Passed' : audit.grade}
                            </span>
                        </div>
                    </div>
                `
                auditsContainer.appendChild(auditElement)
            })

            // SECTION 4 (SVG Graph 1): ---------------------------------------------------------------------
            const xpByMonth = {}
            totalxp.forEach(tx => {
                // Format: YYYY-MM
                const month = new Date(tx.createdAt).toISOString().slice(0, 7)
                xpByMonth[month] = (xpByMonth[month] || 0) + tx.amount
            })
            // Sort months chronologically
            const months = Object.keys(xpByMonth).sort()
            const xpArray = months.map(month => xpByMonth[month])

            // Draw the SVG bar chart
            this.drawXPChart(xpArray, months)

            // Optionally, add month labels below bars:
            const svg = document.getElementById('xp-chart')
            months.forEach((month, i) => {
                const x = 50 + i * (40 + 10) + 20 // barWidth/2 for center
                const label = document.createElementNS('http://www.w3.org/2000/svg', 'text')
                label.setAttribute('x', x)
                label.setAttribute('y', 295)
                label.setAttribute('text-anchor', 'middle')
                label.setAttribute('font-size', '12px')
                label.textContent = month
                svg.appendChild(label)
            })

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
                            attrs
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

    async s2FetchObjectsXPamount(token, userId) {
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
                            _and: [
                                { userId: { _eq: ${userId} } },
                                { type: { _eq: "xp" } },
                                { eventId: { _eq: 200} }
                            ]
                            }
                        ) {
                            amount
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
        return data.data.transaction
    }

// SECTION 3 (latest audits):

    async s3FetchLatestAudits(token, userId) {
        const response = await fetch('https://graphql-wi3q.onrender.com/api/graphql-engine/v1/graphql', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query: `
                    query {
                    audit(
                        where: { auditorId: { _eq: ${userId} }, grade: { _eq: 1 } }
                        order_by: { createdAt: desc }
                        limit: 5
                    ) {
                        grade
                        createdAt
                        group {
                            object {
                                name
                        }
                        }
                    }
                    }
                `
            })
        })
        const data = await response.json()
        if (data.errors || !data.data || !data.data.audit) {
            console.error('Audit query error:', data.errors || data)
            return []
        }
        return data.data.audit
    }

// SECTIONS 4 (SVG graph for XP over time):

    drawXPChart(xpArray, months) {
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

            // Draw bar
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
            rect.setAttribute('x', x)
            rect.setAttribute('y', y)
            rect.setAttribute('width', barWidth)
            rect.setAttribute('height', barHeight)
            rect.setAttribute('fill', '#667eea')
            svg.appendChild(rect)

            // Draw XP value above bar
            const value = document.createElementNS('http://www.w3.org/2000/svg', 'text')
            value.setAttribute('x', x + barWidth / 2)
            value.setAttribute('y', y - 8)
            value.setAttribute('text-anchor', 'middle')
            value.setAttribute('font-size', '12px')
            value.setAttribute('fill', '#333')
            value.textContent = Math.round(xp / 1000) + ' KB'
            svg.appendChild(value)

            // Draw month label below bar
            const label = document.createElementNS('http://www.w3.org/2000/svg', 'text')
            label.setAttribute('x', x + barWidth / 2)
            label.setAttribute('y', 295)
            label.setAttribute('text-anchor', 'middle')
            label.setAttribute('font-size', '12px')
            label.textContent = months[i].slice(5) + '/' + months[i].slice(0, 4) // MM/YYYY
            svg.appendChild(label)
        })

        // Y-axis
        const yAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line')
        yAxis.setAttribute('x1', 40)
        yAxis.setAttribute('y1', 30)
        yAxis.setAttribute('x2', 40)
        yAxis.setAttribute('y2', 280)
        yAxis.setAttribute('stroke', '#aaa')
        yAxis.setAttribute('stroke-width', '2')
        svg.appendChild(yAxis)

        // X-axis
        const xAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line')
        xAxis.setAttribute('x1', 40)
        xAxis.setAttribute('y1', 280)
        xAxis.setAttribute('x2', 400)
        xAxis.setAttribute('y2', 280)
        xAxis.setAttribute('stroke', '#aaa')
        xAxis.setAttribute('stroke-width', '2')
        svg.appendChild(xAxis)
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