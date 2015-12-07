/*********************/
/**		Config	 	**/
/*********************/

var pfx = { dcterms: "http://purl.org/dc/terms/", crldpc: "http://vocab.fusepool.info/crldpc#", ldp: "http://www.w3.org/ns/ldp#" };

function extractConfigRegistryURI(initFunc) {

    var set = getURLParameter("platformURI");
    if (set.length > 0) {
        platformURI = set[0];
    }
    else {
        var inputValue = prompt('Please enter a valid platform URI', 'http://sandbox.fusepool.info/');
        if (inputValue != null) {
            platformURI = inputValue;
        }
        else {
            return;
        }
    }
		
		P3Platform.getPlatform(platformURI).then(function(p) {
			platform = p;
			window.configRegistry = p.getDashboardConfigRegistryURI();
			
			// platform defaults
			config.sparqlEndpoint = p.getSparqlEndpoint();
			config.irldpc = p.getUserInteractionRequestRegistryURI();
			config.tfrldpc = p.getTransformerFactoryRegistryURI();
			config.trldpc = p.getTransformerRegistryURI();
			
			completeMenuLinks();
			registerConfigData(initFunc);
		});
}

function completeMenuLinks() {
    $('#publishingMenuItem').prop('href', 'index.html?platformURI=' + platformURI);
    $('#transformersMenuItem').prop('href', 'transformers.html?platformURI=' + platformURI);
    $('#configurationMenuItem').prop('href', 'configuration.html?platformURI=' + platformURI);
}

function createDefaultConfig(initFunc) {
	var configStr = '@prefix ldp: <http://www.w3.org/ns/ldp#> . '
		+ '@prefix dcterms: <http://purl.org/dc/terms/> .  '
		+ '@prefix crldpc: <http://vocab.fusepool.info/crldpc#> . '
		+ '<> a ldp:Container, ldp:BasicContainer, crldpc:ConfigurationRegistration ; '
		+ '	dcterms:title "Default configuration"@en ; '
		+ '	dcterms:description "Default configuration created automatically by the dashboard."@en ; '
		+ '	crldpc:sparql-endpoint <' + config.sparqlEndpoint + '> ; '
		+ '	crldpc:ir-ldpc <' + config.irldpc + '> ; '
		+ '	crldpc:tfr-ldpc <' + config.tfrldpc + '> ; '
		+ '	crldpc:tr-ldpc <' + config.trldpc + '> ; '
		+ '	crldpc:wr-ldpc <> . ';
	
	var ajaxRequest = $.ajax({
		type: 'POST',
		headers: { 
			'Content-Type': 'text/turtle',
			'Link': '<http://www.w3.org/ns/ldp#BasicContainer>; rel=?type?',
			'Slug' : 'default-configuration'
		},
		url: configRegistry,
		data: configStr
	});
	ajaxRequest.done(function (response, textStatus, request) {
		
		var configUri = request.getResponseHeader('Location');
		
		var request = $.ajax({	type: "GET",
								url: configUri,
								cache: false	});
													
		request.done(function(response, textStatus, request) {
			registerConfigData(initFunc);
		});
		request.fail(function(xhr, textStatus, errorThrown){
			console.error(xhr, textStatus, errorThrown);
		});
	});
	ajaxRequest.fail(function (xhr, textStatus, errorThrown) {
		console.error(xhr, textStatus, errorThrown);
	});
}

