class ProductListService {
  constructor ($q, productsService) {
    this.cachedProducts = []
    this.cachedDryProducts = []
    this.cachedFrozenProducts = []
    this.relevant = []

    this.$q = $q
    this.productsService = productsService

    // For the state dashboard:
    // products are replicated locally
    this.productsService.callOnReplicationComplete('products-list-service', this.all.bind(this, { onlyRelevant: true }))
  }

  invalidateCaches () {
    this.cachedProducts = []
    this.cachedDryProducts = []
    this.cachedFrozenProducts = []
  }

  queryAndUpdateCache (options) {
    const query = (options) => {
      var queryOptions = {
        'include_docs': true
      }

      console.log('querying', this)
      console.log('querying with options', options)
      if (options.onlyRelevant) {
        console.log('relevant')
        if (this.relevant.length) {
          queryOptions.keys = this.relevant
        } else { // do not query the products until the list of relevant ones have been set
          console.log('not yet ready, will repeat')
          return this.$q.reject()
        }
      } else {
        console.log('not only relevant')
        queryOptions.ascending = true
        queryOptions.startkey = 'product:'
        queryOptions.endkey = 'product:' + '\uffff'
      }

      console.log('query options', queryOptions)
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
      console.log('updatingCaches', docs)
      this.cachedProducts = docs.filter(isDefined)
      this.cachedDryProducts = this.cachedProducts.filter(isDry)
      this.cachedFrozenProducts = this.cachedProducts.filter(isFrozen)
    }

    options = options || {}
    return query(options)
      .then(updateCache)
  }

  all (options) {
    console.log('querying all', this.cachedProducts)
    console.log('all with options', options)
    if (!this.cachedProducts.length > 0) {
      return this.queryAndUpdateCache(options)
              .then(function () { return this.cachedProducts }.bind(this))
    }
    console.log('returning all cached')
    return this.$q.when(this.cachedProducts)
  }

  dry (options) {
    console.log('querying dry', this.cachedDryProducts)
    console.log('dry with options', options)
    if (!this.cachedDryProducts.length > 0) {
      return this.queryAndUpdateCache(options)
              .then(function () { return this.cachedDryProducts }.bind(this))
    }
    console.log('returning dry cached')
    return this.$q.when(this.cachedDryProducts)
  }

  frozen (options) {
    console.log('querying frozen', this.cachedFrozenProducts)
    console.log('frozen with options', options)
    if (!this.cachedFrozenProducts.length > 0) {
      return this.queryAndUpdateCache(options)
              .then(function () { return this.cachedFrozenProducts }.bind(this))
    }
    console.log('returning frozen cached')
    return this.$q.when(this.cachedFrozenProducts)
  }

  setRelevant (relevant) {
    console.log('setting relevant', relevant)
    this.relevant = relevant
    this.invalidateCaches()
    this.queryAndUpdateCache({ onlyRelevant: true })
  }
}

ProductListService.$inject = ['$q', 'productsService']

export default ProductListService
