// I CAN'T USE PUSHSTATE IN OFFLINE MODE:
// pushState() WORKS ONLY ON WEB SERVER: https://github.com/cferdinandi/smooth-scroll/issues/195
// ERROR: DOMException: Failed to execute 'pushState' on 'History': A history state object with URL 'file:///Users/tomas/Desktop/web-development/3rd-pathparser/users' cannot be created in a document with origin 'null'
// ROUTE2 WORKS SERVERLESS
// NICE ROUTES LIKE /user/new ARE NOT POSSIBLE (REQUIRES pushState() HTML5 FEATURE), AND ONLY HASH ROUTES WITH QUERY PARAMETERS CAN BE USED
// E.G. #faq~howto1?page=1
// E.G. #search~groupname-anchorid STRING AFTER ~ IS ANCHOR
// window.location KEEPS YOU AT THE SAME DOCUMENT IF YOU MODIFY ONLY THE HASH: https://developer.mozilla.org/en-US/docs/Web/API/History_API#The_pushState()_method
// NO SUPPORT FOR BASEURL - DEVELOPER MUST ALWAYS PROVIDE FULL URL
// SUPPORTS ONLY GET METHOD
// LOCAL STORAGE VS. COOKIE - https://stackoverflow.com/a/3220802/6135126
// REGEX TO MATCH ROUTE TAKEN FROM: https://github.com/garygreen/lightrouter
// DOMContentLoaded VS. load - https://stackoverflow.com/a/36096571/6135126
exports.$route2 = function(matcher, fn) {
    if (typeof(matcher) !== 'string' || (matcher[0] !== '#' && matcher !== '$error')) {
        throw new Error('api-matcher');
    }
    if (typeof(fn) !== 'function') {
        throw new Error('api-fn');
    }
    var cache = exports.$malloc('__ROUTE');
    var routes = cache('routes') || {};
    var v = parseRoute();
    var url;
    if (matcher !== '$error') {
        routes[matcher] = v;
        cache('routes', routes);
        if (routesLength() === 1) {
            document.addEventListener('DOMContentLoaded', function() {
                new exports.$Controller2().run();
            });
            url = [null, parseURL()];
            window.onhashchange = function() {
                url = [url[1], parseURL()];
                onHashChange();
            };
        }
    }
    else {
        cache('errorRoute', v);
    }
    function parseRoute() {
        var o = {
            matcher: matcher
        };
        if (matcher !== '$error') {
            o.exp = new RegExp('^' + matcher.replace(/\[(\w+)\]/g, '(\\w+)') + '$');
        }
        else {
            o.exp = null;
        }
        o.fn = fn;
        return o;
    }
    function routesLength() {
        var l = 0;
        for (var k in routes) {
            if (routes.hasOwnProperty(k)) {
                l++;
            }
        }
        return l;
    }
    function parseURL() {
        var tmp = location.href.split(location.origin + location.pathname)[1] || '';
        var exp = /^(#[^?$]*|)(?:(?=\?)(\?[^$]*)|)(?:(?=\$)\$(.*)|)$/; // https://regex101.com/r/w4nq0U/7
        var m = tmp.match(exp) || [];
        return {
            location: (!m[1] || m[1] === '#') ? '' : m[1],
            anchor: m[3]
        };
    }
    function onHashChange() {
        if (url[0].location === url[1].location) {
            if (!url[1].anchor) {
                location.reload();
            }
            else {
                scroll(url[1].anchor);
            }
        }
        else {
            location.reload();
        }
    }
    function scroll(elementID) {
        var el = document.getElementById(elementID);
        if (el) {
            el.scrollIntoView();
        }
    }
};
function $Controller2() {
    var cache = exports.$malloc('__ROUTE');
    this.statusCode = 200;
    this.error = null;
    this.args = [];
    this.query = null;
    this.run = function() {
        var v = this.findRoute();
        if (!v) {
            return this.routeError(404);
        }
        this.route = v;
        this.args = this.parseArgs();
        this.query = this.parseQuery();
        this.invokeRoute();
    };
    this.findRoute = function() {
        var routes = cache('routes') || {};
        var hash = this.parseURL().hash;
        var matcher = null;
        for (var k in routes) {
            if (routes.hasOwnProperty(k)) {
                if (routes[k].exp.test(hash)) {
                    matcher = k;
                }
            }
        }
        return matcher ? (routes[matcher] || null) : null;
    };
    this.parseURL = function() {
        var tmp = location.href.split(location.origin + location.pathname)[1] || '';
        var exp = /^(#[^?$]*|)(?:(?=\?)(\?[^$]*)|)(?:(?=\$)\$(.*)|)$/; // https://regex101.com/r/w4nq0U/7
        var m = tmp.match(exp) || [];
        return {
            hash: !m[1] ? '#' : m[1],
            query: m[2] || null
        };
    };
    this.parseArgs = function() {
        var m = this.parseURL().hash.match(this.route.exp);
        return (m || []).length > 1 ? m.slice(1) : [];
    };
    this.parseQuery = function() {
        var str = this.parseURL().query;
        if (!str) {
            return null;
        }
        str = str.replace(/\+/g, ' '); // ------------------------------------> "decodeURIComponent()" DOES NOT DECODE SPACES ENCODED AS "+"
        var exp = /[?&]([^=]+)=([^&]*)/g;
        var o = {};
        var m = null;
        while (m = exp.exec(str)) {
            var k = m[1] ? decodeURIComponent(m[1]) : '';
            var v = m[2] ? decodeURIComponent(m[2]) : '';
            if (k) {
                o[k] = v;
            }
        }
        return o;
    };
    this.invokeRoute = function() {
        this.route.fn.apply(this, this.args);
    };
}
$Controller2.prototype = {
    routeError: function(status, err) {
        var v = parseInt(status);
        this.statusCode = (isNaN(v) || v < 400 || v >= 600) ? 500 : v;
        if (err) {
            this.error = err;
        }
        var cache = exports.$malloc('__ROUTE');
        this.route = cache('errorRoute');
        this.invokeRoute();
    }
};
exports.$Controller2 = $Controller2;
