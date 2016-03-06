'use strict';
var BaseModule = require('module-js');
var Promise = require('promise');
var _ = require('underscore');
var ResourceManager = require('resource-manager-js');

// start element kit
require('element-kit');

/**
 * @class Module
 * @description Base class that represents Modules of an app.
 * @extends BaseModule
 */
var Module = BaseModule.extend({

    /**
     * Makes a request to get the data for the module.
     * @param {string|Object} url - The url to fetch data from or data object
     * @param [options] - ajax options
     * @returns {*}
     */
    fetchData: function (url, options) {
        if (typeof url !== 'string') {
            return Promise.resolve(url);
        }
        return ResourceManager.fetchData(url, options);
    },

    /**
     * Gets the css files for the module.
     * @param cssUrl
     * @return {Promise}
     */
    getStyles: function (cssUrl) {
        return ResourceManager.loadCss(cssUrl);
    },

    /**
     * Gets the html template for the module.
     * @param templateUrl
     * @returns {Promise|*}
     */
    getTemplate: function (templateUrl) {
        return ResourceManager.loadTemplate(templateUrl);
    }

});

module.exports = Module;