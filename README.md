[![Build Status](https://travis-ci.org/mkay581/router-js.svg?branch=master)](https://travis-ci.org/mkay581/router-js)

# Router

A small, declarative router web component for single-page apps that allows you to load pages dynamically when urls 
are requested without performing a hard reload of the entire web page.

## Benefits

* Very lightweight and no dependencies -- only provides routing needs and nothing more
* Declaritive syntax, no configuration file needed
* Automatically intercepts all `<a>` tags on a page (that contain relative `href`s) to prevent them from causing page
reloads, which use [pushState()](http://w3c.github.io/html/browsers.html#dom-history-pushstate) API.

## Examples

Samples of how to use this package can be found in the [examples](examples) folder.

## Installation

```
npm i router-js
```

## Prerequisites

This library assumes you are using a browser that supports [Web Components](https://www.webcomponents.org/introduction). 
They are the future of the web and are already implemented natively in browsers. So if you aren't already using them, 
you probably should. 

Before using this package, make sure your server is setup to have all your page URIs to point to the root index.html page of
your single-page application, which will have your router code. An example of the index.html is below.

## Usage

### Basic Example

```html
<html>
<head>
    <script type="module" src="node_modules/router-js/dist/router.js"></script>
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
    <router-component on-route-change=${this.handleChange}>
        <first-page path="/page1"></first-page>
        <second-page path="/second/view[/]?"></second-page>
        <page-doesnt-exist path="*"></page-doesnt-exist>
    </router-component>
</body>
</html>

```

### Advanced Example

```html
<html>
<head>
    <script type="module" src="node_modules/router-js/dist/router.js"></script>
    <script type="module">
        import { extractParams } from 'node_modules/router-js/dist/router.js'
        customElements.define('the-first-page', class extends HTMLElement {
              connectedCallback() {
                // called when "page1/?foo=bar" is requested ("page1/?foo=baz" would work too)
                const url = new URL(window.location);
                const paramValue = url.searchParams.get('foo');
                console.log(paramValue); // bar
              }
            }); 
        customElements.define('page-number-too',  class extends HTMLElement {
           connectedCallback() {
             // called when "second/page/851/markymark/" is requested
              const url = new URL(window.location);
              const pathPattern = this.getAttribute('path');
              const [id, username] = extractParams(url.href);
              console.log(id); // 851
              console.log(username); // markymark
           }
         }); 
        customElements.define('number-tree', class extends HTMLElement {
           connectedCallback() {
              console.log(window.location.pathname); // "/my/page/3"
           }
         }); 
        customElements.define('sub-page', class extends HTMLElement {
            connectedCallback() {
               console.log(window.location.pathname); // "/my/page/3/deeper/page"
            }
          }); 
        customElements.define('', class {
           connectedCallback() {
                this.innerHTML = `<p>Wrong page, go to <a href="/page?foo=bar">first page</a></p>`;
           }
         }); 
    </script>
</head>
<body>
    <router-component on-route-change=${this.handleChange}>
        <the-first-page path="/page1?foo=[bar|baz]"></the-first-page>
        <page-number-too path="second/page/[0-9]/[a-zA-Z]/"></page-number-too>
        <number-tree path="/my/page/3">
            <sub-page path="deeper/page"></sub-page>
        </number-tree>
        <four-oh-four-page path="*"></four-oh-four-page>
    </router-component>
</body>
</html>

```

## Development

To run tests:

```
npm test
```


