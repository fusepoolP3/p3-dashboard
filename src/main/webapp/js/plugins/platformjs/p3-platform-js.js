
function P3Platform() {
	if (typeof rdf === 'undefined' || typeof jQuery === 'undefined') {
		console.error("You must include jQuery and RDF-Ext JS libraries.");
	}
}

P3Platform.prototype.getPlatform = function (platformURI) {

	/* ************************* Platform ************************* */
	function Platform(URI, title, comment, label, ldpRoot, sparqlEndpoint, userInteractionRequestRegistry, transformerFactoryRegistry, transformerRegistry, dashboardConfigRegistry, pipelineConfigRegistry) {
		this.URI = URI;
		this.title = title;
		this.comment = comment;
		this.label = label;
		this.ldpRoot = ldpRoot;
		this.sparqlEndpoint = sparqlEndpoint;
		this.userInteractionRequestRegistry = userInteractionRequestRegistry;
		this.transformerFactoryRegistry = transformerFactoryRegistry;
		this.transformerRegistry = transformerRegistry;
		this.dashboardConfigRegistry = dashboardConfigRegistry;
		this.pipelineConfigRegistry = pipelineConfigRegistry;
	}
	Platform.prototype.getPlatformURI = function () { return this.URI; };
	Platform.prototype.getLdpRoot = function () { return this.ldpRoot; };
	Platform.prototype.getSparqlEndpoint = function () { return this.sparqlEndpoint; };
	Platform.prototype.getUserInteractionRequestRegistryURI = function () { return this.userInteractionRequestRegistry; };
	Platform.prototype.getTransformerFactoryRegistry = function () {
		var main = this;
    return new Promise(function (resolve, reject) {
			resolve(main.transformerFactoryRegistry);
		});
	};
	Platform.prototype.getTransformerFactoryRegistryURI = function () { return this.transformerFactoryRegistry.URI; };
	Platform.prototype.getTransformerRegistry = function () {
		var main = this;
    return new Promise(function (resolve, reject) {
			resolve(main.transformerRegistry);
		});
	};
	Platform.prototype.getTransformerRegistryURI = function () { return this.transformerRegistry.URI; };
	Platform.prototype.getDashboardConfigRegistryURI = function () { return this.dashboardConfigRegistry; };
	Platform.prototype.getPipelineConfigRegistryURI = function () { return this.pipelineConfigRegistry; };
	
	/* ************************* TransformerRegistry ************************* */
	function TransformerRegistry(transformerRegistryURI) {
		this.URI = transformerRegistryURI;
	}
	TransformerRegistry.prototype.registerTransformer = function (transformerURI, title, description) {
		
		var main = this;
		return new Promise(function (resolve, reject) {
		
			if(!isEmpty(transformerURI)) {
				
				var descriptionProp = "";
				if(typeof description !== 'undefined') {
					descriptionProp = 'dcterms:description "' + description + '" ; ';
				}

				var data = '@prefix dcterms: <http://purl.org/dc/terms/> . '
								+ '@prefix trldpc: <http://vocab.fusepool.info/trldpc#> . '
								+ '<> a trldpc:TransformerRegistration; '
								+ 'trldpc:transformer <' + transformerURI + '>; '
								+ descriptionProp
								+ 'dcterms:title "' + title + '"@en . ';

				$.ajax({
						type: 'POST',
						headers: {
							'Content-Type': 'text/turtle',
							'Slug': title
						},
						url: main.URI,
						data: data,
						async: true
				}).done(function (response) {
					resolve(true);
				}).fail(function (xhr, textStatus, errorThrown) {
					reject(Error("error " + xhr.status));
				});
			}
			else {
					reject(Error("Invalid Transformer Registry."));
			}
		});
	};
	
	/* ************************* TransformerFactoryRegistry ************************* */
	function TransformerFactoryRegistry(transformerFactoryRegistryURI) {
		this.URI = transformerFactoryRegistryURI;
	}
	TransformerFactoryRegistry.prototype.registerTransformerFactory = function (transformerFactoryURI, title, description) {
		
		var main = this;
		return new Promise(function (resolve, reject) {
		
			if(!isEmpty(transformerFactoryURI)) {
				
				var descriptionProp = "";
				if(typeof description !== 'undefined') {
					descriptionProp = 'dcterms:description "' + description + '" ; ';
				}

				var data = '@prefix dcterms: <http://purl.org/dc/terms/> . '
								+ '@prefix tfrldpc: <http://vocab.fusepool.info/tfrldpc#> . '
								+ '<> a tfrldpc:TransformerFactoryRegistration; '
								+ 'tfrldpc:transformerFactory <' + transformerFactoryURI + '>; '
								+ descriptionProp
								+ 'dcterms:title "' + title + '"@en . ';

				$.ajax({
						type: 'POST',
						headers: {
							'Content-Type': 'text/turtle',
							'Slug': title
						},
						url: main.URI,
						data: data,
						async: true
				}).done(function (response) {
					resolve(true);
				}).fail(function (xhr, textStatus, errorThrown) {
					reject(Error("error " + xhr.status));
				});
			}
			else {
					reject(Error("Invalid Transformer Factory Registry."));
			}
		});
	};
	
	var main = this;	
	return new Promise(function (resolve, reject) {
		
		var ajaxRequest = jQuery.ajax({ type: "GET", url: platformURI, async: true });
		
		ajaxRequest.done(function (response, textStatus, responseObj) {
			rdf.parseTurtle(response, function (s, graph) {
				
				var platformConfig = rdf.cf.Graph(graph);
				
				var pfx = {  rdfs: "http://www.w3.org/2000/01/rdf-schema#", dcElements: "http://purl.org/dc/elements/1.1/", fp3: "http://vocab.fusepool.info/fp3#" };
			
				var title = platformConfig.node(platformURI).out(pfx.dcElements + "title").literal().shift();
				var comment = platformConfig.node(platformURI).out(pfx.rdfs + "comment").literal().shift();
				var label = platformConfig.node(platformURI).out(pfx.rdfs + "label").literal().shift();
				var ldpRoot = platformConfig.node(platformURI).out(pfx.fp3 + "ldpRoot").literal().shift();
				var sparqlEndpoint = platformConfig.node(platformURI).out(pfx.fp3 + "sparqlEndpoint").literal().shift();
				var userInteractionRequestRegistry = platformConfig.node(platformURI).out(pfx.fp3 + "userInteractionRequestRegistry").literal().shift();
				var transformerFactoryRegistry = platformConfig.node(platformURI).out(pfx.fp3 + "transformerFactoryRegistry").literal().shift();
				var transformerRegistry = platformConfig.node(platformURI).out(pfx.fp3 + "transformerRegistry").literal().shift();
				var dashboardConfigRegistry = platformConfig.node(platformURI).out(pfx.fp3 + "dashboardConfigRegistry").literal().shift();
				var pipelineConfigRegistry = platformConfig.node(platformURI).out(pfx.fp3 + "pipelineConfigRegistry").literal().shift();
				
				var transformerRegistryObj = new TransformerRegistry(transformerRegistry);
				var transformerFactoryRegistryObj = new TransformerFactoryRegistry(transformerFactoryRegistry);
				
				var platform = new Platform(platformURI, title, comment, label, ldpRoot, sparqlEndpoint,
																	userInteractionRequestRegistry, transformerFactoryRegistryObj,
																	transformerRegistryObj, dashboardConfigRegistry, pipelineConfigRegistry);
				
				resolve(platform);
			 
			});
			return;
		});
		ajaxRequest.fail(function (responseObj, textStatus, response) {
			reject(Error("error " + responseObj.status));
		});
	});
	
	function isEmpty(data) {
		if (typeof data === 'undefined' || data === '' || data === null || data.length == 0) {
			return true;
		}
		return false;
	}
};

var P3Platform = new P3Platform();