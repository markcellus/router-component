# Route Manager

A simple routing framework that allows you to load, show, and hide "pages" dynamically when urls within your 
app are requested without having to refresh the page.

## Benefits

* Loads scripts, templates, data, and css files
* Supports Browserify and RequireJS builds
* Caches requests for faster performance
* Supports handlebar templates (.hbs) allowing them to be loaded on the client-side


## Prerequisites

Before you begin using, you must setup your server to have all of urls point to 
your index.html page that will house your code.
 

## Usage 

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
to show and hide based on the css classes that RouteManager applies. 

```css
.page {
    display: none;
}

.page-active {
    display: block;
}
```

Of course, you can use fancier CSS transitions if you'd like.

### 3. Configure your routes

In your javascript file, create a routes object like so:

```javascript
var routes = {
    pages: {
        '^home(/)?$': {
            template: '/path/to/homepage.html',
            modules: [
                'header',
                'custom-module'
            ],
            script: 'home-page.js,
            data: 'url/to/home-page/data
        }                
    },
    modules: {
        'header': {
            script: 'path/to/header.js'',
            template: 'path/to/header.html',
            data: 'url/to/my/header/data',
            global: true
        },
        'custom-module': {
            script: 'custom/module/path.js',
            template: 'custom/module/template.html'
        }
    }
};

```

### 4. Start RouteManager

You must start RouteManager and pass it your routes object to begin listening in on url requests.

```javascript
var RouteManager = require('route-manager')({
    config: routes,
    pagesContainerEl: document.body.getElementsByClassName('page-container')[0]
});
```

Then, when a user requests the `/home` url,  the templates, script, modules and data 
under your `home` routes config entry will load instantly.


If you need to trigger new urls in your javascript programmatically, you can do things like this:

```javascript
RouteManager.triggerRoute('home').then(function () {
   // home page element has been injected into DOM and active class has been applied
});
```


### Important Notes

* Any javascript files that you include in your routes configuration must be "require"-able using either 
Browserify, RequireJS or any other script loader that exposes a global "require" variable. 