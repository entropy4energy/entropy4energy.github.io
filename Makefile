.EXTRA_PREREQS=Makefile

# Directories
SRCDIR=src
BLDDIR=dist
DATADIR=$(SRCDIR)/data
TEMPLATEDIR=$(SRCDIR)/templates

# Build file
BUILDPY=$(SRCDIR)/build.py

# HTML
HTMLC=$(NODEBIN)/html-minifier-terser
HTMLCFLAGS=--collapse-whitespace --collapse-inline-tag-whitespace \
	--remove-comments --conservative-collapse --remove-optional-tags \
	--remove-empty-attributes --remove-redundant-attributes \
	--remove-script-type-attributes --use-short-doctype

# CSS
CSSSRC=$(SRCDIR)/css
CSSBLD=$(BLDDIR)/css
SASS=./$(NODEBIN)/sass
SSC=./$(NODEBIN)/postcss
SSCFLAGS=-u cssnano -u autoprefixer --no-map

# JavaScript
JSSRC=$(SRCDIR)/js
JSBLD=$(BLDDIR)/js
JSC=./$(NODEBIN)/google-closure-compiler
JSCFLAGS=-O ADVANCED #--language_out ECMASCRIPT5_STRICT  # uncomment for IE

# rsync
RSYNCFLAGS=-a --delete --prune-empty-dirs
RSYNC=rsync $(RSYNCFLAGS)

# npm
NODEDIR=node_modules
NODEBIN=$(NODEDIR)/.bin
NPMINST=npm install

.PHONY: all clean realclean html css js install-css install-js install-html install-py

all: html css js media

# HTML targets
PREREQSALL=$(BUILDPY) $(DATADIR)/news.json $(TEMPLATEDIR)/base.html
HTMLFILES=news
html: html-install $(foreach HTML,$(HTMLFILES),$(BLDDIR)/$(HTML).html)

html-install: $(NODEDIR)/html-minifier-terser

$(BLDDIR)/news.html: $(PREREQSALL) $(TEMPLATEDIR)/news.html
	python $(BUILDPY) $(@F) | $(HTMLC) $(HTMLCFLAGS) -o $@

# CSS targets
css: css-static css-compiled

css-compiled: css-install $(CSSBLD)/main.css

css-install: $(NODEDIR)/sass $(NODEDIR)/postcss-cli $(NODEDIR)/autoprefixer $(NODEDIR)/cssnano

$(CSSBLD)/main.css: $(CSSSRC)/main.scss
	@mkdir -p $(@D)
	$(SASS) $< | $(SSC) $(SSCFLAGS) -o $@

css-static: $(CSSBLD)/academicons-1.9.1

$(CSSBLD)/%:
	@mkdir -p $(@D)
	$(RSYNC) $(@:$(BLDDIR)/%=$(SRCDIR)/%) $(CSSBLD)/

# JavaScript
js: js-install $(JSBLD)/slideshow.js

js-install: $(NODEDIR)/google-closure-compiler

$(JSBLD)/slideshow.js: $(JSSRC)/slideshow.js
	$(JSC) $(JSCFLAGS) --js $^ --js_output_file $@

# Static targets
media:
	$(RSYNC) $(SRCDIR)/$@ $(BLDDIR)/$@/

# python
install-py:
	pip install -r requirements.txt

# General targets
$(NODEDIR)/%:
	test -d $@ || $(NPMINST) $(@:$(NODEDIR)/%=%)

install-packages: install-css install-js install-html install-py

clean:
	-rm -rf $(BLDDIR)

realclean: clean
	-rm -rf $(NODEDIR)