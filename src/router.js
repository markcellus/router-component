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
            onPageLoad: null
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

        // we should not destroy the current page the user is on
        _.each(this._pageMaps, function (pageMap, key) {
            if (key !== currentMapKey) {
                pageMap.page.destroy();
                if (this.options.pagesContainer && this.options.pagesContainer.contains(pageMap.el)) {
                    this.options.pagesContainer.removeChild(pageMap.el);
                }
                _.each(pageMap.modules, function (moduleMap) {
                    moduleMap.module.destroy();
                });
            }
        }.bind(this));

        // TODO: should not destroy global modules that are on the current page
        // destroy all global modules
        _.each(this._globalModuleMaps, function (globalMap, key) {
            // conditionally in case a global module config exist but hasnt been loaded
            if (!currentPageConfig.modules || currentPageConfig.modules.indexOf(key) === -1) {
                if (globalMap.module) {
                    globalMap.module.hide().then(function () {
                        globalMap.module.destroy();
                    });
                }
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
            return this._handleRequestedUrl(path, options).then(function (path) {
                this._currentPreviousPageHidePromise = this.hidePage(prevPath, path);
                return this._currentPreviousPageHidePromise.then(function () {
                    return this.loadPage(path)
                        .then(function () {
                            if (this.options.onPageLoad) {
                                this.options.onPageLoad.call(this, path);
                            }
                            return this.showPage(path);
                        }.bind(this))
                        .catch((e) => {
                            console.warn('Router Error: Page at ' + path + ' could not be loaded');
                            if (this.options.onRouteError) {
                                this.options.onRouteError.call(this, e);
                            }
                        });
                }.bind(this));
            }.bind(this));
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
            this._currentPath = path;
            if (this.options.onRouteChange) {
                this.options.onRouteChange.call(this, path);
            }
        }

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

        if (!path || typeof path !== 'string') {
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
            this._pageKeys.push(matchingKey);
            this.options.pagesConfig[matchingKey] = config;
        }
        return matchingKey;
    }

    /**
     * Loads the script for a module and falls back to internal Module class if not found.
     * @param {string} [scriptUrl] - Url to script
     * @param {HTMLElement} [el] - The element to use
     * @param {Object} [options] - Options to pass to scripts instantiation (if not a singleton of course)
     * @returns {*}
     */
    loadScript (scriptUrl, el, options) {
        options = options || {};
        options.requestOptions = _.extend({}, this.options.requestOptions, options.requestOptions);
        if (!scriptUrl) {
            return Promise.resolve(new Module(el, options));
        }
        return this.requireScript(scriptUrl, el, options)
            .then(null, function () {
                // not found, so fallback to class
                return Promise.resolve(new Module(el, options));
            });
    }

    /**
     * Require()s a script and instantiates it if a non-singleton.
     * @param scriptUrl - Url to script
     * @param [options] - Options to pass to scripts instantiation (if not a singleton of course)
     * @returns {*} Returns the script contents if found (usually a singleton or class) or rejects if not found
     */
    requireScript (scriptUrl, el, options) {
        var contents;
        return new Promise(function (resolve, reject) {
            if (!scriptUrl) {
                return reject();
            }
            try {
                contents = require(scriptUrl);
            } catch (e) {
                console.error(e);
                reject(e);
            }
            options = options || {};

            // support new es6 module exports (file must export a default)
            // TODO: is __esModule safe to use?
            if (contents.__esModule) {
                contents = contents.default;
            }

            // if function, assume it has a constructor and instantiate it
            if (typeof contents === 'function') {
                contents = new contents(el, options);
            }
            resolve(contents);
        }.bind(this));

    }

    /**
     * Loads a page.
     * @param {string} path - The url of the page to load
     * @returns {*}
     */
    loadPage (path) {
        var pageKey = this._getRouteMapKeyByPath(path),
            pageConfig = this.options.pagesConfig[pageKey],
            pageMap = {},
            e;

        if (!pageConfig) {
            // no page configured!
            e = new Error('Router Error: No routes configuration for ' + this.getRelativeUrl());
            console.error(e);
            return Promise.reject(e);
        }

        if (!this._pageMaps[pageKey]) {
            this._pageMaps[pageKey] = pageMap;
            pageMap.config = pageConfig;
            pageMap.promise = this.loadGlobalModules(path).then(() => {
                pageMap.el = document.createElement('div');
                pageConfig = _.extend(pageConfig, {
                    activeClass: 'page-active',
                    loadedClass: 'page-loaded',
                    disabledClass: 'page-disabled',
                    errorClass: 'page-error'
                });
                return this.loadScript(pageConfig.script, pageMap.el, pageConfig).then((page) => {
                    pageMap.page = page;
                    pageMap.el.classList.add('page'); // add default page class
                    // we need default page data available for the page's modules if they do not have already any
                    return this.loadPageModules(path).then(() => {
                        this.options.pagesContainer.appendChild(pageMap.el);
                        return page.load().then(function () {
                            return pageMap;
                        });
                    });
                });
            }, () => {
                // if page loading happens to cause an error, remove
                // item from page cache to force a hard
                // reload next time a request is made to this page
                if (this._pageMaps[pageKey].page) {
                    this._pageMaps[pageKey].page.destroy();
                }
                delete this._pageMaps[pageKey];
            });
        }
        return this._pageMaps[pageKey].promise;

    }

    /**
     * Shows modules assigned to a supplied page path.
     * @param {string} path - The page url
     * @returns {Promise} Returns a promise when all modules are done showing
     */
    showPageModules (path) {
        var pageKey = this._getRouteMapKeyByPath(path),
            pageMap = this._pageMaps[pageKey] || {};
        _.each(pageMap.modules, function (moduleMap) {
            moduleMap.module.show();
        });
        return this.showGlobalModules(path);
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
                promises.push(this._currentPreviousPageHidePromise.then(function () {
                    return map.module.show();
                }));
            }
        }.bind(this));

        return Promise.all(promises);
    }

    /**
     * Shows the page and its designated modules of the supplied url path.
     * @param {string} path - The url path of the page to show
     * @returns {*}
     */
    showPage (path) {
        var pageKey = this._getRouteMapKeyByPath(path),
            pageMap = this._pageMaps[pageKey] || {},
            page = pageMap.page;
        this.showPageModules(path);
        if (page) {
            this._bindLinks(page.el);
            return page.show();
        }
    }

    /**
     * Hides all global modules assigned to designated path.
     * @returns {*}
     */
    hideGlobalModules (path, newPath) {
        var pageConfig = this.getPageConfigByPath(path),
            newPageConfig = this.getPageConfigByPath(newPath),
            promises = [];

        pageConfig.modules = pageConfig.modules || [];

        _.each(this._globalModuleMaps, function (map, moduleKey) {
            if (pageConfig.modules.indexOf(moduleKey) !== -1) {
                // page has this global module specified!
                promises.push(map.promise.then(function () {
                    // only hide the module if the toPath does not contain it
                    if (!newPageConfig.modules || !newPageConfig.modules.contains(moduleKey)) {
                        return map.module.hide().then(() => {
                            this._unbindLinks(map.module.el);
                        });
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
            return pageMap.promise
                .then(function () {
                    return pageMap.page.hide().then(function () {
                        return this.hidePageModules(path).then(function () {
                            return this.hideGlobalModules(path, newPath).then(() => {
                                this._unbindLinks(pageMap.page.el);
                            });
                        }.bind(this));
                    }.bind(this));
                }.bind(this))
                .catch(function () {
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
     * Hides all of a pages modules.
     * @param {string} path - The page of the page to hide
     * @return {Promise} Returns a promise when complete
     */
    hidePageModules (path) {
        var promises = [];
        var pageKey = this._getRouteMapKeyByPath(path),
            pageMap = this._pageMaps[pageKey] || {};
        _.each(pageMap.modules, function (moduleMap) {
            promises.push(moduleMap.module.hide());
        });
        return Promise.all(promises);
    }

    /**
     * Loads the modules of a page.
     * @param {string} path - The path to the page which contains the modules to be loaded
     */
    loadPageModules (path) {
        var pageKey = this._getRouteMapKeyByPath(path),
            config = this.getPageConfigByPath(path),
            pageMap = this._pageMaps[pageKey] || {},
            promises = [],
            loadPromise,
            pageModuleKeys = [],
            moduleMap;

        config.modules = config.modules || [];
        pageMap.modules = pageMap.modules || {};

        config.modules.forEach(function (moduleKey) {
            // only handle modules which are not global
            if (!this._globalModuleMaps[moduleKey]) {
                pageModuleKeys.push(moduleKey); //we must keep track of the order of the modules
                loadPromise = this.loadPageModule(moduleKey).then(function (moduleMap) {
                    if (!moduleMap.module.loaded) {
                        pageMap.el.appendChild(moduleMap.el);
                    }
                    pageMap.modules[moduleKey] = moduleMap;
                });
            }
            promises.push(loadPromise);
        }.bind(this));

        return Promise.all(promises).then(function () {
            // append module elements to DOM
            // and use document frag for performance, yay!
            var frag = document.createDocumentFragment();
            _.each(pageModuleKeys, function (moduleKey) {
                moduleMap = pageMap.modules[moduleKey];
                if (!moduleMap.el) {
                    return;
                } else if (moduleMap.module.appendEl) {
                    // use custom appending method if module specifies it,
                    moduleMap.module.appendEl(moduleMap.el);
                } else {
                    // add to module frag to be appended to page container
                    frag.appendChild(moduleMap.el);
                }
            });

            if (!pageMap.el) {
                return false;
            } else {
                pageMap.el.appendChild(frag);
            }
        });
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
     * Loads a single module for a page.
     * @param {string} moduleKey - The key of which module to load
     */
    loadPageModule (moduleKey) {
        var config = this.getModuleConfig(moduleKey),
            moduleMap = {};

        moduleMap = {};

        moduleMap.el = document.createElement('div');

        if (!moduleMap.promise) {
            moduleMap.promise = this.loadScript(config.script, moduleMap.el, config).then((module) => {
                moduleMap.module = module;
                // create html into DOM element and pass it off to load call for
                // custom mangling before it gets appended to DOM
                return module.load().then(() => {
                    return moduleMap;
                }, (e) => {
                    moduleMap.module.error(e);
                    return moduleMap;
                });
            });
        }
        return moduleMap.promise;
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
            // inject modules into page DOM
            var div = document.createElement('div');
            map.el = div.children[0];
            // create html into DOM element and pass it off to load call for
            // custom mangling before it gets appended to DOM
            map.promise = this.loadScript(config.script, map.el, config).then(function (module) {
                map.module = module;
                return module.load()
                    .then(() => {
                        if (module.el) {
                            this._bindLinks(module.el);
                        }
                    })
                    .catch((e) => {
                        // error loading global module!
                        map.module.error(e);
                        throw e;
                    });
            }.bind(this));
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
     * Sets up click events on all internal links to prevent trigger new page loads.
     * @private
     */
    _bindLinks (containerEl) {
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
     * @private
     */
    _unbindLinks (containerEl) {
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
