import angular from 'angular'

import { default as locationsModuleName } from './locations/locations.module'
import { default as productsModuleName } from './products/products.module'

angular.module('angularNavData', [
  locationsModuleName,
  productsModuleName
])
