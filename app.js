require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
// const encrypt = require("mongoose-encryption");
// const md5 = require("md5");
// const bcrypt = require("bcrypt");
// const saltRounds =10;
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");  //not need to require passportlocal because it is one of the dependencies require for the passportlocalmongoose
// Installed four things passport , passport-local , passport-local-mongoose and express-session + 10 declarations + order is important

const GoogleStrategy = require('passport-google-oauth20').Strategy; 
const findOrCreate = require("mongoose-findorcreate");

const app = express();

app.use(bodyParser.urlencoded({extended : true}));
app.use(express.static("public"));
app.set('view engine','ejs');

app.use(session({
    secret: "Our Little Secret.",
    resave : false,
    saveUninitialized: false,
}));

app.use(passport.initialize());
app.use(passport.session());

// mongoose.set('strictQuery', true) ;
mongoose.connect("mongodb://127.0.0.1:27017/SecretsDB",{useNewUrlParser:true});

const userSchema = new mongoose.Schema({
    username : String,
    password : String,
    googleId : String ,
    secret : [String],
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

// userSchema.plugin(encrypt , {secret :process.env.SECCRET ,encryptedFields: ["password"]});
// Encrypts when you call save and decrypts when you call find

const User = mongoose.model("User",userSchema);

passport.use(User.createStrategy());
passport.serializeUser(function(User, done) { done(null, User) });
passport.deserializeUser(function(User, done) { done(null, User) }); 

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://127.0.0.1:27017/auth/google/secrets",
    // userProfileURL : "htttps://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/",function(req,res){
    res.render("home");
});

app.get("/auth/google",
    passport.authenticate('google',{ scope :["profile"] }),
);

app.get("/auth/google/secrets",
    passport.authenticate('google',{ failureRedirect: "/login" , failureMessage: true}),
    function(req,res){
    res.redirect("/secrets");
});

app.get("/login",function(req,res){
    res.render("login");
});

app.get("/register",function(req,res){
    res.render("register");
});

app.get('/secrets', async function(req, res){
    // console.log(req.isAuthenticated());
    if(req.isAuthenticated()){
        const foundUser = await User.findById(req.user._id);    
        if(!foundUser){
            console.log("Not Found");
        }
        else{
            res.render('secrets', {userWithSecrets:foundUser.secret}) ;
        }
    }
    else{
        console.log('Not Authenticated');
        res.redirect('/login') ;
    }
}) ;

app.get("/logout",function(req,res){
    req.logout(function(err){
        if(err){
            console.log(err);
        }
        else{
            res.redirect("/");
        }
    });
});
// whenever we restart the server cookies is deleted and we have to login again 

app.get('/submit', function(req, res){
    if(req.isAuthenticated()){
          res.render('submit') ;    
       }
       else{
          res.redirect('/login') ;
       }
});

app.post("/register",async function(req,res){ 
    
    User.register({username : req.body.username }, req.body.password ,function(err,user){
        if(err){
            console.log(err);
            res.redirect("/register");
        }
        else{
            passport.authenticate("local")(req ,res ,function(){
                res.redirect("/secrets");
            });
        }
    });
});

app.post("/login",async function(req,res){
    const newUser = new User({
        username : req.body.username,
        password : req.body.password,
    });

    req.login(newUser , function(err){
        if(err){
            console.log(err);
            res.redirect("/login");
        }
        else{
            passport.authenticate("local")(req ,res ,function(){
                res.redirect("/secrets");
            });
        }
    })
});

app.post('/submit', async function(req, res){
    const submittedSecret = req.body.secret ;
    let foundUser = await User.findById(req.user._id);
    if(!foundUser){
        console.log("Not Found Submit");
    }
    else{
        foundUser.secret.push(submittedSecret);
        foundUser.save();
        res.redirect('/secrets') ;
    }
});

// Level 4 using bcrypt
// app.post("/register",async function(req,res){
//     //bcrypt accepts a call back
//     const hashpassword = await bcrypt.hash(req.body.password , saltRounds);
//     const newUser = new User({
//         email: req.body.username,
//         password : hashpassword,
//     });
//     newUser.save();
//     res.render("secrets");
// });

// Level 4 using bcrypt
// app.post("/login",async function(req,res){   

//     const email = req.body.username;
//     const password = req.body.password;
//     // const password = md5(req.body.password);
//     // const foundUser = await User.findOne({email : email }, {password :password});  for md5
//     const foundUser = await User.findOne({email : email });
//     bcrypt.compare(password,foundUser.password,function(err,result){
//         if(result === true){
//             res.render("secrets");
//         }
//         else{
//             console.log("Not Found");
//         }
//     });

// });

app.listen(3000 , function(){
    console.log("Server Started on port 3000");
});
