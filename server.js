const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const moment = require('moment')

const cors = require('cors')

const mongoose = require('mongoose');
mongoose.connect(process.env.MLAB_URI, {useUnifiedTopology: true, useNewUrlParser: true}, function(err, result){
  if(err) console.error(err);
});
mongoose.connection.on('error', function(error){
  console.error(error);
});

var Schema = mongoose.Schema;
var userSchema = new Schema({
  username: String,
  count: Number,
  log: [{
    description: String,
    duration: Number,
    date: {type: Date}
  }]
});
var User = mongoose.model("User", userSchema);

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())

app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

app.get('/logger', (req, res) => {
  res.sendFile(__dirname + '/views/logger.html');
});

app.get('/logview', (req, res) => {
  res.sendFile(__dirname + '/views/logview.html');
});

app.get('/forgot-id', (req, res) => {
  res.sendFile(__dirname + '/views/forgotid.html');
});

app.post('/new-user', function(req, res){
  User.findOne({username: req.body.username}, function(err, result){
    if (err) console.error(err);
    if (result) {
      res.send("username already taken");
    } else {
      var newUser = new User({
        username:req.body.username,
        count:0,
        log:[]
      });
      newUser.save();
      res.send({username: req.body.username, _id:newUser._id});
    }
  })
});

app.post('/forgotten-id', function(req, res){
  User.findOne({username: req.body.username}, function(err, result){
    if (err) console.error(err);
    if (!result) {
      res.send("username not found");
    } else {
      res.send({username: req.body.username, _id:result._id});
    }
  })
});

app.post('/add', function(req, res){
  var foundUser = User.findOne({_id: req.body.userId}, function(err, foundUser){
    if (err) console.error(err);
    var duration = parseInt(req.body.duration);
    var date;
    if (new Date(req.body.date).getTime()){
      date = new Date(req.body.date);
    } else {
      date = new Date();
    }
    if (!foundUser) {
      res.send("unknown _id");
    } else if (isNaN(duration)){
      res.send("invalid duration format, try again");
    } else if (isNaN(date.getTime())){
      res.send("invalid date format, try again");
    } else {
      var currentExercise = {
        description: req.body.description,
        duration: parseInt(req.body.duration),
        date: date
      };
      foundUser.log.push(currentExercise);
      foundUser.count=foundUser.log.length;
      foundUser.save((err, result)=>{
        if (err) console.error(err);
      });
      var stringDate = moment(date).format("ddd MMM D YYYY")
      res.send({_id:foundUser._id, username: foundUser.username, description: currentExercise.description, duration:currentExercise.duration, date:date.toDateString()});
    }
  })
});

app.post('/log', (req, res)=>{
  User.findOne({_id: req.body.userId}, function(err, data){
    var fromDate = new Date(req.body.from).getTime();
    var toDate = new Date(req.body.to).getTime();
    var dateArray = [];
    if (err) console.log(err);
    if (!data){
      res.send("Invalid userId");
    } else if (req.body.from && req.body.to){
      dateArray = data.log.filter((obj)=>(obj.date.getTime()>fromDate && obj.date.getTime()<toDate));
    } else if (req.query.from){
      dateArray = data.log.filter((obj)=>(obj.date.getTime()>fromDate));
    } else if (req.query.to) {
      dateArray = data.log.filter((obj)=>(obj.date.getTime()<toDate));
    } else {
      dateArray = data.log;
    }
    //dateArray.sort((a, b)=>(a.date.getTime())-(b.date.getTime()))
    if(req.body.limit && !isNaN(parseInt(req.body.limit))){
      dateArray.splice(parseInt(req.body.limit))
    }
    res.send({_id:data._id, username: data.username, count: data.count, log:dateArray})
  })
});

app.get('/users', (req, res)=>{
  User.find({}, function(err, data){
  var arr = [];
    for (var i of data) {
      arr.push({"username": i.username, "_id":i._id});
    }
    res.send(arr);
  })
})

// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
