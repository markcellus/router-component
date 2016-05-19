'use strict';
import Promise from 'promise';
import _ from 'lodash';
import Module from 'module-js';

/**
 * The function that is triggered before a new route is requested
 * @callback Router~onRouteRequest
 * @param {string} route - The route that was a requested
 * @returns {string} Optionally return a different route to which router should redirect
 */

/**
 * The function that is triggered when there is either a module or page error
 * @callback Router~onRouteError
 * @param {Error} e - The error event
 */

/**
 * The function that is triggered whenever a new route is requested
 * @callback Router~onRouteChange
 * @param {string} route - The route that was requested that triggered the change
 */

/**
 * The function that is triggered whenever a page successfully loads
 * @callback Router~onPageLoad
 * @param {string} route - The route that was a requested
 */

/**
 * Router class.
 * @description Represents a manager that handles all routes, pages and modules throughout the app.
 * @class Router
 * @return {Router} Returns a singleton instance of app
 */
class Router {

    /**
     * Initialize options ran when an instance is created.
     * @param {Object} [options] - The options object
     * @param {Object} [options.pagesConfig] - An object mapping of all pages along with their associated urls
     * @param {HTMLElement} [options.pagesContainer] - The element to use for the page container (defaults to document.body)
     * @param {Object} [options.moduleConfig] - An object mapping of all available modules
     * @param {Object} [options.requestOptions] - A set of request options that are globally applied when fetching data for all pages and modules
     * @param {Router~onRouteRequest} [options.onRouteRequest] - Called whenever a route is requested but before it is handled (can be used to intercept requests)
     * @param {Router~onRouteError} [options.onRouteError] - Called whenever an error is detected with a route request
     * @param {Router~onRouteChange} [options.onRouteChange] - Called whenever there is a new route requested
     * @param {Router~onPageLoad} [options.onPageLoad] - Called whenever a new page loads successfully
     */
    constructor (options) {
        this.options = _.extend({
            onRouteRequest: null,
            pagesContainer: document.body,
            pagesConfig: {},
            modulesConfig: {},
            requestOptions: null,
            onRouteError: null,
            onRouteChange: null,
            onPageLoad: null,
            moduleClass: Module,
            pageClass: Module
        }, options);

        this._pageMaps = {};
        this._globalModuleMaps = {};

        // convert page keys into array to preserve order for later use
        this._pageKeys = _.keys(this.options.pagesConfig);

        this._globalModuleMaps = this._buildGlobalModuleMaps();
        this._links = [];
        this._linkClickEventListener = this.onClickLink.bind(this);

    }

    /**
     * Spawns off some required-initializations and starts router.
     */
    start () {

        this._currentPath = this.getWindow().location.hash.replace('#', '');
        this.bindPopstateEvent();
    }

    /**
     * Stops routing urls.
     */
    stop () {
        this.options = {};
        this._currentPath = null;
        this.reset();
        this.unbindPopstateEvent();
        this._unbindAllLinks();
    }

    /**
     * Sets up pop state events for future urls.
     */
    bindPopstateEvent () {
        window.addEventListener('popstate', this._getOnPopStateListener());
    }

    /**
     * Removes pop state event listener.
     */
    unbindPopstateEvent () {
        window.removeEventListener('popstate', this._getOnPopStateListener());
    }

    /**
     * Gets the cached listener for pop state changes.
     * @returns {Function}
     * @private
     */
    _getOnPopStateListener () {
        var self = this;
        return function (event) {
            // sometimes ios browser doesnt have a event state object on initial load *shrug*
            if (event.state) {
                self._onRouteRequest.call(self, event.state.path);
            }
        }
    }

