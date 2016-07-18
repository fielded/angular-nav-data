import angular from 'angular'

import ProductsService from './products.service'
import ProductListService from './product-list.service'
import { default as utilsModuleName } from '../utils/utils.module'

var moduleName = 'angularNavData.products'

angular
  .module(moduleName, [
    utilsModuleName,
    'pouchdb'
  ])
  .service('productsService', ProductsService)
  .service('productListService', ProductListService)

export default moduleName