function registerConfigData(initFunc) {

    var ajaxRequest = $.ajax({type: "GET",
        url: configRegistry,
        headers: {'Accept': 'text/turtle'},
        cache: false,
        async: false});

    ajaxRequest.done(function (response, textStatus, request) {
			
			rdf.parseTurtle(response, function (s, graph) {
				
				var configRegistryGraph = rdf.cf.Graph(graph);
					
				var configURIs = configRegistryGraph.node(configRegistry).out("http://www.w3.org/ns/ldp#contains").literal();
				if (configURIs.length == 0) {
						if (window.location.href.indexOf("configuration.html") < 0 || window.location.href.indexOf("action=newConfig") < 0) {
								// if no result, it's time to create a config
								createDefaultConfig(initFunc);
						}
						else {
								initFunc();
								return;
						}
				}
				else {
						var configUri = "";
						//if there is only one config, use that one
						if (configURIs.length == 1) {
								configUri = configURIs[0];
								$.cookie(configRegistry, configUri, {expires: 30, path: '/'});
						}
						else {
								// check if one of the configs are stored in cookie
								if (!isEmpty($.cookie(configRegistry))) {
										var foundOne = false;
										for (var i = 0; i < configURIs.length; i++) {
												if (configURIs[i] == $.cookie(configRegistry)) {
														configUri = configURIs[i];
														foundOne = true;
														break;
												}
										}
										// if we have a config uri stored in cookie for this
										// configRegistry but it's not in there anymore, delete cookie
										if (!foundOne) {
												$.removeCookie(configRegistry);
										}
								}
								// if couldnt find one already selected, choose one
								if (isEmpty(configUri)) {
										// TODO select based on date
										var configUri = configURIs[0];
										$.cookie(configRegistry, configUri, { expires: 30, path: '/' });
								}
						}

						var request = $.ajax({type: "GET",
								url: configUri,
								headers: { 'Accept': 'text/turtle' },
								async: false,
								cache: false
						});
						request.done(function (response, textStatus, request) {
							
							rdf.parseTurtle(response, function (s, graph) {
								
								var configGraph = rdf.cf.Graph(graph);
								
								var configURIs = configGraph.node(configUri).out(pfx.ldp + "contains").literal();
								
								config.uri = configUri;
								config.title = configGraph.node(configUri).out(pfx.dcterms + "title").literal().shift();
								config.description = configGraph.node(configUri).out(pfx.dcterms + "description").literal().shift();
								config.sparqlEndpoint = configGraph.node(configUri).out(pfx.crldpc + "sparql-endpoint").literal().shift();
								config.irldpc = configGraph.node(configUri).out(pfx.crldpc + "ir-ldpc").literal().shift();
								config.trldpc = configGraph.node(configUri).out(pfx.crldpc + "tr-ldpc").literal().shift();
								config.tfrldpc = configGraph.node(configUri).out(pfx.crldpc + "tfr-ldpc").literal().shift();
								
								initFunc();
							});
						});
						request.fail(function (response, textStatus, statusLabel) {
						});
				}
			});
    });
    ajaxRequest.fail(function (response, textStatus, statusLabel) {
			
    });
}

/** Opens URL in new tab **/
function openInNewTab(url) {
    var win = window.open(url, '_blank');
    win.focus();
}

/** Checks for empty or undefined data **/
function isEmpty(data) {
    if (typeof data === 'undefined' || data === '' || data === null || data.length == 0) {
        return true;
    }
    return false;
}

function regFileNameExtractorHelper() {
    Handlebars.registerHelper('fileName', function (str) {
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
    if (isEmpty($('#' + widgetId + ' .overlay'))) {
        $('#' + widgetId).append($('<div>').prop('class', 'overlay')).append($('<div>').prop('class', 'loading-img'));
    }
}

function hideWidgetLoader(widgetId) {
    $('#' + widgetId + ' .loading-img').fadeOut(300, function () {
        $(this).remove();
    });
    $('#' + widgetId + ' .overlay').fadeOut(300, function () {
        $(this).remove();
    });
}

function escapeNoddedStr(str) {
    return (isEmpty(str) ? '' : str.replace(/>/g, '&gt;').replace(/</g, '&lt;').replace(/"/g, '&quot;')); /*.replace(/\n/g,'<br>');*/
}

function escapeHTML(html) {
    return (isEmpty(html) ? '' : html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
}

/** Escaping tricky IDs for jQuery selectors 
 * Usage: $(ID("some.id"));
 */
function ID(myid) {
    return $.trim("#" + myid.replace(/(:|\.|\/|\[|\]|,)/g, "\\\\$1"));
}

function setDefaultValue(variable, defaultValue) {
    return typeof variable !== 'undefined' ? variable : defaultValue;
}

/** Extracts the value(s) of aquery str param */
function getURLParameter(paramName) {
    var result = [];
    var sPageURL = window.location.search.substring(1);
    var sURLVariables = sPageURL.split('&');
    for (var i = 0; i < sURLVariables.length; i++) {
        var parameterName = sURLVariables[i].split('=');
        if (parameterName[0] === paramName) {
            result.push(decodeURIComponent(parameterName[1]));
        }
    }
    return result;
}