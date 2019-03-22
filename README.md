# python-requirements package

Find all top level imports in a python project and produce a requirements.txt

Searches all .py file in the first project folder.

Stops looking for imports when it finds a non-empty, non-comment line that does not start with 'import', or 'from'.
