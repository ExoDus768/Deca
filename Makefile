PYTHON ?= python3

.PHONY: install refresh publish verify
install:
	$(PYTHON) -m pip install -r requirements.txt

refresh:
	$(PYTHON) src/snapshot.py

publish:
	$(PYTHON) src/reconcile.py > published/reconciliation.json

verify:
	$(PYTHON) src/verify.py
