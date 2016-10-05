/**
 * Created by shaopengli on 16/7/4.
 */
var express = require('express'),
    http = require('http'),
    passport = require('passport'),
    morgan = require('morgan'),
    compress = require('compression'),
    bodyParser = require('body-parser'),
    methodOverride = require('method-override'),
    cookieParser = require('cookie-parser'),
    session = require('express-session'),
    LocalStrategy = require('passport-local').Strategy,
    serverStatic = require('serve-static'),
    assert = require('assert'),
    EURO = require('./public/euro').EURO,
    mongoClient = require('mongodb').MongoClient,
    ObjectID = require('mongodb').ObjectID;




// USER = {username: 'admin@stevens.edu', password: 'admin'};   // local username and password

var app = express();
app.use(morgan());
app.use(compress());
app.use(bodyParser());
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({extended : true}));
app.use(methodOverride());
app.use(cookieParser());

app.use(session({
    secret : 'almvnirtgd#$DFsa25452*AYD*D*S!@!#adsda))Ddsadsax',
    cookie: {httpOnly: true, secure: false, maxAge: 86400000},
    store: new session.MemoryStore()
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(function(username, password, done) {
    db.collection('users').findOne({ username: username }, function (err, user) {
        if (err) { return done(err); }
        if (!user) { return done(null, false, {msg: 'Could not find user with username ' + username}); }
        if (!(user.password == password)) { return done(null, false, {msg: 'Incorrect password'}); }
        return done(null, user);
    });
}));

passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(user, done) {
    done(null, user);
});

app.use('/', serverStatic(__dirname + '/public'));

var isLoggedIn = function(req, res, next) {
    if (req.isAuthenticated()) {
        next();
    } else {
        // for this part this should be redirect here
      //  res.send({
      //      msg: 'Please login to access this information'
      //  }, 403);
        //res.send(403);
        console.log('now comes in error page');
        res.redirect('/');
    }
};

app.post('/api/login', function(req, res, next) {
    passport.authenticate('local', function(err, user, message) {
        if (err) {
            return next(err);
        }
        if (!user) {
            return res.status(400).send({loginStatus: false, msg: message});
        }
        req.logIn(user, function(err) {
            if (err) {
                return res.send({msg: 'Error logging in', err: err}, 500);
            }
            return res.send({loginStatus: true, user: user});
        });
    })(req, res, next);
});

app.get('/api/session', isLoggedIn, function(req, res) {
    res.send({
        loginStatus: true,
        user: req.user
    });
});

//this route not use for now
app.get('/api/logout', function(req, res) {
    req.logout();
    res.redirect('http://localhost:8000/#/login');
});


/*
*  database start here
* */
var db;

mongoClient.connect('mongodb://Shaopeng:123456@ds023664.mlab.com:23664/nodelsp', function (err, database) {
    if(err) return console.log(err);
    db = database;
    
});

app.post('/api/makeReserve', function(req, res){
    db.collection('reservations').save(req.body, function(err, result){
        if(err) return console.log(err);

        //console.log(req.body);
        res.send({id: result.ops[0]._id});
    })
});

app.post('/api/getReserve', function (req, res) {
    var obj_id = new ObjectID(req.body.id);
    
    db.collection('reservations').find({_id: obj_id}).toArray(function (err, result) {
        res.send(result);
    });
});

app.post('/api/changeReserve', function (req, res) {
    var obj_id = new ObjectID(req.body[0]._id);
    var term = req.body[0];
    term["_id"] = obj_id;
    db.collection('reservations').findOneAndReplace({_id: obj_id}, term);
    
    res.send("success");
});

app.post('/api/cancelReserve', function (req, res) {
    var obj_id = new ObjectID(req.body.id);

    db.collection('reservations').remove({_id: obj_id}).then(function (err, result) {
        res.send(result);
    });
});

app.get('/api/getAllReserve', isLoggedIn, function (req, res) {
    db.collection('reservations').find().toArray(function (err, result) {
        res.send(result);
    });
});

app.get('/api/owner/getProfile', isLoggedIn, function (req, res) {
    db.collection('restaurantProfile').find().toArray(function (err, result) {
        res.send(result);
    })
});

app.post('/api/owner/renewProfile', isLoggedIn, function (req, res) {
   db.collection('restaurantProfile').findOneAndReplace({_id:1},req.body);
    res.send("success");
});

app.post('/api/owner/addContact', isLoggedIn, function (req, res) {
    db.collection('orderRecords').save(req.body, function (err, result) {
        if(err){
            console.log(err);
        }

        res.send("success");
    })
});

app.get('/api/owner/getContact', isLoggedIn, function (req, res) {
    db.collection('orderRecords').find().toArray(function (err, result) {
        res.send(result);
    })
});

app.get('/api/owner/getTableList', isLoggedIn, function (req, res) {
    db.collection('tableList').find().toArray(function (err, result) {
        res.send(result);
    })
});

app.post('/api/owner/takeTable', isLoggedIn, function (req, res) {
    var id = req.body._id;
    console.log({_id:id});
    console.log(req.body);
    db.collection('tableList').findOneAndReplace({_id:id}, req.body);
    res.send('success');
});

app.post('/api/owner/cancelTable', isLoggedIn, function (req, res) {
    db.collection('tableList').find({_id:req.body.id}).toArray(function (err, result) {
        var send = result[0];
        
        console.log(send);
        send.status = "Available";
        send.since = "";
        send.CNF = "";
        send.name = "";
        send.style = "";
        
        db.collection('tableList').findOneAndReplace({_id:req.body.id}, send);
        
        res.send('cancel table successful');
    })
});

app.post('/api/changeState', isLoggedIn, function (req, res) {
    var obj_id = new ObjectID(req.body.id);
    db.collection('reservations').find({_id: obj_id}).toArray(function (err, result) {
        if(err){
            console.log(err);
        }
        console.log(req.body);
        
        
        var send = result[0];
        send.table = req.body.table;
        send.status = (send.status == "pending") ? "success" : "pending";
        console.log(send);
        db.collection('reservations').findOneAndReplace({_id: obj_id}, send);
        res.send('success');
    });

});

app.get('/api/owner/getSetting', function (req, res) {
    db.collection('AppSetting').find().toArray(function (err, result) {
        if(err){
            console.log(err);
        }
        res.send(result);
    });
});

app.post('/api/owner/changeSetting', isLoggedIn, function (req, res) {
   db.collection('AppSetting').findOneAndReplace({_id:1}, req.body);
    res.send('successful');
});

app.get('/', function (req, res) {
   res.render('tpls/notice.ejs'); 
});

var port = process.env.PORT || 8000;
app.listen(port);
console.log('Please go to http://localhost:' + port);

