/*!
 * Router-component v0.4.1
 * https://npm.com/router-component
 *
 * Copyright (c) 2018 Mark Kennedy
 * Licensed under the MIT license
 */

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
            const [element] = children;
            this.routeElements.add(element);
            this.fragment.appendChild(element);
        }
    }
    changedUrl(e) {
        const { pathname } = this.location;
        if (this.shownPage && this.shownPage.getAttribute('path') === pathname)
            return;
        this.show(pathname);
    }
    connectedCallback() {
        this.changedUrlListener = this.changedUrl.bind(this);
        window.addEventListener('popstate', this.changedUrlListener);
        this.bindLinks();
        // we must hijack pushState and replaceState because we need to
        // detect when consumer attempts to use and trigger a page load
        this.historyChangeStates = [window.history.pushState, window.history.replaceState];
        this.historyChangeStates.forEach(method => {
            window.history[method.name] = (...args) => {
                const [state] = args;
                method.apply(history, args);
                this.changedUrl(state);
            };
        });
        let path = this.location.pathname;
        if (this.extension && this.directory !== '/') {
            path = `/${this.filename}`;
        }
        this.show(path);
    }
    get filename() {
        return this.location.pathname.replace(this.directory, '');
    }
    get directory() {
        const { pathname } = this.location;
        return pathname.substring(0, pathname.lastIndexOf('/')) + '/';
    }
    get extension() {
        const { pathname } = this.location;
        const frags = pathname.split('.');
        if (frags.length <= 1) {
            return '';
        }
        return frags[frags.length - 1];
    }
    matchPathWithRegex(pathname = '', regex) {
        if (!pathname.startsWith('/')) {
            pathname = `${this.directory}${pathname.replace(/^\//, '')}`;
        }
        return pathname.match(regex);
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
        if (this.shownPage === element) {
            return;
        }
        if (!element) {
            router = this.getExternalRouterByPath(pathname);
            if (router) {
                return router.show(pathname);
            }
        }
        if (!element) {
            throw new Error(`Navigated to path "${pathname}" but there is no matching element with a path ` +
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
    set location(value) {
        // no-op
    }
    disconnectedCallback() {
        window.removeEventListener('popstate', this.changedUrlListener);
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
            const popStateEvent = new PopStateEvent('popstate', {});
            window.history.pushState({}, document.title, `${link.pathname}${link.search}`);
            this.changedUrl(popStateEvent);
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

export { extractPathParams, RouterComponent };
