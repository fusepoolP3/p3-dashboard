(function(sunlight, document, undefined) {
    if (sunlight === undefined) {
        throw "Include sunlight.js before including plugin files";
    }
    var ieVersion = eval("0 /*@cc_on+ScriptEngineMajorVersion()@*/");

    function createLink(href, title, text) {
        var link = document.createElement("a");
        link.setAttribute("href", href);
        link.setAttribute("title", title);
        if (text) {
            link.appendChild(document.createTextNode(text));
        }
        return link;
    }

    function getTextRecursive(node) {
        var text = "",
            i = 0;
        if (node.nodeType === 3) {
            return node.nodeValue;
        }
        text = "";
        for (i = 0; i < node.childNodes.length; i++) {
            text += getTextRecursive(node.childNodes[i]);
        }
        return text;
    }
    sunlight.bind("afterHighlightNode", function(context) {
        var menu, sunlightIcon, ul, collapse, mDash, collapseLink, viewRaw, viewRawLink, about, aboutLink, icon;
        if ((ieVersion && ieVersion < 7) || !this.options.showMenu || sunlight.util.getComputedStyle(context.node, "display") !== "block") {
            return;
        }
        menu = document.createElement("div");
        menu.className = this.options.classPrefix + "menu";
        ul = document.createElement("ul");
        viewRaw = document.createElement("li");
        viewRawLink = createLink("#", "view raw code", "raw");
        viewRawLink.onclick = function() {
            var textarea;
            return function() {
                var rawCode;
                if (textarea) {
                    textarea.parentNode.removeChild(textarea);
                    textarea = null;
                    context.node.style.display = "block";
                    this.replaceChild(document.createTextNode("raw"), this.firstChild);
                    this.setAttribute("title", "view raw code");
                } else {
                    rawCode = getTextRecursive(context.node);
                    textarea = document.createElement("textarea");
                    textarea.value = rawCode;
                    textarea.setAttribute("readonly", "readonly");
                    textarea.style.width = (parseInt(sunlight.util.getComputedStyle(context.node, "width")) - 5) + "px";
                    textarea.style.height = sunlight.util.getComputedStyle(context.node, "height");
                    textarea.style.border = "none";
                    textarea.style.overflowX = "hidden";
                    textarea.setAttribute("wrap", "off");
                    context.codeContainer.insertBefore(textarea, context.node);
                    context.node.style.display = "none";
                    this.replaceChild(document.createTextNode("highlighted"), this.firstChild);
                    this.setAttribute("title", "view highlighted code");
                    // textarea.select();
                }
                return false;
            };
        }();
        viewRaw.appendChild(viewRawLink);
        ul.appendChild(viewRaw);
        menu.appendChild(ul);
        context.container.insertBefore(menu, context.container.firstChild);
    });
    sunlight.globalOptions.showMenu = false;
    sunlight.globalOptions.autoCollapse = false;
}(this["Sunlight"], document));