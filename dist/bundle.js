!function(e){"use strict";e="default"in e?e.default:e;var t=function(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")},a=function(){function e(e,t){for(var a=0;a<t.length;a++){var n=t[a];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(e,n.key,n)}}return function(t,a,n){return a&&e(t.prototype,a),n&&e(t,n),t}}(),n=function(e,t){e.then(t)},i=function(){function e(a,n,i){t(this,e);var r=void 0;try{r=a.get("dataModuleRemoteDB")}catch(e){throw new Error("dataModuleRemoteDB should be provided in the data module configuration")}this.pouchDB=n,this.angularNavDataUtilsService=i,this.remoteDB=this.pouchDB(r),this.replicationFrom,this.localDB,this.registeredOnReplicationCompleteCallbackIds=[],this.callbacksPendingRegistration=[]}return a(e,[{key:"startReplication",value:function(e,t){var a={filter:"locations/by-level",query_params:{zone:e}};for(t&&(a.query_params.state=t),this.localDB=this.pouchDB("navIntLocationsDB"),this.replicationFrom=this.localDB.replicate.from(this.remoteDB,a);this.callbacksPendingRegistration.length;){var i=this.callbacksPendingRegistration.shift();n(this.replicationFrom,i)}}},{key:"callOnReplicationComplete",value:function(e,t){this.registeredOnReplicationCompleteCallbackIds.indexOf(e)===-1&&(this.registeredOnReplicationCompleteCallbackIds.push(e),this.replicationFrom?n(this.replicationFrom,t):this.callbacksPendingRegistration.push(t))}},{key:"allDocs",value:function(e){var t=this.localDB||this.remoteDB;return this.angularNavDataUtilsService.allDocs(t,e)}},{key:"query",value:function(e,t){var a=this.localDB||this.remoteDB;return this.angularNavDataUtilsService.query(a,e,t)}},{key:"get",value:function(e){var t=this.localDB||this.remoteDB;return t.get(e)}}]),e}();i.$inject=["$injector","pouchDB","angularNavDataUtilsService"];var r=function(){function e(a,n,i,r,s,c){t(this,e),this.cachedLgasByState={},this.defaultZone,this.defaultState,this.registeredOnCacheUpdatedCallbacks={},this.$q=a,this.smartId=n,this.locationsService=i,this.statesService=r,this.productListService=s,this.utils=c;var l=this.bustCache.bind(this);this.locationsService.callOnReplicationComplete("lgas-service",l)}return a(e,[{key:"registerOnCacheUpdatedCallback",value:function(e,t){this.registeredOnCacheUpdatedCallbacks[e]||(this.registeredOnCacheUpdatedCallbacks[e]=t)}},{key:"unregisterOnCacheUpdatedCallback",value:function(e){delete this.registeredOnCacheUpdatedCallbacks[e]}},{key:"bustCache",value:function(){this.byState({bustCache:!0}),this.setDefaultStateRelevantProducts()}},{key:"setDefaultStateRelevantProducts",value:function(){var e=this,t=function(t){e.productListService.setRelevant(t.products)},a="configuration:"+this.smartId.idify({zone:this.defaultZone,state:this.defaultState},"zone:state");this.locationsService.get(a).then(t)}},{key:"queryAndUpdateCache",value:function(e){var t=this,a=function(e){return e.id=t.smartId.parse(e._id).lga,e},n=function(e){var a={include_docs:!0,ascending:!0};return e.zone&&e.state?(a.startkey="zone:"+e.zone+":state:"+e.state+":",a.endkey="zone:"+e.zone+":state:"+e.state+":￿",t.locationsService.allDocs(a)):(a.key="lga",t.locationsService.query("locations/by-level",a))},i=function(e,n){var i=n.map(a);e?t.cachedLgasByState[e]=i:t.cachedLgasByState=i,t.utils.isIndexedCacheEmpty(t.cachedLgasByState,e)||t.utils.callEach(t.registeredOnCacheUpdatedCallbacks)};return n(e).then(i.bind(null,e.state))}},{key:"byState",value:function(){var e=this,t=arguments.length<=0||void 0===arguments[0]?{}:arguments[0],a=function(e){return e.id},n=function(){var n=angular.copy(e.cachedLgasByState);return t.onlyIds&&Object.keys(n).forEach(function(e){n[e]=n[e].map(a)}),t.zone&&t.state&&(n=n[t.state]),t.asArray&&(n=e.utils.toArray(n)),n};return t.zone=t.zone||this.defaultZone,t.state=t.state||this.defaultState,t.bustCache||this.utils.isIndexedCacheEmpty(this.cachedLgasByState,t.state)?this.queryAndUpdateCache(t).then(n):this.$q.when(n())}},{key:"idsByState",value:function(){var e=arguments.length<=0||void 0===arguments[0]?{}:arguments[0];return e.onlyIds=!0,this.byState(e)}},{key:"list",value:function(){var e=arguments.length<=0||void 0===arguments[0]?{}:arguments[0];return e.asArray=!0,this.byState(e)}},{key:"setState",value:function(e,t){this.defaultZone=e,this.defaultState=t,this.statesService.setZone(this.defaultZone),this.bustCache()}},{key:"get",value:function(e){var t=function(t){var a=!0,n=!1,i=void 0;try{for(var r,s=t[Symbol.iterator]();!(a=(r=s.next()).done);a=!0){var c=r.value;if(c._id===e)return c}}catch(e){n=!0,i=e}finally{try{!a&&s.return&&s.return()}finally{if(n)throw i}}},a=this.smartId.parse(e).state,n=this.smartId.parse(e).zone;return this.byState({zone:n,state:a}).then(t)}}]),e}();r.$inject=["$q","smartId","locationsService","statesService","productListService","angularNavDataUtilsService"];var s=function(){function e(a,n,i,r){t(this,e),this.cachedStatesByZone={},this.defaultZone,this.registeredOnCacheUpdatedCallbacks={},this.$q=a,this.smartId=n,this.locationsService=i,this.utils=r;var s=this.byZone.bind(this,{bustCache:!0});this.locationsService.callOnReplicationComplete("states-service",s)}return a(e,[{key:"registerOnCacheUpdatedCallback",value:function(e,t){this.registeredOnCacheUpdatedCallbacks[e]||(this.registeredOnCacheUpdatedCallbacks[e]=t)}},{key:"unregisterOnCacheUpdatedCallback",value:function(e){delete this.registeredOnCacheUpdatedCallbacks[e]}},{key:"queryAndUpdateCache",value:function(e){var t=this,a=function(e){return e.id=t.smartId.parse(e._id).state,e},n=function(e){var a={include_docs:!0,ascending:!0};return e.zone?(a.startkey="zone:"+e.zone+":",a.endkey="zone:"+e.zone+":￿",t.locationsService.allDocs(a)):(a.key="state",t.locationsService.query("locations/by-level",a))},i=function(e,n){var i=n.map(a);e?t.cachedStatesByZone[e]=i:t.cachedStatesByZone=i,t.utils.isIndexedCacheEmpty(t.cachedStatesByZone,e)||t.utils.callEach(t.registeredOnCacheUpdatedCallbacks)};return n(e).then(i.bind(null,e.zone))}},{key:"byZone",value:function(){var e=this,t=arguments.length<=0||void 0===arguments[0]?{}:arguments[0],a=function(e){return e.id},n=function(){var n=angular.copy(e.cachedStatesByZone);return t.onlyIds&&Object.keys(n).forEach(function(e){n[e]=n[e].map(a)}),t.zone&&(n=n[t.zone]),t.asArray&&(n=e.utils.toArray(n)),n};return t.zone=t.zone||this.defaultZone,t.bustCache||this.utils.isIndexedCacheEmpty(this.cachedStatesByZone,t.zone)?this.queryAndUpdateCache(t).then(n):this.$q.when(n())}},{key:"idsByZone",value:function(){var e=arguments.length<=0||void 0===arguments[0]?{}:arguments[0];return e.onlyIds=!0,this.byZone(e)}},{key:"list",value:function(){var e=arguments.length<=0||void 0===arguments[0]?{}:arguments[0];return e.asArray=!0,this.byZone(e)}},{key:"setZone",value:function(e){this.defaultZone=e,this.byZone({bustCache:!0})}},{key:"get",value:function(e){var t=function(t){var a=!0,n=!1,i=void 0;try{for(var r,s=t[Symbol.iterator]();!(a=(r=s.next()).done);a=!0){var c=r.value;if(c._id===e)return c}}catch(e){n=!0,i=e}finally{try{!a&&s.return&&s.return()}finally{if(n)throw i}}},a=this.smartId.parse(e).zone;return this.byZone({zone:a}).then(t)}}]),e}();s.$inject=["$q","smartId","locationsService","angularNavDataUtilsService"];var c=function(e){return e.doc},l=function(e){return"undefined"!=typeof e},o=function(e){return e.rows.map(c).filter(l)},u=function(){function e(){t(this,e)}return a(e,[{key:"allDocs",value:function(e,t){return e.allDocs(t).then(o)}},{key:"query",value:function(e,t,a){return e.query(t,a).then(o)}},{key:"callEach",value:function(e){var t=function(t){return e[t]()};Object.keys(e).forEach(t)}},{key:"isEmptyObject",value:function(e){return!Object.keys(e).length}},{key:"isIndexedCacheEmpty",value:function(e,t){var a=this.isEmptyObject(e);return!a&&t?!e[t]||!e[t].length:a}},{key:"toArray",value:function(e){return Object.keys(e).reduce(function(t,a){return t.concat(e[a])},[])}}]),e}(),h="angularNavData.utils";e.module(h,[]).service("angularNavDataUtilsService",u);var d="angularNavData.locations";e.module(d,[h,"ngSmartId","pouchdb"]).service("locationsService",i).service("lgasService",r).service("statesService",s);var v=function(e,t){e.then(t)},f=function(){function e(a,n,i){t(this,e);var r=void 0;try{r=a.get("dataModuleRemoteDB")}catch(e){throw new Error("dataModuleRemoteDB should be provided in the data module configuration")}this.pouchDB=n,this.angularNavDataUtilsService=i,this.remoteDB=this.pouchDB(r),this.replicationFrom,this.localDB,this.registeredOnReplicationCompleteCallbackIds=[],this.callbacksPendingRegistration=[]}return a(e,[{key:"startReplication",value:function(e,t){var a={filter:"products/all"};for(this.localDB=this.pouchDB("navIntProductsDB"),this.replicationFrom=this.localDB.replicate.from(this.remoteDB,a);this.callbacksPendingRegistration.length;){var n=this.callbacksPendingRegistration.shift();v(this.replicationFrom,n)}}},{key:"callOnReplicationComplete",value:function(e,t){this.registeredOnReplicationCompleteCallbackIds.indexOf(e)===-1&&(this.registeredOnReplicationCompleteCallbackIds.push(e),this.replicationFrom?v(this.replicationFrom,t):this.callbacksPendingRegistration.push(t))}},{key:"allDocs",value:function(e){var t=this.localDB||this.remoteDB;return this.angularNavDataUtilsService.allDocs(t,e)}}]),e}();f.$inject=["$injector","pouchDB","angularNavDataUtilsService"];var y=function(){function e(a,n,i){t(this,e),this.cachedProducts=[],this.relevantIds=[],this.registeredOnCacheUpdatedCallbacks={},this.$q=a,this.productsService=n,this.utils=i;var r=this.relevant.bind(this,{bustCache:!0});this.productsService.callOnReplicationComplete("products-list-service",r)}return a(e,[{key:"registerOnCacheUpdatedCallback",value:function(e,t){this.registeredOnCacheUpdatedCallbacks[e]||(this.registeredOnCacheUpdatedCallbacks[e]=t)}},{key:"unregisterOnCacheUpdatedCallback",value:function(e){delete this.registeredOnCacheUpdatedCallbacks[e]}},{key:"queryAndUpdateCache",value:function(){var e=this,t=arguments.length<=0||void 0===arguments[0]?{}:arguments[0],a=function(t){var a={include_docs:!0};if(t.onlyRelevant){if(!e.relevantIds.length)return e.$q.when([]);a.keys=e.relevantIds}else a.ascending=!0,a.startkey="product:",a.endkey="product:￿";return e.productsService.allDocs(a)},n=function(t){e.cachedProducts=t,e.cachedProducts.length&&e.utils.callEach(e.registeredOnCacheUpdatedCallbacks)};return a(t).then(n)}},{key:"relevant",value:function(){var e=arguments.length<=0||void 0===arguments[0]?{}:arguments[0];return e.onlyRelevant=!0,this.all(e)}},{key:"all",value:function(){var e=this,t=arguments.length<=0||void 0===arguments[0]?{}:arguments[0],a=function(e,t){return t.storageType===e},n=function(){return t.byType?{dry:e.cachedProducts.filter(a.bind(null,"dry")),frozen:e.cachedProducts.filter(a.bind(null,"frozen"))}:e.cachedProducts};return this.cachedProducts.length&&!t.bustCache?this.$q.when(n()):this.queryAndUpdateCache(t).then(n)}},{key:"setRelevant",value:function(e){this.relevantIds=e,this.relevant({bustCache:!0})}}]),e}();y.$inject=["$q","productsService","angularNavDataUtilsService"];var p="angularNavData.products";e.module(p,[h,"pouchdb"]).service("productsService",f).service("productListService",y),e.module("angularNavData",[d,p])}(angular);