const fs = require('fs')
const crypto = require('crypto')
const path = require('path')
const util = require('util')
const validExtensions = [
  'bash', 'coffee', 'cpp', 'css', 'pas',
  'diff', 'erl', 'go', 'hs', 'html', 'ini',
  'java', 'js', 'json', 'lisp', 'lua', 'md',
  'm', 'php', 'pl', 'py', 'rb', 'scala', 
  'sm', 'sql', 'swift', 'tex', 'txt', 'vala',
  'vbs', 'xml'
]

const fsa = {
  readDir: util.promisify(fs.readdir),
  readFile: util.promisify(fs.readFile),
  unlink: util.promisify(fs.unlink),
  writeFile: util.promisify(fs.writeFile)
}

const basePath = process.env.BASE_PATH || path.join(__dirname, 'data')
createFolder(basePath)

module.exports = {
  create,
  load,
  list,
  remove
}

async function load (key, req) {
  const dashboardKey = req.dashboard.split('://')[1]
  const filename = `${basePath}/${dashboardKey}/${md5(key)}`
  if (!fs.existsSync(filename)) {
    throw new Error('invalid-key')
  }
  createFolder(filename.substring(0, filename.lastIndexOf('/')))
  let object = await fsa.readFile(filename, 'utf8')
  if (!object || !object.length) {
    throw new Error('invalid-document')
  }
  try {
    json = JSON.parse(object)
  } catch (error){
  }
  if (!json) {
    throw new Error('invalid-document')
  }
  json.document = await fsa.readFile(filename + '.raw')
  return json
}

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
    let metadata = await fsa.readFile(`${basePath}/${dashboardKey}/${key}/${list[n]}`)
    metadata = JSON.parse(metadata)
    list[n] = await load(metadata.key, req)
  }
  return list
}

async function remove (key, req) {
  const object = await load(key, req)
  if (object.accountid !== req.accountid) {
    throw new Error('invalid-document')
  }
  var md5Key = md5(key)
  const dashboardKey = req.dashboard.split('://')[1]
  if (fs.existsSync(`${basePath}/${dashboardKey}/account/${req.accountid}/${md5Key}`)) {
    await fsa.unlink(`${basePath}/${dashboardKey}/account/${req.accountid}/${md5Key}`)
  }
  if (json.organizationid) {
    if (fs.existsSync(`${basePath}/${dashboardKey}/organization/${req.organizationid}/${md5Key}`)) {
      await fsa.unlink(`${basePath}/${dashboardKey}/organization/${req.organizationid}/${md5Key}`)
    }
  }
  await fsa.unlink(`${basePath}/${dashboardKey}/${md5Key}`)
  return true
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
    const parts = req.body.customid.split('.')
    if (parts.length > 2) {
      throw new Error('invalid-filename')
    } else if (parts.length === 2) {
      if (/[^a-zA-Z0-9]+/.test(parts[0])) {
        throw new Error('invalid-filename')
      }
      const extension = parts[parts.length - 1].toLowerCase()
      if (validExtensions.indexOf(extension) === -1) {
        throw new Error('invalid-filename-extension')
      }
    } else {
      if (/[^a-zA-Z0-9]+/.test(parts[0])) {
        throw new Error('invalid-filename')
      }
    }
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
  var md5Key = md5(key)
  createFolder(`${basePath}/${dashboardKey}`)
  await fsa.writeFile(`${basePath}/${dashboardKey}/${md5Key}`, JSON.stringify(object), 'utf8')
  await fsa.writeFile(`${basePath}/${dashboardKey}/${md5Key}.raw`, req.body.document)
  createFolder(`${basePath}/${dashboardKey}/account/${req.accountid}`)
  await fsa.writeFile(`${basePath}/${dashboardKey}/account/${req.accountid}/${md5Key}`, JSON.stringify(object))
  if (req.body.organization) {
    createFolder(`${basePath}/${dashboardKey}/organization/${req.organizationid}`)
    await fsa.writeFile(`${basePath}/${dashboardKey}/organization/${req.organizationid}/${md5Key}`, JSON.stringify(object))
  }
  return object
}

async function generateUniqueKey (req) {
  const keyspace = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  while(true) {
    let text = ''
    for (let i = 0; i < global.keyLength; i++) {
      const index = Math.floor(Math.random() * keyspace.length)
      text += keyspace.charAt(index)
    }
    try {
      await load(key, req)
    } catch (error) {
      return text
    }
  }
}

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

function createFolder(path) {
  const nested = path.substring(1)
  const nestedParts = nested.split('/')
  let nestedPath = ''
  for (const part of nestedParts) {
    nestedPath += `/${part}`
    const exists = fs.existsSync(nestedPath)
    if (exists) {
      continue
    }
    fs.mkdirSync(nestedPath)
  }
}

function md5(str) {
  const md5sum = crypto.createHash('md5')
  md5sum.update(str)
  return md5sum.digest('hex')
}
