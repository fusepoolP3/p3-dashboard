var transformers;
var factories;
var selectedTransformer;
var selectedFactory;
var selectedText; //test

$(document).ready(function () {
    "use strict";
    showLoadingCover();
    extractConfigRegistryURI(initDashboard);
});

function initDashboard() {
    getTransformers();
    getFactories();
    initFileInput();
    hideLoadingCover();
}

/*************************/
/**			Transformers	 	**/
/*************************/

/* Testing */

function initFileInput() {
    $('#browse').click(function () {
			$('#file').click();
			return false;
    });

    $('#filePath').click(function () {
			$('#file').click();
			return false;
    });

    $('#file').change(function (e) {
			var filename = $('#file').val();
			var res = filename.split("\\");
			filename = res[res.length - 1];
			$('#filePath').val(filename);
			var file = e.target.files[0];
			if (!isEmpty(file)) {
				showLoadingCover();
				var reader = new FileReader();
				reader.onload = function (e) {
					selectedText = e.target.result;
					hideLoadingCover();
				};
				reader.readAsText(file)
			}
			return false;
    });
}

function testTransformer() {
  showLoadingCover();

	var acceptHeaderVal = $('#acceptHeaderSel').val();
	var contentTypeVal = $('#contentTypeSel').val();
	
	var acceptHeader = isEmpty(acceptHeaderVal) ? '*/*' : acceptHeaderVal;
	var contentType = isEmpty(contentTypeVal) ? 'text/plain; charset=utf-8' : contentTypeVal;

	$.ajax({
		type: 'POST',
		url: selectedTransformer.uri.value + '?config=' + selectedTransformer.child.value,
		headers: {
			'Accept': acceptHeader,
			'Content-Type': contentType
		},
		data: selectedText
	})
	.done(function (data) {
		$('#resultBox').html("<pre class='prettyprint lang-xml testResult'>" + escapeHTML(data) + "</pre>");
		$('#resultPanel').show();
		hideLoadingCover();
	})
	.fail(function (xhr, textStatus, errorThrown) {
		hideLoadingCover();
		$('#resultBox').html("<pre class='prettyprint lang-xml testResult'>Error: " + errorThrown + " (Please check the console for further information.)</pre>");
		$('#resultPanel').show();
		console.error(xhr, textStatus, errorThrown);
	});
}

