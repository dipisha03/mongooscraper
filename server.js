// =========================================
// Routes are included on the bottom 
// =========================================

// Dependencies
var express = require("express");
var bodyParser = require("body-parser");
var logger = require("morgan"); // For Debugging 
var mongoose = require("mongoose");
var path = require("path");

// Requiring Article & Note models
var Article = require("./models/Article.js");
var Note = require("./models/Note.js");

// Scraping tools
var request = require("request");
var cheerio = require("cheerio");

//Define port
var port = process.env.PORT || 3330

// Initialize Express
var app = express();

// Use morgan and body parser with our app
app.use(logger("dev"));
app.use(bodyParser.urlencoded({
    extended: false
}));

// Make public a static dir
app.use(express.static("public"));

// Set Handlebars
var exphbs = require("express-handlebars");

app.engine("handlebars", exphbs({
    defaultLayout: "main",
}));
app.set("view engine", "handlebars");

// Database configuration with mongoose
var mongooscraper = process.env.MONGODB_URI || "mongodb://localhost/mongooscraper";

// Set mongoose to leverage built in JavaScript ES6 Promises
// Connect to the Mongo DB
mongoose.Promise = Promise;
mongoose.connect(mongooscraper, {
    // useMongoClient: true
});

var db = mongoose.connection;

// Show any mongoose errors
db.on("error", function(error) {
    console.log("Mongoose Error: ", error);
});

// Once logged in to the db through mongoose, log a success message
db.once("open", function() {
    console.log("Mongoose connection successful.");
});

// ================================== HTML ROUTES ====================================== //

// GET requests to render Handlebars pages
// This will get the articles we scraped from the mongoDB
app.get("/", function(req, res) {
    // get ball articles from the db
    Article.find({})
    .then(function(data){
        // create a object for the array (data) because handlebars only take objects
        var handlebarsObj = {
            articles: data
        }
        // render the home template and pass in the object that holds the array of articles
        res.render("home", handlebarsObj);
    })  
});

// Saved articles 
app.get("/saved", function(req, res) {
    // get all articles with the key saved that is true
    Article.find({ "saved": true }).populate("notes").exec(function(error, articles) {
        // create an object for handlebars and a key for the array (articles)
        var hbsObject = {
            article: articles
        };
        // render save template and pass in the handlebars object
        res.render("saved", hbsObject);
    });
});

// ================================== API ROUTES ====================================== // 

// A GET request to scrape the NY Times website
// click button on the html 
app.get("/scrape", function(req, res) {

    // First, we grab the body of the html with request
    // scrape webpage get data elements needed 
    request("https://www.nytimes.com/", function(error, response, html) {
        // Then, we load that into cheerio and save it to $ for a shorthand selector
        var $ = cheerio.load(html);

        // Now, we grab every h2 within an article tag, and do the following:
        $("article").each(function(i, element) {
            // Save the result in an empty object
             var result = {};

            // Add the title and summary of every link, and save them as properties of the result object
            var title = $(element).children("h2").text();
            var summary = $(element).children(".summary").text();
            var link = $(element).children("h2").children("a").attr("href");

            result.title = title;
            result.link = link;
            result.summary = summary;

            // make sure values exist before creating in db
            // Using our Article model, create a new entry
            // This effectively passes the result object to the entry (and the title and link)
            if(result.title.length> 0 && result.link.length> 0 && result.summary.length>0){
                var entry = new Article(result);
                // Now, save that entry to the db
                entry.save(function(err, doc) {
                    // Log any errors
                    if (err) {
                        console.log(err);
                    }
                    // Or log the doc
                    else {
                        console.log(doc);
                    }
                }); 

                // Tell the browser that we finished scraping the text
                console.log("Scrape Complete");
            } 
        });

        // Once loop of elements is complete
        // Redirect aka refesh home page
        res.redirect("/")
    });
});

// Save an article
app.get("/articles/save/:id", function(req, res) {
    // Use the article id to find and update its saved boolean
    Article.findOneAndUpdate({ "_id": req.params.id }, { "saved": true })
        // Execute the above query
        .exec(function(err, doc) {
            // Log any errors
            if (err) {
                console.log(err);
            } else {
                // Or send the document to the browser
                res.send(doc);
            }
        });
});

// Delete an article
app.post("/articles/delete/:id", function(req, res) {
    // Use the article id to find and update its saved boolean
    Article.findOneAndUpdate({ "_id": req.params.id }, { "saved": false, "notes": [] })
        // Execute the above query
        .exec(function(err, doc) {
            // Log any errors
            if (err) {
                console.log(err);
            } else {
                // Or send the document to the browser
                res.send(doc);
            }
        });
});

// Create a new note
app.post("/notes/save/:id", function(req, res) {
    // Create a new note and pass the req.body to the entry
    var newNote = new Note({
        body: req.body.body
    });
    console.log(req.body)
        // And save the new note the db
    newNote.save(function(error, note) {
        // Log any errors
        if (error) {
            console.log(error);
        }
        // Otherwise
        else {
            // Use the article id passsed in throught the endpoint params to find and update it's notes
            Article.findOneAndUpdate({ "_id": req.params.id }, { $push: { "note": note._id } })
                // Execute the above query
                .exec(function(err) {
                    // Log any errors
                    if (err) {
                        console.log(err);
                        res.send(err);
                    } else {
                        // Or send the note to the browser
                        //res.send(note);
                        console.log("add")
                        // res.render("note");
                        res.json(note)
                    }
                });
        }
    });
});

// Delete a note
app.delete("/notes/delete/:note_id/:article_id", function(req, res) {
    // Use the note id to find and delete it
    Note.findOneAndRemove({ "_id": req.params.note_id }, function(err) {
        // Log any errors
        if (err) {
            console.log(err);
            res.send(err);
        } else {
            Article.findOneAndUpdate({ "_id": req.params.article_id }, { $pull: { "notes": req.params.note_id } })
                // Execute the above query
                .exec(function(err) {
                    // Log any errors
                    if (err) {
                        console.log(err);
                        res.send(err);
                    } else {
                        // Or send the note to the browser
                        res.send("Note Deleted");
                    }
                });
        }
    });
});

// Get all notes associated with an article 
app.get("/article/:id/notes/", function(req, res){
    // find article by if passed in the the endpoint params
    Article.find({ "_id": req.params.id })
    .then(function(response){
        // get just the array of notes
        console.log("$$$", response[0].note)
        // find all notes with the ids in the array of notes associated with the article 
            // the article has an arry of id 
            // use the array to find all notes that have any of those ids using "$in" 
        Note.find({
            '_id': { $in: response[0].note}
        }).then(function(data){
            console.log(data)
            res.json(data)
        })
    })
})


// Listen on port
app.listen(port, function() {
    console.log("App running on port " + port);
});