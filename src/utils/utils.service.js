const pluckDocs = (item) => {
  return item.doc
}

const isDefined = (doc) => {
  return typeof doc !== 'undefined'
}

const parseAllDocsResponse = (response) => {
  return response.rows
          .map(pluckDocs)
          .filter(isDefined)
}

export default class UtilsService {
  allDocs (db, options) {
    return db.allDocs(options)
            .then(parseAllDocsResponse)
  }

  callEach (callbacks) {
    const call = (id) => callbacks[id]()
    Object.keys(callbacks).forEach(call)
  }
}
