import { createServer } from 'http'
import { request } from 'https'

function forwardToZone01(req, res, apiPath) {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
        const options = {
            hostname: 'platform.zone01.gr',
            path: apiPath,
            method: 'POST',
            headers: {
                'Authorization': req.headers['authorization'],
                'Content-Type': req.headers['content-type'] || 'application/json',
            }
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
}

const server = createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    if (req.method === 'OPTIONS') {
        res.writeHead(204)
        res.end()
        return
    }

    if (req.method === 'POST' && (req.url === '/api/auth/signin' || req.url === '/api/graphql-engine/v1/graphql')) {
        forwardToZone01(req, res, req.url)
        return
    }

    res.writeHead(404)
    res.end('Not found')
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