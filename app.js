//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");


// only gets binary form that is retrievable (forward and backward)
// const encrypt = require("mongoose-encryption");

// const md5 = require("md5");


// const bcrypt = require("bcrypt");
// const saltRounds = 10;

// salting and hashing through passport & local

const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");


const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");



const app = express();

app.use(express.static("public")); 

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ 
    extended: true
}));

app.use(session({
    secret: "Our little secret",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());


mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true});

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleid: String
});

// with mongoose encrypt 
// userSchema.plugin(encrypt , {secret: process.env.SECRET, encryptedFields: ["password"] });


// hash and salt passwords
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);


const User = new mongoose.model("User", userSchema);

// while using sessions
// while restarting the server the cookies gets deleted
passport.use(User.createStrategy());


// only with local
// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());


// with all kinds
passport.serializeUser(function(user, done){
    done(null, user.id)
});

passport.deserializeUser(function(id, done){
    User.findById(id, function(err, user){
        done(err, user);
    });
    
});


passport.use(new GoogleStrategy({
    // authorizationURL: 'https://www.example.com/oauth2/authorize',
    // tokenURL: 'https://www.example.com/oauth2/token',
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
//   User.findorCreate require mongoose function or else manually create it 
// also it does not give passwords and authenticates for us that's really awesome
  function(accessToken, refreshToken, profile, cb) {
      console.log(profile)
    User.findOrCreate({ googleid: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));



app.get("/", function(req,res){
    res.render("home");
});

app.get("/auth/google",
    passport.authenticate("google", {scope: ["profile"]} )
);

app.get("/auth/google/secrets", passport.authenticate("google", {failureRedirect: "/login"}), function(req, res) {
    res.redirect("/secrets");
});

app.get("/login", function(req,res){
    res.render("login");
});

app.get("/register", function(req,res){
    res.render("register");
});

// get secrets file directly and see if authenticated 
app.get("/secrets", function(req, res){
    if (req.isAuthenticated()){
        res.render("secrets");
    } else {
        res.redirect("register");
    }
});


app.get("/logout", function(req, res){
    req.logOut();
    res.redirect("/");
});


app.post("/register", function(req, res) {

    // bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
    //     console.log(hash);
    //     // Store hash in your password DB.
    //     const newUser = new User({
    //         email: req.body.username,
    //         password: hash
    //         // password: md5(req.body.password)
    //     });
    //     newUser.save(function(err){
    //         if(err) {
    //             console.log(err);
    //         }
    //         else {
    //             res.render("secrets")
    //         }
    //     });

    // });  
    User.register({username: req.body.username}, req.body.password, function(err, user){
        if (err) {
            console.log(err)
            res.redirect("/register");
        } else {
            // callback req res can only be triggered if authentication works and cookies also saved the current login session
            // redirect only because the user is still logged in or next time (within session can directly view)
            passport.authenticate("local")(req, res, function(){
                res.redirect("/secrets");
            });
        }
    });
});

app.post("/login", function(req, res){
    // const username = req.body.username;
    // // const password = md5(req.body.password);
    // const password = req.body.password;

    // User.findOne({email: username}, function(err, foundUser){
    //     if (err){
    //         console.log(err)
    //     }
    //     else {
    //         if (foundUser){
    //             // if (foundUser.password == password){
    //                 bcrypt.compare(password, foundUser.password, function(err, result) {
    //                     // result == true
    //                     if (result === true) {
    //                         res.render("secrets");

    //                     }
    //                 });
                    
    //             }
    //     }
    // });
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, function(err){
        if (err){
            console.log(err);
        }
        else {
            passport.authenticate("local")(req, res, function(err){
                res.redirect("/secrets");
            });
        }
    });
});





app.listen(3000, function() { 
    console.log("Server started on port 3000.");
});