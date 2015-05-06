'use strict';


// BASE SETUP
// =============================================================================

// Import modules
var bodyParser = require('body-parser');
var express    = require('express');
var fs         = require('fs');
var GithubApi  = require('github-api');

// Use express to serve this app
var app = express();                 // define our app using express

// Set the port it's hosted on
var port = process.env.PORT || 8080;

// Configure the app to use the body-parser module
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Github access
var github = new GithubApi({
  token: process.env.GITHUB_TOKEN,
  auth: "oauth"
});



// STATIC FILE SERVING
// =============================================================================

// Setup static file serving
app.use('/assets', express.static('assets'));



// ROUTING SETUP
// =============================================================================

// Get an instance of the Express router
var router = express.Router();

// Register the path prefix for all of the router's routes
app.use('/api', router);

// Middleware to use for all requests
router.use(function(req, res, next) {
    console.log('Processing request for path: ' + req.path);
    next(); // make sure we go to the next routes and don't stop here
});



// API ROUTES
// =============================================================================

// Show the API usage example page when accessing the API's root path
router.get('/', function(req, res) {
	fs.readFile('assets/html/apiUsageExample.html', 'utf8', function(err, fileContents) {
		if(err) {
			// Set the HTTP status code
			res.status(404);

			// Send the error object back to the client as JSON
			res.json(err);
			return;
		}
		res.send(fileContents);
	});
});

// User/repository lookup via Github's API
router.route('/github/user/:username/repository/:repo_name').
	get(function(req, res) {
		// Get the username and repo name from this route's path
		var username = req.params.username;
		var repoName = req.params.repo_name;

		// Fetch the user/repository details
		var repo = github.getRepo(username, repoName);
		repo.show(function(err, repo) {
			if(err) {
				console.log('ERROR: username/repository combination does not exist');

				// Set the HTTP status code
				res.status(err.request.status);

				// Send the error object back to the client as JSON
				res.json(err);
				return;
			}

			// Send the successfully-fetched data
			res.json(repo);
		});
	});



// START THE SERVER
// =============================================================================

app.listen(port);
console.log('Application listening on port ' + port);