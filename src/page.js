'use strict';
var Module = require('module');
var Promise = require('promise');

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
     * @param {HTMLElement} options.el - The container of all currentPages
     */
    initialize: function (options) {
        Module.prototype.initialize.call(this, options);
        this.el = document.createElement('div');
        this.el.classList.add('page');
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
                this.el.classList.add('page-active');
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
            this.el.classList.remove('page-active');
            return new Promise(function (resolve) {
                this.el.kit.waitForTransition(function () {
                    resolve();
                });
            }.bind(this));
        }.bind(this));
    }

});

module.exports = Page;