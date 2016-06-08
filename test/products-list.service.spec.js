'use strict'

describe('productsListService', function () {
  var productsListService
  var testMod // eslint-disable-line

  beforeEach(function () {
    testMod = angular.module('testMod', ['angularNavData']).value('dataModuleRemoteDB', 'testDBName')
  })

  beforeEach(module('testMod'))

  beforeEach(inject(function (_$rootScope_, _productsListService_) {
    productsListService = _productsListService_
  }))

  describe('setRelevant', function () {
    it('should set the relevant products for the location', function () {
      var relevant = ['tt', 'mv', 'bcg']
      productsListService.setRelevant(relevant)
      expect(productsListService.relevant).toEqual(relevant)
    })
  })

  it('should expose an all function that returns all products', function () {
    expect(productsListService.all).toBeDefined()
  })

  it('should expose a dry function that returns only dry products', function () {
    expect(productsListService.dry).toBeDefined()
  })

  it('should expose a frozen function that returns only frozen products', function () {
    expect(productsListService.frozen).toBeDefined()
  })
})
