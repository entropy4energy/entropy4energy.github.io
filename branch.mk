# dev-only pages and assets: the unpublished products (CHAOS, LOOP, Fusion
# Mirrors). main has no branch.mk, so the Makefile's -include skips this there
# and the two branches never edit the same line.
EXTRA_PREREQS=$(wildcard $(DATADIR)/tools.json)
EXTRA_HTMLFILES=tools chaos fusion-mirrors
EXTRA_CSSTARGETS=$(CSSBLD)/fusion-mirrors.css
EXTRA_JSTARGETS=$(JSBLD)/fusion-mirrors.js
EXTRA_JSCOPY=$(JSBLD)/fusion-mirrors.js
