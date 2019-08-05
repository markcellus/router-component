/*!
  * Router-component v0.8.1
  * https://npm.com/router-component
  *
  * Copyright (c) 2019 Mark Kennedy
  * Licensed under the MIT license
 */

'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function extractPathParams(pattern, path) {
    const regex = new RegExp(pattern);
    const matches = regex.exec(path);
    if (!matches) {
        return [];
    }
    else {
        const groups = [...matches];
        // remove first result since its not a capture group
        groups.shift();
        return groups;
    }
}
const routeComponents = new Set();
class RouterComponent extends HTMLElement {
    constructor() {
        super();
        this.routeElements = new Set();
        this.fragment = document.createDocumentFragment();
        routeComponents.add(this);
        const children = this.children;
        while (children.length > 0) {
            const element = children[0];
            this.routeElements.add(element);
            this.fragment.appendChild(element);
        }
    }
    connectedCallback() {
        this.popStateChangedListener = this.popStateChanged.bind(this);
        window.addEventListener('popstate', this.popStateChangedListener);
        this.bindLinks();
        // we must hijack pushState and replaceState because we need to
        // detect when consumer attempts to use and trigger a page load
        this.historyChangeStates = [window.history.pushState, window.history.replaceState];
        this.historyChangeStates.forEach(method => {
            window.history[method.name] = (state, title, url) => {
                const triggerRouteChange = !state || state.triggerRouteChange !== false;
                if (!triggerRouteChange) {
                    // this.prevLocation = `${location.pathname}${location.search}`;
                    this.invalid = true;
                    delete state.triggerRouteChange;
                }
                method.call(history, state, title, url);
                if (triggerRouteChange) {
                    this.show(url);
                }
            };
        });
        this.show(this.location.pathname);
    }
    getRouteElementByPath(pathname) {
        let element;
        if (!pathname)
            return;
        for (const child of this.routeElements) {
            let path = pathname;
            const search = child.getAttribute('search-params');
            if (search) {
                path = `${pathname}?${search}`;
            }
            if (this.matchPathWithRegex(path, child.getAttribute('path'))) {
                element = child;
                break;
            }
        }
        return element;
    }
    show(pathname) {
        if (!pathname)
            return;
        let router;
        const element = this.getRouteElementByPath(pathname);
        if (this.shownPage && this.shownPage.getAttribute('path') !== pathname) {
            this.invalid = true;
        }
        if (this.shownPage === element && !this.invalid)
            return;
        this.invalid = false;
        if (!element) {
            router = this.getExternalRouterByPath(pathname);
            if (router) {
                return router.show(pathname);
            }
        }
        if (!element) {
            return console.warn(`Navigated to path "${pathname}" but there is no matching element with a path ` +
                `that matches. Maybe you should implement a catch-all route with the path attribute of ".*"?`);
        }
        if (this.shownPage) {
            this.fragment.appendChild(this.shownPage);
            this.teardownElement(this.shownPage);
        }
        this.shownPage = element;
        this.appendChild(element);
        this.setupElement(element);
        this.dispatchEvent(new CustomEvent('route-changed'));
    }
    get location() {
        return window.location;
    }
    disconnectedCallback() {
        window.removeEventListener('popstate', this.popStateChangedListener);
        this.historyChangeStates.forEach(method => {
            window.history[method.name] = method;
        });
        if (this.shownPage) {
            this.teardownElement(this.shownPage);
        }
        this.unbindLinks();
        this.routeElements.clear();
    }
    clickedLink(link, e) {
        const { href } = link;
        if (!href || href.indexOf('mailto:') !== -1)
            return;
        const location = window.location;
        const origin = location.origin || location.protocol + '//' + location.host;
        if (href.indexOf(origin) !== 0)
            return;
        if (link.origin === this.location.origin) {
            e.preventDefault();
            window.history.pushState({}, document.title, `${link.pathname}${link.search}`);
        }
    }
    bindLinks() {
        // TODO: update this to be more performant
        // listening to body to allow detection inside of shadow roots
        this.clickedLinkListener = e => {
            if (e.defaultPrevented)
                return;
            const link = e.composedPath().filter(n => n.tagName === 'A')[0];
            if (!link) {
                return;
            }
            this.clickedLink(link, e);
        };
        document.body.addEventListener('click', this.clickedLinkListener);
    }
    unbindLinks() {
        document.body.removeEventListener('click', this.clickedLinkListener);
    }
    matchPathWithRegex(pathname = '', regex) {
        if (!pathname.startsWith('/')) {
            pathname = `${pathname.replace(/^\//, '')}`;
        }
        return pathname.match(regex);
    }
    popStateChanged() {
        this.show(this.location.pathname);
    }
    setupElement(element) {
        this.originalDocumentTitle = document.title;
        const title = element.getAttribute('document-title');
        if (title) {
            document.title = title;
        }
        else {
            document.title = this.originalDocumentTitle;
        }
    }
    teardownElement(element) {
        document.title = this.originalDocumentTitle;
    }
    getExternalRouterByPath(pathname) {
        for (const component of routeComponents) {
            const routeElement = component.getRouteElementByPath(pathname);
            if (routeElement) {
                return component;
            }
        }
    }
}
customElements.define('router-component', RouterComponent);

exports.RouterComponent = RouterComponent;
exports.extractPathParams = extractPathParams;
