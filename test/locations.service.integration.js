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

function shouldNotBeCalled (rejection) {
  self.fail(rejection)
}

describe('locationsService', function () {
  var url = window.__env__.COUCHDB_URL || 'http://localhost:5984'
  url += '/test-' + Math.random().toString(36).slice(2)

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
    remoteDb = pouchDB(url)
    remoteDb
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
      .catch(shouldNotBeCalled)
  })

  beforeAll(function (done) {
    var name = 'navIntLocationsDB'
    localDb = pouchDB(name)
    localDb
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
      .catch(shouldNotBeCalled)
  })

  it('should handle conflicts', function (done) {
    function assert () {
      return localDb.get('zone:foo', {
        conflicts: true
      })
      .then(function (doc) {
        expect(doc._rev.substring(0, 2)).toBe('3-')
        expect(doc._conflicts).not.toBeDefined() // pouchdb removes empty conflict array
        expect(doc.prop).toBe('bar')
        done()
      })
      .catch(shouldNotBeCalled)
    }

    function upsert (db) {
      return db.get('zone:foo')
        .then(function (doc) {
          return db.put(doc)
        })
    }

    function replicate (cb) {
      locationsService.callOnReplicationComplete('test', cb)
      locationsService.startReplication('foo')
    }

    function update () {
      locationsService.unregisterOnReplicationComplete('test')
      return upsert(localDb)
        .then(replicate.bind(null, assert))
        .catch(shouldNotBeCalled)
    }

    replicate(update)
  })

  afterAll(function (done) {
    remoteDb.destroy()
      .then(done)
      .catch(shouldNotBeCalled)
  })
})
