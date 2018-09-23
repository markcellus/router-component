[![Build Status](https://travis-ci.org/mkay581/router-js.svg?branch=master)](https://travis-ci.org/mkay581/router-js)

# Router Component

A small, declarative router component for single-page apps that allows you to load web pages (or any web component) 
dynamically when urls are requested, without performing a hard reload of the entire page.

## Benefits

* Very lightweight (there is very little code in this library)
* No dependencies -- only provides routing needs and nothing more
* Easy, declarative html syntax -- no complex configuration files or routing engines
* Automatically intercepts all `<a>` tags on a page (that contain relative `href`s) to prevent them from causing page
reloads, which use [pushState()](http://w3c.github.io/html/browsers.html#dom-history-pushstate) API.

## Installation

```
npm i router-component
```

## Prerequisites

This library assumes you are using a browser that supports [Web Components](https://www.webcomponents.org/introduction). 
and that you are using them as your routed elements. They are the future of the web and are already implemented 
natively in browsers.

For advanced usage of this library, you will need to know
[Regular Expressions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions) and how 
they work in JavaScript.

## Usage

### Basic Example

Code samples showing how to use this package can be found in the [examples](examples) folder, but here is a basic example.

```html
<html>
<head>
    <script type="module" src="node_modules/router-component/dist/router-component.js"></script>
    <script type="module">
        customElements.define('first-page', class extends HTMLElement {
          connectedCallback() {
            console.log(window.location.pathname); // "/page1"
          }
        }); 
        customElements.define('second-page', class extends HTMLElement {
           connectedCallback() {
              console.log(window.location.pathname); // "/second/view" OR "/second/view/"
           }
         }); 
        customElements.define('page-doesnt-exist', class extends HTMLElement {
           connectedCallback() {
              this.innerHTML = `<p>Wrong page, go to <a href="/page1">first page</a></p>`;
           }
         }); 
    </script>
</head>
<body>
    <router-component>
        <first-page path="/page1"></first-page>
        <second-page path="/second/view[/]?"></second-page>
        <page-doesnt-exist path=".*"></page-doesnt-exist>
    </router-component>
</body>
</html>

```


## API

Each child element of `<router-component>` should be extend 
[CustomElement](https://html.spec.whatwg.org/multipage/custom-elements.html#custom-elements) so that the following attributes
can be passed to them:

| Option | Type | Description |
|--------|--------|--------|
| `path`| String | A regex expression that the browser URL needs to match in order for the component to render. Capture groups are also supported to allow for dynamic parameters in URLs.
| `search-params`| String | A search string regex that the requested page would need to have in order to match. Setting this value to `foo=[bar|baz]` would match `index.html?foo=bar` for instance)

## Development

To run tests:

```bash
npm test
```

To debug and run locally:

```bash
npm start
```


