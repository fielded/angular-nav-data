'use strict'

describe('lgasService', function () {
  var lgasService
  var testMod // eslint-disable-line

  beforeEach(function () {
    testMod = angular.module('testMod', ['angularNavData']).value('dataModuleRemoteDB', 'testDBName')
  })

  beforeEach(module('testMod'))

  beforeEach(inject(function (_lgasService_) {
    lgasService = _lgasService_
  }))

  it('should be defined', function () {
    expect(lgasService).toBeDefined()
  })

  describe('setState', function () {
    it('should set the default state and zone', function () {
      lgasService.setState('nc', 'kogi')
      expect(lgasService.defaultZone).toBe('nc')
      expect(lgasService.defaultState).toBe('kogi')
    })
  })

  it('should expose a byState function', function () {
    expect(lgasService.byState).toBeDefined()
  })

  it('should expose an idsByState function', function () {
    expect(lgasService.idsByState).toBeDefined()
  })
})
