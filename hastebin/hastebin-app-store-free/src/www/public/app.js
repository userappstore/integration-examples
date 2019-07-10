var elements = {}

window.onload = function () {
  var cacheElements = [
    /* navigation */     'create-button', 'list-button', 'organization-list-button',
    /* content */        'list', 'organization-list', 'post-content', 'post-creator',
    /* viewing posts  */ 'view', 'view-organization', 'view-organization-post-owner', 'postid-1', 'postid-2', 'postid-3', 'line-numbers', 'post-preview', 'delete-1', 'delete-3',
    /* listing posts  */ 'list-table', 'organization-list-table', 'no-posts-1', 'no-posts-2',
    /* creating posts */ 'post-textarea', 'customid', 'language', 'public', 'shared', 'save']
  for (i = 0, len = cacheElements.length; i < len; i++) {
    elements[cacheElements[i]] = document.getElementById(cacheElements[i])
  }
  // main navigation buttons
  elements['create-button'].onclick = function () {
    elements['post-textarea'].value = ''
    elements['post-textarea'].focus()
    elements['language'].selectedIndex = 0
    elements['customid'].value = ''
    return showContent('post-creator')
  }
  elements['list-button'].onclick = function () {
    if (elements['list-table'].rows.length === 1) {
      elements['list-table'].style.display = 'none'
      elements['no-posts-1'].style.display = ''
    } else {
      elements['list-table'].style.display = ''
      elements['no-posts-1'].style.display = 'none'
    }
    return showContent('list')
  }
  if (window.user.organizationid) {
    elements['organization-list-button'].onclick = function () {
      if (elements['organization-list-table'].rows.length === 1) {
        elements['organization-list-table'].style.display = 'none'
        elements['no-posts-2'].style.display = ''
      } else {
        elements['organization-list-table'].style.display = ''
        elements['no-posts-2'].style.display = 'none'
      }
      return showContent('organization-list')
    }
  } else {
    elements['organization-list-button'].style.display = 'none'
    elements['shared'].parentNode.style.display = 'none'
  }
  // other content buttons
  elements['save'].onclick = saveNewDocument
  elements['delete-1'].onclick = deletePost
  elements['delete-3'].onclick = deletePost
  // clear default text when clicking textarea
  elements['post-textarea'].onclick = function () {
    if (this.value === 'Paste your text here...') {
      this.value = ''
    }
  }
  elements['language'].onchange = function () {
    var extension = this.value
    if(!extension) {
      return
    }
    var newid = elements['customid'].value
    var oldPeriod = newid.indexOf('.')
    if (oldPeriod > -1) {
      newid = newid.substring(0, oldPeriod)
    }
    newid += '.' + extension
    elements['customid'].value = newid
  }
  // sets up your own posts with delete options
  listPosts()
  // sets up your organization's posts 
  if (window.user.organizationid) {
    listPosts(window.user.organizationid)
  }
  // display the initial content
  showContent('post-creator')
}

