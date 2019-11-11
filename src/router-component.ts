import { querySelectorDeep } from 'query-selector-shadow-dom';

export function extractPathParams(pattern: string, path: string): string[] {
    const regex = new RegExp(pattern);
    const matches = regex.exec(path);
    if (!matches) {
        return [];
    } else {
        const groups = [...matches];
        // remove first result since its not a capture group
        groups.shift();
        return groups;
    }
}

const routeComponents: Set<RouterComponent> = new Set();

export class RouterComponent extends HTMLElement {
    private shownPage: Element | undefined;
    private fragment: DocumentFragment;
    private popStateChangedListener: () => void;
    private routeElements: Set<Element> = new Set();
    private clickedLinkListener: (e: any) => void;
    // TODO: fix below so that we are using pushState and replaceState method signatures on History type
    private historyChangeStates: [
        (data: any, title?: string, url?: string) => void,
        (data: any, title?: string, url?: string) => void
    ];
    private originalDocumentTitle: string;
    private invalid: boolean;

    constructor() {
        super();
        this.fragment = document.createDocumentFragment();
        routeComponents.add(this);
        const children: HTMLCollection = this.children;
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
            window.history[method.name] = (state: any, title: string, url?: string | null) => {
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
        const { pathname, hash } = this.location;
        this.show(`${pathname}${hash}`, true);
    }

    getRouteElementByPath(pathname: string): Element | undefined {
        let element: Element;
        if (!pathname) return;
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

    private handleHash(element?: Element, wait: boolean = false): void {
        const delayAttribute = this.getAttribute('hash-scroll-delay');
        const behaviorAttribute = this.getAttribute('hash-scroll-behavior') as ScrollBehavior;
        const delay = delayAttribute ? Number(delayAttribute) : 1;
        const scrollToHash = () => {
            const hashId = this.location.hash.replace('#', '');
            const hashElement = querySelectorDeep(`[id=${hashId}]`, element) as HTMLElement;
            hashElement && hashElement.scrollIntoView({ behavior: behaviorAttribute || 'auto' });
        };
        if (!wait) {
            scrollToHash();
        } else {
            // wait for custom element to connect to the DOM so we
            // can scroll to it, on certain browsers this takes a while
            const timer = setTimeout(() => {
                scrollToHash();
                clearTimeout(timer);
            }, delay);
        }
    }

    show(location: string, initialLoad: boolean = false) {
        if (!location) return;
        let router;
        const [pathname, hash] = location.split('#');
        const element = this.getRouteElementByPath(pathname);
        if (this.shownPage && this.shownPage.getAttribute('path') !== pathname) {
            this.invalid = true;
        }
        if (this.shownPage === element && !this.invalid) return;
        this.invalid = false;
        if (!element) {
            router = this.getExternalRouterByPath(pathname);
            if (router) {
                return router.show(pathname);
            }
        }

        if (!element) {
            return console.warn(
                `Navigated to path "${pathname}" but there is no matching element with a path ` +
                    `that matches. Maybe you should implement a catch-all route with the path attribute of ".*"?`
            );
        }
        if (this.shownPage) {
            this.fragment.appendChild(this.shownPage);
            this.teardownElement(this.shownPage);
        }
        this.shownPage = element;
        this.appendChild(element);
        this.setupElement(element);
        if (hash) {
            window.location.hash = hash;
            this.handleHash(element, initialLoad);
        }

        this.dispatchEvent(new CustomEvent('route-changed'));
    }

    get location(): Location {
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

    clickedLink(link: HTMLAnchorElement, e: Event) {
        const { href } = link;
        if (!href || href.indexOf('mailto:') !== -1) return;

        const { location } = window;
        const origin = location.origin || location.protocol + '//' + location.host;
        if (href.indexOf(origin) !== 0) return;
        if (link.origin === this.location.origin) {
            e.preventDefault();
            window.history.pushState({}, document.title, `${link.pathname}${link.search}${link.hash}`);
        }
    }

    bindLinks() {
        // TODO: update this to be more performant
        // listening to body to allow detection inside of shadow roots
        this.clickedLinkListener = e => {
            if (e.defaultPrevented) return;
            const link = e.composedPath().filter(n => (n as HTMLElement).tagName === 'A')[0] as
                | HTMLAnchorElement
                | undefined;
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

    private matchPathWithRegex(pathname: string = '', regex: string): RegExpMatchArray {
        if (!pathname.startsWith('/')) {
            pathname = `${pathname.replace(/^\//, '')}`;
        }
        return pathname.match(regex);
    }

    private popStateChanged() {
        this.show(this.location.pathname);
    }

    private setupElement(element: Element) {
        this.originalDocumentTitle = document.title;
        const title = element.getAttribute('document-title');
        if (title) {
            document.title = title;
        } else {
            document.title = this.originalDocumentTitle;
        }
    }

    // eslint-disable-next-line no-unused-vars
    private teardownElement(element: Element) {
        document.title = this.originalDocumentTitle;
    }

    private getExternalRouterByPath(pathname: string): RouterComponent | undefined {
        for (const component of routeComponents) {
            const routeElement = component.getRouteElementByPath(pathname);
            if (routeElement) {
                return component;
            }
        }
    }
}

customElements.define('router-component', RouterComponent);
