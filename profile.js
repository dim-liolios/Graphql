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

            const now = new Date()
            let startMonth
            if (totalxp.length) {
                // Find the earliest createdAt date in totalxp
                const minDate = new Date(Math.min(...totalxp.map(tx => new Date(tx.createdAt))))
                startMonth = new Date(minDate.getFullYear(), minDate.getMonth(), 1)
            } else {
                // Fallback to current month if no XP
                startMonth = new Date(now.getFullYear(), now.getMonth(), 1)
            }
            const months = this.getAllMonths(startMonth, now)
            const xpArray = months.map(month => xpByMonth[month] || 0)

            this.s4DrawXPChart(xpArray, months)

            // SECTION 5 (SVG Graph 2):
            
            const auditTransactions = await this.s5FetchAuditsRatio(token, user.id)
            let doneXP = 0
            let receivedXP = 0

            auditTransactions.forEach(tx => {
                if (tx.type === 'up') {
                    doneXP += tx.amount
                } else if (tx.type === 'down') {
                    receivedXP += tx.amount
                }
            })

            const doneMB = doneXP / 1_000_000
            const receivedMB = receivedXP / 1_000_000

            document.getElementById('audit-done').textContent = doneMB.toFixed(2) + ' MB'
            document.getElementById('audit-received').textContent = receivedMB.toFixed(2) + ' MB'

            // Calculate and show ratio
            let ratio = '-'
            if (receivedXP > 0) {
                ratio = (doneXP / receivedXP).toFixed(2)
            }
            document.getElementById('audit-ratio').textContent = ratio

            // Draw the pie chart
            this.s5drawAuditRatioChart(doneXP, receivedXP)

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
                                userId: { _eq: ${userId} },
                                type: { _eq: "xp" },
                                eventId: { _eq: 200 }
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

// SECTION 4 (SVG graph for XP over time):
    getAllMonths(from, to) {
        const months = []
        let current = new Date(from.getFullYear(), from.getMonth(), 1)
        const end = new Date(to.getFullYear(), to.getMonth(), 1)
        while (current <= end) {
            const year = current.getFullYear()
            const month = String(current.getMonth() + 1).padStart(2, '0')
            months.push(`${year}-${month}`)
            current.setMonth(current.getMonth() + 1)
        }
        return months
    }

    s4DrawXPChart(xpArray, months) {
        const maxHeight = 250
        const barWidth = 40
        const svgWidth = 60 + months.length * (barWidth + 10)
        const svg = document.getElementById('xp-chart')
        svg.setAttribute('width', svgWidth)
        svg.innerHTML = ''
        if (!xpArray.length) return

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

            // Draw rotated, abbreviated month label below bar
            const label = document.createElementNS('http://www.w3.org/2000/svg', 'text')
            const [year, month] = months[i].split('-')
            const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
            label.textContent = `${monthNames[parseInt(month, 10) - 1]} '${year.slice(2)}`
            label.setAttribute('x', x + barWidth / 2)
            label.setAttribute('y', 320)
            label.setAttribute('text-anchor', 'middle')
            label.setAttribute('font-size', '12px')
            label.setAttribute('fill', '#333')
            label.setAttribute('transform', `rotate(-45, ${x + barWidth / 2}, 320)`)
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
        xAxis.setAttribute('x2', 50 + months.length * (barWidth + 10))
        xAxis.setAttribute('y2', 280)
        xAxis.setAttribute('stroke', '#aaa')
        xAxis.setAttribute('stroke-width', '2')
        svg.appendChild(xAxis)
    }

// SECTION 5 (SVG graph for Audit ratio):

    async s5FetchAuditsRatio(token, userId) {
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
                        userId: { _eq: ${userId} },
                        type: { _in: ["up", "down"] }
                        eventId: { _eq: 200} 
                        }
                    ) {
                        type
                        amount
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

    s5drawAuditRatioChart(done, received) {
        const svg = document.getElementById('audit-chart');
        svg.innerHTML = '';
        const total = done + received;
        if (total === 0) return;

        const cx = 200, cy = 150, r = 100;
        const doneAngle = (done / total) * 2 * Math.PI;

        // Done slice
        const x1 = cx + r * Math.cos(0)
        const y1 = cy + r * Math.sin(0)
        const x2 = cx + r * Math.cos(doneAngle)
        const y2 = cy + r * Math.sin(doneAngle)
        const largeArcFlag = done > received ? 1 : 0
        const pathDone = document.createElementNS('http://www.w3.org/2000/svg', 'path')
        pathDone.setAttribute('d',
            `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${largeArcFlag},1 ${x2},${y2} Z`
        )
        pathDone.setAttribute('fill', '#4caf50')
        svg.appendChild(pathDone)

        // Received slice
        const x3 = cx + r * Math.cos(doneAngle)
        const y3 = cy + r * Math.sin(doneAngle)
        const x4 = cx + r * Math.cos(2 * Math.PI)
        const y4 = cy + r * Math.sin(2 * Math.PI)
        const pathReceived = document.createElementNS('http://www.w3.org/2000/svg', 'path')
        pathReceived.setAttribute('d',
            `M${cx},${cy} L${x3},${y3} A${r},${r} 0 ${largeArcFlag ? 0 : 1},1 ${x4},${y4} Z`
        )
        pathReceived.setAttribute('fill', '#ff4757')
        svg.appendChild(pathReceived)

        // --- Add labels ON the chart ---

        // For "done" (green) label, place at the middle angle of the done slice
        const doneMidAngle = doneAngle / 2
        const doneLabelX = cx + (r * 0.6) * Math.cos(doneMidAngle)
        const doneLabelY = cy + (r * 0.6) * Math.sin(doneMidAngle)
        const doneText = document.createElementNS('http://www.w3.org/2000/svg', 'text')
        doneText.setAttribute('x', doneLabelX)
        doneText.setAttribute('y', doneLabelY)
        doneText.setAttribute('text-anchor', 'middle')
        doneText.setAttribute('dominant-baseline', 'middle')
        doneText.setAttribute('font-size', '18px')
        doneText.setAttribute('fill', '#fff')
        doneText.setAttribute('font-weight', 'bold')
        doneText.textContent = 'done'
        svg.appendChild(doneText)

        // For "received" (red) label, place at the middle angle of the received slice
        const receivedMidAngle = doneAngle + (2 * Math.PI - doneAngle) / 2
        const receivedLabelX = cx + (r * 0.6) * Math.cos(receivedMidAngle)
        const receivedLabelY = cy + (r * 0.6) * Math.sin(receivedMidAngle)
        const receivedText = document.createElementNS('http://www.w3.org/2000/svg', 'text')
        receivedText.setAttribute('x', receivedLabelX)
        receivedText.setAttribute('y', receivedLabelY)
        receivedText.setAttribute('text-anchor', 'middle')
        receivedText.setAttribute('dominant-baseline', 'middle')
        receivedText.setAttribute('font-size', '18px')
        receivedText.setAttribute('fill', '#fff')
        receivedText.setAttribute('font-weight', 'bold')
        receivedText.textContent = 'received'
        svg.appendChild(receivedText)
    }
}