function getTransformers() {
    var query = 'SELECT * WHERE { '
            + '<' + config.trldpc + '> <http://www.w3.org/ns/ldp#contains> ?child . '
            + '?child <http://purl.org/dc/terms/title> ?title . '
            + '?child <http://vocab.fusepool.info/trldpc#transformer> ?uri . '
            + 'OPTIONAL { '
            + '	?child <http://purl.org/dc/terms/description> ?description . '
            + '} '
            + 'OPTIONAL { '
            + '	?child <http://purl.org/dc/terms/created> ?date . '
            + '} '
            + '}';

    $.ajax({
			type: 'POST',
			url: config.sparqlEndpoint,
			headers: {
				'Accept': 'application/sparql-results+json',
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			data: { query: query }
    }).done(function (data) {
			$("#transformerList").empty();
			transformers = data.results.bindings;
			var first = true;

			if (transformers.length > 0) {
				$.each(transformers, function (i, transformer) {
					if (first) {
						first = false;
						selectedTransformer = transformer;
						$("#transformerList").append($('<option>').text(transformer.title.value).prop("title", transformer.child.value).val(transformer.child.value).prop('selected', 'selected'));
					}
					else {
						$("#transformerList").append($('<option>').text(transformer.title.value).prop("title", transformer.child.value).val(transformer.child.value));
					}
					transformer.supportedInputFormats = [];
					transformer.supportedOutputFormats = [];
				});
			}
			$("#transformerCount").text(transformers.length);
			$("#transformerCountMenu").text(transformers.length);

    }).fail(function (xhr, textStatus, errorThrown) {
			console.error(xhr, textStatus, errorThrown);
    });
}

function deleteTransformer() {
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

function onTestClick() {
		if(isEmpty(selectedTransformer.supportedInputFormats)) {
			
			selectedTransformer.supportedInputFormats = [];
			selectedTransformer.supportedOutputFormats = [];
			
			// query the transformer to get the list of supported input formats
			var ajaxRequest = $.ajax({
				type: 'GET',
				url: selectedTransformer.uri.value,
			});

			ajaxRequest.done(function (response, textStatus, request) {				
				rdf.parseTurtle(response, function (s, graph) {
			
					var trDetails = rdf.cf.Graph(graph);
					
					selectedTransformer.supportedInputFormats = trDetails.node(selectedTransformer.uri.value).out(pfx.tr + "supportedInputFormat").literal();
					selectedTransformer.supportedOutputFormats = trDetails.node(selectedTransformer.uri.value).out(pfx.tr + "supportedOutputFormat").literal();
					
					initTestPanel();
				});
			});
			ajaxRequest.fail(function() {
				initTestPanel();
			});
		}
		else {
			initTestPanel();
		}
}

function initTestPanel() {
  $('#testPanel').modal();
	$('#testedTransformerName').text(selectedTransformer.title.value);
	
	$('#contentTypeSel').empty();
  $('#contentTypeSel').append($('<option>').val('').text('Select from the list (optional)'));
	for(var i=0; i<selectedTransformer.supportedInputFormats.length; i++) {
    $('#contentTypeSel').append($('<option>').val(selectedTransformer.supportedInputFormats[i]).text(selectedTransformer.supportedInputFormats[i]));
	}
	
	$('#acceptHeaderSel').empty();
  $('#acceptHeaderSel').append($('<option>').val('').text('Select from the list (optional)'));
	for(var i=0; i<selectedTransformer.supportedOutputFormats.length; i++) {
    $('#acceptHeaderSel').append($('<option>').val(selectedTransformer.supportedOutputFormats[i]).text(selectedTransformer.supportedOutputFormats[i]));
	}
	
	$('#resultBox').html('');
	$('#filePath').val('');
	$('#file').val('');
	$('#resultPanel').hide();
}

function renameTransformer() {
	var newName = prompt('New name', selectedTransformer.title.value);
	if (newName != null) {
		var ajaxRequest = $.ajax({
			type: 'GET',
			url: selectedTransformer.child.value,
		});

		ajaxRequest.done(function (response, textStatus, request) {
				
			// Virtuoso LDP: Doesn't support LDP resource updates using PUT at present.
			// Re-enable following once supported.
			/* As was:
			var data = '@prefix dcterms: <http://purl.org/dc/terms/> . '
							+ '@prefix trldpc: <http://vocab.fusepool.info/trldpc#> . '
							+ '@prefix ldp: <http://www.w3.org/ns/ldp#> . '
							+ '<> a ldp:Container, ldp:BasicContainer, trldpc:TransformerRegistration; '
							+ 'trldpc:transformer <' + selectedTransformer.uri.value + '>; '
							+ 'dcterms:title "' + newName + '"@en; '
							+ 'dcterms:description "' + selectedTransformer.description.value + '". ';

			var ETag = request.getResponseHeader('ETag');
			var putRequest = $.ajax({
				type: 'PUT',
				url: selectedTransformer.child.value,
				headers: {
					'Content-Type': 'text/turtle',
					'Link': "<http://www.w3.org/ns/ldp#BasicContainer>; rel='type'",
					'If-Match': ETag
				},
				data: data
			});
			putRequest.done(function (response, textStatus, request) {
				$('#transformerList option[value="' + selectedTransformer.child.value + '"]').text(newName);
			});
			putRequest.fail(function (xhr, textStatus, errorThrown) {
				console.error(xhr, textStatus, errorThrown);
			});
			*/
			 
			// Virtuoso LDP: Doesn't support LDP resource updates using PUT at present.
			// Implement update/overwrite as delete + create
			var deleteRequest = $.ajax({
				type: 'DELETE',
				url: selectedTransformer.child.value,
			});

			deleteRequest.done(function (response) {
				platform.getTransformerRegistry().then(function(tr) {
					tr.registerTransformer(selectedTransformer.uri.value, newName, selectedTransformer.description.value).then(function() {
						getTransformers();
					});
				});
			});

			deleteRequest.fail(function (xhr, textStatus, errorThrown) {
				console.error(xhr, textStatus, errorThrown);
			});
		});
		ajaxRequest.fail(function (xhr, textStatus, errorThrown) {
			console.error(xhr, textStatus, errorThrown);
		});
	}
}

function registerTransformer() {
	var title = $("#registerTitle").val();
	var description = $("#registerDescription").val();
	var uri = $.trim($("#registerUri").val());

	if (isEmpty(title)) {
			alert('Please provide a title');
	}
	else if (isEmpty(uri)) {
			alert('Please provide a URI');
	}
	else {
		platform.getTransformerRegistry().then(function(tr) {
			tr.registerTransformer(uri, title, description).then(function() {
				$("#registerTitle").val('');
				$("#registerDescription").val('');
				$("#registerUri").val('');
				getTransformers();
			});
		});
	}
}

function getTransformerByContainer(str) {
	for (var i = 0; i < transformers.length; i++) {
		if (transformers[i].child.value === str) {
			return transformers[i];
		}
	}
	return null;
}

$("#transformerList").change(function () {
	var val = $(this).find("option:selected").val();
	selectedTransformer = getTransformerByContainer(val);
});

function showTrDetails() {
	if (!isEmpty(selectedTransformer)) {			
		$('#infoTrTitle').html(selectedTransformer.title.value);
		$('#infoTrDescription').html(selectedTransformer.description.value);
		$('#infoTrResURI').html(selectedTransformer.child.value);
		$('#infoTrURI').html(selectedTransformer.uri.value);
		
		$('#transformerInfo').modal();
	}
}

/*********************/
/**	   Factories 	**/
/*********************/

function getFactories() {
	var query = 'SELECT * WHERE { '
					+ '<' + config.tfrldpc + '> <http://www.w3.org/ns/ldp#contains> ?child . '
					+ '?child <http://purl.org/dc/terms/title> ?title . '
					+ '?child <http://vocab.fusepool.info/tfrldpc#transformerFactory> ?uri . '
					+ 'OPTIONAL { '
					+ '	?child <http://purl.org/dc/terms/description> ?description . '
					+ '}'
					+ 'OPTIONAL { '
					+ '	?child <http://purl.org/dc/terms/created> ?date . '
					+ '}'
					+ '}';

	$.ajax({
		type: 'POST',
		url: config.sparqlEndpoint,
		headers: {
			'Accept': 'application/sparql-results+json',
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		data: { query: query }
	}).done(function (data) {
		$("#factoryList").empty();
		factories = data.results.bindings;
		var first = true;

		if (factories.length > 0) {
			jQuery.each(factories, function (i, factory) {
				if (first) {
					first = false;
					selectedFactory = factory;
					$("#factoryList").append($('<option>').text(factory.title.value).prop("title", factory.child.value).val(factory.child.value).prop('selected', 'selected'));
				}
				else {
					$("#factoryList").append($('<option>').text(factory.title.value).prop("title", factory.child.value).val(factory.child.value));
				}
			});
		}
		$("#factoryCount").text(factories.length);

	}).fail(function (xhr, textStatus, errorThrown) {
		console.error(xhr, textStatus, errorThrown);
	});
}

function openFactoryGui() {
	openInNewTab(selectedFactory.uri.value + "&platformURI=" + platformURI);
}

function getFactoryByContainer(str) {
	for (var i = 0; i < factories.length; i++) {
		if (factories[i].child.value === str) {
			return factories[i];
		}
	}
	return null;
}

$("#factoryList").change(function () {
	var val = $(this).find("option:selected").val();
	selectedFactory = getFactoryByContainer(val);
});
