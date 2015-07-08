var widgetResources;
var interactions;
var selectedInteraction;
var refreshController = {};
refreshController.minSecs = 5;
refreshController.defSecs = 60;
var currentAction = "NEW";

$(document).ready(function () {
	"use strict";
	showLoadingCover();
	extractConfigRegistryURI(initDashboard);
});

/*********************/
/**		General 	**/
/*********************/

function initDashboard() {
	Dropzone.autoDiscover = false;
	
	// Loading visualizer for Uduvudu preview
	$("#visualizer").load("templates/visualizer.html");
	
	$("#templates").load("templates/templates.html", function() {
		
		// Compile templates
		window.TLDPCTemplate = Handlebars.compile($("#TLDPCTemplate").html());
		window.SPARQLTemplate = Handlebars.compile($("#SPARQLTemplate").html());
		window.UIRTemplate = Handlebars.compile($("#UIRTemplate").html());
		window.HOWTOTemplate = Handlebars.compile($("#HOWTOTemplate").html());
		regFileNameExtractorHelper();
		
		// Query the platform for the different kind of widgets
		getTLDPCs();
		getInteractions();
		getHowtos();
		getSparqlBuilders();
		getTransformers();
		
		hideLoadingCover();
							
		$(".connectedSortable").sortable({
			connectWith: ".connectedSortable",
			forcePlaceholderSize: true,
			handle: ".box-header",
			placeholder: "sort-highlight",
			revert: 100,
			tolerance: "pointer",
			zIndex: 999999
		});
		$(".connectedSortable .box-header, .connectedSortable .nav-tabs-custom").css("cursor", "move");
	
		initRefresher();
	});
}

function addCloseFunctionality(widgetId){
    $('#'+widgetId).find("[data-widget='remove']").click(function() {
        //Find the box parent        
        var box = $(this).parents(".box").first();
        box.slideUp();
    });
}
	
function addCollapseFunctionality(widgetId){
    $('#'+widgetId).find("[data-widget='collapse']").click(function() {
        //Find the box parent        
        var box = $(this).parents(".box").first();
        //Find the body and the footer
        var bf = box.find(".box-body, .box-footer");
        if (!box.hasClass("collapsed-box")) {
            box.addClass("collapsed-box");
            $(this).children(".fa-minus").removeClass("fa-minus").addClass("fa-plus");
            bf.slideUp();
        } else {
            box.removeClass("collapsed-box");
            $(this).children(".fa-plus").removeClass("fa-plus").addClass("fa-minus");
            bf.slideDown();
        }
    });
}

/*************************/
/**		Widget common 	**/
/*************************/

function drawWidgetsByType(widgetType) {	// TODO work with orderIndex
	for(var i=0; i<widgets.length; i++) {
		if(widgets[i].type == widgetType) {
			switch(i % 3) {
				case 0:
					showWidget("firstMainColumn",  widgets[i]);
				break;
				case 1:
					showWidget("secondMainColumn",  widgets[i]);
				break;
				case 2:
					showWidget("thirdMainColumn",  widgets[i]);
				break;
			}
		}
	}
}

function showWidget(parentId, widget) {
	if(isEmpty($('#'+widget.id))) {
		switch(widget.type) {
			case "SPARQL":
				var html = SPARQLTemplate(widget);
				$('#'+parentId).append(html);
				
				widget.yasqe = YASQE(document.getElementById('sparqlBuilder'+widget.id), {
						sparql: {
							showQueryButton: true,
							endpoint: config.sparqlEndpoint,
							requestMethod: "POST",
							callbacks: {
								beforeSend: function() { $('#sparqlModal'+widget.id).modal('show'); }
							}
						},
						createShareLink: null
					});
				widget.yasqe.setSize(null, '160px');
				
				widget.yasr = YASR(document.getElementById('sparqlResult'+widget.id), { getUsedPrefixes: widget.yasqe.getPrefixesFromQuery, useGoogleCharts: false });

				widget.yasqe.options.sparql.callbacks.complete = widget.yasr.setResponse;
				
			break;
			case "UIR":
				var html = UIRTemplate(widget);
				$('#'+parentId).append(html);
				$("#interactionList").change(function() {
					var val = $(this).find("option:selected").val();
					selectedInteraction = getInteractionByContainer(val);
				});
				// Double click for UIR open
				$('#interactionList').dblclick(function () {
					$('#interactionList option:selected').each(function () {
						openInteraction();
					});
				}); 
			break;
			case "HOWTO":
				var html = HOWTOTemplate(widget);
				$('#'+parentId).append(html);
				
			break;
			case "T-LDPC":
				var html = TLDPCTemplate(widget);
				$('#'+parentId).append(html);
				
				// Init upload functionality for this T-LDPC
				widget.uploads = new Dropzone('#' + widget.id, {
					url: "/upload/url", 
					previewsContainer: '#droparea' + widget.id, 
					clickable: '#droparea' + widget.id
				});
				widget.uploads.options.autoProcessQueue = false;
				widget.uploads.on('addedfile', function(file) {
					uploadFile(file, widget);
					resetDropArea(widget.id);
				});
				resetDropArea(widget.id);
				
				// Double click for resource preview
				$('#select' + widget.id).dblclick(function () {
					$('#select' + widget.id + ' option:selected').each(function () {
						viewResource($(this).val());
					});
				}); 

			break;
		}
		
		addCloseFunctionality(widget.id);
		addCollapseFunctionality(widget.id);
		
	}
	else {
		//console.log('This widget is already in use ('+widget.id+')');
	}
}

