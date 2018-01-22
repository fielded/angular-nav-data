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

const serialiseDocWithConflictsByProp = (doc, conflicts, prop) => {
  return [doc].concat(conflicts)
    .reduce((arr, obj) => {
      if (obj.ok) {
        arr.push(obj.ok)
      } else {
        arr.push(obj)
      }
      return arr
    }, [])
    .sort((a, b) => {
      if (a[prop] && !b[prop]) {
        return -1
      }
      if (!a[prop] && b[prop]) {
        return 1
      }
      let aSecs = new Date(a.updatedAt).getTime()
      let bSecs = new Date(b.updatedAt).getTime()
      return bSecs - aSecs // highest first
    })
}

class UtilsService {
  constructor ($q, smartId) {
    this.$q = $q
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

  checkAndResolveConflicts ({change: { doc: changedDoc }}, pouchdb) {
    if (!changedDoc._conflicts) {
      return this.$q.resolve()
    }

    return pouchdb.get(changedDoc._id, {'open_revs': changedDoc._conflicts})
      .then(conflictingRevObjs => {
        const serializedRevisions = serialiseDocWithConflictsByProp(changedDoc, conflictingRevObjs, 'updatedAt')

        const winningRevision = angular.extend({}, serializedRevisions[0], {
          _rev: changedDoc._rev,
          _conflicts: []
        })

        const loosingRevisions = serializedRevisions.map(doc => {
          doc._deleted = true
          return doc
        })

        return pouchdb.put(winningRevision)
          .then(() => pouchdb.bulkDocs(loosingRevisions))
      })
  }
}

UtilsService.$inject = [
  '$q',
  'smartId'
]

export default UtilsService
