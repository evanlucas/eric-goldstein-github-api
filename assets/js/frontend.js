/*global Backbone */
(function($) {
	'use strict';

	// Variable declarations
	var	Repo,
		RepoList,
		RepoView,
		RepoListView;

	// MODELS AND COLLECTIONS
	// =============================================================================================

	Repo = Backbone.Model.extend({
		defaults : {
			description : '',
			language : '',
			lastUpdated : '',
			name : '',
			owner : '',
			subscribers : 0,
			url : ''
		},

		url : function() {
			return '/api/github/user/' + this.attributes.owner + '/repository/' + this.attributes.name;
		}
	});

	RepoList = Backbone.Collection.extend({
		model : Repo
	});



	// VIEWS
	// =============================================================================================

	RepoView = Backbone.View.extend({
		tagName : 'article',

		template : _.template(
			'<div class="delete">X</div>' +
    		'<input type="hidden" name="cid" value="<%= cid %>" />' +
    		'<div>Owner: <%= owner %></div>' +
    		'<div>Repo Name: <%= name %></div>' +
    		'<div>Description: <%= description %></div>' +
    		'<div>Language: <%= language %></div>' +
    		'<div>Last Updated: <%= lastUpdated %></div>' +
    		'<div>Subscribers: <%= subscribers %></div>' +
    		'<div>Repo URL: <%= url %></div>'
        ),

        render : function() {
        	var	templateData,
        		self = this;

console.log('RENDERING REPO...')

			templateData = _.extend(this.model.toJSON(), {cid : this.model.cid});
        	this.$el.html(
        		this.template(templateData)
        	);

            return this;
        }
	});

	RepoListView = Backbone.View.extend({
		el : $('.github-repos'),

		fetchDetails : function(repoOwner, repoName) {
			var	repo = new Repo(),
				self = this;

			// Check if the collection contains this owner/name combination
			if(this.collection.where({name:repoName, owner:repoOwner}).length !== 0) {
				alert('This repo owner/name combination is already part of the local list');
				return;
			}

			repo.set({
				'name' : repoName,
				'owner' : repoOwner
			});
			repo.fetch({
				error : function() {
					alert('No match found');
				},
				success : function(model, response, options) {
					console.log('FETCHED MODEL:',model)
					self.collection.add(model);
				}
			});
		},

		formSubmit : function(submitEvent) {
			submitEvent.preventDefault();
			this.fetchDetails(this.$repoOwner.val(), this.$repoName.val());
		},

		initialize : function() {
			var self = this;

			// Re-render when the collection gets updated
			this.listenTo(this.collection, 'add', this.render);
			this.listenTo(this.collection, 'remove', this.render);
			this.listenTo(this.collection, 'change', this.render);

			// Build the static HTML
			this.$el.append(
				'<form>' +
					'<label class="repoOwner">' +
						'Repo Owner: ' +
						'<input type="text" name="repoOwner" required />' +
					'</label>' +
					'<label class="repoName">' +
						'Repo Name: ' +
						'<input type="text" name="repoName" required />' +
					'</label>' +
					'<input type="submit" value="Add to List" />' +
				'</form>' +
				'<div class="list"></div>'
			);

			// Cache DOM lookups
			this.$repoOwner = this.$el.find('input[name="repoOwner"]');
			this.$repoName = this.$el.find('input[name="repoName"]');
			this.$listElement = this.$el.find('.list');

			// Handle list item deletions
			this.$listElement.on('click', '.delete', function(clickEvent) {
				// Find the CID of the current list item
				var cid = $(clickEvent.target).next().val();

				// Remove the model with this CID value
				self.collection.remove(
					self.collection.get({cid : cid})
				);
			});

			// Handle AJAX form submission
			this.$el.find('form').on('submit', this.formSubmit.bind(this));
		},

		render : function() {
			var self = this;


console.log('RENDERING LIST...')


			// Empty the list area
			this.$listElement.empty();

			// Render all items in the collection
			this.collection.each(function(model, index) {
				var rv = new RepoView({model : model});
				self.$listElement.append(rv.render().$el);
			});

			return this;
		}
	});



	// EVENT LISTENERS
	// =============================================================================================

	$(document).ready(function() {
		var rlv = new RepoListView({collection : new RepoList()});
		rlv.render();
	});
}(jQuery));