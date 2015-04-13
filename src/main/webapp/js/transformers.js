var transformers;
var factories;
var selectedTransformer;
var selectedFactory;

$(document).ready(function () {
	"use strict";
	showLoadingCover();

	// Getting tha dashboard config registry URI
	// Continue only if it is provided
	if(!extractConfigRegistryURI()) {		
		var configRegistryURI = prompt('Please enter a valid configuration registry URI', 'http://sandbox.fusepool.info:8181/ldp/cr-ldpc');
		if (configRegistryURI != null) {
			setConfigRegistryURI(configRegistryURI);
		}
		else {
			return;
		}
	}
	registerConfigData(initDashboard);
});

function initDashboard(){
    getTransformers();
	getFactories();
	hideLoadingCover();
}

/*************************/
/**		Transformers 	**/
/*************************/

function getTransformers() {
	var query = 'SELECT * WHERE { ' 
			  + '<' + config.trldpc + '> <http://www.w3.org/ns/ldp#contains> ?child . '
				  + '?child <http://purl.org/dc/terms/title> ?title . '
				  + '?child <http://vocab.fusepool.info/trldpc#transformer> ?uri . '
				  + 'OPTIONAL { '
				  +	'	?child <http://purl.org/dc/terms/description> ?description . '
				  +	'	?child <http://purl.org/dc/terms/created> ?date . '
				  + '}'
			  + '}';
    
	$.ajax({
        type: 'POST',
        url: config.sparqlEndpoint,
		headers: { 
			'Accept' : 'application/sparql-results+json',
			'Content-Type': 'application/sparql-query;charset=UTF-8'
		},
		data: query
    }).done(function (data) {
		$("#transformerList").empty();
        transformers = data.results.bindings;
		var first = true;
		
        if(transformers.length > 0) {
            jQuery.each(transformers, function (i, transformer) {
				if(first){
					first = false;
					selectedTransformer = transformer;
					$("#transformerList").append($('<option>').text(transformer.title.value).val(transformer.child.value).prop('selected','selected'));
				}
				else{
					$("#transformerList").append($('<option>').text(transformer.title.value).val(transformer.child.value));
				}
            });
        }
		$("#transformerCount").text(transformers.length);
		$("#transformerCountMenu").text(transformers.length);
		
    }).fail(function (xhr, textStatus, errorThrown) {
        console.error(xhr, textStatus, errorThrown);
    });
}

function deleteTransformer(){
	var resp = confirm('Are you sure you want to delete "' + selectedTransformer.title.value + '"?');
	if (resp == true) {
		var ajaxRequest = $.ajax({
			type: 'DELETE',
			url: selectedTransformer.child.value,
		});
		
		ajaxRequest.done(function (response) {
			// check for HTTP_OK or HTTP_NO_CONTENT
			getTransformers();
		});

		ajaxRequest.fail(function (xhr, textStatus, errorThrown) {
			console.error(xhr, textStatus, errorThrown);
		});
	}
}

function renameTransformer(){
	alert('not yet implemented');
	/*
	var newName = prompt('New name', 'Transformer');
	if (newName != null) {
		var ajaxRequest = $.ajax({
			type: 'GET',
			url: selectedTransformer.child.value,
		});
		
		ajaxRequest.done(function (response, textStatus, request) {
			window.res = response;
			window.r = request;
			var ETag = request.getResponseHeader('ETag');
			var putRequest = $.ajax({
				type: 'PUT',
				url: selectedTransformer.child.value,
				headers: { 
					'Content-Type': 'text/turtle',
					'If-Match': ETag
				},
				data: '<> <http://purl.org/dc/terms/title> "' + newName + '" . '
			});
		});		
		ajaxRequest.fail(function (xhr, textStatus, errorThrown) {
			console.error(xhr, textStatus, errorThrown);
		});
	}*/
}

function testTransformer(){
	alert('not yet implemented');
}

function registerTransformer(){
	var title = $("#registerTitle").val();
	var description = $("#registerDescription").val();
	var uri = $("#registerUri").val();
	
	if(isEmpty(title)){
		alert('Please provide a title');
	}
	else if(isEmpty(uri)){
		alert('Please provide a URI');
	}
	else{
		var data = '@prefix dcterms: <http://purl.org/dc/terms/> . '
			+ '@prefix trldpc: <http://vocab.fusepool.info/trldpc#> . '
			+ '<> a trldpc:TransformerRegistration; '
			+ 'trldpc:transformer <' + uri + '>; '
			+ 'dcterms:title "' + title + '"@en; '
			+ 'dcterms:description "' + description + '". ';

		$.ajax({
			type: 'POST',
			headers: { 
				'Content-Type': 'text/turtle'
			},
			url: config.trldpc,
			data: data
		}).done(function (response) {
			$("#registerTitle").val('');
			$("#registerDescription").val('');
			$("#registerUri").val('');
			getTransformers();
		}).fail(function (xhr, textStatus, errorThrown) {
			console.error(xhr, textStatus, errorThrown);
		});
	}
}

function getTransformerByContainer(str) {
    for (var i = 0; i < transformers.length; i++) { 
		if (transformers[i].child.value === str) {
            return transformers[i];
        }
    };
    return null;
}

$("#transformerList" ).change(function() {
	var val = $(this).find("option:selected").val();
	selectedTransformer = getTransformerByContainer(val);
});

/*********************/
/**	   Factories 	**/
/*********************/

function getFactories(){
	var query = 'SELECT * WHERE { ' 
			  + '<' + config.tfrldpc + '> <http://www.w3.org/ns/ldp#contains> ?child . '
				  + '?child <http://purl.org/dc/terms/title> ?title . '
				  + '?child <http://vocab.fusepool.info/tfrldpc#transformerFactory> ?uri . '
				  + 'OPTIONAL { '
				  +	'	?child <http://purl.org/dc/terms/description> ?description . '
				  +	'	?child <http://purl.org/dc/terms/created> ?date . '
				  + '}'
			  + '}';
			  
	$.ajax({
        type: 'POST',
        url: config.sparqlEndpoint,
		headers: { 
			'Accept' : 'application/sparql-results+json',
			'Content-Type': 'application/sparql-query;charset=UTF-8'
		},
		data: query
    }).done(function (data) {
		$("#factoryList").empty();
        factories = data.results.bindings;
		var first = true;

        if(factories.length > 0) {
            jQuery.each(factories, function (i, factory) {
				if(first){
					first = false;
					selectedFactory = factory;
					$("#factoryList").append($('<option>').text(factory.title.value).val(factory.child.value).prop('selected','selected'));
				}
				else{
					$("#factoryList").append($('<option>').text(factory.title.value).val(factory.child.value));
				}
            });
        }
		$("#factoryCount").text(factories.length);
		
    }).fail(function (xhr, textStatus, errorThrown) {
        console.error(xhr, textStatus, errorThrown);
    });
}

function openFactoryGui(){
	openInNewTab(selectedFactory.uri.value);
}

function getFactoryByContainer(str) {
    for (var i = 0; i < factories.length; i++) { 
		if (factories[i].child.value === str) {
            return factories[i];
        }
    };
    return null;
}

$("#factoryList" ).change(function() {
	var val = $(this).find("option:selected").val();
	selectedFactory = getFactoryByContainer(val);
});