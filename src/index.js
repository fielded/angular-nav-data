import angular from 'angular'

import { default as locationsModuleName } from './locations/locations.module'
import { default as productsModuleName } from './products/products.module'
import { default as translatorModuleName } from './translator/translator.module'

angular.module('angularNavData', [
  locationsModuleName,
  productsModuleName,
  translatorModuleName
])
