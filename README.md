[![Build Status](https://travis-ci.org/mkay581/router-component.svg?branch=master)](https://travis-ci.org/mkay581/router-component)
[![npm version](https://badge.fury.io/js/router-component.svg)](https://www.npmjs.com/package/router-component)

# `<router-component>`

A simple, declarative router component for single-page apps that allows you to load [Web Components](https://www.webcomponents.org/introduction)
dynamically when urls are requested, without performing a hard reload of the entire page.

## Benefits

-   Very lightweight (there is very little code in this library)
-   Only provides routing needs and nothing more
-   Easy, declarative html syntax -- no complex configuration files or routing engines
-   Automatically intercepts all `<a>` tags on a page (that contain relative `href`s) to prevent them from causing page
    reloads, which use [pushState()](http://w3c.github.io/html/browsers.html#dom-history-pushstate) API.

## Installation

```
npm i router-component
```

## Prerequisites

This library assumes you are using a browser that supports [Web Components](https://www.webcomponents.org/introduction)
and that you are using them as your routed elements. They are the future of the web and are already implemented
natively in browsers.

For advanced usage of this library, you will need to know
[Regular Expressions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions) and how
they work in JavaScript.

## Usage

### Basic Example

<!-- prettier-ignore -->
```html
<!-- index.html -->

<html>
<head>
    <script type="module" src="node_modules/router-component/dist/router-component.js"></script>
    <script type="module">
        customElements.define('first-page', class extends HTMLElement {
            connectedCallback() {
                this.innerHTML = `
                    Navigated to ${window.location.pathname} <br />` + //"/"
                    `Go to <a href="/second/view">second page</a>.`
                ;
            }
        });
        customElements.define('second-page', class extends HTMLElement {
            connectedCallback() {
                this.innerHTML = `
                    Navigated to ${window.location.pathname} <br />` + // "/second/view" OR "/second/view/"
                    `Go to <a href="/doesnt/work">a page that doesnt exist</a>.`
                ;
            }
        });
        customElements.define('page-doesnt-exist', class extends HTMLElement {
            connectedCallback() {
                this.innerHTML = `<p>Wrong page, go to <a href="/">first page again</a></p>`;
            }
        });
    </script>
</head>
<body>
<router-component>
    <first-page path="^/(index.html)?$"></first-page>
    <second-page path="/second/view[/]?"></second-page>
    <page-doesnt-exist path=".*"></page-doesnt-exist>
</router-component>
</body>
</html>

```

### More Examples

Code samples showing how to use this package can be found in the [examples](examples) folder. To run them, pull down this project
and

```bash
npm run start-server
```

Which will make the examples available at http://localhost:3239/examples/.

## Route API

Each child element of `<router-component>` should be a
[CustomElement](https://html.spec.whatwg.org/multipage/custom-elements.html#custom-elements) so that the following attributes
can be passed to them:

| Option           | Type   | Description                                                                                                                                                               |
| ---------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `path`           | String | A regex expression that the browser URL needs to match in order for the component to render. Capture groups are also supported to allow for dynamic parameters in URLs.   |
| `search-params`  | String | A search string regex that the requested page would need to have in order to match. Setting this value to `foo=[bar\|baz]` would match `index.html?foo=bar` for instance) |
| `document-title` | String | The [title of the document](https://html.spec.whatwg.org/multipage/dom.html#document.title) that will be shown when the route is active                                   |

## Router API

The goal of this package is to leverage the use of existing browser APIs, while providing only a few key pieces of logic that make routing easier, which is identified below.

### Changing Routes

There are two ways that a route can be changed.

1. By clicking on a relative link that is nested within a route element or
1. Programmatically using the [`pushState()`](http://w3c.github.io/html/browsers.html#dom-history-pushstate) or [`replaceState()`](http://w3c.github.io/html/browsers.html#dom-history-replacestate) API

```javascript
window.history.pushState({}, null, '/new-url');
```

Each method will trigger the `route-changed` event that is dispatched by the router component itself, which is illustrated in the next section below.

In the rare case you would like to push a new state or change the current location without triggering a new route, you
can pass `triggerRouteChange` flag like this:

```javascript
window.history.pushState({ triggerRouteChange: false }, null, '/new-url');
```

Router will clean up the `triggerRouteChange` property in `history.state`, so you don't need to worry about clearing it out.

### Detecting Route Changes

You can listen to route changes that are triggered either by link clicks or via `History`'s [pushState()](http://w3c.github.io/html/browsers.html#dom-history-pushstate) or replaceState API

```html
<html>
    <head>
        <script type="module" src="node_modules/router-component/dist/router-component.js"></script>
        <script type="module">
            const router = document.body.querySelector('router-component');
            router.addEventListener('route-changed', () => {
                // called everytime the route changes!
            });
        </script>
    </head>
    <body>
        <router-component>
            <other-page path="/other[/]?"></other-page>
            <fallback-page path=".*"></fallback-page>
        </router-component>
    </body>
</html>
```

## Development

To run tests:

```bash
npm test
```

To debug and run locally:

```bash
npm start
```
