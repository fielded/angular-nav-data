class ProductListService {
  constructor ($q, productsService) {
    this.cachedProducts = []
    this.relevantIds = []
    this.registeredOnCacheUpdatedCallbacks = {}

    this.$q = $q
    this.productsService = productsService

    // For state dashboard: products replicated locally and only a set of products is relevant
    const onReplicationComplete = this.relevant.bind(this, { bustCache: true })
    this.productsService.callOnReplicationComplete('products-list-service', onReplicationComplete)
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

  queryAndUpdateCache (options = {}) {
    const query = (options) => {
      var queryOptions = {
        'include_docs': true
      }

      if (options.onlyRelevant) {
        if (this.relevantIds.length) {
          queryOptions.keys = this.relevantIds
        } else {
          // this.relevantIds not yet set, returning all products is confusing,
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

    const isDefined = (doc) => {
      return typeof doc !== 'undefined'
    }

    const updateCache = (docs) => {
      this.cachedProducts = docs.filter(isDefined)
      // This makes the assumption that the cache only contains an empty list
      // of products when the replication is not yet done
      if (this.cachedProducts.length) {
        this.onCacheUpdated()
      }
    }

    return query(options)
      .then(updateCache)
  }

  relevant (options = {}) {
    options.onlyRelevant = true
    return this.all(options)
  }

  all (options = {}) {
    const byType = (type, product) => {
      return product.storageType === type
    }

    const prepareRes = () => {
      if (options.byType) {
        return {
          dry: this.cachedProducts.filter(byType.bind(null, 'dry')),
          frozen: this.cachedProducts.filter(byType.bind(null, 'frozen'))
        }
      }
      return this.cachedProducts
    }

    if (this.cachedProducts.length && !options.bustCache) {
      return this.$q.when(prepareRes())
    }

    return this.queryAndUpdateCache(options)
            .then(prepareRes)
  }

  setRelevant (relevantIds) {
    this.relevantIds = relevantIds
    this.relevant({ bustCache: true })
  }
}

ProductListService.$inject = ['$q', 'productsService']

export default ProductListService
