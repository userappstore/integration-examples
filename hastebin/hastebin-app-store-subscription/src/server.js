const applicationServer = require('@userappstore/express-authorized-app-stores')
const Busboy = require('busboy')
const connect = require('connect')
const Document = require('./document.js')
const http = require('http')
const fs = require('fs')
const mimeTypes = {
  js: 'text/javascript',
  css: 'text/css',
  txt: 'text/plain',
  html: 'text/html',
  jpg: 'image/jpeg',
  png: 'image/png',
  ico: 'image/x-icon',
  svg: 'image/svg+xml'
}
const querystring = require('querystring')
const rateLimit = require('connect-ratelimit')
const route = require('connect-route')

let server
module.exports = {
  start: (port, host) => {
    server = http.createServer(app).listen(port, host)
  },
  stop: () => {
    if (server) {
      server.close()
      server = null
    }
  }
}

const app = connect()
if (global.rateLimit) {
  app.use(rateLimit(global.rateLimit))
}
app.use(applicationServer)
app.use(parsePostData)
app.use(route((router) => {
  const homePage = fs.readFileSync(__dirname + '/www/home.html').toString('utf-8')
  const cache = {}
  // home page and static files
  app.use((req, res, next) => {
    res.statusCode = 200
    const urlPath = req.url.split('?')[0]
    if (urlPath === '/home') {
      if (!req.subscriptionid) {
        return dashboardError(res)
      }
      res.setHeader('content-type', 'text/html')
      if (global.publicDomain) {
        res.end(homePage.replace('</html>', `<script>
  window.publicDomain = "${global.publicDomain}" 
</script></html>`))
      } else {
        res.end(homePage)
      }
      return next()
    }
    if (!req.url.startsWith('/public/')) {
      return next()
    }
    const filePath = __dirname + '/www' + req.url.split('?')[0]
    if (!fs.existsSync(filePath)) {
      res.statusCode = 404
      res.end()
      return next()
    }
    const extension = filePath.split('.').pop().toLowerCase()
    const contentType = mimeTypes[extension]
    if (!contentType) {
      res.statusCode = 404
      res.end()
      return next()
    }
    const blob = cache[filePath] = cache[filePath] || fs.readFileSync(filePath)
    res.setHeader('content-type', contentType)
    res.setHeader('content-length', blob.length)
    res.end(blob)
    return next()
  })
  // raw posts
  router.get('/document/:id/raw', async (req, res) => {
    if (!req.subscriptionid) {
      return dashboardError(res)
    }
    const key = req.params.id
    let document
    try {
      document = await Document.load(key, req)
    } catch (error) {
    }
    if (!document) {
      res.writeHead(404, { 'content-type': 'application/json' })
      return res.end(`{ "message": "An invalid document was provided" }`)
    }
    if (req.accountid !== document.accountid) {
      if(!req.organizationid || req.organizationid !== document.organizationid) {
        res.writeHead(500, { 'content-type': 'application/json' })
        return res.end(`{ "message": "An invalid document was provided" }`)
      }
    }
    res.writeHead(200, { 'content-type': 'text/plain' })
    return res.end(object.buffer.toString())
  })
  // public posts
  const externalPage = fs.readFileSync(__dirname + '/external.html').toString('utf-8')
  router.get('/document/:appstore/:id', async (req, res) => {
    req.dashboard = 'https://' + req.url.split('/')[2]
    const key = req.params.id
    let result
    try {
      result = await Document.load(key, req)
    } catch (error) {
    }
    if (!result) {
      res.writeHead(404, { 'content-type': 'application/json' })
      return res.end(`{ "message": "An invalid document was provided" }`)
    }
    if(!result.public || req.headers.host !== global.publicDomain) {
      res.writeHead(500, { 'content-type': 'application/json' })
      return res.end(`{ "message": "An invalid document was provided" }`)
    }
    res.writeHead(200, { 'content-type': 'text/html' })
    result.document = result.document.toString('utf-8')
    const tagged = externalPage.replace('<li>View public post</li>', '<li>View public post ' + key + '</li>')
    return res.end(`${tagged}
<script>window.post = ${JSON.stringify(result)}</script>`)
  })
  // raw public posts
  router.get('/document/:appstore/:id/raw', async (req, res) => {
    req.dashboard = 'https://' + req.url.split('/')[2]
    const key = req.params.id
    let document
    try {
      document = await Document.load(key, req)
    } catch (error) {
    }
    if (!document) {
      res.writeHead(404, { 'content-type': 'application/json' })
      return res.end(`{ "message": "An invalid document was provided" }`)
    }
    if (!document.public || req.headers.host !== global.publicDomain) {
      res.writeHead(500, { 'content-type': 'application/json' })
      return res.end(`{ "message": "An invalid document was provided" }`)
    }
    res.writeHead(200, { 'content-type': 'text/plain' })
    return res.end(document.buffer.toString())
  })
  // list of posts
  router.get('/documents', async (req, res) => {
    if (!req.subscriptionid) {
      return dashboardError(res)
    }
    let list
    try {
      list = await Document.list(`account/${req.accountid}`, req)
    } catch (error) {
    }
    res.writeHead(200, { 'content-type': 'application/json' })
    if (!list || !list.length) {
      return res.end('[]')
    }
    return res.end(JSON.stringify(list))
  })
  // list of organization's posts
  router.get('/documents/organization', async (req, res) => {
    if (!req.subscriptionid) {
      return dashboardError(res)
    }
    if (!req.organizationid) {
      res.writeHead(500, { 'content-type': 'application/json' })
      return res.end(`{ "message": "An invalid document was provided" }`)
    }
    let list
    try {
      list = await Document.list(`organization/${req.organizationid}`, req)
    } catch (error) {
    }
    res.writeHead(200, { 'content-type': 'application/json' })
    if (!list || !list.length) {
      return res.end('[]')
    }
    return res.end(JSON.stringify(list))
  })
  // delete posts
  router.delete('/document/:id', async (req, res) => {
    if (!req.subscriptionid) {
      return dashboardError(res)
    }
    const key = req.params.id
    let deleted
    try {
      deleted = await Document.remove(key, req)
    } catch (error) {
    }
    if (!deleted) {
      res.writeHead(500, { 'content-type': 'application/json' })
      return res.end(`{ "message": "An invalid document was provided" }`)  
    }
    res.writeHead(200, { 'content-type': 'application/json' })
    return res.end()
  })
  // create posts
  router.post('/document', async (req, res) => {
    if (!req.subscriptionid) {
      return dashboardError(res)
    }
    let document
    try {
      document = await Document.create(req)
    } catch (error) {
      res.writeHead(500, { 'content-type': 'application/json' })
      return res.end(`{ "message": "${error.message}" }`)
    }
    res.writeHead(200, { 'content-type': 'application/json' })
    return res.end(JSON.stringify(document))
  })
  // load posts
  router.get('/document/:id', async (req, res) => {
    if (!req.subscriptionid) {
      return dashboardError(res)
    }
    const key = req.params.id
    let result
    try {
      result = await Document.load(key, req)
    } catch (error) {
    }
    if (!result) {
      res.statusCode = 404
      res.writeHead(404, { 'content-type': 'application/json' })
      return res.end(`{ "message": "An invalid document was provided" }`)
    }
    if (req.accountid !== result.accountid &&
      (!req.organizationid || req.organizationid !== result.organizationid)) {
      res.writeHead(500, { 'content-type': 'application/json' })
      return res.end(`{ "message": "An invalid document was provided" }`)
    }
    res.writeHead(200, { 'content-type': 'application/json' })
    result.document = result.document.toString('utf-8')
    return res.end(JSON.stringify(result))
  })
}))

const errorPage = fs.readFileSync(__dirname + '/error.html').toString('utf-8')
function dashboardError(res) {
  res.setHeader('content-type', 'text/html')
  res.statusCode = 511
  res.end(errorPage)
}

function parsePostData (req, res, next) {
  if (req.method === 'GET' || req.method === 'OPTIONS' || req.method === 'HEAD') {
    return next()
  }
  const ct = req.headers['content-type']
  if (ct && ct.startsWith('multipart/form-data')) {
    if (!req.headers['content-length']) {
      return next()
    }
    req.body = {}
    const busboy = new Busboy({ headers: req.headers })
    busboy.on('field', (fieldname, val) => {
      req.body[fieldname] = val
    })
    busboy.on('finish', next)
    return req.pipe(busboy)
  } 
  let buffer
  req.on('data', (chunk) => {
    buffer = buffer ? buffer + chunk : chunk
  })
  req.on('end', () => {
    if (buffer) {
      req.body = querystring.parse(buffer)
    }
    return next()
  })
  return req.on('error', () => {
    res.writeHead(500, { 'content-type': 'application/json' })
    res.end(`{ "message": "An error ocurred parsing the POST data" }`)
    return next()
  })
}
