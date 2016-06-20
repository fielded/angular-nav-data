'use strict'

describe('lgasService', function () {
  var $rootScope
  var lgasService
  var testMod // eslint-disable-line

  beforeEach(function () {
    testMod = angular.module('testMod', ['angularNavData']).value('dataModuleRemoteDB', 'testDBName')
  })

  beforeEach(module('testMod'))

  beforeEach(inject(function (_$rootScope_, _lgasService_) {
    $rootScope = _$rootScope_
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

  it('should expose a get function', function () {
    expect(lgasService.get).toBeDefined()
  })

  xit('should be able to return a single lga with `get`', function (done) {
    var id = 'zone:nc:state:kogi:lga:adavi'
    lgasService.cachedLgasByState['kogi'] = [{ _id: id }, {_id: 'b'}]
    lgasService.get(id)
      .then(function (lga) {
        expect(lga).toEqual({ _id: id })
      })
    $rootScope.$digest()
    done()
  })
})
