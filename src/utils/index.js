exports.bulkForceInsert = (localDB, remoteDB, id) => {
  const opts = {
    include_docs: true,
    startkey: id,
    endkey: `${id}\uffff`
  }
  return remoteDB.allDocs(opts)
    .then(res => res.rows.map(row => row.doc))
    .then(docs => localDB.bulkDocs(docs, {
      new_edits: false
    }))
}