function isExistingWidget(WLDPCURI) {
	for(var i=0; i<widgets.length; i++){
		if(widgets[i].uri == WLDPCURI) {
			return true;
		}
	}
	return false;
}

function onNewWidgetClick() {
	currentAction = "NEW";
	$('#newWidgetPanel').modal();
	$('#modalTitle').text('New widget');
	$('#widgetType').prop('disabled', false);
	widgetTypeChange();
}

function saveNewWidget(title, widgetType, data) {

	var ajaxRequest = $.ajax({
		type: 'POST',
		headers: { 
			'Content-Type': 'text/turtle',
			'Slug' : title
		},
		url: config.wrldpc,
		data: data
	});
	
	ajaxRequest.done(function (response) {
		$("#widgetTitle").val('');
		$("#transformerURI").val('');
		$("#widgetDescription").val('');
		$("#transformerList").val($("#transformerList option:first").val());
		
		// refresh widget list to get the new widget
		switch(widgetType) {
			case "T-LDPC":
				getTLDPCs();
			break;
			case "UIR":
				getInteractions();
			break;
			case "HOWTO":
				getHowtos();
			break;
			case "SPARQL":
				getSparqlBuilders();
			break;
		}
		$('#newWidgetPanel').modal('hide');
		
	});
	ajaxRequest.fail(function (xhr, textStatus, errorThrown) {
		console.error(xhr, textStatus, errorThrown);
		$('#newWidgetPanel').modal('hide');
	});
}

function saveWidget(){
	var widgetType = $("#widgetType").val();
	
	var title = $("#widgetTitle").val();
	var transformerURI = $("#transformerURI").val();
	var description = $("#widgetDescription").val();
	
	if(widgetType != "UIR" && isEmpty(title)){
		alert('Please provide a widget title');
	}
	else if(widgetType == "T-LDPC" && isEmpty(transformerURI)){
		alert('Please provide a transformer URI');
	}
	else if(widgetType == "HOWTO" && isEmpty(description)){
		alert('Please provide description');
	}
	else {
		var data = createWidgetRegStr(widgetType, title, description, transformerURI);
		if(currentAction == "NEW") {
			saveNewWidget(title, widgetType, data);
		}
		else {
			modifyTLDPCWidget(data);
		}
	}
}

function modifyTLDPCWidget(data) {
	
	var widget = getWidgetById($('#widgetId').val());
	
	var ajaxRequest = $.ajax({
		type: 'PUT',
		headers: {
			'Content-Type': 'text/turtle',
			'If-Match': widget.ETag
		},
		url: widget.uri,
		data: data
	});

	ajaxRequest.done(function (response, textStatus, request) {
		getTLDPCs();
		$('#newWidgetPanel').modal('hide');
	});
	ajaxRequest.fail(function (xhr, textStatus, errorThrown) {
		console.error(xhr, textStatus, errorThrown);
		$('#newWidgetPanel').modal('hide');
	});		
}

function createWidgetRegStr(widgetType, title, description, transformerUri) {
	
	var widgetTransformerRow = '';
	if(widgetType == "T-LDPC") {
		widgetTransformerRow = '  eldp:transformer <' + escStr(transformerUri) + '>; ';
	}
	
	var descriptionRow = '';
	if(!isEmpty(description)) {
		descriptionRow = '  dcterms:description "' + escStr(description) + '"; ';
	}
	
	if(widgetType == "UIR") {
		title = "UIR";
	}
	
	//TODO orderIndex, visible
	var str = '@prefix dcterms: <http://purl.org/dc/terms/> . '
			+ '@prefix wrldpc: <http://vocab.fusepool.info/wrldpc#> . '
			+ '@prefix eldp: <http://vocab.fusepool.info/eldp#>. '
			+ '<> a wrldpc:WidgetRegistration; '
			+ '  wrldpc:type "' + widgetType + '"; '
			+ '  wrldpc:orderIndex 0; '
			+ '  wrldpc:visible "true"^^xsd:boolean; '
			+ widgetTransformerRow
			+ descriptionRow
			+ '  dcterms:title "' + escStr(title) + '"@en. ';
			
	return str;
}

