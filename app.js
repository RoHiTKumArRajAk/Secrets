require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
// const encrypt = require("mongoose-encryption");
const md5 = require("md5");

const app = express();

app.use(bodyParser.urlencoded({extended : true}));
app.use(express.static("public"));
app.set('view engine','ejs');

mongoose.connect("mongodb://127.0.0.1:27017/SecretsDB",{useNewUrlParser:true});

const userSchema = new mongoose.Schema({
    email :{
        type : String,
        required : [true , "Required Field"],
    },
    password :{
        type : String,
        required : [true , "Required Field"],
    }
});

// userSchema.plugin(encrypt , {secret :process.env.SECCRET ,encryptedFields: ["password"]});
// Encrypts when you call save and decrypts when you call find

const User = mongoose.model("User",userSchema);


app.get("/",function(req,res){
    res.render("home");
});

app.get("/login",function(req,res){
    res.render("login");
});

app.get("/register",function(req,res){
    res.render("register");
});

app.post("/register",function(req,res){
    const newUser = new User({
        email: req.body.username,
        password : md5(req.body.password),
    });
    newUser.save();
    res.render("secrets");
});

app.post("/login",async function(req,res){
    const email = req.body.username;
    const password = md5(req.body.password);
    const foundUser = await User.findOne({email : email }, {password :password});
    if(foundUser){
        res.render("secrets");
    }
    else{
        console.log("Not Found");
    }
});

app.listen(3000 , function(){
    console.log("Server Started on port 3000");
});
