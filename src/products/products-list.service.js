export default class ProductListService {
  constructor ($q, smartId, productsService) {
    this.cachedProducts = []
    this.cachedDryProducts = []
    this.cachedFrozenProducts = []
    this.relevant

    this.$q = $q
    this.smartId = smartId
    this.productsService = productsService

    // For the state dashboard:
    // products are replicated locally
    this.productsService.callOnReplicationComplete('products-list-service', this.all)
    this.all()
  }

  queryAndUpdateCache () {
    const addId = (product) => {
      product.id = this.smartId.parse(product._id).product
      return product
    }

    const generateDocId = (productId) => {
      return this.smartId.idify({ product: productId }, 'product')
    }

    const query = () => {
      var options = {
        'include_docs': true
      }

      if (this.relevant) {
        options.keys = this.relevant.map(generateDocId)
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

    const updateCache = (docs) => {
      this.cachedProducts = docs.map(addId)
      this.cachedDryProducts = this.cachedProducts.filter(isDry)
      this.cachedFrozenProducts = this.cachedProducts.filter(isFrozen)
    }

    return query()
      .then(updateCache)
  }

  all () {
    if (!this.cachedProducts.length > 0) {
      return this.queryAndUpdateCache()
              .then(function () { return this.cachedProducts })
    }
    return this.$q.when(this.cachedProducts)
  }

  dry () {
    if (!this.cachedDryProducts.length > 0) {
      return this.queryAndUpdateCache()
              .then(function () { return this.cachedDryProducts })
    }
    return this.$q.when(this.cachedDryProducts)
  }

  frozen () {
    if (!this.cachedFrozenProducts.length > 0) {
      return this.queryAndUpdateCache()
              .then(function () { return this.cachedFrozenProducts })
    }
    return this.$q.when(this.cachedFrozenProducts)
  }

  setRelevant (relevant) {
    this.relevant = relevant
  }
}
