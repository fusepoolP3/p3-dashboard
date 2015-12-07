var configs = [];
var currentAction = "NEW";

$(document).ready(function () {
	"use strict";
	showLoadingCover();
	extractConfigRegistryURI(initDashboard);
});

/*********************/
/**			General 		**/
/*********************/

function initDashboard() {
	
	var newConfig = false;
	var set = getURLParameter("action");
	for(var i=0; i<set.length;i++) {
		if(set[i] == "newConfig") {
			newConfig = true;
			break;
		}
	}
	if(newConfig) {
		$('#newConfigPanel').modal('show');
		$('#modalTitle').text('New configuration');
	}
	else {
		fillPropertyList(config);
		getConfigInfo([fillConfigList]);
	}
	$('#configRegistryLabel').text(configRegistry);
	$('[data-toggle="popover"]').popover({ html: true });
	
	hideLoadingCover();
}

function fillConfigList() {
	$("#configList").empty();
	if(configs.length > 0) {
		$.each(configs, function (i, configItem) {
			var optionItem = $('<option>').text(configItem.title).val(configItem.uri);
			if(config.uri == configItem.uri){
				optionItem.prop('selected', 'selected');
			}
			$("#configList").append(optionItem);
		});
	}
	$("#configListCount").text(configs.length);
}

function getSelectedConfigItem() {
	var selectedItem = $('#configList option:selected').val();
	if(!isEmpty(selectedItem)) {
		return getConfigItemByUri(selectedItem);
	} else {
		return null;
	}
}

function getConfigItemByUri(uri) {
	for(var i=0; i<configs.length; i++) {
		if(configs[i].uri == uri) {
			return configs[i];
		}
	}
	return null;
}

function useConfig() {
	var configItem = getSelectedConfigItem();
	
	config.uri = configItem.uri;
	config.title = configItem.title;
	config.description = configItem.description;
	config.sparqlEndpoint = configItem.sparqlEndpoint;
	config.irldpc = configItem.irldpc;
	config.trldpc = configItem.trldpc;
	config.tfrldpc = configItem.tfrldpc;
	config.ETag = configItem.ETag;
	
	$.cookie(configRegistry, config.uri, { expires: 30, path: '/' });
	
	$('#inUseBadge').show();
}

function onNewConfigClick() {
	currentAction = "NEW";
	$('#modalTitle').text('New configuration');
	$('#configTitle').val('');
	$('#configDescription').val('');
	$('#newConfigPanel').modal('show');
}

function onModifyConfigClick() {	
	var configItem = getSelectedConfigItem();
	
	currentAction = "MODIFY";
	$('#modalTitle').text('Modify configuration');
	$('#configTitle').val(configItem.title);
	$('#configDescription').val(configItem.description);
	$('#ETag').val(configItem.ETag);
	$('#uri').val(configItem.uri);
	$('#newConfigPanel').modal('show');
}

function onDeleteConfigClick() {
	var configItem = getSelectedConfigItem();
	if(configItem.uri == config.uri) {
		alert('You cannot delete a configuration that is currently in use.');
	}
	else {		
		var resp = confirm('Are you sure you want to delete "' + configItem.title + '"?');
		if (resp == true) {
			var ajaxRequest = $.ajax({
				type: 'DELETE',
				url: configItem.uri,
			});
			
			ajaxRequest.done(function (response) {
				// check for HTTP_OK or HTTP_NO_CONTENT
				for(var i=configs.length-1; i>=0; i--) {
					if(configs[i].uri == configItem.uri) {
						configs.splice(i, 1);
						break;
					}
				}				
				fillConfigList();
				fillPropertyList();
			});

			ajaxRequest.fail(function (xhr, textStatus, errorThrown) {
				console.error(xhr, textStatus, errorThrown);
			});
		}
	}
}

