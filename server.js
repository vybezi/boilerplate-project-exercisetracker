const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')

const mongoose = require('mongoose')
mongoose.connect(process.env.MLAB_URI)


const Schema = mongoose.Schema;

const userSchema = new Schema({
  username: {type: String, required: true}
})

const exerciseSchema = new Schema({
  userId: {type: String, required: true},
  description: {type: String, required: true},
  duration: {type: Number, required: true},
  date: {type: String}
})

const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

var createUser = function(username, done){
  var user = new User({username: username});
  user.save(function(err,data){
    if(err){
      done(null, "Username is taken")
    }else{
      done(null, data)
    }
    console.log(data);
  })
}

var findUserById = function(userId, done){
  User.findById(userId, function(err, data){
    if(err){
      done(null, false)
    }else{
      done(null, true);
    }
  })
}


var createExercise = function (exercise,done){
  var newExercise = new Exercise(exercise)
      newExercise.save(function(err,data){
        if(err){
          done(null, "Creating exercise failed");
        }else{
          done(null, data);
        }
      })
}


var getUserAndExercises = function(userId,filters,done){
  let response = {
    _id: 0,
    username: "",
    count: 0,
    log: []
  }
  
  
  
  
  
  User.findById(userId, function(err, data){
    response._id = data._id;
    response.username = data.username
    
    Exercise
      .find({userId: userId})
      .limit(parseInt(filters.limit))
      .where('date').gt(new Date(filters.from)).lt(new Date(filters.to))
      .exec(function(err, exerciseLogs){
      if(err){
        console.log(err)
        done(err)
      }else{
      response.count = exerciseLogs.length
      exerciseLogs.forEach(log => {
        
        let newLog = {
          description: log.description,
          duration: log.duration,
          date: new Date(log.date).toDateString()
        }
        
        response.log.push(newLog);
        
      })
      
      
      done(null, response)
      }
    })
    
//     function(err, exerciseLogs){
        
//       response.count = exerciseLogs.length
      
//       exerciseLogs.forEach(log => {
        
//         let newLog = {
//           description: log.description,
//           duration: log.duration,
//           date: new Date(log.date).toDateString()
//         }
        
//         response.log.push(newLog);
        
//       })
      
      
//       done(null, response)
//     }
    
    
  })

}


app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())



app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


// Not found middleware
// app.use((req, res, next) => {
//   return next({status: 404, message: 'not found'})
// })

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


app.post("/api/exercise/new-user", function(req, res){
  
  let username = req.body.username;
  console.log("New user called");
  if(!username || username==""){
    res.send("No username specified")
  }
  
  createUser(username, function(err,data){
    if(err){
      res.send("Username already taken, please try again")
    }else{
      console.log(data);
      res.send({username: data.username, _id: data._id})
    }
  })
  
  
})


app.post("/api/exercise/add", function(req, res){
  let exercise = req.body;
  
  if(!exercise.userId || !exercise.description || !exercise.duration){
    res.send("User id, description and duration are required");
  }
  
  if(!exercise.date){
    exercise.date = new Date().toDateString();
  }else{
    exercise.date = new Date(exercise.date).toDateString();
  }
  
  findUserById(exercise.userId, function(err,data){
    if(err){
      console.log("Error");
      console.log(err);
    }else{
      if(data==false){
        res.send("User does not exist")
      }else{
        createExercise(exercise, function(err, data){
          
          if(err){
            console.log("Failed to create exercise")
          }else{
            res.send(exercise)
          }
        
        })
      }
    }
  })
  
})


app.get("/api/exercise/log", function(req, res){
  let query = req.query;
  let filters = {
    from: "0",
    to: "5000-01-01",
    limit: 0
  }
  
  if(!query.userId){
    res.send("unknown userId");
  }
  
  if(query.from){
    filters.to = query.from
  }
  
  if(query.to){
    filters.from = query.to
  }
  
  if(query.limit && parseInt(query.limit)){
    filters.limit = query.limit
  }
  
  
  findUserById(query.userId, function(err,data){
    if(err){
      console.log(err);
    }else{
      if(data==false){
        res.send("unknown userId")
      }else{
        
        
        
        
        getUserAndExercises(query.userId, filters, function(err,data){
          res.send(data)
        })
      }
    }
  })
  
  
  
})



const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