function widgetTypeChange() {
	
	$('#transformerList').parent().slideUp();
	$('#transformerURI').parent().slideUp();
	$('#widgetTitle').parent().slideDown();
	$('#widgetDescription').prop('placeholder', 'Description (optional)');
	
	switch($("#widgetType").val()){
		case "SPARQL":
			
		break;
		case "UIR":
			$('#widgetTitle').parent().slideUp();
		break;
		case "HOWTO":
			$('#widgetDescription').prop('placeholder', 'Description');
		break;
		case "T-LDPC":
			$('#transformerList').parent().slideDown();
			$('#transformerURI').parent().slideDown();
		break;
	}
}

function deleteWidget(widgetId) {
	if( confirm('Are you sure you want to delete this widget?') ) {
		var widgetItem = getWidgetById(widgetId);
		deleteResource(widgetItem.uri);
		$('#'+widgetId).slideUp(400, function() { $(this).remove(); });
	}
}

function deleteResource(resourceURI, callbackFunction) {
	if(!isEmpty(resourceURI)) {
		callbackFunction = setDefaultValue(callbackFunction, function(){});
		
		var ajaxRequest = $.ajax({	type: "DELETE",
									url: resourceURI });
		
		ajaxRequest.done(function(response, textStatus, request){
			callbackFunction();
		});
		ajaxRequest.fail(function(response, textStatus, request){
			callbackFunction();
			alert('Deleting the resource failed.');
			console.error(response, textStatus, request);
		});
	}
}

function getWidgetById(widgetId) {
	for(var i=0; i<widgets.length; i++) {
		if(widgets[i].id == widgetId) {
			return widgets[i];
		}
	}
	return null;
}

/*********************/
/**		T-LDPCs 	**/
/*********************/

function getTLDPCs(){
	
	// Getting "T-LDPC" widgets 
	var query = 'SELECT * WHERE { ' 
		  + '<' + config.wrldpc + '> <http://www.w3.org/ns/ldp#contains> ?child . '
			  + '?child <http://purl.org/dc/terms/title> ?title . '
			 // + '?child <http://vocab.fusepool.info/wrldpc#type> "T-LDPC" . '
			  + '?child ?typeProp "T-LDPC" . '
			  + 'FILTER (str(?typeProp) = "http://vocab.fusepool.info/wrldpc#type" ) '
			  + '?child <http://vocab.fusepool.info/wrldpc#orderIndex> ?orderIndex . '
			  + '?child <http://vocab.fusepool.info/wrldpc#visible> ?visible . '
			  + '?child <http://vocab.fusepool.info/eldp#transformer> ?widgetTransformer . '
			  + 'OPTIONAL { '
			  +	'	?child <http://purl.org/dc/terms/description> ?description . '
			  +	'	?child <http://purl.org/dc/terms/created> ?date . '
			  + '}'
		  + '}';
	
	var ajaxRequest = $.ajax({
        type: 'POST',
        url: config.sparqlEndpoint,
		headers: { 
			'Accept' : 'application/sparql-results+json',
			'Content-Type': 'application/sparql-query;charset=UTF-8'
		},
		data: query
    });
	
	ajaxRequest.done(function (data) {
        var tldpcs = data.results.bindings;
		
		if(tldpcs.length > 0) {
			query = 'SELECT * WHERE { ' 
			  + '<' + config.wrldpc + '> <http://www.w3.org/ns/ldp#contains> ?child . '
				  + '?child <http://www.w3.org/ns/ldp#contains> ?resource . '
				  + 'OPTIONAL { '
				  +	'	?resource <http://purl.org/dc/terms/created> ?date . '
				  + '}'
			  + '}';
			
			var ajaxRequest = $.ajax({
				type: 'POST',
				url: config.sparqlEndpoint,
				headers: { 
					'Accept' : 'application/sparql-results+json',
					'Content-Type': 'application/sparql-query;charset=UTF-8'
				},
				data: query
			});
			
			ajaxRequest.done(function (data) { 
				widgetResources = data.results.bindings;
				
				$.each(tldpcs, function (i, tldpc) {
					if(!isExistingWidget(tldpc.child.value)) {
						var arr = [];
						for(var j = 0; j < widgetResources.length; j++) {
							if(widgetResources[j].child.value === tldpc.child.value){
								arr.push(widgetResources[j].resource.value);
							}
						}
						widgets.push({	id: "widget" + (widgetCount++),
										uri: tldpc.child.value,
										title: tldpc.title.value,
										type: "T-LDPC",
										orderIndex: tldpc.orderIndex.value,
										visible: tldpc.visible.value,
										// date: tldpc.date.value, //optional...
										// description: tldpc.description.value, //optional...
										widgetTransformer: tldpc.widgetTransformer.value,
										children: arr	});
					}
				});				
				drawWidgetsByType("T-LDPC");				
			});
			
			ajaxRequest.fail(function (xhr, textStatus, errorThrown) {
				console.error(xhr, textStatus, errorThrown);
			});
		}
    });
	
	ajaxRequest.fail(function (xhr, textStatus, errorThrown) {
        console.error(xhr, textStatus, errorThrown);
    });
}

