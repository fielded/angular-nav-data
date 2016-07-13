'use strict'

describe('productListService', function () {
  var productListService
  var testMod // eslint-disable-line

  beforeEach(function () {
    testMod = angular.module('testMod', ['angularNavData']).value('dataModuleRemoteDB', 'testDBName')
  })

  beforeEach(module('testMod'))

  beforeEach(inject(function (_$rootScope_, _productListService_) {
    productListService = _productListService_
  }))

  describe('setRelevant', function () {
    it('should set the relevant products for the location', function () {
      var relevant = ['product:tt', 'product:mv', 'product:bcg']
      productListService.setRelevant(relevant)
      expect(productListService.relevantIds).toEqual(relevant)
    })
  })

  it('should expose an all function that returns all products', function () {
    expect(productListService.all).toBeDefined()
  })

  it('should expose a relevant function that returns only relevant products', function () {
    expect(productListService.relevant).toBeDefined()
  })

  it('should expose a registerOnCacheUpdatedCallback function', function () {
    expect(productListService.registerOnCacheUpdatedCallback).toBeDefined()
  })

  it('should expose a unregisterOnCacheUpdatedCallback function', function () {
    expect(productListService.unregisterOnCacheUpdatedCallback).toBeDefined()
  })
})
