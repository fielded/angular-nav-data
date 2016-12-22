'use strict'

// TODO: set up via couchdb-bootstrap
var designDoc = {
  _id: '_design/locations',
  filters: {
    'by-level': function (doc, req) {
      var locationPattern = '^zone:' + req.query.zone
      var matchLocation = doc._id.match(new RegExp(locationPattern))
      return doc.type === 'location' && matchLocation
    }.toString()
  }
}

describe('locationsService', function () {
  var url = window.__env__.COUCHDB_URL || 'http://localhost:5984/test'
  var pouchDB
  var localDb
  var remoteDb
  var locationsService

  beforeAll(function () {
    angular.module('testModule', ['angularNavData'])
      .value('dataModuleRemoteDB', url)

    var $injector = angular.injector(['ng', 'testModule'])
    pouchDB = $injector.get('pouchDB')
    locationsService = $injector.get('locationsService')
  })

  beforeAll(function (done) {
    pouchDB(url)
      .destroy()
      .then(function () {
        remoteDb = pouchDB(url)
        return remoteDb.put(designDoc)
      })
      .then(function () {
        return remoteDb.put({
          _id: 'zone:foo',
          type: 'location',
          prop: 'bar',
          updatedAt: '2016-12-22T21:24:00.000Z'
        })
      })
      .then(done)
      .catch(function (err) {
        console.error(err)
      })
  })

  beforeAll(function (done) {
    var name = 'navIntLocationsDB'
    pouchDB(name)
      .destroy()
      .then(function () {
        localDb = pouchDB(name)
        return localDb.put({
          _id: 'zone:foo',
          type: 'location',
          prop: 'baz',
          updatedAt: '1970-01-01T00:00:00.000Z'
        })
      })
      .then(done)
      .catch(function (err) {
        console.error(err)
      })
  })

  it('should handle conflicts', function (done) {
    function assert() {
      return localDb.get('zone:foo', {
        conflicts: true
      })
      .then(function (doc) {
        expect(doc._conflicts.length).toBe(0)
        expect(doc.prop).toBe('bar')
        done()
      })
      .catch(function (err) {
        console.error(err)
      })
    }

    locationsService.callOnReplicationComplete('test', assert)
    locationsService.startReplication('foo')
  })
})