function refreshTLDPCChildListById(widgetId){
	var widget = getWidgetById(widgetId);
	if(!isEmpty(widget)) {
		refreshTLDPCChildList(widget);
	}
}

function refreshTLDPCChildList(widget) {
	// showWidgetLoader(widget.id);
	
	var query = 'SELECT * WHERE { ' 
	  + '<' + config.wrldpc + '> <http://www.w3.org/ns/ldp#contains> <' + widget.uri + '> . '
		  + '<' + widget.uri + '> <http://www.w3.org/ns/ldp#contains> ?resource . '
		  + 'OPTIONAL { '
		  +	'	?resource <http://purl.org/dc/terms/created> ?date . '
		  + '}'
	  + '}';

	var ajaxRequest = $.ajax({
		type: 'POST',
		url: config.sparqlEndpoint,
		headers: { 
			'Accept' : 'application/sparql-results+json',
			'Content-Type': 'application/sparql-query;charset=UTF-8'
		},
		data: query
	});
	
	ajaxRequest.done(function (data) {	
		var resources = data.results.bindings;
		
		$('#select' + widget.id).empty();
		widget.children = [];
		for(var i = 0; i < resources.length; i++) {
			var child = resources[i].resource.value;
			widget.children.push(child);
			$('#select' + widget.id).append($('<option>').val(child).prop('title',child).text(getFileName(child)));
		}
		// hideWidgetLoader(widget.id);
	
	});
	ajaxRequest.fail(function (xhr, textStatus, errorThrown) {
		alert('Refreshing the widget was unsuccessful.');
		// hideWidgetLoader(widget.id);
        console.error(xhr, textStatus, errorThrown);
    });
}

function viewSelectedResource(widgetId) {
	var resourceURI = $('#select' + widgetId).val();
	
	if($.trim(resourceURI) == "") {
		alert("Select a resource");
	}
	else {
		viewResource(resourceURI);
	}
}

function deleteSelectedResource(widgetId) {
	var resourceURI = $('#select' + widgetId).val();
	
	if($.trim(resourceURI) == "") {
		alert("Select a resource");
	}
	else {
		if( confirm('Are you sure you want to delete the selected resource?') ) {
			showWidgetLoader(widgetId);
			var callbackFunction = function() {
				hideWidgetLoader(widgetId);
				refreshTLDPCChildListById(widgetId);
			};
			deleteResource(resourceURI, callbackFunction);
		}
	}
}

function viewResource(resourceURI) {	

	var ajaxRequest = $.ajax({	type: "GET",
								url: resourceURI,
								cache: false	});
	
	ajaxRequest.done(function(response, textStatus, request) {
		if(request.getResponseHeader("Content-Type")=="text/turtle") {
			var store = rdfstore.create();
			store.load('text/turtle', response, function(success, results) {
				if(success) {
					openInNewTab(resourceURI);
					// TODO 
					// $("#turtlePreview").empty().append('<div class="sunlight-highlight-turtle">' + escapeNoddedStr(response) + '</div>');
					// Sunlight.highlightAll();
					
					// $("#uduvuduPreview").html(uduvudu.process(store));
					// $("#linkToFile").empty().html('<span class="previewMessage"><a href="'+resourceURI+'" target="_blank">Direct link to file</a></span>');
					
					// $('#turtlePreviewTab').click(function (e) { e.preventDefault();$(this).tab('show');}); //L
					// $('#uduvuduPreview').click(function (e) { e.preventDefault();$(this).tab('show');}); //L
						
					// $('#visDropdown a[href="#turtlePreview"]').tab('show');
				}
				else {
					console.log("Something went wrong during loading the response to the RDF store.");
				}
			});
		}
		else {
			openInNewTab(resourceURI);				
			// $("#turtlePreview").empty().html('<span class="previewMessage">Only files with content-type "text/turtle" can be shown here</span>');
			// $("#uduvuduPreview").empty().html('<span class="previewMessage">Only files with content-type "text/turtle" can be shown here</span>');
			// $("#linkToFile").empty().html('<span class="previewMessage"><a href="' + resourceURI + '" target="_blank">Direct link to file</a></span>');
			// $('#visDropdown a[href="#linkToFile"]').tab('show');
		}
		// $('#previewPanel').modal('show');
	});
	ajaxRequest.fail(function(response, textStatus, statusLabel){});
}

