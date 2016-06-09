import angular from 'angular'
import 'angular-pouchdb/dist/angular-pouchdb'

import ProductsService from './products.service'
import ProductsListService from './products-list.service'
import { default as utilsModuleName } from '../utils/utils.module'

var moduleName = 'angularNavData.products'

angular
  .module(moduleName, [
    utilsModuleName,
    'pouchdb'
  ])
  .service('productsService', ProductsService)
  .service('productsListService', ProductsListService)

export default moduleName
