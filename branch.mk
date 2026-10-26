# dev-only pages and assets: the unpublished products (CHAOS, LOOP, Fusion
# Mirrors). main has no branch.mk, so the Makefile's -include skips this there
# and the two branches never edit the same line.
EXTRA_PREREQS=$(wildcard $(DATADIR)/tools.json)
EXTRA_HTMLFILES=tools chaos loop fusion-mirrors chaos-systems chaos-materials 404
EXTRA_CSSTARGETS=$(CSSBLD)/fusion-mirrors.css $(CSSBLD)/chaos-systems.css $(CSSBLD)/chaos-materials.css
EXTRA_JSTARGETS=$(JSBLD)/fusion-mirrors.js $(JSBLD)/chaos-common.js $(JSBLD)/chaos-systems.js $(JSBLD)/chaos-materials.js $(BLDDIR)/js/vendor/3Dmol-min.js $(BLDDIR)/js/vendor/3Dmol-min.js.LICENSE.txt $(BLDDIR)/js/vendor/3Dmol-LICENSE.txt
EXTRA_JSCOPY=$(JSBLD)/fusion-mirrors.js $(JSBLD)/chaos-common.js $(JSBLD)/chaos-systems.js $(JSBLD)/chaos-materials.js
# The material pages' structure viewer: 3Dmol.js (BSD-3-Clause), vendored in src/js/vendor with
# its license files (README.txt there has the version and checksums), copied as it is. A pattern
# rule, so that it is never make's default goal (this file is read before the Makefile's "all").
$(BLDDIR)/js/vendor/%: $(SRCDIR)/js/vendor/%
	@mkdir -p $(@D)
	cp $< $@
