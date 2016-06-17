'use strict'

describe('productsService', function () {
  var productsService
  var testMod // eslint-disable-line

  beforeEach(function () {
    testMod = angular.module('testMod', ['angularNavData']).value('dataModuleRemoteDB', 'testDBName')
  })

  beforeEach(module('testMod'))

  beforeEach(inject(function (_productsService_) {
    productsService = _productsService_
  }))

  it('should be defined', function () {
    expect(productsService).toBeDefined()
  })

  it('should expose a startReplication function', function () {
    expect(productsService.startReplication).toBeDefined()
  })

  it('should expose a registerOnReplicationCompleteCallback function', function () {
    expect(productsService.registerOnReplicationCompleteCallback).toBeDefined()
  })

  it('should expose a unregisterOnReplicationCompleteCallback function', function () {
    expect(productsService.unregisterOnReplicationCompleteCallback).toBeDefined()
  })

  it('should expose an allDocs function', function () {
    expect(productsService.allDocs).toBeDefined()
  })
})
