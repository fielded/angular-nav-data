const pluckDocs = (item) => {
  return item.doc
}

const parseAllDocsResponse = (response) => {
  return response.rows.map(pluckDocs)
}

export default class UtilsService {
  allDocs (db, options) {
    return db.allDocs(options)
            .then(parseAllDocsResponse)
  }
}
