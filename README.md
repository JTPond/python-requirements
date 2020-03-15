# python-requirements package

Find all top level imports in a python project and produce a requirements.txt

Searches all .py file in the active project folder.

Stops looking for imports when it finds a non-empty, non-comment line that does not start with 'import', or 'from'.

Has logic to *not* include local modules or python standard modules from [here](https://docs.python.org/3.7/py-modindex.html "Python 3.7 module index").
