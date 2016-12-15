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

class UtilsService {
  constructor (smartId) {
    this.smartId = smartId
  }

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

  groupByLevel (locations, level) {
    return locations.reduce((index, location) => {
      const area = this.smartId.parse(location._id)[level]
      index[area] = index[area] || []
      index[area].push(location)
      return index
    }, {})
  }

  checkAndResolveConflicts (changedDoc, pouchdb) {
    let preferredRevision = {}
    if (!changedDoc._conflicts) {
      return
    }

    if (!changedDoc.updatedAt) {
      preferredRevision = changedDoc
      changedDoc._conflicts.map((conflictingRev) => {
        if (conflictingRev.updatedAt) {
          preferredRevision = conflictingRev
        } else {
          pouchdb.remove(changedDoc._id, conflictingRev._rev)
        }
      })
    } else {
      let serializedRevisions = this.serialiseDocWithConflictsByProp(changedDoc, 'updatedAt')
      preferredRevision = serializedRevisions.pop()
      serializedRevisions.forEach(revision => {
        pouchdb.remove(changedDoc._id, revision)
      })
    }
    pouchdb.put(preferredRevision) // do we still need to PUT after plucking conflicts?
  }

  serialiseDocWithConflicts (Doc, prop) {
    let mainDoc = {}
    let serialisedDocs = []
    Object.keys(Doc).map((prop) => {
      if (prop === '_conflicts') {
        mainDoc[prop] = Doc[prop]
      }
    })
    serialisedDocs = [mainDoc]
      .concat(Doc._conflicts)
      .sort((a, b) => {
        return a[prop] > b[prop]
      })
    return serialisedDocs
  }
}

UtilsService.$inject = ['smartId']

export default UtilsService
