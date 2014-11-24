'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
	errorHandler = require('./errors'),
	Course = mongoose.model('Course'),
	Handlebars = require('handlebars'),
	wkhtmltopdf = require('wkhtmltopdf'),
	controller = require('./pdfGenerator'),
	fs = require('fs'),
	_ = require('lodash');

exports.generatePDF = function (req, res) {
  	var path = __dirname + '/pdfs/' + req.body._id + '.pdf';
  	console.log(path);
  	wkhtmltopdf(req.body.data, { pageSize: 'A3', output: path },  function() {
  		res.download(path, 'report.pdf', function(err) {
			if(err) {
				console.log('error');
				throw err;
			}
		});
  	});
};

exports.generateHTML = function(req,res,next) {
	console.log("begin gen html");
	var template = Handlebars.compile(req.body.data.toString());
	var result = template(req.courseCommittee);
	//generate the pdf
	if(next) {
		next();
	} else {
		req.body.data = result;
		req.body._id = req.courseCommittee._id;
		controller.generatePDF(req,res);
	}
	console.log("end gen html");
};

exports.getFile = function(req,res) {
	console.log("get file");
	var fileName = __dirname + '/pdfModels/CourseCommitteeEvaluationForm.html';
/*
	console.log("\n\n"+req.body);
	console.log("\n\ndir:\n"+__dirname +"\n\n");
	*/
	fs.readFile(fileName, function(err,data) {
		if(err) {
			console.log("ERROR:  " + errorHandler.getMessage(err));
		}
		req.body.data = data;
		controller.generateHTML(req,res);
		console.log("done getfiel");
	});
};

exports.courseByID = function(req, res, next, id) { 
	console.log("course by id");
	Course.findById(id)
		.populate('courseCommitteeEvaluationForm')
		.populate('outcomes')
		.exec(function(err, values) {
			var options = {
				path: 'outcomes.outcomeEvaluation',
				model: 'OutcomeEvaluation'
			};
			if (err) return next(err);
			Course.populate(values, options,function(err, values2) {
				if (err) return next(err);
				options = { 
					path: 'outcomes.outcomeAssessmentForm',
					model: 'CourseOutcomeAssessmentForm'
				};
				Course.populate(values, options,function(err, courseCommittee) {
					if (err) return next(err);
					if (!courseCommittee) return next(new Error('Failed to load course committee ' + id));
					req.courseCommittee = courseCommittee;
					next();
				});
			});
		});
};