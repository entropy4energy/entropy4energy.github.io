SHELL := /bin/bash
.SHELLFLAGS := -o pipefail -c
PYTHON ?= $(if $(wildcard venv/bin/python),venv/bin/python,python3)

.EXTRA_PREREQS=Makefile
.DELETE_ON_ERROR:

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
	--remove-script-type-attributes --use-short-doctype --minify-js true

# CSS
CSSSRC=$(SRCDIR)/css
CSSBLD=$(BLDDIR)/css
SASS=./$(NODEBIN)/sass
SSC=./$(NODEBIN)/postcss
SSCFLAGS=-u cssnano -u autoprefixer --no-map

# JavaScript
JSSRC=$(SRCDIR)/js
JSBLD=$(BLDDIR)/js
JSC="./node_modules/.bin/google-closure-compiler"
JSCFLAGS=-O ADVANCED #--language_out ECMASCRIPT5_STRICT  # uncomment for IE

# rsync
RSYNCFLAGS=-a --delete --prune-empty-dirs --omit-dir-times
RSYNC=rsync $(RSYNCFLAGS)

# npm
NODEDIR=node_modules
NODEBIN=$(NODEDIR)/.bin
NPMINST=npm install

BUILDTARGETS=html css js static
INSTALLTARGETS=install-packages py-install npm-install

.PHONY: all clean realclean $(BUILDTARGETS) $(INSTALLTARGETS)

all: $(BUILDTARGETS)

# HTML targets
# HTML embeds a content hash of the CSS and JS sources (cache busting),
# so every page must be rebuilt when those change.
PREREQSALL=$(BUILDPY) $(DATADIR)/news.json $(TEMPLATEDIR)/base.html $(wildcard $(CSSSRC)/*.scss) $(wildcard $(JSSRC)/*.js)
HTMLFILES=index jobs news publications research team workshops chaos
html: $(foreach HTML,$(HTMLFILES),$(BLDDIR)/$(HTML).html)

$(BLDDIR)/%.html: $(PREREQSALL) $(TEMPLATEDIR)/%.html $(DATADIR)/%.json
	@mkdir -p $(@D)
	$(PYTHON) $(BUILDPY) $(@F) | $(HTMLC) $(HTMLCFLAGS) -o $@

$(BLDDIR)/news.html: $(DATADIR)/press.json

$(BLDDIR)/index.html: $(PREREQSALL) $(TEMPLATEDIR)/home.html $(DATADIR)/home.json $(DATADIR)/publications.json $(DATADIR)/research.json
	@mkdir -p $(@D)
	$(PYTHON) $(BUILDPY) home --extra_data publications research | $(HTMLC) $(HTMLCFLAGS) -o $@

# CSS targets
css: $(CSSBLD)/academicons-1.9.1 $(CSSBLD)/main.css

$(CSSBLD)/%.css: $(CSSSRC)/%.scss
	@mkdir -p $(@D)
	$(SASS) $< | $(SSC) $(SSCFLAGS) > $@

$(CSSBLD)/%:
	@mkdir -p $(@D)
	$(RSYNC) $(@:$(BLDDIR)/%=$(SRCDIR)/%) $(CSSBLD)/

# JavaScript
js: $(JSBLD)/slideshow.js $(JSBLD)/jobs.js

$(JSBLD)/%.js: $(JSSRC)/%.js
	$(JSC) $(JSCFLAGS) --js $^ --js_output_file $@

# Static targets
static: $(BLDDIR)/media $(BLDDIR)/CNAME $(BLDDIR)/.htaccess

$(BLDDIR)/%:
	$(RSYNC) $(@:$(BLDDIR)/%=$(SRCDIR)/%) $(BLDDIR)/

# Install targets
install-packages: py-install npm-install

npm-install:
	npm ci

py-install:
	$(PYTHON) -m pip install -r requirements.txt

clean:
	-rm -rf $(BLDDIR)

realclean: clean
	-rm -rf $(NODEDIR)
