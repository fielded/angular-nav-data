# angular-nav-data

[![Build Status](https://travis-ci.org/fielded/angular-nav-data.svg)](https://travis-ci.org/fielded/angular-nav-data) ![Dependecy Status](https://david-dm.org/fielded/angular-nav-data.svg) ![Dev Dependecy Status](https://david-dm.org/fielded/angular-nav-data/dev-status.svg)

### Config

Provide the url for the remote CouchDB database as a `value` to your Angular module:

```js
angular.module('myMod', [])
  .value('remote', '-')
```

You can also provide a set of patterns to be reused through the application:

```js
angular.module('myMod', [])
  .value('navDataRemoteDB', 'your-remote-db-url')
```

## Installation

Install with `bower`:

    bower install --save fielded/angular-nav-data

or `npm`:

    npm install --save fielded/angular-nav-data

Then simply add `angularNavData` as a dependency somewhere in your project that makes sense and you're good to go.

## Contributing

### Installation

```bash
# Clone the GitHub repository
git clone git@github.com:fielded/angular-nav-data.git
# Change into project folder
cd angular-nav-data
# Install the dev dependencies
npm install
```

### Test Suite

The test suite is configured to run with PhantomJS and is powered by:

- Karma
- Jasmine

#### Running Tests

```bash
npm test
```

## Release Process

To make a release, you need to run `npm run build`, commit the `dist` folder and tag the commit with an appropiate version according to the [SemVer spec](http://semver.org/).

## License

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.  You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.  See the License for the specific language governing permissions and limitations under the License.
