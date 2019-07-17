

# Turbo

In this project I experiment with the following technologies and ideas:
- writing the server and client side code in javascript
  - angularjs (angular 1) is used on the client side 
  - server side js code is run on JVM using Nashorn
- keeping the server side and web front end code next to each other
- application logic is implemented using the so called actions
  - these actions can run both server side and also client side
  - the ActionDispatcher keeps track of the actions and knows which of those should run on the client side and which of them on the server side
  - in case and action should be executed on the server side, it will then communicate with the server side otherwise run it immediately on the client side
  - many utilities are provided to the actions 
    - most of these utilities are provided to both server and client side actions
    - even database access is possible directly on the client side code which will then be automatically transferred and executed on the server side
  - these utilities can be easily accessed inside the actions
  - the actions can also call other actions
    - for the server side action, it does not matter in which language they are written
- the server and client side communication goes over only one web service
  - client provides the name of the action to be executed on the server side along with the parameters
  - this action can be implemented in a js, groovy or java file
  - these action files are placed next to the client side code (angularjs or html)
- application entities
  - they can be harcoded and also be defined on the fly
  - A UI is provided which allows defining the data structure directly in the application
  - the defined data structure and their relations will then be converted to java classes
  - the generated classes will then be automatically compiled
  - and then the hibernate context will be reloaded using the new version of the entities

