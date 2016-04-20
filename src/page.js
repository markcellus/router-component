'use strict';
import Module from './module';

class Page extends Module {

    constructor (el, options) {
        super(el, options);
        this.el = el;
    }
}

module.exports = Page;
