[![Build Status](https://travis-ci.org/mkay581/router-js.svg?branch=master)](https://travis-ci.org/mkay581/router-js)

# RouterJS

A simple framework for single-page, in-browser apps that allows you to load, show, and
hide "pages" dynamically when urls are requested without having to refresh the page.
Also allows you to map specific modules to pages all through one simple configuration file.

As seen on [fallout4.com](http://www.fallout4.com).

## Benefits

* Loads scripts, templates, data, and css files
* Caches requests for faster performance
* Supports handlebar templates (.hbs) allowing them to be loaded on the client-side


## Prerequisites

### Server setup

Before you begin using, you must setup your server to have all of urls point to 
your index.html page that will house your code. If your server uses Apache, this can usually easily be done by
placing something like the following in a [.htaccess](https://httpd.apache.org/docs/current/howto/htaccess.html) file.

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

Create your modules configuration:

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
        template: 'custom/module/template.html'
    }
};
```

Then map your urls to your pages in another configuration object.

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

## Usage

### Listening in on url requests

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
under your `home` pages config entry will load instantly.

### Initial page load

When starting the router and loading the initial page from your browser, the Router could possibly load
before the DOM has been loaded (depending on when you decide to call the `start()` method). If so,
you'll need to listen for the DOM to be loaded, and then trigger the current url as illustrated below.
This should be done right right after your call to `start()`.

```javascript
window.addEventListener('DOMContentLoaded', function () {
    router.triggerRoute(window.location.pathname);
});
```

### Triggering URLs

If you need to trigger new urls in your javascript programmatically, you can do things like this:

```javascript
router.triggerRoute('home').then(function () {
   // home page element has been injected into DOM and active class has been applied
});
```

## Important Notes

* Any javascript files that you include in your routes configuration must be "require"-able using either 
Browserify, RequireJS or any other script loader that exposes a global "require" variable.
* Once a CSS file is loaded, it is loaded infinitely, so it's important to namespace your styles and be specific 
 if you do not want your styles to overlap and apply between pages.
* When a page is loaded, it is cached and will remain hidden in the DOM until you physically remove the
element in your custom destroy logic.


### ES6 Module Scripts

If the `script` path you specify for any given route is an ES6 module, it must `export` a class as the `default` or router will fail.
Here is a sample ES6 module.

```
class Person {
    get age {
        return 5;
    }
}

export default Person;
```

## FAQ

#### Why do I get "cannot find module", when attempting a url?

This is most likely because you're using a tool like Browserify or similiar where code is compiled all at once before running in the browser.
If this is the case, the router most likely is attempting to load your script (JS file), but it can't be found because you
haven't compiled it. You must make sure that your js file path is already exposed (required) so that when router runs it, it can
resolve to the correct place. If you are using browserify, you can do this by using the
[`requires` option](https://github.com/substack/node-browserify#brequirefile-opts) which will ensure
your scripts are loaded.


## Build

You can run a browserified build which will compile the router logic all into one file in the dist/ folder by running the following:

```
grunt bt:build
```


