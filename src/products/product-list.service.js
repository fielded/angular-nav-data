class ProductListService {
  constructor ($q, productsService) {
    this.cachedProducts = []
    this.cachedDryProducts = []
    this.cachedFrozenProducts = []
    this.relevant

    this.$q = $q
    this.productsService = productsService

    // For the state dashboard:
    // products are replicated locally
    this.productsService.callOnReplicationComplete('products-list-service', this.all.bind(this))
  }

  invalidateCaches () {
    this.cachedProducts = []
    this.cachedDryProducts = []
    this.cachedFrozenProducts = []
  }

  queryAndUpdateCache () {
    const query = () => {
      var options = {
        'include_docs': true
      }

      if (this.relevant) {
        options.keys = this.relevant
      } else {
        options.ascending = true
        options.startkey = 'product:'
        options.endkey = 'product:' + '\uffff'
      }

      return this.productsService.allDocs(options)
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
      console.log('updatedCaches')
      this.cachedProducts = docs.filter(isDefined)
      this.cachedDryProducts = this.cachedProducts.filter(isDry)
      this.cachedFrozenProducts = this.cachedProducts.filter(isFrozen)
      console.log('all', this.cachedProducts)
    }

    return query()
      .then(updateCache)
  }

  all () {
    console.log('querying all', this.cachedAllProducts)
    if (!this.cachedProducts.length > 0) {
      return this.queryAndUpdateCache()
              .then(function () { return this.cachedProducts }.bind(this))
    }
    return this.$q.when(this.cachedProducts)
  }

  dry () {
    console.log('querying dry', this.cachedDryProducts)
    if (!this.cachedDryProducts.length > 0) {
      return this.queryAndUpdateCache()
              .then(function () { return this.cachedDryProducts }.bind(this))
    }
    return this.$q.when(this.cachedDryProducts)
  }

  frozen () {
    console.log('querying frozen', this.cachedFrozenProducts)
    if (!this.cachedFrozenProducts.length > 0) {
      return this.queryAndUpdateCache()
              .then(function () { return this.cachedFrozenProducts }.bind(this))
    }
    return this.$q.when(this.cachedFrozenProducts)
  }

  setRelevant (relevant) {
    console.log('setting relevant', relevant)
    this.relevant = relevant
    this.invalidateCaches()
    this.queryAndUpdateCache()
  }
}

ProductListService.$inject = ['$q', 'productsService']

export default ProductListService
