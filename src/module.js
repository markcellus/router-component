'use strict';
import BaseModule from 'module-js';

class Module extends BaseModule {

    constructor (el, options) {
        super(el, options);
        this.el = el;
    }

    /**
     * When a page shows.
     */
    show () {
        var i;
        // setup links to not trigger full page reloads
        this.links = this.el.getElementsByTagName('a');
        this._linkClickEventListener = this.onClickLink.bind(this);
        if (this.links.length) {
            for (i = 0; i < this.links.length; i++) {
                this.links[i].addEventListener('click', this._linkClickEventListener);
            }
        }
        return super.show();
    }

    /**
     * When a page hides.
     */
    hide () {
        var i;
        // destroy link clicks
        if (this.links.length) {
            for (i = 0; i < this.links.length; i++) {
                this.links[i].removeEventListener('click', this._linkClickEventListener);
            }
        }
        return super.hide();
    }

    /**
     * When a link is clicked.
     * @param e
     */
    onClickLink (e) {
        var el = e.currentTarget,
            url = el.getAttribute('href');
        // The new URL must be of the same origin as the current URL;
        // otherwise, pushState() will throw an exception
        if (url && !this.isLinkExternal(url)) {
            e.preventDefault();
            // calling pushState() does not trigger a popstate event, which
            // the router is listening in on so we need to do it manually
            let pop = new Event('popstate');
            pop.state = {};
            pop.state.path = url;
            window.dispatchEvent(pop);
        }
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
}

module.exports = Module;
