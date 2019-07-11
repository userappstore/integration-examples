# Converting hastebin to a Dashboard application server for app stores

[Hastebin](https://github.com/seejohnrun/haste-server) is a 'pastebin' web application you post code and text to share.  The application has no user accounts, all posts are anonymous and publicly accessible via a generated URL.  This conversion is based on `hastebin`'s source code.

[Dashboard](https://github.com/userdashboard/dashboard) is a reusable interface for user account management with modules for more.  It runs separately to your web application, as users browse your Dashboard server they receive content from itself or your application server combined into a single website.  When Dashboard proxies an application server it includes user account and session information in the request headers.

[UserAppStore](https://userappstore.com) is a portal for coding and using web applications.  Users install the apps with free or paid subscriptions for themselves or an organization.  Compatibility means retrofitting `hastebin` to be a Dashboard application server, and tweaking it to for compatibility with the [app store software](https://github.com/userappstore/app-store-dashboard-server) where it will run in a sandboxed iframe.

When the conversion is complete `hastebin` will be ready for publishing on UserAppStore and other app store websites with paid subscription plans.

# Feature comparison before and after integration

| Feature                        | Original Hastebin     | Hastebin application server  |
|--------------------------------|-----------------------|------------------------------|
| Create posts                   | anonymous-only        | registered-only              |
| Public URLs                    | mandatory             | optional                     |
| List own posts                 | no                    | yes                          |
| Delete own posts               | no                    | yes                          |
| List + view organization posts | no                    | yes                          |
| Share posts with organization  | no                    | yes                          |
| Paid subscriptions             | no                    | yes                          |
| Quotas                         | no                    | personal + organization      |

## Screenshot walkthrough of finished integration

| ![Developer claims application server](./hastebin-app-store-subscription/src/www/public/1-developer-claims-application-server.png?raw=true) |
|:---------------------------------------------------------------------------------------------------------------:|
| Developer claims application server |

| ![Developer creates Connect registration](./hastebin-app-store-subscription/src/www/public/2-developer-creates-connect-registration.png?raw=true) |
|:---------------------------------------------------------------------------------------------------------------:|
| Developer creates Connect registration |

| ![Developer completes registration information](./hastebin-app-store-subscription/src/www/public/3-developer-completes-registration-information.png?raw=true) |
|:---------------------------------------------------------------------------------------------------------------:|
| Developer completes Connect registration information |

| ![Developer provides bank details for receiving revenue](./hastebin-app-store-subscription/src/www/public/4-developer-provides-bank-details-for-receiving-revenue.png?raw=true) |
|:---------------------------------------------------------------------------------------------------------------:|
| Developer provides bank details for receiving revenue |

| ![Developer submits Connect registration](./hastebin-app-store-subscription/src/www/public/5-developer-submits-connect-registration.png?raw=true) |
|:---------------------------------------------------------------------------------------------------------------:|
| Developer submits Connect registration |

| ![Developer creates app](./hastebin-app-store-subscription/src/www/public/6-developer-creates-app.png?raw=true) |
|:---------------------------------------------------------------------------------------------------------------:|
| Developer creates app |

| ![Developer provides app information](./hastebin-app-store-subscription/src/www/public/7-developer-completes-app-information.png?raw=true) |
|:---------------------------------------------------------------------------------------------------------------:|
| Developer provides app information |

| ![Developer publishes app](./hastebin-app-store-subscription/src/www/public/8-developer-publishes-app.png?raw=true) |
|:---------------------------------------------------------------------------------------------------------------:|
| Developer publishes app on store |

| ![Developer views app's subscription administration](./hastebin-app-store-subscription/src/www/public/9-developer-views-apps-subscription-administration.png?raw=true) |
|:---------------------------------------------------------------------------------------------------------------:|
| Developer views app's subscription administration |

| ![Developer creates and publishes product](./hastebin-app-store-subscription/src/www/public/10-developer-creates-product.png?raw=true) |
|:---------------------------------------------------------------------------------------------------------------:|
| Developer creates and publishes product |

| ![Developer creates and publishes plan](./hastebin-app-store-subscription/src/www/public/11-developer-creates-plan.png?raw=true) |
|:---------------------------------------------------------------------------------------------------------------:|
| Developer creates and publishes plan |

| ![First user installs app for organization](./hastebin-app-store-subscription/src/www/public/12-first-user-installs-app-for-organization.png?raw=true) |
|:---------------------------------------------------------------------------------------------------------------:|
| First user installs app for organization |

| ![Second user installs app for organization](./hastebin-app-store-subscription/src/www/public/13-second-user-installs-app-for-organization.png?raw=true) |
|:---------------------------------------------------------------------------------------------------------------:|
| Second user installs app for organization |

| ![Second user creates a post shared with organization](./hastebin-app-store-subscription/src/www/public/14-second-user-creates-shared-post.png?raw=true) |
|:---------------------------------------------------------------------------------------------------------------:|
| Second user creates a post shared with organization |

| ![First user views post](./hastebin-app-store-subscription/src/www/public/15-first-user-views-shared-post.png?raw=true) |
|:---------------------------------------------------------------------------------------------------------------:|
| First user views post |

| ![Developer views subscriptions](./hastebin-app-store-subscription/src/www/public/16-developer-views-subscriptions.png?raw=true) |
|:---------------------------------------------------------------------------------------------------------------:|
| Developer views subscriptions |
              
              
## Part one:  General compatibility requirements

  1.  The hastebin project uses a static folder for its assets that are served at `/`.  Remapping that to `/public` lets the files be served faster because Dashboard serves that folder without authenticating the user.  This matters a lot if you have many static assets.

  2.  The HTML markup will be served to the user in an `IFRAME` `srcdoc`.  Care must be taken to use " instead of ' in your HTML markup so the srcdoc can inline your page.

    srcdoc='<html><head>title> only use " </title></head><body></html>'

  3.  When running on an app store in an `IFRAME` browser security restrictions apply that prevent accessing `history.pushState`, `localStorage`, `sessionStorage`, and more, and there is no `document.location` because of the `srcdoc` entry point. 

    <iframe sandbox="allow-same-origin allow-forms allow-scripts allow-popups">

## Part two:  Updating the server

  1.  The Connect server handles all `hastebin` routes for the application.  Connect is compatible with Express so the `express-application-server` middleware is added, it verifies requests come from your own dashboard server or an authorized app store.  Adding it to the `server.js` requires binding it to each HTTP method.

    const applicationServer = require('@userdashboard/express-application-server')
    app.use(applicationServer)

  2.  The middleware only identifies if the request came from your dashboard server or an authorized app store, it does not end requests if they are invalid.  In the `server.js` each request has to be modified to include a check and authorization error when accessed incorrectly.

    router.get('/raw/:id', (req, res) => {
      if(!req.subscriptionid) {
        res.setHeader('content-type', 'text/plain')
        res.statusCode = 511
        return res.end()
      }
      ...
    })

  3.  Dashboard requires `/home` be the application's signed-in page because `index.html` is reserved as a landing page for guests when you run your own Dashboard server.

    if (req.url === '/home' || req.url.startsWith('/home?')) {
      res.setHeader('content-type', 'text/html')
      res.end(homePage)
      return next()
    }

## Part three:  Extending the Document API

The `document.js` provides a document API for creating and retrieving documents to storage.  The `hastebin` project already supported reading and writing documents but it needs to also support deleting and listing.

  1.  The `document.js` needs to support listing your posts:

    async function list (key, req) {
      const dashboardKey = req.dashboard.split('://')[1]
      const folder = `${basePath}/${dashboardKey}/${key}`
      if (!fs.existsSync(folder)) {
        return null
      }
      const list = await fsa.readDir(`${basePath}/${dashboardKey}/${key}`, 'utf8')
      if (!list || !list.length) {
        return null
      }
      for (const n in list) {
        list[n] = await load(list[n], req)
      }
      return list
    }

  2.  The `document.js` now needs to create posts with added metadata and indexing and only if you're within your quota:

    async function checkQuota (req) {
      const personal = await list(`account/${req.accountid}`, req) 
      if (!req.organizationid) {
        return { 
          unusedPersonalQuota: !personal || personal.length < 1000 
        }
      }
      const organization = await list(`organization/${req.organizationid}`, req)
      return {
        unusedPersonalQuota: !personal || personal.length < 1000,
        unusedOrganizationQuota: !organization || organization.length < 1000
      }
    }

    async function create (req) {
      if (!req.body || !req.body.document || !req.body.document.length) {
        throw new Error('invalid-document')
      }
      if (req.body.organization && !req.organizationid) {
        throw new Error('invalid-document-owner')
      }
      if (global.maxLength && req.body.document.length > global.maxLength) {
        throw new Error('invalid-document-length')
      }
      const quota = await checkQuota(req)
      if (req.body.organization && !quota.unusedOrganizationQuota) {
        throw new Error('organization-quota-exceeded')
      } else if (!req.body.organization && !quota.unusedPersonalQuota) {
        throw new Error('personal-quota-exceeded')
      }
      const dashboardKey = req.dashboard.split('://')[1]
      if (req.body.customid) { 
        try {
          const existing = await load(req.body.customid, req)
          if (existing) {
            throw new Error('duplicate-document-id')
          }
        } catch (error) {
        }
      }
      const key = req.body.customid || await generateUniqueKey(req)
      const object = {
        accountid: req.accountid,
        created: Math.floor(new Date().getTime() / 1000),
        key: key
      }
      if (req.body.public) {
        object.public = true
      }
      if (req.body.organization) {
        object.organizationid = req.organizationid
      }
      if (req.body.language) {
        object.language = req.body.language
      }
      createFolder(`${basePath}/${dashboardKey}`)
      await fsa.writeFile(`${basePath}/${dashboardKey}/${md5(key)}`, JSON.stringify(object), 'utf8')
      await fsa.writeFile(`${basePath}/${dashboardKey}/${md5(key)}.raw`, req.body.document)
      createFolder(`${basePath}/${dashboardKey}/account/${req.accountid}`)
      await fsa.writeFile(`${basePath}/${dashboardKey}/account/${req.accountid}/${key}`, JSON.stringify(object))
      if (req.body.organization) {
        createFolder(`${basePath}/${dashboardKey}/organization/${req.organizationid}`)
        await fsa.writeFile(`${basePath}/${dashboardKey}/organization/${req.organizationid}/${key}`, JSON.stringify(object))
      }
      return object
    }

  3.  The `document.js` needs to remove posts:

    async function remove (key, req) {
      const object = await load(key, req)
      if (object.accountid !== req.accountid) {
        throw new Error('invalid-document')
      }
      const dashboardKey = req.dashboard.split('://')[1]
      if (fs.existsSync(`${basePath}/${dashboardKey}/account/${req.accountid}/${key}`)) {
        await fsa.unlink(`${basePath}/${dashboardKey}/account/${req.accountid}/${key}`)
      }
      if (json.organizationid) {
        if (fs.existsSync(`${basePath}/${dashboardKey}/organization/${req.organizationid}/${key}`)) {
          await fsa.unlink(`${basePath}/${dashboardKey}/organization/${req.organizationid}/${key}`)
        }
      }
      await fsa.unlink(`${basePath}/${dashboardKey}/${md5(key)}`)
    }

## Part four: Extending the HTTP server

The HTTP API in `server.js` uses the document API in `document.js` to save and retrieve the user's posts from storage.  The `server.js` already supports creating and retrieving, it just needs additions for deleting and listing.  The original `hastebin` allowed access to all posts via public URL, that isn't possible on app stores so it is mitigated by optionally sharing the posts on a secondary domain `PUBLIC_DOMAIN`.

  1.  The `server.js` needs a route for listing documents:

    router.get('/documents', function (req, res) {
      if(!req.subscriptionid) {
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

  2.  The `server.js` needs a route for listing organization documents:

    router.get('/documents/organization', function (req, res) {
      if(!req.subscriptionid) {
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

  3.  The `server.js` needs a route for deleting documents:

    router.delete('/documents/:id', function (req, res) {
      if(!req.subscriptionid) {
        return dashboardError(res)
      }
      const key = req.params.id.split('.')[0]
      let deleted
      try {
        deleted = await Document.handleDelete(key, req)
      } catch (error) {
      }
      if (!deleted) {
        res.writeHead(500, { 'content-type': 'application/json' })
        return res.end(`{ "message": "An invalid document was provided" }`)  
      }
      res.writeHead(200, { 'content-type': 'application/json' })
      return res.end()
    })

  4.  The `server.js` needs a route for accessing public documents and a static page to render it in:

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

  5.  The `server.js` needs a route for downloading public documents:

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


## Part five:  The new HTML interface

The original layout was a textarea, with a logo and strip of icons for saving/copying posts.  A new interface was created with the additional options.

  1.  Tabbed navigation was added to access creating new posts and the personal and organization post lists.  The navigation hides the organization link when not applicable.

    <menu>
      <button id="create-button">Create new post</button>
      <div><button id="list-button">My posts</button></div>
      <div><button id="organization-list-button">Organization posts</button></div>
    </menu>

  2.  Tables were added listing your posts and their general configuration, along with an optionally-concealed column showing if they are shared with your organization.

    <section id="list">
      <h2>Posts</h2>
      <table id="list-table">
        <thead>
          <tr>
            <th>Key</th>
            <th>Created</th>
            <th id="organization-column">Organization</th>
            <th>Public link</th>
            <th></th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </section>

    <section id="organization-list">
      <h2>Organization posts</h2>
      <table id="organization-list-table">
        <thead>
          <tr>
            <th>Created</th>
            <th>Key</th>
            <th>Public link</th>
            <th id="organization-column">Organization</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </section>

  3.  Information was added to distinguishing between viewing your own post, your own post shared with an organization, and a post shared with an organization.

    <li id="view">
      <h2>Viewing my post <span id="postid-1"></span></h2>
    </li>
    <li id="view-organization">
      <h2>Viewing <span id="postid-2"></span> shared with organization</h2>
    </li>
    <li id="view-organization-post-owner">
      <h2>Viewing my post <span id="postid-3"></span> shared with organization</h2>
    </li>

  4.  Settings were added when creating posts to select a language, allow posts to be publicly accessible via URL, owned by an organization, and use custom keys.

    <button id="save">Save post</button>
    <input id="customid" type="text" value="" placeholder="random filename" size="5" />
    <select id="language">
      <option>Select language (default text)</option>
      <option value="bash">Bash</option>
      <option value="coffee">Coffee</option>
      <option value="cpp">C++</option>
      <option value="css">CSS</option>
      <option value="pas">Delphi</option>
      <option value="diff">Diff</option>
      <option value="erl">Erlang</option>
      <option value="go">Go</option>
      <option value="hs">Haskell</option>
      <option value="html">HTML</option>
      <option value="ini">INI</option>
      <option value="java">Java</option>
      <option value="js">JavaScript</option>
      <option value="json">JSON</option>
      <option value="lisp">Lisp</option>
      <option value="lua">Lua</option>
      <option value="md">MarkDown</option>
      <option value="m">Objective C</option>
      <option value="php">PHP</option>
      <option value="pl">Perl</option>
      <option value="py">Python</option>
      <option value="rb">Ruby</option>
      <option value="scala">Scala</option>
      <option value="sm">SmallTalk</option>
      <option value="sql">SQL</option>
      <option value="swift">Swift</option>
      <option value="tex">Tex</option>
      <option value="txt">Text</option>
      <option value="vala">Vala</option>
      <option value="vbs">VBScript</option>
      <option value="xml">XML</option>
    </select>
    <label><input id="public" type="checkbox"> Publicly accessible</label>
    <label><input id="shared" type="checkbox"> Shared with organization</label>

## Part six:  JavaScript for the new interface

The HTML interface is controlled by JavaScript in `app.js`.  Since the HTML is primarily new markup it required mostly new code.

  1.  `app.js` needed to list your documents and your organizations' on page load:

    function listPosts(organization) {
      var path = '/documents'
      if (window.user && window.user.installid) {
        path = '/install/' + window.user.installid + path
      }
      if (organization) {
        path += '/' + organization
      }
      return send(path, null, 'GET', function (error, posts) {
        if (error) {
          return showMessage(error.message, 'error')
        }
        if (!window.user.organizationid) {
          document.getElementById('organization-column').style.display = 'none'
        }
        if (posts && posts.length) {
          for (i = 0, len = posts.length; i < len; i++) {
            renderPostRow(!organization, posts[i])
          }
        }
      })
    }

  2.  `app.js` needed to render your post lists to `home.html`'s list tables:

    function renderPostRow(personal, meta) {
      var table = document.getElementById(personal ? 'list-table' : 'organization-list-table')
      var row = table.insertRow(table.rows.length)
      var keyLink = document.createElement('a')
      keyLink.innerHTML = meta.key
      keyLink.onclick = loadDocument
      keyLink.href = '#'
      var keyCell = row.insertCell(0)
      keyCell.appendChild(keyLink)
      var createdCell = row.insertCell(1)
      createdCell.innerHTML = new Date(meta.created * 1000)
      var nextCell = 2
      if (personal && window.user.organizationid) {
        var organizationCell = row.insertCell(2)
        if (meta.organizationid) {
          organizationCell.innerHTML = 'yes'
        }
        nextCell = 3
      }
      var publicCell = row.insertCell(nextCell)
      if (meta.public) {
        var publicLink = document.createElement('a')
        publicLink.href = 'https://' + window.publicDomain + '/document/' + window.user.dashboard.split('://')[1] + '/' + meta.key
        publicLink.innerHTML = 'yes'
        publicLink.target = '_blank'
        publicCell.appendChild(publicLink)
      }
      if (personal) {
        var deleteCell = row.insertCell(nextCell + 1)
        var deleteButton = document.createElement('button')
        deleteButton.innerHTML = 'delete'
        deleteButton.key = meta.key
        deleteButton.onclick = deletePost
        deleteCell.appendChild(deleteButton)
      }
    }

  3.  `app.js` needs to delete posts:

    function deletePost(event) {
      var button = event.target
      var path = '/document/' + button.key
      if (window.user && window.user.installid) {
        path = '/install/' + window.user.installid + path
      }
      return send(path, null, 'DELETE', function (error) {
        if (error) {
          return showMessage(error.message, 'error')
        }
        elements.box.style.display = 'none'
        elements.textarea.value = ''
        elements.textarea.style.display = 'block'
        elements.textarea.focus()
        removeLineNumbers()
        return showMessage(error.message, 'success')
      })
    }

  4.  `app.js` needs to save posts:

    function saveNewDocument() {
      var postSettings = {}
      if (window.user.organizationid) {
        var organization = elements.shared = elements.shared || document.getElementById('shared')
        if (organization.checked) {
          postSettings.organization = 'true'
        }
      }
      var public = elements.public = elements.public || document.getElementById('public')
      if (public.checked) {
        postSettings.public = true
      }
      var customid
      if(window.user.organizationid) {
        customid = elements['customid-2'] = elements['customid-2'] || document.getElementById('customid-2')
      } else {
        customid = elements['customid-1'] = elements['customid-1'] || document.getElementById('customid-1')
      }
      if (customid.value) {
        postSettings.customid = customid.value
      }
      if (!elements.textarea.value || !elements.textarea.value.length) {
        return showMessage('No document to save', 'error')
      }
      if (elements.language.selectedIndex > 0) {
        postSettings.language = elements.language.options[elements.language.selectedIndex].value
      }
      postSettings.document = encodeURI(elements.textarea.value)
      return send('/install/' + window.user.installid + '/document', postSettings, 'POST', function (error, result) {
        if (error) {
          return showMessage(error.message, 'error')
        }
        renderPostRow(!postSettings.organization, result)
        return showPostContents(result)
      })
    }

  5.  `app.js` needs to disply posts when they are created and loaded from clicking links:

    function showPostContents(post) {
      if (!post.organizationid) {
        elements['view'].style.display = ''
        elements['view-organization'].style.display = 'none'
        elements['view-organization-post-owner'].style.display = 'none'
        elements['postid-1'].innerHTML = post.key
        elements['delete-1'].key = post.key
      } else if (post.accountid === window.user.accountid) {
        elements['view'].style.display = 'none'
        elements['view-organization'].style.display = 'none'
        elements['view-organization-post-owner'].style.display = ''
        elements['postid-3'].innerHTML = post.key
        elements['delete-3'].key = post.key
      } else {
        elements['view'].style.display = 'none'
        elements['view-organization'].style.display = ''
        elements['view-organization-post-owner'].style.display = 'none'
        elements['postid-2'].innerHTML = post.key
      }
      var high
      try {
        if (post.language === 'txt') {
          high = { value: htmlEscape(post.document) }
        }
        else if (post.language === 'html') {
          high = hljs.highlight('html', htmlEscape(post.document))
        }
        else if (post.language) {
          high = hljs.highlight(post.language, post.document)
        }
        else {
          high = hljs.highlightAuto(post.document)
        }
      } catch (error) {
        high = hljs.highlightAuto(post.document)
      }
      elements['post-preview'].firstChild.innerHTML = high.value
      elements['post-preview'].focus()
      addLineNumbers(post.document.split('\n').length)
      return showContent('post-content')
    }

  6.  `app.js` needs to toggle interface elements depending on what you are viewing:

    function showContent(type) {
      // active content button
      elements['create-button'].className = type === 'post-creator' ? 'active' : ''
      elements['list-button'].className = type === 'list' ? 'active' : ''
      elements['organization-list-button'].className = type === 'organization-list' ? 'active' : ''
      // active content type
      elements['list'].style.display = type === 'list' ? 'block' : 'none'
      elements['organization-list'].style.display = type === 'organization-list' ? 'block' : 'none'
      elements['post-content'].style.display = type === 'post-content' ? 'block' : 'none'
      elements['post-creator'].style.display = type === 'post-creator' ? 'block' : 'none'
    }

# Part seven:  Starting the application server

The application server needs to be started, and it will be accessible at http://localhost:3000
    
    $ AUTHORIZE_APP_STORE_1=userappstore.com
      APPLICATION_SERVER_1_TOKEN="get while claiming server" \
      node main.js
