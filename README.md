# Route Manager

A simple routing framework that allows you to load, show, and hide pages based on urls all with 
one routes configuration file.

## Usage

Given the following routes configuration:

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


Then startup the router:

```javascript
var RouteManager = require('route-manager')({
    config: routes,
    pagesContainerEl: document.body
});
```

Then you can do things like this:

```javascript
RouteManager.triggerRoute('home').then(function () {
   // home page element has been injected into DOM and active class has been applied
});
```

For flexibility, you can style your divs to show and hide based on the css classes that are applied.