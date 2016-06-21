'use strict'

describe('statesService', function () {
  var $rootScope
  var statesService
  var testMod // eslint-disable-line

  beforeEach(function () {
    testMod = angular.module('testMod', ['angularNavData']).value('dataModuleRemoteDB', 'testDBName')
  })

  beforeEach(module('testMod'))

  beforeEach(inject(function (_$rootScope_, _statesService_) {
    $rootScope = _$rootScope_
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

  it('should expose a get function', function () {
    expect(statesService.get).toBeDefined()
  })

  xit('should be able to return a single state with `get`', function (done) {
    var id = 'zone:nc:state:kogi'
    statesService.cachedLgasByZone['nc'] = [{ _id: id }, {_id: 'b'}]
    statesService.get(id)
      .then(function (state) {
        expect(state).toEqual({ _id: id })
      })
    $rootScope.$digest()
    done()
  })
})