function saveConfig() {	
	var configItem = {};
	configItem.title = $('#configTitle').val();
	configItem.description = $('#configDescription').val();
	configItem.ETag = $('#ETag').val();
	configItem.uri = $('#uri').val();
	configItem.sparqlEndpoint = config.sparqlEndpoint;
	configItem.irldpc = config.irldpc;
	configItem.trldpc = config.trldpc;
	configItem.tfrldpc = config.tfrldpc;
	
	var valid = (!isEmpty(configItem.title) & !isEmpty(configItem.description) );
	
	if(!valid) {
		alert('Please fill both fields!');
	}
	else {
		if(currentAction == "NEW") {
			saveNewConfig(configItem);
		}
		else {
			modifyConfig(configItem);
		}
	}
}

function modifyConfig(configItem) {
	
	var data = createConfigRegStr(configItem);
		
	var ajaxRequest = $.ajax({
		type: 'PUT',
		headers: {
			'Content-Type': 'text/turtle',
			'Link': '<http://www.w3.org/ns/ldp#BasicContainer>; rel=?type?',
			'If-Match': configItem.ETag
		},
		url: configItem.uri,
		data: data
	});

	ajaxRequest.done(function (response, textStatus, request) {
		getConfigInfo([fillConfigList, fillPropertyList]);
		
		$('#configTitle').val('');
		$('#configDescription').val('');	
		$('#newConfigPanel').modal('hide');
	});
	ajaxRequest.fail(function (xhr, textStatus, errorThrown) {
		console.error(xhr, textStatus, errorThrown);
		$('#configTitle').val('');
		$('#configDescription').val('');	
		$('#newConfigPanel').modal('hide');
	});
}

function saveNewConfig(configItem) {
	
	var data = createConfigRegStr(configItem);
	
	var ajaxRequest = $.ajax({
		type: 'POST',
		headers: { 
			'Content-Type': 'text/turtle',
			'Link': '<http://www.w3.org/ns/ldp#BasicContainer>; rel=?type?',
			'Slug' : configItem.title
		},
		url: configRegistry,
		data: data
	});
		
	ajaxRequest.done(function (response, textStatus, request) {
		
		var configUri = request.getResponseHeader('Location');
		
		var request = $.ajax({	type: "GET",
								url: configUri,
								cache: false	});
													
		request.done(function(response, textStatus, request) {
			
			rdf.parseTurtle(response, function (s, graph) {
				
				var configGraph = rdf.cf.Graph(graph);
				
				var configURIs = configGraph.node(configUri).out(pfx.dcterms + "title").literal();
			
				configItem.uri = configUri;
				configItem.title = configGraph.node(configUri).out(pfx.dcterms + "title").literal().shift();
				configItem.description = configGraph.node(configUri).out(pfx.dcterms + "description").literal().shift();
				configItem.sparqlEndpoint = configGraph.node(configUri).out(pfx.crldpc + "sparql-endpoint").literal().shift();
				configItem.irldpc = configGraph.node(configUri).out(pfx.crldpc + "ir-ldpc").literal().shift();
				configItem.trldpc = configGraph.node(configUri).out(pfx.crldpc + "tr-ldpc").literal().shift();
				configItem.tfrldpc = configGraph.node(configUri).out(pfx.crldpc + "tfr-ldpc").literal().shift();
				configItem.ETag = request.getResponseHeader('ETag');
				
				configs.push(configItem);
				if(configs.length == 1) {
					config = configItem;
				}
				
				fillConfigList();
				fillPropertyList();
				
				$('#configTitle').val('');
				$('#configDescription').val('');
			
				$('#newConfigPanel').modal('hide');
			});
		});
		request.fail(function(response, textStatus, statusLabel){});
	});
	ajaxRequest.fail(function (xhr, textStatus, errorThrown) {
		console.error(xhr, textStatus, errorThrown);
		$('#configTitle').val('');
		$('#configDescription').val('');
		$('#newConfigPanel').modal('hide');
	});		
}