    /**
     * Resets Route Manager and destroys all previous pages.
     */
    reset () {
        let currentMapKey = this._getRouteMapKeyByPath(this._currentPath);
        let currentPageMap = this._pageMaps[currentMapKey] || {};
        let currentPageConfig = currentPageMap.config || {};

        // destroy all pages except for the one the user is currently on
        _.each(this._pageMaps, (pageMap, key) => {
            if (key !== currentMapKey) {
                this.resetPage(key);
            }
        });

        // destroy all global modules except for ones that are on the current page
        _.each(this._globalModuleMaps, (globalMap, key) => {
            // conditionally in case a global module config exist but hasnt been loaded
            if (!currentPageConfig.modules || currentPageConfig.modules.indexOf(key) === -1) {
                this.resetGlobalModule(key);
            }
        });
    }

    /**
     * Navigates to a supplied url.
     * @param {string} url - The url to navigate to.
     * @param {Object} [options] - Set of navigation options
     * @param {boolean} [options.trigger] - True if the route function should be called (defaults to true)
     * @param {boolean} [options.replace] - True to update the URL without creating an entry in the browser's history
     * @param {boolean} [options.triggerUrlChange] - False to not trigger the browser url to change
     * @returns {Promise} Returns a Promise when the page of the route has loaded
     */
    triggerRoute (url, options) {
        options = options || {};
        options.triggerUrlChange = typeof options.triggerUrlChange !== 'undefined' ? options.triggerUrlChange : true;
        if (url !== this._currentPath) {
            return this._onRouteRequest(url, options);
        } else {
            return Promise.resolve();
        }
    }

    /**
     * Gets query string params.
     * @param {string} url - The full url to navigate to.
     * @returns {Object} Returns an object containing query params.
     */
    getQueryParams (url) {
        var url = url || this.getWindow().location.href,
            params = {};
        url.split('?')[1].split('&').forEach(function(queryParam) {
            var splitParam = queryParam.split('=');
            params[splitParam[0]] = splitParam[1];
        });
        return params;
    }

    /**
     * Navigates to previous url in session history.
     * @param {Number} index - an index with a position relative to the current page (the current page being, of course, index 0)
     */
    goBack (index) {
        if (index) {
            window.history.go(index);
        } else {
            window.history.back();
        }
    }

    /**
     * Navigates forward (if gone back).
     * @param {Number} index - an index with a position relative to the current page
     */
    goForward (index) {
        if (index) {
            window.history.go(index);
        } else {
            window.history.forward();
        }
    }

    /**
     * Gets the current relative params.
     * @returns {Array} Returns an array of params
     */
    getRelativeUrlParams () {
        return this.getRelativeUrl().split('/') || [];
    }