function listPosts(organization) {
  var path = '/documents'
  if (window.user && window.user.installid) {
    path = '/install/' + window.user.installid + path
  }
  if (organization) {
    path += '/organization'
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

function loadDocument(event) {
  event.preventDefault()
  var link = event.target
  var path = '/document/' + link.innerHTML
  if (window.user && window.user.installid) {
    path = '/install/' + window.user.installid + path
  }
  elements['post-preview'].firstChild.innerHTML = ''
  elements['line-numbers'].innerHTML = ''
  return send(path, null, 'GET', function (error, result) {
    if (error) {
      return showMessage(error.message, 'error')
    }
    result.document = decodeURI(result.document)
    return showPostContents(result)
  })
}

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
  if (elements.customid.value) {
    postSettings.customid = elements.customid.value
    // validate here
    var parts = postSettings.customid.split('.')
    if (parts.length > 2) {
      return showMessage('Filenames must be alphanumeric, with optional supported file extensions.')
    } else if (parts.length === 2) {
      if (/[^a-zA-Z0-9]+/.test(parts[0])) {
        return showMessage('Filenames must be alphanumeric, with optional supported file extensions.')
      }
      var extension = parts[parts.length - 1].toLowerCase()
      var found = false
      for(var i = 0, len = elements.language.options.length; i < len; i++) {
        found = elements.language.options[i].value === extension
        if (found) {
          break
        }
      }
      if (!found) {
        return showMessage('An unsupported extension was provided')
      }
    } else {
      if (/[^a-zA-Z0-9]+/.test(parts[0])) {
        return showMessage('Filenames must be alphanumeric, with optional supported file extensions.')
      }
    }
  }
  if (!elements['post-textarea'].value || !elements['post-textarea'].value.length) {
    return showMessage('No document to save', 'error')
  }
  postSettings.document = encodeURI(elements['post-textarea'].value)
  return send('/install/' + window.user.installid + '/document', postSettings, 'POST', function (error, result) {
    if (error) {
      console.log('got new post error', error)
      return showMessage(error.message, 'error')
    }
    renderPostRow(!postSettings.organization, result)
    result.document = decodeURI(postSettings.document)
    return showPostContents(result)
  })
}

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
    var personal = document.getElementById('personal-' + button.key)
    if (personal) {
      personal.parentNode.removeChild(personal)
      if (elements['list-table'].rows.length === 1) {
        elements['list-table'].style.display = 'none'
        elements['no-posts-1'].style.display = ''
      } else {
        elements['list-table'].style.display = ''
        elements['no-posts-1'].style.display = 'none'
      }
    }
    var organization = document.getElementById('organization-' + button.key)
    if (organization) {
      organization.parentNode.removeChild(organization)
      if (elements['organization-list-table'].rows.length === 1) {
        elements['organization-list-table'].style.display = 'none'
        elements['no-posts-2'].style.display = ''
      } else {
        elements['organization-list-table'].style.display = ''
        elements['no-posts-2'].style.display = 'none'
      }
    }
    showContent('list')
    return showMessage('Key deleted successfully', 'success')
  })
}

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

function renderPostRow(personal, meta) {
  var table = document.getElementById(personal ? 'list-table' : 'organization-list-table')
  var row = table.insertRow(table.rows.length)
  row.id = (personal ? 'personal-' : 'organization-') + meta.key
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

function htmlEscape(s) {
  return s.replace(/&/g, '&amp;').replace(/>/g, '&gt;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
}

function showMessage(message, css) {
  console.log('showMessage', message, css)
  throw new Error()
}

function addLineNumbers (lineCount) {
  var h = ['<ol>']
  for (var i = 0; i < lineCount; i++) {
    h.push('<li></li>')
  }
  elements['line-numbers'].innerHTML = h.join('') + '</ol>'
}

function send(url, data, method, callback) {
  var postData
  if (data) {
    postData = new FormData()
    for (var key in data) {
      postData.append(key, data[key])
    }
  }
  var x
  if (window.useXMLHttpRequest || typeof XMLHttpRequest !== 'undefined') {
    window.useXMLHttpRequest = true
    x = new window.XMLHttpRequest()
  } else if (window.compatibleActiveXObject !== null) {
    x = new window.ActiveXObject(window.compatibleActiveXObject)
  } else {
    var xhrversions = ['MSXML2.XmlHttp.5.0', 'MSXML2.XmlHttp.4.0', 'MSXML2.XmlHttp.3.0', 'MSXML2.XmlHttp.2.0', 'Microsoft.XmlHttp']
    for (var i = 0, len = xhrversions.length; i < len; i++) {
      try {
        x = new window.ActiveXObject(xhrversions[i])
        window.compatibleActiveXObject = xhrversions[i]
      } catch (e) { }
    }
  }
  x.open(method, url, true)
  x.onreadystatechange = function () {
    if (x.readyState !== 4) {
      return
    }
    if (!x.responseText) {
      return callback()
    }
    switch (x.status) {
      case 200:
        var json
        try {
          json = JSON.parse(x.responseText)
          return callback(null, json)
        } catch (error) {
          return callback(error)
        }
      case 500:
        var json
        try {
          json = JSON.parse(x.responseText)
          return callback(new Error(json.message))
        } catch (error) {
          return callback(error)
        }
    }
  }
  x.send(postData)
}
