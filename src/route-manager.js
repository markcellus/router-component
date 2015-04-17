'use strict';
var ResourceManager = require('resource-manager-js');
var Promise = require('promise');
var path = require('path');
var EventHandler = require('event-handler');
var Handlebars = require('handlebars');
var slugify = require('handlebars-helper-slugify');
var _ = require('underscore');
var Page = require('./page');
var Module = require('module.js');

/**
 * The function that is triggered the selected dropdown value changes
 * @callback RouteManager~onRouteRequest
 * @param {string} input - The url that was a requested
 * @returns {Promise} Returns a promise that resolves with a path string of the route to go to when done
 */

/**
 * RouteManager class.
 * @description Represents a manager that handles all routes throughout the app.
 * @class RouteManager
 * @param options
 * @param {String|Object} options.config - Configuration data or url to file that has it
 * @param {RouteManager~onRouteRequest} [options.onRouteRequest] - A callback function that is called whenever a new url is requested
 * @return {RouteManager}
 */
var RouteManager = function (options){
    this.initialize(options);
    return this;
};

RouteManager.prototype = /** @lends RouteManager */{

    /**
     * Initialize options
     * @param {Object} [options]
     * @param {HTMLElement} [options.pagesContainerEl] - The element to use for the page container (defaults to document.body)
     * @param {Function} [options.onRouteRequest] - Called whenever a route is requested (can be used to intercept requests)
     */
    initialize: function (options) {

        this.options = _.extend({
            onRouteRequest: null,
            pagesContainerEl: document.body
        }, options);

        // allow event listeners
        EventHandler.createTarget(this);

        this._pageMaps = {};
        this._globalModuleMaps = {};
        this.history = [];

        // setup helpers
        Handlebars.registerHelper('slugify', slugify);

    },

    /**
     * Starts managing routes.
     */
    start: function () {
        this._config = this.options.config;
        if (!this._config) {
            console.error('Route Error: no configuration data was supplied.');
        }

        // fallback backs
        this._config.pages = this._config.pages || {};
        this._config.modules = this._config.modules || {};

        // setup pop state events for future urls
        window.addEventListener('popstate', this._getOnPopStateListener());
    },

    /**
     * Gets the cached listener for pop state changes.
     * @returns {Function}
     * @private
     */
    _getOnPopStateListener: function () {
        var self = this;
        return function (event) {
            self._onRouteRequest.call(self, event.state.path);
        }
    },

    /**
     * Resets Route Manager.
     */
    reset: function () {
        this.history = [];
        this._pageMaps = {};
        this._config.pages = {};
        this._config.modules = {};
    },

    /**
     * Stops routing urls.
     */
    stop: function () {
        this.reset();
        this._globalModuleMaps = {};
        window.removeEventListener('popstate', this._getOnPopStateListener());
        EventHandler.destroyTarget(this);
    },

    /**
     * Navigates to a supplied url.
     * @param {string} url - The url to navigate to.
     * @param {Object} [options] - Set of navigation options
     * @param {boolean} [options.trigger] - True if the route function should be called (defaults to true)
     * @param {boolean} [options.replace] - True to update the URL without creating an entry in the browser's history
     * @returns {Promise} Returns a Promise when the page of the route has loaded
     */
    triggerRoute: function (url, options) {
        if (url !== this._currentPath) {
            return this._onRouteRequest(url);
        } else {
            return Promise.resolve();
        }
    },

    /**
     * Navigates to previous url in session history.
     * @param {Number} index - an index with a position relative to the current page (the current page being, of course, index 0)
     */
    goBack: function (index) {
        if (index) {
            window.history.go(index);
        } else {
            window.history.back();
        }
    },

    /**
     * Navigates forward (if gone back).
     * @param {Number} index - an index with a position relative to the current page
     */
    goForward: function (index) {
        if (index) {
            window.history.go(index);
        } else {
            window.history.forward();
        }
    },

    /**
     * Gets the current relative params.
     * @returns {Array} Returns an array of params
     */
    getRelativeUrlParams: function () {
        return this.getRelativeUrl().split('/') || [];
    },

    /**
     * Gets the current relative url.
     * @returns {string} Returns a url string
     */
    getRelativeUrl: function () {
        var url = this._currentPath || window.location.hash.replace('#', '');
        // remove leading slash if there is one
        url = url.replace(/^\//g, '');
        return url;
    },

    /**
     * When a route is requested.
     * @param {string} path - The path that is
     * @private
     * @return {Promise}
     */
    _onRouteRequest: function (path) {
        if (path !== this._currentPath) {
            // hide body class, while we work
            document.body.classList.remove('page-active');
            this._currentPath = path;
            this.registerUrlHistory(path);
            this.dispatchEvent('url:change', {url: path});
            return this.handleRouteRequest(path).then(function (path) {
                return this._handlePreviousPage().then(function () {
                    return this.loadPage(path)
                        .then(function (page) {
                            this.dispatchEvent('page:load');
                            return page.show().then(function () {
                                document.body.classList.add('page-active');
                            }.bind(this));
                        }.bind(this))
                        .catch(function (e) {
                            this.dispatchEvent('page:error', e);
                        }.bind(this));
                }.bind(this));
            }.bind(this));
        } else {
            // already at url!
            return Promise.resolve();
        }
    },

    /**
     * Registers a new url into history.
     * @param {string} path - The new url to register
     */
    registerUrlHistory: function (path) {
        // register new url in history
        window.history.pushState({path: path}, document.title, path);
        // push to internal history for tracking
        this.history.push(window.history.state);
    },
    
    /**
     * A function that allows custom redirects of routes if necessary.
     * This method is called every time a route request is made.
     * @param {string} path - The url path that was requested
     * @returns {Promise} Returns a promise that resolves with a path to go to when done
     */
    handleRouteRequest: function (path) {
        return new Promise(function (resolve, reject) {
            if (!this.options.onRouteRequest) {
                resolve(path);
            } else {
                this.options.onRouteRequest(path).then(function (p) {
                    // if path has changed resolve previous one, and route to new one
                    if (p !== path) {
                        this.registerUrlHistory(p);
                        resolve(p);
                    } else {
                        resolve(path);
                    }
                }.bind(this), reject);
            }
        }.bind(this));
    },

    /**
     * Sanitizes a path to match to the correct item in the route config.
     * @param path
     * @returns {string}
     * @private
     */
    _getRouteMapKeyByPath: function (path) {
        var regex;

        if (!path && typeof path !== 'string') {
            return null;
        }
        path = path.replace(/^\//g, ''); // remove leading slash!
        return _.findKey(this._config.pages, function (obj, key) {
            regex = new RegExp(key, 'gi');
            return key === path || path.match(regex);
        });
    },

    /**
     * Loads the script for a module and falls back to internal Module class if not found.
     * @param scriptUrl - Url to script
     * @returns {*}
     */
    loadPageScript: function (scriptUrl) {
        var options = {el: this.options.pagesContainerEl};
        if (!scriptUrl) {
            return Promise.resolve(new Page(options));
        }
        return this.loadScript(scriptUrl)
            .then(null, function () {
                return Promise.resolve(new Page(options));
            });
    },

    /**
     * Loads a page.
     * @param {string} url - The url of the page to load
     * @returns {*}
     */
    loadPage: function (url) {
        var pageKey = this._getRouteMapKeyByPath(url),
            config = this._config.pages[pageKey],
            pageMap = {},
            e;

        if (!config) {
            // no page configured!
            e = new Error('RouteManager Error: No routes configuration for ' + this.getRelativeUrl());
            console.error(e);
            return Promise.reject(e);
        }

        if (!this._pageMaps[pageKey]) {
            this._pageMaps[pageKey] = pageMap;
            pageMap.promise = this.loadGlobalModules().then(function () {
                return this.loadPageScript(config.script).then(function (page) {
                    pageMap.page = page;
                    return page.getStyles(config.styles).then(function () {
                        return page.getTemplate(config.template).then(function (html) {
                            return page.fetchData(config.data, {cache: true}).then(function (data) {
                                html = html || '';
                                if (data) {
                                    html = Handlebars.compile(html)(data);
                                }
                                pageMap.data = data;
                                if (pageMap.page.el) {
                                    pageMap.page.el.innerHTML = html;
                                    this.options.pagesContainerEl.appendChild(pageMap.page.el);
                                }
                                return this._loadPageModules(config.modules, pageMap).then(function () {
                                    return page.load({data: data, el: pageMap.page.el}).then(function () {
                                        return page;
                                    });
                                }.bind(this));
                            }.bind(this));
                        }.bind(this));
                    }.bind(this));
                }.bind(this));
            }.bind(this));
            return pageMap.promise;
        } else {
            return this._pageMaps[pageKey].promise;
        }
    },

    /**
     * Hides the previous page if a new one is requested.
     * @returns {*}
     * @private
     */
    _handlePreviousPage: function () {
        var prevHistory = this.history[this.history.length - 2] || {},
            previousPath = this._getRouteMapKeyByPath(prevHistory.path);
        // hide previous page if exists
        if (previousPath && this._pageMaps[previousPath] && this._pageMaps[previousPath].promise) {
            return this._pageMaps[previousPath].promise.then(function (page) {
                page.hide();
            });
        } else {
            return Promise.resolve();
        }
    },

    /**
     * Loads the modules of a page.
     * @param {Array} moduleKeys - The array of page modules
     * @param {Object} pageMap - The page map object
     * @private
     */
    _loadPageModules: function (moduleKeys, pageMap) {
        var promises = [],
            loadPromise,
            pageModuleKeys = [],
            moduleMap;

        moduleKeys = moduleKeys || [];
        pageMap.modules = pageMap.modules || {};

        moduleKeys.forEach(function (moduleKey) {
            if (this._globalModuleMaps[moduleKey]) {
                var globalModuleMap = this._globalModuleMaps[moduleKey];
                // use custom appending method if module specifies it
                // and has not been appended to DOM already
                if (globalModuleMap.module && !globalModuleMap.appended) {
                    globalModuleMap.module.appendEl(globalModuleMap.el);
                    this._globalModuleMaps[moduleKey].appended = true;
                }
            } else {
                pageModuleKeys.push(moduleKey); //we must keep track of the order of the modules
                loadPromise = this._loadPageModule(moduleKey, pageMap).then(function (moduleMap) {
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
            if (pageMap.page.el) {
                pageMap.page.el.children[0].appendChild(frag);
            }
        });
    },

    /**
     * Loads a single module for a page.
     * @param {string} moduleKey - The key of which module to load
     * @param {Object} pageMap - The page map
     * @private
     */
    _loadPageModule: function (moduleKey, pageMap) {
        var config = this._config.modules[moduleKey],
            moduleMap = {};

        config.options = config.options || {};

        moduleMap = {};

        moduleMap.promise = this.loadModuleScript(config.script, config.options).then(function (module) {
            moduleMap.module = module;
            return module.getStyles(config.styles).then(function () {
                return module.getTemplate(config.template).then(function (html) {
                    return module.fetchData(config.data, {cache: true}).then(function (data) {
                        // use page data as fallback
                        data = _.extend({}, pageMap.data, data);
                        html = html ? Handlebars.compile(html)(data): '';
                        var div = document.createElement('div');
                        div.innerHTML = html;
                        // create html into DOM element and pass it off to load call for
                        // custom mangling before it gets appended to DOM
                        moduleMap.el = div.children[0];
                        moduleMap.html = html;
                        return module.load({el: moduleMap.el, data: data}).then(function () {
                            return moduleMap;
                        });
                    }.bind(this));
                }.bind(this));
            }.bind(this));
        }.bind(this));
        return moduleMap.promise;
    },

    /**
     * Loads all global modules.
     * @return {Promise}
     */
    loadGlobalModules: function () {
        var promises = [],
            globalConfigs =  this._buildGlobalModuleConfigs();
        _.each(globalConfigs, function (config, moduleKey) {
            config = this._config.modules[moduleKey];
            if (!this._globalModuleMaps[moduleKey]) {
                var map = this._globalModuleMaps[moduleKey] = {};
                map.promise = this.loadModuleScript(config.script).then(function (module) {
                    return module.getStyles(config.styles).then(function () {
                        return module.getTemplate(config.template).then(function (html) {
                            return module.getData(config.data).then(function (data) {
                                html = html ? Handlebars.compile(html)(data || {}): '';
                                // inject modules into page DOM
                                var div = document.createElement('div');
                                div.innerHTML = html;
                                map.el = div.children[0];
                                // create html into DOM element and pass it off to load call for
                                // custom mangling before it gets appended to DOM
                                map.module = module;
                                return module.load({data: data, el: map.el});
                            }.bind(this));
                        }.bind(this));
                    }.bind(this));
                }.bind(this));
                map.promise.then(function () {
                    this._globalModuleMaps[moduleKey] = map;
                }.bind(this));
                promises.push(map.promise);
            }
        }.bind(this));
        return Promise.all(promises);
    },

    /**
     * Builds and returns a filtered mapping of configs for all modules that are global.
     * @returns {Object}
     * @private
     */
    _buildGlobalModuleConfigs: function () {
        var configs = {};
        _.each(this._config.modules, function (config, key) {
            if (config.global) {
                configs[key] = config;
            }
        });
        return configs;
    },

    /**
     * Require()s a script and instantiates it if a non-singleton.
     * @param scriptUrl - Url to script
     * @param [options] - Options to pass to scripts instantiation (if not a singleton of course)
     * @returns {*} Returns the script contents if found (usually a singleton or class) or rejects if not found
     */
    loadScript: function (scriptUrl, options) {
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

            // if function, assume it has a constructor and instantiate it
            if (typeof contents === 'function') {
                contents = new contents(options);
            }
            resolve(contents);
        }.bind(this));

    },

    /**
     * Loads the script for a module and falls back to internal Module class if not found.
     * @param scriptUrl - Url to script
     * @param [options] - Options to pass to scripts instantiation (if not a singleton of course)
     * @returns {*}
     */
    loadModuleScript: function (scriptUrl, options) {
        return this.loadScript(scriptUrl, options)
            .then(null, function () {
                // not found, so fallback to internal module class
                return Promise.resolve(new Module(options));
            });
    }

};

module.exports = function (options) {
    return new RouteManager(options);
};