function uploadFile(file, widget) {
	if(!$.isEmptyObject(file)){
		showWidgetLoader(widget.id);
		
		var ajaxRequest = $.ajax({	type: "POST",
									url: widget.uri,
									data: file,
									headers: { "Slug" : file.name },
									contentType: file.type,
									processData: false
								});	
		
		ajaxRequest.done(function(response, textStatus, request){
			hideWidgetLoader(widget.id);
			refreshTLDPCChildList(widget);
		});
		ajaxRequest.fail(function(response, textStatus, statusLabel){
			hideWidgetLoader(widget.id);
			alert('Uploading was unsuccessful. Maybe try again later. (You can also check the console for details.)');
			console.error(response, textStatus, statusLabel);
		});
	}
}

function resetDropArea(widgetId) {
	$('#droparea' + widgetId).removeClass('dz-started');
	$('#droparea' + widgetId).empty();
	$('#droparea' + widgetId).html('Drop files here / click to browse');
}

function TLDPCSettings(widgetId) {	
	currentAction = "MODIFY";
	var widget = getWidgetById(widgetId);
	
	$('#modalTitle').text('Widget settings');
	$('#newWidgetPanel').modal();
	
	$('widgetId').val(widgetId);
	$('#widgetType').val('T-LDPC').prop('disabled', 'disabled');
	$('#widgetTitle').val(widget.title);
	$('#transformerList').val(widget.widgetTransformer);
	
	widgetTypeChange();
}

function populateFile() {
	alert('Only file upload is available yet.');
}

/**************************************/
/** User Interaction Request Widgets **/
/**************************************/

function getInteractions(){
	
	// Getting "UIR" widgets 
	var query = 'SELECT * WHERE { ' 
		  + '<' + config.wrldpc + '> <http://www.w3.org/ns/ldp#contains> ?child . '
			  + '?child <http://purl.org/dc/terms/title> ?title . '
			//  + '?child <http://vocab.fusepool.info/wrldpc#type> "UIR" . '
			  + '?child ?typeProp "UIR" . '
			  + 'FILTER (str(?typeProp) = "http://vocab.fusepool.info/wrldpc#type" ) '
			  + '?child <http://vocab.fusepool.info/wrldpc#orderIndex> ?orderIndex . '
			  + '?child <http://vocab.fusepool.info/wrldpc#visible> ?visible . '
			  + 'OPTIONAL { '
			  +	'	?child <http://purl.org/dc/terms/description> ?description . '
			  +	'	?child <http://purl.org/dc/terms/created> ?date . '
			  + '}'
		  + '}';
	
	var ajaxRequest = $.ajax({
        type: 'POST',
        url: config.sparqlEndpoint,
		headers: { 
			'Accept' : 'application/sparql-results+json',
			'Content-Type': 'application/sparql-query;charset=UTF-8'
		},
		data: query
    });
	
	ajaxRequest.done(function (data) {
        var UIRWidgets = data.results.bindings;
		
		if(UIRWidgets.length > 0) {
			
			var query = 'SELECT * WHERE { ' 
			  + '<' + config.irldpc + '> <http://www.w3.org/ns/ldp#contains> ?child . '
				  + '?child <http://vocab.fusepool.info/fp3#interactionResource> ?uri . '
				  + 'OPTIONAL { '
				  +	'	?child <http://www.w3.org/2000/01/rdf-schema#comment> ?comment . '
				  +	'	?child <http://purl.org/dc/terms/created> ?date . '
				  + '}'
			  + '}';
			
			var ajaxRequest = $.ajax({
				type: 'POST',
				url: config.sparqlEndpoint,
				headers: { 
					'Accept' : 'application/sparql-results+json',
					'Content-Type': 'application/sparql-query;charset=UTF-8'
				},
				data: query
			});
			
			ajaxRequest.done(function (data) { 
				interactions = data.results.bindings;
				
				$.each(UIRWidgets, function (i, UIRWidget) {
				
					if(!isExistingWidget(UIRWidget.child.value)) {
						widgets.push({	id: "widget" + (widgetCount++),
										uri: UIRWidget.child.value,
										title: UIRWidget.title.value,
										type: "UIR",
										orderIndex: UIRWidget.orderIndex.value,
										visible: UIRWidget.visible.value,
										// date: UIRWidget.date.value, //optional...
										// description: UIRWidget.description.value, //optional...
										widgetTransformer: "",
										children: interactions	});
						}
				});
				drawWidgetsByType("UIR");				
			});
			
			ajaxRequest.fail(function (xhr, textStatus, errorThrown) {
				console.error(xhr, textStatus, errorThrown);
			});
		}
    });
	
	ajaxRequest.fail(function (xhr, textStatus, errorThrown) {
        console.error(xhr, textStatus, errorThrown);
    });
}

