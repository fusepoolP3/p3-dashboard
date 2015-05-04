var configs = [];

$(document).ready(function () {
	"use strict";
	showLoadingCover();
	extractConfigRegistryURI(initDashboard);
});

/*********************/
/**		General 	**/
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
	}
	else {
		fillPropertyList(config);
		getConfigInfo(fillConfigList);
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
	config.wrldpc = configItem.wrldpc;
	config.irldpc = configItem.irldpc;
	config.trldpc = configItem.trldpc;
	config.tfrldpc = configItem.tfrldpc;
	
	$.cookie(configRegistry, config.uri, { expires: 30, path: '/' });
	
	$('#inUseBadge').show();
}

function modifyConfig() {
	alert('Not implemented yet.');
}

function deleteConfig() {
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
	configItem.sparqlEndpoint = $('#configSparqlEndpoint').val();
	configItem.irldpc = $('#configIrldpc').val();
	configItem.trldpc = $('#configTrldpc').val();
	configItem.tfrldpc = $('#configTfrldpc').val();
	
	var valid = (!isEmpty(configItem.title) &
				!isEmpty(configItem.description) & 
				!isEmpty(configItem.sparqlEndpoint) & 
				!isEmpty(configItem.irldpc) & 
				!isEmpty(configItem.trldpc) & 
				!isEmpty(configItem.tfrldpc) );
	
	if(!valid) {
		alert('Please fill every fields!');
	}
	else {
		var data = createConfigRegStr(configItem);
		
		var ajaxRequest = $.ajax({
			type: 'POST',
			headers: { 
				'Content-Type': 'text/turtle',
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
				var configStore = rdfstore.create();
				configStore.load('text/turtle', response, function(success, res) {
					if(success) {
						var query = "PREFIX dcterms: <http://purl.org/dc/terms/> " +
									"PREFIX crldpc: <http://vocab.fusepool.info/crldpc#> " +
									"SELECT * { " +
									" ?s dcterms:title ?title . " +
									" ?s dcterms:description ?description . " +
									" ?s crldpc:sparql-endpoint ?sparqlEndpoint . " +
									" ?s crldpc:ir-ldpc ?irldpc . " +
									" ?s crldpc:tr-ldpc ?trldpc . " +
									" ?s crldpc:tfr-ldpc ?tfrldpc . " +
									" ?s crldpc:wr-ldpc ?wrldpc . " +
									" }";
						
						configStore.execute(query, function(success, res) {
							if(success) {
								configItem.uri = res[0].s.value;
								configItem.title = res[0].title.value;
								configItem.description = res[0].description.value;
								configItem.irldpc = res[0].irldpc.value;
								configItem.wrldpc = res[0].wrldpc.value;
								configItem.tfrldpc = res[0].tfrldpc.value;
								configItem.trldpc = res[0].trldpc.value;
								configItem.sparqlEndpoint = res[0].sparqlEndpoint.value;
							}
							
							configs.push(configItem);
							if(configs.length == 1) {
								config = configItem;
							}
							
							fillConfigList();
							fillPropertyList();
							
							$('#configTitle').val('');
							$('#configDescription').val('');
							$('#configSparqlEndpoint').val('');
							$('#configIrldpc').val('');
							$('#configTrldpc').val('');
							$('#configTfrldpc').val('');
						
							$('#newConfigPanel').modal('hide');
						});
					}
				});
			});
			request.fail(function(response, textStatus, statusLabel){});
		});
		ajaxRequest.fail(function (xhr, textStatus, errorThrown) {
			console.error(xhr, textStatus, errorThrown);
			$('#newConfigPanel').modal('hide');
		});		
	}
}

function createConfigRegStr(configItem) {
	
	var str = '@prefix ldp: <http://www.w3.org/ns/ldp#> . '
			+ '@prefix dcterms: <http://purl.org/dc/terms/> .  '
			+ '@prefix crldpc: <http://vocab.fusepool.info/crldpc#> . '
			+ '<> a crldpc:ConfigurationRegistration ; '
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

function getConfigInfo(callbackFunction) {
	
	var ajaxRequest = $.ajax({	type: "GET",
								async: false,
								url: configRegistry,
								cache: false	});
			
	ajaxRequest.done(function(response, textStatus, request) {
		var store = rdfstore.create();
		store.load('text/turtle', response, function(success, results) {
			if(success) {
				store.execute("SELECT * { ?s <http://www.w3.org/ns/ldp#contains> ?o }", function(success, results) {
					if(success) {
						if(results.length == 0) {
							// TODO new config
						}
						else {
							var count = 0;
							for(var i=0; i<results.length; i++) {
								var configUri = results[i].o.value;
								var request = $.ajax({	type: "GET",
														url: configUri,
														cache: false	});
															
								request.done(function(response, textStatus, request) {
									var configStore = rdfstore.create();
									configStore.load('text/turtle', response, function(success, res) {
										if(success) {
											var query = "PREFIX dcterms: <http://purl.org/dc/terms/> " +
														"PREFIX crldpc: <http://vocab.fusepool.info/crldpc#> " +
														"SELECT * { " +
														" ?s dcterms:title ?title . " +
														" ?s dcterms:description ?description . " +
														" ?s crldpc:sparql-endpoint ?sparqlEndpoint . " +
														" ?s crldpc:ir-ldpc ?irldpc . " +
														" ?s crldpc:tr-ldpc ?trldpc . " +
														" ?s crldpc:tfr-ldpc ?tfrldpc . " +
														" ?s crldpc:wr-ldpc ?wrldpc . " +
														" }";
											
											configStore.execute(query, function(success, res) {
												var configItem = {};
												if(success) {
													configItem.uri = res[0].s.value;
													configItem.title = res[0].title.value;
													configItem.description = res[0].description.value;
													configItem.irldpc = res[0].irldpc.value;
													configItem.wrldpc = res[0].wrldpc.value;
													configItem.tfrldpc = res[0].tfrldpc.value;
													configItem.trldpc = res[0].trldpc.value;
													configItem.sparqlEndpoint = res[0].sparqlEndpoint.value;
												}
												configs.push(configItem);
												count++;
												if(results.length == count) {
													callbackFunction();
												}
											});
										}
									});
								});
								request.fail(function(response, textStatus, statusLabel){});								
							}
						}
					}
				});
			}
		});
	});
	ajaxRequest.fail(function(response, textStatus, statusLabel){});
}







