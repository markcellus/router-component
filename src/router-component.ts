export function extractPathParams(pattern: string, path: string): string[] {
    return [];
}

export class RouterComponent extends HTMLElement {

    private shownPage: Element | undefined;
    private fragment: DocumentFragment;
    private changedUrlListener: () => void;
    private routeElements: Set<Element> = new Set();
    private clickedLinkListener: () => void;

    changedUrl(e: PopStateEvent) {
        const { pathname } = this.location;
        if (this.shownPage.getAttribute('path') === pathname) return;
        this.show(pathname);
    }
    connectedCallback() {
        this.fragment = document.createDocumentFragment();
        const children: HTMLCollection = this.children;
        while (children.length > 0) {
            const [element] = children;
            this.routeElements.add(element);
            this.fragment.appendChild(element);
        }
        this.changedUrlListener = this.changedUrl.bind(this);
        window.addEventListener('popstate', this.changedUrlListener);
        this.show(this.location.pathname);
    }

    get basePath() {
        let { pathname} = this.location;
        if (pathname === '/') {
            pathname = `/${pathname.replace(/^\//, '')}`;
        }
        return pathname.substring(0, pathname.lastIndexOf('/')) + '/';
    }

    matchPathWithRegex(pathname: string = '', regex: string): RegExpMatchArray {
        if (pathname === '/') {
            pathname = `${this.basePath}${pathname.replace(/^\//, '')}`;
        }
        return pathname.match(regex);
    }

    getRouteElementByPath(pathname: string): Element | undefined {
        let element: Element;
        if (!pathname) return;
        for (const child of this.routeElements) {
            if (this.matchPathWithRegex(pathname, child.getAttribute('path'))) {
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
            throw new Error(`Navigated to path "${pathname}" but there is no matching element with a path ` +
                `that matches. Maybe you should implement a catch-all route with the path attribute of ".*"?`)
        }
        this.appendChild(element);

        // we must wait a few milliseconds for the DOM to resolve
        // or links wont be setup correctly
        const timer = setTimeout(async () => {
            this.bindLinks(element);
            clearTimeout(timer);
        }, 200);

        if (this.shownPage) {
            this.fragment.appendChild(this.shownPage);
            this.unbindLinks(this.shownPage);
        }
        this.shownPage = element;
    }

    get location(): Location {
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
            window.history.pushState({}, document.title, link.pathname);
            window.dispatchEvent(popStateEvent);
        }
    }

    bindLinks(element: Element) {
        const links: NodeListOf<HTMLAnchorElement> = element.querySelectorAll('a');
        // TODO: dont stop at just the first level shadow root
        const shadowLinks: NodeListOf<HTMLAnchorElement> | [] = element.shadowRoot ? element.shadowRoot.querySelectorAll('a') : [];
        this.clickedLinkListener = this.clickedLink.bind(this);
        [...links, ...shadowLinks].forEach((link) => {
            link.addEventListener('click', this.clickedLinkListener);
        });
    }
    
    unbindLinks(element: Element) {
        const links: NodeListOf<HTMLAnchorElement> = element.querySelectorAll('a');
        const shadowLinks: NodeListOf<HTMLAnchorElement> | [] = element.shadowRoot ? element.shadowRoot.querySelectorAll('a') : [];
        this.clickedLinkListener = this.clickedLink.bind(this);
        [...links, ...shadowLinks].forEach((link) => {
            link.removeEventListener('click', this.clickedLinkListener);
        });
    }

}

customElements.define('router-component', RouterComponent);
