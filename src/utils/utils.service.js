const pluckDocs = (item) => {
  return item.doc
}

const isDefined = (doc) => {
  return typeof doc !== 'undefined'
}

const parseResponse = (response) => {
  return response.rows
          .map(pluckDocs)
          .filter(isDefined)
}

export default class UtilsService {
  allDocs (db, options) {
    return db.allDocs(options)
            .then(parseResponse)
  }

  query (db, view, options) {
    return db.query(view, options)
            .then(parseResponse)
  }

  callEach (callbacks) {
    const call = (id) => callbacks[id]()
    Object.keys(callbacks).forEach(call)
  }

  isEmptyObject (obj) {
    return !Object.keys(obj).length
  }

  isIndexedCacheEmpty (cache, field) {
    let isCompletelyEmpty = this.isEmptyObject(cache)

    if (!isCompletelyEmpty && field) {
      return (!cache[field] || !cache[field].length)
    }
    return isCompletelyEmpty
  }

  toArray (obj) {
    return Object.keys(obj).reduce((array, key) => {
      return array.concat(obj[key])
    }, [])
  }
}
