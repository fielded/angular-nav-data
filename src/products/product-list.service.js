class ProductListService {
  constructor ($q, productsService) {
    this.cachedProducts = []
    this.cachedDryProducts = []
    this.cachedFrozenProducts = []
    this.relevant = []
    this.registeredOnCacheUpdatedCallbacks = {}

    this.$q = $q
    this.productsService = productsService

    // For the state dashboard:
    // products are replicated locally
    this.productsService.callOnReplicationComplete('products-list-service', this.onReplicationComplete.bind(this))
  }

  registerOnCacheUpdatedCallback (id, callback) {
    if (!this.registeredOnCacheUpdatedCallbacks[id]) {
      this.registeredOnCacheUpdatedCallbacks[id] = callback
    }
  }

  unregisterOnCacheUpdatedCallback (id) {
    delete this.registeredOnCacheUpdatedCallbacks[id]
  }

  onCacheUpdated () {
    Object.keys(this.registeredOnCacheUpdatedCallbacks).forEach((id) => {
      this.registeredOnCacheUpdatedCallbacks[id]()
    })
  }

  onReplicationComplete () {
    this.all({ onlyRelevant: true, bustCache: true })
  }

  queryAndUpdateCache (options = {}) {
    const query = (options) => {
      var queryOptions = {
        'include_docs': true
      }

      if (options.onlyRelevant) {
        if (this.relevant.length) {
          queryOptions.keys = this.relevant
        } else {
          // this.relevant not yet set, returning all products is confusing,
          // return an empty array instead
          return this.$q.when([])
        }
      } else {
        queryOptions.ascending = true
        queryOptions.startkey = 'product:'
        queryOptions.endkey = 'product:' + '\uffff'
      }

      return this.productsService.allDocs(queryOptions)
    }

    const isDry = (product) => {
      return product.storageType === 'dry'
    }

    const isFrozen = (product) => {
      return product.storageType === 'frozen'
    }

    const isDefined = (doc) => {
      return typeof doc !== 'undefined'
    }

    const updateCache = (docs) => {
      this.cachedProducts = docs.filter(isDefined)
      this.cachedDryProducts = this.cachedProducts.filter(isDry)
      this.cachedFrozenProducts = this.cachedProducts.filter(isFrozen)
      // This makes the assumption that the cache only contains an empty list
      // of products when the replication is not yet done
      if (this.cachedProducts.length) {
        this.onCacheUpdated()
      }
    }

    return query(options)
      .then(updateCache)
  }

  all (options = {}) {
    if (options.bustCache || !this.cachedProducts.length > 0) {
      return this.queryAndUpdateCache(options)
              .then(function () { return this.cachedProducts }.bind(this))
    }
    return this.$q.when(this.cachedProducts)
  }

  dry (options = {}) {
    if (options.bustCache || !this.cachedProducts.length > 0) {
      return this.queryAndUpdateCache(options)
              .then(function () { return this.cachedDryProducts }.bind(this))
    }
    return this.$q.when(this.cachedDryProducts)
  }

  frozen (options = {}) {
    if (options.bustCache || !this.cachedProducts.length > 0) {
      return this.queryAndUpdateCache(options)
              .then(function () { return this.cachedFrozenProducts }.bind(this))
    }
    return this.$q.when(this.cachedFrozenProducts)
  }

  setRelevant (relevant) {
    this.relevant = relevant
    this.all({ onlyRelevant: true, bustCache: true })
  }
}

ProductListService.$inject = ['$q', 'productsService']

export default ProductListService
