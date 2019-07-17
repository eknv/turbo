Entity Editor
=========================

Dependency Installation
npm install -g express
npm install -g body-parser
npm install -g connect
npm install -g serve-static
npm install -g js-beautify

Since the dependencies are installed globally, the following variable should be set in the console at start-up (Cmder)
@set NODE_PATH=X:\programs\nodejs\node_modules


Student / Teacher (Many-To-Many)
Student / Address (Many-To-One)
Teacher / CreditCard (One-To-Many)

Student
- name
- age
- birthDate
- weight
- teachers (Many-To-Many)
- address (Many-To-One)


Teacher
- name
- occupationYears
- students (Many-To-Many)
- creditCards (One-To-Many)


Address
- country
- city
- street
- number
- student (One-To-Many)


CreditCard
- number
- name
- expirationDate
- teacher (Many-To-One)


// todo/kn.. continue here


- group the number utility methods like $d, $i also in a $num object
: adjust the usages


- move on to finish the component
- improve the test cases
- improve the patches
- the search engine
- mobile/desktop improvement
- code cleanup
- translation
- etc. 


// test cases
- show a list of the test cases
- when they have run.. maybe create a table for that
- the test results
- the coverage.. how many usecase have tests and how many of them



// patches
- after releasing, the maintenance icon should disappear immediately
- show a list of all patches, both those that have already run and also those in the code
- use a component to show them with usual search function
- it should be possible to select one and rerun it
- add description to the patches, it can be displayed then when they select one.. like bringing up a dialog







// entity-editor, cover the important features of hibernate
- lots of testing for all the possible cases


// create the tables/fields necessary by the framework also by using the models.json
: add the necessary description with different names and compare the results


// 


// Support the one-to-one relationship in the turbo-model (needs testing)



// provide defaults for the lists.. patch the existing data

// clean up the webapp folder and bring the remaining parts to the new structure

// adjust the new relationship fields.. check whether they work and do the necessary validation

// rename the first index.html in the admin section to Entities adjustment.. keep just the data structure part

// monkey testing the entity generator in action.. see whether there is anything to improve

// use the entity name and field name in the path.. changing them would change the view to the respective entity and field
// changing a model name should also rename the usages in other classes
// then provide a feature to change between the relationship views

// color code the fields.. those that change the data structure should get a different background color

// liquibase changes should be stored in the db


// later
: add parameters to the list (main project)
: rename model to entity
: cover the remaining features of hibernate in an advanced mode




