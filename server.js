'use strict';


// BASE SETUP
// =============================================================================

// Database configuration
var dbConfig = {
	client: 'postgres',
	connection: {
		host: 'localhost',
		user: process.env.DB_USER,
		password: process.env.DB_PASS,
		database: process.env.DB,
		charset: 'utf8'
	}
};

// Import modules
var bodyParser = require('body-parser');
var knex = require('knex')(dbConfig);
var bookshelf = require('bookshelf')(knex);
var express    = require('express');
var fs         = require('fs');
var GithubApi  = require('github-api');

// app.set('bookshelf', bookshelf);

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

// Allow caching of GitHub responses in our Postgres database
var CachedResponse = bookshelf.Model.extend({tableName : 'github_cache'});



// ROUTING SETUP
// =============================================================================

// Get an instance of the Express router
var router = express.Router();

// Register the path prefix for all of the router's routes
app.use('/api', router);

// Middleware to use for all requests that use the router
router.use(function(req, res, next) {
    console.log('Processing request for path: ' + req.path);
    next(); // make sure we go to the next routes and don't stop here
});



// STATIC FILE SERVING
// =============================================================================

// Setup static file serving
app.use('/assets', express.static('assets'));



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
router.route('/github/user/:repo_owner/repository/:repo_name').
	get(function(req, res) {
		// Get the repo name and owner from this route's path
		var	repo,
			repoName = req.params.repo_name,
			repoOwner = req.params.repo_owner,
			responseSent = false;

		// Check the database cache for valid results
		(new CachedResponse()).
			query(function(queryBuilder) {
				queryBuilder.
					select('data').
					where('repo_owner', '=', repoOwner).
					andWhere('repo_name', '=', repoName).
					andWhere(knex.raw("ts > now() - interval '1 hour'"));
			}).
			fetch().
			then(function(result) {
				if(result && result.attributes && result.attributes.data) {
					responseSent = true;
					res.json(result.attributes.data);
				}
			}).
			then(function() {
				if(responseSent) {
					return;
				}

				// Fetch the user/repository details
				repo = github.getRepo(repoOwner, repoName);
				repo.show(function(err, repoDetails) {
					if(err) {
						console.log('ERROR: repository owner/name combination does not exist');

						// Set the HTTP status code
						res.status(err.request.status);

						// Send the error object back to the client as JSON
						res.json(err);
						return;
					}

					// Build the JSON response
					var jsonResponse = {
						description : repoDetails.description,
						language : repoDetails.language,
						lastUpdated : repoDetails.lastUpdated,
						name : repoDetails.name,
						owner : repoDetails.owner.login,
						subscribers : repoDetails.subscribers,
						url : repoDetails.url
					};

					// Add these results to the database cache
					var model = new CachedResponse({
						repo_owner : repoDetails.owner.login,
						repo_name : repoDetails.name,
						ts : 'now()',
						data : jsonResponse
					});
					model.idAttribute = null;
					model.save();

					// Send only the relevant parts of the successfully-fetched data
					res.json(jsonResponse);
				});
			});
	});



// START THE SERVER
// =============================================================================

app.listen(port);
console.log('Application listening on port ' + port);