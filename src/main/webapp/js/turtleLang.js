var turtleLanguage = {
    //the language's keywords
    keywords: [
		"@prefix", "@base",
		
		"_:",
		
		"@aa","@ab","@ae","@af","@ak","@am","@an","@ar","@as","@av","@ay","@az","@ba","@be","@bg","@bh","@bi","@bm","@bn","@bo","@br","@bs","@ca","@ce","@ch","@co","@cr","@cu","@cv","@cy","@cs","@da","@de",
		"@dv","@dz","@ee","@el","@en","@eo","@es","@et","@eu","@fa","@ff","@fi","@fj","@fo","@fr","@fy","@ga","@gd","@gl","@gn","@gu","@gv","@ha","@he","@hi","@ho","@hr","@ht","@hu","@hy","@hz","@ia","@id",
		"@ie","@ig","@ii","@ik","@io","@is","@it","@iu","@ja","@jv","@ka","@kg","@ki","@kj","@kk","@kl","@km","@kn","@ko","@kr","@ks","@ku","@kv","@kw","@ky","@la","@lb","@lg","@li","@ln","@lo","@lt","@lu",
		"@lv","@mg","@mh","@mi","@mk","@ml","@mn","@mr","@ms","@mt","@my","@na","@nb","@nd","@ne","@ng","@nl","@nn","@no","@nr","@nv","@ny","@oc","@oj","@om","@or","@os","@pa","@pi","@pl","@ps","@pt","@qu",
		"@rm","@rn","@ro","@ru","@rw","@sa","@sc","@sd","@se","@sg","@si","@sk","@sl","@sm","@sn","@so","@sq","@sr","@ss","@st","@su","@sv","@sw","@ta","@te","@tg","@th","@ti","@tk","@tl","@tn","@to","@tr",
		"@ts","@tt","@tw","@ty","@ug","@uk","@ur","@uz","@ve","@vi","@vo","@wa","@wo","@xh","@yi","@yo","@za","@zh","@zu"
	],
    
    //strings, comments, etc.
    scopes: {
		longstring:	[['"""', '"""', ["\\\"", "\\\\"]]],
		string:		[["\"", "\"", ["\\\"", "\\\\"]]],
		constant:	[[ "<", ">", null ]],
		comment:	[["#", "\n", null, true]],
		datatype:	[[ "^^<http://www.w3.org/2001/XMLSchema#", ">", null ], [ "^^xsd:", " ", null ], [ "^^xsd:", "\n", null ]],
	},
    
    //i.e. +, &&, >>=, etc.
    operators: [ ],
    
    //should match a single character
    identFirstLetter: /regex/,
    
    //should match a single character
    identAfterFirstLetter: /regex/,
    
    //rules for coloring named idents, e.g. a class name
    namedIdentRules: {},
    
    //any custom tokens that don't fall under keywords or operators
    customTokens: {},
    
    //any custom parsing rules, e.g. the regex literal in JavaScript
    customParseRules: {},
    
    //custom analyzer for generating the HTML
    //analyzer: myCustomAnalyzer,
    
    //whether keywords, tokens, etc. are case insensitive, default is false
    caseInsensitive: false,
    
    //regular expression that matches punctuation
    punctuation: /[^\w\s]/,
    
    //parse rule that parses a number
    numberParser: function(context) {},
    
    //regular expression defining what characters to not parse
    //this will short circuit the parsing process and no further parsing
    //will be done
    doNotParse: /\s/,
    
    //dictionary for storing arbitrary stateful objects during parsing/analysis
    contextItems: {}
};

function myCustomAnalyzer() {
	return "yay";
}