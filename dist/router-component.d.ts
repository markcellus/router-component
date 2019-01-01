export declare function extractPathParams(pattern: string, path: string): string[];
export declare class RouterComponent extends HTMLElement {
    private shownPage;
    private fragment;
    private popStateChangedListener;
    private routeElements;
    private clickedLinkListener;
    private historyChangeStates;
    private originalDocumentTitle;
    private invalid;
    constructor();
    connectedCallback(): void;
    getRouteElementByPath(pathname: string): Element | undefined;
    show(pathname: string): any;
    readonly location: Location;
    disconnectedCallback(): void;
    clickedLink(link: HTMLAnchorElement, e: Event): void;
    bindLinks(): void;
    unbindLinks(): void;
    private matchPathWithRegex;
    private popStateChanged;
    private setupElement;
    private teardownElement;
    private getExternalRouterByPath;
}