function deleteInteraction(widgetId) {
	
	if(isEmpty(selectedInteraction)) {
		alert('Select an interaction request first.');
	}
	else {
		if (confirm('Are you sure you want to delete "' + selectedInteraction.comment.value + '"?')) {
			showWidgetLoader(widgetId);
			var ajaxRequest = $.ajax({
				type: 'DELETE',
				url: selectedInteraction.child.value,
			});
			
			ajaxRequest.done(function (response) {
				// check for HTTP_OK or HTTP_NO_CONTENT
				hideWidgetLoader(widgetId);
				refreshInteractionChildListById(widgetId);
			});
			
			ajaxRequest.fail(function (xhr, textStatus, errorThrown) {
				hideWidgetLoader(widgetId);
				alert('Deleting the resource failed.');
				console.error(xhr, textStatus, errorThrown);
			});
		}
	}
}

function openInteraction() {
	if(isEmpty(selectedInteraction)) {
		alert('Select an interaction request first.');
	}
	else {
		openInNewTab(selectedInteraction.uri.value);
	}
}

function getInteractionByContainer(str) {
    for (var i = 0; i < interactions.length; i++) { 
		if (interactions[i].uri.value == str) {
            return interactions[i];
        }
    };
    return null;
}

function refreshInteractionChildListById(widgetId) {
	var widget = getWidgetById(widgetId);
	if(!isEmpty(widget)) {
		refreshInteractionChildList(widget);
	}
}

function refreshInteractionChildList(widget) {
	// showWidgetLoader(widget.id);
	
	interactions = [];
	$('#interactionList').empty();
	
	var query = 'SELECT * WHERE { ' 
			  + '<' + config.irldpc + '> <http://www.w3.org/ns/ldp#contains> ?child . '
				  + '?child <http://vocab.fusepool.info/fp3#interactionResource> ?uri . '
				  + 'OPTIONAL { '
				  +	'	?child <http://www.w3.org/2000/01/rdf-schema#comment> ?comment . '
				  +	'	?child <http://purl.org/dc/terms/created> ?date . '
				  + '}'
			  + '}';

	var ajaxRequest = $.ajax({
		type: 'POST',
		url: config.sparqlEndpoint,
		headers: { 
			'Accept' : 'application/sparql-results+json',
			'Content-Type': 'application/sparql-query;charset=UTF-8'
		},
		data: query
	});
	
	ajaxRequest.done(function (data) { 
		var interactionItems = data.results.bindings;
		
		widget.children = [];
		for(var i = 0; i < interactionItems.length; i++) {
			var child = interactionItems[i];
			widget.children.push(child);
			$('#interactionList').append($('<option>').val(child.uri.value).prop('title',child.child.value).text(getFileName(child.comment.value)));
			interactions.push(child);
		}
		// hideWidgetLoader(widget.id);
	
	});
	ajaxRequest.fail(function (xhr, textStatus, errorThrown) {
		alert('Refreshing the widget was unsuccessful.');
		// hideWidgetLoader(widget.id);
        console.error(xhr, textStatus, errorThrown);
    });
}

/****************************/
/** SPARQL Builder Widgets **/
/****************************/

function getSparqlBuilders(){
	
	// Getting "SPARQL" widgets 
	var query = 'SELECT * WHERE { ' 
		  + '<' + config.wrldpc + '> <http://www.w3.org/ns/ldp#contains> ?child . '
			  + '?child <http://purl.org/dc/terms/title> ?title . '
			//  + '?child <http://vocab.fusepool.info/wrldpc#type> "SPARQL" . '
			  + '?child ?typeProp "SPARQL" . '
			  + 'FILTER (str(?typeProp) = "http://vocab.fusepool.info/wrldpc#type" ) '
			  + '?child <http://vocab.fusepool.info/wrldpc#orderIndex> ?orderIndex . '
			  + '?child <http://vocab.fusepool.info/wrldpc#visible> ?visible . '
			  + 'OPTIONAL { '
			  +	'	?child <http://purl.org/dc/terms/description> ?description . '
			  +	'	?child <http://purl.org/dc/terms/created> ?date . '
			  + '}'
		  + '}';
	
	var ajaxRequest = $.ajax({
        type: 'POST',
        url: config.sparqlEndpoint,
		headers: { 
			'Accept' : 'application/sparql-results+json',
			'Content-Type': 'application/sparql-query;charset=UTF-8'
		},
		data: query
    });
	
	ajaxRequest.done(function (data) {
        var sparqlBuilders = data.results.bindings;
		
		if(sparqlBuilders.length > 0) {		
				$.each(sparqlBuilders, function (i, sparqlBuilder) {									
					if(!isExistingWidget(sparqlBuilder.child.value)) {	
						widgets.push({	id: "widget" + (widgetCount++),
										uri: sparqlBuilder.child.value,
										title: sparqlBuilder.title.value,
										type: "SPARQL",
										orderIndex: sparqlBuilder.orderIndex.value,
										visible: sparqlBuilder.visible.value,
										// date: sparqlBuilder.date.value, //optional...
										// description: sparqlBuilder.description.value, //optional...
										widgetTransformer: "",
										children: []	});					
					}
				});
				
		}
		drawWidgetsByType("SPARQL");
    });
	
	ajaxRequest.fail(function (xhr, textStatus, errorThrown) {
        console.error(xhr, textStatus, errorThrown);
    });
}

