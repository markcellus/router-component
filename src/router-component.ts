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

export class RouterComponent extends HTMLElement {
    private shownPage: Element | undefined;
    private fragment: DocumentFragment;
    private changedUrlListener: () => void;
    private routeElements: Set<Element> = new Set();
    private clickedLinkListener: () => void;
    // TODO: fix below so that we are using pushState and replaceState method signatures on History type
    private historyChangeStates: [
        (data: any, title?: string, url?: string) => void,
        (data: any, title?: string, url?: string) => void
    ];
    private originalDocumentTitle: string;

    constructor() {
        super();
        this.fragment = document.createDocumentFragment();
        const children: HTMLCollection = this.children;
        while (children.length > 0) {
            const [element] = children;
            this.routeElements.add(element);
            this.fragment.appendChild(element);
        }
    }

    changedUrl(e: PopStateEvent) {
        const { pathname } = this.location;
        if (this.shownPage && this.shownPage.getAttribute('path') === pathname) return;
        this.show(pathname);
    }

    connectedCallback() {
        this.changedUrlListener = this.changedUrl.bind(this);
        window.addEventListener('popstate', this.changedUrlListener);

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

    get filename(): string {
        return this.location.pathname.replace(this.directory, '');
    }

    get directory(): string {
        const { pathname } = this.location;
        return pathname.substring(0, pathname.lastIndexOf('/')) + '/';
    }

    get extension(): string {
        const { pathname } = this.location;
        const frags = pathname.split('.');
        if (frags.length <= 1) {
            return '';
        }
        return frags[frags.length - 1];
    }

    matchPathWithRegex(pathname: string = '', regex: string): RegExpMatchArray {
        if (!pathname.startsWith('/')) {
            pathname = `${this.directory}${pathname.replace(/^\//, '')}`;
        }
        return pathname.match(regex);
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

    show(pathname: string) {
        if (!pathname) return;

        const element = this.getRouteElementByPath(pathname);
        if (this.shownPage === element) {
            return;
        }

        if (!element) {
            throw new Error(
                `Navigated to path "${pathname}" but there is no matching element with a path ` +
                    `that matches. Maybe you should implement a catch-all route with the path attribute of ".*"?`
            );
        }
        this.appendChild(element);
        this.setupElement(element);

        if (this.shownPage) {
            this.fragment.appendChild(this.shownPage);
            this.teardownElement(this.shownPage);
        }
        this.shownPage = element;
        this.dispatchEvent(new CustomEvent('route-changed'));
    }
    get location(): Location {
        return window.location;
    }

    set location(value: Location) {
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
        this.routeElements.clear();
    }

    clickedLink(e: MouseEvent) {
        const link = e.target as HTMLAnchorElement;
        if (link.origin === this.location.origin) {
            e.preventDefault();
            const popStateEvent = new PopStateEvent('popstate', {});
            window.history.pushState({}, document.title, `${link.pathname}${link.search}`);
            this.changedUrl(popStateEvent);
        }
    }

    bindLinks(element: Element) {
        const links: NodeListOf<HTMLAnchorElement> = element.querySelectorAll('a');
        // TODO: dont stop at just the first level shadow root
        const shadowLinks: NodeListOf<HTMLAnchorElement> | [] = element.shadowRoot
            ? element.shadowRoot.querySelectorAll('a')
            : [];
        this.clickedLinkListener = this.clickedLink.bind(this);
        [...links, ...shadowLinks].forEach(link => {
            link.addEventListener('click', this.clickedLinkListener);
        });
    }

    unbindLinks(element: Element) {
        const links: NodeListOf<HTMLAnchorElement> = element.querySelectorAll('a');
        const shadowLinks: NodeListOf<HTMLAnchorElement> | [] = element.shadowRoot
            ? element.shadowRoot.querySelectorAll('a')
            : [];
        this.clickedLinkListener = this.clickedLink.bind(this);
        [...links, ...shadowLinks].forEach(link => {
            link.removeEventListener('click', this.clickedLinkListener);
        });
    }

    private setupElement(element: Element) {
        // we must wait a few milliseconds for the DOM to resolve
        // or links wont be setup correctly
        const timer = setTimeout(async () => {
            this.bindLinks(element);
            clearTimeout(timer);
        }, 200);
        this.originalDocumentTitle = document.title;
        const title = element.getAttribute('document-title');
        if (title) {
            document.title = title;
        } else {
            document.title = this.originalDocumentTitle;
        }
    }

    private teardownElement(element: Element) {
        this.unbindLinks(element);
    }
}

customElements.define('router-component', RouterComponent);
