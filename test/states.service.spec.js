'use strict'

describe('statesService', function () {
  var statesService
  var testMod // eslint-disable-line

  beforeEach(function () {
    testMod = angular.module('testMod', ['angularNavData']).value('dataModuleRemoteDB', 'testDBName')
  })

  beforeEach(module('testMod'))

  beforeEach(inject(function (_statesService_) {
    statesService = _statesService_
  }))

  it('should be defined', function () {
    expect(statesService).toBeDefined()
  })

  describe('setZone', function () {
    it('should set the default zone', function () {
      statesService.setZone('nc')
      expect(statesService.defaultZone).toBe('nc')
    })
  })

  it('should expose a byZone function', function () {
    expect(statesService.byZone).toBeDefined()
  })

  it('should expose an idsByZone function', function () {
    expect(statesService.idsByZone).toBeDefined()
  })
})
