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
PREREQSALL=$(BUILDPY) $(DATADIR)/news.json $(TEMPLATEDIR)/base.html
HTMLFILES=index jobs news publications team workshops zips api
html: $(foreach HTML,$(HTMLFILES),$(BLDDIR)/$(HTML).html)

$(BLDDIR)/%.html: $(PREREQSALL) $(TEMPLATEDIR)/%.html $(DATADIR)/%.json
	@mkdir -p $(@D)
	python $(BUILDPY) $(@F) | $(HTMLC) $(HTMLCFLAGS) -o $@

$(BLDDIR)/index.html: $(PREREQSALL) $(TEMPLATEDIR)/home.html $(DATADIR)/publications.json
	@mkdir -p $(@D)
	python $(BUILDPY) home --extra_data publications | $(HTMLC) $(HTMLCFLAGS) -o $@

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
static: $(BLDDIR)/media $(BLDDIR)/CNAME

$(BLDDIR)/%:
	$(RSYNC) $(@:$(BLDDIR)/%=$(SRCDIR)/%) $(BLDDIR)/

# Install targets
install-packages: py-install npm-install

npm-install:
	npm install

py-install:
	pip install -r requirements.txt

clean:
	-rm -rf $(BLDDIR)

realclean: clean
	-rm -rf $(NODEDIR)
