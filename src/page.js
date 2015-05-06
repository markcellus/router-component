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
     * @param {HTMLElement} options.el - The page element
     */
    initialize: function (options) {

        this.options = _.extend({}, {
            pagesContainer: null,
            el: document.createElement('div'),
            activeClass: 'page-active',
            loadedClass: 'page-loaded',
            disabledClass: 'page-disabled',
            errorClass: 'page-error'
        }, options);

        this.el = this.options.el;
        this.el.classList.add('page');

        Module.prototype.initialize.call(this, this.options);
    },

    /**
     * Loads page.
     * @param {Object} options
     * @returns {Promise}
     */
    load: function (options) {
        options = options || {};
        // use a slight delay to let the browser repaint because of display: block; being added
        // by browser before our new active class is added. If not, our view wont respect the transition duration
        return new Promise(function (resolve) {
            setTimeout(function () {
                this.el.kit.waitForTransition(function () {
                    Module.prototype.load.call(this, options).then(resolve);
                }.bind(this));
            }.bind(this), 50);
        }.bind(this));
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