    /**
     * Gets the current relative url.
     * @returns {string} Returns a url string
     */
    getRelativeUrl () {
        var url = this._currentPath;
        // remove leading slash if there is one
        url = url.replace(/^\//g, '');
        return url;
    }

    /**
     * When a route is requested.
     * @param {string} path - The path that is
     * @param {Object} [options] - request options
     * @param {Object} [options.triggerUrlChange] - Whether to trigger a url change
     * @private
     * @return {Promise}
     */
    _onRouteRequest (path, options) {
        var prevPath = this._currentPath;
        if (path !== prevPath) {
            return this._handleRequestedUrl(path, options).then((path) => {
                this._currentPreviousPageHidePromise = this.hidePage(prevPath, path);
                return this._currentPreviousPageHidePromise.then(() => {
                    return this.loadGlobalModules(path).then(() => {
                        return this.loadPage(path)
                            .then(function () {
                                if (this.options.onPageLoad) {
                                    this.options.onPageLoad.call(this, path);
                                }
                                return this.showPage(path).then(() => {
                                    return this.showGlobalModules(path);
                                });
                            }.bind(this))
                            .catch((e) => {
                                console.warn('Router Error: Page at ' + path + ' could not be loaded');
                                if (this.options.onRouteError) {
                                    this.options.onRouteError.call(this, e);
                                }
                            });
                    });
                });
            });
        } else {
            // already at url!
            return Promise.resolve();
        }
    }

    /**
     * Sets a url has active and adds it to the history.
     * @param {string} path - The url to set
     * @param {Object} options - Set of options
     * @param {Object} options.triggerUrlChange - Whether to trigger a url change
     */
    registerUrl (path, options) {
        var window = this.getWindow(),
            windowHistory = window.history;

        options = options || {};
        options.triggerUrlChange = typeof options.triggerUrlChange !== 'undefined' ? options.triggerUrlChange : true;

        if (options.triggerUrlChange) {
            // register new url in history
            windowHistory.pushState({path: path}, document.title, path);
            if (this.options.onRouteChange) {
                this.options.onRouteChange.call(this, path);
            }
        }
        this._currentPath = path;

    }

    /**
     * Returns windows object.
     * @returns {History}
     */
    getWindow () {
        return window;
    }

    /**
     * A function that allows custom redirects of routes if necessary.
     * This method is called every time a route request is made.
     * @param {string} path - The url path that was requested
     * @param {Object} [options] - The request options
     * @param {Object} [options.triggerUrlChange] - Whether to trigger a url change
     * @returns {Promise} Returns a promise that resolves with a path to go to when done
     * @private
     */
    _handleRequestedUrl (path, options) {
        var getRedirectedUrl = this.options.onRouteRequest ? this.options.onRouteRequest(path) : Promise.resolve(path);

        // register attempted url
        this.registerUrl(path, options);

        //convert to promise if not already
        if (!getRedirectedUrl.then) {
            getRedirectedUrl = Promise.resolve(getRedirectedUrl);
        }
        return getRedirectedUrl.then(function (newPath) {
            // if path has changed, register old one into history
            if (newPath !== path) {
                this.registerUrl(newPath);
            }
            return newPath;
        }.bind(this));
    }

    /**
     * Gets the page config object for a supplied path.
     * @param {string} path - The path of the page
     * @returns {Object}
     */
    getPageConfigByPath (path) {
        var pageKey = this._getRouteMapKeyByPath(path);
        return this.options.pagesConfig[pageKey] || {};
    }

    /**
     * Gets the config object for module.
     * @param {string} key - The module key
     * @returns {Object}
     */
    getModuleConfig (key) {
        return this.options.modulesConfig[key] || {};
    }

    /**
     * Sanitizes a path to match to the correct item in the route config.
     * @param path
     * @returns {string}
     * @private
     */
    _getRouteMapKeyByPath (path) {

        if (!path || typeof path !== 'string' || !this.options.pagesConfig) {
            return null;
        }

        path = path.replace(/^\//g, ''); // remove leading slash!

        let matchingKey = _.find(this._pageKeys, (key) => {
            let regex = new RegExp(key, 'gi');
            return key === path || path.match(regex);
        });

        let regex = new RegExp(matchingKey, 'gi');
        let sanitized = path.match(regex);
        // do not change key if the first value is empty string which could be in cases where
        // regex expression matching is something similar to "^$" or ".*"
        if (sanitized && sanitized[0]) {
            let config = _.extend({}, this.options.pagesConfig[matchingKey]);
            // update config with new entry
            if (config.data) {
                config.data = path.replace(new RegExp(matchingKey, 'gi'), config.data);
            }
            matchingKey = sanitized[0];
            if (this._pageKeys.indexOf(matchingKey) === -1) {
                this._pageKeys.push(matchingKey);
                this.options.pagesConfig[matchingKey] = config;
            }
        }
        return matchingKey;
    }

    /**
     * Requires the script for a module and falls back to internal Module class if not found.
     * @param {string} [scriptUrl] - Url to script
     * @param {HTMLElement} [el] - The element to use
     * @param {Object} [options] - Options to pass to scripts instantiation (if not a singleton of course)
     * @param {Module} [Class] - The class to fallback to when instantia
     * @returns {*}
     */
    loadScript (scriptUrl, el, options, Class = this.options.moduleClass) {
        options = options || {};
        options.requestOptions = _.extend({}, this.options.requestOptions, options.requestOptions);

        if (!scriptUrl) {
            return new Class(el, options);
        }
        let contents = require(scriptUrl);

        // support new es6 module exports
        // if module exports a default, use that
        // TODO: is __esModule safe to use?
        if (contents.__esModule) {
            contents = contents.default;
        }

        if (typeof contents === 'function') {
            // contents are a function, so assume it has a constructor and instantiate it
            return new contents(el, options);
        } else {
            // it is already an instance, so just return the contents.
            return contents;
        }
    }

    /**
     * Loads a page.
     * @param {string} route - The url of the page to load
     * @returns {Promise} Returns a promise representing the load call
     */
    loadPage (route) {
        let pageKey = this._getRouteMapKeyByPath(route);
        let pageConfig = this.options.pagesConfig[pageKey];
        let pageMap = this._pageMaps[pageKey] || {};

        if (!pageConfig) {
            // no page configured!
            let e = new Error('Router Error: No routes configuration for ' + this.getRelativeUrl());
            console.error(e);
            return Promise.reject(e);
        }

        // instantiate and cache page instance if doesnt already exist
        if (!pageMap.page) {
            pageMap.config = pageConfig;
            pageConfig = _.extend(pageConfig, {
                activeClass: 'page-active',
                loadedClass: 'page-loaded',
                disabledClass: 'page-disabled',
                errorClass: 'page-error'
            });
            try {
                pageMap.page = this.loadScript(pageConfig.script, document.createElement('div'), pageConfig, this.options.pageClass);
            } catch (e) {
                if (e.stack) {
                    console.log(e.stack);
                }
                return Promise.reject(e);
            }
            pageMap.page.el.classList.add('page'); // add default page class
            let pageModuleKeys = this.getPageModulesByRoute(route);
            pageMap.modules = {};
            pageModuleKeys.forEach((key, idx) => {
                let moduleConfig = this.options.modulesConfig[key];
                let moduleEl = document.createElement('div');
                pageMap.modules['mod' + idx] = this.loadScript(moduleConfig.script, moduleEl, moduleConfig);
            });
            this.options.pagesContainer.appendChild(pageMap.page.el);
            this._pageMaps[pageKey] = pageMap;
        }

        if (!pageMap.promise) {
            let moduleLoadPromises = [];
            for (var key in pageMap.modules) {
                if (pageMap.modules.hasOwnProperty(key) && pageMap.modules[key]) {
                    let module = pageMap.modules[key];
                    if (module.load) {
                        moduleLoadPromises.push(module.load());
                    }
                }
            }
            pageMap.promise = Promise.all(moduleLoadPromises).then(() => {
                return pageMap.page.load();
            });
        }
        return pageMap.promise.catch((err) => {
            // if page loading happens to cause an error, remove
            // item from page cache to force a hard
            // reload next time a request is made to this page
            delete pageMap.promise;
            // throw error to reject promise
            throw err;
        });

    }

    /**
     * Shows all global modules assigned to a page.
     * @param {string} path - The page path
     * @returns {Promise} Returns a promise when all global modules are shown
     */
    showGlobalModules (path) {
        var pageConfig = this.getPageConfigByPath(path),
            promises = [];

        pageConfig.modules = pageConfig.modules || [];

        _.each(this._globalModuleMaps, function (map, moduleKey) {
            if (pageConfig.modules.indexOf(moduleKey) !== -1) {
                // if there are matching global modules,
                // we dont want to show modules before previous page hides them
                // wait until previous page is done hiding
                promises.push(this._currentPreviousPageHidePromise.then(() => {
                    if (map.module.el) {
                        this.bindLinks(map.module.el);
                    }
                    if (map.module.show) {
                        return map.module.show();
                    }
                }));
            }
        }.bind(this));

        return Promise.all(promises);
    }

    /**
     * Shows a page and its sub modules.
     * @param {string} route - The route url of the page to show
     * @returns {*}
     */
    showPage (route) {
        let pageMap = this._pageMaps[this._getRouteMapKeyByPath(route)];
        let page = pageMap.page;
        if (!page) {
            return Promise.resolve();
        }
        _.each(pageMap.modules, function (module) {
            if (module.show) {
                module.show();
            }
        });
        this.bindLinks(page.el);
        return page.show();
    }

    /**
     * Hides all global modules assigned to designated path.
     * @returns {*}
     */
    hideGlobalModules (path, newPath) {
        var prevPageConfig = this.getPageConfigByPath(path),
            newPageConfig = this.getPageConfigByPath(newPath),
            promises = [];

        prevPageConfig.modules = prevPageConfig.modules || [];

        _.each(this._globalModuleMaps, function (map, moduleKey) {
            if (map.module.el) {
                this.unbindLinks(map.module.el);
            }
            if (map.module.active && !newPageConfig.modules || newPageConfig.modules.indexOf(moduleKey) === -1) {
                // only hide the module if the toPath does not contain it
                promises.push(map.promise.then(() => {
                    if (map.module.hide) {
                        return map.module.hide()
                    }
                }));
            }
        }.bind(this));

        return Promise.all(promises);
    }

    /**
     * Hides a page along with its designated modules.
     * @param {string} path - The path of the page to hide
     * @param {string} newPath - The path of the page going to
     * @returns {Promise} Returns promise when page is done hiding.
     */
    hidePage (path, newPath) {
        let pageMap = this._pageMaps[this._getRouteMapKeyByPath(path)];
        if (pageMap && pageMap.promise) {
            let page = pageMap.page;
            return pageMap.promise
                .then(() => {
                    return page.hide().then(() => {
                        // hide all pages modules
                        _.each(pageMap.modules, function (module) {
                            if (module.hide) {
                                module.hide();      ``
                            }
                        });
                        return this.hideGlobalModules(path, newPath).then(() => {
                            this.unbindLinks(pageMap.page.el);
                        });
                    });
                })
                .catch(() => {
                    // if previous page load caused an error,
                    // lets still ignore and just resolve because by
                    // this time we're loading a new page
                    // and no longer care about previous page
                    return Promise.resolve();
                });
        } else {
            return Promise.resolve();
        }
    }

    /**
     * Retrieves the non-global modules assigned to a route.
     * @param {string} path - The path to the page which contains the modules to be loaded
     * @returns {Array} Returns an array of all keys of the modules that match the route
     */
    getPageModulesByRoute (path) {
        var pageKey = this._getRouteMapKeyByPath(path),
            config = this.getPageConfigByPath(path),
            pageMap = this._pageMaps[pageKey] || {},
            pageModuleKeys = [];
        config.modules = config.modules || [];
        pageMap.modules = pageMap.modules || {};

        config.modules.forEach(function (moduleKey) {
            // only handle modules which are not global
            if (!this._globalModuleMaps[moduleKey]) {
                pageModuleKeys.push(moduleKey); //we must keep track of the order of the modules
            }
        }.bind(this));
        return pageModuleKeys;
    }

    /**
     * Handles either showing or hiding global modules based on the supplied path.
     * @param {string} path - The page path
     * @returns {Promise} Returns a promise that resolves when global modules are shown and hidden
     */
    loadGlobalModules (path) {
        var pageConfig = this.getPageConfigByPath(path),
            promises = [];

        pageConfig.modules = pageConfig.modules || [];

        _.each(this._globalModuleMaps, function (map, moduleKey) {
            if (pageConfig.modules.indexOf(moduleKey) !== -1) {
                // page has this global module specified!
                promises.push(this.loadGlobalModule(moduleKey));
            }
        }.bind(this));

        return Promise.all(promises);
    }

    /**
     * Loads a global module based on the supplied module key.
     * @param {string} moduleKey - The module key
     * @return {Promise} Returns a promise that resolves when the module is loaded
     */
    loadGlobalModule (moduleKey) {
        var map = this._globalModuleMaps[moduleKey] || {},
            config = this.getModuleConfig(moduleKey);
        if (!map.promise) {
            map.el = map.el || config.el;
            map.module = this.loadScript(config.script, map.el, config);
            map.promise = new Promise((resolve) => {
                if (!map.module.load) {
                    resolve();
                } else {
                    map.module.load()
                        .then(() => {
                            resolve();
                        })
                        .catch((e) => {
                            // error loading global module but still resolve
                            map.module.error(e);
                            resolve();
                        });
                }
            });
        }
        return map.promise;
    }

    /**
     * Builds and returns a filtered mapping of configs for all modules that are global.
     * @returns {Object}
     * @private
     */
    _buildGlobalModuleMaps () {
        var configs = {};
        _.each(this.options.modulesConfig, function (config, key) {
            if (config.global) {
                configs[key] = {config: config}
            }
        });
        return configs;
    }

    /**
     * Checks if a url is an internal link.
     * @param {string} url - The url to check
     * @returns {boolean} Returns true if link is an external link
     */
    isLinkExternal (url) {
        var is = url.match(/^(http\:|https\:|www\.)/) && url.indexOf(window.location.hostname) === -1;
        return is ? true : false;
    }

    /**
     * When a link on a page is clicked.
     * @param e
     */
    onClickLink (e) {
        let el = e.currentTarget;
        let url = el.getAttribute('href');
        // The new URL must be of the same origin as the current URL;
        // otherwise, pushState() will throw an exception
        if (url && !this.isLinkExternal(el.href)) {
            e.preventDefault();
            this.triggerRoute(url);
        }
    }

    /**
     * Destroys the page instance located at the supplied paths.
     * @param {String|Array} routes - The paths of which page instances to destroy
     */
    resetPage (routes) {
        routes = routes.constructor === Array ? routes : [routes];
        routes.forEach(path => {
            let mapKey = this._getRouteMapKeyByPath(path);
            let pageMap = this._pageMaps[mapKey];
            if (pageMap) {
                pageMap.page.destroy();

                // destroy all page's modules
                for (var key in pageMap.modules) {
                    if (pageMap.modules.hasOwnProperty(key) && pageMap.modules[key]) {
                        pageMap.modules[key].destroy();
                    }
                }

                // we must remove page and child elements that router has added to the DOM.
                if (this.options.pagesContainer && this.options.pagesContainer.contains(pageMap.page.el)) {
                    this.options.pagesContainer.removeChild(pageMap.page.el);
                }
                delete this._pageMaps[mapKey];
            }
        });
    }

    /**
     * Destroys a global module by the supplied key(s).
     * @param {String|Array} keys - The global key(s)
     */
    resetGlobalModule (keys) {
        keys = keys.constructor === Array ? keys : [keys];
        keys.forEach((key) => {
            let globalMap = this._globalModuleMaps[key];
            if (globalMap && globalMap.module) {
                if (globalMap.module.destroy) {
                    globalMap.module.destroy();
                }
                this._globalModuleMaps[key].promise = null;
            }
        });
    }

    /**
     * Sets up click events on all internal links to prevent trigger new page loads.
     */
    bindLinks (containerEl) {
        let links = containerEl.getElementsByTagName('a');
        if (links.length) {
            for (let i = 0; i < links.length; i++) {
                if (this._links.indexOf(links[i]) === -1) {
                    links[i].addEventListener('click', this._linkClickEventListener);
                    this._links.push(links[i]);
                }
            }
        }
    }

    /**
     * Removes all click events on internal links.
     */
    unbindLinks (containerEl) {
        let links = containerEl.getElementsByTagName('a');
        if (links.length) {
            for (let i = 0; i < links.length; i++) {
                let index = this._links.indexOf(links[i]);
                if (index > -1) {
                    links[i].removeEventListener('click', this._linkClickEventListener);
                    this._links.splice(index, 1);
                }
            }
        }
    }

    /**
     * Unbinds all router links that have been hijacked.
     * @private
     */
    _unbindAllLinks () {
        this._links.forEach((l) => {
            l.removeEventListener('click', this._linkClickEventListener);
        });
    }
}

export default Router;
