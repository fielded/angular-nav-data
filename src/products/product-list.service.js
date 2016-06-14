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
      this.cachedProducts = docs.filter(isDefined)
      this.cachedDryProducts = this.cachedProducts.filter(isDry)
      this.cachedFrozenProducts = this.cachedProducts.filter(isFrozen)
    }

    return query()
      .then(updateCache)
  }

  all () {
    if (!this.cachedProducts.length > 0) {
      return this.queryAndUpdateCache()
              .then(function () { return this.cachedProducts }.bind(this))
    }
    return this.$q.when(this.cachedProducts)
  }

  dry () {
    if (!this.cachedDryProducts.length > 0) {
      return this.queryAndUpdateCache()
              .then(function () { return this.cachedDryProducts }.bind(this))
    }
    return this.$q.when(this.cachedDryProducts)
  }

  frozen () {
    if (!this.cachedFrozenProducts.length > 0) {
      return this.queryAndUpdateCache()
              .then(function () { return this.cachedFrozenProducts }.bind(this))
    }
    return this.$q.when(this.cachedFrozenProducts)
  }

  setRelevant (relevant) {
    this.relevant = relevant
  }
}

ProductListService.$inject = ['$q', 'productsService']

export default ProductListService
