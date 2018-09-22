/*!
 * Router-component v0.1.0
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
    return [];
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
        this.show(this.location.pathname);
    }
    get directory() {
        const { pathname } = this.location;
        return pathname.substring(0, pathname.lastIndexOf('/')) + '/';
    }
    matchPathWithRegex(pathname = '', regex) {
        const { directory } = this;
        if (pathname === '/') {
            pathname = `${directory}${pathname.replace(/^\//, '')}`;
        }
        regex = `${directory}${regex.replace(/^\//, '')}`;
        return pathname.match(regex);
    }
    getRouteElementByPath(pathname) {
        let element;
        if (!pathname)
            return;
        for (const child of this.routeElements) {
            if (this.matchPathWithRegex(pathname, child.getAttribute('path'))) {
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
                `that matches. Maybe you should implement a catch-all route with the path attribute of "*"?`);
        }
        this.appendChild(element);
        // we must wait a few milliseconds for the DOM to resolve
        // or links wont be setup correctly
        const timer = setTimeout(() => __awaiter(this, void 0, void 0, function* () {
            this.setupLinks(element);
            clearTimeout(timer);
        }), 200);
        if (this.shownPage) {
            this.fragment.appendChild(this.shownPage);
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
    setupLinks(element) {
        const links = element.querySelectorAll('a');
        // TODO: dont stop at just the first level shadow root
        const shadowLinks = element.shadowRoot ? element.shadowRoot.querySelectorAll('a') : [];
        [...links, ...shadowLinks].forEach((link) => {
            link.addEventListener('click', (e) => {
                if (link.origin === window.location.origin) {
                    e.preventDefault();
                    this.show(link.pathname);
                }
            });
        });
    }
}
customElements.define('router-component', RouterComponent);

export { extractPathParams, RouterComponent };