//unused
function sendSPARQL(){
	var query = $("#sparqlBuilder").val();
    
	if(!isEmpty(query)){
		$.ajax({
			type: 'POST',
			url: config.sparqlEndpoint,
			headers: { 
				'Accept' : 'application/sparql-results+json',
				'Content-Type': 'application/sparql-query;charset=UTF-8'
			},
			data: query
		}).done(function (data) {
			console.log(data);
			alert('for now you can see response in console');
		}).fail(function (xhr, textStatus, errorThrown) {
			console.error(xhr, textStatus, errorThrown);
		});
	}
	else{
		alert('sending an empty query seems pointless');
	}
}

/*******************/
/** HOWTO Widgets **/
/*******************/

function getHowtos(){
	
	// Getting "HOWTO" widgets 
	var query = 'SELECT * WHERE { ' 
		  + '<' + config.wrldpc + '> <http://www.w3.org/ns/ldp#contains> ?child . '
			  + '?child <http://purl.org/dc/terms/title> ?title . '
			//  + '?child <http://vocab.fusepool.info/wrldpc#type> "HOWTO" . '
			  + '?child ?typeProp "HOWTO" . '
			  + 'FILTER (str(?typeProp) = "http://vocab.fusepool.info/wrldpc#type" ) '
			  + '?child <http://vocab.fusepool.info/wrldpc#orderIndex> ?orderIndex . '
			  + '?child <http://vocab.fusepool.info/wrldpc#visible> ?visible . '
			  +	'?child <http://purl.org/dc/terms/description> ?description . '
		  + '}';
	
	var ajaxRequest = $.ajax({
        type: 'POST',
        url: config.sparqlEndpoint,
		headers: { 
			'Accept' : 'application/sparql-results+json',
			'Content-Type': 'application/sparql-query;charset=UTF-8'
		},
		data: query
    });
	
	ajaxRequest.done(function (data) {
        var howtos = data.results.bindings;
		
		if(howtos.length > 0) {		
				$.each(howtos, function (i, howto) {
					if(!isExistingWidget(howto.child.value)) {
						widgets.push({	id: "widget" + (widgetCount++),
										uri: howto.child.value,
										title: howto.title.value,
										type: "HOWTO",
										orderIndex: howto.orderIndex.value,
										visible: howto.visible.value,
										// date: howto.date.value, //optional...
										description: howto.description.value,
										widgetTransformer: "",
										children: []	});
					}
				});				
		}
		drawWidgetsByType("HOWTO");
    });
	
	ajaxRequest.fail(function (xhr, textStatus, errorThrown) {
        console.error(xhr, textStatus, errorThrown);
    });
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
    
	var ajaxRequest = $.ajax({
        type: 'POST',
        url: config.sparqlEndpoint,
		headers: { 
			'Accept' : 'application/sparql-results+json',
			'Content-Type': 'application/sparql-query;charset=UTF-8'
		},
		data: query
    });
	
	ajaxRequest.done(function (data) {
		$("#transformerList").empty();
        transformers = data.results.bindings;
		var first = true;
		
		$("#transformerList").append($('<option>').text('Select a transformer').val('0'));
        if(transformers.length > 0) {
            $.each(transformers, function (i, transformer) {
				$("#transformerList").append($('<option>').text(transformer.title.value).val(transformer.child.value));
            });
        }
		$("#transformerCountMenu").text(transformers.length);		
    });
	
	ajaxRequest.fail(function (xhr, textStatus, errorThrown) {
        console.error(xhr, textStatus, errorThrown);
    });
}

function getTransformerByContainer(str) {
    for (var i = 0; i < transformers.length; i++) { 
		if (transformers[i].child.value === str) {
            return transformers[i];
        }
    };
    return null;
}

function transformerChange(){
	var selected = $('#transformerList option:selected').val();
	var transformer = getTransformerByContainer(selected);
	
	if(isEmpty(transformer)){
		$('#transformerURI').attr('disabled',false);
		$('#transformerURI').val('');
	}
	else{
		$('#transformerURI').attr('disabled',true);
		$('#transformerURI').val(transformer.uri.value);
	}
}

