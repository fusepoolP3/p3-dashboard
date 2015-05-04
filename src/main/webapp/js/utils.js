/*********************/
/**		Config	 	**/
/*********************/

function extractConfigRegistryURI(initFunc) {
	
	// intend to extract the "platformURI" query param first
	var set = getURLParameter("platformURI");
	if(set.length > 0) {		
		var ajaxRequest = jQuery.ajax({	type: "GET",
									url: set[0],
									async: false });	
		
		ajaxRequest.done(function(response, textStatus, responseObj) {
			var store = rdfstore.create();
			store.load('text/turtle', response, function(success, results) {
				if(success) {
					store.execute("SELECT * { ?s <http://vocab.fusepool.info/fp3#dashboardConfigRegistry> ?o }", function(success, results) {
						if(success) {
							if(results.length > 0) {
								setConfigRegistryURI(results[0].o.value);
								registerConfigData(initFunc);
							}
						}
					});
				}
			});
		});
	}
	else {
		// if we didn't find the platformURI or a proper configRegistry in it,
		// try to use the the "configRegistry" query param instead
		set = getURLParameter("configRegistry");
		if(set.length > 0) {
			setConfigRegistryURI(set[0]);
			registerConfigData(initFunc);
		}
		else {			
			var configRegistryURI = prompt('Please enter a valid configuration registry URI', 'http://sandbox.fusepool.info:8181/ldp/cr-ldpc');
			if (configRegistryURI != null) {
				setConfigRegistryURI(configRegistryURI);
				registerConfigData(initFunc);
			}
		}
	}
}

function setConfigRegistryURI(configRegistryURI) {
	window.configRegistry = configRegistryURI;
		
	$('#publishingMenuItem').prop('href','index.html?configRegistry=' + configRegistry);
	$('#transformersMenuItem').prop('href','transformers.html?configRegistry=' + configRegistry);
	$('#configurationMenuItem').prop('href','configuration.html?configRegistry=' + configRegistry);
}

function registerConfigData(initFunc){
	
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
							if(window.location.href.indexOf("configuration.html") < 0 || window.location.href.indexOf("action=newConfig") < 0) {
								// if no result, it's time to create a config
								window.location.href = 'configuration.html?configRegistry=' + configRegistry + '&action=newConfig';
							}
							else {
								initFunc();
								return;
							}
						}
						else {
							var configUri = "";
							//if there is only one config, use that one
							if(results.length == 1) {
								configUri = results[0].o.value;
								$.cookie(configRegistry, configUri, { expires: 30, path: '/' });
							}
							else {
								// check if one of the configs are stored in cookie
								if(!isEmpty($.cookie(configRegistry))) {
									var foundOne = false;
									for(var i=0; i<results.length; i++) {
										if(results[i].o.value == $.cookie(configRegistry)) {
											configUri = results[i].o.value;
											foundOne = true;
											break;
										}
									}
									// if we have a config uri stored in cookie for this
									// configRegistry but it's not in there anymore, delete cookie
									if(!foundOne) {
										$.removeCookie(configRegistry);
									}
								}
								// if couldnt find one already selected, choose one
								if(isEmpty(configUri)) {
									// TODO select based on date
									var configUri = results[0].o.value;
									$.cookie(configRegistry, configUri, { expires: 30, path: '/' });
								}
							}
							
							var request = $.ajax({	type: "GET",
													async: false,
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
												config.uri = res[0].s.value;
												config.title = res[0].title.value;
												config.description = res[0].description.value;
												config.irldpc = res[0].irldpc.value;
												config.wrldpc = res[0].wrldpc.value;
												config.tfrldpc = res[0].tfrldpc.value;
												config.trldpc = res[0].trldpc.value;
												config.sparqlEndpoint = res[0].sparqlEndpoint.value;
											}
											initFunc();
										});
									}
								});
							});
							request.fail(function(response, textStatus, statusLabel){});
						}
					}
				});
			}
		});
	});
	ajaxRequest.fail(function(response, textStatus, statusLabel){});
}

/** Opens URL in new tab **/
function openInNewTab(url) {
    var win = window.open(url, '_blank');
    win.focus();
}

/** Checks for empty or undefined data **/
function isEmpty(data){
    if(typeof data === 'undefined' || data === '' || data === null || data.length == 0){
        return true;
    }
    return false;
}

function regFileNameExtractorHelper() {
	Handlebars.registerHelper('fileName', function(str) {
		return new Handlebars.SafeString(getFileName(str));
	});
}

function getFileName(str) {
	var fileName = /[^/]*$/.exec(str)[0];
	return fileName;
}

function escStr(str) {
	return str.replace(/(['"])/g, "\\$1");
}

/** Showing '#loadingCover' popup panel. */
function showLoadingCover() {
	$('#loadingCover').hide().fadeIn(100);
}

/** Hiding '#loadingCover' popup panel. */
function hideLoadingCover() {
	$('#loadingCover').show().fadeOut(300);
}

function showWidgetLoader(widgetId) {
	if(isEmpty($('#'+widgetId+' .overlay'))) {
		$('#'+widgetId).append($('<div>').prop('class','overlay'))
					   .append($('<div>').prop('class','loading-img'));
	}
}

function hideWidgetLoader(widgetId) {
	$('#'+widgetId+' .loading-img').fadeOut(300, function() { $(this).remove(); });
	$('#'+widgetId+' .overlay').fadeOut(300, function() { $(this).remove(); });
}

function escapeNoddedStr(str) {
	return str.replace(/>/g,'&gt;').replace(/</g,'&lt;').replace(/"/g,'&quot;'); /*.replace(/\n/g,'<br>');*/
}

/** Escaping tricky IDs for jQuery selectors 
* Usage: $(ID("some.id"));
*/
function ID(myid) {
	return $.trim("#" + myid.replace( /(:|\.|\/|\[|\]|,)/g, "\\\\$1" ));
}

function setDefaultValue(variable, defaultValue) {
    return typeof variable !== 'undefined' ? variable : defaultValue;
}

/** Extracts the value(s) of aquery str param */
function getURLParameter(paramName){
	var result = [];
	var sPageURL = window.location.search.substring(1);
	var sURLVariables = sPageURL.split('&');
	for (var i = 0; i < sURLVariables.length; i++){
		var parameterName = sURLVariables[i].split('=');
		if (parameterName[0] === paramName){
			result.push(decodeURIComponent(parameterName[1]));
		}
	}
	return result;
}