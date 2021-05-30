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

function delay(milliseconds: string | number = 0) {
    return new Promise<void>((resolve) => {
        const timer = setTimeout(() => {
            resolve();
            clearTimeout(timer);
        }, Number(milliseconds));
    });
}

const routeComponents: Set<RouterComponent> = new Set();

export class RouterComponent extends HTMLElement {
    private fragment: DocumentFragment;
    private popStateChangedListener: () => void;
    private routeElements = [];
    private shownRouteElements: Map<string, Element> = new Map();
    private previousLocation: Location;
    private clickedLinkListener: (e: any) => void;
    // TODO: fix below so that we are using pushState and replaceState method signatures on History type
    private historyChangeStates: Map<
        typeof history.pushState | typeof history.replaceState,
        'pushState' | 'replaceState'
    >;
    private originalDocumentTitle: string;
    private invalid: boolean;

    constructor() {
        super();
        routeComponents.add(this);
        this.fragment = document.createDocumentFragment();
        const children: HTMLCollection = this.children;
        while (children.length > 0) {
            const element = children[0];
            this.routeElements.push(element);
            this.fragment.appendChild(element);
        }
    }

    connectedCallback(): void {
        this.popStateChangedListener = this.popStateChanged.bind(this);
        window.addEventListener('popstate', this.popStateChangedListener);
        this.bindLinks();

        // we must hijack pushState and replaceState because we need to
        // detect when consumer attempts to use and trigger a page load
        this.historyChangeStates = new Map([
            [window.history.pushState, 'pushState'],
            [window.history.replaceState, 'replaceState'],
        ]);
        for (const [method, name] of this.historyChangeStates) {
            window.history[name] = (
                state: Record<'triggerRouteChange', boolean> | never,
                title: string,
                url?: string | null
            ) => {
                const triggerRouteChange =
                    !state || state.triggerRouteChange !== false;
                if (!triggerRouteChange) {
                    delete state.triggerRouteChange;
                }
                this.previousLocation = { ...this.location };
                method.call(history, state, title, url);

                if (triggerRouteChange) {
                    this.showRoute(url);
                }
            };
        }
        this.showRoute(this.getFullPathname(this.location));
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

    private get storedScrollPosition(): number | undefined {
        const positionString = sessionStorage.getItem('currentScrollPosition');
        return positionString && Number(positionString);
    }

    private set storedScrollPosition(value: number) {
        sessionStorage.setItem('currentScrollPosition', value.toString());
    }

    private scrollToHash(hash: string = this.location.hash): void {
        const behaviorAttribute = this.getAttribute(
            'hash-scroll-behavior'
        ) as ScrollBehavior;
        const hashId = hash.replace('#', '');
        const hashElement = querySelectorDeep(
            `[id=${hashId}]`,
            this
        ) as HTMLElement;
        if (hashElement) {
            hashElement.scrollIntoView({
                behavior: behaviorAttribute || 'auto',
            });
        }
    }

    private handleHash(hash = '', wait = false): void {
        const delayAttribute = this.getAttribute('hash-scroll-delay');

        const delay = delayAttribute ? Number(delayAttribute) : 1;

        if (!wait) {
            this.scrollToHash(hash);
        } else {
            // wait for custom element to connect to the DOM so we
            // can scroll to it, on certain browsers this takes a while
            const timer = setTimeout(() => {
                this.scrollToHash(hash);
                clearTimeout(timer);
            }, delay);
        }
    }

    /**
     * @deprecated since 0.15.0
     * TODO: remove this in next major version
     */
    show = this.showRoute;

    async showRoute(location: string): Promise<void> {
        if (!location) return;
        const [pathname, hashString] = location.split('#');
        const routeElement = this.getRouteElementByPath(pathname);

        if (!routeElement) {
            return console.warn(
                `Navigated to path "${pathname}" but there is no matching element with a path ` +
                    `that matches. Maybe you should implement a catch-all route with the path attribute of ".*"?`
            );
        }
        const child = this.children[0];

        if (
            child &&
            this.previousLocation.href !== this.location.href &&
            !querySelectorDeep('router-component', child)
        ) {
            this.hideRoute(this.previousLocation.pathname);
        }
        if (!this.shownRouteElements.has(pathname)) {
            this.shownRouteElements.set(pathname, routeElement);
        }
        this.dispatchEvent(new CustomEvent('route-changed'));
        this.appendChild(routeElement);
        this.dispatchEvent(
            new CustomEvent('showing-page', {
                detail: routeElement,
            })
        );
        const showDelayAttribute = this.getAttribute('show-delay');
        if (showDelayAttribute) {
            await delay(showDelayAttribute);
        }
        this.setupElement(routeElement);

        let scrollToPosition = 0;
        if (
            this.storedScrollPosition &&
            window.history.scrollRestoration === 'manual'
        ) {
            scrollToPosition = this.storedScrollPosition;
            sessionStorage.removeItem('currentScrollPosition');
        }

        if (hashString) {
            this.handleHash(`#${hashString}`);
        } else {
            window.scrollTo({
                top: scrollToPosition,
                behavior: 'auto', // we dont wanna scroll here
            });
        }
    }

    async hideRoute(location = ''): Promise<void> {
        if (!location) {
            return;
        }
        const [pathname] = location.split('#');
        const routeElement = this.getRouteElementByPath(pathname);
        if (!routeElement) {
            return;
        }

        this.dispatchEvent(
            new CustomEvent('hiding-page', {
                detail: routeElement,
            })
        );
        const hideDelayAttribute = this.getAttribute('hide-delay');
        if (hideDelayAttribute) {
            await delay(hideDelayAttribute);
        }
        this.fragment.appendChild(routeElement);
        this.teardownElement(routeElement);
    }

    get location(): Location {
        return window.location;
    }

    disconnectedCallback(): void {
        window.removeEventListener('popstate', this.popStateChangedListener);
        for (const [method, name] of this.historyChangeStates) {
            window.history[name] = method;
        }
        this.unbindLinks();
        this.shownRouteElements.clear();
        this.previousLocation = undefined;
    }

    clickedLink(link: HTMLAnchorElement, e: Event): void {
        const { href } = link;
        if (!href || href.indexOf('mailto:') !== -1) return;

        const { location } = this;
        const origin =
            location.origin || location.protocol + '//' + location.host;
        if (href.indexOf(origin) !== 0 || link.origin !== location.origin) {
            // external links
            window.history.scrollRestoration = 'manual';
            sessionStorage.setItem(
                'currentScrollPosition',
                document.documentElement.scrollTop.toString()
            );
            return;
        }
        e.preventDefault();

        const state: any = {};
        if (link.hash && link.pathname === location.pathname) {
            this.scrollToHash(link.hash);
            state.triggerRouteChange = false;
        }
        window.history.pushState(
            state,
            document.title,
            `${link.pathname}${link.search}${link.hash}`
        );
    }

    bindLinks(): void {
        // TODO: update this to be more performant
        // listening to body to allow detection inside of shadow roots
        this.clickedLinkListener = (e) => {
            if (e.defaultPrevented) return;
            const link = e
                .composedPath()
                .filter((n) => (n as HTMLElement).tagName === 'A')[0] as
                | HTMLAnchorElement
                | undefined;
            if (!link) {
                return;
            }
            this.clickedLink(link, e);
        };
        document.body.addEventListener('click', this.clickedLinkListener);
    }

    unbindLinks(): void {
        document.body.removeEventListener('click', this.clickedLinkListener);
    }

    private matchPathWithRegex(pathname = '', regex: string): RegExpMatchArray {
        if (!pathname.startsWith('/')) {
            pathname = `${pathname.replace(/^\//, '')}`;
        }
        return pathname.match(regex);
    }

    /**
     * Returns href without the hostname and stuff.
     * @param location
     * @returns
     */
    private getFullPathname(location: Location): string {
        if (!location) {
            return '';
        }
        const { pathname, search, hash } = location;
        return `${pathname}${search}${hash}`;
    }

    private async popStateChanged() {
        const path = this.getFullPathname(this.location);
        if (this.location.href !== this.previousLocation.href) {
            this.hideRoute(this.previousLocation.pathname);
        }
        this.showRoute(path);
    }

    private setupElement(routeElement: Element) {
        const { pathname } = this.location;
        this.originalDocumentTitle = document.title;
        const title = routeElement.getAttribute('document-title');
        if (title) {
            document.title = title;
        } else {
            document.title = this.originalDocumentTitle;
        }
        const nestedRouterComponent: RouterComponent =
            routeElement.querySelector('router-component');
        if (nestedRouterComponent) {
            nestedRouterComponent.showRoute(pathname);
        }
    }

    // eslint-disable-next-line no-unused-vars
    private teardownElement(element: Element) {
        document.title = this.originalDocumentTitle;
    }

    private getExternalRouterByPath(
        pathname: string
    ): RouterComponent | undefined {
        for (const component of routeComponents) {
            const routeElement = component.getRouteElementByPath(pathname);
            if (routeElement) {
                return component;
            }
        }
    }
}

customElements.define('router-component', RouterComponent);
