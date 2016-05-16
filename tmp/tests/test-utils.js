'use strict';

module.exports = {

    /**
     * Creates an event.
     * @param {string} name - The event name
     * @param {object} [options] - Options to be passed to event
     */
    createEvent: function (name, options) {
        var event;
        options = options || {};
        options.bubbles = options.bubbles || true;
        options.cancelable = options.cancelable|| true;

        event = document.createEvent('CustomEvent');
        event.initCustomEvent(name, options.bubbles, options.cancelable, null);
        return event;
    },

    /**
     * Creates an HTML Element from an html string.
     * @param {string} html - String of html
     * @returns {HTMLElement} - Returns and html element node
     */
    createHtmlElement: function (html) {
        var tempParentEl,
            el;
        if (html) {
            html = this.trim(html);
            tempParentEl = document.createElement('div');
            tempParentEl.innerHTML = html;
            el = tempParentEl.childNodes[0];
            return tempParentEl.removeChild(el);
        }
    },

    /**
     * Zaps whitespace from both ends of a string.
     * @param {string} val - The string value to trim
     * @returns {string} Returns a trimmed string
     */
    trim: function (val) {
        if (!String.prototype.trim) {
            String.prototype.trim = function () {
                return val.replace(/^\s+|\s+$/g, '');
            };
        } else {
            val = val.trim();
        }
        return val;
    }

};
