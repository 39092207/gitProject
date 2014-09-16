/*!
 * nodeclub - app.js
 */

/**
 * Module dependencies.
 */



require('newrelic');

var path = require('path');
var Loader = require('loader');
var express = require('express');
var session = require('express-session');
var config = require('./config');
var passport = require('passport');
require('./models');
var GitHubStrategy = require('passport-github').Strategy;
var githubStrategyMiddleware = require('./middlewares/github_strategy');
var routes = require('./routes');
var auth = require('./middlewares/auth');
var MongoStore = require('connect-mongo')(session);
var _ = require('lodash');
var csurf = require('csurf');
var compress = require('compression');
var bodyParser = require('body-parser');
var busboy = require('connect-busboy');
var errorhandler = require('errorhandler');

// 静态文件目录
var staticDir = path.join(__dirname, 'public');

// assets
var assets = {};
if (config.mini_assets) {
    try {
        assets = require('./assets.json');
    } catch (e) {
        console.log('You must execute `make build` before start app when mini_assets is true.');
        throw e;
    }
}

var urlinfo = require('url').parse(config.host);
config.hostname = urlinfo.hostname || config.host;

var app = express();


// configuration in all env
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'html');
app.engine('html', require('ejs-mate'));
//layout.html总是在渲染试图时被渲染。此处的_layoutFile属性不知道是个什么用法？？？？？

app.locals._layoutFile = 'layout.html';
app.use(require('response-time')());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(require('method-override')());
app.use(require('cookie-parser')(config.session_secret));
app.use(compress());
app.use(session({
    secret: config.session_secret,
    key: 'sid',
    store: new MongoStore({
        url: config.db
    }),
    resave: true,
    saveUninitialized: true
}));

app.use(passport.initialize());

// custom middleware
app.use(require('./controllers/sign').auth_user);
app.use(auth.blockUser());

app.use(Loader.less(__dirname));
app.use('/public', express.static(staticDir));

if (!config.debug) {
    app.use(csurf());
    app.set('view cache', true);
}

// for debug
// app.get('/err', function (req, res, next) {
//   next(new Error('haha'))
// });
debugger;
// set static, dynamic helpers
//扩展locals，为程序提供应用程序级的变量，settings就是一样应用程序级的变量，在前端可以直接访问
/*
 静态资源加载器（自动生成html标签引用）,环境判别由done方法的第三个参数决定，如果传入combo值，将决定选用线下版本还是线上版本。
 如果不传入第三个参数，将由环境变量。
 上线时，需要调用minify方法进行静态资源的合并和压缩。
 如下代码实现：


 eg:<%- Loader('/public/stylesheets/index.min.css')
 .css('/public/libs/bootstrap/css/bootstrap.css')
 .css('/public/stylesheets/common.css')
 .css('/public/libs/webuploader/webuploader.css')
 .done(assets, config.site_static_host, config.mini_assets)静态文件存储域名，是否启用静态文件的合并压缩
 %>
 Loader('/public/index.min.js')
 .js('/public/libs/code-prettify/prettify.js')
 .js('/public/libs/jquery-2.1.0.js')
 .done(assets, config.site_static_host, config.mini_assets)


 <link rel="stylesheet" href="/public/libs/bootstrap/css/bootstrap.css?v=1410772562210" media="all" />
 <link rel="stylesheet" href="/public/stylesheets/common.css?v=1410772562210" media="all" />
 <link rel="stylesheet" href="/public/stylesheets/style.less?v=1410772562210" media="all" />
 <link rel="stylesheet" href="/public/libs/webuploader/webuploader.css?v=1410772562210" media="all" />
 */
_.extend(app.locals, {
    config: config,
    Loader: Loader,
    assets: assets
});

_.extend(app.locals, require('./common/render_helpers'));
app.use(function (req, res, next) {
    res.locals.csrf = req.csrfToken ? req.csrfToken() : '';
    next();
});

// github oauth
passport.serializeUser(function (user, done) {
    done(null, user);
});
passport.deserializeUser(function (user, done) {
    done(null, user);
});
passport.use(new GitHubStrategy(config.GITHUB_OAUTH, githubStrategyMiddleware));

app.use(busboy({
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    }
}));

// routes
debugger;
routes(app);

// error handler
if (config.debug) {
    app.use(errorhandler());
} else {
    app.use(function (err, req, res, next) {
        return res.send(500, '500 status');
    });
}

app.listen(config.port, function () {
    console.log("NodeClub listening on port %d in %s mode", config.port, app.settings.env);
    console.log("God bless love....");
    console.log("You can debug your app with http://" + config.hostname + ':' + config.port);
});


module.exports = app;
