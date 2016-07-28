'use strict'

describe('zonesService', function () {
  var zonesService
  var testMod // eslint-disable-line

  beforeEach(function () {
    testMod = angular.module('testMod', ['angularNavData']).value('dataModuleRemoteDB', 'testDBName')
  })

  beforeEach(module('testMod'))

  beforeEach(inject(function (_zonesService_) {
    zonesService = _zonesService_
  }))

  it('should be defined', function () {
    expect(zonesService).toBeDefined()
  })

  it('should expose an all function', function () {
    expect(zonesService.all).toBeDefined()
  })

  it('should expose an ids function', function () {
    expect(zonesService.ids).toBeDefined()
  })

  it('should expose a get function', function () {
    expect(zonesService.get).toBeDefined()
  })
})