/*****************************/
/**		Refresh controller 	**/
/*****************************/

function initRefresher() {
	$('#refreshDiv .iCheck-helper').click(function () {
		var checkbox = $(this).parent();
		if (checkbox.hasClass('checked')) {
			checkbox.first().addClass('checked');
		} else {
			checkbox.first().removeClass('checked');
		}
        toggleRefresh();
    });
	
	$("#refreshInterval").blur(function() {
		onRefreshIntervalChange();
    });

    $("#refreshInterval").keyup(function(event) {
		if(event.keyCode == 13) { // ENTER
			onRefreshIntervalChange();
		}
	});
	
	$('#refreshInterval').val(refreshController.defSecs);
	toggleRefresh();
}

/** Checking, correcting, executing the value set in the '#refreshInterval' INPUT element. */
function onRefreshIntervalChange() {
	var refreshInterval = $('#refreshInterval').val();
	
	if(isNaN(refreshInterval)) {
		$('#refreshInterval').val(refreshController.defSecs);
		refreshController.refreshInterval = refreshController.defSecs;
		window.clearInterval(refreshController.refresher);
		refreshController.countdownInterval = 0;
	}
	else {
		if(refreshInterval < refreshController.minSecs) {
			$('#refreshInterval').val(refreshController.minSecs);
			refreshController.refreshInterval = refreshController.minSecs;
		}
		else {
			refreshController.refreshInterval = refreshInterval;
		}
		refreshController.countdownInterval = refreshController.refreshInterval;
	}
	toggleRefresh();
	refreshCountdowner();
}

/** Refreshing the widgets */
function refreshWidgets() {
	$('#refreshNowButton').prop('disabled', 'disabled');
	for(var i=0; i<widgets.length; i++) {
		if(widgets[i].type == "T-LDPC") {
			refreshTLDPCChildList(widgets[i]);
		}
		else if(widgets[i].type == "UIR") {
			refreshInteractionChildList(widgets[i]);
		}
	}
	onRefreshIntervalChange();
	$('#refreshNowButton').prop('disabled', false);
}

/** Setting an interval to a given value to call the refreshWidgets() function (also if there're any, deleting the set one )
* @param {int} interval - The refresh interval in seconds */
function setRefreshInterval(interval) {
	window.clearInterval(refreshController.refresher);
	refreshController.refresher = setInterval(refreshWidgets,(interval*1000));
}

/** Counting one down and calling the refreshCountdowner() function if the value is still positive. Clearing the interval anyway.*/
function countdown() {
	refreshController.countdownInterval--;
	
	if (refreshController.countdownInterval < 0) {
		window.clearInterval(refreshController.countdowner);
	}
	else {
		refreshCountdowner();
	}
}

/** Two-digitizing. 
* @param {int} num - The number (1 or 2 digits) */
function twoDigitizer(num) {
	if(num < 10) {
		return '0'+num;
	}
	else {
		return num;
	}
}

/** Setting the proper SPAN elements on the GUI regarding the value of 'countdownInterval'. */
function refreshCountdowner() {
	if(refreshController.countdownInterval > 0) {		
		$('#countdown').css("visibility", "visible");
				
		var hours = twoDigitizer(Math.floor(refreshController.countdownInterval/3600));
		var minutes = twoDigitizer(Math.floor((refreshController.countdownInterval-(hours*3600))/60));
		var seconds = twoDigitizer(Math.floor(refreshController.countdownInterval-(hours*3600)-(minutes*60)));
		
		$('#cd-minutes').html(minutes);
		$('#cd-seconds').html(seconds);
	}
	else {
		$('#countdown').css("visibility", "hidden");
	}
}

/** Setting the interval to the given value and calling the refreshCountdowner() function.
* @param {int} interval - The value in seconds  */
function setCountdownTo(interval) {
	resetCountdown();
	refreshController.countdownInterval = interval;
	refreshCountdowner();
	refreshController.countdowner = setInterval(countdown,(1000));
}

/** Deleting the countdown interval and calling the refreshCountdowner() function. */
function resetCountdown() {
	refreshController.countdownInterval = 0;
	refreshCountdowner();
	window.clearInterval(refreshController.countdowner);
}

/** Toggling the refresh depending on the state of the '#autoRefresh' CHECKBOX element. */
function toggleRefresh() {
	if($('#autoRefresh').is(':checked')) {
		setRefreshInterval(refreshController.refreshInterval);
		setCountdownTo(refreshController.refreshInterval);
	}
	else {
		window.clearInterval(refreshController.refresher);
		resetCountdown();
	}
}

