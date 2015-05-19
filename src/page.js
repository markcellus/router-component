'use strict';
var Module = require('module.js');
var Promise = require('promise');
var _ = require('underscore');

// start element kit
require('element-kit');

/**
 * @class Page
 * @description Base class that represents Pages of an app.
 * @extends Module
 */
var Page = Module.extend({

    /**
     * When page is instantiated.
     * @param {Object} options - The initialize options
     * @param {HTMLElement} options.pagesContainer - The container of all currentPages
     */
    initialize: function (options) {

        this.options = _.extend({}, {
            pagesContainer: null,
            activeClass: 'page-active',
            loadedClass: 'page-loaded',
            disabledClass: 'page-disabled',
            errorClass: 'page-error'
        }, options);

        Module.prototype.initialize.call(this, this.options);
    },

    /**
     * Loads page.
     * @param {Object} options
     * @returns {Promise}
     */
    load: function (options) {
        options = options || {};

        if (options.el) {
            this.el = options.el;
        } else {
            // fallback to random div so that other methods that
            // depend on it like show() and hide() wont cause a crash
            this.el = document.createElement('div');
        }
        this.el.classList.add('page');

        return Module.prototype.load.call(this, options);
    },

    /**
     * Shows the page.
     */
    show: function () {
        return Module.prototype.show.call(this).then(function () {
            return new Promise(function (resolve) {
                this.el.kit.waitForTransition(function () {
                    resolve();
                });
            }.bind(this));
        }.bind(this));
    },

    /**
     * Hides the page.
     * @return {Promise}
     */
    hide: function () {
        return Module.prototype.hide.call(this).then(function () {
            return new Promise(function (resolve) {
                this.el.kit.waitForTransition(function () {
                    resolve();
                });
            }.bind(this));
        }.bind(this));
    }

});

module.exports = Page;