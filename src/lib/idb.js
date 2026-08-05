// IndexedDB: armazenamento local de conteúdos pesados (anotações com imagens)
// e arquivos anexados (PDFs, ZIPs, códigos...). O localStorage tem limite de
// ~5MB, então tudo que é "pesado" vive aqui — ainda 100% local, sem servidor.

const DB_NAME = 'jahint-studies'
const DB_VERSION = 1

let dbPromise = null

function openDB() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('contents')) db.createObjectStore('contents')
      if (!db.objectStoreNames.contains('files')) db.createObjectStore('files')
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

export async function idbPut(store, key, value) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite')
    tx.objectStore(store).put(value, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function idbGet(store, key) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const req = db.transaction(store, 'readonly').objectStore(store).get(key)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function idbDel(store, key) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite')
    tx.objectStore(store).delete(key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// Remove todas as chaves que começam com um prefixo (ex.: "work:abc:")
export async function idbDelPrefix(store, prefix) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite')
    const range = IDBKeyRange.bound(prefix, prefix + '￿')
    tx.objectStore(store).delete(range)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// Lista todas as entradas [chave, valor] de um store (usado no backup)
export async function idbAllEntries(store) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const os = db.transaction(store, 'readonly').objectStore(store)
    const keysReq = os.getAllKeys()
    keysReq.onsuccess = () => {
      const keys = keysReq.result
      const valsReq = os.getAll()
      valsReq.onsuccess = () => resolve(keys.map((k, i) => [k, valsReq.result[i]]))
      valsReq.onerror = () => reject(valsReq.error)
    }
    keysReq.onerror = () => reject(keysReq.error)
  })
}

export async function storageEstimate() {
  try {
    if (navigator.storage?.estimate) return await navigator.storage.estimate()
  } catch { /* indisponível */ }
  return null
}