function createConfigRegStr(configItem) {
	
	var str = '@prefix ldp: <http://www.w3.org/ns/ldp#> . '
			+ '@prefix dcterms: <http://purl.org/dc/terms/> .  '
			+ '@prefix crldpc: <http://vocab.fusepool.info/crldpc#> . '
			+ '<> a ldp:Container, ldp:BasicContainer, crldpc:ConfigurationRegistration ; '
			+ '	dcterms:title "' + configItem.title + '"@en ; '
			+ '	dcterms:description "' + configItem.description + '" ; '
			+ '	crldpc:sparql-endpoint <' + configItem.sparqlEndpoint + '> ; '
			+ '	crldpc:ir-ldpc <' + configItem.irldpc + '> ; '
			+ '	crldpc:tfr-ldpc <' + configItem.tfrldpc + '> ; '
			+ '	crldpc:tr-ldpc <' + configItem.trldpc + '> ; '
			+ '	crldpc:wr-ldpc <> . ';

	return str;
}

function fillPropertyList(configItem) {
	var selectedItem = getSelectedConfigItem();
	if(!isEmpty(selectedItem)) {
		configItem = setDefaultValue(configItem, selectedItem);
	}
	$('#selConfigTitle').text(configItem.title);
	$('#selConfigDescription').text(configItem.description);
	$('#selConfigSparqlEndpoint').text(configItem.sparqlEndpoint);
	$('#selConfigIrldpc').text(configItem.irldpc);
	$('#selConfigTrldpc').text(configItem.trldpc);
	$('#selConfigTfrldpc').text(configItem.tfrldpc);
	
	if(configItem.uri == config.uri) {
		$('#inUseBadge').show();
	}
	else {
		$('#inUseBadge').hide();
	}
}

function getConfigInfo(callbackFunctions) {
	
	var ajaxRequest = $.ajax({	type: "GET",
								async: false,
								url: configRegistry,
								cache: false	});
			
	ajaxRequest.done(function(response, textStatus, request) {

		rdf.parseTurtle(response, function (s, graph) {
			
			var configRegistryGraph = rdf.cf.Graph(graph);
			
			var configURIs = configRegistryGraph.node(configRegistry).out(pfx.ldp + "contains").literal();
		
			if(configURIs.length > 0) {
				configs = [];
				var count = 0;
				for(var i=0; i<configURIs.length; i++) {
					
					$.ajaxPrefilter(function(options, originalOptions, jqXHR) { jqXHR.opt = originalOptions;});
					var request = $.ajax({	type: "GET",
											url: configURIs[i],
											cache: false	});
					
					request.done(function(response, textStatus, request, url) {
						var configURI = request.opt.url;
						
						var ETag = request.getResponseHeader('ETag');
									
						rdf.parseTurtle(response, function (s, graph) {
							
							var configGraph = rdf.cf.Graph(graph);
							
							var configItem = {};
							
							configItem.uri = configURI;
							configItem.title = configGraph.node(configURI).out(pfx.dcterms + "title").literal().shift();
							configItem.description = configGraph.node(configURI).out(pfx.dcterms + "description").literal().shift();
							configItem.sparqlEndpoint = configGraph.node(configURI).out(pfx.crldpc + "sparql-endpoint").literal().shift();
							configItem.irldpc = configGraph.node(configURI).out(pfx.crldpc + "ir-ldpc").literal().shift();
							configItem.trldpc = configGraph.node(configURI).out(pfx.crldpc + "tr-ldpc").literal().shift();
							configItem.tfrldpc = configGraph.node(configURI).out(pfx.crldpc + "tfr-ldpc").literal().shift();
							configItem.ETag = ETag;
							
							configs.push(configItem);
							count++;
							if(configURIs.length == count) {
								for(var j=0;j<callbackFunctions.length;j++) {
									callbackFunctions[j]();
								}
							}
						});
					});
				}
			}
		});
	});
	ajaxRequest.fail(function(response, textStatus, statusLabel){});
}







