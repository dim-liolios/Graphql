import { createServer } from 'http'
import { request } from 'https'

const server = createServer((req, res) => {
    // setting CORS headers for all responses:
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    if (req.method === 'OPTIONS') {
        res.writeHead(204)
        res.end()
        return
    }

    if (req.method === 'GET' && req.url === '/api/object/athens') {
        const options = {
            hostname: 'platform.zone01.gr',
            path: '/api/object/athens',
            method: 'GET',
            headers: {
                ...req.headers,
                'User-Agent': 'Mozilla/5.0'
            },
            minVersion: 'TLSv1.2'
        }
        const proxyReq = request(options, proxyRes => {
            res.writeHead(proxyRes.statusCode, {
                ...proxyRes.headers,
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            })
            proxyRes.pipe(res)
        })
        proxyReq.on('error', err => {
            res.writeHead(502, {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            })
            res.end('Bad Gateway: ' + err.message)
        })
        proxyReq.end()
    }
    
    if (req.method === 'POST' && req.url === '/api/auth/signin') {
        let body = ''
        req.on('data', chunk => { body += chunk; })
        req.on('end', () => {
            const options = {
                hostname: 'platform.zone01.gr',
                path: '/api/auth/now',
                method: 'POST',
                headers: { ...req.headers,
                    'User-Agent': 'Mozilla/5.0'
                },
                minVersion: 'TLSv1.2'
            }
            const proxyReq = request(options, proxyRes => {
                res.writeHead(proxyRes.statusCode, {
                    ...proxyRes.headers,
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                }) // sets the status code and headers of our response to frontend (github pages) to match those of the Zone01 server
                proxyRes.pipe(res)
                // streams the body of the response from zone01 directly to our frontend client (github pages)
            })
            proxyReq.on('error', err => {
                res.writeHead(502, {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                })
                res.end('Bad Gateway: ' + err.message)
            })
            proxyReq.write(body)
            proxyReq.end()
        })
    } else {
        res.writeHead(404)
        res.end('Not found')
    }
})

const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
    console.log(`Proxy server running on port: ${PORT}`)
})

/* notes:

proxyReq:
    - the outgoing request from your proxy server to the zone01 server
    - it runs after req.on('end', ...) - after we have received the full body from the frontend client (github pages)    

proxyRes (callback function parameter):
    - the incoming response from the zone01 server to your proxy server
    - it runs after the proxyReq.write(body) - after we have sent the full body to the zone01 server
    - proxyRes.pipe(res):
        streams the body of the response from zone01 directly to our frontend client (github pages)    

*/