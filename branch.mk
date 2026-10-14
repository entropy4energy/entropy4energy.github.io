# dev-only pages and assets: the unpublished products (CHAOS, LOOP, Fusion
# Mirrors). main has no branch.mk, so the Makefile's -include skips this there
# and the two branches never edit the same line.
EXTRA_PREREQS=$(wildcard $(DATADIR)/tools.json)
EXTRA_HTMLFILES=tools chaos loop fusion-mirrors chaos-systems chaos-materials 404
EXTRA_CSSTARGETS=$(CSSBLD)/fusion-mirrors.css $(CSSBLD)/chaos-systems.css $(CSSBLD)/chaos-materials.css
EXTRA_JSTARGETS=$(JSBLD)/fusion-mirrors.js $(JSBLD)/chaos-common.js $(JSBLD)/chaos-systems.js $(JSBLD)/chaos-materials.js
EXTRA_JSCOPY=$(JSBLD)/fusion-mirrors.js $(JSBLD)/chaos-common.js $(JSBLD)/chaos-systems.js $(JSBLD)/chaos-materials.js
