'use strict'

describe('locationsService', function () {
  var locationsService
  var testMod // eslint-disable-line

  beforeEach(function () {
    testMod = angular.module('testMod', ['angularNavData']).value('dataModuleRemoteDB', 'testDBName')
  })

  beforeEach(module('testMod'))

  beforeEach(inject(function (_locationsService_) {
    locationsService = _locationsService_
  }))

  it('should be defined', function () {
    expect(locationsService).toBeDefined()
  })

  it('should expose a startReplication function', function () {
    expect(locationsService.startReplication).toBeDefined()
  })

  it('should expose a registerOnReplicationCompleteCallback function', function () {
    expect(locationsService.registerOnReplicationCompleteCallback).toBeDefined()
  })

  it('should expose an allDocs function', function () {
    expect(locationsService.allDocs).toBeDefined()
  })
})
