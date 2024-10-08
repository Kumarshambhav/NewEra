const express = require("express");
const path = require("path");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const userModel = require("./modules/user");
const postModel = require("./modules/post");
const profileModel = require("./modules/profile");
const bcrypt = require('bcrypt');
const app = express();
const multer = require('multer');
const crypto = require('crypto');

app.set("view engine","ejs");
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(express.static(path.join(__dirname,"public")));
app.use(cookieParser());

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, './public/images/uploads');
    },
    filename: function (req, file, cb) {
      crypto.randomBytes(12,function(err,name){
        const fn = name.toString("hex")+path.extname(file.originalname);
        cb(null, fn);
      })
     
    }
  })
  
  const upload = multer({ storage: storage });
  const profile = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, './public/images/profileImage');
    },
    filename: function (req, file, cb) {
      crypto.randomBytes(12,function(err,name){
        const fn = name.toString("hex")+path.extname(file.originalname);
        cb(null, fn);
      })
     
    }
  })
  
  const profileUpdate = multer({ storage: profile });

app.get("/",function(req,res){
    res.render("createAccount");
});
app.get("/login",function(req,res){
    res.render("login");
})
app.get("/feed",isLoggedIn,async function(req,res){
    const user = await userModel.find();
    const posts = await postModel.find({userId:user._id}).sort({ createdAt: -1 }).populate('user');
    posts.reverse();
    res.render("feed",{posts});
})
app.get("/postFeed",isLoggedIn,function(req,res){
    res.render("postFeed");
})
app.get("/upcomingEvents",isLoggedIn,function(req,res){
    res.render("upcomingEvents");
})
app.get("/eventSubmission",isLoggedIn,function(req,res){
    res.render("eventsSubmission");
})

app.get("/editProfile",isLoggedIn,async function(req,res){
    const user = await userModel.findOne({email:req.user.email});
    res.render("editProfile",{user});
})


app.get("/profile",isLoggedIn,async function(req,res){
    const user = await userModel.findOne({email:req.user.email});
    const editBio = await profileModel.find();
    const bioEdit = editBio[editBio.length - 1];
    const profile = await postModel.find({user:user._id}).sort({ createdAt: -1 }).populate('user');

    res.render("profile",{profile,user,bioEdit});
})

app.get("/messages",isLoggedIn,function(req,res){
    res.render("messages");
})

app.get("/notifications",isLoggedIn,function(req,res){
    res.render("notifications");
})
app.get("/settings",isLoggedIn,function(req,res){
    res.render("settings");
})

app.get("/CreatePost",isLoggedIn,function(req,res){
    res.render("createPost");
})

app.post("/CreateNewPost",isLoggedIn,upload.single('postImage'),async function(req,res){
    const user = await userModel.findOne({email:req.user.email});
    const post = await postModel({
        title:req.body.title,
        content:req.body.postContent,
        user:user._id,
    })
    post.postImage = req.file.filename;
    user.posts.push(post._id);
    await post.save();
    res.redirect("/feed");
})

app.post("/updateProfile",isLoggedIn,profileUpdate.single('profileImage'),async function(req,res){
    const user = await userModel.findOne({email:req.user.email});
    user.profileImage = req.file.filename;
    const profile = await profileModel({
        bio: req.body.bio
    })
    await user.save();
    await profile.save();
    res.redirect("/profile");

})

app.post("/register",async function(req,res){
    const {username, password, email} = req.body;
    const user =await userModel.findOne({email});
    if(user)return res.status(400).send({message: "Email already exists"});
    bcrypt.genSalt(10,(err,salt)=>{
        bcrypt.hash(password,salt, async (err,hash)=>{
           let user =  await userModel.create({
                username,
                email,
                password:hash,
            });
            let token = jwt.sign({email:email ,userId : user._id},"toptop");
            res.cookie('token',token);
            res.redirect("/feed");
        })
    })
})

app.post("/login",async function(req,res){
    const {email,password} = req.body;
    const user = await userModel.findOne({email});
    if(!user) return res.status(400).send({message: "Email not found"})
        bcrypt.compare(password,user.password , function(err,result){
            if(result){
             let token = jwt.sign({email:email, userId:user._id} , "toptop");
             res.cookie("token",token);
             res.redirect("/feed");
            }
            else res.redirect("/");
        })    
})

app.get("/logout",function(req,res){
    res.cookie("token","");
    res.redirect("/login");
})

function isLoggedIn(req,res,next){
    if(req.cookies.token === ""){
        res.redirect("/login");
    }
    else{
        let data = jwt.verify(req.cookies.token,"toptop");
        req.user = data;
    }
    next();
}

app.listen(3000);