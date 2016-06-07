[![Build Status](https://travis-ci.org/mkay581/router-js.svg?branch=master)](https://travis-ci.org/mkay581/router-js)

# RouterJS

A simple framework for single-page, in-browser apps that allows you to load, show, and
hide "pages" dynamically when urls are requested without having to refresh the page.
Also allows you to map specific modules to pages all through one simple configuration file.

As seen on [fallout4.com](http://www.fallout4.com).

## Benefits

* Loads scripts, templates, data, and css files using the [Fetch API](https://fetch.spec.whatwg.org/)
* Caches requests for faster performance
* Supports handlebar templates (.hbs) allowing them to be loaded on the client-side
* Uses [pushState()](http://w3c.github.io/html/browsers.html#dom-history-pushstate) API.
* Automatically modifies all internal `<a>` tags on a page to prevent them from causing page reloads

## Examples

Samples of how to use this package can be found in the [examples](examples) folder.

## Prerequisites

### Server setup

Before you begin, although not required, you should setup your server to have all of urls point to your index.html page
that will house your code. That way, when a page under a nested url is accessed from the browser, it will go to index.html
so that Router can navigate the user to the correct page within your single page application. This is also helpful
when the user attempts to refresh the page while on a nested url.

If your server uses Apache, this can usually easily be done by placing something like the following in
a [.htaccess](https://httpd.apache.org/docs/current/howto/htaccess.html) file.

```
<ifModule mod_rewrite.c>
    RewriteEngine On
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteCond %{REQUEST_URI} !index
    RewriteRule (.*) index.html [L]
</ifModule>
```
 
## Setup

### 1. Create a container element for your pages

First, create your index.html or similar (if you don't already have one) with at least 
one html element that your pages will be shown in.

```html
<html>
    <body>
        <div class="page-container"></div>
    </body>
</html>
```

### 2. Style your divs

When a page url (route) is requested, css classes are applied and removed. So you'll need to setup a few lines of css 
to show and hide based on the css classes that Router applies. 

```css
.page {
    display: none;
}

.page-active {
    display: block;
}
```

Of course, you can use fancier CSS transitions if you'd like.

### 3. Configure your modules, pages and routes

Then, create your modules and pages configurations identified below.

## Usage

### Configuration

First you need a configuration file that identifies the urls to each of their pages and the modules they will contain.
Here's a sample Module configuration.

```javascript
var modules = {
    'header': {
        script: 'path/to/header.js',
        template: 'path/to/header.html',
        data: 'url/to/my/header/data',
        global: true
    },
    'custom-module': {
        script: 'custom/module/path.js',
        template: 'custom/module/template.html',
        options: { //any custom options that are passed to the module when router instantiates
            custom: true
        }
    }
};
```

And here is a sample page configuration that maps the modules specified above.

```javascript
var pages = {
    '^home(/)?$': {
        template: '/path/to/homepage.html',
        modules: [
            'header',
            'custom-module'
        ],
        script: 'home-page.js',
        data: 'url/to/home-page/data'
    }
};
```


### Startup

To start the router, you must pass it your page and module configuration objects and run the `start()` method
 to begin listening in on url requests. This example uses the `pages` and `modules` configuration specified above.

```javascript
import Router from 'router-js';
var router = new Router({
    pagesConfig: pages,
    modulesConfig: modules,
    pagesContainer: document.body.getElementsByClassName('page-container')[0]
});
router.start();
```

Then, when a user requests the `/home` url,  the templates, script, modules and data
under your `home` pages config entry will load instantly. Note that to support direct nested url requests, you must
have your [server setup to do so](#server-setup).

### Handling initial page load

When starting the router and loading the initial page from your browser, the Router could possibly load
before the DOM has been loaded (depending on when you decide to call the `start()` method). If so,
you'll need to listen for the DOM to be loaded, and then trigger the current url as illustrated below.
This should be done right right after your call to `start()`.

```javascript
window.addEventListener('DOMContentLoaded', function () {
    router.triggerRoute(window.location.pathname);
});
```

## Options

When instantiating the Router, you can pass it options:

| Option | Type | Description |
|--------|--------|--------|
| `pagesConfig`| Object | An object that maps all urls to their appropriate page scripts, templates and css
| `modulesConfig`| Object | An object that maps all available modules in your application to their appropriate scripts, templates and css
| `pagesContainer`| HTMLElement | The element under which all page elements will be nested (defaults to the `document.body` element)
| `requestOptions`| Object | A set of global options that will be used whenever a page is fetched
| `onRouteRequest`| Function | An optional function to intercept url requests before Router does anything with it
| `onRouteError`| Function | An optional function that is triggered whenever this is a page load error
| `onRouteChange`| Function | Called whenever a new route (url) has been requested
| `onPageLoad`| Function | Called whenever a new page is loaded
| `pageClass`| [Module](https://github.com/mkay581/module-js#module-js) | A custom class for pages that will be instantiated as urls are requested
| `moduleClass`| [Module](https://github.com/mkay581/module-js#module-js) | A custom class for modules that will be instantiated as urls are requested

## Methods

For the most part, after setting up your Router instance, the user would click around on your pages to control which pages are shown.
But you may want to manually perform actions on your Router using javascript. For this purpose, you can use the methods below on
your Router instance.

### start()

Starts the router to begin intercepting url requests and binds all listeners.

### stop()

Puts the router in a "sleep" state and unbinds all listeners. In other words, it's just the opposite of `start()`.

### triggerRoute(url)

The triggerRoute method tells router to navigate to a specific `url`. When this is called, all templates, css, data, and scripts
will load for the url which are all retrieved by the [fetch API](https://fetch.spec.whatwg.org/).

```javascript
router.triggerRoute('home').then(function () {
   // home page element has been injected into DOM and active class has been applied
});
```

### loadPage(url)

Loads the page at the specified `url`, which essentially calls the Page instance's `load()` method, which loads the template,
css, data, for a Page, along with all of the page's sub-modules.

### showPage(url)

Shows a Page instance associated with the specified url and calls its `show()` method.
It is worth noting that when a page is shown, all `<a>` tags, in that page's html, that contain
an `href` attribute are modified to trigger the urls
without causing a page reload. This is a single-page application package, remember? :)

### hidePage(url)

Hides a Page instance associated with the specified url and calls its `hide()` method.

### reset()

The Router caches subsequent requests to the same pages for performance. In other words, every page only loads once
(but can be shown and hidden multiple times). Calling this method will reset that cache so that pages load again.

### resetPage(url)

This is the same as the [reset](#reset) method, but just for a single page.


## Pages and Modules

From the Router's perspective, everything is a [Module](https://github.com/mkay581/module-js#module-js) based off of the
[module-js](https://github.com/mkay581/module-js#module-js) package, including a Page.
So each of the Page and Module instances used by Router share the same interface, allowing Router to manipulate them as necessary.

If you would like to have your own custom implementations of Pages or Modules that load upon any given url request,
you will need to ensure your custom class implements the same interface as the Module class in
the [module-js](https://github.com/mkay581/module-js#module-js) package or have your custom class extend it using
the `extends` keyword illustrated below.

```
//page.js
class CustomPage extends Module {
    load () {
         // my custom loading here
         return super.load();
    }
```

Then you would pass your custom Page class to Router using the `pageClass` option, as illustrated below:

```javascript
let router = new Router({
    pageClass: CustomPage,
    pagesConfig: {
        //... page config here
    }
});

```

## Global Modules

Sometimes there will be modules (like headers and footers for instance) that you would like to live indefinitely and
be shown in combination with multiple pages. These modules are considered "global" and Router treats them
like a Singleton that is separate from all other modules. Global modules are only instantiated once, regardless of how many
page's have them specified.

To mark a module as global, just set the global flag to true inside your modules configuration illustrated below.

```javascript
 var router = Router({
    modulesConfig: {
        'header': {
            global: true,
            template: 'path/to/header.html',
            el: document.getElementById('header'), // optional pre-existing element where header template content should be appended
            script: 'path/to/header-script' // this can return a singleton or an es6 class
        }
    },
    pagesConfig: {
        'page1': {
            template: 'path/to/page/1',
            modules: ['header']
        },
        'page2': {
            template: 'path/to/page/2',
            modules: ['header']
        }
    }
 })

```

The above code ensures that the `header` module appears on both at page1 and page2 urls.

## Important Notes

* Any javascript files that you include in your routes configuration must be "require"-able using either 
Browserify, RequireJS or any other script loader that exposes a global "require" variable.
* Once a CSS file is loaded, it is loaded infinitely, so it's important to namespace your styles and be specific 
 if you do not want your styles to overlap and apply between pages. This will no longer be a problem when
 [Web Components](https://github.com/w3c/webcomponents) are more widely supported by browsers.

## FAQ

#### Why do I get "cannot find module", when attempting a url?

This is most likely because you're using a tool like Browserify or similiar where code is compiled all at once before running in the browser.
If this is the case, the router most likely is attempting to load your script (JS file), but it can't be found because you
haven't compiled it. You must make sure that your js file path is already exposed (required) so that when router runs it, it can
resolve to the correct place. If you are using browserify, you can do this by using the
[`requires` option](https://github.com/substack/node-browserify#brequirefile-opts) which will ensure
your scripts are loaded.


## Development


To run tests:

```
npm install
npm test
```


