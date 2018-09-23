/*!
 * Router-component v0.2.0
 * https://npm.com/router-component
 *
 * Copyright (c) 2018 Mark Kennedy
 * Licensed under the MIT license
 */

function __awaiter(thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
}

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
class RouterComponent extends HTMLElement {
    constructor(...args) {
        super(...args);
        this.routeElements = new Set();
    }
    changedUrl(e) {
        const { pathname } = this.location;
        if (this.shownPage.getAttribute('path') === pathname)
            return;
        this.show(pathname);
    }
    connectedCallback() {
        this.fragment = document.createDocumentFragment();
        const children = this.children;
        while (children.length > 0) {
            const [element] = children;
            this.routeElements.add(element);
            this.fragment.appendChild(element);
        }
        this.changedUrlListener = this.changedUrl.bind(this);
        window.addEventListener('popstate', this.changedUrlListener);
        let path = this.location.pathname;
        if (this.directory !== '/') {
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
        const element = this.getRouteElementByPath(pathname);
        if (this.shownPage === element) {
            return;
        }
        if (!element) {
            throw new Error(`Navigated to path "${pathname}" but there is no matching element with a path ` +
                `that matches. Maybe you should implement a catch-all route with the path attribute of ".*"?`);
        }
        this.appendChild(element);
        // we must wait a few milliseconds for the DOM to resolve
        // or links wont be setup correctly
        const timer = setTimeout(() => __awaiter(this, void 0, void 0, function* () {
            this.bindLinks(element);
            clearTimeout(timer);
        }), 200);
        if (this.shownPage) {
            this.fragment.appendChild(this.shownPage);
            this.unbindLinks(this.shownPage);
        }
        this.shownPage = element;
    }
    get location() {
        return window.location;
    }
    set location(value) {
        // no-op
    }
    disconnectedCallback() {
        window.removeEventListener('popstate', this.changedUrlListener);
        this.routeElements.clear();
    }
    clickedLink(e) {
        const link = e.target;
        if (link.origin === this.location.origin) {
            e.preventDefault();
            const popStateEvent = new PopStateEvent('popstate', {});
            window.history.pushState({}, document.title, `${link.pathname}${link.search}`);
            window.dispatchEvent(popStateEvent);
        }
    }
    bindLinks(element) {
        const links = element.querySelectorAll('a');
        // TODO: dont stop at just the first level shadow root
        const shadowLinks = element.shadowRoot ? element.shadowRoot.querySelectorAll('a') : [];
        this.clickedLinkListener = this.clickedLink.bind(this);
        [...links, ...shadowLinks].forEach((link) => {
            link.addEventListener('click', this.clickedLinkListener);
        });
    }
    unbindLinks(element) {
        const links = element.querySelectorAll('a');
        const shadowLinks = element.shadowRoot ? element.shadowRoot.querySelectorAll('a') : [];
        this.clickedLinkListener = this.clickedLink.bind(this);
        [...links, ...shadowLinks].forEach((link) => {
            link.removeEventListener('click', this.clickedLinkListener);
        });
    }
}
customElements.define('router-component', RouterComponent);

export { extractPathParams, RouterComponent };
