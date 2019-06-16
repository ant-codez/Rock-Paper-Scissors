# What is this??
This is a side project of mine where I learned to implement a server client model of multiplayer networking using Rock-Paper-Scissors. This project was made using Node.js for server side logic, Socket.io for the lobby system and chat functionality, MongoDB for my login system and the good ol' front end stack (HTML/CSS/JavaScript) to make it look pretty.

# Can I play??
You sure can!! Click this link to check out the code in action. Make sure you find a friend to play with because not many people know about this amazing Rock-Paper-Scissors clone yet!!

# Can I run my own server?
This code is very easy to run your self, just make sure you have all the tools ready to run it. Heres a list of dependencies for this project:
    
    1) Node.js
    2) Express
    3) Socket.io
    4) Mongod
    5) Mongo (Not needed unless you want to view data in MongoD)
    6) nodemon
    
Once you have downloaded all the necessary items run the following command:
  
    nodemon app.js
    
Now that the server is up we need to start our MongoDB server as well:
    
    mongod --port 8000

With both servers up and running you can now successfully create a new account and play Rock-Paper-Scissors with anyone else who connects to your webpage. It can be accessed by typing this in your web browser:
      
      localhost:8000
      
Thats all there is too it!! Don't expect too many updates to happen to this project, this was just a stepping stone for greater games to come.
